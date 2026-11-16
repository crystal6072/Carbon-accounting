import { MessagePlugin } from 'tdesign-react'
import { exportReport } from '@/mock/report'

/**
 * 下载报告文件（原型：exportReport → .docx Blob，PRD R-117）。
 * 报告预览界面、详情页操作栏共用同一条下载链路。
 */
export async function downloadReportFile(reportId: string): Promise<void> {
  const { fileName, blob } = await exportReport(reportId)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  MessagePlugin.success('报告已导出')
}
