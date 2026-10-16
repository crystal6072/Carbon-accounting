import type { Annotation } from './types'
import { calcFormulaAnnotations, globalAnnotationList } from './calcFormulaAnnotations'
import { categoryAnnotations, categoryGlobalAnnotations } from './categoryAnnotations'
import { productAnnotations } from './productAnnotations'
import { processAnnotations, processGlobalAnnotations } from './processAnnotations'
import { operationAnnotations, operationGlobalAnnotations } from './operationAnnotations'
import { materialAnnotations, materialGlobalAnnotations } from './materialAnnotations'
import { energyAnnotations, energyGlobalAnnotations } from './energyAnnotations'
import { unitAnnotations, unitGlobalAnnotations } from './unitAnnotations'
import { lifecycleAnnotations, lifecycleGlobalAnnotations } from './lifecycleAnnotations'
import { standardAnnotations, standardGlobalAnnotations } from './standardAnnotations'
import { industryAnnotations, industryGlobalAnnotations } from './industryAnnotations'
import { factorAnnotations, factorGlobalAnnotations } from './factorAnnotations'
import { pcfAnnotations, pcfGlobalAnnotations } from './pcfAnnotations'
import { pcfFactorAnnotations, pcfFactorGlobalAnnotations } from './pcfFactorAnnotations'
import { myProductAnnotations, myProductGlobalAnnotations } from './myProductAnnotations'
import { myProcessAnnotations, myProcessGlobalAnnotations } from './myProcessAnnotations'

/**
 * 批注作用域：按路由前缀生效。
 * 新增模块只需在此登记「路由前缀 + 批注数据」，展示层无需改动。
 */
export interface AnnotationScope {
  /** 生效的路由前缀 */
  prefix: string
  /** 模块名称 */
  label: string
  /** 可匹配批注（锚定到页面元素，元素旁显示批注标记） */
  annotations: Annotation[]
  /** 全局批注（未匹配 / 文档级说明） */
  globalAnnotations: Annotation[]
}

export const ANNOTATION_SCOPES: AnnotationScope[] = [
  {
    prefix: '/model/calc-engine',
    label: '计算公式',
    annotations: calcFormulaAnnotations,
    globalAnnotations: globalAnnotationList,
  },
  {
    prefix: '/basic/category',
    label: '产品分类',
    annotations: categoryAnnotations,
    globalAnnotations: categoryGlobalAnnotations,
  },
  {
    prefix: '/basic/product',
    label: '产品信息库',
    annotations: productAnnotations,
    globalAnnotations: [],
  },
  {
    prefix: '/basic/process',
    label: '工艺流程',
    annotations: processAnnotations,
    globalAnnotations: processGlobalAnnotations,
  },
  {
    prefix: '/basic/operation',
    label: '工序',
    annotations: operationAnnotations,
    globalAnnotations: operationGlobalAnnotations,
  },
  {
    prefix: '/basic/material',
    label: '物料库',
    annotations: materialAnnotations,
    globalAnnotations: materialGlobalAnnotations,
  },
  {
    prefix: '/basic/energy',
    label: '能源库',
    annotations: energyAnnotations,
    globalAnnotations: energyGlobalAnnotations,
  },
  {
    prefix: '/basic/unit',
    label: '计量单位库',
    annotations: unitAnnotations,
    globalAnnotations: unitGlobalAnnotations,
  },
  {
    prefix: '/basic/lifecycle',
    label: '生命周期阶段',
    annotations: lifecycleAnnotations,
    globalAnnotations: lifecycleGlobalAnnotations,
  },
  {
    prefix: '/basic/standard',
    label: '标准文件库',
    annotations: standardAnnotations,
    globalAnnotations: standardGlobalAnnotations,
  },
  {
    prefix: '/basic/industry',
    label: '行业库',
    annotations: industryAnnotations,
    globalAnnotations: industryGlobalAnnotations,
  },
  {
    prefix: '/model/factor-lib',
    label: '因子库管理',
    annotations: factorAnnotations,
    globalAnnotations: factorGlobalAnnotations,
  },
  {
    prefix: '/pcf/project',
    label: '碳核算项目',
    annotations: pcfAnnotations,
    globalAnnotations: pcfGlobalAnnotations,
  },
  {
    prefix: '/pcf/my-product',
    label: '我的产品库',
    annotations: myProductAnnotations,
    globalAnnotations: myProductGlobalAnnotations,
  },
  {
    prefix: '/pcf/my-process',
    label: '我的工艺库',
    annotations: myProcessAnnotations,
    globalAnnotations: myProcessGlobalAnnotations,
  },
  {
    prefix: '/pcf/factor-libraries',
    label: '背景数据库',
    annotations: pcfFactorAnnotations,
    globalAnnotations: pcfFactorGlobalAnnotations,
  },
  {
    prefix: '/pcf/my-factor',
    label: '我的因子库',
    annotations: pcfFactorAnnotations,
    globalAnnotations: pcfFactorGlobalAnnotations,
  },
]

/** 按当前路由匹配批注作用域；未登记的路由返回 null（不展示批注） */
export function resolveAnnotationScope(pathname: string): AnnotationScope | null {
  return ANNOTATION_SCOPES.find((scope) => pathname.startsWith(scope.prefix)) ?? null
}

/** 锚点 → 批注列表（selector 与 matchTargets 均纳入映射，同 target 去重） */
export function buildTargetMap(annotations: Annotation[]): Map<string, Annotation[]> {
  const map = new Map<string, Annotation[]>()
  annotations
    .filter((item) => item.matchStatus === 'matched')
    .forEach((item) => {
      const keys = new Set<string>()
      if (item.selector) keys.add(item.selector)
      ;(item.matchTargets ?? []).forEach((target) => keys.add(target.selector))
      keys.forEach((key) => {
        const list = map.get(key) ?? []
        if (!list.includes(item)) list.push(item)
        map.set(key, list)
      })
    })
  return map
}
