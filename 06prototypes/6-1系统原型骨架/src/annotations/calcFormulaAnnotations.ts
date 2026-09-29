import type { Annotation } from './types'

/**
 * 计算公式功能批注数据（解析自《计算公式功能批注.md》V1.1）。
 * - matched：锚定到具体操作按钮 / 操作项（selector = data-ann-target 值），按钮旁显示批注标记；
 * - unmatched / 文档级说明：统一进入「全局标注」，不硬挂页面元素。
 * 编号说明：ann-* = 可匹配批注；gann-* = 全局批注。
 */
export const calcFormulaAnnotations: Annotation[] = [
  /* ==================== 公式列表页 ==================== */
  {
    id: 'ann-list-add',
    title: '新增公式（保存口径与系统默认值）',
    content:
      '保存校验：公式名称必填（R01）、适用行业至少 1 项（R02）、公式类型必填、描述 ≤1000 字符（R10）。' +
      '保存后系统生成公式编码 `FM-{三位序号}`（取全库最大序号 + 1，不可修改），新增默认「启用」态；' +
      '结果名称（碳排放量）、结果单位（kgCO₂e）、是否支持循环求和（是）、数据归属（组织自建）由系统写入，表单不暴露。',
    source: '《计算公式功能批注》§1.3 / §2.1',
    formula: '通用（所有公式）',
    operation: '新增公式',
    buttonText: '新增公式',
    selector: 'formula.list.add',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.list.add', label: '新增公式', reason: '按钮文本精确匹配（列表页页头主按钮）' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-list-search',
    title: '查询规则（关键字 / 排序 / 分页）',
    content:
      '关键字模糊匹配公式名称 / 编码 / 表达式；列表按公式编码升序，每页 20 条；查询条件变化自动回第 1 页。' +
      '原型为前端即时过滤，「搜索」按钮仅 toast 提示（查询完成），不发起后端请求。',
    source: '《计算公式功能批注》§2.6',
    formula: '通用',
    operation: '查询',
    buttonText: '搜索',
    selector: 'formula.list.search',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.list.search', label: '搜索', reason: '按钮文本精确匹配（查询区）' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-list-reset',
    title: '重置查询条件',
    content: '清空全部查询条件（关键字 / 公式类型 / 使用状态），并回到第 1 页。',
    source: '《计算公式功能批注》§2.6',
    formula: '通用',
    operation: '重置',
    buttonText: '重置',
    selector: 'formula.list.reset',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.list.reset', label: '重置', reason: '按钮文本精确匹配（查询区）' }],
    global: false,
    priority: 'low',
  },
  {
    id: 'ann-list-export',
    title: '导出（原型模拟）',
    content: '原型为模拟导出：toast 提示「导出任务已创建，共 N 条」，不产出文件。',
    source: '《计算公式功能批注》§2.6 / §3.1',
    formula: '通用',
    operation: '导出',
    buttonText: '导出',
    selector: 'formula.list.export',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.list.export', label: '导出', reason: '按钮文本精确匹配（工具栏）' }],
    global: false,
    priority: 'low',
  },
  {
    id: 'ann-list-view',
    title: '查看公式详情',
    content: '跳转公式详情页；任何使用状态下均可查看（查看 / 试算不受状态限制）。',
    source: '《计算公式功能批注》§3.1',
    formula: '通用',
    operation: '查看',
    buttonText: '查看 / 公式名称',
    selector: 'formula.list.view',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'formula.list.view', label: '查看（行内操作）', reason: '按钮文本精确匹配' },
      { selector: 'formula.list.view', label: '公式名称（列表首列链接）', reason: '同操作，两处入口共用锚点' },
    ],
    global: false,
    priority: 'low',
  },
  {
    id: 'ann-list-edit',
    title: '编辑公式（无审核、无版本化，直接覆盖）',
    content:
      '公式不做审核流程、不做版本化（R11）：任何状态均可直接编辑，保存为直接覆盖；' +
      '变更不追溯已核算的历史结果，需按新口径重算时走项目侧回退重算。编辑页回填全部既有字段。',
    source: '《计算公式功能批注》§2.4 / §3.1',
    formula: '通用',
    operation: '编辑',
    buttonText: '编辑',
    selector: 'formula.list.edit',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.list.edit', label: '编辑（行内操作）', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-list-disable',
    title: '禁用公式（软停用）',
    content:
      '仅「启用」态显示该操作；二次确认后生效。禁用后公式不再作为建模时的绑定候选，' +
      '已绑定的历史配置保留（R21）；如需删除请先禁用。',
    source: '《计算公式功能批注》§2.4 / §3.7 / §4',
    formula: '通用',
    operation: '禁用',
    buttonText: '禁用',
    selector: 'formula.list.disable',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.list.disable', label: '禁用（行内操作）', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-list-enable',
    title: '启用公式（双向可达）',
    content: '仅「禁用」态显示该操作；二次确认后生效。启用后公式可重新作为建模时的绑定候选，启用 ↔ 禁用双向可达。',
    source: '《计算公式功能批注》§4 / §3.7',
    formula: '通用',
    operation: '启用',
    buttonText: '启用',
    selector: 'formula.list.enable',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.list.enable', label: '启用（行内操作）', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-list-delete',
    title: '删除公式（仅禁用态、不可恢复）',
    content:
      '仅「已禁用」公式可删除（R13）：物理删除、不可恢复；启用态由服务端兜底拦截并提示「请先禁用该公式，再执行删除」。' +
      '删除弹窗提示：建模侧若仍有绑定，请先在建模中解除（历史绑定保留 R21）。',
    source: '《计算公式功能批注》§2.4 / §3.7',
    formula: '通用',
    operation: '删除',
    buttonText: '删除',
    selector: 'formula.list.delete',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.list.delete', label: '删除（行内操作）', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 公式新增 / 编辑页 ==================== */
  {
    id: 'ann-form-save',
    title: '保存（校验规则汇总 R01–R10）',
    content:
      '校验口径：名称必填、适用行业 ≥1 项、公式类型必选、描述 ≤1000 字符；' +
      '数据因素至少 1 项、名称非空且唯一（R03/R04）；因子类必须选择引用对象（R05）、常量类必须填值（R06）、非因子类必须填单位（R07）；' +
      '计算表达式只能由已定义因素与 + - * / ( ) [ ] % 组成且括号闭合（R08/R09）。' +
      '多处未通过 toast「请先完善必填项」；因素级错误汇总展示在「算法配置」区顶部。保存后跳转公式详情。',
    source: '《计算公式功能批注》§2.1 / §2.2 / §2.3',
    formula: '通用',
    operation: '保存',
    buttonText: '保存',
    selector: 'formula.form.save',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.form.save', label: '保存（页底主按钮）', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-form-cancel',
    title: '取消（不保存任何数据）',
    content: '返回上一页（浏览器回退），表单内未保存的内容（含拼接中的表达式草稿）全部丢弃，不产生任何数据。',
    source: '《计算公式功能批注》§3.2',
    formula: '通用',
    operation: '取消',
    buttonText: '取消',
    selector: 'formula.form.cancel',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.form.cancel', label: '取消（页头）', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-form-expr-config',
    title: '配置计算公式（点选生成，不可手写）',
    content:
      '计算表达式为只读输入，必须通过「配置」弹窗用键盘与数据因素标签点选拼接（R08/R09），不允许手写；' +
      '表达式只能使用已定义的数据因素名称与 + - * / ( ) [ ] %，且括号必须闭合。',
    source: '《计算公式功能批注》§2.3',
    formula: '通用',
    operation: '配置计算公式',
    buttonText: '配置',
    selector: 'formula.form.exprConfig',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.form.exprConfig', label: '配置（计算公式行右侧）', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 配置计算公式弹窗 ==================== */
  {
    id: 'ann-expr-confirm',
    title: '确定（回写表达式）',
    content: '将弹窗内拼接的表达式回写至表单；此处不做校验，校验发生在「保存」与「试算」环节。',
    source: '《计算公式功能批注》§3.4',
    formula: '通用',
    operation: '确定',
    buttonText: '确定',
    selector: 'formula.expr.confirm',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.expr.confirm', label: '确定（弹窗底部主按钮）', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-expr-tools',
    title: '清空 / 删除 / 撤销 / 取消',
    content:
      '删除：优先整体删除末尾的数据因素名称，否则删除末位字符；撤销：逐步回退拼接历史；清空：表达式置空；' +
      '取消：关闭弹窗并丢弃本次拼接。因素标签仅展示已维护且非空名称的数据因素。',
    source: '《计算公式功能批注》§3.4',
    formula: '通用',
    operation: '清空 / 删除 / 撤销 / 取消',
    buttonText: '清空 / 删除 / 撤销 / 取消',
    selector: 'formula.expr.tools',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'formula.expr.clear', label: '清空', reason: '按钮文本精确匹配' },
      { selector: 'formula.expr.delete', label: '删除', reason: '按钮文本精确匹配' },
      { selector: 'formula.expr.undo', label: '撤销', reason: '按钮文本精确匹配' },
      { selector: 'formula.expr.cancel', label: '取消（弹窗底部）', reason: '同弹窗操作项' },
    ],
    global: false,
    priority: 'low',
  },

  /* ==================== 数据因素编辑器 ==================== */
  {
    id: 'ann-factor-add',
    title: '添加字段（默认变量行）',
    content: '追加 1 行默认「变量」因素，命名唯一化（重名自动追加序号）；数据因素至少 1 项（R03），删除到 0 项将阻断保存。',
    source: '《计算公式功能批注》§2.2 / §3.3',
    formula: '通用',
    operation: '添加字段',
    buttonText: '+ 添加字段',
    selector: 'formula.factor.add',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.factor.add', label: '+ 添加字段', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-factor-delete',
    title: '删除因素行（无二次确认）',
    content: '立即删除该行，无二次确认；最终受「至少 1 项数据因素」约束（R03）。',
    source: '《计算公式功能批注》§3.3 / §2.2',
    formula: '通用',
    operation: '删除因素行',
    buttonText: '删除',
    selector: 'formula.factor.delete',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.factor.delete', label: '删除（因素行右侧）', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-factor-type',
    title: '切换因素类型（常量 / 变量 / 因子）',
    content:
      '常量 / 变量 / 因子三类行内下拉可互切，切换即重置该行取值字段并按新类型重命名；' +
      '活动数据行（系统默认首行）类型固定不可切换；预置数据中的「参数（运行时填入）」行以固定标签展示、不开放切换。',
    source: '《计算公式功能批注》§2.2 / §3.3',
    formula: '通用',
    operation: '切换因素类型',
    buttonText: '行类型下拉',
    selector: 'formula.factor.type',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.factor.type', label: '行类型下拉', reason: '控件精确匹配（因素行首位）' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-factor-pick',
    title: '选择因子（数值 / 单位自动带出）',
    content:
      '选择引用对象后：数值 = 因子值、单位 = 因子复合单位（如 kgCO₂e/kWh），只读不可手改；未选引用对象保存阻断（R05）。' +
      '因素名称仍为默认名（因子 / 因子N）时同步改为因子名称（唯一化），已自定义则不覆盖。',
    source: '《计算公式功能批注》§2.2',
    formula: '通用',
    operation: '选择因子',
    buttonText: '请选择因子',
    selector: 'formula.factor.pick',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.factor.pick', label: '因子选择下拉', reason: '控件精确匹配（因子行）' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 公式详情页 ==================== */
  {
    id: 'ann-detail-back',
    title: '返回列表',
    content: '跳转公式列表页（/model/calc-engine）。',
    source: '《计算公式功能批注》§3.5',
    formula: '通用',
    operation: '返回列表',
    buttonText: '返回列表',
    selector: 'formula.detail.back',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.detail.back', label: '返回列表', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'low',
  },
  {
    id: 'ann-detail-test',
    title: '试算（3 项校验 + 样例入参，不落库）',
    content:
      '打开试算弹窗：完整性校验 3 项（R22：表达式合法性 / 数据因素完整性 / 结果单位为碳排放量单位）→ 手填样例入参 → 执行试算。' +
      '试算为前端即时计算，不落库、不生成试算记录、不影响公式数据。',
    source: '《计算公式功能批注》§2.5 / §3.5',
    formula: '通用',
    operation: '试算',
    buttonText: '试算',
    selector: 'formula.detail.test',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.detail.test', label: '试算', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-detail-edit',
    title: '编辑（与列表页同口径）',
    content: '同列表页「编辑」：无审核无版本化（R11），任何状态可直接编辑、直接覆盖，变更不追溯历史结果。',
    source: '《计算公式功能批注》§3.5',
    formula: '通用',
    operation: '编辑',
    buttonText: '编辑',
    selector: 'formula.detail.edit',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.detail.edit', label: '编辑', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-detail-status',
    title: '禁用 / 启用 / 删除（详情页）',
    content:
      '与列表行操作同口径：禁用仅启用态可见、启用仅禁用态可见、删除仅禁用态可见（R13）；均走二次确认。' +
      '差异：删除成功后跳转列表页，其余操作刷新当前详情。',
    source: '《计算公式功能批注》§3.5',
    formula: '通用',
    operation: '禁用 / 启用 / 删除',
    buttonText: '禁用 / 启用 / 删除',
    selector: 'formula.detail.status',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'formula.detail.disable', label: '禁用', reason: '按钮文本精确匹配' },
      { selector: 'formula.detail.enable', label: '启用', reason: '按钮文本精确匹配' },
      { selector: 'formula.detail.delete', label: '删除', reason: '按钮文本精确匹配' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 试算弹窗 ==================== */
  {
    id: 'ann-test-exec',
    title: '执行试算（入参与输出口径）',
    content:
      '活动数据 / 变量手填样例入参（多值以英文逗号分隔，按 Σ 求和处理）；因子 / 常量自动带出、只读。' +
      '入参为空或非数值时红条提示（「样例入参不能为空 / 须为数值」）；试算结果按 4 位小数展示 + 结果单位。',
    source: '《计算公式功能批注》§2.5 / §3.6',
    formula: '通用',
    operation: '执行试算',
    buttonText: '执行试算',
    selector: 'formula.testRun.execute',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'formula.testRun.execute', label: '执行试算', reason: '按钮文本精确匹配' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 操作确认弹窗 ==================== */
  {
    id: 'ann-confirm',
    title: '操作确认弹窗（启用 / 禁用 / 删除共用）',
    content:
      '所有状态类操作均走二次确认。提示口径——禁用：「禁用后公式不再作为建模时的绑定候选，已绑定的历史配置保留；如需删除请先禁用」；' +
      '启用：「启用后可重新作为建模绑定候选，启用 ↔ 禁用双向可达」；删除：「删除后不可恢复；仅已禁用公式可删除，建模侧若仍有绑定请先在建模中解除」。',
    source: '《计算公式功能批注》§3.7',
    formula: '通用',
    operation: '确认 / 取消',
    buttonText: '确认启用 / 确认禁用 / 确认删除',
    selector: 'formula.confirm.ok',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'formula.confirm.ok', label: '确认启用 / 确认禁用 / 确认删除', reason: '按钮文本精确匹配' },
      { selector: 'formula.confirm.cancel', label: '取消（确认弹窗）', reason: '同弹窗操作项' },
    ],
    global: false,
    priority: 'medium',
  },

  /* ==================== 全局标注（未匹配 / 文档级） ==================== */
  {
    id: 'gann-01',
    title: '功能定位与复用原则',
    content:
      '计算公式是轻量算法配置对象，只回答「一类计算项怎么算」：不记录适用模型 / 适用生命周期阶段，可跨阶段、跨模型复用；' +
      '「算在哪」由核算模型的公式绑定承担。不做审核流程、不做版本化，编辑为直接覆盖，变更不追溯已核算的历史结果。',
    source: '《计算公式功能批注》§1.1',
    formula: '通用',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    unmatchedReason: '跨模块 / 文档级定位说明，无法对应到唯一操作按钮。',
  },
  {
    id: 'gann-02',
    title: '系统自动维护字段（表单不暴露）',
    content:
      '公式编码 `FM-{序号}`（保存后生成、不可改）、结果名称 = 碳排放量、结果单位 = kgCO₂e、是否支持循环求和 = 是、' +
      '数据归属 = 组织自建、归属组织（原型固定）、使用状态新增默认「启用」、制单信息（创建 / 更新人与时间）；' +
      '是否允许负值结果：新建固定「否」，编辑按历史值保留。',
    source: '《计算公式功能批注》§1.3',
    formula: '通用',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    unmatchedReason: '系统字段总表，覆盖新增 / 编辑 / 详情多处，无唯一操作目标。',
  },
  {
    id: 'gann-03',
    title: '上下游关系（引用，不重复定义）',
    content:
      '适用行业引用行业库（至少 1 项）；数据因素「因子」类引用排放因子库 / 能源库 / 物料库，数值与单位由库带出；' +
      '仅「启用」公式可被核算模型绑定，公式禁用 / 删除后历史绑定行保留。',
    source: '《计算公式功能批注》§1.4',
    formula: '通用',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    unmatchedReason: '跨模块引用关系说明，非单一页面操作。',
  },
  {
    id: 'gann-04',
    title: '状态机说明（启用 / 禁用 / 删除）',
    content:
      '两态 + 终态：启用（初始态 / 新增默认）⇄ 禁用（软停用、双向可达）；删除仅禁用态可达（物理删除、不可恢复）。' +
      '状态变更只刷新状态、更新人、更新时间，不改动公式算法内容；编辑不受状态限制。',
    source: '《计算公式功能批注》§4',
    formula: '通用',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    unmatchedReason: '状态机为跨页面规则总览，非单一按钮操作。',
  },
  {
    id: 'gann-05',
    title: '列表列口径（页面级）',
    content:
      '当前列表列：公式名称（点击进详情）、公式编码、公式类型、适用行业、数据因素（N 项）、使用状态、更新时间、操作；' +
      '不再展示「计算公式」「结果单位」两列（两者仍可按表达式关键字检索）。',
    source: '《计算公式功能批注》§2.6',
    formula: '通用',
    operation: '页面级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    unmatchedReason: '页面列布局说明，非操作类批注。',
  },
  {
    id: 'gann-06',
    title: '关联生命周期阶段（详情页不展示）',
    content:
      '公式自身不关联生命周期阶段：页面不提供阶段选择，详情页「基本信息」卡片亦不展示该字段；' +
      '阶段归属一律在建模时通过公式绑定配置。',
    source: '《计算公式功能批注》§1.1 / §3.5',
    formula: '通用',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    unmatchedReason: '字段移除后的口径说明，无对应操作按钮。',
  },
  {
    id: 'gann-07',
    title: '试算校验规则总览（R22）',
    content:
      '完整性校验 3 项：① 计算公式只使用已定义的数据因素与运算符；② 数据因素完整（因子已选对象、常量已填值）；' +
      '③ 结果单位为碳排放量单位（CO₂e 结尾）。任一项不通过提示「存在未通过项，请先修正」。',
    source: '《计算公式功能批注》§2.5',
    formula: '通用',
    operation: '跨弹窗多个控件（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    unmatchedReason: '校验规则横跨试算弹窗多个控件，无法确定唯一主目标。',
  },
  {
    id: 'gann-08',
    title: '文档口径与范围说明',
    content:
      '本文只批注「计算公式」功能；同目录 PRD 中的「核算模型（公式绑定）」不在本期原型实现范围内，不纳入批注。' +
      '字段与规则编号与《计算引擎配置业务 PRD》同源，相同内容不重复展开。',
    source: '《计算公式功能批注》§0',
    formula: '通用',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    unmatchedReason: '文档元信息说明，非操作类批注。',
  },
]

/** 可匹配批注（按锚点分组） */
export const matchedAnnotations = calcFormulaAnnotations.filter((item) => item.matchStatus === 'matched')

/** 全局标注（未匹配 + 文档级） */
export const globalAnnotationList = calcFormulaAnnotations.filter((item) => item.global)

/** 锚点 → 批注列表（selector 与 matchTargets 均纳入映射，同 target 去重） */
export function buildTargetMap(): Map<string, Annotation[]> {
  const map = new Map<string, Annotation[]>()
  matchedAnnotations.forEach((item) => {
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
