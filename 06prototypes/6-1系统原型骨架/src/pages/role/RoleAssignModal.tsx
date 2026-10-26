import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, useToast } from '@/shared/components'
import { fetchMenus } from '@/mock/menu'
import { assignRoleFunctions } from '@/mock/role'
import type { MenuFunction, MenuGrant, Role } from '@/types'
import MenuTreePicker, { buildDefaultGrants, getSelectableFunctions } from './MenuTreePicker'
import './RolePage.css'

interface RoleAssignModalProps {
  open: boolean
  role: Role | null
  onClose: () => void
  onSaved: () => void
}

/**
 * 角色管理 · 分配权限弹窗（对齐参考图：菜单树勾选 + 展开/折叠 + 全选/不全选）。
 * 功能菜单取菜单管理全部菜单（统一数据源）；系统内置角色为只读。
 */
export default function RoleAssignModal({ open, role, onClose, onSaved }: RoleAssignModalProps) {
  const toast = useToast()
  const [menus, setMenus] = useState<MenuFunction[]>([])
  const [grants, setGrants] = useState<MenuGrant[]>([])
  const [expandAllToken, setExpandAllToken] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    void fetchMenus().then((list) => {
      if (alive) setMenus(list)
    })
    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    if (!open || !role) return
    setGrants(role.menuGrants.map((grant) => ({ ...grant })))
    setExpandAllToken(0)
  }, [open, role])

  const readOnly = !!role?.builtin

  const selectable = useMemo(() => getSelectableFunctions(menus), [menus])

  const allSelected = selectable.length > 0 && selectable.every((menu) => grants.some((grant) => grant.menuId === menu.id))

  const toggleSelectAll = () => {
    setGrants(allSelected ? [] : buildDefaultGrants(selectable))
  }

  const handleSave = async () => {
    if (!role) return
    if (grants.length === 0) {
      toast('至少勾选 1 个菜单', 'error')
      return
    }
    setSubmitting(true)
    try {
      await assignRoleFunctions(role.id, grants)
      toast('权限已保存，立即生效并刷新缓存')
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
      <div className="role-assign-head">
        <p className="form-tip" style={{ marginTop: 0 }}>
          功能菜单取菜单管理中的全部菜单（统一数据源）；系统内置角色为只读。
        </p>
        <div className="role-assign-head-actions">
          <label className="role-assign-check">
            <input
              type="checkbox"
              checked={expandAllToken % 2 === 1}
              disabled={readOnly}
              onChange={() => setExpandAllToken((prev) => prev + 1)}
            />
            <span>展开/折叠</span>
          </label>
          <label className="role-assign-check">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={readOnly}
              onChange={toggleSelectAll}
            />
            <span>全选/不全选</span>
          </label>
        </div>
      </div>

      {role && (
        <div data-ann-target="role.assign.body">
          <MenuTreePicker
            menus={menus}
            value={grants}
            onChange={setGrants}
            disabled={readOnly}
            expandAllToken={expandAllToken}
          />
        </div>
      )}

      {readOnly && <div className="role-section-tip">内置角色不可修改，请走「复制」后调整。</div>}
    </Modal>
  )
}
