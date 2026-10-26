import type { Annotation } from './types'

/**
 * 企业信息维护功能批注数据（对齐《企业信息维护功能批注》V1.0，编号 B-R01-01 ~ B-R01-17）。
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：跨页面 / 文档级说明，进入「全局批注」抽屉。
 * 说明：内容对应「整体流程 / 全局规则说明 / 引用关系与影响 / 操作功能及业务规则 / 字段说明」五类批注。
 * 排版：一条批注围绕一个主题，使用「小标题 + 分条说明」组织；编号（code）作辅助信息，业务主题作主标题。
 */
export const enterpriseAnnotations: Annotation[] = [
  /* ==================== 整体流程 + 全局规则（功能标题附近） ==================== */
  {
    id: 'ann-ent-flow',
    title: '整体流程',
    code: 'B-R01-01',
    blocks: [
      {
        type: 'paragraph',
        text: '统一维护「报告主体（企业）」信息，作为报告编制时自动带入封面、基本信息表与表 1 的企业字段来源。',
      },
      { type: 'heading', text: '主流程' },
      {
        type: 'steps',
        items: [
          '进入本页',
          '在列表查看已维护的企业',
          '按需查询定位',
          '维护企业信息（新增 / 编辑）',
          '不再需要时删除（受引用限制）',
        ],
      },
      { type: 'heading', text: '新增入口（唯一）' },
      {
        type: 'list',
        items: [
          '页头「新增企业」：打开新增抽屉（无其它入口；编辑、删除均在列表行操作内完成）。',
        ],
      },
      { type: 'heading', text: '衔接与结束' },
      {
        type: 'paragraph',
        text: '列表选中（查询 / 翻页）即查看当前企业信息；「新增 / 编辑」以抽屉完成，不离开本页；编辑抽屉带出该记录现有内容。',
      },
      {
        type: 'paragraph',
        text: '保存后立即生效并刷新列表；**全程没有提交、审核、驳回，也没有操作日志入口**；删除为物理删除、不可恢复（被报告引用的记录禁止删除）。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.1 B-R01-01',
    operation: '整体流程',
    buttonText: '企业信息维护（功能标题）',
    selector: 'ent.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'ent.page.global', label: '企业信息维护', reason: '功能标题附近（全局说明入口）' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-ent-global-rules',
    title: '全局规则',
    code: 'B-R01-02',
    blocks: [
      { type: 'heading', text: '适用范围' },
      {
        type: 'paragraph',
        text: '本页维护的是「报告主体（企业）」信息库，作为报告编制引用来源（PRD R-104）；企业信息本身不参与碳排计算。',
      },
      { type: 'heading', text: '引用与更新' },
      {
        type: 'list',
        items: [
          '报告编制引用本库记录（封面 / 基本信息表 / 表 1），引用后仍可改、仅影响该报告（R-104 / R-131）。',
          '本库记录更新后，**引用该记录的报告转「待更新」**，需重新生成同步（R-114）。',
        ],
      },
      { type: 'heading', text: '删除与重名' },
      {
        type: 'list',
        items: [
          '**被报告引用的企业禁止删除**（删除提示已说明「被报告引用的企业不可删除」）。',
          '**企业名称全库唯一**，新增与编辑保存时都校验，重名即阻断保存。',
        ],
      },
      { type: 'heading', text: '字段与生命周期' },
      {
        type: 'list',
        items: [
          '除「备注」外，企业名称 / 统一社会信用代码 / 法定代表人 / 企业地址 / 联系方式 / 联系人 / 所属行业**均为必填**；表单不做实时校验，保存时统一校验并提示「请填写 X」。',
          '**没有提交、审核、驳回，也没有操作日志入口**；编辑为直接覆盖，不改变已生成报告的快照正文。',
          '**不提供独立「查看」弹窗**——列表展示核心字段，其余字段在「编辑」抽屉中查看（编辑兼具查看）。',
        ],
      },
      { type: 'heading', text: '权限' },
      {
        type: 'paragraph',
        text: '谁可维护、谁只能查看**尚未确定**（见全局批注「待确认事项」）。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.2 B-R01-02',
    operation: '全局规则',
    buttonText: '企业信息维护（功能标题）',
    selector: 'ent.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'ent.page.global', label: '企业信息维护', reason: '功能标题附近（全局说明入口）' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 引用关系与影响（顶部 Alert） ==================== */
  {
    id: 'ann-ent-ref',
    title: '引用关系与影响',
    code: 'B-R01-03',
    blocks: [
      { type: 'heading', text: '引用来源' },
      {
        type: 'paragraph',
        text: '报告编制的封面、基本信息表、表 1 均引用本库记录（R-104）；编制页步骤①支持「从企业信息库引用」，选中后自动带入企业字段（R-131）。',
      },
      { type: 'heading', text: '引用后仍可改' },
      {
        type: 'paragraph',
        text: '引用后，报告内字段仍可按需修改，**仅影响该报告**，不回写本库。',
      },
      { type: 'heading', text: '本库更新 → 报告待更新（R-114）' },
      {
        type: 'paragraph',
        text: '本库记录编辑保存后，引用该记录的报告状态转为「待更新」，提示用户重新生成同步；不影响报告已生成的快照正文。',
      },
      { type: 'heading', text: '删除限制（引用拦截）' },
      {
        type: 'paragraph',
        text: '记录被报告引用（`reportCount > 0`）时禁止删除；删除确认弹窗已提示「被报告引用的企业不可删除」。',
      },
      { type: 'heading', text: '引用计数（派生，只读）' },
      {
        type: 'paragraph',
        text: '每条记录维护「被报告引用次数」（`reportCount`），由报告生成 / 删除自动增减；该值为系统派生，**用户不可改**。',
      },
      { type: 'heading', text: '缺记录 / 缺字段' },
      {
        type: 'paragraph',
        text: '报告编制时若未引用本库或字段缺失，对应位置显「未引用企业信息库 / 待补录」，可现场补录（R-104 例外）。',
      },
      { type: 'heading', text: '待核对' },
      {
        type: 'callout',
        text: '原型列表**未展示**「被引用 / 引用次数」，用户无法直观判断哪些企业被引用、能否删除；是否补充展示见全局批注「待确认事项」。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.3 B-R01-03',
    operation: '引用关系与影响',
    buttonText: '顶部提示（统一维护报告主体…）',
    selector: 'ent.alert',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'ent.alert', label: '顶部提示', reason: '引用关系说明区' }],
    global: false,
    priority: 'high',
  },

  /* ==================== 新增 / 编辑 / 删除 ==================== */
  {
    id: 'ann-ent-add',
    title: '新增企业',
    code: 'B-R01-04',
    blocks: [
      { type: 'heading', text: '入口' },
      {
        type: 'paragraph',
        text: '页头「新增企业」按钮（**常驻显示**）；**恒可操作，不限制已有企业数量**。',
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'list',
        items: [
          '打开抽屉，标题为「新增企业」。',
          '填写企业名称、统一社会信用代码、法定代表人、企业地址、联系方式、联系人、所属行业、备注。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存成功后抽屉关闭，提示「企业已新增」，**新记录出现在列表顶部（按更新时间倒序）**，引用次数为 0。',
      },
      { type: 'heading', text: '保存校验' },
      {
        type: 'list',
        items: [
          '必填项为空 → 提示「请填写 X」并阻断保存。',
          '企业名称与已有记录重名 → 提示「已存在同名企业，请检查后重试或直接编辑原记录」并阻断保存。',
        ],
      },
      { type: 'heading', text: '取消或失败' },
      {
        type: 'paragraph',
        text: '点「取消」或关闭抽屉**不保存任何内容**；校验不通过时抽屉保持打开、内容保留。',
      },
      { type: 'heading', text: '待核对' },
      {
        type: 'callout',
        text: '重名校验在**保存时**由后端 / mock 拦截，表单内不做实时校验。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.4 B-R01-04',
    operation: '新增企业',
    buttonText: '新增企业',
    selector: 'ent.add',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'ent.add', label: '新增企业', reason: '新增企业入口' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-ent-edit',
    title: '编辑企业',
    code: 'B-R01-05',
    blocks: [
      { type: 'heading', text: '操作目的' },
      {
        type: 'paragraph',
        text: '修改企业信息；**任何状态（是否被引用）的企业均可编辑**。',
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'list',
        items: [
          '打开抽屉，标题为「编辑企业 · 企业名称」，带出该记录现有内容。',
          '可修改全部字段（编辑兼具查看：企业地址 / 所属行业 / 备注均在抽屉内可见）。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存成功后提示「企业信息已更新，引用该企业的报告将标记为待更新」，列表刷新；**引用该企业的报告转「待更新」**（R-114）。',
      },
      { type: 'heading', text: '保存校验' },
      {
        type: 'list',
        items: [
          '必填项为空 → 提示「请填写 X」。',
          '企业名称与其它记录重名 → 提示「已存在同名企业，请检查后重试」并阻断保存（允许与自身同名，即不改名）。',
        ],
      },
      { type: 'heading', text: '取消' },
      {
        type: 'paragraph',
        text: '点「取消」或关闭抽屉**不保存任何内容**。',
      },
      { type: 'heading', text: '待确认' },
      {
        type: 'callout',
        text: '编辑被报告引用的记录时，是否锁定关键字段（企业名称 / 统一社会信用代码）未明确（见全局批注「待确认事项」）。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.4 B-R01-05',
    operation: '编辑企业',
    buttonText: '编辑',
    selector: 'ent.row.edit',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'ent.row.edit', label: '编辑', reason: '行操作「编辑」' }],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-ent-delete',
    title: '删除企业',
    code: 'B-R01-06',
    blocks: [
      { type: 'heading', text: '可操作条件' },
      {
        type: 'paragraph',
        text: '删除入口**恒显示**；但**被报告引用的企业实际禁止删除**（拦截在后端 / mock 层）。',
      },
      { type: 'heading', text: '操作方式' },
      {
        type: 'list',
        items: [
          '点击「删除」弹出二次确认，文案「删除后不可恢复；被报告引用的企业不可删除。确认删除？」。',
          '底栏为「取消」与「确认删除」。',
        ],
      },
      { type: 'heading', text: '操作结果（未被引用）' },
      {
        type: 'paragraph',
        text: '确认后记录被**物理删除**，提示「已删除」，列表刷新。',
      },
      { type: 'heading', text: '操作结果（被引用）' },
      {
        type: 'paragraph',
        text: '确认后系统拦截，提示「该企业已被 N 份报告引用，不能删除」，不删除。',
      },
      { type: 'heading', text: '取消' },
      {
        type: 'paragraph',
        text: '点「取消」或关闭弹窗，**状态不变**。',
      },
      { type: 'heading', text: '待核对' },
      {
        type: 'callout',
        text: '列表不展示引用状态 / 引用次数，用户无法预判删除是否会被拦截（见全局批注「待确认事项」）。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.4 B-R01-06',
    operation: '删除企业',
    buttonText: '删除 / 确认删除',
    selector: 'ent.row.delete',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'ent.row.delete', label: '删除', reason: '行操作「删除」（Popconfirm 触发）' },
      { selector: 'ent.confirm.ok', label: '确认删除', reason: '二次确认弹窗' },
      { selector: 'ent.confirm.cancel', label: '取消（确认弹窗）', reason: '同弹窗操作项' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 查询 / 列表 ==================== */
  {
    id: 'ann-ent-query',
    title: '查询与重置',
    code: 'B-R01-07',
    blocks: [
      { type: 'heading', text: '查询项' },
      {
        type: 'paragraph',
        text: '单一输入框「企业名称」，placeholder 为「企业名称 / 信用代码」；按**包含关系模糊匹配、忽略大小写**，同时命中企业名称或统一社会信用代码。',
      },
      { type: 'heading', text: '过滤规则' },
      {
        type: 'list',
        items: [
          '点「查询」执行当前条件的筛选，结果回到第 1 页。',
          '「重置」清空关键词并恢复完整列表（回到第 1 页）。',
        ],
      },
      { type: 'heading', text: '统计' },
      {
        type: 'paragraph',
        text: '查询区下方「共 N 条」统计**当前全部记录数**，不受分页与查询条件影响（是否应随筛选变化见全局批注「待确认事项」）。',
      },
      { type: 'heading', text: '不提供' },
      {
        type: 'list',
        items: [
          '不提供按法定代表人、所属行业、联系方式等其它字段的查询。',
          '不提供导出。',
        ],
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.4 B-R01-07',
    operation: '查询 / 重置',
    buttonText: '企业名称 / 查询 / 重置',
    selector: 'ent.query.bar',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'ent.query.bar', label: '查询区', reason: '查询条件区域' },
      { selector: 'ent.query.search', label: '查询', reason: '同一规则引用' },
      { selector: 'ent.query.reset', label: '重置', reason: '同一规则引用' },
    ],
    global: false,
    priority: 'medium',
  },

  /* ==================== 字段说明 ==================== */
  {
    id: 'ann-ent-field-companyName',
    title: '字段：企业名称',
    code: 'B-R01-08',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '报告主体 / 生产者名称，是报告封面、基本信息表、表 1 的报告主体名称；也是本库记录的**唯一业务标识**。',
      },
      { type: 'heading', text: '填写与必填' },
      {
        type: 'paragraph',
        text: '手工填写；**必填**，为空时提示「请填写企业名称」并阻断保存。',
      },
      { type: 'heading', text: '重复限制' },
      {
        type: 'paragraph',
        text: '**全库唯一**，新增与编辑保存时都校验，重名即阻断保存（编辑时允许与自身同名）。',
      },
      { type: 'heading', text: '联动与长度' },
      {
        type: 'paragraph',
        text: '表单内提示「报告封面 / 基本信息表 / 表 1 的报告主体名称」；长度上限 ≤ 100 个字符（推荐口径，待确认）。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-08',
    operation: '企业名称',
    buttonText: '企业名称',
    selector: 'ent.form.companyName',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'ent.form.companyName', label: '企业名称（表单）', reason: '表单字段' },
      { selector: 'ent.col.companyName', label: '企业名称（列表列头）', reason: '同字段的列表列头' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-ent-field-creditCode',
    title: '字段：统一社会信用代码',
    code: 'B-R01-09',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '企业的法定身份代码，报告表 1 引用。',
      },
      { type: 'heading', text: '填写与必填' },
      {
        type: 'paragraph',
        text: '手工填写；**必填**，为空时提示「请填写统一社会信用代码」并阻断保存。',
      },
      { type: 'heading', text: '重复限制与格式' },
      {
        type: 'paragraph',
        text: '当前**不校验唯一**（仅企业名称唯一）；**未做格式与长度校验**（标准为 18 位）→ 是否补充见全局批注「待确认事项」。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-09',
    operation: '统一社会信用代码',
    buttonText: '统一社会信用代码',
    selector: 'ent.form.creditCode',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'ent.form.creditCode', label: '统一社会信用代码（表单）', reason: '表单字段' },
      { selector: 'ent.col.creditCode', label: '统一社会信用代码（列表列头）', reason: '同字段的列表列头' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-ent-field-legalPerson',
    title: '字段：法定代表人',
    code: 'B-R01-10',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '企业法定代表人，报告表 1 引用。',
      },
      { type: 'heading', text: '填写与必填' },
      {
        type: 'paragraph',
        text: '手工填写；**必填**，为空时提示「请填写法定代表人」并阻断保存；长度上限 ≤ 50 个字符（推荐口径，待确认）。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-10',
    operation: '法定代表人',
    buttonText: '法定代表人',
    selector: 'ent.form.legalPerson',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'ent.form.legalPerson', label: '法定代表人（表单）', reason: '表单字段' },
      { selector: 'ent.col.legalPerson', label: '法定代表人（列表列头）', reason: '同字段的列表列头' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-ent-field-companyAddress',
    title: '字段：企业地址',
    code: 'B-R01-11',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '企业注册 / 经营地址，报告基本信息表与表 1 引用。',
      },
      { type: 'heading', text: '填写与必填' },
      {
        type: 'paragraph',
        text: '多行文本（Textarea），可换行；**必填**，为空时提示「请填写企业地址」并阻断保存。',
      },
      { type: 'heading', text: '展示' },
      {
        type: 'paragraph',
        text: '列表**不展示**该字段，需在编辑抽屉中查看；长度上限 ≤ 200 个字符（推荐口径，待确认）。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-11',
    operation: '企业地址',
    buttonText: '企业地址',
    selector: 'ent.form.companyAddress',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'ent.form.companyAddress', label: '企业地址（表单）', reason: '表单字段' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-ent-field-contactPhone',
    title: '字段：联系方式',
    code: 'B-R01-12',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '企业对外联系电话，报告表 1 引用。',
      },
      { type: 'heading', text: '填写与必填' },
      {
        type: 'paragraph',
        text: '手工填写（单行输入）；**必填**，为空时提示「请填写联系方式」并阻断保存。',
      },
      { type: 'heading', text: '与「联系人」区别' },
      {
        type: 'paragraph',
        text: '联系方式 = 电话 / 渠道；联系人 = 具体对接人（见 B-R01-13）。原型两者均为独立必填字段。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-12',
    operation: '联系方式',
    buttonText: '联系方式',
    selector: 'ent.form.contactPhone',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'ent.form.contactPhone', label: '联系方式（表单）', reason: '表单字段' },
      { selector: 'ent.col.contactPhone', label: '联系方式（列表列头）', reason: '同字段的列表列头' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-ent-field-contactPerson',
    title: '字段：联系人',
    code: 'B-R01-13',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '企业具体对接人姓名。',
      },
      { type: 'heading', text: '填写与必填' },
      {
        type: 'paragraph',
        text: '手工填写（单行输入）；**必填**，为空时提示「请填写联系人」并阻断保存。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-13',
    operation: '联系人',
    buttonText: '联系人',
    selector: 'ent.form.contactPerson',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'ent.form.contactPerson', label: '联系人（表单）', reason: '表单字段' },
      { selector: 'ent.col.contactPerson', label: '联系人（列表列头）', reason: '同字段的列表列头' },
    ],
    global: false,
    priority: 'low',
  },
  {
    id: 'ann-ent-field-industry',
    title: '字段：所属行业',
    code: 'B-R01-14',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '企业所属行业，用于报告归类与展示。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'paragraph',
        text: '当前为**手工自由输入**（单行 Input），不强制从行业库选择；**必填**，为空时提示「请填写所属行业」。',
      },
      { type: 'heading', text: '展示与待确认' },
      {
        type: 'paragraph',
        text: '列表**不展示**该字段，需在编辑抽屉中查看；是否改为关联「行业库」下拉选择见全局批注「待确认事项」。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-14',
    operation: '所属行业',
    buttonText: '所属行业',
    selector: 'ent.form.industry',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'ent.form.industry', label: '所属行业（表单）', reason: '表单字段' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-ent-field-remark',
    title: '字段：备注',
    code: 'B-R01-15',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '补充说明该企业的适用范围或口径，便于他人理解。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'list',
        items: [
          '多行文本（Textarea），提示「选填」。',
          '**选填**。',
        ],
      },
      { type: 'heading', text: '长度上限' },
      {
        type: 'paragraph',
        text: '≤ 200 个字符（推荐口径）；仅在编辑抽屉中可填写 / 查看，列表中不展示。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-15',
    operation: '备注',
    buttonText: '备注',
    selector: 'ent.form.remark',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'ent.form.remark', label: '备注', reason: '表单字段' }],
    global: false,
    priority: 'low',
  },
]

/** 全局批注（跨页面 / 文档级说明，进入右下角「全局批注」抽屉） */
export const enterpriseGlobalAnnotations: Annotation[] = [
  {
    id: 'gann-ent-reportcount',
    title: '被报告引用次数（派生，只读）',
    code: 'B-R01-16',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '该企业在报告编制中被引用的份数（`reportCount`），由报告生成 / 删除自动增减。',
      },
      { type: 'heading', text: '来源' },
      {
        type: 'paragraph',
        text: '系统派生，**只读**，用户不可维护。',
      },
      { type: 'heading', text: '业务影响' },
      {
        type: 'list',
        items: [
          '值 > 0 时禁止删除（见 B-R01-06）。',
          '本库更新时引用报告转「待更新」（见 B-R01-03）。',
        ],
      },
      { type: 'heading', text: '当前表现' },
      {
        type: 'callout',
        text: '原型列表**未展示**该值，用户无法直观判断哪些企业被引用、能否删除 → 是否补充展示「被引用 / 引用次数」列见「待确认事项」。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-16',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    unmatchedReason: '该派生字段当前未在列表/表单展示，仅作文档级说明。',
  },
  {
    id: 'gann-ent-meta',
    title: '制单信息（创建人 / 创建时间 / 更新人 / 更新时间）',
    code: 'B-R01-17',
    blocks: [
      { type: 'heading', text: '更新时间' },
      {
        type: 'paragraph',
        text: '列表展示「更新时间」列，按该字段倒序排列列表；每次保存都会刷新。',
      },
      { type: 'heading', text: '创建人 / 创建时间 / 更新人' },
      {
        type: 'paragraph',
        text: '由系统记录，不可维护；当前原型列表中**不展示**创建人与创建时间。',
      },
      { type: 'heading', text: '数据性质' },
      {
        type: 'callout',
        text: '原型中为演示数据（内置演示值），正式实现需由系统按真实操作记录生成。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §1.5 B-R01-17',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    unmatchedReason: '制单信息为系统记录，不在表单/列表操作项上锚定。',
  },
  {
    id: 'gann-ent-ability',
    title: '本期不包含的能力',
    blocks: [
      { type: 'heading', text: '本期不包含' },
      {
        type: 'list',
        items: [
          '不提供导出',
          '不提供批量操作',
          '不提供导入',
          '没有提交 / 审核 / 驳回',
          '不提供独立「查看」弹窗（编辑兼具查看）',
          '没有操作日志入口',
          '删除为物理删除、不可恢复',
        ],
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §3 / §4.2',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    category: '能力',
    unmatchedReason: '范围类说明，对应多个未提供的能力，无唯一操作目标。',
  },
  {
    id: 'gann-ent-todo',
    title: '待确认事项（尚未裁决，不作为需求依据）',
    blocks: [
      { type: 'heading', text: '待裁决问题' },
      {
        type: 'list',
        ordered: true,
        items: [
          '谁可以维护企业信息、谁只能查看（角色与权限）',
          '企业信息数据是否按组织隔离可见范围',
          '「所属行业」应为自由文本还是关联行业库下拉',
          '统一社会信用代码是否需格式 / 长度校验、是否唯一',
          '列表是否展示「被引用 / 引用次数」',
          '「共 N 条」应统计全量还是当前筛选结果',
          '编辑被引用记录时是否锁定关键字段',
          '是否需要独立「查看」弹窗',
          '各字段长度上限是否采用推荐口径',
        ],
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §4.1',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'high',
    category: '待确认事项',
    unmatchedReason: '尚未裁决的问题清单，不混入正式业务规则，统一在全局批注中提示。',
  },
  {
    id: 'gann-ent-mock',
    title: '数据性质（原型演示数据）',
    blocks: [
      {
        type: 'paragraph',
        text: '本页数据为原型演示数据：企业信息为内存态，刷新页面即重置为种子数据（含 3 条被引用、1 条未被引用记录，用于演示删除拦截与待更新）；制单信息为演示值。',
      },
      {
        type: 'paragraph',
        text: '正式实现需由系统按真实数据与真实操作记录生成。',
      },
    ],
    source: '《企业信息维护功能批注》V1.0 §0 / §4.2',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
]
