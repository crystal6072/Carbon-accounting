import { useState } from 'react'

interface AccountAvatarProps {
  /** 头像 data URL；空串 = 未上传 */
  value: string
  /** 姓名：未上传时取首字做占位 */
  name: string
  /** 尺寸：sm 列表 / md 详情与表单 */
  size?: 'sm' | 'md'
  /** 是否允许上传与移除（表单内为 true，列表与详情为 false） */
  editable?: boolean
  onChange?: (value: string) => void
}

/** 读取本地图片为 data URL（原型只做本地预览，不落真实文件服务） */
function readImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

/** 平台账号头像：非必填；未上传时以姓名首字占位 */
export default function AccountAvatar({ value, name, size = 'sm', editable = false, onChange }: AccountAvatarProps) {
  const [picking, setPicking] = useState(false)

  const handlePick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setPicking(true)
    try {
      const url = await readImage(file)
      if (url) onChange?.(url)
    } finally {
      setPicking(false)
    }
  }

  const initial = name.trim().charAt(0) || '—'
  const cls = ['account-avatar', `account-avatar-${size}`].join(' ')

  return (
    <span className="account-avatar-wrap">
      {value ? (
        <img className={cls} src={value} alt={`${name}的头像`} />
      ) : (
        <span className={`${cls} account-avatar-empty`} aria-hidden="true">
          {initial}
        </span>
      )}
      {editable && (
        <span className="account-avatar-actions">
          <label className="link">
            {picking ? '读取中…' : value ? '更换' : '上传头像'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void handlePick(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
          {value && (
            <button type="button" className="link link-danger" onClick={() => onChange?.('')}>
              移除
            </button>
          )}
        </span>
      )}
    </span>
  )
}
