import type { Annotation } from './types'

/**
 * 我的工序库（产品碳足迹 · 工艺库 / 组织自建工序）批注数据。
 * - 行内批注（`myOperationAnnotations`）：selector / matchTargets = `data-ann-target` 锚点，元素旁显示「注」标记；
 * - 全局批注（`myOperationGlobalAnnotations`）：文档级说明，进入「全局批注」抽屉。
 *
 * 口径来源：
 * - 《我的工艺库字段清单》§1.2（两个并列主对象：工艺流程 / 工序）、《整体设计方案》§2.3 B3-3 / B3-4；
 * - 后台《工序业务 PRD》《工序功能批注》（工序结构：基本信息 + 投入项 / 产出项，不填数量）；
 * - 本次原型业务裁定（2026-11-10）：**从平台选择 = 复制可编辑副本**（不是只读引用）、支持批量、
 *   同一平台工序可反复复制、复制后弹窗保持打开、按钮文案「确定」、列表与查看页保持精简。
 *
 * 新增 / 编辑 / 详情复用后台工序组件（`scope="frontend"`），故部分锚点为 `operation.*`。
 */

const matched: Annotation[] = [
  {
    id: 'ann-myop-flow',
    title: '模块定位与整体流程',
    code: 'MO-01',
    blocks: [
      {
        type: 'paragraph',
        text: '「我的工序库」是前台「工艺库」下与「我的工艺库（工艺流程）」并列的第二个主对象，维护本组织自建的**工序定义 + 投入项 / 产出项**，供本组织工艺流程装配引用。',
      },
      { type: 'heading', text: '主流程' },
      {
        type: 'steps',
        items: [
          '进入「我的工序库」列表（查询 / 查看）',
          '点「新增」二选一：自定义工序 / 从平台工序库选择',
          '自定义 → 进入表单填写基本信息与投入 / 产出项后保存',
          '从平台选择 → 批量勾选后点「确定」直接复制副本到列表',
          '在列表点「编辑」进入编辑页；可启用 / 禁用、删除',
        ],
      },
      {
        type: 'paragraph',
        text: '**不做版本化、无审核流**：编辑直接覆盖；删除为终态。自定义工序与平台复制副本在本模块待遇完全一致，均可增删改查。',
      },
    ],
    source: '《整体设计方案》§2.3 B3-3 / B3-4；《我的工艺库字段清单》§1.2',
    operation: '整体流程',
    buttonText: '我的工序库（功能标题）',
    selector: 'my-operation.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'my-operation.page.global', label: '我的工序库', reason: '列表页功能标题' },
    ],
    global: false,
    priority: 'high',
    category: '整体流程',
  },
  {
    id: 'ann-myop-global-rules',
    title: '全局规则',
    code: 'MO-02',
    blocks: [
      { type: 'heading', text: '数据归属' },
      {
        type: 'paragraph',
        text: '列表中的工序全部是**组织自建（ORG）数据**，仅本组织可见可维护；平台工序库为只读来源，复制后与本组织数据互不回写。',
      },
      { type: 'heading', text: '来源二态（均可编辑）' },
      {
        type: 'table',
        columns: ['来源', '产生方式', '可维护性'],
        rows: [
          ['自定义', '点「自定义工序」从零新建', '查看 / 编辑 / 启停 / 删除'],
          ['平台复制', '从平台工序库批量勾选后复制', '查看 / 编辑 / 启停 / 删除，编辑不影响平台源头'],
        ],
      },
      { type: 'heading', text: '规则边界' },
      {
        type: 'list',
        items: [
          '工序只维护「有哪些数据项」与单位，**不填数量**（数量 = 工序单耗，在核算填报阶段填写）。',
          '工序编码在本组织工序库 + 平台工序库范围内唯一；名称允许重复。',
          '仅「启用」中的工序可被新的工艺流程引用；禁用不影响已复制出去的工艺流程副本。',
          '无「归属组织 / 可见性 / 引用状态 / 版本」字段，页面也不展示规则性说明文案。',
        ],
      },
    ],
    source: '《我的工艺库字段清单》§1.2；后台《工序业务 PRD》§5',
    operation: '全局规则',
    selector: 'my-operation.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    global: false,
    priority: 'high',
    category: '全局规则说明',
  },
  {
    id: 'ann-myop-list',
    title: '工序列表',
    code: 'MO-03',
    blocks: [
      {
        type: 'paragraph',
        text: '列表展示本组织全部工序（自定义 + 平台复制副本统一混排），新增 / 复制后新记录置顶。展示列：**工序编码、工序名称、工序类型、使用状态、创建时间、更新时间、操作**。',
      },
      {
        type: 'paragraph',
        text: '按评审口径**不展示**来源、投入项、产出项；操作列为「查看 / 编辑 / 启用或禁用 / 删除」。工具条显示总条数并提供「导出」（原型模拟 Toast）。点工序编码或「查看」进入详情页。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '工序列表',
    selector: 'my-operation.list',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'my-operation.list', label: '工序列表', reason: '列表卡片区域' },
      { selector: 'my-operation.export', label: '导出', reason: '工具条导出按钮' },
      { selector: 'my-operation.row.view', label: '查看 / 工序编码', reason: '列表行编码链接' },
    ],
    global: false,
    category: '操作功能',
  },
  {
    id: 'ann-myop-query',
    title: '查询与重置',
    code: 'MO-04',
    blocks: [
      {
        type: 'paragraph',
        text: '查询项：工序编码（包含匹配、忽略大小写）、工序名称（包含匹配）、工序类型（主工序 / 辅助工序 / 处置工序）、使用状态（启用 / 禁用）。条件叠加过滤，任一条件变化回到第 1 页；「重置」清空并恢复完整清单。输入即即时收敛，「搜索」为显式触发入口，两种方式结果一致。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '查询与重置',
    buttonText: '搜索 / 重置',
    selector: 'my-operation.query',
    matchStatus: 'matched',
    matchType: 'exact',
    global: false,
    category: '操作功能',
  },
  {
    id: 'ann-myop-add',
    title: '新增工序（方式二选一）',
    code: 'MO-05',
    blocks: [
      {
        type: 'paragraph',
        text: '点「新增」展开下拉二选一：**自定义工序** = 从零新建（进入表单）；**从平台工序库选择** = 打开平台工序库弹窗批量勾选复制。点「关闭」或空白处不产生任何变更。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '新增工序',
    buttonText: '新增',
    selector: 'my-operation.add',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'my-operation.add', label: '新增', reason: '页头主按钮' },
      { selector: 'my-operation.custom', label: '自定义工序', reason: '新增下拉项' },
      { selector: 'my-operation.reference-choice', label: '从平台工序库选择', reason: '新增下拉项' },
    ],
    global: false,
    category: '操作功能',
  },
  {
    id: 'ann-myop-custom',
    title: '自定义工序（表单）',
    code: 'MO-06',
    blocks: [
      {
        type: 'paragraph',
        text: '**直接复用后台「工序」新增 / 编辑表单**（`OperationFormPage` `scope="frontend"`），保证「自定义工序」与后台操作完全一致：基本信息（编码 / 名称 / 类型 / 图标 / 描述）+ 投入项、产出项两张可维护子表。',
      },
      {
        type: 'paragraph',
        text: '前台按评审口径隐藏各类规则性说明文案，只保留字段与操作。保存后提示「保存成功」并跳转详情页；保存的工序为本组织自建数据，可被本组织工艺流程引用。',
      },
    ],
    source: '《我的工艺库字段清单》§1.2；本次原型业务裁定（2026-11-10）',
    operation: '自定义工序',
    selector: 'my-operation.custom',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'my-operation.custom', label: '自定义工序', reason: '新增下拉项' },
      { selector: 'operation.form.root', label: '新增 / 编辑表单', reason: '表单根容器' },
      { selector: 'operation.page.global', label: '新增 / 编辑工序', reason: '表单页标题' },
    ],
    global: false,
    category: '操作功能',
  },
  {
    id: 'ann-myop-reference',
    title: '平台工序库弹窗（批量选择）',
    code: 'MO-07',
    blocks: [
      { type: 'heading', text: '入口与范围' },
      {
        type: 'paragraph',
        text: '从平台级工序库（**仅启用中**的工序）中批量勾选。弹窗表格仅展示工序编码、工序名称、工序类型；不展示投入项 / 产出项 / 状态，也不展示顶部说明文案。支持关键字搜索、当前页全选、跨页保留已选、每页 6 条分页，并实时显示「已选 N 道」。',
      },
      { type: 'heading', text: '可重复选择' },
      {
        type: 'paragraph',
        text: '**同一道平台工序可以反复选择、反复复制**：不置灰、不锁定、不做去重跳过；每次都生成一份独立副本。复制完成后弹窗保持打开、清空本次勾选，可继续选择；点「关闭」返回列表查看结果。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '从平台工序库选择',
    selector: 'my-operation.reference',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'my-operation.reference', label: '平台工序库弹窗', reason: '弹窗内容区' },
      { selector: 'my-operation.reference-choice', label: '从平台工序库选择', reason: '新增下拉项' },
      { selector: 'my-operation.selection', label: '已选 N 道', reason: '搜索栏已选计数' },
    ],
    global: false,
    priority: 'high',
    category: '操作功能',
  },
  {
    id: 'ann-myop-copy-confirm',
    title: '确定（批量复制）',
    code: 'MO-08',
    blocks: [
      {
        type: 'paragraph',
        text: '弹窗底部主按钮文案为**「确定」**（评审调整：不使用「复制所选（N）」）。未勾选时禁用；点击后立即把已勾选的平台工序**直接复制**到「我的工序库」列表，不进入表单、不弹出二次确认。',
      },
      { type: 'heading', text: '复制结果' },
      {
        type: 'list',
        items: [
          '每道被选工序生成 1 份独立可编辑副本，基本信息与投入 / 产出项一并复制。',
          '副本编码自动生成并避重：`ORG-<平台编码>`，重复复制追加 `-2`、`-3`…；名称保持平台工序名称，可在编辑页修改。',
          '副本记录来源平台工序 id 便于追溯，但编辑、启停、删除都不影响平台源头及其他副本。',
          '复制期间按钮显示「复制中…」防重复提交；成功后 Toast 提示复制条数，列表即时刷新、新记录置顶。',
          '复制后弹窗保持打开并清空勾选，可继续选择（含刚才复制过的同一工序）。',
        ],
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '确定（复制所选工序）',
    buttonText: '确定',
    selector: 'my-operation.copy',
    matchStatus: 'matched',
    matchType: 'exact',
    global: false,
    priority: 'high',
    category: '对应业务规则',
  },
  {
    id: 'ann-myop-copy-rule',
    title: '引用即复制（副本口径）',
    code: 'MO-09',
    blocks: [
      {
        type: 'paragraph',
        text: '本模块「从平台选择」的语义是**复制一份到企业侧**，而不是只读引用：副本落到本组织工序库，之后可自由查看 / 编辑 / 启停 / 删除；平台工序后续变更不回写副本，副本变更也不影响平台。',
      },
      {
        type: 'paragraph',
        text: '与「我的工艺库」的引用规则不同（后者为只读指向），本模块按最新业务裁定统一为可编辑副本；两处差异以本批注为准。副本不做版本化、无审核流。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '从平台选择（复制）',
    selector: 'my-operation.list',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'my-operation.list', label: '工序列表', reason: '副本落库后的清单' },
      { selector: 'my-operation.reference', label: '平台工序库弹窗', reason: '复制入口' },
    ],
    global: false,
    priority: 'high',
    category: '业务状态说明',
  },
  {
    id: 'ann-myop-edit',
    title: '编辑工序',
    code: 'MO-10',
    blocks: [
      {
        type: 'paragraph',
        text: '列表行或详情页点「编辑」才进入编辑页（复制后不自动进入）。自定义工序与平台复制副本**均可编辑**，带出现有内容，修改后保存直接覆盖；编码在编辑态只读。',
      },
      {
        type: 'paragraph',
        text: '编辑页复用后台工序表单；保存后提示「保存成功」并跳转详情页。已被本组织工艺流程引用的工序仍可自由编辑（模板 + 引用即复制，不回写已建副本）。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '编辑',
    buttonText: '编辑',
    selector: 'my-operation.edit',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'my-operation.edit', label: '编辑', reason: '列表行操作' },
      { selector: 'operation.form.root', label: '编辑表单', reason: '表单根容器' },
    ],
    global: false,
    category: '操作功能',
  },
  {
    id: 'ann-myop-status',
    title: '启用 / 禁用',
    code: 'MO-11',
    blocks: [
      {
        type: 'paragraph',
        text: '通过行操作切换使用状态，二次确认后生效并刷新列表：**启用**后该工序可被新的工艺流程引用；**禁用**后不可被新引用，已复制出去的工艺流程副本不受影响。启用 ↔ 禁用双向可达，编辑不受状态限制。',
      },
      {
        type: 'paragraph',
        text: '与后台工序不同，本模块**删除不以「先禁用」为前置**，启用态也可直接删除（见「删除工序」批注）。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '启用 / 禁用',
    buttonText: '启用 / 禁用',
    selector: 'my-operation.status',
    matchStatus: 'matched',
    matchType: 'exact',
    global: false,
    category: '业务状态说明',
  },
  {
    id: 'ann-myop-delete',
    title: '删除工序',
    code: 'MO-12',
    blocks: [
      {
        type: 'paragraph',
        text: '自定义工序与平台复制副本均可直接删除（**无需先禁用**），行操作点「删除」后二次确认；提示「删除后不可恢复」及「若工艺流程仍引用，需在工艺流程侧调整」。确认后提示「删除成功」并刷新列表。',
      },
      {
        type: 'paragraph',
        text: '删除为终态、不可恢复；本模块不做引用校验（引用容错归工艺流程侧处理）。删除副本不影响平台源头工序。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '删除',
    buttonText: '删除',
    selector: 'my-operation.delete',
    matchStatus: 'matched',
    matchType: 'exact',
    global: false,
    priority: 'high',
    category: '操作功能',
  },
  {
    id: 'ann-myop-detail',
    title: '查看工序详情',
    code: 'MO-13',
    blocks: [
      {
        type: 'paragraph',
        text: '点工序编码或「查看」进入只读详情页：基本信息（工序编码、名称、类型、图标、创建时间、更新时间、描述）、投入项 / 产出项两张明细表、可折叠操作日志。页头提供返回列表、启用 / 禁用、删除、编辑入口。',
      },
      {
        type: 'paragraph',
        text: '按评审口径**不展示**：使用状态、工序来源、创建人、物料编码、各类规则性说明文案（版本化 / 单耗 / 引用库 / 质量平衡等）。投入产出表只展示流类型、物料名称、单位、排放物类别、备注。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '查看',
    buttonText: '查看 / 工序编码',
    selector: 'operation.detail.body',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.detail.body', label: '工序详情', reason: '详情页根容器' },
      { selector: 'my-operation.row.view', label: '查看 / 工序编码', reason: '列表行入口' },
    ],
    global: false,
    category: '操作功能',
  },
  {
    id: 'ann-myop-fields-basic',
    title: '基本信息字段',
    code: 'MO-14',
    blocks: [
      {
        type: 'table',
        columns: ['字段', '必填', '说明'],
        rows: [
          ['工序编码', '是', '手工填写，新增可填、编辑只读；在本组织工序库 + 平台工序库范围内唯一；平台复制副本由系统生成 `ORG-<平台编码>`'],
          ['工序名称', '是', '业务名称，允许重复，靠编码唯一区分'],
          ['工序类型', '是', '主工序 / 辅助工序 / 处置工序'],
          ['工序图标', '否', '选填，本地选择图片预览'],
          ['工序描述', '否', '多行文本，详情为空显示「-」'],
        ],
      },
      {
        type: 'paragraph',
        text: '工序**不设基准数量 / 基准单位**，不记录投入产出合计与损耗；数量（工序单耗）在核算填报阶段填写。',
      },
    ],
    source: '后台《工序字段清单》《工序业务 PRD》；本次原型业务裁定',
    operation: '基本信息字段',
    selector: 'operation.form.code',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.code', label: '工序编码', reason: '表单字段' },
      { selector: 'operation.form.name', label: '工序名称', reason: '表单字段' },
      { selector: 'operation.form.type', label: '工序类型', reason: '表单字段' },
      { selector: 'operation.form.icon', label: '工序图标', reason: '表单字段' },
      { selector: 'operation.form.description', label: '工序描述', reason: '表单字段' },
      { selector: 'operation.detail.code', label: '工序编码（详情）', reason: '详情字段' },
      { selector: 'operation.detail.desc', label: '工序描述（详情）', reason: '详情字段' },
    ],
    global: false,
    category: '字段说明',
  },
  {
    id: 'ann-myop-flows',
    title: '投入项 / 产出项',
    code: 'MO-15',
    blocks: [
      {
        type: 'paragraph',
        text: '两张可维护子表，只定义「有哪些数据项」及其单位，**不填数量**。投入项流类型 ∈ 原辅料 / 能源 / 自然资源（能源引用能源库、其余引用物料库）；产出项流类型 ∈ 中间产品 / 产品 / 副产品 / 废弃物 / 排放物（引用物料库），排放物须标类别（废气 / 废水 / 废渣）。',
      },
      {
        type: 'list',
        items: [
          '每行必填流类型、物料、单位；排放物类别仅对排放物必填。',
          '同一工序内「流类型 + 物料」不得重复；本工序产出的中间品不得作为本工序自身投入（禁止自身闭环）。',
          '产出项至少 1 条；单位默认取物料默认单位，可手工覆盖。',
          '详情只读表按评审口径不展示物料编码与规则性说明。',
        ],
      },
    ],
    source: '后台《工序业务 PRD》§4；本次原型业务裁定',
    operation: '投入项 / 产出项',
    selector: 'operation.form.input',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.input', label: '投入项', reason: '表单投入项卡片' },
      { selector: 'operation.form.output', label: '产出项', reason: '表单产出项卡片' },
      { selector: 'operation.detail.body', label: '详情投入 / 产出表', reason: '详情页只读展示' },
    ],
    global: false,
    priority: 'high',
    category: '对应业务规则',
  },
  {
    id: 'ann-myop-save',
    title: '保存与校验',
    code: 'MO-16',
    blocks: [
      {
        type: 'paragraph',
        text: '保存先校验必填（编码 / 名称 / 类型、产出项至少 1 条）与子表行（流类型 / 物料 / 单位 / 排放物类别、行内不重复、禁止自身闭环），不通过即阻断并高亮问题行；编码在本组织工序库与平台工序库范围内查重。',
      },
      {
        type: 'paragraph',
        text: '保存中按钮显示「保存中…」防重复提交；成功提示「保存成功」并跳转详情页。取消 / 返回不产生变更。',
      },
    ],
    source: '后台《工序业务 PRD》§5；本次原型业务裁定',
    operation: '保存',
    buttonText: '保存',
    selector: 'operation.form.save',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'operation.form.save', label: '保存', reason: '表单底栏主按钮' },
      { selector: 'operation.form.cancel', label: '取消', reason: '表单底栏取消按钮' },
    ],
    global: false,
    priority: 'high',
    category: '对应业务规则',
  },
  {
    id: 'ann-myop-link-process',
    title: '与「我的工艺库」联动',
    code: 'MO-17',
    blocks: [
      {
        type: 'paragraph',
        text: '本组织工序与平台工序一起构成「我的工艺库」新建 / 编辑工艺流程时的工序候选（同编码以本组织工序为准）。因此平台复制副本、自定义工序都能直接装配进工艺路线，工序的投入 / 产出随之带入展示。',
      },
      {
        type: 'paragraph',
        text: '仅「启用」中的工序可被新的工艺流程引用；禁用或删除后，工艺流程侧需自行调整引用（本模块不做引用校验）。',
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    operation: '工艺流程工序候选',
    selector: 'my-operation.list',
    matchStatus: 'matched',
    matchType: 'exact',
    global: false,
    category: '对应业务规则',
  },
]

const global: Annotation[] = [
  {
    id: 'gann-myop-flow',
    title: '组织工序维护整体流程',
    code: 'MO-G01',
    blocks: [
      {
        type: 'paragraph',
        text: '进入「我的工序库」→ 查询 / 查看核对 → 点「新增」二选一（自定义工序 / 从平台工序库批量选择）→ 自定义在表单维护后保存；从平台选择则勾选后点「确定」直接复制副本到列表 → 在列表点「编辑」进入编辑页按需调整 → 用启用 / 禁用控制可否被工艺流程引用 → 不再需要时删除。',
      },
      {
        type: 'paragraph',
        text: '无使用审核、无版本化；自定义与复制副本同权，均可增删改查；复制副本与平台源头互不回写。',
      },
    ],
    source: '《整体设计方案》§2.3 B3-3 / B3-4',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '整体流程',
    unmatchedReason: '跨列表 / 弹窗 / 表单 / 详情的整体流程，无唯一操作锚点。',
  },
  {
    id: 'gann-myop-diff',
    title: '与既有文档口径的差异（以本次裁定为准）',
    code: 'MO-G02',
    blocks: [
      {
        type: 'table',
        columns: ['事项', '既有文档口径', '本次原型裁定'],
        rows: [
          ['从平台选择工序', '引用标准工序 = 只读指向、不可修改', '复制可编辑副本到本组织，允许增删改查'],
          ['选择方式', '单条引用', '批量勾选、可反复选择同一工序、确定后直接复制'],
          ['列表字段', '含来源、投入项、产出项', '不展示来源 / 投入项 / 产出项，增加创建时间'],
          ['查看页', '含使用状态、创建人、物料编码、规则说明', '保持精简，均不展示'],
          ['确定按钮', '引用所选工序（N）', '文案统一为「确定」'],
        ],
      },
    ],
    source: '《我的工艺库字段清单》§1.2；本次原型业务裁定（2026-11-10）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '全局规则说明',
    unmatchedReason: '文档级差异对照，无唯一页面锚点。',
  },
  {
    id: 'gann-myop-mock',
    title: '数据性质（原型演示数据）',
    code: 'MO-G03',
    blocks: [
      {
        type: 'paragraph',
        text: '本模块数据为原型演示数据：工序为内存态，刷新页面回到初始状态；平台工序库取自后台工序种子（仅启用中项）；创建人 / 创建时间 / 更新时间为演示值，操作日志为模拟记录。正式实现需由系统按真实数据与真实操作记录生成。',
      },
    ],
    source: '《我的工艺库字段清单》§1.3',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
  {
    id: 'gann-myop-todo',
    title: '待确认事项（尚未裁决）',
    code: 'MO-G04',
    blocks: [
      {
        type: 'list',
        ordered: true,
        items: [
          '平台工序变更后，已复制副本是否需要「来源模板已更新」提示与手工同步入口。',
          '批量复制时是否允许一次性修改副本名称 / 编码（当前在编辑页逐个修改）。',
          '复制副本是否需要在操作日志中记录来源平台工序编码（当前记录来源 id 与来源方式）。',
          '本组织工序是否需要上架 / 下架口径与「我的产品库」对齐（当前沿用启用 / 禁用）。',
        ],
      },
    ],
    source: '本次原型业务裁定（2026-11-10）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    category: '待确认事项',
    unmatchedReason: '待裁决问题清单，不作为需求依据。',
  },
]

export const myOperationAnnotations: Annotation[] = matched
export const myOperationGlobalAnnotations: Annotation[] = global
export default myOperationAnnotations
