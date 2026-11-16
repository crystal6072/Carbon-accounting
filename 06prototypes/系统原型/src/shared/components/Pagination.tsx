import { useState } from 'react'
import { Select, Input } from '@/shared/components'

interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onChange: (page: number) => void
  /** 每页条数切换（如 [10, 20, 50]）；不传则不显示切换器 */
  pageSizeOptions?: number[]
  /** 是否显示「跳至第 N 页」 */
  showJump?: boolean
  /** 每页条数变化回调（切换后页码重置为 1） */
  onPageSizeChange?: (size: number) => void
}

export default function Pagination({
  total,
  page,
  pageSize,
  onChange,
  pageSizeOptions,
  showJump,
  onPageSizeChange,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
  const [jump, setJump] = useState('')

  const goJump = () => {
    const target = Number(jump)
    if (!target || target < 1 || target > pageCount) {
      setJump('')
      return
    }
    onChange(target)
    setJump('')
  }

  return (
    <div className="pagination">
      <span className="pagination-total">共 {total} 条</span>
      {pageSizeOptions && (
        <Select
          className="pagination-size"
          value={String(pageSize)}
          options={pageSizeOptions.map((o) => ({ label: `${o} 条/页`, value: String(o) }))}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
        />
      )}
      <button className="page-btn" type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={['page-btn', p === page ? 'active' : ''].filter(Boolean).join(' ')}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button className="page-btn" type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        ›
      </button>
      {showJump && (
        <span className="pagination-jump">
          跳至
          <Input
            className="pagination-jump-input"
            value={jump}
            placeholder="页码"
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goJump()
            }}
          />
          页
          <button type="button" className="page-btn pagination-jump-btn" onClick={goJump}>
            跳转
          </button>
        </span>
      )}
      <span className="pagination-total" style={{ marginRight: 0, marginLeft: 8 }}>
        每页 {pageSize} 条
      </span>
    </div>
  )
}
