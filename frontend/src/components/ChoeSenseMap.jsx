// frontend/src/components/ChoeSenseMap.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

export default function ChoeSenseMap() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rainSlider, setRainSlider] = useState(55.0);

  const fetchMapData = async (rain) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/map-data?rain_mm_hr=${rain}`);
      setMapData(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch Choe Sense map data", err);
    }
  };

  useEffect(() => {
    fetchMapData(rainSlider);
    const interval = setInterval(() => fetchMapData(rainSlider), 10000);
    return () => clearInterval(interval);
  }, [rainSlider]);

  if (loading || !mapData) {
    return <div className="p-6 text-white bg-slate-900 h-screen flex items-center justify-center">Loading Choe Sense 2.0 Hydrological Grid...</div>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* LEFT MAP CONTAINER (Fixed flex sizing so Leaflet renders correctly) */}
      <div className="w-2/3 h-full relative z-0">
        <MapContainer 
          center={[30.7333, 76.7794]} 
          zoom={13} 
          style={{ height: '100%', width: '100%', background: '#090d16' }}
        >
          {/* Using reliable OpenStreetMap tiles with zero API key restrictions */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Chronic Flood Nodes */}
          {mapData.nodes.map((node) => {
            const isCritical = node.status === "CRITICAL_BACKFLOW" || node.status_label === "CRITICAL_SUBMERGENCE" || node.current_depth_cm >= 55;
            const isWarning = node.status === "WARNING" || node.status_label === "TWO_WHEELERS_STALL" || node.current_depth_cm >= 30;
            const color = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";
            
            return (
              <CircleMarker
                key={node.id}
                center={[node.lat, node.lng]}
                radius={isCritical ? 14 : 10}
                pathOptions={{ color: color, fillColor: color, fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <div className="text-slate-900 p-2 min-w-[180px]">
                    <h3 className="font-bold text-base">{node.name}</h3>
                    <p className="text-xs text-slate-600">Sector: {node.sector} | Outfall: {node.outfall || node.outfall_choe}</p>
                    <hr className="my-1"/>
                    <p><b>Water Depth:</b> {node.current_depth_cm} cm</p>
                    <p><b>Gully Choke:</b> {node.gully_choke_pct}%</p>
                    <p className="text-red-600 font-semibold"><b>Backflow Surge ETA:</b> {node.backflow_eta_mins ? `T-${node.backflow_eta_mins} mins` : 'STABLE'}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* RIGHT COMMAND CONSOLE PANEL (Added pointer-events-auto to ensure clickability) */}
      <div className="w-1/3 h-full bg-slate-900 border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto relative z-10 pointer-events-auto">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-base font-bold text-cyan-400">⚡ CHOE SENSE 2.0</h1>
            <span className="text-[10px] px-2 py-1 bg-red-950 text-red-400 rounded border border-red-800">
              {mapData.system_backflow_risk >= 0.6 ? "BACKFLOW SURGE ACTIVE" : "NORMAL STABLE"}
            </span>
          </div>

          {/* Judge Stress Test Slider */}
          <div className="bg-slate-800 p-3 rounded-lg mb-4 border border-slate-700 pointer-events-auto">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Cloudburst Intensity: {rainSlider} mm/hr
            </label>
            <input 
              type="range" 
              min="10" 
              max="120" 
              step="5" 
              value={rainSlider}
              onChange={(e) => setRainSlider(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer pointer-events-auto"
            />
          </div>

          {/* Autonomous Fleet Dispatch Triage */}
          <h2 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Active MC Fleet Dispatches</h2>
          <div className="space-y-3">
            {mapData.active_dispatches && mapData.active_dispatches.map((disp, idx) => (
              <div key={idx} className="bg-slate-800/80 p-3 rounded border border-slate-700 text-xs">
                <div className="flex justify-between font-bold text-cyan-300 mb-1">
                  <span>{disp.asset_id}</span>
                  <span className="text-amber-400">{disp.time_to_drain_mins}m to drain</span>
                </div>
                <p className="text-slate-200 mb-1">Target: {disp.node_name}</p>
                <p className="text-slate-400 italic text-[11px] bg-slate-900/50 p-1 rounded">
                  🛡️ {disp.safe_detour_route}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-500 pt-4 border-t border-slate-800">
          Tricity Autonomous Hydrological Command • PostGIS + FastAPI + Leaflet
        </div>
      </div>
    </div>
  );
}
