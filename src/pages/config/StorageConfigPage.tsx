import { useEffect, useState } from 'react'
import { Button, Input, PageHeader, Table, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { STORAGE_CONFIG, STORAGE_USAGE, testStorageConnection, type StorageConfig, type StorageUsage } from '@/mock/config'
import './config.css'

const FORMAT_OPTS = ['pdf', 'jpg', 'png', 'xlsx', 'docx', 'zip']

export default function StorageConfigPage() {
  const toast = useToast()
  const [cfg, setCfg] = useState<StorageConfig>({ ...STORAGE_CONFIG })
  const [usage, setUsage] = useState<StorageUsage[]>([])
  const [editingSecret, setEditingSecret] = useState(false)
  const [secretInput, setSecretInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    void fetchUsage()
  }, [])
  async function fetchUsage() {
    const u = await new Promise<StorageUsage[]>((r) => r(STORAGE_USAGE))
    setUsage(u)
  }

  const set = <K extends keyof StorageConfig>(k: K, v: StorageConfig[K]) => setCfg((p) => ({ ...p, [k]: v }))

  const handleTest = () => {
    setTesting(true)
    setTimeout(() => {
      const res = testStorageConnection(cfg)
      setCfg((p) => ({ ...p, verifyStatus: res.ok ? '已验证' : '未验证', lastVerifyAt: new Date().toLocaleString('zh-CN').slice(0, 16).replace('/', '-'), lastVerifyMessage: res.message }))
      toast(res.ok ? '连接成功' : `连接失败：${res.message}`, res.ok ? 'success' : 'error')
      setTesting(false)
    }, 600)
  }

  const handleSave = () => {
    if (cfg.storageType === 'object') {
      if (!/^https?:\/\//.test(cfg.endpoint)) return toast('请填写以 http:// 或 https:// 开头的服务地址', 'error')
      if (!/^[a-z0-9-]{3,63}$/.test(cfg.bucket)) return toast('Bucket 需为 3–63 位小写字母、数字或短横线', 'error')
    }
    if (cfg.maxFileMb < 1 || cfg.maxFileMb > 500) return toast('单文件上限需在 1–500MB 之间', 'error')
    if (cfg.maxImagePx < 200 || cfg.maxImagePx > 8192) return toast('图片最大边长需在 200–8192px 之间', 'error')
    if (cfg.capacityGb < 1) return toast('配额不能小于 1GB', 'error')
    if (cfg.retentionDays < 0 || cfg.retentionDays > 3650) return toast('保留期需在 0–3650 天之间', 'error')
    if (editingSecret && secretInput) setCfg((p) => ({ ...p, secretMasked: true }))
    setEditingSecret(false)
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast('保存成功')
    }, 400)
  }

  const totalUsed = usage.reduce((a, b) => a + b.usedGb, 0)
  const totalCap = cfg.capacityGb
  const percent = Math.min(100, (totalUsed / totalCap) * 100)
  const warn = percent >= 80

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '系统参数配置', '存储配置']}
        title="存储配置"
        description="附件存储方式与上传策略。本期为验收演示的模拟实现，不真实对接对象存储。"
        actions={<Button variant="primary" loading={saving} onClick={handleSave}>保存</Button>}
      />

      <div className="alert alert-tip" style={{ marginTop: 0 }}>
        当前为演示环境，存储未真实对接对象存储；测试连接与用量均为模拟数据。
      </div>

      <div className="card calc-section">
        <div className="card-body">
          <div className="block-title">存储方式</div>
          <div className="radio-row">
            {(['local', 'object'] as const).map((v) => (
              <label key={v}><input type="radio" name="storageType" checked={cfg.storageType === v} onChange={() => set('storageType', v)} />{v === 'local' ? '本地存储' : '对象存储'}</label>
            ))}
          </div>
        </div>
      </div>

      {cfg.storageType === 'object' && (
        <div className="card calc-section" style={{ marginTop: 16 }}>
          <div className="card-body">
            <div className="block-title">连接参数</div>
            <div className="form-grid">
              <Field label="服务地址"><Input value={cfg.endpoint} onChange={(e) => set('endpoint', e.target.value)} /></Field>
              <Field label="Bucket"><Input value={cfg.bucket} onChange={(e) => set('bucket', e.target.value)} /></Field>
              <Field label="区域"><Input value={cfg.region} onChange={(e) => set('region', e.target.value)} /></Field>
              <Field label="访问域名"><Input value={cfg.domain} onChange={(e) => set('domain', e.target.value)} /></Field>
              <Field label="路径前缀" full><Input value={cfg.pathPrefix} onChange={(e) => set('pathPrefix', e.target.value)} /></Field>
            </div>
          </div>
        </div>
      )}

      <div className="card calc-section" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div className="block-title">访问凭证</div>
          <div className="form-grid">
            <Field label="AccessKey ID"><Input value={cfg.accessKeyId} onChange={(e) => set('accessKeyId', e.target.value)} /></Field>
            <Field label="Secret">
              {editingSecret ? (
                <div className="flex gap-xs">
                  <Input value={secretInput} placeholder="输入新密钥" onChange={(e) => setSecretInput(e.target.value)} />
                  <Button size="small" onClick={() => { setEditingSecret(false); setSecretInput('') }}>取消</Button>
                </div>
              ) : (
                <div className="flex gap-xs">
                  <span className="form-static mono">{cfg.secretMasked ? '••••••••' : secretInput || '未设置'}</span>
                  <button className="link" onClick={() => setEditingSecret(true)}>修改密钥</button>
                </div>
              )}
            </Field>
          </div>
        </div>
      </div>

      <div className="card calc-section" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div className="block-title">上传策略</div>
          <div className="form-grid">
            <Field label="单文件上限(MB)"><Input type="number" value={cfg.maxFileMb} onChange={(e) => set('maxFileMb', Number(e.target.value))} /></Field>
            <Field label="图片最大边长(px)"><Input type="number" value={cfg.maxImagePx} onChange={(e) => set('maxImagePx', Number(e.target.value))} /></Field>
            <Field label="允许格式（演示）"><div className="flex" style={{ flexWrap: 'wrap', gap: 6 }}>
              {FORMAT_OPTS.map((f) => (
                <button key={f} type="button" className={['multi-select-tag', cfg.allowedFormats.includes(f) ? '' : 'multi-select-placeholder'].filter(Boolean).join(' ')} style={{ border: '1px solid var(--color-border)', background: cfg.allowedFormats.includes(f) ? 'var(--color-primary-bg)' : 'transparent' }} onClick={() => set('allowedFormats', cfg.allowedFormats.includes(f) ? cfg.allowedFormats.filter((x) => x !== f) : [...cfg.allowedFormats, f])}>{f}</button>
              ))}
            </div></Field>
          </div>
        </div>
      </div>

      <div className="card calc-section" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div className="block-title">配额与保留</div>
          <div className="form-grid">
            <Field label="租户总容量(GB)"><Input type="number" value={cfg.capacityGb} onChange={(e) => set('capacityGb', Number(e.target.value))} /></Field>
            <Field label="单租户附件数上限"><Input type="number" value={cfg.maxAttachments} onChange={(e) => set('maxAttachments', Number(e.target.value))} /></Field>
            <Field label="超限策略">
              <div className="radio-row">
                {(['告警', '禁止上传'] as const).map((v) => (<label key={v}><input type="radio" name="over" checked={cfg.overLimitStrategy === v} onChange={() => set('overLimitStrategy', v)} />{v}</label>))}
              </div>
            </Field>
            <Field label="附件保留期(天)"><Input type="number" value={cfg.retentionDays} onChange={(e) => set('retentionDays', Number(e.target.value))} /></Field>
            <Field label="回收站(天)"><Input type="number" value={cfg.recycleDays} onChange={(e) => set('recycleDays', Number(e.target.value))} /></Field>
            <Field label="报告与凭证"><label className="switch"><input type="checkbox" checked={cfg.keepReportsForever} onChange={(e) => set('keepReportsForever', e.target.checked)} /><span className="switch-track" /><span className="switch-thumb" /></label></Field>
          </div>
        </div>
      </div>

      <div className="card calc-section" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div className="block-title" style={{ marginBottom: 0 }}>连通性测试</div>
            <Button variant="primary" loading={testing} onClick={handleTest}>测试连接</Button>
          </div>
          <div className="kv">
            <span className="kv-label">验证状态</span>
            <span className="kv-value"><span className={cfg.verifyStatus === '已验证' ? 'tag-success' : 'tag-default'} style={{ padding: '2px 8px', borderRadius: 4 }}>{cfg.verifyStatus}</span></span>
            <span className="kv-label">最近验证</span>
            <span className="kv-value">{cfg.lastVerifyAt}</span>
            <span className="kv-label">结果</span>
            <span className="kv-value">{cfg.lastVerifyMessage}</span>
          </div>
        </div>
      </div>

      <div className="card calc-section" style={{ marginTop: 16 }}>
        <div className="card-body">
          <div className="block-title">用量概览（只读 · 模拟）</div>
          <div className={`usage-bar${warn ? ' warn' : ''}`} style={{ marginBottom: 8 }}>
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="text-tertiary" style={{ marginBottom: 12 }}>已用 {totalUsed.toFixed(1)} GB / {totalCap} GB（{percent.toFixed(1)}%）{warn && ' · 已接近配额'}</div>
          <Table
            columns={usageColumns}
            data={[...usage].sort((a, b) => b.usedGb - a.usedGb)}
            rowKey={(u) => u.tenant}
          />
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-item">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

const usageColumns: Column<StorageUsage>[] = [
  { key: 'tenant', title: '租户', render: (u) => u.tenant },
  { key: 'usedGb', title: '已用容量(GB)', width: 140, align: 'right', render: (u) => u.usedGb.toFixed(1) },
  { key: 'files', title: '文件数', width: 120, align: 'right', render: (u) => u.files.toLocaleString() },
  { key: 'attachments', title: '附件数', width: 120, align: 'right', render: (u) => u.attachments.toLocaleString() },
  { key: 'ratio', title: '占比', width: 120, align: 'right', render: (u) => ((u.usedGb / 100) * 100).toFixed(1) + '%' },
]
