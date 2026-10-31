// frontend/src/components/ChoeSenseMap.jsx
import React, { useEffect, useState, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import axios from 'axios';

export default function ChoeSenseMap() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rainSlider, setRainSlider] = useState(55.0);
  const [mapStyle, setMapStyle] = useState('bright'); // 'bright' | 'liberty3d' | 'positron'

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const STYLE_URLS = {
    bright: 'https://tiles.openfreemap.org/styles/bright',
    liberty3d: 'https://tiles.openfreemap.org/styles/liberty',
    positron: 'https://tiles.openfreemap.org/styles/positron'
  };

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

  // Setup 3D Building Extrusions in Liberty Mode
  const setup3DBuildings = (map) => {
    if (!map || !map.isStyleLoaded() || map.getLayer('3d-buildings')) return;
    const layers = map.getStyle().layers || [];
    let firstSymbolId;
    for (const layer of layers) {
      if (layer.type === 'symbol') {
        firstSymbolId = layer.id;
        break;
      }
    }

    if (map.getSource('openmaptiles')) {
      try {
        map.addLayer(
          {
            id: '3d-buildings',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'render_height'], ['get', 'height'], 15],
                0, '#e2e8f0',
                30, '#cbd5e1',
                70, '#94a3b8'
              ],
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13, 0,
                13.5, ['coalesce', ['get', 'render_height'], ['get', 'height'], 15]
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13, 0,
                13.5, ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]
              ],
              'fill-extrusion-opacity': 0.8
            }
          },
          firstSymbolId
        );
      } catch (e) {}
    }
  };

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || loading) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: STYLE_URLS[mapStyle] || STYLE_URLS.bright,
      center: [76.7794, 30.7333],
      zoom: 13,
      pitch: mapStyle === 'liberty3d' ? 55 : 0,
      bearing: mapStyle === 'liberty3d' ? -20 : 0,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      if (mapStyle === 'liberty3d') setup3DBuildings(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [loading]);

  // Handle Style Switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.setStyle(STYLE_URLS[mapStyle] || STYLE_URLS.bright);
    if (mapStyle === 'liberty3d') {
      map.easeTo({ pitch: 55, bearing: -20, duration: 800 });
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }

    const onStyleData = () => {
      if (map.isStyleLoaded()) {
        if (mapStyle === 'liberty3d') setup3DBuildings(map);
        map.off('styledata', onStyleData);
      }
    };
    map.on('styledata', onStyleData);
  }, [mapStyle]);

  // Render Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapData?.nodes) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    mapData.nodes.forEach((node) => {
      const isCritical = node.status === "CRITICAL_BACKFLOW" || node.status_label === "CRITICAL_SUBMERGENCE" || node.current_depth_cm >= 55;
      const isWarning = node.status === "WARNING" || node.status_label === "TWO_WHEELERS_STALL" || node.current_depth_cm >= 30;
      const color = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";

      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.width = '36px';
      el.style.height = '36px';

      el.innerHTML = `
        <span style="position:absolute;width:28px;height:28px;border-radius:9999px;background:${color};opacity:0.35;"></span>
        <div style="position:relative;z-index:2;background:${color};color:#ffffff;font-family:Inter,sans-serif;font-size:10px;font-weight:700;padding:3px 7px;border-radius:9999px;border:2px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.3);white-space:nowrap;">
          ${node.current_depth_cm || 0}cm
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 16 }).setHTML(`
        <div style="color:#0f172a;padding:4px;font-family:Inter,sans-serif;">
          <h3 style="font-weight:700;font-size:13px;margin:0 0 4px 0;">${node.name}</h3>
          <p style="font-size:11px;color:#64748b;margin:0 0 6px 0;">Sector: ${node.sector} | Outfall: ${node.outfall || node.outfall_choe}</p>
          <div style="font-size:11px;line-height:1.5;">
            <div><b>Depth:</b> ${node.current_depth_cm} cm</div>
            <div><b>Choke:</b> ${node.gully_choke_pct}%</div>
            <div style="color:#dc2626;font-weight:600;"><b>ETA:</b> ${node.backflow_eta_mins ? `T-${node.backflow_eta_mins} mins` : 'STABLE'}</div>
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([node.lng, node.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [mapData]);

  if (loading || !mapData) {
    return (
      <div className="p-6 text-white bg-slate-950 h-screen flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Choe Sense 2.0 OpenFreeMap Vector Grid...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* LEFT MAP CONTAINER */}
      <div className="w-2/3 h-full relative z-0">
        {/* Style Selector HUD Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg flex items-center gap-1">
          {[
            { id: 'bright', label: '2D Bright Vector' },
            { id: 'liberty3d', label: '3D Liberty Buildings' },
            { id: 'positron', label: 'Positron Minimal' }
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => setMapStyle(style.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                mapStyle === style.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>

        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* RIGHT COMMAND CONSOLE PANEL */}
      <div className="w-1/3 h-full bg-slate-900 border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto relative z-10 pointer-events-auto">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-base font-bold text-cyan-400">⚡ CHOE SENSE 2.0</h1>
            <span className="text-[10px] px-2 py-1 bg-red-950 text-red-400 rounded border border-red-800 font-mono">
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
          Tricity Autonomous Hydrological Command • PostGIS + FastAPI + MapLibre GL JS + OpenFreeMap
        </div>
      </div>
    </div>
  );
}
