import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Input, PageHeader, Select, Textarea, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import {
  CALC_FORMULA_DESCRIPTION_MAX,
  createCalcFormula,
  fetchCalcFormula,
  updateCalcFormula,
  validateFormulaExpression,
} from '@/mock'
import type { CalcFormulaPayload } from '@/mock'
import type { FormulaFactor, FormulaType } from '@/types'
import FormulaExpressionModal from './FormulaExpressionModal'
import FormulaFactorEditor from './FormulaFactorEditor'
import { formulaTypeOrder, formulaTypeText } from './calcEngineMeta'
import './CalcEngine.css'

const createInitialFactors = (): FormulaFactor[] => [
  {
    id: 'FF-init-activity',
    name: '活动数据',
    sourceType: 'activity',
    sourceLib: '',
    sourceCode: '',
    sourceName: '',
    value: '',
    unit: '',
  },
]

/**
 * 公式新增 / 编辑（精简版，只留核心）：
 * 基本信息 = 公式名称 + 公式类型；算法配置 = 计算公式 + 字段（常量 / 变量 / 因子）。
 * 结果名称 / 结果单位 / 数据归属 / 公式说明 由系统按口径自动生成；
 * 不再暴露「是否允许负值结果」配置（沿用既有数据，新建默认不允许负值）。
 */
export default function CalcFormulaFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [formulaType, setFormulaType] = useState<'' | FormulaType>('')
  const [supportsNegativeResult, setSupportsNegativeResult] = useState(false)
  const [description, setDescription] = useState('')
  const [expression, setExpression] = useState('')
  const [factors, setFactors] = useState<FormulaFactor[]>(createInitialFactors())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [exprOpen, setExprOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isEdit && id) {
        const detail = await fetchCalcFormula(id)
        setName(detail.name)
        setFormulaType(detail.formulaType)
        setSupportsNegativeResult(detail.supportsNegativeResult)
        setDescription(detail.description)
        setExpression(detail.expression)
        setFactors(detail.factors)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, isEdit, toast])

  useEffect(() => {
    void load()
  }, [load])

  const typeOptions: SelectOption[] = formulaTypeOrder.map((item) => ({ label: formulaTypeText[item], value: item }))

  const validate = (): string => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = '请输入公式名称'
    else if (!formulaType) next.formulaType = '请选择公式类型'
    else if (description.length > CALC_FORMULA_DESCRIPTION_MAX) {
      next.description = `描述最长 ${CALC_FORMULA_DESCRIPTION_MAX} 字符`
    }

    let factorError = ''
    if (factors.length === 0) factorError = '请至少添加一个字段'
    else if (factors.some((item) => !item.name.trim())) factorError = '存在未命名的字段'
    else if (new Set(factors.map((item) => item.name.trim())).size !== factors.length) {
      factorError = '字段名称不得重复'
    } else if (factors.some((item) => item.sourceType === 'constant' && !item.value.trim())) {
      factorError = `常量「${factors.find((item) => item.sourceType === 'constant' && !item.value.trim())?.name}」必须填写常量值`
    }
    if (!factorError) {
      const exprError = validateFormulaExpression(expression, factors.map((item) => item.name.trim()))
      if (exprError) factorError = exprError
    }
    if (factorError) next.config = factorError

    setErrors(next)
    if (Object.keys(next).length === 0) return ''
    return '请先完善必填项'
  }

  const buildPayload = (): CalcFormulaPayload => ({
    name: name.trim(),
    formulaType: formulaType as FormulaType,
    expression: expression.trim(),
    resultName: '碳排放量',
    resultUnit: 'kgCO₂e',
    supportsSumLoop: true,
    supportsNegativeResult,
    dataOwnerType: 'org',
    description: description.trim(),
    factors,
  })

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateCalcFormula(id, buildPayload())
        toast('保存成功')
        navigate(`/model/calc-engine/${id}`)
      } else {
        const created = await createCalcFormula(buildPayload())
        toast('保存成功')
        navigate(`/model/calc-engine/${created.id}`)
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
        <PageHeader breadcrumb={['系统管理', '核算配置', '计算公式']} title={isEdit ? '编辑公式' : '新增公式'} />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '核算配置', '计算公式', isEdit ? '编辑公式' : '新增公式']}
        title={isEdit ? '编辑公式' : '新增公式'}
        description={
          isEdit
            ? `${name} · 公式与生命周期阶段无关、可跨阶段复用；阶段归属与排放源绑定在建模时配置`
            : '公式与生命周期阶段无关、可跨阶段复用；计算公式由数据因素点选生成，阶段归属与排放源绑定在建模时配置'
        }
        actions={
          <Button data-ann-target="formula.form.cancel" onClick={() => navigate(-1)}>
            取消
          </Button>
        }
      />

      <div className="ce-stack">
        <section className="card">
          <div className="ce-section-header">
            <span className="ce-section-title">基本信息</span>
          </div>
          <div className="ce-section-body">
            <div className="form-grid">
              <FormField label="公式名称" required error={errors.name}>
                <Input
                  value={name}
                  placeholder="如：因子法"
                  invalid={!!errors.name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>
              <FormField label="公式类型" required error={errors.formulaType}>
                <Select
                  value={formulaType}
                  placeholder="请选择"
                  options={typeOptions}
                  invalid={!!errors.formulaType}
                  onChange={(e) => setFormulaType(e.target.value as '' | FormulaType)}
                />
              </FormField>
              <FormField label="描述" full error={errors.description}>
                <Textarea
                  rows={3}
                  maxLength={CALC_FORMULA_DESCRIPTION_MAX}
                  value={description}
                  placeholder="请输入公式口径说明（选填）"
                  invalid={!!errors.description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div
                  className={[
                    'char-count',
                    description.length > CALC_FORMULA_DESCRIPTION_MAX ? 'char-count-over' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {description.length}/{CALC_FORMULA_DESCRIPTION_MAX}
                </div>
              </FormField>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="ce-section-header">
            <span className="ce-section-title">算法配置</span>
          </div>
          <div className="ce-section-body">
            {errors.config && (
              <div className="ce-test-error" style={{ marginBottom: 'var(--space-md)' }}>
                {errors.config}
              </div>
            )}

            <FormField label="计算公式" required>
              <div className="flex gap-xs">
                <input
                  className="input mono"
                  readOnly
                  value={expression}
                  placeholder="点击右侧「配置」点选数据因素与运算符"
                />
                <Button data-ann-target="formula.form.exprConfig" onClick={() => setExprOpen(true)}>
                  配置
                </Button>
              </div>
            </FormField>

            <div className="ce-section-tip" style={{ borderTop: 'none', padding: 'var(--space-xs) 0 var(--space-md)' }}>
              下列为计算公式用到的字段，字段名称可自定义；活动数据 / 变量运行时取值（无需维护单位），
              因子只维护名称、数值与单位在建模绑定后按因子库带出，常量直接维护数值。
            </div>

            <FormulaFactorEditor value={factors} onChange={setFactors} />
          </div>
          <div className="ce-section-body ce-section-tip">
            字段分三类：<strong>变量</strong>（自定义名称、运行时取值）、<strong>因子</strong>（只维护名称，数值与单位在建模绑定后按因子库带出）、
            <strong>常量</strong>（44/12、方向系数等固定值）；计算公式只能使用活动数据、上述字段与运算符。
            公式不做审核与版本化，保存后即可在建模时被绑定；阶段归属与排放源绑定在建模时配置。
          </div>
        </section>

        <section className="card">
          <div className="ce-form-footer">
            <Button onClick={() => navigate(-1)}>取消</Button>
            <Button
              variant="primary"
              data-ann-target="formula.form.save"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '保存中…' : '保存'}
            </Button>
          </div>
        </section>
      </div>

      <FormulaExpressionModal
        open={exprOpen}
        value={expression}
        factorNames={factors.map((item) => item.name.trim())}
        onClose={() => setExprOpen(false)}
        onConfirm={(value) => {
          setExpression(value)
          setExprOpen(false)
        }}
      />
    </>
  )
}
