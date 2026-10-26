import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, useToast } from '@/shared/components'
import { fetchMenus } from '@/mock/menu'
import {
  assignRoleFunctions,
  countActiveMembers,
  DATA_SCOPE_MENU_IDS,
  fetchDeptScopeOptions,
  TENANT_MENU_IDS,
} from '@/mock/role'
import type { DataScope, MenuFunction, MenuGrant, Role } from '@/types'
import { compareScope } from './roleMeta'
import TenantMenuTreePicker from './TenantMenuTreePicker'
import './RolePage.css'

interface TenantRoleAssignModalProps {
  open: boolean
  role: Role | null
  onClose: () => void
  onSaved: () => void
}

/** 勾选后的默认数据范围：读「本部门」、写「仅本人」 */
const DEFAULT_READ: DataScope = 'dept'
const DEFAULT_WRITE: DataScope = 'self'

/** 把允许的功能点及其祖先分组补回树中（分组不可勾选，只承载层级） */
function withAncestors(menus: MenuFunction[], ids: Set<string>): MenuFunction[] {
  const byId = new Map(menus.map((menu) => [menu.id, menu]))
  const allowed = new Set<string>()
  ids.forEach((id) => {
    let cursor = byId.get(id)
    while (cursor && !allowed.has(cursor.id)) {
      allowed.add(cursor.id)
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
    }
  })
  return menus.filter((menu) => allowed.has(menu.id))
}

/**
 * 租户端角色管理 · 分配权限弹窗（§4.2 / §5.4 / §5.5）：
 * 菜单树勾选（只出现租户端功能）+ 每个功能点的读 / 写数据范围 + 指定部门。
 * 内置角色只读，租户管理员（保护角色）可收窄。
 */
export default function TenantRoleAssignModal({ open, role, onClose, onSaved }: TenantRoleAssignModalProps) {
  const toast = useToast()
  const [menus, setMenus] = useState<MenuFunction[]>([])
  const [deptOptions, setDeptOptions] = useState<{ label: string; value: string }[]>([])
  const [grants, setGrants] = useState<MenuGrant[]>([])
  const [expandAllToken, setExpandAllToken] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    void Promise.all([fetchMenus(), fetchDeptScopeOptions()]).then(([list, depts]) => {
      if (!alive) return
      // 租户端只出现适用端为租户端的功能（§5.4-3），分组节点按层级补回
      setMenus(withAncestors(list, new Set(TENANT_MENU_IDS)))
      setDeptOptions(depts)
    })
    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    if (!open || !role) return
    setGrants(role.menuGrants.map((grant) => ({ ...grant, scopeDeptIds: [...(grant.scopeDeptIds ?? [])] })))
    setExpandAllToken(0)
    setKeyword('')
  }, [open, role])

  const readOnly = !!role?.builtin && !role?.protectedRole

  const selectable = useMemo(
    () => menus.filter((menu) => menu.status === 'enabled' && !!menu.route),
    [menus],
  )

  const allSelected = selectable.length > 0 && selectable.every((menu) => grants.some((grant) => grant.menuId === menu.id))

  /** 展开折叠令牌：奇数=全部展开、偶数（>0）=全部折叠，仅切换展示状态 */
  const expandAll = () => setExpandAllToken((prev) => (prev % 2 === 1 ? prev + 2 : prev + 1))
  const collapseAll = () => setExpandAllToken((prev) => (prev % 2 === 0 ? Math.max(prev + 2, 2) : prev + 1))

  const toggleSelectAll = () => {
    if (allSelected) {
      setGrants([])
      return
    }
    setGrants(
      selectable.map((menu) =>
        DATA_SCOPE_MENU_IDS.includes(menu.id)
          ? { menuId: menu.id, readScope: DEFAULT_READ, writeScope: DEFAULT_WRITE, scopeDeptIds: [] }
          : { menuId: menu.id },
      ),
    )
  }

  /** 保存前校验：写不宽于读；指定部门必选（§5.5-2 / §5.5-10） */
  const validate = (): boolean => {
    for (const grant of grants) {
      if (!DATA_SCOPE_MENU_IDS.includes(grant.menuId)) continue
      const menu = selectable.find((item) => item.id === grant.menuId)
      const name = menu?.name ?? grant.menuId
      const { readScope, writeScope, scopeDeptIds } = grant
      if ((readScope && !writeScope) || (!readScope && writeScope)) {
        toast(`「${name}」数据范围读写各配一档`, 'error')
        return false
      }
      if (!readScope || !writeScope) continue
      // 用集合语义比较：两侧都是「指定部门」时校子集；一侧是「指定部门」时不可比，要求人工改选
      const readDeptIds = scopeDeptIds ?? []
      const writeDeptIds = grant.writeDeptIds ?? readDeptIds
      const comparison = compareScope(readScope, writeScope, readDeptIds, writeDeptIds)
      if (comparison === 'wider') {
        toast(`「${name}」写范围不得宽于读范围`, 'error')
        return false
      }
      if (comparison === 'incomparable') {
        toast(`「${name}」的「指定部门」与其他档位无法比较宽窄，请两侧都选「指定部门」或都选部门档`, 'error')
        return false
      }
      if ((readScope === 'specified' || writeScope === 'specified') && (scopeDeptIds ?? []).length === 0) {
        toast(`「${name}」数据范围为「指定部门」时必须选择部门`, 'error')
        return false
      }
    }
    return true
  }

  const handleSave = async () => {
    if (!role) return
    if (grants.length === 0) {
      toast('至少勾选 1 个功能菜单', 'error')
      return
    }
    if (!validate()) return
    setSubmitting(true)
    try {
      await assignRoleFunctions(role.id, grants)
      toast('权限与数据范围已保存，立即生效')
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`分配权限 · ${role?.name ?? ''}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          {!readOnly && (
            <Button variant="primary" disabled={submitting} onClick={() => void handleSave()}>
              保存
            </Button>
          )}
        </>
      }
    >
      <div className="role-assign-notice" data-ann-target="trole.assign.body">
        仅显示已启用功能，保存后立即生效。
        {role && (
          <>
            {' '}本次变更将影响 <span className="role-assign-notice-num">{countActiveMembers(role)}</span>{' '}
            个生效成员。
          </>
        )}
      </div>

      <div className="role-assign-toolbar">
        <input
          className="input role-assign-search"
          placeholder="搜索菜单或路径..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <div className="role-assign-toolbar-right">
          <span className="role-assign-count">已选 {grants.length} 项</span>
          <button type="button" className="role-assign-link" onClick={expandAll}>
            [全部展开]
          </button>
          <button type="button" className="role-assign-link" onClick={collapseAll}>
            [全部折叠]
          </button>
          <span className="role-assign-divider" />
          <label className="role-assign-check">
            <input type="checkbox" checked={allSelected} disabled={readOnly} onChange={toggleSelectAll} />
            <span>全选</span>
          </label>
        </div>
      </div>

      {role && (
        <div data-ann-target="trole.assign.scope">
          <TenantMenuTreePicker
            menus={menus}
            value={grants}
            onChange={setGrants}
            disabled={readOnly}
            expandAllToken={expandAllToken}
            keyword={keyword}
            deptOptions={deptOptions}
          />
        </div>
      )}

      {readOnly && <div className="role-section-tip">内置角色不可修改，请走「复制」后调整。</div>}
    </Modal>
  )
}
