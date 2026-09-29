import { useEffect, useState } from 'react'
import { Button, Modal } from '@/shared/components'
import './CalcEngine.css'

interface FormulaExpressionModalProps {
  open: boolean
  /** 打开时的初始计算公式 */
  value: string
  /** 可用的数据因素名称（来自「算法配置」中的数据因素行） */
  factorNames: string[]
  onClose: () => void
  onConfirm: (expression: string) => void
}

/** 键盘按键（数字 / 运算符 / 括号） */
const KEYS = ['1', '2', '3', '+', '4', '5', '6', '-', '7', '8', '9', '*', '.', '0', '%', '/', '(', ')', '[', ']']
const OP_KEYS = ['+', '-', '*', '/', '%', '(', ')', '[', ']', '.']

/**
 * 配置计算公式（对齐竞品）：左侧键盘点选数字与运算符，右侧点选数据因素，
 * 表达式自动拼接，无需手写；支持清空 / 删除 / 撤销。
 */
export default function FormulaExpressionModal({
  open,
  value,
  factorNames,
  onClose,
  onConfirm,
}: FormulaExpressionModalProps) {
  const [expression, setExpression] = useState(value)
  const [history, setHistory] = useState<string[]>([value])

  useEffect(() => {
    if (open) {
      setExpression(value)
      setHistory([value])
    }
  }, [open, value])

  const apply = (next: string) => {
    setExpression(next)
    setHistory((prev) => [...prev, next])
  }

  const append = (token: string) => apply(`${expression}${token}`)

  /** 删除：优先整体删除末尾的数据因素名称，否则删除最后一个字符 */
  const handleDelete = () => {
    if (!expression) return
    const matched = [...factorNames].filter(Boolean).sort((a, b) => b.length - a.length).find((name) => expression.endsWith(name))
    apply(matched ? expression.slice(0, expression.length - matched.length) : expression.slice(0, -1))
  }

  const handleUndo = () => {
    if (history.length <= 1) return
    const next = history.slice(0, -1)
    setExpression(next[next.length - 1])
    setHistory(next)
  }

  return (
    <Modal
      open={open}
      title="配置计算公式"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="formula.expr.cancel" onClick={onClose}>取消</Button>
          <Button variant="primary" data-ann-target="formula.expr.confirm" onClick={() => onConfirm(expression)}>
            确定
          </Button>
        </>
      }
    >
      <div className="ce-expr-preview">{expression || '请点选数字、运算符与数据因素'}</div>

      <div className="ce-expr-builder">
        <div className="ce-keypad">
          {KEYS.map((key) => (
            <button
              type="button"
              key={key}
              className={['ce-key', OP_KEYS.includes(key) ? 'ce-key-op' : ''].filter(Boolean).join(' ')}
              onClick={() => append(key)}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="ce-factor-panel">
          <div className="view-block-title">可用的数据因素</div>
          {factorNames.filter(Boolean).length === 0 ? (
            <div className="ce-factor-empty">请先在「数据因素」中维护因素（如活动数据、排放因子）</div>
          ) : (
            <div className="ce-factor-chips">
              {factorNames.filter(Boolean).map((name) => (
                <button type="button" key={name} className="ce-chip" onClick={() => append(name)}>
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ce-expr-actions">
        <Button size="small" data-ann-target="formula.expr.clear" onClick={() => apply('')}>
          清空
        </Button>
        <Button size="small" data-ann-target="formula.expr.delete" disabled={!expression} onClick={handleDelete}>
          删除
        </Button>
        <Button size="small" data-ann-target="formula.expr.undo" disabled={history.length <= 1} onClick={handleUndo}>
          撤销
        </Button>
      </div>
    </Modal>
  )
}
