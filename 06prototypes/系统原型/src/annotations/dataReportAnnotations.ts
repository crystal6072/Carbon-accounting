import type { Annotation } from './types'

/**
 * 企业数据上报功能批注数据（前台 · 数据管理 · 企业数据上报，路由 /dataset/report）。
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：跨页面 / 文档级说明，进入本模块「全局批注」抽屉（含端到端流程图与状态机）。
 * 口径来源：原型 src/pages/dataset/{DataReportListPage,ReportSubmitModal,dataReportMeta}.tsx
 * 与 mock/dataReport.ts（createReportFromRecord / submitReport / withdrawReport / approveReport）。
 */
export const dataReportAnnotations: Annotation[] = [
  /* ==================== 页面定位 / 状态 / 统计 ==================== */
  {
    id: 'ann-report-scope',
    title: '功能定位：已核算数据的唯一上报入口',
    code: 'DR-01',
    blocks: [
      { type: 'heading', text: '本页做什么' },
      {
        type: 'paragraph',
        text: '企业把**已核算完成的碳数据**一键上报平台，经平台审核入库、发布版本后，才会出现在「行业数据集」。本页是**唯一上报入口**，行业数据集页不提供行内上报。',
      },
      { type: 'heading', text: '上报什么' },
      {
        type: 'table',
        columns: ['类别', '内容', '来源'],
        rows: [
          ['数值结果', '总碳足迹、各生命周期阶段排放量与占比', '核算记录快照，自动带出'],
          ['标签', '产品 / 类别 / 行业 / 工艺 / 系统边界 / 统计期间 / 声明单位 / GWP / 核算标准', '核算记录，自动带出'],
          ['企业补充', '所属区域（省 / 市 / 区）、工艺类型（仅记录缺失时）、数据质量说明', '本页填写'],
        ],
      },
      { type: 'heading', text: '不上报什么' },
      {
        type: 'list',
        items: [
          '**活动数据**（耗电量、物料用量、运输明细）、排放因子、核算模型与计算过程**不进上报单**，平台侧也看不到。',
          '不上报企业真实名称：入库时按区域脱敏为「某华东地区企业」，仅保留区域与行业等对标必要标签。',
          '不提供数值编辑：上报的是核算结果原值，本页不能改数。',
        ],
      },
      { type: 'heading', text: '前置条件' },
      {
        type: 'paragraph',
        text: '只有**有效状态（active）**的核算记录可上报；已替代 / 作废的记录不出现在选择列表，也不可提交。',
      },
    ],
    source: '原型 DataReportListPage 页面注释 / ReportSubmitModal；mock createReportFromRecord',
    operation: '模块定位 / 上报范围',
    buttonText: '一键上报',
    selector: 'dataset.report.header',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.header', label: '一键上报', reason: '唯一上报入口' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-report-flow-bar',
    title: '状态说明（草稿 / 审核中 / 已驳回 / 已入库）',
    code: 'DR-02',
    blocks: [
      {
        type: 'paragraph',
        text: '列表页按界面收敛**不展示状态流转条**；状态口径仍以下表与「企业上报流程图」全局批注为准。',
      },
      { type: 'heading', text: '四个状态' },
      {
        type: 'table',
        columns: ['状态', '含义', '企业可做的动作'],
        rows: [
          ['草稿', '已生成上报单但未提交（暂存）', '继续填报 / 提交 / 删除'],
          ['审核中', '已提交，进入平台审核队列', '平台未开始审核时可撤回；不可改数值'],
          ['已驳回', '平台审核不通过，附驳回原因', '修改后重报'],
          ['已入库', '平台审核通过，按原值脱敏入库', '不可改；若来源记录重算则「重新上报」'],
        ],
      },
      { type: 'heading', text: '流转规则' },
      {
        type: 'list',
        items: [
          '主链：**草稿 → 审核中 → 已入库**；「已驳回」是审核中的分支，不是主链上的必经点。',
          '提交即进入审核中，**没有「待受理」环节**；平台侧打开即审核。',
          '撤回只允许在**平台尚未开始审核**时进行，撤回后回到草稿（轨迹中留撤回记录）。',
          '平台一旦审核（通过 / 驳回），企业端不再出现撤回入口。',
        ],
      },
      { type: 'heading', text: '为什么没有「待公示 / 已公示」' },
      {
        type: 'paragraph',
        text: '入库后是否对企业可见，取决于平台「公共数据库」是否发布新版本；**发版是平台动作，不是上报状态**，因此企业端状态只到「已入库」。',
      },
    ],
    source: '原型 dataReportMeta.REPORT_FLOW / canWithdrawReport；mock withdrawReport',
    operation: '查看状态说明',
    buttonText: '状态统计卡',
    selector: 'dataset.report.stats',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.stats', label: '状态统计卡', reason: '状态说明位置' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-report-stats',
    title: '状态统计卡',
    code: 'DR-03',
    blocks: [
      { type: 'heading', text: '数据来源' },
      { type: 'paragraph', text: '取当前企业**全部上报单**（不限筛选条件），按状态计数。' },
      { type: 'heading', text: '计数口径' },
      {
        type: 'list',
        items: [
          '计数单位是**上报单**，不是核算记录：同一核算记录被多次上报时按多条上报单分别计数。',
          '四个数字互斥（一张单只属于一个状态），合计等于上报单总数。',
          '「已入库」不区分是否已随版本发布，发布情况在平台侧查看。',
          '「数据已更新」是标记不是状态，不单独计数，仍计入其所在状态。',
        ],
      },
      { type: 'heading', text: '刷新时机' },
      {
        type: 'paragraph',
        text: '提交、撤回、删除、重新上报后重新拉取列表并同步刷新；本页不自动轮询。',
      },
    ],
    source: '原型 DataReportListPage stats / StatCard',
    operation: '读取统计卡',
    buttonText: '草稿 / 审核中 / 已驳回 / 已入库',
    selector: 'dataset.report.stats',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.stats', label: '状态统计卡', reason: '统计区块' }],
    global: false,
    priority: 'medium',
  },

  /* ==================== 列表：查询 / 字段 / 操作 ==================== */
  {
    id: 'ann-report-query',
    title: '列表查询条件',
    code: 'DR-04',
    blocks: [
      { type: 'heading', text: '条件与匹配方式' },
      {
        type: 'table',
        columns: ['条件', '控件', '匹配规则'],
        rows: [
          ['状态', '下拉单选', '**精确匹配**；默认「全部状态」'],
          ['产品名称', '输入框', '对「产品名称 + 产品编码」**模糊包含**，不区分大小写'],
          ['产品类别', '输入框', '对「类别名 + 类别路径」模糊包含'],
          ['系统边界', '输入框', '对边界中文文案（摇篮到大门 / 摇篮到坟墓）模糊包含'],
          ['行业', '输入框', '对「行业名 + 行业路径 + 行业编码」模糊包含'],
        ],
      },
      { type: 'heading', text: '触发规则' },
      {
        type: 'list',
        items: [
          '条件之间为 **AND**；输入后需点「查询」生效。',
          '「重置」清空草稿并**立即生效**，页码回到第 1 页。',
          '查询结果按**更新时间倒序**，每页 20 条。',
        ],
      },
      { type: 'heading', text: '为什么类别 / 边界 / 行业用输入而不是下拉' },
      {
        type: 'paragraph',
        text: '这三项对企业是**查询辅助**而非录入项，输入框可避免为一次性筛选加载整棵类别树 / 行业树；录入侧的类别与行业仍由核算记录带出。',
      },
    ],
    source: '原型 DataReportListPage TEXT_QUERY_FIELDS / filtered',
    operation: '组合查询',
    buttonText: '查询 / 重置',
    selector: 'dataset.report.query',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.query', label: '查询条件区', reason: '查询区容器' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-report-list',
    title: '上报记录列表与字段口径',
    code: 'DR-05',
    blocks: [
      { type: 'heading', text: '列表规则' },
      {
        type: 'list',
        items: [
          '按**更新时间（updatedAt）倒序**，每页 20 条；提交、撤回、重新上报都会刷新排序位置。',
          '产品名称旁出现「数据已更新，请重新上报」时，说明来源核算记录已重算且产生了更高版本。',
        ],
      },
      { type: 'heading', text: '字段口径' },
      {
        type: 'table',
        columns: ['字段', '取值规则'],
        rows: [
          ['产品名称', '取上报时冻结的产品名称；产品编码不在此列展示'],
          ['产品类别', '取类别名称，空显示「-」'],
          ['系统边界', '中文文案标签（摇篮到大门 / 摇篮到坟墓）'],
          ['行业', '行业名称，悬停可看完整行业路径'],
          ['统计时间', '`periodStart ~ periodEnd`，取核算结果的统计期间'],
          ['碳排放量', '上报快照的总碳足迹，最多 4 位小数去尾零；单位 `排放单位/声明单位`'],
          ['上报状态', '草稿 / 审核中 / 已驳回 / 已入库，配色固定（警告 / 错误 / 成功 / 默认）'],
        ],
      },
      { type: 'heading', text: '空态' },
      {
        type: 'paragraph',
        text: '无记录时提示「点击右上角「一键上报」，从已完成核算的碳数据中选择记录发起上报」，不显示假数据、不显示 0 行表格。',
      },
    ],
    source: '原型 DataReportListPage 列定义 / dataReportMeta.numFmt、emissionUnitLabel',
    operation: '列表展示',
    buttonText: '上报记录列表',
    selector: 'dataset.report.table',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.table', label: '上报记录列表', reason: '列表区' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-report-row-actions',
    title: '行操作与可用条件',
    code: 'DR-06',
    blocks: [
      { type: 'heading', text: '按状态开放的动作' },
      {
        type: 'table',
        columns: ['动作', '出现条件', '结果'],
        rows: [
          ['查看', '全部状态', '打开详情抽屉（只读）'],
          ['继续填报', '草稿', '打开上报表单，带出已填区域 / 说明 / 工艺'],
          ['提交', '草稿', '直接提交进入审核中（不弹二次确认）'],
          ['删除', '草稿', '二次确认后删除草稿，不可恢复'],
          ['撤回', '审核中且平台未开始审核', '二次确认后回到草稿，清空提交时间与驳回信息'],
          ['修改后重报', '已驳回', '打开表单，带出驳回单内容与驳回原因'],
          ['重新上报', '已入库且数据已更新', '打开表单，提交后审核通过更新原入库记录'],
        ],
      },
      { type: 'heading', text: '约束' },
      {
        type: 'list',
        items: [
          '审核中**不提供删除与编辑**，避免审核对象被中途替换。',
          '「提交」沿用草稿已保存的区域 / 工艺；若草稿数据不完整（区域未到区县、缺工艺），提交会被拦截并提示补全。',
          '删除只删上报单，**不影响来源核算记录**。',
          '重新上报生成的上报单沿用原入库记录标识，审核通过后**更新原记录**而不是新增一条。',
        ],
      },
    ],
    source: '原型 DataReportListPage 操作列 / handleQuickSubmit、handleDeleteDraft、handleWithdraw；mock createResubmitDraft',
    operation: '行操作',
    buttonText: '查看 / 继续填报 / 提交 / 删除 / 撤回',
    selector: 'dataset.report.actions',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.actions', label: '行操作', reason: '操作列' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-report-picker',
    title: '选择核算记录（一键上报第一步）',
    code: 'DR-07',
    blocks: [
      { type: 'heading', text: '候选范围' },
      {
        type: 'list',
        items: [
          '只列**有效状态（active）**的核算记录；已替代 / 作废的记录不出现。',
          '每行展示产品名称、记录编号与「第 N 次核算」，用于区分同项目的多版本结果。',
          '默认每页 8 条。',
        ],
      },
      { type: 'heading', text: '筛选' },
      {
        type: 'paragraph',
        text: '名称（产品名 / 记录编号 / 产品编码模糊）、产品类别、所属行业、上报状态（含「未上报」）四项组合；点「搜索」生效。',
      },
      { type: 'heading', text: '已存在上报单时的处理' },
      {
        type: 'table',
        columns: ['该记录已有上报单状态', '按钮表现', '点击结果'],
        rows: [
          ['审核中', '禁用，文案「审核中」', '拦截：提示正在审核中，无需重复上报'],
          ['草稿 / 已驳回', '「重新上报」', '打开表单并带出已有内容继续修改'],
          ['已入库', '「重新上报」', '打开表单；提交后审核通过更新原记录'],
          ['无', '「一键上报」', '打开空表单，区域默认取企业地址'],
        ],
      },
      { type: 'heading', text: '为什么不在这里直接提交' },
      {
        type: 'paragraph',
        text: '选择记录只是确定「报哪条结果」；区域、工艺补充与数据质量说明必须在下一步表单中由企业确认，避免误报。',
      },
    ],
    source: '原型 pickerRecords / handlePick；mock fetchReportByRecord',
    operation: '选择核算记录',
    buttonText: '一键上报（选择弹窗）',
    selector: 'dataset.report.picker',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.picker', label: '选择核算记录弹窗', reason: '弹窗说明位置' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 上报表单 ==================== */
  {
    id: 'ann-report-submit-summary',
    title: '表单顶部：本次上报结果',
    code: 'DR-08',
    blocks: [
      { type: 'heading', text: '展示内容' },
      {
        type: 'list',
        items: [
          '产品名称 + 产品编码',
          '系统边界 + 统计期间',
          '总碳足迹大数 + `排放单位/声明单位`',
        ],
      },
      { type: 'heading', text: '取值与约束' },
      {
        type: 'list',
        items: [
          '全部来自所选核算记录的快照，**只读**，表单内不可修改。',
          '这里是「将要上报的数值」的唯一确认点；企业改区域或说明都不会改变该数值。',
          '单位不换算、不四舍五入到展示精度之外（底层保留 4 位）。',
        ],
      },
    ],
    source: '原型 ReportSubmitModal 本次上报结果卡',
    operation: '核对上报结果',
    buttonText: '本次上报结果',
    selector: 'dataset.report.submit.summary',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.submit.summary', label: '本次上报结果卡', reason: '结果确认区' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-report-submit-info',
    title: '上报信息：区域 / 工艺 / 数据质量说明',
    code: 'DR-09',
    blocks: [
      { type: 'heading', text: '所属区域（必填）' },
      {
        type: 'list',
        items: [
          '默认取「租户信息」中的企业所在地区（省 / 市 / 区），企业可修改。',
          '**提交时必须选到区县**（三级完整）；只选到省 / 市会被拦截。',
          '修改只影响**本次上报单**，不回写租户档案；改过后可点「恢复企业地址」还原。',
          '已有上报单再次打开时**沿用上次填写的区域**，不再取档案默认值。',
        ],
      },
      { type: 'heading', text: '工艺类型（条件必填）' },
      {
        type: 'list',
        items: [
          '核算记录**已填写工艺**时：不在本区出现，直接取记录值，不可在此修改。',
          '核算记录**未填写工艺**时：本区出现「待补充」标记，**至少选 1 项才能提交**；可暂存草稿。',
          '提交后工艺参与行业数据集的「按工艺」分组统计。',
        ],
      },
      { type: 'heading', text: '数据质量说明（选填）' },
      {
        type: 'list',
        items: [
          '最多 200 字，实时显示字数，接近上限（≥180）变色提醒。',
          '建议说明计量方式、数据来源与分摊口径，供平台审核与下游对标参考。',
          '说明会随记录进入行业数据集详情，企业名称不展示。',
        ],
      },
    ],
    source: '原型 ReportSubmitModal 上报信息区 / RegionCascader；mock currentEnterpriseProfile',
    operation: '填写上报信息',
    buttonText: '所属区域 / 工艺类型 / 数据质量说明',
    selector: 'dataset.report.submit.info',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.submit.info', label: '上报信息区', reason: '企业填写区' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-report-submit-record',
    title: '本次核算信息（自动带出 · 只读）',
    code: 'DR-10',
    blocks: [
      { type: 'heading', text: '展示字段与来源' },
      {
        type: 'table',
        columns: ['字段', '来源'],
        rows: [
          ['产品类别', '核算记录类别路径（缺省类别名）'],
          ['所属行业', '核算记录行业路径（缺省行业名）'],
          ['工艺类型', '核算记录工艺；记录缺失时为本次补充值'],
          ['核算标准', '核算记录标准编号 + 名称，缺失显示「—」'],
          ['系统边界', '核算记录边界中文文案'],
          ['统计时间', '核算结果统计期间起止'],
          ['生命周期阶段构成', '核算记录阶段值：阶段 / 排放量 / 占比（二级阶段缩进展示）'],
        ],
      },
      { type: 'heading', text: '规则' },
      {
        type: 'list',
        items: [
          '整区**只读核对**，不提供编辑入口：数据以核算结果为准，报错应回核算项目重算后重新上报。',
          '阶段构成仅在核算记录有阶段值时出现；无阶段值时不显示表格，只上报总值。',
          '占比取核算结果自带值，不在上报环节重算。',
        ],
      },
    ],
    source: '原型 ReportSubmitModal 本次核算信息区',
    operation: '核对核算信息',
    buttonText: '本次核算信息',
    selector: 'dataset.report.submit.record',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.submit.record', label: '本次核算信息区', reason: '只读核对区' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-report-submit-actions',
    title: '暂存草稿 / 提交审核',
    code: 'DR-11',
    blocks: [
      { type: 'heading', text: '两个动作的差异' },
      {
        type: 'table',
        columns: ['动作', '校验', '结果'],
        rows: [
          ['暂存草稿', '只要求来源记录有效，**不强制区域完整与工艺补充**', '生成 / 更新草稿，留在列表可继续填报'],
          ['提交审核', '区域必须到区县；工艺缺失时至少补 1 项', '状态置「审核中」，进入平台审核队列，清空历史驳回原因'],
        ],
      },
      { type: 'heading', text: '提交后的约束' },
      {
        type: 'list',
        items: [
          '提交后企业**不能改数值、不能改区域与说明**；只能撤回（平台未开始审核时）或等待审核结论。',
          '同一核算记录**不允许并发多条审核中**的上报单，重复上报会被拦截。',
          '平台驳回后按驳回原因修改再提交，驳回原因在详情中可查。',
        ],
      },
      { type: 'heading', text: '失败表现' },
      {
        type: 'paragraph',
        text: '校验不通过时用轻提示说明原因并停留在表单，不清空已填内容；保存 / 提交过程中按钮进入 loading，防止重复点击。',
      },
    ],
    source: '原型 handleSave / createReportFromRecord、submitReport 校验分支',
    operation: '暂存 / 提交',
    buttonText: '暂存草稿 / 提交审核',
    selector: 'dataset.report.submit.actions',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dataset.report.submit.actions', label: '暂存草稿 / 提交审核', reason: '表单提交动作' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-report-detail',
    title: '上报详情抽屉',
    code: 'DR-12',
    blocks: [
      { type: 'heading', text: '内容结构' },
      {
        type: 'list',
        ordered: true,
        items: [
          '顶部：产品名称 + 状态标签；副标题为上报编号与来源核算记录编号',
          '提示条：数据已更新（stale）说明，或已驳回的驳回原因',
          '总碳足迹：数值 + 单位',
          '上报信息（自动提取）：上报编号、来源记录与核算次数、类别、行业、工艺、核算标准、系统边界、统计期间、声明单位、区域（含大区）、提交时间、审核人、审核时间',
          '阶段构成：阶段 / 排放值 / 占比；无阶段数据提示「仅参与总值统计」',
          '数据质量说明：未填显示「未填写」',
          '流转轨迹：时间 + 操作人 + 动作说明（创建 / 提交 / 撤回 / 驳回 / 入库 / 重新上报）',
          '状态进度：草稿 → 审核中 → 已入库，驳回单独标记',
        ],
      },
      { type: 'heading', text: '底部动作' },
      {
        type: 'paragraph',
        text: '仅草稿、已驳回、或已入库且 stale 时出现底部按钮，分别为「继续填报 / 修改后重报 / 重新上报」；审核中与正常已入库无按钮。',
      },
      { type: 'heading', text: '只读性' },
      {
        type: 'paragraph',
        text: '抽屉内所有字段**不可编辑**；需要修改只能走表单（草稿 / 驳回 / 重新上报）。',
      },
    ],
    source: '原型 ReportDetailDrawer / dataReportMeta.flowIndex',
    operation: '查看详情',
    buttonText: '查看',
    selector: 'dataset.report.detail',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dataset.report.detail', label: '上报详情抽屉', reason: '详情内容区' }],
    global: false,
    priority: 'medium',
  },
]

/** 全局批注（文档级说明，进入本模块「全局批注」抽屉） */
export const dataReportGlobalAnnotations: Annotation[] = [
  {
    id: 'gann-report-flow',
    title: '企业上报流程图（端到端 + 状态机）',
    code: 'GDR-01',
    blocks: [
      {
        type: 'paragraph',
        text: '从「核算完成」到「行业数据集可见」的完整链路，以及上报单自身的状态流转。**审核入库不等于企业可见**，必须由平台发布版本后才进入行业数据集。',
      },
      { type: 'heading', text: '端到端流程' },
      {
        type: 'flow',
        caption: '企业数据上报端到端流程（企业 → 平台审核 → 公共数据库 → 行业数据集）',
        chart: `flowchart TD
  A["碳足迹核算完成<br/>核算项目 = 已完成"] --> B["数据管理 · 企业数据上报"]
  B --> C["一键上报：选择核算记录"]
  C --> D{"该记录是否已有审核中上报单"}
  D -->|是| D1["拦截：正在审核中，禁止重复上报"]
  D -->|否| E["填写上报信息<br/>所属区域 · 工艺补充 · 数据质量说明"]
  E --> F{"企业动作"}
  F -->|暂存草稿| G["草稿"]
  F -->|提交审核| H["审核中"]
  G -->|提交并校验通过| H
  H -->|平台未开始审核 · 企业撤回| G
  H --> I{"平台审核结论"}
  I -->|驳回并填写原因| J["已驳回"]
  J -->|修改后重报| E
  I -->|通过并入库 · 按原值脱敏| K["已入库"]
  K --> L["公共数据库 · 待发版数据"]
  L -->|发布新版本| M["当前发布版本快照"]
  L -->|回滚历史版本| M
  M --> N["行业数据集 · 数据 Tab 可见"]
  M --> O["行业数据集 · 统计分析 参与计算"]
  K --> P{"来源核算记录是否已重算"}
  P -->|是| Q["标记：数据已更新，请重新上报"]
  Q -->|重新上报| E`,
      },
      { type: 'heading', text: '上报单状态机' },
      {
        type: 'flow',
        caption: '上报单状态机（草稿 / 审核中 / 已驳回 / 已入库）',
        chart: `stateDiagram-v2
  state "草稿" as S1
  state "审核中" as S2
  state "已驳回" as S3
  state "已入库" as S4
  [*] --> S1: 暂存草稿
  [*] --> S2: 填写完整直接提交
  S1 --> S2: 提交审核
  S2 --> S1: 企业撤回 · 平台未开始审核
  S2 --> S3: 平台驳回
  S2 --> S4: 平台通过并入库
  S3 --> S2: 修改后重新提交
  S4 --> S2: 来源记录重算后重新上报
  S1 --> [*]: 删除草稿
  S4 --> [*]: 记录保留 · 只可重新上报`,
      },
      { type: 'heading', text: '三个关键约束' },
      {
        type: 'list',
        items: [
          '**数值只读**：全程不允许企业在任何环节修改碳足迹数值，只补充区域 / 工艺 / 说明。',
          '**入库不发布**：审核通过只是进入待发版池，企业看不到；发版后行业数据集才更新。',
          '**重报更新原记录**：已入库记录重算后重新上报，审核通过是更新原记录，不新增一条重复数据。',
        ],
      },
    ],
    source: '原型 DataReportListPage / ReportSubmitModal / mock dataReport 全链路',
    operation: '文档级说明（端到端流程）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    unmatchedReason: '端到端流程跨企业端与平台端多个页面，无唯一页面锚点，放入全局批注。',
  },
  {
    id: 'gann-report-caliber',
    title: '上报口径与跨模块边界',
    code: 'GDR-02',
    blocks: [
      { type: 'heading', text: '上报数据口径' },
      {
        type: 'list',
        items: [
          '只上报**结果快照**：总碳足迹 + 阶段排放 + 标签；不含活动数据、因子、模型与计算过程。',
          '数值与单位沿用核算结果，**不换算、不做二次舍入**；展示最多 4 位小数去尾零。',
          '标签（类别 / 行业 / 工艺 / 边界 / 期间 / 声明单位 / GWP / 标准）取自核算记录；仅「工艺」在记录缺失时允许企业补充。',
          '所属区域取「省 / 市 / 区」三级，进入行业数据集后**统一按省级上卷**参与筛选与分组。',
        ],
      },
      { type: 'heading', text: '脱敏规则' },
      {
        type: 'paragraph',
        text: '入库时企业名称替换为「某{大区}地区企业」，不展示企业真实名称、联系人、组织标识；行业数据集只保留区域与行业等对标标签。',
      },
      { type: 'heading', text: '模块边界' },
      {
        type: 'table',
        columns: ['模块', '关系'],
        rows: [
          ['碳足迹核算', '**上游**：提供已核算结果；上报不改动核算项目与结果'],
          ['数据审核（平台）', '**下游**：只读核对，只能通过入库或驳回，不提供标准化编辑'],
          ['公共数据库（平台）', '**下游**：入库数据在此等待发版 / 回滚'],
          ['行业数据集', '**最终消费方**：只读当前发布版本，参与统计'],
        ],
      },
      { type: 'heading', text: '权限与数据域' },
      {
        type: 'paragraph',
        text: '企业只能看到并上报**本组织**的核算记录；平台审核看到跨企业的上报单，但入库后对企业侧只暴露脱敏标签。',
      },
    ],
    source: '原型 ReportSubmitModal / 数据审核页面注释；行业数据集 datasetMeta.provinceOf',
    operation: '文档级说明（上报口径与边界）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    unmatchedReason: '跨模块口径与权限说明，无唯一页内锚点。',
  },
  {
    id: 'gann-report-pending',
    title: '待确认事项（尚未裁决，不作为需求依据）',
    code: 'GDR-03',
    blocks: [
      { type: 'heading', text: '待裁决问题' },
      {
        type: 'list',
        ordered: true,
        items: [
          '暂存草稿是否也要求区域选到区县（原型草稿不校验，提交才校验）。',
          '「提交」是否需要在行内直接提交（原型无二次确认），还是统一回到表单确认。',
          '审核中是否允许企业补充数据质量说明（原型完全锁定）。',
          '同一核算记录是否允许同时存在多条上报单（原型以「审核中」作为唯一拦截条件）。',
          '已入库记录在来源重算后，是「重新上报更新原记录」还是「新增一条并保留旧记录」——当前实现为更新原记录。',
          '区域是否允许企业填写与租户档案不同的地址（原型允许且不回写档案），风控上是否需要限制。',
          '上报是否需要附依据文件（当前只能填文字说明，无附件上传）。',
          '平台驳回是否需要提供原因模板与必选分类（当前为自由文本且必填）。',
        ],
      },
    ],
    source: '原型现状比对 / 数据审核与行业数据集口径',
    operation: '文档级说明（待确认）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '待确认事项',
    unmatchedReason: '尚未裁决的问题清单，不混入正式业务规则。',
  },
  {
    id: 'gann-report-mock',
    title: '数据性质（原型演示数据）',
    code: 'GDR-04',
    blocks: [
      {
        type: 'paragraph',
        text: '上报单、核算记录、企业档案与审核轨迹均取自内置演示数据（内存态，刷新后回到初始状态）；企业地址取固定演示租户档案，不接真实组织服务。',
      },
      {
        type: 'paragraph',
        text: '正式实现需按当前登录用户所属组织取数、补数据权限过滤、补失败重试与并发提交保护，并由平台审核动作驱动真实状态流转。',
      },
    ],
    source: '原型 mock/dataReport.ts',
    operation: '文档级说明（演示数据）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
]
