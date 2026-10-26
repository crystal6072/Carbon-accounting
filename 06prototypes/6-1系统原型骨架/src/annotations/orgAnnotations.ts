import type { Annotation } from './types'

/**
 * 组织架构功能批注数据（对齐《组织架构功能批注》V0.1，编号 B17-01 ~ B17-19）。
 * - 覆盖租户端组织架构（/system/org）：组织树、节点详情、直属成员、新增下级、编辑、移动、停用 / 启用、删除，及对应弹窗；
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：文档级说明，进入右下角「全局批注」抽屉。
 * 说明：本轮统一「以原型为准」裁决，批注内容与原型实际行为一致；原型内部矛盾（C-01 ~ C-06）以 callout 内联提示，并在 orgGlobalAnnotations 汇总。
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
          '按需「新增下级 / 编辑 / 移动 / 停用·启用 / 删除」',
          '保存即时生效，左树与右栏同步刷新',
        ],
      },
      {
        type: 'heading',
        text: '结束',
      },
      {
        type: 'paragraph',
        text: '所有写操作**即时生效，无提交、审核、驳回**；组织节点支持**物理删除**（满足条件时），无「作废 / 终结」状态，启用与停用可反复切换。',
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
          '**停用影响**：节点停用后，不可在其下新增下级、不可挂新成员，但存量成员的组织归属与数据范围不变。',
          '**成员匹配**：右栏直属成员按 `deptName === org.name` 名称匹配（非按 `dept_id`，见 B17-06 与 C-04）。',
          '**平台侧不代维护**：页面提示「平台侧不提供跨租户组织树只读查看，必要时经进入租户开启受控代配置」。',
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

  /* ==================== 业务状态 ==================== */
  {
    id: 'ann-org-status',
    title: '业务状态（启用 / 停用）',
    code: 'B17-03',
    blocks: [
      {
        type: 'table',
        columns: ['状态', '业务含义', '可进行的操作'],
        rows: [
          ['启用', '可挂新成员、可新增下级、可参与数据范围', '新增下级、编辑、移动、停用、删除（满足前置时）'],
          ['停用', '不可挂新成员、不可新增下级，存量数据与数据范围不变', '编辑、移动、启用、删除（满足前置时）；不可新增下级、不可挂新成员'],
        ],
      },
      { type: 'heading', text: '进入条件' },
      {
        type: 'list',
        items: [
          '新增保存后默认「启用」',
          '「停用」由启用态经行操作「停用」进入',
          '「启用」由停用态经行操作「启用」进入',
        ],
      },
      { type: 'heading', text: '阻断规则（mock 口径）' },
      {
        type: 'list',
        items: [
          '停用某节点前，若其下存在**启用状态**的下级，阻断（mock E08）',
          '启用某节点前，若其上级为停用状态（非根），阻断（mock E09）；根组织无上级，恒可启用',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.2 B17-03',
    operation: '业务状态',
    buttonText: '节点状态（详情行 / 左树（停用）标记 / 状态按钮）',
    selector: 'org.detail.status',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.detail.status', label: '节点状态（详情行）', reason: '状态展示与切换入口' }],
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
          '节点名后追加「（停用）」标记（停用态）与「· 根组织」标记（根）',
          '节点副标题展示「组织类型 · N 人」（N = 按名称匹配的直属成员数，为 0 时不显示）',
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
        text: '右栏展示当前节点的：节点名称、组织编码、组织类型、上级节点、所在层级、层级路径、负责人、同级排序、下级节点 / 直属成员、含下级节点数、最近更新、节点状态。',
      },
      {
        type: 'list',
        items: [
          '上级节点：根组织显示「—（租户根组织，由系统自动创建）」，顶级（非根无上级）显示「—（顶级节点）」；原型实际仅根组织无上级',
          '所在层级：显示「第 N 层 / 上限 5 层」',
          '层级路径：展示 `path`（如 `/ON001/ON002/`）',
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
    title: '直属成员（只读）',
    code: 'B17-06',
    blocks: [
      {
        type: 'paragraph',
        text: '只读查看当前组织节点的直属成员（姓名、手机号、角色、成员状态）；本页不提供成员增删改入口。',
      },
      {
        type: 'callout',
        text: '原型内部矛盾（待确认 C-04）：直属成员按 `deptName === org.name` **名称匹配**，非按 `dept_id`。不同上级下允许同名组织（仅同上级唯一），会导致成员被合并计入；组织改名后成员 `deptName` 不联动也会失配。建议统一以 `dept_id`（= org.id）为主关联键。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.3 B17-06',
    operation: '直属成员',
    buttonText: '直属成员（右栏表）',
    selector: 'org.member',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.member', label: '直属成员', reason: '只读展示当前节点成员' }],
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
          '可操作条件：所选节点须「启用」且层级 < 5；否则按钮置灰并提示原因',
          '默认带入：组织类型默认取本租户可用类型末项（企业常态为「部门」）；排序默认「同级末位 + 1」',
          '保存校验：① 名称必填且 ≤50 字符；② 排序须为不小于 0 的整数；③ 同上级下名称不重复；④ 编码租户内唯一（不区分大小写）',
          '结果：新节点层级 = 上级层级 + 1，状态为「启用」，左树与右栏刷新',
        ],
      },
      {
        type: 'callout',
        text: '原型内部矛盾（待确认 C-03）：新增弹窗保留了「新增顶级节点（层级 1）」分支（标题 / parentText / toast），但页面永不触发、`createOrgNode` 遇 `parentId=null` 会抛错（单根约束）。属冗余 / 矛盾路径，建议从弹窗移除该措辞。',
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
        text: '修改组织名称、组织编码、组织类型、负责人、排序号；任何状态均可编辑。',
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
        text: '同 C-03：编辑弹窗的「当前为顶级节点」分支对根组织不可达（根恒有 isRoot），属冗余措辞。',
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
          '目标候选：排除自身与其全部子孙（按 `path` 前缀判定）、排除停用节点、排除根组织',
          '确认校验：① 新上级非自身 / 子孙；② 新上级为启用态；③ 移动后本节点层级 ≤5（**子树最大层级是否校验见 C-02**）；④ 目标层级下无同名节点（mock E02 移动重名）',
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
    id: 'ann-org-toggle',
    title: '停用 / 启用',
    code: 'B17-10',
    blocks: [
      {
        type: 'paragraph',
        text: '切换节点启用 / 停用状态（离岗 / 复岗式生命周期）。按钮文案随状态切换（启用态显示「停用」，停用态显示「启用」）。',
      },
      {
        type: 'list',
        items: [
          '停用确认：正文「确认停用节点『名称』？停用后该节点不可挂新成员、不可新增下级，存量成员的数据范围不变」',
          '启用确认：正文「确认启用节点『名称』？启用后该节点可继续新增下级与挂载成员」',
          '阻断：停用时存在启用下级、启用时上级为停用，均阻断并提示（mock E08 / E09）',
        ],
      },
      {
        type: 'callout',
        text: '原型内部矛盾（待确认 C-05）：根组织同样提供「停用 / 启用」按钮，mock `updateOrgNodeStatus` 无 isRoot 限制。若根被停用，整棵树不可挂新成员、不可新增下级。需定稿：根是否允许停用（推荐根恒为启用）。',
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.3 B17-10',
    operation: '停用 / 启用',
    buttonText: '停用 / 启用',
    selector: 'org.btn.status',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'org.btn.status', label: '停用 / 启用（右栏）', reason: '状态切换入口' },
      { selector: 'org.modal.status', label: '状态确认弹窗', reason: '确认文案' },
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
        text: '物理删除一个组织节点（删除后不可恢复）。可操作条件（按钮禁用原因）：① 根组织 → 禁用；② 存在下级节点（含停用）→ 禁用；③ 存在挂靠成员 → 禁用。三项均不满足时按钮可点。',
      },
      {
        type: 'list',
        items: [
          '删除确认：正文「确认删除节点『名称』？删除后不可恢复」',
          '删除前置清单：① 节点下不能有下级节点（含已停用）；② 节点下不能有成员挂载；③ 被业务数据归属引用时不可删除，只能停用',
          'mock 实际拦截（以原型为准）：`deleteOrgNode` 仅校验 非根 / 无下级 / 无成员（按名称匹配）。满足即通过，物理删除',
        ],
      },
      {
        type: 'callout',
        text: '原型内部矛盾（待确认 C-01）：删除确认弹窗文案含「被业务数据归属引用时不可删除，只能停用」，但 mock 不查业务数据引用。UI 文案承诺了 mock 未实现的能力。建议二选一：① 删掉该条文案（与实现一致）；② 在 mock 补业务引用校验（更贴近前向 PRD）。',
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
    id: 'ann-org-field-type',
    title: '组织类型',
    code: 'B17-14',
    blocks: [
      {
        type: 'list',
        items: [
          '业务含义：标识该组织在租户内的层级含义（如 集团 / 工厂 / 车间 / 部门）',
          '下拉单选；候选 = 本租户预置类型（按租户类型：企业=[集团,子公司,工厂,车间,部门]、政府=[委办局,处室,科室]、机构=[总部,分支机构,部门]、园区=[园区,片区,企业,部门]）∪ 已用类型，去重',
          '本质：为**字符串标签**（直接存 `typeName`），无独立字典表、无 `org_type_id` 外键；不做类型级约束',
          '新增默认：新建节点默认选中候选末项（企业常态为「部门」）',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.4 B17-14',
    operation: '字段',
    buttonText: '组织类型',
    selector: 'org.detail.type',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'org.detail.type', label: '组织类型（详情行）', reason: '字段说明' }],
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
          '移动候选限制：见 B17-09（排除自身及子孙、停用、根组织）',
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
    id: 'ann-org-field-level',
    title: '所在层级 / 层级路径',
    code: 'B17-16',
    blocks: [
      {
        type: 'list',
        items: [
          '所在层级：展示「第 N 层 / 上限 5 层」，由系统按上级层级 +1 计算，用户不可填',
          '层级路径：展示 `path`（如 `/ON001/ON002/`，含首尾斜杠），系统按从根到本节点的 ID 路径生成；改名 / 移动时由 `recalcSubtree` 重算，不影响历史业务数据可读性（存 ID 不存名）',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.4 B17-16',
    operation: '字段',
    buttonText: '所在层级 / 层级路径',
    selector: 'org.detail.level',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'org.detail.level', label: '所在层级（详情行）', reason: '字段说明' },
      { selector: 'org.detail.path', label: '层级路径（详情行）', reason: '字段说明' },
    ],
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
          '业务含义：该组织的负责人姓名，仅作组织架构展示',
          '选填；占位「请输入负责人姓名」',
          '不联动权限：批注 / 表单提示「仅作组织架构展示，不联动权限」——负责人不自动获本组织数据范围',
        ],
      },
      {
        type: 'callout',
        text: '原型内部矛盾（待确认 C-06）：原型未对负责人姓名字节长度做限制（字段清单建议 `varchar(50)`）；原型无「负责人电话」字段（区别于前向字段清单）。待核对。',
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
    title: '下级 / 成员 / 含下级节点数 / 最近更新 / 节点状态',
    code: 'B17-19',
    blocks: [
      {
        type: 'list',
        items: [
          '下级节点 / 直属成员：展示 `selectedChildren.length` 个 / `selectedMembers.length` 人（成员按名称匹配，见 C-04）',
          '含下级节点数：`orgSubtreeCount(id)` 含自身，用于移动影响提示与详情展示',
          '最近更新：展示 `updatedAt`（mock 演示值），每次写操作刷新',
          '节点状态：展示启用 / 停用标签（引用 B17-03）',
        ],
      },
    ],
    source: '《组织架构功能批注》V0.1 §1.4 B17-19',
    operation: '字段',
    buttonText: '下级 / 成员 / 含下级节点数 / 最近更新 / 节点状态',
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
    title: '原型内部矛盾（待确认 C-01 ~ C-06）',
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
          ['C-01', '删除弹窗称「被业务数据归属引用时不可删除」，mock 未实现', '删除弹窗列此条；deleteOrgNode 仅校验 根/下级/成员（按名）', '删文案（与实现一致）或补 mock 业务引用校验'],
          ['C-02', '移动仅校验本节点层级，未校验子树', 'moveOrgNode 仅拦本节点 ≤5；子孙由 recalcSubtree +1 不拦', '补子树最大层级 ≤5 校验'],
          ['C-03', '新增弹窗保留「新增顶级节点」分支', '页面不触发、createOrgNode 遇 null 抛错（单根约束）', '移除该分支措辞'],
          ['C-04', '成员按名称匹配而非 dept_id', 'memberCounts / selectedMembers 按 deptName===name', '统一按 dept_id 关联'],
          ['C-05', '根组织可停用', '根有停用/启用按钮，mock 无 isRoot 限制', '定稿：根是否允许停用（推荐恒启用）'],
          ['C-06', '编码 / 负责人无长度上限', '仅校验 名称≤50、排序≥0', '补前端长度上限（编码 64、负责人 50）'],
        ],
      },
      {
        type: 'callout',
        text: '上述矛盾均已在对应批注（B17-06 / 07 / 09 / 10 / 11 / 13 / 17）中以 callout 内联提示。裁决后若需改原型，应先修 D-01~D-06 再定稿批注文案。',
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
