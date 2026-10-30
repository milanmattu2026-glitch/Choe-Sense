# =============================================================================
# FILE: routers/whatsapp_webhook.py
# DESCRIPTION: Crowd-Deduplicated Institutional Webhook + Zero-WhatsApp Crew PWA API
# =============================================================================

from __future__ import annotations

import html
import math
import re
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field

from ml.alert_deduplicator import SpatioTemporalDeduplicator
from ml.backflow_engine import UrbanBackflowEngine
from ml.fleet_dispatcher import MCFleetDispatcher
from ml.privacy_guard import ZeroPIIPrivacyGuard
from ml.vision_gauge import VisionWaterGauge

vision_gauge = VisionWaterGauge()
backflow_engine = UrbanBackflowEngine()
fleet_dispatcher = MCFleetDispatcher()
privacy_guard = ZeroPIIPrivacyGuard()
deduplicator = SpatioTemporalDeduplicator()

NODE_COORDINATES: Dict[str, Dict[str, Any]] = {
    "NODE-PGI-SEC12": {"name": "PGI / Sector 12 Madhya Marg V2 Emergency Gate", "sector": "Sector 12", "lat": 30.7615, "lng": 76.7751},
    "NODE-SEC22-23": {"name": "Sector 22/23 ISBT-17 Roundabout", "sector": "Sector 22/23 Dividing V3", "lat": 30.7368, "lng": 76.7738},
    "NODE-SEC36-NCHOE": {"name": "Sector 36 N-Choe Trunk Outfall", "sector": "Sector 36", "lat": 30.7285, "lng": 76.7562},
    "NODE-TRIBUNE-CHOWK": {"name": "Tribune Chowk Dakshin Marg Roundabout", "sector": "Sector 29/31/32 Chowk", "lat": 30.7098, "lng": 76.7912},
    "NODE-IND-PH1": {"name": "Industrial Area Ph-1 Railway Underpass", "sector": "Industrial Area Phase 1", "lat": 30.7062, "lng": 76.8045},
    "NODE-ZIRAKPUR-RAO": {"name": "Zirakpur-Patiala Ki Rao Box Culvert", "sector": "Zirakpur NH-7", "lat": 30.6542, "lng": 76.8214},
}


class CrowdBurstRequest(BaseModel):
    node_id: str = Field(default="NODE-SEC22-23")
    burst_count: int = Field(default=150, ge=10, le=1000)


class CrewPWAProofSubmission(BaseModel):
    asset_id: str = Field(default="MC-PUMP-01")
    node_id: str = Field(default="NODE-SEC22-23")
    shift_pin: str = Field(default="CHD-SHIFT-01")
    before_depth_cm: float = Field(default=48.0)
    after_image_url: str = Field(default="https://choesense.chd.gov.in/proof/pwa_clean_kerb_verified.jpg")
    gps_distance_meters: float = Field(default=11.4)


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r_earth = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    return float(2.0 * r_earth * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)))


def find_nearest_node(lat: Optional[float], lng: Optional[float], hint_node_id: Optional[str]) -> tuple[str, float]:
    if lat is not None and lng is not None:
        best_id = "NODE-SEC22-23"
        best_dist = float("inf")
        for node_id, meta in NODE_COORDINATES.items():
            dist = haversine_meters(lat, lng, meta["lat"], meta["lng"])
            if dist < best_dist:
                best_dist = dist
                best_id = node_id
        if hint_node_id and hint_node_id in NODE_COORDINATES:
            meta = NODE_COORDINATES[hint_node_id]
            return hint_node_id, round(haversine_meters(lat, lng, meta["lat"], meta["lng"]), 1)
        return best_id, round(best_dist, 1)
    resolved_id = hint_node_id if (hint_node_id in NODE_COORDINATES) else "NODE-SEC22-23"
    return resolved_id, 16.0


def build_twiml_response(message_text: str) -> Response:
    escaped = html.escape(message_text)
    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{escaped}</Message></Response>'
    return Response(content=twiml, media_type="application/xml")


def create_whatsapp_router(
    get_supabase_fn: Optional[Callable[[], Any]] = None,
    local_state_store: Optional[Dict[str, Any]] = None,
    *args,
    **kwargs,
) -> APIRouter:
    router = APIRouter(tags=["Zero-Spam Institutional Gateway & Crew PWA"])
    state_store = local_state_store if local_state_store is not None else {}

    @router.post("/webhook/whatsapp")
    async def whatsapp_webhook(request: Request) -> Response:
        """
        Citizen-only public ingestion endpoint.
        100% of incoming messages are absorbed by the Spatio-Temporal Deduplicator.
        ZERO messages are forwarded to any officer's WhatsApp.
        """
        content_type = request.headers.get("content-type", "")
        payload = await request.json() if "application/json" in content_type else dict(await request.form())

        raw_sender = str(payload.get("From", "whatsapp:+919876543210"))
        body = str(payload.get("Body", "")).strip()
        media_url = payload.get("MediaUrl0") or payload.get("image_url")
        lat_raw = payload.get("Latitude") or payload.get("lat")
        lng_raw = payload.get("Longitude") or payload.get("lng")

        # 1. Zero-PII HMAC Anonymization
        privacy_envelope = privacy_guard.anonymize_sender(raw_sender, is_contractor=False)
        del raw_sender

        lat = float(lat_raw) if lat_raw not in (None, "") else None
        lng = float(lng_raw) if lng_raw not in (None, "") else None

        is_gully_audit = any(tok in body.lower() for tok in ["gully", "pre-monsoon", "grate", "audit"])
        vision_res = vision_gauge.analyze_report(
            image_url=str(media_url) if media_url else None,
            text_body=body,
            is_pre_monsoon_gully=is_gully_audit,
        )
        node_id, _ = find_nearest_node(lat, lng, vision_res.get("matched_node_hint"))
        node_meta = NODE_COORDINATES[node_id]

        # 2. Spatio-Temporal Deduplication & Kalman Consensus Fusion
        severity_val = vision_res.get("severity_class") or vision_res.get("status") or "NORMAL_FLOW"
        dedup_state = deduplicator.ingest_and_fuse(
            node_id=node_id,
            anon_token=privacy_envelope["anon_token"],
            estimated_depth_cm=float(vision_res["estimated_depth_cm"]),
            gully_choke_pct=float(vision_res["gully_choke_pct"]),
            confidence_score=float(vision_res["confidence_score"]),
            severity_class=str(severity_val),
        )
        state_store.setdefault("clusters", {})[node_id] = dedup_state

        # Update node state with Kalman-fused consensus depth (eliminates single-report jitter)
        fused_depth = dedup_state["kalman_fused_depth_cm"]
        fused_choke = dedup_state["fused_gully_choke_pct"]

        grid_sim = backflow_engine.simulate_grid(
            rain_mm_hr=48.0 if fused_depth >= 30.0 else 25.0,
            gully_choke_override=None,
            choe_surcharge_pct=78.0 if fused_depth >= 30.0 else 55.0,
        )
        for sim_node in grid_sim["nodes"]:
            if sim_node["id"] == node_id:
                sim_node["current_depth_cm"] = max(sim_node["current_depth_cm"], fused_depth)
                sim_node["gully_choke_pct"] = fused_choke
            state_store.setdefault("nodes", {})[sim_node["id"]] = sim_node

        dispatch_plan = fleet_dispatcher.optimize_dispatch(grid_sim["nodes"], available_trucks=3)
        state_store["last_dispatch_plan"] = dispatch_plan

        assigned_pump = next(
            (d for d in dispatch_plan["super_sucker_dispatches"] if d["node_id"] == node_id),
            dispatch_plan["super_sucker_dispatches"][0],
        )

        # Citizen gets an instant automated reply from the Twilio Bot; Officer gets ZERO WhatsApp pings
        reply = (
            f"🤖 *MC CHANDIGARH AI BOT (AUTO-DEDUPLICATED)*\n"
            f"🛡️ *Receipt:* {privacy_envelope['anon_token']} | *Cluster:* {dedup_state['cluster_id']}\n"
            f"📍 *Node:* {node_meta['name']}\n"
            f"📊 *Kalman Consensus ({dedup_state['raw_reports_in_cluster']} reports fused):* "
            f"{fused_depth} cm (±{dedup_state['kalman_uncertainty_cm']} cm)\n"
            f"🚒 *Autonomous In-Cab Dispatch:* {assigned_pump['asset_id']} (ETA {assigned_pump['truck_eta_mins']} mins)\n"
            f"🔕 *Officer Shield:* Handled 100% autonomously via Crew PWA (0 Officer WhatsApp alerts sent)."
        )
        return build_twiml_response(reply)

    @router.post("/api/v2/dedup/simulate-burst")
    async def simulate_crowd_spam_suppression(req: CrowdBurstRequest) -> Dict[str, Any]:
        """
        Judge Demo Endpoint: Fires `burst_count` (e.g., 150) simultaneous citizen reports at a node
        and proves that 149 duplicate notifications are suppressed into 1 Kalman-fused ticket.
        """
        result = deduplicator.simulate_crowd_burst(node_id=req.node_id, burst_count=req.burst_count)
        state_store.setdefault("clusters", {})[req.node_id] = result["final_kalman_consensus"]
        return result

    @router.get("/api/v2/crew/manifest/{asset_id}")
    async def get_in_cab_crew_pwa_manifest(asset_id: str) -> Dict[str, Any]:
        """
        Alternative to WhatsApp for Field Staff:
        Returns the single active pull-based work order for an in-cab Super-Sucker tablet
        or Gully Squad Shift PWA (`/crew-terminal`). Zero personal phone numbers or chat apps used.
        """
        plan = state_store.get("last_dispatch_plan") or {}
        all_dispatches = plan.get("super_sucker_dispatches", []) + plan.get("gully_squad_dispatches", [])
        assignment = next((d for d in all_dispatches if d["asset_id"] == asset_id.upper()), None)

        if not assignment and all_dispatches:
            assignment = all_dispatches[0]

        return {
            "terminal_mode": "IN_CAB_DEDICATED_PWA_PULL_ONLY",
            "whatsapp_dependency": "NONE (100% Replaced by Shift PWA)",
            "active_work_order": assignment,
            "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        }

    @router.post("/api/v2/crew/submit-proof")
    async def submit_crew_pwa_proof(req: CrewPWAProofSubmission) -> Dict[str, Any]:
        """Allows field crew to upload geofenced SLA completion proof directly from the Shift PWA."""
        verification = vision_gauge.verify_contractor_proof(
            before_depth_cm=req.before_depth_cm,
            after_image_url=req.after_image_url,
            distance_meters=req.gps_distance_meters,
        )
        if verification["proof_verified"] and req.node_id in state_store.get("nodes", {}):
            state_store["nodes"][req.node_id]["current_depth_cm"] = verification["after_depth_cm"]
            state_store["nodes"][req.node_id]["gully_choke_pct"] = 5.0
            state_store["nodes"][req.node_id]["backflow_eta_mins"] = None

        return {
            "asset_id": req.asset_id,
            "node_id": req.node_id,
            "submitted_via": "MC_IN_CAB_SHIFT_PWA",
            "verification": verification,
        }

    return router
