import { useEffect, useRef, useState } from 'react'
import { Button, Icon } from '@/shared/components'
import type { IconName } from '@/shared/components'
import '@/pages/model/ModelPage.css'

/** 新增产品的两种入口 */
export type MyProductCreateMode = 'custom' | 'platform'

interface NewMyProductMenuProps {
  onSelect: (mode: MyProductCreateMode) => void
}

interface MenuItem {
  mode: MyProductCreateMode
  icon: IconName
  label: string
  desc: string
}

const ITEMS: MenuItem[] = [
  { mode: 'custom', icon: 'plus', label: '自定义产品', desc: '从零开始，自行录入产品信息与工艺建模' },
  { mode: 'platform', icon: 'layers', label: '从平台产品库选择', desc: '引用平台已发布产品，复制一份可编辑副本到本组织' },
]

/**
 * 「我的产品库 · 新增」主按钮 + 下拉浮层菜单（交互对齐碳足迹「新增产品模型」下拉）：
 * 自定义产品 / 从平台产品库选择。
 */
export default function NewMyProductMenu({ onSelect }: NewMyProductMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="model-dropdown-wrap" ref={rootRef}>
      <Button variant="primary" data-ann-target="my-product-add" onClick={() => setOpen((prev) => !prev)}>
        <span className="pcf-inline">
          新增
          <Icon name="chevronDown" size={14} />
        </span>
      </Button>
      {open && (
        <div className="model-dropdown" role="menu">
          {ITEMS.map((item) => (
            <button
              key={item.mode}
              type="button"
              className="model-dropdown-item"
              role="menuitem"
              data-ann-target={item.mode === 'platform' ? 'my-product-reference' : 'my-product-custom'}
              onClick={() => {
                setOpen(false)
                onSelect(item.mode)
              }}
            >
              <span className="model-dropdown-icon">
                <Icon name={item.icon} size={16} />
              </span>
              <span className="model-dropdown-text">
                <span>{item.label}</span>
                <span className="model-dropdown-desc">{item.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
