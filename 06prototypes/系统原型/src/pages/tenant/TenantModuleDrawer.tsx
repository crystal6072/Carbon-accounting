import { useEffect, useState } from 'react'
import { Button, FormField, Icon, useToast } from '@/shared/components'
import type { Tenant } from '@/types'
import { moduleImpactCount, saveTenantModules } from '@/mock/tenant'
import type { TenantModuleGroupNode } from '@/mock/menu'
import { fetchTenantModuleTree } from '@/mock/menu'
import { moduleNameOf } from './tenantMeta'
import TenantDrawer from './TenantDrawer'
import TenantModuleTree from './TenantModuleTree'

interface TenantModuleDrawerProps {
  open: boolean
  tenant: Tenant | null
  onClose: () => void
  onDone: () => void
}

/**
 * 模块授权抽屉（详情页唯一主入口）：右侧滑出，勾选配置；底部展示当前已开通模块标签。
 * 取消授权需二次确认并提示影响人数（与弹窗口径一致）。
 */
export default function TenantModuleDrawer({ open, tenant, onClose, onDone }: TenantModuleDrawerProps) {
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
  const impactMembers = pendingRemovals.reduce((sum, code) => sum + moduleImpactCount(tenant?.id ?? '', code), 0)

  const allCodes = groups.flatMap((group) => group.children.map((item) => item.id))
  const handleSelectAll = () => setCodes([...allCodes])
  const handleInvert = () => setCodes(allCodes.filter((code) => !codes.includes(code)))

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
    <TenantDrawer
      open={open}
      title={`模块授权 · ${tenant?.name ?? ''}`}
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
        勾选即授权，按应用分组展示租户端功能菜单（平台侧功能不在此清单）。取消后功能点对下次请求即失效，角色勾选保留，重新授权自动恢复。
      </p>

      <TenantModuleTree
        groups={groups}
        codes={codes}
        onChange={setCodes}
        collapsed={collapsed}
        onToggleCollapse={(id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))}
        toolbar
        onSelectAll={handleSelectAll}
        onInvert={handleInvert}
      />

      <div className="tenant-module-current">
        <div className="tenant-module-current-title">当前已开通模块</div>
        <div className="tenant-module-tags">
          {codes.length === 0 ? (
            <span className="text-tertiary">尚未开通任何模块</span>
          ) : (
            codes.map((code) => (
              <span key={code} className="tenant-module-current-tag">
                {moduleNameOf(code)}
              </span>
            ))
          )}
        </div>
      </div>

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
    </TenantDrawer>
  )
}
