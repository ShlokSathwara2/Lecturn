from fastapi import APIRouter
from ..models import ApiUsageLogCreate
from ..supabase_client import supabase

router = APIRouter(prefix="/usage-log", tags=["usage_log"])

# Estimated daily limits (user can override via env if needed)
DAILY_LIMITS = {
    "gemini": 1500,
    "openrouter-primary": 200,
    "openrouter-fallback": 100,
    "enrichment_only": 9999,
    "from_cache": 9999,
    "duplicate": 9999,
    "error": 9999,
}

PROVIDER_LABELS = {
    "gemini": "Gemini (direct)",
    "openrouter-primary": "OpenRouter (primary)",
    "openrouter-fallback": "OpenRouter (fallback)",
    "enrichment_only": "Enrichment (Groq)",
    "from_cache": "From cache",
    "duplicate": "Duplicate",
    "error": "Error",
}


@router.get("")
async def list_usage_log(provider: str = "", days: int = 30):
    query = supabase.table("api_usage_log").select("*").order("date", desc=True).limit(days)
    if provider:
        query = query.eq("provider", provider)
    return query.execute().data


@router.post("", status_code=201)
async def log_usage(body: ApiUsageLogCreate):
    today = body.model_dump()
    today["date"] = "today"
    data = supabase.table("api_usage_log").insert(today).execute()
    return data.data[0]


@router.get("/summary")
async def usage_summary(days: int = 14):
    rows = supabase.table("api_usage_log").select("*").gte("date", f"now() - interval '{days} days'").order("date", desc=True).execute().data

    daily: dict[str, dict[str, int]] = {}
    totals: dict[str, int] = {}
    today_str = __import__("datetime").date.today().isoformat()
    today_providers = set()

    for r in rows:
        d = r["date"][:10]
        p = r["provider"]
        cnt = r["request_count"]
        daily.setdefault(d, {}).setdefault(p, 0)
        daily[d][p] = daily[d].get(p, 0) + cnt
        totals[p] = totals.get(p, 0) + cnt
        if d == today_str:
            today_providers.add(p)

    today_counts = {p: daily.get(today_str, {}).get(p, 0) for p in set(totals) | set(DAILY_LIMITS)}

    providers_info = []
    for p in sorted(set(totals) | set(DAILY_LIMITS)):
        used = totals.get(p, 0)
        limit = DAILY_LIMITS.get(p, 9999)
        today_used = today_counts.get(p, 0)
        providers_info.append({
            "provider": p,
            "label": PROVIDER_LABELS.get(p, p),
            "total_14d": used,
            "today": today_used,
            "daily_limit": limit,
            "percent_today": round(today_used / limit * 100, 1) if limit < 9999 else None,
            "near_limit": today_used > limit * 0.8 if limit < 9999 else False,
        })

    return {
        "days": sorted(daily.keys(), reverse=True),
        "daily": daily,
        "providers": providers_info,
        "today_providers": sorted(today_providers),
        "today_total": sum(today_counts.values()),
    }
