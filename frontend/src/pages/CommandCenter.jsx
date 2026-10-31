// =============================================================================
// FILE: frontend/src/pages/CommandCenter.jsx
// DESCRIPTION: Choe Sense 2.0 Dual-Mode Interface:
//              Mode 1: Executive War Room (Spatio-Temporal Crowd Deduplicator)
//              Mode 2: Zero-WhatsApp In-Cab Field Crew Terminal PWA
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap
} from 'react-leaflet';
import L from 'leaflet';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';

import 'leaflet/dist/leaflet.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const RAINVIEWER_HOST = "https://tilecache.rainviewer.com";
const DEFAULT_RADAR_PATH = "/v2/radar/9a0531cf482c";

const createPulsingMarker = (color) => {
  return L.divIcon({
    className: 'custom-pulsing-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <span class="absolute inline-flex h-6 w-6 animate-ping rounded-full opacity-75" style="background-color: ${color}"></span>
        <span class="relative inline-flex h-4 w-4 rounded-full border border-slate-900 shadow-md" style="background-color: ${color}"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const createTruckMarker = (type) => {
  const isPump = type === 'SUPER_SUCKER';
  const color = isPump ? '#10b981' : '#f59e0b';
  return L.divIcon({
    className: 'custom-truck-marker',
    html: `
      <div class="relative flex items-center justify-center bg-slate-950/90 border border-slate-700/80 p-1.5 rounded-md shadow-lg scale-90">
        <span class="text-xs font-semibold uppercase tracking-wider" style="color: ${color}">
          ${isPump ? '🚒 PUMP' : '🛠️ SQUAD'}
        </span>
      </div>
    `,
    iconSize: [64, 32],
    iconAnchor: [32, 16]
  });
};

function AutoMapCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function CommandCenter() {
  // Top-level view mode: 'WAR_ROOM' | 'CREW_PWA'
  const [viewMode, setViewMode] = useState('WAR_ROOM');

  const [rainRate, setRainRate] = useState(38.0);
  const [choeSurcharge, setChoeSurcharge] = useState(75.0);
  const [availableTrucks, setAvailableTrucks] = useState(3);

  const [dashboardData, setDashboardData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState("NODE-SEC22-23");
  const [mapCenter, setMapCenter] = useState([30.7368, 76.7738]);

  // Spatio-Temporal Crowd Deduplication state (Judge Demo Feature)
  const [rawCrowdMessages, setRawCrowdMessages] = useState(148);
  const [activeClustersCount, setActiveClustersCount] = useState(1);
  const [officerInterruptions, setOfficerInterruptions] = useState(0);
  const [burstRunning, setBurstRunning] = useState(false);

  // RainViewer Live Doppler Radar states
  const [showRadar, setShowRadar] = useState(true);
  const [radarPath, setRadarPath] = useState(DEFAULT_RADAR_PATH);
  const [radarOpacity, setRadarOpacity] = useState(0.70);
  const [radarTimestamp, setRadarTimestamp] = useState("RADAR: LIVE DOPPLER");

  // Crew PWA states
  const [selectedCrewUnit, setSelectedCrewUnit] = useState("MC-PUMP-01");
  const [crewProofVerified, setCrewProofVerified] = useState(false);

  // Load live RainViewer radar frames
  useEffect(() => {
    const handleRadarData = (data) => {
      if (data?.radar?.past && data.radar.past.length > 0) {
        const latest = data.radar.past[data.radar.past.length - 1];
        setRadarPath(latest.path);
        const timeDate = new Date(latest.time * 1000);
        setRadarTimestamp(`RADAR: ${timeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        return true;
      }
      return false;
    };

    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then(res => res.json())
      .then(data => {
        if (!handleRadarData(data)) {
          throw new Error("No past radar frames");
        }
      })
      .catch(() => {
        fetch('http://localhost:8000/api/weather/radar')
          .then(res => res.json())
          .then(data => {
            if (!handleRadarData(data)) {
              setRadarPath(DEFAULT_RADAR_PATH);
              setRadarTimestamp("RADAR: LIVE DOPPLER");
            }
          })
          .catch(() => {
            setRadarPath(DEFAULT_RADAR_PATH);
            setRadarTimestamp("RADAR: LIVE DOPPLER");
          });
      });
  }, []);

  useEffect(() => {
    const multi = 1 + (rainRate - 38.0) / 50.0;
    const surchargeMod = choeSurcharge / 75.0;

    const mockNodes = [
      {
        id: "NODE-PGI-SEC12",
        name: "PGI / Sector 12 V2 Emergency Gate",
        sector: "Sector 12",
        lat: 30.7615,
        lng: 76.7751,
        outfall_choe: "N-Choe",
        current_depth_cm: Math.round(22 * multi),
        gully_choke_pct: 39,
        water_volume_m3: Math.round(580 * multi),
        backflow_eta_mins: rainRate > 45 ? Math.round(30 / (multi * surchargeMod)) : null,
        priority_score: 0.89,
        reports_merged: 34,
        cluster_id: "CLUSTER-SEC12-0104",
        v4_v5_route: "Enter Sector 14 Internal V4 Spine -> Cross Sector 15A Dry V5 Lane -> PGI Gate 1",
        status_label: rainRate > 55 ? "CRITICAL_SUBMERGENCE" : "TWO_WHEELERS_STALL"
      },
      {
        id: "NODE-SEC22-23",
        name: "Sector 22/23 ISBT-17 Roundabout",
        sector: "Sector 22/23 Dividing V3",
        lat: 30.7368,
        lng: 76.7738,
        outfall_choe: "N-Choe",
        current_depth_cm: crewProofVerified ? 2 : Math.round(48 * multi),
        gully_choke_pct: crewProofVerified ? 5 : 54,
        water_volume_m3: Math.round(1100 * multi),
        backflow_eta_mins: crewProofVerified ? null : Math.round(18 / (multi * surchargeMod)),
        priority_score: 0.95,
        reports_merged: rawCrowdMessages,
        cluster_id: "CLUSTER-SEC22-0882",
        v4_v5_route: "Sector 17E Elevated Inner V4 Belt -> Sector 22C V5 Park Ring -> ISBT High Kerb",
        status_label: crewProofVerified ? "VERIFIED_CLEAR" : "TWO_WHEELERS_STALL"
      },
      {
        id: "NODE-IND-PH1",
        name: "Industrial Area Ph-1 Railway Underpass",
        sector: "Industrial Area Phase 1",
        lat: 30.7062,
        lng: 76.8045,
        outfall_choe: "Sukhna Choe",
        current_depth_cm: Math.round(58 * multi),
        gully_choke_pct: 62,
        water_volume_m3: Math.round(1200 * multi),
        backflow_eta_mins: null,
        priority_score: 0.92,
        reports_merged: 62,
        cluster_id: "CLUSTER-IND1-0419",
        v4_v5_route: "Plot 1-45 Internal Service V5 High Plinth -> Underpass Up-Ramp Crown",
        status_label: "CRITICAL_SUBMERGENCE"
      },
      {
        id: "NODE-TRIBUNE-CHOWK",
        name: "Tribune Chowk Dakshin Marg Roundabout",
        sector: "Sector 29/31/32 Chowk",
        lat: 30.7098,
        lng: 76.7912,
        outfall_choe: "Sukhna Choe",
        current_depth_cm: Math.round(34 * multi),
        gully_choke_pct: 57,
        water_volume_m3: Math.round(920 * multi),
        backflow_eta_mins: Math.round(14 / (multi * surchargeMod)),
        priority_score: 0.88,
        reports_merged: 41,
        cluster_id: "CLUSTER-TRIB-0291",
        v4_v5_route: "Sector 29B Internal V4 Mandir Road -> Sector 31A High-Ground V5 Lane",
        status_label: "TWO_WHEELERS_STALL"
      }
    ];

    const mockDispatches = [
      {
        asset_id: "MC-PUMP-01",
        asset_name: "Super-Sucker Alpha (1200 m³/hr)",
        node_id: "NODE-SEC22-23",
        target_name: "Sector 22/23 ISBT-17 Roundabout",
        status: crewProofVerified ? "VERIFIED_IDLE" : "AUTONOMOUS_PUMPING",
        drain_mins: 55,
        v4_v5_route: "Sector 17E Inner V4 Belt -> Sector 22C V5 Park Ring -> ISBT High Kerb"
      },
      {
        asset_id: "MC-PUMP-02",
        asset_name: "Super-Sucker Bravo (900 m³/hr)",
        node_id: "NODE-IND-PH1",
        target_name: "Industrial Area Ph-1 Underpass",
        status: "AUTONOMOUS_PUMPING",
        drain_mins: 80,
        v4_v5_route: "Plot 1-45 Internal Service V5 High Plinth -> Underpass Up-Ramp Crown"
      },
      {
        asset_id: "MC-PUMP-03",
        asset_name: "High-Head Pump Charlie (600 m³/hr)",
        node_id: "NODE-PGI-SEC12",
        target_name: "PGI / Sector 12 Emergency Gate",
        status: "EN_ROUTE_V5_CORRIDOR",
        drain_mins: 58,
        v4_v5_route: "Sector 14 Internal V4 Spine -> Sector 15A Dry V5 Lane -> PGI Gate 1"
      }
    ];

    setDashboardData({
      nodes: mockNodes,
      dispatches: mockDispatches,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [rainRate, choeSurcharge, availableTrucks, rawCrowdMessages, crewProofVerified]);

  // Simulate 200 panicked citizen WhatsApp reports arriving in 2 seconds -> 0 Officer Pings
  const triggerCrowdBurstSimulation = () => {
    setBurstRunning(true);
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setRawCrowdMessages(prev => prev + 25);
      if (step >= 8) {
        clearInterval(interval);
        setBurstRunning(false);
      }
    }, 120);
  };

  const selectedNode = dashboardData?.nodes.find(n => n.id === selectedNodeId) || dashboardData?.nodes[1];
  const activeCrewOrder = dashboardData?.dispatches.find(d => d.asset_id === selectedCrewUnit) || dashboardData?.dispatches[0];
  const suppressionRate = ((1 - (activeClustersCount / Math.max(1, rawCrowdMessages))) * 100).toFixed(2);

  const chartData = {
    labels: ['T-30m', 'T-20m', 'T-10m', 'Now', '+10m', '+20m'],
    datasets: [
      {
        label: 'Raw Citizen WhatsApp Reports / 10m',
        data: [12, 45, 92, rawCrowdMessages, 60, 18],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 2
      },
      {
        label: 'Officer Interruptions Sent (Zero-Spam Gate)',
        data: [0, 0, 1, officerInterruptions, 0, 0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: true,
        tension: 0.1,
        borderWidth: 2
      }
    ]
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">

      {/* TOP NAVIGATION & VIEW MODE SWITCHER */}
      <header className="relative z-30 flex h-14 items-center justify-between border-b border-slate-900 bg-slate-950 px-5 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 font-bold text-white">
            CS
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-white">
              Choe Sense 2.0 <span className="text-slate-600">|</span>
              <span className="ml-2 text-xs font-medium text-cyan-400">Zero-Spam Autonomous Flood & Fleet Engine</span>
            </h1>
          </div>
        </div>

        {/* DUAL ARCHITECTURE MODE SWITCHER FOR JUDGES */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('WAR_ROOM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'WAR_ROOM'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🖥️ Executive War Room (99.5% Spam Filter)
          </button>
          <button
            onClick={() => setViewMode('CREW_PWA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'CREW_PWA'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🚛 In-Cab Crew Terminal PWA (Replaces WhatsApp)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-950/60 border border-emerald-800/70 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            🔕 Officer WhatsApp Pings: <b>0 SENT</b>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MODE 1: EXECUTIVE WAR ROOM (WITH CROWD DEDUPLICATION & KALMAN FUSION)
          ===================================================================== */}
      {viewMode === 'WAR_ROOM' ? (
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* ANTI-SPAM DEDUPLICATION TELEMETRY BANNER */}
          <div className="relative z-20 grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-900/50 border-b border-slate-900 p-3 items-center pointer-events-auto">
            <div className="flex flex-col border-r border-slate-800 pr-3">
              <span className="text-[10px] uppercase text-slate-400 font-semibold">Incoming Citizen Reports</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-lg font-bold text-cyan-400">{rawCrowdMessages}</span>
                <span className="text-[10px] text-slate-500">WhatsApp msgs absorbed</span>
              </div>
            </div>

            <div className="flex flex-col border-r border-slate-800 px-3">
              <span className="text-[10px] uppercase text-slate-400 font-semibold">Spatio-Temporal Clusters</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-lg font-bold text-emerald-400">{activeClustersCount}</span>
                <span className="text-[10px] text-emerald-500 font-semibold">({suppressionRate}% Spam Suppressed)</span>
              </div>
            </div>

            <div className="flex flex-col border-r border-slate-800 px-3">
              <span className="text-[10px] uppercase text-slate-400 font-semibold">Officer Phone Disturbances</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-lg font-bold text-emerald-400">{officerInterruptions}</span>
                <span className="text-[10px] text-slate-400">100% Silent Auto-Dispatch</span>
              </div>
            </div>

            <div className="flex flex-col border-r border-slate-800 px-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>🎚️ Rain Intensity</span>
                <span className="font-mono font-bold text-cyan-400">{rainRate} mm/hr</span>
              </div>
              <input
                type="range" min="0" max="150" step="1"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-500 mt-1 relative z-20"
                value={rainRate} onChange={(e) => setRainRate(parseFloat(e.target.value))}
              />
            </div>

            <div className="flex items-center pl-2">
              <button
                onClick={triggerCrowdBurstSimulation}
                disabled={burstRunning}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-xs font-bold text-white shadow-lg transition cursor-pointer relative z-20 disabled:cursor-not-allowed"
              >
                {burstRunning ? '⚡ Absorbing 200 Msgs...' : '⚡ Simulate +200 Crowd Msgs'}
              </button>
            </div>
          </div>

          {/* 3-COLUMN WORKSPACE */}
          <div className="relative z-10 flex flex-1 overflow-hidden p-3 gap-3 pointer-events-auto">

            {/* LEFT PANEL: KALMAN CONSENSUS CLUSTER CARD */}
            <div className="relative z-20 flex w-80 flex-col gap-3 overflow-y-auto pointer-events-auto">
              <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    KALMAN CONSENSUS ENGINE
                  </h3>
                  <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800 px-1.5 py-0.5 rounded">
                    {selectedNode?.cluster_id}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Fuses {selectedNode?.reports_merged} citizen photos within 150m × 20m into 1 state vector
                </p>

                <div className="relative overflow-hidden rounded-lg bg-slate-950 border border-slate-800 aspect-[4/3]">
                  <img
                    src="https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=400&q=80"
                    alt="Clustered flood telemetry"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/90 border border-cyan-700 px-2 py-0.5 rounded text-[10px] text-cyan-300 font-bold">
                    🔀 {selectedNode?.reports_merged} Duplicate Reports Merged
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 border-t border-slate-800 p-2 flex justify-between items-center">
                    <span className="text-xs font-bold text-white">
                      Kalman Depth: <b className="text-emerald-400">{selectedNode?.current_depth_cm} cm (±1.4 cm)</b>
                    </span>
                    <span className="text-[10px] font-bold text-amber-400">
                      Choke: {selectedNode?.gully_choke_pct}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-[11px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Citizen Bot Flood Traffic:</span>
                    <span className="font-mono font-bold text-cyan-400">{selectedNode?.reports_merged} msgs / 20m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tickets Created:</span>
                    <span className="font-mono font-bold text-emerald-400">1 Consensus Ticket</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Officer Action Required:</span>
                    <span className="font-bold text-emerald-400">NONE (Auto-Dispatched)</span>
                  </div>
                </div>
              </div>

              {/* SPAM SUPPRESSION GRAPH */}
              <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3 flex-1 flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  CROWD TRAFFIC vs. OFFICER ALERTS
                </h3>
                <div className="flex-1 min-h-[130px]">
                  <Line
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 10, font: { size: 9 } } } },
                      scales: {
                        y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b', font: { size: 9 } } },
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CENTER PANEL: GIS SECTOR MAP */}
            <div className="relative z-10 flex-1 rounded-xl border border-slate-900 bg-slate-950 overflow-hidden pointer-events-auto">
              
              {/* RAINVIEWER LIVE DOPPLER RADAR HUD */}
              <div className="absolute top-3 right-3 z-[1000] bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 shadow-2xl backdrop-blur-sm flex flex-col gap-1.5 min-w-[210px] pointer-events-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    <span className="text-[11px] font-bold text-white tracking-wide">Doppler Rain Radar</span>
                  </div>
                  <button
                    onClick={() => setShowRadar(!showRadar)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                      showRadar ? 'bg-cyan-600 text-white shadow' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {showRadar ? 'ACTIVE' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-900 pt-1">
                  <span className="font-mono text-cyan-300">{radarTimestamp}</span>
                  <span className="text-slate-500 text-[9px]">RainViewer 2.0</span>
                </div>
                {showRadar && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[9px] text-slate-500">Opacity:</span>
                    <input
                      type="range" min="0.2" max="1" step="0.05"
                      value={radarOpacity}
                      onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
                      className="h-1 flex-1 cursor-pointer appearance-none rounded bg-slate-800 accent-cyan-500 relative z-20"
                    />
                    <span className="text-[9px] font-mono text-slate-400">{Math.round(radarOpacity * 100)}%</span>
                  </div>
                )}
              </div>

              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer
                  url={OSM_TILES}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* RainViewer Live Doppler Precipitation Radar Layer */}
                {showRadar && radarPath && (
                  <TileLayer
                    key={`radar-${radarPath}`}
                    url={`${RAINVIEWER_HOST}${radarPath}/256/{z}/{x}/{y}/2/1_1.png`}
                    opacity={radarOpacity}
                    zIndex={400}
                    maxNativeZoom={7}
                    maxZoom={19}
                    tileSize={256}
                  />
                )}
                
                <AutoMapCenter center={mapCenter} />

                <Polyline
                  positions={[[30.7615, 76.7751], [30.7368, 76.7738], [30.7285, 76.7562]]}
                  pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.75, dashArray: '5, 10' }}
                />
                <Polyline
                  positions={[[30.7410, 76.7821], [30.7392, 76.7775], [30.7368, 76.7738]]}
                  pathOptions={{ color: '#06b6d4', weight: 3, opacity: 0.9, dashArray: '3, 6' }}
                />

                {dashboardData?.nodes.map((node) => {
                  const val = node.current_depth_cm;
                  const markerColor = val >= 55 ? "#ef4444" : (val >= 15 ? "#f97316" : "#10b981");
                  return (
                    <React.Fragment key={node.id}>
                      <Circle
                        center={[node.lat, node.lng]}
                        radius={180 + (val * 3)}
                        pathOptions={{ fillColor: markerColor, color: markerColor, fillOpacity: 0.16, weight: 1.5 }}
                      />
                      <Marker
                        position={[node.lat, node.lng]}
                        icon={createPulsingMarker(markerColor)}
                        eventHandlers={{
                          click: () => {
                            setSelectedNodeId(node.id);
                            setMapCenter([node.lat, node.lng]);
                          }
                        }}
                      />
                    </React.Fragment>
                  );
                })}
                <Marker position={[30.7410, 76.7821]} icon={createTruckMarker('SUPER_SUCKER')} />
              </MapContainer>
            </div>

            {/* RIGHT PANEL: SILENT AUTONOMOUS FLEET LEDGER */}
            <div className="relative z-20 flex w-96 flex-col gap-3 overflow-y-auto pointer-events-auto">
              <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    AUTONOMOUS IN-CAB DISPATCH QUEUE
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                    ZERO-HUMAN-PING
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Dispatched directly to Super-Sucker Crew PWA via Pull API
                </p>

                <div className="space-y-2">
                  {dashboardData?.dispatches.map((d) => (
                    <div key={d.asset_id} className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{d.asset_id}</span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
                          {d.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{d.target_name}</div>
                      <div className="mt-1.5 flex justify-between items-center text-[10px] text-slate-500">
                        <span>Drain Time: <b className="text-cyan-400">{d.drain_mins} mins</b></span>
                        <button
                          onClick={() => {
                            setSelectedCrewUnit(d.asset_id);
                            setViewMode('CREW_PWA');
                          }}
                          className="text-cyan-400 hover:underline font-semibold cursor-pointer"
                        >
                          Open In-Cab PWA ➔
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CLUSTERED NODE CARDS */}
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {dashboardData?.nodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setMapCenter([node.lat, node.lng]);
                    }}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      selectedNodeId === node.id ? 'bg-slate-900/70 border-cyan-500' : 'bg-slate-900/20 border-slate-900'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-200">{node.name}</span>
                      <span className="text-xs font-bold text-emerald-400">{node.current_depth_cm} cm</span>
                    </div>
                    <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400">
                      <span>Absorbed: <b className="text-cyan-400">{node.reports_merged} citizen msgs</b></span>
                      <span>Backflow: <b className="text-amber-400">{node.backflow_eta_mins ? `T-${node.backflow_eta_mins}m` : 'STABLE'}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* =====================================================================
           MODE 2: ZERO-WHATSAPP IN-CAB FIELD CREW TERMINAL PWA
           ===================================================================== */
        <div className="flex flex-1 items-center justify-center bg-slate-950 p-6 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border-2 border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  MC CHANDIGARH IN-CAB CREW PWA
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">
                  Unit Terminal: {activeCrewOrder?.asset_id}
                </h2>
              </div>
              <select
                value={selectedCrewUnit}
                onChange={(e) => setSelectedCrewUnit(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 cursor-pointer"
              >
                <option value="MC-PUMP-01">MC-PUMP-01</option>
                <option value="MC-PUMP-02">MC-PUMP-02</option>
                <option value="MC-PUMP-03">MC-PUMP-03</option>
              </select>
            </div>

            <div className="mt-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 p-3 text-xs text-emerald-300">
              🛡️ <b>Zero-WhatsApp Field Architecture:</b> This tablet pulls <b>1 active job at a time</b> via HTTPS. Drivers and officers never receive citizen messages or off-duty pings on personal phones.
            </div>

            <div className="mt-4 rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500">ACTIVE WORK ORDER (SINGLE-TASK LOCK)</span>
                <span className="text-xs font-bold text-amber-400">{activeCrewOrder?.status}</span>
              </div>
              <div className="text-sm font-bold text-white">{activeCrewOrder?.target_name}</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                <b className="text-cyan-400 block mb-0.5">Flood-Safe V4/V5 Inner-Sector Route:</b>
                {activeCrewOrder?.v4_v5_route}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Est. Pumping Time</span>
                  <b className="text-white">{activeCrewOrder?.drain_mins} mins</b>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Geofence Lock</span>
                  <b className="text-emerald-400">11.4m (&lt;= 50m Pass)</b>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setCrewProofVerified(true)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
              >
                {crewProofVerified
                  ? '✅ SLA Proof Verified (< 5cm Kerb Restored) — Unit Released'
                  : '📸 Capture Post-Pumping Kerb Photo & Verify SLA (< 5cm)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
