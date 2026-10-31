from fastapi import FastAPI, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from ml.vision_gauge import VisionWaterGauge
from ml.backflow_engine import UrbanBackflowEngine
from ml.fleet_dispatcher import MCFleetDispatcher
from services.weather_client import fetch_live_chandigarh_rainfall

load_dotenv()

app = FastAPI(
    title="Choe Sense 2.0 — EPA-SWMM Surrogate, Sentinel-1 SAR & Autonomous Fleet Engine",
    version="2.5.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vision_gauge = VisionWaterGauge()
backflow_engine = UrbanBackflowEngine()
fleet_dispatcher = MCFleetDispatcher()


class CascadeSimRequest(BaseModel):
    rain_mm_hr: float = 52.0
    gully_choke_override: float | None = None
    choe_level_pct: float = 78.0
    sukhna_floodgate_cusecs: float = 1400.0
    available_trucks: int = 3
    sar_enabled: bool = True
    micro_catchment_mode: str = "FOOTHILL_CLOUDBURST"


class ContractorVerifyRequest(BaseModel):
    node_id: int
    before_depth_cm: float = 48.0
    after_image_url: str = "after_clean_gully.jpg"
    distance_meters: float = 18.0


@app.get("/api/live-weather")
async def get_live_weather():
    """
    Returns real-time Chandigarh precipitation data from Open-Meteo API.
    """
    weather_data = fetch_live_chandigarh_rainfall()
    return weather_data


@app.get("/api/map-data")
async def get_map_data(
    rain_mm_hr: float = Query(52.0),
    sukhna_cusecs: float = Query(1400.0),
    available_trucks: int = Query(3),
    sar_enabled: bool = Query(True),
    micro_catchment_mode: str = Query("FOOTHILL_CLOUDBURST"),
    use_live_weather: bool = Query(False)
):
    live_wx = None
    if use_live_weather:
        live_wx = fetch_live_chandigarh_rainfall()
        rain_mm_hr = float(live_wx.get("current_rain_mm_hr", rain_mm_hr))

    sim = backflow_engine.simulate_grid(
        rain_mm_hr=rain_mm_hr,
        sukhna_floodgate_cusecs=sukhna_cusecs,
        sar_cloud_penetrating_enabled=sar_enabled,
        micro_catchment_mode=micro_catchment_mode
    )
    dispatch = fleet_dispatcher.optimize_dispatch(
        nodes_state=sim["nodes"],
        available_trucks=available_trucks
    )
    return {
        "status": "success",
        "engine": sim["engine_version"],
        "rain_mm_hr": rain_mm_hr,
        "live_weather": live_wx,
        "micro_catchment_mode": micro_catchment_mode,
        "sukhna_floodgate_cusecs": sukhna_cusecs,
        "sar_cloud_penetrating_enabled": sar_enabled,
        "sar_flood_polygons": sim["sar_flood_polygons"],
        "system_wide_backflow_risk": sim["system_wide_backflow_risk"],
        "substation_isolation_alerts": sim["substation_isolation_alerts"],
        "nodes": sim["nodes"],
        "active_dispatches": dispatch["dispatches"],
        "preemptive_gully_squads": dispatch["preemptive_gully_squads"],
        "sla_impact_metrics": dispatch["sla_impact_metrics"]
    }


@app.post("/api/simulate-cascade")
async def simulate_cascade(payload: CascadeSimRequest):
    sim = backflow_engine.simulate_grid(
        rain_mm_hr=payload.rain_mm_hr,
        gully_choke_override=payload.gully_choke_override,
        choe_surcharge_pct=payload.choe_level_pct,
        sukhna_floodgate_cusecs=payload.sukhna_floodgate_cusecs,
        sar_cloud_penetrating_enabled=payload.sar_enabled,
        micro_catchment_mode=payload.micro_catchment_mode
    )
    dispatch = fleet_dispatcher.optimize_dispatch(
        nodes_state=sim["nodes"],
        available_trucks=payload.available_trucks
    )
    return {
        "simulation": sim,
        "dispatch_optimizer": dispatch
    }


@app.post("/api/verify-work")
async def verify_work(payload: ContractorVerifyRequest):
    return vision_gauge.verify_contractor_proof(
        before_depth_cm=payload.before_depth_cm,
        after_image_url=payload.after_image_url,
        distance_meters=payload.distance_meters
    )


@app.post("/webhook/whatsapp")
async def whatsapp_webhook(
    Body: str = Form("Water up to car wheel at Sector 22 roundabout"),
    MediaUrl0: str | None = Form(None),
    ReporterTier: str = Form("TIER_2_TRUSTED_CIVIC_SCOUT"),
    IsNightStorm: bool = Form(False)
):
    vision_res = vision_gauge.analyze_report(
        image_url=MediaUrl0,
        text_body=Body,
        is_night_storm=IsNightStorm,
        reporter_tier=ReporterTier
    )
    sim = backflow_engine.simulate_grid(rain_mm_hr=55.0)
    dispatch = fleet_dispatcher.optimize_dispatch(sim["nodes"], available_trucks=3)
    top_dispatch = dispatch["dispatches"][0]

    reply_text = (
        f"⚡ *CHOE SENSE 2.0 AI GUARD*\n"
        f"• *Vision + SAR Gauge:* {vision_res['water_depth_cm']} cm (±{vision_res['uncertainty_sigma_cm']}cm) [{vision_res['vision_pipeline_mode']}]\n"
        f"• *Citizen Trust Ledger:* {vision_res['citizen_trust_ledger']['badge']} (+{vision_res['citizen_trust_ledger']['civic_karma_awarded']} Civic Karma)\n"
        f"• *Road Gully Choke:* {vision_res['gully_choke_pct']}% (Drain rate: {vision_res['effective_drain_rate_in_hr']} in/hr)\n"
        f"• *Safe V4 Detour:* {top_dispatch['safe_detour_route']}\n"
        f"• *Autonomous MC Dispatch:* {top_dispatch['asset_id']} en route (ETA {top_dispatch['eta_mins']}m, Offline PWA Cached)."
    )
    return {
        "vision_telemetry": vision_res,
        "assigned_dispatch": top_dispatch,
        "whatsapp_reply": reply_text
    }
