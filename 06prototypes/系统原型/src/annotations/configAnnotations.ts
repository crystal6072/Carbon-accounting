import type { Annotation } from './types'

/**
 * 系统参数配置功能批注数据（对齐五个分模块《功能批注》）。
 * 覆盖：核算规则 / 默认因子 / 报告模板 / 存储配置 / 消息配置。
 * 批注编号采用各模块前缀：HS- 核算规则、YZ- 默认因子、RT- 报告模板、MC- 消息配置、CC- 存储配置。
 * 路由均挂在 /config 下；默认因子页面在 src/pages/factor。
 * - matched：锚定到页面元素；- global：跨页面 / 文档级说明，进入「全局批注」抽屉。
 */
export const configAnnotations: Annotation[] = [
  /* ==================== 核算规则 ==================== */
  {
    id: 'ann-cfg-calc-global',
    title: '模块定位（核算规则）',
    code: 'HS-01',
    blocks: [
      { type: 'heading', text: '是什么' },
      {
        type: 'paragraph',
        text: '按标准号 = 一套规则（取舍准则 + 可忽略排放项 + 分配方法），用于记录该标准下的数据取舍与免核算口径。',
      },
      { type: 'heading', text: '关键限制' },
      {
        type: 'callout',
        text: '本配置仅用于标准口径记录与展示，**不参与核算求值，不影响核算结果**；无审核流、无版本化、无单据下推；变更用「变更留痕」表达（原型为预留组件）。仅 `已启用` 规则可被项目 / 模型只读引用。',
      },
    ],
    source: '《核算规则功能批注》§1.1 HS-01',
    operation: '核算规则',
    buttonText: '核算规则',
    selector: 'config.calc.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'config.calc.global', label: '核算规则', reason: '功能标题' }],
    global: false,
    priority: 'high',
    category: '整体流程',
  },
  {
    id: 'ann-cfg-calc-list',
    title: '核算规则列表 / 查询 / 行操作',
    code: 'HS-03',
    blocks: [
      { type: 'heading', text: '查询项（4 项，叠加「与」过滤）' },
      {
        type: 'list',
        items: ['规则名称：模糊匹配；标准号：下拉精确；规则状态：草稿 / 已启用 / 已停用，下拉精确；适用行业：多选下拉精确。'],
      },
      { type: 'heading', text: '展示列（6 列）' },
      {
        type: 'list',
        items: ['规则名称（链接进详情）、标准号 + 标准名称、适用行业（前 2 项 + `+N`，空 = 全行业）、规则状态（Tag）、更新时间、操作。'],
      },
      { type: 'heading', text: '行操作' },
      {
        type: 'list',
        items: [
          '查看详情 / 编辑 / 启用或停用（已启用显「停用」、其余显「启用」）/ 删除（仅非「已启用」显示）。',
          '启用、停用、删除均走共享二次确认（语义化确认文案，禁用「确定」）；编辑态有未保存修改时返回弹「放弃修改」。',
        ],
      },
      { type: 'heading', text: '分页' },
      { type: 'paragraph', text: '每页 10 条；查询变化回到第 1 页；工具条显示「共 N 条」。' },
    ],
    source: '《核算规则功能批注》§1.2 HS-03',
    operation: '核算规则列表',
    buttonText: '新建 / 查询 / 查看 / 编辑 / 删除 / 启用 / 停用',
    selector: 'config.calc.table',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'config.calc.add', label: '新建规则', reason: '列表新增入口' },
      { selector: 'config.calc.query', label: '查询区', reason: '查询条件区域' },
      { selector: 'config.calc.table', label: '核算规则列表', reason: '列表表格区域' },
      { selector: 'config.calc.row.view', label: '查看详情', reason: '行操作' },
      { selector: 'config.calc.row.edit', label: '编辑', reason: '行操作' },
      { selector: 'config.calc.row.delete', label: '删除', reason: '行操作' },
      { selector: 'config.calc.row.enable', label: '启用', reason: '行操作' },
      { selector: 'config.calc.row.disable', label: '停用', reason: '行操作' },
    ],
    global: false,
    priority: 'medium',
    category: '操作功能',
  },
  {
    id: 'ann-cfg-calc-form',
    title: '核算规则表单（基础信息 / 取舍准则 / 可忽略排放项 / 分配）',
    code: 'HS-10',
    blocks: [
      { type: 'heading', text: '基础信息' },
      {
        type: 'list',
        items: [
          '规则名称：必填（≤100）。',
          '标准号：必填，仅新建态下拉可选，编辑 / 详情只读，选中后带出标准名称（不可编辑）。',
          '适用行业：多选，空 = 全行业通用；备注 ≤500 字。',
        ],
      },
      { type: 'heading', text: '取舍准则' },
      {
        type: 'list',
        items: [
          '是否允许舍弃：默认「是」；单环节阈值默认 1%、累计上限默认 5%、补充说明 ≤500。',
          '选「否」时两阈值置灰但保留原值，摘要输出「本标准不允许舍弃。」；原型未做 0–100 与「单环节 ≤ 累计上限」校验（待补）。',
          '段底「摘要预览」按阈值生成（下游「取舍规则」回显源）。',
        ],
      },
      { type: 'heading', text: '可忽略排放项 / 分配' },
      {
        type: 'list',
        items: [
          '可忽略排放项：单段 ≤500 字多行文本，允许为空，不再逐条维护清单。',
          '分配：方法 质量 / 数量 / 经济价值（默认质量）+ 分配规则说明 ≤500；页脚「实际分配计算在分配计算与项目侧执行，本页仅记录标准规定」。',
        ],
      },
      { type: 'heading', text: '能力边界声明（三处）' },
      {
        type: 'callout',
        text: '列表页描述、编辑 / 新建页顶部提示条、分配段页脚提示，三处均声明「不参与核算求值，不影响核算结果」。',
      },
    ],
    source: '《核算规则功能批注》§1.5 HS-10 / HS-11',
    operation: '核算规则表单',
    buttonText: '标准号 / 阈值 / 忽略类别 / 保存',
    selector: 'config.calc.form.base',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'config.calc.form.note', label: '不参与核算求值提示', reason: '表单顶部提示' },
      { selector: 'config.calc.form.nav', label: '章节导航', reason: '左侧章节切换' },
      { selector: 'config.calc.form.base', label: '基础信息', reason: '表单区块' },
      { selector: 'config.calc.form.exclude', label: '取舍准则', reason: '表单区块' },
      { selector: 'config.calc.form.ignore', label: '可忽略排放项', reason: '表单区块' },
      { selector: 'config.calc.form.alloc', label: '分配', reason: '表单区块' },
      { selector: 'config.calc.form.save', label: '保存', reason: '表单保存按钮' },
    ],
    global: false,
    priority: 'high',
    category: '字段说明',
  },

  /* ==================== 默认因子 ==================== */
  {
    id: 'ann-cfg-factor-global',
    title: '模块定位（默认因子）',
    code: 'YZ-01',
    blocks: [
      { type: 'heading', text: '是什么' },
      {
        type: 'paragraph',
        text: '按 类型 / 排放数据 / 行业 / 阶段 / 区域 / 年度 配置默认因子来源；页面描述声明建模时预选「推荐」、可替换留痕。',
      },
      { type: 'heading', text: '数据域与边界' },
      {
        type: 'callout',
        text: '全部规则均为**平台级**，作用于整个平台；不设租户级配置、不设平台锁定，**不提供匹配测试入口**；当前原型未与建模页联调（仅页面描述口径）。',
      },
    ],
    source: '《默认因子功能批注》§1.1 YZ-01',
    operation: '默认因子',
    buttonText: '默认因子',
    selector: 'config.factor.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'config.factor.global', label: '默认因子', reason: '功能标题' }],
    global: false,
    priority: 'high',
    category: '整体流程',
  },
  {
    id: 'ann-cfg-factor-list',
    title: '默认因子列表 / 查询 / 行操作',
    code: 'YZ-03',
    blocks: [
      { type: 'heading', text: '查询项（6 项，下拉精确）' },
      {
        type: 'list',
        items: ['适用行业 / 生命周期阶段 / 类型 / 区域 / 适用年度 / 状态：状态含 已启用 / 已停用 / 已失效。'],
      },
      { type: 'heading', text: '展示列（含勾选，共 8 列）' },
      {
        type: 'list',
        items: ['勾选 / 类型（对象类型）/ 排放数据（对象）/ 目标因子（名称 + 值 + 单位，不含库名与版本）/ 优先级（数值越小越先命中）/ 状态 / 更新时间 / 操作；无作用域列、无平台锁定列。'],
      },
      { type: 'heading', text: '行操作' },
      {
        type: 'paragraph',
        text: '编辑 / 启用 / 停用 / 删除（均走二次确认）；已停用可启用恢复，停用后不参与建模预选；已失效规则显示「换因子」，重新绑定有效因子后恢复已启用。',
      },
      { type: 'heading', text: '批量操作' },
      {
        type: 'paragraph',
        text: '列表支持行勾选与当前页全选，工具条提供「批量启用 / 批量停用」；二次确认后逐条执行，已失效规则不可勾选，目标状态一致或已失效的记录跳过并反馈「成功 N 条、跳过 M 条」。',
      },
    ],
    source: '《默认因子功能批注》§1.2 YZ-03',
    operation: '默认因子列表',
    buttonText: '新增 / 查询 / 编辑 / 启用 / 停用 / 批量启用 / 批量停用',
    selector: 'config.factor.table',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'config.factor.add', label: '新增默认因子', reason: '列表新增入口' },
      { selector: 'config.factor.query', label: '查询区', reason: '查询条件区域' },
      { selector: 'config.factor.table', label: '默认因子列表', reason: '列表表格区域' },
      { selector: 'config.factor.batch.enable', label: '批量启用', reason: '工具条批量操作' },
      { selector: 'config.factor.batch.disable', label: '批量停用', reason: '工具条批量操作' },
      { selector: 'config.factor.row.edit', label: '编辑', reason: '行操作' },
      { selector: 'config.factor.row.enable', label: '启用', reason: '行操作' },
      { selector: 'config.factor.row.disable', label: '停用', reason: '行操作' },
      { selector: 'config.factor.row.delete', label: '删除', reason: '行操作' },
      { selector: 'config.factor.row.replace', label: '换因子', reason: '行操作（已失效）' },
    ],
    global: false,
    priority: 'medium',
    category: '操作功能',
  },

  /* ==================== 报告模板 ==================== */
  {
    id: 'ann-cfg-report-global',
    title: '模块定位（报告模板）',
    code: 'RT-01',
    blocks: [
      { type: 'heading', text: '是什么' },
      {
        type: 'paragraph',
        text: '模板由研发线下整理、打好取值字段标签并内置系统；此处只能查看，或复制副本后仅修改固定文字。模板只影响报告呈现，不影响核算结果。',
      },
      { type: 'heading', text: '约束' },
      {
        type: 'callout',
        text: '取值字段（{{CODE}}）与系统装配由研发 / 系统维护、**不可改**；系统预置模板只读且不可删除，需通过「复制为新模板」生成可编辑副本；自定义模板仅由复制产生，可编辑、启停与删除（不受状态限制）。',
      },
    ],
    source: '《报告模板功能批注》§1.1 RT-01',
    operation: '报告模板',
    buttonText: '报告模板',
    selector: 'config.report.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'config.report.global', label: '报告模板', reason: '功能标题' }],
    global: false,
    priority: 'high',
    category: '整体流程',
  },
  {
    id: 'ann-cfg-report-list',
    title: '报告模板列表 / 查询 / 行操作',
    code: 'RT-02',
    blocks: [
      { type: 'heading', text: '查询项（4 项）' },
      {
        type: 'list',
        items: ['模板名称：模糊匹配；模板类型：下拉（碳足迹报告 / 碳标签报告）；状态：启用 / 停用；数据来源：系统预置 / 自定义。'],
      },
      { type: 'heading', text: '展示列' },
      {
        type: 'list',
        items: ['模板名称（链接）、模板类型（Tag）、状态（启用 / 停用 Tag）、数据来源（系统预置 / 自定义 Tag）、操作。'],
      },
      { type: 'heading', text: '行操作' },
      {
        type: 'paragraph',
        text: '系统预置：仅「查看 / 复制」，不渲染删除入口且接口拒绝删除；自定义：编辑 / 启用 / 停用 / 删除 / 复制。删除复用共享二次确认弹窗（危险态），确认后不可恢复；停用后不再用于新生成报告；存量报告不回溯。',
      },
    ],
    source: '《报告模板功能批注》§1.2 RT-02',
    operation: '报告模板列表',
    buttonText: '查询 / 查看 / 编辑 / 复制 / 启用 / 停用',
    selector: 'config.report.table',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'config.report.query', label: '查询区', reason: '查询条件区域' },
      { selector: 'config.report.table', label: '报告模板列表', reason: '列表表格区域' },
      { selector: 'config.report.row.view', label: '查看', reason: '行操作' },
      { selector: 'config.report.row.edit', label: '编辑', reason: '行操作' },
      { selector: 'config.report.row.copy', label: '复制', reason: '行操作' },
      { selector: 'config.report.row.enable', label: '启用', reason: '行操作' },
      { selector: 'config.report.row.disable', label: '停用', reason: '行操作' },
      { selector: 'config.report.row.delete', label: '删除', reason: '行操作（仅自定义模板）' },
    ],
    global: false,
    priority: 'medium',
    category: '操作功能',
  },
  {
    id: 'ann-cfg-report-form',
    title: '报告模板表单（模板信息 / 正文 / 预览）',
    code: 'RT-04',
    blocks: [
      { type: 'heading', text: '模板信息（可编辑字段）' },
      {
        type: 'list',
        items: [
          '模板名称（唯一必填）、模板类型、适用行业（空 = 全行业）、模板说明 ≤200。',
          '模板编号（`RPT-YYYYMMDD-NNN`）、版本号：由系统生成，**只读**；数据来源（系统预置 / 自定义）系统写入不可编辑。',
        ],
      },
      { type: 'heading', text: '模板正文与取值字段' },
      {
        type: 'list',
        items: [
          '单一富文本编辑器；仅可改固定文字，点击取值字段标签插入后锁定、不可删改。',
          '研发内置 9 个取值字段白名单（产品名称 / 规格 / 生产者 / 标准 / 边界 / 声明单位 / 单位碳足迹 / 合计排放 / 报告编号）；正文 7 章中「核算结果」「结论与建议」2 章为系统装配锁定。',
        ],
      },
      { type: 'heading', text: '预览 / 只读' },
      {
        type: 'list',
        items: [
          '保存前「预览最终报告」按当前内容把 `{{CODE}}` 替换为演示取值生成预览（不保存）。',
          '系统预置模板整页只读，提示「复制为新模板」生成可编辑副本。',
        ],
      },
    ],
    source: '《报告模板功能批注》§1.2 RT-04 / §1.5 RT-10 / RT-11',
    operation: '报告模板表单',
    buttonText: '模板信息 / 正文 / 预览 / 保存',
    selector: 'config.report.form.info',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'config.report.form.info', label: '模板信息', reason: '表单区块' },
      { selector: 'config.report.form.body', label: '模板正文', reason: '富文本编辑区' },
      { selector: 'config.report.form.preview', label: '预览最终报告', reason: '预览按钮' },
      { selector: 'config.report.form.save', label: '保存模板', reason: '保存按钮' },
      { selector: 'config.report.form.locked', label: '系统预置只读提示', reason: '只读提示' },
    ],
    global: false,
    priority: 'high',
    category: '字段说明',
  },

  /* ==================== 存储配置 ==================== */
  {
    id: 'ann-cfg-storage',
    title: '存储配置（本地 / 对象存储）',
    code: 'CC-01',
    blocks: [
      { type: 'heading', text: '存储方式与连接参数' },
      {
        type: 'list',
        items: [
          '附件默认保存在系统本地，普通场景无需改动；选「对象存储」才展开连接参数：服务地址（http(s)://）、Bucket（3–63 位小写字母 / 数字 / 短横线）、区域、访问域名、路径前缀。',
          '访问凭证：AccessKey ID / Secret（加密存储、保存后不回显、仅展示掩码；可「修改密钥」交互）。',
        ],
      },
      { type: 'heading', text: '上传策略 / 配额与保留' },
      {
        type: 'list',
        items: [
          '单文件上限（默认 50MB，1–500）、图片最大边长（默认 2048px，200–8192）、允许格式（pdf / jpg / png / xlsx / zip…）。',
          '租户总容量(GB)、单租户附件数上限、超限策略（告警 / 禁止上传）、附件保留期（默认 365 天，0 = 永久）、回收站（默认 30 天）、报告与凭证永久保留开关。',
        ],
      },
      { type: 'heading', text: '连通性测试 / 用量' },
      {
        type: 'callout',
        text: '「测试连接」为**模拟实现**，返回 Mock 结果并刷新验证状态；本期不真实对接对象存储、不执行真实清理。用量概览（已用 / 总容量 / 文件数 / 附件数）为只读模拟数据。',
      },
    ],
    source: '《存储配置功能批注》§1.1 CC-01 / §1.2 CC-02 / CC-03',
    operation: '存储配置',
    buttonText: '存储方式 / 对象存储 / 上传配额 / 测试连接 / 保存',
    selector: 'config.storage.method',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'config.storage.global', label: '存储配置', reason: '功能标题' },
      { selector: 'config.storage.method', label: '存储方式', reason: '存储方式卡' },
      { selector: 'config.storage.object', label: '对象存储', reason: '对象存储卡' },
      { selector: 'config.storage.credential', label: '访问凭证', reason: '凭证卡' },
      { selector: 'config.storage.quota', label: '上传与配额', reason: '配额折叠区' },
      { selector: 'config.storage.usage', label: '用量概览', reason: '用量卡' },
      { selector: 'config.storage.save', label: '保存配置', reason: '保存按钮' },
    ],
    global: false,
    priority: 'high',
    category: '操作功能',
  },

  /* ==================== 消息配置 ==================== */
  {
    id: 'ann-cfg-message',
    title: '消息配置（站内信配置 / 消息模板配置）',
    code: 'MC-01',
    blocks: [
      { type: 'heading', text: '本期范围' },
      {
        type: 'list',
        items: [
          '仅保留「站内信配置」与「消息模板配置」两个页签；不做事件订阅矩阵、邮件 / 短信通道、频控 / 免打扰、发送记录、测试发送与失败重试。',
          '站内信配置：启用开关（默认开）+ 消息保留天数（0 = 永久，默认 30，0–365）；保存即生效，停用后不再产生新消息、已有消息保留。',
          '消息模板配置：7 个内置事件各 1 条站内信模板，仅可编辑标题（≤100）/ 正文（≤1000）与启用状态，不可新增 / 删除模板。',
        ],
      },
      { type: 'heading', text: '关键限制' },
      {
        type: 'callout',
        text: '站内信为系统内置通道，无需服务器 / 网关参数，接收人由事件自动确定；模板变量仅允许白名单内 5 个（{产品名称} {项目编号} {报告链接} {租户名称} {用量}），白名单外手写变量保存时拦截。',
      },
      { type: 'heading', text: '消费端' },
      {
        type: 'paragraph',
        text: '站内信在顶栏铃铛展示并可标记已读；模板停用后对应事件不投递；本期不另建消息中心页面与发送记录查询。',
      },
    ],
    source: '《消息配置功能批注》§1.1 MC-01 / §1.2 MC-02 / MC-03',
    operation: '消息配置',
    buttonText: '页签 / 保存站内信配置 / 编辑模板',
    selector: 'config.message.tabs',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'config.message.global', label: '消息配置', reason: '功能标题' },
      { selector: 'config.message.tabs', label: '站内信配置 / 消息模板配置 Tab', reason: 'Tab 切换' },
      { selector: 'config.message.inapp.save', label: '保存站内信配置', reason: '配置保存' },
      { selector: 'config.message.tpl.save', label: '保存（模板）', reason: '模板编辑保存' },
    ],
    global: false,
    priority: 'high',
    category: '操作功能',
  },

  /* ==================== 共享二次确认 ==================== */
  {
    id: 'ann-cfg-confirm',
    title: '二次确认（删除 / 启用 / 停用 / 批量启停）',
    code: 'HS-04',
    blocks: [
      { type: 'heading', text: '共享弹窗' },
      {
        type: 'paragraph',
        text: '核算规则 / 报告模板（自定义）/ 默认因子的删除、启用、停用、批量启停均复用同一二次确认弹窗：单条正文含「记录名」，批量正文含「已勾选条数」，底栏「取消」+ 语义化确认文案（如 确认删除 / 确认停用 / 确认批量启用），禁止「确定」字样。',
      },
      {
        type: 'paragraph',
        text: '默认因子同键非失效规则保存时弹「覆盖已有规则」确认；已失效规则须「换因子」重新绑定有效因子后恢复「已启用」。',
      },
    ],
    source: '《核算规则功能批注》§1.2 HS-04 / 《报告模板功能批注》§1.2 RT-03 / 《默认因子功能批注》§1.2 YZ-04',
    operation: '二次确认',
    buttonText: '取消 / 确认',
    selector: 'config.confirm.ok',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'config.confirm.ok', label: '确认', reason: '确认弹窗主按钮' },
      { selector: 'config.confirm.cancel', label: '取消', reason: '确认弹窗取消按钮' },
    ],
    global: false,
    priority: 'high',
    category: '对应业务规则',
  },
]

/** 全局批注（跨页面 / 文档级说明，进入右下角「全局批注」抽屉） */
export const configGlobalAnnotations: Annotation[] = [
  {
    id: 'gann-cfg-rules',
    title: '全局规则（数据域 / 校验 / 只读）',
    code: 'HS-23',
    blocks: [
      { type: 'heading', text: '数据域' },
      {
        type: 'list',
        items: [
          '默认因子：全部规则为平台级，作用于整个平台；不设租户级与平台锁定。',
          '默认因子：行启用 / 停用与批量启用 / 停用均需二次确认；停用后不参与预选，已失效规则须换因子恢复。',
          '存储、站内信配置为全局配置（平台级单例）；消息仅站内信通道。',
        ],
      },
      { type: 'heading', text: '通用校验' },
      {
        type: 'list',
        items: [
          '核算规则：标准号仅新建可选（编辑只读）；状态草稿 / 已启用 / 已停用，删除仅非「已启用」记录，且不参与核算求值。',
          '报告模板：系统预置只读且不可删，自定义仅由复制产生；模板不影响核算结果。',
          '消息模板：7 个内置事件各 1 条站内信模板，不可增删；变量仅允许白名单内 5 个。',
        ],
      },
      { type: 'heading', text: '只读口径' },
      { type: 'paragraph', text: '系统预置核算规则 / 报告模板只读；报告模板取值字段与系统装配、内置事件清单不可改。' },
    ],
    source: '《核算规则功能批注》§1.3 HS-23 / 《默认因子功能批注》§1.3 YZ-23 / 《报告模板功能批注》§1.3 RT-23 / 《消息配置功能批注》§1.3 MC-23 / 《存储配置功能批注》§1.3 CC-23',
    operation: '全局规则',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '全局规则说明',
    unmatchedReason: '跨功能的全局规则，无唯一操作目标。',
  },
  {
    id: 'gann-cfg-todo',
    title: '待确认事项（尚未裁决，不作为需求依据）',
    code: 'HS-24',
    blocks: [
      { type: 'heading', text: '待裁决问题' },
      {
        type: 'list',
        ordered: true,
        items: [
          '核算规则是否支持导入 / 批量维护（Q01）。',
          '系统预置核算规则由谁维护、可否被组织覆盖（Q02）。',
          '允许分配 `allow_allocate` 是否补采集入口（当前仅来自 Mock 数据）。',
          '默认因子是否按更多维度（如产品）细化；「推荐预选」是否接入项目建模（原型未联调）；因子下架是否自动置 `expired`。',
          '报告模板「固定文字」是否允许插入图片；本期后台是否做「边界 + 标准」模板自动匹配；取值字段白名单是否扩充。',
          '消息配置后续是否扩展更多事件或邮件通道；顶栏铃铛演示数据衔接方式。',
          '存储配置是否真实接入对象存储（已确认本期不真实对接）；切换后存量附件迁移与真实清理任务时机。',
        ],
      },
    ],
    source: '《核算规则功能批注》§4.1 HS-24 / 《默认因子功能批注》§4.1 YZ-24 / 《报告模板功能批注》§4.1 RT-24 / 《消息配置功能批注》§4.1 MC-24 / 《存储配置功能批注》§4.1 CC-24',
    operation: '文档级说明',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '待确认事项',
    unmatchedReason: '尚未裁决的问题清单，不混入正式业务规则。',
  },
  {
    id: 'gann-cfg-sync',
    title: '需原型同步调整（文档与原型差异）',
    code: 'HS-25',
    blocks: [
      { type: 'heading', text: '需对齐 / 补齐' },
      {
        type: 'list',
        ordered: true,
        items: [
          '各列表分页：原型每页 10 条，与字段清单 / PRD 一致（旧批注 CF-13 写 20 条，已纠正）。',
          '单文件上限：字段清单 / PRD 与存储配置页默认值均为 50MB（旧批注 CF-13 写 20MB，已统一为 50MB）。',
          '核算规则标准号唯一性校验 / 新建时过滤已配置标准，原型未实现（待补）。',
          '取舍阈值：原型未做 0–100 范围与「单环节 ≤ 累计上限」校验（待补）。',
          '默认因子「类型」原型仅 物料 / 能源 两项；数据均为前端 Mock，无接口 / 持久化 / 变更留痕 / 导入导出 / 只读反查。',
          '消息配置本期只做站内信配置与消息模板配置，顶栏铃铛演示数据需与简化后的口径对齐。',
        ],
      },
    ],
    source: '《核算规则功能批注》§4.2 HS-25 / 《默认因子功能批注》§4.2 YZ-25 / 《报告模板功能批注》§4.2 RT-25 / 《消息配置功能批注》§4.2 MC-25 / 《存储配置功能批注》§4.2 CC-25',
    operation: '文档级说明',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '待确认事项',
    unmatchedReason: '原型与文档的不一致点，需研发 / 产品对齐。',
  },
  {
    id: 'gann-cfg-mock',
    title: '数据性质（原型演示数据）',
    code: 'HS-26',
    blocks: [
      {
        type: 'paragraph',
        text: '本模块数据为原型演示数据（内存态）：存储用量为模拟值、因子默认值为演示值、消息模板为演示数据；默认因子无接口 / 持久化，变更仅本地态。正式实现需由系统按真实配置生成。',
      },
    ],
    source: '《核算规则功能批注》§0 HS-26 / 《默认因子功能批注》§0 YZ-26',
    operation: '文档级说明',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
]
