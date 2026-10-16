import type { Annotation } from './types'

/**
 * 前台「因子管理」功能批注数据（对齐《我的因子库业务 PRD》V0.5 与《我的因子库字段清单》V0.4，编号 P04-01 ~ P04-19）。
 * 本模块含两个前台页面：背景数据库（`/pcf/factor-libraries`，只读预览 + 收藏）与我的因子库（`/pcf/my-factor`，私有库）。
 * - matched：锚定到页面元素（selector = data-ann-target 值），元素旁显示批注标记；
 * - global：文档级说明（业务状态说明 / 填写要点 / 待确认事项 / 演示数据），进入「全局批注」抽屉。
 * 路由作用域：`/pcf/factor-libraries` 与 `/pcf/my-factor`（见 registry.ts）。
 * 与后台「因子库管理」（`/model/factor-lib`，B13-*）对象分离：本批注只覆盖前台私有库，选择器统一以 `pcf-factor.` 前缀，避免与后台 `factor.` 选择器冲突。
 */
export const pcfFactorAnnotations: Annotation[] = [
  /* ==================== 整体流程 + 全局规则（功能标题附近） ==================== */
  {
    id: 'ann-pcf-factor-flow',
    title: '整体流程',
    code: 'P04-01',
    blocks: [
      {
        type: 'paragraph',
        text: '前台「因子管理」= 组织私有因子区：**从后台已发布库收藏（复制副本）+ 手工新增自用因子**，供核算匹配使用（组织自建因子优先）。',
      },
      { type: 'heading', text: '主流程（背景数据库 → 我的因子库）' },
      {
        type: 'steps',
        items: [
          '进入「背景数据库」浏览后台已发布因子库（只读预览）',
          '点库「预览」→ 库详情（商业数据库 ISIC 分类树 / 自建库单节点）→ 点因子名称进入因子详情',
          '详情页五角星「收藏」→ 选目标「我的因子库」（或即时新建）→ 复制为独立副本',
          '进入「我的因子库」→ 库列表 → 库详情查看 / 编辑 / 一键更新副本',
          '需要新因子时「手工新增因子」进入表单页；保存即生效',
        ],
      },
      { type: 'heading', text: '衔接与边界' },
      {
        type: 'list',
        items: [
          '列表 ↔ 库详情 ↔ 因子详情 ↔ 表单均为独立页跳转，不在本页弹窗内完成（收藏弹窗 / 新建我的因子库弹窗除外）。',
          '**收藏 = 复制式快照**：源库后续更新不自动影响副本，仅通过「有新版本可更新」手动一键更新。',
          '**取消收藏**：背景数据库因子详情页再次点击五角星，二次确认后删除副本。',
          '本模块**不发布、不版本化、无审核流、无启用 / 禁用状态**。',
        ],
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §1.1 / §2 S01',
    operation: '整体流程',
    buttonText: '背景数据库 / 我的因子库（功能标题）',
    selector: 'pcf-factor.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.page.global', label: '背景数据库', reason: '前台因子管理入口（全局说明）' },
      { selector: 'pcf-factor.mylib.list', label: '我的因子库', reason: '前台因子管理入口（全局说明）' },
    ],
    global: false,
    priority: 'high',
    category: '整体流程',
  },
  {
    id: 'ann-pcf-factor-global-rules',
    title: '全局规则',
    code: 'P04-02',
    blocks: [
      {
        type: 'list',
        ordered: true,
        items: [
          '**私有边界**：我的因子库与我的因子仅本人 / 本组织可见，**不发布、不参与平台共享**。',
          '**不版本化**：我的因子库与库内因子**不设版本号、无版本状态、无新建版本**，直接修改。',
          '**收藏 = 复制式快照**：收藏生成独立副本（新编码 `MF-{序号}`），源库后续更新**不自动影响**副本。',
          '**更新提醒 + 一键更新**：源库发布新版本且该因子值变化时，副本标记「有新版本可更新」；一键更新手动刷新（单条 / 批量）。',
          '**取消收藏**：背景数据库因子详情页五角星为开关态，可删除副本。',
          '**我的因子库可多个**：支持维护多个私有库；列表无搜索，卡片网格直接展示。',
          '**删库级联**：删除「我的因子库」级联删除库内全部因子。',
          '**删除我的因子无引用阻断**：二次确认后直接删除；已建项目侧快照冻结不受影响（方案 §4.9）。',
          '**导出 / Excel 导入均未实现**（暂缓）。',
        ],
      },
      {
        type: 'callout',
        text: '权限（谁可维护 / 谁仅可查看）原型未做角色限制，见全局批注「待确认事项」。',
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §4.1 / R-001 ~ R-014',
    operation: '全局规则',
    buttonText: '背景数据库 / 我的因子库（功能标题）',
    selector: 'pcf-factor.page.global',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.page.global', label: '背景数据库', reason: '全局说明入口' },
      { selector: 'pcf-factor.mylib.list', label: '我的因子库', reason: '全局说明入口' },
    ],
    global: false,
    priority: 'high',
    category: '全局规则说明',
  },

  /* ==================== 业务状态说明 ==================== */
  {
    id: 'ann-pcf-factor-states',
    title: '业务状态（手工新增 / 收藏副本 / 更新提示）',
    code: 'P04-03',
    blocks: [
      { type: 'heading', text: '① 因子来源（仅我的因子）' },
      {
        type: 'table',
        columns: ['来源', '页面标识', '能否一键更新', '说明'],
        rows: [
          ['手工新增', '来源列显示「手工新增」', '不能', '自己从零填写的因子，没有后台来源，内容完全由自己维护。'],
          ['收藏副本', '来源列显示「来自 X 库 Y 版本」', '能', '从背景数据库复制过来的独立副本。后台源库出新版本且该因子值变化时，会出现更新提示。'],
        ],
      },
      { type: 'heading', text: '② 更新提示（仅收藏副本）' },
      {
        type: 'list',
        items: [
          '触发条件：后台源库发布了新版本，并且该因子的数值发生了变化。',
          '满足条件时，库内因子表和因子详情页会显示「有新版本可更新」；一键更新后提示消失。',
        ],
      },
      { type: 'heading', text: '③ 来源异常状态（仅收藏副本）' },
      {
        type: 'list',
        items: [
          '正常：源库在线且当前版本中存在该因子，可按更新提示同步。',
          '来源库已下架：后台源库被下架，副本保留当前值，但不能再同步。',
          '来源因子已移除：后台源库当前版本中已没有该因子，副本保留当前值。',
        ],
      },
      {
        type: 'callout',
        text: '列表「来源」列同时展示来源标签、源库·版本和状态角标（有新版本可更新 / 来源库已下架 / 来源因子已移除）。',
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §4.3 / §4.4',
    operation: '业务状态',
    buttonText: '来源（列表列）',
    selector: 'pcf-factor.mylib.table',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.mylib.table', label: '来源（库内因子表列）', reason: '状态展示位置' },
      { selector: 'pcf-factor.collect.source', label: '收藏来源', reason: '副本详情展示' },
    ],
    global: false,
    priority: 'high',
    category: '业务状态说明',
  },

  /* ==================== 背景数据库（只读预览 + 收藏入口） ==================== */
  {
    id: 'ann-pcf-factor-backend-list',
    title: '背景数据库列表',
    code: 'P04-04',
    blocks: [
      {
        type: 'paragraph',
        text: '卡片网格展示后台**已发布**的因子库；每张卡片含库名称（可点）、来源标签（商业数据库 / 自建库）、库编码、库描述、维护方 / 因子数 / 版本、预览入口。',
      },
      { type: 'heading', text: '查询区' },
      {
        type: 'list',
        items: [
          '库名称 / 编码（模糊匹配，忽略大小写）；库来源（商业数据库 / 自建库）。',
          '「搜索」按条件过滤（原型为输入即时收敛，按钮 toast「查询完成」）；「重置」清空条件。',
          '**无「状态」筛选**：草稿 / 未发布 / 已下架的库不在此列出（前台只可见已发布库）。',
        ],
      },
      { type: 'heading', 'text': '预览入口' },
      {
        type: 'paragraph',
        text: '点卡片「预览」进入库详情；列表不做收藏、不做批量收藏（收藏只在因子详情页五角星）。',
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S01 / §4.2',
    operation: '背景数据库列表',
    buttonText: '查询区 / 预览',
    selector: 'pcf-factor.backend.query',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.backend.query', label: '查询区', reason: '列表上方查询条' },
      { selector: 'pcf-factor.backend-card.preview', label: '预览', reason: '库卡片操作' },
    ],
    global: false,
    priority: 'medium',
    category: '操作功能',
  },
  {
    id: 'ann-pcf-factor-backend-detail',
    title: '背景数据库详情（只读预览）',
    code: 'P04-05',
    blocks: [
      {
        type: 'paragraph',
        text: '只读预览已发布版本因子：**商业数据库**左侧 ISIC 门类（A~S）→ 类两级分类树 + 右侧因子表；**自建库**无分类树（单节点「全部因子」，因子表占满整行）。',
      },
      { type: 'heading', text: '版本切换' },
      {
        type: 'list',
        items: [
          '版本下拉可切换**历史版本**（history，只读追溯，标注「当前为历史版本，仅供追溯」）；默认展示最新已发布版本。',
          '草稿版本不可在此预览（前台只可见已发布版本）。',
        ],
      },
      { type: 'heading', text: '关键词搜索' },
      {
        type: 'paragraph',
        text: '按过程名称 / 英文 / 编码模糊匹配；底部提示「点击名称进入因子详情，在详情页用五角星收藏到『我的因子库』」。',
      },
      { type: 'heading', text: '因子表列' },
      {
        type: 'list',
        items: [
          '过程 / 因子名称（进详情）、所属分类（仅商业数据库）、英文名称、因子别名、单位类别、地域、因子值·单位（含口径摘要）、操作（查看详情）。',
        ],
      },
      {
        type: 'callout',
        text: '列表不做收藏；收藏入口在因子详情页五角星（见 P04-06 / P04-07）。',
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S01 / §4.2 P1~P6',
    operation: '背景数据库详情',
    buttonText: '库详情 / 分类树 / 版本 / 搜索 / 因子表',
    selector: 'pcf-factor.backend-detail',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.backend-detail', label: '背景数据库详情', reason: '库详情页标题' },
      { selector: 'pcf-factor.backend-detail.tree', label: '分类（ISIC）', reason: '商业数据库左侧分类树' },
      { selector: 'pcf-factor.backend-detail.version', label: '当前版本', reason: '版本下拉' },
      { selector: 'pcf-factor.backend-detail.search', label: '关键词', reason: '搜索框' },
      { selector: 'pcf-factor.backend-detail.table', label: '库内因子', reason: '因子表' },
    ],
    global: false,
    priority: 'medium',
    category: '操作功能',
  },
  {
    id: 'ann-pcf-factor-detail',
    title: '因子详情（只读 + 收藏入口）',
    code: 'P04-06',
    blocks: [
      { type: 'heading', text: '页面结构（三页签 + 收源 + 制单）' },
      {
        type: 'list',
        items: [
          '因子信息：编码 / 名称 / 英文名称 / 别名 / 适用场景 / 因子值 / 复合单位 / 单位类别 / 地域 / 描述 + 指标明细（分指标：化石 / 生物碳 / 土地利用 / 合计）。',
          '数据基本信息：产品名称 / CAS 号 / 所有者 / 所属分类 / 过程描述；时间 / 地理 / 工艺技术 / 完整性说明。',
          '输入输出信息：输入数据（上游过程名称）/ 输出数据（下游过程名称）。',
          '**收藏来源**（仅收藏副本）：来源库 / 源版本 / 源因子编码 / 当前值 + 状态标签。',
          '制单信息（创建人 / 时间、更新人 / 时间）固定置底。',
        ],
      },
      { type: 'heading', text: '收藏入口（五角星）' },
      {
        type: 'paragraph',
        text: '页头「☆ 收藏」打开收藏弹窗；已收藏显示「★ 已收藏」（再次点击可取消收藏，见 P04-08）。**无「来源信息」页签**（来源类别 / 发布年份等不维护）。',
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S02 / §4.6',
    operation: '因子详情 / 收藏',
    buttonText: '因子名称 / 收藏五角星',
    selector: 'pcf-factor.detail',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.detail', label: '因子详情', reason: '详情页标题' },
      { selector: 'pcf-factor.collect.star', label: '收藏 / 已收藏', reason: '页头收藏入口' },
    ],
    global: false,
    priority: 'high',
    category: '操作功能',
  },
  {
    id: 'ann-pcf-factor-collect',
    title: '收藏（复制副本）',
    code: 'P04-07',
    blocks: [
      {
        type: 'paragraph',
        text: '把已发布库中的因子**复制**到「我的因子库」形成独立副本：选目标库（或弹窗内即时新建）→ 复制因子值生成副本。',
      },
      { type: 'heading', text: '快照语义' },
      {
        type: 'list',
        items: [
          '副本记录来源信息（来源库 / 源版本 / 源因子编码）；源库后续更新**不自动影响**副本。',
          '副本编码由系统生成，以 MF-开头（不沿用源编码）；原库编码会另外记录，便于回源比对。',
          '**判重**：同一源因子在同一「我的因子库」内不可重复收藏（失败提示「该因子已收藏，请勿重复收藏」）；收藏到不同库允许。',
        ],
      },
      { type: 'heading', text: '弹窗要素' },
      {
        type: 'list',
        items: [
          '**收藏到**：下拉选择目标「我的因子库」（标签带因子数）；或「新建『我的因子库』」（仅名称，仅本人 / 本组织可见、不发布）。',
          '**收藏所选因子（N）**：N 为本次收藏的因子数（详情页单条收藏为 1）。',
        ],
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S02 / §4.3 C1~C7 / R-003 / R-004',
    operation: '收藏',
    buttonText: '收藏弹窗 / 收藏到 / 新建库',
    selector: 'pcf-factor.collect.modal',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.collect.modal', label: '收藏弹窗', reason: '收藏弹窗标题' },
      { selector: 'pcf-factor.collect.target', label: '收藏到', reason: '目标库选择' },
      { selector: 'pcf-factor.collect.new', label: '新建我的因子库', reason: '弹窗内即时新建' },
      { selector: 'pcf-factor.collect.star', label: '收藏五角星', reason: '页头入口' },
    ],
    global: false,
    priority: 'high',
    category: '操作功能',
  },
  {
    id: 'ann-pcf-factor-uncollect',
    title: '取消收藏（删除副本）',
    code: 'P04-08',
    blocks: [
      {
        type: 'paragraph',
        text: '背景数据库因子详情页五角星为**开关态**：已收藏显示为「★ 已收藏」，再次点击 → 二次确认「确认取消收藏『X』？将删除『我的因子库』中的副本」→ 确认后删除副本。',
      },
      {
        type: 'list',
        items: [
          '**源库因子不受影响**（取消收藏只删本组织副本）。',
          '如在不同库都存在该源因子的副本，取消收藏只删除当前操作对应的副本。',
          '删除后五角星复位为「☆ 收藏」可重新收藏。',
        ],
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S02b / §5 R-012',
    operation: '取消收藏',
    buttonText: '★ 已收藏',
    selector: 'pcf-factor.collect.star',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [{ selector: 'pcf-factor.collect.star', label: '收藏 / 已收藏', reason: '页头收藏开关' }],
    global: false,
    priority: 'high',
    category: '操作功能',
  },

  /* ==================== 我的因子库 ==================== */
  {
    id: 'ann-pcf-factor-mylib-list',
    title: '我的因子库列表',
    code: 'P04-09',
    blocks: [
      {
        type: 'paragraph',
        text: '卡片网格展示本组织全部「我的因子库」：库名称（可点）、库描述、因子数、更新时间；无搜索、无查询区。',
      },
      { type: 'heading', text: '卡片操作' },
      {
        type: 'list',
        items: [
          '查看、重命名、删除。',
          '「删除」二次确认「确认删除『X』？库内因子副本将一并删除」→ 级联删除库内全部因子。',
        ],
      },
      { type: 'heading', text: '新建' },
      {
        type: 'paragraph',
        text: '页头「新建我的因子库」打开弹窗：库名称（必填）、库描述（选填）；保存后为私有库，不发布。',
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S07 / §4.1',
    operation: '我的因子库列表',
    buttonText: '我的因子库 / 新建我的因子库',
    selector: 'pcf-factor.mylib.list',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.mylib.list', label: '我的因子库', reason: '列表页标题' },
      { selector: 'pcf-factor.mylib.add', label: '新建我的因子库', reason: '页头主操作' },
      { selector: 'pcf-factor.mylib.card', label: '卡片操作', reason: '卡片查看 / 重命名 / 删除' },
    ],
    global: false,
    priority: 'medium',
    category: '操作功能',
  },
  {
    id: 'ann-pcf-factor-mylib-crud',
    title: '我的因子库 CRUD（新建 / 重命名 / 删除级联）',
    code: 'P04-10',
    blocks: [
      { type: 'heading', text: '新建 / 重命名' },
      {
        type: 'list',
        items: [
          '库名称必填（弹窗校验），库描述选填。',
          '保存即生效，不发布、不版本化。',
        ],
      },
      { type: 'heading', text: '删除（级联）' },
      {
        type: 'list',
        items: [
          '二次确认后**级联删除**库内全部因子副本，不可恢复。',
          '本模块不做「下架 / 上架」「启用 / 禁用」（私有库直接可用）。',
        ],
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S07 / §5 R-014',
    operation: '我的因子库 CRUD',
    buttonText: '新建 / 重命名 / 删除',
    selector: 'pcf-factor.mylib.add',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.mylib.add', label: '新建我的因子库', reason: '新建入口' },
      { selector: 'pcf-factor.mylib.card', label: '重命名 / 删除', reason: '卡片操作' },
    ],
    global: false,
    priority: 'medium',
    category: '对应业务规则',
  },
  {
    id: 'ann-pcf-factor-mylib-factors',
    title: '我的因子列表（库内因子）',
    code: 'P04-11',
    blocks: [
      {
        type: 'paragraph',
        text: '库详情因子表：因子名称（链接进详情）、英文名称、别名、来源（origin Tag + 源库·版本 + 状态角标）、因子值·单位（含口径摘要）、操作（查看 / 编辑 / 一键更新 / 删除）。',
      },
      { type: 'heading', text: '无查询区' },
      {
        type: 'paragraph',
        text: '库内因子列表无搜索、无查询区，直接展示全部库内因子。来源列集中展示 origin / 来源状态 / 更新提示。',
      },
      { type: 'heading', text: '删除我的因子' },
      {
        type: 'list',
        items: [
          '行操作「删除」二次确认；**无引用阻断**，已建项目侧快照冻结不受影响。',
        ],
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S06 / §6.2',
    operation: '我的因子列表 / 删除',
    buttonText: '库内因子 / 删除',
    selector: 'pcf-factor.mylib.table',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.mylib.table', label: '库内因子', reason: '库详情因子表' },
    ],
    global: false,
    priority: 'medium',
    category: '操作功能',
  },
  {
    id: 'ann-pcf-factor-form',
    title: '手工新增 / 编辑因子（表单三页签）',
    code: 'P04-12',
    blocks: [
      {
        type: 'paragraph',
        text: '从零新建（origin = manual）或编辑我的因子（手工与收藏副本均可编辑），表单与后台因子**同源同字段集**。',
      },
      { type: 'heading', text: 'Tab 结构' },
      {
        type: 'list',
        items: [
          '**因子信息**：因子名称（必填）、英文名称、因子别名、适用场景（必填）、录入方式（总指标 / 分指标）、因子值、因子单位（必填，复合单位 Cascader）、描述。',
          '**数据基本信息**：产品名称 / CAS 号 / 所有者 / 过程描述；系统模型 / 特征化方法 / GWP 版本 / 所有者版本；时间、地理、工艺技术、完整性说明。',
          '**输入输出信息**：输入数据（上游过程名称）、输出数据（下游过程名称），可增删行、标碳类型。',
        ],
      },
      { type: 'heading', text: '保存与取消' },
      {
        type: 'list',
        items: [
          '「保存」校验：名称 / 适用场景 / 复合单位 / 因子值（≠0）/ 口径闭合（容差 1%）/ 描述 ≤500 字符，失败回「因子信息」Tab 标红。',
          '「取消」返回上一页；因子编码系统生成、表单内只读。',
          '**编辑收藏副本保留来源元数据**，仍可一键更新（以源值覆盖指定字段）。',
        ],
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S05 / §4.5 M1~M5 / §5 R-008',
    operation: '手工新增 / 编辑因子',
    buttonText: '手工新增因子 / 表单保存',
    selector: 'pcf-factor.form',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.form', label: '因子表单', reason: '新增 / 编辑因子页面标题' },
      { selector: 'pcf-factor.form.save', label: '保存 / 取消', reason: '表单底部操作' },
      { selector: 'pcf-factor.mylib.add-factor', label: '手工新增因子', reason: '库详情页头入口' },
    ],
    global: false,
    priority: 'medium',
    category: '操作功能',
  },
  {
    id: 'ann-pcf-factor-update',
    title: '一键更新（单条 / 批量）',
    code: 'P04-13',
    blocks: [
      { type: 'heading', text: '触发与覆盖' },
      {
        type: 'list',
        items: [
          '**触发**：后台源库发布新版本，且该因子的数值发生变化。',
          '**覆盖内容**：因子值、单位、名称、别名、扩展信息、输入输出信息，以及来源版本号；适用场景、描述、编码等自定义内容保持副本现值。',
          '**作用范围**：只更新当前这条副本，不影响其他库里的副本；更新后「有新版本可更新」提示消失。',
          '来源库已下架或来源因子已移除时，不提供一键更新，副本保持当前值。',
        ],
      },
      { type: 'heading', text: '操作入口' },
      {
        type: 'list',
        items: [
          '**单条**：库内因子行内「一键更新」或因子详情页头「一键更新」（仅 updateAvailable 时出现）。',
          '**批量**：库详情页头「一键更新（N）」二次确认后刷新全部可更新副本，汇总「成功 N 条，失败 M 条」。',
        ],
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §2 S04 / §4.4 U1~U8 / R-006',
    operation: '一键更新',
    buttonText: '一键更新 / 一键更新（N）',
    selector: 'pcf-factor.mylib.update-all',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.mylib.update-all', label: '一键更新（N）', reason: '库详情页头批量入口' },
      { selector: 'pcf-factor.detail.update', label: '一键更新', reason: '因子详情页头单条入口' },
    ],
    global: false,
    priority: 'high',
    category: '对应业务规则',
  },

  /* ==================== 字段说明 ==================== */
  {
    id: 'ann-pcf-factor-field-code',
    title: '因子编码（MF-{序号}）',
    code: 'P04-15',
    blocks: [
      {
        type: 'paragraph',
        text: '手工新增与收藏副本均由系统生成以 MF-开头的编码（组织内唯一），**不沿用源编码**；原库编码会另外记录，便于回源比对。',
      },
      { type: 'paragraph', text: '编码在所属「我的因子库」内唯一；表单内只读（见 P04-12）。' },
    ],
    source: '《我的因子库字段清单》V0.4 D01 / §6',
    operation: '因子编码',
    buttonText: '因子编码',
    selector: 'pcf-factor.detail',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.detail', label: '因子详情', reason: '因子编码展示行' },
      { selector: 'pcf-factor.form', label: '因子表单', reason: '编码只读展示' },
    ],
    global: false,
    priority: 'medium',
    category: '字段说明',
  },
  {
    id: 'ann-pcf-factor-field-naming',
    title: '因子名称 / 别名 / 英文名称',
    code: 'P04-16',
    blocks: [
      {
        type: 'list',
        items: [
          '**因子名称**：必填、不唯一（识别依据）。',
          '**英文名称**：选填，商业数据库取数据集英文名。',
          '**因子别名**：选填。',
        ],
      },
    ],
    source: '《我的因子库字段清单》V0.4 D02 / §5',
    operation: '名称 / 别名 / 英文名',
    buttonText: '因子名称',
    selector: 'pcf-factor.detail',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.detail', label: '因子详情', reason: '名称 / 别名 / 英文名展示' },
      { selector: 'pcf-factor.form', label: '因子表单', reason: '名称（必填）/ 别名 / 英文名录入' },
    ],
    global: false,
    priority: 'low',
    category: '字段说明',
  },
  {
    id: 'ann-pcf-factor-field-value',
    title: '适用场景 / 录入方式 / GWP 分项 / 因子值',
    code: 'P04-17',
    blocks: [
      { type: 'heading', text: '适用场景' },
      { type: 'paragraph', text: '必填自由文本（取代原「适用对象 / 适用阶段」匹配维度），如「电力消耗 / 燃料燃烧」。' },
      { type: 'heading', text: '录入方式' },
      {
        type: 'list',
        items: [
          '总指标：直接填一个总体值。',
          '分指标：分别填化石、生物碳、土地利用变化，合计**自动计算只读**（≈ 三者之和，容差 1%）。',
        ],
      },
      { type: 'heading', text: '因子值' },
      {
        type: 'paragraph',
        text: '**不能为 0**（分指标合计不能为 0）；生物碳吸收为负由「生物碳」分项表达；口径闭合校验容差 1%。',
      },
    ],
    source: '《我的因子库字段清单》V0.4 D03 ~ D05 / §5.2 ~ §5.3',
    operation: '适用场景 / 录入方式 / 因子值',
    buttonText: '适用场景 / 因子值',
    selector: 'pcf-factor.detail',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.detail', label: '因子详情', reason: '因子信息展示' },
      { selector: 'pcf-factor.form', label: '因子表单', reason: '适用场景（必填）/ 录入方式 / 因子值录入' },
    ],
    global: false,
    priority: 'medium',
    category: '字段说明',
  },
  {
    id: 'ann-pcf-factor-field-unit',
    title: '因子单位（复合单位）',
    code: 'P04-18',
    blocks: [
      {
        type: 'paragraph',
        text: '因子值为**复合单位**：分子是碳排放量单位，分母是活动数据单位，两者均必填；选择器直接选「分子 / 分母」。',
      },
      {
        type: 'list',
        items: [
          '分子与分母必须能换算（经计量单位库基准中转），否则保存失败。',
          '**单位类别 / 地域**：选填，**不在「因子信息」页签直接录入**。收藏副本会随源库复制；手工新增可在「数据基本信息 → 地理信息」中维护地域。',
        ],
      },
    ],
    source: '《我的因子库字段清单》V0.4 D06 ~ D07 / §5.4',
    operation: '因子单位 / 单位类别 / 地域',
    buttonText: '因子单位',
    selector: 'pcf-factor.detail',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.detail', label: '因子详情', reason: '复合单位 / 单位类别 / 地域展示' },
      { selector: 'pcf-factor.form', label: '因子表单', reason: '复合单位录入' },
    ],
    global: false,
    priority: 'medium',
    category: '字段说明',
  },
  {
    id: 'ann-pcf-factor-field-ext',
    title: '描述、数据基本信息、输入输出、来源信息',
    code: 'P04-19',
    blocks: [
      {
        type: 'list',
        items: [
          '**描述**：选填，最长 500 字符。',
          '**数据基本信息**：收藏副本会随源库复制；手工新增可在表单对应页签维护。',
          '**输入输出信息**：同上；包含上游 / 下游过程名称与碳类型（化石 / 生物碳 / 土地利用变化 / 未标注）。',
          '**来源信息**：仅收藏副本必填（来源库 / 源版本 / 源因子编码）；手工新增为空；编辑收藏副本时保留。',
        ],
      },
    ],
    source: '《我的因子库字段清单》V0.4 D08 ~ D11 / §5.6 ~ §5.7',
    operation: '描述、数据基本信息、输入输出、来源信息',
    buttonText: '描述 / 数据基本信息 / 输入输出 / 来源信息',
    selector: 'pcf-factor.detail',
    matchStatus: 'matched',
    matchType: 'exact',
    matchTargets: [
      { selector: 'pcf-factor.detail', label: '因子详情', reason: '数据基本信息 / 输入输出 / 来源展示' },
      { selector: 'pcf-factor.collect.source', label: '收藏来源', reason: '来源元数据展示' },
    ],
    global: false,
    priority: 'low',
    category: '字段说明',
  },
]

/** 全局批注（文档级说明，进入「全局批注」抽屉） */
export const pcfFactorGlobalAnnotations: Annotation[] = [
  {
    id: 'ann-pcf-factor-global-states',
    title: '收藏副本与手工新增的区别',
    code: 'P04-03 附',
    blocks: [
      {
        type: 'paragraph',
        text: '「我的因子库」里的因子有两种来源，页面上的表现和后续维护规则不同：',
      },
      {
        type: 'table',
        columns: ['来源', '页面标识', '能否一键更新', '说明'],
        rows: [
          ['手工新增', '来源列显示「手工新增」', '不能', '自己从零填写的因子，没有后台来源，内容完全由自己维护。'],
          ['收藏副本', '来源列显示「来自 X 库 Y 版本」', '能', '从背景数据库复制过来的独立副本。后台源库出新版本且该因子值变化时，会出现「有新版本可更新」提示，可一键更新。'],
          ['源库已下架', '状态角标「来源库已下架」', '不能', '来源库被后台下架，副本仍保留当前值，但不能再同步。'],
          ['源因子已移除', '状态角标「来源因子已移除」', '不能', '后台源库当前版本已没有该因子，副本保留当前值。'],
        ],
      },
      {
        type: 'callout',
        text: '一键更新只覆盖因子值、名称、别名、单位、扩展信息、输入输出等，不会改适用场景和描述等自定义内容。',
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §4.3 / §4.4',
    category: '业务状态说明',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
  },
  {
    id: 'ann-pcf-factor-global-fields',
    title: '新增 / 编辑因子填写要点',
    code: 'P04-15 ~ P04-19',
    blocks: [
      {
        type: 'paragraph',
        text: '手工新增或编辑我的因子时，表单分三页签：因子信息、数据基本信息、输入输出信息。重点关注以下业务规则：',
      },
      {
        type: 'list',
        items: [
          '因子编码由系统生成（MF-开头），表单内只读，不沿用任何来源编码。',
          '因子名称必填，英文名称 / 别名选填。',
          '适用场景必填，例如「电力消耗」「燃料燃烧」等自由文本。',
          '录入方式：总指标直接填一个总体值；分指标分别填化石、生物碳、土地利用变化，合计自动计算。',
          '因子值不能为 0；复合单位必须是「碳排放量单位 / 活动数据单位」，且两者要能换算。',
          '描述最长 500 字；数据基本信息、输入输出信息按实际业务填写即可。',
        ],
      },
      {
        type: 'callout',
        text: '收藏副本编辑后仍保留来源信息，仍可一键更新；更新时以源库值覆盖部分字段。',
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §4.5 / §5 R-008',
    category: '字段说明',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
  },
  {
    id: 'ann-pcf-factor-global-pending',
    title: '待确认事项（尚未裁决）',
    code: '§8',
    blocks: [
      {
        type: 'list',
        items: [
          '我的因子库能否多个 / 是否有上限？（原型已支持多库，无上限）',
          '我的因子参与核算匹配时，优先级是否与后台组织自建库等同？',
          '是否支持从「我的因子库」反向沉淀到后台自建库（发布化）？',
          '是否支持 Excel 导入 / 导出我的因子？（原型均未实现）',
        ],
      },
      {
        type: 'callout',
        text: '已确认口径：编码 MF-开头、同库同源判重、一键更新覆盖字段、删库级联、更新提醒只比对因子值。',
      },
    ],
    source: '《我的因子库业务 PRD》V0.5 §8',
    category: '待确认事项',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'medium',
  },
  {
    id: 'ann-pcf-factor-global-demo',
    title: '演示数据说明',
    code: 'P04-02 附',
    blocks: [
      {
        type: 'list',
        items: [
          '原型中的库、因子、制单信息（创建人 / 时间）均为前端演示数据，正式系统按真实操作生成。',
          '本批注只覆盖前台「因子管理」（背景数据库 + 我的因子库）。后台因子库管理（版本化 + 发布）见《因子库管理功能批注》B13-*。',
        ],
      },
    ],
    source: '《我的因子库业务 PRD》V0.5',
    category: '演示数据',
    matchStatus: 'unmatched',
    matchType: 'none',
    global: true,
    priority: 'low',
  },
]
