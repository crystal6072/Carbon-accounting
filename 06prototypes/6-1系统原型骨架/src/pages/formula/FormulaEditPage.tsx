import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, PageHeader, Tag, useToast } from '@/shared/components'
import {
  extractPlaceholders,
  FORMULA_DEFS,
  formatDateTime,
  getFormulaConfig,
  SCOPE_ORDER,
  SCOPE_TAB,
  SCOPE_TEXT,
  SCOPE_VARIABLES,
  SCOPE_VAR_TITLE,
  upsertFormulaConfig,
  validateFormula,
  VARIABLE_DOT_COLOR,
  type FormulaConfig,
  type FormulaScope,
} from './formulaMeta'
import FormulaTestModal from './FormulaTestModal'
import './FormulaPage.css'

const OPERATORS: Array<{ label: string; insert: string; title: string }> = [
  { label: '+', insert: ' + ', title: '加' },
  { label: '−', insert: ' − ', title: '减' },
  { label: '×', insert: ' × ', title: '乘' },
  { label: '÷', insert: ' ÷ ', title: '除' },
  { label: '(', insert: '(', title: '左括号' },
  { label: ')', insert: ')', title: '右括号' },
  { label: 'SUM', insert: 'SUM()', title: '求和函数' },
]

const cloneConfig = (source: FormulaConfig): FormulaConfig => ({
  ...source,
  formulas: { ...source.formulas },
})

/**
 * 公式管理 · 编辑页
 * 左侧变量库（按作用域动态展示）+ 右侧公式编辑器（作用域 Tab）；
 * 试算通过顶部「试算」按钮弹出弹窗，试算数据由用户自行新增填写。
 */
export default function FormulaEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [config, setConfig] = useState<FormulaConfig | null>(() => {
    const found = getFormulaConfig(id)
    return found ? cloneConfig(found) : null
  })
  const [activeKey, setActiveKey] = useState('row-formula')
  const [flash, setFlash] = useState(false)
  const [testOpen, setTestOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 })
  const flashTimer = useRef<number | undefined>(undefined)
  const lastByScope = useRef<Record<FormulaScope, string>>({
    row: 'row-formula',
    stage: 'stage-sum',
    global: 'global-footprint',
  })

  const activeDef = FORMULA_DEFS.find((item) => item.key === activeKey) ?? FORMULA_DEFS[0]
  const activeScope = activeDef.scope
  const expression = config?.formulas[activeKey] ?? ''
  /** 已发布状态只读：不可编辑公式 / 名称 / 描述 */
  const readOnly = config?.status === 'published'

  const validation = useMemo(() => validateFormula(activeScope, expression), [activeScope, expression])

  const updateFormula = (key: string, value: string) => {
    if (!config || readOnly) return
    const next: FormulaConfig = {
      ...config,
      formulas: { ...config.formulas, [key]: value },
      updatedBy: '系统管理员',
      updatedAt: formatDateTime(new Date()),
    }
    // 实时写入内存（原型：同一会话内跨页面保留）
    upsertFormulaConfig(next)
    setConfig(next)
  }

  /** 基本信息（公式名称 / 描述）：实时保存 */
  const updateBasic = (patch: Pick<FormulaConfig, 'name'> | Pick<FormulaConfig, 'description'>) => {
    if (!config || readOnly) return
    const next: FormulaConfig = {
      ...config,
      ...patch,
      updatedBy: '系统管理员',
      updatedAt: formatDateTime(new Date()),
    }
    upsertFormulaConfig(next)
    setConfig(next)
  }

  /** 发布 / 取消发布 */
  const handleTogglePublish = () => {
    if (!config) return
    const nextStatus = config.status === 'published' ? 'draft' : 'published'
    const next: FormulaConfig = {
      ...config,
      status: nextStatus,
      updatedBy: '系统管理员',
      updatedAt: formatDateTime(new Date()),
    }
    upsertFormulaConfig(next)
    setConfig(next)
    toast(nextStatus === 'published' ? '已发布' : '已取消发布')
  }

  const trackCursor = () => {
    const el = textareaRef.current
    if (!el) return
    cursorRef.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
  }

  const handleInsert = (text: string) => {
    if (!config || readOnly) return
    const el = textareaRef.current
    const current = config?.formulas[activeKey] ?? ''
    let start = cursorRef.current.start
    let end = cursorRef.current.end
    if (el && document.activeElement === el) {
      start = el.selectionStart ?? start
      end = el.selectionEnd ?? end
    }
    start = Math.max(0, Math.min(start, current.length))
    end = Math.max(start, Math.min(end, current.length))

    const nextValue = current.slice(0, start) + text + current.slice(end)
    updateFormula(activeKey, nextValue)

    const caret = text.endsWith('()') ? start + text.length - 1 : start + text.length
    window.requestAnimationFrame(() => {
      const node = textareaRef.current
      if (node) {
        node.focus()
        node.setSelectionRange(caret, caret)
        cursorRef.current = { start: caret, end: caret }
      }
    })

    setFlash(true)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(false), 480)
  }

  const switchScope = (scope: FormulaScope) => {
    if (scope === activeScope) return
    setActiveKey(lastByScope.current[scope])
  }

  const handleSave = () => {
    if (!config) return
    const content = FORMULA_DEFS.map(
      (def) => `【${SCOPE_TEXT[def.scope]}】${def.name}（${def.code}）\n${config.formulas[def.key] || '（未配置）'}`,
    ).join('\n\n')
    window.alert(`已保存公式配置「${config.name}」\n\n${content}`)
  }

  if (!config) {
    return (
      <div className="fm-page">
        <PageHeader breadcrumb={['公式配置']} title="公式配置" />
        <div className="fm-empty">
          <div className="fm-empty-title">公式配置不存在或已被删除</div>
          <Button variant="primary" onClick={() => navigate('/model/formula')}>
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  const placeholders = extractPlaceholders(expression)

  return (
    <div className="fm-page">
      <PageHeader
        breadcrumb={['公式配置', config.name]}
        title={config.name}
        description={`${config.status === 'published' ? '已发布' : '草稿'} · ${config.version} · 更新人 ${config.updatedBy} · 更新于 ${config.updatedAt}`}
        actions={
          <>
            <Button onClick={() => setTestOpen(true)}>试算</Button>
            <Button onClick={handleTogglePublish}>
              {config.status === 'published' ? '取消发布' : '发布'}
            </Button>
            <Button onClick={() => navigate('/model/formula')}>取消</Button>
            <Button variant="primary" onClick={handleSave} disabled={readOnly}>
              保存配置
            </Button>
          </>
        }
      />

      {readOnly && (
        <div className="fm-valid is-warning fm-readonly-banner">
          <span className="fm-valid-tag">已发布</span>
          <span className="fm-valid-msg">当前配置已发布，不可编辑；如需修改请先点击「取消发布」。</span>
        </div>
      )}

      <section className="fm-panel fm-basic-panel">
        <div className="fm-panel-head">
          <span className="fm-panel-title">基本信息</span>
          <span className="fm-status-inline">
            当前状态
            <Tag tone={config.status === 'published' ? 'success' : 'default'}>
              {config.status === 'published' ? '已发布' : '草稿'}
            </Tag>
          </span>
        </div>
        <div className="fm-panel-body">
          <div className="fm-basic-grid">
            <label className="fm-field">
              <span className="fm-field-label">公式名称</span>
              <Input
                value={config.name}
                placeholder="请输入公式名称"
                readOnly={readOnly}
                onChange={(event) => updateBasic({ name: event.target.value })}
              />
            </label>
            <label className="fm-field">
              <span className="fm-field-label">描述</span>
              <Input
                value={config.description}
                placeholder="请输入描述（选填）"
                readOnly={readOnly}
                onChange={(event) => updateBasic({ description: event.target.value })}
              />
            </label>
          </div>
        </div>
      </section>

      <div className="fm-top">
        <aside className="fm-panel fm-var-panel">
          <div className="fm-panel-head">
            <span className="fm-panel-title">变量库</span>
            <span className="fm-scope-badge">{SCOPE_TEXT[activeScope]}</span>
          </div>
          <div className="fm-panel-body">
            <div className="fm-var-group-title">{SCOPE_VAR_TITLE[activeScope]}</div>
            <div className="fm-var-list">
              {SCOPE_VARIABLES[activeScope].map((variable) => (
                <button
                  key={variable.text}
                  type="button"
                  className="fm-var-item"
                  disabled={readOnly}
                  onClick={() => handleInsert(variable.text)}
                >
                  <span className="fm-dot" style={{ background: VARIABLE_DOT_COLOR[variable.type] }} />
                  <span className="fm-var-text">{variable.label}</span>
                </button>
              ))}
            </div>
            <p className="fm-var-tip">点击变量在光标处插入；彩色圆点表示变量类型。</p>
          </div>
        </aside>

        <section className="fm-panel fm-edit-panel">
          <div className="fm-tabs">
            {SCOPE_ORDER.map((scope) => (
              <button
                key={scope}
                type="button"
                className={['fm-tab', scope === activeScope ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => switchScope(scope)}
              >
                {SCOPE_TAB[scope]}
              </button>
            ))}
          </div>

          <div className="fm-panel-body">
            <div className="fm-formula-head">
              <span className="fm-formula-name">{activeDef.name}</span>
              <span className="fm-formula-key">{activeDef.code}</span>
            </div>

            <div className="fm-ops">
              {OPERATORS.map((op) => (
                <button
                  key={op.label}
                  type="button"
                  className="fm-op"
                  title={op.title}
                  disabled={readOnly}
                  onClick={() => handleInsert(op.insert)}
                >
                  {op.label}
                </button>
              ))}
              <button
                type="button"
                className="fm-op fm-op-clear"
                disabled={readOnly}
                onClick={() => updateFormula(activeKey, '')}
              >
                清空
              </button>
            </div>

            <textarea
              ref={textareaRef}
              className={['fm-textarea', flash ? 'is-flash' : ''].filter(Boolean).join(' ')}
              value={expression}
              spellCheck={false}
              readOnly={readOnly}
              placeholder="点击左侧变量或上方运算符编写公式，例如 [当前行.活动数据] × [当前行.单位换算系数] × [当前行.排放因子]"
              onChange={(event) => updateFormula(activeKey, event.target.value)}
              onSelect={trackCursor}
              onKeyUp={trackCursor}
              onClick={trackCursor}
              onFocus={trackCursor}
            />

            <div className="fm-formula-meta">
              <span>已用变量 {placeholders.length} 个</span>
              {placeholders.length > 0 && <span className="fm-mono">{placeholders.map((p) => `[${p}]`).join('  ')}</span>}
            </div>

            <div className={['fm-valid', `is-${validation.level}`].join(' ')}>
              <span className="fm-valid-tag">
                {validation.level === 'success' ? '校验通过' : validation.level === 'warning' ? '校验警告' : '校验错误'}
              </span>
              <span className="fm-valid-msg">{validation.message}</span>
            </div>
          </div>
        </section>
      </div>

      <FormulaTestModal open={testOpen} formulas={config.formulas} onClose={() => setTestOpen(false)} />
    </div>
  )
}
