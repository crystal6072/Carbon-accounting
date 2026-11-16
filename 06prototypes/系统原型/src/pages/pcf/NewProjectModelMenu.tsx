import { useEffect, useRef, useState } from 'react'
import { Button, Icon } from '@/shared/components'
import type { IconName } from '@/shared/components'
import '@/pages/model/ModelPage.css'

/** 新增核算的三种入口 */
export type ProjectCreateMode = 'custom' | 'platform' | 'my'

interface NewProjectModelMenuProps {
  onSelect: (mode: ProjectCreateMode) => void
}

interface MenuItem {
  mode: ProjectCreateMode
  icon: IconName
  label: string
  desc: string
}

const ITEMS: MenuItem[] = [
  { mode: 'custom', icon: 'plus', label: '自定义核算', desc: '从零开始，自行录入目标与范围与产品建模' },
  { mode: 'platform', icon: 'layers', label: '从平台模型库选择', desc: '引用平台已发布模型，快速带入阶段与数据项' },
  { mode: 'my', icon: 'bookmark', label: '从我的模型库选择', desc: '引用本组织「我的模型」，带入后可继续编辑' },
]

/**
 * 「新增产品模型」主按钮 + 下拉浮层菜单（对齐竞品参考图 1）：
 * 自定义核算 / 从平台模型库选择 / 从我的模型库选择。
 * V0.9（2026-10-13）：主入口由「新增核算」更名为「新增产品模型」。
 */
export default function NewProjectModelMenu({ onSelect }: NewProjectModelMenuProps) {
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
      <Button variant="primary" onClick={() => setOpen((prev) => !prev)}>
        <span className="pcf-inline">
          新增产品模型
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
