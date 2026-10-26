import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchAccount, fetchAllAccounts } from '@/mock/account'
import { fetchMenus } from '@/mock/menu'
import { fetchRoles } from '@/mock/role'
import { fetchTenant, findMemberByAccount, membershipsOfAccount } from '@/mock/tenant'
import { setMockSession } from '@/mock'

const AUTH_KEY = 'pcf_auth'

/**
 * 运行时会话。
 *
 * 登录必须同时通过**三道闸门**才放行：账号启用 → 成员关系启用 → 租户启用。
 * 任一不满足即拒绝，不允许"账号能登但进不了任何租户"的中间态。
 */
export interface AuthSession {
  accountId: string
  displayName: string
  loginName: string
  /** 当前租户；平台后台会话为空串 */
  tenantId: string
  tenantName: string
  /** 是否平台侧会话（无租户身份、仅持平台角色） */
  platform: boolean
  /**
   * 是否强制改密（账号表 `must_change_password`）：
   * 为 true 时不允许进入任何业务页面，必须先完成改密。
   */
  mustChangePassword: boolean
}

export interface AuthTenantOption {
  tenantId: string
  tenantName: string
}

interface AuthValue {
  session: AuthSession | null
  /** 当前账号可切换的有效租户 */
  tenants: AuthTenantOption[]
  /** 当前会话可访问的路由（已开通模块 ∩ 角色功能点） */
  allowedRoutes: string[]
  login: (login: string, password: string) => Promise<AuthSession>
  /** 改密成功后清除强制改密标记（会话与账号表同步） */
  completePasswordChange: () => void
  logout: () => void
  can: (route: string) => boolean
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * 解析可访问路由：
 * - 租户会话：`角色勾选功能点 ∩ 租户已开通模块`（两侧都满足才生效）；
 * - 平台会话：平台角色勾选的功能点。
 */
async function resolveAllowedRoutes(session: AuthSession, roleIds: string[]): Promise<string[]> {
  const menus = await fetchMenus()
  const routeOf = new Map(menus.map((item) => [item.id, item.route]))

  let granted: Set<string>
  if (session.platform) {
    const roles = await fetchRoles('platform')
    const held = roles.filter((role) => roleIds.includes(role.id) && role.status === 'enabled')
    granted = new Set(held.flatMap((role) => role.menuGrants.map((grant) => grant.menuId)))
  } else {
    const tenant = await fetchTenant(session.tenantId)
    if (tenant.status !== 'enabled') return []
    const member = findMemberByAccount(session.tenantId, session.accountId)
    if (!member || member.status !== 'enabled') return []
    const roles = await fetchRoles('tenant')
    const held = roles.filter(
      (role) =>
        role.tenantId === session.tenantId &&
        role.status === 'enabled' &&
        member.roleNames.includes(role.name),
    )
    const roleMenus = new Set(held.flatMap((role) => role.menuGrants.map((grant) => grant.menuId)))
    granted = new Set([...roleMenus].filter((id) => tenant.moduleCodes.includes(id)))
  }

  return [...granted]
    .map((id) => routeOf.get(id))
    .filter((route): route is string => !!route)
}

/** 写会话到 sessionStorage，并向 mock 层注入数据权限三列 */
function persist(session: AuthSession | null): void {
  if (!session) {
    sessionStorage.removeItem(AUTH_KEY)
    return
  }
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(session))
}

function restore(): AuthSession | null {
  const raw = sessionStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthSession
    // 兼容旧会话：缺省字段按「无需强制改密」处理
    return { ...parsed, mustChangePassword: parsed.mustChangePassword ?? false }
  } catch {
    sessionStorage.removeItem(AUTH_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => restore())
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([])
  const [tenants, setTenants] = useState<AuthTenantOption[]>([])

  const syncMockSession = useCallback((next: AuthSession | null) => {
    if (!next) return
    const member = next.platform ? undefined : findMemberByAccount(next.tenantId, next.accountId)
    setMockSession({
      tenantId: next.tenantId,
      deptId: member?.deptId ?? '',
      ownerId: next.accountId,
    })
  }, [])

  const refreshPermissions = useCallback(async (next: AuthSession) => {
    const account = await fetchAccount(next.accountId)
    const routes = await resolveAllowedRoutes(next, account.roleIds)
    setAllowedRoutes(routes)
  }, [])

  useEffect(() => {
    if (!session) {
      setAllowedRoutes([])
      return
    }
    syncMockSession(session)
    void refreshPermissions(session)
  }, [session, refreshPermissions, syncMockSession])

  const login = useCallback(
    async (loginInput: string, password: string): Promise<AuthSession> => {
      if (!loginInput.trim() || !password) throw new Error('请输入账号和密码')

      const accounts = await fetchAllAccounts()
      const key = loginInput.trim().toLowerCase()
      const account = accounts.find(
        (item) => item.loginName.toLowerCase() === key || item.mobile === key,
      )
      // 不区分"账号不存在"与"密码错误"，避免账号探测
      if (!account) throw new Error('账号或密码不正确')
      if (account.status === 'disabled') throw new Error('账号已停用，请联系平台管理员')
      if (account.status === 'canceled') throw new Error('账号已注销，无法登录')
      // 原型不校验密码；生产由服务端校验并做连续错误锁定

      // 单租户模式：一个账号只绑定一个租户，登录直接取该账号唯一有效租户身份，不做租户选择
      // 租户身份以**成员关系**为准；账号侧 tenantMemberships 只是投影，缺失时不得导致无法登录
      const fromMember = membershipsOfAccount(account.id).filter((item) => !!item.tenantName)
      const fromAccount = account.tenantMemberships
        .filter((item) => item.status === 'active' && !!item.tenantId)
        .map((item) => ({ tenantId: item.tenantId as string, tenantName: item.tenantName, primary: item.primary }))
      const options: AuthTenantOption[] = []
      ;[...fromMember, ...fromAccount].forEach((item) => {
        if (options.length === 0 && !options.some((row) => row.tenantId === item.tenantId)) {
          options.push({ tenantId: item.tenantId, tenantName: item.tenantName })
        }
      })
      setTenants(options)

      let next: AuthSession
      if (options.length > 0) {
        const only = options[0]
        next = {
          accountId: account.id,
          displayName: account.displayName,
          loginName: account.loginName,
          tenantId: only.tenantId,
          tenantName: only.tenantName,
          platform: false,
          mustChangePassword: account.mustChangePassword,
        }
      } else if (account.roleIds.length > 0) {
        // 平台账号没有租户身份，进平台后台
        next = {
          accountId: account.id,
          displayName: account.displayName,
          loginName: account.loginName,
          tenantId: '',
          tenantName: '平台后台',
          platform: true,
          mustChangePassword: account.mustChangePassword,
        }
      } else {
        throw new Error('该账号没有有效的租户身份，请联系租户管理员')
      }

      // 三道闸门：账号启用（已校验）→ 成员启用 → 租户启用
      if (!next.platform) {
        let tenantStatus: string
        try {
          const tenant = await fetchTenant(next.tenantId)
          tenantStatus = tenant.status
        } catch {
          throw new Error('所属租户已不存在，请联系平台管理员')
        }
        if (tenantStatus !== 'enabled') throw new Error('所属租户已停用，暂不能登录')
        const member = findMemberByAccount(next.tenantId, next.accountId)
        if (!member) throw new Error('你在该租户的成员身份已不存在')
        if (member.status === 'removed') throw new Error('你已被移出该租户')
        if (member.status !== 'enabled') throw new Error('你在该租户的成员身份已停用')
      }

      persist(next)
      setSession(next)
      syncMockSession(next)
      return next
    },
    [syncMockSession],
  )

  /** 改密成功：清除会话上的强制改密标记（账号侧标记由 mock changePassword 负责） */
  const completePasswordChange = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev
      const next: AuthSession = { ...prev, mustChangePassword: false }
      persist(next)
      return next
    })
  }, [])

  const logout = useCallback(() => {
    persist(null)
    setSession(null)
    setAllowedRoutes([])
    setTenants([])
  }, [])

  const can = useCallback(
    (route: string): boolean => {
      // 权限仍在解析时不误判为无权（避免首帧闪空）
      if (allowedRoutes.length === 0) return true
      return allowedRoutes.some((item) => route === item || route.startsWith(`${item}/`))
    },
    [allowedRoutes],
  )

  const value = useMemo<AuthValue>(
    () => ({ session, tenants, allowedRoutes, login, completePasswordChange, logout, can }),
    [session, tenants, allowedRoutes, login, completePasswordChange, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}

export { AUTH_KEY }
