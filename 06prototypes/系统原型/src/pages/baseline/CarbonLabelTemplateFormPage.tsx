import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Input, Modal, PageHeader, Select, useToast } from '@/shared/components'
import {
  ALL_STAGES,
  blankCarbonLabelTemplate,
  CERT_LABELS,
  CORE_LABELS,
  createCarbonLabelTemplate,
  fetchCarbonLabelTemplate,
  FIRST_STAGES,
  PRODUCT_INFO_LABELS,
  SCENE_LABELS,
  updateCarbonLabelTemplate,
} from '@/mock/carbonLabelTemplates'
import type {
  CarbonLabelTemplate,
  CarbonLabelTemplateDraft,
  FieldToggleModule,
  QrRule,
  TemplateStatus,
} from '@/mock/carbonLabelTemplates'
import './CarbonLabelTemplatePage.css'

/** 通用开关（on 时轨道使用模板主色，与皮肤联动） */
function Switch({ checked, color, onChange }: { checked: boolean; color: string; onChange: (v: boolean) => void }) {
  return (
    <label className="ui-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="ui-switch-track" style={{ backgroundColor: checked ? color : '#cbd5e1' }} />
      <span className="ui-switch-thumb" style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </label>
  )
}

const CATEGORY_OPTIONS = ['竹木', '建材', '钢铁', '化工', '纺织', '电子', '食品', '其他'].map((c) => ({ label: c, value: c }))

export default function CarbonLabelTemplateFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CarbonLabelTemplate>(blankCarbonLabelTemplate())
  const [qrOpen, setQrOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      setForm(blankCarbonLabelTemplate())
      setLoading(false)
      return
    }
    void (async () => {
      try {
        setForm(await fetchCarbonLabelTemplate(id))
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, toast])

  /* ---------------- 配置更新辅助 ---------------- */
  const updateModule = <K extends keyof CarbonLabelTemplate['modules']>(
    key: K,
    patch: Partial<CarbonLabelTemplate['modules'][K]>,
  ) =>
    setForm((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: { ...prev.modules[key], ...patch } },
    }))

  const toggleFieldItem = (moduleKey: 'coreMetrics' | 'productInfo' | 'scene', key: string, val: boolean) =>
    setForm((prev) => {
      const mod = prev.modules[moduleKey] as FieldToggleModule
      return {
        ...prev,
        modules: { ...prev.modules, [moduleKey]: { ...mod, items: { ...mod.items, [key]: val } } },
      }
    })

  const toggleCertItem = (key: 'org' | 'standard' | 'time', val: boolean) =>
    setForm((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        cert: { ...prev.modules.cert, items: { ...prev.modules.cert.items, [key]: val } },
      },
    }))

  const updateQr = (patch: Partial<QrRule>) =>
    setForm((prev) => ({ ...prev, qrRule: { ...prev.qrRule, ...patch } }))

  /* ---------------- 预览派生数据 ---------------- */
  const emissionStages = form.modules.emission.stageLevel === 'all' ? ALL_STAGES : FIRST_STAGES
  const qrUrlPreview = `${form.qrRule.prefix}[batchId]${form.qrRule.extra}${
    form.qrRule.permission === 'internal' ? '&scope=internal' : ''
  }`

  /* ---------------- 保存 ---------------- */
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast('请输入模板名称', 'error')
      return
    }
    setSubmitting(true)
    try {
      const draft: CarbonLabelTemplateDraft = {
        name: form.name.trim(),
        category: form.category,
        primaryColor: form.primaryColor,
        status: form.status,
        modules: form.modules,
        qrRule: form.qrRule,
      }
      if (form.id) {
        await updateCarbonLabelTemplate(form.id, draft)
        toast('保存成功')
        navigate('/baseline/label')
      } else {
        await createCarbonLabelTemplate(draft)
        toast('保存成功')
        navigate('/baseline/label')
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader
          breadcrumb={['系统管理', '产品碳基线库', '产品碳标签模板', isEdit ? '编辑模板' : '新建模板']}
          title={isEdit ? '编辑模板' : '新建模板'}
        />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '产品碳基线库', '产品碳标签模板', isEdit ? '编辑模板' : '新建模板']}
        title={isEdit ? '编辑模板' : '新建模板'}
        description="左侧配置模块与皮肤，右侧实时预览手机端 H5 效果"
        onBack={() => navigate('/baseline/label')}
        actions={
          <>
            <Button data-ann-target="baseline.label.form.qr" onClick={() => setQrOpen(true)}>⚙️ 配置二维码规则</Button>
            <Button variant="primary" data-ann-target="baseline.label.form.save" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中…' : '保存模板'}
            </Button>
          </>
        }
      />

      <div className="label-template-cols">
        {/* ================= 左侧 40% 配置区 ================= */}
        <section className="card label-template-config">
          {/* 基础信息 */}
          <div className="label-section">
            <div className="label-section-head">
              <span className="label-section-title">基础信息</span>
            </div>
            <div className="label-field" data-ann-target="baseline.label.form.name">
              <label>模板名称</label>
              <Input value={form.name} placeholder="请输入模板名称" onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="label-field" data-ann-target="baseline.label.form.category">
              <label>产品分类</label>
              <Select
                value={form.category}
                options={CATEGORY_OPTIONS}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              />
            </div>
            <div className="label-field" data-ann-target="baseline.label.form.status">
              <label>状态</label>
              <Select
                value={form.status}
                options={[
                  { label: '草稿', value: 'draft' },
                  { label: '已发布', value: 'published' },
                ]}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as TemplateStatus }))}
              />
            </div>
          </div>

          {/* 全局皮肤 */}
          <div className="label-section" data-ann-target="baseline.label.form.skin">
            <div className="label-section-head">
              <span className="label-section-title">全局皮肤</span>
              <span className="label-section-tip">切换右侧整体主色调</span>
            </div>
            <div className="skin-thumbs">
              <div
                className={`skin-thumb${form.primaryColor === '#1a8924' ? ' active' : ''}`}
                onClick={() => setForm((p) => ({ ...p, primaryColor: '#1a8924' }))}
              >
                <div className="skin-thumb-preview" style={{ background: '#1a8924' }}>
                  <span />
                </div>
                <div className="text-sm font-medium">环保绿</div>
                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>#1a8924</div>
              </div>
              <div
                className={`skin-thumb${form.primaryColor === '#1890ff' ? ' active' : ''}`}
                onClick={() => setForm((p) => ({ ...p, primaryColor: '#1890ff' }))}
              >
                <div className="skin-thumb-preview" style={{ background: '#1890ff' }}>
                  <span />
                </div>
                <div className="text-sm font-medium">商务蓝</div>
                <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>#1890ff</div>
              </div>
            </div>
            <div className="flex items-center gap-sm" style={{ marginTop: 'var(--space-sm)' }}>
              <label className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>微调主色</label>
              <input
                type="color"
                className="color-input"
                value={form.primaryColor}
                onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
              />
              <span className="mono text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{form.primaryColor}</span>
            </div>
          </div>

          {/* 模块配置列表 */}
          <div className="label-section" data-ann-target="baseline.label.form.modules">
            <div className="label-section-head">
              <span className="label-section-title">模块配置</span>
              <span className="label-section-tip">每个模块独立开关控制右侧显隐</span>
            </div>

            {/* 头部区 */}
            <div className="label-module">
              <div className="flex-between">
                <span className="text-sm font-medium">头部区</span>
                <Switch checked={form.modules.header.enabled} color={form.primaryColor} onChange={(v) => updateModule('header', { enabled: v })} />
              </div>
              <div className="label-module-body">
                <label className="opt-check" style={{ marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={form.modules.header.showLogo}
                    onChange={(e) => updateModule('header', { showLogo: e.target.checked })}
                  />
                  显示 Logo
                </label>
                <div className="label-field">
                  <label>主标题</label>
                  <Input value={form.modules.header.title} onChange={(e) => updateModule('header', { title: e.target.value })} />
                </div>
                <div className="label-field">
                  <label>副标题</label>
                  <Input value={form.modules.header.subtitle} onChange={(e) => updateModule('header', { subtitle: e.target.value })} />
                </div>
              </div>
            </div>

            {/* 核心指标 */}
            <div className="label-module">
              <div className="flex-between">
                <span className="text-sm font-medium">核心指标</span>
                <Switch checked={form.modules.coreMetrics.enabled} color={form.primaryColor} onChange={(v) => updateModule('coreMetrics', { enabled: v })} />
              </div>
              <div className="opt-grid label-module-body">
                {Object.entries(CORE_LABELS).map(([key, label]) => (
                  <label className="opt-check" key={key}>
                    <input
                      type="checkbox"
                      checked={form.modules.coreMetrics.items[key]}
                      onChange={(e) => toggleFieldItem('coreMetrics', key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* 认证详情 */}
            <div className="label-module">
              <div className="flex-between">
                <span className="text-sm font-medium">认证详情</span>
                <Switch checked={form.modules.cert.enabled} color={form.primaryColor} onChange={(v) => updateModule('cert', { enabled: v })} />
              </div>
              <div className="opt-grid label-module-body">
                {Object.entries(CERT_LABELS).map(([key, label]) => (
                  <label className="opt-check" key={key}>
                    <input
                      type="checkbox"
                      checked={form.modules.cert.items[key as 'org' | 'standard' | 'time']}
                      onChange={(e) => toggleCertItem(key as 'org' | 'standard' | 'time', e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <label className="opt-check" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={form.modules.cert.showReportIcon}
                  onChange={(e) => updateModule('cert', { showReportIcon: e.target.checked })}
                />
                开启「在线查看报告」图标（SVG）
              </label>
            </div>

            {/* 排放构成 */}
            <div className="label-module">
              <div className="flex-between">
                <span className="text-sm font-medium">排放构成</span>
                <Switch checked={form.modules.emission.enabled} color={form.primaryColor} onChange={(v) => updateModule('emission', { enabled: v })} />
              </div>
              <div className="label-module-body">
                <label className="opt-check" style={{ marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.modules.emission.showBoundaryText}
                    onChange={(e) => updateModule('emission', { showBoundaryText: e.target.checked })}
                  />
                  显示边界文字
                </label>
                <div className="label-field">
                  <label>阶段范围</label>
                  <Select
                    value={form.modules.emission.stageLevel}
                    options={[
                      { label: '一级阶段', value: 'first' },
                      { label: '全部阶段', value: 'all' },
                    ]}
                    onChange={(e) => updateModule('emission', { stageLevel: e.target.value as 'first' | 'all' })}
                  />
                </div>
                <div className="label-field">
                  <label>图表类型</label>
                  <Select
                    value={form.modules.emission.chartType}
                    options={[
                      { label: '进度条图表', value: 'bar' },
                      { label: '数据表格', value: 'table' },
                    ]}
                    onChange={(e) => updateModule('emission', { chartType: e.target.value as 'bar' | 'table' })}
                  />
                </div>
              </div>
            </div>

            {/* 产品信息 */}
            <div className="label-module">
              <div className="flex-between">
                <span className="text-sm font-medium">产品信息</span>
                <Switch checked={form.modules.productInfo.enabled} color={form.primaryColor} onChange={(v) => updateModule('productInfo', { enabled: v })} />
              </div>
              <div className="opt-grid label-module-body">
                {Object.entries(PRODUCT_INFO_LABELS).map(([key, label]) => (
                  <label className="opt-check" key={key}>
                    <input
                      type="checkbox"
                      checked={form.modules.productInfo.items[key]}
                      onChange={(e) => toggleFieldItem('productInfo', key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* 适用场景 */}
            <div className="label-module">
              <div className="flex-between">
                <span className="text-sm font-medium">适用场景</span>
                <Switch checked={form.modules.scene.enabled} color={form.primaryColor} onChange={(v) => updateModule('scene', { enabled: v })} />
              </div>
              <div className="opt-grid label-module-body">
                {Object.entries(SCENE_LABELS).map(([key, label]) => (
                  <label className="opt-check" key={key}>
                    <input
                      type="checkbox"
                      checked={form.modules.scene.items[key]}
                      onChange={(e) => toggleFieldItem('scene', key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= 右侧 60% 预览区 ================= */}
        <section className="label-template-preview" data-ann-target="baseline.label.preview">
          <div className="phone-frame">
            <div className="phone-notch" />
            <div className="phone-screen">
              {/* 头部区 */}
              {form.modules.header.enabled && (
                <div className="phone-header skin-transition" style={{ backgroundColor: form.primaryColor }}>
                  {form.modules.header.showLogo && (
                    <div className="phone-logo-row">
                      <span className="phone-logo">LOGO</span>
                      <span className="phone-logo-badge">碳标签</span>
                    </div>
                  )}
                  <div className="phone-title">{form.modules.header.title || '[主标题]'}</div>
                  <div className="phone-subtitle">{form.modules.header.subtitle || '[副标题]'}</div>
                </div>
              )}

              <div className="phone-body">
                {/* 核心指标 */}
                {form.modules.coreMetrics.enabled && (
                  <div className="phone-card phone-metric-grid">
                    {form.modules.coreMetrics.items.productName && (
                      <div>
                        <div className="phone-metric-label">产品名</div>
                        <div className="phone-metric-value">[产品名称]</div>
                      </div>
                    )}
                    {form.modules.coreMetrics.items.carbonValue && (
                      <div>
                        <div className="phone-metric-label">碳排值</div>
                        <div className="phone-metric-value" style={{ color: form.primaryColor }}>429.42</div>
                      </div>
                    )}
                    {form.modules.coreMetrics.items.unit && (
                      <div>
                        <div className="phone-metric-label">单位</div>
                        <div className="phone-metric-value">kgCO₂e</div>
                      </div>
                    )}
                  </div>
                )}

                {/* 认证详情 */}
                {form.modules.cert.enabled && (
                  <div className="phone-card">
                    <div className="phone-card-title">认证详情</div>
                    {form.modules.cert.items.org && (
                      <div className="phone-kv">
                        <span className="phone-kv-label">认证机构</span>
                        <span className="phone-kv-value">[认证机构]</span>
                      </div>
                    )}
                    {form.modules.cert.items.standard && (
                      <div className="phone-kv">
                        <span className="phone-kv-label">认证标准</span>
                        <span className="phone-kv-value">[认证标准]</span>
                      </div>
                    )}
                    {form.modules.cert.items.time && (
                      <div className="phone-kv">
                        <span className="phone-kv-label">认证时间</span>
                        <span className="phone-kv-value">[认证时间]</span>
                      </div>
                    )}
                    {form.modules.cert.showReportIcon && (
                      <button
                        className="phone-report-btn skin-transition"
                        style={{ backgroundColor: form.primaryColor }}
                        type="button"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        在线查看报告
                      </button>
                    )}
                  </div>
                )}

                {/* 排放构成 */}
                {form.modules.emission.enabled && (
                  <div className="phone-card">
                    <div className="phone-card-title">排放构成</div>
                    {form.modules.emission.showBoundaryText && (
                      <div className="phone-kv-label" style={{ marginBottom: 8 }}>系统边界：[摇篮到大门]</div>
                    )}
                    {form.modules.emission.chartType === 'bar' ? (
                      <div>
                        {emissionStages.map((s) => (
                          <div key={s.name} style={{ marginBottom: 8 }}>
                            <div className="phone-kv" style={{ padding: 0 }}>
                              <span className="phone-kv-label">{s.name}</span>
                              <span className="phone-kv-value" style={{ color: form.primaryColor }}>{s.percent}</span>
                            </div>
                            <div className="phone-bar-track">
                              <div className="phone-bar-fill skin-transition" style={{ width: `${s.width}%`, backgroundColor: form.primaryColor }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <table className="phone-table">
                        <thead>
                          <tr>
                            <th>阶段</th>
                            <th>数值</th>
                            <th>占比</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emissionStages.map((s) => (
                            <tr key={s.name}>
                              <td>{s.name}</td>
                              <td>{s.value}</td>
                              <td style={{ color: form.primaryColor }}>{s.percent}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 产品信息 */}
                {form.modules.productInfo.enabled && (
                  <div className="phone-card">
                    <div className="phone-card-title">产品信息</div>
                    {form.modules.productInfo.items.image && (
                      <div className="phone-image" style={{ marginBottom: 10 }}>[产品图片占位]</div>
                    )}
                    <div className="phone-info-grid">
                      {form.modules.productInfo.items.name && (
                        <div className="phone-info-item"><span className="phone-kv-label">名称</span><span className="phone-kv-value">[产品名称]</span></div>
                      )}
                      {form.modules.productInfo.items.company && (
                        <div className="phone-info-item"><span className="phone-kv-label">公司</span><span className="phone-kv-value">[生产企业]</span></div>
                      )}
                      {form.modules.productInfo.items.origin && (
                        <div className="phone-info-item"><span className="phone-kv-label">产地</span><span className="phone-kv-value">[产地]</span></div>
                      )}
                      {form.modules.productInfo.items.spec && (
                        <div className="phone-info-item"><span className="phone-kv-label">规格</span><span className="phone-kv-value">[规格型号]</span></div>
                      )}
                      {form.modules.productInfo.items.density && (
                        <div className="phone-info-item"><span className="phone-kv-label">密度</span><span className="phone-kv-value">[密度]</span></div>
                      )}
                      {form.modules.productInfo.items.moisture && (
                        <div className="phone-info-item"><span className="phone-kv-label">含水率</span><span className="phone-kv-value">[含水率]</span></div>
                      )}
                      {form.modules.productInfo.items.biocarbon && (
                        <div className="phone-info-item"><span className="phone-kv-label">生物碳</span><span className="phone-kv-value">[生物碳含量]</span></div>
                      )}
                    </div>
                    {form.modules.productInfo.items.sceneText && (
                      <div className="phone-info-text" style={{ marginTop: 8 }}>
                        [应用场景描述文本：本产品适用于……]
                      </div>
                    )}
                  </div>
                )}

                {/* 适用场景 */}
                {form.modules.scene.enabled && (
                  <div className="phone-card">
                    {form.modules.scene.items.title && <div className="phone-card-title">适用场景</div>}
                    <div className="phone-scene-grid">
                      {[1, 2, 3, 4].map((n) =>
                        form.modules.scene.items[`g${n}`] ? (
                          <div className="phone-scene-cell" key={n}>场景图 {n}</div>
                        ) : null,
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ================= 二维码规则弹窗 ================= */}
      <Modal
        open={qrOpen}
        title="配置二维码规则"
        onClose={() => setQrOpen(false)}
        footer={
          <>
            <Button onClick={() => setQrOpen(false)}>取消</Button>
            <Button variant="primary" onClick={() => { setQrOpen(false); toast('二维码规则已保存（原型演示）') }}>
              保存规则
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <FormField label="域名前缀" full hint="证书查询域名由平台统一配置，不可修改">
            <Input value={form.qrRule.prefix} readOnly />
          </FormField>
          <FormField label="附加参数" full>
            <Input
              value={form.qrRule.extra}
              placeholder="如 &src=app"
              onChange={(e) => updateQr({ extra: e.target.value })}
            />
          </FormField>
          <FormField label="权限" full>
            <Select
              value={form.qrRule.permission}
              options={[
                { label: '公开', value: 'public' },
                { label: '内部', value: 'internal' },
              ]}
              onChange={(e) => updateQr({ permission: e.target.value as 'public' | 'internal' })}
            />
          </FormField>
        </div>
        <div className="qr-preview mono">{qrUrlPreview}</div>
      </Modal>
    </>
  )
}
