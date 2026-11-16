import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

export interface Column<T> {
  key: string
  /** 表头内容：文案或节点（如全选框） */
  title: ReactNode
  width?: number | string
  align?: 'left' | 'center' | 'right'
  render?: (row: T, index: number) => ReactNode
}

/** 行复选配置：不传则表格行为与改造前完全一致（无复选列） */
export interface RowSelection<T> {
  /** 已选中行的 rowKey 集合 */
  selectedKeys: string[]
  /** 选中项变化（勾选 / 取消 / 全选当前页）回调 */
  onChange: (keys: string[]) => void
  /** 某行是否禁用勾选（如不可操作的终态行） */
  disabled?: (row: T) => boolean
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
  /** 行复选（批量操作）：不传则不渲染复选列，既有调用方行为不变 */
  rowSelection?: RowSelection<T>
}

const SELECT_COL_WIDTH = 44

export default function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = '暂无数据',
  onRowClick,
  rowClassName,
  rowSelection,
}: TableProps<T>) {
  const effectiveColumns = rowSelection ? [{ key: '__select__', title: '', width: SELECT_COL_WIDTH }, ...columns] : columns

  const allKeys = data.map(rowKey)
  const selectableKeys = rowSelection
    ? allKeys.filter((key) => {
        const row = data.find((item) => rowKey(item) === key)
        return row ? !rowSelection.disabled?.(row) : true
      })
    : []
  const selectedSet = new Set(rowSelection?.selectedKeys ?? [])
  const selectedSelectable = selectableKeys.filter((key) => selectedSet.has(key))
  const allChecked = selectableKeys.length > 0 && selectedSelectable.length === selectableKeys.length
  const someChecked = selectedSelectable.length > 0 && !allChecked

  const headRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (headRef.current) headRef.current.indeterminate = someChecked
  }, [someChecked])

  const toggleOne = (key: string) => {
    if (!rowSelection) return
    const next = new Set(rowSelection.selectedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    rowSelection.onChange([...next])
  }

  const toggleAll = () => {
    if (!rowSelection) return
    if (allChecked) {
      const remaining = rowSelection.selectedKeys.filter((key) => !selectableKeys.includes(key))
      rowSelection.onChange(remaining)
    } else {
      rowSelection.onChange([...new Set([...rowSelection.selectedKeys, ...selectableKeys])])
    }
  }

  return (
    <table className="data-table">
      <colgroup>
        {effectiveColumns.map((col) => (
          <col key={col.key} style={col.width ? { width: col.width } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {effectiveColumns.map((col) =>
            col.key === '__select__' ? (
              <th key={col.key} style={{ textAlign: 'center', width: SELECT_COL_WIDTH }}>
                <input
                  ref={headRef}
                  type="checkbox"
                  className="table-checkbox"
                  checked={allChecked}
                  disabled={selectableKeys.length === 0}
                  onChange={toggleAll}
                  aria-label="全选当前页"
                />
              </th>
            ) : (
              <th key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                {col.title}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr>
            <td className="cell-empty" colSpan={effectiveColumns.length}>
              加载中…
            </td>
          </tr>
        )}
        {!loading && data.length === 0 && (
          <tr>
            <td className="cell-empty" colSpan={effectiveColumns.length}>
              {emptyText}
            </td>
          </tr>
        )}
        {!loading &&
          data.map((row, index) => {
            const key = rowKey(row)
            const checked = selectedSet.has(key)
            const disabled = rowSelection?.disabled?.(row) ?? false
            return (
              <tr
                key={key}
                className={[rowClassName ? rowClassName(row) : '', rowSelection && checked ? 'row-selected' : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {rowSelection && (
                  <td style={{ textAlign: 'center', width: SELECT_COL_WIDTH }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="table-checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleOne(key)}
                      aria-label="选择行"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                    {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            )
          })}
      </tbody>
    </table>
  )
}
