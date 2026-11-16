/**
 * 文件库预览 / 下载工具。
 *
 * 原型以 data URL 保存上传文件；浏览器会拦截对 `data:` 地址的顶层导航，
 * 因此统一转成 Blob URL 后再用于 iframe 预览或 a[download] 下载。
 */

/** 读取本地文件为 data URL（原型只在内存保存，不落真实文件服务） */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

/** data URL → Blob URL（非 data URL 原样返回） */
export function toBlobUrl(url: string): string {
  if (!url.startsWith('data:')) return url
  const comma = url.indexOf(',')
  if (comma < 0) return url
  const meta = url.slice(5, comma)
  const payload = url.slice(comma + 1)
  const mime = meta.split(';')[0] || 'application/octet-stream'
  try {
    let bytes: Uint8Array
    if (meta.includes(';base64')) {
      const bin = atob(payload)
      const arr = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i)
      bytes = arr
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(payload))
    }
    return URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mime }))
  } catch {
    return url
  }
}

/** 触发浏览器下载 */
export function downloadFile(url: string, fileName: string) {
  const target = toBlobUrl(url)
  const a = document.createElement('a')
  a.href = target
  a.download = fileName || '文件'
  a.rel = 'noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (target.startsWith('blob:')) window.setTimeout(() => URL.revokeObjectURL(target), 2000)
}

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif']

/** 预览类型：图片 / PDF 在线渲染，其余仅下载（D13 / §2.7） */
export function previewKindOf(version: { fileName: string; url?: string }): 'image' | 'pdf' | 'none' {
  const url = version.url ?? ''
  if (url.startsWith('data:image') || url.startsWith('blob:')) {
    const ext = (version.fileName.toLowerCase().split('.').pop() ?? '').trim()
    if (IMAGE_EXT.includes(ext)) return 'image'
  }
  const ext = (version.fileName.toLowerCase().split('.').pop() ?? '').trim()
  if (IMAGE_EXT.includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  return 'none'
}
