# 计量单位库 · 后台管理模块（Vue3 + TypeScript + Element Plus）

一个可直接运行的后台管理模块，包含**列表页**与**新增/编辑页**，数据使用内存 Mock（接口签名与真实 REST 一致，替换 `src/modules/unit/api.ts` 即可接入后端）。

## 启动

```bash
npm install
npm run dev        # http://localhost:5177
npm run typecheck  # 类型检查
npm run build      # 类型检查 + 构建
```

## 目录结构

```text
src/
├─ modules/unit/
│  ├─ api.ts                        # 模拟接口（查询 / 新增 / 编辑 / 启停 / 删除）
│  ├─ constants.ts                  # 系统内置枚举：单位类型(8类) / 使用状态 / 是否基准单位
│  ├─ mock.ts                       # 模拟数据（覆盖 8 类单位类型，含基准单位与非基准单位）
│  ├─ types.ts                      # 数据模型与查询条件
│  ├─ utils.ts                      # 展示格式化与保护规则
│  ├─ components/UnitDetailDialog.vue  # 查看（只读详情）
│  └─ views/
│     ├─ UnitListView.vue           # 列表页
│     └─ UnitFormView.vue           # 新增 / 编辑页
├─ App.vue                          # 后台布局（侧边菜单 + 面包屑）
└─ router/index.ts                  # /unit/list、/unit/create、/unit/edit/:id
```

## 业务规则落地位置

| 规则 | 说明 | 实现位置 |
| :--- | :--- | :--- |
| D01 | 「单位符号 + 单位类型」唯一；符号不得含空格 | `UnitFormView.vue` → `validateSymbol` |
| D02 | 每个单位类型下有且仅有 1 个基准单位；基准单位不可禁用 / 删除 / 改类型 | `validateIsBase` + `canDelete` / `canToggleStatus` + `api.ts` 保护 |
| D03 | 关联基准单位必须是同类型的基准单位 | `UnitFormView.vue` → `baseUnitOptions` |
| D04 | 换算系数为正数；基准单位恒为 1 | `validateFactor` + `isBaseUnit` 联动禁用 |
| D06 | 「数量」类无基准单位、不可换算 | `isQuantity` → 关联基准单位 / 换算系数置灰 |
| Q04 | 「是否基准单位」新增可选、编辑不可改 | `baseFlagDisabled` |

## 交互要点

- **列表页**：顶部说明 + 四条件搜索（名称 / 符号 / 类型 / 状态）+ 重置 / 搜索；统计条「共 X 条，已选 X 条…」；操作区「新增 / 批量启用 / 批量删除 / 导出」；表格按单位类型分组（合并「单位类型」列单元格，组内基准单位置顶）；行操作「查看 / 编辑 / 禁用 / 启用」。
- **导出**：导出 CSV（已勾选优先，否则导出当前筛选结果），带 BOM 避免 Excel 中文乱码。
- **表单页**：顶部说明 + 右上角取消；字段联动（是否基准单位 → 关联基准单位与换算系数自动置灰；单位类型切换 → 重置换算字段）；底部固定业务提示文案。
