// 系统参数配置 · Mock 数据（核算规则 / 默认因子 / 报告模板 / 存储 / 消息）
// 仅用于前端原型演示，不对接真实接口；存储「测试连接」为模拟实现（T06）。
// 消息本期只做站内信：站内信配置 + 消息模板配置，铃铛消息为演示数据。

/* ===================== 基础下拉选项 ===================== */
export const INDUSTRY_OPTIONS = [
  { label: '竹木制品', value: '竹木制品' },
  { label: '人造板', value: '人造板' },
  { label: '家具制造', value: '家具制造' },
  { label: '造纸和纸制品', value: '造纸和纸制品' },
]

export const STANDARD_OPTIONS = [
  { label: 'GB/T 24067-2024 温室气体 产品碳足迹 量化要求和指南', value: 'GB/T 24067-2024' },
  { label: 'ISO 14067:2018 温室气体 产品碳足迹 量化要求和指南', value: 'ISO 14067:2018' },
  { label: 'PAS 2050:2011 商品和服务在生命周期内的温室气体排放评价规范', value: 'PAS 2050:2011' },
  { label: 'GB/T 44905-2024 产品碳足迹 产品种类规则编制指南', value: 'GB/T 44905-2024' },
  { label: 'ISO 14064-1:2018 温室气体 第一部分 组织层级核算', value: 'ISO 14064-1:2018' },
  { label: 'Q/ZM 001-2025 竹木制品碳足迹核算规范（企业标准）', value: 'Q/ZM 001-2025' },
]

export const STANDARD_STATUS_OPTIONS = [
  { label: '现行', value: '现行' },
  { label: '被替代', value: '被替代' },
  { label: '作废', value: '作废' },
]

export const CALC_RULE_STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '已启用', value: 'enabled' },
  { label: '已停用', value: 'disabled' },
]

export const DEFAULT_FACTOR_STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '已启用', value: 'enabled' },
  { label: '已停用', value: 'disabled' },
  { label: '已失效', value: 'expired' },
]

export const LIFECYCLE_OPTIONS = [
  { label: '原料获取', value: '原料获取' },
  { label: '生产阶段', value: '生产阶段' },
  { label: '运输', value: '运输' },
  { label: '生命末期', value: '生命末期' },
]

export const OBJECT_TYPE_OPTIONS = [
  { label: '物料', value: '物料' },
  { label: '能源', value: '能源' },
]

// 对象取值源：按对象类型从对应库（物料库 / 能源库）取数
export const OBJECT_OPTIONS: Record<string, { label: string; value: string }[]> = {
  物料: [
    { label: '原竹（竹材）', value: '原竹' },
    { label: '竹集成材', value: '竹集成材' },
    { label: '竹刨花板', value: '竹刨花板' },
  ],
  能源: [
    { label: '电力（华东电网）', value: '电力' },
    { label: '蒸汽（工业）', value: '蒸汽' },
    { label: '柴油', value: '柴油' },
  ],
}

/** 分配方法 */
export const ALLOC_METHOD_OPTIONS = [
  { label: '质量（按重量分摊）', value: '质量' },
  { label: '数量（按数量分摊）', value: '数量' },
  { label: '经济价值（按产值分摊）', value: '经济价值' },
]

export const REGION_OPTIONS = [
  { label: '全国', value: '' },
  { label: '浙江', value: '浙江' },
  { label: '福建', value: '福建' },
  { label: '江西', value: '江西' },
]

export const YEAR_OPTIONS = [
  { label: '不限', value: '' },
  { label: '2023', value: '2023' },
  { label: '2024', value: '2024' },
  { label: '2025', value: '2025' },
]

export const FACTOR_LIB_OPTIONS = [
  { label: '中国生命周期基础数据库 CLCD V2.0', value: 'CLCD V2.0' },
  { label: 'Ecoinvent 3.9.1', value: 'Ecoinvent 3.9.1' },
]

/** 可选目标因子：factorValue 为演示用因子数值（只读派生，随因子带入） */
export const FACTOR_OPTIONS = [
  { label: '原竹（华东） V3', value: '原竹（华东） V3', factorValue: '0.5703', unit: 'kgCO₂e/kg', lib: 'CLCD V2.0' },
  { label: '华东电网 2024', value: '华东电网 2024', factorValue: '0.5703', unit: 'kgCO₂e/kWh', lib: 'CLCD V2.0' },
  { label: '工业蒸汽平均', value: '工业蒸汽平均', factorValue: '0.1100', unit: 'kgCO₂e/MJ', lib: 'CLCD V2.0' },
  { label: '重型柴油货车', value: '重型柴油货车', factorValue: '0.0850', unit: 'kgCO₂e/t·km', lib: 'CLCD V2.0' },
  { label: '制冷剂 R134a', value: '制冷剂 R134a', factorValue: '1430', unit: 'kgCO₂e/kg', lib: 'Ecoinvent 3.9.1' },
  { label: '竹材（福建） V2', value: '竹材（福建） V2', factorValue: '0.4210', unit: 'kgCO₂e/kg', lib: 'CLCD V2.0' },
]

/* ===================== 1. 核算规则 ===================== */
export interface ChangeLog {
  id: string
  time: string
  operator: string
  field: string
  before: string
  after: string
  reason: string
}

export interface CalcRule {
  id: string
  ruleName: string
  standardNo: string
  standardName: string
  standardStatus: '现行' | '被替代' | '作废'
  applicableIndustry: string[]
  status: 'draft' | 'enabled' | 'disabled'
  remark: string
  updatedAt: string
  allowExclude: 'yes' | 'no'
  singleThreshold: number | null
  cumulativeThreshold: number | null
  excludeRemark: string
  /** 可忽略排放项（文本录入） */
  ignoreRule: string
  /** 是否允许共生产品分配（no 时无需配置分配规则） */
  allowAllocate: 'yes' | 'no'
  /** 分配方法 */
  allocDefault: string
  /** 分配规则说明 */
  allocRuleDesc: string
  changeLogs: ChangeLog[]
}

export const CALC_RULES: CalcRule[] = [
  {
    id: 'RULE-20261027001',
    ruleName: 'GB/T 24067-2024 核算规则',
    standardNo: 'GB/T 24067-2024',
    standardName: '温室气体 产品碳足迹 量化要求和指南',
    standardStatus: '现行',
    applicableIndustry: ['竹制品制造', '木质家具制造'],
    status: 'enabled',
    remark: '按现行国标口径维护',
    updatedAt: '2026-10-27 10:12',
    allowExclude: 'yes',
    singleThreshold: 1,
    cumulativeThreshold: 5,
    excludeRemark: '单个环节影响小于阈值时可忽略，须在报告中说明。',
    ignoreRule: '废弃与循环阶段仅作提示，不纳入核算；包装质量占比低于取舍阈值，完全忽略。',
    allowAllocate: 'yes',
    allocDefault: '质量',
    allocRuleDesc: '共生产品优先按质量分配；无法按物理关系分配时按经济价值分配，并在报告中说明依据条款。',
    changeLogs: [
      { id: 'c1', time: '2026-10-20 09:30', operator: '张工', field: '单环节阈值', before: '2', after: '1', reason: '与最新国标对齐' },
      { id: 'c2', time: '2026-09-12 14:10', operator: '李工', field: '分配方法', before: '数量', after: '质量', reason: '与企业实际计量方式一致' },
    ],
  },
  {
    id: 'RULE-20261027002',
    ruleName: 'ISO 14067:2018 核算规则（草稿）',
    standardNo: 'ISO 14067:2018',
    standardName: '温室气体 产品碳足迹 量化要求和指南', standardStatus: '现行',
    applicableIndustry: [],
    status: 'draft',
    remark: '',
    updatedAt: '2026-10-26 17:40',
    allowExclude: 'yes',
    singleThreshold: 1, cumulativeThreshold: 5,
    excludeRemark: '',
    ignoreRule: '',
    allowAllocate: 'yes',
    allocDefault: '质量', allocRuleDesc: '',
    changeLogs: [],
  },
  {
    id: 'RULE-20261026001',
    ruleName: 'PAS 2050:2011 核算规则',
    standardNo: 'PAS 2050:2011', standardName: '商品和服务在生命周期内的温室气体排放评价规范', standardStatus: '现行',
    applicableIndustry: [],
    status: 'enabled', remark: '', updatedAt: '2026-10-25 11:00',
    allowExclude: 'no', singleThreshold: null, cumulativeThreshold: null, excludeRemark: '',
    ignoreRule: '本标准不允许舍弃，可忽略排放项不适用。',
    allowAllocate: 'no',
    allocDefault: '经济价值', allocRuleDesc: '共生产品不单独分配，全部排放归属主产品。',
    changeLogs: [],
  },
  {
    id: 'RULE-20261025001',
    ruleName: 'GB/T 44905-2024 核算规则',
    standardNo: 'GB/T 44905-2024', standardName: '产品碳足迹 产品种类规则编制指南', standardStatus: '被替代',
    applicableIndustry: [], status: 'disabled', remark: '标准已被新版替代，请确认是否继续使用', updatedAt: '2026-10-24 16:20',
    allowExclude: 'yes', singleThreshold: 1, cumulativeThreshold: 5, excludeRemark: '',
    ignoreRule: '包装材料质量占比低于 1% 时可忽略，须在报告中说明。',
    allowAllocate: 'yes',
    allocDefault: '质量', allocRuleDesc: '',
    changeLogs: [],
  },
  {
    id: 'RULE-20261024001',
    ruleName: 'Q/ZM 001-2025 企业核算规则',
    standardNo: 'Q/ZM 001-2025', standardName: '竹木制品碳足迹核算规范', standardStatus: '现行',
    applicableIndustry: [], status: 'enabled', remark: '企业标准，全行业适用；共生产品不单独分配', updatedAt: '2026-10-23 09:00',
    allowExclude: 'yes', singleThreshold: 2, cumulativeThreshold: 8, excludeRemark: '',
    ignoreRule: '',
    allowAllocate: 'no',
    allocDefault: '质量', allocRuleDesc: '企业标准不允许共生产品分配。',
    changeLogs: [],
  },
  {
    id: 'RULE-20261023001',
    ruleName: 'ISO 14064-1:2018 组织核算规则（草稿）',
    standardNo: 'ISO 14064-1:2018', standardName: '温室气体 第一部分 组织层级核算', standardStatus: '现行',
    applicableIndustry: [], status: 'draft', remark: '', updatedAt: '2026-10-22 15:30',
    allowExclude: 'yes', singleThreshold: 1, cumulativeThreshold: 5, excludeRemark: '',
    ignoreRule: '',
    allowAllocate: 'yes',
    allocDefault: '经济价值', allocRuleDesc: '',
    changeLogs: [],
  },
]

/**
 * 由核算规则生成取舍规则文本（用于「取舍规则」多行文本框回显，可编辑）。
 * 与 PCF 步骤①口径一致：允许舍弃时给出单环节阈值 / 累计阈值。
 */
export function cutOffRuleTextOf(rule: CalcRule): string {
  if (rule.allowExclude === 'no') return '本标准不允许舍弃。'
  const parts = [
    `单个环节影响 < ${rule.singleThreshold ?? '-'}%；所有舍弃环节累计 < ${rule.cumulativeThreshold ?? '-'}%。`,
  ]
  if (rule.excludeRemark) parts.push(rule.excludeRemark)
  return parts.join('')
}

/** 生成摘要文案（用于表单「摘要预览」） */
export function buildRuleSummary(rule: CalcRule): string {
  const excludeText =
    rule.allowExclude === 'no'
      ? '本标准不允许舍弃。'
      : `舍弃单个环节影响 < ${rule.singleThreshold}%；所有舍弃环节累计 < ${rule.cumulativeThreshold}%。`
  return [
    `【取舍准则】${excludeText}`,
    `【可忽略排放项】${rule.ignoreRule || '—'}`,
    rule.allowAllocate === 'no'
      ? '【分配】不允许分配，无需配置分配规则。'
      : `【分配】分配方法：${rule.allocDefault}；说明：${rule.allocRuleDesc || '—'}`,
  ].join('\n')
}

/* ===================== 2. 默认因子 ===================== */
/**
 * 全部规则均为平台级（作用于整个平台），不设租户级、不设平台锁定；
 * 命中时只按「匹配键精确度 + 优先级」选取，停用 / 失效规则不参与预选。
 */
export interface DefaultFactor {
  id: string
  industry: string
  lifecycle: string // 生命周期阶段（空=不限）
  objectType: string
  objectCode: string
  objectName: string
  region: string // 区域（空=全国）
  year: string
  factorName: string
  factorLib: string
  factorVersion: string
  factorValue: string // 因子数值（只读派生，随因子带入，列表展示用）
  factorUnit: string
  priority: number // 命中优先级，数值越小优先级越高
  status: 'enabled' | 'disabled' | 'expired'
  remark?: string
  updatedAt: string
}

/** 拼接匹配键文本（匹配键仍用于规则唯一性与命中判定；列表已改为「类型 / 排放数据」分列展示） */
export function matchKeyText(f: DefaultFactor): string {
  const parts = [
    f.industry || '全行业',
    f.lifecycle || '全阶段',
    `${f.objectType}/${f.objectName || f.objectCode}`,
    f.region || '全国',
    f.year || '不限年度',
  ]
  return parts.join(' · ')
}

export const DEFAULT_FACTORS: DefaultFactor[] = [
  { id: 'DF001', industry: '竹木制品', lifecycle: '原料获取', objectType: '物料', objectCode: '原竹', objectName: '原竹（竹材）', region: '浙江', year: '2024', factorName: '原竹（华东） V3', factorLib: 'CLCD V2.0', factorVersion: 'V3', factorValue: '0.5703', factorUnit: 'kgCO₂e/kg', priority: 10, status: 'enabled', updatedAt: '2026-10-27 09:00' },
  { id: 'DF002', industry: '', lifecycle: '生产阶段', objectType: '能源', objectCode: '电力', objectName: '电力（华东电网）', region: '', year: '2024', factorName: '华东电网 2024', factorLib: 'CLCD V2.0', factorVersion: '2024', factorValue: '0.5703', factorUnit: 'kgCO₂e/kWh', priority: 20, status: 'disabled', updatedAt: '2026-10-21 13:20' },
  { id: 'DF003', industry: '', lifecycle: '原料获取', objectType: '物料', objectCode: '竹集成材', objectName: '竹集成材', region: '福建', year: '2024', factorName: '竹材（福建） V2', factorLib: 'CLCD V2.0', factorVersion: 'V2', factorValue: '0.4210', factorUnit: 'kgCO₂e/kg', priority: 10, status: 'enabled', updatedAt: '2026-10-20 10:00' },
  { id: 'DF004', industry: '', lifecycle: '运输', objectType: '能源', objectCode: '柴油', objectName: '柴油', region: '', year: '2024', factorName: '华东电网 2024', factorLib: 'CLCD V2.0', factorVersion: '2024', factorValue: '0.5703', factorUnit: 'kgCO₂e/kWh', priority: 30, status: 'disabled', updatedAt: '2026-10-19 16:00' },
  { id: 'DF005', industry: '', lifecycle: '原料获取', objectType: '物料', objectCode: '竹刨花板', objectName: '竹刨花板', region: '江西', year: '2024', factorName: '竹材（福建） V2', factorLib: 'CLCD V2.0', factorVersion: 'V2', factorValue: '0.4210', factorUnit: 'kgCO₂e/kg', priority: 10, status: 'enabled', updatedAt: '2026-10-18 11:30' },
  { id: 'DF006', industry: '竹木制品', lifecycle: '原料获取', objectType: '物料', objectCode: '竹材', objectName: '竹材（福建）', region: '福建', year: '2023', factorName: '竹材（福建） V2', factorLib: 'CLCD V2.0', factorVersion: 'V2', factorValue: '0.4210', factorUnit: 'kgCO₂e/kg', priority: 5, status: 'enabled', updatedAt: '2026-10-17 09:40' },
  { id: 'DF007', industry: '', lifecycle: '生产阶段', objectType: '能源', objectCode: '蒸汽', objectName: '工业蒸汽', region: '', year: '', factorName: '工业蒸汽平均', factorLib: 'CLCD V2.0', factorVersion: 'V1', factorValue: '0.1100', factorUnit: 'kgCO₂e/MJ', priority: 20, status: 'enabled', updatedAt: '2026-10-16 14:00' },
  { id: 'DF008', industry: '家具制造', lifecycle: '原料获取', objectType: '物料', objectCode: '原竹', objectName: '原竹（竹材）', region: '', year: '2024', factorName: '原竹（华东） V3', factorLib: 'CLCD V2.0', factorVersion: 'V3', factorValue: '0.5703', factorUnit: 'kgCO₂e/kg', priority: 15, status: 'expired', updatedAt: '2026-09-30 10:00', remark: '引用的因子「原竹（华东） V3」已升级为 V4' },
]

// 默认因子只维护「匹配键 → 因子引用」与启用状态；命中逻辑在业务端按匹配键精确度与优先级直接选取。

/* ===================== 3. 报告模板 ===================== */
/**
 * 取值字段：由研发线下整理报告模板、打好标签并内置系统，系统只读。
 * 生成报告时按 code 从对应业务来源（产品档案 / 企业信息 / 核算配置 / 核算结果 / 系统生成）
 * 自动取值填充；模板维护方仅可编辑「固定文字」，不可修改取值字段与系统装配。
 */
export interface TemplateField {
  id: string
  code: string // 标签编码（研发打标签），如 PRODUCT_NAME
  label: string // 取值字段名称，如 产品名称
  source: string // 取值来源说明
}

/** 章节内容块：固定文字（可编辑） | 取值字段（研发标签，锁定） | 系统装配（自动生成，锁定） */
export type ReportBlock =
  | { kind: 'text'; id: string; content: string }
  | { kind: 'field'; id: string; fieldId: string }
  | { kind: 'system'; id: string; label: string }

export interface ReportSection {
  id: string
  code: string
  title: string
  locked: boolean // 必需章节，不可隐藏
  visible: boolean
  /** 章节类型：系统装配（自动生成）/ 可编辑文案（可改固定文字）/ 固定文案（只读） */
  type?: '系统装配' | '可编辑文案' | '固定文案'
  /** 可编辑文案内容（type = 可编辑文案 时使用，替代 blocks 的固定文字） */
  fixedText?: string
  blocks: ReportBlock[]
}

export interface ReportTemplate {
  id: string
  templateNo: string
  name: string
  /** 模板类型：原型原设计为 碳足迹报告 / 碳标签报告 */
  templateType: '碳足迹报告' | '碳标签报告'
  industry: string // 适用行业
  boundary: '全部' | '摇篮到大门' | '大门到大门' | '摇篮到坟墓'
  standardNo: string
  standardName: string
  /** 数据来源：系统预置（只读）/ 自定义（复制后生成） */
  source: '系统预置' | '自定义'
  sourceTemplateId?: string
  /** 是否启用：原型原设计为 启用 / 停用 两态 */
  status: 'enabled' | 'disabled'
  version: number
  fields: TemplateField[] // 取值字段清单（研发标签，只读）
  sections: ReportSection[]
  remark?: string
  updatedAt: string
}

const ZBAO_FIELDS: TemplateField[] = [
  { id: 'f1', code: 'PRODUCT_NAME', label: '产品名称', source: '产品档案 / 基础信息' },
  { id: 'f2', code: 'PRODUCT_SPEC', label: '产品规格型号', source: '产品档案 / 基础信息' },
  { id: 'f3', code: 'PRODUCER', label: '生产者名称', source: '企业信息' },
  { id: 'f4', code: 'STANDARD', label: '采用标准', source: '核算配置' },
  { id: 'f5', code: 'BOUNDARY', label: '系统边界', source: '核算配置' },
  { id: 'f6', code: 'FUNCTIONAL_UNIT', label: '声明单位', source: '核算配置' },
  { id: 'f7', code: 'UNIT_EMISSION', label: '单位产品碳足迹', source: '核算结果' },
  { id: 'f8', code: 'TOTAL_EMISSION', label: '合计碳排放', source: '核算结果' },
  { id: 'f9', code: 'REPORT_NO', label: '报告编号', source: '系统生成' },
]

const ZBAO_SECTIONS: ReportSection[] = [
  {
    id: 's1', code: 'SEC-INTRO', title: '产品概述', locked: false, visible: true,
    blocks: [
      { kind: 'text', id: 'b1', content: '本报告依据' },
      { kind: 'field', id: 'b2', fieldId: 'f4' },
      { kind: 'text', id: 'b3', content: '，对' },
      { kind: 'field', id: 'b4', fieldId: 'f1' },
      { kind: 'text', id: 'b5', content: '（规格：' },
      { kind: 'field', id: 'b6', fieldId: 'f2' },
      { kind: 'text', id: 'b7', content: '）开展产品碳足迹核算，生产者为' },
      { kind: 'field', id: 'b8', fieldId: 'f3' },
      { kind: 'text', id: 'b9', content: '。' },
    ],
  },
  {
    id: 's2', code: 'SEC-SCOPE', title: '目标与范围', locked: false, visible: true,
    blocks: [
      { kind: 'text', id: 'b10', content: '功能单位：' },
      { kind: 'field', id: 'b11', fieldId: 'f6' },
      { kind: 'text', id: 'b12', content: '；系统边界：' },
      { kind: 'field', id: 'b13', fieldId: 'f5' },
      { kind: 'text', id: 'b14', content: '。' },
    ],
  },
  {
    id: 's3', code: 'SEC-RESULT', title: '核算结果', locked: true, visible: true,
    blocks: [{ kind: 'system', id: 'b15', label: '核算结果汇总（清单分析表 / 阶段分布 / 单位碳足迹）' }],
  },
  {
    id: 's4', code: 'SEC-CONCLUSION', title: '结论与建议', locked: true, visible: true,
    blocks: [{ kind: 'system', id: 'b16', label: '结论与建议（基于核算结果自动生成）' }],
  },
  {
    id: 's5', code: 'SEC-METHOD', title: '核算方法声明', locked: false, visible: true,
    blocks: [
      { kind: 'text', id: 'b17', content: '本报告采用因子法，具体排放因子来源见附录；单位产品碳足迹为' },
      { kind: 'field', id: 'b18', fieldId: 'f7' },
      { kind: 'text', id: 'b19', content: '（合计' },
      { kind: 'field', id: 'b20', fieldId: 'f8' },
      { kind: 'text', id: 'b21', content: '）。' },
    ],
  },
  {
    id: 's6', code: 'SEC-DISCLAIMER', title: '免责声明', locked: false, visible: true,
    blocks: [{ kind: 'text', id: 'b22', content: '本报告仅用于内部碳管理，不作为对外合规声明。' }],
  },
  {
    id: 's7', code: 'SEC-APPENDIX', title: '附录', locked: false, visible: true,
    blocks: [{ kind: 'text', id: 'b23', content: '附录 A：排放因子清单。' }],
  },
]

/** 深拷贝章节（含内容块），用于「复制为新模板」 */
const cloneSections = (src: ReportSection[], suffix: string): ReportSection[] =>
  src.map((s) => ({ ...s, id: s.id + suffix, blocks: s.blocks.map((b) => ({ ...b, id: b.id + suffix })) }))

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'RPT-PCF-ZB13002-001', templateNo: 'RPT-PCF-ZB13002-001', name: '整竹砧板 V1', templateType: '碳足迹报告', industry: '竹木制品', boundary: '摇篮到大门', standardNo: '', standardName: '不限标准',
    source: '系统预置', status: 'enabled', version: 1, fields: ZBAO_FIELDS, sections: ZBAO_SECTIONS,
    remark: '研发线下整理并内置，取值字段与系统装配只读。', updatedAt: '2026-10-10 09:00',
  },
  {
    id: 'RPT-20261027-002', templateNo: 'RPT-20261027-002', name: '竹制品通用 V2', templateType: '碳足迹报告', industry: '竹木制品', boundary: '全部', standardNo: 'GB/T 24067-2024', standardName: '温室气体 产品碳足迹 量化要求和指南',
    source: '自定义', sourceTemplateId: 'RPT-PCF-ZB13002-001', status: 'enabled', version: 2, fields: ZBAO_FIELDS.map((f) => ({ ...f })), sections: cloneSections(ZBAO_SECTIONS, '-2'), updatedAt: '2026-10-27 09:30',
  },
  {
    id: 'RPT-20261026-003', templateNo: 'RPT-20261026-003', name: '大门到大门模板', templateType: '碳足迹报告', industry: '竹木制品', boundary: '大门到大门', standardNo: '', standardName: '不限标准',
    source: '自定义', sourceTemplateId: 'RPT-PCF-ZB13002-001', status: 'enabled', version: 1, fields: ZBAO_FIELDS.map((f) => ({ ...f })), sections: cloneSections(ZBAO_SECTIONS, '-3'), updatedAt: '2026-10-26 15:00',
  },
  {
    id: 'RPT-20261025-004', templateNo: 'RPT-20261025-004', name: '旧版模板', templateType: '碳足迹报告', industry: '竹木制品', boundary: '摇篮到坟墓', standardNo: '', standardName: '不限标准',
    source: '自定义', sourceTemplateId: 'RPT-PCF-ZB13002-001', status: 'disabled', version: 1, fields: ZBAO_FIELDS.map((f) => ({ ...f })), sections: cloneSections(ZBAO_SECTIONS, '-4'), updatedAt: '2026-10-25 10:00',
  },
  {
    id: 'RPT-20261024-005', templateNo: 'RPT-20261024-005', name: '碳标签报告 V1', templateType: '碳标签报告', industry: '竹木制品', boundary: '摇篮到大门', standardNo: '', standardName: '不限标准',
    source: '自定义', sourceTemplateId: 'RPT-PCF-ZB13002-001', status: 'enabled', version: 1, fields: ZBAO_FIELDS.map((f) => ({ ...f })), sections: cloneSections(ZBAO_SECTIONS, '-5'), updatedAt: '2026-10-24 11:20',
  },
]

/* ===================== 4. 存储配置（单例） ===================== */
export interface StorageConfig {
  storageType: 'local' | 'object'
  endpoint: string
  bucket: string
  region: string
  domain: string
  pathPrefix: string
  accessKeyId: string
  secretMasked: boolean
  maxFileMb: number
  allowedFormats: string[]
  maxImagePx: number
  capacityGb: number
  maxAttachments: number
  overLimitStrategy: '告警' | '禁止上传'
  retentionDays: number
  recycleDays: number
  keepReportsForever: boolean
  verifyStatus: '未验证' | '已验证'
  lastVerifyAt: string
  lastVerifyMessage: string
}
export interface StorageUsage {
  tenant: string
  usedGb: number
  files: number
  attachments: number
}

export const STORAGE_CONFIG: StorageConfig = {
  storageType: 'local',
  endpoint: 'https://oss.example.com',
  bucket: 'pcf-demo',
  region: 'cn-hangzhou',
  domain: 'https://cdn.example.com',
  pathPrefix: 'attachments/',
  accessKeyId: 'LTAI5t**********',
  secretMasked: true,
  maxFileMb: 50,
  allowedFormats: ['pdf', 'jpg', 'png', 'xlsx'],
  maxImagePx: 2048,
  capacityGb: 100,
  maxAttachments: 10000,
  overLimitStrategy: '告警',
  retentionDays: 365,
  recycleDays: 30,
  keepReportsForever: true,
  verifyStatus: '已验证',
  lastVerifyAt: '2026-10-27 10:20',
  lastVerifyMessage: '连接成功（模拟）',
}

export const STORAGE_USAGE: StorageUsage[] = [
  { tenant: '示例竹业', usedGb: 32.6, files: 1284, attachments: 1102 },
  { tenant: '演示家居', usedGb: 92.0, files: 2210, attachments: 1900 },
  { tenant: '绿源板材', usedGb: 18.4, files: 540, attachments: 460 },
  { tenant: '森工集团', usedGb: 8.7, files: 320, attachments: 280 },
  { tenant: '青木家具', usedGb: 12.1, files: 410, attachments: 360 },
  { tenant: '南竹科技', usedGb: 5.3, files: 180, attachments: 150 },
]

/** 模拟测试连接：Endpoint 含 invalid 判失败，其余返回成功（T06） */
export function testStorageConnection(cfg: StorageConfig): { ok: boolean; message: string } {
  if (cfg.storageType !== 'object') return { ok: true, message: '本地存储无需连接，直接可用（模拟）' }
  if (!cfg.endpoint || !cfg.bucket) return { ok: false, message: '服务地址或 Bucket 不能为空' }
  if (cfg.endpoint.toLowerCase().includes('invalid')) return { ok: false, message: '连接超时：无法解析 Endpoint（模拟）' }
  return { ok: true, message: '连接成功（模拟）' }
}

/* ===================== 5. 消息配置（简化：站内信配置 + 消息模板配置） ===================== */
// 本期消息只做站内信：不设事件订阅矩阵、邮件 / 短信通道、频控 / 免打扰、发送记录与重试。
export interface MsgInappConfig {
  /** 是否启用站内信；关闭后不再产生新消息，已有消息保留 */
  enabled: boolean
  /** 消息保留天数，0 = 永久保留 */
  retentionDays: number
  updatedAt: string
}

/** 内置事件的一条站内信模板；事件清单系统内置，不可增删 */
export interface MsgTemplate {
  id: string
  eventCode: string
  eventName: string
  title: string
  body: string
  status: 'enabled' | 'disabled'
  updatedAt: string
}

/** 顶栏铃铛的站内信演示数据（只读展示，不属于配置对象） */
export interface SiteMessage {
  id: string
  eventName: string
  title: string
  receiver: string
  time: string
  readAt: string
}

export const MSG_INAPP_CONFIG: MsgInappConfig = {
  enabled: true,
  retentionDays: 30,
  updatedAt: '2026-11-10 09:00',
}

/** 7 个内置事件各 1 条站内信模板 */
export const MSG_TEMPLATES: MsgTemplate[] = [
  { id: 'MT1', eventCode: 'CALC_DONE', eventName: '核算完成', title: '核算完成通知', body: '您负责的《{产品名称}》（{项目编号}）已完成核算，请查看结果。', status: 'enabled', updatedAt: '2026-11-10 09:00' },
  { id: 'MT2', eventCode: 'CALC_FAILED', eventName: '核算失败', title: '核算失败通知', body: '项目 {项目编号} 的核算未完成，请检查数据后重试。', status: 'enabled', updatedAt: '2026-11-10 09:00' },
  { id: 'MT3', eventCode: 'CHECK_BLOCKED', eventName: '检测存在阻断项', title: '数据检测阻断提醒', body: '项目 {项目编号} 存在阻断项，请处理后继续核算。', status: 'enabled', updatedAt: '2026-11-10 09:00' },
  { id: 'MT4', eventCode: 'REPORT_GENERATED', eventName: '报告生成完成', title: '报告生成通知', body: '{产品名称} 的报告《{报告链接}》已生成。', status: 'enabled', updatedAt: '2026-11-10 09:00' },
  { id: 'MT5', eventCode: 'SHARED_DATA_UPDATED', eventName: '共享数据集更新', title: '共享数据更新提醒', body: '{租户名称} 的共享数据集已更新，请确认是否同步到项目 {项目编号}。', status: 'enabled', updatedAt: '2026-11-10 09:00' },
  { id: 'MT6', eventCode: 'MEMBER_CHANGED', eventName: '成员 / 角色变更', title: '成员变更通知', body: '{租户名称} 的成员或角色发生变更，请确认权限。', status: 'disabled', updatedAt: '2026-11-10 09:00' },
  { id: 'MT7', eventCode: 'QUOTA_WARNING', eventName: '存储配额预警', title: '存储配额预警', body: '{租户名称} 的存储用量已达 {用量}，请及时清理或扩容。', status: 'enabled', updatedAt: '2026-11-10 09:00' },
]

/** 顶栏铃铛演示数据：含未读 / 已读两态 */
export const SITE_MESSAGES: SiteMessage[] = [
  { id: 'SM1', eventName: '核算完成', title: '核算完成通知', receiver: '王明', time: '2026-11-10 09:12', readAt: '未读' },
  { id: 'SM2', eventName: '报告生成完成', title: '报告生成通知', receiver: '李静', time: '2026-11-10 08:40', readAt: '未读' },
  { id: 'SM3', eventName: '存储配额预警', title: '存储配额预警', receiver: '组织管理员', time: '2026-11-09 18:05', readAt: '未读' },
  { id: 'SM4', eventName: '数据检测阻断', title: '数据检测阻断提醒', receiver: '赵伟', time: '2026-11-09 16:18', readAt: '2026-11-09 16:30' },
  { id: 'SM5', eventName: '共享数据集更新', title: '共享数据更新提醒', receiver: '组织管理员', time: '2026-11-09 15:02', readAt: '2026-11-09 15:30' },
  { id: 'SM6', eventName: '核算完成', title: '核算完成通知', receiver: '陈芳', time: '2026-11-08 11:45', readAt: '2026-11-08 12:00' },
]

export const MSG_TEMPLATE_VARS = ['{产品名称}', '{项目编号}', '{报告链接}', '{租户名称}', '{用量}']

/** 模板预览用的变量示例值 */
export const MSG_TEMPLATE_VAR_SAMPLES: Record<string, string> = {
  '{产品名称}': '整竹砧板',
  '{项目编号}': 'P-2026-0001',
  '{报告链接}': '《整竹砧板碳足迹报告》',
  '{租户名称}': '示例竹业',
  '{用量}': '250 kgCO₂e',
}

/** 本地时间文本（YYYY-MM-DD HH:mm），用于保存后的更新时间 */
const nowText = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/* ===================== 异步读取（模拟接口） ===================== */
const delay = <T>(data: T): Promise<T> => Promise.resolve(data)

export const fetchCalcRules = () => delay(CALC_RULES.map((r) => ({ ...r })))
export const fetchDefaultFactors = () => delay(DEFAULT_FACTORS.map((f) => ({ ...f })))

/** 深拷贝报告模板（含取值字段与章节内容块），避免页面直接改到配置源 */
function cloneReportTemplate(t: ReportTemplate): ReportTemplate {
  return {
    ...t,
    fields: t.fields.map((f) => ({ ...f })),
    sections: t.sections.map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b })) })),
  }
}

/** 报告模板列表（系统管理后台） */
export const fetchReportTemplates = () => delay(REPORT_TEMPLATES.map(cloneReportTemplate))

/**
 * 报告模板是前后台共享的配置源：后台「系统参数配置 → 报告模板」新增 / 编辑 / 启停 / 删除后，
 * 业务前台「报告编制 → 新增报告」的下拉选项立即取到最新配置。
 * 业务前台下拉仅取状态为「启用」的模板（停用后不再用于新生成的报告）。
 */
export function getEnabledReportTemplates(): ReportTemplate[] {
  return REPORT_TEMPLATES.filter((t) => t.status === 'enabled').map(cloneReportTemplate)
}

/** 按 id 读取模板配置（生成报告时锁定所选模板的名称与版本） */
export function getReportTemplateById(id: string): ReportTemplate | undefined {
  const found = REPORT_TEMPLATES.find((t) => t.id === id)
  return found ? cloneReportTemplate(found) : undefined
}

/** 后台新增（复制）/ 编辑保存：写回同一份配置源 */
export function saveReportTemplate(tpl: ReportTemplate): Promise<ReportTemplate> {
  const next = { ...cloneReportTemplate(tpl), updatedAt: nowText() }
  const idx = REPORT_TEMPLATES.findIndex((t) => t.id === tpl.id)
  if (idx < 0) REPORT_TEMPLATES.unshift(next)
  else REPORT_TEMPLATES[idx] = next
  return delay(cloneReportTemplate(next))
}

/** 后台行操作：启用 / 停用 */
export function setReportTemplateStatus(id: string, status: ReportTemplate['status']): Promise<ReportTemplate | undefined> {
  const tpl = REPORT_TEMPLATES.find((t) => t.id === id)
  if (!tpl) return delay(undefined)
  tpl.status = status
  tpl.updatedAt = nowText()
  return delay(cloneReportTemplate(tpl))
}

/** 后台行操作：删除（系统预置模板不可删除） */
export function removeReportTemplate(id: string): Promise<boolean> {
  const idx = REPORT_TEMPLATES.findIndex((t) => t.id === id)
  if (idx < 0 || REPORT_TEMPLATES[idx].source === '系统预置') return delay(false)
  REPORT_TEMPLATES.splice(idx, 1)
  return delay(true)
}
export const fetchStorageConfig = () => delay({ ...STORAGE_CONFIG })
export const fetchStorageUsage = () => delay(STORAGE_USAGE.map((u) => ({ ...u })))
export const fetchMsgInappConfig = () => delay({ ...MSG_INAPP_CONFIG })
export const fetchMsgTemplates = () => delay(MSG_TEMPLATES.map((t) => ({ ...t })))
export const fetchSiteMessages = () => delay(SITE_MESSAGES.map((m) => ({ ...m })))
export const saveMsgInappConfig = (cfg: MsgInappConfig) => {
  Object.assign(MSG_INAPP_CONFIG, cfg, { updatedAt: nowText() })
  return delay({ ...MSG_INAPP_CONFIG })
}
export const saveMsgTemplate = (tpl: MsgTemplate) => {
  const idx = MSG_TEMPLATES.findIndex((t) => t.id === tpl.id)
  if (idx < 0) throw new Error('模板不存在')
  MSG_TEMPLATES[idx] = { ...tpl, updatedAt: nowText() }
  return delay({ ...MSG_TEMPLATES[idx] })
}
