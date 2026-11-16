import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchAccount, fetchAllAccounts } from '@/mock/account'
import { fetchMenus } from '@/mock/menu'
import { fetchRoles } from '@/mock/role'
import { fetchTenant, findMemberByAccount, membershipsOfAccount } from '@/mock/tenant'
import type { PlatformAccount } from '@/types'
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
  /** 是否该账号在该租户的主管理员（用于登录默认租户） */
  primary?: boolean
}

/** 登录结果：多租户时先返回待选租户，不建立会话 */
export type LoginResult =
  | { status: 'ok'; session: AuthSession; tenants: AuthTenantOption[] }
  | { status: 'need-tenant'; tenants: AuthTenantOption[]; loginName: string }

interface AuthValue {
  session: AuthSession | null
  /** 当前账号可切换的有效租户 */
  tenants: AuthTenantOption[]
  /** 当前会话可访问的路由（已开通模块 ∩ 角色功能点） */
  allowedRoutes: string[]
  login: (login: string, password: string, tenantId?: string) => Promise<LoginResult>
  /** 登录后切换租户：只改变当前租户上下文，不改任何成员关系 */
  switchTenant: (tenantId: string) => Promise<void>
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

/** 汇总账号可进入的租户：以成员关系为真相源，账号侧投影兜底，按 tenantId 去重 */
function buildTenantOptions(account: PlatformAccount): AuthTenantOption[] {
  const fromMember = membershipsOfAccount(account.id)
    .filter((item) => !!item.tenantName && findMemberByAccount(item.tenantId, account.id)?.status === 'enabled')
    .map((item) => ({ tenantId: item.tenantId, tenantName: item.tenantName, primary: item.primary }))
  const fromAccount = account.tenantMemberships
    .filter((item) => item.status === 'active' && !!item.tenantId)
    .map((item) => ({ tenantId: item.tenantId as string, tenantName: item.tenantName, primary: item.primary }))

  const map = new Map<string, AuthTenantOption>()
  ;[...fromMember, ...fromAccount].forEach((item) => {
    const exists = map.get(item.tenantId)
    if (!exists) map.set(item.tenantId, item)
    else if (item.primary && !exists.primary) map.set(item.tenantId, { ...exists, primary: true })
  })
  return [...map.values()]
}

/** 三道闸门：账号启用（调用方已校验）→ 成员启用 → 租户启用 */
async function assertTenantUsable(session: AuthSession): Promise<void> {
  if (session.platform) return
  let tenantStatus: string
  try {
    const tenant = await fetchTenant(session.tenantId)
    tenantStatus = tenant.status
  } catch {
    throw new Error('所属租户已不存在，请联系平台管理员')
  }
  if (tenantStatus !== 'enabled') throw new Error('所属租户已停用，暂不能登录')
  const member = findMemberByAccount(session.tenantId, session.accountId)
  if (!member) throw new Error('你在该租户的成员身份已不存在')
  if (member.status === 'removed') throw new Error('你已被移出该租户')
  if (member.status !== 'enabled') throw new Error('你在该租户的成员身份已停用')
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
      platform: next.platform,
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
    async (loginInput: string, password: string, tenantId?: string): Promise<LoginResult> => {
      if (!loginInput.trim() || !password) throw new Error('请输入账号和密码')

      const accounts = await fetchAllAccounts()
      const key = loginInput.trim().toLowerCase()
      const account = accounts.find(
        (item) => item.loginName.toLowerCase() === key || item.mobile === key,
      )
      // 不区分"账号不存在"与"密码错误"，避免账号探测
      if (!account) throw new Error('账号或密码不正确')
      if (account.status === 'disabled') throw new Error('账号已停用，请联系平台管理员')
      // 原型不校验密码；生产由服务端校验并做连续错误锁定

      // 租户身份以**成员关系**为准；账号侧 tenantMemberships 只是投影
      const options = buildTenantOptions(account)
      setTenants(options)

      // 多租户：登录先选租户；未选择时不建立会话
      if (options.length > 1 && !tenantId) {
        return { status: 'need-tenant', tenants: options, loginName: account.loginName }
      }

      let next: AuthSession
      if (options.length > 0) {
        const chosen =
          options.find((item) => item.tenantId === tenantId) ??
          options.find((item) => item.primary) ??
          options[0]
        next = {
          accountId: account.id,
          displayName: account.displayName,
          loginName: account.loginName,
          tenantId: chosen.tenantId,
          tenantName: chosen.tenantName,
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

      await assertTenantUsable(next)
      persist(next)
      setSession(next)
      syncMockSession(next)
      return { status: 'ok', session: next, tenants: options }
    },
    [syncMockSession],
  )

  /** 登录后切换租户：重新校验账号 / 成员 / 租户，只改当前租户上下文 */
  const switchTenant = useCallback(
    async (targetTenantId: string) => {
      const current = session
      if (!current || current.platform) throw new Error('当前会话不支持切换租户')
      const target = tenants.find((item) => item.tenantId === targetTenantId)
      if (!target) throw new Error('无权进入该租户')
      const account = await fetchAccount(current.accountId)
      if (account.status !== 'enabled') throw new Error('账号已停用，请联系平台管理员')
      const next: AuthSession = {
        ...current,
        tenantId: target.tenantId,
        tenantName: target.tenantName,
        platform: false,
      }
      await assertTenantUsable(next)
      persist(next)
      setSession(next)
      syncMockSession(next)
    },
    [session, tenants, syncMockSession],
  )

  /** 刷新页面后重建可切换租户列表（会话里只存当前租户） */
  useEffect(() => {
    if (!session || session.platform) {
      setTenants([])
      return
    }
    let cancelled = false
    void (async () => {
      const account = await fetchAccount(session.accountId)
      if (!cancelled) setTenants(buildTenantOptions(account))
    })()
    return () => {
      cancelled = true
    }
  }, [session?.accountId, session?.platform])

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
    () => ({ session, tenants, allowedRoutes, login, switchTenant, completePasswordChange, logout, can }),
    [session, tenants, allowedRoutes, login, switchTenant, completePasswordChange, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}

export { AUTH_KEY }
