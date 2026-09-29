import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Icon, Input, Modal, useToast } from '@/shared/components'
import { buildNumericExpression, validateFormulaExpression } from '@/mock'
import type { CalcFormula } from '@/types'
import { evaluateExpression, factorSourceTypeText, formatCalcValue, formulaTypeText } from './calcEngineMeta'

interface FormulaTestRunModalProps {
  open: boolean
  formula: CalcFormula | null
  onClose: () => void
}

interface CheckRow {
  id: string
  label: string
  pass: boolean
  detail: string
}

/**
 * 公式试算与校验：校验计算公式与数据因素一致性、结果单位，
 * 并按数据因素输入样例数据试算（活动数据 / 自定义变量手填，业务库取值与常量自动带出）。
 */
export default function FormulaTestRunModal({ open, formula, onClose }: FormulaTestRunModalProps) {
  const toast = useToast()
  const [values, setValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !formula) return
    const next: Record<string, string> = {}
    formula.factors.forEach((item) => {
      next[item.name] = item.sourceType === 'factor' || item.sourceType === 'constant' ? item.value : ''
    })
    setValues(next)
    setResult(null)
    setError('')
  }, [open, formula])

  const checks: CheckRow[] = useMemo(() => {
    if (!formula) return []
    const names = formula.factors.map((item) => item.name)
    return [
      {
        id: 'expression',
        label: '计算公式只使用已定义的数据因素与运算符',
        pass: !validateFormulaExpression(formula.expression, names),
        detail: validateFormulaExpression(formula.expression, names) || '全部通过',
      },
      {
        id: 'factors',
        label: '数据因素完整（业务库取值已选对象、常量已填值）',
        pass: formula.factors.every((item) =>
          item.sourceType === 'factor' ? !!item.sourceCode : item.sourceType === 'constant' ? !!item.value.trim() : true,
        ),
        detail:
          formula.factors
            .filter((item) =>
              item.sourceType === 'factor' ? !item.sourceCode : item.sourceType === 'constant' ? !item.value.trim() : false,
            )
            .map((item) => item.name)
            .join('、') || '全部通过',
      },
      {
        id: 'unit',
        label: '结果单位为碳排放量单位',
        pass: formula.resultUnit.endsWith('CO₂e'),
        detail: formula.resultUnit,
      },
    ]
  }, [formula])

  const handleRun = () => {
    if (!formula) return
    try {
      const input: Record<string, number | number[]> = {}
      for (const item of formula.factors) {
        const raw = (values[item.name] ?? '').trim()
        if (item.sourceType === 'constant') {
          input[item.name] = evaluateExpression(item.value, {})
        } else if (item.sourceType === 'factor') {
          const num = Number(item.value)
          input[item.name] = Number.isFinite(num) ? num : 0
        } else if (!raw) {
          throw new Error(`「${item.name}」样例入参不能为空`)
        } else if (raw.includes(',')) {
          input[item.name] = raw
            .split(',')
            .map((part) => Number(part.trim()))
            .filter((num) => Number.isFinite(num))
        } else {
          const num = Number(raw)
          if (!Number.isFinite(num)) throw new Error(`「${item.name}」样例入参须为数值`)
          input[item.name] = num
        }
      }
      const numeric = buildNumericExpression(formula.expression, formula.factors.map((item) => item.name), input)
      setResult(evaluateExpression(numeric, {}))
      setError('')
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : '试算失败')
    }
  }

  const allPass = checks.every((row) => row.pass)

  return (
    <Modal
      open={open}
      title="公式试算"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>关闭</Button>
          <Button variant="primary" data-ann-target="formula.testRun.execute" disabled={!formula} onClick={handleRun}>
            执行试算
          </Button>
        </>
      }
    >
      {formula && (
        <>
          <div className="view-block">
            <div className="view-block-title">完整性校验</div>
            {checks.map((row) => (
              <div className="flex gap-xs" key={row.id} style={{ padding: '4px 0' }}>
                <span style={{ display: 'flex', color: row.pass ? 'var(--color-success)' : 'var(--color-error)' }}>
                  <Icon name={row.pass ? 'check' : 'warning'} size={14} />
                </span>
                <span style={{ flex: 1 }}>{row.label}</span>
                <span className="toolbar-tip">{row.detail}</span>
              </div>
            ))}
            <div className="ce-section-tip" style={{ borderTop: 'none', padding: 'var(--space-xs) 0 0' }}>
              校验状态：
              {allPass ? (
                <span style={{ color: 'var(--color-success)' }}>全部通过</span>
              ) : (
                <span style={{ color: 'var(--color-error)' }}>存在未通过项，请先修正</span>
              )}
            </div>
          </div>

          <div className="view-block">
            <div className="view-block-title">试算</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">公式类型</span>
                <span className="detail-value">{formulaTypeText[formula.formulaType]}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">结果单位</span>
                <span className="detail-value mono">{formula.resultUnit}</span>
              </div>
              <div className="detail-item ce-detail-item-full">
                <span className="detail-label">计算公式</span>
                <span className="detail-value ce-expression">{formula.expression}</span>
              </div>
            </div>

            <div className="form-grid" style={{ marginTop: 'var(--space-md)' }}>
              {formula.factors.map((item) => {
                const editable = item.sourceType === 'activity' || item.sourceType === 'variable'
                return (
                  <FormField
                    key={item.id}
                    label={`${item.name}（${factorSourceTypeText[item.sourceType]}）`}
                    required={editable}
                  >
                    {editable ? (
                      <Input
                        value={values[item.name] ?? ''}
                        placeholder="请输入样例入参（多值以英文逗号分隔）"
                        onChange={(e) => setValues((prev) => ({ ...prev, [item.name]: e.target.value }))}
                      />
                    ) : (
                      <div className="ce-expression">
                        {item.value}
                        {item.unit ? ` ${item.unit}` : ''}
                        {item.sourceType === 'factor' ? '（业务库带出）' : '（常量）'}
                      </div>
                    )}
                  </FormField>
                )
              })}
            </div>

            {error && (
              <div className="ce-test-error" style={{ marginTop: 'var(--space-md)' }}>
                {error}
              </div>
            )}

            {result !== null && !error && (
              <div className="ce-test-result" style={{ marginTop: 'var(--space-md)' }}>
                <span className="ce-test-result-label">试算结果</span>
                <span className="ce-test-result-value">{formatCalcValue(result)}</span>
                <span className="ce-test-result-label">{formula.resultUnit}</span>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
