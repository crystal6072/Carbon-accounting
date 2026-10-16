"""熊宝重竹地板案例复算；仅使用 Python 标准库。"""
import csv
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 28
ROOT = Path(__file__).parent

def d(value):
    return Decimal(value or "0")

factors = {}
with (ROOT / "factors.csv").open(encoding="utf-8-sig", newline="") as handle:
    for factor in csv.DictReader(handle):
        factors[factor["factor_id"]] = d(factor["factor_value"])

stage_fossil, stage_net = {}, {}
rows = list(csv.DictReader((ROOT / "activity_data.csv").open(encoding="utf-8-sig", newline="")))
for row in rows:
    stage = row["stage_code"]
    fossil = d(row["emission_fossil_expected"])
    net = d(row["emission_net_expected"])
    if row["factor_id"]:
        calculated_fossil = d(row["activity_amount"]) * factors[row["factor_id"]]
        calculated_net = calculated_fossil + d(row["activity_amount"]) * d(row["biogenic_factor"])
        if abs(calculated_fossil - fossil) > Decimal("0.000000001"):
            raise SystemExit(f"FAIL {row['row_id']} fossil row calculation: expected {fossil}, actual {calculated_fossil}")
        if abs(calculated_net - net) > Decimal("0.000000001"):
            raise SystemExit(f"FAIL {row['row_id']} net row calculation: expected {net}, actual {calculated_net}")
    stage_fossil[stage] = stage_fossil.get(stage, Decimal(0)) + fossil
    stage_net[stage] = stage_net.get(stage, Decimal(0)) + net

def total(stages, values):
    return sum((values.get(stage, Decimal(0)) for stage in stages), Decimal(0))

checks = {
    "A1-A3 fossil": (total(["A1", "A2", "A3"], stage_fossil), Decimal("7.4043738139")),
    "A1-A3 net": (total(["A1", "A2", "A3"], stage_net), Decimal("0.3522356658")),
    "A1-C4 fossil": (total(["A1", "A2", "A3", "A4", "A5", "B1-B7", "C1", "C2", "C3", "C4"], stage_fossil), Decimal("11.4294699873")),
    "A1-C4 net": (total(["A1", "A2", "A3", "A4", "A5", "B1-B7", "C1", "C2", "C3", "C4"], stage_net), Decimal("11.4294699873")),
}
for name, (actual, expected) in checks.items():
    if abs(actual - expected) > Decimal("0.000000001"):
        raise SystemExit(f"FAIL {name}: expected {expected}, actual {actual}")
    print(f"PASS {name}: {actual}")

fossil_total = checks["A1-C4 fossil"][0]
print(f"PASS A1-C4 per kg: {fossil_total / Decimal('5.53')}")
print(f"PASS A1-C4 per m2: {fossil_total / Decimal('0.2604')}")
print("PASS rows:", len(rows))
