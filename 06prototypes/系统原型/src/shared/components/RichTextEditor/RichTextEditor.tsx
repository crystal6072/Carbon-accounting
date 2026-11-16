import { useEffect, useRef, useState } from 'react'
import './RichTextEditor.css'

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  invalid?: boolean
  /** 是否显示右下角实时字数统计 */
  showCount?: boolean
}

interface Tool {
  cmd: string
  value?: string
  /** 文本型图标（B / I / U 等字样式按钮） */
  label?: string
  labelClass?: string
  /** 内联 SVG 图标路径（矢量图标按钮） */
  icon?: string
  title: string
}

/** 工具栏矢量图标（24x24 viewBox，stroke 风格，与全局 Icon 一致） */
const ICONS: Record<string, string> = {
  heading:
    'M5 5v14M19 5v14M5 12h14',
  listUnordered:
    'M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  listOrdered:
    'M9 5h11M9 12h11M9 19h11M3.5 5h.5v3h-.5zM3.5 12h.5v4h-.5zM3.5 18.5h.5V21h1.2',
  link:
    'M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1.71-1.71',
  image:
    'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  table:
    'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14',
}

const TABLE_HTML =
  '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><thead><tr><th>表头1</th><th>表头2</th></tr></thead><tbody><tr><td>内容</td><td>内容</td></tr><tr><td>内容</td><td>内容</td></tr></tbody></table><p><br/></p>'

const TOOLS: Tool[] = [
  { cmd: 'bold', label: 'B', labelClass: 'rte-btn-bold', title: '加粗' },
  { cmd: 'italic', label: 'I', labelClass: 'rte-btn-italic', title: '斜体' },
  { cmd: 'underline', label: 'U', labelClass: 'rte-btn-underline', title: '下划线' },
  { cmd: 'formatBlock', value: 'H3', icon: ICONS.heading, title: '标题' },
  { cmd: 'insertUnorderedList', icon: ICONS.listUnordered, title: '无序列表' },
  { cmd: 'insertOrderedList', icon: ICONS.listOrdered, title: '有序列表' },
  { cmd: 'createLink', icon: ICONS.link, title: '插入链接' },
  { cmd: 'insertImage', icon: ICONS.image, title: '插入图片（上传）' },
  { cmd: 'insertHTML', value: TABLE_HTML, icon: ICONS.table, title: '插入表格' },
  { cmd: 'removeFormat', label: '清除', title: '清除格式' },
]

/** 统计纯文本字数（去标签、去空白） */
function countText(html: string): number {
  const tmp = document.createElement('div')
  tmp.innerHTML = html || ''
  return (tmp.textContent || '').replace(/\s/g, '').length
}

/** 轻量富文本编辑器：contentEditable + 工具栏，产出 HTML（对应后端 LONGTEXT）。原型环境可用。 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 300,
  invalid,
  showCount = false,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [count, setCount] = useState(() => countText(value))

  // 同步外部值（如加载详情），仅在内容不一致时写入，避免编辑时光标跳动
  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) el.innerHTML = value || ''
    setCount(countText(value))
  }, [value])

  const emit = () => {
    const el = ref.current
    if (el) {
      onChange(el.innerHTML)
      setCount(countText(el.innerHTML))
    }
  }

  const exec = (cmd: string, val?: string) => {
    const el = ref.current
    if (!el) return
    el.focus()
    if (cmd === 'createLink') {
      const url = window.prompt('请输入链接地址', 'https://')
      if (url) document.execCommand('createLink', false, url)
    } else if (cmd === 'insertImage') {
      fileRef.current?.click()
      return
    } else if (cmd === 'insertHTML') {
      document.execCommand('insertHTML', false, val || '')
    } else if (cmd === 'formatBlock') {
      document.execCommand('formatBlock', false, val || 'P')
    } else {
      document.execCommand(cmd, false)
    }
    emit()
  }

  const handleImage = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : ''
      if (url && ref.current) {
        ref.current.focus()
        document.execCommand('insertImage', false, url)
        emit()
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className={`rich-editor${invalid ? ' is-invalid' : ''}`}>
      <div className="rich-editor-toolbar">
        {TOOLS.map((t) => (
          <button
            type="button"
            key={t.cmd + (t.value ?? '')}
            title={t.title}
            className={['rich-editor-btn', t.labelClass ?? ''].filter(Boolean).join(' ')}
            onMouseDown={(e) => {
              e.preventDefault()
              exec(t.cmd, t.value)
            }}
          >
            {t.icon ? (
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={t.icon} />
              </svg>
            ) : (
              t.label
            )}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="rich-editor-content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
      {showCount && <div className="rte-count">{count} 字</div>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleImage(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
