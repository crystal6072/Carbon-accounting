import type { IconName } from '@/shared/components'

export interface MenuNode {
  key: string
  label: string
  icon?: IconName
  children?: MenuNode[]
}

/**
 * 菜单结构对齐《整体设计方案》§8 页面清单 + §2 功能架构。
 * 2026-09-29 整理：产品库 / 工艺流程管理 / 平台支撑归并到「后台管理」下（后台管理为一级分组）。
 */
export const menuConfig: MenuNode[] = [
  { key: '/dashboard', label: '工作台', icon: 'dashboard' },
  {
    key: 'group-frontend',
    label: '前台业务平台',
    icon: 'layers',
    children: [
      { key: '/pcf/project', label: '产品碳足迹核算' },
      { key: '/pcf/my-product', label: '我的产品库' },
      { key: '/pcf/my-process', label: '我的工艺库' },
      { key: '/pcf/my-factor', label: '我的因子库' },
    ],
  },
  {
    key: 'group-backend',
    label: '后台管理',
    icon: 'settings',
    children: [
      {
        key: 'group-product-library',
        label: '产品库',
        icon: 'layers',
        children: [
          { key: '/basic/category', label: '产品分类' },
          { key: '/basic/product', label: '产品信息库' },
        ],
      },
      {
        key: 'group-process',
        label: '工艺流程管理',
        icon: 'settings',
        children: [
          { key: '/basic/process', label: '工艺流程' },
          { key: '/basic/operation', label: '工序' },
        ],
      },
      {
        key: 'group-basic-library',
        label: '基础库',
        icon: 'database',
        children: [
          { key: '/basic/material', label: '物料库' },
          { key: '/basic/energy', label: '能源库' },
          { key: '/basic/unit', label: '计量单位库' },
          { key: '/basic/lifecycle', label: '生命周期阶段' },
          { key: '/basic/standard', label: '标准文件库' },
          { key: '/basic/industry', label: '行业库' },
        ],
      },
      {
        key: 'group-model',
        label: '核算配置',
        icon: 'sliders',
        children: [
          { key: '/model/calc-engine', label: '计算公式' },
          { key: '/model/factor', label: '排放因子库' },
          { key: '/model/allocation', label: '分配规则管理' },
        ],
      },
      {
        key: 'group-system',
        label: '平台支撑',
        icon: 'user',
        children: [
          { key: '/system/org', label: '组织架构' },
          { key: '/system/user', label: '用户与角色' },
          { key: '/system/dict', label: '数据字典' },
        ],
      },
    ],
  },
]

/** 找到某节点下第一个叶子路由（用于顶栏一级导航跳转） */
export function findFirstLeaf(node: MenuNode): string | undefined {
  if (!node.children || node.children.length === 0) {
    return node.key.startsWith('/') ? node.key : undefined
  }
  for (const child of node.children) {
    const leaf = findFirstLeaf(child)
    if (leaf) return leaf
  }
  return undefined
}

/** 节点（含子孙）是否覆盖指定路径；叶子按其子路由前缀命中 */
export function isNodeActive(node: MenuNode, path: string): boolean {
  if (!node.children || node.children.length === 0) {
    return node.key.startsWith('/') && (path === node.key || path.startsWith(`${node.key}/`))
  }
  return node.children.some((child) => isNodeActive(child, path))
}

/** 找到包含指定路径的所有祖先节点 key（用于自动展开侧栏）；未命中返回 undefined */
export function findAncestorKeys(nodes: MenuNode[], path: string): string[] | undefined {
  for (const node of nodes) {
    if (!isNodeActive(node, path)) continue
    // 叶子节点：祖先链中不含自身
    if (!node.children || node.children.length === 0) return []
    const rest = findAncestorKeys(node.children, path)
    return rest ? [node.key, ...rest] : [node.key]
  }
  return undefined
}

/** 平铺菜单，得到 path → label 映射，用于面包屑 */
export function flattenMenu(nodes: MenuNode[]): MenuNode[] {
  const result: MenuNode[] = []
  const walk = (list: MenuNode[]) => {
    list.forEach((node) => {
      if (node.key.startsWith('/')) result.push(node)
      if (node.children) walk(node.children)
    })
  }
  walk(nodes)
  return result
}

/** 根据路径生成面包屑 */
export function buildBreadcrumb(path: string): string[] {
  const walk = (nodes: MenuNode[], trail: string[]): string[] | undefined => {
    for (const node of nodes) {
      const nextTrail = node.key.startsWith('/') ? [...trail, node.label] : trail
      if (node.key === path) return nextTrail
      if (node.children) {
        const found = walk(node.children, nextTrail)
        if (found) return found
      }
    }
    return undefined
  }
  return walk(menuConfig, []) ?? ['工作台']
}
