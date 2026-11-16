/**
 * 阶段基础参数（「阶段基础参数」可折叠面板）配置 + 折算逻辑。
 *
 * 设计要点：
 * - 面板承载**不直接产生碳排放**（不参与活动数据 数量×排放因子 计算）的过程参数与台账；
 * - 表单字段、标题、一键折算按钮**按左侧选中的生命周期阶段（阶段）动态渲染**；
 * - 「一键折算」由本文件的 `build` 函数产出活动数据行，交由上层（ProjectStepTwo）追加到下方核算列表。
 */

import type { PcfDataItemType, PcfEmissionType } from '@/types'

export interface StageParamField {
  /** 字段键（同时作为 JSON 存储 key，如「出材率」） */
  key: string
  /** 字段标签（展示用） */
  label: string
  /** 控件类型：text = 文本框 / number = 数字（带单位后缀）/ select = 下拉选择 */
  control: 'text' | 'number' | 'select'
  /** number 控件的单位后缀（如 "%"、"km"） */
  unit?: string
  /** select 控件的候选值（提供即渲染为下拉选择） */
  options?: string[]
  /** 是否参与折叠态摘要展示 */
  summary?: boolean
}

/** 由「一键折算」生成的活动数据行（不含落库所需的 id / 阶段 / 节点，由上层补全） */
export interface GeneratedActivityItem {
  name: string
  itemType: PcfDataItemType
  emissionType?: PcfEmissionType | null
  quantity: number
  unit: string
}

export interface StageParamAction {
  /** 按钮文案（如「推算采伐损耗」） */
  label: string
  /** 计算公式说明（点击推算前展示，如「采伐损耗 = 采伐量 × (1 − 出材率)」） */
  formula?: string
  /** 防呆校验：返回错误信息字符串，无错误返回 null */
  validate?: (form: Record<string, string>) => string | null
  /** 由表单值生成的活动数据行（可多行） */
  build: (form: Record<string, string>) => GeneratedActivityItem[]
}

export interface StageParamConfig {
  /** 面板标题（随阶段联动，如「采伐阶段场景参数」） */
  title: string
  /** 内部表单字段（动态渲染） */
  fields: StageParamField[]
  /** 一键折算按钮 */
  actions: StageParamAction[]
}

/** 取表单数值（非法值回退 0） */
const num = (form: Record<string, string>, key: string): number => {
  const value = parseFloat(form[key] ?? '')
  return Number.isFinite(value) ? value : 0
}

/** 保留三位小数，避免浮点噪声 */
const round = (value: number): number => Math.round(value * 1000) / 1000

/* ---------------- 采伐阶段（原材料获取） ---------------- */

const HARVEST_CONFIG: StageParamConfig = {
  title: '采伐阶段场景参数',
  fields: [
    { key: '林地信息', label: '林地信息', control: 'text', summary: true },
    { key: '采伐量', label: '采伐量', control: 'number', unit: 't', summary: true },
    { key: '出材率', label: '出材率', control: 'number', unit: '%', summary: true },
    { key: '集材距离', label: '集材距离', control: 'number', unit: 'km', summary: true },
  ],
  actions: [
    {
      label: '推算采伐损耗',
      formula: '采伐损耗 = 采伐量 × (1 − 出材率)',
      build: (form) => {
        const quantity = num(form, '采伐量')
        const rate = num(form, '出材率') / 100
        return [
          {
            name: '采伐残余物（损耗）',
            itemType: 'emission',
            emissionType: 'wasteSolid',
            quantity: round(quantity * (1 - rate)),
            unit: 't',
          },
        ]
      },
    },
  ],
}

/* ---------------- 运输阶段 ---------------- */

const TRANSPORT_CONFIG: StageParamConfig = {
  title: '运输阶段场景参数',
  fields: [
    {
      key: '运输方式',
      label: '运输方式',
      control: 'select',
      options: ['公路', '铁路', '水路', '航空'],
      summary: true,
    },
    { key: '距离', label: '距离', control: 'number', unit: 'km', summary: true },
    { key: '载重', label: '载重', control: 'number', unit: 't', summary: true },
    { key: '装载率', label: '装载率', control: 'number', unit: '%' },
  ],
  actions: [
    {
      label: '生成周转量数据',
      build: (form) => {
        const load = num(form, '载重')
        const distance = num(form, '距离')
        return [
          {
            name: '运输周转量',
            itemType: 'intermediate',
            emissionType: null,
            quantity: round(load * distance),
            unit: 't·km',
          },
        ]
      },
    },
  ],
}

/* ---------------- 使用阶段 ---------------- */

const USE_CONFIG: StageParamConfig = {
  title: '使用阶段场景参数',
  fields: [
    { key: '产品设计寿命', label: '产品设计寿命', control: 'number', unit: '年', summary: true },
    { key: '维护周期', label: '维护周期', control: 'number', unit: '次/年' },
    { key: '翻新次数', label: '翻新次数', control: 'number', unit: '次' },
    { key: '使用能耗', label: '使用能耗', control: 'number', unit: '度/年', summary: true },
    { key: '清洁能耗配置', label: '清洁能耗配置', control: 'number', unit: '度/年', summary: true },
  ],
  actions: [
    {
      label: '生成活动数据',
      formula: '全周期能耗 = (使用能耗 + 清洁能耗配置) × 产品设计寿命',
      build: (form) => {
        const annual = num(form, '使用能耗') + num(form, '清洁能耗配置')
        const life = num(form, '产品设计寿命')
        return [
          {
            name: '全周期使用能耗',
            itemType: 'energy',
            emissionType: null,
            quantity: round(annual * life),
            unit: '度',
          },
        ]
      },
    },
  ],
}

/* ---------------- 废弃与循环阶段 ---------------- */

const END_OF_LIFE_RATIO_KEYS = ['回收比例', '再生比例', '焚烧比例', '填埋比例', '堆肥比例'] as const

const END_OF_LIFE_CONFIG: StageParamConfig = {
  title: '废弃与循环阶段场景参数',
  fields: [
    { key: '废弃总重量', label: '废弃总重量', control: 'number', unit: 'kg', summary: true },
    ...END_OF_LIFE_RATIO_KEYS.map((key) => ({
      key,
      label: key,
      control: 'number' as const,
      unit: '%' as const,
    })),
  ],
  actions: [
    {
      label: '生成活动数据',
      formula: '处置量 = 废弃总重量 × 对应比例',
      validate: (form) => {
        const sum = END_OF_LIFE_RATIO_KEYS.reduce((acc, key) => acc + num(form, key), 0)
        if (Math.abs(sum - 100) > 0.001) {
          return `各项比例之和必须等于 100%（当前合计 ${round(sum)}%）`
        }
        return null
      },
      build: (form) => {
        const total = num(form, '废弃总重量')
        const defs: Array<{
          key: (typeof END_OF_LIFE_RATIO_KEYS)[number]
          name: string
          itemType: PcfDataItemType
          emissionType: PcfEmissionType | null
        }> = [
          { key: '填埋比例', name: '填埋处置量', itemType: 'emission', emissionType: 'wasteSolid' },
          { key: '焚烧比例', name: '焚烧处置量', itemType: 'emission', emissionType: 'wasteSolid' },
          { key: '堆肥比例', name: '堆肥处置量', itemType: 'emission', emissionType: 'wasteSolid' },
          { key: '回收比例', name: '回收处置量', itemType: 'material', emissionType: null },
          { key: '再生比例', name: '再生处置量', itemType: 'material', emissionType: null },
        ]
        return defs
          .filter((def) => num(form, def.key) > 0)
          .map((def) => ({
            name: def.name,
            itemType: def.itemType,
            emissionType: def.emissionType,
            quantity: round((total * num(form, def.key)) / 100),
            unit: 'kg',
          }))
      },
    },
  ],
}

/* ---------------- 默认（未匹配具体阶段） ---------------- */

const DEFAULT_CONFIG: StageParamConfig = {
  title: '阶段基础参数',
  fields: [{ key: '阶段说明', label: '阶段说明', control: 'text', summary: true }],
  actions: [],
}

/** 阶段 → 配置 key 的映射（按生命周期阶段名称关键字匹配） */
const PHASE_CONFIGS: Record<string, StageParamConfig> = {
  harvest: HARVEST_CONFIG,
  transport: TRANSPORT_CONFIG,
  use: USE_CONFIG,
  endoflife: END_OF_LIFE_CONFIG,
}

/** 由生命周期阶段名称解析所属阶段（用于动态渲染字段与折算按钮） */
export function resolveStagePhase(stageName: string): keyof typeof PHASE_CONFIGS | 'default' {
  if (stageName.includes('原材料获取') || stageName.includes('采伐')) return 'harvest'
  if (stageName.includes('运输')) return 'transport'
  if (stageName.includes('使用')) return 'use'
  if (stageName.includes('废弃') || stageName.includes('回收') || stageName.includes('循环')) return 'endoflife'
  return 'default'
}

/** 获取某阶段应展示的配置（字段 + 标题 + 折算按钮） */
export function getStageParamConfig(stageName: string): StageParamConfig {
  return PHASE_CONFIGS[resolveStagePhase(stageName)] ?? DEFAULT_CONFIG
}

/**
 * 构建折叠态摘要文本（如「出材率 80% | 集材距离 5km」）。
 * 仅取 `summary` 标记且已填值的字段，按「标签 + 值 + 单位」拼接，以「 | 」分隔。
 */
export function buildStageParamSummary(
  fields: StageParamField[],
  metadata?: Record<string, string | number> | null,
): string {
  if (!metadata) return ''
  return fields
    .filter((field) => field.summary && metadata[field.key] !== undefined && metadata[field.key] !== '')
    .map((field) => {
      const value = metadata[field.key]
      return field.unit ? `${field.label} ${value}${field.unit}` : `${field.label} ${value}`
    })
    .join(' | ')
}
