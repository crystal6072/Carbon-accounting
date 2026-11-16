import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, ImagePreview, PageHeader, Table, Tag } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  availableAdminCount,
  enabledMemberCount,
  fetchTenant,
  fetchTenantAdminHistory,
  fetchTenantAudit,
  fetchTenantStatusLogs,
  memberUsage,
  profileFieldsOf,
  regionTextOfValue,
} from '@/mock/tenant'
import { maskMobile } from '@/mock/member'
import type {
  Tenant,
  TenantAdminHistory,
  TenantAuditEntry,
  TenantProfileFieldDef,
  TenantStatusLog,
} from '@/types'
import {
  relievedReasonText,
  tenantChangeText,
  tenantStatusText,
  tenantStatusTone,
  tenantTypeText,
  tenantValidState,
  tenantValidTone,
} from './tenantMeta'
import TenantOrgPage from '@/pages/org/TenantOrgPage'
import TenantTabs from './TenantTabs'
import './TenantPage.css'

type TabKey = 'basic' | 'profile' | 'admin' | 'org' | 'records'

/**
 * 平台后台 · 租户详情（**纯只读**）。
 *
 * 定位：查看只做「看」，页面内不出现任何写操作入口——
 * 编辑、模块授权、调整上限、停用 / 启用 / 删除一律在列表页操作列完成；
 * 主管理员仅展示在任关系与历史，不提供更换 / 重置入口（编辑页维护）。
 *
 * 两种进入方式：
 * 1. 列表「查看」→ 页签：租户信息 / 企业信息 / 主管理员 / 操作记录；
 * 2. 列表「组织架构」→ `?view=org`：不渲染页签，整页只有左树右详情（组织与成员），无任何操作按钮。
 */
export default function TenantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [statusLogs, setStatusLogs] = useState<TenantStatusLog[]>([])
  const [adminHistory, setAdminHistory] = useState<TenantAdminHistory[]>([])
  const [audits, setAudits] = useState<TenantAuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  /** 列表「组织架构」快捷入口（?view=org）：只渲染组织与成员，不出现其他页签 */
  const orgOnly = searchParams.get('view') === 'org'
  const [tab, setTab] = useState<TabKey>(() => {
    if (orgOnly) return 'org'
    const fromUrl = searchParams.get('tab')
    return fromUrl === 'records' ? fromUrl : 'basic'
  })

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [detail, logList, historyList, auditList] = await Promise.all([
        fetchTenant(id),
        fetchTenantStatusLogs(id),
        fetchTenantAdminHistory(id),
        fetchTenantAudit(id),
      ])
      setTenant(detail)
      setStatusLogs(logList)
      setAdminHistory(historyList)
      setAudits(auditList)
    } catch {
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const historyColumns: Column<TenantAdminHistory>[] = [
    { key: 'accountName', title: '账号', width: 140, render: (row) => <span className="nowrap">{row.accountName}（{row.accountMobile}）</span> },
    {
      key: 'status',
      title: '关系状态',
      width: 100,
      render: (row) => <Tag tone={row.status === 'active' ? 'success' : 'default'}>{row.status === 'active' ? '生效' : '已卸任'}</Tag>,
    },
    {
      key: 'relievedReason',
      title: '卸任去向',
      width: 130,
      render: (row) => (row.relievedReason ? relievedReasonText[row.relievedReason] : <span className="text-tertiary">—</span>),
    },
    { key: 'appointedBy', title: '指定人', width: 140, render: (row) => <span className="nowrap">{row.appointedBy}</span> },
    { key: 'appointedAt', title: '指定时间', width: 150, render: (row) => <span className="nowrap">{row.appointedAt}</span> },
    {
      key: 'relievedAt',
      title: '卸任时间',
      width: 150,
      render: (row) => <span className="nowrap">{row.relievedAt || <span className="text-tertiary">—</span>}</span>,
    },
  ]

  type RecordRow = {
    id: string
    time: string
    type: string
    desc: string
    operator: string
  }

  const recordColumns: Column<RecordRow>[] = [
    { key: 'time', title: '时间', width: 150, render: (r) => <span className="nowrap">{r.time}</span> },
    { key: 'type', title: '类型', width: 130, render: (r) => <Tag>{r.type}</Tag> },
    { key: 'desc', title: '说明', render: (r) => r.desc },
    { key: 'operator', title: '操作人', width: 140, render: (r) => <span className="nowrap">{r.operator}</span> },
  ]

  if (!tenant) {
    return (
      <>
        <PageHeader
          breadcrumb={['系统管理', '组织与权限', '租户管理']}
          title="租户详情"
          actions={<Button onClick={() => navigate('/system/tenant')}>返回列表</Button>}
        />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '租户不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  const usage = memberUsage(tenant.id)
  const enabled = enabledMemberCount(tenant.id)
  const validState = tenantValidState(tenant)
  const profileFields = profileFieldsOf(tenant.type)

  const records: RecordRow[] = [
    ...statusLogs.map((log) => ({
      id: log.id,
      time: log.operatedAt,
      type: tenantChangeText[log.changeType],
      desc: `${log.beforeStatus ? tenantStatusText[log.beforeStatus] : '—'} → ${tenantStatusText[log.afterStatus]}${log.reason ? `（${log.reason}）` : ''}`,
      operator: log.operatorName,
    })),
    ...audits.map((a) => ({
      id: a.id,
      time: a.createdAt,
      type: a.action,
      desc: a.detail,
      operator: a.operatorName,
    })),
  ].sort((x, y) => y.time.localeCompare(x.time))

  /** 纯查看页：操作区只保留返回入口，所有写操作回到列表执行 */
  const actionBar = <Button onClick={() => navigate('/system/tenant')}>返回列表</Button>

  return (
    <>
      <PageHeader
        breadcrumb={
          orgOnly
            ? ['系统管理', '组织与权限', '租户管理', tenant.name, '组织与成员']
            : ['系统管理', '组织与权限', '租户管理', tenant.name]
        }
        title={<span data-ann-target="tenant.detail.global">{tenant.name}</span>}
        description={`${tenantTypeText[tenant.type]} · 租户编号 ${tenant.unifiedCode} · ${tenantStatusText[tenant.status]} · 成员 ${usage}/${tenant.memberLimit} · 已授权模块 ${tenant.moduleCodes.length} 个`}
        actions={actionBar}
      />

      {!orgOnly && (
        <TenantTabs
          active={tab}
          onChange={(key) => setTab(key as TabKey)}
          items={[
            { key: 'basic', label: '租户信息' },
            { key: 'profile', label: '企业信息' },
            { key: 'admin', label: '主管理员' },
            { key: 'records', label: '操作记录', badge: records.length || '' },
          ]}
        />
      )}

      {tab === 'basic' && (
        <div className="tenant-stack">
          <div className="card">
            <div className="tenant-section-header">
              <span className="tenant-section-title" data-ann-target="tenant.detail.basic">
                租户信息
              </span>
              <Tag tone={tenantStatusTone[tenant.status]}>{tenantStatusText[tenant.status]}</Tag>
            </div>
            <div className="tenant-section-body">
              <div className="detail-list">
                <div className="detail-item">
                  <span className="detail-label">租户名称</span>
                  <span className="detail-value">{tenant.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">租户类型</span>
                  <span className="detail-value">{tenantTypeText[tenant.type]}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">有效期</span>
                  <span className="detail-value">
                    {tenant.validFrom || tenant.validTo
                      ? `${tenant.validFrom || '—'} 至 ${tenant.validTo || '—'}`
                      : '长期有效'}
                    <Tag tone={tenantValidTone(validState)}>{validState}</Tag>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">成员数上限</span>
                  <span className="detail-value">
                    {tenant.memberLimit}（当前用量 {usage}，含停用与已移出）
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">启用成员</span>
                  <span className="detail-value">{enabled} 名</span>
                </div>
                <div className="detail-item" data-ann-target="tenant.detail.meta">
                  <span className="detail-label">创建人 / 时间</span>
                  <span className="detail-value">
                    {tenant.createdBy} · {tenant.createdAt}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">更新人 / 时间</span>
                  <span className="detail-value">
                    {tenant.updatedBy} · {tenant.updatedAt}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="tenant-stack">
          <div className="card">
            <div className="tenant-section-header">
              <span className="tenant-section-title" data-ann-target="tenant.detail.profile">
                企业信息
              </span>
            </div>
            <div className="tenant-section-body">
              <div className="detail-list">
                {profileFields.map((field) => (
                  <div className="detail-item" key={field.code}>
                    <span className="detail-label">
                      {field.name}
                      {field.required ? ' *' : ''}
                    </span>
                    <span className="detail-value">{profileDisplayValue(field, tenant.profile[field.code] ?? '')}</span>
                  </div>
                ))}
                <div className="detail-item">
                  <span className="detail-label">联系人</span>
                  <span className="detail-value">
                    {tenant.contactName ? (
                      `${tenant.contactName}（${tenant.contactPhone}）`
                    ) : (
                      <span className="text-tertiary">未填（非必填）</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="tenant-section-tip">
              企业信息字段与租户端「租户信息」完全一致；租户可自行维护（租户类型不可改），此处只读复核。
            </div>
          </div>
        </div>
      )}

      {tab === 'admin' && (
        <div className="tenant-stack">
          <div className="card">
            <div className="tenant-section-header">
              <span className="tenant-section-title" data-ann-target="tenant.detail.admin">
                主管理员
              </span>
            </div>
            <div className="tenant-section-body">
              <div className="detail-list">
                <div className="detail-item">
                  <span className="detail-label">在任主管理员</span>
                  <span className="detail-value">
                    {tenant.adminAccountId
                      ? `${tenant.adminName}${tenant.adminMobile ? `（${maskMobile(tenant.adminMobile)}）` : ''}`
                      : '未指定'}
                  </span>
                </div>
              </div>
              {availableAdminCount(tenant.id) === 0 && (
                <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-error)' }} data-ann-target="tenant.detail.no-admin">
                  该租户当前无可用管理员（成员正常 + 账号启用 + 持「租户管理员」角色），请前往编辑页处理。
                </p>
              )}
            </div>
            <div className="tenant-table-wrap">
              <Table columns={historyColumns} data={adminHistory} rowKey={(row) => row.id} />
            </div>
          </div>
        </div>
      )}

      {orgOnly && <TenantOrgPage tenantId={tenant.id} embedded />}

      {tab === 'records' && (
        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="tenant.detail.records">
              操作记录
            </span>
            <span className="toolbar-tip">含状态变更与操作审计，删除事件由审计长期留存</span>
          </div>
          <div className="tenant-table-wrap">
            <Table columns={recordColumns} data={records} rowKey={(row) => row.id} />
          </div>
          <div className="tenant-section-tip">审计只增不改不删；状态变更与操作审计合并展示，删除不写状态变更表、仅留审计。</div>
        </div>
      )}
    </>
  )
}

/** 扩展档案字段值 → 展示文案（region / 布尔 / 选项做本地化） */
function profileDisplayValue(field: TenantProfileFieldDef, value: string) {
  if (field.type === 'image') return <ImagePreview value={value} emptyText="未上传" />
  if (!value) return <span className="text-tertiary">未填</span>
  if (field.type === 'region') return regionTextOfValue(value) || value
  if (field.type === 'boolean') return value === '1' ? '是' : '否'
  if (field.type === 'select') return field.options?.find((item) => item.value === value)?.label ?? value
  if (field.type === 'multi_select') {
    return value
      .split(',')
      .map((item) => field.options?.find((option) => option.value === item)?.label ?? item)
      .join('、')
  }
  return value
}
