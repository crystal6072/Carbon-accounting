import { useState, type ReactNode } from 'react'
import './PcfPage.css'

interface PcfPanelProps {
  title: string
  tip?: string
  /** 是否可折叠（折叠后面板主体收起，标题栏仍可见） */
  collapsible?: boolean
  /** 初始是否收起（仅 collapsible 时生效） */
  defaultCollapsed?: boolean
  children: ReactNode
}

/** 步骤表单分组面板（步骤① / ② 共用） */
export default function PcfPanel({
  title,
  tip,
  collapsible = false,
  defaultCollapsed = false,
  children,
}: PcfPanelProps) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed)

  return (
    <section className="pcf-panel">
      <div className="pcf-panel-head">
        <span className="pcf-panel-title">
          {collapsible && (
            <button
              type="button"
              className="pcf-panel-toggle"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapsed ? '▸' : '▾'}
            </button>
          )}
          {title}
        </span>
        {tip && <span className="pcf-panel-tip">{tip}</span>}
      </div>
      {!collapsed && children}
    </section>
  )
}
