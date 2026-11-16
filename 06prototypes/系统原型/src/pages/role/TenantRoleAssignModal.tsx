import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, useToast } from '@/shared/components'
import { fetchMenus } from '@/mock/menu'
import { assignRoleFunctions, countActiveMembers, TENANT_MENU_IDS } from '@/mock/role'
import type { MenuFunction, MenuGrant, Role } from '@/types'
import TenantMenuTreePicker from './TenantMenuTreePicker'
import './RolePage.css'

interface TenantRoleAssignModalProps {
  open: boolean
  role: Role | null
  onClose: () => void
  onSaved: () => void
}

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
 * 租户端角色管理 · 分配权限弹窗（§4.2 / §5.4）：
 * 仅做功能菜单授权，不配置读 / 写数据范围——角色管理授权只配功能权限。
 * 菜单树只出现适用端为租户端的功能（§5.4-3）。内置角色只读，租户管理员（保护角色）可收窄。
 */
export default function TenantRoleAssignModal({ open, role, onClose, onSaved }: TenantRoleAssignModalProps) {
  const toast = useToast()
  const [menus, setMenus] = useState<MenuFunction[]>([])
  const [grants, setGrants] = useState<MenuGrant[]>([])
  const [expandAllToken, setExpandAllToken] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    void fetchMenus().then((list) => {
      if (!alive) return
      // 租户端只出现适用端为租户端的功能（§5.4-3），分组节点按层级补回
      setMenus(withAncestors(list, new Set(TENANT_MENU_IDS)))
    })
    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    if (!open || !role) return
    // 授权只存功能菜单引用，不保留读写范围
    setGrants(role.menuGrants.map((grant) => ({ menuId: grant.menuId })))
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
    setGrants(selectable.map((menu) => ({ menuId: menu.id })))
  }

  const handleSave = async () => {
    if (!role) return
    if (grants.length === 0) {
      toast('至少勾选 1 个功能菜单', 'error')
      return
    }
    setSubmitting(true)
    try {
      await assignRoleFunctions(role.id, grants)
      toast('权限已保存，立即生效')
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
          />
        </div>
      )}

      {readOnly && <div className="role-section-tip">内置角色不可修改，请走「复制」后调整。</div>}
    </Modal>
  )
}
