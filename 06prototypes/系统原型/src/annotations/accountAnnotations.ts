import type { Annotation } from './types'

/**
 * 平台账号功能批注数据（对齐《平台账号功能批注》V1.6，编号 B15-01 ~ B15-25）。
 * 覆盖范围：/system/account（账号管理：统一账号列表、新建 / 编辑 / 详情 /
 * 停用启用注销确认弹窗 / 分配角色弹窗 / 重置密码弹窗）。
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
        text: '平台管理员在后台维护全系统账号：账号是唯一实体，平台角色与租户成员关系是挂在账号上的两类身份，可并存。账号级运维（停用启用 / 重置密码 / 注销）统一在本页处理。',
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
        text: '列表点「姓名」进入该账号详情；未持平台角色的账号同样可查看详情（资料与租户角色由租户端维护，平台侧就地提供停用 / 启用 / 重置密码等账号级运维）。',
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
          '统一列表同表展示全部账号：持平台角色的账号可编辑、分配平台角色并按状态矩阵运维；不持平台角色的账号仅开放账号级运维（编辑账号级资料 / 重置密码 / 停用 / 启用 / 孤账号注销），部门、租户角色与成员状态由租户端成员管理维护。',
          '识别为平台账号**且**账号状态为「启用」，才能进入平台后台。',
          '权限取自所持平台角色的功能码（多角色取并集）；角色定义与维护在「平台角色管理」，本模块只指派、不定义。',
        ],
      },
      { type: 'heading', text: '登录凭证' },
      {
        type: 'list',
        items: [
          '账号、手机号各自**全局唯一**；账号不区分大小写、去空格、转半角后判重。',
          '账号**不得为 11 位纯数字**，且**仅支持字母、数字与下划线**。',
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
      { type: 'heading', text: '根账号保护（不是「超管保护」）' },
      {
        type: 'list',
        items: [
          '系统初始化内置 **1 个**超管根账号（`is_builtin = 1`，创建人「系统初始化」）：账号管理中**只读**，只能查看，不可编辑 / 分配角色 / 重置密码 / 停用 / 启用 / 注销。',
          '**保护对象是账号，不是角色**：非内置账号被授予超级管理员角色后不受任何限制，按普通平台账号正常运维。',
          '根账号恒为启用且恒持超管角色，因此系统结构性保证始终存在 1 个可登录超管；非内置超管可被正常停用 / 注销 / 移除角色。',
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
      { type: 'heading', text: '两种状态' },
      {
        type: 'table',
        columns: ['', '启用', '停用'],
        rows: [
          ['业务含义', '放行登录（平台侧还需至少 1 个平台角色）', '拦截登录、会话即时失效；平台端与租户端同时失效'],
          ['进入方式', '新建保存默认；或停用态经「启用」', '启用态经「停用」进入'],
        ],
      },
      {
        type: 'paragraph',
        text: '**注销不是状态**：注销 = 物理删除账号记录（见 B15-12），执行后账号不存在，不设注销态、不出现在任何列表与筛选项里。',
      },
      { type: 'heading', text: '状态矩阵（可进行的操作）' },
      {
        type: 'table',
        columns: ['状态', '可编辑', '可分配角色', '可重置密码', '可停用', '可启用', '可注销', '可登录平台后台'],
        rows: [
          ['启用', '是', '是', '是', '是', '否', '是', '是'],
          ['停用', '是', '是', '是', '否', '是', '是', '否'],
        ],
      },
      { type: 'heading', text: '查看的例外' },
      {
        type: 'paragraph',
        text: '启用与停用状态均可「查看」详情；注销执行后账号记录已删除，不再有详情可看。',
      },
      { type: 'heading', text: '状态变化的影响' },
      {
        type: 'paragraph',
        text: '停用**不收回平台角色关联、不改租户成员关系记录**，仅关闭登录闸门；重新启用后恢复登录能力（平台账号启用前校验至少持有 1 个平台角色，租户成员账号不受此限）。',
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
    title: '账号列表',
    code: 'B15-04',
    blocks: [
      { type: 'heading', text: '展示内容' },
      {
        type: 'paragraph',
        text: '姓名、账号、手机号（脱敏）、邮箱、平台角色、所属组织（生效租户成员关系对应的组织名，无则显示「平台」）、账号状态、最近登录时间、操作；**不展示密码列，也不展示创建人 / 创建时间**。',
      },
      {
        type: 'list',
        items: [
          '姓名列中，当前登录账号带「本人」标签。',
          '手机号脱敏为前 3 后 4（如 138****0001）。',
          '平台角色以标签展示，「超级管理员」红色高亮；未持平台角色的账号显示「—」。',
          '邮箱为空显示「—」；最近登录时间为空显示「未登录」。',
        ],
      },
      { type: 'heading', text: '查询条件（叠加生效）' },
      {
        type: 'list',
        items: [
          '姓名 / 账号 / 手机号：关键字包含匹配（账号忽略大小写）。',
          '身份：下拉单选「持有平台角色 / 有租户成员关系」，不选即全部。',
          '账号状态：下拉单选「启用 / 停用」，不选即全部。',
          '平台角色：下拉单选，不选即全部。',
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
        text: '显示「账号列表」与「共 N 条 · 启用 N 条 · 持平台角色 N 条 · 有租户身份 N 条」，并常驻提示「系统内置根账号只读（仅可查看与重置自己的密码）」。',
      },
      { type: 'heading', text: '操作列' },
      {
        type: 'list',
        items: [
          '「查看」「编辑」「分配角色」常驻（编辑 / 分配角色仅对持平台角色的账号出现）。',
          '超过 3 个操作时收起进「更多 ▾」下拉。',
          '「停用 / 启用 / 重置密码 / 注销」按账号状态出现其一，危险操作（停用 / 重置密码 / 注销）红色展示。',
          '**系统内置根账号**：姓名后带「系统内置」标记，操作列**只有「查看」**；**本人**额外有「重置密码」。',
          '**非内置超管账号**：与普通平台账号一致，按钮按状态矩阵完整呈现。',
          '未持平台角色的账号：查看 + 重置密码 / 停用 / 启用（账号级兜底运维）+ 无任何归属的孤账号可注销。',
          '本人账号不显示「重置密码」（E10）；「停用」「注销」对本人显示但点击后阻断。',
        ],
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.4 B15-04',
    operation: '账号列表',
    buttonText: '账号列表',
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
        text: '列表「姓名」链接或操作列「查看」打开详情弹窗；原「账号查询」页已并入统一账号列表，不再单独提供。',
      },
      { type: 'heading', text: '账号信息区' },
      {
        type: 'paragraph',
        text: '头像、账号、手机号（脱敏）、邮箱、姓名、平台角色、密码（掩码）、首次登录强制修改密码、账号状态、创建人、创建时间、最近更新（更新人 · 更新时间）。',
      },
      { type: 'heading', text: '名下租户身份区' },
      {
        type: 'list',
        items: [
          '只要账号存在有效租户身份即展示（**不区分是否持平台角色**），逐条列出组织名，主管理员标注「（主管理员）」。',
          '无任何有效租户身份时不展示该区。',
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
        text: '按状态矩阵与「非本人」规则呈现（返回列表、分配平台角色、停用、启用、重置密码、编辑、注销）；本人账号不显示「重置密码」（E10）。**系统内置根账号例外**：页头为「返回列表」+「系统内置 · 仅可查看」标签，本人额外有「重置密码」，其余写操作一律不出现。',
      },
      { type: 'heading', text: '无平台角色账号' },
      {
        type: 'paragraph',
        text: '未持平台角色的账号：姓名旁显示「租户成员」标签，平台角色位置显示「无平台角色（租户成员）」；详情提供「编辑」（仅账号级资料，角色区只读）、停用 / 启用 / 重置密码 / 注销，**不提供「分配角色」**；底部提示部门、租户角色、成员状态仍归租户端成员管理。',
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
        text: '头像、姓名、手机号、账号、邮箱、平台角色、初始密码；**不设「首次登录强制修改密码」开关**，表单底部固定提示「无论自定义还是随机生成，首次登录均须强制修改初始密码」。',
      },
      { type: 'heading', text: '校验规则（任一不通过即阻断保存，已填内容保留）' },
      {
        type: 'list',
        ordered: true,
        items: [
          '账号必填；仅支持字母、数字与下划线；不得为 11 位纯数字；与已有账号不重复（不区分大小写、去空格、转半角后判重）。',
          '手机号必填；须为有效手机号格式；全局唯一。',
          '姓名必填，不超过 50 字符。',
          '平台角色须选 1 至 5 个，至少 1 个。',
          '初始密码为**单个输入框**：留空即由系统随机生成；填写则须 8-20 位且同时包含字母和数字（**无「确认密码」输入框**）。',
        ],
      },
      { type: 'heading', text: '操作结果' },
      {
        type: 'paragraph',
        text: '保存成功后弹窗切换为「新建平台账号 · 创建成功」结果页，**一次性展示账号与初始密码**（含「复制账号信息」按钮），提示「请务必将账号和密码告知使用人」「本页关闭后初始密码不可再次查看，遗失只能通过重置密码重新生成」；底栏为「继续新增下一位账号」「完成并关闭」，结果页**不可用 × / 遮罩 / Esc 关闭**。',
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
          '启用与停用状态均可编辑；注销为物理删除，执行后无记录可编辑。',
        ],
      },
      { type: 'heading', text: '可修改内容' },
      {
        type: 'list',
        items: [
          '头像、姓名、邮箱、平台角色（仅平台账号）。',
          '**账号只读**（创建后不可改）。',
          '手机号默认以掩码只读展示，需点「修改」后才可录入新号；保存时若手机号变更，先弹二次确认，确认后才提交。',
          '**租户成员账号**：角色区只读，仅可改账号级资料（姓名 / 手机号 / 邮箱 / 头像）。',
        ],
      },
      { type: 'heading', text: '平台角色的维护口径' },
      {
        type: 'paragraph',
        text: '平台账号的编辑表单包含「平台角色」多选（带出现有角色），可增减（增减后 1-5 个、至少 1 个），**保存时角色变更一并生效**；也可通过「分配平台角色」弹窗维护，两个入口口径一致。',
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
        text: '保存成功提示「保存成功」并关闭弹窗、刷新列表与详情；审计记录手机号前后值，记录更新人与更新时间。',
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
          '启用与停用状态均可分配；注销为物理删除，执行后无记录可分配。',
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
          '非内置账号移除超级管理员角色时，若系统已无启用超管则阻断；内置根账号恒持该角色且不可变更，故该场景实际不会命中。',
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
          '正文「确认停用账号「姓名」（账号）？」，并提示「停用后该账号无法登录平台后台，会话立即失效；平台角色保留，可重新启用。」',
          '**租户成员账号**：另需选择「操作原因」（必填）并可填「补充说明」（选填）；未选原因或未勾选「已知悉」时「确认停用」按钮禁用。',
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
          '不可停用**系统内置根账号**（入口不出现、接口拒绝）；非内置超管可正常停用。',
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
          '正文「确认启用账号「姓名」（账号）？」，并提示「启用后该账号恢复登录能力，需已持有平台角色。」',
          '**租户成员账号**：提示改为「启用后该账号恢复登录能力；此前被禁用的成员关系不随之恢复，仍由租户管理员在成员管理中启用」，并需选择「操作原因」（必填）。',
          '底栏为「取消」与「确认启用」。',
        ],
      },
      { type: 'heading', text: '规则' },
      {
        type: 'paragraph',
        text: '**平台账号**须至少持有 1 个平台角色，角色数为 0 时阻断并提示先分配平台角色；**租户成员账号**不持平台角色，可直接启用（成员关系需另在成员管理恢复）。',
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
          '**本人账号不显示该入口**（E10，不可重置自己）。',
          '**系统内置根账号是唯一例外**：根账号本人可重置自己的密码；他人对根账号重置一律拒绝（E24）。',
        ],
      },
      { type: 'heading', text: '权限' },
      {
        type: 'paragraph',
        text: '重置密码执行权限限超级管理员；原型固定以超管身份演示，非超管视角的入口可见性由功能码控制。非内置超管账号的密码可被其他超管正常重置。',
      },
      { type: 'heading', text: '根账号本人的重置' },
      {
        type: 'paragraph',
        text: '根账号行 / 详情页的「重置密码」仅对本人可见，走同一标准流程：随机生成 / 自定义新密码 → **新密码一次性展示** → 旧密码与既有会话失效 → 标记首登改密。不设独立「修改密码」操作。',
      },
      { type: 'heading', text: '重置方式（单选）' },
      {
        type: 'list',
        items: [
          '**随机生成**（默认）：系统生成 12 位随机密码，含大写、小写、数字、特殊字符。',
          '**自定义密码**：录入新密码与确认新密码，须不少于 8 位，且包含大写、小写、数字、特殊字符中的三类，两次输入一致。',
        ],
      },
      { type: 'heading', text: '租户成员账号的附加要求' },
      {
        type: 'list',
        items: [
          '若账号同时属于多个租户，弹窗顶部展示影响区「该账号同时属于 N 个租户，重置将使其全部会话失效」，并列出各租户名（主管理员标注）。',
          '**必须选择「重置原因」**（下拉），可另填「补充说明」（选填，写入平台审计与租户侧审计）。',
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
        text: '**只在该账号为「启用」或「停用」时**才显示「注销」；注销执行后账号记录不存在，不再出现在列表。',
      },
      { type: 'heading', text: '前置拦截' },
      {
        type: 'list',
        items: [
          '不可注销本人（阻断）。',
          '不可注销**系统内置根账号**（入口不出现、接口拒绝）；非内置超管可正常注销。',
          '**目标为任一租户在任主管理员时阻断**，提示先到「租户管理 → 更换主管理员」完成交接。',
        ],
      },
      { type: 'heading', text: '操作过程' },
      {
        type: 'list',
        items: [
          '点击后弹出二次确认，标题「确认注销」。',
          '正文「确认注销账号「姓名」（账号）？」，并提示「注销为不可逆操作：账号数据将被删除，平台角色关联同步回收，账号与手机号一并释放（可重新注册）。」',
          '名下有有效租户身份时，列出「该账号名下有 N 个租户身份将同时失效」与各租户名称，并需勾选「已知悉」方可确认。',
          '底栏为「取消」与「确认注销」；**不设双人复核，仅二次确认**。',
        ],
      },
      { type: 'heading', text: '落库口径' },
      {
        type: 'list',
        items: [
          '注销为**物理删除**，按顺序执行：有效成员关系置「已移出」（removed_type = 3）并保留账号快照 → 平台角色关联删除 → 密码重置记录删除 → 账号记录删除。',
          '**账号与手机号一并释放**（之后可被重新注册使用）。',
          '执行后该账号从账号列表中消失；其名下租户的成员关系仍保留为「已移出」供追溯。',
        ],
      },
      { type: 'heading', text: '与停用的区别' },
      {
        type: 'paragraph',
        text: '停用是**保留记录**的临时冻结，可重新启用；注销是**删除记录**的终态处理，不可恢复。',
      },
    ],
    source: '《平台账号功能批注》V1.2 §1.4 B15-12',
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

  /* ==================== 系统内置根账号 ==================== */
  {
    id: 'ann-acc-builtin-root',
    title: '系统内置根账号：只读兜底入口',
    code: 'B15-25',
    blocks: [
      { type: 'heading', text: '是什么' },
      {
        type: 'paragraph',
        text: '系统初始化（建库部署）时由脚本写入账号表的 **1 个**超管根账号，`is_builtin = 1`，创建人固定为「系统初始化」；全系统仅此 1 条，产品内不可新增、不可删除。',
      },
      { type: 'heading', text: '为什么需要它' },
      {
        type: 'paragraph',
        text: '平台内部任何操作都不能把自己锁死。只靠「至少保留 1 个超管」的动态计数，一旦唯一超管被停用或注销就必须走运维恢复；内置根账号把「最后一个超管入口」变成结构性保证。',
      },
      { type: 'heading', text: '只读边界（关键）' },
      {
        type: 'list',
        items: [
          '不可编辑：姓名 / 手机号 / 邮箱 / 头像均不可改；直接访问编辑地址被挡回详情并提示。',
          '不可分配或移除平台角色：恒持「超级管理员」。',
          '不可被**他人**重置密码：防止任一超管借此接管根账号。',
          '不可停用 / 启用：恒为启用态。',
          '不可注销：记录不可删除，登录名与手机号不释放。',
          '以上动作在接口层同样拒绝并写审计（E22–E24）。',
        ],
      },
      { type: 'heading', text: '唯一例外：本人可重置自己的密码' },
      {
        type: 'paragraph',
        text: '根账号本人可在行内 / 详情页点「重置密码」（仅 `isSelf` 可见），走标准重置流程——随机生成 / 自定义新密码，**新密码一次性展示**，旧密码与既有会话立即失效，并标记首登改密；不设独立「修改密码」操作。',
      },
      { type: 'heading', text: '作为操作人仍是完整超管' },
      {
        type: 'paragraph',
        text: '只读限制只作用于「针对根账号自身」的写操作。根账号登录后可对**全部非根账号**执行新建 / 编辑 / 分配平台角色 / 重置密码 / 停用 / 启用 / 注销，与其他超管无差异。',
      },
      { type: 'heading', text: '与「超管」的关系（易混点）' },
      {
        type: 'paragraph',
        text: '保护对象是**账号**，不是**角色**。非内置账号被授予「超级管理员」角色后不获得任何保护，仍可被查看 / 编辑 / 分配角色 / 重置密码 / 注销 / 停用 / 启用。原「所有超管账号仅可查看与重置密码」的口径已取消——它会把所有超管一起冻结，反而无法运维。',
      },
      { type: 'heading', text: '建号路径' },
      {
        type: 'paragraph',
        text: '新建账号并分配超级管理员角色，由内置根账号在平台侧完成；新建出来的超管是普通账号（`is_builtin = 0`），后续运维不受限制。',
      },
      { type: 'heading', text: '页面呈现' },
      {
        type: 'list',
        items: [
          '列表：姓名后带「系统内置」小标签；本人行操作列为「查看 + 重置密码」，他人看到该行只有「查看」。',
          '详情为弹窗：标题「账号详情 · 姓名（账号）」，姓名旁带「系统内置」标签，底部固定提示「只读：不可编辑、不可分配角色、不可启停、不可注销，唯一例外是本人可重置自己的密码」；本人额外有「重置密码」，其余写操作一律不出现。',
        ],
      },
    ],
    source: '业务 PRD V0.19 §1.3 / §5.12 / D21；字段清单 V0.14 `account.is_builtin`',
    operation: '系统内置根账号',
    buttonText: '系统内置（姓名列标记）',
    selector: 'account.col.name',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.col.name', label: '姓名列（系统内置标记）', reason: '根账号身份识别位置' },
      { selector: 'account.detail.info', label: '账号信息区', reason: '详情页姓名与内置标记所在信息区' },
      { selector: 'account.toolbar', label: '工具条', reason: '只读提示常驻位置' },
    ],
    global: false,
    priority: 'high',
    category: '对应业务规则',
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
    title: '字段：账号',
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
          '**仅支持字母、数字与下划线**（输入其他字符阻断并提示「账号仅支持字母、数字与下划线」）。',
        ],
      },
      { type: 'heading', text: '长度上限' },
      {
        type: 'paragraph',
        text: '不超过 50 字符（字段清单口径；原型未做长度限制，实现层按字段清单落地）。',
      },
    ],
    source: '《平台账号功能批注》V1.1 §1.6 B15-15',
    operation: '账号',
    buttonText: '账号',
    selector: 'account.form.loginName',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.form.loginName', label: '账号（表单）', reason: '表单字段' },
      { selector: 'account.col.loginName', label: '账号（清单列头）', reason: '同字段的清单列头' },
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
        text: '「超级管理员」为保护角色（角色本身不可删除、不可停用、不可取消内置）。**账号级保护只针对系统内置根账号**：非内置账号被授予该角色后仍可正常编辑 / 停用 / 注销。',
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

  /* ==================== 租户成员兜底：管理员保护与留痕 ==================== */
  {
    id: 'ann-acc-admin-vacuum',
    title: '管理员保护：不允许把租户停成「无人可管」',
    code: 'B15-23',
    blocks: [
      { type: 'heading', text: '判定口径' },
      {
        type: 'paragraph',
        text: '停用 / 注销前的判定不是「是不是主管理员」，而是**结果判定**：操作后该租户的「可用管理员数」是否为 0。',
      },
      {
        type: 'list',
        items: [
          '可用管理员 = 成员状态正常 **且** 账号状态启用 **且** 持有「租户管理员」角色。',
          '判定时**不看租户状态**：租户停用期间仍可停用管理员账号（无人在用）。',
          '「租户启用」时另有校验兜底：可用管理员为 0 则阻断启用（E38）。',
        ],
      },
      { type: 'heading', text: '命中后的行为' },
      {
        type: 'list',
        items: [
          '弹窗展示受影响租户与「停用后将无可用管理员」，**禁用确认按钮**。',
          '提供「去更换主管理员」出口，直达租户详情，避免只报错不给解法。',
          '被阻断的尝试写入账号操作记录（结果 = 失败），反复尝试属于安全信号。',
        ],
      },
      { type: 'heading', text: '为什么不是简单阻断' },
      {
        type: 'paragraph',
        text: '纯阻断会让「先交接再停用」之间出现窗口，原账号（可能是被盗账号）在此窗口内仍可登录。因此弹窗把交接入口前置，一步可达。',
      },
    ],
    source: '业务 PRD §5.4-4 / §5.7-4（E19）；租户管理 PRD §4.18、E38',
    operation: '停用 / 注销账号',
    buttonText: '停用（管理员保护）',
    selector: 'account.confirm.admin-vacuum',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.confirm.admin-vacuum', label: '管理员保护提示', reason: '停用确认弹窗内的阻断说明' },
      { selector: 'account.confirm.goto-admin', label: '去更换主管理员', reason: '阻断时的解困出口' },
    ],
    global: false,
    priority: 'high',
    category: '对应业务规则',
  },
  {
    id: 'ann-acc-tenant-reason',
    title: '租户账号兜底：原因必填与跨租户影响',
    code: 'B15-24',
    blocks: [
      { type: 'heading', text: '原因必填' },
      {
        type: 'paragraph',
        text: '对**租户成员**执行停用 / 启用 / 重置密码时，原因必填（枚举 + 补充说明）；对平台账号不强制（平台内部运维场景，见 V0.9 取消原因）。',
      },
      {
        type: 'list',
        items: [
          '枚举固定为：忘记密码 / 人员失联 / 安全事件 / 租户管理员无法处理 · 平台协助。',
          '原因写入账号操作记录，并同步到租户侧审计，租户管理员可见。',
        ],
      },
      { type: 'heading', text: '跨租户影响' },
      {
        type: 'paragraph',
        text: '账号是全局唯一的，密码与状态都是**账号级凭证**：停用或重置会影响该账号在**全部租户**的会话，弹窗须列出涉事租户并要求确认。',
      },
    ],
    source: '本轮设计决策（D50 / R7）；平台账号 PRD §5.6、§10.3',
    operation: '重置密码 / 停用 / 启用（租户成员）',
    buttonText: '重置密码（租户成员）',
    selector: 'account.confirm.reason',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'account.confirm.reason', label: '操作原因', reason: '停用 / 启用弹窗的原因字段' },
      { selector: 'account.reset.reason', label: '重置原因', reason: '重置密码弹窗的原因字段' },
      { selector: 'account.reset.impact', label: '跨租户影响', reason: '重置密码弹窗的租户清单' },
    ],
    global: false,
    priority: 'high',
    category: '对应业务规则',
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
          '账号软删（注销为物理删除，见 PRD §5.7）',
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
