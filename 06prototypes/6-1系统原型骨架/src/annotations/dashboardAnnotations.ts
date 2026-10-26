import type { Annotation } from './types'

/**
 * 工作台功能批注数据（对齐《工作台功能批注》V1.0，编号 P01-01 ~ P01-22）。
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：跨页面 / 文档级说明，进入「全局批注」抽屉。
 * 说明：工作台为只读汇总页，内容按「整体流程 / 全局规则 / 数据装载 / 业务状态口径 /
 *       区块说明与操作 / 字段说明」组织；编号（code）作辅助信息，业务主题作主标题。
 */
export const dashboardAnnotations: Annotation[] = [
  /* ==================== 欢迎行：整体流程 + 全局规则 + 数据装载（全局说明入口） ==================== */
  {
    id: 'ann-dash-flow',
    title: '工作台使用流程',
    code: 'P01-01',
    blocks: [
      {
        type: 'paragraph',
        text: '登录后查看「最近算得怎么样、还有什么没算、组织家底有多少」，再决定去哪个模块继续。',
      },
      { type: 'heading', text: '主流程' },
      {
        type: 'steps',
        items: [
          '进入工作台（登录后默认落到本页）',
          '页面自动汇总数据并渲染六个区块',
          '看「碳排放总览」了解最近一个已完成核算的产品碳足迹',
          '看「核算进度」了解待计算 / 已计算数量',
          '从待办卡直接去完成最近的待核算项目',
          '需要看单个项目时，从「碳足迹概览」卡片进入',
        ],
      },
      { type: 'heading', text: '分支（无数据情形）' },
      {
        type: 'list',
        items: [
          '没有任何已完成核算：总览不显示数值，改为引导文案',
          '没有待核算项目：待办区不显示卡片，改为空态',
          '没有任何核算项目：概览区改为引导文案',
        ],
      },
      { type: 'heading', text: '衔接与结束' },
      {
        type: 'paragraph',
        text: '本页只做查看与跳转，**不承载任何写操作**；要新建核算必须去「碳足迹核算」列表，本页不提供入口。',
      },
      {
        type: 'paragraph',
        text: '本页没有提交、审核、保存动作，也没有流程终点；看完或点卡片进入其他页面即离开，下次进入重新汇总。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.1 P01-01',
    operation: '整体流程',
    buttonText: '欢迎行（全局说明入口）',
    selector: 'dashboard.intro.title',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.intro.title', label: '欢迎回来（欢迎行标题）', reason: '全局说明入口' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dash-global-rules',
    title: '全局规则',
    code: 'P01-02',
    blocks: [
      { type: 'heading', text: '只读与无入口' },
      {
        type: 'list',
        items: [
          '本页**没有任何写操作**：不提供新增、编辑、删除、导入、导出入口，也没有可提交的表单。',
          '**不提供「新增核算 / 新增产品模型」**，新建核算记录统一走「碳足迹核算」列表，概览区空态文案负责引导。',
        ],
      },
      { type: 'heading', text: '数据来源与范围' },
      {
        type: 'list',
        items: [
          '全部为只读汇总：核算项目及其最近一次核算结果、我的产品库、当前登录用户所属组织；本页不单独产生数据。',
          '欢迎语与「组织统计」卡片标题取**当前登录用户所属组织**，不由用户手工选择；本期单组织，不提供组织切换。',
        ],
      },
      { type: 'heading', text: '展示口径' },
      {
        type: 'list',
        items: [
          '**概念不外露**：不展示计算式、因子、异常编号、专业术语与内部字段名。',
          '**数值格式统一**：最多四位小数并去掉末尾无效的 0；无结果显示 `-`。',
          '**单位书写保留两种写法**：碳排放总览写 `kgCO₂e`，碳足迹概览卡片写 `kg CO2-Eq`，同一单位两处写法不同，以原型为准暂不统一。',
          '**统计口径与「碳足迹核算」一致**：待计算 / 已计算 / 报告三组分群随项目状态定义走（见 P01-04）。',
        ],
      },
      { type: 'heading', text: '原型已表现·待核对' },
      {
        type: 'callout',
        text: '原型未对汇总接口失败做处理（无错误提示与重试），且汇总取全部项目、未按所属组织过滤；正式实现的失败处理与数据范围口径见全局批注「待确认事项」。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.2 P01-02',
    operation: '全局规则',
    buttonText: '欢迎行（全局说明入口）',
    selector: 'dashboard.intro.title',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.intro.title', label: '欢迎回来（欢迎行标题）', reason: '全局说明入口' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dash-loading',
    title: '进入工作台与数据装载（含加载态）',
    code: 'P01-03',
    blocks: [
      { type: 'heading', text: '触发' },
      {
        type: 'paragraph',
        text: '从菜单进入工作台，或登录后自动落到本页；**每次进入都重新汇总，不缓存上次结果**。',
      },
      { type: 'heading', text: '装载顺序' },
      {
        type: 'list',
        items: [
          '先并行取「核算项目列表 / 我的产品库 / 当前用户所属组织」',
          '再据此逐项目取各自最近一次核算结果',
          '全部到位后一次性渲染',
        ],
      },
      { type: 'heading', text: '加载中表现' },
      {
        type: 'paragraph',
        text: '统计数字先显示 `-`，总览区与待办区显示「加载中…」；**不出现空白面板，也不出现未格式化的原始数值**。',
      },
      { type: 'heading', text: '结果' },
      {
        type: 'paragraph',
        text: '装载完成后六个区块按最终数据渲染；没有数据时按各区块的空态文案展示。',
      },
      { type: 'heading', text: '刷新' },
      {
        type: 'paragraph',
        text: '本页**不提供刷新按钮，也不自动轮询**；要看最新数据需重新进入本页。',
      },
      { type: 'heading', text: '待确认' },
      {
        type: 'callout',
        text: '汇总接口失败时是否补错误提示与重试入口，原型未处理（见全局批注「待确认事项」）。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.3 P01-03',
    operation: '页面装载 / 加载态',
    buttonText: '欢迎行（全局说明入口）',
    selector: 'dashboard.intro.title',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.intro.title', label: '欢迎回来（欢迎行标题）', reason: '全局说明入口' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 欢迎行（区块说明 + 字段） ==================== */
  {
    id: 'ann-dash-intro',
    title: '欢迎行',
    code: 'P01-15',
    blocks: [
      { type: 'heading', text: '展示内容' },
      {
        type: 'list',
        items: [
          '主标题「欢迎回来，{当前组织名}」',
          '副标题「产品碳足迹核算工作台 · {当天日期}」',
        ],
      },
      { type: 'heading', text: '取值口径' },
      {
        type: 'list',
        items: [
          '组织名取**当前登录用户所属组织**',
          '当天日期取**进入页面时的系统日期**（年 / 月 / 日），不是数据更新时间',
          '组织名为空时主标题显示 `—`，不做隐藏、不显示替代文案',
        ],
      },
      { type: 'heading', text: '不具备的内容' },
      {
        type: 'paragraph',
        text: '本行**不提供任何操作**——没有「新增核算」按钮、没有日期切换、没有组织切换；需要新建核算去「碳足迹核算」列表。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-15',
    operation: '欢迎行',
    buttonText: '欢迎行副标题',
    selector: 'dashboard.intro.sub',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.intro.sub', label: '产品碳足迹核算工作台 · 日期', reason: '欢迎行副标题' }],
    global: false,
    priority: 'low',
  },

  /* ==================== 碳排放总览 ==================== */
  {
    id: 'ann-dash-hero',
    title: '碳排放总览（最近一个已完成核算）',
    code: 'P01-05',
    blocks: [
      { type: 'heading', text: '区块目的' },
      {
        type: 'paragraph',
        text: '一屏讲清最近一次核算成果，回答「最近算得怎么样」。',
      },
      { type: 'heading', text: '取数规则' },
      {
        type: 'list',
        items: [
          '只在**已完成核算**的项目中，取**核算时间最近的那一条**',
          '**不是累计值，也不是全部项目的合计**',
          '没有符合条件的项目时不显示数值',
        ],
      },
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '产品名称、碳足迹大数（**每声明单位**的碳排放量）、核算时间，以及各生命周期阶段的构成条形图。',
      },
      { type: 'heading', text: '展示限制' },
      {
        type: 'paragraph',
        text: '本区块**只展示这一条记录**：不提供历史列表、切换框、时间范围筛选；要看历史记录去「碳足迹核算」列表。',
      },
      { type: 'heading', text: '无内容时' },
      {
        type: 'paragraph',
        text: '显示引导文案「暂无已完成核算的产品，完成首次核算后展示碳足迹与阶段构成」；**不出现 0、不出现占位数值**。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-05',
    operation: '碳排放总览',
    buttonText: '碳排放总览（区块标题）',
    selector: 'dashboard.hero',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dashboard.hero', label: '碳排放总览（标题）', reason: '区块标题' },
      { selector: 'dashboard.hero.blank', label: '总览空态', reason: '同区块的空态表现' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dash-stages',
    title: '各阶段构成',
    code: 'P01-06',
    blocks: [
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '该产品生命周期各一级阶段逐行展示：阶段名称、条形（按占比填充）、该阶段排放量、占总排放百分比。',
      },
      { type: 'heading', text: '形成规则' },
      {
        type: 'list',
        items: [
          '条形长度按该阶段**占比**填充',
          '**占比很小但排放量为正时仍保证一小段可见**（最小 2% 兜底）',
          '**排放量为 0 或负值时条形为空**',
        ],
      },
      { type: 'heading', text: '解读口径' },
      {
        type: 'paragraph',
        text: '各行占比之和为 100%；阶段名称与行数随该项目核算范围而定，本页不固定阶段数量与顺序。',
      },
      { type: 'heading', text: '数据来源' },
      {
        type: 'paragraph',
        text: '取自该产品**最近一次核算结果**，不由用户在本页填写或修改。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-06',
    operation: '各阶段构成',
    buttonText: '各阶段构成',
    selector: 'dashboard.hero.stages',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.hero.stages', label: '各阶段构成', reason: '阶段构成面板' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-dash-field-product',
    title: '字段：产品名称',
    code: 'P01-16',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '被核算的产品名称，是该条记录的用户识别依据。',
      },
      { type: 'heading', text: '取值规则' },
      {
        type: 'paragraph',
        text: '优先取项目上登记的产品名称；**产品名称为空时回退显示项目名称**，保证两处都不会出现空白标题。',
      },
      { type: 'heading', text: '展示与修改' },
      {
        type: 'list',
        items: [
          '过长时单行省略显示，鼠标悬停可看完整名称',
          '**本页不可修改**，需要在项目中维护',
        ],
      },
    ],
    source: '《工作台功能批注》V1.0 §1.6 P01-16',
    operation: '产品名称',
    buttonText: '产品名称（总览 / 概览卡片）',
    selector: 'dashboard.hero.product',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dashboard.hero.product', label: '产品名称（总览）', reason: '总览字段' },
      { selector: 'dashboard.fp.name', label: '产品名称（概览卡片）', reason: '同字段的另一处展示' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-dash-field-value',
    title: '字段：碳足迹数值 / 单位 / 核算时间',
    code: 'P01-17',
    blocks: [
      { type: 'heading', text: '碳足迹数值' },
      {
        type: 'paragraph',
        text: '该项目**每声明单位**的产品碳足迹（**不是总量**），取最近一次核算结果。',
      },
      { type: 'heading', text: '数值格式' },
      {
        type: 'paragraph',
        text: '最多保留**四位小数**并去掉末尾无效的 0；无结果或异常值时显示 `-`。',
      },
      { type: 'heading', text: '单位书写' },
      {
        type: 'callout',
        text: '碳排放总览写 `kgCO₂e`，碳足迹概览卡片写 `kg CO2-Eq`——两处含义相同、书写不同，以原型为准保留现状（是否统一见全局批注「待确认事项」）。',
      },
      { type: 'heading', text: '核算时间' },
      {
        type: 'paragraph',
        text: '该产品**最近一次完成核算**的时间；为空时显示 `—`。',
      },
      { type: 'heading', text: '数据来源' },
      {
        type: 'paragraph',
        text: '全部来自最近一次核算结果，**本页不重算、不换单位、不做二次舍入**。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.6 P01-17',
    operation: '碳足迹数值 / 单位 / 核算时间',
    buttonText: '碳足迹数值、核算时间',
    selector: 'dashboard.hero.value',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dashboard.hero.value', label: '碳足迹大数（总览）', reason: '数值与单位展示位' },
      { selector: 'dashboard.hero.time', label: '核算时间', reason: '同批注包含核算时间口径' },
      { selector: 'dashboard.fp.value', label: '碳足迹数值（概览卡片）', reason: '同字段的另一处展示' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 核算进度 / 状态口径 / 待办 ==================== */
  {
    id: 'ann-dash-status-group',
    title: '核算项目状态与三组统计口径',
    code: 'P01-04',
    blocks: [
      { type: 'heading', text: '说明对象' },
      {
        type: 'paragraph',
        text: '本页自身**没有业务状态**；这里说明的是被汇总对象——核算项目的状态，它决定项目被计入哪一组统计、以及能否成为待办。',
      },
      { type: 'heading', text: '分群口径' },
      {
        type: 'table',
        columns: ['分群', '包含的项目状态', '本页用于'],
        rows: [
          [
            '待计算组',
            '新建、待处理、待检测、检测中、待核算、核算中、核算失败',
            '「待计算产品」计数、待办卡选取范围',
          ],
          ['已计算组', '已完成，以及历史遗留的「已核算」', '「已计算产品 / 已计算数量」计数、碳排放总览选取范围'],
          [
            '报告组（历史保留）',
            '报告生成中、报告编制中',
            '仅「报告数量」计数；流程不再产生这两种状态，通常为 0',
          ],
        ],
      },
      { type: 'heading', text: '状态来源与变化' },
      {
        type: 'paragraph',
        text: '状态随核算流程推进而变化，由「碳足迹核算」内的操作（保存、检测、核算等）驱动；**本页不改动任何项目状态**。',
      },
      { type: 'heading', text: '界面表现' },
      {
        type: 'paragraph',
        text: '待办卡的状态标签文字与配色沿用「碳足迹核算」的统一口径，本页不自定义。',
      },
      { type: 'heading', text: '原型已表现·待核对' },
      {
        type: 'callout',
        text: '原型把「已完成」与历史态「已核算」都计入「已计算产品」，与 PRD / 字段清单把历史态单独归到报告组的写法不同，需裁决后统一口径（见全局批注「待确认事项」）。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.4 P01-04',
    operation: '核算项目状态 / 分群口径',
    buttonText: '核算进度（卡片标题）',
    selector: 'dashboard.progress',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dashboard.progress', label: '核算进度（卡片标题）', reason: '统计口径展示位置' },
      { selector: 'dashboard.todo.status', label: '待办状态标签', reason: '同一口径引用' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dash-progress',
    title: '核算进度统计',
    code: 'P01-07',
    blocks: [
      { type: 'heading', text: '区块目的' },
      {
        type: 'paragraph',
        text: '回答「还有什么没算」，并给出最快的继续入口。',
      },
      { type: 'heading', text: '展示内容' },
      {
        type: 'list',
        items: [
          '**待计算产品**：处于待计算组的项目数量',
          '**已计算产品**：处于已计算组的项目数量',
        ],
      },
      { type: 'heading', text: '计数口径' },
      {
        type: 'list',
        items: [
          '按**项目数量**统计（一个项目计一条）',
          '**不是按产品去重**，也不是按核算结果版本数统计',
          '同一产品的多条核算记录分别计数',
        ],
      },
      { type: 'heading', text: '关联与表现' },
      {
        type: 'list',
        items: [
          '两个数量互斥，使用同一份项目列表；**项目状态变化后，下次进入本页两个数字同步变化**',
          '加载中显示 `-`，**不显示 0**，避免误读为「没有待办」',
        ],
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-07',
    operation: '核算进度统计',
    buttonText: '核算进度（卡片标题）',
    selector: 'dashboard.progress',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.progress', label: '核算进度（卡片标题）', reason: '统计区块' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dash-todo',
    title: '待办卡',
    code: 'P01-08',
    blocks: [
      { type: 'heading', text: '区块目的' },
      {
        type: 'paragraph',
        text: '把「下一个该处理的项目」直接摆在进度卡里，减少查找成本。',
      },
      { type: 'heading', text: '选取规则' },
      {
        type: 'list',
        items: [
          '在待计算组的项目中，取**最近更新过的那一个**',
          '**只取一条**：不做清单、不分页、不排序',
        ],
      },
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '项目名称、项目当前状态标签、元信息（所属行业 · 系统边界 · 最近更新时间）。',
      },
      { type: 'heading', text: '展示规则' },
      {
        type: 'list',
        items: [
          '所属行业为空时显示「未填行业」',
          '元信息各段为空时自动省略该段，段之间用「·」连接',
          '项目名过长省略显示',
        ],
      },
      { type: 'heading', text: '覆盖范围与无内容时' },
      {
        type: 'list',
        items: [
          '只覆盖本组织可见的核算项目；项目变为已计算后，待办卡自动换成下一个待计算项目',
          '无内容时显示「暂无待核算项目」；加载过程中显示「加载中…」',
        ],
      },
      { type: 'heading', text: '原型已表现·待核对' },
      {
        type: 'callout',
        text: '只显示一条待办，是否需要待办清单或多条待办尚未裁决（见全局批注「待确认事项」）。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-08',
    operation: '待办卡',
    buttonText: '待办卡',
    selector: 'dashboard.todo',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dashboard.todo', label: '待办卡', reason: '待办区块' },
      { selector: 'dashboard.todo.empty', label: '待办空态', reason: '同区块的空态表现' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dash-todo-status',
    title: '待办卡状态标签与元信息',
    code: 'P01-09',
    blocks: [
      { type: 'heading', text: '状态标签' },
      {
        type: 'list',
        items: [
          '展示该项目当前所处的状态（如待处理、待检测、待核算、核算失败等）',
          '文字与配色沿用「碳足迹核算」的统一口径，**本页不自定义文案**',
        ],
      },
      { type: 'heading', text: '标签含义' },
      {
        type: 'paragraph',
        text: '标签只说明「该项目目前停在流程哪一步」，不代表工作台对它的处理能力；**本页不会因标签不同而改变可进行的动作**（一律只能查看与跳转）。',
      },
      { type: 'heading', text: '元信息' },
      {
        type: 'list',
        items: [
          '所属行业取自项目所属行业字段',
          '系统边界取自该项目设定的核算边界并转成界面文案',
          '最近更新时间为该项目最后一次发生变更的时间',
        ],
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-09',
    operation: '待办状态标签 / 元信息',
    buttonText: '状态标签',
    selector: 'dashboard.todo.status',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.todo.status', label: '待办状态标签', reason: '状态展示位置' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-dash-todo-go',
    title: '「去完成」跳转',
    code: 'P01-10',
    blocks: [
      { type: 'heading', text: '操作目的' },
      {
        type: 'paragraph',
        text: '直接继续处理该项目，不经过列表查找。',
      },
      { type: 'heading', text: '可操作条件' },
      {
        type: 'paragraph',
        text: '**存在至少一条待计算组的项目**时显示该卡片；与项目具体状态无关（任何一个待计算状态都可继续）。',
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'paragraph',
        text: '**整张待办卡可点**，右侧「去完成」为明确的动作提示，两者结果相同。',
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '进入该核算项目的项目工作台，**落在该项目当前所处步骤上**，而不是固定回到第一步；本页不发生任何数据变更。',
      },
      { type: 'heading', text: '边界' },
      {
        type: 'paragraph',
        text: '跳转后原页面数据不再自动刷新；完成处理后返回工作台，需重新进入或刷新页面才能看到更新后的统计与待办。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-10',
    operation: '去完成（跳转）',
    buttonText: '去完成',
    selector: 'dashboard.todo.go',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dashboard.todo.go', label: '去完成', reason: '跳转入口' },
      { selector: 'dashboard.todo', label: '待办卡整卡', reason: '整卡可点，同跳转结果' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 组织统计 ==================== */
  {
    id: 'ann-dash-org',
    title: '组织统计卡',
    code: 'P01-11',
    blocks: [
      { type: 'heading', text: '区块目的' },
      {
        type: 'paragraph',
        text: '一屏盘点组织家底，回答「组织已有多少资产与成果」。',
      },
      { type: 'heading', text: '卡片标题' },
      {
        type: 'paragraph',
        text: '当前登录用户所属组织的名称；**组织名为空时兜底显示「我的组织」**。',
      },
      { type: 'heading', text: '展示内容' },
      {
        type: 'list',
        items: [
          '**已计算数量**：已完成核算的项目数，与左侧「已计算产品」同源同值',
          '**产品数量**：我的产品库中的产品条数（组织自建与引用平台产品合计）',
          '**报告数量**：处于历史报告态的项目数',
        ],
      },
      { type: 'heading', text: '计数口径' },
      {
        type: 'paragraph',
        text: '产品数量按我的产品库现有条目计数，**不区分上架 / 下架，也不去重引用同一平台产品的多条副本**；加载中三项均显示 `-`。',
      },
      { type: 'heading', text: '待确认' },
      {
        type: 'callout',
        text: '核算流程调整后不再产生历史报告态，「报告数量」通常会一直为 0；是否保留该项或换成其他统计尚未裁决（见全局批注「待确认事项」）。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-11',
    operation: '组织统计',
    buttonText: '组织统计（卡片标题）',
    selector: 'dashboard.org',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.org', label: '组织统计（卡片标题）', reason: '统计区块' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dash-stat-values',
    title: '字段：待计算 / 已计算 / 产品 / 报告 四项统计值',
    code: 'P01-18',
    blocks: [
      { type: 'heading', text: '四项口径' },
      {
        type: 'table',
        columns: ['统计值', '口径'],
        rows: [
          ['待计算产品', '处于待计算组的项目条数（见 P01-04）'],
          ['已计算产品 / 已计算数量', '处于已完成与历史「已核算」状态的项目条数；**两处同源同值**'],
          ['产品数量', '我的产品库现有产品条数（自建 + 引用），**不做上架过滤**'],
          ['报告数量', '处于历史报告态的项目条数；流程调整后通常恒为 0'],
        ],
      },
      { type: 'heading', text: '一致性提示' },
      {
        type: 'paragraph',
        text: '「已计算产品」与「已计算数量」出现数值不一致属于数据异常，应以同一份项目列表为准。',
      },
      { type: 'heading', text: '加载表现' },
      {
        type: 'paragraph',
        text: '四项数值在加载过程中**均显示 `-`，不显示 0**，避免出现误导性的「无数据」。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.6 P01-18',
    operation: '统计字段',
    buttonText: '统计数值',
    selector: 'dashboard.org',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dashboard.org', label: '组织统计三项数值', reason: '字段展示位置' },
      { selector: 'dashboard.progress', label: '核算进度两项数值', reason: '同批注包含的统计值' },
    ],
    global: false,
    priority: 'medium',
  },

  /* ==================== 碳足迹概览 + 碳报告 ==================== */
  {
    id: 'ann-dash-fp',
    title: '碳足迹概览卡片',
    code: 'P01-12',
    blocks: [
      { type: 'heading', text: '区块目的' },
      {
        type: 'paragraph',
        text: '给出最近几条核算记录的快捷入口，便于逐个查看。',
      },
      { type: 'heading', text: '取数规则' },
      {
        type: 'list',
        items: [
          '取项目列表中**最近更新的前 3 条**（按更新时间倒序），**不论项目状态**',
          '不足 3 条时按实际条数展示',
        ],
      },
      { type: 'heading', text: '卡片内容' },
      {
        type: 'paragraph',
        text: '产品名称、核算主体、所属行业、创建人、碳足迹数值（每声明单位排放量）。',
      },
      { type: 'heading', text: '数值口径' },
      {
        type: 'paragraph',
        text: '取该项目**最近一次核算结果**的数值；**项目尚无核算结果时数值显示为 `-`，而不是 0**；加载中也显示 `-`。',
      },
      { type: 'heading', text: '无内容时' },
      {
        type: 'paragraph',
        text: '整个概览区显示引导文案「暂无核算记录，去「产品碳足迹核算」新增」。',
      },
      { type: 'heading', text: '待确认' },
      {
        type: 'callout',
        text: '概览卡片数量固定为 3 张且不可配置，是否需要开放配置尚未裁决（见全局批注「待确认事项」）。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-12',
    operation: '碳足迹概览',
    buttonText: '碳足迹概览（卡片标题）',
    selector: 'dashboard.fp',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'dashboard.fp', label: '碳足迹概览（卡片标题）', reason: '区块标题' },
      { selector: 'dashboard.fp.card', label: '概览卡片', reason: '同区块的卡片表现' },
      { selector: 'dashboard.fp.empty', label: '概览空态', reason: '同区块的空态表现' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-dash-fp-card',
    title: '概览卡片跳转',
    code: 'P01-13',
    blocks: [
      { type: 'heading', text: '操作目的' },
      {
        type: 'paragraph',
        text: '查看某个具体项目的核算情况。',
      },
      { type: 'heading', text: '可操作条件' },
      {
        type: 'paragraph',
        text: '**任何状态的卡片都可点击**：不限制是否已有核算结果，也不限制项目状态。',
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'paragraph',
        text: '**整张卡片可点**（含右侧箭头提示），鼠标悬停时卡片有高亮反馈。',
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '进入该项目的项目工作台，**落在该项目当前所处步骤上**；本页不产生任何数据变更，也不改变卡片顺序。',
      },
      { type: 'heading', text: '边界' },
      {
        type: 'paragraph',
        text: '进入后不会自动回到工作台；返回需自行导航。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-13',
    operation: '概览卡片跳转',
    buttonText: '概览卡片',
    selector: 'dashboard.fp.card',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.fp.card', label: '概览卡片', reason: '可点跳转区域' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-dash-report',
    title: '碳报告（占位）',
    code: 'P01-14',
    blocks: [
      { type: 'heading', text: '区块目的' },
      {
        type: 'paragraph',
        text: '为后续报告能力预留位置，**本期只占位**。',
      },
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '固定占位空态：文件图标 +「暂无数据」，**不接入任何数据源**。',
      },
      { type: 'heading', text: '适用阶段' },
      {
        type: 'paragraph',
        text: '**任何数据条件下都这样显示**：即使已有核算结果或已生成过报告，本区块也不展示内容。',
      },
      { type: 'heading', text: '待确认' },
      {
        type: 'callout',
        text: '「报告管理」功能上线后，本区块是否改为展示真实报告数据尚未裁决（见全局批注「待确认事项」）。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 P01-14',
    operation: '碳报告（占位）',
    buttonText: '碳报告（卡片标题）',
    selector: 'dashboard.report',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'dashboard.report', label: '碳报告（卡片标题）', reason: '区块标题' }],
    global: false,
    priority: 'low',
  },
]

/** 全局批注（跨页面 / 文档级说明，进入右下角「全局批注」抽屉） */
export const dashboardGlobalAnnotations: Annotation[] = [
  {
    id: 'gann-dash-empty',
    title: '统一空态与占位口径',
    code: 'P01-19',
    blocks: [
      { type: 'heading', text: '四类空态 / 占位' },
      {
        type: 'table',
        columns: ['场景', '表现'],
        rows: [
          ['无已完成核算的项目', '碳排放总览改为引导文案，不出现 0 或占位数值'],
          ['无待计算组项目', '待办区显示「暂无待核算项目」'],
          ['无任何核算项目', '碳足迹概览显示「暂无核算记录，去「产品碳足迹核算」新增」'],
          ['碳报告区块', '任何数据条件下均为固定占位空态「暂无数据」'],
        ],
      },
      { type: 'heading', text: '加载与空态的区分' },
      {
        type: 'paragraph',
        text: '加载中：统计数值显示 `-`、文案区显示「加载中…」；加载完成后仍无数据才进入空态。**不允许把加载中显示成「无数据」**。',
      },
      { type: 'heading', text: '引导原则' },
      {
        type: 'paragraph',
        text: '空态文案必须指明去处或原因，**不出现白屏、不出现未格式化的原始数值**。',
      },
    ],
    source: '《工作台功能批注》V1.0 §1.5 / §4',
    operation: '文档级说明（跨区块统一口径）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    unmatchedReason: '空态口径覆盖多个区块，无唯一操作目标，统一在全局批注中说明。',
  },
  {
    id: 'gann-dash-scope',
    title: '本期不包含的能力',
    code: 'P01-20',
    blocks: [
      { type: 'heading', text: '本期不包含' },
      {
        type: 'list',
        items: [
          '不提供「新增核算 / 新增产品模型」入口（统一走「碳足迹核算」列表）',
          '不提供任何编辑 / 删除 / 导入 / 导出',
          '不提供刷新按钮与自动轮询',
          '不提供查询筛选、排序切换、分页',
          '不提供历史总览列表、时间范围筛选与口径切换',
          '不提供趋势图 / 看板分析 / 跨项目对比',
          '不提供组织切换（本期单组织）',
          '不接「碳报告」数据源（恒为占位空态）',
        ],
      },
    ],
    source: '《工作台功能批注》V1.0 §1.2 / 工作台业务 PRD §1.3',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    category: '能力',
    unmatchedReason: '范围类说明，对应多个未提供能力，无唯一操作目标。',
  },
  {
    id: 'gann-dash-todo',
    title: '待确认事项（尚未裁决，不作为需求依据）',
    code: 'P01-21',
    blocks: [
      { type: 'heading', text: '待裁决问题' },
      {
        type: 'list',
        ordered: true,
        items: [
          '「已计算产品 / 已计算数量」是否应包含历史态（原型计入，PRD 归到报告组）',
          '「报告数量」是否保留（流程调整后通常恒为 0），或换成更有意义的统计',
          '待办是否只显示一条（是否需要清单 / 多条）',
          '碳足迹概览卡片数量固定 3 张是否可配置',
          '「碳报告」区块是否在「报告管理」上线后接入真实数据',
          '单位书写是否统一（`kgCO₂e` 与 `kg CO2-Eq`）',
          '汇总接口失败时是否补错误提示与重试',
          '是否按角色展示不同视角（如填报人的「我的待填」）',
          '数据范围是否按所属组织过滤（原型未过滤）',
          '待办是否必须显示「最近更新」的一条（是否需要显式排序）',
        ],
      },
    ],
    source: '《工作台功能批注》V1.0 §4.1',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '待确认事项',
    unmatchedReason: '尚未裁决的问题清单，不混入正式业务规则，统一在全局批注中提示。',
  },
  {
    id: 'gann-dash-mock',
    title: '数据性质（原型演示数据）',
    code: 'P01-22',
    blocks: [
      {
        type: 'paragraph',
        text: '本页数据为原型演示数据：核算项目、核算结果、我的产品库与当前用户组织均取自内置演示数据（内存态，刷新后回到初始状态）；组织为固定演示值，不由用户切换。',
      },
      {
        type: 'paragraph',
        text: '正式实现需由系统按真实数据与当前登录用户所属组织生成，并补上失败处理与数据权限过滤。',
      },
    ],
    source: '《工作台功能批注》V1.0 §0 / §4.1',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
]
