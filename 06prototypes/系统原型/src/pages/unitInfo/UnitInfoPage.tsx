import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormField, Icon, Input, Modal, PageHeader, ProfileFieldControl, Tag, useToast } from '@/shared/components'
import { CURRENT_TENANT_ID } from '@/mock/member'
import {
  fetchTenant,
  missingTenantProfileFields,
  saveTenantInfo,
  tenantProfileCompleteness,
  tenantSelfEditFields,
} from '@/mock/tenant'
import type { Tenant, TenantProfileFieldDef } from '@/types'
import { tenantStatusText, tenantStatusTone, tenantTypeText, tenantValidState, tenantValidTone } from '../tenant/tenantMeta'
import './UnitInfoPage.css'

/** 首次登录引导：本次会话内跳过即不再自动弹出（业务 PRD V0.10 §4.15） */
const GUIDE_DISMISSED_KEY = 'pcf-unit-info-guide-dismissed'

/**
 * 租户端 · 系统管理 · 租户信息：
 * - 与平台端「租户管理」字段口径一致，分两段：
 *   区块一「基本信息」只读（租户编号 / 名称 / 类型 / 状态 / 有效期 / 成员数上限 / 管理员），租户类型不可改；
 *   区块二「企业信息」由本单位自行维护（企业 logo、统一社会信用代码、所在行业、企业规模、所在地区、
 *   详细地址、企业官网、法人姓名、法人联系电话、联系人、联系人电话），保存后立即生效；
 * - 两段必填口径与平台一致：统一社会信用代码、所在行业、所在地区、详细地址必填，其余选填；
 * - 档案未完善不阻断登录与业务，只在完整度条与首次登录引导中提示（§4.15）；
 * - 租户停用时整页只读；保存有实际变化时写一条租户侧操作审计日志。
 */
export default function UnitInfoPage() {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [contact, setContact] = useState({ contactName: '', contactPhone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const canEdit = tenant?.status === 'enabled'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const detail = await fetchTenant(CURRENT_TENANT_ID)
      setTenant(detail)
      setValues({ ...detail.profile })
      setContact({ contactName: detail.contactName, contactPhone: detail.contactPhone })
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  /** 企业信息字段：与平台端同一套扩展字段，本单位可自行维护 */
  const editableFields = useMemo<TenantProfileFieldDef[]>(
    () => (tenant ? tenantSelfEditFields(tenant.type) : []),
    [tenant],
  )
  const missing = useMemo<TenantProfileFieldDef[]>(() => (tenant ? missingTenantProfileFields(tenant) : []), [tenant])
  const completeness = useMemo(
    () => (tenant ? tenantProfileCompleteness(tenant) : { filled: 0, required: 0, percent: 100 }),
    [tenant],
  )

  /** 首次登录引导：有待完善项且本次会话未跳过时自动弹出 */
  useEffect(() => {
    if (loading || !canEdit || missing.length === 0) return
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(GUIDE_DISMISSED_KEY) === '1'
    } catch {
      /* ignore */
    }
    if (!dismissed) setGuideOpen(true)
  }, [loading, canEdit, missing.length])

  const dismissGuide = () => {
    setGuideOpen(false)
    try {
      sessionStorage.setItem(GUIDE_DISMISSED_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const focusFirstMissing = () => {
    const first = missing[0]
    if (!first) return
    dismissGuide()
    requestAnimationFrame(() => {
      document.getElementById(`unit-field-${first.code}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  /** 是否有未保存修改（企业信息 + 联系人合并判断） */
  const dirty = useMemo(() => {
    if (!tenant) return false
    if (contact.contactName !== tenant.contactName || contact.contactPhone !== tenant.contactPhone) return true
    return editableFields.some((field) => (values[field.code] ?? '') !== (tenant.profile[field.code] ?? ''))
  }, [tenant, contact, values, editableFields])

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    editableFields.forEach((field) => {
      const value = (values[field.code] ?? '').trim()
      if (value && field.maxLength && value.length > field.maxLength) {
        next[field.code] = `最长 ${field.maxLength} 字符`
      }
      if (value && field.type === 'number' && Number.isNaN(Number(value))) {
        next[field.code] = '请输入数字'
      }
    })
    const phone = contact.contactPhone.trim()
    const name = contact.contactName.trim()
    if (!!name !== !!phone) next.contactPhone = '联系人与联系人电话须同时填写'
    else if (phone && !/^1\d{10}$/.test(phone)) next.contactPhone = '11 位手机号'
    setErrors(next)
    if (Object.keys(next).length > 0) {
      toast('请修正标红字段后再保存', 'error')
      return false
    }
    return true
  }

  /** 统一保存：企业信息 + 联系人，保存后立即生效并记审计 */
  const handleSave = async () => {
    if (!tenant || !validate()) return
    if (!dirty) {
      toast('暂无修改')
      return
    }
    setSaving(true)
    try {
      const operatorName = '租户管理员'
      const payload: Record<string, string> = {}
      editableFields.forEach((field) => {
        payload[field.code] = values[field.code] ?? ''
      })
      const updated = await saveTenantInfo(CURRENT_TENANT_ID, {
        profileValues: payload,
        contact: { contactName: contact.contactName.trim(), contactPhone: contact.contactPhone.trim() },
        operatorName,
      })
      setTenant(updated)
      toast('保存成功，修改已生效')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (tenant) {
      setValues({ ...tenant.profile })
      setContact({ contactName: tenant.contactName, contactPhone: tenant.contactPhone })
    }
    setErrors({})
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '租户信息']} title="租户信息" />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  if (!tenant) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '租户信息']} title="租户信息" />
        <div className="card">
          <div className="empty">未找到所属租户</div>
        </div>
      </>
    )
  }

  const validState = tenantValidState(tenant)

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '租户信息']}
        title={<span data-ann-target="unitinfo.page.global">租户信息</span>}
        description={`维护「${tenant.name}」的租户信息：基本信息由平台维护（只读，租户类型不可改），企业信息由本单位自助编辑，保存后立即生效。`}
        actions={
          canEdit ? (
            <>
              <Button onClick={handleReset} disabled={!dirty}>
                重置
              </Button>
              <Button
                variant="primary"
                disabled={saving}
                data-ann-target="unitinfo.page.save"
                onClick={() => void handleSave()}
              >
                保存修改
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="unit-info-stack">
        {tenant.status === 'disabled' && (
          <div className="unit-info-banner">租户已停用，数据冻结：本页只读，恢复后可继续维护。</div>
        )}

        <div
          className={`unit-info-completeness${completeness.percent === 100 ? ' is-done' : ''}`}
          data-ann-target="unitinfo.completeness"
        >
          <div className="unit-info-completeness-body">
            企业信息完整度 {completeness.percent}%（{completeness.filled}/{completeness.required}）
            {missing.length > 0
              ? `，待完善：${missing.map((field) => field.name).join('、')}。未完善不影响登录与业务使用。`
              : '，必填项已齐全。'}
          </div>
          <div className="unit-info-completeness-actions">
            {missing.length > 0 && <Button onClick={focusFirstMissing}>去完善</Button>}
            {canEdit && (
              <button type="button" className="link" data-ann-target="unitinfo.guide" onClick={() => setGuideOpen(true)}>
                查看引导
              </button>
            )}
          </div>
        </div>

        {/* 区块一 · 基本信息：平台维护，只读（租户类型不可改） */}
        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="unitinfo.section.basic">
              基本信息
            </span>
            <span className="toolbar-tip">由平台维护，本区块只读</span>
          </div>
          <div className="tenant-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">租户编号</span>
                <span className="detail-value">{tenant.unifiedCode}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">租户名称</span>
                <span className="detail-value">{tenant.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">租户类型</span>
                <span className="detail-value">{tenantTypeText[tenant.type]}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">租户状态</span>
                <span className="detail-value">
                  <Tag tone={tenantStatusTone[tenant.status]}>{tenantStatusText[tenant.status]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">有效期</span>
                <span className="detail-value">
                  <Tag tone={tenantValidTone(validState)}>{validState}</Tag>
                  <span style={{ marginLeft: 6 }}>
                    {tenant.validFrom || '—'} 至 {tenant.validTo || '—'}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">成员数上限</span>
                <span className="detail-value">{tenant.memberLimit} 人</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">管理员</span>
                <span className="detail-value">{tenant.adminName || '未指定'}</span>
              </div>
            </div>
          </div>
          <div className="tenant-section-tip">租户类型由平台开户时确定、不可修改；如需变更请联系平台。</div>
        </div>

        {/* 区块二 · 企业信息：与平台端字段一致，本单位自行维护 */}
        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="unitinfo.section.profile">
              企业信息
            </span>
            <span className="toolbar-tip">由本单位维护，保存后立即生效</span>
          </div>
          <div className="tenant-section-body">
            <div className="form-grid">
              {editableFields.map((field) => (
                <div id={`unit-field-${field.code}`} key={field.code}>
                  <ProfileFieldControl
                    field={field}
                    value={values[field.code] ?? ''}
                    error={errors[field.code]}
                    disabled={!canEdit}
                    onChange={(value) => setValues((prev) => ({ ...prev, [field.code]: value }))}
                  />
                </div>
              ))}
              <div id="unit-field-contactName">
                <FormField label="联系人" hint="非必填，与联系人电话成对填写">
                  <Input
                    value={contact.contactName}
                    placeholder="请输入"
                    disabled={!canEdit}
                    onChange={(e) => setContact((prev) => ({ ...prev, contactName: e.target.value }))}
                  />
                </FormField>
              </div>
              <div id="unit-field-contactPhone">
                <FormField label="联系人电话" error={errors.contactPhone} hint="11 位手机号">
                  <Input
                    value={contact.contactPhone}
                    placeholder="请输入"
                    invalid={!!errors.contactPhone}
                    disabled={!canEdit}
                    onChange={(e) => setContact((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  />
                </FormField>
              </div>
            </div>
          </div>
          <div className="tenant-section-tip">
            标 * 为必填项（统一社会信用代码、所在行业、所在地区、详细地址），未填只在待完善清单提示，不阻断保存与业务。
            保存后写一条操作审计日志（记变更字段前后值）；本页保存的字段如被报告引用，引用该字段的报告将标记为「待更新」。
          </div>
        </div>
      </div>

      {guideOpen && (
        <Modal
          open={guideOpen}
          title="完善租户信息"
          size="sm"
          onClose={dismissGuide}
          footer={
            <>
              <Button onClick={dismissGuide}>跳过</Button>
              <Button variant="primary" onClick={focusFirstMissing}>
                去完善
              </Button>
            </>
          }
        >
          <div className="modal-confirm-text" data-ann-target="unitinfo.guide.modal">
            <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
              <Icon name="warning" size={16} />
            </span>
            <div>
              欢迎使用产品碳足迹核算工具。请先补齐本单位企业信息，便于报告编制与数据统计；未完善不影响登录与业务使用。
            </div>
          </div>
          {missing.length > 0 ? (
            <ul className="unit-info-guide-list">
              {missing.map((field) => (
                <li key={field.code}>{field.name}</li>
              ))}
            </ul>
          ) : (
            <div className="toolbar-tip" style={{ marginTop: 'var(--space-xs)' }}>
              当前必填项已齐全（演示租户档案完整，清空任一必填项保存后即可看到待完善清单）。
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
