/**
 * CSV 读写工具（原型用，零依赖）。
 * 导入模板以 CSV 交付：Excel 可直接打开，也可「另存为 CSV」回传。
 */

/** 解析 CSV 文本：支持双引号包裹、引号内逗号 / 换行、`""` 转义；自动跳过空行与 BOM */
export function parseCsvText(text: string): string[][] {
  const source = text.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((item) => item.some((value) => value.trim() !== ''))
}

/** 生成 CSV 文本（含引号转义，CRLF 换行） */
export function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => (/[",\n\r]/.test(cell) ? `"${cell.split('"').join('""')}"` : cell))
        .join(','),
    )
    .join('\r\n')
}

/** 触发浏览器下载（带 UTF-8 BOM，Excel 打开不乱码） */
export function downloadCsv(fileName: string, content: string): void {
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
