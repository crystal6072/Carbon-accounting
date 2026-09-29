interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onChange: (page: number) => void
}

export default function Pagination({ total, page, pageSize, onChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)

  return (
    <div className="pagination">
      <span className="pagination-total">共 {total} 条</span>
      <button
        className="page-btn"
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
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
      <button
        className="page-btn"
        type="button"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
      <span className="pagination-total" style={{ marginRight: 0, marginLeft: 8 }}>
        每页 {pageSize} 条
      </span>
    </div>
  )
}
