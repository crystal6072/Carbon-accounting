import type { Annotation } from './types'

/**
 * 组织架构功能批注数据（对齐《组织架构业务 PRD》V0.2 / 原型 TenantOrgPage，编号 B17-01 ~ B17-19）。
 * - 覆盖租户端组织架构（/system/org）：组织树、节点详情、直属成员、新增下级、编辑、移动、删除，及对应弹窗；
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：文档级说明，进入右下角「全局批注」抽屉。
 * 说明：以原型为准，并同步 V0.2 改造结论——成员关联键由名称改为 `dept_id`（D08，C-04 闭环）、人数分「直属 / 含下级」双口径（D09）、平台侧改为租户管理内只读页签（V0.2 §5.10）；原型内部矛盾 C-01 / C-03 / C-04 / C-05 已闭环，C-02 / C-06 待修（见 orgGlobalAnnotations）。
 */

export const orgAnnotations: Annotation[] = [
  /* ==================== 整体流程 ==================== */
  {
    id: 'ann-org-flow',
    title: '组织架构维护整体流程',
    code: 'B17-01',
    blocks: [
      {
        type: 'paragraph',
        text: '租户管理员在租户端维护本租户组织树与组织类型，作为成员挂靠、角色数据范围、业务数据归属的组织维度依据。',
      },
      {
        type: 'steps',
        items: [
          '进入组织架构，左树选节点（默认选中根组织）',
          '右栏看节点详情与直属成员',
          '按需「新增下级 / 编辑 / 移动 / 删除」；也可在右栏或左树「+」快捷新增成员',
          '对直属成员做「编辑（所属组织 + 角色）/ 停用 · 启用 / 移出」',
          '保存即时生效，左树与右栏同步刷新',
        ],
      },
      {
        type: 'heading',
        text: '结束',
      },
      {
        type: 'paragraph',
        text: '所有写操作**即时生效，无提交、审核、驳回**；组织节点只有「存在 / 已删除」两态，支持**物理删除**（满足前置条件时），无停用 / 启用、无「作废 / 终结」中间态。',
      },
      {
        type: 'callout',
        text: '本期范围（以原型为准）：原型不提供组织类型字典 CRUD、批量导入、组织模板、平台侧只读全景、受控代配置；组织类型仅为预置字符串标签。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.1 B17-01',
    operation: '整体流程',
    buttonText: '组织架构（功能标题）',
    selector: 'org.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.page.global', label: '功能标题', reason: '功能标题附近（全局说明入口）' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 全局规则 ==================== */
  {
    id: 'ann-org-global-rules',
    title: '全局规则',
    code: 'B17-02',
    blocks: [
      {
        type: 'list',
        ordered: true,
        items: [
          '**单根组织**：每租户有且只有一个根组织，`parentId = null`、`isRoot = true`、名称默认 = 租户名称；其余节点一律挂在根组织或其下级之下，不允许多根并列。',
          '**层级上限**：组织树层级上限为 **5 层**（常量 `ORG_MAX_LEVEL`）；第 5 层节点不再提供「新增下级」入口。',
          '**同一上级下名称唯一**：同一上级节点下，组织名称不可重复（含根节点之间）；不同上级下允许同名。',
          '**组织编码唯一**：在租户内唯一（不区分大小写），可手填或留空由系统生成（转大写）。',
          '**类型仅为标签**：组织类型 `typeName` 为字符串标签（预置集 ∪ 已用类型），不做「该类型下只能挂某子类型」的强约束，无独立类型字典表。',
          '**成员匹配**：右栏成员按 `dept_id`（= `org.id`）关联（D08，V0.2 起名称匹配作废，见 B17-06）；组织改名不影响成员归属。',
          '**平台侧同一能力**：平台经「租户管理 → 列表行『组织架构』」进入该租户的组织与成员页，**编辑能力与租户端完全一致**（新增下级、编辑、移动、删除、成员维护）；不设独立跨租户全景菜单、不做受控代配置。',
        ],
      },
      {
        type: 'callout',
        text: '权限：原型未做角色 / 功能码限制（菜单恒渲染、接口不校验），正式实现需按「组织架构」功能码收敛（不阻塞批注）。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.2 B17-02',
    operation: '全局规则',
    buttonText: '组织架构（功能标题 / 左右栏面板头）',
    selector: 'org.tip.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'org.tip.global', label: '左栏面板头（组织架构）', reason: '全局规则说明锚点（界面提示文字已移除，内容见本批注）' },
      { selector: 'org.tip.platform', label: '右栏面板头（节点详情）', reason: '平台侧不代维护说明锚点（界面提示文字已移除，内容见本批注）' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 组织树 / 详情 / 直属成员 ==================== */
  {
    id: 'ann-org-tree',
    title: '组织树浏览与选中',
    code: 'B17-04',
    blocks: [
      {
        type: 'paragraph',
        text: '左栏组织树按层级逐层定位要维护 / 查看的组织节点；点选即设为当前范围，右栏同步展示节点详情与直属成员。',
      },
      {
        type: 'list',
        items: [
          '节点名后无额外文字；根组织标识、人数（直属 / 含下级）统一收进悬浮 Tooltip 气泡，不污染树名',
          '气泡展示「直属 N 人 · 含下级 M 人」（按 `dept_id` 关联统计，见 D09；为 0 也展示）；根组织气泡追加「租户根组织」',
          '树默认全部展开；若租户无根组织（极端情况），左树显示「本租户尚未配置组织架构 / 请联系平台重新初始化根组织」',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.3 B17-04',
    operation: '组织树',
    buttonText: '组织架构（左栏树）',
    selector: 'org.tree',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.tree', label: '组织树', reason: '逐层定位与选中' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-org-detail',
    title: '节点详情',
    code: 'B17-05',
    blocks: [
      {
        type: 'paragraph',
        text: '右栏展示当前节点的：节点名称、组织编码、上级节点、同级排序、下级节点 / 直属成员、含下级节点数、最近更新。',
      },
      {
        type: 'list',
        items: [
          '上级节点：根组织显示「—（租户根组织，由系统自动创建）」，顶级（非根无上级）显示「—（顶级节点）」；原型实际仅根组织无上级',
          '所在层级 / 层级路径：由数据 `level` / `path` 派生（如 `/ON001/ON002/`），当前原型详情「更多详情」未单列，按原型为准',
          '同级排序：显示「第 N 位（同级共 M 个）」',
          '含下级节点数：`orgSubtreeCount` 含自身',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.3 B17-05',
    operation: '节点详情',
    buttonText: '节点详情（右栏）',
    selector: 'org.detail',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.detail', label: '节点详情', reason: '字段汇总展示' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-org-member',
    title: '直属成员',
    code: 'B17-06',
    blocks: [
      {
        type: 'paragraph',
        text: '查看当前组织节点的成员：分「直属成员 / 含下级成员」两个口径（D09，见 B17-19）。行内操作收敛为「编辑 / 停用 · 启用 / 移出」：编辑仅调整所属组织与角色（账号级字段去成员管理维护）；停用 / 启用复用成员状态弹窗（启用可重选组织）；移出为离职终态，走二次确认。主管理员不提供停用 / 移出，唯一管理员禁停用。',
      },
      {
        type: 'callout',
        text: '成员关联键（V0.2 已闭环 D08）：按 `dept_id`（= `org.id`）关联，名称匹配口径作废；组织改名不影响成员归属，同名组织不再导致成员合并计数。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.3 B17-06',
    operation: '直属成员',
    buttonText: '直属成员（右栏表）',
    selector: 'org.member',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.member', label: '直属成员', reason: '展示并维护当前节点成员' }],
    global: false,
    priority: 'medium',
  },

  /* ==================== 操作功能 ==================== */
  {
    id: 'ann-org-add',
    title: '新增下级',
    code: 'B17-07',
    blocks: [
      {
        type: 'paragraph',
        text: '在当前选中节点（默认根组织）下建立子组织；两入口（页头 / 右栏）均把当前节点作为 `parent` 传入，原型**不提供**「新建顶级节点」入口（单根约束）。',
      },
      {
        type: 'list',
        items: [
          '可操作条件：所选节点层级 < 5；否则按钮置灰并提示「已达 5 层上限」',
          '默认带入：排序默认「同级末位 + 1」；组织编码留空由系统生成',
          '保存校验：① 名称必填且 ≤50 字符；② 排序须为不小于 0 的整数；③ 同上级下名称不重复；④ 编码租户内唯一（不区分大小写）',
          '结果：新节点层级 = 上级层级 + 1，左树与右栏刷新',
        ],
      },
      {
        type: 'callout',
        text: 'C-03 已闭环（V0.2）：页头 / 右栏「新增下级」均把当前节点作为 parent 传入（选中或根），单根约束下 `createOrgNode` 遇 `parentId=null` 会抛错；原型不再出现「新增顶级节点」分支，冗余路径已清除。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.3 B17-07',
    operation: '新增下级',
    buttonText: '新增下级',
    selector: 'org.btn.add',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'org.btn.add', label: '新增下级（右栏）', reason: '新增入口' },
      { selector: 'org.modal.node', label: '新增 / 编辑弹窗', reason: '弹窗内新建分支说明' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-org-edit',
    title: '编辑节点',
    code: 'B17-08',
    blocks: [
      {
        type: 'paragraph',
        text: '弹窗仅可修改**组织名称、组织编码、排序号**（原型已移除「组织类型」「负责人」输入项）；任何状态均可编辑。',
      },
      {
        type: 'list',
        items: [
          '编辑**不改上级**——弹窗提示「编辑不改变上级，如需调整请使用移动」',
          '校验同新增：名称 ≤50、排序 ≥0 整数、同上级名不重复、编码改后判重（排除自身）',
          '结果：节点 ID / 路径 / 层级不变（改上级须走移动）；根组织可编辑名称 / 类型 / 负责人 / 排序，但不可删除、不可移动',
        ],
      },
      {
        type: 'callout',
        text: 'C-03 已闭环：编辑弹窗的「当前为顶级节点」分支对根组织不可达（根恒有 isRoot），单根约束下该冗余措辞已清除。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.3 B17-08',
    operation: '编辑',
    buttonText: '编辑',
    selector: 'org.btn.edit',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'org.btn.edit', label: '编辑（右栏）', reason: '编辑入口' },
      { selector: 'org.modal.node', label: '新增 / 编辑弹窗', reason: '弹窗内编辑说明' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-org-move',
    title: '移动节点',
    code: 'B17-09',
    blocks: [
      {
        type: 'paragraph',
        text: '把节点调整到另一个上级之下（含整棵子树的层级与路径重算）。根组织不可移动。',
      },
      {
        type: 'list',
        items: [
          '目标候选：排除自身与其全部子孙（按 `path` 前缀判定）、排除根组织',
          '确认校验：① 新上级非自身 / 子孙；② 移动后本节点层级 ≤5（**子树最大层级是否校验见 C-02**）；③ 目标层级下无同名节点（mock E02 移动重名）',
          '级联重算：成功后本节点与全部子孙的 `level` 与 `path` 由 `recalcSubtree` 重算',
        ],
      },
      {
        type: 'callout',
        text: '原型内部矛盾（待确认 C-02）：`moveOrgNode` 仅校验「本节点」新层级 ≤5，未校验其**子孙子树**最大层级。把含深层子孙的节点移到较深父级下，子孙可能静默超过 5 层（如 3 层节点含 4/5 层子孙移到 4 层父下，子孙变 5/6 层，第 6 层不被拦）。建议补子树最大层级校验。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.3 B17-09',
    operation: '移动',
    buttonText: '移动',
    selector: 'org.btn.move',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'org.btn.move', label: '移动（右栏）', reason: '移动入口' },
      { selector: 'org.modal.move', label: '移动弹窗', reason: '移动影响说明' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-org-delete',
    title: '删除节点',
    code: 'B17-11',
    blocks: [
      {
        type: 'paragraph',
        text: '组织节点只有「存在 / 已删除」两态：不提供停用 / 启用，撤销部门的唯一出口是物理删除（删除后不可恢复）。可操作条件（按钮禁用原因）：① 根组织 → 禁用；② 存在下级节点 → 禁用；③ 存在挂靠成员 → 禁用。三项均不满足时按钮可点。',
      },
      {
        type: 'list',
        items: [
          '删除确认：正文「确认删除节点『名称』？删除后不可恢复」',
          '删除前置清单：① 节点下不能有下级节点；② 节点下不能有成员挂载，需先在成员管理中调整所属组织',
          'mock 实际拦截（以原型为准）：`deleteOrgNode` 仅校验 非根 / 无下级 / 无成员（按 deptId 匹配）。满足即通过，物理删除',
          'MVP 口径：不做「被业务数据归属引用」第三道拦截；历史数据组织归属由业务表冗余的组织名称快照追溯',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.3 B17-11',
    operation: '删除',
    buttonText: '删除',
    selector: 'org.btn.delete',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'org.btn.delete', label: '删除（右栏）', reason: '删除入口' },
      { selector: 'org.modal.delete', label: '删除确认弹窗', reason: '删除前置清单' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 字段说明 ==================== */
  {
    id: 'ann-org-field-name',
    title: '节点名称',
    code: 'B17-12',
    blocks: [
      {
        type: 'list',
        items: [
          '业务含义：组织的展示名称，组织树与详情中用户识别的依据',
          '必填；为空提示「节点名称必填」并阻断保存',
          '同一上级下不可重复（B17-02 第 3 条）',
          '长度上限：**≤ 50 个字符**（前端与 mock 双重校验）',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.4 B17-12',
    operation: '字段',
    buttonText: '节点名称',
    selector: 'org.detail.name',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.detail.name', label: '节点名称（详情行）', reason: '字段说明' }],
    global: false,
    priority: 'medium',
    category: '字段说明',
  },
  {
    id: 'ann-org-field-code',
    title: '组织编码',
    code: 'B17-13',
    blocks: [
      {
        type: 'list',
        items: [
          '业务含义：组织的稳定标识，用于导入与外部系统对接',
          '选填；留空由系统生成（mock 兜底 `ORG + 时间戳后 4 位`），输入实时转大写',
          '唯一限制：租户内唯一，不区分大小写；新增与编辑保存时均校验，重复提示「组织编码在租户内已存在」',
        ],
      },
      {
        type: 'callout',
        text: '原型内部矛盾（待确认 C-06）：原型未对组织编码做长度上限（仅首字母占位提示「如 ORG0007」）；字段清单建议 `varchar(64)`，待核对是否需前端明限。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.4 B17-13',
    operation: '字段',
    buttonText: '组织编码',
    selector: 'org.detail.code',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.detail.code', label: '组织编码（详情行）', reason: '字段说明' }],
    global: false,
    priority: 'medium',
    category: '字段说明',
  },
  {
    id: 'ann-org-field-parent',
    title: '上级节点',
    code: 'B17-15',
    blocks: [
      {
        type: 'list',
        items: [
          '业务含义：该组织在树中的父级；根组织无上级',
          '只读展示（详情）：根组织显示「—（租户根组织，由系统自动创建）」；下级节点显示上级名称',
          '变更方式：只能通过「移动」（B17-09）调整；编辑弹窗不改上级',
          '移动候选限制：见 B17-09（排除自身及子孙、根组织）',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.4 B17-15',
    operation: '字段',
    buttonText: '上级节点',
    selector: 'org.detail.parent',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.detail.parent', label: '上级节点（详情行）', reason: '字段说明' }],
    global: false,
    priority: 'medium',
    category: '字段说明',
  },
  {
    id: 'ann-org-field-leader',
    title: '负责人',
    code: 'B17-17',
    blocks: [
      {
        type: 'list',
        items: [
          '业务含义：该组织的负责人姓名，仅作组织架构展示，**不联动权限**（负责人不自动获本组织数据范围）。',
          '**原型已从新增 / 编辑弹窗与节点详情移除该字段**（编辑时保留原值、不清空），因此无占位文案、无长度校验。',
        ],
      },
      {
        type: 'callout',
        text: '原型未体现：负责人输入的必填性、长度上限（字段清单建议 `varchar(50)`）与「负责人电话」均已无界面承载，待确认是否保留该字段能力。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.4 B17-17',
    operation: '字段',
    buttonText: '负责人',
    selector: 'org.detail.leader',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.detail.leader', label: '负责人（详情行）', reason: '字段说明' }],
    global: false,
    priority: 'medium',
    category: '字段说明',
  },
  {
    id: 'ann-org-field-sort',
    title: '同级排序',
    code: 'B17-18',
    blocks: [
      {
        type: 'list',
        items: [
          '业务含义：决定同一上级下兄弟节点的展示先后',
          '填写方式：手工填写，占位「0」；原型输入不强制数字（保存时 `Number` 转换校验）',
          '必填 / 取值：保存时须为「不小于 0 的整数」，否则提示「排序须为不小于 0 的整数」并阻断',
          '排序口径：同级按 `sort` 升序，同值按名称升序（树构建与 mock 列表均按此排序）',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.4 B17-18',
    operation: '字段',
    buttonText: '同级排序',
    selector: 'org.detail.sort',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.detail.sort', label: '同级排序（详情行）', reason: '字段说明' }],
    global: false,
    priority: 'medium',
    category: '字段说明',
  },
  {
    id: 'ann-org-field-summary',
    title: '下级 / 成员 / 含下级节点数 / 最近更新',
    code: 'B17-19',
    blocks: [
      {
        type: 'list',
        items: [
          '下级节点 / 直属成员 / 含下级成员：展示 `selectedChildren.length` 个 / `directCounts` 人 / `subtreeCounts` 人（均按 `dept_id` 关联，见 D08）',
          '含下级节点数：`orgSubtreeCount(id)` 含自身，用于移动影响提示与详情展示',
          '最近更新：展示 `updatedAt`（mock 演示值），每次写操作刷新',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.4 B17-19',
    operation: '字段',
    buttonText: '下级 / 成员 / 含下级节点数 / 最近更新',
    selector: 'org.detail.counts',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'org.detail.counts', label: '下级节点 / 直属成员（详情行）', reason: '字段说明' },
      { selector: 'org.detail.subtree', label: '含下级节点数（详情行）', reason: '字段说明' },
      { selector: 'org.detail.updated', label: '最近更新（详情行）', reason: '字段说明' },
    ],
    global: false,
    priority: 'medium',
    category: '字段说明',
  },
]

/** 全局批注：文档级说明 + 原型内部矛盾汇总（进入「全局批注」抽屉） */
export const orgGlobalAnnotations: Annotation[] = [
  {
    id: 'ann-org-global-conflicts',
    title: '原型内部矛盾（C-01~C-06：C-01/03/04/05 已闭环，C-02/06 待修）',
    code: 'B17-00',
    blocks: [
      {
        type: 'paragraph',
        text: '以下为原型自身不一致（UI 文案 / 弹窗逻辑 与 mock 实现不符，或 PRD 规则与 mock 实现不符）。未裁决前，各批注以「原型实际行为」为准标注，矛盾项另行提示。',
      },
      {
        type: 'table',
        columns: ['#', '矛盾', '现状 vs 口径', '建议'],
        rows: [
          ['C-01', '删除弹窗曾称「被业务数据归属引用时不可删除」，但原型未实现', '已闭环：当前删除弹窗仅列「无下级 / 无成员」两条件，无业务引用文案，与 mock 一致', '无需改动'],
          ['C-02', '移动仅校验本节点层级，未校验子树最大层级', 'moveOrgNode 仅拦本节点 ≤5；子孙由 recalcSubtree +1 不拦', '待修：补子树最大层级 ≤5 校验'],
          ['C-03', '新增弹窗保留「新增顶级节点」分支', '已闭环：TenantOrgPage.openAdd 恒传 parent（选中或根），单根约束，弹窗不再出现该分支', '无需改动'],
          ['C-04', '成员按名称匹配而非 dept_id', '已闭环（D08，V0.2）：原型按 `dept_id`（= org.id）关联，同名组织不再合并计数', '无需改动'],
          ['C-05', '根组织是否允许停用', '已闭环：当前原型无停用 / 启用态，根组织亦无停用入口（见 B17-01）', '无需改动'],
          ['C-06', '组织编码无长度上限', '仅校验 名称≤50、排序≥0；字段清单建议 `org_code varchar(64)`；负责人字段已从界面移除，其长度问题不再适用', '待修：补编码长度上限'],
        ],
      },
      {
        type: 'callout',
        text: 'C-01 / C-03 / C-04 / C-05 已随 V0.2 原型改造闭环（删除文案、单根、dept_id 关联、无停用态）；C-02 / C-06 仍待修原型。另：启用 / 停用（B17-03 / B17-10）属 V0.2 PRD 范围，但当前租户端原型（TenantOrgPage）未提供停用 / 启用按钮，本批注以原型为准不展开，待原型补全后再补标注。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §4 待确认清单',
    operation: '全局规则',
    buttonText: '全局批注（抽屉）',
    matchStatus: 'matched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '全局规则说明',
  },
]
