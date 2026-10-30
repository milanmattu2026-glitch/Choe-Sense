# =============================================================================
# FILE: ml/backflow_engine.py
# DESCRIPTION: Directed Storm-Pipe & Choe Outfall Hydraulic Backflow Engine
#              Models N-Choe, Sukhna Choe, and Patiala Ki Rao reverse pressure waves
# =============================================================================

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np


class UrbanBackflowEngine:
    """
    Simulates Chandigarh's directed underground storm-drainage network feeding
    into N-Choe, Sukhna Choe, and Patiala Ki Rao.

    Core Physical Mechanics:
      1. Concrete surface runoff volume (m3/hr) from Rational Method:
         Q_runoff = C * (I_mm_hr / 1000.0) * Area_m2
      2. Effective Road Gully Intake capacity modulated by leaf/plastic choke:
         effective_drain_rate_in_hr = 0.5 * (1.0 - (gully_choke_pct / 100.0) * 0.85)
      3. Outfall Choe Surcharge Penalty:
         When N-Choe or Sukhna Choe water level rises above invert level
         (choe_surcharge_pct > 60%), hydraulic head throttles outfall discharge.
      4. Reverse Hydraulic Backflow Surge (m3) & Backflow ETA (mins):
         Excess trunk volume propagates upstream into feeding sector roundabouts
         (e.g., Sector 36 N-Choe -> Sector 22/23 Roundabout -> PGI Sector 12)
         computing exact `backflow_eta_mins` before roundabout kerb submergence.
    """

    DEFAULT_TRICITY_NETWORK: List[Dict[str, Any]] = [
        {
            "id": "NODE-PGI-SEC12",
            "name": "PGI / Sector 12 Madhya Marg V2 Emergency Gate",
            "sector": "Sector 12",
            "lat": 30.7615,
            "lng": 76.7751,
            "catchment_area_m2": 62000.0,
            "imperviousness_coeff": 0.87,
            "pondable_area_m2": 3400.0,
            "pipe_capacity_m3": 1050.0,
            "pipe_length_to_downstream_m": 1850.0,
            "pipe_slope": 0.0035,
            "downstream_node_id": "NODE-SEC22-23",
            "outfall_choe": "N-Choe",
            "gully_choke_pct": 39.0,
            "base_depth_cm": 12.0,
            "hospital_corridor_weight": 1.00,
            "traffic_density": 0.89,
        },
        {
            "id": "NODE-SEC22-23",
            "name": "Sector 22/23 ISBT-17 Roundabout",
            "sector": "Sector 22/23 Dividing V3",
            "lat": 30.7368,
            "lng": 76.7738,
            "catchment_area_m2": 68000.0,
            "imperviousness_coeff": 0.90,
            "pondable_area_m2": 3800.0,
            "pipe_capacity_m3": 1150.0,
            "pipe_length_to_downstream_m": 1450.0,
            "pipe_slope": 0.0028,
            "downstream_node_id": "NODE-SEC36-NCHOE",
            "outfall_choe": "N-Choe",
            "gully_choke_pct": 54.0,
            "base_depth_cm": 18.0,
            "hospital_corridor_weight": 0.78,
            "traffic_density": 0.92,
        },
        {
            "id": "NODE-SEC36-NCHOE",
            "name": "Sector 36 N-Choe Trunk Outfall",
            "sector": "Sector 36",
            "lat": 30.7285,
            "lng": 76.7562,
            "catchment_area_m2": 92000.0,
            "imperviousness_coeff": 0.88,
            "pondable_area_m2": 4600.0,
            "pipe_capacity_m3": 1950.0,
            "pipe_length_to_downstream_m": 600.0,
            "pipe_slope": 0.0022,
            "downstream_node_id": None,
            "outfall_choe": "N-Choe",
            "gully_choke_pct": 48.0,
            "base_depth_cm": 16.0,
            "hospital_corridor_weight": 0.45,
            "traffic_density": 0.72,
        },
        {
            "id": "NODE-TRIBUNE-CHOWK",
            "name": "Tribune Chowk Dakshin Marg Roundabout",
            "sector": "Sector 29/31/32 Chowk",
            "lat": 30.7098,
            "lng": 76.7912,
            "catchment_area_m2": 78000.0,
            "imperviousness_coeff": 0.92,
            "pondable_area_m2": 4100.0,
            "pipe_capacity_m3": 1250.0,
            "pipe_length_to_downstream_m": 1300.0,
            "pipe_slope": 0.0025,
            "downstream_node_id": "NODE-IND-PH1",
            "outfall_choe": "Sukhna Choe",
            "gully_choke_pct": 57.0,
            "base_depth_cm": 20.0,
            "hospital_corridor_weight": 0.65,
            "traffic_density": 0.96,
        },
        {
            "id": "NODE-IND-PH1",
            "name": "Industrial Area Ph-1 Railway Underpass",
            "sector": "Industrial Area Phase 1",
            "lat": 30.7062,
            "lng": 76.8045,
            "catchment_area_m2": 88000.0,
            "imperviousness_coeff": 0.94,
            "pondable_area_m2": 2900.0,
            "pipe_capacity_m3": 1500.0,
            "pipe_length_to_downstream_m": 500.0,
            "pipe_slope": 0.0018,
            "downstream_node_id": None,
            "outfall_choe": "Sukhna Choe",
            "gully_choke_pct": 62.0,
            "base_depth_cm": 26.0,
            "hospital_corridor_weight": 0.40,
            "traffic_density": 0.88,
        },
        {
            "id": "NODE-ZIRAKPUR-RAO",
            "name": "Zirakpur-Patiala Ki Rao Box Culvert",
            "sector": "Zirakpur NH-7",
            "lat": 30.6542,
            "lng": 76.8214,
            "catchment_area_m2": 115000.0,
            "imperviousness_coeff": 0.91,
            "pondable_area_m2": 4800.0,
            "pipe_capacity_m3": 1750.0,
            "pipe_length_to_downstream_m": 700.0,
            "pipe_slope": 0.0020,
            "downstream_node_id": None,
            "outfall_choe": "Patiala Ki Rao",
            "gully_choke_pct": 68.0,
            "base_depth_cm": 24.0,
            "hospital_corridor_weight": 0.55,
            "traffic_density": 0.95,
        },
    ]

    # Topological order from upstream collectors down to Choe outfalls
    UPSTREAM_TO_DOWNSTREAM_ORDER: List[str] = [
        "NODE-PGI-SEC12",
        "NODE-SEC22-23",
        "NODE-SEC36-NCHOE",
        "NODE-TRIBUNE-CHOWK",
        "NODE-IND-PH1",
        "NODE-ZIRAKPUR-RAO",
    ]

    def __init__(self, custom_nodes: Optional[List[Dict[str, Any]]] = None) -> None:
        self.nodes_template = custom_nodes if custom_nodes is not None else self.DEFAULT_TRICITY_NETWORK

    @staticmethod
    def _compute_effective_drain_rate_in_hr(gully_choke_pct: float) -> float:
        clamped = float(np.clip(gully_choke_pct, 0.0, 100.0))
        return float(0.5 * (1.0 - (clamped / 100.0) * 0.85))

    def simulate_grid(
        self,
        rain_mm_hr: float,
        gully_choke_override: float | None = None,
        choe_surcharge_pct: float = 75.0,
    ) -> dict:
        """
        Executes a 2-pass forward runoff + reverse hydraulic backflow propagation simulation
        across the Chandigarh storm-pipe grid in <2ms.
        """
        rain_intensity = max(0.0, float(rain_mm_hr))
        surcharge_pct = float(np.clip(choe_surcharge_pct, 0.0, 150.0))

        # Index nodes and build upstream adjacency map
        node_map: Dict[str, Dict[str, Any]] = {}
        upstream_links: Dict[str, List[str]] = {n["id"]: [] for n in self.nodes_template}

        for raw in self.nodes_template:
            node = dict(raw)
            choke = (
                float(np.clip(gully_choke_override, 0.0, 100.0))
                if gully_choke_override is not None
                else float(node["gully_choke_pct"])
            )
            node["effective_gully_choke_pct"] = round(choke, 1)
            node["effective_drain_rate_in_hr"] = round(self._compute_effective_drain_rate_in_hr(choke), 4)
            node_map[node["id"]] = node

            ds_id = node.get("downstream_node_id")
            if ds_id and ds_id in upstream_links:
                upstream_links[ds_id].append(node["id"])

        # ---------------------------------------------------------------------
        # PASS 1: Forward Hydrological Runoff & Pipe Intake (Upstream -> Outfall)
        # ---------------------------------------------------------------------
        for node_id in self.UPSTREAM_TO_DOWNSTREAM_ORDER:
            node = node_map[node_id]
            area_m2 = float(node["catchment_area_m2"])
            c_imperv = float(node["imperviousness_coeff"])
            drain_in_hr = float(node["effective_drain_rate_in_hr"])
            drain_mm_hr = drain_in_hr * 25.4

            # Surface concrete runoff generated in 1 hour (m3)
            surface_runoff_m3 = c_imperv * (rain_intensity / 1000.0) * area_m2

            # Maximum volume road gullies can swallow into underground lateral pipes (m3)
            # Scaled by 2.4x urban grating capture area factor
            gully_intake_capacity_m3 = (drain_mm_hr / 1000.0) * area_m2 * 2.4

            actual_pipe_inflow_m3 = min(surface_runoff_m3, gully_intake_capacity_m3)
            surface_gully_reject_m3 = max(0.0, surface_runoff_m3 - actual_pipe_inflow_m3)

            node["surface_runoff_m3"] = round(surface_runoff_m3, 2)
            node["gully_intake_capacity_m3"] = round(gully_intake_capacity_m3, 2)
            node["local_pipe_inflow_m3"] = round(actual_pipe_inflow_m3, 2)
            node["surface_gully_reject_m3"] = round(surface_gully_reject_m3, 2)
            node["upstream_pipe_inflow_m3"] = 0.0
            node["backflow_surge_m3"] = 0.0

        # Accumulate forward pipe flow down the trunk lines
        for node_id in self.UPSTREAM_TO_DOWNSTREAM_ORDER:
            node = node_map[node_id]
            total_pipe_load = node["local_pipe_inflow_m3"] + node["upstream_pipe_inflow_m3"]

            # Outfall nodes suffer tailwater throttling when N-Choe / Sukhna Choe surcharge > 60%
            is_outfall = node.get("downstream_node_id") is None
            if is_outfall and surcharge_pct > 60.0:
                surcharge_throttle = max(0.28, 1.0 - ((surcharge_pct - 60.0) / 100.0) * 0.82)
            else:
                surcharge_throttle = 1.0

            effective_pipe_cap_m3 = float(node["pipe_capacity_m3"]) * surcharge_throttle
            forward_conveyed_m3 = min(total_pipe_load, effective_pipe_cap_m3)
            local_pipe_surcharge_m3 = max(0.0, total_pipe_load - effective_pipe_cap_m3)

            node["effective_pipe_capacity_m3"] = round(effective_pipe_cap_m3, 2)
            node["total_pipe_load_m3"] = round(total_pipe_load, 2)
            node["local_pipe_surcharge_m3"] = round(local_pipe_surcharge_m3, 2)

            ds_id = node.get("downstream_node_id")
            if ds_id and ds_id in node_map:
                # 78% of conveyed trunk volume reaches the downstream junction within the storm window
                node_map[ds_id]["upstream_pipe_inflow_m3"] = round(
                    node_map[ds_id]["upstream_pipe_inflow_m3"] + forward_conveyed_m3 * 0.78, 2
                )

        # ---------------------------------------------------------------------
        # PASS 2: Reverse Hydraulic Backflow Surge Propagation (Outfall -> Upstream)
        # ---------------------------------------------------------------------
        backflow_alerts: List[Dict[str, Any]] = []

        for node_id in reversed(self.UPSTREAM_TO_DOWNSTREAM_ORDER):
            node = node_map[node_id]
            total_surcharge = node["local_pipe_surcharge_m3"] + node["backflow_surge_m3"]

            # Push hydraulic backpressure wave upstream into feeding sector roundabouts
            parents = upstream_links.get(node_id, [])
            if total_surcharge > 0.0 and parents:
                # Fraction of surcharged head that reverses up the trunk gradient
                reverse_transfer_ratio = 0.58 if surcharge_pct >= 70.0 else 0.42
                backflow_to_parents = total_surcharge * reverse_transfer_ratio
                share_per_parent = backflow_to_parents / len(parents)

                for parent_id in parents:
                    parent_node = node_map[parent_id]
                    parent_node["backflow_surge_m3"] = round(
                        parent_node["backflow_surge_m3"] + share_per_parent, 2
                    )

        # ---------------------------------------------------------------------
        # PASS 3: Compute Final Standing Water Volume, Depth (cm), Rise Rate & ETA
        # ---------------------------------------------------------------------
        simulated_nodes: List[Dict[str, Any]] = []

        for node_id in self.UPSTREAM_TO_DOWNSTREAM_ORDER:
            node = node_map[node_id]
            pondable_area = float(node["pondable_area_m2"])

            # Total standing water volume = surface gully reject + reverse manholes surge + 35% local pipe surcharge
            standing_water_m3 = (
                node["surface_gully_reject_m3"]
                + node["backflow_surge_m3"]
                + (node["local_pipe_surcharge_m3"] * 0.35)
            )
            standing_water_m3 = round(max(0.0, standing_water_m3), 2)

            # Convert ponded volume to street depth in centimeters
            dynamic_depth_cm = (standing_water_m3 / pondable_area) * 100.0
            baseline_contribution = float(node["base_depth_cm"]) * (min(rain_intensity, 60.0) / 60.0) * 0.35
            current_depth_cm = round(float(np.clip(baseline_contribution + dynamic_depth_cm, 0.0, 195.0)), 1)

            # Compute Backflow ETA (minutes) for hydraulic wave to submerge roundabout
            pipe_len_m = float(node["pipe_length_to_downstream_m"])
            has_backflow = node["backflow_surge_m3"] > 15.0 or node["local_pipe_surcharge_m3"] > 40.0

            if has_backflow and rain_intensity > 5.0:
                # Celerity of reverse surcharge wave in pressurized storm trunk (m/min)
                wave_speed_m_min = 48.0 + (surcharge_pct * 0.32) + (rain_intensity * 0.18)
                backpressure_factor = 1.0 + (node["backflow_surge_m3"] / max(200.0, node["pipe_capacity_m3"]))
                raw_eta = (pipe_len_m / wave_speed_m_min) / backpressure_factor
                backflow_eta_mins: Optional[int] = int(np.clip(round(raw_eta), 4, 45))
            else:
                backflow_eta_mins = None

            # Normalized risk & rise rate metrics (0.0 - 1.0) for MCFleetDispatcher
            rise_rate_cm_hr = round(current_depth_cm * (0.65 + (node["effective_gully_choke_pct"] / 200.0)), 1)
            normalized_rise_rate = round(float(np.clip(rise_rate_cm_hr / 75.0, 0.0, 1.0)), 4)

            if backflow_eta_mins is not None:
                backflow_risk = round(float(np.clip(1.0 - (backflow_eta_mins / 48.0), 0.25, 1.0)), 4)
            else:
                backflow_risk = round(
                    float(np.clip(node["total_pipe_load_m3"] / max(1.0, node["effective_pipe_capacity_m3"]) * 0.5, 0.0, 0.45)),
                    4,
                )

            if current_depth_cm >= 85.0:
                status_label = "CRITICAL_SUBMERGENCE"
            elif current_depth_cm >= 55.0:
                status_label = "SEDANS_HYDROLOCK_IMPASSABLE"
            elif current_depth_cm >= 30.0:
                status_label = "TWO_WHEELERS_STALL"
            elif current_depth_cm >= 18.0:
                status_label = "KERB_SUBMERGED_ADVISORY"
            else:
                status_label = "NORMAL_FLOW"

            node_summary = {
                "id": node["id"],
                "name": node["name"],
                "sector": node["sector"],
                "lat": node["lat"],
                "lng": node["lng"],
                "outfall_choe": node["outfall_choe"],
                "downstream_node_id": node["downstream_node_id"],
                "gully_choke_pct": node["effective_gully_choke_pct"],
                "effective_drain_rate_in_hr": node["effective_drain_rate_in_hr"],
                "surface_runoff_m3": node["surface_runoff_m3"],
                "pipe_capacity_m3": node["pipe_capacity_m3"],
                "effective_pipe_capacity_m3": node["effective_pipe_capacity_m3"],
                "total_pipe_load_m3": node["total_pipe_load_m3"],
                "hydraulic_backflow_surge_m3": node["backflow_surge_m3"],
                "water_volume_m3": standing_water_m3,
                "current_depth_cm": current_depth_cm,
                "rise_rate_cm_hr": rise_rate_cm_hr,
                "rise_rate": normalized_rise_rate,
                "backflow_eta_mins": backflow_eta_mins,
                "backflow_eta_label": f"T-{backflow_eta_mins} mins" if backflow_eta_mins is not None else "STABLE",
                "backflow_risk": backflow_risk,
                "hospital_corridor_weight": float(node["hospital_corridor_weight"]),
                "traffic_density": float(node["traffic_density"]),
                "status_label": status_label,
            }
            simulated_nodes.append(node_summary)

            if backflow_eta_mins is not None and backflow_eta_mins <= 30:
                backflow_alerts.append(
                    {
                        "node_id": node["id"],
                        "node_name": node["name"],
                        "outfall_choe": node["outfall_choe"],
                        "backflow_surge_m3": node["backflow_surge_m3"],
                        "backflow_eta_mins": backflow_eta_mins,
                        "countdown_banner": (
                            f"ALERT: {node['outfall_choe']} reverse surcharge wave ({node['backflow_surge_m3']:.0f} m3) "
                            f"will submerge {node['name']} in T-{backflow_eta_mins} mins."
                        ),
                    }
                )

        # Sort alerts by shortest ETA first
        backflow_alerts.sort(key=lambda x: x["backflow_eta_mins"])

        return {
            "simulation_parameters": {
                "rain_mm_hr": rain_intensity,
                "gully_choke_override": gully_choke_override,
                "choe_surcharge_pct": surcharge_pct,
                "simulated_at_utc": datetime.now(timezone.utc).isoformat(),
            },
            "choe_outfall_telemetry": {
                "N-Choe": {
                    "surcharge_pct": surcharge_pct,
                    "hydraulic_status": "REVERSE_BACKFLOW_SURGE" if surcharge_pct >= 70.0 else "ELEVATED_FLOW",
                },
                "Sukhna Choe": {
                    "surcharge_pct": round(min(100.0, surcharge_pct * 1.05), 1),
                    "hydraulic_status": "REVERSE_BACKFLOW_SURGE" if surcharge_pct >= 65.0 else "ELEVATED_FLOW",
                },
                "Patiala Ki Rao": {
                    "surcharge_pct": round(min(100.0, surcharge_pct * 0.98), 1),
                    "hydraulic_status": "CULVERT_THROTTLED" if surcharge_pct >= 70.0 else "MODERATE_FLOW",
                },
            },
            "nodes": simulated_nodes,
            "backflow_alerts": backflow_alerts,
            "total_city_standing_water_m3": round(sum(n["water_volume_m3"] for n in simulated_nodes), 2),
        }
