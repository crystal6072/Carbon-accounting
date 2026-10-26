import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Modal, PageHeader, ProfileFieldControl, Tag, useToast } from '@/shared/components'
import { CURRENT_TENANT_ID } from '@/mock/member'
import {
  TENANT_CONTACT_FIELDS,
  TENANT_MASTER_FIELDS,
  fetchTenant,
  missingTenantProfileFields,
  qualificationFields,
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
 * 租户端 · 系统管理 · 租户信息（业务 PRD V0.10 §4.14，MVP极简版）：
 * - 取消审批流，改为「部分只读 + 部分自编辑」：
 *   区块一「法定资质信息」纯只读（灰底），提示「如需修改请联系平台」；
 *   区块二「日常联络展示信息」与区块三「业务属性信息」由租户管理员直接编辑（白底），保存后立即生效；
 * - 区块二 / 区块三共用一个【保存修改】按钮；有实际变化时写一条租户侧操作审计日志；
 * - 法定资质 / 业务属性的渲染口径来自平台端扩展表单模板的字段属性 `tenant_editable`；
 * - 档案未完善不阻断登录与业务，只在完整度条与首次登录引导中提示（§4.15）；
 * - 无「单位信息维护」功能点或租户停用时，整页只读。
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

  /** 法定资质类字段（只读，来自扩展表单模板 tenant_editable = false） */
  const readonlyFields = useMemo<TenantProfileFieldDef[]>(
    () => (tenant ? qualificationFields(tenant.type) : []),
    [tenant],
  )
  /** 业务属性类字段（可编辑，来自扩展表单模板 tenant_editable = true） */
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

  /** 是否有未保存修改（区块二 + 区块三合并判断） */
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
    if (!!name !== !!phone) next.contactPhone = '联络人姓名与联络电话须同时填写'
    else if (phone && !/^1\d{10}$/.test(phone)) next.contactPhone = '11 位手机号'
    setErrors(next)
    if (Object.keys(next).length > 0) {
      toast('请修正标红字段后再保存', 'error')
      return false
    }
    return true
  }

  /** 统一保存：区块二「日常联络展示信息」+ 区块三「业务属性信息」，保存后立即生效并记审计 */
  const handleSave = async () => {
    if (!tenant || !validate()) return
    if (!dirty) {
      toast('暂无修改')
      return
    }
    setSaving(true)
    try {
      const operatorName = '租户管理员'
      // 只提交业务属性类字段：法定资质类字段即使页面带出也不允许直写
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
        description={`维护「${tenant.name}」的租户信息：法定资质信息由平台维护（只读），日常联络展示信息与业务属性信息由本单位自助编辑，保存后立即生效。`}
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
            业务属性完整度 {completeness.percent}%（{completeness.filled}/{completeness.required}）
            {missing.length > 0
              ? `，待完善：${missing.map((field) => field.name).join('、')}。未完善不影响登录与业务使用。`
              : '，业务属性必填项已齐全。'}
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

        {/* 区块一 · 法定资质信息：纯只读（灰底），来自扩展表单模板 tenant_editable = false 的字段 */}
        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="unitinfo.section.qualification">
              法定资质信息
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
                <span className="detail-label">主管理员</span>
                <span className="detail-value">{tenant.adminName ? `${tenant.adminName}（${tenant.adminMobile}）` : '未指定'}</span>
              </div>
              {TENANT_MASTER_FIELDS.map((item) => (
                <div className="detail-item" key={String(item.field)}>
                  <span className="detail-label">{item.label}</span>
                  <span className="detail-value">
                    <span className={`profile-readonly${tenant[item.field] ? '' : ' is-empty'}`}>
                      {String(tenant[item.field] ?? '') || '未填'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {readonlyFields.length > 0 && (
              <div className="form-grid unit-info-readonly-grid">
                {readonlyFields.map((field) => (
                  <div id={`unit-field-${field.code}`} key={field.code}>
                    <ProfileFieldControl
                      field={field}
                      value={tenant.profile[field.code] ?? ''}
                      disabled
                      onChange={() => undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="tenant-section-tip">法定资质信息由平台维护，如需修改请联系平台。</div>
        </div>

        {/* 区块二 · 日常联络展示信息：租户管理员可编辑（白底），与区块三共用【保存修改】 */}
        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="unitinfo.section.contact">
              日常联络展示信息
            </span>
            <span className="toolbar-tip">用于报告等对外场景展示；由本单位维护，保存后立即生效</span>
          </div>
          <div className="tenant-section-body">
            <div className="form-grid">
              {TENANT_CONTACT_FIELDS.map((item) => (
                <FormField
                  key={item.field}
                  label={item.label}
                  error={item.field === 'contactPhone' ? errors.contactPhone : undefined}
                  hint={item.field === 'contactPhone' ? '11 位手机号' : undefined}
                >
                  <Input
                    value={contact[item.field]}
                    placeholder="请输入"
                    disabled={!canEdit}
                    onChange={(e) => setContact((prev) => ({ ...prev, [item.field]: e.target.value }))}
                  />
                </FormField>
              ))}
            </div>
          </div>
          <div className="tenant-section-tip">联络人姓名与联络电话须成对填写；修改后随【保存修改】立即生效，并记录操作审计日志。</div>
        </div>

        {/* 区块三 · 业务属性信息：按扩展表单模板 tenant_editable 渲染，可编辑字段为白底输入框 */}
        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="unitinfo.section.profile">
              业务属性信息
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
            </div>
          </div>
          <div className="tenant-section-tip">
            当前类型：{tenantTypeText[tenant.type]}；标 * 为必填项，未填只在待完善清单提示，不阻断保存与业务。
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
          <div data-ann-target="unitinfo.guide.modal">
            欢迎使用产品碳足迹核算工具。请先补齐本单位业务属性信息，便于报告编制与数据统计；未完善不影响登录与业务使用。
          </div>
          {missing.length > 0 ? (
            <ul className="unit-info-guide-list">
              {missing.map((field) => (
                <li key={field.code}>{field.name}</li>
              ))}
            </ul>
          ) : (
            <div className="toolbar-tip" style={{ marginTop: 'var(--space-xs)' }}>
              当前业务属性必填项已齐全（演示租户档案完整，清空任一必填项保存后即可看到待完善清单）。
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
