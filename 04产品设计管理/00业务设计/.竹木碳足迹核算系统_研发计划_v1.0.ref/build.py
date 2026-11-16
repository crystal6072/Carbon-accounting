# -*- coding: utf-8 -*-
"""生成《竹木碳足迹核算系统 · 研发计划 v1.0》工作簿"""
try:
    import openpyxl
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "openpyxl>=3.1.0"])
    import openpyxl

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule

OUT = "/Users/crystal/Desktop/work/空天碳/02 核心业务整理/06竹木碳足迹核算系统/竹木原型/04产品设计管理/00业务设计/竹木碳足迹核算系统_研发计划_v1.0.xlsx"


def xl_color(css_hex: str) -> str:
    value = css_hex.removeprefix("#").upper()
    if len(value) != 6:
        raise ValueError(f"Expected #RRGGBB, got: {css_hex}")
    return "FF" + value


# ---- 配色：清新绿（项目 / 计划场景） ----
XL_HEADER = xl_color("#70AD47")
XL_HEADER_TEXT = xl_color("#FFFFFF")
XL_LIGHT = xl_color("#E2EFDA")
XL_DARK = xl_color("#548235")
XL_BORDER = xl_color("#BFBFBF")
XL_TITLE_TEXT = xl_color("#1F3B17")
XL_BAR = xl_color("#A9D08E")
XL_BAR_TEST = xl_color("#FFE699")
XL_RED_BG = xl_color("#FFC7CE")
XL_RED_TEXT = xl_color("#9C0006")
XL_YEL_BG = xl_color("#FFEB9C")
XL_YEL_TEXT = xl_color("#9C6500")
XL_GRN_BG = xl_color("#C6EFCE")
XL_GRN_TEXT = xl_color("#006100")

thin_side = Side(style="thin", color=XL_BORDER)

S0 = "00_计划总览"
S1 = "01_现状与差距"
S2 = "02_阶段里程碑"
S3 = "03_迭代任务清单"
S4 = "04_周排期甘特"
S5 = "05_技术方案"
S6 = "06_风险与依赖"
S7 = "07_验收用例"
S8 = "08_待决策事项"

FONT_NAME = "PingFang SC"


def font(size=10, bold=False, color=None):
    return Font(name=FONT_NAME, size=size, bold=bold, color=color or "FF1A1A1A")


def style_header_row(ws, row, ncols, height=32):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = PatternFill("solid", fgColor=XL_HEADER)
        cell.font = font(10, True, XL_HEADER_TEXT)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    ws.row_dimensions[row].height = height


def style_body(ws, first_row, last_row, ncols, wrap_cols=(), center_cols=()):
    for r in range(first_row, last_row + 1):
        for c in range(1, ncols + 1):
            cell = ws.cell(row=r, column=c)
            cell.font = font(10)
            cell.border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
            if c in center_cols:
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            elif c in wrap_cols:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)


def set_widths(ws, widths):
    for col, w in widths.items():
        ws.column_dimensions[col].width = w


def _visual_len(text):
    """中文按 2 个字符宽度计，英文数字按 1。"""
    return sum(2 if ord(ch) > 127 else 1 for ch in text)


def auto_row_heights(ws, first_row, last_row, widths_map, line_h=13.5, pad=5, cap=160):
    """按行内最长换行文本估算行高，避免长描述被裁切。"""
    for r in range(first_row, last_row + 1):
        lines = 1
        for col, w in widths_map.items():
            v = ws[f"{col}{r}"].value
            if isinstance(v, str) and not v.startswith("="):
                per_line = max(int(w), 4)
                lines = max(lines, -(-_visual_len(v) // per_line))
        ws.row_dimensions[r].height = min(cap, max(20, lines * line_h + pad))


def sheet_title(ws, text, ncols, row=1, size=14):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=ncols)
    cell = ws.cell(row=row, column=1, value=text)
    cell.font = font(size, True, XL_TITLE_TEXT)
    cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[row].height = 26


def section(ws, row, text, ncols):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=ncols)
    cell = ws.cell(row=row, column=1, value=text)
    cell.font = font(11, True, XL_DARK)
    cell.fill = PatternFill("solid", fgColor=XL_LIGHT)
    cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[row].height = 22


wb = Workbook()

# =====================================================================
# 00_计划总览
# =====================================================================
ws = wb.active
ws.title = S0
ws.sheet_view.showGridLines = False
set_widths(ws, {"A": 18, "B": 16, "C": 18, "D": 16, "E": 14, "F": 34})
NC0 = 6

sheet_title(ws, "竹木碳足迹核算系统 · 研发计划 v1.0", NC0, 1, 15)
ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=NC0)
c = ws.cell(row=2, column=1, value="编制日期 2026-11-16　｜　目标：8 周内交付可对内使用的生产版　｜　团队：前端 2 / 后端 4 / 测试 1")
c.font = font(10, False, XL_DARK)
c.alignment = Alignment(horizontal="left", vertical="center")
ws.row_dimensions[2].height = 20

section(ws, 4, "一、计划基本盘", NC0)
kv = [
    ("交付目标", "把现役高保真原型（38 个功能模块、核算主链路已跑通、熊宝真实案例 19 项断言全过）改造为真实后端的可对内使用生产版：核算在服务端重算，结果可追溯、可审核、可导出报告。"),
    ("计划周期", "2026-11-16 ~ 2027-01-10，共 8 周（第 9 周起为第二阶段，本表不占承诺）。"),
    ("团队配置", "前端 2 人、后端 4 人、测试 1 人；产品与双碳专家按需支持，不计入研发人日。"),
    ("本期必做", "核算主链路五步 + 基础库 7 类 + 因子库（版本 / 有效期 / 地区）+ 登录与数据权限 + 审核流与版本锁定 + 报告 docx 导出 + 凭证存储。"),
    ("本期不做", "行业数据集上报与审核、公共数据库、知识库、产品碳基线库、碳标签、数据驾驶舱、情景分析、产品横向对比。原型页面保留，排入第二阶段。"),
    ("交付判定", "熊宝重竹地板 28 条数据端到端跑通且 19 项断言无偏差；三条业务线（摇篮到大门 / 摇篮到坟墓 / 真实案例）全通；权限越权用例全部拦截；2000 条数据核算 ≤ 30 秒。"),
]
r = 5
ws.cell(row=r, column=1, value="项目")
ws.cell(row=r, column=2, value="内容")
ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=NC0)
style_header_row(ws, r, NC0, height=24)
for k, v in kv:
    r += 1
    ws.cell(row=r, column=1, value=k).font = font(10, True)
    ws.cell(row=r, column=1).alignment = Alignment(horizontal="left", vertical="top")
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=NC0)
    ws.cell(row=r, column=2, value=v)
    for cc in range(1, NC0 + 1):
        ws.cell(row=r, column=cc).border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    ws.cell(row=r, column=2).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    ws.row_dimensions[r].height = 46 if len(v) > 60 else 30

section(ws, 13, "二、人力预算与负荷（可用人日 = 人数 × 8 周 × 5 天；已排人日取自迭代任务清单）", NC0)
hdr = ["角色", "人数", "可用人日", "已排人日", "负荷率", "结论"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=14, column=i, value=h)
style_header_row(ws, 14, NC0, height=24)

roles = [("后端", 4, "H"), ("前端", 2, "G"), ("测试", 1, "I")]
r0 = 15
for i, (name, headcount, col) in enumerate(roles):
    r = r0 + i
    ws.cell(row=r, column=1, value=name)
    ws.cell(row=r, column=2, value=headcount)
    ws.cell(row=r, column=3, value=f"=B{r}*8*5")
    ws.cell(row=r, column=4, value=f"=SUM('{S3}'!${col}$2:${col}$200)")
    ws.cell(row=r, column=5, value=f'=IF(OR(C{r}="",C{r}=0),"",D{r}/C{r})')
    ws.cell(row=r, column=6, value=f'=IF(E{r}="","",IF(E{r}>0.95,"超载，须裁剪范围",IF(E{r}>0.85,"偏紧，留缓冲","负荷合理")))')
    ws.cell(row=r, column=5).number_format = "0.0%"
r_total = r0 + len(roles)
ws.cell(row=r_total, column=1, value="合计")
ws.cell(row=r_total, column=2, value=f"=SUM(B{r0}:B{r_total-1})")
ws.cell(row=r_total, column=3, value=f"=SUM(C{r0}:C{r_total-1})")
ws.cell(row=r_total, column=4, value=f"=SUM(D{r0}:D{r_total-1})")
ws.cell(row=r_total, column=5, value=f'=IF(OR(C{r_total}="",C{r_total}=0),"",D{r_total}/C{r_total})')
ws.cell(row=r_total, column=5).number_format = "0.0%"
ws.cell(row=r_total, column=6, value="总量够，但后端 8 周吃满；缓冲只有 10 人日")
style_body(ws, r0, r_total, NC0, wrap_cols=(6,), center_cols=(2,))
for cc in range(1, NC0 + 1):
    cell = ws.cell(row=r_total, column=cc)
    cell.font = font(10, True)
    cell.fill = PatternFill("solid", fgColor=XL_LIGHT)

ws.conditional_formatting.add(f"E{r0}:E{r_total-1}",
    CellIsRule(operator="greaterThan", formula=["0.95"], fill=PatternFill("solid", fgColor=XL_RED_BG), font=font(10, True, XL_RED_TEXT)))
ws.conditional_formatting.add(f"E{r0}:E{r_total-1}",
    CellIsRule(operator="between", formula=["0.85", "0.95"], fill=PatternFill("solid", fgColor=XL_YEL_BG), font=font(10, False, XL_YEL_TEXT)))

section(ws, 20, "三、里程碑一览（明细见「02_阶段里程碑」；阶段数据由该表联动）", NC0)
for i, h in enumerate(["阶段", "周期", "起止", "核心产出", "出口条件"], start=1):
    col = 1 if i == 1 else 2 if i == 2 else 3 if i == 3 else 4 if i == 4 else 6
    ws.cell(row=21, column=col, value=h)
ws.merge_cells(start_row=21, start_column=4, end_row=21, end_column=5)
style_header_row(ws, 21, NC0, height=24)

ms = [
    ("阶段一 地基与权限", "第 1–3 周", "11/16–12/06",
     "接口契约与字段字典、后端骨架与三环境、数据库与种子、登录与租户上下文、角色菜单与行级数据权限、前端请求层",
     "前端在真实接口下完成登录，菜单按角色下发，越权访问返回 403"),
    ("阶段二 主数据与因子", "第 3–5 周", "11/30–12/20",
     "基础库 7 类接口、生命周期模块编码（A1–C4 / 补 A5）、因子库（多库 / 版本 / 有效期 / 地区）、文件与凭证存储、前端联调",
     "后台维护的数据能实时进入前台表单下拉；模块编码可按 A1–C4 独立出数"),
    ("阶段三 核算主链路", "第 5–7 周", "12/14–01/03",
     "项目五步接口与状态机、计算引擎（模块聚合 / 四分量 / 三口径 / 精度 / 分配）、检测引擎、步骤①–⑤ 前端改造",
     "熊宝 28 条数据端到端跑通，19 项断言零偏差"),
    ("阶段四 闭环与发版", "第 7–8 周", "12/28–01/10",
     "审核流与版本锁定、报告模板装配与 docx 导出、导入导出与去重、审计日志、性能优化、全量回归",
     "三条业务线全通、权限与性能达标，可对内发版"),
]
r = 22
for name, period, dates, deliver, exit_ in ms:
    ws.cell(row=r, column=1, value=name)
    ws.cell(row=r, column=2, value=period)
    ws.cell(row=r, column=3, value=dates)
    ws.cell(row=r, column=4, value=deliver)
    ws.merge_cells(start_row=r, start_column=4, end_row=r, end_column=5)
    ws.cell(row=r, column=6, value=exit_)
    r += 1
style_body(ws, 22, 25, NC0, wrap_cols=(1, 4, 6), center_cols=(2, 3))

section(ws, 27, "四、计划红线（违反任一条，工期即失控）", NC0)
redlines = [
    "红线一：接口契约第 1 周冻结。之后字段新增或改名须产品与研发双方签字，否则前端联调必然返工。",
    "红线二：计算引擎每次改动先跑熊宝 19 项断言，不通过不得合入主干；断言脚本是引擎的知识载体，不只当测试用。",
    "红线三：后端 8 周负荷 94%，缓冲仅 10 人日。第 4 周复盘时若累计完成率低于 90%，立即裁剪「审计日志」与「导入导出」（合计 10 人日）。",
    "红线四：生命周期模块编码与生物碳口径必须在第 2 周内冻结，晚于第 2 周，阶段库、种子数据、结果口径将全部返工。",
]
r = 28
for t in redlines:
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=NC0)
    cell = ws.cell(row=r, column=1, value=t)
    cell.font = font(10)
    cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    cell.border = Border(bottom=thin_side)
    ws.row_dimensions[r].height = 28
    r += 1

# =====================================================================
# 01_现状与差距
# =====================================================================
ws = wb.create_sheet(S1)
set_widths(ws, {"A": 16, "B": 44, "C": 42, "D": 30, "E": 13, "F": 10})
NC1 = 6
hdr = ["能力域", "原型现状（可演示）", "生产化差距", "处理动作", "归属阶段", "风险等级"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
style_header_row(ws, 1, NC1, height=26)

gaps = [
    ("部署形态", "纯前端原型，Vite 构建后静态托管在腾讯云，业务数据存在浏览器内存与 mock 种子文件里。",
     "无后端服务、无数据库、无并发与多实例；刷新或换设备即丢数据，多人无法协同。",
     "后端服务化 + MySQL + 对象存储，前端仅替换数据层。", "阶段一", "高"),
    ("认证与权限", "登录页为模拟校验；菜单按角色在路由层静态过滤，租户与平台角色已在菜单树里标注归属端。",
     "无真实会话与令牌；无行级数据权限；平台运营人员可见范围未在数据层隔离。",
     "登录令牌 + 租户上下文 + 五档数据范围过滤，权限在服务端判定。", "阶段一", "高"),
    ("生命周期模块口径", "5 个一级阶段 + 10 个二级阶段（LC-01..15），无 EN 15804 的 A1–A5 / B1–B7 / C1–C4 编码，且缺 A5 阶段。",
     "无法输出 A1–A3 / A1–A4 / A1–A5 / A1–C4 模块结果；A2、A5、C2、C4 被并入相邻阶段，不能独立成列，报告无法按模块拆章。",
     "阶段表增加模块编码字段并补 A5，结果按模块聚合；历史数据只加映射不改原值。", "阶段二", "高"),
    ("归一化口径", "引擎能算 kg 与 m² 两种口径，但步骤①已移除净重与换算系数录入，结果页不展示。",
     "产品上不可达：面积没有结构化来源，用户只能线下折算；除零未处理。",
     "步骤①补单件净重与长宽（自动算面积），结果三口径（块 / kg / m²）并存。", "阶段三", "高"),
    ("数据可追溯", "活动数据只有活动量、单位、排放因子三要素；备注是自由文本。",
     "缺因子来源（数据库 / 实测 / 经验）、数据质量等级、凭证 ID、分配方法、因子版本与有效期、地区电力属性——第三方视角下不可追溯。",
     "活动数据模型补 6 个可追溯字段，界面可填、结果可导出。", "阶段三", "高"),
    ("生物碳", "已支持四分量（总量 / 化石 / 生物源 / 土地利用）与结果口径切换，熊宝案例净值 0.3522 可复现。",
     "单行只能绑 1 个因子；C4 木材处置的「化石 + 生物碳」双因子只能靠因子合并口径凑，无法分列展示与校验对称性。",
     "活动数据支持一行多因子（或化石 / 生物源分行），结果可分列。", "阶段三", "中"),
    ("计算精度", "结果落库即四舍五入到 4 位小数，内部运算同样被截断。",
     "与「内部 ≥10 位、仅展示 4 位」不符；行数与系数放大后可能突破 ±0.0001 容差。",
     "全程保留双精度，只在展示层格式化；验收一律用原始精度回算。", "阶段三", "高"),
    ("分配", "分配比例可录入并通过校验，但不参与求值。",
     "质量 / 经济 / 能量分配无法落地，也无法在结果与报告中留痕。",
     "分配系数接入计算链路，结果中输出「原始量 → 分配量」两列。", "阶段三", "中"),
    ("检测与校验", "覆盖 5 类阻断：活动量缺失、因子缺失、单位不匹配、阶段未覆盖、分配不闭合，均可定位到具体行。",
     "质量平衡校验只定义了类别未实现；复合单位（kg·km）不解析；重复明细无去重。",
     "补质量平衡、量纲换算、重复行识别与合并确认。", "阶段三", "中"),
    ("审核与版本", "状态机 9 态，报告由编制人自行「确认完成」，没有审核态。",
     "无提交审核 / 审核中 / 驳回；无版本锁定，改动后旧结果不可对比。",
     "增加审核态、版本锁定、新版本重算并保留旧版本。", "阶段四", "高"),
    ("报告", "报告正文文案写死在代码里，导出是把 HTML 改后缀为 .doc。",
     "无模板装配、无图表、无版本；不能直接对外使用。",
     "模板占位符装配 + docx 生成 + 报告版本。", "阶段四", "高"),
    ("导入导出", "CSV 模板只有名称 / 类型 / 用量 / 单位 / 排放物类型五列。",
     "无因子、流向、生物碳、数据质量、凭证列；28 条真实案例无法一次性规范导入。",
     "模板补齐字段 + 异步导入任务 + 重复明细去重确认。", "阶段三", "中"),
    ("文件与凭证", "存储配置页是演示实现，未真实对接对象存储。",
     "凭证无法留存，引用锁版本与访问鉴权均未实现，报告无法附证。",
     "对象存储 + 引用锁版本 + 访问鉴权，凭证与业务单据双向可查。", "阶段二", "中"),
    ("分析能力", "无情景分析、热点 Top N、产品与供应商横向对比。",
     "报告与决策支撑缺失，核算结果只能看单一产品。",
     "本期不做，排入第二阶段（与数据驾驶舱同期）。", "后续", "低"),
    ("已建成但本期不投产", "租户管理、数据集上报与审核、行业数据集、知识库、产品碳基线库、碳标签、数据驾驶舱均有高保真页面与完整 PRD。",
     "均为前端原型，本期不进入生产化范围。",
     "原型保留作为演示与验收材料；第二阶段按业务优先级逐个投产。", "后续", "中"),
]
r = 2
for row in gaps:
    for i, v in enumerate(row, start=1):
        ws.cell(row=r, column=i, value=v)
    r += 1
style_body(ws, 2, r - 1, NC1, wrap_cols=(2, 3, 4), center_cols=(1, 5, 6))
ws.freeze_panes = "B2"
ws.auto_filter.ref = f"A1:F{r-1}"
ws.conditional_formatting.add(f"F2:F{r-1}",
    CellIsRule(operator="equal", formula=['"高"'], fill=PatternFill("solid", fgColor=XL_RED_BG), font=font(10, True, XL_RED_TEXT)))
ws.conditional_formatting.add(f"F2:F{r-1}",
    CellIsRule(operator="equal", formula=['"中"'], fill=PatternFill("solid", fgColor=XL_YEL_BG), font=font(10, False, XL_YEL_TEXT)))

# =====================================================================
# 02_阶段里程碑
# =====================================================================
ws = wb.create_sheet(S2)
set_widths(ws, {"A": 18, "B": 13, "C": 15, "D": 40, "E": 42, "F": 40, "G": 11, "H": 11, "I": 11, "J": 11})
NC2 = 10
hdr = ["阶段", "周期", "起止", "阶段目标", "关键交付物", "退出条件（验收口径）", "后端人日", "前端人日", "测试人日", "合计人日"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
style_header_row(ws, 1, NC2, height=32)

phases = [
    ("阶段一 地基与权限", "第 1–3 周", "11/16–12/06",
     "打通真实后端与登录鉴权，把原型数据层整体换成真实接口。",
     "接口契约与字段字典、后端骨架与三环境、数据库与基础种子、登录与租户上下文、角色菜单与行级数据权限、前端请求层与路由守卫。",
     "前端在真实接口下完成登录，菜单按角色下发；跨租户与越权访问被服务端拒绝。"),
    ("阶段二 主数据与因子", "第 3–5 周", "11/30–12/20",
     "基础库与因子库生产化，生命周期阶段补模块编码，凭证可真实留存。",
     "物料 / 能源 / 行业 / 单位 / 阶段 / 产品 / 工艺 / 工序八类接口、模块编码改造（含补 A5）、因子库（多库 / 版本 / 有效期 / 地区）、文件与凭证存储、前端联调。",
     "后台维护的数据实时进入前台表单下拉；阶段可按 A1–C4 模块独立出数；凭证上传后可被业务单据引用。"),
    ("阶段三 核算主链路", "第 5–7 周", "12/14–01/03",
     "五步核算跑在服务端，引擎可出模块化、双口径、三归一化结果。",
     "项目五步接口与状态机、计算引擎（模块聚合 / 四分量 / 三口径 / 精度 / 分配）、检测引擎（含质量平衡与量纲）、步骤①–⑤ 前端改造、导入向导。",
     "熊宝 28 条数据端到端跑通，19 项断言零偏差；三项校验（单位不匹配、负数未填流向、重复导入）均可拦截。"),
    ("阶段四 闭环与发版", "第 7–8 周", "12/28–01/10",
     "补齐审核、报告、导入导出，通过性能与安全验收后对内发版。",
     "审核流与版本锁定、报告模板装配与 docx 导出、导入导出与去重、审计日志、性能优化、全量回归与测试报告。",
     "三条业务线全通；2000 条数据核算 ≤30 秒、导入 ≤60 秒；越权用例全拦截；可对内发版。"),
]
r = 2
for row in phases:
    for i, v in enumerate(row, start=1):
        ws.cell(row=r, column=i, value=v)
    ws.cell(row=r, column=7, value=f"=SUMIFS('{S3}'!$H$2:$H$200,'{S3}'!$B$2:$B$200,$A{r})")
    ws.cell(row=r, column=8, value=f"=SUMIFS('{S3}'!$G$2:$G$200,'{S3}'!$B$2:$B$200,$A{r})")
    ws.cell(row=r, column=9, value=f"=SUMIFS('{S3}'!$I$2:$I$200,'{S3}'!$B$2:$B$200,$A{r})")
    ws.cell(row=r, column=10, value=f"=SUM(G{r}:I{r})")
    r += 1
r_tot = r
ws.cell(row=r_tot, column=1, value="合计")
ws.cell(row=r_tot, column=2, value="8 周")
ws.cell(row=r_tot, column=3, value="11/16–01/10")
ws.merge_cells(start_row=r_tot, start_column=4, end_row=r_tot, end_column=6)
ws.cell(row=r_tot, column=4, value="阶段之间有 1 周重叠（并行推进），合计周数不是简单相加")
for col in ("G", "H", "I", "J"):
    ws[f"{col}{r_tot}"] = f"=SUM({col}2:{col}{r_tot-1})"
style_body(ws, 2, r_tot, NC2, wrap_cols=(1, 4, 5, 6), center_cols=(2, 3, 7, 8, 9, 10))
for cc in range(1, NC2 + 1):
    cell = ws.cell(row=r_tot, column=cc)
    cell.font = font(10, True)
    cell.fill = PatternFill("solid", fgColor=XL_LIGHT)
ws.freeze_panes = "B2"

note_r = r_tot + 2
ws.merge_cells(start_row=note_r, start_column=1, end_row=note_r, end_column=NC2)
ws.cell(row=note_r, column=1, value="口径说明：人日按「1 人 1 天」计，已扣减约 10% 的会议与联调损耗；阶段三与阶段四各有一周重叠，用于后端先交付接口、前端同期联调。第 9 周起进入第二阶段（核查级能力与业务扩展），不在本计划承诺范围内。")
ws.cell(row=note_r, column=1).font = font(9, False, XL_DARK)
ws.cell(row=note_r, column=1).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
ws.row_dimensions[note_r].height = 36

# =====================================================================
# 03_迭代任务清单
# =====================================================================
ws = wb.create_sheet(S3)
set_widths(ws, {"A": 6, "B": 16, "C": 12, "D": 30, "E": 42, "F": 8,
                "G": 9, "H": 9, "I": 9, "J": 9, "K": 8, "L": 8, "M": 8,
                "N": 8, "O": 40, "P": 10, "Q": 10})
NC3 = 17
hdr = ["序号", "所属阶段", "功能域", "任务", "交付内容（可验收）", "主责",
       "前端人日", "后端人日", "测试人日", "合计人日", "开始周", "结束周", "工期周",
       "优先级", "验收标准", "前置依赖", "状态"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
style_header_row(ws, 1, NC3, height=34)

P1 = "阶段一 地基与权限"
P2 = "阶段二 主数据与因子"
P3 = "阶段三 核算主链路"
P4 = "阶段四 闭环与发版"

tasks = [
    # (阶段, 功能域, 任务, 交付内容, 主责, 前端, 后端, 测试, 开始周, 结束周, 优先级, 验收标准, 前置依赖)
    (P1, "工程地基", "接口契约与字段字典冻结", "把原型 mock 服务层 180 余个函数整理为接口清单、字段字典与错误码表，输出 OpenAPI 文档", "后端", 0, 6, 0, 1, 1, "高", "每个接口的入参出参与原型返回类型一一对应；前端可据此改造请求层", "无"),
    (P1, "工程地基", "后端工程骨架与三套环境", "Spring Boot 3 多模块骨架、dev/test/prod 配置、CI/CD 流水线、日志与链路追踪", "后端", 0, 8, 0, 1, 2, "高", "一条命令部署到测试环境，健康检查与日志可查", "接口契约"),
    (P1, "工程地基", "数据库设计与基础种子", "约 40 张表的 DDL、可重复执行的迁移脚本、行业 / 单位 / 阶段 / 标准的种子数据", "后端", 0, 10, 0, 1, 2, "高", "迁移脚本在新库重复执行结果一致；种子与原型字典逐项对齐", "接口契约"),
    (P1, "认证与权限", "登录、会话与租户上下文", "账号密码登录、令牌刷新、租户与组织上下文注入、密码策略与登录失败锁定", "后端", 0, 6, 0, 2, 2, "高", "登录态跨页面保持；无令牌访问返回 401，跨租户访问返回 403", "工程骨架"),
    (P1, "认证与权限", "角色、菜单与行级数据权限", "平台角色与租户角色隔离、菜单按角色下发、五档数据可见范围在服务端过滤", "后端", 0, 8, 0, 2, 3, "高", "同一份数据在不同角色下可见范围符合权限矩阵；平台运营默认看不到租户业务数据", "登录与租户上下文"),
    (P1, "前端接入", "请求层改造与登录联调", "axios 封装替换 mock 调用、环境开关、统一错误提示、登录页与路由守卫", "前端", 5, 0, 0, 2, 2, "高", "一套代码可通过环境变量在 mock 与真实接口间切换；未登录自动跳登录页", "接口契约"),
    (P1, "前端接入", "动态菜单与路由守卫", "菜单由服务端按角色返回，路由级与按钮级权限控制，无权限时整组隐藏", "前端", 4, 0, 0, 3, 3, "高", "换一个角色登录，菜单与页面按钮同步变化，不出现空白分组", "角色菜单与权限"),
    (P2, "基础库", "物料 / 能源 / 行业 / 单位接口化", "四类主数据的增删改查、启停、批量操作、引用反查；单位基准中转换算与引用二次确认", "后端", 0, 12, 0, 3, 4, "高", "接口能力覆盖原型页面全部操作；被引用单位改系数需二次确认并留痕", "数据库与种子"),
    (P2, "基础库", "生命周期阶段接口化与模块编码改造", "阶段增删改查 + 模块编码字段（A1–A5 / B1–B7 / C1–C4）+ 补 A5 阶段 + 三态纳入规则", "后端", 0, 6, 0, 3, 3, "高", "每个阶段可映射唯一模块编码；按 A1–C4 可独立汇总；老数据映射不丢", "数据库与种子"),
    (P2, "基础库", "产品 / 工艺 / 工序接口化", "产品版本、工艺路线、工序投入产出、同阶段只绑一个工艺的组合校验", "后端", 0, 8, 0, 4, 4, "高", "组合校验在后端生效；前台自建与引用平台产品均可发起核算", "生命周期阶段接口化"),
    (P2, "因子库", "因子库接口化（多库 / 版本 / 有效期 / 地区）", "多因子库、库级版本与发布、因子有效期、地区电力属性、收藏与私有因子", "后端", 0, 12, 0, 4, 5, "高", "因子带版本与有效期，过期因子在匹配时被过滤；已被核算引用的因子冻结快照", "基础库接口化"),
    (P2, "文件凭证", "文件与凭证存储", "对象存储对接、上传策略、引用锁版本、删除护栏、访问鉴权", "后端", 0, 6, 0, 4, 4, "中", "业务单据引用的文件不可直接删除；越权下载被拒绝", "工程骨架"),
    (P2, "基础库", "基础库前端联调（五模块）", "物料库、能源库、计量单位库、行业库、生命周期阶段的列表 / 详情 / 表单联调", "前端", 8, 0, 0, 3, 4, "高", "五个模块在真实接口下功能与原型一致，下拉数据来自接口而非静态常量", "物料能源行业单位接口化"),
    (P2, "基础库", "产品 / 工艺 / 工序前端联调", "产品信息库、工艺流程（节点画布）、工序三套页面对接真实接口", "前端", 6, 0, 0, 4, 5, "高", "工艺画布拖拽排序与三道校验在真实数据下仍生效", "产品工艺工序接口化"),
    (P2, "因子库", "因子库与文件库前端联调", "背景数据库、我的因子库、文件库三个模块对接", "前端", 5, 0, 0, 5, 5, "中", "收藏、私有因子新增、文件引用选择均可用", "因子库接口化"),
    (P2, "工作台", "工作台真实统计", "待计算 / 已计算计数、最近核算结果与阶段构成、待办入口改为接口聚合", "前端", 3, 0, 0, 4, 4, "中", "统计数字与各列表页条数一致，不再硬编码", "核算项目接口"),
    (P3, "核算项目", "项目五步接口与状态机", "目标与范围、模型与数据、数据检测、核算、结果五步接口；状态机含审核态；版本与重算", "后端", 0, 12, 0, 5, 6, "高", "状态按矩阵流转，非法跳转被拒；改动已锁定项目会生成新版本", "产品工艺工序接口化"),
    (P3, "计算引擎", "计算引擎服务端化", "模块编码聚合、生物碳四分量、块 / kg / m² 三口径、高精度运算、分配系数接入、单行多因子", "后端", 0, 16, 0, 5, 6, "高", "熊宝 19 项断言零偏差；内部精度 ≥10 位，展示层才取 4 位；除零不出错值", "项目五步接口"),
    (P3, "检测引擎", "检测引擎与质量平衡", "六类规则（活动量缺失、因子缺失、单位不匹配、阶段未覆盖、分配不闭合、质量平衡）+ 量纲换算 + 问题定位", "后端", 0, 10, 0, 6, 6, "高", "每个问题带行级定位与跳转步骤；质量平衡超阈值可阻断报告", "计算引擎"),
    (P3, "导入导出", "异步导入/导出与重复明细去重", "模板补齐因子、流向、生物碳、数据质量、凭证列；异步任务与进度；重复行识别", "后端", 0, 6, 0, 6, 7, "中", "2000 条导入 ≤60 秒；重复行给出提示并可确认合并", "数据库与种子"),
    (P3, "核算项目", "步骤①目标与范围改造", "补单件净重与长宽（自动算面积）、边界与模块口径选择、可选阶段默认不勾", "前端", 5, 0, 0, 5, 5, "高", "面积自动算出且可改；无匹配工艺的阶段默认不勾并提示", "项目五步接口"),
    (P3, "核算项目", "步骤②模型与数据改造", "多因子绑定、流向 + 原因 + 凭证强制项、六个可追溯字段、校准项独立区块", "前端", 8, 0, 0, 6, 6, "高", "负数活动量未填流向与原因无法保存；校准项必须填审批信息", "检测引擎"),
    (P3, "核算项目", "步骤③检测问题清单", "按阻断 / 提示分级展示，问题可定位到具体行并跳转修复", "前端", 4, 0, 0, 6, 6, "中", "点击问题直接跳到出错行并高亮", "检测引擎"),
    (P3, "核算项目", "步骤④⑤结果展示与口径切换", "模块化结果（A1–A3 / A1–A4 / A1–A5 / A1–C4）、三口径切换、阶段贡献、热点降序", "前端", 6, 0, 0, 6, 7, "高", "四个模块边界与三口径同时可见；热点前两位与案例一致", "计算引擎"),
    (P3, "核算项目", "导入向导", "模板下载、字段校验预览、错误行提示、重复行确认合并", "前端", 4, 0, 0, 7, 7, "中", "错误行逐行提示；确认后仅导入有效行", "异步导入导出"),
    (P3, "测试", "主链路联调与走查基线回归", "五步链路联调、原型期 39 项走查断言在真实后端下复跑", "测试", 0, 0, 4, 6, 6, "高", "39 项基线断言全部通过或明确标注不适用", "项目五步接口"),
    (P3, "测试", "熊宝真实案例回归", "28 条活动数据通过界面与导入两条路径进入，比对 19 项断言", "测试", 0, 0, 4, 6, 7, "高", "两条路径结果一致，误差在 ±0.0001 内", "计算引擎"),
    (P4, "审核流程", "审核流与版本锁定", "提交审核、审核中、通过 / 驳回（含意见）、版本锁定、基于旧版本创建修订版", "后端", 0, 8, 0, 7, 7, "高", "驳回退回可改；锁定后改数据必生成新版本，旧结果可查", "项目五步接口"),
    (P4, "报告", "报告模板装配与 docx 生成", "占位符模板装配、章节按数据生成、图表渲染、报告版本", "后端", 0, 8, 0, 7, 8, "高", "导出的 docx 可直接编辑；数值与页面结果一致；支持历史版本对比", "审核流与版本锁定"),
    (P4, "审计", "审计日志与操作留痕", "关键操作的统一日志切面：谁、何时、对哪条数据、改了什么", "后端", 0, 4, 0, 7, 7, "中", "核算、审核、权限变更、删除操作全留痕且不可改", "角色菜单与权限"),
    (P4, "性能", "性能优化与压测配合", "核算任务与列表查询优化、索引补齐、大结果集分页", "后端", 0, 4, 0, 8, 8, "中", "2000 条活动数据核算 ≤30 秒；列表查询 ≤2 秒", "计算引擎"),
    (P4, "报告", "报告编制与预览前端", "报告信息填写、封面与概况维护、在线预览、导出", "前端", 5, 0, 0, 7, 8, "高", "预览与导出内容一致；必填缺失时不可导出", "报告模板装配"),
    (P4, "审核流程", "审核流前端", "提交审核、待办列表、审核意见、版本对比", "前端", 4, 0, 0, 7, 8, "高", "审核人可看到与提交版本的差异点", "审核流与版本锁定"),
    (P4, "文件凭证", "凭证上传与引用组件", "拖拽上传、预览、与业务单据绑定、引用状态提示", "前端", 3, 0, 0, 7, 7, "中", "同一凭证被多处引用时提示，删除前给出影响范围", "文件与凭证存储"),
    (P2, "测试", "基础库与因子库功能测试", "八类基础库与因子库的增删改查、启停、引用约束用例", "测试", 0, 0, 5, 4, 5, "高", "用例覆盖全部操作路径，无阻断缺陷", "基础库前端联调"),
    (P4, "测试", "核算主链路端到端测试", "摇篮到大门、摇篮到坟墓、熊宝真实案例三条业务线全流程", "测试", 0, 0, 6, 7, 7, "高", "三条线均可从建档走到报告导出", "步骤④⑤结果展示"),
    (P4, "测试", "权限与越权测试", "跨租户、跨组织、越权接口、平台运营视角四组用例", "测试", 0, 0, 4, 7, 7, "高", "任何越权访问均被服务端拒绝，且不泄露存在性", "角色菜单与权限"),
    (P4, "测试", "精度与边界测试", "除零、负数流、复合单位、重复导入、极端小数、并发编辑", "测试", 0, 0, 4, 7, 8, "高", "无错误值外露；并发编辑有锁提示", "检测引擎"),
    (P4, "测试", "性能与报告格式测试", "2000 条核算、2000 条导入、报告导出格式校验", "测试", 0, 0, 3, 8, 8, "中", "性能达标；docx 在不同 Office 版本下版式不跑", "性能优化"),
    (P4, "测试", "全量回归与发版验收", "全量用例回归、缺陷收敛、发版清单与回滚预案", "测试", 0, 0, 5, 8, 8, "高", "阻断与严重缺陷清零；回滚预案演练一次", "全模块"),
]

r = 2
for idx, t in enumerate(tasks, start=1):
    stage, domain, name, deliver, owner, fe, be, qa, sw, ew, prio, accept, dep = t
    ws.cell(row=r, column=1, value=idx)
    ws.cell(row=r, column=2, value=stage)
    ws.cell(row=r, column=3, value=domain)
    ws.cell(row=r, column=4, value=name)
    ws.cell(row=r, column=5, value=deliver)
    ws.cell(row=r, column=6, value=owner)
    ws.cell(row=r, column=7, value=fe)
    ws.cell(row=r, column=8, value=be)
    ws.cell(row=r, column=9, value=qa)
    ws.cell(row=r, column=10, value=f"=SUM(G{r}:I{r})")
    ws.cell(row=r, column=11, value=sw)
    ws.cell(row=r, column=12, value=ew)
    ws.cell(row=r, column=13, value=f'=IF(OR(K{r}="",L{r}=""),"",L{r}-K{r}+1)')
    ws.cell(row=r, column=14, value=prio)
    ws.cell(row=r, column=15, value=accept)
    ws.cell(row=r, column=16, value=dep)
    ws.cell(row=r, column=17, value="未开始")
    r += 1
r_end = r - 1

style_body(ws, 2, r_end, NC3, wrap_cols=(3, 4, 5, 15, 16), center_cols=(1, 2, 6, 11, 12, 13, 14, 17))
for rr in range(2, r_end + 1):
    for cc in (7, 8, 9, 10, 11, 12, 13):
        ws.cell(row=rr, column=cc).number_format = "0"

dv_status = DataValidation(type="list", formula1='"未开始,进行中,已完成,阻塞"', allow_blank=True, showDropDown=False)
dv_status.error = "请从下拉中选择状态"
ws.add_data_validation(dv_status)
dv_status.add(f"Q2:Q{r_end}")

dv_prio = DataValidation(type="list", formula1='"高,中,低"', allow_blank=True, showDropDown=False)
ws.add_data_validation(dv_prio)
dv_prio.add(f"N2:N{r_end}")

ws.conditional_formatting.add(f"Q2:Q{r_end}",
    CellIsRule(operator="equal", formula=['"已完成"'], fill=PatternFill("solid", fgColor=XL_GRN_BG), font=font(10, False, XL_GRN_TEXT)))
ws.conditional_formatting.add(f"Q2:Q{r_end}",
    CellIsRule(operator="equal", formula=['"进行中"'], fill=PatternFill("solid", fgColor=XL_YEL_BG), font=font(10, False, XL_YEL_TEXT)))
ws.conditional_formatting.add(f"Q2:Q{r_end}",
    CellIsRule(operator="equal", formula=['"阻塞"'], fill=PatternFill("solid", fgColor=XL_RED_BG), font=font(10, False, XL_RED_TEXT)))
ws.conditional_formatting.add(f"N2:N{r_end}",
    CellIsRule(operator="equal", formula=['"高"'], font=font(10, True, XL_RED_TEXT)))

ws.freeze_panes = "E2"
ws.auto_filter.ref = f"A1:Q{r_end}"

# =====================================================================
# 04_周排期甘特
# =====================================================================
ws = wb.create_sheet(S4)
ws.sheet_view.showGridLines = False
weeks = [("W1", "11/16"), ("W2", "11/23"), ("W3", "11/30"), ("W4", "12/07"),
         ("W5", "12/14"), ("W6", "12/21"), ("W7", "12/28"), ("W8", "01/04")]
set_widths(ws, {"A": 44, "B": 12})
for i in range(len(weeks)):
    ws.column_dimensions[get_column_letter(3 + i)].width = 7
NC4 = 2 + len(weeks)
hdr = ["关键交付物", "主责"] + [f"{w}\n{d}" for w, d in weeks]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
style_header_row(ws, 1, NC4, height=36)

gantt = [
    ("接口契约与字段字典", "后端", [1]),
    ("后端骨架与三套环境", "后端", [1, 2]),
    ("数据库设计与基础种子", "后端", [1, 2]),
    ("登录、会话与租户上下文", "后端", [2]),
    ("角色、菜单与行级数据权限", "后端", [2, 3]),
    ("前端请求层与登录联调", "前端", [2]),
    ("物料 / 能源 / 行业 / 单位接口", "后端", [3, 4]),
    ("生命周期模块编码改造（补 A5）", "后端", [3]),
    ("产品 / 工艺 / 工序接口", "后端", [4]),
    ("因子库（多库 / 版本 / 有效期 / 地区）", "后端", [4, 5]),
    ("文件与凭证存储", "后端", [4]),
    ("基础库与产品工艺前端联调", "前端", [3, 4, 5]),
    ("核算项目五步接口与状态机", "后端", [5, 6]),
    ("计算引擎（模块聚合 / 四分量 / 三口径 / 精度 / 分配）", "后端", [5, 6]),
    ("检测引擎（含质量平衡与量纲）", "后端", [6]),
    ("步骤①② 前端改造（净重面积 / 多因子 / 流向）", "前端", [5, 6]),
    ("步骤③④⑤ 前端（检测清单 / 结果 / 口径切换）", "前端", [6, 7]),
    ("审核流与版本锁定", "后端 + 前端", [7]),
    ("报告模板装配与 docx 导出", "后端 + 前端", [7, 8]),
    ("导入导出与重复明细去重", "后端 + 前端", [6, 7]),
    ("审计日志与性能优化", "后端", [7, 8]),
    ("功能 / 权限 / 精度 / 性能测试与全量回归", "测试", [4, 5, 6, 7, 8]),
    ("发版验收与上线", "全体", [8]),
]
r = 2
for name, owner, active in gantt:
    ws.cell(row=r, column=1, value=name)
    ws.cell(row=r, column=2, value=owner)
    is_test = owner in ("测试", "全体")
    for w in active:
        cell = ws.cell(row=r, column=2 + w, value="■")
        cell.fill = PatternFill("solid", fgColor=XL_BAR_TEST if is_test else XL_BAR)
        cell.font = font(9, False, "FF375623" if not is_test else "FF7F6000")
        cell.alignment = Alignment(horizontal="center", vertical="center")
    r += 1
r_end4 = r - 1
for rr in range(2, r_end4 + 1):
    for cc in range(1, NC4 + 1):
        cell = ws.cell(row=rr, column=cc)
        cell.border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        if cc <= 2:
            cell.font = font(10)
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[rr].height = 22
ws.freeze_panes = "C2"

legend_r = r_end4 + 2
ws.cell(row=legend_r, column=1, value="图例").font = font(10, True)
c1 = ws.cell(row=legend_r, column=3, value="■")
c1.fill = PatternFill("solid", fgColor=XL_BAR)
c1.alignment = Alignment(horizontal="center", vertical="center")
ws.merge_cells(start_row=legend_r, start_column=4, end_row=legend_r, end_column=6)
ws.cell(row=legend_r, column=4, value="研发交付物").font = font(10)
c2 = ws.cell(row=legend_r + 1, column=3, value="■")
c2.fill = PatternFill("solid", fgColor=XL_BAR_TEST)
c2.alignment = Alignment(horizontal="center", vertical="center")
ws.merge_cells(start_row=legend_r + 1, start_column=4, end_row=legend_r + 1, end_column=6)
ws.cell(row=legend_r + 1, column=4, value="测试与发版").font = font(10)

# =====================================================================
# 05_技术方案
# =====================================================================
ws = wb.create_sheet(S5)
set_widths(ws, {"A": 14, "B": 20, "C": 30, "D": 46, "E": 22})
NC5 = 5
hdr = ["层次", "组件", "建议选型", "说明与约束", "待确认 / 备注"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
style_header_row(ws, 1, NC5, height=26)

tech = [
    ("交互层", "Web 前端", "沿用 Vite 5 + React 18 + TypeScript；组件库现为 TDesign React，继续沿用", "原型 38 个模块页面、419 个源文件可直接复用，只替换数据层；不重写页面是本期工期成立的前提", "无"),
    ("交互层", "接口网关", "单体内置过滤器起步，预留 Spring Cloud Gateway", "800 余个接口在单体下足够；先做统一鉴权与租户上下文注入，后续拆服务不加成本", "是否已有多云网关要求待确认"),
    ("应用层", "主服务", "Java 21 + Spring Boot 3", "团队既有 Java 栈；核算、权限、报告生态成熟，招人与接手成本低", "若团队以 Node 为主需在第 1 周重新评估"),
    ("应用层", "持久层", "MyBatis-Plus + Flyway 迁移", "迁移脚本可重复执行，多环境一致；禁止手工改库", "无"),
    ("应用层", "计算与检测引擎", "独立 Module（同进程 Service），接口化预留独立部署", "纯函数式：输入快照 + 输出明细；不做副作用，便于单测与 19 项断言回归", "无"),
    ("数据层", "关系数据库", "MySQL 8.0（utf8mb4），按 tenant_id 行级隔离", "核算结果与审计日志只增不改；金额式精度用 DECIMAL(28,10) 或双精度全程保留", "私有化场景是否换国产库待定"),
    ("数据层", "缓存与队列", "Redis 7：会话、字典缓存、任务状态与轻量队列", "导入导出与报告生成走 Redis 队列 + 轮询进度，本期不引入 MQ", "无"),
    ("数据层", "对象存储", "MinIO（自建）／ 腾讯云 COS（公有云）双适配", "凭证与报告文件；引用锁版本、删除护栏、访问签名", "私有化交付是否必装 MinIO 待确认"),
    ("报告", "docx 生成", "poi-tl 或 docx4j + 占位符模板", "模板由产品线下整理定稿，系统只做占位符装配，不在代码里写报告文案", "模板须第 4 周前交付"),
    ("非功能", "性能目标", "2000 条活动数据核算 ≤30s；列表 ≤2s；2000 条导入 ≤60s", "核算任务异步化 + 分页 + 索引；大结果集不在一次响应里返回", "无"),
    ("非功能", "安全与隔离", "租户行级隔离、组织数据范围过滤、审计留痕、附件签名访问", "平台运营人员默认不可见租户业务数据，受限访问须审批并留痕", "无"),
    ("部署", "环境与发布", "Docker Compose（测试）→ K8s 或云托管（生产）", "保留私有化能力（单租户实例）；不做安装包，本期只保证容器化可跑", "私有化交付形态待定"),
]
r = 2
for row in tech:
    for i, v in enumerate(row, start=1):
        ws.cell(row=r, column=i, value=v)
    r += 1
style_body(ws, 2, r - 1, NC5, wrap_cols=(3, 4, 5), center_cols=(1,))
ws.freeze_panes = "B2"

# =====================================================================
# 06_风险与依赖
# =====================================================================
ws = wb.create_sheet(S6)
set_widths(ws, {"A": 30, "B": 34, "C": 9, "D": 46, "E": 14, "F": 28})
NC6 = 6
hdr = ["风险 / 依赖", "影响", "概率", "应对预案", "责任方", "触发信号（何时启动预案）"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
style_header_row(ws, 1, NC6, height=28)

risks = [
    ("后端 8 周负荷 94%，缓冲仅 10 人日", "任一后端请假、返工或接口反复，工期即破", "高",
     "把「审计日志」与「导入导出」列为可裁剪项（合计 10 人日）；周会只看一个数：累计完成人日 vs 计划", "研发负责人",
     "第 4 周复盘时后端累计完成率低于 90%"),
    ("生命周期模块编码改造牵动阶段库、种子与历史结果", "改造期口径混乱，回归量翻倍，报告口径可能反复", "高",
     "把模块编码作为独立任务在第 3 周单独合并，历史数据只加映射不改原值；合并当天冻结阶段表", "后端 + 产品",
     "第 3 周末阶段表变更未合并主干"),
    ("背景因子库（ecoinvent / CLCD / 省级电网）商用授权未定", "因子数据无法合法入库，报告不能对外出，商务成本未知", "中",
     "本期用内部因子库 + 公开因子跑通链路与验收；授权谈判与商务并行，第 4 周必须给结论", "产品 + 商务",
     "第 4 周未签约，即按内部因子库定稿验收口径"),
    ("生物碳与模块口径存在标准分歧（GB/T 24067-2024 与 EN 15804 表述不一致）", "结果口径返工，字段与报告章节全部重来", "中",
     "第 2 周组织一次双碳专家评审，当场冻结字段定义、模块编码表与生物碳四分量的正负号规则", "产品 + 双碳专家",
     "第 2 周末口径未冻结，立即上升到项目决策会"),
    ("核算引擎单点依赖：四分量、归一化、分配只有一人熟", "人员变动直接导致引擎停摆，无法维护", "中",
     "引擎配对开发；19 项断言脚本作为知识载体；第 6 周做一次交叉走读，第二人能独立改引擎", "后端负责人",
     "第 6 周仍无第二人能独立提交引擎改动"),
    ("原型 mock 数据模型与真实数据模型不一致", "契约反复变更，前端联调返工", "中",
     "第 1 周完成契约冻结（含字段字典与错误码）；字段增删须产品与研发双方签字", "后端 + 前端",
     "契约冻结后单周变更超过 3 处"),
    ("报告模板未定稿", "报告模块成为发版阻塞项", "中",
     "产品第 4 周前交付模板 docx；系统先按占位符骨架实现，模板到位后只调占位符不改代码", "产品",
     "第 4 周未提供模板，报告模块降级为「导出核算结果表」"),
    ("精度要求（内部 ≥10 位 / 展示 4 位）在验收时产生争议", "验收拉锯，反复重算比对", "低",
     "把「用原始精度回算」写进验收用例，测试脚本固化比对逻辑，避免拿页面展示值回算", "测试",
     "首轮验收出现精度争议，立即按脚本口径裁定"),
    ("原型页面量大（38 个模块），本期只投产约 16 个", "用户预期落空，验收时被要求补齐未投产模块", "中",
     "在计划首页与验收口径里写明本期范围与不做清单，验收只按交付判定四条", "产品",
     "验收会上出现范围外模块要求"),
]
r = 2
for row in risks:
    for i, v in enumerate(row, start=1):
        ws.cell(row=r, column=i, value=v)
    r += 1
r_end6 = r - 1
style_body(ws, 2, r_end6, NC6, wrap_cols=(1, 2, 4, 6), center_cols=(3, 5))
ws.freeze_panes = "B2"
ws.auto_filter.ref = f"A1:F{r_end6}"
ws.conditional_formatting.add(f"C2:C{r_end6}",
    CellIsRule(operator="equal", formula=['"高"'], fill=PatternFill("solid", fgColor=XL_RED_BG), font=font(10, True, XL_RED_TEXT)))
ws.conditional_formatting.add(f"C2:C{r_end6}",
    CellIsRule(operator="equal", formula=['"中"'], fill=PatternFill("solid", fgColor=XL_YEL_BG), font=font(10, False, XL_YEL_TEXT)))

# =====================================================================
# 07_验收用例
# =====================================================================
ws = wb.create_sheet(S7)
set_widths(ws, {"A": 14, "B": 44, "C": 42, "D": 18, "E": 26})
NC7 = 5
hdr = ["类别", "用例", "预期结果", "判定方式", "依据来源"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
style_header_row(ws, 1, NC7, height=26)

cases = [
    ("核算正确性", "熊宝 28 条明细逐行「不含生物碳」排放", "每行 = 活动量 × 因子；与案例逐行一致，误差 ≤0.0001", "脚本断言", "熊宝案例验证报告"),
    ("核算正确性", "A1–A3 不含生物碳", "7.4044 kgCO₂e/块", "脚本断言", "熊宝案例验证报告"),
    ("核算正确性", "A1–A3 含生物碳净值", "0.3522 kgCO₂e/块", "脚本断言", "熊宝案例验证报告"),
    ("核算正确性", "A1–C4 不含生物碳", "11.4295 kgCO₂e/块", "脚本断言", "熊宝案例验证报告"),
    ("核算正确性", "归一化按重量", "2.0668 kgCO₂e/kg", "脚本断言", "熊宝案例验证报告"),
    ("核算正确性", "归一化按面积", "43.8920 kgCO₂e/m²", "脚本断言", "熊宝案例验证报告"),
    ("核算正确性", "按模块独立出数（A1 / A2 / A3 / A4 / A5 / C1 / C2 / C3 / C4）", "各模块可单独出值，且合计等于总量", "界面核对 + 断言", "必维评审阻断项"),
    ("核算正确性", "热点排序", "前两位为胶水、木材（胶）处置", "界面核对", "熊宝案例验证报告"),
    ("核算正确性", "内部精度不被展示值污染", "页面显示 4 位后重算，结果与原始精度计算一致", "脚本断言", "必维评审严重项"),
    ("数据校验", "kWh 活动绑定 kgCO₂e/kg 因子", "阻断核算并定位到具体行的字段", "手工用例", "案例校验点 1"),
    ("数据校验", "因子缺失", "标记「待匹配」，结果不可提交审核", "手工用例", "案例校验点 2"),
    ("数据校验", "负数活动量未填流向 / 原因 / 凭证", "阻止保存并提示补录", "手工用例", "案例校验点 3"),
    ("数据校验", "校准项未填原因与审批", "阻止提交审核", "手工用例", "案例校验点 4"),
    ("数据校验", "删除 A2 或 C4 模块", "提示与所选边界不一致", "手工用例", "案例校验点 6"),
    ("数据校验", "重复导入同一行（如胶水）", "提示重复并允许确认合并", "手工用例", "案例校验点 7"),
    ("数据校验", "产品净重或面积为 0", "不出归一化结果并说明原因，不显示错误值", "手工用例", "走查报告"),
    ("数据校验", "质量平衡不通过（投入 ≠ 成品 + 损耗 + 废弃物）", "可计算但标记风险，阻断正式报告", "手工用例", "MVP 业务模型异常流程"),
    ("流程与状态", "分配比例合计 ≠ 100%", "阻断核算", "手工用例", "MVP 业务模型异常流程"),
    ("流程与状态", "修改已锁定版本的活动量", "生成新版本，旧结果仍可查", "手工用例", "MVP 业务模型异常流程"),
    ("流程与状态", "审核驳回后修改再提交", "回到编辑态，审核意见可见", "手工用例", "本期新增"),
    ("流程与状态", "报告导出", "docx 可直接编辑，数值与页面一致，含版本号", "手工用例", "本期新增"),
    ("权限与安全", "租户 A 的用户访问租户 B 的项目", "返回 403 或查无数据", "接口用例", "整体设计方案非功能要求"),
    ("权限与安全", "平台运营人员查看租户业务数据", "默认不可见；受限访问须审批并留痕", "接口用例", "整体设计方案非功能要求"),
    ("权限与安全", "低权限角色调用高权限接口", "服务端拒绝，不依赖前端隐藏", "接口用例", "用户体系设计"),
    ("性能", "2000 条活动数据核算", "≤30 秒", "压测", "整体设计方案非功能要求"),
    ("性能", "2000 条活动数据导入", "≤60 秒", "压测", "整体设计方案非功能要求"),
    ("性能", "列表查询", "≤2 秒", "压测", "整体设计方案非功能要求"),
]
r = 2
for row in cases:
    for i, v in enumerate(row, start=1):
        ws.cell(row=r, column=i, value=v)
    r += 1
r_end7 = r - 1
style_body(ws, 2, r_end7, NC7, wrap_cols=(2, 3, 5), center_cols=(1, 4))
ws.freeze_panes = "B2"
ws.auto_filter.ref = f"A1:E{r_end7}"

# =====================================================================
# 08_待决策事项
# =====================================================================
ws = wb.create_sheet(S8)
set_widths(ws, {"A": 28, "B": 40, "C": 32, "D": 38, "E": 18, "F": 10})
NC8 = 6
hdr = ["待决策事项", "背景", "影响", "建议方案", "需谁拍板", "截止周"]
for i, h in enumerate(hdr, start=1):
    ws.cell(row=1, column=i, value=h)
style_header_row(ws, 1, NC8, height=26)

decisions = [
    ("生命周期模块编码是否对齐 EN 15804", "现原型只有 5 个一级 + 10 个二级阶段（LC-01..15），必维评审要求 A1–A5 / B1–B7 / C1–C4 可独立出数，且缺 A5 阶段。",
     "决定阶段库表结构、历史数据迁移方式与报告章节；越晚改成本越高。",
     "采用双轨：界面仍显示中文一级阶段，底层增加模块编码字段；报告按模块出章。", "产品负责人 + 双碳专家", "第 2 周"),
    ("生物碳四分量的字段与正负号规则", "现原型已支持总量 / 化石 / 生物源 / 土地利用四分量，但单行只能绑一个因子，C4 木材处置需化石 + 生物碳双因子。",
     "决定活动数据模型（一行多因子 vs 分量字段）与结果页口径表达，直接影响引擎改造量。",
     "一行多因子，因子带「排放物类型」；结果按化石 / 生物源分列，并提供净值口径。", "产品 + 双碳专家", "第 2 周"),
    ("本期是否包含审核流", "原型状态机 9 态但无审核态，报告由编制人自行「确认完成」。",
     "影响第 7 周约 12 人日排期；不做则结果无法对外使用。",
     "本期做，但只做单级审核（提交 → 通过 / 驳回）；多级会签排第二阶段。", "产品负责人", "第 3 周"),
    ("精度与截断口径", "现原型结果落库即四舍五入到 4 位，内部运算同样被截断。",
     "影响引擎改造量与验收判定方式。",
     "全程双精度保留，仅展示层格式化；验收一律用原始精度回算。", "后端 + 双碳专家", "第 3 周"),
    ("背景因子库选型与商用授权", "ecoinvent / CLCD / 省级电网因子的版权与报价均未落定。",
     "影响成本、数据合法性与能否对外出报告。",
     "本期先用内部因子库 + 公开因子验收；第 4 周给选型结论，第二阶段接入。", "商务 + 产品", "第 4 周"),
    ("2 个月范围是否需要预先裁剪", "后端 8 周负荷 94%，缓冲仅 10 人日。",
     "决定「审计日志」「导入导出」是否砍掉；提前决定比第 6 周砍更省事。",
     "先保留，第 4 周复盘按实际进度决定；若累计完成率 <90% 立即裁剪。", "产品负责人 + 研发负责人", "第 4 周"),
    ("是否保留私有化部署能力", "整体设计方案声明 SaaS 多租户优先、保留私有化。",
     "影响对象存储选型与部署方式，是否双适配要投入额外工作量。",
     "保持容器化，MinIO 与 COS 双适配；本期不做安装包与离线部署。", "研发负责人", "第 5 周"),
]
r = 2
for row in decisions:
    for i, v in enumerate(row, start=1):
        ws.cell(row=r, column=i, value=v)
    r += 1
r_end8 = r - 1
style_body(ws, 2, r_end8, NC8, wrap_cols=(1, 2, 3, 4), center_cols=(5, 6))
ws.freeze_panes = "B2"
ws.auto_filter.ref = f"A1:F{r_end8}"

# ---- 行高估算：长文本不被裁切 ----
auto_row_heights(wb[S1], 2, wb[S1].max_row, {"A": 16, "B": 44, "C": 42, "D": 30})
auto_row_heights(wb[S2], 2, r_tot, {"A": 18, "D": 40, "E": 42, "F": 40})
auto_row_heights(wb[S3], 2, r_end, {"C": 12, "D": 30, "E": 42, "O": 40, "P": 10})
auto_row_heights(wb[S4], 2, r_end4, {"A": 44})
auto_row_heights(wb[S5], 2, wb[S5].max_row, {"C": 30, "D": 46, "E": 22})
auto_row_heights(wb[S6], 2, r_end6, {"A": 30, "B": 34, "D": 46, "F": 28})
auto_row_heights(wb[S7], 2, r_end7, {"B": 44, "C": 42, "E": 26})
auto_row_heights(wb[S8], 2, r_end8, {"A": 28, "B": 40, "C": 32, "D": 38})

# ---- 文档属性 ----
wb.properties.title = "竹木碳足迹核算系统 研发计划 v1.0"
wb.properties.creator = "产品部"
wb.properties.subject = "研发计划（2026-11-16 起 8 周，对内生产版）"

wb.save(OUT)
print("saved:", OUT)
print("sheets:", wb.sheetnames)
print("tasks:", len(tasks), "| be:", sum(t[6] for t in tasks), "| fe:", sum(t[5] for t in tasks), "| qa:", sum(t[7] for t in tasks))
