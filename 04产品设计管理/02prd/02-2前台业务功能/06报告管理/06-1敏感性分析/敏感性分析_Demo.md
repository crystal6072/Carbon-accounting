# 敏感性分析_Demo（报告管理）

> **文档定位**：敏感性分析前端原型的输入文档，聚焦页面结构、控件类型、交互行为与 Mock 规格。
> **字段定义**：枚举、必填性、字段级约束见《敏感性分析字段清单》，本文件只写页面呈现规则，**不重复定义**。
> **业务规则**：状态机、动作矩阵、重算口径见《敏感性分析业务PRD》§4（R-067 ~ R-082）、§6。
> **UI 框架**：**tdesign-react**（腾讯 TDesign React 版），见 §一「技术接入方案」。
> **版本**：V0.3 | 2026-10-14
> **落地位置**：原型 `/report/sensitivity`（列表）、`/report/sensitivity/:id`（详情）、详情页内抽屉（填写情景数据）；已从 `App.tsx` `PLACEHOLDERS` 移除 `report/sensitivity` 并注册真实路由。
>
> **已落地代码**（2026-10-14）：
>
> | 文件 | 职责 |
> | :--- | :--- |
> | `src/pages/report/SensitivityListPage.tsx` | 列表页 |
> | `src/pages/report/SensitivityDetailPage.tsx` | 详情页 |
> | `src/pages/report/ScenarioDataDrawer.tsx` | 填写情景数据抽屉 |
> | `src/pages/report/sensitivityMeta.ts` | 文案 / 格式化工具 |
> | `src/pages/report/SensitivityPage.css` | 布局微调（引用 tdesign 令牌） |
> | `src/types/sensitivity.ts` | 类型定义 |
> | `src/mock/sensitivity.ts` | Mock 服务（含重算引擎） |

> **【V0.2 布局调整声明 · 2026-10-14，全文优先】**：本版**脱离竞品布局**，按 B 端工作流重构交互，V0.1 口径（左表格 + 右摘要面板、情景卡片堆叠、居中弹窗）**作废**：
> - **列表页**去掉「右侧摘要面板 + 行选中联动」，改为**标准列表页**（筛选表单 + 表格 + 分页），删除走行内 `Popconfirm`；
> - **详情页**把「基准卡 + 情景卡堆叠」改为「**基准卡 + 情景表格（一行一情景）+ 情景对比表**」——情景是**同质对象**，用表格天然支持横向对比与批量浏览，卡片堆叠只适合个位数情景；
> - **情景描述改为行内编辑**（表格列内 `Textarea`，失焦保存），不再整卡保存；
> - **填写情景数据**由「居中弹窗」改为**右侧 `Drawer` 抽屉**（宽 960px），给数据列表让出横向空间；阶段一级用 `Tabs`、二级用 `RadioGroup`，数据项定位用 `Tree`；
> - 控件全部改用 tdesign 组件（`Table` / `Drawer` / `Tree` / `InputNumber` / `Descriptions` / `Statistic` 等），不再使用 `pcf-*` 私有样式类承载本模块。
>
> **【V0.3 实现对齐声明】**：与 V0.2 的两处实现差异——① 「+ 新增敏感性分析情景」入口由「表格末行通栏」调整为「变更情景 `Card` 右上角动作区」（待更新态改为人话提示）；② 「导出对比」**原型以 CSV 落地**（Excel 后置，见 §7.1）。

---

## 一、技术接入方案（tdesign-react）

### 1.1 依赖引入

原型此前**未引入任何 UI 组件库**（`package.json` 仅 react / react-dom / react-router-dom）。本模块为 tdesign 的**首个落地模块**，已于 2026-10-14 完成接入：

```bash
npm i tdesign-react@^1.18.3 tdesign-icons-react
```

| 项 | 内容 |
| :--- | :--- |
| `tdesign-react` | React 组件库（Stable 1.18.x，**兼容 React 18**，与项目 `react@^18.3.1` 匹配；实际安装 1.18.4） |
| `tdesign-icons-react` | 官方图标库（`import { EditIcon } from 'tdesign-icons-react'`） |
| 样式引入 | `main.tsx` 引入 `tdesign-react/es/style/index.css`（一次性全量引入） |
| 全局 reset | `tdesign-react/dist/reset.css`（0.36.0 起不再默认引入；本模块**未引入**，避免影响既有页面盒模型） |

### 1.2 主题与既有设计令牌的关系

| 项 | 方案 |
| :--- | :--- |
| 主色 | 沿用 tdesign 默认令牌；如需与现有 `design-tokens` 主色对齐，后续用 `ConfigProvider` 注入 |
| 既有 `pcf-*` 私有类 | **本模块不复用**；容器统一由 tdesign `Card` / `Descriptions` / `Table` 承载 |
| 混用约束 | tdesign 样式为全量引入的独立命名空间（`t-` 前缀），不与 `pcf-*` 类冲突 |
| 暗色 / 响应式 | 本期不做（跟随现有约定） |

### 1.3 本模块使用的 tdesign 组件清单

| 用途 | 组件 |
| :--- | :--- |
| 容器 | `Card`、`Descriptions` / `Descriptions.DescriptionsItem`、`Divider`、`Space` |
| 表单 | `Form` / `Form.FormItem`、`Input`、`Textarea`、`Select`、`InputNumber`、`RadioGroup` / `Radio` |
| 数据 | `Table`、`Tree`、`Pagination`、`Tag`、`Statistic`、`Progress`、`Empty`、`Tooltip` |
| 导航 / 弹层 | `Tabs` / `Tabs.TabPanel`、`Drawer`、`Dialog`、`Popconfirm`、`Alert` |
| 操作 | `Button`、`Link`（本模块用原生 `<a className="sa-link">` 实现行内文字链） |
| 反馈 | `MessagePlugin`（`success` / `error`） |
| 图标 | 本期未使用（文字按钮承载） |

> **接入踩坑记录（实现时确认）**：
> - `Tabs.TabPanel`、`Form.FormItem`、`Descriptions.DescriptionsItem` 是**静态属性**，不是命名导出（`import { TabPanel } from 'tdesign-react'` 会报 TS2305）；
> - `Descriptions` 的静态子组件名为 `DescriptionsItem`（不是 `Item`）；
> - `Form.FormItem` **无 `required` 属性**，必填星号需自行渲染（本模块用 `.sa-required::before`）；
> - `Table` 空状态用 `empty`（TNode），**无 `emptyText`**；`Empty` 无 `children`，附加说明走 `action`。

---

## 二、页面概述

| 页面 | 路由 / 容器 | 页面目标 | 页面模式 |
| :--- | :--- | :--- | :--- |
| 敏感性分析列表 | `/report/sensitivity` | 定位分析单、查看状态、新增 / 删除分析 | 标准列表页（筛选表单 + 表格 + 分页） |
| 敏感性分析详情 | `/report/sensitivity/:id` | 维护基准与情景、核算情景、对比结论 | 单页（来源信息 + 基准卡 + 情景表格 + 对比表） |
| 新增敏感性分析 | 列表页内弹窗 | 选择「已核算」核算项目创建分析 | `Dialog` |
| 填写情景 N 数据 | 详情页内抽屉 | 改「情景数量」并触发重算 | `Drawer`（宽 960px） |

**主流程**

```text
列表页 ──「新增敏感性分析」──▶ 选已核算项目 ──▶ 详情页（基准自动带出）
                                                   │
                              填基准描述 ──▶ 卡片右上角「+ 新增情景」
                                                   │
                              情景行「编辑情景数据」──▶ 右侧抽屉 ──▶「核算碳足迹」
                                                   │
                              回填情景结果 + 变化率 ──▶ 情景对比表
```

---

## 三、敏感性分析列表页

### 3.1 页面概述

| 项目 | 内容 |
| :--- | :--- |
| 页面名称 | 敏感性分析 |
| 页面路径 | `/report/sensitivity` |
| 面包屑 | `前台业务平台 / 报告管理 / 敏感性分析` |
| 骨架结构 | 页头 → `Card`（筛选表单 → 工具条 → `Table` + `Pagination`） |
| 默认排序 | 分析结果更新时间倒序 |

### 3.2 页头

| 元素 | 规格 |
| :--- | :--- |
| 面包屑 | 文本 `前台业务平台 / 报告管理 / 敏感性分析`（原型用 `.sa-breadcrumb` 渲染，未用 tdesign `Breadcrumb`） |
| 标题 | 敏感性分析 |
| 描述 | 基于已核算项目，评估关键假设、方法和数据选择对碳足迹结果的影响 |
| 页面动作 | `新增敏感性分析`（`Button theme="primary"`，靠右） |

### 3.3 筛选表单

> `Form layout="inline"`，置于卡片顶部；任一条件变更后页码重置为 1。

| 字段 | 控件 | 规格 |
| :--- | :--- | :--- |
| 核算项目 | `Input` | `clearable`，placeholder「请输入」 |
| 产品名称 | `Input` | `clearable`，placeholder「请输入」 |
| 分析状态 | `Select` | `clearable`，options = 未完成 / 待更新 / 已完成，placeholder「请选择」 |
| 操作组 | `Button` ×2 | `重置`（`variant="outline"`）→ `查询`（`theme="primary"`） |

### 3.4 工具条

| 位置 | 内容 |
| :--- | :--- |
| 左侧 | `共 N 条` |
| 右侧 | 提示文案 `默认按分析结果更新时间倒序` |

### 3.5 表格

| 行为 | 规格 |
| :--- | :--- |
| 分页 | 独立 `Pagination`（表格下方），默认 10 条/页 |
| 空状态 | `Empty`，`description="暂无敏感性分析"` + `action` 内附文案「请先在「产品碳足迹核算」中完成核算后创建」 |
| 行点击 | 行内「查看」/ 核算项目名链接进详情 |
| 表头排序 | 不提供 |

**列定义**（`Table columns`）

| colKey | title | 控件 / 内容 | 宽度 |
| :--- | :--- | :--- | :--- |
| `seq` | 序号 | 分页内序号 | 64 |
| `sourceProjectName` | 核算项目 | `<a className="sa-link">`（进详情） | 220 |
| `productName` | 产品名称 | 文本 | 200 |
| `baselineEmission` | 基准碳足迹结果 | `{值} kgCO₂e`，右对齐 | 170 |
| `resultUpdatedAt` | 分析结果更新时间 | `YYYY-MM-DD HH:mm:ss` | 190 |
| `status` | 分析状态 | `Tag`（见配色） | 120 |
| `op` | 操作 | `查看` + `删除`（`Popconfirm`） | 130 |

**状态 Tag 配色**

| 状态 | `theme` | `variant` |
| :--- | :--- | :--- |
| 未完成 | `default` | `light` |
| 待更新 | `warning` | `light` |
| 已完成 | `success` | `light` |

> **删除**：`Popconfirm theme="danger"`，文案「删除分析单将同时移除全部情景，不影响来源核算项目，删除后不可恢复。确认删除？」；确认后弹 `Dialog`（`theme="danger"`）二次确认，确认按钮文案 `确认删除`。

### 3.6 新增敏感性分析

| 项目 | 规格 |
| :--- | :--- |
| 触发 | 页头「新增敏感性分析」 |
| 容器 | `Dialog`（标题「新增敏感性分析」） |
| 表单 | `Form.FormItem label="核算项目"` + `Select`（`filterable`）；options = 仅「已核算」项目，格式 `{核算项目名}（{产品名称} · {系统边界}）` |
| 联动预览 | 选中项目后下方 `Descriptions`（`column={2}`）展示只读摘要：产品名称 / 系统边界 / 声明单位 / 统计时间 / 基准结果（含版本）/ 核算时间 |
| 空态 | 无「已核算」项目时 `Select` 禁用 + `Alert theme="warning"`「暂无可用于敏感性分析的核算项目，请先完成核算」 |
| 按钮 | `取消`（`variant="outline"`）→ `确定`（`theme="primary"`，未选项目时 `disabled`） |
| 确认后 | `MessagePlugin.success('创建成功')` → 跳转 `/report/sensitivity/{id}` |

### 3.7 删除确认弹窗

| 触发操作 | 弹窗标题 | 弹窗内容 | 确认按钮 |
| :--- | :--- | :--- | :--- |
| 删除 | 确认删除 | 删除分析单将同时移除全部情景，不影响来源核算项目，删除后不可恢复。确认删除「{核算项目名} 敏感性分析」？ | **确认删除**（`theme="danger"`） |

---

## 四、敏感性分析详情页

### 4.1 页面概述

| 项目 | 内容 |
| :--- | :--- |
| 页面名称 | `{核算项目名} 敏感性分析` |
| 页面路径 | `/report/sensitivity/:id` |
| 面包屑 | `前台业务平台 / 报告管理 / 敏感性分析 / {分析编号}` |
| 骨架结构 | 页头 → 待更新提示（条件渲染）→ 来源信息 `Card` → 基准情景 `Card` → 变更情景 `Card` → 情景对比 `Card` |

### 4.2 页头

| 元素 | 规格 |
| :--- | :--- |
| 标题 | `{核算项目名} 敏感性分析`；待更新态追加 `Tag theme="warning"`「待更新」 |
| 说明 | 敏感性分析：用于估计与产品碳足迹研究结果相关假设、方法和数据的选择影响的系统方法 |
| 右侧动作 | `返回`（`variant="outline"`）→ `导出对比`（`variant="outline"`，无已核算情景时 `disabled`） |

### 4.3 来源信息条

> `Card` + `Descriptions column={4}`，bordered，只读。

| 字段 | 内容 |
| :--- | :--- |
| 核算项目 | 来源项目名；来源已删除时置灰 + 后缀 `Tag`「来源已删除」 |
| 产品名称 | 来源项目产品名 |
| 影响评价方法 | 如 `IPCC 2021` |
| 评价指标（当前口径） | `Select`（四口径切换）；**仅基准结果含 GWP 分项时**渲染为下拉，否则只读单值 |

> 口径切换联动：基准卡、情景表格、对比表的数值与变化率**全部按所选口径重新呈现**（原始变更集不变）。

### 4.4 基准情景卡

> `Card title="基准情景"`，左右两栏：左侧描述表单，右侧结果。

| 区块 | 控件 / 规格 |
| :--- | :--- |
| 情景描述 | `Textarea`（`autosize={{minRows:2, maxRows:4}}`，`maxlength=500`），placeholder「请输入」；下方计数器 `{n} / 500` |
| 保存 | 失焦自动保存（`updateScenarioDescription(analysisId, null, value)`），保存后重新拉取详情以刷新分析状态 |
| 碳足迹结果 | `Statistic`（`title="碳足迹结果"`，大数字 + `unit="kgCO₂e"`） |
| 结果元信息 | 结果版本 `V{n}` · 核算时间 · 结果单位 |

```text
┌───────────────────────────────────────────────────────────────┐
│ 基准情景                                                       │
│ ┌───────────────────────────────┐  ┌────────────────────────┐ │
│ │ *情景描述                     │  │ 碳足迹结果              │ │
│ │ [___________________________] │  │  0.369 kgCO₂e           │ │
│ │ [___________________________] │  │  V2 · 2026-10-12 16:11  │ │
│ │                      0 / 500  │  └────────────────────────┘ │
│ └───────────────────────────────┘                             │
└───────────────────────────────────────────────────────────────┘
```

### 4.5 情景表格

> `Card title="变更情景"`，**一行一情景**。

**列定义**（`Table columns`）

| colKey | title | 控件 / 内容 | 宽度 |
| :--- | :--- | :--- | :--- |
| `name` | 情景 | `情景 {seq}`（加粗） | 90 |
| `description` | 情景描述 | 单元格内 `Textarea`（`autosize`，`maxlength=500`），失焦保存 | 250 |
| `changedCount` | 变更项数 | 数字 | 100 |
| `emission` | 碳足迹结果 | `kgCO₂e`；未核算 `-` | 130 |
| `deltaRate` | 变化率 | 文字 + `Progress` 强度条（见下）；未核算 `-` | 160 |
| `calcStatus` | 核算状态 | `Tag`：已核算（`success`）/ 未核算（`default`） | 110 |
| `keySensitive` | 关键敏感项 | `★ 关键敏感项`（`Tag theme="danger"` + `Tooltip`）；非关键为 `-` | 130 |
| `op` | 操作 | `编辑情景数据` + `删除`（`Popconfirm`） | 180 |

**变化率单元格**

| 项 | 规格 |
| :--- | :--- |
| 文字 | `+10.2%` / `-3.5%` / `0.0%`；正增长红字（`.sa-delta--up`）、负增长绿字（`.sa-delta--down`）、0 灰字；未核算与基准为 0 时 `-` |
| 强度条 | `Progress theme="line"`，`percentage = \|Δ\| ÷ 本组最大\|Δ\| × 100`（归一化到 0~100，表示相对最大敏感度），`strokeWidth={4}` |

**新增情景入口**

| 项 | 规格 |
| :--- | :--- |
| 形态 | 「变更情景」`Card` 右上角动作区 `Button variant="dashed"`，文案 `+ 新增敏感性分析情景` |
| 点击 | 追加一行（`description` 空、结果 `-`、状态「未核算」），分析状态转「未完成」 |
| 空态 | 表格空态文案「暂无变更情景，点击右上角「+ 新增敏感性分析情景」创建」 |
| 待更新态 | 不渲染新增按钮，动作区改为人话提示「来源数据已更新，请先更新基准」 |

### 4.6 情景对比卡

| 项目 | 规格 |
| :--- | :--- |
| 渲染条件 | 存在 ≥1 个已核算情景 |
| 标题 | `情景对比`，右上角副文案 `按 \|变化率\| 降序` |
| 表格列 | 情景 / 描述摘要（`ellipsis` + `Tooltip` 全文）/ 基准碳足迹 / 情景碳足迹 / 变化率（同 4.5 强度条）/ 关键敏感项 |
| 排序 | 按 \|变化率\| 降序，基准不计入 |
| 关键敏感项 | `keySensitive` 为真的行以 `Tag theme="danger" variant="light"`「★ 关键敏感项」标注 |

### 4.7 待更新提示

| 项目 | 规格 |
| :--- | :--- |
| 容器 | `Alert theme="warning"`，通栏，置于来源信息卡上方 |
| 内容 | `来源核算数据已更新（基准版本 V{n} → V{m}），当前结论可能失效。` |
| 动作 | `operation` 区 `更新基准`（`theme="primary" size="small"`） |
| 二次确认 | `Dialog`：「更新基准将同步最新核算结果并清空全部情景结果，需重新核算。确认更新？」；确认后基准刷新、全部情景结果清空（`-`）、状态回「未完成」、`MessagePlugin.success('基准已更新，请重新核算各情景')` |
| 动作限制 | 待更新态下**不渲染**：新增情景按钮、各情景「编辑情景数据」/「删除」；仅保留「更新基准」与「导出对比」 |

---

## 五、填写情景 N 数据（抽屉）

### 5.1 抽屉概述

| 项目 | 内容 |
| :--- | :--- |
| 容器 | `Drawer`（`visible` + `onClose`），`size="960px"`，`header="填写情景 {seq} 数据"` |
| 结构 | 头部只读信息 → `Tabs`（一级阶段）→ `RadioGroup`（二级阶段）→ 内容区（左 `Tree` + 右 `Table`）→ 底部固定操作栏 |
| 关闭 | 右上 `×` / `取消`，等同「取消」（未保存的草稿丢弃；已保存的变更集保留，情景结果标记待重算、分析状态回「未完成」） |

### 5.2 头部只读信息

| 元素 | 规格 |
| :--- | :--- |
| 布局 | `Space`，`核算项目：{名称}`、`产品名称：{名称}` |

### 5.3 阶段切换

| 层级 | 控件 | 规格 |
| :--- | :--- | :--- |
| 一级阶段 | `Tabs` + `Tabs.TabPanel` | 按基准清单纳入的生命周期阶段渲染（如 `原材料获取` / `生产`），默认选中第一个有数据项的阶段 |
| 二级阶段 | `RadioGroup variant="default-filled"` + `Radio` | 仅当所选一级阶段下**存在多个**二级阶段时渲染（按 `stagePath`），默认「全部」 |
| 联动 | 切换一级 / 二级 → 左 `Tree` 与右侧 `Table` 数据同步过滤 |

### 5.4 左树（数据项定位）

| 项目 | 规格 |
| :--- | :--- |
| 控件 | `Tree`（`activable`，受控 `value={[activeNode]}`） |
| 结构 | `全部`（根）→ 一级阶段 → 二级阶段 → 过程节点（继续追溯链路）→ 数据项 |
| 选中 | `onActive` 选中节点 → 右侧表格切换为该作用域数据项 |
| 搜索 | 树顶部 `Input`（`clearable`），按数据项名称 / 过程节点名称过滤；**树与表格同源过滤**（命中才展示对应分支） |
| 空态 | 当前作用域无数据项时 `Empty`「该作用域暂无数据项」 |

### 5.5 数据列表

| 项目 | 规格 |
| :--- | :--- |
| 标题行 | `产品产出：{产品名称}`；下行 `数据列表：{listName}` + 右侧 `编辑` 按钮（`variant="text"`，切换编辑态） |
| 控件 | `Table`（`rowKey="dataItemId"`），无分页、无选择列 |
| 列定义 | 流名称 / **基准情景数量**（只读）/ **情景数量**（可编辑）/ **差值** / 单位 / 上游过程名称 |

| colKey | title | 控件 / 内容 | 宽度 |
| :--- | :--- | :--- | :--- |
| `name` | 流名称 | 文本 + `title` 提示数据项类型 | 200 |
| `baselineQty` | 基准情景数量 | 只读数字，右对齐 | 130 |
| `scenarioQty` | 情景数量 | `InputNumber`（`decimalPlaces={4}`，可为负）；非编辑态为只读数字 | 150 |
| `delta` | 差值 | `(+184.63)` / `(-0.0216)`；无差异 `-` | 110 |
| `unit` | 单位 | 文本 | 90 |
| `upstreamProcess` | 上游过程名称 | `ellipsis` + `title` | 自适应 |

| 项 | 规格 |
| :--- | :--- |
| 编辑态 | 未点「编辑」时 `scenarioQty` 列为只读数字；点「编辑」后变为 `InputNumber`，`placeholder="继承基准"` |
| 差异标识 | `scenarioQty ≠ baselineQty` 时，该行数量加粗强调色（`.sa-num-changed`），并在「差值」列展示 `(+184.63)` |
| 撤销修改 | 编辑态下清空 `InputNumber` = 视为「继承基准」，该行不进入变更集 |
| 全量展开 | 默认展示当前作用域全部数据项，不做前端分页 |

### 5.6 底部固定操作栏

| 按钮 | 规格 |
| :--- | :--- |
| 取消 | `variant="outline"`，丢弃未保存草稿并关闭 |
| 核算碳足迹 | `theme="primary"`，右侧；点击 → 保存变更集 → 转 `loading` 文案「核算中…」（约 900ms，禁用重复点击）→ 回填情景结果与变化率 → 关闭抽屉 + `MessagePlugin.success('核算完成')` |
| 无变更保护 | 前后数量完全一致时允许执行，结果 = 基准、变化率 `0.0%`，并 `MessagePlugin.success('未修改任何数据，结果与基准一致')` |
| 校验失败 | 情景描述为空时阻断，`MessagePlugin.error('请填写情景描述')`；待更新态阻断「来源核算数据已更新，请先更新基准」 |

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ 填写情景 1 数据                                                             [×]  │
│ 核算项目：240mm 全竹碳化筷 · 摇篮到大门    产品名称：240mm 全竹碳化筷            │
├────────────────────────────────────────────────────────────────────────────────┤
│ [ 原材料获取 ]  生产                                                            │
│ 二级阶段：(原材料获取) (原材料获取-原材料运输)     ← 仅多个二级阶段时渲染         │
├──────────────────────────────┬──────────────────────────────────────────────────┤
│ [搜索数据项____________]     │ 产品产出：240mm 全竹碳化筷                       │
│ ▾ 全部                       │ 数据列表：产品分配系数 1            [ 编辑 ]     │
│   ▾ 原材料获取               │ 流名称 │ 基准情景数量 │ 情景数量 │ 差值 │ 单位 │ 上游过程名称 │
│      竹秆（过程节点）         │ 原竹   │ 1.8460      │ 1.8460  │  -   │ kg  │ 竹林可持续管理 │
│      脲醛树脂（过程节点）     │ 脲醛树脂胶 │ 0.2160   │ 0.2160  │  -   │ kg  │ 脲醛树脂生产   │
├──────────────────────────────┴──────────────────────────────────────────────────┤
│ 当前口径：总量（不含生物源CO₂） · 已变更 0 项      [ 取消 ]      [ 核算碳足迹 ]   │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 六、校验与错误展示

| 检查 | 触发时机 | 失败反馈 |
| :--- | :--- | :--- |
| 基准 / 情景描述必填 | 失焦保存 / 核算 | 核算时 `MessagePlugin.error('请填写情景描述')` |
| 未选核算项目创建 | 弹窗确定 | 「确定」`disabled` + `Form.FormItem` 必填星号 |
| 无已核算项目 | 打开新增弹窗 | `Select` 禁用 + `Alert` 提示 |
| 基准结果为 0 | 情景核算完成 | 变化率 `-`，对比表与情景表均不展示强度条 |
| 分析不存在 | 加载详情 | `MessagePlugin.error('分析不存在或已被删除')` + 页面提示「分析不存在或已被删除」 |
| 待更新态操作 | 新增 / 编辑 / 删除 / 核算 | `MessagePlugin.error('来源核算数据已更新，请先更新基准')`（mock 抛错兜底） |
| 来源已删除 | 更新基准 | 按钮禁用 + `Tooltip`「来源核算项目已删除，无法更新基准」 |

> 校验策略：**重算由服务端（mock）执行**，前端负责字段级校验与渲染；状态不允许的操作由 mock 抛错、前端 `MessagePlugin.error` 兜底。

---

## 七、Mock 数据规格

### 7.1 服务签名

| 服务 | 入参 | 出参 | 说明 |
| :--- | :--- | :--- | :--- |
| `fetchSensitivityAnalyses(query)` | `{ keywordProject, keywordProduct, status }` | `SensitivityAnalysis[]` | 列表 + 查询（按更新时间倒序） |
| `fetchSensitivityDetail(id)` | `analysisId` | `SensitivityAnalysis` | 详情 |
| `fetchCalculatedProjects()` | — | `SensitivityProjectOption[]` | 新增弹窗候选（仅「已核算」） |
| `createSensitivityAnalysis(projectId)` | `projectId` | `SensitivityAnalysis` | 创建（复制基准清单 + 锁定基准版本） |
| `updateScenarioDescription(analysisId, scenarioId \| null, description)` | — | `void` | 保存基准 / 情景描述 |
| `addScenario(analysisId)` | — | `SensitivityScenario` | 新增情景 |
| `deleteScenario(analysisId, scenarioId)` | — | `void` | 删除情景（`seq` 重排） |
| `calcScenario(analysisId, scenarioId, items)` | `items: {dataItemId, scenarioQty}[]` | `SensitivityScenarioResult` | 重算并回填（约 900ms） |
| `updateBaseline(analysisId)` | — | `SensitivityAnalysis` | 同步新核算版本、清空情景结果 |
| `deleteSensitivityAnalysis(id)` | — | `void` | 删除分析 |
| `exportScenarioCompare(id)` | — | Blob | **原型以 CSV 落地**（Excel 后置） |

### 7.2 重算逻辑

| 项 | 规格 |
| :--- | :--- |
| 输入 | 基准清单（含因子快照）+ 情景变更集 |
| 算法 | 复用核算引擎口径：逐数据项 `qty × factorValue` → 全局 `SUM`；变更项取 `scenarioQty`，其余取 `baselineQty`；**单位换算系数按 1 简化**（原型口径） |
| 四口径 | 按 `factorCalibers` 分别求值（有分项按分项、无分项兜底：化石 = 总量、生物源 / 土地利用 = 0） |
| 变化率 | `((emission - baselineEmission) / baselineEmission) * 100`，保留 1 位小数；`baselineEmission = 0` 时置 `null`（展示 `-`） |
| 关键敏感项 | `refreshKeySensitive`：|Δ| 最大的已核算情景置 `keySensitive = true` |
| 数据自洽 | 演示数据的基准清单、基准结果与情景结果**全部由 `recalcScenario` 计算产出**，不手写死值 |

### 7.3 演示数据

| 样本 | 状态 | 说明 |
| :--- | :--- | :--- |
| SA01 | 已完成 | 3 个情景（原竹 -10% / 用胶 -10% / 运输 260→120km）；基准含四口径分项（演示口径切换） |
| SA02 | 未完成 | 2 个情景，其中「生产用电 +20%」未核算（结果 `-`） |
| SA03 | 待更新 | 演示 `Alert` 与「更新基准」 |
| SA04 | 已完成 | 基准结果为 0 的边界样本（演示变化率 `-`） |

| 要求 | 说明 |
| :--- | :--- |
| 数据规模 | 4 条，覆盖 3 种状态 + 基准为 0 边界 + 四口径 / 单一口径各至少 1 条 |
| 数据来源 | 自包含快照（4 个「已核算」项目：全竹碳化筷 / 竹板坯 / 整竹砧板 / 竹纤维餐盒），与核算模块口径一致 |
| 编号格式 | `PCF-SA-YYYYMMDDNNN` |
| 数据要求 | 全部虚构演示数据，不使用真实企业名与联系人 |

---

## 八、未实现留白

| 项 | 归属 |
| :--- | :--- |
| OAT 自动扰动（±10% / ±20% 一键生成情景） | 二阶段（PRD §9 Q2） |
| 更换排放因子 / 影响评价方法（IPCC AR5/AR6 对比） | 二阶段（PRD §9 Q3） |
| 情景结果的阶段 / 数据项汇总 | 二阶段（字段清单 Q03） |
| 蒙特卡洛 / 概率敏感性分析 | 本期不做 |
| 分析单多版本 / 历史结论切换 | 本期不做（单一当前版本） |
| 敏感结论写入报告章节 | 报告编制模块（后续联调） |
| 列表导出 / 批量操作 | P1 后置 |
| 导出对比 Excel（原型为 CSV） | 正式环境后置 |
| tdesign 主题切换（暗色 / 品牌色定制） | 本期不做 |

---

## 九、更新记录

| 日期 | 版本 | 变更内容 | 影响范围 |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | V0.1 | 初版：对齐竞品布局（左表格 + 右摘要 / 情景卡堆叠 / 居中弹窗） | 报告管理 · 敏感性分析 |
| 2026-10-14 | V0.2 | **脱离竞品布局 + tdesign 化**：① 列表页改标准列表页（`Form` 筛选 + `Table` + `Pagination`，删除右侧摘要面板与行选中联动）；② 详情页改「基准 `Card` + 情景表格（一行一情景，描述行内编辑）+ 情景对比表」；③ 变化率列加 `Progress` 强度条（\|Δ\| 归一化）；④ 填写情景数据改右侧 `Drawer`（960px）+ `Tabs`（一级）+ `RadioGroup`（二级）+ `Tree`（含搜索）+ `Table`（`InputNumber` 可编辑）；⑤ 新增 §一「技术接入方案」；⑥ 控件全部替换为 tdesign 组件清单 | 全模块 |
| 2026-10-14 | **V0.3** | **原型落地 + 实现对齐**：① 记录已落地代码文件清单；② 技术接入状态改为「已接入」（实际安装 tdesign-react 1.18.4）；③ 补「接入踩坑记录」（`Tabs.TabPanel` / `Form.FormItem` / `Descriptions.DescriptionsItem` 静态属性、`FormItem` 无 `required`、`Table` 用 `empty` 无 `emptyText`、`Empty` 无 `children`）；④ 「+ 新增敏感性分析情景」入口改为「变更情景 `Card` 右上角动作区」，待更新态改人话提示；⑤ 「导出对比」标注原型以 CSV 落地；⑥ 抽屉补「差值」列与底部状态栏（当前口径 + 已变更项数）；⑦ Mock 服务签名与重算逻辑按实现校准（自洽计算、`refreshKeySensitive`） | 全模块 |
