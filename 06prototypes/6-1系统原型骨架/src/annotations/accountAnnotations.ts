import type { Annotation } from './types'

/**
 * 平台账号功能批注数据（对齐《平台账号功能批注》V1.1，编号 B15-01 ~ B15-22）。
 * 覆盖范围：/system/account（列表 / 新建 / 编辑 / 详情 / 停用启用注销确认弹窗 /
 * 分配角色弹窗 / 重置密码弹窗）与配套只读视图 /system/account-query。
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：跨页面 / 文档级说明，进入「全局批注」抽屉。
 * 排版：一条批注围绕一个主题，使用「小标题 + 分条说明」组织；编号（code）作辅助信息，业务主题作主标题。
 */
export const accountAnnotations: Annotation[] = [
  /* ==================== 整体流程 + 全局规则（功能标题附近） ==================== */
  {
    id: 'ann-acc-flow',
    title: '整体流程',
    code: 'B15-01',
    blocks: [
      {
        type: 'paragraph',
        text: '平台管理员在后台维护平台自有账号（平台团队人员），作为平台后台的登录身份与权限载体。',
      },
      { type: 'heading', text: '主流程' },
      {
        type: 'steps',
        items: [
          '进入平台账号',
          '列表展示持有平台角色的账号',
          '按需查询、查看核对',
          '新建 / 编辑 / 分配平台角色 / 停用 / 启用 / 重置密码 / 注销',
        ],
      },
      { type: 'heading', text: '入口分布' },
      {
        type: 'list',
        items: [
          '列表页：页头「新建」+ 行内操作列，可发起全部操作。',
          '详情页：页头按钮区同样可发起全部操作，操作后留在详情或返回列表。',
        ],
      },
      { type: 'heading', text: '交互形态' },
      {
        type: 'list',
        items: [
          '新建 / 编辑为独立表单页。',
          '分配平台角色、停用 / 启用 / 注销为弹窗 + 二次确认。',
          '重置密码为弹窗 + 一次性密码展示。',
          '查看为独立详情页（列表点姓名进入）。',
        ],
      },
      { type: 'heading', text: '衔接与结束' },
      {
        type: 'paragraph',
        text: '列表点「姓名」进入该账号详情；「账号查询」页点「姓名」可下钻对应账号详情（平台账号进可操作详情，租户成员进只读详情）。',
      },
      {
        type: 'paragraph',
        text: '全流程**没有提交、审核、驳回**；账号状态在「启用 / 停用」之间可逆流转，**「注销」为终态**（执行后账号记录删除，见 B15-12）。',
      },
      { type: 'heading', text: '超管兜底' },
      {
        type: 'paragraph',
        text: '全部超管均无法登录时，产品内**不设自助找回入口**，统一转运维恢复（双人复核 + 复盘 + 审计），本页无可画分支。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.1 B15-01',
    operation: '整体流程',
    buttonText: '平台账号（功能标题）',
    selector: 'account.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.page.global', label: '平台账号（列表标题）', reason: '功能标题附近（全局说明入口）' },
      { selector: 'account.form.global', label: '新建 / 编辑平台账号（标题）', reason: '同一全局说明入口' },
      { selector: 'account.detail.global', label: '账号详情（标题）', reason: '同一全局说明入口' },
      { selector: 'account.querypage.global', label: '账号查询（标题）', reason: '同一全局说明入口' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-acc-global-rules',
    title: '全局规则',
    code: 'B15-02',
    blocks: [
      { type: 'heading', text: '账号模型' },
      {
        type: 'list',
        items: [
          '全系统账号表**全局唯一一份**，平台账号与租户成员共用同一账号表，不按域拆表；账号本身不设归属标签。',
          '持有**至少 1 个生效平台角色**的账号即为平台账号，出现在本菜单；不持平台角色的账号不在本菜单出现（仅在「账号查询」可见）。',
          '识别为平台账号**且**账号状态为「启用」，才能进入平台后台。',
          '权限取自所持平台角色的功能码（多角色取并集）；角色定义与维护在「平台角色管理」，本模块只指派、不定义。',
        ],
      },
      { type: 'heading', text: '登录凭证' },
      {
        type: 'list',
        items: [
          '登录名、手机号各自**全局唯一**；登录名不区分大小写、去空格、转半角后判重。',
          '登录名**不得为 11 位纯数字**，且**仅支持字母、数字与下划线**。',
        ],
      },
      { type: 'heading', text: '密码与脱敏' },
      {
        type: 'list',
        items: [
          '密码只在生成时**一次性展示**，关闭后任何入口不可再查；列表与详情只呈现掩码；遗失只能由超管再次重置。',
          '手机号在列表与详情**脱敏展示（前 3 后 4）**，编辑表单内展示明文，不设明文查看入口。',
        ],
      },
      { type: 'heading', text: '超管保护' },
      {
        type: 'list',
        items: [
          '系统始终保留至少 1 个启用状态的超管：不可停用 / 注销最后一个启用超管，不可移除最后一个超管的超级管理员角色。',
          '任一超管**不可停用 / 注销 / 重置本人账号**。',
          '平台账号总数**不设上限**。',
        ],
      },
      { type: 'heading', text: '与租户的关系' },
      {
        type: 'list',
        items: [
          '平台账号**不计入租户成员数**，不因分配平台角色而创建或修改租户成员关系。',
          '本模块只分配平台角色（候选只出现平台角色），**不展示、不下发、不回收租户角色**。',
          '账号被指定为租户主管理员时，本模块不为其分配平台角色，其租户权限来自租户侧自动授予的「租户管理员」角色。',
        ],
      },
      { type: 'heading', text: '审计' },
      {
        type: 'paragraph',
        text: '所有写操作记录审计；详情页「操作记录」展示账号级轨迹（创建 / 编辑 / 分配角色 / 停用 / 启用 / 注销 / 重置密码），含操作人与客户端 IP；**明文密码不在任何记录中留存**。',
      },
      { type: 'heading', text: '权限呈现' },
      {
        type: 'paragraph',
        text: '页面按钮按账号状态矩阵与「非本人」规则呈现；角色级可见性由功能码控制，无「平台账号」功能码时菜单不渲染、接口拒绝。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.2 B15-02',
    operation: '全局规则',
    buttonText: '平台账号（功能标题）',
    selector: 'account.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.page.global', label: '平台账号（列表标题）', reason: '功能标题附近（全局说明入口）' },
      { selector: 'account.querypage.global', label: '账号查询（标题）', reason: '同一全局说明入口' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 业务状态 ==================== */
  {
    id: 'ann-acc-status',
    title: '账号状态',
    code: 'B15-03',
    blocks: [
      { type: 'heading', text: '三种状态' },
      {
        type: 'table',
        columns: ['', '启用', '停用', '注销'],
        rows: [
          ['业务含义', '放行登录（平台侧还需至少 1 个平台角色）', '拦截登录、会话即时失效；平台端与租户端同时失效', '终态，不可登录、不可任何操作；执行后记录删除'],
          ['进入方式', '新建保存默认；或停用态经「启用」', '启用态经「停用」进入', '启用 / 停用态经「注销」进入'],
        ],
      },
      { type: 'heading', text: '状态矩阵（可进行的操作）' },
      {
        type: 'table',
        columns: ['状态', '可编辑', '可分配角色', '可重置密码', '可停用', '可启用', '可注销', '可登录平台后台'],
        rows: [
          ['启用', '是', '是', '是', '是', '否', '是', '是'],
          ['停用', '是', '是', '是', '否', '是', '是', '否'],
          ['注销', '否', '否', '否', '否', '否', '否', '否'],
        ],
      },
      { type: 'heading', text: '查看的例外' },
      {
        type: 'paragraph',
        text: '任何状态（含演示数据中的注销态账号）均可「查看」详情，注销态为只读。',
      },
      { type: 'heading', text: '状态变化的影响' },
      {
        type: 'paragraph',
        text: '停用**不收回平台角色关联、不改租户成员关系记录**，仅关闭登录闸门；重新启用后恢复登录能力（启用前校验至少持有 1 个平台角色）。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.3 B15-03',
    operation: '账号状态',
    buttonText: '账号状态（清单列）',
    selector: 'account.col.status',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.col.status', label: '账号状态（清单列头）', reason: '状态展示位置' },
      { selector: 'account.detail.info', label: '账号信息（详情）', reason: '详情状态行所在信息区' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 列表 / 查询 ==================== */
  {
    id: 'ann-acc-list',
    title: '平台账号列表',
    code: 'B15-04',
    blocks: [
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '姓名、登录名、手机号（脱敏）、邮箱、平台角色、账号状态、最近登录时间、创建人、创建时间、操作；**不展示头像列与密码列**。',
      },
      {
        type: 'list',
        items: [
          '姓名列中，当前登录账号带「本人」标签。',
          '手机号脱敏为前 3 后 4（如 138****0001）。',
          '平台角色以标签展示，「超级管理员」红色高亮。',
          '邮箱为空显示「—」；最近登录时间为空显示「未登录」。',
        ],
      },
      { type: 'heading', text: '查询条件（叠加生效）' },
      {
        type: 'list',
        items: [
          '姓名 / 登录名：关键字包含匹配（登录名忽略大小写）。',
          '平台角色：下拉单选，不选即全部。',
          '账号状态：下拉单选「启用 / 停用」，不选即全部。',
          '任一条件变化后清单回到第 1 页；「重置」清空全部条件。',
        ],
      },
      { type: 'heading', text: '排序与分页' },
      {
        type: 'list',
        items: ['启用状态在前，其余按更新时间倒序。', '每页 20 条。'],
      },
      { type: 'heading', text: '工具条' },
      {
        type: 'paragraph',
        text: '显示「平台账号列表」与「共 N 条 · 启用 N 条」，并常驻保护提示「不可停用或注销最后一个启用状态的超管，也不可重置自己的密码」。',
      },
      { type: 'heading', text: '操作列' },
      {
        type: 'list',
        items: [
          '「查看」「编辑」「分配角色」常驻。',
          '超过 3 个操作时收起进「更多 ▾」下拉。',
          '「停用 / 启用 / 重置密码 / 注销」按账号状态出现其一，危险操作（停用 / 重置密码 / 注销）红色展示。',
          '注销态账号操作列仅「查看」。',
          '本人账号不显示「重置密码」；「停用」「注销」对本人显示但点击后阻断。',
        ],
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-04',
    operation: '平台账号列表',
    buttonText: '平台账号列表',
    selector: 'account.page.list',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.page.list', label: '账号清单', reason: '清单表格区域' },
      { selector: 'account.toolbar', label: '工具条', reason: '统计与保护提示' },
      { selector: 'account.query.bar', label: '查询区', reason: '查询条件区域' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 查看详情 ==================== */
  {
    id: 'ann-acc-detail',
    title: '查看账号详情',
    code: 'B15-05',
    blocks: [
      { type: 'heading', text: '入口' },
      {
        type: 'paragraph',
        text: '列表「姓名」链接或操作列「查看」；「账号查询」页点「姓名」下钻。',
      },
      { type: 'heading', text: '账号信息区' },
      {
        type: 'paragraph',
        text: '头像、登录名、手机号（脱敏）、邮箱、姓名、平台角色、密码（掩码）、首次登录强制修改密码、账号状态、创建人、创建时间、最近更新（更新人 · 更新时间）。',
      },
      { type: 'heading', text: '名下租户身份区' },
      {
        type: 'list',
        items: [
          '仅对**不持平台角色**的账号展示（列出有效租户身份，主管理员标注「（主管理员）」）。',
          '持平台角色且有租户身份的账号不在详情页展示该区，其影响提示在停用 / 注销弹窗给出。',
        ],
      },
      { type: 'heading', text: '操作记录区' },
      {
        type: 'paragraph',
        text: '账号级审计轨迹表 —— 时间、操作、操作人、变更摘要、客户端 IP；只记录账号级操作，**不含密码重置专项明细**，明文密码不在任何记录中留存。',
      },
      { type: 'heading', text: '页头操作' },
      {
        type: 'paragraph',
        text: '按状态矩阵与「非本人」规则呈现（返回列表、分配平台角色、停用、启用、重置密码、编辑、注销）。',
      },
      { type: 'heading', text: '无平台角色账号（租户成员视角）' },
      {
        type: 'paragraph',
        text: '从账号查询下钻进入时以只读形态展示：面包屑归「账号查询」、标签「只读 · 租户成员」、平台角色显示「无（租户成员，不在此维护平台角色）」、展示「所属组织」与「名下租户身份」、仅提供「返回账号查询」。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-05',
    operation: '查看账号详情',
    buttonText: '查看 / 姓名',
    selector: 'account.detail.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.detail.global', label: '账号详情（标题）', reason: '详情页入口' },
      { selector: 'account.row.view', label: '查看', reason: '行操作「查看」' },
      { selector: 'account.detail.info', label: '账号信息区', reason: '账号信息展示区' },
      { selector: 'account.detail.memberships', label: '名下租户身份区', reason: '租户身份展示区' },
      { selector: 'account.detail.operations', label: '操作记录区', reason: '审计轨迹展示区' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 新建 / 编辑 ==================== */
  {
    id: 'ann-acc-create',
    title: '新建平台账号',
    code: 'B15-06',
    blocks: [
      { type: 'heading', text: '入口与条件' },
      {
        type: 'paragraph',
        text: '列表页头「新建」；**恒可操作，不限制账号总数**。',
      },
      { type: 'heading', text: '表单内容' },
      {
        type: 'paragraph',
        text: '头像、登录名、手机号、邮箱、姓名、平台角色、初始密码设置、首次登录强制修改密码。',
      },
      { type: 'heading', text: '校验规则（任一不通过即阻断保存，已填内容保留）' },
      {
        type: 'list',
        ordered: true,
        items: [
          '登录名必填；仅支持字母、数字与下划线；不得为 11 位纯数字；与已有账号不重复（不区分大小写、去空格、转半角后判重）。',
          '手机号必填；须为有效手机号格式；全局唯一。',
          '姓名必填，不超过 50 字符。',
          '平台角色须选 1 至 5 个，至少 1 个。',
          '选择自定义初始密码时，须 8-20 位且同时包含字母和数字，两次输入一致。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存成功后弹出强提示「账号创建成功！」，**一次性展示登录名与初始密码**（含「复制密码」按钮），提示「请立即复制并线下告知用户。关闭后将无法再次查看密码。」；账号状态为启用、置首登改密标记、记录创建人、写审计。',
      },
      { type: 'heading', text: '取消' },
      {
        type: 'paragraph',
        text: '点「取消」返回列表，不保存任何内容。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-06',
    operation: '新建平台账号',
    buttonText: '新建',
    selector: 'account.add.new',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.add.new', label: '新建', reason: '页头新建入口' },
      { selector: 'account.form.global', label: '新建平台账号（标题）', reason: '新建表单页' },
      { selector: 'account.form.save', label: '保存（表单底栏）', reason: '表单主操作' },
      { selector: 'account.form.cancel', label: '取消（表单底栏）', reason: '表单取消操作' },
      { selector: 'account.onetime.modal', label: '账号创建成功弹窗', reason: '一次性密码展示弹窗' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-acc-edit',
    title: '编辑平台账号',
    code: 'B15-07',
    blocks: [
      { type: 'heading', text: '入口与条件' },
      {
        type: 'list',
        items: [
          '入口：列表操作列「编辑」；详情页「编辑」。',
          '启用与停用状态均可编辑；注销态不可编辑。',
        ],
      },
      { type: 'heading', text: '可修改内容' },
      {
        type: 'list',
        items: [
          '姓名、手机号、邮箱、头像、平台角色。',
          '**登录名只读**（创建后不可改）。',
        ],
      },
      { type: 'heading', text: '平台角色的维护口径' },
      {
        type: 'paragraph',
        text: '编辑表单包含「平台角色」多选（带出现有角色），可增减（增减后 1-5 个、至少 1 个），**保存时角色变更一并生效**；也可通过「分配平台角色」弹窗维护，两个入口口径一致。',
      },
      { type: 'heading', text: '校验规则' },
      {
        type: 'list',
        items: [
          '手机号须为有效格式且全局唯一（与已有账号重复即阻断）。',
          '姓名必填且不超过 50 字符。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存成功提示「保存成功」，跳转回该账号详情；审计记录手机号前后值；记录更新人与更新时间。',
      },
      { type: 'heading', text: '取消' },
      {
        type: 'paragraph',
        text: '点「取消」返回来源页（详情或列表），不保存。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-07',
    operation: '编辑平台账号',
    buttonText: '编辑',
    selector: 'account.row.edit',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.row.edit', label: '编辑', reason: '行操作「编辑」' },
      { selector: 'account.detail.edit', label: '编辑（详情页）', reason: '详情页头操作' },
      { selector: 'account.form.global', label: '编辑平台账号（标题）', reason: '编辑表单页' },
      { selector: 'account.form.save', label: '保存（表单底栏）', reason: '表单主操作' },
      { selector: 'account.form.cancel', label: '取消（表单底栏）', reason: '表单取消操作' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 分配角色 / 停用 / 启用 ==================== */
  {
    id: 'ann-acc-assign-role',
    title: '分配平台角色',
    code: 'B15-08',
    blocks: [
      { type: 'heading', text: '入口与条件' },
      {
        type: 'list',
        items: [
          '入口：列表操作列「分配角色」；详情页「分配平台角色」。',
          '启用与停用状态均可分配；注销态不可分配。',
        ],
      },
      { type: 'heading', text: '操作过程' },
      {
        type: 'list',
        items: [
          '打开弹窗，标题「分配平台角色 · 姓名」。',
          '以复选框勾选角色（「超级管理员」标注「保护角色」，其他内置角色标注「内置」）。',
          '底部「已选角色」只读汇总所选角色名。',
        ],
      },
      { type: 'heading', text: '规则' },
      {
        type: 'list',
        ordered: true,
        items: [
          '增减后角色总数须在 1 至 5 个之间，至少保留 1 个。',
          '候选只出现平台角色，不出现任何租户角色。',
          '不可移除最后一个启用超管的超级管理员角色（阻断并提示系统至少保留 1 个启用超管）。',
          '不把平台角色写入该账号的租户成员关系，也不因其持有成员关系而改动平台角色。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存后提示「平台角色已更新」，**实时生效并踢目标账号下线重新取权限**；列表与详情的角色标签刷新；审计记前后值。',
      },
      { type: 'heading', text: '取消' },
      {
        type: 'paragraph',
        text: '点「取消」或关闭弹窗，不变更。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-08',
    operation: '分配平台角色',
    buttonText: '分配角色 / 分配平台角色',
    selector: 'account.row.assign',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.row.assign', label: '分配角色', reason: '行操作「分配角色」' },
      { selector: 'account.detail.assign', label: '分配平台角色（详情页）', reason: '详情页头操作' },
      { selector: 'account.role.modal', label: '分配平台角色弹窗', reason: '弹窗标题' },
      { selector: 'account.role.options', label: '角色候选区', reason: '角色勾选区域' },
      { selector: 'account.role.save', label: '保存（分配弹窗）', reason: '弹窗底栏主按钮' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-acc-disable',
    title: '停用账号',
    code: 'B15-09',
    blocks: [
      { type: 'heading', text: '显示条件' },
      {
        type: 'paragraph',
        text: '**只在该账号当前为「启用」时**才显示「停用」。',
      },
      { type: 'heading', text: '操作过程' },
      {
        type: 'list',
        items: [
          '点击后弹出二次确认，标题「确认停用」。',
          '正文「确认停用账号「姓名」（登录名）？」，并提示「停用后该账号无法登录平台后台，会话立即失效；平台角色保留，可重新启用。」',
          '底栏为「取消」与「确认停用」。',
        ],
      },
      { type: 'heading', text: '名下租户身份影响' },
      {
        type: 'paragraph',
        text: '目标账号名下有有效租户身份时，弹窗列出「该账号名下有 N 个租户身份将同时失效」与各租户名称（主管理员标注），并需**勾选「已知悉」方可确认**。',
      },
      { type: 'heading', text: '规则' },
      {
        type: 'list',
        items: [
          '不可停用本人（点击后阻断，提示不可对自己执行该操作）。',
          '不可停用最后一个启用超管（阻断）。',
          '账号级停用：平台端与租户端登录同时失效，目标会话立即失效。',
          '不收回平台角色关联、不改成员关系记录；审计记受影响租户身份数。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '确认后提示「停用成功」，状态标签变更为「停用」，操作列出现「启用」。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-09',
    operation: '停用账号',
    buttonText: '停用 / 确认停用',
    selector: 'account.row.disable',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.row.disable', label: '停用', reason: '行操作「停用」' },
      { selector: 'account.detail.disable', label: '停用（详情页）', reason: '详情页头操作' },
      { selector: 'account.confirm.modal', label: '确认停用弹窗', reason: '二次确认弹窗' },
      { selector: 'account.confirm.impact', label: '租户身份影响区', reason: '影响提示区域' },
      { selector: 'account.confirm.ack', label: '确认影响勾选', reason: '勾选确认项' },
      { selector: 'account.confirm.ok', label: '确认停用（弹窗底栏）', reason: '同弹窗操作项' },
      { selector: 'account.confirm.cancel', label: '取消（确认弹窗）', reason: '同弹窗操作项' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-acc-enable',
    title: '启用账号',
    code: 'B15-10',
    blocks: [
      { type: 'heading', text: '显示条件' },
      {
        type: 'paragraph',
        text: '**只在该账号当前为「停用」时**才显示「启用」。',
      },
      { type: 'heading', text: '操作过程' },
      {
        type: 'list',
        items: [
          '点击后弹出二次确认，标题「确认启用」。',
          '正文「确认启用账号「姓名」（登录名）？」，并提示「启用后该账号恢复登录能力，需已持有平台角色。」',
          '底栏为「取消」与「确认启用」。',
        ],
      },
      { type: 'heading', text: '规则' },
      {
        type: 'paragraph',
        text: '目标账号须**至少持有 1 个平台角色**；角色数为 0 时阻断，提示先分配平台角色。',
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '确认后提示「启用成功」，状态标签变更为「启用」；该账号在租户端的登录能力同步恢复。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-10',
    operation: '启用账号',
    buttonText: '启用 / 确认启用',
    selector: 'account.row.enable',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.row.enable', label: '启用', reason: '行操作「启用」' },
      { selector: 'account.detail.enable', label: '启用（详情页）', reason: '详情页头操作' },
      { selector: 'account.confirm.ok', label: '确认启用（弹窗底栏）', reason: '同弹窗操作项' },
      { selector: 'account.confirm.cancel', label: '取消（确认弹窗）', reason: '同弹窗操作项' },
    ],
    global: false,
    priority: 'medium',
  },

  /* ==================== 重置密码 / 注销 ==================== */
  {
    id: 'ann-acc-reset-password',
    title: '重置密码',
    code: 'B15-11',
    blocks: [
      { type: 'heading', text: '入口' },
      {
        type: 'list',
        items: [
          '列表操作列「重置密码」；详情页「重置密码」。',
          '**本人账号不显示该入口**。',
        ],
      },
      { type: 'heading', text: '权限' },
      {
        type: 'paragraph',
        text: '重置密码执行权限限超级管理员；原型固定以超管身份演示，非超管视角的入口可见性由功能码控制。',
      },
      { type: 'heading', text: '重置方式（单选）' },
      {
        type: 'list',
        items: [
          '**随机生成**（默认）：系统生成 12 位随机密码，含大写、小写、数字、特殊字符。',
          '**自定义密码**：录入新密码与确认新密码，须不少于 8 位，且包含大写、小写、数字、特殊字符中的三类，两次输入一致。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'list',
        items: [
          '**一次性展示新密码**（提示「请抄录并线下交付给账号持有人。关闭本弹窗后不可再次查看，遗失只能重新重置。」）。',
          '旧密码立即失效、目标账号全部会话失效、置首登改密标记。',
          '写密码重置记录（记重置方式）与审计；密码重置记录按字段清单落库，**不在详情页展示**。',
        ],
      },
      { type: 'heading', text: '取消' },
      {
        type: 'paragraph',
        text: '关闭弹窗不产生变更；已生成的一次性密码关闭后不可再查。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-11',
    operation: '重置密码',
    buttonText: '重置密码 / 确认重置',
    selector: 'account.row.reset',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.row.reset', label: '重置密码', reason: '行操作「重置密码」' },
      { selector: 'account.detail.reset', label: '重置密码（详情页）', reason: '详情页头操作' },
      { selector: 'account.reset.modal', label: '重置密码弹窗', reason: '弹窗标题' },
      { selector: 'account.reset.mode', label: '重置方式', reason: '重置方式选择' },
      { selector: 'account.reset.custom', label: '自定义密码输入', reason: '自定义密码录入区' },
      { selector: 'account.reset.ok', label: '确认重置', reason: '弹窗底栏主按钮' },
      { selector: 'account.reset.onetime', label: '一次性密码展示', reason: '新密码一次性展示区' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-acc-cancel',
    title: '注销账号',
    code: 'B15-12',
    blocks: [
      { type: 'heading', text: '显示条件' },
      {
        type: 'paragraph',
        text: '**只在该账号为「启用」或「停用」时**才显示「注销」；注销态不再出现。',
      },
      { type: 'heading', text: '操作过程' },
      {
        type: 'list',
        items: [
          '点击后弹出二次确认，标题「确认注销」。',
          '正文「确认注销账号「姓名」（登录名）？」，并提示「注销为不可逆操作：账号数据将被删除，平台角色关联同步回收，登录名与手机号一并释放（可重新注册）。」',
          '名下有有效租户身份时，列出「该账号名下有 N 个租户身份将同时失效」与各租户名称，并需勾选「已知悉」方可确认。',
          '底栏为「取消」与「确认注销」；**不设双人复核，仅二次确认**。',
        ],
      },
      { type: 'heading', text: '落库口径（以原型为准）' },
      {
        type: 'list',
        items: [
          '注销为**物理删除**：从账号表删除该账号记录，同步回收其平台角色关联。',
          '**登录名与手机号一并释放**（之后可被重新注册使用）。',
          '执行后该账号从平台账号列表与账号查询中消失。',
        ],
      },
      { type: 'heading', text: '与停用的区别' },
      {
        type: 'paragraph',
        text: '停用是**保留记录**的临时冻结，可重新启用；注销是**删除记录**的终态处理，不可恢复。',
      },
      { type: 'heading', text: '规则' },
      {
        type: 'list',
        items: [
          '不可注销本人（阻断）。',
          '不可注销最后一个启用超管（阻断）。',
          '注销后踢下线、不可登录。',
        ],
      },
      { type: 'heading', text: '文档同步' },
      {
        type: 'callout',
        text: 'PRD §5.7 / D05 与字段清单原为「记录保留、登录名与手机号不释放」口径，本轮裁决以原型为准，两份文档需同步修订。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-12',
    operation: '注销账号',
    buttonText: '注销 / 确认注销',
    selector: 'account.row.cancel',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.row.cancel', label: '注销', reason: '行操作「注销」' },
      { selector: 'account.detail.cancel', label: '注销（详情页）', reason: '详情页头操作' },
      { selector: 'account.confirm.modal', label: '确认注销弹窗', reason: '二次确认弹窗' },
      { selector: 'account.confirm.ok', label: '确认注销（弹窗底栏）', reason: '同弹窗操作项' },
      { selector: 'account.confirm.cancel', label: '取消（确认弹窗）', reason: '同弹窗操作项' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 账号查询（只读视图） ==================== */
  {
    id: 'ann-acc-query-page',
    title: '账号查询',
    code: 'B15-13',
    blocks: [
      { type: 'heading', text: '定位' },
      {
        type: 'paragraph',
        text: '平台管理员的全局账号视图，跨域查看全部账号（平台账号 + 租户成员），**只读，不提供任何写入口**。',
      },
      { type: 'heading', text: '入口与权限' },
      {
        type: 'paragraph',
        text: '平台后台 → 系统管理 → 组织与权限 → 账号查询（功能编码 M221，由平台角色勾选控制；无功能码时菜单不渲染、调接口返回无权限并写审计）。',
      },
      { type: 'heading', text: '数据范围' },
      {
        type: 'paragraph',
        text: '账号表全局唯一一份，既含持平台角色的平台账号，也含不持平台角色的租户成员；账号类型按「是否存在生效平台角色关联」动态判定，同一账号不出现两行。',
      },
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '姓名、登录名、手机号（脱敏）、邮箱、账号类型（平台账号 / 租户成员）、账号状态、最近登录时间、所属组织（生效成员关系对应的租户名，无则「—」）、创建人、创建时间；**不展示密码与头像**。',
      },
      { type: 'heading', text: '查询条件（叠加生效）' },
      {
        type: 'list',
        items: [
          '姓名 / 登录名 / 手机号：关键字包含匹配。',
          '账号类型：「平台账号 / 租户成员」。',
          '账号状态：「启用 / 停用」。',
          '任一条件变化后回到第 1 页；「重置」清空条件。',
        ],
      },
      { type: 'heading', text: '注销账号的可见性' },
      {
        type: 'paragraph',
        text: '列表展示注销态账号（演示数据）；账号状态筛选只有「启用 / 停用」两个选项，**不提供「注销」单独筛选**。',
      },
      { type: 'heading', text: '排序与分页' },
      {
        type: 'list',
        items: [
          '平台账号在前、租户成员在后；同类内启用状态在前，其余按更新时间倒序。',
          '每页 20 条。',
        ],
      },
      { type: 'heading', text: '工具条' },
      {
        type: 'paragraph',
        text: '显示「全部账号列表」与「共 N 条 · 平台账号 N 条 · 租户成员 N 条（账号表全局唯一一份，两域共享）」。',
      },
      { type: 'heading', text: '下钻' },
      {
        type: 'paragraph',
        text: '所有账号的姓名均可下钻 —— 平台账号进入平台账号详情（可操作）；租户成员进入只读详情（见 B15-05）。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.5 B15-13',
    operation: '账号查询',
    buttonText: '账号查询（功能标题）',
    selector: 'account.querypage.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.querypage.global', label: '账号查询（标题）', reason: '功能标题附近（全局说明入口）' },
      { selector: 'account.querypage.query.bar', label: '查询区', reason: '查询条件区域' },
      { selector: 'account.querypage.list', label: '全部账号清单', reason: '清单表格区域' },
    ],
    global: false,
    priority: 'high',
  },

  /* ==================== 字段说明 ==================== */
  {
    id: 'ann-acc-field-avatar',
    title: '字段：头像',
    code: 'B15-14',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '账号头像，用于详情页的人员识别（列表不展示头像列）。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'paragraph',
        text: '上传本地图片（原型为本地预览，不落真实文件服务）；可「更换」或「移除」。',
      },
      { type: 'heading', text: '必填与占位' },
      {
        type: 'list',
        items: [
          '**非必填**，允许为空。',
          '未上传时以**姓名首字占位**。',
        ],
      },
      { type: 'heading', text: '其他限制' },
      {
        type: 'paragraph',
        text: '不限制尺寸与格式；与账号记录同事务保存，不独立建表。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-14',
    operation: '头像',
    buttonText: '头像',
    selector: 'account.form.avatar',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'account.form.avatar', label: '头像', reason: '表单字段' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-acc-field-loginname',
    title: '字段：登录名',
    code: 'B15-15',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '登录凭证之一，账号的唯一登录标识。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'paragraph',
        text: '新建时手工填写；**创建后不可修改**（编辑表单中只读）。',
      },
      { type: 'heading', text: '必填与唯一' },
      {
        type: 'list',
        items: [
          '**必填**。',
          '**全局唯一**；不区分大小写、去空格、转半角后判重（如 ops01 与 OPS01 视为重复）。',
        ],
      },
      { type: 'heading', text: '格式限制' },
      {
        type: 'list',
        items: [
          '不得为 11 位纯数字（避免与手机号混淆）。',
          '**仅支持字母、数字与下划线**（输入其他字符阻断并提示「登录名仅支持字母、数字与下划线」）。',
        ],
      },
      { type: 'heading', text: '长度上限' },
      {
        type: 'paragraph',
        text: '不超过 50 字符（字段清单口径；原型未做长度限制，实现层按字段清单落地）。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-15',
    operation: '登录名',
    buttonText: '登录名',
    selector: 'account.form.loginName',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.form.loginName', label: '登录名（表单）', reason: '表单字段' },
      { selector: 'account.col.loginName', label: '登录名（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-acc-field-mobile',
    title: '字段：手机号',
    code: 'B15-16',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '登录凭证之一，也用于通知联系。',
      },
      { type: 'heading', text: '填写方式' },
      {
        type: 'paragraph',
        text: '手工填写；编辑表单展示明文，可修改。',
      },
      { type: 'heading', text: '必填、格式与唯一' },
      {
        type: 'list',
        items: [
          '**必填**。',
          '须为有效手机号（11 位、1 开头、第二位 3-9）。',
          '**全局唯一**，新建与编辑保存时都校验，重复即阻断。',
        ],
      },
      { type: 'heading', text: '脱敏规则' },
      {
        type: 'list',
        items: [
          '列表与详情脱敏展示，保留前 3 位与后 4 位，中间 4 位以掩码替换（如 138****0001）。',
          '**不提供列表与详情的明文查看入口**；表内存储明文，脱敏只发生在展示层。',
        ],
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-16',
    operation: '手机号',
    buttonText: '手机号',
    selector: 'account.form.mobile',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.form.mobile', label: '手机号（表单）', reason: '表单字段' },
      { selector: 'account.col.mobile', label: '手机号（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-acc-field-email',
    title: '字段：邮箱',
    code: 'B15-17',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '联系邮箱，用于通知与找回（字段清单口径；**不是登录凭证**）。',
      },
      { type: 'heading', text: '填写方式与必填' },
      {
        type: 'list',
        items: [
          '手工填写。',
          '**非必填**，可不填；为空时列表与详情显示「—」。',
        ],
      },
      { type: 'heading', text: '唯一与长度' },
      {
        type: 'list',
        items: [
          '不要求全局唯一。',
          '不超过 100 字符（字段清单口径；原型未做长度校验，实现层按字段清单落地）。',
        ],
      },
      { type: 'heading', text: '文案说明' },
      {
        type: 'callout',
        text: '原型表单提示为「非必填，用于登录凭证与通知」，其中「登录凭证」与字段清单口径不符，建议修正为「用于通知」（纯文案修正，不影响规则）。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-17',
    operation: '邮箱',
    buttonText: '邮箱',
    selector: 'account.form.email',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.form.email', label: '邮箱（表单）', reason: '表单字段' },
      { selector: 'account.col.email', label: '邮箱（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-acc-field-name',
    title: '字段：姓名',
    code: 'B15-18',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '账号的展示名称，列表、详情与操作记录中的人员识别依据。',
      },
      { type: 'heading', text: '填写方式与必填' },
      {
        type: 'list',
        items: [
          '手工填写；可修改。',
          '**必填**；为空阻断保存。',
          '长度不超过 50 字符。',
        ],
      },
      { type: 'heading', text: '联动' },
      {
        type: 'paragraph',
        text: '未上传头像时，头像占位取姓名首字。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-18',
    operation: '姓名',
    buttonText: '姓名',
    selector: 'account.form.displayName',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.form.displayName', label: '姓名（表单）', reason: '表单字段' },
      { selector: 'account.col.name', label: '姓名（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-acc-field-roles',
    title: '字段：平台角色',
    code: 'B15-19',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '账号在平台侧的身份与权限来源；多角色权限按功能码取并集。',
      },
      { type: 'heading', text: '选择方式' },
      {
        type: 'paragraph',
        text: '新建 / 编辑表单中多选；分配角色弹窗中复选框勾选；候选**只出现平台角色**，不出现租户角色。',
      },
      { type: 'heading', text: '必填与数量' },
      {
        type: 'paragraph',
        text: '**必选；至少 1 个、最多 5 个**；0 个阻断保存。',
      },
      { type: 'heading', text: '特殊角色' },
      {
        type: 'paragraph',
        text: '「超级管理员」为保护角色（不可删除、不可停用、不可取消内置；最后一个启用超管的该角色不可移除）。',
      },
      { type: 'heading', text: '可否修改与联动' },
      {
        type: 'paragraph',
        text: '可随时通过编辑表单或「分配平台角色」增减，保存 / 授权后**实时生效并踢目标账号下线**；账号是否出现在「平台账号」菜单、是否算平台账号，均由是否持有生效平台角色动态判定。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-19',
    operation: '平台角色',
    buttonText: '平台角色',
    selector: 'account.form.roles',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.form.roles', label: '平台角色（表单）', reason: '表单字段' },
      { selector: 'account.col.roles', label: '平台角色（清单列头）', reason: '同字段的清单列头' },
      { selector: 'account.role.options', label: '角色候选区', reason: '分配弹窗勾选区域' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-acc-field-password',
    title: '字段：密码（初始密码设置与一次性展示）',
    code: 'B15-20',
    blocks: [
      { type: 'heading', text: '展示口径' },
      {
        type: 'list',
        items: [
          '列表与详情只呈现掩码（••••••••），不回显明文。',
          '密码只在**生成时一次性展示**，关闭后任何入口不可再查；系统日志与接口响应不含明文。',
        ],
      },
      { type: 'heading', text: '建号初始密码（新建表单，二选一）' },
      {
        type: 'list',
        items: [
          '**系统随机生成**（默认）：8 位大小写字母 + 数字，至少含大写、小写、数字各一。',
          '**自定义密码**：8-20 位且同时包含字母和数字，两次输入一致。',
        ],
      },
      { type: 'heading', text: '重置密码（重置弹窗，二选一）' },
      {
        type: 'list',
        items: [
          '随机生成 12 位（含大写、小写、数字、特殊字符）。',
          '自定义：不少于 8 位且含四类字符中的三类。',
        ],
      },
      { type: 'heading', text: '生效规则' },
      {
        type: 'paragraph',
        text: '新密码生成后旧密码立即失效、目标账号全部会话失效、置首登改密标记。',
      },
      { type: 'heading', text: '遗失处理' },
      {
        type: 'paragraph',
        text: '只能由超管再次重置，不提供明文找回、不提供自助找回入口。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-20',
    operation: '密码 / 初始密码设置',
    buttonText: '初始密码设置 / 重置方式',
    selector: 'account.form.password',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.form.password', label: '初始密码设置', reason: '新建表单字段' },
      { selector: 'account.reset.mode', label: '重置方式', reason: '重置弹窗选项' },
      { selector: 'account.reset.onetime', label: '一次性密码展示', reason: '新密码一次性展示区' },
    ],
    global: false,
    priority: 'high',
  },
  {
    id: 'ann-acc-field-first-login',
    title: '字段：首次登录强制修改密码',
    code: 'B15-21',
    blocks: [
      { type: 'heading', text: '业务含义' },
      {
        type: 'paragraph',
        text: '首登改密标记，置位时账号首次登录后被强制进入改密页，改密后方可进入系统。',
      },
      { type: 'heading', text: '置位时机' },
      {
        type: 'list',
        items: [
          '新建账号时置 1（新建表单中默认开启、不可关闭）。',
          '重置密码后再次置 1。',
          '改密成功后清零。',
        ],
      },
      { type: 'heading', text: '详情展示' },
      {
        type: 'paragraph',
        text: '详情页展示「是（待改密）/ 否（已改密）」，用于核查该账号是否已完成首次改密。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-21',
    operation: '首次登录强制修改密码',
    buttonText: '首次登录强制修改密码',
    selector: 'account.form.firstLogin',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'account.form.firstLogin', label: '首次登录强制修改密码', reason: '新建表单勾选项' }],
    global: false,
    priority: 'medium',
  },
  {
    id: 'ann-acc-field-meta',
    title: '字段：制单信息与操作记录',
    code: 'B15-22',
    blocks: [
      { type: 'heading', text: '创建人 / 创建时间' },
      {
        type: 'paragraph',
        text: '新建保存时由系统记录，**不可维护**；列表与详情均展示。',
      },
      { type: 'heading', text: '最近更新' },
      {
        type: 'paragraph',
        text: '每次保存与状态变更刷新（更新人 · 更新时间）；只在详情展示。',
      },
      { type: 'heading', text: '操作记录表' },
      {
        type: 'paragraph',
        text: '时间、操作、操作人、变更摘要、客户端 IP；按时间倒序；只记录账号级操作（创建 / 编辑 / 分配角色 / 停用 / 启用 / 注销 / 重置密码 / 改密），**不含密码重置专项明细**（密码重置记录按字段清单独立落库，仅不在前端详情页呈现）。',
      },
      { type: 'heading', text: '数据性质' },
      {
        type: 'callout',
        text: '原型中的账号数据与操作记录为演示数据，正式实现需由系统按真实操作记录生成；明文密码不在任何记录中留存。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-22',
    operation: '制单信息 / 操作记录',
    buttonText: '创建人 / 创建时间 / 最近更新 / 操作记录',
    selector: 'account.detail.operations',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.detail.operations', label: '操作记录区', reason: '审计轨迹展示区' },
      { selector: 'account.detail.info', label: '账号信息区', reason: '制单信息所在信息区' },
      { selector: 'account.col.createdBy', label: '创建人（清单列头）', reason: '同字段的清单列头' },
      { selector: 'account.col.createdAt', label: '创建时间（清单列头）', reason: '同字段的清单列头' },
    ],
    global: false,
    priority: 'low',
  },
]

/** 全局批注（跨页面 / 文档级说明，进入右下角「全局批注」抽屉） */
export const accountGlobalAnnotations: Annotation[] = [
  {
    id: 'gann-acc-scope',
    title: '本期不包含的能力',
    blocks: [
      { type: 'heading', text: '本期不包含' },
      {
        type: 'list',
        items: [
          '登录页自助找回密码',
          '凭恢复码 / 凭令牌绕过登录的密码重置',
          '生成恢复码',
          '批量操作（批量启用 / 停用 / 注销）',
          '导入 / 导出',
          '账号软删（注销为物理删除，以原型为准）',
          '操作日志独立入口（审计走详情页「操作记录」）',
        ],
      },
      { type: 'heading', text: '超管全灭兜底' },
      {
        type: 'paragraph',
        text: '全部超管均无法登录时，产品内不设自助恢复入口，统一转运维恢复（实施方双人复核 + 留存操作记录 + 出具复盘报告 + 写审计），恢复后要求受影响账号首登改密。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §3 L-01 / 业务 PRD §5.8',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
    category: '能力',
    unmatchedReason: '范围类说明，对应多个被移除的能力，无唯一操作目标。',
  },
  {
    id: 'gann-acc-mock',
    title: '数据性质（原型演示数据）',
    blocks: [
      {
        type: 'paragraph',
        text: '本模块数据为原型演示数据：账号、操作记录、密码重置记录均为内存态，刷新后回到初始状态。',
      },
      {
        type: 'paragraph',
        text: '当前登录者固定为超管（平台超管 · 林澈），用于「不可停用 / 注销 / 重置自己」等校验的演示；正式实现需由系统按真实数据与真实操作记录生成。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §3 L-03',
    operation: '文档级说明（无唯一操作项）',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
    category: '演示数据',
    unmatchedReason: '数据性质说明，非页面操作。',
  },
]
