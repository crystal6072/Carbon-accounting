import { useToast } from './Toast'
import './ImageUpload.css'

/** 读取本地图片文件为 data URL（原型只做本地预览，不落真实文件服务） */
function readImages(files: File[]): Promise<string[]> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result ?? ''))
          reader.onerror = () => resolve('')
          reader.readAsDataURL(file)
        }),
    ),
  )
}

interface ImageUploadProps {
  /** 图片 data URL（空串 = 未上传） */
  value: string
  onChange: (value: string) => void
  /** 校验失败态（边框高亮） */
  invalid?: boolean
  /** 输入框下方提示 */
  tip?: string
  /** 未上传时的占位文案 */
  emptyText?: string
}

/** 单图上传（产品图片等「必填单图」字段；原型仅本地预览，不校验尺寸与格式） */
export function ImageUpload({ value, onChange, invalid, tip, emptyText = '暂无图片' }: ImageUploadProps) {
  const toast = useToast()

  const handlePick = async (files: File[]) => {
    if (files.length === 0) return
    if (files.some((file) => !file.type.startsWith('image/'))) {
      toast('请选择图片文件', 'error')
      return
    }
    const [url] = await readImages(files.slice(0, 1))
    if (url) onChange(url)
  }

  return (
    <div className={['image-upload', invalid ? 'is-invalid' : ''].filter(Boolean).join(' ')}>
      {value ? (
        <img className="image-thumb" src={value} alt="产品图片" />
      ) : (
        <div className="image-thumb image-thumb-empty">{emptyText}</div>
      )}
      <div className="image-upload-actions">
        <label className="btn btn-sm">
          {value ? '更换图片' : '选择图片'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void handlePick(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </label>
        {value && (
          <button type="button" className="link link-danger" onClick={() => onChange('')}>
            移除
          </button>
        )}
        {tip && <span className="toolbar-tip">{tip}</span>}
      </div>
    </div>
  )
}

interface MultiImageUploadProps {
  /** 图片 data URL 列表 */
  value: string[]
  onChange: (value: string[]) => void
  /** 最多可上传张数 */
  max?: number
  tip?: string
}

/** 多图上传（产品场景应用等「多张图片」字段） */
export function MultiImageUpload({ value, onChange, max = 6, tip }: MultiImageUploadProps) {
  const toast = useToast()

  const handlePick = async (files: File[]) => {
    if (files.length === 0) return
    const room = max - value.length
    if (room <= 0) {
      toast(`最多上传 ${max} 张图片`, 'error')
      return
    }
    const picked = files.filter((file) => file.type.startsWith('image/')).slice(0, room)
    if (picked.length === 0) {
      toast('请选择图片文件', 'error')
      return
    }
    if (picked.length < files.length) toast(`最多上传 ${max} 张图片，已按上限截取`, 'error')
    const urls = (await readImages(picked)).filter(Boolean)
    onChange([...value, ...urls])
  }

  return (
    <div className="image-multi">
      <div className="image-grid">
        {value.map((url, index) => (
          <div className="image-tile" key={`${index}-${url.slice(-16)}`}>
            <img className="image-thumb" src={url} alt={`场景图片 ${index + 1}`} />
            <button
              type="button"
              className="image-tile-remove"
              title="移除该图片"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="image-add">
            + 上传图片
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void handlePick(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>
      <span className="toolbar-tip">{tip ?? `支持多张（最多 ${max} 张）；原型仅本地预览，不校验尺寸与格式`}</span>
    </div>
  )
}

/** 图片只读展示（查看页 / 详情页） */
export function ImagePreview({ value, emptyText = '暂无图片' }: { value?: string; emptyText?: string }) {
  if (!value) return <div className="image-thumb image-thumb-empty">{emptyText}</div>
  return <img className="image-thumb" src={value} alt="产品图片" />
}
