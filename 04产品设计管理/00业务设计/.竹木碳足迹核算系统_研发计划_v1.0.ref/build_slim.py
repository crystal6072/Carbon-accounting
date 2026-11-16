# -*- coding: utf-8 -*-
"""生成《竹木碳足迹核算系统 · 研发计划》精简版：5 个工作表
v2：研发排期改为按《产品碳足迹核算系统_功能清册_v1.0》的口径罗列（32 项一级功能）
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule

OUT = "/Users/crystal/Desktop/work/空天碳/02 核心业务整理/06竹木碳足迹核算系统/竹木原型/04产品设计管理/00业务设计/竹木碳足迹核算系统_研发计划_v1.0.xlsx"


def xl(css):
    v = css.removeprefix("#").upper()
    return "FF" + v


XL_HEADER = xl("#70AD47")
XL_HEADER_TEXT = xl("#FFFFFF")
XL_LIGHT = xl("#E2EFDA")
XL_DARK = xl("#548235")
XL_BORDER = xl("#BFBFBF")
XL_TITLE_TEXT = xl("#1F3B17")
XL_BAR = xl("#A9D08E")
XL_BAR_TEST = xl("#FFE699")
XL_BAR_PHASE = xl("#548235")
XL_RED_BG = xl("#FFC7CE")
XL_RED_TEXT = xl("#9C0006")
XL_YEL_BG = xl("#FFEB9C")
XL_YEL_TEXT = xl("#9C6500")
XL_GRN_BG = xl("#C6EFCE")
XL_GRN_TEXT = xl("#006100")
XL_GRAY_BG = xl("#EDEDED")
XL_GRAY_TEXT = xl("#808080")

thin = Side(style="thin", color=XL_BORDER)
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)

S0 = "01_计划总览"
S1 = "02_阶段里程碑"
S2 = "03_周排期甘特图"
S3 = "04_研发排期"
S4 = "05_风险与需求变更"

FONT_NAME = "PingFang SC"
P1 = "阶段一 地基与权限"
P2 = "阶段二 主数据与因子"
P3 = "阶段三 核算主链路"
P4 = "阶段四 闭环与发版"

DOM_F = "产品碳足迹"
DOM_S = "系统管理"


def font(size=10, bold=False, color=None):
    return Font(name=FONT_NAME, size=size, bold=bold, color=color or "FF1A1A1A")


def header_row(ws, row, ncols, height=30):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = PatternFill("solid", fgColor=XL_HEADER)
        cell.font = font(10, True, XL_HEADER_TEXT)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BOX
    ws.row_dimensions[row].height = height


def body(ws, r1, r2, ncols, wrap=(), center=()):
    for r in range(r1, r2 + 1):
        for c in range(1, ncols + 1):
            cell = ws.cell(row=r, column=c)
            cell.font = font(10)
            cell.border = BOX
            if c in center:
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            elif c in wrap:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)


def widths(ws, d):
    for col, w in d.items():
        ws.column_dimensions[col].width = w


def visual_len(t):
    return sum(2 if ord(ch) > 127 else 1 for ch in t)


def auto_h(ws, r1, r2, wmap, line_h=13.5, pad=5, cap=150):
    for r in range(r1, r2 + 1):
        lines = 1
        for col, w in wmap.items():
            v = ws[f"{col}{r}"].value
            if isinstance(v, str) and not v.startswith("="):
                per = max(int(w), 4)
                lines = max(lines, -(-visual_len(v) // per))
        ws.row_dimensions[r].height = min(cap, max(20, lines * line_h + pad))


def title(ws, text, ncols, row=1, size=15):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=ncols)
    c = ws.cell(row=row, column=1, value=text)
    c.font = font(size, True, XL_TITLE_TEXT)
    c.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[row].height = 28


def section(ws, row, text, ncols):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=ncols)
    c = ws.cell(row=row, column=1, value=text)
    c.font = font(11, True, XL_DARK)
    c.fill = PatternFill("solid", fgColor=XL_LIGHT)
    c.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[row].height = 22


wb = Workbook()

# =====================================================================
# 01_计划总览
# =====================================================================
ws = wb.active
ws.title = S0
ws.sheet_view.showGridLines = False
widths(ws, {"A": 14, "B": 14, "C": 14, "D": 18, "E": 14, "F": 44})
NC = 6
title(ws, "竹木碳足迹核算系统 · 研发计划", NC)
ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=NC)
c = ws.cell(row=2, column=1, value="编制 2026-11-16　｜　8 周交付可对内生产版　｜　前端 2 / 后端 4 / 测试 1　｜　功能清册 32 项 + 新增必做 6 项 + UI 设计 + 交付收口 = 40 行　｜　共 326 人日（超容量 46 人日，须决策补足）")
c.font = font(10, False, XL_DARK)
ws.row_dimensions[2].height = 20

section(ws, 4, "一、计划基本盘", NC)
ws.cell(row=5, column=1, value="项目")
ws.cell(row=5, column=2, value="内容")
ws.merge_cells(start_row=5, start_column=2, end_row=5, end_column=NC)
header_row(ws, 5, NC, 24)
kv = [
    ("交付目标", "把现役高保真原型改造为真实后端的可对内生产版：核算在服务端重算，结果可追溯、可审核、可导出报告；同时补齐数据集上报审核、公共数据库、知识库、碳基线库、碳标签与数据驾驶舱六类能力。"),
    ("计划周期", "2026-11-16 ~ 2027-01-10，共 8 周。功能清册 32 项 + 新增必做 6 项 + UI 设计 + 交付收口，共 40 行全部在这 8 周内交付，不留第二阶段。"),
    ("本期口径", "以《产品碳足迹核算系统_功能清册_v1.0》的 32 项一级功能为基础，逐项列出人日、周次与完成标准；用户追加的 6 项必做能力（行业数据集上报与审核、公共数据库、知识库、产品碳基线库、碳标签、数据驾驶舱）已全部纳入本期；另加 1 行 UI 设计（前端兼任）与 1 项清册外「交付收口」（端到端回归 / 性能验收 / 发版清单），排期表共 40 行。"),
    ("本期必做", "清册 32 项（产品碳足迹域 12 项 + 系统管理域 20 项）全量；新增 6 项（行业数据集上报与审核 / 公共数据库 / 知识库 / 产品碳基线库 / 碳标签 / 数据驾驶舱）+ UI 设计 + 交付收口。共 38 项功能 + 2 项横向任务，逐项完成标准见「04_研发排期」。"),
    ("本期不做", "多级会签审核（本期只做单级，见 CR-03）、离线安装包与现场安装交付、背景因子库商用授权采购。以上三项之外的需求均已纳入本期；新增范围若再扩大，必须走「05_风险与需求变更」的 CR 流程并先定人日来源。"),
    ("交付判定", "熊宝重竹地板 28 条数据端到端跑通且 19 项断言无偏差；38 项功能 + UI 设计 + 交付收口按完成标准逐项验收；数据集上报→审核→发布、碳标签生成→扫码核验两条新链路跑通；越权用例全拦截；2000 条核算 ≤30 秒。"),
]
r = 6
for k, v in kv:
    ws.cell(row=r, column=1, value=k).font = font(10, True)
    ws.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="top")
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=NC)
    ws.cell(row=r, column=2, value=v)
    for cc in range(1, NC + 1):
        ws.cell(row=r, column=cc).border = BOX
    ws.cell(row=r, column=2).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    # 行高按「中文 2 字符宽」估算：B:F 合并后可用约 96 字符宽
    _units = sum(2 if ord(ch) > 127 else 1 for ch in v)
    _lines = -(-_units // 96)
    ws.row_dimensions[r].height = max(28, min(72, _lines * 14 + 8))
    r += 1

section(ws, 13, "二、人力负荷（可用人日 = 人数 × 8 周 × 5 天；已排人日取自「04_研发排期」）", NC)
for i, h in enumerate(["角色", "人数", "可用人日", "已排人日", "负荷率", "结论"], start=1):
    ws.cell(row=14, column=i, value=h)
header_row(ws, 14, NC, 24)
roles = [("后端", 4, "I"), ("前端", 2, "J"), ("测试", 1, "K")]
ws0 = ws                      # 预留引用：D 列公式待 04 表建好后回填（避免把合计行算进去）
r_load = []
for i, (name, head, col) in enumerate(roles):
    r = 15 + i
    r_load.append((r, col))
    ws.cell(row=r, column=1, value=name)
    ws.cell(row=r, column=2, value=head)
    ws.cell(row=r, column=3, value=f"=B{r}*8*5")
    ws.cell(row=r, column=5, value=f'=IF(C{r}=0,"",D{r}/C{r})')
    ws.cell(row=r, column=5).number_format = "0.0%"
    ws.cell(row=r, column=6, value=f'=IF(E{r}="","",IF(E{r}>0.95,"超载，须立即上报",IF(E{r}>0.85,"偏紧，已无缓冲","负荷合理")))')
r_t = 18
ws.cell(row=r_t, column=1, value="合计")
ws.cell(row=r_t, column=2, value="=SUM(B15:B17)")
ws.cell(row=r_t, column=3, value="=SUM(C15:C17)")
ws.cell(row=r_t, column=4, value="=SUM(D15:D17)")
ws.cell(row=r_t, column=5, value='=IF(C18=0,"",D18/C18)')
ws.cell(row=r_t, column=5).number_format = "0.0%"
ws.cell(row=r_t, column=6, value="总 326/280（116%）：后端 183/160、前端 99/80、测试 44/40，三角色均超载，须先定补足方案")
body(ws, 15, r_t, NC, wrap=(6,), center=(2, 3, 4, 5))
for cc in range(1, NC + 1):
    ws.cell(row=r_t, column=cc).font = font(10, True)
    ws.cell(row=r_t, column=cc).fill = PatternFill("solid", fgColor=XL_LIGHT)
ws.conditional_formatting.add("E15:E17", CellIsRule(operator="greaterThan", formula=["0.95"],
    fill=PatternFill("solid", fgColor=XL_RED_BG), font=font(10, True, XL_RED_TEXT)))
ws.conditional_formatting.add("E15:E17", CellIsRule(operator="between", formula=["0.85", "0.95"],
    fill=PatternFill("solid", fgColor=XL_YEL_BG), font=font(10, False, XL_YEL_TEXT)))

section(ws, 20, "三、里程碑一览（人日与验收口径见「02_阶段里程碑」，逐项排期见「04_研发排期」）", NC)
for i, h in enumerate(["阶段", "周期", "起止", "核心产出（对应功能清册条目）", "出口条件"], start=1):
    col = {1: 1, 2: 2, 3: 3, 4: 4, 5: 6}[i]
    ws.cell(row=21, column=col, value=h)
ws.merge_cells(start_row=21, start_column=4, end_row=21, end_column=5)
header_row(ws, 21, NC, 24)
ms = [
    ("阶段一 地基与权限", "第 1–4 周", "11/16–12/13",
     "平台支撑 6 项 + UI 设计：数据字典、组织架构、角色管理、用户管理、功能菜单、权限管理、设计令牌与页面标注",
     "前端在真实接口下完成登录；菜单由接口下发；越权访问被服务端拒绝；新增能力页面有可交付标注"),
    ("阶段二 主数据与因子", "第 2–6 周", "11/23–12/27",
     "后台主数据 11 项 + 新增 2 项：产品分类、产品信息库、工艺流程、工序、物料库、能源库、计量单位库、生命周期阶段、行业库、标准文件库、因子库管理、知识库、行业数据集上报与审核",
     "后台数据实时进入前台下拉；阶段可按 A1–C4 独立出数；数据集可走完上报→审核→发布并留痕"),
    ("阶段三 核算主链路", "第 4–8 周", "12/07–01/10",
     "核算链路 10 项 + 新增 2 项：计算公式、公式管理、核算模型、背景数据库、我的因子库、模型库、我的模型、我的产品库、我的工艺库、碳足迹核算、公共数据库、产品碳基线库",
     "熊宝 28 条数据端到端跑通，19 项断言零偏差；基线可由核算结果生成并与报告口径一致"),
    ("阶段四 闭环与发版", "第 6–8 周", "12/21–01/10",
     "闭环 5 项 + 新增 2 项：企业信息维护、工作台、报告编制、敏感性分析、数据质量评价、碳标签、数据驾驶舱；另加清册外「交付收口」1 项",
     "三条业务线全通；报告 docx 与碳标签核验值一致；驾驶舱指标与列表条数一致；2000 条核算 ≤30 秒"),
]
r = 22
for row in ms:
    ws.cell(row=r, column=1, value=row[0])
    ws.cell(row=r, column=2, value=row[1])
    ws.cell(row=r, column=3, value=row[2])
    ws.cell(row=r, column=4, value=row[3])
    ws.merge_cells(start_row=r, start_column=4, end_row=r, end_column=5)
    ws.cell(row=r, column=6, value=row[4])
    r += 1
body(ws, 22, 25, NC, wrap=(1, 4, 6), center=(2, 3))
for rr in range(22, 26):
    ws.row_dimensions[rr].height = 62

section(ws, 27, "四、四条红线（违反任一条，工期即失控）", NC)
redlines = [
    "接口契约第 1 周冻结。之后字段增删改名须产品与研发双方签字，否则前端联调必然返工。",
    "计算引擎每次改动先跑熊宝 19 项断言，不通过不得合入主干。断言脚本是引擎的知识载体，不只是测试。",
    "范围扩大后后端 183/160（114%）、前端 99/80（124%）、测试 44/40（110%），总 326/280（116%）。7 人 8 周的硬容量已被突破，第 1 周内必须定补足方案（增派 1 后端 + 1 前端，或整体延至 10 周），不能靠口头加班默认过关；第 2 周累计完成率低于 90% 必须当周上报。",
    "生命周期模块编码与生物碳口径必须第 2 周内冻结；晚一周，阶段库、种子数据、结果口径全部返工。",
]
r = 28
for t in redlines:
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=NC)
    cell = ws.cell(row=r, column=1, value=t)
    cell.font = font(10)
    cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    cell.border = Border(bottom=thin)
    _units = sum(2 if ord(ch) > 127 else 1 for ch in t)
    ws.row_dimensions[r].height = max(26, min(72, (-(-_units // 112)) * 14 + 8))
    r += 1

section(ws, r + 1, "五、容量缺口与补足建议（范围扩大后必读，第 1 周内须决策）", NC)
gap_notes = [
    "缺口测算：后端差 23 人日（183/160）、前端差 19（99/80）、测试差 4（44/40），合计差 46 人日；逐周峰值见「03_周排期甘特图」每周负荷区，红底周已超硬容量。",
    "方案 A（推荐）：增派 1 后端 + 1 前端（9 人团队）。后端容量 180（尚差 3）、前端 100（富余 1）、测试 40（尚差 4）；后端与测试合计 7 人日靠周内加班消化，前端富余不跨角色抵扣；8 周周期与 40 行范围不变。",
    "方案 B：维持 7 人，整体延至 10 周（容量 350 人日）。后端 183/200、前端 99/100、测试 44/50 均回落安全区；交付时间改为 2027-01-24。",
    "方案 C：维持 7 人 8 周不变，按后端 114% / 前端 124% / 测试 110% 强度执行（前端每人每周 6.2 天）。仅作临时应急，不写入正式基线，须产品与研发共同签字确认加班与质量兜底预案。",
    "共同约束：UI 设计按前端兼任计 8 人日，不另设岗位；新增 6 项能力不排第二阶段；范围再扩大须先走 CR 并回答「人日从哪来」。",
]
gr = r + 2
for t in gap_notes:
    ws.merge_cells(start_row=gr, start_column=1, end_row=gr, end_column=NC)
    cell = ws.cell(row=gr, column=1, value=t)
    cell.font = font(10)
    cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    cell.border = Border(bottom=thin)
    _units = sum(2 if ord(ch) > 127 else 1 for ch in t)
    ws.row_dimensions[gr].height = max(26, min(72, (-(-_units // 112)) * 14 + 8))
    gr += 1

# =====================================================================
# 02_阶段里程碑
# =====================================================================
ws = wb.create_sheet(S1)
ws.sheet_view.showGridLines = False
widths(ws, {"A": 18, "B": 11, "C": 14, "D": 34, "E": 48, "F": 38,
            "G": 9, "H": 9, "I": 9, "J": 9})
NC1 = 10
hdr = ["阶段", "周期", "起止", "阶段目标", "关键交付物（功能清册条目）", "退出条件（验收口径）",
       "后端", "前端", "测试", "合计人日"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
header_row(ws, 1, NC1, 34)

phases = [
    (P1, "第 1–4 周", "11/16–12/13",
     "平台支撑 6 项落地，设计令牌先行，业务查询全部带上组织与数据范围上下文。",
     "数据字典、组织架构、角色管理、用户管理、功能菜单、权限管理；UI 设计（设计令牌与组件规范、40 行功能走查、新增 6 项能力页面标注）；接口契约与字段字典、后端骨架与三环境、前端请求层替换 mock 与路由守卫。",
     "前端在真实接口下完成登录；菜单与按钮权限由接口下发；跨组织与越权访问被服务端拒绝；设计令牌落地组件库，新增能力有可交付标注页面。"),
    (P2, "第 2–6 周", "11/23–12/27",
     "后台主数据与因子库生产化，数据集上报审核与知识库同期建成。",
     "产品分类、产品信息库、工艺流程、工序、物料库、能源库、计量单位库、生命周期阶段（含 A1–C4 模块编码与补 A5）、行业库、标准文件库（含对象存储与引用锁版本）、因子库管理；知识库（分类 / 检索 / 权限）、行业数据集上报与审核（上报 → 审核 → 发布）。",
     "后台维护的数据实时进入前台表单下拉；生命周期阶段可按 A1–C4 独立出数；因子库可按版本发布、发布后冻结；数据集可走完上报→驳回→修改→发布且留痕。"),
    (P3, "第 4–8 周", "12/07–01/10",
     "核算在服务端重算，前后台模型库、公共数据库与碳基线库全线打通。",
     "计算公式、公式管理、核算模型（目标边界 → 产品模型配置 → 版本 → 发布）、背景数据库、我的因子库、模型库、我的模型、我的产品库、我的工艺库、碳足迹核算；公共数据库（浏览 / 检索 / 引用）、产品碳基线库（生成 / 版本 / 对比）。",
     "熊宝 28 条数据端到端跑通，19 项断言零偏差；模型发布后前台可直接新建核算；过期因子在匹配时被过滤；基线可由核算结果生成且两条基线对比口径与报告一致。"),
    (P4, "第 6–8 周", "12/21–01/10",
     "报告、碳标签、驾驶舱与评价闭环，工作台收口，通过回归与性能验收后发版。",
     "企业信息维护、工作台、报告编制（章节装配 + docx 导出）、敏感性分析（基准 / 变更情景对比）、数据质量评价（Pedigree 与 DQR）、碳标签（规则 / 编号 / 二维码 / 核验）、数据驾驶舱（多维统计 / 图表下钻）；交付收口（三条线端到端回归、熊宝 19 项断言重跑、性能验收、发版清单与回滚演练）。",
     "三条业务线全通；报告 docx 可直接编辑、数值与页面一致；碳标签扫码核验值与报告一致；驾驶舱指标与列表真实条数一致；2000 条核算 ≤30 秒、导入 ≤60 秒。"),
]
r = 2
for p in phases:
    for i, v in enumerate(p, start=1):
        ws.cell(row=r, column=i, value=v)
    ws.cell(row=r, column=7, value=f"=SUMIFS('{S3}'!$I$2:$I$100,'{S3}'!$F$2:$F$100,$A{r})")
    ws.cell(row=r, column=8, value=f"=SUMIFS('{S3}'!$J$2:$J$100,'{S3}'!$F$2:$F$100,$A{r})")
    ws.cell(row=r, column=9, value=f"=SUMIFS('{S3}'!$K$2:$K$100,'{S3}'!$F$2:$F$100,$A{r})")
    ws.cell(row=r, column=10, value=f"=SUM(G{r}:I{r})")
    r += 1
rt = r
ws.cell(row=rt, column=1, value="合计")
ws.cell(row=rt, column=2, value="8 周")
ws.cell(row=rt, column=3, value="11/16–01/10")
ws.merge_cells(start_row=rt, start_column=4, end_row=rt, end_column=6)
ws.cell(row=rt, column=4, value="阶段之间各留 1 周以上重叠（并行推进），4 个阶段周期之和大于 8 周属正常；40 行（清册 32 项 + 新增必做 6 项 + UI 设计 + 交付收口）逐项人日见「04_研发排期」。总量 326 人日已超 280 容量，补足方案见「01_计划总览」第五节")
for col in ("G", "H", "I", "J"):
    ws[f"{col}{rt}"] = f"=SUM({col}2:{col}{rt-1})"
body(ws, 2, rt, NC1, wrap=(1, 4, 5, 6), center=(2, 3, 7, 8, 9, 10))
for cc in range(1, NC1 + 1):
    ws.cell(row=rt, column=cc).font = font(10, True)
    ws.cell(row=rt, column=cc).fill = PatternFill("solid", fgColor=XL_LIGHT)
for rr in range(2, rt + 1):
    for cc in range(7, 11):
        ws.cell(row=rr, column=cc).number_format = "0"
ws.freeze_panes = "B2"
auto_h(ws, 2, rt - 1, {"A": 18, "D": 34, "E": 48, "F": 38})
note = rt + 2
ws.merge_cells(start_row=note, start_column=1, end_row=note, end_column=NC1)
c = ws.cell(row=note, column=1, value="口径：人日按「1 人 1 天」计，已扣约 10% 会议与联调损耗；阶段人日由「04_研发排期」按所属阶段 SUMIFS 汇总，改一处人日全表联动。阶段二起各阶段与前一阶段重叠 1 周以上，用于后端先交付接口、前端同期联调。测试人日口径：已实现且结构简单的树形 CRUD（产品分类 / 行业库 / 公式管理）不再单列预测试工时，其回归覆盖并入阶段四「交付收口」。")
c.font = font(9, False, XL_DARK)
c.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
ws.row_dimensions[note].height = 48

# =====================================================================
# 04_研发排期（按功能清册罗列）—— 先建，供 02/03 引用
# =====================================================================
ws = wb.create_sheet(S3)
widths(ws, {"A": 5, "B": 13, "C": 24, "D": 46, "E": 10, "F": 19, "G": 7, "H": 7,
            "I": 8, "J": 8, "K": 8, "L": 9, "M": 7, "N": 38, "O": 22})
NC3 = 15
hdr = ["序号", "域", "模块 / 一级功能", "功能范围与关键工作（二级功能）", "原型进度",
       "所属阶段", "开始周", "结束周", "后端人日", "前端人日", "测试人日", "合计人日",
       "优先级", "完成标准（可验收）", "前置依赖"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
header_row(ws, 1, NC3, 38)

# (域, 模块/一级功能, 二级功能范围, 原型进度, 阶段, 始周, 终周, 后, 前, 测, 优先级, 完成标准, 依赖, 甘特周)
funcs = [
    # ---------------- 阶段一 地基与权限：平台支撑 6 项 ----------------
    (DOM_S, "平台支撑 / 数据字典",
     "字典类型与字典项列表、新增 / 编辑 / 删除；系统边界、排放物类型、状态枚举统一由字典驱动",
     "已实现", P1, 1, 1, 3, 1, 1, "中",
     "枚举全部改由字典接口下发，前端不再写死；同一字典在核算、报告、模型三处取值一致",
     "—", [1]),
    (DOM_S, "平台支撑 / 组织架构",
     "组织树、新增 / 编辑 / 删除；组织作为数据隔离维度注入全部业务查询",
     "待处理", P1, 1, 2, 6, 2, 1, "高",
     "组织树可增删改并支持层级；跨组织读写被服务端拒绝且不泄露数据存在性；组织变更后历史数据归属不变",
     "—", [1, 2]),
    (DOM_S, "平台支撑 / 角色管理",
     "角色列表、新增 / 编辑 / 删除、绑定菜单与数据范围（五档可见范围）",
     "待处理", P1, 1, 2, 5, 2, 1, "高",
     "角色可绑定菜单与数据范围；权限变更即时生效无需重新登录；系统角色与租户角色互相不可越界",
     "组织架构", [1, 2]),
    (DOM_S, "平台支撑 / 用户管理",
     "用户列表、新增 / 编辑 / 启停、重置密码、分配组织与角色",
     "待处理", P1, 2, 2, 4, 2, 1, "高",
     "账号可建可停；停用账号令牌立即失效；用户归属组织与角色决定其菜单与可见数据",
     "组织架构、角色管理", [2]),
    (DOM_S, "平台支撑 / 功能菜单",
     "菜单树列表、新增 / 编辑 / 删除、绑定路由与图标、按角色下发",
     "待处理", P1, 2, 2, 3, 2, 1, "中",
     "菜单树由接口下发，前端路由与菜单同源；隐藏菜单直接访问路由被拦截",
     "组织架构", [2]),
    (DOM_S, "平台支撑 / 权限管理",
     "菜单权限、按钮权限、数据范围三层配置与校验；越权统一拒绝",
     "待处理", P1, 2, 3, 6, 2, 2, "高",
     "三层权限均可在服务端拦截，前端仅做展示性隐藏不作为安全边界；越权用例逐条通过",
     "角色管理、功能菜单、用户管理", [2, 3]),
    ("交付保障", "UI 设计（前端兼任）",
     "设计令牌与组件规范统稿、40 行功能的页面走查与补齐、新增 6 项能力的页面设计（行业数据集上报审核 / 公共数据库 / 知识库 / 碳基线库 / 碳标签 / 驾驶舱）、交互标注与切图交付；复用原型的现成高保真页面，不重做全量设计",
     "—", P1, 1, 4, 0, 8, 0, "高",
     "设计令牌与组件规范定稿并落地到前端组件库；40 行功能逐页走查有结论；新增 6 项能力均有可交付标注页面，前端按标注可直接实现",
     "平台支撑 6 项（设计令牌须先于业务页面铺开）", [1, 2, 3, 4]),

    # ---------------- 阶段二 主数据与因子：后台主数据 11 项 ----------------
    (DOM_S, "产品库 / 产品分类",
     "多级分类树、新增 / 编辑 / 删除；为产品信息库与前台产品库提供统一分类口径",
     "已实现", P2, 2, 2, 2, 1, 0, "中",
     "分类树可增删改；被产品引用的分类不可删除；分类数据被产品信息库与前台产品库同源引用",
     "数据字典", [2]),
    (DOM_S, "基础库 / 计量单位库",
     "单位列表、新增 / 编辑 / 详情、启用 / 停用 / 删除；单位换算关系维护",
     "已实现", P2, 2, 2, 2, 1, 1, "高",
     "单位与换算关系可维护；改系数时对被引用单位二次确认并留痕；量纲换算在服务端生效",
     "数据字典", [2]),
    (DOM_S, "工艺流程管理 / 工序",
     "工序列表、新增 / 编辑 / 详情、启用 / 停用 / 删除；标准工序档案",
     "已实现", P2, 2, 3, 3, 1, 1, "高",
     "标准工序可增删改与启停；被工艺流程或产品建模引用后不可删除；工序编码唯一",
     "计量单位库", [2, 3]),
    (DOM_S, "工艺流程管理 / 工艺流程",
     "工艺流程列表、新增 / 编辑 / 详情、启用 / 停用 / 删除、工序链配置",
     "已实现", P2, 3, 3, 5, 2, 1, "高",
     "流程模板可配置工序链；启用状态决定前台可选范围；被产品引用后不可直接删除",
     "工序", [3]),
    (DOM_S, "基础库 / 生命周期阶段",
     "阶段列表、新增 / 编辑 / 详情、启用 / 停用 / 删除；A1–A5 / B1–B7 / C1–C4 模块编码与纳入规则",
     "已实现", P2, 3, 3, 2, 1, 1, "高",
     "每个阶段映射唯一模块编码（含补 A5）；按 A1–C4 可独立汇总；历史数据只加映射、原值不丢",
     "数据字典", [3]),
    (DOM_S, "基础库 / 物料库",
     "物料列表、新增 / 编辑 / 详情、启用 / 停用 / 删除；含排放物类型标识",
     "已实现", P2, 3, 3, 3, 1, 1, "高",
     "物料档案可维护并带排放物类型；前台产品建模下拉实时取数而非静态常量",
     "计量单位库", [3]),
    (DOM_S, "基础库 / 能源库",
     "能源列表、新增 / 编辑 / 详情、启用 / 停用 / 删除；含地区与单位属性",
     "已实现", P2, 3, 3, 2, 1, 1, "高",
     "电力、燃料等能源档案可维护；地区属性参与因子匹配；被建模引用后不可删除",
     "计量单位库", [3]),
    (DOM_S, "产品库 / 产品信息库",
     "产品列表、新增 / 编辑 / 详情 / 删除、启用 / 停用、引用；工艺工序组合配置",
     "已实现", P2, 3, 4, 7, 3, 1, "高",
     "后台产品档案、工艺工序组合与上下架状态可维护；同阶段只绑一个工艺的组合校验在服务端生效",
     "产品分类、工艺流程", [3, 4]),
    (DOM_S, "基础库 / 行业库",
     "行业树、新增 / 编辑 / 删除；为产品、模型、因子提供行业口径",
     "已实现", P2, 3, 4, 1, 1, 0, "低",
     "行业树可增删改；被产品、模型或因子引用后不可删除；前台筛选按行业口径生效",
     "数据字典", [3, 4]),
    (DOM_S, "基础库 / 标准文件库",
     "标准文件列表、上传 / 新增 / 编辑 / 详情、启用 / 停用 / 删除；含对象存储对接与引用锁版本",
     "已实现", P2, 4, 4, 3, 2, 1, "中",
     "文件可上传并被核算与模型引用；被引用文件不可直接删除、引用关系可反查；越权下载被拒绝",
     "—", [4]),
    (DOM_S, "核算配置 / 因子库管理",
     "后台因子库列表、版本管理、库发布、因子维护、批量导入；已发布版本冻结",
     "已实现", P2, 4, 5, 10, 2, 1, "高",
     "建库 → 建版本 → 录入 / 导入因子 → 发布全链路可走通；发布后版本冻结、只能新建版本；前台只读引用",
     "计量单位库、生命周期阶段", [4, 5]),
    (DOM_S, "知识库 / 知识文档",
     "知识分类目录、文档上传 / 下载 / 版本、全文检索、按组织与角色授权；复用标准文件库的对象存储与引用锁版本能力",
     "待处理", P2, 4, 5, 4, 3, 1, "中",
     "知识可按分类与关键词检索；上传下载受组织与角色权限约束；文档新版本发布后旧版仍可追溯",
     "标准文件库、组织架构、角色管理", [4, 5]),
    (DOM_S, "数据集 / 行业数据集上报与审核",
     "企业端上报入口（数据集信息、活动数据、附件、提交），管理端审核列表与审核流（通过 / 驳回 + 意见），发布后进入公共数据库并带版本号；复用标准文件库的上传与权限能力",
     "待处理", P2, 4, 6, 8, 4, 2, "高",
     "上报 → 审核 → 发布全链路可走通；驳回后企业可修改重提且留痕；发布的数据集带版本与来源组织，可按行业检索",
     "行业库、标准文件库、组织架构", [4, 5, 6]),

    # ---------------- 阶段三 核算主链路：10 项 ----------------
    (DOM_S, "核算配置 / 计算公式",
     "公式列表、公式编辑、表达式弹窗、试算；核算引擎取数口径",
     "已实现", P3, 4, 4, 4, 2, 1, "高",
     "公式可维护，表达式弹窗可拼装并试算；试算结果与引擎实际取数一致；公式变更留痕",
     "生命周期阶段", [4]),
    (DOM_S, "核算配置 / 公式管理",
     "公式列表、公式编辑、测试（备用入口）",
     "已实现", P3, 4, 5, 1, 1, 0, "低",
     "与「计算公式」共用同一数据源与权限模型，不产生重复数据；入口可独立授权",
     "计算公式", [4, 5]),
    (DOM_S, "模型管理 / 核算模型",
     "模型目标边界配置、产品模型配置；基本信息 → 产品建模 → 版本 → 发布",
     "待处理", P3, 4, 6, 11, 4, 2, "高",
     "五步配置可走通并发布；发布后前台可选、改配置须生成新版本；模型版本与核算结果可追溯",
     "计算公式、因子库管理", [4, 5, 6]),
    (DOM_F, "因子管理 / 背景数据库",
     "已发布库浏览、库详情、因子详情、收藏到我的因子库",
     "已实现", P3, 5, 5, 3, 2, 1, "高",
     "只读展示已发布库与因子；收藏后在本组织生成私有副本，副本可追溯源库与源版本",
     "因子库管理", [5]),
    (DOM_F, "因子管理 / 我的因子库",
     "库管理、因子维护（新增 / 编辑 / 删除）、详情与同步",
     "已实现", P3, 5, 6, 5, 3, 1, "高",
     "私有库与因子可增删改；收藏副本可按源库新版本刷新同步并有差异提示；过期因子在匹配时被过滤",
     "因子库管理、背景数据库", [5, 6]),
    (DOM_F, "模型管理 / 模型库",
     "卡片网格列表、条件查询与过滤、模型预览、加入我的模型、选用模型新建核算",
     "已实现", P3, 5, 6, 2, 2, 1, "中",
     "卡片可按条件查询过滤；模型可预览边界与产品构成；可直接跳转新建核算并带入模型",
     "核算模型", [5, 6]),
    (DOM_F, "模型管理 / 我的模型",
     "模型列表、新增 / 编辑（两步向导）、查看详情",
     "已实现", P3, 6, 6, 3, 3, 1, "高",
     "两步向导可从零新建并保存；收藏副本可二次编辑；详情页展示边界、产品与版本信息",
     "核算模型、模型库", [6]),
    (DOM_F, "产品库 / 我的产品库",
     "产品列表、引用平台产品、自行新增 / 编辑 / 详情、上架 / 下架 / 删除",
     "已实现", P3, 6, 6, 4, 2, 1, "高",
     "可引用后台产品生成本组织副本；自行新增产品并维护工艺工序组合；下架与删除受引用校验保护",
     "产品信息库、工艺流程", [6]),
    (DOM_F, "工艺库 / 我的工艺库",
     "工艺列表、引用后台工艺、新增 / 编辑 / 详情、启用 / 停用 / 删除",
     "已实现", P3, 6, 6, 3, 2, 1, "高",
     "可引用后台工艺流程生成组织副本并编辑工序链；启停与删除受引用校验保护",
     "工艺流程、工序", [6]),
    (DOM_F, "碳足迹核算 / 碳足迹核算",
     "核算记录列表、按产品 / 模型新建核算、四步核算流程（目标与范围 → 产品建模 → 数据检测 → 核算与结果）、结果清册与导出",
     "已实现", P3, 5, 7, 16, 6, 2, "高",
     "核算全部在服务端重算，与熊宝 19 项断言零偏差；两条新建入口均可用；四步状态机非法跳转被拒；结果可导出",
     "核算模型、我的产品库、我的工艺库", [5, 6, 7]),
    (DOM_F, "公共数据库 / 公共数据浏览与引用",
     "公共数据集与公共因子的分类浏览、条件查询、详情、收藏到我的因子库、版本更新提示；只读展示已发布内容，复用因子库的收藏副本机制",
     "待处理", P3, 5, 7, 5, 3, 1, "高",
     "已发布数据集与因子可按行业 / 类型检索；收藏后在本组织生成可追溯副本；源库更新时提示差异而非静默覆盖",
     "行业数据集上报与审核、因子库管理、背景数据库", [5, 6, 7]),
    (DOM_F, "产品碳基线库 / 基线建立与对比",
     "基线数据建模（产品 / 行业 / 地区维度）、由已核算结果与审核通过的数据集生成基线、版本管理、查询与对比分析；复用核算结果口径与报告章节",
     "待处理", P3, 6, 8, 6, 3, 2, "高",
     "可从核算结果一键生成基线并锁定版本；基线按产品 / 行业 / 地区可查询；两条基线对比输出差值与变化率，口径与报告一致",
     "碳足迹核算、公共数据库、报告编制", [6, 7, 8]),

    # ---------------- 阶段四 闭环与发版：5 项 ----------------
    (DOM_F, "报告管理 / 企业信息维护",
     "列表查询、新增 / 编辑、删除、变更联动（被引用后标记待更新）",
     "待处理", P4, 6, 6, 3, 2, 1, "中",
     "企业信息被报告引用后变更，自动标记关联报告「待更新」并可一键查看影响范围",
     "—", [6]),
    (DOM_F, "工作台 / 工作台",
     "欢迎区、碳排放总览、核算进度、组织统计、碳足迹概览、碳报告空态",
     "部分实现", P4, 7, 7, 4, 4, 1, "中",
     "统计数字与各列表页真实条数一致，不再硬编码；待办可跳转对应核算；组织与产品统计按当前数据权限过滤",
     "碳足迹核算、报告编制", [7]),
    (DOM_F, "报告管理 / 报告编制",
     "报告列表、报告详情（封面 / 章节 / 预览 / 导出 / 定稿）；章节按数据装配与 docx 生成",
     "待处理", P4, 7, 8, 8, 4, 1, "高",
     "报告可由已核算项目一键生成，章节按数据装配，预览与导出一致；导出 docx 可直接编辑且含版本号",
     "碳足迹核算、企业信息维护", [7, 8]),
    (DOM_F, "报告管理 / 敏感性分析",
     "列表、基准情景、变更情景、情景核算与对比、GWP 口径切换",
     "待处理", P4, 7, 8, 7, 3, 1, "中",
     "一个基准核算可建多个变更情景并分别重算；输出变化量、变化率与敏感度排序；GWP 口径切换后结果同步重算",
     "碳足迹核算", [7, 8]),
    (DOM_F, "报告管理 / 数据质量评价",
     "三段式向导、定性 / 定量评价、DQR 计算、不确定度、分布统计",
     "待处理", P4, 7, 8, 7, 3, 1, "中",
     "三段式向导可走通；Pedigree 评分落库并算出 DQR 等级与不确定度；分布统计与报告引用一致",
     "碳足迹核算", [7, 8]),
    (DOM_F, "碳标签 / 标签生成与核验",
     "标签规则与模板配置、由已核算结果生成标签、唯一编号与二维码、导出打印、公开核验页；复用报告模版的 docx / 图片导出能力",
     "待处理", P4, 7, 8, 4, 3, 1, "中",
     "一张标签可追溯源核算与版本号；编号唯一且不可重复生成；扫码核验页展示的排放量与报告一致，未被授权的标签不展示明细",
     "碳足迹核算、报告编制、企业信息维护", [7, 8]),
    (DOM_F, "数据驾驶舱 / 多维统计看板",
     "组织 / 产品 / 行业 / 时间多维统计、核算量与排放量总览、碳足迹分布与趋势图、图表下钻到明细、按数据权限过滤；复用工作台统计口径",
     "待处理", P4, 7, 8, 6, 5, 2, "高",
     "驾驶舱各指标与列表页真实条数一致；下钻可跳到对应核算明细；跨组织访问按数据权限过滤，越权不返回数据",
     "碳足迹核算、工作台、公共数据库", [7, 8]),

    # ---------------- 清册外的横向收口：不做则测试人日全摊在功能里，端到端回归无人兜底 ----------------
    ("交付保障", "交付收口（清册外）",
     "三条业务线端到端回归、熊宝 19 项断言全量重跑、2000 条核算与导入性能验收、发版清单与回滚演练、缺陷收敛",
     "—", P4, 8, 8, 2, 0, 3, "高",
     "三条线均可从建档走到报告导出；阻断与严重缺陷清零；性能指标达标；回滚演练一次、发版清单签字",
     "全部 32 项功能", [8]),
]

r = 2
# 周负荷均衡后的实际排布（覆盖上面字面值里的 sw/ew）：把 33 行按「后端 20 / 前端 10 / 测试 5 人日每周」
# 的容量重铺，峰周从 25.5 人日压到 21.5 人日，其余照旧。字面值保留为「初估跨度」，便于回溯。
SPAN = {
    "平台支撑 / 数据字典": (1, 1), "平台支撑 / 组织架构": (1, 1),     "平台支撑 / 角色管理": (1, 1), "交付保障 / UI 设计（前端兼任）": (1, 4),
    "产品库 / 产品分类": (1, 1), "基础库 / 计量单位库": (1, 1),
    "平台支撑 / 功能菜单": (2, 2), "平台支撑 / 用户管理": (2, 2), "平台支撑 / 权限管理": (2, 3),
    "基础库 / 行业库": (2, 2), "基础库 / 标准文件库": (2, 3), "工艺流程管理 / 工序": (2, 3),
    "基础库 / 物料库": (2, 3), "基础库 / 能源库": (2, 2),
    "基础库 / 生命周期阶段": (3, 3), "工艺流程管理 / 工艺流程": (3, 3),
    "核算配置 / 因子库管理": (3, 4), "产品库 / 产品信息库": (4, 5),
    "知识库 / 知识文档": (4, 5), "数据集 / 行业数据集上报与审核": (4, 6),
    "核算配置 / 计算公式": (4, 4), "核算配置 / 公式管理": (4, 5), "模型管理 / 核算模型": (4, 6),
    "因子管理 / 背景数据库": (5, 5), "因子管理 / 我的因子库": (5, 6), "模型管理 / 模型库": (6, 6),
    "公共数据库 / 公共数据浏览与引用": (5, 7),
    "产品库 / 我的产品库": (5, 6), "工艺库 / 我的工艺库": (4, 6), "碳足迹核算 / 碳足迹核算": (5, 7),
    "产品碳基线库 / 基线建立与对比": (6, 8),
    "报告管理 / 企业信息维护": (6, 6), "模型管理 / 我的模型": (7, 7),
    "报告管理 / 报告编制": (7, 8), "报告管理 / 敏感性分析": (7, 8),
    "报告管理 / 数据质量评价": (7, 8), "碳标签 / 标签生成与核验": (7, 8),
    "数据驾驶舱 / 多维统计看板": (7, 8), "工作台 / 工作台": (8, 8),
    "交付保障 / 交付收口（清册外）": (8, 8),
}
_old = funcs
funcs = []
for f in _old:
    s, e = SPAN.get(f[1], (f[5], f[6]))
    funcs.append((f[0], f[1], f[2], f[3], f[4], s, e,
                  f[7], f[8], f[9], f[10], f[11], f[12], list(range(s, e + 1))))
assert len(funcs) == len(_old) == len(SPAN), (len(funcs), len(_old), len(SPAN))

for idx, f in enumerate(funcs, start=1):
    dom, name, scope, prog, stage, sw, ew, be, fe, qa, prio, accept, dep, weeks = f
    ws.cell(row=r, column=1, value=idx)
    ws.cell(row=r, column=2, value=dom)
    ws.cell(row=r, column=3, value=name)
    ws.cell(row=r, column=4, value=scope)
    ws.cell(row=r, column=5, value=prog)
    ws.cell(row=r, column=6, value=stage)
    ws.cell(row=r, column=7, value=sw)
    ws.cell(row=r, column=8, value=ew)
    ws.cell(row=r, column=9, value=be)
    ws.cell(row=r, column=10, value=fe)
    ws.cell(row=r, column=11, value=qa)
    ws.cell(row=r, column=12, value=f"=SUM(I{r}:K{r})")
    ws.cell(row=r, column=13, value=prio)
    ws.cell(row=r, column=14, value=accept)
    ws.cell(row=r, column=15, value=dep)
    r += 1
r_end = r - 1
body(ws, 2, r_end, NC3, wrap=(3, 4, 14, 15), center=(1, 5, 6, 7, 8, 9, 10, 11, 12, 13))
for rr in range(2, r_end + 1):
    for cc in range(7, 13):
        ws.cell(row=rr, column=cc).number_format = "0"

dv_prio = DataValidation(type="list", formula1='"高,中,低"', allow_blank=True, showDropDown=False)
ws.add_data_validation(dv_prio)
dv_prio.add(f"M2:M{r_end}")
ws.conditional_formatting.add(f"M2:M{r_end}", CellIsRule(operator="equal", formula=['"高"'],
    font=font(10, True, XL_RED_TEXT)))
# 阶段列淡绿底，便于视觉分组
ws.conditional_formatting.add(f"F2:F{r_end}", CellIsRule(operator="equal", formula=[f'"{P1}"'],
    fill=PatternFill("solid", fgColor=XL_LIGHT), font=font(10, False)))
ws.conditional_formatting.add(f"F2:F{r_end}", CellIsRule(operator="equal", formula=[f'"{P2}"'],
    fill=PatternFill("solid", fgColor=XL_LIGHT), font=font(10, False)))
ws.conditional_formatting.add(f"F2:F{r_end}", CellIsRule(operator="equal", formula=[f'"{P3}"'],
    fill=PatternFill("solid", fgColor=XL_LIGHT), font=font(10, False)))
ws.conditional_formatting.add(f"F2:F{r_end}", CellIsRule(operator="equal", formula=[f'"{P4}"'],
    fill=PatternFill("solid", fgColor=XL_LIGHT), font=font(10, False)))
# 原型进度配色
ws.conditional_formatting.add(f"E2:E{r_end}", CellIsRule(operator="equal", formula=['"已实现"'],
    fill=PatternFill("solid", fgColor=XL_GRN_BG), font=font(10, False, XL_GRN_TEXT)))
ws.conditional_formatting.add(f"E2:E{r_end}", CellIsRule(operator="equal", formula=['"部分实现"'],
    fill=PatternFill("solid", fgColor=XL_YEL_BG), font=font(10, False, XL_YEL_TEXT)))
ws.conditional_formatting.add(f"E2:E{r_end}", CellIsRule(operator="equal", formula=['"待处理"'],
    fill=PatternFill("solid", fgColor=XL_GRAY_BG), font=font(10, False, XL_GRAY_TEXT)))
ws.freeze_panes = "D2"
ws.auto_filter.ref = f"A1:O{r_end}"
auto_h(ws, 2, r_end, {"C": 24, "D": 46, "N": 38, "O": 22})
# 表尾合计行
tr = r_end + 1
ws.merge_cells(start_row=tr, start_column=1, end_row=tr, end_column=8)
ws.cell(row=tr, column=1, value=f"合计 {len(funcs)} 行（功能清册 32 项 + 新增必做 6 项 + UI 设计 1 项 + 交付收口 1 项）　｜　全部在 W1–W8 交付")
for cc in range(9, 13):
    L = get_column_letter(cc)
    ws.cell(row=tr, column=cc, value=f"=SUM({L}2:{L}{r_end})")
ws.cell(row=tr, column=13, value="—")
ws.merge_cells(start_row=tr, start_column=14, end_row=tr, end_column=15)
_tb = sum(f[7] for f in funcs)
_tf = sum(f[8] for f in funcs)
_tq = sum(f[9] for f in funcs)
_tt = _tb + _tf + _tq
ws.cell(row=tr, column=14, value=f"后端 {_tb}/160（{_tb/160:.0%}）、前端 {_tf}/80（{_tf/80:.0%}）、测试 {_tq}/40（{_tq/40:.0%}）；总 {_tt}/280（{_tt/280:.0%}），缺口 {_tt-280} 人日须在第 1 周内定补足方案")
for cc in range(1, NC3 + 1):
    cell = ws.cell(row=tr, column=cc)
    cell.font = font(10, True)
    cell.fill = PatternFill("solid", fgColor=XL_LIGHT)
    cell.border = BOX
    cell.alignment = Alignment(horizontal="center" if 9 <= cc <= 13 else "left", vertical="center", wrap_text=True)
ws.row_dimensions[tr].height = 32

# 表尾脚注
nt = tr + 2
ws.merge_cells(start_row=nt, start_column=1, end_row=nt, end_column=NC3)
c = ws.cell(row=nt, column=1, value=(
    "口径说明：①《产品碳足迹核算系统_功能清册_v1.0》的 32 项一级功能全部纳入，逐项一一对应、不增不减。"
    "② 本次新增必做 6 项（行业数据集上报与审核、公共数据库、知识库、产品碳基线库、碳标签、数据驾驶舱）+ UI 设计（团队无专职 UI，按前端兼任计）+ 交付收口，均为清册外任务，同样在 W1–W8 交付；"
    "交付收口负责端到端回归、熊宝 19 项断言全量重跑、2000 条核算与导入性能验收、发版清单与回滚演练。"
    "③ 合计人日 = 后端 + 前端 + 测试；改任一人日，01 表负荷、02 表阶段汇总、03 表甘特条自动联动。"
    "④ 总量已超 7 人 8 周硬容量，补足方案见「01_计划总览」第五节。"
    "⑤ 优先级只决定同周内的先后顺序与人力抢占次序，不表示可延期到本期之外——40 行全部在 W1–W8 内完成。"
))
c.font = font(9, False, XL_DARK)
c.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
ws.row_dimensions[nt].height = 56

# 回填「01_计划总览」人力负荷：范围锁定到功能数据行（不含下方合计行）
for r, col in r_load:
    ws0.cell(row=r, column=4, value=f"=SUM('{S3}'!${col}$2:${col}${r_end})")

# =====================================================================
# 03_周排期甘特图
# =====================================================================
ws = wb.create_sheet(S2, 1)
ws.sheet_view.showGridLines = False
weeks = [("W1", "11/16"), ("W2", "11/23"), ("W3", "11/30"), ("W4", "12/07"),
         ("W5", "12/14"), ("W6", "12/21"), ("W7", "12/28"), ("W8", "01/04")]
widths(ws, {"A": 30, "B": 19, "C": 9})
for i in range(len(weeks)):
    ws.column_dimensions[get_column_letter(4 + i)].width = 6.5
ws.column_dimensions[get_column_letter(4 + len(weeks))].width = 8
NC2 = 3 + len(weeks) + 1
hdr = ["功能（模块 / 一级功能）", "所属阶段", "主责"] + [f"{w}\n{d}" for w, d in weeks] + ["合计人日"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
header_row(ws, 1, NC2, 38)

# 阶段汇总条
phase_rows = [
    (P1, "第 1–3 周", "后端 + 前端", [1, 2, 3]),
    (P2, "第 2–5 周", "后端 + 前端", [2, 3, 4, 5]),
    (P3, "第 4–7 周", "后端 + 前端", [4, 5, 6, 7]),
    (P4, "第 6–8 周", "全体", [6, 7, 8]),
]
r = 2
for name, period, owner, active in phase_rows:
    ws.cell(row=r, column=1, value=name).font = font(10, True, "FFFFFFFF")
    ws.cell(row=r, column=2, value=period).font = font(10, False, "FFFFFFFF")
    ws.cell(row=r, column=3, value=owner).font = font(9, False, "FFFFFFFF")
    for w in active:
        cell = ws.cell(row=r, column=3 + w, value="■")
        cell.fill = PatternFill("solid", fgColor=XL_BAR_PHASE)
        cell.font = font(9, False, "FFFFFFFF")
        cell.alignment = Alignment(horizontal="center", vertical="center")
    r += 1
for i, (name, period, owner, active) in enumerate(phase_rows):
    ws.cell(row=2 + i, column=NC2, value=f"=SUMIFS('{S3}'!$L$2:$L$100,'{S3}'!$F$2:$F$100,$A{2+i})")

# 空一行
ws.row_dimensions[6].height = 6

# 功能条
r = 7
for idx, f in enumerate(funcs, start=1):
    dom, name, scope, prog, stage, sw, ew, be, fe, qa, prio, accept, dep, wks = f
    is_test = (name in ("报告管理 / 敏感性分析", "报告管理 / 数据质量评价"))
    main = [n for n, v in (("后端", be), ("前端", fe)) if v]
    # 测试只在「无研发投入」或「测试占比明显」时才写进主责，否则一律视为随研发走
    if qa and (not main or qa >= 3):
        main.append("测试")
    owner = " + ".join(main) or "测试"
    ws.cell(row=r, column=1, value=name)
    ws.cell(row=r, column=2, value=stage)
    ws.cell(row=r, column=3, value=owner)
    for w in wks:
        cell = ws.cell(row=r, column=3 + w, value="■")
        color = XL_BAR_TEST if is_test else XL_BAR
        cell.fill = PatternFill("solid", fgColor=color)
        cell.font = font(9, False, "FF7F6000" if color == XL_BAR_TEST else "FF375623")
        cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.cell(row=r, column=NC2, value=f"=SUM('{S3}'!$I${idx+1}:$K${idx+1})")
    r += 1
r_end2 = r - 1

for rr in range(2, r_end2 + 1):
    for cc in range(1, NC2 + 1):
        cell = ws.cell(row=rr, column=cc)
        cell.border = BOX
        if cc <= 3 and not (rr <= 5):
            cell.font = font(10)
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        if cc == 2:
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[rr].height = 20
ws.freeze_panes = "D2"

# 图例
lg = r_end2 + 2
ws.cell(row=lg, column=1, value="图例").font = font(10, True)
legend = [("阶段区间", XL_BAR_PHASE), ("功能研发", XL_BAR), ("分析与评价类功能", XL_BAR_TEST)]
for i, (label, color) in enumerate(legend):
    rr = lg + i
    c = ws.cell(row=rr, column=3, value="■")
    c.fill = PatternFill("solid", fgColor=color)
    c.font = font(9, False, "FFFFFFFF" if color == XL_BAR_PHASE else "FF375623")
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.merge_cells(start_row=rr, start_column=4, end_row=rr, end_column=8)
    ws.cell(row=rr, column=4, value=label).font = font(10)
    ws.cell(row=rr, column=4).alignment = Alignment(horizontal="left", vertical="center")

# ---- 每周负荷（按 04 表人日在「开始周–结束周」内均摊）----
CAPW = [("后端", "I", 4, 20), ("前端", "J", 2, 10), ("测试", "K", 1, 5)]
lr = lg + len(legend) + 1
ws.merge_cells(start_row=lr, start_column=1, end_row=lr, end_column=NC2)
c = ws.cell(row=lr, column=1, value="每周负荷（人日，按各功能人日在所属周次内均摊；容量 = 后端 4×5 / 前端 2×5 / 测试 1×5）")
c.font = font(10, True, "FFFFFFFF")
c.fill = PatternFill("solid", fgColor=XL_DARK)
c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
ws.row_dimensions[lr].height = 22

loads = {}
for k, (label, col, head, cap) in enumerate(CAPW):
    rr = lr + k + 1
    loads[label] = [0.0] * (len(weeks) + 1)
    for f in funcs:
        s, e, days = f[5], f[6], f[{"I": 7, "J": 8, "K": 9}[col]]
        if not days:
            continue
        n = e - s + 1
        for wk in range(s, e + 1):
            loads[label][wk] += days / n
    ws.merge_cells(start_row=rr, start_column=1, end_row=rr, end_column=2)
    ws.cell(row=rr, column=1, value=label).font = font(10, True)
    ws.cell(row=rr, column=1).alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.cell(row=rr, column=3, value=f"容量 {cap}").font = font(9, False, XL_DARK)
    ws.cell(row=rr, column=3).alignment = Alignment(horizontal="center", vertical="center")
    for i, wk in enumerate(range(1, len(weeks) + 1)):
        cell = ws.cell(row=rr, column=4 + i, value=round(loads[label][wk], 1))
        cell.number_format = "0.0"
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = BOX
        if loads[label][wk] > cap + 1e-9:
            cell.fill = PatternFill("solid", fgColor=XL_RED_BG)
            cell.font = font(9, True, XL_RED_TEXT)
        else:
            cell.fill = PatternFill("solid", fgColor=XL_LIGHT)
            cell.font = font(9)
    ws.cell(row=rr, column=3).border = BOX
    ws.cell(row=rr, column=1).border = BOX
    ws.row_dimensions[rr].height = 20

peak = max(loads["后端"])
pct = int(round(peak / 20 * 100 + 1e-9))
lw = lr + len(CAPW) + 2
ws.merge_cells(start_row=lw, start_column=1, end_row=lw, end_column=NC2)
_ws_be = sum(f[7] for f in funcs)
_ws_fe = sum(f[8] for f in funcs)
_ws_qa = sum(f[9] for f in funcs)
_peak_w = max(range(1, len(weeks) + 1), key=lambda w: loads["后端"][w])
_peak_f = max(loads["前端"])
_peak_q = max(loads["测试"])
c = ws.cell(row=lw, column=1, value=(
    f"读法：红底 = 该周需求超过容量（后端 20 / 前端 10 / 测试 5 人日每周）。"
    f"后端全周期 {_ws_be} / 160（{_ws_be/160:.0%}），峰周 W{_peak_w} {peak:.1f} 人日（{pct}%）；"
    f"前端 {_ws_fe} / 80（{_ws_fe/80:.0%}），峰周 {_peak_f:.1f}；"
    f"测试 {_ws_qa} / 40（{_ws_qa/40:.0%}），峰周 {_peak_q:.1f}。"
    "范围全锁定不挪功能；补足方案见「01_计划总览」第五节，定案前不得按此表开工。"
))
c.font = font(9, False, XL_DARK)
c.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
ws.row_dimensions[lw].height = 52

# =====================================================================
# 05_风险与需求变更
# =====================================================================
ws = wb.create_sheet(S4)
ws.sheet_view.showGridLines = False
widths(ws, {"A": 9, "B": 30, "C": 34, "D": 9, "E": 12, "F": 42, "G": 30, "H": 26, "I": 10, "J": 16})
NC5 = 10

# ---- 区块一：风险清单 ----
section(ws, 1, "一、风险清单（11 项，按影响与概率排序；每周复盘只看「应对措施」与「触发信号」两列）", NC5)
hdr_r = ["序号", "风险", "影响", "概率", "责任方", "应对措施", "触发信号（何时启动预案）"]
for i, h in enumerate(hdr_r, start=1):
    ws.cell(row=2, column=i, value=h)
header_row(ws, 2, 7, 30)

risks = [
    ("7 人 8 周容量被 40 行范围突破 46 人日，补足方案未定",
     "后端 183/160、前端 99/80、测试 44/40 三角色全超载；任一请假或返工直接破期，且不许砍功能",
     "高", "产品负责人 + 研发负责人",
     "第 1 周内在「增派 1 后端 + 1 前端（推荐）/ 延至 10 周 / 签字加班预案」三选一，未定案不开工；周会只看累计完成人日 vs 计划；前端缺口不得靠压缩 UI 设计消化",
     "第 1 周末仍未定补足方案，或第 2 周累计完成率 <90%"),
    ("40 行任务挤在 8 周，阶段四 12 行压在 W7–W8",
     "碳标签、驾驶舱、碳基线库与报告编制同周收口，任一项延期直接压到回归与发版窗口",
     "高", "产品负责人",
     "阶段四按「报告编制 > 碳足迹核算闭环 > 碳标签 > 数据驾驶舱 > 数据质量评价 > 敏感性分析 > 工作台 > 交付收口」确定并行顺序与人力抢占次序，不是裁剪顺序；每项完成标准可单独验收；交付收口人日不足时从 W8 测试窗口吸收，不外借到功能开发",
     "第 6 周末核算主链路未通过熊宝断言，或第 7 周末阶段四完成不足 50%"),
    ("模块编码改造牵动阶段库、种子与历史结果",
     "改造期口径混乱，回归量翻倍，报告口径反复",
     "高", "后端 + 产品",
     "作为独立任务在第 3 周单独合并，历史数据只加映射不改原值；合并当天冻结阶段表",
     "第 3 周末阶段表变更未合并主干"),
    ("需求变更不走评审直接进开发",
     "排期失效、人日失控，甘特与实际脱节",
     "高", "研发负责人",
     "变更一律先登记本表「二、需求变更登记」，影响 >3 人日或跨阶段的须评审通过后才排期；未登记的变更不进迭代",
     "出现未登记 CR 编号的排期调整"),
    ("核算引擎单点依赖：四分量、归一化、分配只有一人熟",
     "人员变动直接导致引擎停摆，无人可维护",
     "中", "后端负责人",
     "引擎配对开发；19 项断言脚本作为知识载体；第 6 周交叉走读，第二人能独立改引擎",
     "第 6 周仍无第二人能独立提交引擎改动"),
    ("原型 mock 数据模型与真实数据模型不一致",
     "契约反复变更，前端联调返工",
     "中", "后端 + 前端",
     "第 1 周冻结契约（含字段字典与错误码）；字段增删须产品与研发双方签字",
     "契约冻结后单周变更 >3 处"),
    ("背景因子库（ecoinvent / CLCD / 省级电网）商用授权未定",
     "因子数据无法合法入库，报告不能对外出，商务成本未知",
     "中", "产品 + 商务",
     "本期用内部因子库 + 公开因子跑通链路与验收；授权谈判与商务并行",
     "第 4 周未签约，即按内部因子库定稿验收口径"),
    ("报告模板未定稿",
     "报告编制模块成为发版阻塞项",
     "中", "产品",
     "第 4 周前交付模板 docx；系统先按占位符骨架实现，模板到位只调占位符不改代码",
     "第 5 周未提供模板，报告先出骨架版 docx，模板到位后 3 个工作日内换版重出，功能不降级"),
    ("私有化交付形态未定（是否必装 MinIO）",
     "若要求离线交付，部署与存储适配需额外投入，本期未含安装包",
     "低", "研发负责人",
     "保持容器化，MinIO 与 COS 双适配；本期不做安装包与离线部署，需求变化走 CR 登记",
     "销售侧承诺离线部署，或客户要求现场安装"),
    ("新增 6 项能力缺原型与字段口径，边做边定",
     "数据集上报审核、碳基线库、碳标签、驾驶舱只有范围描述，没有高保真页面与字段字典，返工集中在 W5–W8",
     "高", "产品 + 设计",
     "由 UI 设计行在前 4 周输出 6 项能力的标注页面与字段字典，第 4 周冻结口径；冻结后字段增删改走 CR、不口头改；每项完成标准先评审再开发",
     "第 4 周末任一新增能力未完成页面标注或字段口径未冻结"),
    ("数据集发布与碳标签对外口径缺合规评审",
     "发布到公共数据库的数据集、扫码可见的碳标签数值若未经合规确认，对内使用即形成错误口径外溢",
     "中", "产品 + 双碳专家",
     "本期公共数据与碳标签均标「内部试用 / 非正式对外」与版本号；发布与核验口径第 6 周前经双碳专家签字；对外使用前另走评审",
     "第 6 周仍未拿到口径签字，或出现对外转发而未带声明版本"),
]
r = 3
for idx, (name, impact, prob, owner, action, signal) in enumerate(risks, start=1):
    ws.cell(row=r, column=1, value=idx)
    ws.cell(row=r, column=2, value=name)
    ws.cell(row=r, column=3, value=impact)
    ws.cell(row=r, column=4, value=prob)
    ws.cell(row=r, column=5, value=owner)
    ws.cell(row=r, column=6, value=action)
    ws.cell(row=r, column=7, value=signal)
    r += 1
r_end_r = r - 1
body(ws, 3, r_end_r, 7, wrap=(2, 3, 6, 7), center=(1, 4, 5))
ws.conditional_formatting.add(f"D3:D{r_end_r}", CellIsRule(operator="equal", formula=['"高"'],
    fill=PatternFill("solid", fgColor=XL_RED_BG), font=font(10, True, XL_RED_TEXT)))
ws.conditional_formatting.add(f"D3:D{r_end_r}", CellIsRule(operator="equal", formula=['"中"'],
    fill=PatternFill("solid", fgColor=XL_YEL_BG), font=font(10, False, XL_YEL_TEXT)))
ws.auto_filter.ref = f"A2:G{r_end_r}"
auto_h(ws, 3, r_end_r, {"B": 30, "C": 34, "F": 42, "G": 30})

# ---- 区块二：需求变更登记 ----
cr_title = r_end_r + 2
section(ws, cr_title, "二、需求变更登记（CR）——批准后必须回写「04_研发排期」人日与周次，甘特图随之更新", NC5)
hdr_c = ["变更编号", "变更事项", "变更内容与原因", "类型", "提出方",
         "影响评估（人日 / 周次 / 范围）", "处理结论", "决策人", "状态", "截止周"]
for i, h in enumerate(hdr_c, start=1):
    ws.cell(row=cr_title + 1, column=i, value=h)
header_row(ws, cr_title + 1, NC5, 32)

changes = [
    ("CR-01", "生命周期模块编码对齐 EN 15804", "现原型 5 个一级 + 10 个二级阶段（LC-01..15），无 A1–A5 / B1–B7 / C1–C4 编码且缺 A5；要求可按模块独立出数、报告按模块拆章", "口径", "必维评审 / 双碳专家",
     "阶段库 + 补 A5 + 结果按模块聚合：+6 人日，W3 可交付；若 W2 之后提出，阶段库与种子需返工：+10 人日、整体后延 1 周",
     "建议双轨：界面保留中文一级阶段，底层加模块编码字段，报告按模块出章", "产品负责人 + 双碳专家", "待评估", "W2"),
    ("CR-02", "生物碳四分量改为一行多因子", "C4 木材处置需「化石 + 生物碳」双因子；现单行只能绑 1 个因子，只能靠合并口径凑，无法分列展示与做对称性校验", "功能 / 口径", "双碳专家",
     "活动数据模型 + 录入界面 + 引擎取数改造：+8 人日（后 6 / 前 2），抵扣「碳足迹核算」部分工作量，W6 交付",
     "建议一行多因子，因子带「排放物类型」；结果按化石 / 生物源分列并提供净值口径", "产品 + 双碳专家", "待评估", "W2"),
    ("CR-03", "本期增加多级会签审核流", "功能清册未含审核流；现状态机 9 态但无审核态，报告由编制人自行「定稿」，结果不能对外使用", "范围", "产品",
     "单级审核 +8 人日（后 6 / 前 2），占 W7–W8，与已满的排期直接冲突；若再做多级会签再 +8 人日，等于把阶段四整体后延 1 周，或增派 1 名后端",
     "本期只做单级（提交 → 通过 / 驳回 + 意见）；多级会签不在本期 40 行内，若追加须另走 CR 并先回答人日来源——当前容量已超 46 人日，无法再吸收", "产品负责人", "待评估", "W3"),
    ("CR-04", "精度口径改为全程双精度、仅展示格式化", "现结果落库即四舍五入到 4 位，内部运算同样被截断，与「内部 ≥10 位」不符；行数放大后可能突破 ±0.0001 容差", "技术 / 口径", "必维评审",
     "引擎运算与存储类型调整：+3 人日（后 3），W6；验收方式改为「用原始精度回算」，测试脚本需同步改造",
     "建议采纳；展示层仍格式化到 4 位，报告中标注精度口径", "后端 + 双碳专家", "待评估", "W3"),
    ("CR-05", "新增 6 项必做能力 + UI 设计行",
     "用户追加行业数据集上报与审核、公共数据库、知识库、产品碳基线库、碳标签、数据驾驶舱为必做（原计划列为「本期不做」），并要求增加一行 UI 设计时间", "范围", "产品负责人",
     "+71 人日（后端 33 / 前端 29 / 测试 9，其中 UI 设计前端 8）；总量由 255 增至 326，超 7 人 8 周硬容量 46 人日；40 行全部压在 W1–W8，逐周峰值见甘特图负荷区",
     "纳入本期，不排第二阶段、不砍功能；第 1 周内须定补足方案（推荐增派 1 后端 + 1 前端至 9 人），UI 设计按前端兼任计、不另设岗位；未定案前不得按此表开工",
     "产品负责人 + 研发负责人", "已批准", "W1"),
]
r = cr_title + 2
for row in changes:
    for i, v in enumerate(row, start=1):
        ws.cell(row=r, column=i, value=v)
    r += 1
r_end_c = r - 1
body(ws, cr_title + 2, r_end_c, NC5, wrap=(2, 3, 6, 7), center=(1, 4, 5, 8, 9, 10))
for rr in range(cr_title + 2, r_end_c + 1):
    ws.cell(row=rr, column=1).font = font(10, True)
    for cc in range(1, NC5 + 1):
        ws.cell(row=rr, column=cc).fill = PatternFill("solid", fgColor="FFFFF7E6")

dv_state = DataValidation(type="list", formula1='"待评估,已批准,已拒绝,已实施"', allow_blank=True, showDropDown=False)
ws.add_data_validation(dv_state)
dv_state.add(f"I{cr_title + 2}:I{cr_title + 20}")
ws.conditional_formatting.add(f"I{cr_title + 2}:I{r_end_c}", CellIsRule(operator="equal", formula=['"已批准"'],
    fill=PatternFill("solid", fgColor=XL_GRN_BG), font=font(10, True, XL_GRN_TEXT)))
ws.conditional_formatting.add(f"I{cr_title + 2}:I{r_end_c}", CellIsRule(operator="equal", formula=['"已拒绝"'],
    fill=PatternFill("solid", fgColor="FFEDEDED"), font=font(10, False, "FF808080")))
ws.conditional_formatting.add(f"I{cr_title + 2}:I{r_end_c}", CellIsRule(operator="equal", formula=['"待评估"'],
    fill=PatternFill("solid", fgColor=XL_YEL_BG), font=font(10, False, XL_YEL_TEXT)))
auto_h(ws, cr_title + 2, r_end_c, {"B": 30, "C": 34, "F": 42, "G": 30, "H": 26})

# ---- 变更流程说明 ----
note_r = r_end_c + 2
ws.merge_cells(start_row=note_r, start_column=1, end_row=note_r, end_column=NC5)
c = ws.cell(row=note_r, column=1,
    value="变更流程：① 提出方在「二」登记，编号 CR-xx，填变更内容与原因 → ② 研发给出影响评估（人日 / 周次 / 影响范围） → ③ 决策人评审：影响 ≤3 人日且不跨阶段的，研发负责人可直接批；>3 人日或跨阶段的须产品 + 研发共同批准 → ④ 批准后回写「04_研发排期」对应功能的人日与周次，甘特图自动更新，并在本表「状态」改为已批准。未走完流程的变更不进入迭代。")
c.font = font(9, False, XL_DARK)
c.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
c.fill = PatternFill("solid", fgColor=XL_LIGHT)
ws.row_dimensions[note_r].height = 58

# ---- 文档属性 ----
wb.properties.title = "竹木碳足迹核算系统 研发计划"
wb.properties.creator = "产品部"
wb.properties.subject = "8 周研发计划（2026-11-16 起，对内生产版；清册 32 项 + 新增必做 6 项 + UI 设计 + 交付收口 = 40 行，326 人日超容量 46）"

order = [S0, S1, S2, S3, S4]
wb._sheets = [wb[n] for n in order]

wb.save(OUT)
print("saved:", OUT)
print("sheets:", wb.sheetnames)
print("funcs:", len(funcs),
      "| 后端", sum(f[7] for f in funcs),
      "| 前端", sum(f[8] for f in funcs),
      "| 测试", sum(f[9] for f in funcs))
print("phase count:", {p: sum(1 for f in funcs if f[4] == p) for p in (P1, P2, P3, P4)})
