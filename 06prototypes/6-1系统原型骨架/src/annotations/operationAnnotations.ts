import type { Annotation } from './types'

/**
 * 工序功能批注数据（对齐《工序功能批注》V1.0，编号 B04-01 ~ B04-15）。
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：跨页面 / 文档级说明，进入「全局批注」抽屉。
 * 内容对应「整体流程 / 全局规则说明 / 业务状态说明 / 操作功能及业务规则 / 字段说明」五类批注。
 */
export const operationAnnotations: Annotation[] = [
  /* ==================== 整体流程 + 全局规则（功能标题附近） ==================== */
  {
    id: 'ann-op-flow',
    title: '整体流程',
    code: 'B04-01',
    blocks: [
      { type: 'paragraph', text: '维护「工序」——产品制造过程中一道具体的操作单元（含其投入物与产出物），供工艺流程组装、产品信息库建档时选用。' },
      { type: 'heading', text: '主流程' },
      {
        type: 'steps',
        items: [
          '进入工序列表',
          '按条件查询（支持按工序类型分组）',
          '查看核对',
          '新增 / 编辑（维护基本信息 + 投入项 / 产出项）',
          '用「启用 / 禁用」控制能否被工艺流程引用',
        ],
      },
      { type: 'heading', text: '衔接与结束' },
      {
        type: 'paragraph',
        text: '列表操作「查看 / 编辑」不离开本页，以弹窗完成。保存后立即生效并刷新；没有提交、审核、驳回，不做版本化；可用「删除」移除（仅禁用态可删）。',
      },
    ],
    source: '《工序功能批注》V1.0 §1.1 B04-01',
    operation: '整体流程',
    buttonText: '工序（功能标题）',
    selector: 'operation.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'operation.page.global', label: '工序', reason: '功能标题附近（全局说明入口）' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-op-global-rules',
    title: '全局规则',
    code: 'B04-02',
    blocks: [
      { type: 'heading', text: '适用范围' },
      {
        type: 'paragraph',
        text: '工序是制造过程的最小可复用单元；本身不直接参与碳排计算，碳排发生在「产品引用工序 → 复制为产品工序」之后。',
      },
      { type: 'heading', text: '可被引用条件' },
      {
        type: 'paragraph',
        text: '仅「启用」态的工序可被工艺流程 / 产品信息库选用；「禁用」态不可被新引用，已引用它的流程 / 产品与已生成的核算结果不受影响。',
      },
      { type: 'heading', text: '不记录数量' },
      {
        type: 'paragraph',
        text: '工序**不设基准数量 / 基准单位**，投入产出**不记录合计、不计算损耗**（仅作物料 / 流向 / 单位登记）。',
      },
      { type: 'heading', text: '生命周期与默认值' },
      {
        type: 'list',
        items: [
          '用「禁用」代替删除；禁用不影响它作为工序单元的结构作用。',
          '不做版本化：编辑直接覆盖，不保留历史版本。',
          '工序编码与名称必填；使用状态不在表单内改动。',
          '工序库瘦身：不引入「归属组织 / 可见性」字段，可见范围由创建主体自动判定。',
        ],
      },
      { type: 'heading', text: '权限' },
      {
        type: 'paragraph',
        text: '谁可维护、谁只能查看**尚未确定**（见全局批注「待确认事项」）。',
      },
    ],
    source: '《工序功能批注》V1.0 §1.2 B04-02',
    operation: '全局规则',
    buttonText: '工序（功能标题）',
    selector: 'operation.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'operation.page.global', label: '工序', reason: '功能标题附近（全局说明入口）' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 业务状态 ==================== */
  {
    id: 'ann-op-status',
    title: '使用状态',
    code: 'B04-03',
    blocks: [
      { type: 'heading', text: '两种状态' },
      {
        type: 'table',
        columns: ['', '启用', '禁用'],
        rows: [
          ['业务含义', '可被工艺流程 / 产品信息库选用', '不再出现在新引用中'],
          ['进入方式', '新增保存默认；或禁用态经「启用」', '启用态经「禁用」进入'],
          ['可进行的操作', '查看 / 编辑 / 禁用', '查看 / 编辑 / 启用 / 删除'],
        ],
      },
      { type: 'heading', text: '状态变化与下游影响' },
      {
        type: 'paragraph',
        text: '启用与禁用**双向可达、可反复切换**。禁用后新流程 / 产品不能再选它；已引用该工序的工艺流程与已生成的核算结果不受影响；含有该禁用工序的工艺流程详情会给出黄色提示条。',
      },
    ],
    source: '《工序功能批注》V1.0 §1.3 B04-03',
    operation: '使用状态',
    buttonText: '使用状态（清单列）',
    selector: 'operation.col.status',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'operation.col.status', label: '使用状态（清单列）', reason: '状态展示位置' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 列表 / 查询 ==================== */
  {
    id: 'ann-op-list',
    title: '列表与查询',
    code: 'B04-04',
    blocks: [
      { type: 'heading', text: '列表列' },
      {
        type: 'paragraph',
        text: '工序编码（链接）、工序名称、工序类型、使用状态、更新时间、操作。',
      },
      { type: 'heading', text: '查询项' },
      {
        type: 'list',
        items: [
          '工序编码（包含匹配）、工序名称（包含匹配）、工序类型、使用状态。',
          '多条件叠加，任一变化回到第 1 页；「重置」清空全部条件。',
        ],
      },
      { type: 'heading', text: '按工序类型分组 / 导出' },
      {
        type: 'list',
        items: [
          '列表提供「按工序类型分组」开关，开启后按 主 / 辅 / 处置 分块展示（不分页）。',
          '列表提供「导出」按钮（原型 toast 模拟）。',
        ],
      },
      { type: 'heading', text: '操作列' },
      {
        type: 'paragraph',
        text: '查看 / 编辑恒显；启用态多出「禁用」，禁用态多出「启用 + 删除」。',
      },
    ],
    source: '《工序功能批注》V1.0 §1.4 B04-04',
    operation: '列表 / 查询',
    buttonText: '列表 / 查询区',
    selector: 'operation.page.list',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.page.list', label: '列表区', reason: '清单表格区域' },
      { selector: 'operation.query.bar', label: '查询区', reason: '查询条件区域' },
      { selector: 'operation.group', label: '按工序类型分组', reason: '分组开关' },
    ],
    global: false,
    priority: 'medium',
  },

  /* ==================== 表单 / 子表 / 校验 / 联动 ==================== */
  {
    id: 'ann-op-form',
    title: '新增 / 编辑工序表单',
    code: 'B04-05',
    blocks: [
      { type: 'heading', text: '入口' },
      { type: 'paragraph', text: '页头「新增」，或在详情页点「编辑」。' },
      { type: 'heading', text: '表单字段' },
      {
        type: 'list',
        items: [
          '工序编码（新增可填、编辑只读）。',
          '工序名称（必填）。',
          '工序类型（必填：主 / 辅 / 处置）。',
          '工序图标（选填，本地上传）。',
          '工序描述（选填）。',
        ],
      },
      { type: 'heading', text: '不进表单' },
      { type: 'paragraph', text: '使用状态、制单信息、投入产出（子表内维护）。' },
      { type: 'heading', text: '保存结果' },
      { type: 'paragraph', text: '保存成功提示「保存成功」，列表刷新；编码唯一校验。' },
    ],
    source: '《工序功能批注》V1.0 §1.4 B04-05',
    operation: '新增 / 编辑',
    buttonText: '新增 / 编辑',
    selector: 'operation.form.root',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.root', label: '表单', reason: '新增 / 编辑表单容器' },
      { selector: 'operation.add', label: '新增', reason: '新增入口' },
      { selector: 'operation.row.edit', label: '编辑', reason: '行操作「编辑」' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-op-subtable',
    title: '投入项 / 产出项子表',
    code: 'B04-06',
    blocks: [
      { type: 'heading', text: '列定义' },
      {
        type: 'list',
        items: [
          '投入项：序号、流类型、物料、单位、备注。',
          '产出项：序号、流类型、物料、单位、排放物类别、备注。',
        ],
      },
      { type: 'heading', text: '填写规则' },
      {
        type: 'list',
        items: [
          '流类型：投入项可选 原料 / 能源 / 中间品 等；产出项可选 产品 / 中间品 / 排放物 等。',
          '排放物类别：仅产出项且流类型为「排放物」时必选。',
        ],
      },
      { type: 'heading', text: '计算公式（待补）' },
      {
        type: 'callout',
        text: '公式下沉为已确认设计（引用计算引擎配置·计算公式 08），系统按流类型 / 名称关键词默认带出、可覆盖或「不参与计算」；**但原型（表单 / 详情 / 列表 / 查看工序弹窗）均未实现该列，待补充**（见全局批注「待确认事项」Q26）。',
      },
    ],
    source: '《工序功能批注》V1.0 §1.4 B04-06',
    operation: '投入项 / 产出项',
    buttonText: '投入项 / 产出项',
    selector: 'operation.form.input',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.input', label: '投入项', reason: '表单子表' },
      { selector: 'operation.form.output', label: '产出项', reason: '表单子表' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-op-validate',
    title: '校验规则',
    code: 'B04-07',
    blocks: [
      { type: 'heading', text: '校验（任一不通过即阻断保存，已填内容保留）' },
      {
        type: 'list',
        items: [
          '产出项 ≥ 1。',
          '每行须填写齐全（流类型 / 物料 / 单位等）。',
          '流类型为「排放物」时须选排放物类别。',
          '投入 + 产出合并判重（相同 流类型 + 物料 视为重复）。',
        ],
      },
      { type: 'heading', text: '禁止自身闭环' },
      { type: 'paragraph', text: '投入与产出不能形成自身物料闭环（校验拦截）。' },
      { type: 'heading', text: '取消' },
      { type: 'paragraph', text: '点「取消」或关闭不保存任何内容。' },
    ],
    source: '《工序功能批注》V1.0 §1.4 B04-07',
    operation: '保存 / 取消',
    buttonText: '保存 / 取消',
    selector: 'operation.form.save',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.save', label: '保存', reason: '表单底栏主按钮' },
      { selector: 'operation.form.cancel', label: '取消', reason: '表单底栏按钮' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-op-linkage',
    title: '联动',
    code: 'B04-08',
    blocks: [
      { type: 'list', items: [
        '换物料自动带出默认单位：选择物料后，单位按物料主数据默认带出，可改。',
        '换流类型清空物料 / 单位 / 类别：流类型变更后，物料、单位、排放物类别清空重选（避免类型与物料错配）。',
      ] },
    ],
    source: '《工序功能批注》V1.0 §1.4 B04-08',
    operation: '联动',
    buttonText: '物料 / 流类型',
    selector: 'operation.form.input',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.input', label: '投入项（联动）', reason: '子表单元格' },
      { selector: 'operation.form.output', label: '产出项（联动）', reason: '子表单元格' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-op-detail',
    title: '查看工序（详情）',
    code: 'B04-09',
    blocks: [
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '工序编码、工序名称、工序类型、使用状态、工序图标、创建人、创建时间、最后修改时间、工序描述 + 投入产出表（流类型 / 物料 / 单位 / 排放物类别 / 备注）。',
      },
      { type: 'heading', text: '只读与说明' },
      {
        type: 'list',
        items: [
          '底栏「关闭 / 编辑」；**子表无「计算公式」列**（见全局批注「待确认事项」Q26）。',
          '制单信息原型为演示值（见全局批注「演示数据」）。',
        ],
      },
    ],
    source: '《工序功能批注》V1.0 §1.4 B04-09',
    operation: '查看工序',
    buttonText: '查看 / 编码链接',
    selector: 'operation.detail.body',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.detail.body', label: '详情内容', reason: '详情字段展示区域' },
      { selector: 'operation.row.view', label: '查看', reason: '行操作「查看」' },
      { selector: 'operation.detail.code', label: '编码', reason: '详情 / 列表编码链接' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-op-confirm',
    title: '启用 / 禁用 / 删除确认',
    code: 'B04-10',
    blocks: [
      { type: 'heading', text: '启用 / 禁用' },
      {
        type: 'list',
        items: [
          '启用：仅禁用态显示；二次确认 → 确认后变启用，提示「启用成功」。',
          '禁用：仅启用态显示；二次确认正文补充「禁用后，新流程 / 产品建档时不可再选择该工序；历史引用数据保留不变。」→ 确认后变禁用，提示「禁用成功」。',
        ],
      },
      { type: 'heading', text: '删除与约束' },
      {
        type: 'callout',
        text: '仅禁用态显示「删除」；二次确认（删除不可恢复）。**已引用该工序的工艺流程 > 0 时是否阻断删除待确认**（见全局批注「待确认事项」）。',
      },
      { type: 'heading', text: '取消' },
      { type: 'paragraph', text: '点「取消」或关闭，状态 / 数据不变。' },
    ],
    source: '《工序功能批注》V1.0 §1.4 B04-10',
    operation: '启用 / 禁用 / 删除',
    buttonText: '启用 / 禁用 / 删除',
    selector: 'operation.row.disable',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.row.enable', label: '启用', reason: '行操作「启用」' },
      { selector: 'operation.row.disable', label: '禁用', reason: '行操作「禁用」' },
      { selector: 'operation.row.delete', label: '删除', reason: '行操作「删除」' },
      { selector: 'operation.confirm.ok', label: '确认', reason: '二次确认弹窗' },
      { selector: 'operation.confirm.cancel', label: '取消', reason: '二次确认弹窗' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 字段说明 ==================== */
  {
    id: 'ann-op-field-code',
    title: '字段：工序编码',
    code: 'B04-11',
    blocks: [
      { type: 'paragraph', text: '工序唯一标识；**新增可填，编辑只读**。' },
      { type: 'paragraph', text: '**必填**；全平台唯一，保存校验重复；不约束编码格式。' },
    ],
    source: '《工序功能批注》V1.0 §1.5 B04-11',
    operation: '工序编码',
    buttonText: '工序编码',
    selector: 'operation.form.code',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.code', label: '工序编码（表单）', reason: '表单字段' },
      { selector: 'operation.col.code', label: '工序编码（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-op-field-name',
    title: '字段：工序名称',
    code: 'B04-12',
    blocks: [
      { type: 'paragraph', text: '工序展示名称；**必填**，为空阻断保存；名称不唯一。' },
    ],
    source: '《工序功能批注》V1.0 §1.5 B04-12',
    operation: '工序名称',
    buttonText: '工序名称',
    selector: 'operation.form.name',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.name', label: '工序名称（表单）', reason: '表单字段' },
      { selector: 'operation.col.name', label: '工序名称（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-op-field-type',
    title: '字段：工序类型',
    code: 'B04-13',
    blocks: [
      { type: 'paragraph', text: '取值：主 / 辅 / 处置（单选，必填）。' },
      { type: 'paragraph', text: '决定工序在制造链中的角色；「处置」类影响工艺流程「是否含处置工序」判定。' },
    ],
    source: '《工序功能批注》V1.0 §1.5 B04-13',
    operation: '工序类型',
    buttonText: '工序类型',
    selector: 'operation.form.type',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.type', label: '工序类型（表单）', reason: '表单字段' },
      { selector: 'operation.col.type', label: '工序类型（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-op-field-icon',
    title: '字段：工序图标',
    code: 'B04-14',
    blocks: [
      { type: 'paragraph', text: '工序的可视化图标，便于列表 / 画布识别；**选填**，本地上传（原型为本地预览，不落库到远端）；列表不展示图标列。' },
    ],
    source: '《工序功能批注》V1.0 §1.5 B04-14',
    operation: '工序图标',
    buttonText: '工序图标',
    selector: 'operation.form.icon',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.icon', label: '工序图标（表单）', reason: '表单字段' },
      { selector: 'operation.detail.icon', label: '工序图标（详情）', reason: '详情字段' },
    ],
    global: false,
    priority: 'low',
  },
  {
    id: 'ann-op-field-desc',
    title: '字段：工序描述',
    code: 'B04-15',
    blocks: [
      { type: 'paragraph', text: '工序补充说明；**选填**长文本，为空显示「-」。' },
    ],
    source: '《工序功能批注》V1.0 §1.5 B04-15',
    operation: '工序描述',
    buttonText: '工序描述',
    selector: 'operation.form.description',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.description', label: '工序描述（表单）', reason: '表单字段' },
      { selector: 'operation.detail.desc', label: '工序描述（详情）', reason: '详情字段' },
    ],
    global: false,
    priority: 'low',
  },
]

/** 全局批注（跨页面 / 文档级说明，进入右下角「全局批注」抽屉） */
export const operationGlobalAnnotations: Annotation[] = [
  {
    id: 'gann-op-todo',
    title: '待确认事项（尚未裁决，不作为需求依据）',
    blocks: [
      { type: 'heading', text: '待裁决问题' },
      {
        type: 'list',
        ordered: true,
        items: [
          '工序投入 / 产出子表是否补「计算公式」列（Q26，公式下沉已确认但原型未实现）',
          '工序被工艺流程引用（引用数 > 0）时是否阻断删除（R-013\'）',
          '工艺参数 / 标准作业时长本期不做，是否完全移除（Q-工艺参数）',
          '谁可维护工序、谁只能查看（角色 / 权限，P-01）',
          '工序数据是否按组织隔离可见范围（P-02）',
        ],
      },
    ],
    source: '《工序功能批注》V1.0 §4.1',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '待确认事项',
    unmatchedReason: '尚未裁决的问题清单，不混入正式业务规则，统一在全局批注中提示。',
  },
  {
    id: 'gann-op-mock',
    title: '数据性质（原型演示数据）',
    blocks: [
      {
        type: 'paragraph',
        text: '本页数据为原型演示数据：工序为内存态，刷新后回到初始状态；制单信息为演示值。',
      },
      { type: 'paragraph', text: '正式实现需由系统按真实数据与真实操作记录生成。' },
    ],
    source: '《工序功能批注》V1.0 §0 / §1.4',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
]
