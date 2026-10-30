# =============================================================================
# FILE: ml/fleet_dispatcher.py
# DESCRIPTION: Constrained Operations Research Fleet Dispatcher for Chandigarh MC
#              Super-Sucker Pump Trucks & Rapid Gully-Cleaning Squads
# =============================================================================

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import numpy as np


class MCFleetDispatcher:
    """
    Constrained Operations Research (OR) Fleet Dispatcher for Chandigarh Municipal Corporation.

    Priority Objective Function:
        priority = (
            0.35 * rise_rate
            + 0.30 * hospital_corridor_weight
            + 0.20 * backflow_risk
            + 0.15 * traffic_density
        )

    Allocates Super-Sucker Pump Trucks (`MC-PUMP-01`, `MC-PUMP-02`, `MC-PUMP-03`)
    and Rapid Gully-Cleaning Squads (`GULLY-SQUAD-A`, `GULLY-SQUAD-B`, `GULLY-SQUAD-C`),
    computing exact `time_to_drain_mins` and dry Inner-Sector V4/V5 bypass routes.
    """

    SUPER_SUCKER_FLEET: List[Dict[str, Any]] = [
        {
            "asset_id": "MC-PUMP-01",
            "asset_name": "MC Super-Sucker Alpha (1200 m3/hr)",
            "pump_capacity_m3_hr": 1200.0,
            "base_sector": "Sector 17 MC Main Depot",
            "lat": 30.7410,
            "lng": 76.7821,
        },
        {
            "asset_id": "MC-PUMP-02",
            "asset_name": "MC Super-Sucker Bravo (900 m3/hr)",
            "pump_capacity_m3_hr": 900.0,
            "base_sector": "Industrial Area Ph-1 Station",
            "lat": 30.7125,
            "lng": 76.8010,
        },
        {
            "asset_id": "MC-PUMP-03",
            "asset_name": "MC High-Head Pump Charlie (600 m3/hr)",
            "pump_capacity_m3_hr": 600.0,
            "base_sector": "Sector 14/15 Emergency Yard",
            "lat": 30.7530,
            "lng": 76.7685,
        },
    ]

    GULLY_SQUAD_FLEET: List[Dict[str, Any]] = [
        {
            "asset_id": "GULLY-SQUAD-A",
            "asset_name": "Rapid Gully Desilting Squad Alpha",
            "clearance_rate_pct_hr": 65.0,
            "base_sector": "Sector 15 Sub-Office",
        },
        {
            "asset_id": "GULLY-SQUAD-B",
            "asset_name": "Rapid Gully Desilting Squad Bravo",
            "clearance_rate_pct_hr": 65.0,
            "base_sector": "Sector 22 Maintenance Booth",
        },
        {
            "asset_id": "GULLY-SQUAD-C",
            "asset_name": "Rapid Gully Desilting Squad Charlie",
            "clearance_rate_pct_hr": 65.0,
            "base_sector": "Sector 31 MC Yard",
        },
    ]

    # Pre-surveyed high-crown dry V4/V5 internal sector paths for heavy MC trucks
    # and safe citizen detours around flooded V2/V3 roundabouts
    CHANDIGARH_ROUTING_MATRIX: Dict[str, Dict[str, Any]] = {
        "NODE-PGI-SEC12": {
            "truck_v4_v5_route": (
                "Depart Depot -> Enter Sector 14 Internal V4 Market Spine -> Cross Sector 15A V5 Residential Lane "
                "(High-Crown Dry Asphalt) -> Approach PGI Gate No. 1 via Punjab University Internal Slip Road "
                "(Bypasses flooded Madhya Marg V2 rotary)."
            ),
            "citizen_safe_bypass": (
                "AVOID Madhya Marg Sector 11/12/14 Roundabout. Emergency & Ambulance traffic divert via "
                "Sector 14/15 Internal V4 Road -> Vidya Path (Sector 15/16 Dividing) -> PGI New OPD Rear Gate."
            ),
            "route_waypoints": [[30.7530, 76.7685], [30.7565, 76.7715], [30.7615, 76.7751]],
        },
        "NODE-SEC22-23": {
            "truck_v4_v5_route": (
                "Depart Sector 17 MC Depot -> Take Sector 17E/22B Elevated Inner V4 Shopping Belt -> "
                "Cut through Sector 22C V5 Internal Park Ring -> Position suction boom on high kerb of "
                "ISBT-17 Roundabout (Bypasses submerged Himalya Marg V3 depression)."
            ),
            "citizen_safe_bypass": (
                "AVOID Sector 22/23 ISBT-17 Roundabout (Two-wheelers & Sedans stalling). Divert via "
                "Sector 21/22 Internal V4 Market Road or Jan Marg (Sector 16/17) -> Udyog Path."
            ),
            "route_waypoints": [[30.7410, 76.7821], [30.7392, 76.7775], [30.7368, 76.7738]],
        },
        "NODE-SEC36-NCHOE": {
            "truck_v4_v5_route": (
                "Enter via Sector 35C Internal V4 Market Road -> Traverse Sector 36B Dry V5 Inner Ring -> "
                "Stage Super-Sucker on elevated N-Choe Culvert Bridge Apron (Bypasses flooded Sector 36/37 V3 rotary)."
            ),
            "citizen_safe_bypass": (
                "AVOID Sector 36/37 N-Choe Low-Level Crossing. Commuters bound for Mohali use "
                "Himalya Marg (Sector 35/34) or Sector 35 Internal V4 Spine."
            ),
            "route_waypoints": [[30.7335, 76.7640], [30.7305, 76.7595], [30.7285, 76.7562]],
        },
        "NODE-TRIBUNE-CHOWK": {
            "truck_v4_v5_route": (
                "Depart Station -> Enter Sector 29B Internal V4 Mandir Road -> Cut through Sector 31A "
                "Air Force High-Ground V5 Lane -> Deploy high-head discharge hose at Tribune Chowk North Slip Road "
                "(Bypasses gridlocked Purv Marg / Dakshin Marg approaches)."
            ),
            "citizen_safe_bypass": (
                "AVOID Tribune Chowk Roundabout. Divert via Sector 29/30 Internal V4 Road -> "
                "Sector 32 GMCH Hospital Inner Corridor -> Chandi Path."
            ),
            "route_waypoints": [[30.7125, 76.8010], [30.7138, 76.7945], [30.7098, 76.7912]],
        },
        "NODE-IND-PH1": {
            "truck_v4_v5_route": (
                "Depart Industrial Area Station -> Use Plot 1-45 Internal Service Lane (V5 High Plinth) -> "
                "Stage Super-Sucker on Up-Ramp Crown of Railway Underpass with discharge line into Sukhna Choe."
            ),
            "citizen_safe_bypass": (
                "CRITICAL BLOCKADE at Industrial Area Ph-1 Railway Underpass (>55cm). Use Centra Mall / "
                "Elante Peripheral Loop -> Madhya Marg Railway Overbridge (ROB)."
            ),
            "route_waypoints": [[30.7125, 76.8010], [30.7090, 76.8030], [30.7062, 76.8045]],
        },
        "NODE-ZIRAKPUR-RAO": {
            "truck_v4_v5_route": (
                "Take NH-7 Elevated Flyover -> Descend via Zirakpur VIP Road Internal V4 Service Ramp -> "
                "Position pump unit at Patiala Ki Rao Box Culvert Upstream Wingwall."
            ),
            "citizen_safe_bypass": (
                "AVOID Zirakpur Under-Bridge Slip Roads near Patiala Ki Rao. Use Main Elevated NH-7 Flyover "
                "Deck or PR-7 Airport Ring Road."
            ),
            "route_waypoints": [[30.6710, 76.8180], [30.6615, 76.8198], [30.6542, 76.8214]],
        },
    }

    @staticmethod
    def compute_priority_score(
        rise_rate: float,
        hospital_corridor_weight: float,
        backflow_risk: float,
        traffic_density: float,
    ) -> float:
        """
        Exact constrained OR priority scoring formula:
            priority = 0.35 * rise_rate + 0.30 * hospital_corridor_weight + 0.20 * backflow_risk + 0.15 * traffic_density
        """
        score = (
            0.35 * float(np.clip(rise_rate, 0.0, 1.0))
            + 0.30 * float(np.clip(hospital_corridor_weight, 0.0, 1.0))
            + 0.20 * float(np.clip(backflow_risk, 0.0, 1.0))
            + 0.15 * float(np.clip(traffic_density, 0.0, 1.0))
        )
        return round(float(score), 4)

    @staticmethod
    def compute_time_to_drain_mins(water_volume_m3: float, pump_capacity_m3_hr: float) -> float:
        """
        Exact drainage duration formula:
            time_to_drain_mins = (water_volume_m3 / pump_capacity_m3_hr) * 60
        """
        if pump_capacity_m3_hr <= 0.0:
            return 0.0
        mins = (max(0.0, float(water_volume_m3)) / float(pump_capacity_m3_hr)) * 60.0
        return round(float(mins), 1)

    def _normalize_node_features(self, node: Dict[str, Any]) -> Dict[str, float]:
        """Extracts or derives normalized [0, 1] features for the OR objective function."""
        depth_cm = float(node.get("current_depth_cm", 0.0))
        choke_pct = float(node.get("gully_choke_pct", 35.0))
        backflow_eta = node.get("backflow_eta_mins")

        if "rise_rate" in node and node["rise_rate"] is not None:
            rise_rate = float(np.clip(node["rise_rate"], 0.0, 1.0))
        else:
            est_rise_cm_hr = depth_cm * (0.65 + (choke_pct / 200.0))
            rise_rate = float(np.clip(est_rise_cm_hr / 75.0, 0.0, 1.0))

        hospital_weight = float(np.clip(node.get("hospital_corridor_weight", 0.4), 0.0, 1.0))

        if "backflow_risk" in node and node["backflow_risk"] is not None:
            backflow_risk = float(np.clip(node["backflow_risk"], 0.0, 1.0))
        elif backflow_eta is not None and float(backflow_eta) > 0:
            backflow_risk = float(np.clip(1.0 - (float(backflow_eta) / 48.0), 0.25, 1.0))
        else:
            backflow_risk = float(np.clip(depth_cm / 90.0, 0.0, 0.6))

        traffic_density = float(np.clip(node.get("traffic_density", node.get("traffic_density_weight", 0.75)), 0.0, 1.0))

        return {
            "rise_rate": round(rise_rate, 4),
            "hospital_corridor_weight": round(hospital_weight, 4),
            "backflow_risk": round(backflow_risk, 4),
            "traffic_density": round(traffic_density, 4),
        }

    def optimize_dispatch(
        self,
        nodes_state: list[dict],
        available_trucks: int = 3,
    ) -> dict:
        """
        Ranks all Tricity flood nodes by the OR priority objective, allocates available
        Super-Sucker Pump Trucks (matching highest-capacity trucks to top-priority nodes)
        and Rapid Gully-Cleaning Squads (targeting highest gully choke nodes), and generates
        Flood-Safe Inner-Sector V4/V5 Routes + Citizen Safe Bypass Advisories.
        """
        now_utc = datetime.now(timezone.utc)
        num_trucks = int(np.clip(available_trucks, 0, len(self.SUPER_SUCKER_FLEET)))
        active_trucks = self.SUPER_SUCKER_FLEET[:num_trucks]

        scored_nodes: List[Dict[str, Any]] = []
        for raw_node in nodes_state:
            node = dict(raw_node)
            node_id = str(node.get("id", "UNKNOWN-NODE"))
            features = self._normalize_node_features(node)

            priority = self.compute_priority_score(
                rise_rate=features["rise_rate"],
                hospital_corridor_weight=features["hospital_corridor_weight"],
                backflow_risk=features["backflow_risk"],
                traffic_density=features["traffic_density"],
            )

            # Estimate standing water volume (m3) if not explicitly supplied by BackflowEngine
            depth_cm = float(node.get("current_depth_cm", 0.0))
            if "water_volume_m3" in node and node["water_volume_m3"] is not None and float(node["water_volume_m3"]) > 0:
                water_vol_m3 = float(node["water_volume_m3"])
            else:
                pondable_area = float(node.get("pondable_area_m2", 3600.0))
                water_vol_m3 = round((depth_cm / 100.0) * pondable_area, 2)

            routing_info = self.CHANDIGARH_ROUTING_MATRIX.get(
                node_id,
                {
                    "truck_v4_v5_route": (
                        f"Deploy via {node.get('sector', 'Local Sector')} Internal V4 Market Road -> "
                        "Dry V5 High-Crown Lane -> Stage pump away from flooded V3 rotary."
                    ),
                    "citizen_safe_bypass": (
                        f"AVOID {node.get('name', node_id)}. Divert via adjacent Sector Internal V4 Road."
                    ),
                    "route_waypoints": [],
                },
            )

            scored_nodes.append(
                {
                    **node,
                    "node_id": node_id,
                    "priority_score": priority,
                    "or_feature_breakdown": features,
                    "water_volume_m3": round(water_vol_m3, 2),
                    "safe_detour_route": routing_info["truck_v4_v5_route"],
                    "citizen_bypass_advisory": routing_info["citizen_safe_bypass"],
                    "route_waypoints": routing_info["route_waypoints"],
                }
            )

        # Sort descending by OR priority score (tie-breaker: water_volume_m3)
        scored_nodes.sort(key=lambda x: (x["priority_score"], x["water_volume_m3"]), reverse=True)

        # ---------------------------------------------------------------------
        # 1. Allocate Super-Sucker Pump Trucks (Greedy Capacitated OR Matching)
        # ---------------------------------------------------------------------
        pump_dispatches: List[Dict[str, Any]] = []
        allocated_node_ids: set[str] = set()

        for idx, truck in enumerate(active_trucks):
            if idx >= len(scored_nodes):
                break

            target_node = scored_nodes[idx]
            allocated_node_ids.add(target_node["node_id"])

            pump_cap = float(truck["pump_capacity_m3_hr"])
            water_vol = float(target_node["water_volume_m3"])
            drain_mins = self.compute_time_to_drain_mins(water_vol, pump_cap)

            # Truck ETA via dry V4/V5 inner-sector lanes (typically 6 - 11 mins in Chandigarh grid)
            truck_eta_mins = 6 + (idx * 2)
            sla_deadline = (now_utc + timedelta(minutes=int(np.ceil(drain_mins)) + truck_eta_mins + 15)).isoformat()

            pump_dispatches.append(
                {
                    "dispatch_rank": idx + 1,
                    "asset_id": truck["asset_id"],
                    "asset_name": truck["asset_name"],
                    "asset_type": "SUPER_SUCKER_PUMP",
                    "pump_capacity_m3_hr": pump_cap,
                    "base_sector": truck["base_sector"],
                    "node_id": target_node["node_id"],
                    "node_name": target_node.get("name", target_node["node_id"]),
                    "sector": target_node.get("sector", "Chandigarh Grid"),
                    "priority_score": target_node["priority_score"],
                    "or_feature_breakdown": target_node["or_feature_breakdown"],
                    "current_depth_cm": target_node.get("current_depth_cm", 0.0),
                    "water_volume_m3": water_vol,
                    "time_to_drain_mins": drain_mins,
                    "truck_eta_mins": truck_eta_mins,
                    "total_clearance_eta_mins": round(truck_eta_mins + drain_mins, 1),
                    "safe_detour_route": target_node["safe_detour_route"],
                    "citizen_bypass_advisory": target_node["citizen_bypass_advisory"],
                    "route_waypoints": target_node["route_waypoints"],
                    "proof_verified": False,
                    "status": "DISPATCHED",
                    "dispatched_at_utc": now_utc.isoformat(),
                    "sla_deadline_utc": sla_deadline,
                }
            )

        # ---------------------------------------------------------------------
        # 2. Allocate Rapid Gully-Cleaning Squads to Highest Gully-Choke Nodes
        # ---------------------------------------------------------------------
        gully_candidates = sorted(
            scored_nodes,
            key=lambda x: (float(x.get("gully_choke_pct", 0.0)), x["priority_score"]),
            reverse=True,
        )

        gully_squad_dispatches: List[Dict[str, Any]] = []
        for idx, squad in enumerate(self.GULLY_SQUAD_FLEET):
            if idx >= len(gully_candidates):
                break

            target_node = gully_candidates[idx]
            choke_pct = float(target_node.get("gully_choke_pct", 45.0))
            clearance_rate = float(squad["clearance_rate_pct_hr"])
            desilt_mins = round((choke_pct / clearance_rate) * 60.0, 1)

            gully_squad_dispatches.append(
                {
                    "asset_id": squad["asset_id"],
                    "asset_name": squad["asset_name"],
                    "asset_type": "GULLY_SQUAD",
                    "base_sector": squad["base_sector"],
                    "node_id": target_node["node_id"],
                    "node_name": target_node.get("name", target_node["node_id"]),
                    "sector": target_node.get("sector", "Chandigarh Grid"),
                    "gully_choke_pct": choke_pct,
                    "estimated_desilt_mins": desilt_mins,
                    "squad_eta_mins": 5 + (idx * 2),
                    "safe_detour_route": target_node["safe_detour_route"],
                    "status": "DISPATCHED",
                }
            )

        # ---------------------------------------------------------------------
        # 3. Compile Public Traffic & Emergency Corridor Bypass Advisories
        # ---------------------------------------------------------------------
        citizen_advisories = [
            {
                "node_id": n["node_id"],
                "node_name": n.get("name", n["node_id"]),
                "priority_score": n["priority_score"],
                "current_depth_cm": n.get("current_depth_cm", 0.0),
                "backflow_eta_mins": n.get("backflow_eta_mins"),
                "citizen_bypass_advisory": n["citizen_bypass_advisory"],
                "assigned_pump": next(
                    (d["asset_id"] for d in pump_dispatches if d["node_id"] == n["node_id"]),
                    "QUEUED_NEXT_WAVE",
                ),
            }
            for n in scored_nodes
        ]

        return {
            "optimization_metadata": {
                "formula": "priority = 0.35 * rise_rate + 0.30 * hospital_corridor_weight + 0.20 * backflow_risk + 0.15 * traffic_density",
                "available_trucks": num_trucks,
                "total_fleet_pumping_capacity_m3_hr": sum(t["pump_capacity_m3_hr"] for t in active_trucks),
                "optimized_at_utc": now_utc.isoformat(),
            },
            "ranked_nodes": scored_nodes,
            "super_sucker_dispatches": pump_dispatches,
            "gully_squad_dispatches": gully_squad_dispatches,
            "citizen_safe_bypass_advisories": citizen_advisories,
        }


# Canonical module-level aliases
CHANDIGARH_ROUTING_MATRIX = MCFleetDispatcher.CHANDIGARH_ROUTING_MATRIX
INNER_SECTOR_DETOURS = {
    nid: {
        "route": data["truck_v4_v5_route"],
        "advisory": data["citizen_safe_bypass"],
        "waypoints": data.get("route_waypoints", []),
    }
    for nid, data in CHANDIGARH_ROUTING_MATRIX.items()
}
