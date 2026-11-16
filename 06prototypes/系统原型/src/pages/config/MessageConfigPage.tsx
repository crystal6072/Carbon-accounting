import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Input, Modal, PageHeader, Table, Tag, Textarea, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  MSG_TEMPLATE_VAR_SAMPLES,
  MSG_TEMPLATE_VARS,
  fetchMsgInappConfig,
  fetchMsgTemplates,
  saveMsgInappConfig,
  saveMsgTemplate,
  type MsgInappConfig,
  type MsgTemplate,
} from '@/mock/config'
import './config.css'

type Tab = 'inapp' | 'template'

const previewText = (text: string) =>
  text.replace(/\{[^}]+\}/g, (m) => MSG_TEMPLATE_VAR_SAMPLES[m] ?? m)

export default function MessageConfigPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'template' ? 'template' : 'inapp'
  const [config, setConfig] = useState<MsgInappConfig | null>(null)
  const [templates, setTemplates] = useState<MsgTemplate[]>([])
  const [editTpl, setEditTpl] = useState<MsgTemplate | null>(null)
  const [viewTpl, setViewTpl] = useState<MsgTemplate | null>(null)

  const load = useCallback(async () => {
    const [inapp, list] = await Promise.all([fetchMsgInappConfig(), fetchMsgTemplates()])
    setConfig(inapp)
    setTemplates(list)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const switchTab = (next: Tab) => setParams(next === 'template' ? { tab: 'template' } : {})

  const handleSaveConfig = async (draft: MsgInappConfig) => {
    try {
      const saved = await saveMsgInappConfig(draft)
      setConfig(saved)
      toast('站内信配置已保存')
    } catch (err) {
      toast(err instanceof Error ? err.message : '保存失败，请稍后重试', 'error')
    }
  }

  const handleSaveTemplate = async (tpl: MsgTemplate) => {
    try {
      const saved = await saveMsgTemplate(tpl)
      setTemplates((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
      setEditTpl(null)
      toast('消息模板已保存')
    } catch (err) {
      toast(err instanceof Error ? err.message : '保存失败，请稍后重试', 'error')
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '消息配置']}
        title="消息配置"
        description="仅站内信配置与消息模板配置"
      />

      <div className="card msg-page" data-ann-target="config.message.global">
        <div className="msg-tabs" data-ann-target="config.message.tabs">
          <button className={tab === 'inapp' ? 'active' : ''} onClick={() => switchTab('inapp')}>站内信配置</button>
          <button className={tab === 'template' ? 'active' : ''} onClick={() => switchTab('template')}>消息模板配置</button>
        </div>

        {tab === 'inapp' && <InappTab config={config} onSave={handleSaveConfig} />}
        {tab === 'template' && <TemplateTab templates={templates} onEdit={setEditTpl} onView={setViewTpl} />}
      </div>

      {editTpl && (
        <TemplateEditModal tpl={editTpl} onClose={() => setEditTpl(null)} onSave={handleSaveTemplate} />
      )}
      {viewTpl && <TemplateViewModal tpl={viewTpl} onClose={() => setViewTpl(null)} />}
    </>
  )
}

/* ============ 页签一：站内信配置 ============ */
function InappTab({ config, onSave }: { config: MsgInappConfig | null; onSave: (c: MsgInappConfig) => Promise<void> }) {
  const toast = useToast()
  const [enabled, setEnabled] = useState(true)
  const [retention, setRetention] = useState('30')

  useEffect(() => {
    if (!config) return
    setEnabled(config.enabled)
    setRetention(String(config.retentionDays))
  }, [config])

  const handleSubmit = () => {
    const days = Number(retention)
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      return toast('保留天数需为 0–365 的整数，0 表示永久保留', 'error')
    }
    void onSave({ enabled, retentionDays: days, updatedAt: config?.updatedAt ?? '' })
  }

  const handleReset = () => {
    if (!config) return
    setEnabled(config.enabled)
    setRetention(String(config.retentionDays))
  }

  return (
    <div className="msg-inapp">
      {/* 行 1：启用站内信 */}
      <div className="msg-row">
        <div className="msr-main">
          <span className="msr-title">启用站内信</span>
          <span className="msr-desc">关闭后系统不再产生新的站内信，已有消息仍可在顶栏铃铛查看。</span>
        </div>
        <div className="msr-control">
          <label className="switch">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="switch-track" />
            <span className="switch-thumb" />
          </label>
        </div>
      </div>

      {/* 行 2：消息保留天数 */}
      <div className="msg-field">
        <label className="msg-label">消息保留天数</label>
        <div className="msg-input-wrap">
          <Input type="number" min={0} max={365} value={retention} onChange={(e) => setRetention(e.target.value)} />
          <span className="unit">天</span>
        </div>
        <div className="msg-help">0 = 永久保留（单位：天）；演示环境不执行真实清理。</div>
      </div>

      {/* 信息提示 */}
      <div className="msg-info">
        <svg className="msg-info-icon" width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.75 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zM7 6.5a.75.75 0 011.5 0V11a.75.75 0 01-1.5 0V6.5z" />
        </svg>
        <span>站内信为系统内置通道，无需配置服务器 / 网关参数；事件清单系统内置，接收人由事件自动确定。消息在顶栏铃铛查看并可标记已读。</span>
      </div>

      {/* 操作按钮 */}
      <div className="msg-actions">
        <button type="button" className="msg-btn msg-btn-default" onClick={handleReset} disabled={!config}>重置</button>
        <span data-ann-target="config.message.inapp.save"><button type="button" className="msg-btn msg-btn-primary" onClick={handleSubmit} disabled={!config}>保存</button></span>
      </div>
    </div>
  )
}

/* ============ 页签二：消息模板配置 ============ */
function TemplateTab({ templates, onEdit, onView }: {
  templates: MsgTemplate[]
  onEdit: (t: MsgTemplate) => void
  onView: (t: MsgTemplate) => void
}) {
  const columns: Column<MsgTemplate>[] = [
    {
      key: 'event',
      title: '事件',
      width: 190,
      render: (t) => (
        <div>
          <div className="msg-event-name">{t.eventName}</div>
          <div className="text-tertiary mono" style={{ fontSize: 12 }}>{t.eventCode}</div>
        </div>
      ),
    },
    { key: 'title', title: '模板标题', width: 180, render: (t) => <span className="cell-ellipsis">{t.title}</span> },
    { key: 'body', title: '正文摘要', render: (t) => <span className="cell-ellipsis">{t.body.slice(0, 40)}{t.body.length > 40 ? '…' : ''}</span> },
    {
      key: 'status',
      title: '状态',
      width: 90,
      align: 'center',
      render: (t) => <Tag tone={t.status === 'enabled' ? 'success' : 'default'}>{t.status === 'enabled' ? '已启用' : '已停用'}</Tag>,
    },
    { key: 'updatedAt', title: '更新时间', width: 150, render: (t) => <span className="nowrap">{t.updatedAt}</span> },
    {
      key: 'actions',
      title: '操作',
      width: 120,
      render: (t) => (
        <span className="row-actions">
          <button className="link" onClick={() => onEdit(t)}>编辑</button>
          <button className="link" onClick={() => onView(t)}>预览</button>
        </span>
      ),
    },
  ]

  return (
    <div>
      <div className="msg-info" style={{ marginBottom: 12 }}>
        <svg className="msg-info-icon" width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.75 3.25a.75.75 0 10-1.5 0 .75.75 0 001.5 0zM7 6.5a.75.75 0 011.5 0V11a.75.75 0 01-1.5 0V6.5z" />
        </svg>
        <span>7 个内置事件各 1 条站内信模板，仅可编辑文案与启停，不新增 / 删除模板；变量白名单外手写 {`{}`} 内容保存时将被拦截。</span>
      </div>
      <Table columns={columns} data={templates} rowKey={(t) => t.id} emptyText="暂无消息模板" />
    </div>
  )
}

function TemplateEditModal({ tpl, onClose, onSave }: {
  tpl: MsgTemplate
  onClose: () => void
  onSave: (t: MsgTemplate) => Promise<void>
}) {
  const toast = useToast()
  const [title, setTitle] = useState(tpl.title)
  const [body, setBody] = useState(tpl.body)
  const [enabled, setEnabled] = useState(tpl.status === 'enabled')

  const handleSave = () => {
    if (!title.trim() || !body.trim()) return toast('标题与正文不能为空', 'error')
    const bad = [...`${title}${body}`.matchAll(/\{[^}]+\}/g)]
      .map((m) => m[0])
      .filter((v) => !MSG_TEMPLATE_VARS.includes(v))
    if (bad.length) return toast(`变量 ${bad.join('、')} 不在白名单内`, 'error')
    void onSave({ ...tpl, title: title.trim(), body: body.trim(), status: enabled ? 'enabled' : 'disabled' })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`编辑消息模板 · ${tpl.eventName}`}
      footer={<><Button onClick={onClose}>取消</Button><span data-ann-target="config.message.tpl.save"><Button variant="primary" onClick={handleSave}>保存</Button></span></>}
    >
      <div className="form-grid">
        <div className="form-item form-item-full">
          <label className="form-label required">标题</label>
          <Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
          <span className="char-count">{title.length}/100</span>
        </div>
        <div className="form-item form-item-full">
          <label className="form-label required">正文</label>
          <Textarea className="mono" value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} />
          <span className="char-count">{body.length}/1000</span>
          <div className="msg-var-chips" style={{ marginTop: 6 }}>
            {MSG_TEMPLATE_VARS.map((v) => (
              <span className="msg-var-chip" key={v}>{v}</span>
            ))}
          </div>
        </div>
        <div className="form-item form-item-full">
          <label className="form-label">启用</label>
          <div className="checkbox-row">
            <label><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> 启用后该事件投递站内信</label>
          </div>
        </div>
        <div className="form-item form-item-full">
          <label className="form-label">预览</label>
          <div className="msg-bubble">
            <div className="mb-title">{previewText(title)}</div>
            <div>{previewText(body)}</div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function TemplateViewModal({ tpl, onClose }: { tpl: MsgTemplate; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="模板预览" footer={<Button onClick={onClose}>关闭</Button>}>
      <div className="kv">
        <span className="kv-label">事件</span><span className="kv-value">{tpl.eventName}（{tpl.eventCode}）</span>
        <span className="kv-label">状态</span><span className="kv-value">{tpl.status === 'enabled' ? '已启用' : '已停用'}</span>
      </div>
      <div className="block-title" style={{ marginTop: 12 }}>站内信内容（变量为示例值）</div>
      <div className="msg-bubble">
        <div className="mb-title">{previewText(tpl.title)}</div>
        <div>{previewText(tpl.body)}</div>
      </div>
    </Modal>
  )
}
