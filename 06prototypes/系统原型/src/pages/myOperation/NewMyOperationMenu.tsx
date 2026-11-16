import { useEffect, useRef, useState } from 'react'
import { Button, Icon } from '@/shared/components'
import type { IconName } from '@/shared/components'
import '@/pages/model/ModelPage.css'

/** 新增工序的两种入口 */
export type MyOperationCreateMode = 'custom' | 'platform'

interface NewMyOperationMenuProps {
  onSelect: (mode: MyOperationCreateMode) => void
}

interface MenuItem {
  mode: MyOperationCreateMode
  icon: IconName
  label: string
  desc: string
}

const ITEMS: MenuItem[] = [
  { mode: 'custom', icon: 'plus', label: '自定义工序', desc: '从零开始，自行录入工序信息与投入 / 产出项' },
  { mode: 'platform', icon: 'layers', label: '从平台工序库选择', desc: '批量勾选平台工序，直接复制可编辑副本到本组织' },
]

/**
 * 「我的工序库 · 新增」主按钮 + 下拉浮层菜单（交互对齐「我的工艺库 · 新增」下拉）：
 * 自定义工序 / 从平台工序库选择。
 */
export default function NewMyOperationMenu({ onSelect }: NewMyOperationMenuProps) {
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
      <Button variant="primary" data-ann-target="my-operation.add" onClick={() => setOpen((prev) => !prev)}>
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
              data-ann-target={item.mode === 'platform' ? 'my-operation.reference-choice' : 'my-operation.custom'}
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
