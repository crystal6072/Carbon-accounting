import { useEffect, useState } from 'react'
import { Button, FormField, Icon, Modal, useToast } from '@/shared/components'
import type { Tenant } from '@/types'
import { moduleImpactCount, saveTenantModules } from '@/mock/tenant'
import type { TenantModuleGroupNode } from '@/mock/menu'
import { fetchTenantModuleTree } from '@/mock/menu'
import { moduleNameOf } from './tenantMeta'

interface TenantModuleModalProps {
  open: boolean
  tenant: Tenant | null
  onClose: () => void
  onDone: () => void
}

/**
 * 租户 · 模块授权（§4.7）：按「产品碳足迹」与「系统管理」两个一级分组以树形展示**租户端**功能菜单，
 * 分组节点可折叠、支持整组全选 / 全不选，叶子节点复选。
 * 平台侧功能（基础库 / 模型管理 / 平台账号 / 租户管理等）适用端为平台运营端，不出现在本清单里（§5.3）。
 * 取消须二次确认并提示影响人数；取消后功能点下次请求即失效，角色勾选保留，重新授权自动恢复。
 */
export default function TenantModuleModal({ open, tenant, onClose, onDone }: TenantModuleModalProps) {
  const toast = useToast()
  const [groups, setGroups] = useState<TenantModuleGroupNode[]>([])
  const [codes, setCodes] = useState<string[]>([])
  const [initial, setInitial] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [ack, setAck] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && tenant) {
      setCodes([...tenant.moduleCodes])
      setInitial([...tenant.moduleCodes])
      setCollapsed({})
      setAck(false)
      void (async () => setGroups(await fetchTenantModuleTree()))()
    }
  }, [open, tenant])

  const pendingRemovals = initial.filter((code) => !codes.includes(code))
  const pendingGrants = codes.filter((code) => !initial.includes(code))
  const impactMembers = pendingRemovals.reduce((sum, code) => sum + moduleImpactCount(tenant?.id ?? '', code), 0)
  const totalMenus = groups.reduce((sum, group) => sum + group.children.length, 0)

  const toggle = (code: string) => {
    setAck(false)
    setCodes((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]))
  }

  const groupChecked = (group: TenantModuleGroupNode) =>
    group.children.length > 0 && group.children.every((item) => codes.includes(item.id))

  const groupSelectedCount = (group: TenantModuleGroupNode) =>
    group.children.filter((item) => codes.includes(item.id)).length

  const toggleGroup = (group: TenantModuleGroupNode) => {
    setAck(false)
    const ids = group.children.map((item) => item.id)
    setCodes((prev) =>
      groupChecked(group) ? prev.filter((code) => !ids.includes(code)) : Array.from(new Set([...prev, ...ids])),
    )
  }

  const handleSave = async () => {
    if (!tenant) return
    if (pendingRemovals.length > 0 && !ack) {
      toast('请先确认取消授权的影响', 'error')
      return
    }
    setSubmitting(true)
    try {
      await saveTenantModules(tenant.id, codes)
      toast('模块授权已保存')
      onDone()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`模块授权 · ${tenant?.name ?? ''}`}
      size="default"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleSave()}>
            保存
          </Button>
        </>
      }
    >
      <p className="form-tip" style={{ marginTop: 0 }}>
        勾选即授权，按应用分组以树形展示租户端功能菜单（平台侧功能不在此清单）。取消后该菜单功能点对下次请求即失效，租户已有角色的功能点勾选保留，重新授权后自动恢复。
      </p>

      <div className="tenant-tree" data-ann-target="tenant.modal.module">
        {groups.map((group) => {
          const isCollapsed = !!collapsed[group.id]
          const selected = groupSelectedCount(group)
          return (
            <div key={group.id} className="tenant-tree-group">
              <div className="tenant-tree-head">
                <span
                  className={`tenant-tree-caret${isCollapsed ? ' is-collapsed' : ''}`}
                  onClick={() => setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                  aria-label={isCollapsed ? '展开' : '折叠'}
                >
                  ▾
                </span>
                <label className="tenant-tree-head-label">
                  <input type="checkbox" checked={groupChecked(group)} onChange={() => toggleGroup(group)} />
                  <span className="tenant-tree-name">{group.name}</span>
                </label>
                <span className={`tenant-tree-count${groupChecked(group) ? ' is-full' : ''}`}>
                  {selected}/{group.children.length}
                </span>
              </div>
              {!isCollapsed && (
                <div className="tenant-tree-children">
                  {group.children.map((item) => (
                    <label key={item.id} className={`tenant-tree-item${codes.includes(item.id) ? ' is-checked' : ''}`}>
                      <input type="checkbox" checked={codes.includes(item.id)} onChange={() => toggle(item.id)} />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="form-tip" style={{ marginTop: 'var(--space-sm)' }}>
        已选 {codes.length}/{totalMenus} 个功能菜单
        {pendingGrants.length > 0 && <>；本次新增：{pendingGrants.map(moduleNameOf).join('、')}</>}
      </p>

      {pendingRemovals.length > 0 && (
        <>
          <div className="tenant-impact" style={{ marginTop: 'var(--space-sm)' }}>
            <span className="tenant-impact-title">
              <Icon name="warning" size={14} />
              取消 {pendingRemovals.map(moduleNameOf).join('、')}，约 {impactMembers} 名成员的可用功能将失效
            </span>
          </div>
          <FormField label="确认影响" required>
            <label className="tenant-ack">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>已知悉：取消后相关功能点对 {impactMembers} 名成员下次请求即失效，菜单不渲染；重新授权后原勾选恢复。</span>
            </label>
          </FormField>
        </>
      )}
    </Modal>
  )
}
