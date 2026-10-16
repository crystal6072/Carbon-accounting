import { useEffect, useMemo, useState } from 'react'
import { Button, Icon, Input } from '@/shared/components'
import {
  computeTest,
  createEmptyTestData,
  formatValue,
  type TestData,
  type TestRow,
} from './formulaMeta'
import './FormulaPage.css'

interface FormulaTestModalProps {
  open: boolean
  /** 当前配置的公式集合 */
  formulas: Record<string, string>
  onClose: () => void
}

let seed = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString().slice(-6)}-${seed++}`

/**
 * 试算弹窗：
 * 阶段与数据行均由用户自行新增填写，输入即时重算，
 * 结果支持「单位 / 总量」两种口径。
 */
export default function FormulaTestModal({ open, formulas, onClose }: FormulaTestModalProps) {
  const [data, setData] = useState<TestData>(() => createEmptyTestData())
  const [mode, setMode] = useState<'unit' | 'total'>('unit')

  useEffect(() => {
    if (open) {
      setData(createEmptyTestData())
      setMode('unit')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const result = useMemo(() => computeTest(formulas, data), [formulas, data])

  const addStage = () => {
    setData((prev) => ({
      ...prev,
      stages: [...prev.stages, { id: nextId('TS'), name: `阶段${prev.stages.length + 1}`, rows: [] }],
    }))
  }

  const updateStageName = (stageId: string, name: string) => {
    setData((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => (stage.id !== stageId ? stage : { ...stage, name })),
    }))
  }

  const removeStage = (stageId: string) => {
    setData((prev) => ({ ...prev, stages: prev.stages.filter((stage) => stage.id !== stageId) }))
  }

  const addRow = (stageId: string) => {
    setData((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id !== stageId
          ? stage
          : { ...stage, rows: [...stage.rows, { id: nextId('TR'), name: '', activity: '', conv: '1', factor: '' }] },
      ),
    }))
  }

  const updateRow = (stageId: string, rowId: string, field: keyof TestRow, value: string) => {
    setData((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id !== stageId
          ? stage
          : { ...stage, rows: stage.rows.map((row) => (row.id !== rowId ? row : { ...row, [field]: value })) },
      ),
    }))
  }

  const removeRow = (stageId: string, rowId: string) => {
    setData((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id !== stageId ? stage : { ...stage, rows: stage.rows.filter((row) => row.id !== rowId) },
      ),
    }))
  }

  if (!open) return null

  return (
    <div
      className="modal-mask fm-modal-mask"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal modal-xl" role="dialog" aria-modal="true">
        <div className="modal-header">
          <span className="modal-title">试算</span>
          <button className="modal-close" type="button" aria-label="关闭" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="fm-test-tip">
            试算数据由用户自行新增填写：先「+ 新增阶段」，再在阶段内「+ 新增行」录入活动数据、单位换算系数与排放因子。
          </div>

          <div className="fm-test-stages-head">
            <span className="fm-test-stages-title">阶段数据</span>
            <button type="button" className="fm-link" onClick={addStage}>
              + 新增阶段
            </button>
          </div>

          <div className="fm-test-stages">
            {data.stages.length === 0 && (
              <div className="fm-test-empty fm-test-empty-block">暂无阶段数据，点击「+ 新增阶段」开始试算</div>
            )}

            {data.stages.map((stage) => {
              const stageResult = result.stages.find((item) => item.id === stage.id)
              return (
                <div key={stage.id} className="fm-test-stage">
                  <div className="fm-test-stage-head">
                    <Input
                      className="fm-test-stage-name"
                      value={stage.name}
                      placeholder="阶段名称"
                      onChange={(event) => updateStageName(stage.id, event.target.value)}
                    />
                    <span className="fm-test-stage-side">
                      <span className="fm-test-stage-total">
                        阶段碳排 {result.ok && stageResult ? formatValue(stageResult.total) : '—'}
                      </span>
                      <button type="button" className="fm-link" onClick={() => addRow(stage.id)}>
                        + 新增行
                      </button>
                      <button
                        type="button"
                        className="fm-test-del"
                        aria-label="删除该阶段"
                        onClick={() => removeStage(stage.id)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </span>
                  </div>

                  {stage.rows.length === 0 ? (
                    <div className="fm-test-empty">暂无数据，点击「+ 新增行」录入</div>
                  ) : (
                    <div className="fm-test-rows">
                      <div className="fm-test-row fm-test-row-head">
                        <span>名称</span>
                        <span>活动数据</span>
                        <span>单位换算系数</span>
                        <span>排放因子</span>
                        <span />
                      </div>
                      {stage.rows.map((row) => (
                        <div key={row.id} className="fm-test-row">
                          <Input
                            value={row.name}
                            placeholder="名称"
                            onChange={(event) => updateRow(stage.id, row.id, 'name', event.target.value)}
                          />
                          <Input
                            value={row.activity}
                            inputMode="decimal"
                            placeholder="活动数据"
                            onChange={(event) => updateRow(stage.id, row.id, 'activity', event.target.value)}
                          />
                          <Input
                            value={row.conv}
                            inputMode="decimal"
                            placeholder="1"
                            onChange={(event) => updateRow(stage.id, row.id, 'conv', event.target.value)}
                          />
                          <Input
                            value={row.factor}
                            inputMode="decimal"
                            placeholder="排放因子"
                            onChange={(event) => updateRow(stage.id, row.id, 'factor', event.target.value)}
                          />
                          <button
                            type="button"
                            className="fm-test-del"
                            aria-label="删除该行"
                            onClick={() => removeRow(stage.id, row.id)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="fm-test-result">
            <div className="fm-result-labelrow">
              <span className="fm-result-label">
                {mode === 'unit' ? '核算结果（按全局公式）' : '模型总碳排（各阶段合计）'}
              </span>
              <div className="fm-seg" role="tablist" aria-label="计算口径">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'unit'}
                  className={['fm-seg-btn', mode === 'unit' ? 'is-active' : ''].filter(Boolean).join(' ')}
                  onClick={() => setMode('unit')}
                >
                  单位
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'total'}
                  className={['fm-seg-btn', mode === 'total' ? 'is-active' : ''].filter(Boolean).join(' ')}
                  onClick={() => setMode('total')}
                >
                  总量
                </button>
              </div>
            </div>

            <div className="fm-test-result-body">
              <div className="fm-result-value">
                {result.ok ? formatValue(mode === 'unit' ? result.footprint : result.totalEmission) : '—'}
                <span className="fm-result-unit">{mode === 'unit' ? 'kgCO₂e/单位' : 'kgCO₂e'}</span>
              </div>
              <div className="fm-test-breakdown">
                {result.stages.map((stage) => (
                  <div key={stage.id} className="fm-breakdown-item">
                    <span>{stage.name || '未命名阶段'}</span>
                    <em className="fm-mono">{formatValue(stage.total)}</em>
                  </div>
                ))}
                <div className="fm-breakdown-item fm-breakdown-total">
                  <span>模型总碳排</span>
                  <em className="fm-mono">{formatValue(result.totalEmission)}</em>
                </div>
              </div>
            </div>

            <div className="fm-result-hint">
              {mode === 'unit'
                ? '核算结果：各阶段碳排按「全局公式」计算（与步骤④ 核算完全同一口径）'
                : '阶段合计：各阶段碳排直接相加，不经全局公式'}
            </div>
            {!result.ok && <div className="fm-result-error">{result.error}</div>}
          </div>
        </div>

        <div className="modal-footer">
          <Button onClick={onClose}>关闭</Button>
          <Button variant="primary" onClick={onClose}>
            完成试算
          </Button>
        </div>
      </div>
    </div>
  )
}
