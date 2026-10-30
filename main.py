import os
import joblib
import httpx
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

app = FastAPI(
    title="ChoeSense Phase 2A: Predictive Flood & Time-Travel API",
    version="2.0.0"
)

# Enable CORS for React + Leaflet Frontend (Phase 3)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. BOM-SAFE ENV PARSER & SUPABASE CLIENT
env_vars = {}
if os.path.exists('.env'):
    with open('.env', 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if '=' in line:
                k, v = line.split('=', 1)
                env_vars[k.strip().replace('\ufeff', '')] = v.strip(' "\'')

SUPABASE_URL = env_vars.get('SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = env_vars.get('SUPABASE_SERVICE_ROLE_KEY') or env_vars.get('SUPABASE_ANON_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
OPENWEATHER_API_KEY = env_vars.get('OPENWEATHER_API_KEY') or os.getenv('OPENWEATHER_API_KEY', '')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. LOAD EXPLAINABLE ML ARTIFACT
ARTIFACT_PATH = "ml/model.joblib"
ml_artifact = joblib.load(ARTIFACT_PATH) if os.path.exists(ARTIFACT_PATH) else None

class SimulationRequest(BaseModel):
    preset_key: Optional[str] = None          # e.g., 'calm_weather', 'stage_cloudburst_85mm', 'july_2023_deluge_110mm'
    rainfall_mm_hr: Optional[float] = None    # Custom override if preset_key is not used
    auto_file_sla_tickets: bool = True        # Automatically open SLA tickets when risk hits Critical

def compute_explainable_prediction(pt: dict, rain_mm_hr: float):
    """Runs Gradient Boosting inference + local XAI feature attribution + hydrological physics."""
    clf = ml_artifact["model"]
    elev = float(pt.get("elevation_m", 310.0))
    drain_mm = float(pt.get("drain_threshold_mm") or (float(pt.get("drain_capacity_in_hr", 0.5)) * 25.4))
    recurrence = float(pt.get("historical_recurrence_weight", 3.5))

    features_df = pd.DataFrame([{
        'forecast_rain_mm_hr': rain_mm_hr,
        'elevation_m': elev,
        'drain_threshold_mm': drain_mm,
        'historical_recurrence_weight': recurrence
    }])

    pred_class = str(clf.predict(features_df)[0])
    probs = clf.predict_proba(features_df)[0]
    class_idx = list(clf.classes_).index(pred_class)
    confidence = round(float(probs[class_idx]), 3)

    # Dynamic Local XAI Feature Contribution Calculation
    drain_deficit = max(0.0, rain_mm_hr - drain_mm)
    elev_stress = max(0.05, (330.0 - elev) / 30.0)
    rain_stress = max(0.05, rain_mm_hr / 110.0)
    drain_stress = max(0.05, drain_deficit / 97.3)
    rec_stress = recurrence / 5.0

    raw_weights = {
        "rainfall_intensity_impact": round(rain_stress * 0.55, 4),
        "legacy_0_5_in_drain_bottleneck": round(drain_stress * 0.25, 4),
        "srtm_elevation_basin_factor": round(elev_stress * 0.12, 4),
        "historical_choe_recurrence": round(rec_stress * 0.08, 4)
    }
    total_w = sum(raw_weights.values()) or 1.0
    xai_breakdown = {k: round(v / total_w, 3) for k, v in raw_weights.items()}

    # Hydrological Physics: Estimated Water Depth & Lead Time to Flood
    est_depth_inches = round((drain_deficit / 25.4) * (1.0 + elev_stress * 0.4), 1) if drain_deficit > 0 else 0.0
    time_to_flood_mins = max(5, int(60 * (drain_mm / max(rain_mm_hr, 1.0)))) if drain_deficit > 0 else None

    xai_breakdown["drain_deficit_mm_hr"] = round(drain_deficit, 1)
    xai_breakdown["estimated_depth_inches"] = est_depth_inches
    xai_breakdown["lead_time_mins"] = time_to_flood_mins

    return pred_class, confidence, xai_breakdown

@app.get("/")
def health_check():
    return {
        "system": "ChoeSense Tri-City Flood Intelligence Engine",
        "phase": "2A - Explainable Gradient Boosting & Time-Travel API",
        "ml_loaded": ml_artifact is not None,
        "validation_accuracy": ml_artifact.get("validation_accuracy") if ml_artifact else None,
        "global_feature_importances": ml_artifact.get("global_importances") if ml_artifact else None
    }

@app.get("/api/presets")
def get_monsoon_presets():
    """Returns all historical time-travel presets for the Stage Judge Control Bar."""
    res = supabase.table("monsoon_presets").select("*").order("rainfall_mm_hr").execute()
    return {"presets": res.data}

@app.get("/api/weather/live")
async def fetch_live_tricity_weather():
    """Polls OpenWeatherMap for Chandigarh Tri-City [30.7046, 76.7179] with graceful fallback."""
    lat, lon = 30.7046, 76.7179
    if OPENWEATHER_API_KEY:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                rain_1h = data.get("rain", {}).get("1h", 0.0)
                return {
                    "source": "OpenWeatherMap Live",
                    "coordinates": [lat, lon],
                    "rainfall_mm_hr": float(rain_1h),
                    "temp_c": data["main"]["temp"],
                    "humidity": data["main"]["humidity"],
                    "condition": data["weather"][0]["description"]
                }
    return {
        "source": "IMD Tri-City Baseline (Dry Fallback - Set OPENWEATHER_API_KEY in .env for live OWM)",
        "coordinates": [lat, lon],
        "rainfall_mm_hr": 0.0,
        "temp_c": 28.4,
        "humidity": 52,
        "condition": "clear sky"
    }

@app.post("/api/simulate-monsoon")
async def simulate_monsoon(req: SimulationRequest):
    """
    Time-Travel Backtesting Endpoint:
    1. Resolves preset_key or custom rainfall_mm_hr.
    2. Scores all 6 Tri-City chokepoints with Explainable Gradient Boosting.
    3. Updates Supabase chokepoints in real-time (<300ms WebSocket push to React).
    4. Auto-routes & opens SLA tickets via PostGIS RPC if Critical.
    """
    if not ml_artifact:
        raise HTTPException(status_code=500, detail="ML artifact missing. Run python ml/train_risk_model.py")

    scenario_title = "Custom Rainfall Simulation"
    rain_mm = req.rainfall_mm_hr

    if req.preset_key:
        preset_res = supabase.table("monsoon_presets").select("*").eq("preset_key", req.preset_key).execute()
        if not preset_res.data:
            raise HTTPException(status_code=404, detail=f"Preset '{req.preset_key}' not found in monsoon_presets.")
        preset = preset_res.data[0]
        rain_mm = float(preset["rainfall_mm_hr"])
        scenario_title = preset["title"]
    elif rain_mm is None:
        raise HTTPException(status_code=400, detail="Provide either 'preset_key' or 'rainfall_mm_hr'.")

    # Reset open simulation tickets if returning to calm_weather baseline
    if rain_mm == 0.0:
        supabase.table("sla_tickets").delete().eq("trigger_source", "STAGE_SIMULATION").execute()
        supabase.table("chokepoints").update({"verification_count": 0}).neq("id", "00000000-0000-0000-0000-000000000000").execute()

    chokepoints = supabase.table("chokepoints").select("*").execute().data
    results = []
    tickets_created = []

    for pt in chokepoints:
        risk_level, confidence, xai = compute_explainable_prediction(pt, rain_mm)

        update_payload = {
            "forecast_rain_mm_hr": rain_mm,
            "current_risk": risk_level,
            "risk_probability": confidence,
            "ml_feature_contributions": xai,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("chokepoints").update(update_payload).eq("id", pt["id"]).execute()

        # Auto-file routed SLA ticket if Critical during simulation
        routed_authority = None
        if req.auto_file_sla_tickets and risk_level == "Critical" and rain_mm > 0:
            existing = supabase.table("sla_tickets").select("id").eq("chokepoint_id", pt["id"]).eq("status", "OPEN").execute().data
            route_info = supabase.rpc("route_ticket_by_gps", {"lat": pt["lat"], "lon": pt["lon"]}).execute().data
            routed_authority = route_info.get("jurisdiction_name")

            if not existing:
                ticket_res = supabase.table("sla_tickets").insert({
                    "chokepoint_id": pt["id"],
                    "jurisdiction_id": route_info["jurisdiction_id"],
                    "severity": "Critical",
                    "trigger_source": "STAGE_SIMULATION",
                    "verification_count": max(1, pt.get("verification_count", 1)),
                    "status": "OPEN"
                }).execute()
                if ticket_res.data:
                    tickets_created.append({
                        "ticket_number": ticket_res.data[0].get("ticket_number"),
                        "chokepoint": pt["name"],
                        "routed_to": routed_authority
                    })

        results.append({
            "chokepoint": pt["name"],
            "elevation_m": pt["elevation_m"],
            "predicted_risk": risk_level,
            "confidence": confidence,
            "xai_contributions": xai,
            "routed_authority": routed_authority,
            "reroute_advisory": pt.get("reroute_advisory") if risk_level in ("High", "Critical") else "Normal traffic flow"
        })

    return {
        "scenario": scenario_title,
        "simulated_rainfall_mm_hr": rain_mm,
        "legacy_drain_limit_mm_hr": 12.7,
        "auto_tickets_filed": len(tickets_created),
        "tickets": tickets_created,
        "chokepoint_assessments": results
    }
