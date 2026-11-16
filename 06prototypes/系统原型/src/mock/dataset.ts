import type { Boundary, CarbonRecord, RecordSource, RecordStageValue, RecordStatus } from '@/types/dataset'
import { buildStages } from './baselines'

/**
 * 行业数据集（台账）Mock 服务。
 * 一行 = 一次核算结果；核算完成自动入账（原型用种子数据模拟），支持手工补录 / 作废 / 恢复 / 补填区域。
 * 字段口径见《行业数据集字段清单》；数值快照、重算替代（D03/D06）由种子数据直接呈现。
 */

const ORG_ID = '福建竹业集团'

/* ============================ 工具 ============================ */

const delay = (ms = 220) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function pad(value: number, len = 2): string {
  return String(value).padStart(len, '0')
}

function nowText(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** 由总值 + 各阶段值生成台账阶段子表（占比派生；一级为必填口径） */
function makeStages(
  boundary: Boundary,
  values: Record<string, number>,
): RecordStageValue[] {
  const total = Object.values(values).reduce((sum, v) => sum + v, 0)
  return buildStages(boundary).map((stage) => {
    const emission = values[stage.stageCode] ?? 0
    return {
      stageCode: stage.stageCode,
      stageName: stage.stageName,
      stageLevel: stage.stageLevel,
      parentStageCode: stage.parentStageCode,
      stageEmission: emission,
      stageShare: total > 0 ? Math.round((emission / total) * 1000) / 10 : 0,
    }
  })
}

/** 阶段覆盖标记（ST3：一级阶段全有值 = full；部分 = partial；全无 = missing） */
export function stageCompleteOf(record: CarbonRecord): 'full' | 'partial' | 'missing' {
  const first = record.stageValues.filter((s) => s.stageLevel === 1)
  if (first.length === 0) return 'missing'
  const filled = first.filter((s) => s.stageEmission > 0)
  if (filled.length === 0) return 'missing'
  return filled.length === first.length ? 'full' : 'partial'
}

/* ============================ 种子数据 ============================ */

interface SeedSpec {
  name: string
  code: string
  category: [string, string, string]
  industry: [string, string, string]
  region: string
  boundary: Boundary
  period: [string, string]
  unitCode: string
  total: number
  stages: Record<string, number>
  source?: RecordSource
  status?: RecordStatus
  resultVersion?: number
  sourceNote?: string
  attachments?: string[]
  processes?: string[]
  gwp?: string
}

const GWP_DEFAULT = 'IPCC AR6 GWP100'
/** 核算标准默认快照（来源核算项目「目标与范围」；原型内统一） */
const STANDARD_DEFAULT = { no: 'GB/T 24067-2024', name: '产品碳足迹 量化要求和指南' }

/** 工艺流程库内的名称（Q04：不在库中的视为自定义标签） */
const LIB_PROCESS_NAMES = ['竹材热压', '竹材冷压', '碳化处理', '涂装']

const SEEDS: SeedSpec[] = [
  // —— 竹砧板（grave，浙江）——
  { name: '整竹砧板 330mm', code: 'P-ZZ-001', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '浙江省', boundary: 'grave', period: ['2024-01-01', '2024-12-31'], unitCode: '双', total: 12.4821, stages: { g1: 3.1204, g2: 5.8612, g3: 1.8403, g4: 1.1206, g5: 0.5396 }, processes: [] },
  { name: '整竹砧板 280mm', code: 'P-ZZ-001', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '浙江省', boundary: 'grave', period: ['2024-01-01', '2024-12-31'], unitCode: '双', total: 11.2043, stages: { g1: 2.9102, g2: 5.1305, g3: 1.7021, g4: 1.0113, g5: 0.4502 }, processes: ['竹材热压', '涂装'] },
  { name: '整竹砧板 330mm（2023）', code: 'P-ZZ-001', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '福建省', boundary: 'grave', period: ['2023-01-01', '2023-12-31'], unitCode: '双', total: 13.3902, stages: { g1: 3.4102, g2: 6.3201, g3: 2.0112, g4: 1.1206, g5: 0.5281 }, processes: ['竹材热压', '涂装'] },
  // —— 竹筷（gate，福建）——
  { name: '碳化竹筷 240mm', code: 'P-ZK-002', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '福建省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '双', total: 6.8210, stages: { g1: 2.4103, g2: 4.4107 }, processes: ['碳化处理'] },
  { name: '碳化竹筷 240mm（无涂装）', code: 'P-ZK-002', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '福建省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '双', total: 6.1402, stages: { g1: 2.2210, g2: 3.9192 }, processes: ['碳化处理'] },
  { name: '天竹筷 210mm', code: 'P-ZK-003', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '福建省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '双', total: 5.9014, stages: { g1: 2.0104, g2: 3.8910 }, processes: ['竹材冷压'] },
  { name: '天竹筷 210mm（出口装）', code: 'P-ZK-003', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '江西省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '双', total: 6.4231, stages: { g1: 2.1902, g2: 4.2329 }, processes: ['竹材冷压'] },
  // —— 竹地板（gate + grave，福建，参考线应命中的主样本）——
  { name: '重竹地板 900×120', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.1043, stages: { g1: 0.8210, g2: 1.2833 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板 900×120（深碳化）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.3310, stages: { g1: 0.9012, g2: 1.4298 }, processes: ['碳化处理', '涂装'] },
  { name: '重竹地板 1218×195', code: 'P-DB-002', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '浙江省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.5502, stages: { g1: 0.9810, g2: 1.5692 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板 1218×195（B 线）', code: 'P-DB-002', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '浙江省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.6120, stages: { g1: 1.0102, g2: 1.6018 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板（ grave 全链）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'grave', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.6014, stages: { g1: 0.8210, g2: 1.2833, g3: 0.2103, g4: 0.2201, g5: 0.0667 }, processes: ['竹材热压', '涂装'] },
  // —— 竹纤维餐具（gate，江西 / 广东）——
  { name: '竹纤维餐盒 800ml', code: 'P-CC-001', category: ['竹制品', '竹纤维制品', '林业产品 / 竹制品 / 竹纤维制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '江西省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '个', total: 0.4210, stages: { g1: 0.1502, g2: 0.2708 }, processes: ['竹材冷压'] },
  { name: '竹纤维餐盘 260mm', code: 'P-CC-002', category: ['竹制品', '竹纤维制品', '林业产品 / 竹制品 / 竹纤维制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '广东省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '个', total: 0.5102, stages: { g1: 0.1801, g2: 0.3301 }, processes: ['竹材冷压'] },
  { name: '竹纤维杯 400ml', code: 'P-CC-003', category: ['竹制品', '竹纤维制品', '林业产品 / 竹制品 / 竹纤维制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '广东省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '个', total: 0.4718, stages: { g1: 0.1702, g2: 0.3016 }, processes: ['竹材冷压'] },
  // —— 竹家具板（gate，福建）——
  { name: '竹集成材 18mm', code: 'P-JC-001', category: ['竹质板材', '竹集成材', '林产加工 / 竹质板材 / 竹集成材'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm³', total: 24.5210, stages: { g1: 9.2104, g2: 15.3106 }, processes: ['竹材热压'] },
  { name: '竹集成材 30mm', code: 'P-JC-002', category: ['竹质板材', '竹集成材', '林产加工 / 竹质板材 / 竹集成材'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm³', total: 15.1042, stages: { g1: 5.8102, g2: 9.2940 }, processes: ['竹材热压'] },
  { name: '薄型竹面板 6mm', code: 'P-JC-003', category: ['竹质板材', '竹集成材', '林产加工 / 竹质板材 / 竹集成材'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '浙江省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm³', total: 14.2104, stages: { g1: 5.4021, g2: 8.8083 }, processes: ['竹材热压', '涂装'] },
  // —— 特殊样本（演示标注与降级）——
  { name: '竹牙签（阶段缺失）', code: 'P-YQ-001', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '福建省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '包', total: 1.2010, stages: {}, source: 'manual', sourceNote: '引自《2024 中国林产工业年鉴》表 3-2（仅总值）', attachments: ['2024中国林产工业年鉴-摘录.pdf'], processes: ['碳化处理'] },
  { name: '竹制餐具套装（自定义工艺标签）', code: 'P-TC-001', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '江西省', boundary: 'grave', period: ['2024-01-01', '2024-12-31'], unitCode: '套', total: 9.8120, stages: { g1: 2.4102, g2: 4.1201, g3: 1.7102, g4: 1.0204, g5: 0.5511 }, source: 'manual', sourceNote: '外部 LCA 文献数据（DOI: 10.1016/j.jclepro.2024.01）', processes: ['竹 cold-press'] },
  // —— 已替代（同项目重算后的旧版本）——
  { name: '重竹地板 900×120（旧版）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.4010, stages: { g1: 0.9402, g2: 1.4608 }, status: 'superseded', resultVersion: 1, processes: ['竹材热压', '涂装'] },
  { name: '碳化竹筷 240mm（旧版）', code: 'P-ZK-002', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '福建省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '双', total: 7.1103, stages: { g1: 2.5012, g2: 4.6091 }, status: 'superseded', resultVersion: 1, processes: ['碳化处理'] },
  // —— 作废（软删除示例）——
  { name: '竹砧板（口径误录）', code: 'P-ZZ-009', category: ['竹制品', '竹制品', '林业产品 / 竹制品'], industry: ['C2031', '竹制品制造', '制造业 / 木材加工 / 竹制品制造'], region: '福建省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: '双', total: 3.2100, stages: { g1: 1.1102, g2: 2.0998 }, status: 'void', source: 'manual', sourceNote: '外部报告摘录', processes: ['涂装'] },

  // —— 竹地板同口径扩容样本（gate / m² / AR6 GWP100）：支撑行业统计分析与区域·工艺·年度对比 ——
  { name: '重竹地板 900×150', code: 'P-DB-003', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 1.9820, stages: { g1: 0.7810, g2: 1.2010 }, processes: ['竹材热压'] },
  { name: '重竹地板 600×120', code: 'P-DB-004', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.2240, stages: { g1: 0.8740, g2: 1.3500 }, processes: ['竹材冷压', '涂装'] },
  { name: '重竹地板 900×120（A 线）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: 'm²', total: 2.3510, stages: { g1: 0.9220, g2: 1.4290 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板 1218×195（福建）', code: 'P-DB-002', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: 'm²', total: 2.4680, stages: { g1: 0.9710, g2: 1.4970 }, processes: ['碳化处理'] },
  { name: '重竹地板 900×120（2023）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2023-01-01', '2023-12-31'], unitCode: 'm²', total: 2.6120, stages: { g1: 1.0250, g2: 1.5870 }, processes: ['竹材热压', '涂装'] },
  { name: '竹地板 600×120（低效产线）', code: 'P-DB-009', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2023-01-01', '2023-12-31'], unitCode: 'm²', total: 3.4210, stages: { g1: 1.3480, g2: 2.0730 }, processes: ['竹材热压'] },
  { name: '重竹地板 900×120（2022）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '福建省', boundary: 'gate', period: ['2022-01-01', '2022-12-31'], unitCode: 'm²', total: 2.7240, stages: { g1: 1.0700, g2: 1.6540 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板 900×120（浙江）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '浙江省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.3860, stages: { g1: 0.9380, g2: 1.4480 }, processes: ['碳化处理', '涂装'] },
  { name: '重竹地板 600×120（浙江）', code: 'P-DB-004', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '浙江省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.1780, stages: { g1: 0.8560, g2: 1.3220 }, processes: ['竹材冷压'] },
  { name: '重竹地板 1218×195（A 线）', code: 'P-DB-002', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '浙江省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: 'm²', total: 2.4910, stages: { g1: 0.9790, g2: 1.5120 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板 900×150（浙江）', code: 'P-DB-003', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '浙江省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: 'm²', total: 2.3150, stages: { g1: 0.9100, g2: 1.4050 }, processes: ['涂装'] },
  { name: '重竹地板 900×120（2023 浙江）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '浙江省', boundary: 'gate', period: ['2023-01-01', '2023-12-31'], unitCode: 'm²', total: 2.8030, stages: { g1: 1.1020, g2: 1.7010 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板 1218×195（节能产线）', code: 'P-DB-002', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '浙江省', boundary: 'gate', period: ['2022-01-01', '2022-12-31'], unitCode: 'm²', total: 1.7240, stages: { g1: 0.6780, g2: 1.0460 }, processes: ['竹材冷压'] },
  { name: '重竹地板 900×120（江西）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '江西省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.3980, stages: { g1: 0.9430, g2: 1.4550 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板 600×120（江西）', code: 'P-DB-004', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '江西省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.2540, stages: { g1: 0.8860, g2: 1.3680 }, processes: ['竹材冷压'] },
  { name: '重竹地板 1218×195（江西）', code: 'P-DB-002', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '江西省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: 'm²', total: 2.5620, stages: { g1: 1.0070, g2: 1.5550 }, processes: ['碳化处理'] },
  { name: '重竹地板 900×120（2023 江西）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '江西省', boundary: 'gate', period: ['2023-01-01', '2023-12-31'], unitCode: 'm²', total: 2.6870, stages: { g1: 1.0560, g2: 1.6310 }, processes: ['竹材热压'] },
  { name: '重竹地板 900×150（江西）', code: 'P-DB-003', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '江西省', boundary: 'gate', period: ['2022-01-01', '2022-12-31'], unitCode: 'm²', total: 2.7480, stages: { g1: 1.0800, g2: 1.6680 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板 900×120（广东）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '广东省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.1430, stages: { g1: 0.8430, g2: 1.3000 }, processes: ['竹材热压', '涂装'] },
  { name: '重竹地板 1218×195（广东）', code: 'P-DB-002', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '广东省', boundary: 'gate', period: ['2025-01-01', '2025-12-31'], unitCode: 'm²', total: 2.4310, stages: { g1: 0.9560, g2: 1.4750 }, processes: ['涂装'] },
  { name: '重竹地板 600×120（广东）', code: 'P-DB-004', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '广东省', boundary: 'gate', period: ['2024-01-01', '2024-12-31'], unitCode: 'm²', total: 2.0870, stages: { g1: 0.8210, g2: 1.2660 }, processes: ['竹材冷压'] },
  { name: '重竹地板 900×120（2023 广东）', code: 'P-DB-001', category: ['竹质板材', '竹地板', '林产加工 / 竹质板材 / 竹地板'], industry: ['C2021', '纤维板制造', '制造业 / 人造板制造 / 纤维板制造'], region: '广东省', boundary: 'gate', period: ['2023-01-01', '2023-12-31'], unitCode: 'm²', total: 2.5390, stages: { g1: 0.9980, g2: 1.5410 }, processes: ['竹材热压', '涂装'] },
]

let seqNo = 0
function nextRecordNo(): string {
  seqNo += 1
  return `CR-2025-${pad(seqNo, 4)}`
}

const seed: CarbonRecord[] = SEEDS.map((spec, index) => {
  const record: CarbonRecord = {
    id: `DS-${pad(index + 1, 3)}`,
    recordNo: nextRecordNo(),
    recordSource: spec.source ?? 'project',
    sourceProjectId: spec.source === 'manual' ? undefined : `PCF-2025-${pad(index + 1, 3)}`,
    sourceProjectNo: spec.source === 'manual' ? undefined : `PCF-2025-${pad(index + 1, 3)}`,
    resultVersion: spec.resultVersion ?? 2,
    orgId: ORG_ID,
    productName: spec.name,
    productCode: spec.code,
    categoryCode: spec.category[0],
    categoryName: spec.category[1],
    categoryPath: spec.category[2],
    processes: (spec.processes ?? []).map((name) => ({ name, custom: !LIB_PROCESS_NAMES.includes(name) })),
    industryCode: spec.industry[0],
    industryName: spec.industry[1],
    industryPath: spec.industry[2],
    regionName: spec.region,
    boundary: spec.boundary,
    periodStart: spec.period[0],
    periodEnd: spec.period[1],
    unitValue: 1,
    unitCode: spec.unitCode,
    caliber: 'total',
    gwpVersion: spec.gwp ?? GWP_DEFAULT,
    standardNo: STANDARD_DEFAULT.no,
    standardName: STANDARD_DEFAULT.name,
    totalEmission: spec.total,
    stageValues: makeStages(spec.boundary, spec.stages),
    status: spec.status ?? 'active',
    sourceNote: spec.sourceNote,
    attachments: (spec.attachments ?? []).map((name) => ({ name })),
    createdBy: spec.source === 'manual' ? '张核算' : '系统',
    createdAt: `2025-06-${pad((index % 27) + 1)} ${pad(9 + (index % 8))}:${pad((index * 7) % 60)}`,
  }
  return record
})

/* ---------- 企业数据上报审核入库的既有记录（与 mock/dataReport 种子对齐） ---------- */

seed.push(
  {
    id: 'DS-RPT-01',
    recordNo: nextRecordNo(),
    recordSource: 'report',
    sourceReportId: 'RPT-0001',
    resultVersion: 2,
    orgId: '某华东地区企业',
    orgLabel: '某华东地区企业',
    productName: '重竹地板 900×120',
    productCode: 'P-DB-001',
    categoryCode: '竹地板',
    categoryName: '竹地板',
    categoryPath: '林产加工 / 竹质板材 / 竹地板',
    processes: [
      { name: '竹材热压' },
      { name: '涂装' },
    ],
    industryCode: 'C2021',
    industryName: '纤维板制造',
    industryPath: '制造业 / 人造板制造 / 纤维板制造',
    regionName: '福建省',
    boundary: 'gate',
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    unitValue: 1,
    unitCode: 'm²',
    caliber: 'total',
    gwpVersion: GWP_DEFAULT,
    standardNo: STANDARD_DEFAULT.no,
    standardName: STANDARD_DEFAULT.name,
    totalEmission: 2.1043,
    stageValues: makeStages('gate', { g1: 0.821, g2: 1.2833 }),
    status: 'active',
    sourceNote: '企业数据上报审核入库（RPT-2026-0001）',
    dataQualityNote: '实测计量，电表与蒸汽流量计读数，数据质量等级 DQR 2 级',
    attachments: [],
    createdBy: '平台审核员',
    createdAt: '2026-10-10 15:40',
  },
  {
    id: 'DS-RPT-02',
    recordNo: nextRecordNo(),
    recordSource: 'report',
    sourceReportId: 'RPT-0006',
    resultVersion: 2,
    orgId: '某华东地区企业',
    orgLabel: '某华东地区企业',
    productName: '重竹地板 1218×195',
    productCode: 'P-DB-002',
    categoryCode: '竹地板',
    categoryName: '竹地板',
    categoryPath: '林产加工 / 竹质板材 / 竹地板',
    processes: [
      { name: '竹材热压' },
      { name: '涂装' },
    ],
    industryCode: 'C2021',
    industryName: '纤维板制造',
    industryPath: '制造业 / 人造板制造 / 纤维板制造',
    regionName: '浙江省',
    boundary: 'gate',
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    unitValue: 1,
    unitCode: 'm²',
    caliber: 'total',
    gwpVersion: GWP_DEFAULT,
    standardNo: STANDARD_DEFAULT.no,
    standardName: STANDARD_DEFAULT.name,
    totalEmission: 2.5502,
    stageValues: makeStages('gate', { g1: 0.981, g2: 1.5692 }),
    status: 'active',
    sourceNote: '企业数据上报审核入库（RPT-2026-0006）',
    dataQualityNote: '按生产工单归集能耗，电表分表计量，数据质量等级 DQR 2 级',
    attachments: [],
    createdBy: '平台审核员',
    createdAt: '2026-09-20 10:00',
  },
  {
    id: 'DS-RPT-03',
    recordNo: nextRecordNo(),
    recordSource: 'report',
    sourceReportId: 'RPT-0008',
    resultVersion: 2,
    orgId: '某华东地区企业',
    orgLabel: '某华东地区企业',
    productName: '重竹地板 900×120（深碳化）',
    productCode: 'P-DB-001',
    categoryCode: '竹地板',
    categoryName: '竹地板',
    categoryPath: '林产加工 / 竹质板材 / 竹地板',
    processes: [
      { name: '碳化处理' },
      { name: '涂装' },
    ],
    industryCode: 'C2021',
    industryName: '纤维板制造',
    industryPath: '制造业 / 人造板制造 / 纤维板制造',
    regionName: '福建省',
    boundary: 'gate',
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    unitValue: 1,
    unitCode: 'm²',
    caliber: 'total',
    gwpVersion: GWP_DEFAULT,
    standardNo: STANDARD_DEFAULT.no,
    standardName: STANDARD_DEFAULT.name,
    totalEmission: 2.331,
    stageValues: makeStages('gate', { g1: 0.9012, g2: 1.4298 }),
    status: 'active',
    sourceNote: '企业数据上报审核入库（RPT-2026-0008）',
    dataQualityNote: '碳化工序天然气由流量计计量，涂装按涂料用量折算，DQR 2 级',
    attachments: [],
    createdBy: '平台审核员',
    createdAt: '2026-09-27 16:20',
  },
)

/* ============================ 内存存储与 API ============================ */

let store: CarbonRecord[] = seed.map((item) => ({ ...item }))

export async function fetchRecords(): Promise<CarbonRecord[]> {
  await delay()
  return clone(store)
}

export async function createManualRecord(
  draft: Pick<
    CarbonRecord,
    | 'productName'
    | 'productCode'
    | 'categoryCode'
    | 'categoryName'
    | 'categoryPath'
    | 'industryCode'
    | 'industryName'
    | 'industryPath'
    | 'regionName'
    | 'boundary'
    | 'periodStart'
    | 'periodEnd'
    | 'unitValue'
    | 'unitCode'
    | 'totalEmission'
    | 'sourceNote'
  > & {
    stageValues: Record<string, number>
    attachments: { name: string }[]
    processes: { name: string; custom?: boolean }[]
  },
): Promise<CarbonRecord> {
  await delay()
  const now = nowText()
  seqNo += 1
  const record: CarbonRecord = {
    id: `DS-NEW-${seqNo}`,
    recordNo: nextRecordNo(),
    recordSource: 'manual',
    orgId: ORG_ID,
    productName: draft.productName,
    productCode: draft.productCode,
    categoryCode: draft.categoryCode,
    categoryName: draft.categoryName,
    categoryPath: draft.categoryPath,
    processes: draft.processes,
    industryCode: draft.industryCode,
    industryName: draft.industryName,
    industryPath: draft.industryPath,
    regionName: draft.regionName,
    boundary: draft.boundary,
    periodStart: draft.periodStart,
    periodEnd: draft.periodEnd,
    unitValue: draft.unitValue,
    unitCode: draft.unitCode,
    caliber: 'total',
    gwpVersion: GWP_DEFAULT,
    standardNo: STANDARD_DEFAULT.no,
    standardName: STANDARD_DEFAULT.name,
    emissionUnit: 'kgCO₂e',
    totalEmission: draft.totalEmission,
    stageValues: makeStages(draft.boundary, draft.stageValues),
    status: 'active',
    sourceNote: draft.sourceNote,
    attachments: draft.attachments,
    createdBy: '张核算',
    createdAt: now,
  }
  store = [record, ...store]
  return clone(record)
}

/** 作废（软删除，D10：填原因、不物理删除） */
export async function voidRecord(id: string, reason: string): Promise<void> {
  await delay()
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('记录不存在或已被删除')
  found.status = 'void'
  found.voidReason = reason
}

/** 恢复（作废 → 有效） */
export async function restoreRecord(id: string): Promise<void> {
  await delay()
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('记录不存在或已被删除')
  found.status = 'active'
  found.voidReason = undefined
}

/** 补填区域（D04：缺失区域可后补，补后参与区域检索与分组） */
export async function fillRegion(id: string, regionName: string): Promise<void> {
  await delay()
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('记录不存在或已被删除')
  found.regionName = regionName
}

/** 调试入口：模拟「重复入账」幂等（验收 V02）——重复触发不会产生重复行 */
export async function __simulateDuplicateEntry__(sourceProjectNo: string): Promise<number> {
  await delay()
  return store.filter((item) => item.sourceProjectNo === sourceProjectNo).length
}

/* ==================== 企业数据上报 · 审核通过入库 ==================== */

/** 审核通过入库载荷（企业上报原值 + 脱敏） */
export interface ReportArchivePayload {
  reportId: string
  /** 查找既有记录用的上报单键：首次入库单 id（重算后重报沿用），不传则同 reportId */
  recordKey?: string
  reportNo: string
  productName: string
  productCode?: string
  /** 产品类别编码（随上报单传入，避免用名称充当编码） */
  categoryCode?: string
  categoryName: string
  categoryPath: string
  industryCode: string
  industryName: string
  industryPath: string
  processes: string[]
  boundary: Boundary
  periodStart: string
  periodEnd: string
  unitValue: number
  unitCode: string
  gwpVersion: string
  standardNo?: string
  standardName?: string
  /** 排放分子单位：沿用核算结果，不换算 */
  emissionUnit?: string
  /** 来源核算结果版本 / 项目编号（脱敏仅针对企业标识，项目号用于来源追溯） */
  resultVersion?: number
  sourceProjectNo?: string
  totalEmission: number
  stageValues: { stageCode: string; stageName: string; stageEmission: number }[]
  /** 脱敏后的企业标签：某华东地区企业 */
  orgLabel: string
  /** 真实组织 id（数据域隔离依据，不随脱敏覆盖） */
  orgId?: string
  regionName: string
  dataQualityNote: string
  datasetVersion?: string
  operator: string
}

/**
 * 审核通过入库：
 * - 同一上报单（重算后重新上报）已入库过 → **更新原记录**，不新增行；
 * - 首次入库 → 追加一条记录，企业标识写脱敏标签；
 * - 上报单里的活动数据从未进入本函数，入库记录天然不含能耗 / 物料明细。
 */
export async function archiveReportRecord(payload: ReportArchivePayload): Promise<CarbonRecord> {
  await delay()
  const existing = store.find((item) => item.sourceReportId === (payload.recordKey ?? payload.reportId))
  const stageValues =
    payload.stageValues.length === 0
      ? []
      : makeStages(
          payload.boundary,
          Object.fromEntries(payload.stageValues.map((s) => [s.stageCode, s.stageEmission])),
        )

  if (existing) {
    existing.productName = payload.productName
    existing.productCode = payload.productCode
    existing.categoryCode = payload.categoryCode ?? payload.categoryName
    existing.categoryName = payload.categoryName
    existing.categoryPath = payload.categoryPath
    existing.industryCode = payload.industryCode
    existing.industryName = payload.industryName
    existing.industryPath = payload.industryPath
    existing.processes = payload.processes.map((name) => ({ name, custom: !LIB_PROCESS_NAMES.includes(name) }))
    existing.boundary = payload.boundary
    existing.periodStart = payload.periodStart
    existing.periodEnd = payload.periodEnd
    existing.unitValue = payload.unitValue
    existing.unitCode = payload.unitCode
    existing.gwpVersion = payload.gwpVersion
    existing.standardNo = payload.standardNo
    existing.standardName = payload.standardName
    existing.emissionUnit = payload.emissionUnit ?? 'kgCO₂e'
    existing.resultVersion = payload.resultVersion
    existing.sourceProjectNo = payload.sourceProjectNo
    existing.totalEmission = payload.totalEmission
    existing.stageValues = stageValues
    existing.orgId = payload.orgId ?? ORG_ID
    existing.orgLabel = payload.orgLabel
    existing.regionName = payload.regionName
    existing.dataQualityNote = payload.dataQualityNote
    existing.sourceNote = `企业数据上报审核入库（${payload.reportNo}）`
    existing.status = 'active'
    existing.voidReason = undefined
    // 保留首次入库时间与入库人，重报更新不改写审计追溯信息
    return clone(existing)
  }

  seqNo += 1
  const record: CarbonRecord = {
    id: `DS-RPT-${seqNo}`,
    recordNo: nextRecordNo(),
    recordSource: 'report',
    sourceReportId: payload.reportId,
    sourceProjectNo: payload.sourceProjectNo,
    resultVersion: payload.resultVersion,
    orgId: payload.orgId ?? ORG_ID,
    orgLabel: payload.orgLabel,
    productName: payload.productName,
    productCode: payload.productCode,
    categoryCode: payload.categoryCode ?? payload.categoryName,
    categoryName: payload.categoryName,
    categoryPath: payload.categoryPath,
    processes: payload.processes.map((name) => ({ name, custom: !LIB_PROCESS_NAMES.includes(name) })),
    industryCode: payload.industryCode,
    industryName: payload.industryName,
    industryPath: payload.industryPath,
    regionName: payload.regionName,
    boundary: payload.boundary,
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    unitValue: payload.unitValue,
    unitCode: payload.unitCode,
    caliber: 'total',
    gwpVersion: payload.gwpVersion,
    standardNo: payload.standardNo,
    standardName: payload.standardName,
    emissionUnit: payload.emissionUnit ?? 'kgCO₂e',
    totalEmission: payload.totalEmission,
    stageValues,
    status: 'active',
    sourceNote: `企业数据上报审核入库（${payload.reportNo}）`,
    dataQualityNote: payload.dataQualityNote,
    attachments: [],
    createdBy: payload.operator,
    createdAt: nowText(),
  }
  store = [record, ...store]
  return clone(record)
}

/* ==================== 核算项目 · 结果入账 ==================== */

/** 核算结果入账载荷（由核算结果页拼装，字典路径由页面解析后传入） */
export interface ProjectArchivePayload {
  /** 核算项目 id（幂等键之一） */
  projectId: string
  /** 核算项目编号 PCF-YYYYMMDD-NNN */
  projectNo: string
  /** 第 N 次核算结果（幂等键之一，D02） */
  resultVersion: number
  productName: string
  productCode?: string
  categoryCode: string
  categoryName: string
  categoryPath: string
  industryCode: string
  industryName: string
  industryPath: string
  processes: string[]
  boundary: Boundary
  periodStart: string
  periodEnd: string
  unitValue: number
  unitCode: string
  gwpVersion: string
  standardNo?: string
  standardName?: string
  /** 排放分子单位：沿用核算结果，不换算 */
  emissionUnit?: string
  totalEmission: number
  /** 核算结果阶段汇总：名称与台账标准阶段模板同名时直接落位，自定义阶段按关键字归集 */
  stageValues: { stageName: string; stageEmission: number }[]
  /** 核算结果的明细（活动数据）条数，供上报单展示「已隐藏 N 项」 */
  hiddenActivityCount?: number
  operator?: string
}

/** 自定义阶段名 → 标准阶段编码（关键字归集，保证分阶段合计与总值闭合） */
const STAGE_KEYWORDS: { code: string; words: string[] }[] = [
  { code: 'g1', words: ['采伐', '种植', '原材料', '获取', '培育', '育苗', '生长'] },
  { code: 'g2', words: ['加工', '生产', '制造', '成型', '能源', '辅助'] },
  { code: 'g3', words: ['运输', '物流', '配送', '仓储'] },
  { code: 'g4', words: ['使用', '消费'] },
  { code: 'g5', words: ['废弃', '回收', '处置', '循环', '末端'] },
]

function resolveStageCode(stageName: string): string | undefined {
  const hit = STAGE_KEYWORDS.find((item) => item.words.some((word) => stageName.includes(word)))
  return hit?.code
}

/**
 * 核算结果入账（原型：替代真实系统的「核算完成自动入账」）。
 * - 幂等：(sourceProjectId, resultVersion) 相同 → 更新原记录，不新增行（D02）；
 * - 同一项目产出新结果版本 → 旧版本记录置「已替代」，仅作历史追溯（D03）；
 * - 入库即快照：活动数据不进入台账，只保留结果与标签（D06）。
 */
export async function createRecordFromProject(
  payload: ProjectArchivePayload,
): Promise<{ record: CarbonRecord; created: boolean }> {
  await delay()
  const templateCodes = buildStages(payload.boundary).map((stage) => stage.stageCode)
  const fallbackCode = templateCodes.includes('g2') ? 'g2' : templateCodes[0]
  const values: Record<string, number> = {}
  for (const stage of payload.stageValues) {
    const mapped = resolveStageCode(stage.stageName)
    const code = mapped && templateCodes.includes(mapped) ? mapped : fallbackCode
    values[code] = (values[code] ?? 0) + stage.stageEmission
  }
  const stageValues = makeStages(payload.boundary, values)
  const operator = payload.operator ?? '核算平台'
  const processes = payload.processes.map((name) => ({ name, custom: !LIB_PROCESS_NAMES.includes(name) }))

  const existing = store.find(
    (item) =>
      item.sourceProjectId === payload.projectId && (item.resultVersion ?? 1) === payload.resultVersion,
  )

  if (existing) {
    // 同一结果版本重复入账：原地更新（保留记录编号与首次入库时间）
    Object.assign(existing, {
      productName: payload.productName,
      productCode: payload.productCode,
      categoryCode: payload.categoryCode,
      categoryName: payload.categoryName,
      categoryPath: payload.categoryPath,
      industryCode: payload.industryCode,
      industryName: payload.industryName,
      industryPath: payload.industryPath,
      processes,
      boundary: payload.boundary,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      unitValue: payload.unitValue,
      unitCode: payload.unitCode,
      gwpVersion: payload.gwpVersion,
      standardNo: payload.standardNo,
      standardName: payload.standardName,
      emissionUnit: payload.emissionUnit ?? 'kgCO₂e',
      totalEmission: payload.totalEmission,
      stageValues,
      hiddenActivityCount: payload.hiddenActivityCount,
      status: 'active',
      voidReason: undefined,
    })
    return { record: clone(existing), created: false }
  }

  // 新结果版本：同项目旧记录标记「已替代」
  store.forEach((item) => {
    if (item.sourceProjectId === payload.projectId && item.status === 'active') item.status = 'superseded'
  })

  seqNo += 1
  const record: CarbonRecord = {
    id: `DS-PCF-${seqNo}`,
    recordNo: nextRecordNo(),
    recordSource: 'project',
    sourceProjectId: payload.projectId,
    sourceProjectNo: payload.projectNo,
    resultVersion: payload.resultVersion,
    orgId: ORG_ID,
    productName: payload.productName,
    productCode: payload.productCode,
    categoryCode: payload.categoryCode,
    categoryName: payload.categoryName,
    categoryPath: payload.categoryPath,
    processes,
    industryCode: payload.industryCode,
    industryName: payload.industryName,
    industryPath: payload.industryPath,
    regionName: '',
    boundary: payload.boundary,
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    unitValue: payload.unitValue,
    unitCode: payload.unitCode,
    caliber: 'total',
    gwpVersion: payload.gwpVersion,
    standardNo: payload.standardNo,
    standardName: payload.standardName,
    emissionUnit: payload.emissionUnit ?? 'kgCO₂e',
    totalEmission: payload.totalEmission,
    stageValues,
    hiddenActivityCount: payload.hiddenActivityCount,
    status: 'active',
    attachments: [],
    createdBy: operator,
    createdAt: nowText(),
  }
  store = [record, ...store]
  return { record: clone(record), created: true }
}

/**
 * 企业上报审核通过后，把源核算记录置「已替代」。
 * 同一处核算结果只允许保留一条有效记录（企业上报入库记录），避免行业数据集重复计数。
 */
export async function supersedeRecord(recordId: string): Promise<void> {
  await delay(60)
  const found = store.find((item) => item.id === recordId)
  if (!found || found.status === 'void') return
  found.status = 'superseded'
  found.voidReason = undefined
}

/** 已入库记录沿用原记录编号（重报更新时供上报单回写） */
export async function findRecordByReportId(reportId: string): Promise<CarbonRecord | null> {
  await delay(80)
  const found = store.find((item) => item.sourceReportId === reportId)
  return found ? clone(found) : null
}
