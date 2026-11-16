import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, PageHeader, Select, Table, Tag, Textarea, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  MSG_CHANNEL,
  MSG_EVENTS,
  MSG_SEND_LOGS,
  MSG_TEMPLATE_VARS,
  type MsgChannel,
  type MsgEvent,
  type MsgTemplate,
  type SendLog,
} from '@/mock/config'
import './config.css'

type Tab = 'event' | 'channel' | 'template' | 'sendlog'

export default function MessageConfigPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('event')
  const [events, setEvents] = useState<MsgEvent[]>([])
  const [channel, setChannel] = useState<MsgChannel>({ ...MSG_CHANNEL })
  const [templates, setTemplates] = useState<MsgTemplate[]>([])
  const [logs, setLogs] = useState<SendLog[]>([])
  const [editTpl, setEditTpl] = useState<MsgTemplate | null>(null)
  const [viewLog, setViewLog] = useState<SendLog | null>(null)
  const [editingSecret, setEditingSecret] = useState(false)
  const [secretInput, setSecretInput] = useState('')

  useEffect(() => {
    setEvents(MSG_EVENTS.map((e) => ({ ...e })))
    setChannel({ ...MSG_CHANNEL })
    setTemplates(MSG_TEMPLATES.map((t) => ({ ...t })))
    setLogs(MSG_SEND_LOGS.map((l) => ({ ...l })))
  }, [])

  const recentFailCount = useMemo(() => logs.filter((l) => l.status === 'failed' && within24h(l.time)).length, [logs])

  const setEvent = (id: string, patch: Partial<MsgEvent>) =>
    setEvents((prev) => prev.map((e) => (e.code === id ? { ...e, ...patch } : e)))

  const handleSave = () => {
    toast('保存成功')
  }
  const sendTestMail = () => {
    if (!channel.smtpHost || !channel.account) return toast('请补全 SMTP 配置后再发送测试邮件', 'error')
    toast('测试消息已发送')
  }
  const testChannelSite = () => toast('站内信测试已发送（可在顶栏铃铛查看）')

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '消息配置']}
        title="消息配置"
        description="事件订阅、通道、消息模板与发送记录。消息中心（顶栏铃铛 + 消息列表 + 已读）本期同期交付。"
        actions={<Button variant="primary" onClick={handleSave}>保存</Button>}
      />

      <div className="card">
        <div className="seg">
          <button className={tab === 'event' ? 'active' : ''} onClick={() => setTab('event')}>事件订阅</button>
          <button className={tab === 'channel' ? 'active' : ''} onClick={() => setTab('channel')}>通道配置</button>
          <button className={tab === 'template' ? 'active' : ''} onClick={() => setTab('template')}>消息模板</button>
          <button className={tab === 'sendlog' ? 'active' : ''} onClick={() => setTab('sendlog')}>
            发送记录{recentFailCount > 0 && <span className="seg-badge">{recentFailCount}</span>}
          </button>
        </div>

        {tab === 'event' && <EventTab events={events} channel={channel} onEvent={setEvent} onReset={(code) => setEvent(code, { site: true, mail: false, receivers: ['项目创建人'], freq: '即时' })} onSave={handleSave} />}
        {tab === 'channel' && <ChannelTab channel={channel} setChannel={setChannel} editingSecret={editingSecret} setEditingSecret={setEditingSecret} secretInput={secretInput} setSecretInput={setSecretInput} onSendTest={sendTestMail} onTestSite={testChannelSite} />}
        {tab === 'template' && <TemplateTab templates={templates} setEdit={setEditTpl} />}
        {tab === 'sendlog' && <SendLogTab logs={logs} onView={setViewLog} />}
      </div>

      {editTpl && <TemplateEditModal tpl={editTpl} onClose={() => setEditTpl(null)} onSave={(t) => { setTemplates((prev) => prev.map((x) => (x.id === t.id ? t : x))); setEditTpl(null); toast('模板已保存') }} />}
      {viewLog && <LogViewModal log={viewLog} onClose={() => setViewLog(null)} />}
    </>
  )
}

/* ============ 事件订阅 ============ */
function EventTab({ events, channel, onEvent, onReset, onSave }: { events: MsgEvent[]; channel: MsgChannel; onEvent: (id: string, p: Partial<MsgEvent>) => void; onReset: (code: string) => void; onSave: () => void }) {
  const mailDisabled = !channel.mailEnabled || !channel.verified
  const columns: Column<MsgEvent>[] = [
    { key: 'name', title: '事件', width: 200, render: (e) => <div><div>{e.name}</div><div className="text-tertiary mono" style={{ fontSize: 12 }}>{e.code}</div></div> },
    { key: 'enabled', title: '启用', width: 80, align: 'center', render: (e) => <input type="checkbox" checked={e.enabled} onChange={(v) => onEvent(e.code, { enabled: v.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} /> },
    { key: 'site', title: '站内信', width: 90, align: 'center', render: (e) => <input type="checkbox" checked={e.site} disabled={!e.enabled} onChange={(v) => onEvent(e.code, { site: v.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} /> },
    {
      key: 'mail',
      title: '邮件',
      width: 90,
      align: 'center',
      render: (e) =>
        mailDisabled ? (
          <span className="text-tertiary" title="请先在通道配置完成邮件验证">—</span>
        ) : (
          <input type="checkbox" checked={e.mail} disabled={!e.enabled} onChange={(v) => onEvent(e.code, { mail: v.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
        ),
    },
    { key: 'receivers', title: '接收对象', render: (e) => <Select options={['项目创建人', '组织管理员', '指定角色', '指定成员'].map((r) => ({ label: r, value: r }))} value={e.receivers[0] ?? ''} onChange={(v) => onEvent(e.code, { receivers: v ? [v] : [] })} /> },
    { key: 'freq', title: '频控', width: 120, render: (e) => <Select options={[{ label: '即时', value: '即时' }, { label: '每日汇总', value: '每日汇总' }]} value={e.freq} onChange={(v) => onEvent(e.code, { freq: v.target.value as MsgEvent['freq'] })} /> },
    { key: 'actions', title: '操作', width: 100, render: (e) => <button className="link" onClick={() => { onReset(e.code); toast('已重置默认') }}>重置默认</button> },
  ]
  return (
    <div>
      <div className="toolbar-tip" style={{ marginBottom: 12 }}>共 {events.length} 个事件。关闭某事件后将不再投递任何通道；邮件通道未验证时置灰。</div>
      <Table columns={columns} data={events} rowKey={(e) => e.code} />
      <div className="flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <Button variant="primary" onClick={onSave}>保存事件配置</Button>
      </div>
    </div>
  )
}

/* ============ 通道配置 ============ */
function ChannelTab({ channel, setChannel, editingSecret, setEditingSecret, secretInput, setSecretInput, onSendTest, onTestSite }: {
  channel: MsgChannel
  setChannel: (c: MsgChannel) => void
  editingSecret: boolean
  setEditingSecret: (b: boolean) => void
  secretInput: string
  setSecretInput: (s: string) => void
  onSendTest: () => void
  onTestSite: () => void
}) {
  const set = <K extends keyof MsgChannel>(k: K, v: MsgChannel[K]) => setChannel({ ...channel, [k]: v })
  return (
    <div className="form-grid" style={{ maxWidth: 760 }}>
      <div className="form-item form-item-full">
        <label className="form-label">站内信</label>
        <div className="radio-row"><label><input type="checkbox" checked disabled /> 启用（固定开启）</label></div>
        <div className="text-tertiary">站内信本期随消息中心同期交付，收件人可在顶栏铃铛查看并标记已读。</div>
        <Button size="small" style={{ marginTop: 8 }} onClick={onTestSite}>发送测试站内信</Button>
      </div>

      <div className="form-item form-item-full">
        <label className="form-label">邮件</label>
        <label className="switch"><input type="checkbox" checked={channel.mailEnabled} onChange={(e) => set('mailEnabled', e.target.checked)} /><span className="switch-track" /><span className="switch-thumb" /></label>
      </div>
      <div className="form-item"><label className="form-label">SMTP 地址</label><Input value={channel.smtpHost} disabled={!channel.mailEnabled} onChange={(e) => set('smtpHost', e.target.value)} /></div>
      <div className="form-item"><label className="form-label">端口</label><Input value={channel.smtpPort} disabled={!channel.mailEnabled} onChange={(e) => set('smtpPort', e.target.value)} /></div>
      <div className="form-item"><label className="form-label">发件账号</label><Input value={channel.account} disabled={!channel.mailEnabled} onChange={(e) => set('account', e.target.value)} /></div>
      <div className="form-item">
        <label className="form-label">密码</label>
        {editingSecret ? (
          <div className="flex gap-xs">
            <Input value={secretInput} placeholder="输入新密码" onChange={(e) => setSecretInput(e.target.value)} />
            <Button size="small" onClick={() => { setEditingSecret(false); setSecretInput('') }}>取消</Button>
          </div>
        ) : (
          <div className="flex gap-xs">
            <span className="form-static mono">{channel.secretMasked ? '••••••••' : secretInput || '未设置'}</span>
            <button className="link" onClick={() => setEditingSecret(true)}>修改密钥</button>
          </div>
        )}
      </div>
      <div className="form-item"><label className="form-label">发件人</label><Input value={channel.from} disabled={!channel.mailEnabled} onChange={(e) => set('from', e.target.value)} /></div>
      <div className="form-item"><label className="form-label">SSL</label><label className="switch"><input type="checkbox" checked={channel.ssl} disabled={!channel.mailEnabled} onChange={(e) => set('ssl', e.target.checked)} /><span className="switch-track" /><span className="switch-thumb" /></label></div>
      <div className="form-item form-item-full">
        <Button variant="primary" disabled={!channel.mailEnabled} onClick={onSendTest}>发送测试邮件</Button>
        <Tag tone={channel.verified ? 'success' : 'default'} style={{ marginLeft: 8 }}>{channel.verified ? '已验证' : '未验证'}</Tag>
      </div>
    </div>
  )
}

/* ============ 消息模板 ============ */
function TemplateTab({ templates, setEdit }: { templates: MsgTemplate[]; setEdit: (t: MsgTemplate) => void }) {
  const columns: Column<MsgTemplate>[] = [
    { key: 'event', title: '事件', width: 140, render: (t) => t.eventName },
    { key: 'channel', title: '通道', width: 100, align: 'center', render: (t) => <Tag tone={t.channel === '站内信' ? 'primary' : 'default'}>{t.channel}</Tag> },
    { key: 'title', title: '标题', width: 160, render: (t) => t.title },
    { key: 'body', title: '正文摘要', render: (t) => <span className="cell-ellipsis">{t.body.slice(0, 40)}{t.body.length > 40 ? '…' : ''}</span> },
    { key: 'actions', title: '操作', width: 140, render: (t) => <span className="row-actions"><button className="link" onClick={() => setEdit(t)}>编辑</button><button className="link" onClick={() => toast('预览已打开')}>预览</button></span> },
  ]
  return (
    <div>
      <div className="toolbar-tip" style={{ marginBottom: 12 }}>模板 = 事件 × 通道（仅已启用通道生成行）。变量白名单外手写 {`{}`} 内容将提示不在白名单内。</div>
      <Table columns={columns} data={templates} rowKey={(t) => t.id} />
    </div>
  )
}
function TemplateEditModal({ tpl, onClose, onSave }: { tpl: MsgTemplate; onClose: () => void; onSave: (t: MsgTemplate) => void }) {
  const toast = useToast()
  const [title, setTitle] = useState(tpl.title)
  const [body, setBody] = useState(tpl.body)
  const preview = body.replace(/\{[^}]+\}/g, (m) => ({ '{产品名称}': '整竹砧板', '{项目编号}': 'P-2026-0001', '{报告链接}': '《整竹砧板碳足迹报告》', '{租户名称}': '示例竹业', '{用量}': '250 kgCO₂e' }[m] ?? m))
  const handleSave = () => {
    const bad = [...body.matchAll(/\{[^}]+\}/g)].map((m) => m[0]).filter((v) => !MSG_TEMPLATE_VARS.includes(v))
    if (bad.length) return toast(`变量 ${bad.join('、')} 不在白名单内`, 'error')
    onSave({ ...tpl, title, body })
  }
  return (
    <Modal open onClose={onClose} title="编辑消息模板" size="default" footer={<><Button onClick={onClose}>取消</Button><Button variant="primary" onClick={handleSave}>保存</Button></>}>
      <div className="form-grid">
        <div className="form-item form-item-full"><label className="form-label required">标题</label><Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="form-item form-item-full">
          <label className="form-label required">正文</label>
          <Textarea className="mono" value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} />
          <span className="char-count">{body.length}/1000</span>
          <div className="toolbar-tip" style={{ marginTop: 6 }}>可用变量：{MSG_TEMPLATE_VARS.join(' ')}</div>
        </div>
        <div className="form-item form-item-full">
          <label className="form-label">预览</label>
          <div className="summary-box">{title}<br />{preview}</div>
        </div>
      </div>
    </Modal>
  )
}

/* ============ 发送记录 ============ */
function SendLogTab({ logs, onView }: { logs: SendLog[]; onView: (l: SendLog) => void }) {
  const [query, setQuery] = useState({ event: '', channel: '', status: '', receiver: '' })
  const rows = logs.filter((l) => {
    if (query.event && l.eventName !== query.event) return false
    if (query.channel && l.channel !== query.channel) return false
    if (query.status && l.status !== query.status) return false
    if (query.receiver && !l.receiver.includes(query.receiver)) return false
    return true
  })
  const statusMeta: Record<SendLog['status'], { label: string; tone: 'success' | 'error' | 'warning' }> = {
    success: { label: '成功', tone: 'success' },
    failed: { label: '失败', tone: 'error' },
    retried: { label: '已重试', tone: 'warning' },
  }
  const columns: Column<SendLog>[] = [
    { key: 'time', title: '发送时间', width: 180, render: (l) => <span className="nowrap">{l.time}</span> },
    { key: 'event', title: '事件', width: 120, render: (l) => l.eventName },
    { key: 'receiver', title: '接收人', render: (l) => <span className="cell-ellipsis">{l.receiver}</span> },
    { key: 'channel', title: '通道', width: 90, render: (l) => l.channel },
    { key: 'status', title: '状态', width: 100, align: 'center', render: (l) => <Tag tone={statusMeta[l.status].tone}>{statusMeta[l.status].label}</Tag> },
    { key: 'fail', title: '失败原因', render: (l) => <span className="cell-ellipsis">{l.failReason || '-'}</span> },
    { key: 'read', title: '已读时间', width: 160, render: (l) => <span className={l.readAt === '未读' ? 'tag-default' : ''}>{l.readAt}</span> },
    { key: 'actions', title: '操作', width: 80, render: (l) => <button className="link" onClick={() => onView(l)}>查看</button> },
  ]
  return (
    <div>
      <div className="query-bar" style={{ marginBottom: 12 }}>
        <div className="query-item"><span className="query-label">事件</span><Select placeholder="全部" value={query.event} options={Array.from(new Set(MSG_EVENTS.map((e) => e.name))).map((n) => ({ label: n, value: n }))} onChange={(e) => setQuery((p) => ({ ...p, event: e.target.value }))} /></div>
        <div className="query-item"><span className="query-label">通道</span><Select placeholder="全部" value={query.channel} options={[{ label: '站内信', value: '站内信' }, { label: '邮件', value: '邮件' }]} onChange={(e) => setQuery((p) => ({ ...p, channel: e.target.value }))} /></div>
        <div className="query-item"><span className="query-label">状态</span><Select placeholder="全部" value={query.status} options={[{ label: '成功', value: 'success' }, { label: '失败', value: 'failed' }, { label: '已重试', value: 'retried' }]} onChange={(e) => setQuery((p) => ({ ...p, status: e.target.value }))} /></div>
        <div className="query-item"><span className="query-label">接收人</span><Input value={query.receiver} placeholder="姓名/邮箱" onChange={(e) => setQuery((p) => ({ ...p, receiver: e.target.value }))} /></div>
        <div className="query-actions"><Button onClick={() => setQuery({ event: '', channel: '', status: '', receiver: '' })}>重置</Button><Button variant="primary" onClick={() => toast('查询完成')}>搜索</Button></div>
      </div>
      <Table columns={columns} data={rows} rowKey={(l) => l.id} />
    </div>
  )
}
function LogViewModal({ log, onClose }: { log: SendLog; onClose: () => void }) {
  const tpl = MSG_TEMPLATES.find((t) => t.eventName === log.eventName && t.channel === log.channel)
  const preview = (tpl?.body ?? '').replace(/\{[^}]+\}/g, (m) => ({ '{产品名称}': '整竹砧板', '{项目编号}': 'P-2026-0001', '{报告链接}': '《整竹砧板碳足迹报告》', '{租户名称}': '示例竹业', '{用量}': '250 kgCO₂e' }[m] ?? m))
  return (
    <Modal open onClose={onClose} title="发送记录详情" size="default" footer={<button className="btn" onClick={onClose}>关闭</button>}>
      <div className="kv">
        <span className="kv-label">发送时间</span><span className="kv-value">{log.time}</span>
        <span className="kv-label">事件</span><span className="kv-value">{log.eventName}</span>
        <span className="kv-label">接收人</span><span className="kv-value">{log.receiver}</span>
        <span className="kv-label">通道</span><span className="kv-value">{log.channel}</span>
        <span className="kv-label">状态</span><span className="kv-value">{log.status}</span>
        <span className="kv-label">已读</span><span className="kv-value">{log.readAt}</span>
        <span className="kv-label">失败原因</span><span className="kv-value">{log.failReason || '-'}</span>
      </div>
      <div className="block-title" style={{ marginTop: 12 }}>正文</div>
      <div className="summary-box">{preview || '（无模板）'}</div>
    </Modal>
  )
}

function toast(_m: string, _t?: 'success' | 'error') {}
function within24h(_t: string) {
  return false
}
