import type { IconName } from '@/shared/components'
import { HIDE_MEMBER_MANAGEMENT, MEMBER_MANAGEMENT_ROUTE } from '@/featureFlags'

/**
 * 功能所属端（评审口径：原型里每个功能都必须能回答「属于哪个端」）。
 * - enterprise：企业用户端（前台），企业 / 组织成员的日常核算与自建管理；
 * - platform：平台运营端（后台 + 平台支撑），平台运营人员的基础库 / 模型管理 / 租户账号等运维；
 * - tenant：租户管理端，租户管理员对本租户组织与成员的自助管理。
 */
export type MenuPlatform = 'enterprise' | 'platform' | 'tenant'

export interface MenuNode {
  key: string
  label: string
  icon?: IconName
  /** 功能所属端：顶栏一级分组、侧栏分组与末级功能均显式标注 */
  platform?: MenuPlatform
  /** 功能说明：一句话讲清这个功能做什么，供设计评审使用 */
  desc?: string
  /** 点击在新页签打开（沉浸式大屏类入口），不占用当前业务页签 */
  openInNewTab?: boolean
  children?: MenuNode[]
}

/**
 * 菜单结构对齐《整体设计方案》§8 页面清单 + §2 功能架构。
 * 2026-09-29 整理：产品库 / 工艺流程管理 / 平台支撑归并到「系统管理」下（系统管理为一级分组）。
 * 2026-10-09 整理：前台业务归入「产品碳足迹」一级分组，下设 产品碳足迹 / 产品库 / 工艺库 / 因子管理 四个二级分组，并补齐各级图标。
 * 2026-10-12 整理：
 * - 「工作台」从一级入口迁移到「产品碳足迹」下（顶栏只保留 产品碳足迹 / 系统管理 两个一级分组）；
 * - 产品碳足迹新增二级分组「报告管理」（企业信息维护 / 报告编制 / 敏感性分析 / 数据质量评价，暂占位）；
 * - 核算流程去掉「报告」环节（核算结果为最后一个节点），报告能力改由「报告管理」承载；
 * - 系统管理 · 核算配置去掉「分配规则管理」。
 * 2026-10-13 整理：前后台各新增一级「模型管理」——
 * 前台（模型库 / 我的模型）承载模型浏览 · 收藏 · 自定义，后台（核算模型）承载配置与发布。
 * 2026-10-21 整理：平台支撑「用户与角色」升级为「角色管理」（对齐用户体系 PRD §5.3 / §5.7），
 * 新增「菜单管理」（统一的功能 / 菜单数据源，角色权限从此清单勾选，不再区分平台 / 租户端）。
 * 2026-10-23 整理：平台侧「角色管理」改名「平台角色管理」并**只展示平台角色**（去掉租户切片 Tab）；
 * 平台角色只授予平台人员，租户角色由租户自建自管、只在租户内生效，两切片完全隔离、不混用。
 * 2026-10-22 整理：原「组织架构」占位升级为「组织管理」分组，按组织类型下挂企业组织 / 机关单位 / 园区 / 机构，
 * 各类型页进入后可维护该组织的组织架构树（用户体系 PRD §5.6）；与「租户管理」为两个独立功能。
 * 2026-10-22 整理：前台（租户端）新增二级分组「系统管理」，下设「成员管理」——
 * 租户管理员维护本租户成员全生命周期（成员管理业务 PRD V0.1；与平台侧「系统管理」分组是两个体系）。
 * 2026-10-22 整理（全景评审）：每个节点显式标注 platform（端归属），末级功能补 desc（功能说明）——
 * 侧栏 / 顶栏共用本数据源，功能对应哪个端一处维护、处处一致。
 * 2026-10-22 整理（租户端档案）：租户端「系统管理」新增「租户信息」——
 * 租户自助维护本单位业务档案（业务属性类字段），法定资质类字段只读，如需修改请联系平台（租户管理业务 PRD V0.10 §1.3 / §4.14）。
 * 2026-10-23 整理（菜单归口）：**菜单树不按端拆**——
 * - 删除「产品碳足迹」下原二级分组「系统管理」，租户端 4 项（租户信息 / 组织架构 / 成员管理 / 角色管理）
 *   统一收口到一级「系统管理」下，与平台侧功能同处一棵菜单树；
 * - 原「平台支撑」改名「组织与权限」（该分组对租户管理员可见，不能再叫「平台支撑」）；
 * - 端的差异只由「节点 platform 标注（适用端）+ 角色功能勾选」表达：租户成员只看到被授权的节点，
 *   无权时整个「系统管理」一级分组自动隐藏（filterMenuNodes 丢弃空分组）。
 * 2026-10-23 整理（核算配置下线）：删除「核算配置」分组及其下「计算公式」「公式管理」两个功能
 * （核算引擎改由内置代码层级按默认口径求值，不再由后台配置驱动）；
 * 原「核算配置 · 因子库管理」移至「模型管理」分组下（与「核算模型」同组）。
 * 2026-11-04 整理（企业数据入集）：
 * - 前台一级分组「行业数据集」改名「数据管理」，新增「企业数据上报」（一键上报 → 审核通过入库）；
 * - 后台「系统管理」新增二级分组「数据集管理」，下设「数据审核」「公共数据库」。
 * 2026-11-04 修正（功能定位）：
 * - 前台「行业数据集管理」调整为「行业数据集」：只读查看后台已发布版本的数据集，不含补录 / 作废 / 上报入口；
 * - 「企业数据上报」是已核算碳数据一键上报的唯一入口。
 */
const allMenuConfig: MenuNode[] = [
  {
    key: 'group-frontend',
    label: '产品碳足迹',
    icon: 'layers',
    platform: 'enterprise',
    children: [
      {
        key: '/dashboard',
        label: '工作台',
        icon: 'dashboard',
        platform: 'enterprise',
        desc: '核算进度与碳排放总览一览：待计算 / 已计算统计、最近一次核算结果与阶段构成、待办入口',
      },
      {
        key: '/pcf/project',
        label: '碳足迹核算',
        icon: 'calculator',
        platform: 'enterprise',
        desc: '产品碳足迹核算主流程：目标与范围 → 产品建模 → 核算 → 结果，一行一条核算记录',
      },
      {
        key: 'group-report',
        label: '报告管理',
        icon: 'file',
        platform: 'enterprise',
        children: [
          {
            key: '/report/enterprise',
            label: '企业信息维护',
            platform: 'enterprise',
            desc: '维护报告引用的企业档案（名称 / 地址 / 联系人等），供报告编制直接引用',
          },
          {
            key: '/report/prepare',
            label: '报告编制',
            platform: 'enterprise',
            desc: '编制产品碳足迹报告：报告信息、封面与概况信息维护、预览与导出',
          },
          {
            key: '/report/sensitivity',
            label: '敏感性分析',
            platform: 'enterprise',
            desc: '基准情景与变更情景对比，识别对核算结果影响最大的排放源与参数',
          },
          {
            key: '/report/quality',
            label: '数据质量评价',
            platform: 'enterprise',
            desc: 'DQR 数据质量评价：定性 → 定量 → 结果三段式，输出各数据项质量等级',
          },
        ],
      },
      {
        key: 'group-my-product',
        label: '产品库',
        icon: 'package',
        platform: 'enterprise',
        children: [
          {
            key: '/pcf/my-product',
            label: '我的产品库',
            icon: 'package',
            platform: 'enterprise',
            desc: '组织级产品档案：引用平台产品为可编辑副本，或自行新增',
          },
        ],
      },
      {
        key: 'group-my-process',
        label: '工艺库',
        icon: 'factory',
        platform: 'enterprise',
        children: [
          {
            key: '/pcf/my-process',
            label: '我的工艺库',
            icon: 'factory',
            platform: 'enterprise',
            desc: '组织级工艺库：引用后台工艺为可编辑副本，或自行新增工艺路线',
          },
          {
            key: '/pcf/my-operation',
            label: '我的工序库',
            icon: 'layers',
            platform: 'enterprise',
            desc: '组织级工序库：自定义工序，或从平台工序库复制可编辑副本；维护投入项 / 产出项，支持增删改查',
          },
        ],
      },
      {
        key: 'group-factor',
        label: '因子管理',
        icon: 'database',
        platform: 'enterprise',
        children: [
          {
            key: '/pcf/factor-libraries',
            label: '背景数据库',
            icon: 'database',
            platform: 'enterprise',
            desc: '浏览平台已发布的背景排放因子数据库，只读预览 + 收藏',
          },
          {
            key: '/pcf/my-factor',
            label: '我的因子库',
            icon: 'bookmark',
            platform: 'enterprise',
            desc: '私有排放因子库：手工新增，或收藏背景库因子的只读副本',
          },
        ],
      },
      {
        key: 'group-model-mgmt',
        label: '模型管理',
        icon: 'sliders',
        platform: 'enterprise',
        children: [
          {
            key: '/pcf/model-libraries',
            label: '模型库',
            icon: 'layers',
            platform: 'enterprise',
            desc: '平台已发布的核算模型库，只读预览并可加入我的模型',
          },
          {
            key: '/pcf/my-model',
            label: '我的模型',
            icon: 'bookmark',
            platform: 'enterprise',
            desc: '组织级核算模型：自行新增（可编辑）或收藏平台模型副本（只读）',
          },
        ],
      },
      {
        key: '/pcf/carbon-detection',
        label: '含碳量检测库',
        icon: 'database',
        platform: 'enterprise',
        desc: '含碳量检测数据统一管理：新增、编辑、删除、导出与上/下架，支撑实测含碳率引用与实验室报告佐证',
      },
      {
        key: 'group-file',
        label: '文件管理',
        icon: 'file',
        platform: 'enterprise',
        children: [
          {
            key: '/file/library',
            label: '文件库',
            icon: 'file',
            platform: 'enterprise',
            desc: '企业级文件库：单据与文档统一上传、版本管理与在线预览，供业务模块以引用方式选择文件（引用锁版本，删除有护栏）',
          },
        ],
      },
      {
        key: 'group-ledger',
        label: '台账管理',
        icon: 'database',
        platform: 'enterprise',
        children: [
          {
            key: '/ledger/energy',
            label: '加工能耗台账',
            icon: 'database',
            platform: 'enterprise',
            desc: '加工过程能源消耗台账登记：支持录入与 Excel 导入，按台账期间 / 车间工序 / 能源类型 / 消耗量 / 单位 / 数据凭证管理',
          },
          {
            key: '/ledger/transport',
            label: '运输台账管理',
            icon: 'database',
            platform: 'enterprise',
            desc: '原料 / 成品 / 调拨运输活动台账登记：支持录入与 Excel 导入，记录运输日期 / 类型 / 方式 / 距离 / 载重 / 装载率 / 能耗 / 物流单号',
          },
        ],
      },
      {
        key: 'group-dataset',
        label: '数据管理',
        icon: 'database',
        platform: 'enterprise',
        children: [
          {
            key: '/dataset/records',
            label: '行业数据集',
            icon: 'database',
            platform: 'enterprise',
            desc: '只读查看平台当前已发布的行业数据集（企业侧不展示版本号）：数据 / 统计分析双 Tab 切换；统计分析支持行业 / 地域 / 产品类别 / 系统边界四类条件选择，按所选条件重算并对比均值 / 中位数 / 离散度 / 分布特征；本页不产生数据，上报入口在「企业数据上报」',
          },
          {
            key: '/dataset/report',
            label: '企业数据上报',
            icon: 'file',
            platform: 'enterprise',
            desc: '把已核算完成的数据一键上报平台：自动隐藏活动数据（耗电量 / 物料用量），只提取各阶段与总碳排放量、行业分类、工艺类型等结果信息，企业补充区域与数据质量说明后提交审核；重算后可重新上报，通过后更新原入库记录',
          },
        ],
      },
      {
        key: 'group-knowledge-center',
        label: '知识中心',
        icon: 'book',
        platform: 'enterprise',
        desc: '业务人员只读查阅入口：标准规范 / 木竹碳专题 / 典型案例均由平台运营统一维护发布，企业端不维护企业侧内容。',
        children: [
          {
            key: '/knowledge/bamboo-carbon',
            label: '木竹碳专题知识',
            icon: 'bookmark',
            platform: 'enterprise',
            desc: '竹木碳固存 / 碳循环 / 生物质碳排放图文知识：只读查阅平台已发布的文章列表与富文本详情，企业端不维护企业侧内容。',
          },
          {
            key: '/knowledge/standard',
            label: '标准规范',
            icon: 'file',
            platform: 'enterprise',
            desc: '业务人员只读查阅平台维护的核算依据标准字典（与后台「系统管理 → 碳核算知识库 → 标准规范库」同源）：按分类 / 状态筛选、查看详情、来源链接与附件在线预览；无新增 / 编辑 / 删除入口。',
          },
          {
            key: '/knowledge/case',
            label: '典型案例',
            icon: 'bookmark',
            platform: 'enterprise',
            desc: '业务人员只读查阅行业减排 / 核算 / 优化典型案例（与后台「系统管理 → 碳核算知识库 → 典型案例库」同源，仅已发布）：内容由平台统一维护发布、全员可见；支持类型筛选、详情查看、附件预览与外部链接跳转。',
          },
        ],
      },
    ],
  },
  {
    key: 'group-backend',
    label: '系统管理',
    icon: 'settings',
    platform: 'platform',
    children: [
      {
        key: 'group-product-library',
        label: '产品库',
        icon: 'layers',
        platform: 'platform',
        children: [
          {
            key: '/basic/category',
            label: '产品品类管理',
            platform: 'platform',
            desc: '平台标准产品品类树维护，供产品信息库归类与前台检索；支持按品类导出 Excel',
          },
          {
            key: '/basic/product',
            label: '产品信息库',
            platform: 'platform',
            desc: '平台标准产品库：行业通用产品档案，供前台引用复制',
          },
        ],
      },
      {
        key: 'group-process',
        label: '工艺流程管理',
        icon: 'settings',
        platform: 'platform',
        children: [
          {
            key: '/basic/process',
            label: '工艺流程',
            platform: 'platform',
            desc: '平台标准工艺路线库，定义「阶段 - 工序 - 消耗」的层级结构',
          },
          {
            key: '/basic/operation',
            label: '工序',
            platform: 'platform',
            desc: '工艺下的工序定义：投入 / 产出与资源消耗配置',
          },
        ],
      },
      {
        key: 'group-basic-library',
        label: '基础库',
        icon: 'database',
        platform: 'platform',
        children: [
          {
            key: '/basic/material',
            label: '物料库',
            platform: 'platform',
            desc: '物料主数据：品类、计量单位与含碳折算参数',
          },
          {
            key: '/basic/energy',
            label: '能源库',
            platform: 'platform',
            desc: '能源主数据：能源种类、计量单位与热值 / 排放参数',
          },
          {
            key: '/basic/unit',
            label: '计量单位库',
            platform: 'platform',
            desc: '计量单位与换算关系维护，统一全库单位口径',
          },
          {
            key: '/basic/lifecycle',
            label: '生命周期阶段',
            platform: 'platform',
            desc: '生命周期阶段定义与阶段边界（摇篮到大门 / 摇篮到坟墓等）',
          },
          {
            key: '/basic/industry',
            label: '行业库',
            platform: 'platform',
            desc: '行业分类维护与行业级默认配置',
          },
        ],
      },
      {
        key: 'group-knowledge',
        label: '碳核算知识库',
        icon: 'bookmark',
        platform: 'platform',
        desc: '碳核算相关标准、规范与参考资料的知识归集：三类内容仅由平台运营统一维护发布，企业端只读，支撑核算口径一致性。',
        children: [
          {
            key: '/basic/standard',
            label: '标准规范库',
            icon: 'file',
            platform: 'platform',
            desc: '核算依据的字典：一个标准号 = 一条记录；由平台运营维护，可随时编辑、删除。标准状态为录入框（现行 / 被替代 / 作废），仅「现行」可被核算模型引用。',
          },
          {
            key: '/basic/bamboo-carbon',
            label: '木竹碳专题库',
            icon: 'bookmark',
            platform: 'platform',
            desc: '竹木碳固存 / 碳循环 / 生物质碳排放图文知识库。由平台运营统一维护发布（全员可见），企业不维护企业侧内容；保存即发布，草稿不在业务端展示。',
          },
          {
            key: '/case/library',
            label: '典型案例库',
            icon: 'bookmark',
            platform: 'platform',
            desc: '行业减排 / 核算 / 优化案例的结构化沉淀：由平台运营统一维护发布、全员可见，企业端只读查阅已发布案例',
          },
        ],
      },
      {
        key: 'group-baseline',
        label: '产品碳基线库',
        icon: 'database',
        platform: 'platform',
        children: [
          {
            key: '/baseline/industry',
            label: '行业基线录入',
            platform: 'platform',
            desc: '产品碳基线库：按行业 / 产品分类 / 系统边界 / 基准年维护碳足迹基线（系统预置 + 组织自建），供报告对标引用；系统内置与组织自建同键互斥',
          },
          {
            key: '/baseline/label',
            label: '产品碳标签模板',
            platform: 'platform',
            desc: '产品碳基线库：可视化配置产品碳标签 H5 模板（模块开关 / 主色调 / 二维码规则），实时预览手机端效果；支持新建与编辑',
          },
        ],
      },
      {
        key: 'group-dataset-admin',
        label: '数据集管理',
        icon: 'database',
        platform: 'platform',
        desc: '企业上报数据的审核与入库：只读核对后通过入库或驳回退回企业 + 公共数据库实时入库与版本发布。',
        children: [
          {
            key: '/dataset/audit',
            label: '数据审核',
            icon: 'database',
            platform: 'platform',
            desc: '企业上报数据审核：只读核对上报内容，不做自动异常判定与标准化编辑；通过后按上报原值脱敏入库，驳回则退回企业修改后重报',
          },
          {
            key: '/dataset/public',
            label: '公共数据库',
            icon: 'layers',
            platform: 'platform',
            desc: '一页看清公共数据库：当前最新发布版本与待发版新增数据，全量数据实时列表（数据编号 / 行业类别 / 产品 / 碳足迹数值 / 所属版本），一键发布新版本把待发版数据定格为全局快照',
          },
        ],
      },
      {
        key: 'group-model-admin',
        label: '模型管理',
        icon: 'calculator',
        platform: 'platform',
        children: [
          {
            key: '/model/library',
            label: '产品模型',
            icon: 'layers',
            platform: 'platform',
            desc: '后台产品模型：两步向导建模、只读详情与发布（发布后前台模型库可见）',
          },
          {
            key: '/model/factor-lib',
            label: '因子库管理',
            icon: 'database',
            platform: 'platform',
            desc: '多因子库管理：库级版本、发布与因子维护',
          },
        ],
      },
      {
        key: 'group-config',
        label: '系统参数配置',
        icon: 'sliders',
        platform: 'platform',
        children: [
          {
            key: '/config/calc-rule',
            label: '核算规则',
            platform: 'platform',
            desc: '按标准号维护取舍准则、可忽略排放项、分配方法与说明；仅记录标准口径，不参与核算求值',
          },
          {
            key: '/config/factor-default',
            label: '默认因子',
            platform: 'platform',
            desc: '按行业 / 阶段 / 类型 / 排放数据 / 区域 / 年度配置平台级默认因子；支持启用停用与批量启停',
          },
          {
            key: '/config/report-template',
            label: '报告模板',
            platform: 'platform',
            desc: '模板由研发线下整理并内置，取值字段与系统装配只读；系统预置只读，可复制后仅修改固定文字',
          },
          {
            key: '/config/storage',
            label: '存储配置',
            platform: 'platform',
            desc: '附件存储方式与上传策略；本期为验收演示的模拟实现（不真实对接对象存储）',
          },
          {
            key: '/config/message',
            label: '消息配置',
            platform: 'platform',
            desc: '仅站内信配置与消息模板配置；站内信在顶栏铃铛查看并可标记已读',
          },
        ],
      },
      {
        key: 'group-system',
        label: '组织与权限',
        icon: 'user',
        platform: 'platform',
        children: [
          /* ---------- 平台运营端：租户管理与平台自身账号权限 ---------- */
          {
            key: '/system/tenant',
            label: '租户管理',
            platform: 'platform',
            desc: '租户开户 / 编辑 / 停启用 / 模块授权 / 主管理员交接',
          },
          {
            key: '/system/account',
            label: '账号管理',
            platform: 'platform',
            desc: '全系统账号唯一列表：平台角色与租户成员身份分列展示；账号级停用启用 / 重置密码 / 注销统一在此处理',
          },
          {
            key: '/system/role',
            label: '平台角色管理',
            icon: 'user',
            platform: 'platform',
            desc: '只维护平台角色：新增 / 修改 / 菜单授权 / 详情含成员页签；租户角色由租户自建自管，不在此展示',
          },
          {
            key: '/system/menu',
            label: '菜单管理',
            icon: 'settings',
            platform: 'platform',
            desc: '统一功能 / 菜单数据源：新增 / 编辑 / 启停 / 删除，角色权限从此清单勾选',
          },
          {
            key: '/system/dict',
            label: '数据字典',
            platform: 'platform',
            desc: '字典类型与字典项维护（如系统边界），统一各页面下拉口径',
          },
          /* ---------- 租户端：本租户自助管理（同一棵菜单树，按角色功能权限决定是否可见） ---------- */
          {
            key: '/system/unit-info',
            label: '租户信息',
            icon: 'settings',
            platform: 'tenant',
            desc: '维护本单位租户信息：法定资质信息只读（如需修改请联系平台），日常联络展示信息与业务属性信息可自助编辑，保存后立即生效',
          },
          {
            key: '/system/org',
            label: '组织架构',
            icon: 'layers',
            platform: 'tenant',
            desc: '维护本租户组织树与组织类型（企业 / 机关单位 / 园区 / 机构）',
          },
          {
            key: '/system/member',
            label: '成员管理',
            icon: 'user',
            platform: 'tenant',
            desc: '本租户成员全生命周期：新建 / 停用启用（禁用 · 保留数据与日志）/ 重置密码 / 查看有效权限',
          },
          {
            key: '/system/tenant-role',
            label: '角色管理',
            icon: 'sliders',
            platform: 'tenant',
            desc: '本租户角色自建自管：功能菜单授权 + 数据范围（读写各一档）；只在本租户生效，与平台角色完全隔离',
          },
        ],
      },
    ],
  },
  {
    key: '/screen/platform',
    label: '数据驾驶舱',
    icon: 'chart',
    platform: 'platform',
    openInNewTab: true,
    desc: '新页签直接全屏打开数据大屏（无业务侧栏 / 顶栏）：进入后按「平台驾驶舱 / 企业驾驶舱」切换视角——平台视角一屏统计运行数据与分布趋势，企业视角看本企业核算成果。',
  },
]

/**
 * 临时隐藏指定功能的菜单节点：侧栏 / 顶栏 / 面包屑均由 menuConfig 派生，
 * 在这里过滤一次即可处处生效；原始定义仍保留在 allMenuConfig，便于随时恢复。
 */
function hideMenuRoutes(nodes: MenuNode[], hiddenRoutes: string[]): MenuNode[] {
  return nodes
    .filter((node) => !hiddenRoutes.includes(node.key))
    .map((node) =>
      node.children ? { ...node, children: hideMenuRoutes(node.children, hiddenRoutes) } : node,
    )
    .filter((node) => !node.children || node.children.length > 0)
}

export const menuConfig: MenuNode[] = HIDE_MEMBER_MANAGEMENT
  ? hideMenuRoutes(allMenuConfig, [MEMBER_MANAGEMENT_ROUTE])
  : allMenuConfig

/** 找到某节点下第一个叶子路由（用于顶栏一级导航跳转） */
export function findFirstLeaf(node: MenuNode): string | undefined {
  if (!node.children || node.children.length === 0) {
    return node.key.startsWith('/') ? node.key : undefined
  }
  for (const child of node.children) {
    const leaf = findFirstLeaf(child)
    if (leaf) return leaf
  }
  return undefined
}

/** 节点（含子孙）是否覆盖指定路径；叶子按其子路由前缀命中 */
export function isNodeActive(node: MenuNode, path: string): boolean {
  if (!node.children || node.children.length === 0) {
    return node.key.startsWith('/') && (path === node.key || path.startsWith(`${node.key}/`))
  }
  return node.children.some((child) => isNodeActive(child, path))
}

/** 找到包含指定路径的所有祖先节点 key（用于自动展开侧栏）；未命中返回 undefined */
export function findAncestorKeys(nodes: MenuNode[], path: string): string[] | undefined {
  for (const node of nodes) {
    if (!isNodeActive(node, path)) continue
    // 叶子节点：祖先链中不含自身
    if (!node.children || node.children.length === 0) return []
    const rest = findAncestorKeys(node.children, path)
    return rest ? [node.key, ...rest] : [node.key]
  }
  return undefined
}

/** 平铺菜单，得到 path → label 映射，用于面包屑 */
export function flattenMenu(nodes: MenuNode[]): MenuNode[] {
  const result: MenuNode[] = []
  const walk = (list: MenuNode[]) => {
    list.forEach((node) => {
      if (node.key.startsWith('/')) result.push(node)
      if (node.children) walk(node.children)
    })
  }
  walk(nodes)
  return result
}

/** 根据路径生成面包屑 */
export function buildBreadcrumb(path: string): string[] {
  const walk = (nodes: MenuNode[], trail: string[]): string[] | undefined => {
    for (const node of nodes) {
      const nextTrail = node.key.startsWith('/') ? [...trail, node.label] : trail
      if (node.key === path) return nextTrail
      if (node.children) {
        const found = walk(node.children, nextTrail)
        if (found) return found
      }
    }
    return undefined
  }
  return walk(menuConfig, []) ?? ['工作台']
}
