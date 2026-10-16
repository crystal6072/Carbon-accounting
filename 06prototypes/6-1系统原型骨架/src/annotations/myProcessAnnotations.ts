import type { Annotation } from './types'

/**
 * 我的工艺库（前台 P09）批注数据。
 * - 全局批注（`myProcessGlobalAnnotations`）：整体流程 / 全局规则，进入「全局批注」抽屉；
 * - 行内批注（`myProcessAnnotations`）：锚定到页面元素，元素旁显示「注」标记，点击查看。
 * 锚点（data-ann-target）已埋在列表 / 详情 / 引用弹窗对应位置；新增 / 编辑表单复用后台
 * 「工艺流程」表单（`ProcessFormPage` `scope="frontend"`），其 `process.*` 锚点直接复用。
 * 业务口径基准：《我的工艺库业务 PRD》V0.1（2026-10-16 业务确认）：无使用状态维度、
 * 工艺来源二态（引用后台工艺只读 / 自己新增可编辑）、「复制成新的」取消、无版本化。
 */

const matched: Annotation[] = [
  {
    id: 'P09-03',
    code: 'P09-03',
    title: '工艺来源（二态，决定可编辑 / 可删除）',
    source: '§1.3',
    category: '业务状态说明',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.detail.source',
    global: false,
    content:
      '工艺来源标识工艺进入本模块的方式，是**决定可编辑性与可删除性的唯一依据**（无使用状态维度）：**引用后台工艺 = 从平台级（PUBLIC）只读指向、不落库**，全字段只读、无编辑 / 删除入口（不渲染 disabled 假入口）；**自己新增 = 组织从零自建**，可查看 / 编辑 / 删除。来源由新增入口决定、创建后不可变更；列表不单列来源，靠操作入口区分（引用项仅查看、自己新增有编辑 / 删除）。',
  },
  {
    id: 'P09-04',
    code: 'P09-04',
    title: '工艺列表',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.list',
    global: false,
    content:
      '列表展示本组织全部工艺（引用后台工艺只读 + 自己新增可维护，统一混排）。展示列：工艺流程编码、工艺流程名称、适用产品分类、所属生命周期阶段、工序数量、更新时间、操作。适用产品分类被后台禁用时附「已禁用」标识。操作列：「查看」对全部工艺展示；「编辑」「删除」仅为「自己新增」展示（引用后台工艺不展示）。工具条提示「引用后台工艺只读、自己新增可维护」，提供「导出」（原型模拟 Toast）。',
    matchTargets: [
      { selector: 'my-process.list', label: '工艺列表', reason: '清单表格区域' },
      { selector: 'my-process.export', label: '导出', reason: '工具条导出按钮' },
    ],
  },
  {
    id: 'P09-05',
    code: 'P09-05',
    title: '查询与重置',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.query',
    global: false,
    content:
      '查询项：工艺流程编码（包含匹配、忽略大小写）、工艺流程名称（包含匹配）、适用产品分类（级联，选中父级命中其下全部子级）。三条件叠加过滤；任一条件变化回到第 1 页；「重置」清空并恢复完整清单。点「搜索」为显式触发入口，输入即即时收敛、结果一致。是否补充「工艺来源」筛选项待确认（与我的产品库口径一致）。',
  },
  {
    id: 'P09-06',
    code: 'P09-06',
    title: '新增工艺（方式二选一）',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.add',
    global: false,
    content:
      '点「新增」弹出二选一弹窗：「引用后台工艺」= 从平台级工艺流程库（PUBLIC、仅启用中）批量引用（只读指向，不可编辑 / 删除，可用性随后台）；「新增工艺流程」= 从零新建组织自建工艺（基本信息 + 工序链装配）。「复制成新的」已取消（与我的产品库口径一致）。点「取消」或关闭弹窗不产生任何变更。',
  },
  {
    id: 'P09-07',
    code: 'P09-07',
    title: '引用后台工艺（批量只读引用）',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.reference',
    global: false,
    content:
      '从平台级工艺流程库（PUBLIC、仅启用中）勾选引用到本组织。引用 = **只读指向平台级工艺（不落库）**：引用后在本模块可见且只读，不可编辑 / 删除，可用性随后台工艺流程库。已引用的置灰不可重复引用。支持「引用所选工艺（N）」与「全部引用」；引用成功提示「引用成功：共 N 条」，重复引用提示跳过条数。',
    matchTargets: [
      { selector: 'my-process.reference', label: '引用后台工艺弹窗', reason: '批量引用弹窗提示区 / 列表' },
      { selector: 'my-process.reference-choice', label: '引用后台工艺（新增二选一）', reason: '新增弹窗中的引用项' },
    ],
  },
  {
    id: 'P09-08',
    code: 'P09-08',
    title: '新增工艺流程（表单页）',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'process.form.root',
    global: false,
    content:
      '从零建立组织自建工艺：复用后台「工艺流程」新增 / 编辑表单（`scope="frontend"`），保证操作口径一致。填写基本信息（编码 / 名称 / 适用产品分类 / 所属行业 / 所属生命周期阶段必填，描述选填）→ 在「工序明细」画布 / 列表装配工序 → 保存。系统带出工艺来源 = 自己新增；保存后提示「保存成功」并跳转详情页，默认可编辑。',
    matchTargets: [
      { selector: 'process.form.root', label: '新增 / 编辑表单', reason: '表单根容器' },
      { selector: 'process.page.global', label: '新增工艺流程（标题）', reason: '表单页标题' },
    ],
  },
  {
    id: 'P09-09',
    code: 'P09-09',
    title: '编辑工艺',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.edit',
    global: false,
    content:
      '仅「自己新增」可编辑；引用后台工艺无入口（不渲染假入口）。打开编辑页（复用新增表单）带出现有内容，修改后保存即直接覆盖（不版本化、无审核）。被产品工艺组合引用后，产品侧已复制副本不受影响（模板 + 引用即复制口径）。',
    matchTargets: [
      { selector: 'my-process.edit', label: '编辑', reason: '列表行 / 详情页头「编辑」' },
    ],
  },
  {
    id: 'P09-10',
    code: 'P09-10',
    title: '工序明细维护（画布 / 列表）',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.detail.process',
    global: false,
    content:
      '为工艺装配有序的工序链（至少 1 道）；本模块只引用、不新增工序定义，仅做装配与排序。点「+ 添加工序」或节点间「+」插入，下拉选「工序」（仅启用中）；支持鼠标拖拽节点调整顺序、节点「×」/ 行「删除」删除后顺序自动重排。工序顺序按画布节点自动生成（连续不重复）；**同一工序允许重复出现**（以序号区分）。工序的投入 / 产出随工序带出并**只读展示**，维护归属「工序管理」。支持画布 / 列表两种模式与全屏；选中节点或点工序名可「查看工序」只读详情。',
    matchTargets: [
      { selector: 'my-process.detail.process', label: '工序明细（详情）', reason: '详情页工序明细卡片' },
      { selector: 'process.form.canvas', label: '工序明细画布（表单）', reason: '新增 / 编辑表单内画布' },
    ],
  },
  {
    id: 'P09-11',
    code: 'P09-11',
    title: '保存与工序链校验',
    source: '§1.4',
    category: '对应业务规则',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'process.form.save',
    global: false,
    priority: 'high',
    content:
      '保存先校验必填（编码 / 名称 / 适用产品分类 / 所属行业 / 所属生命周期阶段、工序明细至少 1 道且每行已选工序），任一不通过即阻断并高亮；编码跨「我的工艺库 + 后台工艺流程库」查重。三条工序链校验均为**提示级、不阻断保存**：首道投入宜含原辅料 / 能源 / 自然资源输入、末道产出应含「成品」、相邻工序按物料对象（引用编码）逐对校验衔接（空即「衔接断点」）。保存中按钮显示「保存中…」防重复提交。',
    matchTargets: [
      { selector: 'process.form.save', label: '保存', reason: '表单底栏主按钮' },
      { selector: 'my-process.detail.check', label: '工序链校验提示（详情）', reason: '详情页工序链校验提示区' },
    ],
  },
  {
    id: 'P09-12',
    code: 'P09-12',
    title: '删除工艺',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.delete',
    global: false,
    priority: 'high',
    content:
      '仅「自己新增」可删除（二次确认）；引用后台工艺只读、无删除入口。二次确认提示「删除后不可恢复」；确认后提示「删除成功」，列表或详情页返回刷新。删除为终态、不可恢复。',
    matchTargets: [
      { selector: 'my-process.delete', label: '删除', reason: '列表行 / 详情页头「删除」' },
    ],
  },
  {
    id: 'P09-13',
    code: 'P09-13',
    title: '查看工艺详情',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.detail',
    global: false,
    content:
      '只读核对工艺完整定义与引用情况：基本信息（编码 / 名称 / 适用产品分类 / 所属行业 / 所属生命周期阶段 / 工艺来源 / 是否含处置工序 / 制单信息 / 描述）、工序明细（画布 / 列表）、操作日志。引用后台工艺额外提示「只读项：不可编辑 / 删除」。自己新增展示「编辑 / 删除」，引用后台工艺仅「返回列表」。本页只读，除页头操作外不产生变更。',
    matchTargets: [
      { selector: 'my-process.detail', label: '工艺详情', reason: '详情页根容器' },
      { selector: 'my-process.row.view', label: '查看 / 编码', reason: '列表行查看或编码链接' },
    ],
  },
  {
    id: 'P09-14',
    code: 'P09-14',
    title: '查看工序详情',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.viewop',
    global: false,
    content:
      '只读核对某道工序的完整信息（仅该工序，不含工艺级状态 / 制单信息）：工序编码、工序名称、工序类型、工序描述；投入项 / 产出项（流类型 / 物料 / 单位 / 排放物类别 / 备注）。不展示使用状态与制单信息；**列表视图与详情均不含「计算公式」列**（保持精简）。弹窗只读。',
    matchTargets: [
      { selector: 'my-process.viewop', label: '查看工序', reason: '画布节点 / 列表工序名按钮' },
    ],
  },
  {
    id: 'P09-15',
    code: 'P09-15',
    title: '操作日志',
    source: '§1.4',
    category: '操作功能',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.detail.log',
    global: false,
    content:
      '仅「自己新增」展示本组织操作日志（引用后台工艺为只读项，无本组织编辑痕迹，不展示日志）。列：时间、操作人、操作、说明；默认折叠，点标题展开 / 收起，每页 5 条。原型中为演示数据，正式实现按真实操作记录生成。',
    matchTargets: [
      { selector: 'my-process.detail.log', label: '操作日志', reason: '详情页操作日志卡片' },
    ],
  },
  {
    id: 'P09-16',
    code: 'P09-16',
    title: '工艺流程编码',
    source: '§1.5',
    category: '字段说明',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'process.form.code',
    global: false,
    content:
      '工艺的唯一业务标识，用于清单展示、核对与追溯。手工填写（提示「如 GY-08」），新增可填、编辑只读。必填；为空提示「请输入工艺流程编码」并阻断保存。在「我的工艺库 + 后台工艺流程库」范围内唯一，新增与编辑保存都校验，重复提示「工艺流程编码已存在（含后台工艺流程库），请修改后重试」。作为列表进入详情页的链接。',
  },
  {
    id: 'P09-17',
    code: 'P09-17',
    title: '工艺流程名称',
    source: '§1.5',
    category: '字段说明',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'process.form.name',
    global: false,
    content: '工艺的业务名称，用户识别的主要依据。手工填写，必填；为空提示「请输入工艺流程名称」并阻断保存。**允许重复**，靠编码唯一区分。',
  },
  {
    id: 'P09-19',
    code: 'P09-19',
    title: '适用产品分类',
    source: '§1.5',
    category: '字段说明',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'process.form.category',
    global: false,
    content:
      '本工艺适用的产品分类范围，用于检索与分类展示。级联下拉选择（支持搜索）；列表查询选中父级命中其下全部子级。仅可选「启用」中的分类（已禁用置灰）。必填；为空提示「请选择适用产品分类」并阻断保存。**说明性字段，不构成引用约束**（仅作检索与分类展示）。',
  },
  {
    id: 'P09-20',
    code: 'P09-20',
    title: '所属行业',
    source: '§1.5',
    category: '字段说明',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'process.form.industry',
    global: false,
    content: '工艺所属行业，用于匹配行业阶段基线与核算模型。引用行业库（门类 / 大类 / 中类 / 小类四级）级联选择，必填；为空提示「请选择所属行业」并阻断保存。',
  },
  {
    id: 'P09-21',
    code: 'P09-21',
    title: '所属生命周期阶段',
    source: '§1.5',
    category: '字段说明',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'process.form.lifecycle',
    global: false,
    content: '工艺归属的生命周期阶段（如原材料获取、生产制造等）。引用生命周期阶段库下拉选择，必填；为空提示「请选择所属生命周期阶段」并阻断保存。',
  },
  {
    id: 'P09-22',
    code: 'P09-22',
    title: '工艺流程描述',
    source: '§1.5',
    category: '字段说明',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'process.form.description',
    global: false,
    content: '工艺的补充说明。多行文本，选填；详情页为空显示「-」。',
  },
  {
    id: 'P09-23',
    code: 'P09-23',
    title: '工序数量 / 是否含处置工序',
    source: '§1.5',
    category: '字段说明',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.detail.basic',
    global: false,
    content:
      '均为系统计算、不进表单：**工序数量** = 明细工序道数（列表与详情展示）；**是否含处置工序** = 明细是否含「处置」类工序，用于阶段归属提示（详情展示）。',
  },
  {
    id: 'P09-25',
    code: 'P09-25',
    title: '制单信息',
    source: '§1.5',
    category: '字段说明',
    matchStatus: 'matched',
    matchType: 'exact',
    selector: 'my-process.detail.basic',
    global: false,
    content:
      '创建人 / 创建时间由系统记录，不可维护；最后修改每次保存刷新，列表中对应「更新时间」列。原型中为演示数据，正式实现需由系统按真实操作记录生成。',
  },
]

const global: Annotation[] = [
  {
    id: 'P09-01',
    code: 'P09-01',
    title: '组织工艺维护与引用整体流程',
    source: '§1.1',
    category: '整体流程',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    content:
      '进入「我的工艺库」→ 列表展示本组织全部工艺（引用后台工艺只读 + 自己新增可维护，统一混排）→ 按需查询 / 详情核对 → 点「新增」二选一（引用只读指向 / 自建）→ 保存后（自己新增）进入列表 → 在「产品工艺组合」中被引用。**无使用状态维度**：可编辑 / 可删除完全由「工艺来源」决定，无启用 / 禁用、无审核流、无版本化；删除仅对「自己新增」开放且不可恢复。被引用后产品侧按引用时点复制副本，本模块后续修改不影响已建产品。',
  },
  {
    id: 'P09-02',
    code: 'P09-02',
    title: '全局规则',
    source: '§1.2',
    category: '全局规则说明',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    content:
      '适用范围：前台组织自建工艺流程维护面 + 核算人员引用面；共用后台维护的分类树，本模块只选用不维护。工艺来源二态且决定可编辑性（引用 = 只读指向、自建 = 可编辑）；「复制成新的」取消。无使用状态维度、无版本化、无审核流。编码在「我的工艺库 + 后台工艺流程库」唯一；名称允许重复；新增来源为自己新增。删除边界：仅自己新增可删（二次确认）。被产品引用时快照复制、不回写。基础库（分类 / 行业 / 生命周期 / 工序）只引用不维护，投入产出只读。权限（谁可维护 / 查看）待确认。',
  },
]

export const myProcessAnnotations: Annotation[] = matched
export const myProcessGlobalAnnotations: Annotation[] = global
export default myProcessAnnotations
