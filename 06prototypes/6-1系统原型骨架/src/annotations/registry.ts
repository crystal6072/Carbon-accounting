import type { Annotation } from './types'
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
import { mymodelAnnotations, mymodelGlobalAnnotations } from './mymodelAnnotations'
import { libraryAnnotations, libraryGlobalAnnotations } from './libraryAnnotations'
import { dashboardAnnotations, dashboardGlobalAnnotations } from './dashboardAnnotations'
import { enterpriseAnnotations, enterpriseGlobalAnnotations } from './enterpriseAnnotations'
import { sensitivityAnnotations, sensitivityGlobalAnnotations } from './sensitivityAnnotations'
import { qualityAnnotations, qualityGlobalAnnotations } from './qualityAnnotations'
import { reportAnnotations, reportGlobalAnnotations } from './reportAnnotations'
import {
  tenantAnnotations,
  tenantGlobalAnnotations,
  tenantUnitInfoAnnotations,
  tenantUnitInfoGlobalAnnotations,
} from './tenantAnnotations'
import { accountAnnotations, accountGlobalAnnotations } from './accountAnnotations'
import { roleAnnotations, roleGlobalAnnotations } from './roleAnnotations'
import { memberAnnotations, memberGlobalAnnotations } from './memberAnnotations'
import { menuAnnotations, menuGlobalAnnotations } from './menuAnnotations'
import { orgAnnotations, orgGlobalAnnotations } from './orgAnnotations'

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
  /** 额外排除的路由前缀（避免前缀相同的其他模块被误命中，如 /system/tenant 不应命中 /system/tenant-role） */
  excludePrefixes?: string[]
}

export const ANNOTATION_SCOPES: AnnotationScope[] = [
  {
    prefix: '/dashboard',
    label: '工作台',
    annotations: dashboardAnnotations,
    globalAnnotations: dashboardGlobalAnnotations,
  },
  {
    prefix: '/report/enterprise',
    label: '企业信息维护',
    annotations: enterpriseAnnotations,
    globalAnnotations: enterpriseGlobalAnnotations,
  },
  {
    prefix: '/report/sensitivity',
    label: '敏感性分析',
    annotations: sensitivityAnnotations,
    globalAnnotations: sensitivityGlobalAnnotations,
  },
  {
    prefix: '/report/quality',
    label: '数据质量评价',
    annotations: qualityAnnotations,
    globalAnnotations: qualityGlobalAnnotations,
  },
  {
    prefix: '/report/prepare',
    label: '报告编制',
    annotations: reportAnnotations,
    globalAnnotations: reportGlobalAnnotations,
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
    prefix: '/pcf/my-model',
    label: '我的模型',
    annotations: mymodelAnnotations,
    globalAnnotations: mymodelGlobalAnnotations,
  },
  {
    prefix: '/pcf/model-libraries',
    label: '模型库',
    annotations: libraryAnnotations,
    globalAnnotations: libraryGlobalAnnotations,
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
  {
    // 覆盖 /system/account（列表 / 新建 / 编辑 / 详情）与 /system/account-query（账号查询）
    prefix: '/system/account',
    label: '平台账号',
    annotations: accountAnnotations,
    globalAnnotations: accountGlobalAnnotations,
  },
  {
    // 覆盖 /system/role（列表 / 详情）与两入口共用弹窗
    prefix: '/system/role',
    label: '平台角色管理',
    annotations: roleAnnotations,
    globalAnnotations: roleGlobalAnnotations,
  },
  {
    // 覆盖 /system/tenant-role（租户端列表 / 详情）；须先于 /system/tenant 命中
    prefix: '/system/tenant-role',
    label: '角色管理（租户端）',
    annotations: roleAnnotations,
    globalAnnotations: roleGlobalAnnotations,
  },
  {
    // 覆盖 /system/member（租户端成员管理：列表 + 新建 / 编辑 / 状态 / 重置 / 权限 / 详情弹窗）
    prefix: '/system/member',
    label: '成员管理',
    annotations: memberAnnotations,
    globalAnnotations: memberGlobalAnnotations,
  },
  {
    // 覆盖 /system/tenant（列表 / 新建 / 编辑 / 详情）；排除 /system/tenant-role（租户端角色管理）
    prefix: '/system/tenant',
    excludePrefixes: ['/system/tenant-role'],
    label: '租户管理',
    annotations: tenantAnnotations,
    globalAnnotations: tenantGlobalAnnotations,
  },
  {
    prefix: '/system/unit-info',
    label: '租户信息（租户端）',
    annotations: tenantUnitInfoAnnotations,
    globalAnnotations: tenantUnitInfoGlobalAnnotations,
  },
  {
    // 覆盖 /system/menu（列表 / 新增 / 编辑）
    prefix: '/system/menu',
    label: '功能管理（菜单管理）',
    annotations: menuAnnotations,
    globalAnnotations: menuGlobalAnnotations,
  },
  {
    // 覆盖 /system/org（租户端组织架构：组织树 / 节点详情 / 直属成员 / 新增下级 / 编辑 / 移动 / 停用·启用 / 删除 及弹窗）
    prefix: '/system/org',
    label: '组织架构',
    annotations: orgAnnotations,
    globalAnnotations: orgGlobalAnnotations,
  },
]

/**
 * 按当前路由匹配批注作用域；未登记的路由返回 null（不展示批注）。
 * 取**最长前缀**命中，避免 /system/tenant 抢走 /system/tenant-role 这类同源路由。
 */
export function resolveAnnotationScope(pathname: string): AnnotationScope | null {
  const matched = ANNOTATION_SCOPES.filter(
    (scope) =>
      pathname.startsWith(scope.prefix) &&
      !(scope.excludePrefixes ?? []).some((prefix) => pathname.startsWith(prefix)),
  )
  if (matched.length === 0) return null
  return matched.reduce((prev, next) => (next.prefix.length > prev.prefix.length ? next : prev))
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
