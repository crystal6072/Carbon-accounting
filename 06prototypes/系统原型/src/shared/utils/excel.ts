/**
 * Excel 导出工具（原型用，基于 SheetJS）。
 * 统一入口，避免各页面各自拼装 a 标签下载逻辑。
 */
export interface ExcelColumn {
  title: string
  /** 列宽（字符数），不传时按内容自适应 */
  width?: number
}

export interface ExcelSheet {
  /** 工作表名 */
  name: string
  columns: ExcelColumn[]
  /** 数据行，顺序与 columns 一致 */
  rows: (string | number)[][]
}

/** 按内容估算列宽（中文按 2 个字符计），上限 40 */
function calcWidth(columns: ExcelColumn[], rows: (string | number)[][]): number[] {
  return columns.map((column, index) => {
    if (column.width) return column.width
    const longest = rows.reduce((max, row) => {
      const text = String(row[index] ?? '')
      const length = text.replace(/[^\x00-\xff]/g, 'aa').length
      return Math.max(max, length)
    }, column.title.replace(/[^\x00-\xff]/g, 'aa').length)
    return Math.min(Math.max(longest + 2, 8), 40)
  })
}

/**
 * 导出为 .xlsx 并触发浏览器下载（xlsx 体积较大，按需动态引入）。
 * 支持多工作表：每个 sheet 的 AOA 由「表头 + 数据行」拼成，列宽按内容自适应。
 */
export async function exportWorkbook(fileName: string, sheets: ExcelSheet[]): Promise<void> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const aoa: (string | number)[][] = [sheet.columns.map((column) => column.title), ...sheet.rows]
    const worksheet = XLSX.utils.aoa_to_sheet(aoa)
    worksheet['!cols'] = calcWidth(sheet.columns, sheet.rows).map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31))
  }
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
}

/** 单工作表导出（兼容旧调用） */
export async function exportToExcel(fileName: string, sheet: ExcelSheet): Promise<void> {
  await exportWorkbook(fileName, [sheet])
}

/** 生成「名称_YYYYMMDDHHmm」形式的导出文件名 */
export function timestampedName(prefix: string): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
  return `${prefix}_${stamp}`
}
