import type { Annotation } from './types'

/**
 * 文件管理功能批注数据（对齐《文件管理功能批注》）。
 * 复用标准文件库页面（src/pages/standard），锚点前缀统一为 file.*；路由 /basic/file。
 * - matched：锚定到页面元素；- global：跨页面 / 文档级说明，进入「全局批注」抽屉。
 */
export const fileAnnotations: Annotation[] = [
  /* ==================== 模块定位 ==================== */
  {
    id: 'ann-file-global',
    title: '模块定位',
    code: 'FM-01',
    blocks: [
      { type: 'heading', text: '统一管理两类文件' },
      {
        type: 'paragraph',
        text: '文件管理统一管理「标准」与「单据」两类文件：标准为核算模型绑定的标准依据；单据为核算 / 报告 / 核查的业务凭证。本期不支持引用情况反查、版本对比、版本回滚、单版本删除、批量操作、导出。',
      },
      { type: 'heading', text: '维护形态' },
      {
        type: 'list',
        items: [
          '列表页（按文件类型查询）+ 独立新增 / 编辑页 + 独立详情页 + 预览弹窗 + 删除确认弹窗。',
          '每份文件有「文件版本」子对象：每次上传 = 一个版本，不覆盖、不删除历史版本。',
        ],
      },
    ],
    source: '《文件管理功能批注》§1.1 FM-01',
    operation: '模块定位',
    buttonText: '文件管理',
    selector: 'file.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'file.page.global', label: '文件管理', reason: '功能标题' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 列表与列 ==================== */
  {
    id: 'ann-file-list',
    title: '文件列表与列说明',
    code: 'FM-05',
    blocks: [
      { type: 'heading', text: '展示内容' },
      {
        type: 'list',
        items: [
          '文件类型（Tag：标准 / 单据 / 其他）、文件名称（链接进详情）、业务编号（标准取标准号、单据取单据编号，其余为 -）、创建人、当前版本（V1/V2 或 -）、最近更新、操作。',
          '每页 10 条；空值统一展示 -；编码 / 单号等宽字体。',
        ],
      },
      { type: 'heading', text: '业务编号列口径' },
      {
        type: 'paragraph',
        text: '业务编号 = 标准号（standard）/ 单据编号（document）/ 其他为 -；与「文件名称」同为该记录的检索键。',
      },
      { type: 'heading', text: '待核对（与原型差异）' },
      {
        type: 'callout',
        text: '字段清单 §4 设计「类型 Tab（全部 / 标准 / 单据）+ 按 Tab 自适应列」，原型当前为单列表 + 文件类型下拉过滤，列集也不同（原型含「创建人」「业务编号」列）；分页原型为 10 条、文档写 20 条。需确认是否按文档补齐 Tab（见全局批注「需原型同步调整」）。',
      },
    ],
    source: '《文件管理功能批注》§1.4 FM-05',
    operation: '文件列表',
    buttonText: '文件列表',
    selector: 'file.page.list',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'file.page.list', label: '文件列表', reason: '列表表格区域' },
      { selector: 'file.col.type', label: '文件类型', reason: '列头' },
      { selector: 'file.col.name', label: '文件名称', reason: '列头' },
      { selector: 'file.col.bizNo', label: '业务编号', reason: '列头' },
      { selector: 'file.col.creator', label: '创建人', reason: '列头' },
      { selector: 'file.col.version', label: '当前版本', reason: '列头' },
      { selector: 'file.col.updated', label: '最近更新', reason: '列头' },
    ],
    global: false,
    priority: 'medium',
  },

  /* ==================== 查询 ==================== */
  {
    id: 'ann-file-query',
    title: '查询与重置',
    code: 'FM-06',
    blocks: [
      { type: 'heading', text: '查询项' },
      {
        type: 'list',
        items: [
          '文件名称：模糊匹配。',
          '文件类型：下拉（全部 / 标准 / 单据 / 其他），不选即全部。',
        ],
      },
      { type: 'heading', text: '过滤规则' },
      {
        type: 'list',
        items: [
          '两项条件同时生效、叠加过滤；任一变化后列表回到第 1 页。',
          '「重置」清空全部条件；「搜索」显式触发一次筛选。',
        ],
      },
      { type: 'heading', text: '待核对（与原型差异）' },
      {
        type: 'callout',
        text: '字段清单 §4.4 设计按 Tab 自适应的查询（标准：标准号 / 名称 / 状态；单据：单据编号 / 类型 / 业务日期区间 / 出具单位），原型当前仅「名称 + 类型」。需确认是否补回（见全局批注「需原型同步调整」）。',
      },
    ],
    source: '《文件管理功能批注》§1.4 FM-06',
    operation: '查询 / 重置 / 搜索',
    buttonText: '搜索 / 重置',
    selector: 'file.query.bar',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'file.query.bar', label: '查询区', reason: '查询条件区域' },
      { selector: 'file.query.search', label: '搜索', reason: '同一规则引用' },
      { selector: 'file.query.reset', label: '重置', reason: '同一规则引用' },
    ],
    global: false,
    priority: 'medium',
  },

  /* ==================== 新增 ==================== */
  {
    id: 'ann-file-add',
    title: '新增文件',
    code: 'FM-02',
    blocks: [
      { type: 'heading', text: '入口与前提' },
      {
        type: 'paragraph',
        text: '列表右上「新增」进入 /basic/file/new；**必须先选文件类型**才能展开后续表单卡片（D02：类型创建后不可改）。',
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存成功生成文件编码与 V1（若有文件），提示「保存成功」并跳转详情页；保存中按钮显示「保存中…」。点「取消」或离开页面不产生版本。',
      },
    ],
    source: '《文件管理功能批注》§1.2 FM-02',
    operation: '新增文件',
    buttonText: '新增',
    selector: 'file.add',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'file.add', label: '新增', reason: '列表右上新增入口' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 行操作 ==================== */
  {
    id: 'ann-file-row',
    title: '列表行操作（查看 / 编辑 / 删除）',
    code: 'FM-04',
    blocks: [
      { type: 'heading', text: '查看 / 编辑' },
      {
        type: 'paragraph',
        text: '文件名称链接、「查看」「编辑」均可进入详情 / 编辑页；编辑页文件类型只读。',
      },
      { type: 'heading', text: '删除' },
      {
        type: 'paragraph',
        text: '点击「删除」打开二次确认弹窗，确认后删除整条记录（含全部版本），不可恢复（D14）。',
      },
    ],
    source: '《文件管理功能批注》§1.4 FM-04',
    operation: '行操作',
    buttonText: '查看 / 编辑 / 删除',
    selector: 'file.row.view',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'file.row.view', label: '查看', reason: '行操作' },
      { selector: 'file.row.edit', label: '编辑', reason: '行操作' },
      { selector: 'file.row.delete', label: '删除', reason: '行操作' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 删除确认 ==================== */
  {
    id: 'ann-file-confirm',
    title: '删除二次确认',
    code: 'FM-08',
    blocks: [
      { type: 'heading', text: '语义化按钮' },
      {
        type: 'paragraph',
        text: '正文：「删除后该文件及其全部 N 个版本将一并移除，且不可恢复。确认删除？」底栏「取消」+「确认删除」（危险色）。禁止「确定」字样。',
      },
    ],
    source: '《文件管理功能批注》§1.4 FM-08',
    operation: '删除确认',
    buttonText: '取消 / 确认删除',
    selector: 'file.confirm.ok',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'file.confirm.ok', label: '确认删除', reason: '确认弹窗主按钮' },
      { selector: 'file.confirm.cancel', label: '取消', reason: '确认弹窗取消按钮' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 详情页 ==================== */
  {
    id: 'ann-file-detail',
    title: '文件详情',
    code: 'FM-04',
    blocks: [
      { type: 'heading', text: '展示' },
      {
        type: 'paragraph',
        text: '标题 = 文件名称；副标题 = 业务编号 + 文件类型。基本信息按类型渲染；版本记录表展示当前版本与历史版本（含预览 / 下载）。制单信息固定置底。',
      },
      { type: 'heading', text: '页头操作' },
      {
        type: 'list',
        items: [
          '返回列表（次）→ 删除（次）→ 编辑（主）。',
          '本期不展示「引用情况反查」入口。',
        ],
      },
    ],
    source: '《文件管理功能批注》§1.4 FM-04',
    operation: '文件详情',
    buttonText: '删除 / 编辑 / 版本记录',
    selector: 'file.detail.title',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'file.detail.title', label: '详情标题', reason: '详情页标题' },
      { selector: 'file.detail.edit', label: '编辑', reason: '详情页编辑入口' },
      { selector: 'file.detail.delete', label: '删除', reason: '详情页删除入口' },
      { selector: 'file.detail.versions', label: '版本记录', reason: '版本记录卡片' },
    ],
    global: false,
    priority: 'medium',
  },

  /* ==================== 表单：保存/取消 ==================== */
  {
    id: 'ann-file-save',
    title: '表单的保存与取消',
    code: 'FM-03',
    blocks: [
      { type: 'heading', text: '保存' },
      {
        type: 'list',
        items: [
          '点击后先校验，通过则保存：新增生成编码 + V1；编辑若上传新文件则生成 V(n+1) 并置当前，否则仅更新元数据、版本号不变。',
          '保存中按钮显示「保存中…」并暂时不可点击。',
        ],
      },
      { type: 'heading', text: '校验（任一不通过即阻断保存）' },
      {
        type: 'list',
        items: [
          '未选类型 →「请选择文件类型」；公共必填（文件名称等）缺失 →「请输入…」。',
          '标准：标准号唯一（D03）、实施日期 ≥ 发布日期（D05）、来源链接合法 URL（D06）、来源链接与文件二选一（D04）。',
          '单据：单据编号同租户唯一（D07）、单据类型必选（D08）、单据至少 1 个文件（D07）。',
        ],
      },
      { type: 'heading', text: '取消' },
      {
        type: 'paragraph',
        text: '点「取消」或返回不保存任何内容；再次打开不保留上次填写。',
      },
    ],
    source: '《文件管理功能批注》§1.4 FM-03',
    operation: '保存 / 取消',
    buttonText: '保存 / 取消',
    selector: 'file.form.save',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'file.form.save', label: '保存', reason: '表单底栏主按钮' },
      { selector: 'file.form.cancel', label: '取消', reason: '表单底栏按钮' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 表单字段 ==================== */
  {
    id: 'ann-file-field-type',
    title: '字段：文件类型 / 文件编码',
    code: 'FM-10',
    blocks: [
      { type: 'heading', text: '文件类型（D02）' },
      {
        type: 'paragraph',
        text: '归属类型：标准 / 单据 / 其他（本期固定两级）。**新增必选；创建后不可修改**——切换类型会导致字段体系与历史数据不一致。',
      },
      { type: 'heading', text: '文件编码（D01）' },
      {
        type: 'paragraph',
        text: '文件唯一业务标识，系统生成、创建后不可修改；编辑态只读展示。',
      },
    ],
    source: '《文件管理功能批注》§1.5 FM-10',
    operation: '文件类型 / 文件编码',
    buttonText: '文件类型 / 文件编码',
    selector: 'file.form.type',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'file.form.type', label: '文件类型', reason: '表单字段' },
      { selector: 'file.form.code', label: '标准号（含文件编码语义）', reason: '标准类型唯一键字段' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-file-field-standard',
    title: '标准类型专有字段',
    code: 'FM-11',
    blocks: [
      { type: 'heading', text: '必填口径' },
      {
        type: 'list',
        items: [
          '标准号（唯一，D03）、中文标准名称、标准状态、发布日期、实施日期、发布单位。',
          '英文标准名称、主管部门、归口部门、来源链接选填。',
        ],
      },
      { type: 'heading', text: '关键约束' },
      {
        type: 'list',
        items: [
          '标准状态为**录入框（自由文本）**，常用「现行 / 被替代 / 作废」，新建默认「现行」；核算模型引用准入按「标准状态 = 现行」判定。',
          '实施日期 ≥ 发布日期（D05）；来源链接须为 http/https（D06）；来源链接与版本文件二选一（D04）。',
        ],
      },
      { type: 'heading', text: '名称联动' },
      {
        type: 'paragraph',
        text: '标准类型的「文件名称」默认取「中文标准名称」，二者可单独改。',
      },
    ],
    source: '《文件管理功能批注》§1.5 FM-11',
    operation: '标准信息',
    buttonText: '标准号 / 状态 / 名称 / 日期 / 来源链接',
    selector: 'file.form.status',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'file.form.code', label: '标准号', reason: '标准专有字段' },
      { selector: 'file.form.status', label: '标准状态', reason: '标准专有字段' },
      { selector: 'file.form.nameZh', label: '中文标准名称', reason: '标准专有字段' },
      { selector: 'file.form.nameEn', label: '英文标准名称', reason: '标准专有字段' },
      { selector: 'file.form.publishDate', label: '发布日期', reason: '标准专有字段' },
      { selector: 'file.form.implementDate', label: '实施日期', reason: '标准专有字段' },
      { selector: 'file.form.publisher', label: '发布单位', reason: '标准专有字段' },
      { selector: 'file.form.sourceUrl', label: '来源链接', reason: '标准专有字段' },
      { selector: 'file.form.competentDept', label: '主管部门', reason: '标准专有字段' },
      { selector: 'file.form.responsibleDept', label: '归口部门', reason: '标准专有字段' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-file-field-document',
    title: '单据 / 其他类型专有字段',
    code: 'FM-12',
    blocks: [
      { type: 'heading', text: '单据类型必填口径（D07 / D08）' },
      {
        type: 'list',
        items: [
          '文件名称、单据编号（同租户唯一）、单据类型（引用数据字典启用项）、业务日期、出具单位（选填）。',
          '单据至少 1 个文件（D07）；允许补录历史日期，不得晚于当天。',
        ],
      },
      { type: 'heading', text: '其他类型' },
      {
        type: 'paragraph',
        text: '仅文件名称（必填）+ 文件说明（选填）；至少 1 个文件。',
      },
      { type: 'heading', text: '关联对象（Q02）' },
      {
        type: 'callout',
        text: '字段清单含「关联对象类型 / 关联对象」，本期仅落库、不开放选择（UI 置灰），待 P1 再开。',
      },
    ],
    source: '《文件管理功能批注》§1.5 FM-12',
    operation: '单据信息',
    buttonText: '文件名称 / 单据编号 / 单据类型 / 业务日期 / 出具单位',
    selector: 'file.form.name',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'file.form.name', label: '文件名称', reason: '单据 / 其他专有字段' },
      { selector: 'file.form.docNo', label: '单据编号', reason: '单据专有字段' },
      { selector: 'file.form.docType', label: '单据类型', reason: '单据专有字段' },
      { selector: 'file.form.bizDate', label: '业务日期', reason: '单据专有字段' },
      { selector: 'file.form.issueOrg', label: '出具单位', reason: '单据专有字段' },
      { selector: 'file.form.desc', label: '文件说明', reason: '其他类型字段' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-file-field-version',
    title: '字段：文件版本（版本区）',
    code: 'FM-13',
    blocks: [
      { type: 'heading', text: '版本规则（D09 / D10 / D11）' },
      {
        type: 'list',
        items: [
          '每次上传生成新版本号（+1，系统自增、不可手填）；同一文件「是否当前版本」有且仅有一条（取最大版本号）。',
          '历史版本不可编辑、不可单独删除，仅可预览与下载（D11）。',
          '标准可仅填来源链接（0 个版本）；单据 / 其他必须至少 1 个文件。',
        ],
      },
      { type: 'heading', text: '格式与大小（§2.4 / D13）' },
      {
        type: 'list',
        items: [
          '标准：PDF / 图片（≤50MB）；单据另支持 Excel / Word（≤20MB）。',
          '上传按 MIME / 魔数二次校验，防止改后缀绕过。',
        ],
      },
      { type: 'heading', text: '预览与下载（D15）' },
      {
        type: 'paragraph',
        text: '预览：PDF / 图片在线渲染，Office / 其他提示下载；下载与预览须鉴权 + 审计，对外披露类加水印（原型未接入下载，提示由附件管理鉴权后下发）。',
      },
    ],
    source: '《文件管理功能批注》§1.5 FM-13',
    operation: '文件版本',
    buttonText: '版本记录 / 上传新版本',
    selector: 'file.form.versions',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'file.form.versions', label: '文件版本', reason: '版本区卡片' }],
    global: false,
    priority: 'high',
  },
]

/** 全局批注（跨页面 / 文档级说明，进入右下角「全局批注」抽屉） */
export const fileGlobalAnnotations: Annotation[] = [
  {
    id: 'gann-file-type-matrix',
    title: '类型驱动显隐矩阵',
    code: 'FM-23',
    blocks: [
      { type: 'heading', text: '标准 / 单据差异' },
      {
        type: 'table',
        columns: ['元素', '标准', '单据'],
        rows: [
          ['信息卡片', '标准信息（标准号 / 名称 / 状态 / 日期 / 单位 / 来源链接）', '单据信息（单据编号 / 类型 / 业务日期 / 出具单位）'],
          ['允许格式', 'PDF、图片（≤50MB）', 'PDF、图片、Excel、Word（≤20MB）'],
          ['版本', '可 0 个（仅来源链接）', '至少 1 个'],
          ['数据域', '平台级（全租户可见）', '所属租户（跨租户不可见）'],
        ],
      },
    ],
    source: '《文件管理功能批注》§1.3 FM-23',
    operation: '类型驱动显隐',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    unmatchedReason: '跨记录的类型差异说明，无唯一操作目标。',
  },
  {
    id: 'gann-file-domain',
    title: '权限与数据域',
    code: 'FM-24',
    blocks: [
      {
        type: 'paragraph',
        text: '数据域（D12）：标准 = 平台级（全租户只读可见）；单据 = 所属租户（跨租户不可见）。删除为整条删除（含全部版本），二次确认（D14）。',
      },
      {
        type: 'paragraph',
        text: '预览 / 下载须鉴权 + 审计（人、时间、IP），对外披露类加水印（D15）。',
      },
    ],
    source: '《文件管理功能批注》§1.3 FM-24',
    operation: '权限 / 数据域',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    unmatchedReason: '权限类说明，无唯一操作目标。',
  },
  {
    id: 'gann-file-todo',
    title: '待确认事项（尚未裁决，不作为需求依据）',
    code: 'FM-25',
    blocks: [
      { type: 'heading', text: '待裁决问题' },
      {
        type: 'list',
        ordered: true,
        items: [
          '单据是否需要「作废」状态（Q01，本期不设，用删除替代）。',
          '单据是否本期开放「关联对象」选择（Q02，本期只落库不开放）。',
          '一个单据多附件时拆记录还是一条多文件（Q03，本期拆记录）。',
          '标准「换年份」用新记录还是新版本（Q04，本期新记录）。',
          '单据类型走数据字典还是固定枚举（Q05，本期数据字典）。',
          '单据是否允许跨租户共享（Q06，本期不允许）。',
          '是否增加「其他」兜底值（Q07，本期不加）。',
          '列表是否需要「最近更新」列 / 「仅看有版本」筛选（Q01/Q04 衍生）。',
        ],
      },
    ],
    source: '《文件管理功能批注》§4.1 FM-25',
    operation: '文档级说明',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '待确认事项',
    unmatchedReason: '尚未裁决的问题清单，不混入正式业务规则。',
  },
  {
    id: 'gann-file-sync',
    title: '需原型同步调整（文档与原型差异）',
    code: 'FM-26',
    blocks: [
      { type: 'heading', text: '列表 / 查询差异' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Demo / 字段清单设计了「类型 Tab（全部 / 标准 / 单据）+ 按 Tab 自适应列」，原型当前为单列表 + 文件类型下拉过滤、列集不同（原型含创建人 / 业务编号列）。',
          '字段清单 §4.4 设计分 Tab 的查询项（标准：标准号 / 名称 / 状态；单据：单据编号 / 类型 / 业务日期区间 / 出具单位），原型仅「名称 + 类型」。',
          '分页：文档写每页 20 条，原型为 10 条。',
          '列表列：文档按 Tab 分列（含文件编码 / 标准号等），原型统一用「业务编号」并增「创建人」列。',
        ],
      },
      { type: 'heading', text: '需补齐的能力' },
      {
        type: 'list',
        items: ['本期不做（原型也未提供）：引用反查、版本对比、版本回滚、单版本删除、批量操作、导出。'],
      },
    ],
    source: '《文件管理功能批注》§4.2 FM-26',
    operation: '文档级说明',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '待确认事项',
    unmatchedReason: '原型与文档的不一致点，需研发 / 产品对齐。',
  },
  {
    id: 'gann-file-mock',
    title: '数据性质（原型演示数据）',
    code: 'FM-27',
    blocks: [
      {
        type: 'paragraph',
        text: '本页数据为原型演示数据（内存态）；制单信息为演示值；下载未接入，提示由附件管理鉴权后下发。正式实现需由系统按真实数据与操作记录生成。',
      },
    ],
    source: '《文件管理功能批注》§0 FM-27',
    operation: '文档级说明',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
]
