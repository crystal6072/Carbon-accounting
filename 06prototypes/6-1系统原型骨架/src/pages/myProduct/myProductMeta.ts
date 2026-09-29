import type { TagTone } from '@/shared/components'
import type { MyProductSource, ProductUseStatus } from '@/types'

/**
 * 产品来源（**二态**，业务裁定 2026-09-28；方案 B2 原文只写「引用 / 自定义」）
 * - `referenced` 引用标准产品：平台级 `PUBLIC`，只读指向，不可编辑 / 删除，上下架随后台；
 * - `custom` 自己新增：组织自建 `ORG`，可编辑，归属组织自动带出（D03）。
 */
export const myProductSourceText: Record<MyProductSource, string> = {
  referenced: '引用标准产品',
  custom: '自己新增',
}

export const myProductSourceTone: Record<MyProductSource, TagTone> = {
  referenced: 'info',
  custom: 'default',
}

export const myProductSourceTip: Record<MyProductSource, string> = {
  referenced: '引用标准产品：从平台级产品信息库只读引用，不可编辑 / 删除，上下架状态随后台',
  custom: '自己新增：组织自建产品，可编辑与上下架，归属组织自动带出不可改',
}

/** 使用状态（上架 / 下架，产品级；引用标准产品只读展示后台状态） */
export const myProductUseStatusText: Record<ProductUseStatus, string> = {
  on: '上架',
  off: '下架',
}

export const myProductUseStatusTone: Record<ProductUseStatus, TagTone> = {
  on: 'success',
  off: 'default',
}

/** 面包屑（前台业务平台 → 我的产品库） */
export const MY_PRODUCT_BREADCRUMB = ['前台业务平台', '我的产品库']
