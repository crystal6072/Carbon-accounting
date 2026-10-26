import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  enabledMemberCount,
  fetchTenant,
  fetchTenantAdminHistory,
  fetchTenantAudit,
  fetchTenantMembers,
  fetchTenantStatusLogs,
  memberUsage,
  profileFieldsOf,
  regionTextOfValue,
  isPlatformSuperAdmin,
} from '@/mock/tenant'
import type {
  Tenant,
  TenantAdminHistory,
  TenantAuditEntry,
  TenantMemberItem,
  TenantProfileFieldDef,
  TenantStatusLog,
} from '@/types'
import {
  memberStatusText,
  memberStatusTone,
  moduleNameOf,
  relievedReasonText,
  tenantActions,
  tenantChangeText,
  tenantStatusText,
  tenantStatusTone,
  tenantTypeText,
  tenantValidState,
  tenantValidTone,
} from './tenantMeta'
import TenantStatusModal from './TenantStatusModal'
import TenantDeleteModal from './TenantDeleteModal'
import TenantModuleModal from './TenantModuleModal'
import TenantLimitModal from './TenantLimitModal'
import TenantEnterModal from './TenantEnterModal'
import TenantAdminModal from './TenantAdminModal'
import './TenantPage.css'

export default function TenantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  /** 超管专属动作（删除 / 进入租户）的判定，见 C-08；原型当前登录者恒为超管 */
  const superAdmin = isPlatformSuperAdmin()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [members, setMembers] = useState<TenantMemberItem[]>([])
  const [statusLogs, setStatusLogs] = useState<TenantStatusLog[]>([])
  const [adminHistory, setAdminHistory] = useState<TenantAdminHistory[]>([])
  const [audits, setAudits] = useState<TenantAuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [moduleOpen, setModuleOpen] = useState(false)
  const [limitOpen, setLimitOpen] = useState(false)
  const [enterOpen, setEnterOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [detail, memberList, logList, historyList, auditList] = await Promise.all([
        fetchTenant(id),
        fetchTenantMembers(id),
        fetchTenantStatusLogs(id),
        fetchTenantAdminHistory(id),
        fetchTenantAudit(id),
      ])
      setTenant(detail)
      setMembers(memberList)
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

  const memberColumns: Column<TenantMemberItem>[] = [
    { key: 'name', title: '姓名', width: 100, render: (row) => <span className="nowrap">{row.name}</span> },
    { key: 'mobile', title: '手机号', width: 130, render: (row) => <span className="nowrap">{row.mobile}</span> },
    { key: 'deptName', title: '部门', width: 120, render: (row) => <span className="nowrap">{row.deptName}</span> },
    {
      key: 'roleNames',
      title: '角色',
      width: 180,
      render: (row) => (
        <span className="tenant-module-tags">
          {row.roleNames.map((role) => (
            <Tag key={role}>{role}</Tag>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      title: '成员状态',
      width: 100,
      render: (row) => <Tag tone={memberStatusTone[row.status]}>{memberStatusText[row.status]}</Tag>,
    },
  ]

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
        <PageHeader breadcrumb={['系统管理', '组织与权限', '租户管理']} title="租户详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '租户不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  const action = tenantActions[tenant.status]
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

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '租户管理', tenant.name]}
        title={<span data-ann-target="tenant.detail.global">{tenant.name}</span>}
        description={`${tenantTypeText[tenant.type]} · 租户编号 ${tenant.unifiedCode} · ${tenantStatusText[tenant.status]} · 成员 ${usage}/${tenant.memberLimit} · 已授权模块 ${tenant.moduleCodes.length} 个`}
        actions={
          <>
            <Button onClick={() => navigate('/system/tenant')}>返回列表</Button>
            {action.edit && (
              <Button data-ann-target="tenant.detail.action.edit" onClick={() => navigate(`/system/tenant/${tenant.id}/edit`)}>
                编辑
              </Button>
            )}
            {action.limit && (
              <Button data-ann-target="tenant.detail.action.limit" onClick={() => setLimitOpen(true)}>
                调整上限
              </Button>
            )}
            {action.module && (
              <Button data-ann-target="tenant.detail.action.module" onClick={() => setModuleOpen(true)}>
                模块授权
              </Button>
            )}
            {/* 进入租户为超管专属动作（C-08） */}
            {superAdmin && action.enter && (
              <Button data-ann-target="tenant.detail.action.enter" onClick={() => setEnterOpen(true)}>
                进入租户
              </Button>
            )}
            {action.disable && (
              <Button data-ann-target="tenant.detail.action.disable" onClick={() => setStatusOpen(true)}>
                停用
              </Button>
            )}
            {action.enable && (
              <Button variant="primary" data-ann-target="tenant.detail.action.enable" onClick={() => setStatusOpen(true)}>
                启用
              </Button>
            )}
            {/* 删除为超管专属动作（C-08） */}
            {superAdmin && action.delete && (
              <Button data-ann-target="tenant.detail.action.delete" onClick={() => setDeleteOpen(true)}>
                删除
              </Button>
            )}
          </>
        }
      />

      <div className="tenant-stack">
        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="tenant.detail.basic">
              基本信息
            </span>
            <Tag tone={tenantStatusTone[tenant.status]}>{tenantStatusText[tenant.status]}</Tag>
          </div>
          <div className="tenant-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">租户名称</span>
                <span className="detail-value">{tenant.name}</span>
              </div>
              <div className="detail-item" data-ann-target="tenant.detail.code">
                <span className="detail-label">租户编号</span>
                <span className="detail-value mono">{tenant.unifiedCode}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">租户类型</span>
                <span className="detail-value">{tenantTypeText[tenant.type]}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">联系人</span>
                <span className="detail-value">
                  {tenant.contactName ? `${tenant.contactName}（${tenant.contactPhone}）` : <span className="text-tertiary">未填（非必填）</span>}
                </span>
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
                  {tenant.memberLimit}（当前用量 {usage}，含停用与已移出；{usage >= tenant.memberLimit ? '已达上限，禁新增' : '可新增'}）
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

        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="tenant.detail.profile">
              其他
            </span>
            {action.edit && <Button onClick={() => navigate(`/system/tenant/${tenant.id}/edit`)}>编辑</Button>}
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
            </div>
          </div>
          <div className="tenant-section-tip">
            按租户类型（{tenantTypeText[tenant.type]}）渲染，字段由平台配置；租户可在租户端「租户信息」自行维护其业务属性字段，此处只读复核。
          </div>
        </div>

        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="tenant.detail.module">
              模块授权
            </span>
            <Button onClick={() => setModuleOpen(true)}>模块授权</Button>
          </div>
          <div className="tenant-section-body">
            <span className="tenant-module-tags">
              {tenant.moduleCodes.map((code) => (
                <Tag key={code} tone="info">
                  {moduleNameOf(code)}
                </Tag>
              ))}
            </span>
          </div>
          <div className="tenant-section-tip">用户体系为能力底座默认全开，不进本列表；取消授权后功能点下次请求即失效，重新授权后原勾选自动恢复。</div>
        </div>

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
                  {tenant.adminAccountId ? `${tenant.adminName}（${tenant.adminMobile}）` : '未指定'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">账号标识</span>
                <span className="detail-value mono">{tenant.adminAccountId || <span className="text-tertiary">—</span>}</span>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Button variant="primary" onClick={() => setAdminOpen(true)}>
                {tenant.adminAccountId ? '更换主管理员' : '指定主管理员'}
              </Button>
              <span className="form-tip">
                {tenant.adminAccountId
                  ? '更换后原账号「租户管理员」角色立即收回，可降级为普通成员或禁用'
                  : '该租户尚未指定主管理员，请先完成首任指派；指定前无法开展成员与角色维护。'}
              </span>
            </div>
          </div>
          <div className="tenant-table-wrap">
            <Table columns={historyColumns} data={adminHistory} rowKey={(row) => row.id} />
          </div>
          <div className="tenant-section-tip">主管理员是成员标记不是角色，每租户同时仅 1 条生效关系；历史记录保留供追溯。</div>
        </div>

        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="tenant.detail.member">
              成员与用量
            </span>
            <span className="toolbar-tip">成员维护归租户端成员管理，此处只读引用</span>
          </div>
          <div className="tenant-table-wrap">
            <Table columns={memberColumns} data={members} rowKey={(row) => row.id} />
          </div>
        </div>

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
      </div>

      <TenantStatusModal
        open={statusOpen}
        tenant={tenant}
        mode={tenant.status === 'enabled' ? 'disable' : 'enable'}
        onClose={() => setStatusOpen(false)}
        onDone={() => {
          setStatusOpen(false)
          void load()
        }}
      />

      <TenantDeleteModal
        open={deleteOpen}
        tenant={tenant}
        onClose={() => setDeleteOpen(false)}
        onDone={() => {
          setDeleteOpen(false)
          navigate('/system/tenant')
        }}
      />

      <TenantModuleModal
        open={moduleOpen}
        tenant={tenant}
        onClose={() => setModuleOpen(false)}
        onDone={() => {
          setModuleOpen(false)
          void load()
        }}
      />

      <TenantLimitModal
        open={limitOpen}
        tenant={tenant}
        onClose={() => setLimitOpen(false)}
        onDone={() => {
          setLimitOpen(false)
          void load()
        }}
      />

      <TenantEnterModal
        open={enterOpen}
        tenant={tenant}
        onClose={() => setEnterOpen(false)}
        onDone={() => void load()}
      />

      <TenantAdminModal
        open={adminOpen}
        tenant={tenant}
        onClose={() => setAdminOpen(false)}
        onDone={() => {
          setAdminOpen(false)
          void load()
        }}
      />

    </>
  )
}

/** 扩展档案字段值 → 展示文案（region / 布尔 / 选项做本地化） */
function profileDisplayValue(field: TenantProfileFieldDef, value: string) {
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
