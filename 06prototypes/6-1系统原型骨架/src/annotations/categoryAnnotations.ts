import type { Annotation } from './types'

/**
 * 产品分类功能批注数据（对齐《产品分类功能批注》V1.1，编号 B01-01 ~ B01-21）。
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：跨页面 / 文档级说明，进入「全局批注」抽屉。
 * 说明：内容对应「整体流程 / 全局规则说明 / 业务状态说明 / 操作功能及业务规则 / 字段说明」五类批注。
 * 排版：一条批注围绕一个主题，使用「小标题 + 分条说明」组织；编号（code）作辅助信息，业务主题作主标题。
 */
export const categoryAnnotations: Annotation[] = [
  /* ==================== 整体流程 + 全局规则（功能标题附近） ==================== */
  {
    id: 'ann-cat-flow',
    title: '整体流程',
    code: 'B01-01',
    blocks: [
      {
        type: 'paragraph',
        text: '维护产品分类树，作为产品信息库建档时的分类依据。',
      },
      { type: 'heading', text: '主流程' },
      {
        type: 'steps',
        items: [
          '进入本页',
          '在左侧分类树选择节点（或停留在「全部分类」）',
          '右侧清单显示该节点的直接下级分类',
          '按需查询、查看核对',
          '新增或编辑分类',
          '用「启用 / 禁用」控制该分类能否被新产品选用',
        ],
      },
      { type: 'heading', text: '新增入口（分支）' },
      {
        type: 'list',
        items: [
          '页头「新增」：建立一级分类',
          '分类树底部「+ 新增一级分类」：建立一级分类',
          '分类树底部「+ 新增下级分类」：在所选节点下建立下级分类',
        ],
      },
      { type: 'heading', text: '衔接与结束' },
      {
        type: 'paragraph',
        text: '分类树选中哪个节点，右侧清单就展示该节点的直接下级；查看 / 编辑均以弹窗完成，不离开本页。',
      },
      {
        type: 'paragraph',
        text: '保存后立即生效并刷新分类树与清单；**全程没有提交、审核、驳回，也不提供删除**，因此分类**没有「作废 / 终结」状态**，可在启用与禁用之间反复切换。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.1 B01-01',
    operation: '整体流程',
    buttonText: '产品分类（功能标题）',
    selector: 'category.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.page.global', label: '产品分类', reason: '功能标题附近（全局说明入口）' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-cat-global-rules',
    title: '全局规则',
    code: 'B01-02',
    blocks: [
      { type: 'heading', text: '适用范围' },
      {
        type: 'paragraph',
        text: '本页维护的分类树是产品归口的统一口径，产品信息库建档、我的产品库、核算项目检索均使用同一棵树；**分类本身不直接参与碳排计算**。',
      },
      { type: 'heading', text: '结构约束' },
      {
        type: 'list',
        items: [
          '树形结构，**层级上限六级**；一级分类没有上级。',
          '分类层级恒等于上级层级 + 1，**不允许跳级创建**。',
          '**已达六级的分类不再提供「+ 新增下级分类」入口**。',
          '**分类编码全平台唯一**，新增与编辑保存时均校验，重复即阻断保存。',
          '同一级下分类名称不要求唯一，**允许重名**。',
          '同一级内**排序号不允许重复**，重复时阻断保存。',
        ],
      },
      { type: 'heading', text: '生命周期' },
      {
        type: 'list',
        items: [
          '本页**不提供删除**，分类不再使用时统一用「禁用」代替。',
          '**没有提交、审核、驳回，也没有操作日志入口**。',
        ],
      },
      { type: 'heading', text: '编辑与默认值' },
      {
        type: 'list',
        items: [
          '编辑为**直接覆盖，不保留历史版本**，也不改变已生成的产品分类关系与核算结果。',
          '**分类编码与分类名称必填**；使用状态不在新增 / 编辑表单中出现；不设「归属组织」「可见性」。',
          '**不预置任何分类**，分类树由用户从零维护，首次进入时分类树与清单均无内容。',
        ],
      },
      { type: 'heading', text: '下拉与权限' },
      {
        type: 'list',
        items: [
          '分类下拉统一口径：凡需选择分类的下拉均支持关键词搜索、按层级展开收起，且**默认全部收起**。',
          '权限：谁可维护、谁只能查看**尚未确定**（见全局批注「待确认事项」）。',
        ],
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.2 B01-02',
    operation: '全局规则',
    buttonText: '产品分类（功能标题）',
    selector: 'category.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.page.global', label: '产品分类', reason: '功能标题附近（全局说明入口）' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 业务状态 ==================== */
  {
    id: 'ann-cat-status-col',
    title: '使用状态',
    code: 'B01-03',
    blocks: [
      { type: 'heading', text: '两种状态' },
      {
        type: 'table',
        columns: ['', '启用', '禁用'],
        rows: [
          ['业务含义', '可被产品信息库新建产品时选用', '不再出现在新产品的分类选择中'],
          ['进入方式', '新增保存默认；或禁用态经「启用」', '启用态经「禁用」进入'],
          ['可进行的操作', '查看 / 编辑 / 其下新增下级 / 禁用', '查看 / 编辑 / 其下新增下级 / 启用'],
        ],
      },
      { type: 'heading', text: '状态变化' },
      {
        type: 'paragraph',
        text: '启用与禁用**双向可达、可反复切换**；变更状态只刷新使用状态与最后修改时间，**不改动名称、编码、上级分类、排序号等任何内容**。',
      },
      { type: 'heading', text: '对下游的影响' },
      {
        type: 'paragraph',
        text: '分类一旦禁用，新产品建档时**不能再选择它**；**已引用该分类的产品与已生成的核算结果不受影响，历史引用数据保留**。',
      },
      { type: 'heading', text: '已禁用分类的特殊口径' },
      {
        type: 'paragraph',
        text: '已禁用的分类**仍可作为其他分类的上级，其下也仍可继续新增分类**——禁用只影响「能否被新产品选用」，不影响它作为树节点的结构作用。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.3 B01-03',
    operation: '使用状态',
    buttonText: '使用状态（清单列）',
    selector: 'category.col.status',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.col.status', label: '使用状态（清单列）', reason: '状态展示位置' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 分类树 / 清单 / 查询 ==================== */
  {
    id: 'ann-cat-tree',
    title: '分类树浏览与选中',
    code: 'B01-04',
    blocks: [
      { type: 'heading', text: '操作目的' },
      {
        type: 'paragraph',
        text: '按多级门类逐层定位要维护或查看的分类；**恒可操作，不区分使用状态**。',
      },
      { type: 'heading', text: '展示规则' },
      {
        type: 'list',
        items: [
          '树顶为「全部分类」（虚拟节点，表示不限分类），进入时**默认全部展开**。',
          '每个节点右侧展示其**直接下级分类的数量**。',
          '节点按各自**排序号升序**排列。',
        ],
      },
      { type: 'heading', text: '选中结果' },
      {
        type: 'list',
        items: [
          '选中「全部分类」：右侧清单展示**全部一级分类**。',
          '选中某个分类：右侧清单展示该分类的**直接下级（不是全部后代）**，并回到清单第 1 页。',
        ],
      },
      { type: 'heading', text: '无内容时' },
      {
        type: 'paragraph',
        text: '分类树为空时不显示任何节点（空态文案是否补充见全局批注「待确认事项」）。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-04',
    operation: '分类树',
    buttonText: '分类树',
    selector: 'category.page.tree',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.page.tree', label: '分类树', reason: '分类树区域' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-cat-list',
    title: '右侧清单',
    code: 'B01-05',
    blocks: [
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '分类编码、分类名称、分类层级、排序号、使用状态、最后修改时间、操作。',
      },
      { type: 'heading', text: '展示规则' },
      {
        type: 'list',
        items: [
          '清单范围由左侧分类树选中节点决定。',
          '同一级内按排序号升序展示，**排序号为空的排在同级最后**。',
          '排序号为空时该列显示「-」。',
          '每页 **20 条**。',
        ],
      },
      { type: 'heading', text: '工具条' },
      {
        type: 'list',
        items: [
          '左侧显示当前范围名称（「全部分类」或所选分类名称）与「共 N 条」；N 统计当前范围内的条数、不受分页影响。',
          '本页**不提供导出**，分类数据不作为导出对象。',
        ],
      },
      { type: 'heading', text: '操作列' },
      {
        type: 'list',
        items: [
          '「查看」「编辑」**恒显示**。',
          '「启用」「禁用」按当前状态**二者只出现其一**。',
        ],
      },
      { type: 'heading', text: '无内容时' },
      {
        type: 'paragraph',
        text: '清单为空时不显示任何行（空态文案是否补充见全局批注「待确认事项」）。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-05',
    operation: '清单',
    buttonText: '分类清单',
    selector: 'category.page.list',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.page.list', label: '分类清单', reason: '清单表格区域' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-cat-query',
    title: '查询与重置',
    code: 'B01-06',
    blocks: [
      { type: 'heading', text: '查询项' },
      {
        type: 'list',
        items: [
          '分类编码：按包含关系模糊匹配、忽略大小写。',
          '分类名称：按包含关系模糊匹配。',
          '使用状态：下拉选择启用 / 禁用，**不选即为全部**。',
        ],
      },
      { type: 'heading', text: '过滤规则' },
      {
        type: 'list',
        items: [
          '三个条件**同时生效（叠加过滤）**。',
          '只过滤当前分类树范围内已展示的分类，**不会跳出当前范围**。',
          '任一条件变化后清单**回到第 1 页**。',
          '「重置」清空全部条件并恢复当前范围的完整清单。',
        ],
      },
      { type: 'heading', text: '搜索' },
      {
        type: 'paragraph',
        text: '点「搜索」执行一次当前条件的筛选；由于输入后清单即时收敛，按钮属于显式触发入口，两种方式结果一致。',
      },
      { type: 'heading', text: '待核对' },
      {
        type: 'callout',
        text: '原型中点「搜索」只出现一次提示、不产生额外动作，需确认正式需求是「点击后查询」还是保留「即时筛选 + 按钮共存」。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-06',
    operation: '查询 / 重置 / 搜索',
    buttonText: '搜索 / 重置',
    selector: 'category.query.bar',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'category.query.bar', label: '查询区', reason: '查询条件区域' },
      { selector: 'category.query.search', label: '搜索', reason: '同一规则引用' },
      { selector: 'category.query.reset', label: '重置', reason: '同一规则引用' },
    ],
    global: false,
    priority: 'medium',
  },

  /* ==================== 新增 / 编辑 ==================== */
  {
    id: 'ann-cat-add-root',
    title: '新增一级分类',
    code: 'B01-07',
    blocks: [
      { type: 'heading', text: '入口' },
      {
        type: 'paragraph',
        text: '页头「新增」或分类树底部「+ 新增一级分类」（**常驻显示**）；**恒可操作，不限制已有分类数量**。',
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'list',
        items: [
          '打开弹窗，标题为「新增分类」或「新增一级分类」。',
          '「上级分类」锁定为只读的「无上级（一级分类）」，**用户不能改**。',
          '填写分类编码、分类名称，按需填排序号与备注。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存成功后弹窗关闭，提示「保存成功」，**新分类出现在分类树与对应清单中，使用状态为「启用」**。',
      },
      { type: 'heading', text: '取消或失败' },
      {
        type: 'paragraph',
        text: '点「取消」或关闭弹窗**不保存任何内容**；校验不通过时**保留已填内容并给出提示**。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-07',
    operation: '新增一级分类',
    buttonText: '新增 / + 新增一级分类',
    selector: 'category.add.level1',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.add.level1', label: '新增 / + 新增一级分类', reason: '新增一级分类入口' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-cat-add-child',
    title: '新增下级分类',
    code: 'B01-08',
    blocks: [
      { type: 'heading', text: '入口' },
      {
        type: 'paragraph',
        text: '「+ 新增下级分类」**只在左侧分类树选中非「全部分类」的节点时出现**。',
      },
      { type: 'heading', text: '操作条件' },
      {
        type: 'list',
        items: [
          '需先选中一个具体分类。',
          '该分类无论启用还是禁用都可作为新增下级的起点。',
          '**该分类层级已达六级时，不再提供此入口**。',
        ],
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'list',
        items: [
          '打开弹窗，标题为「新增下级分类」。',
          '「上级分类」锁定为只读的所选分类名称，用户不能改。',
          '填写其余内容。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存成功后新分类挂在该节点下，**分类层级自动为上级分类层级 + 1，使用状态为「启用」**，分类树与清单刷新。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-08',
    operation: '新增下级分类',
    buttonText: '+ 新增下级分类',
    selector: 'category.add.child',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.add.child', label: '+ 新增下级分类', reason: '新增下级分类入口' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-cat-edit',
    title: '编辑分类（含调整上级分类）',
    code: 'B01-09',
    blocks: [
      { type: 'heading', text: '操作目的' },
      {
        type: 'paragraph',
        text: '修改分类信息，或把分类调整到另一个上级之下；**任何状态均可编辑，不区分启用与禁用**。',
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'list',
        items: [
          '打开弹窗，标题为「编辑分类」，带出该分类现有内容。',
          '「上级分类」此时为下拉可选（新增时是锁定的）；可修改分类编码、分类名称、排序号、备注。',
        ],
      },
      { type: 'heading', text: '上级分类规则' },
      {
        type: 'list',
        items: [
          '选择新上级后，只读的「分类层级」**立即按「新上级层级 + 1」重算**。',
          '上级候选包含所有层级未达六级的分类（不限启用 / 禁用），并**排除该分类自身及其全部下级，避免形成环**。',
          '下拉中始终提供显式选项「无上级（一级分类）」，用于把分类改为一级分类。',
          '使用状态**不在表单中，不能在编辑时改动**。',
        ],
      },
      { type: 'heading', text: '移动分类的级联口径' },
      {
        type: 'list',
        items: [
          '把已有下级的分类移动到新上级下时，**其全部下级的层级按新位置逐级重算**。',
          '若重算后存在任一分类层级超过六级，**阻断保存并提示「移动后分类层级将超过六级上限，请调整上级分类」**。',
          '分类编码为人工维护，**移动后不回写、不随层级变化**。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存成功后弹窗关闭，提示「保存成功」，分类树与清单按新内容刷新（含层级与排序变化）。',
      },
      { type: 'heading', text: '待确认' },
      {
        type: 'callout',
        text: '文档约定「分类被产品引用后，分类编码转为只读」，原型仍允许修改编码；除编码外还有哪些内容应在被引用后转为只读也未明确（见全局批注「待确认事项」）。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-09',
    operation: '编辑分类',
    buttonText: '编辑',
    selector: 'category.row.edit',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.row.edit', label: '编辑', reason: '行操作「编辑」' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 查看 / 启停 ==================== */
  {
    id: 'ann-cat-view',
    title: '查看分类',
    code: 'B01-10',
    blocks: [
      { type: 'heading', text: '入口' },
      {
        type: 'paragraph',
        text: '清单操作列的「查看」，或直接点击清单中的分类编码；**任何状态均可查看**。',
      },
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '分类编码、分类名称、上级分类、分类层级、排序号、使用状态、创建人、创建时间、最后修改时间、备注。',
      },
      { type: 'heading', text: '展示规则' },
      {
        type: 'list',
        items: [
          '只读弹窗，**不能在其中直接修改内容**。',
          '一级分类的「上级分类」显示「-」，排序号为空显示「-」，备注为空显示「-」。',
          '本弹窗**不展示「引用产品数」「下级分类数」**。',
        ],
      },
      { type: 'heading', text: '底栏操作' },
      {
        type: 'list',
        items: [
          '点「关闭」不产生任何变更。',
          '点「编辑」直接切换到编辑弹窗并带出该分类内容。',
        ],
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-10',
    operation: '查看分类',
    buttonText: '查看 / 分类编码',
    selector: 'category.row.view',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'category.row.view', label: '查看', reason: '行操作「查看」' },
      { selector: 'category.row.code', label: '分类编码', reason: '清单编码链接，同「查看」' },
      { selector: 'category.view.close', label: '关闭（查看弹窗）', reason: '同弹窗操作项' },
      { selector: 'category.view.edit', label: '编辑（查看弹窗）', reason: '同弹窗操作项' },
      { selector: 'category.view.body', label: '查看弹窗内容', reason: '字段展示区域' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-cat-enable',
    title: '启用分类',
    code: 'B01-11',
    blocks: [
      { type: 'heading', text: '显示条件' },
      {
        type: 'paragraph',
        text: '**只在该分类当前为「禁用」时**，操作列才显示「启用」。',
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'list',
        items: [
          '点击后弹出二次确认弹窗，标题「确认启用」。',
          '正文为「确认将分类『分类名称』（分类编码）启用？」。',
          '底栏为「取消」与「确认启用」，**不使用「确定」字样**。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '确认后该分类变为「启用」，提示「启用成功」，清单与分类树刷新；**此时起该分类可作为新产品建档候选，也可作为其他分类的上级候选**。',
      },
      { type: 'heading', text: '取消' },
      {
        type: 'paragraph',
        text: '点「取消」或关闭弹窗，**状态不变**。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-11',
    operation: '启用分类',
    buttonText: '启用 / 确认启用',
    selector: 'category.row.enable',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'category.row.enable', label: '启用', reason: '行操作「启用」' },
      { selector: 'category.confirm.ok', label: '确认启用', reason: '二次确认弹窗' },
      { selector: 'category.confirm.cancel', label: '取消（确认弹窗）', reason: '同弹窗操作项' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-cat-disable',
    title: '禁用分类',
    code: 'B01-12',
    blocks: [
      { type: 'heading', text: '显示条件' },
      {
        type: 'paragraph',
        text: '**只在该分类当前为「启用」时**，操作列才显示「禁用」。',
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'list',
        items: [
          '点击后弹出二次确认弹窗，标题「确认禁用」。',
          '正文为「确认将分类『分类名称』（分类编码）禁用？」，并补充提示「禁用后，新产品建档时不可再选择该分类；历史引用数据保留不变。」',
          '底栏为「取消」与「确认禁用」。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '确认后该分类变为「禁用」，提示「禁用成功」，清单与分类树刷新。',
      },
      { type: 'heading', text: '规则与影响' },
      {
        type: 'list',
        items: [
          '禁用后，产品信息库新建产品时**该分类不可选**。',
          '**已引用该分类的产品及已生成的核算结果不受影响，历史引用数据保留**。',
          '该分类**仍可被查看、编辑，仍出现在分类树中，仍可作为其他分类的上级，其下仍可新增分类**。',
        ],
      },
      { type: 'heading', text: '待确认' },
      {
        type: 'callout',
        text: '① 文档约定「分类已被产品引用、或存在启用中的下级分类时不可禁用」，原型未做拦截，启用态一律可直接禁用；② 禁用某个分类时其下级仍为启用，原型不做提示也不做级联处理，上下级状态可以不一致。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-12',
    operation: '禁用分类',
    buttonText: '禁用 / 确认禁用',
    selector: 'category.row.disable',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'category.row.disable', label: '禁用', reason: '行操作「禁用」' },
      { selector: 'category.confirm.ok', label: '确认禁用', reason: '二次确认弹窗' },
      { selector: 'category.confirm.cancel', label: '取消（确认弹窗）', reason: '同弹窗操作项' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-cat-save',
    title: '弹窗的保存与取消',
    code: 'B01-13',
    blocks: [
      { type: 'heading', text: '保存' },
      {
        type: 'list',
        items: [
          '点击后先**校验填写内容**，通过后保存并关闭弹窗。',
          '页面提示「保存成功」，**分类树与清单同步刷新**。',
          '保存过程中按钮显示「保存中…」并暂时不可点击，**避免重复提交**。',
        ],
      },
      { type: 'heading', text: '校验规则（任一不通过即阻断保存，弹窗不关闭，已填内容全部保留）' },
      {
        type: 'list',
        items: [
          '分类编码未填写 → 「请输入分类编码」',
          '分类名称未填写 → 「请输入分类名称」',
          '分类编码与已有分类重复 → 「分类编码已存在，请修改后重试」',
          '同一级内排序号与其他分类重复 → 「同级内排序号已存在，请修改后重试」（排序号留空不参与重复判断）',
          '编辑时移动上级导致任一分类层级超过六级 → 「移动后分类层级将超过六级上限，请调整上级分类」',
        ],
      },
      { type: 'heading', text: '保存失败' },
      {
        type: 'paragraph',
        text: '给出失败原因提示，弹窗保持打开、内容保留。',
      },
      { type: 'heading', text: '取消' },
      {
        type: 'paragraph',
        text: '点「取消」或关闭弹窗**不保存任何内容**；再次打开时**不保留上次填写的内容**。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.4 B01-13',
    operation: '保存 / 取消',
    buttonText: '保存 / 取消',
    selector: 'category.form.save',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'category.form.save', label: '保存', reason: '弹窗底栏主按钮' },
      { selector: 'category.form.cancel', label: '取消', reason: '弹窗底栏按钮' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 字段说明 ==================== */
  {
    id: 'ann-cat-field-parent',
    title: '字段：上级分类',
    code: 'B01-14',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '该分类在分类树中的父级；为空表示一级分类。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'list',
        items: [
          '新增一级分类：显示为只读文本「无上级（一级分类）」。',
          '新增下级分类：显示为只读文本（所选上级名称）。',
          '编辑时：变为下拉选择。',
        ],
      },
      { type: 'heading', text: '可选范围' },
      {
        type: 'list',
        items: [
          '所有层级未达六级的分类（不限启用 / 禁用）。',
          '排除该分类自身及其全部下级。',
          '不满足范围的分类不出现在下拉中。',
        ],
      },
      { type: 'heading', text: '下拉交互' },
      {
        type: 'list',
        items: [
          '支持关键词搜索（按分类名称或分类编码命中，结果直接展示所属层级）。',
          '支持按层级逐级展开 / 收起，打开时默认全部收起。',
          '下拉内提供显式「无上级（一级分类）」选项。',
          '关闭下拉后重置搜索词与展开状态。',
        ],
      },
      { type: 'heading', text: '默认值' },
      {
        type: 'paragraph',
        text: '新增一级分类为空；新增下级分类为所选节点。',
      },
      { type: 'heading', text: '联动与限制' },
      {
        type: 'paragraph',
        text: '变更上级后「分类层级」**立即按「新上级层级 + 1」重新计算**；若级联重算后超过六级，**保存被阻断**。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.5 B01-14',
    operation: '上级分类',
    buttonText: '上级分类',
    selector: 'category.form.parent',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.form.parent', label: '上级分类', reason: '表单字段' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-cat-field-code',
    title: '字段：分类编码',
    code: 'B01-15',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '分类的唯一标识，用于清单展示与核对。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'list',
        items: [
          '手工填写，输入框提示「如 BAM-01」。',
          '不约束编码格式，不要求遵循固定层级编码规律。',
        ],
      },
      { type: 'heading', text: '必填' },
      {
        type: 'paragraph',
        text: '**必填**；为空时提示「请输入分类编码」并阻断保存。',
      },
      { type: 'heading', text: '重复限制' },
      {
        type: 'paragraph',
        text: '**全平台唯一**，新增与编辑保存时都校验；重复时提示「分类编码已存在，请修改后重试」。',
      },
      { type: 'heading', text: '长度上限' },
      {
        type: 'paragraph',
        text: '≤ 32 个字符（推荐口径）。',
      },
      { type: 'heading', text: '可否修改' },
      {
        type: 'paragraph',
        text: '编辑时可修改（**被产品引用后是否转为只读见全局批注「待确认事项」**）。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.5 B01-15',
    operation: '分类编码',
    buttonText: '分类编码',
    selector: 'category.form.code',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'category.form.code', label: '分类编码（表单）', reason: '表单字段' },
      { selector: 'category.col.code', label: '分类编码（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-cat-field-name',
    title: '字段：分类名称',
    code: 'B01-16',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '分类的展示名称，也是分类树与清单中用户识别的依据。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'paragraph',
        text: '手工填写。',
      },
      { type: 'heading', text: '必填' },
      {
        type: 'paragraph',
        text: '**必填**；为空时提示「请输入分类名称」并阻断保存。',
      },
      { type: 'heading', text: '重复限制' },
      {
        type: 'paragraph',
        text: '不要求同一级下名称唯一，**允许重名**。',
      },
      { type: 'heading', text: '长度上限' },
      {
        type: 'paragraph',
        text: '≤ 64 个字符（推荐口径）。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.5 B01-16',
    operation: '分类名称',
    buttonText: '分类名称',
    selector: 'category.form.name',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'category.form.name', label: '分类名称（表单）', reason: '表单字段' },
      { selector: 'category.col.name', label: '分类名称（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-cat-field-level',
    title: '字段：分类层级',
    code: 'B01-17',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '表示分类在树中的深度，按层级展示为「一级分类」至「六级分类」。',
      },
      { type: 'heading', text: '来源' },
      {
        type: 'paragraph',
        text: '不由用户填写，**随「上级分类」的选择自动计算**——无上级为一级分类，否则为上级分类层级 + 1。',
      },
      { type: 'heading', text: '限制' },
      {
        type: 'list',
        items: [
          '**最多六级**。',
          '已达六级的分类不再提供「+ 新增下级分类」入口。',
          '移动上级导致后代超过六级时**阻断保存**。',
        ],
      },
      { type: 'heading', text: '联动' },
      {
        type: 'paragraph',
        text: '编辑时改「上级分类」，「分类层级」立即跟着变化；移动带下级的分类时，**其全部下级的层级级联重算**。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.5 B01-17',
    operation: '分类层级',
    buttonText: '分类层级',
    selector: 'category.form.level',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'category.form.level', label: '分类层级（表单）', reason: '表单字段（只读）' },
      { selector: 'category.col.level', label: '分类层级（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-cat-field-sortno',
    title: '字段：排序号',
    code: 'B01-18',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '决定同一级分类的展示先后。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'list',
        items: [
          '手工填写，输入框提示「越小越靠前，可留空」。',
          '输入时非数字字符会被自动过滤，不做额外提示。',
        ],
      },
      { type: 'heading', text: '必填与取值范围' },
      {
        type: 'paragraph',
        text: '**选填，默认为空**；取值范围为非负整数，可留空。',
      },
      { type: 'heading', text: '重复限制' },
      {
        type: 'paragraph',
        text: '同一级内**不允许重复**，重复时阻断保存并提示「同级内排序号已存在，请修改后重试」；**留空不参与重复判断，同一级允许多个分类留空**。',
      },
      { type: 'heading', text: '排序口径' },
      {
        type: 'paragraph',
        text: '同级内按排序号升序展示，**留空的排在同级最后**。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.5 B01-18',
    operation: '排序号',
    buttonText: '排序号',
    selector: 'category.form.sortNo',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'category.form.sortNo', label: '排序号（表单）', reason: '表单字段' },
      { selector: 'category.col.sortNo', label: '排序号（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-cat-field-remark',
    title: '字段：备注',
    code: 'B01-19',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '补充说明该分类的适用范围或口径，便于他人理解。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'list',
        items: [
          '多行文本，提示「选填」，整行显示。',
          '**选填**。',
        ],
      },
      { type: 'heading', text: '长度上限' },
      {
        type: 'paragraph',
        text: '≤ 200 个字符（推荐口径）。',
      },
      { type: 'heading', text: '展示' },
      {
        type: 'paragraph',
        text: '仅在查看弹窗中展示，清单中不展示；为空时显示「-」。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.5 B01-19',
    operation: '备注',
    buttonText: '备注',
    selector: 'category.form.remark',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.form.remark', label: '备注', reason: '表单字段' }],
    global: false,
    priority: 'low',
  },
  {
    id: 'ann-cat-view-meta',
    title: '查看弹窗中的制单信息',
    code: 'B01-21',
    blocks: [
      { type: 'heading', text: '创建人 / 创建时间' },
      {
        type: 'paragraph',
        text: '新增保存时由系统记录，**不可维护**。',
      },
      { type: 'heading', text: '最后修改时间' },
      {
        type: 'paragraph',
        text: '每次保存、每次启用 / 禁用都会刷新，用于追溯最近变更；清单中也有该列。',
      },
      { type: 'heading', text: '展示位置' },
      {
        type: 'paragraph',
        text: '三者均**只在查看弹窗中查看**（创建人、创建时间不进入清单）。',
      },
      { type: 'heading', text: '数据性质' },
      {
        type: 'callout',
        text: '原型中为演示数据（内置演示值），正式实现需由系统按真实操作记录生成。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.5 B01-21',
    operation: '制单信息',
    buttonText: '创建人 / 创建时间 / 最后修改时间',
    selector: 'category.view.meta',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'category.view.meta', label: '制单信息', reason: '查看弹窗制单信息行' }],
    global: false,
    priority: 'low',
  },
]

/** 全局批注（跨页面 / 文档级说明，进入右下角「全局批注」抽屉） */
export const categoryGlobalAnnotations: Annotation[] = [
  {
    id: 'gann-cat-status-form',
    title: '使用状态（表单口径）',
    code: 'B01-20',
    blocks: [
      {
        type: 'paragraph',
        text: '新增 / 编辑表单中**不出现使用状态**，用户不能在表单内改动它。',
      },
      {
        type: 'paragraph',
        text: '新增保存后默认「启用」；之后**只能通过清单操作列的「启用」「禁用」变更**。',
      },
      {
        type: 'paragraph',
        text: '清单与查看弹窗中均以状态标签展示。（完整口径引用 B01-03）',
      },
    ],
    source: '《产品分类功能批注》V1.1 §1.5 B01-20',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    unmatchedReason: '表单内不展示该内容，其口径与「使用状态」保持一处完整说明，此处仅作引用。',
  },
  {
    id: 'gann-cat-scope',
    title: '本期不包含的能力',
    blocks: [
      { type: 'heading', text: '本期不包含' },
      {
        type: 'list',
        items: [
          '不提供导出（分类数据不作为导出对象）',
          '不提供删除（停用统一用「禁用」）',
          '不提供批量操作',
          '不提供导入',
          '没有提交 / 审核 / 驳回',
          '不做版本化（编辑直接覆盖）',
          '不提供操作日志入口',
        ],
      },
    ],
    source: '《产品分类功能批注》V1.1 §3 / §4.2',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    category: '能力',
    unmatchedReason: '范围类说明，对应多个被移除的能力，无唯一操作目标。',
  },
  {
    id: 'gann-cat-todo',
    title: '待确认事项（尚未裁决，不作为需求依据）',
    blocks: [
      { type: 'heading', text: '待裁决问题' },
      {
        type: 'list',
        ordered: true,
        items: [
          '分类树与清单无内容时是否需要专门的空态提示文案',
          '分类被产品引用后，分类编码等哪些内容转为只读',
          '分类已被产品引用、或存在启用中的下级分类时是否允许禁用',
          '禁用某个分类时其下级仍为启用是否允许、是否需要提示或级联处理',
          '谁可以维护产品分类、谁只能查看（角色与权限）',
          '分类数据是否按组织隔离可见范围',
          '是否需要与上游系统同步分类数据',
        ],
      },
    ],
    source: '《产品分类功能批注》V1.1 §4.1',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '待确认事项',
    unmatchedReason: '尚未裁决的问题清单，不混入正式业务规则，统一在全局批注中提示。',
  },
  {
    id: 'gann-cat-mock',
    title: '数据性质（原型演示数据）',
    blocks: [
      {
        type: 'paragraph',
        text: '本页数据为原型演示数据：分类为内存态，刷新后回到初始状态（当前不预置任何分类，初始为空）；制单信息为演示值。',
      },
      {
        type: 'paragraph',
        text: '正式实现需由系统按真实数据与真实操作记录生成。',
      },
    ],
    source: '《产品分类功能批注》V1.1 §0 / §3',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
]
