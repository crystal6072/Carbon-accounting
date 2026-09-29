import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  /** 表头内容：文案或节点（如全选框） */
  title: ReactNode
  width?: number | string
  align?: 'left' | 'center' | 'right'
  render?: (row: T, index: number) => ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  loading?: boolean
  emptyText?: string
  /** 行点击回调（用于弹窗内单选表格：点行即选中） */
  onRowClick?: (row: T) => void
  /** 行附加类名（用于选中态高亮） */
  rowClassName?: (row: T) => string
}

export default function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
  rowClassName,
}: TableProps<T>) {
  return (
    <table className="data-table">
      <colgroup>
        {columns.map((col) => (
          <col key={col.key} style={col.width ? { width: col.width } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={{ textAlign: col.align ?? 'left' }}>
              {col.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr>
            <td className="cell-empty" colSpan={columns.length}>
              加载中…
            </td>
          </tr>
        )}
        {!loading && data.length === 0 && (
          <tr>
            <td className="cell-empty" colSpan={columns.length}>
              {emptyText}
            </td>
          </tr>
        )}
        {!loading &&
          data.map((row, index) => (
            <tr
              key={rowKey(row)}
              className={rowClassName ? rowClassName(row) : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                  {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  )
}
