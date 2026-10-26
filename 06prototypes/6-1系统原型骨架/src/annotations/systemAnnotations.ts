import type { Annotation } from './types'

/**
 * 系统级批注（全系统一套，跨模块生效）。
 *
 * 与模块批注的分工（两者**互不混用**）：
 * - 系统批注（本文件）：来自《产品碳足迹核算系统 · 原型评审标注文档 v1.1》，
 *   只写**跨模块、评审必问**的口径——账号、租户、角色与数据权限、三条业务链；
 *   不锚定页面元素（全部 unmatched），只进入右下角「系统批注」独立抽屉。
 * - 模块批注（registry.ts 中按路由登记）：本模块的字段 / 操作 / 空态 / 待确认事项，
 *   锚定到页面元素或在模块「全局批注」抽屉里展示，不重复系统口径。
 */
export interface SystemAnnotationChapter {
  /** 章节标识 */
  id: string
  /** 章节标题（与评审文档章节对齐） */
  title: string
  /** 一句话说明本章回答什么问题 */
  summary: string
  /** 本章批注（按阅读顺序排列） */
  annotations: Annotation[]
}

const CHAPTER_0: SystemAnnotationChapter = {
  id: 'sys-ch-0',
  title: '00 阅读指引',
  summary: '这套批注怎么看、和页面批注怎么配合、原型与设计的差异在哪里',
  annotations: [
    {
      id: 'sys-reading-layers',
      title: '批注的三个层次（先看什么）',
      code: 'SYS-01',
      blocks: [
        { type: 'heading', text: '定位' },
        {
          type: 'paragraph',
          text: '本抽屉是**跨模块、评审必问**的系统级口径，源自《产品碳足迹核算系统 · 原型评审标注文档 v1.1》；单页字段级说明仍在页面元素旁的「注」标记里。',
        },
        { type: 'heading', text: '三个层次' },
        {
          type: 'table',
          columns: ['层次', '位置', '回答的问题'],
          rows: [
            ['系统级', '本抽屉（右下角「系统批注」）', '账号、租户、权限、三条业务链怎么串'],
            ['模块级', '各页面右下角「全局批注」', '本模块的空态、范围边界、待确认事项'],
            ['元素级', '页面元素旁「注」标记', '这个按钮 / 字段 / 状态的口径与结果'],
          ],
        },
        { type: 'heading', text: '与模块批注的关系' },
        {
          type: 'paragraph',
          text: '两层**互不重叠**：系统批注不锚定任何页面元素、不进入模块「全局批注」抽屉；模块批注也不重复系统口径，只在需要时引用。',
        },
        {
          type: 'callout',
          text: '评审顺序建议：先在本抽屉建立全局口径 → 再进各模块看页面批注 → 最后把结论按「口径确认 / 原型差异 / 待裁决」三类归档。',
        },
      ],
      source: '《原型评审标注文档》v1.1 文档定位 / 编排原则',
      operation: '系统级说明（阅读指引）',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '整体流程',
      unmatchedReason: '跨全系统的阅读说明，不对应单一页面或操作。',
    },
    {
      id: 'sys-reading-gaps',
      title: '原型与设计的差异（评审需知）',
      code: 'SYS-02',
      blocks: [
        {
          type: 'paragraph',
          text: '原型是**可点击的口径演示**，以下几处按设计口径判断需求，不按原型现状判断。',
        },
        {
          type: 'table',
          columns: ['差异', '原型现状', '设计口径'],
          rows: [
            ['密码校验', '不校验，任意密码通过', '服务端校验 + 连续错误锁定'],
            ['强制改密', '已实现 `must_change_password` + 全屏拦截', '同左'],
            ['多租户', '单租户，账号只绑 1 个租户，顶栏无切换', '多租户选择 / 切换后置'],
            ['会话', '`sessionStorage`，关闭浏览器即失效', '按会话有效期配置'],
          ],
        },
        {
          type: 'callout',
          text: '差异项不计为缺陷，但要在评审结论里单独记一条「原型与设计差异」，避免被当成实现要求。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §1.1.3',
      operation: '系统级说明（原型差异）',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '全局规则说明',
      unmatchedReason: '差异对照覆盖登录与会话，跨页面存在，无唯一锚点。',
    },
  ],
}

const CHAPTER_1: SystemAnnotationChapter = {
  id: 'sys-ch-1',
  title: '01 账号与登录',
  summary: '一个账号怎么进来，进来前要过哪些闸门，密码规则是什么',
  annotations: [
    {
      id: 'sys-login-flow',
      title: '登录主流程与三道闸门',
      code: 'SYS-03',
      blocks: [
        { type: 'heading', text: '主流程' },
        {
          type: 'flow',
          caption: '账号登录业务流程（含首次登录强制改密）',
          chart: `flowchart TD
  A["打开系统"] --> B{"已有有效会话?"}
  B -->|是| B1{"must_change_password = 1?"}
  B1 -->|是| V
  B1 -->|否| C["进入上次落地页"]
  B -->|否| D["登录页：手机号 / 登录名 + 初始密码"]
  D --> E{"账号存在?"}
  E -->|否| F["拒绝：账号或密码不正确"]
  E -->|是| G{"账号状态"}
  G -->|已注销| H["拒绝：账号已注销，无法登录"]
  G -->|已停用| I["拒绝：账号已停用，请联系平台管理员"]
  G -->|启用| J{"密码正确?"}
  J -->|否| J1["错误计数 +1<br/>达阈值则锁定一段时间"]
  J -->|是| L{"账号是否有唯一租户身份?"}
  L -->|有| P{"三道闸门校验"}
  L -->|无，且持平台角色| M["进入平台后台会话"]
  P -->|租户已停用| Q["拒绝：所属租户已停用"]
  P -->|成员关系不存在| R["拒绝：成员身份已不存在"]
  P -->|成员已移出| S["拒绝：已被移出该租户"]
  P -->|成员已停用| T["拒绝：成员身份已停用"]
  P -->|全部通过| U{"must_change_password = 1?"}
  M --> U
  U -->|否| Z["进入首页"]
  U -->|是| V["全屏改密页<br/>原密码 + 新密码 + 确认<br/>无关闭按钮，不可取消"]
  V --> W{"复杂度合规 且 新密码 ≠ 原密码 且 两次一致?"}
  W -->|否| X["提示不通过原因<br/>停留改密页"]
  W -->|是| Y["置 must_change_password = 0<br/>旧密码与既有会话立即失效"]
  Y --> Z
  Z --> AA["按角色计算菜单 / 按钮 / 数据范围"]`,
        },
        { type: 'heading', text: '闸门规则' },
        {
          type: 'list',
          items: [
            '**三道闸门**：账号启用 → 成员关系启用 → 租户启用，任一不满足即拒绝。',
            '**不允许中间态**：不出现「能登录但进不了任何租户」的情况。',
            '**错误提示统一**：不区分账号不存在与密码错误，统一提示「账号或密码不正确」，避免账号探测。',
            '**连续错误锁定**：默认连错 5 次锁定 15 分钟（按系统参数）。',
            '**无自助找回**：成员由租户管理员重置，主管理员由平台超管重置。',
          ],
        },
        { type: 'heading', text: '平台账号' },
        {
          type: 'paragraph',
          text: '只持平台角色、不占租户名额，登录后进入平台后台会话；处理租户事务走「进入租户」（只读 + 审计）。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §1.1.1 / §1.1.2',
      operation: '登录',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '整体流程',
      unmatchedReason: '登录页在业务布局之外，无页面锚点，统一在系统批注说明。',
    },
    {
      id: 'sys-login-single-tenant',
      title: '单租户绑定（本期无选租户）',
      code: 'SYS-04',
      blocks: [
        {
          type: 'list',
          items: [
            '一个账号**只能绑定一个租户**，登录直接取该唯一租户身份。',
            '无「选租户」步骤，顶栏**不提供切换入口**；多人多租户后置。',
            '已绑定其他租户（成员关系有效）的账号，**不能再被指定为另一租户的主管理员**，直接拒绝。',
            '账号被移出租户后即失去唯一租户身份；如仍持平台角色，只能进平台后台。',
          ],
        },
        {
          type: 'callout',
          text: '单租户是本期硬约束，不是配置项；评审中如出现「一人管多企业」的诉求，按后置需求记录。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §1.1.2 规则 1 / §1.2.6 / §2.1',
      operation: '账号与租户关系',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '全局规则说明',
      unmatchedReason: '约束横跨登录、账号、租户三处，无唯一锚点。',
    },
    {
      id: 'sys-force-password',
      title: '强制改密（must_change_password）',
      code: 'SYS-05',
      blocks: [
        { type: 'heading', text: '触发（仅这 3 类）' },
        {
          type: 'list',
          ordered: true,
          items: [
            '管理员新建账号（平台账号、租户成员、开户主管理员均适用）',
            '租户开户建主管理员',
            '管理员重置密码（超管重置 / 租户管理员重置均适用）',
          ],
        },
        { type: 'heading', text: '例外' },
        {
          type: 'paragraph',
          text: '已有账号**直接绑定加入本租户**（如 A 企业调至 B 企业）沿用本人旧密码，**不触发**强制改密。',
        },
        { type: 'heading', text: '拦截不可绕过' },
        {
          type: 'list',
          items: [
            '`must_change_password = true` 时，**除改密页外任何路由不可达**，地址栏直达会被弹回。',
            '改密页**无关闭按钮、不可取消**，不属于业务布局（无侧栏 / 顶栏）。',
            '改密中途关闭浏览器或退出登录，改密结果不落库，**下次登录继续拦截**。',
          ],
        },
        { type: 'heading', text: '校验与结果' },
        {
          type: 'list',
          items: [
            '新密码不得与原密码相同；≥ 8 位，且含大写 / 小写 / 数字 / 特殊字符中的**三类**；两次输入一致。',
            '通过 → 置 `false`、旧密码与既有会话立即失效 → 自动进入首页。',
            '不通过 → 停留改密页并提示具体缺失项（长度 / 字符类别 / 不一致）。',
          ],
        },
      ],
      source: '《原型评审标注文档》v1.1 §1.2.5 / §1.1.2 规则 7–12',
      operation: '强制改密',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '对应业务规则',
      unmatchedReason: '改密页为全屏独立路由，与业务页面同层批注口径不同，统一在此说明。',
    },
    {
      id: 'sys-account-forms',
      title: '账号形态与平台账号维护流程',
      code: 'SYS-06',
      blocks: [
        {
          type: 'table',
          columns: ['形态', '判定', '归属', '维护入口', '占租户名额'],
          rows: [
            ['平台账号', '持有 ≥ 1 个平台角色', '平台', '`/system/account`', '否'],
            ['租户成员账号', '不持平台角色，仅有成员关系', '租户', '`/system/member`', '是'],
          ],
        },
        { type: 'heading', text: '平台账号维护流程' },
        {
          type: 'flow',
          caption: '平台账号流程（新建 → 强制改密 → 后续操作）',
          chart: `flowchart TD
  A["平台超管新建账号"] --> B["填姓名 / 手机号 / 登录名 + 选平台角色"]
  B --> C{"校验"}
  C -->|登录名重复| C1["拒绝 E01"]
  C -->|手机号重复| C2["拒绝 E02"]
  C -->|登录名为 11 位纯数字| C3["拒绝 E03"]
  C -->|未选角色| C4["拒绝 E04"]
  C -->|角色超过 5 个| C5["拒绝 E05"]
  C -->|通过| D["生成初始密码<br/>随机 8 位 或 自定义 8-20 位"]
  D --> E["账号置启用 + must_change_password = 1"]
  E --> F["一次性展示明文密码<br/>关闭后不可再查"]
  F --> G["完成强制改密后正常使用"]
  G --> H{"后续操作"}
  H -->|编辑| H1["姓名 / 手机号 / 邮箱可改<br/>登录名不可改"]
  H -->|调整角色| H2["至少保留 1 个<br/>不可移除最后一个超管 E09"]
  H -->|重置密码| H3["随机或自定义<br/>must_change_password = 1 / 旧密码立即失效"]
  H -->|停用| H4["立即踢下线<br/>租户身份同步失效"]
  H -->|启用| H5["须持有至少 1 个角色 E12"]
  H -->|注销| H6["物理删除<br/>同步回收角色关联"]`,
        },
        {
          type: 'paragraph',
          text: '登录名、手机号**全平台唯一**，两种形态共用一套唯一性校验；登录名不得为 11 位纯数字（与手机号登录冲突）。',
        },
        {
          type: 'callout',
          text: '建号必须带角色（至少 1 个平台角色），平台角色最多 5 个；0 角色账号不允许启用，避免空菜单。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §1.2.1 / §1.2.4',
      operation: '账号形态',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'medium',
      category: '字段说明',
      unmatchedReason: '同一账号表在平台账号与成员管理两处投影，无唯一锚点。',
    },
    {
      id: 'sys-account-state',
      title: '账号状态机与保护约束',
      code: 'SYS-07',
      blocks: [
        {
          type: 'flow',
          caption: '账号状态机',
          chart: `stateDiagram-v2
  state "启用" as S1
  state "停用" as S2
  state "注销" as S3
  [*] --> S1: 新建（must_change_password = 1）
  S1 --> S2: 停用（踢下线）
  S2 --> S1: 启用（须有角色）
  S1 --> S3: 注销
  S2 --> S3: 注销
  S3 --> [*]`,
        },
        {
          type: 'table',
          columns: ['状态', '能否登录', '数据', '约束'],
          rows: [
            ['启用', '是', '保留', '不可停用自己；不可停用 / 注销最后一个启用超管'],
            ['停用', '否', '全部保留', '恢复后不自动恢复此前单独停用的成员'],
            ['注销', '否', '账号记录删除，业务数据保留（责任人可追溯）', '同「最后一个超管」保护'],
          ],
        },
        { type: 'heading', text: '防自锁保护' },
        {
          type: 'list',
          items: [
            '不可对自己执行停用 / 注销。',
            '不可停用 / 注销最后一个启用状态的超管。',
            '不可移除最后一个超管的超管角色。',
            '不可重置自己的密码（走他人重置或恢复流程）。',
          ],
        },
        {
          type: 'paragraph',
          text: '停用**立即踢下线**，租户身份同步失效；账号停用属账号级闸门，先于成员级生效。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §1.2.3 / §1.2.4 E06–E10',
      operation: '账号状态',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'medium',
      category: '业务状态说明',
      unmatchedReason: '状态机同时约束平台账号与租户成员，跨页面。',
    },
    {
      id: 'sys-password-policy',
      title: '密码生成与复杂度口径',
      code: 'SYS-08',
      blocks: [
        {
          type: 'table',
          columns: ['场景', '生成规则', '强制改密'],
          rows: [
            ['新建平台账号（随机）', '8 位，含大写 / 小写 / 数字各至少 1 位', '是'],
            ['新建平台账号（自定义）', '8–20 位，须同时含字母与数字', '是'],
            ['重置密码（随机）', '12 位，含大写 / 小写 / 数字 / 特殊字符', '是'],
            ['重置密码（自定义）', '≥ 8 位，含四类字符中的三类', '是'],
            ['租户开户建主管理员', '同「新建平台账号」', '是'],
            ['租户成员新建 / 重置', '同上', '是'],
          ],
        },
        {
          type: 'paragraph',
          text: '明文密码**仅展示一次**，关闭弹窗后不可再查；重置须填原因并写审计；改密成功写「修改密码」操作记录。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §1.2.5 密码生成口径',
      operation: '密码规则',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'medium',
      category: '对应业务规则',
      unmatchedReason: '规则同时适用于平台账号、租户成员与开户流程。',
    },
  ],
}

const CHAPTER_2: SystemAnnotationChapter = {
  id: 'sys-ch-2',
  title: '02 租户',
  summary: '平台怎么开租户、授模块、交主管理员、停删，以及代操作边界',
  annotations: [
    {
      id: 'sys-tenant-create',
      title: '开户流程与主管理员资格',
      code: 'SYS-09',
      blocks: [
        { type: 'heading', text: '流程' },
        {
          type: 'flow',
          caption: '租户开户流程',
          chart: `flowchart TD
  A["平台超管：新建租户"] --> B["填主档：名称 / 类型 / 联系人 / 有效期 / 成员数上限"]
  B --> C["填扩展档案：按类型必填项"]
  C --> D["指定主管理员：从账号下拉选择"]
  D --> E{"主管理员资格校验"}
  E -->|账号不存在 / 非启用| E1["拒绝"]
  E -->|是平台账号| E2["拒绝：平台账号不得兼任"]
  E -->|已绑定其他租户| E3["拒绝：单租户模式，一账号只能绑一个租户"]
  E -->|通过| F["系统生成租户编号 TCxxxxxxxx<br/>租户置启用"]
  F --> G["写入主管理员关系<br/>同步账号侧租户身份"]
  G --> H["自动创建内置角色「租户管理员」<br/>默认勾选租户端全部功能点<br/>数据范围读写均「全部」"]
  H --> I["建主管理员成员记录"]
  I --> J["模块授权默认空<br/>进入详情页配置"]
  J --> K["写审计：新建租户 + 初始化管理员角色"]`,
        },
        { type: 'heading', text: '字段校验' },
        {
          type: 'table',
          columns: ['字段', '必填', '校验'],
          rows: [
            ['租户名称', '是', '≤ 100 字符'],
            ['租户类型', '是', '企业 / 政府单位 / 机构 / 园区；**创建后不可改**'],
            ['统一社会信用代码', '企业必填', '18 位大写字母与数字；全平台唯一'],
            ['联系人 / 手机号', '否', '两者须同时填；手机号 11 位'],
            ['有效期', '否', '结束不得早于开始'],
            ['成员数上限', '是', '1–1000，默认 1000；下调不强制移出，只禁新增'],
          ],
        },
        {
          type: 'callout',
          text: '主管理员只能是「纯租户成员」：平台账号不得兼任，否则会绕过「进入租户」的只读与审计。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §2.1 / §2.1.1',
      operation: '新建租户',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '整体流程',
      unmatchedReason: '开户链路跨租户表单、账号与角色三处，无唯一锚点。',
    },
    {
      id: 'sys-tenant-modules',
      title: '模块授权（开通范围）',
      code: 'SYS-10',
      blocks: [
        {
          type: 'flow',
          caption: '模块授权流程',
          chart: `flowchart TD
  A["租户详情：模块授权"] --> B["树形勾选：一级功能 → 末级功能"]
  B --> C{"是否取消已开通模块"}
  C -->|是| D["二次确认：提示影响人数"]
  C -->|否| E["直接保存"]
  D --> E
  E --> F["写审计：新增 / 取消清单"]
  F --> G["取消后功能点下次请求即失效"]
  G --> H["角色勾选保留，不随授权清除"]`,
        },
        {
          type: 'list',
          items: [
            '授权粒度**只到末级功能**（有路由的页面），不到按钮。',
            '只出现「适用端 = 租户端」的功能；平台侧功能（基础库 / 平台账号 / 菜单）不出现。',
            '开户时为空，由平台按合同配置。',
            '取消已开通模块须**二次确认并提示影响人数**。',
            '取消后功能点**下次请求即失效**；角色勾选保留，重新授权即恢复。',
          ],
        },
        {
          type: 'paragraph',
          text: '授权与角色是**两层过滤**：模块没开通，角色勾了也看不到；模块开通了，角色没勾也看不到（见 SYS-16）。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §2.2',
      operation: '模块授权',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '对应业务规则',
      unmatchedReason: '授权在租户详情页内，属平台侧配置，跨模块生效。',
    },
    {
      id: 'sys-primary-admin',
      title: '主管理员交接',
      code: 'SYS-11',
      blocks: [
        {
          type: 'flow',
          caption: '主管理员交接流程',
          chart: `flowchart TD
  A["发起更换 / 指定主管理员"] --> B["选择接任账号"]
  B --> C{"校验：启用 / 非平台账号 / 未超兼任上限"}
  C -->|不通过| C1["拒绝并说明"]
  C -->|通过| D["选择原主管理员去向"]
  D -->|降级为普通成员| E{"原管理员是否还有其他角色"}
  E -->|否| E1["拒绝：降级后将无任何权限"]
  E -->|是| F["收回「租户管理员」角色"]
  D -->|禁用| G["成员置禁用"]
  D -->|移出租户| H["成员置已移出 + 账号侧身份失效"]
  F --> I["写主管理员关系：原 active 置已卸任"]
  G --> I
  H --> I
  I --> J["新增接任者 active 记录"]
  J --> K["接任者成员记录：无则新建<br/>名额满则拒绝"]
  K --> L["确保租户内存在「租户管理员」角色并分配"]
  L --> M["同步账号侧身份 primary = true"]
  M --> N["刷新会话，原账号立即失权"]`,
        },
        {
          type: 'list',
          items: [
            '每租户**仅 1 个主管理员**，是成员**标记**，不是角色。',
            '主管理员**不可停用 / 移出**，只能更换或指定。',
            '接任者校验：启用、非平台账号、未超兼任上限；名额满则拒绝。',
            '原管理员去向三选一：降级为普通成员 / 禁用 / 移出租户。',
            '降级时**必须保留至少 1 个其他角色**，否则拒绝（否则降级后无任何权限）。',
            '交接完成后刷新会话，**原账号立即失权**。',
          ],
        },
        {
          type: 'callout',
          text: '单租户模式下，「已绑定其他租户」的账号不能被指定为主管理员——这是本期的硬校验，不是提示。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §2.3',
      operation: '更换主管理员',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '对应业务规则',
      unmatchedReason: '交接涉及租户、成员与角色三处联动。',
    },
    {
      id: 'sys-tenant-lifecycle',
      title: '停用 / 启用 / 删除',
      code: 'SYS-12',
      blocks: [
        {
          type: 'flow',
          caption: '租户停用 / 启用 / 删除流程',
          chart: `flowchart TD
  A["停用"] --> A1["全员掉线，数据冻结"]
  A1 --> A2["恢复启用：不自动恢复此前单独停用的成员"]
  B["删除"] --> B1{"当前状态"}
  B1 -->|启用| B2["拒绝：仅停用状态可删"]
  B1 -->|停用| B3["文本提示 + 输入租户全名"]
  B3 --> B4{"全名与实时名称一致?"}
  B4 -->|否| B5["拒绝"]
  B4 -->|是| B6["成员关系置已移出"]
  B6 --> B7["账号侧身份置失效"]
  B7 --> B8["主管理员关系置已卸任"]
  B8 --> B9["物理删除租户 / 授权 / 状态变更记录"]
  B9 --> B10["保留账号与成员记录用于追溯 + 写审计"]`,
        },
        {
          type: 'table',
          columns: ['动作', '可逆', '影响'],
          rows: [
            ['停用', '可逆（启用）', '全员无法登录；业务数据冻结；成员单独停用状态不被重置'],
            ['启用', '—', '恢复登录，不恢复单独停用的成员'],
            ['删除', '**不可逆**', '物理删除，不可恢复；账号与成员记录保留供审计'],
          ],
        },
        { type: 'heading', text: '删除前置（缺一不可）' },
        {
          type: 'list',
          ordered: true,
          items: [
            '租户必须处于**停用**状态（启用态直接拒绝）',
            '文本提示 + 输入**租户全名**，与实时名称一致才可提交',
            '成员关系置已移出、账号侧身份置失效、主管理员关系置已卸任',
            '物理删除租户 / 授权 / 状态变更记录',
            '保留账号与成员记录用于追溯，并写审计',
          ],
        },
      ],
      source: '《原型评审标注文档》v1.1 §2.4',
      operation: '停用 / 启用 / 删除租户',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '业务状态说明',
      unmatchedReason: '三类动作共享同一状态约束，跨页面。',
    },
    {
      id: 'sys-enter-tenant',
      title: '进入租户（平台超管代操作）',
      code: 'SYS-13',
      blocks: [
        {
          type: 'list',
          items: [
            '**仅平台超管**可进入，**原因必填**。',
            '进入后顶部常驻横幅，业务数据**只读**，写操作全禁。',
            '进出均写审计，且**同步写租户侧**，客户可查。',
            '定位为排障 / 代配置，不能替代租户管理员的日常操作。',
          ],
        },
        {
          type: 'callout',
          text: '「进入租户」与「切换租户」是两件事：前者是超管只读代查（留痕），后者本期不做（单租户）。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §2.5',
      operation: '进入租户',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'medium',
      category: '操作功能',
      unmatchedReason: '进入后全局横幅生效，作用于所有租户端页面。',
    },
    {
      id: 'sys-tenant-self-service',
      title: '租户端自助能力边界',
      code: 'SYS-14',
      blocks: [
        {
          type: 'table',
          columns: ['功能', '路由', '能力边界'],
          rows: [
            ['租户信息', '`/system/unit-info`', '法定资质只读；业务属性可编辑，保存立即生效'],
            ['组织架构', '`/system/org`', '本租户组织树；层级上限 5 层；有成员 / 有下级不可删'],
            ['成员管理', '`/system/member`', '新建 / 关联已有账号 / 编辑 / 停用启用 / 移出 / 重置密码 / 查看有效权限'],
            ['角色管理', '`/system/tenant-role`', '本租户角色自建自管；功能授权 + 数据范围；与平台角色完全隔离'],
          ],
        },
        {
          type: 'paragraph',
          text: '扩展档案字段分三档：`platform`（仅平台可维护）/ `both`（平台与租户均可）/ `tenant`（租户补录）。租户端只开放 `tenant` 与部分 `both` 字段，**法定资质类只读**。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §2.6 / §2.1.2',
      operation: '租户端系统管理',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'medium',
      category: '全局规则说明',
      unmatchedReason: '四项能力分处不同页面，边界需统一说明。',
    },
  ],
}

const CHAPTER_3: SystemAnnotationChapter = {
  id: 'sys-ch-3',
  title: '03 角色与权限',
  summary: '谁能看到什么功能、能看到谁的数据，两层过滤怎么算',
  annotations: [
    {
      id: 'sys-role-isolation',
      title: '平台角色与租户角色完全隔离',
      code: 'SYS-15',
      blocks: [
        {
          type: 'list',
          items: [
            '**不跨端授予、不跨租户复用**；角色标识在归属范围内唯一。',
            '平台侧只维护平台角色（超管 / 运营 + 自定义），授予平台人员。',
            '租户侧只内置「租户管理员」，其余岗位角色（核算员、只读等）由租户管理员自建。',
            '自定义角色每个归属范围上限 **999 个**；有成员引用时**不可删除**。',
          ],
        },
        {
          type: 'callout',
          text: '平台账号不得兼任租户主管理员；租户角色也不出现在「平台角色管理」里——两侧列表互不展示。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §3.1',
      operation: '角色管理',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '全局规则说明',
      unmatchedReason: '隔离规则同时约束平台角色与租户角色两个功能。',
    },
    {
      id: 'sys-effective-permission',
      title: '有效功能 = 已开通模块 ∩ 角色勾选功能点',
      code: 'SYS-16',
      blocks: [
        { type: 'heading', text: '计算公式' },
        {
          type: 'paragraph',
          text: '**有效功能 = 已开通模块 ∩ 角色勾选功能点**。两层任一不满足，功能不可见。',
        },
        { type: 'heading', text: '矩阵口径' },
        {
          type: 'list',
          items: [
            '租户端 16 个功能点（M101 工作台 … M138 角色管理），内置「租户管理员」默认全勾、数据范围全部。',
            '平台端按「超级管理员 / 平台运营人员」两列：运营人员看不到平台账号、平台角色管理、菜单管理。',
            '超级管理员**必须**持有租户管理 / 平台账号 / 平台角色管理 / 菜单管理 / 数据字典，这些功能不允许去掉。',
            '**系统管理整组仅超管可勾**。',
          ],
        },
        {
          type: 'callout',
          text: '原型中平台角色菜单默认全部勾选（便于演示），因此矩阵是「可勾选范围」上限；实际生效以角色里的勾选结果为准。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §3.2 / §3.3',
      operation: '功能权限',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '对应业务规则',
      unmatchedReason: '矩阵覆盖全部租户端与平台端功能，无唯一页面锚点。',
    },
    {
      id: 'sys-func-vs-data',
      title: '功能权限 vs 数据权限',
      code: 'SYS-17',
      blocks: [
        {
          type: 'paragraph',
          text: '**功能权限决定「能不能看到这个功能」，数据权限决定「能看到谁的数据」**，两者分别配置、同时生效。',
        },
        {
          type: 'list',
          items: [
            '功能权限：来自「已开通模块 ∩ 角色勾选」，无权限时菜单不出现（一级分组自动隐藏）。',
            '数据权限：按角色在功能点上的读写两档范围生效。',
            '系统管理类功能（组织 / 成员 / 角色）**不适用**数据范围。',
          ],
        },
      ],
      source: '《原型评审标注文档》v1.1 §3.2 说明 / §3.4.2 规则 8',
      operation: '权限模型',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'medium',
      category: '全局规则说明',
      unmatchedReason: '权限模型说明，跨全部功能。',
    },
    {
      id: 'sys-data-scope',
      title: '数据范围五档与 8 条规则',
      code: 'SYS-18',
      blocks: [
        { type: 'heading', text: '五档范围（宽 → 窄）' },
        {
          type: 'table',
          columns: ['档位', '含义', '排序'],
          rows: [
            ['全部', '本租户内全部数据', '4'],
            ['本部门及下级', '本部门 + 全部下级部门', '3'],
            ['本部门', '仅本部门', '2'],
            ['指定部门', '指定 1..N 个部门', '1'],
            ['仅本人', '责任人为本人', '0'],
          ],
        },
        { type: 'heading', text: '规则' },
        {
          type: 'list',
          ordered: true,
          items: [
            '读写**各配一档**，**写范围不得宽于读范围**。',
            '多角色命中同一功能点时，**取最宽一档**。',
            '「仅本人」按**责任人**判定，不按创建人。',
            '成员无部门时按「仅本人」。',
            '范围条件**拼在查询语句**，禁止前端过滤。',
            '业务表必备三字段：租户、部门、责任人；**租户标识由服务端注入**，不接收前端传值。',
            '部门标识存创建时快照；指定部门存 ID 列表，部门删除后自动移除。',
            '系统管理类功能（组织 / 成员 / 角色）不适用数据范围。',
          ],
        },
      ],
      source: '《原型评审标注文档》v1.1 §3.4',
      operation: '数据范围',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '对应业务规则',
      unmatchedReason: '数据范围在所有列表类功能生效，无唯一锚点。',
    },
  ],
}

const CHAPTER_4: SystemAnnotationChapter = {
  id: 'sys-ch-4',
  title: '04 三条业务链',
  summary: '核算、报告、基础数据配置怎么串，什么条件下才能往下走',
  annotations: [
    {
      id: 'sys-pcf-main-chain',
      title: '核算主链：四步与状态机',
      code: 'SYS-19',
      blocks: [
        {
          type: 'flow',
          caption: '核算主链流程（四步 + 回退）',
          chart: `flowchart TD
  A["工作台 /dashboard"] --> B["核算列表 /pcf/project"]
  B --> C{"新建方式"}
  C -->|空白| D1["步骤① 自行录入或引用产品"]
  C -->|按产品| D2["带出产品信息"]
  C -->|按模型| D3["带出目标与范围 + 复制产品建模"]
  D1 --> E["步骤① 目标与范围"]
  D2 --> E
  D3 --> E
  E -->|下一步 保存落库| F["待处理<br/>生成编号 PCF-YYYYMMDD-NNN"]
  F --> G["步骤② 产品建模"]
  G -->|下一步 实时保存| H["待检测"]
  H --> I["步骤③ 一键检测"]
  I -->|阻断项 = 0| J["待核算"]
  I -->|存在阻断项| K["回退待处理<br/>停留步骤③"]
  K --> G
  J --> L["步骤④ 开始核算"]
  L --> M{"核算结果"}
  M -->|成功| N["已完成"]
  M -->|失败| O["核算失败<br/>可重试"]
  O --> L
  N --> P["查看结果 / 下载清册 / 重新计算"]
  P --> Q["步骤② 改数据并保存"]
  Q --> R["弹「数据变更」提示"]
  R --> H`,
        },
        { type: 'heading', text: '项目状态机' },
        {
          type: 'flow',
          caption: '核算项目状态机',
          chart: `stateDiagram-v2
  state "新建草稿" as A
  state "待处理" as B
  state "待检测" as C
  state "待核算" as D
  state "已完成" as E
  [*] --> A: 新建
  A --> B: 步骤① 下一步（落库 + 编号）
  B --> C: 步骤② 下一步
  C --> D: 一键检测通过
  C --> B: 检测不通过
  D --> E: 开始核算（无手动确认）
  E --> E: 重新计算（版本递增）
  E --> C: 步骤② 改数据并保存
  B --> [*]: 删除
  C --> [*]: 删除
  D --> [*]: 删除
  E --> [*]: 删除`,
        },
        {
          type: 'table',
          columns: ['步骤', '路由', '核心内容', '关键校验'],
          rows: [
            [
              '① 目标与范围',
              '`/pcf/project/:id/1`',
              '项目名称 / 组织 / 核算起止 / 核算标准 / 产品信息 / 声明单位 / 系统边界 / 阶段配置',
              '必填完整；阶段至少纳入 1 个；产品图片必填',
            ],
            [
              '② 产品建模',
              '`/pcf/project/:id/2`',
              '阶段树 + 过程节点；数据项；因子匹配（带口径快照）；数据凭证；CSV 导入导出',
              '已填名称的数据项必须填数量',
            ],
            [
              '③ 数据检测',
              '`/pcf/project/:id/3`',
              '一键检测 → 问题清单（阻断 / 提示）→ 定位修改入口 → 预览模型',
              '阻断项清零方可进入核算',
            ],
            [
              '④ 核算与结果',
              '`/pcf/project/:id/4`',
              '状态卡、结果总览、GWP 四口径、阶段汇总、数据项下钻、下载清册',
              '仅检测通过后可核算',
            ],
          ],
        },
        { type: 'heading', text: '状态与编号' },
        {
          type: 'paragraph',
          text: '状态只有 **新建 / 待处理 / 待检测 / 待核算 / 已完成**；编号 `PCF-YYYYMMDD-NNN`，步骤① 点「下一步」落库时才生成。',
        },
        { type: 'heading', text: '步骤约束' },
        {
          type: 'list',
          items: [
            '**不跳步**，超出当前进度的节点锁定。',
            '已完成项目：步骤① 只读；步骤② 可编辑，改数据保存 → 弹「数据变更」→ **回退待检测**。',
            '回退**不清空**原检测结论与核算结果，可主动重检 / 重算。',
            '任意状态可删，二次确认、**不可恢复**，不设作废 / 归档；复制生成副本置待处理。',
          ],
        },
      ],
      source: '《原型评审标注文档》v1.1 §4.1',
      operation: '碳足迹核算',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '整体流程',
      unmatchedReason: '四步跨四个页面，状态机贯穿全链路，无唯一锚点。',
    },
    {
      id: 'sys-pcf-detection',
      title: '数据检测规则（步骤③）',
      code: 'SYS-20',
      blocks: [
        {
          type: 'table',
          columns: ['码', '级别', '触发条件'],
          rows: [
            ['B1', '阻断', '数据项数量为空'],
            ['B2', '阻断', '投入项未匹配排放因子'],
            ['B4', '阻断', '数据项单位与因子分母单位**跨单位类型**不可换算'],
            ['B5', '阻断', '步骤① 已纳入的一级阶段下没有任何数据项'],
            ['W2', '提示', '因子含生物碳分量，但未纳入生命末期 / 处置 / 回收阶段'],
          ],
        },
        {
          type: 'list',
          items: [
            '同类型不同量级**不阻断**，由引擎按基准中转换算。',
            '已下线：B3 分配比例、W1 质量平衡。',
            '界面只展示「人话问题 + 修改入口」，**不展示 E01–E16 编号**。',
            '**阻断项 = 0** 才能进入核算；存在阻断项时回退待处理并停留步骤③。',
          ],
        },
      ],
      source: '《原型评审标注文档》v1.1 §4.1.4',
      operation: '一键检测',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '对应业务规则',
      unmatchedReason: '检测规则作用于整个建模结果，不锚定单个元素。',
    },
    {
      id: 'sys-pcf-calculation',
      title: '计算口径（步骤④）',
      code: 'SYS-21',
      blocks: [
        {
          type: 'table',
          columns: ['层级', '公式'],
          rows: [
            ['行', '行碳排 = 数量 × 排放因子'],
            ['阶段', '阶段碳排 = SUM(该阶段下各行碳排)'],
            ['结果', '核算结果 = SUM(各阶段碳排)'],
          ],
        },
        {
          type: 'list',
          items: [
            '**数量口径**：每 1 个声明单位下的用量，**可为负**（扣减 / 流出）。',
            '**单位一致性**：数量单位必须与因子分母单位同类型，否则不可计算。',
            '**四指标**：总量 / 化石 / 生物源 / 直接土地利用变化；因子只有总指标时仅出总量。',
            '**单位换算**：走计量单位库「基准中转」；复合单位拆分子（碳排放量）+ 分母（活动量）。',
          ],
        },
        {
          type: 'callout',
          text: '因子 / 单位 / 阶段变更**不追溯历史结果**，重算需用户主动触发。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §4.1.5',
      operation: '开始核算',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '对应业务规则',
      unmatchedReason: '计算口径是引擎级规则，页面上无单一归属元素。',
    },
    {
      id: 'sys-report-chain',
      title: '报告与结果分析链',
      code: 'SYS-22',
      blocks: [
        {
          type: 'flow',
          caption: '报告编制与结果分析链',
          chart: `flowchart TD
  A["核算项目已完成"] --> B["报告编制 /report/prepare"]
  B --> C["选择已核算项目 → 生成"]
  C --> D["编制中草稿<br/>继承产品信息 + 引用企业库"]
  D --> E["步骤① 企业信息补充"]
  E -->|校验通过| F["步骤② 预览"]
  F --> G["生成正式报告"]
  G --> H["已生成：只读"]
  H --> I["查看 / 导出"]
  H --> J["重新生成 → 回到编制中"]
  K["企业信息库记录更新"] --> L["引用它的报告转「待更新」"]
  L --> J
  A --> M["敏感性分析 /report/sensitivity"]
  A --> N["数据质量评价 /report/quality"]
  M --> M1["基准情景 → 变更情景 → 单情景核算 → 对比"]
  N --> N1["定性 → 定量十维打分 → DQR 结果 + 不确定度"]`,
        },
        { type: 'heading', text: '前置与编号' },
        {
          type: 'paragraph',
          text: '只能对**已完成**的核算项目生成报告；报告编号 `PCF-R-YYYYMMDD-NNN`。',
        },
        { type: 'heading', text: '状态' },
        {
          type: 'list',
          items: [
            '报告编制：生成中 / 编制中 / 已生成 / 待更新',
            '敏感性分析、数据质量评价：未完成 / 待更新 / 已完成',
          ],
        },
        { type: 'heading', text: '关键规则' },
        {
          type: 'list',
          items: [
            '封面取值：自动继承 + 企业库引用；**正式报告封面锁定**，需改则重新生成。',
            '正式报告正文由模板装配，**不可编辑**；仅草稿阶段可补说明性内容。',
            '企业信息库记录变更 → 引用该记录的报告**转「待更新」**。',
            '重新生成：覆盖当前报告并同步最新上游数据，生成后回到「编制中」。',
            '敏感性：单情景独立核算；对比按 GWP 四口径可切换。',
            'DQR：十维算术平均；等级阈值 优 [1.0,1.5) / 良 [1.5,2.0) / 中 [2.0,3.0) / 差 [3.0,4.0) / 极差 [4.0,5.0]。',
          ],
        },
      ],
      source: '《原型评审标注文档》v1.1 §4.2',
      operation: '报告编制 / 敏感性 / 数据质量',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '整体流程',
      unmatchedReason: '三条支链分处三个功能，共享上游核算结果口径。',
    },
    {
      id: 'sys-base-data-chain',
      title: '基础数据配置链与发布门禁',
      code: 'SYS-23',
      blocks: [
        {
          type: 'flow',
          caption: '基础数据配置链（平台发布 → 租户引用）',
          chart: `flowchart TD
  subgraph P["平台运营端"]
    A1["行业库 / 产品分类"] --> A2["产品信息库<br/>基本信息 + 工艺工序组合"]
    A3["工艺流程 / 工序"] --> A2
    A4["基础库：物料 / 能源 / 单位 / 生命周期 / 标准"]
    A5["因子库管理<br/>建库 → 草稿版本 → 发布"]
    A6["核算模型<br/>两步向导 → 发布"]
  end
  A2 --> B["发布态数据"]
  A3 --> B
  A4 --> B
  A5 --> B
  A6 --> B
  subgraph T["企业用户端"]
    B --> C1["模型库 / 背景数据库<br/>只读浏览"]
    C1 -->|加入我的模型 / 收藏因子| C2["我的模型 / 我的因子库<br/>复制副本"]
    C1 --> C3["我的产品库 / 我的工艺库<br/>引用平台数据为副本"]
    C2 --> D["核算项目"]
    C3 --> D
  end
  D --> F["引用即复制：源变更不联动"]`,
        },
        {
          type: 'table',
          columns: ['对象', '状态流转', '门禁'],
          rows: [
            ['核算模型', '草稿 → 已发布 → 已停用 → 重新启用', '已发布前台可见；**先停用才能编辑**；仅草稿 / 已停用可删除'],
            ['因子库版本', '草稿 → 生效中 → 历史', '同一库同时仅 1 个生效版本；草稿不影响前台；可回滚历史'],
            ['因子（库内）', '商业库只读；自建库仅草稿版本可增删改', '生效中 / 历史版本只读'],
            ['产品 / 工艺', '上架 / 下架、启用 / 停用', '有引用时不可删除'],
            ['计量单位', '启用 ↔ 禁用；仅已禁用可删', '**基准单位不可禁用 / 删除 / 改类型**，系数恒为 1'],
          ],
        },
        {
          type: 'list',
          items: [
            '平台侧配置、租户侧使用，**基础库不对租户开放维护**，保证全平台口径一致。',
            '已发布对象**先停用再编辑**，避免前台正在引用的对象被就地改写。',
            '因子 / 单位 / 阶段变更**不追溯历史结果**。',
          ],
        },
      ],
      source: '《原型评审标注文档》v1.1 §4.3.1 / §4.3.2',
      operation: '基础库与模型发布',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'medium',
      category: '业务状态说明',
      unmatchedReason: '门禁覆盖模型、因子、产品、单位多个后台功能。',
    },
    {
      id: 'sys-copy-on-reference',
      title: '引用即复制（快照）口径',
      code: 'SYS-24',
      blocks: [
        {
          type: 'table',
          columns: ['引用动作', '复制内容', '源变更是否联动'],
          rows: [
            ['我的产品库 ← 平台产品', '基本信息 + 工艺工序组合 + 场景应用', '否'],
            ['我的工艺库 ← 后台工艺', '工艺路线 + 工序链', '否'],
            ['我的模型 ← 平台模型', '基本信息 + 产品建模', '否'],
            ['我的因子库 ← 背景因子', '因子值 + 口径快照（含 / 不含生物碳）', '可「从源因子刷新」手动同步'],
            ['核算项目 ← 我的模型', '目标与范围 + 产品建模', '否'],
            ['报告 ← 企业信息库', '企业字段', '**是（唯一例外）**：库记录更新 → 报告转「待更新」'],
          ],
        },
        {
          type: 'callout',
          text: '四个关键约束：① 平台配置、租户使用；② 引用即复制、不做版本联动；③ 已发布先停用再编辑；④ 变更不追溯历史结果。',
        },
      ],
      source: '《原型评审标注文档》v1.1 §4.3.3 / §4.3.4',
      operation: '引用 / 复制',
      matchStatus: 'unmatched',
      matchType: 'none',
      global: true,
      priority: 'high',
      category: '全局规则说明',
      unmatchedReason: '快照关系横跨产品库、工艺库、模型、因子与报告。',
    },
  ],
}

/** 系统级批注，按章节组织（章节内按阅读顺序） */
export const SYSTEM_ANNOTATION_CHAPTERS: SystemAnnotationChapter[] = [
  CHAPTER_0,
  CHAPTER_1,
  CHAPTER_2,
  CHAPTER_3,
  CHAPTER_4,
]

/** 系统级批注平铺列表（用于计数 / 统一渲染） */
export const systemAnnotations: Annotation[] = SYSTEM_ANNOTATION_CHAPTERS.flatMap(
  (chapter) => chapter.annotations,
)
