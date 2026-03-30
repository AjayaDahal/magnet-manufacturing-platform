from config import get_settings


def calculate_margin(
    sheet_count: int,
    waste_pct: float,
    material_cost_per_sheet: float,
    print_time_hours: float,
    labor_hours: float = 0.0,
    margin_target: float | None = None,
) -> dict:
    settings = get_settings()
    if margin_target is None:
        margin_target = settings.default_margin_target

    material_cost = sheet_count * material_cost_per_sheet
    waste_cost = material_cost * (waste_pct / 100.0)
    effective_labor = labor_hours if labor_hours > 0 else print_time_hours * 0.5
    labor_cost = effective_labor * settings.labor_rate_per_hour
    total_cost = material_cost + waste_cost + labor_cost

    if margin_target >= 1.0:
        margin_target = margin_target / 100.0

    recommended_price = total_cost / (1.0 - margin_target) if margin_target < 1.0 else total_cost * 2
    actual_margin = (recommended_price - total_cost) / recommended_price if recommended_price > 0 else 0.0

    return {
        "material_cost": round(material_cost, 2),
        "waste_cost": round(waste_cost, 2),
        "labor_cost": round(labor_cost, 2),
        "total_cost": round(total_cost, 2),
        "recommended_price": round(recommended_price, 2),
        "margin_pct": round(actual_margin * 100, 2),
    }
