/**
 * 计量单位库 · 数据模型
 * 字段口径参考《计量单位字段清单》：
 * - D01 「单位符号 + 单位类型」唯一，符号不得含空格
 * - D02 每个单位类型下有且仅有 1 个基准单位；基准单位不可禁用 / 删除 / 改类型
 * - D03 非基准单位的「关联基准单位」必须是同类型的基准单位
 * - D04 换算系数为正数，基准单位恒为 1
 * - D06 数量类（quantity）无基准单位、不可换算
 */

/** 单位类型（系统内置枚举，共 8 类，不开放维护） */
export type UnitTypeCode =
  | 'weight'
  | 'energy'
  | 'distance'
  | 'volume'
  | 'area'
  | 'time'
  | 'quantity'
  | 'carbon'

/** 是否基准单位 */
export type YesNo = 'Y' | 'N'

/** 使用状态 */
export type UnitStatus = 'enabled' | 'disabled'

/** Element Plus Tag 类型 */
export type TagType = 'primary' | 'success' | 'info' | 'warning' | 'danger'

/** 计量单位主对象 */
export interface UnitItem {
  id: string
  /** 单位名称，如「千克」 */
  name: string
  /** 单位符号，如 kg */
  symbol: string
  /** 单位类型 */
  type: UnitTypeCode
  /** 是否基准单位 */
  isBase: boolean
  /** 关联基准单位 ID（基准单位 / 数量类为 null） */
  baseUnitId: string | null
  /** 关联基准单位符号（冗余展示字段） */
  baseUnitSymbol: string | null
  /** 换算系数：本单位 -> 基准单位的乘数（基准单位恒为 1，数量类为 null） */
  factor: number | null
  /** 使用状态 */
  status: UnitStatus
  /** 备注 */
  remark: string
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 新增 / 编辑提交的数据结构 */
export type UnitDraft = Pick<
  UnitItem,
  'name' | 'symbol' | 'type' | 'isBase' | 'baseUnitId' | 'factor' | 'status' | 'remark'
>

/** 列表查询条件 */
export interface UnitQuery {
  /** 单位名称（模糊） */
  name: string
  /** 单位符号（模糊） */
  symbol: string
  /** 单位类型 */
  type: UnitTypeCode | ''
  /** 使用状态 */
  status: UnitStatus | ''
}
