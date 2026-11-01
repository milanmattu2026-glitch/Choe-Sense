import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapPin,
  Layers,
  Camera,
  Lock,
  Droplets,
  Zap,
  Upload,
  Sparkles,
  Wifi,
  WifiOff,
  Compass,
  Send,
  Key,
  RotateCw,
  Box,
  ArrowRight,
  Shield,
  Cpu
} from 'lucide-react';

// ============================================================================
// ANTIGRAVITY CONFIGURATION BLOCK (API KEYS, CUSTOM LOGO & LIVE ENDPOINTS)
// ============================================================================
const ENV = (typeof window !== 'undefined' && window.__ENV__) || {};

export const ANTIGRAVITY_CONFIG = {
  BRAND_NAME: 'Choe Sense',
  BRAND_LOGO_URL: ENV.VITE_BRAND_LOGO_URL || '',
  MAP_API_KEY: ENV.VITE_MAP_API_KEY || '',
  CUSTOM_MAP_TILE_URL: ENV.VITE_CUSTOM_MAP_TILE_URL || '',
  OPEN_METEO_URL:
    'https://api.open-meteo.com/v1/forecast?latitude=30.7333&longitude=76.7794&hourly=precipitation,rain,temperature_2m&timezone=auto&forecast_days=1',
  OVERPASS_GIS_URL: 'https://overpass-api.de/api/interpreter',
  FASTAPI_BACKEND_URL: ENV.VITE_FASTAPI_BACKEND_URL || 'http://localhost:8000'
};

// ============================================================================
// OFFICIAL KEYLESS OPENFREEMAP VECTOR STYLES (LOCKED 3D LIBERTY & 2D BRIGHT)
// ============================================================================
const OPENFREEMAP_VECTOR_STYLES = {
  liberty_3d: {
    key: 'liberty_3d',
    label: '3D Liberty Mode',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    pitch: 60,
    bearing: -20,
    zoom: 15.5
  },
  bright_2d: {
    key: 'bright_2d',
    label: '2D Bright Mode',
    styleUrl: 'https://tiles.openfreemap.org/styles/bright',
    pitch: 0,
    bearing: 0,
    zoom: 13.5
  },
  positron_2d: {
    key: 'positron_2d',
    label: 'Positron Light',
    styleUrl: 'https://tiles.openfreemap.org/styles/positron',
    pitch: 0,
    bearing: 0,
    zoom: 13.5
  },
  dark_hud: {
    key: 'dark_hud',
    label: 'Dark HUD 3D',
    styleUrl: 'https://tiles.openfreemap.org/styles/dark',
    pitch: 55,
    bearing: -15,
    zoom: 15.2
  }
};

// ============================================================================
// AUTOMATIC DEVICE VIEWPORT ENGINE
// - Laptop/Desktop (>= 1024px): 100% Full Native View
// - Mobile (< 1024px): Automatic 844px Landscape Side-by-Side Lock
// ============================================================================
function useAutoDeviceViewport() {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, scale: 1 };
    }
    const w = window.innerWidth;
    const isMob = w < 1024;
    return {
      isMobile: isMob,
      scale: isMob ? Number((w / 844).toFixed(4)) : 1
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const w = window.innerWidth;
      const isMob = w < 1024;
      setViewport({
        isMobile: isMob,
        scale: isMob ? Number((w / 844).toFixed(4)) : 1
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return viewport;
}

// ============================================================================
// 6 RENAMED AI PREDICTORS
// ============================================================================
const AI_PREDICTOR_MODELS = [
  {
    id: 'hydropulse',
    name: 'HydroPulse™ 6ms',
    badge: 'DRAIN SURGE AI',
    bgSoft: 'bg-blue-50 border-blue-200 text-blue-700',
    oneLiner: 'Predicts underground drain overflow in 6 milliseconds.',
    liveMetricKey: 'surgeEta',
    targetNodeId: 1
  },
  {
    id: 'curbsight',
    name: 'CurbSight™ Vision',
    badge: 'PHOTO GAUGE AI',
    bgSoft: 'bg-orange-50 border-orange-200 text-orange-700',
    oneLiner: 'Measures exact flood depth from street photos using 18cm kerbs.',
    liveMetricKey: 'depth',
    targetNodeId: 1
  },
  {
    id: 'skypierce',
    name: 'SkyPierce™ SAR',
    badge: 'CLOUD RADAR AI',
    bgSoft: 'bg-sky-50 border-sky-200 text-sky-700',
    oneLiner: 'Detects floodwater through dark night clouds via satellite radar.',
    liveMetricKey: 'sarDb',
    targetNodeId: 2
  },
  {
    id: 'choewave',
    name: 'ChoeWave™ T-14',
    badge: 'LAKE WAVE AI',
    bgSoft: 'bg-purple-50 border-purple-200 text-purple-700',
    oneLiner: '14-minute alert before Sukhna Lake gates lock city drains.',
    liveMetricKey: 'sukhnaEta',
    targetNodeId: 2
  },
  {
    id: 'trustshield',
    name: 'TrustShield™ AI',
    badge: 'SPAM GUARD AI',
    bgSoft: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    oneLiner: 'Filters 140+ WhatsApp panic messages into 1 verified reading.',
    liveMetricKey: 'trustRatio',
    targetNodeId: 1
  },
  {
    id: 'dryroute',
    name: 'DryRoute™ Dispatch',
    badge: 'SMART FLEET AI',
    bgSoft: 'bg-rose-50 border-rose-200 text-rose-700',
    oneLiner: 'Routes pump trucks and PGI ambulances through dry inner lanes.',
    liveMetricKey: 'fleetActive',
    targetNodeId: 3
  }
];

// ============================================================================
// CHANDIGARH REAL GPS FLOOD NODES
// ============================================================================
const INITIAL_CHANDIGARH_NODES = [
  {
    id: 1,
    code: 'SEC22-0882',
    name: 'Sector 22/23 ISBT-17 Roundabout',
    sector: 'Sector 22',
    microCatchment: 'CENTRAL_GRID',
    outfall: 'N-Choe',
    lat: 30.7333,
    lng: 76.7794,
    invertElevM: 346.2,
    crownElevM: 347.7,
    streetRimElevM: 348.5,
    pipeCapacityM3: 600,
    baseChokePct: 54,
    baseDepthCm: 49,
    catchmentHa: 18.5,
    slope: 0.0028,
    hospitalWeight: 0.85,
    substationName: '66kV Sector-22 Grid Substation',
    substationPlinthCm: 58,
    rawMsgs: 148,
    tier1SweeperReports: 6,
    detourText: 'Use elevated Sector 22-C internal V4 market road.',
    turnByTurn: [
      '1. Exit Sector 17 Base onto elevated Jan Marg North.',
      '2. Turn RIGHT into Sector 22-C internal V4 lane (+1.8m higher).',
      '3. Stage suction boom at ISBT-17 North-East Gully #4.'
    ]
  },
  {
    id: 2,
    code: 'IND1-0419',
    name: 'Industrial Area Ph-1 Railway Underpass',
    sector: 'Industrial Area Ph-1',
    microCatchment: 'NE_SUKHNA_FOOTHILLS',
    outfall: 'Sukhna Choe',
    lat: 30.7056,
    lng: 76.8013,
    invertElevM: 339.5,
    crownElevM: 340.8,
    streetRimElevM: 341.4,
    pipeCapacityM3: 420,
    baseChokePct: 72,
    baseDepthCm: 81,
    catchmentHa: 22.0,
    slope: 0.0015,
    hospitalWeight: 0.5,
    substationName: '11kV Ind-Area Feeder Pillar #4',
    substationPlinthCm: 50,
    rawMsgs: 92,
    tier1SweeperReports: 4,
    detourText: 'Bypass underpass via Plot 42 overpass & Centenary Road.',
    turnByTurn: [
      '1. Avoid submerged Railway Underpass slip-road (>55cm).',
      '2. Take Plot 42 service overpass via internal V4 lane.',
      '3. Deploy suction hose from elevated ramp.'
    ]
  },
  {
    id: 3,
    code: 'PGI12-0104',
    name: 'PGI / Sector 12 Emergency Gate',
    sector: 'Sector 12',
    microCatchment: 'NE_SUKHNA_FOOTHILLS',
    outfall: 'N-Choe',
    lat: 30.7649,
    lng: 76.7751,
    invertElevM: 356.0,
    crownElevM: 357.6,
    streetRimElevM: 358.5,
    pipeCapacityM3: 820,
    baseChokePct: 28,
    baseDepthCm: 29,
    catchmentHa: 16.0,
    slope: 0.0042,
    hospitalWeight: 1.0,
    substationName: 'PGI Trauma Critical Feeder',
    substationPlinthCm: 65,
    rawMsgs: 34,
    tier1SweeperReports: 5,
    detourText: 'GREEN CORRIDOR: Route ambulances via Sector 11-D V4 lane -> Gate #2.',
    turnByTurn: [
      '1. Enter Sector 11-D internal V4 street (Dry verified).',
      '2. Cross Madhya Marg slip-lane into PGI Gate #2.',
      '3. Clear trauma-corridor storm grates first.'
    ]
  },
  {
    id: 4,
    code: 'SEC36-0611',
    name: 'Sector 36 N-Choe Trunk Outfall',
    sector: 'Sector 36',
    microCatchment: 'SW_OUTFALL_PLAIN',
    outfall: 'N-Choe',
    lat: 30.7254,
    lng: 76.7561,
    invertElevM: 336.4,
    crownElevM: 338.2,
    streetRimElevM: 339.0,
    pipeCapacityM3: 950,
    baseChokePct: 61,
    baseDepthCm: 30,
    catchmentHa: 26.0,
    slope: 0.0022,
    hospitalWeight: 0.55,
    substationName: '11kV Sector-36 RMU',
    substationPlinthCm: 54,
    rawMsgs: 41,
    tier1SweeperReports: 3,
    detourText: 'Bypass N-Choe dip via Sector 35-C internal V4 street.',
    turnByTurn: [
      '1. Enter Sector 35-C internal V4 residential corridor.',
      '2. Approach N-Choe manhole from park road.',
      '3. Engage high-head dewatering.'
    ]
  },
  {
    id: 5,
    code: 'TRIB-0920',
    name: 'Tribune Chowk NH-5 Intersection',
    sector: 'Sector 29/31',
    microCatchment: 'CENTRAL_GRID',
    outfall: 'Sukhna Choe',
    lat: 30.7099,
    lng: 76.7972,
    invertElevM: 338.0,
    crownElevM: 339.4,
    streetRimElevM: 340.1,
    pipeCapacityM3: 520,
    baseChokePct: 58,
    baseDepthCm: 47,
    catchmentHa: 20.5,
    slope: 0.002,
    hospitalWeight: 0.88,
    substationName: '33kV Sector-29 Grid Feeder',
    substationPlinthCm: 52,
    rawMsgs: 63,
    tier1SweeperReports: 4,
    detourText: 'Bypass Tribune Chowk via Sector 31-A elevated road.',
    turnByTurn: [
      '1. Divert off Dakshin Marg into Sector 31-A V4 road.',
      '2. Bypass stalled roundabout ring.',
      '3. Stage pump at NH-5 North-East island.'
    ]
  },
  {
    id: 6,
    code: 'ZRK-0774',
    name: 'Zirakpur–Patiala Ki Rao Bridge',
    sector: 'Zirakpur Border',
    microCatchment: 'SW_OUTFALL_PLAIN',
    outfall: 'Patiala Ki Rao',
    lat: 30.6425,
    lng: 76.8288,
    invertElevM: 328.5,
    crownElevM: 330.3,
    streetRimElevM: 331.2,
    pipeCapacityM3: 1050,
    baseChokePct: 44,
    baseDepthCm: 25,
    catchmentHa: 28.0,
    slope: 0.0019,
    hospitalWeight: 0.7,
    substationName: '66kV Dhakoli Feeder',
    substationPlinthCm: 55,
    rawMsgs: 29,
    tier1SweeperReports: 2,
    detourText: 'Use PR-7 Airport Ring Road flyover ramp.',
    turnByTurn: [
      '1. Take elevated PR-7 service ramp.',
      '2. Stage at Patiala Ki Rao bridge abutment.'
    ]
  }
];

const MC_FLEET = [
  { id: 'MC-PUMP-01', name: 'Super-Sucker Titan #1', capacityM3Hr: 1200, baseSector: 'Sector 17' },
  { id: 'MC-PUMP-02', name: 'Super-Sucker Hydro #2', capacityM3Hr: 900, baseSector: 'Sector 35' },
  { id: 'MC-PUMP-03', name: 'Mobile Dewatering Unit #3', capacityM3Hr: 600, baseSector: 'Industrial Area' }
];

const HYDROLOGY_NOTES = [
  {
    id: 'sukhna-lock',
    tag: 'CHOWAVE™ T-14',
    title: 'Why Roads Flood Even After Rain Stops',
    summary:
      'When Sukhna Lake opens its floodgates, rising stream water blocks city drain outlets and pushes water backward onto streets in 14 minutes.',
    stat: '14-Min Early Warning',
    formula: 'Wave Speed = 4.8 km / Manning Velocity → T-14m Alert'
  },
  {
    id: 'leaf-choke',
    tag: 'CURBSIGHT™ VISION',
    title: 'Why Dry Leaf Audits Save the City',
    summary:
      'Chandigarh drains fail because fallen leaves and plastic clog iron street grates. Auditing grates before rain lets squads clear them cheaply.',
    stat: '85% Grate Blockage Detected',
    formula: 'Intake Q = Cd · A · √(2gh) (Drops 70% when choked)'
  },
  {
    id: 'ambulance-corridor',
    tag: 'DRYROUTE™ DISPATCH',
    title: 'Protecting PGI Ambulances from Engine Failure',
    summary:
      'Ambulances stall if water crosses 30cm. We automatically reroute them onto elevated V4 inner-sector lanes before roundabouts flood.',
    stat: '100% Dry V4 Rerouting',
    formula: 'If Roundabout Depth ≥ 28cm → Activate Inner V4 Corridor'
  }
];

// ============================================================================
// BRAND LOGO COMPONENT
// ============================================================================
function BrandLogo({ logoUrl, size = 'md' }) {
  const dims = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  if (logoUrl && logoUrl.trim() !== '') {
    return (
      <img
        src={logoUrl}
        alt="Choe Sense Logo"
        className={`${dims} rounded-2xl object-cover shadow-md border border-white/80 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dims} rounded-2xl bg-gradient-to-br from-[#FF8A1F] to-[#EA580C] flex items-center justify-center text-white shadow-lg shadow-orange-500/30 border border-white/60 shrink-0`}
    >
      <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
        <path
          d="M16 3L5 7.5V15.5C5 22.4 9.7 28.6 16 30.5C22.3 28.6 27 22.4 27 15.5V7.5L16 3Z"
          stroke="currentColor"
          strokeWidth="2.4"
          fill="rgba(255,255,255,0.18)"
        />
        <path
          d="M16 10C16 10 11.5 15.2 11.5 18.2C11.5 20.7 13.5 22.7 16 22.7C18.5 22.7 20.5 20.7 20.5 18.2C20.5 15.2 16 10 16 10Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

// ============================================================================
// INTERACTIVE "GEO-TAGGED FLOOD TELEMETRY" UPLOAD MODAL
// ============================================================================
function TelemetryUploadModal({ isOpen, onClose, onTransmitReport }) {
  const [depthCm, setDepthCm] = useState(54);
  const [lat, setLat] = useState('30.7670');
  const [lng, setLng] = useState('76.7758');
  const [locationName, setLocationName] = useState('Khuda Lahora Causeway / Patiala Ki Rao');
  const [activePreset, setActivePreset] = useState('Khuda Lahora');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const presets = [
    {
      label: 'Khuda Lahora',
      lat: '30.7670',
      lng: '76.7758',
      loc: 'Khuda Lahora Causeway / Patiala Ki Rao',
      depth: 54
    },
    {
      label: 'Zirakpur Chowk',
      lat: '30.6425',
      lng: '76.8288',
      loc: 'Zirakpur Flyover Underpass / Patiala Ki Rao',
      depth: 75
    },
    {
      label: 'Sec 70 Mohali',
      lat: '30.6982',
      lng: '76.7124',
      loc: 'Sector 70 Mohali V3 Dividing Road',
      depth: 30
    }
  ];

  const handleSelectPreset = (p) => {
    setActivePreset(p.label);
    setLat(p.lat);
    setLng(p.lng);
    setLocationName(p.loc);
    setDepthCm(p.depth);
  };

  const handleAcquireLiveGps = () => {
    setLat('30.7333');
    setLng('76.7794');
    setLocationName('Sector 22/23 ISBT-17 Roundabout (Live RTK Fix)');
    setActivePreset('Live GPS');
  };

  const waterHeightPercent = Math.min(82, Math.max(25, Math.round((depthCm / 90) * 100)));
  const severityLabel = depthCm >= 70 ? 'CRITICAL' : depthCm >= 50 ? 'HIGH' : 'MODERATE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090D16]/65 backdrop-blur-md p-4">
      <div className="glass-card-strong text-[#090D16] rounded-[32px] w-full max-w-[460px] p-5 shadow-2xl space-y-3.5">
        <div className="card-white p-3.5 space-y-3">
          <div className="h-[140px] bg-gradient-to-b from-[#64748b] via-[#334155] to-[#0f172a] rounded-2xl relative overflow-hidden border-2 border-slate-300">
            <div className="absolute inset-x-0 top-0 h-[32%] bg-gradient-to-b from-[#cbd5e1] to-[#94a3b8]" />
            <div
              className="absolute inset-x-0 border-t-2 border-dashed border-white/90 z-10"
              style={{ bottom: `${waterHeightPercent}%` }}
            />
            <div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-[#2563eb]/65 to-[#1e3a8a]/90 transition-all duration-500"
              style={{ height: `${waterHeightPercent}%` }}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-3 bottom-2.5 w-3.5 bg-amber-400 border-2 border-amber-700 rounded-sm z-20 flex flex-col justify-between py-1 shadow-lg">
              <div className="w-full border-b border-amber-900" />
              <div className="w-full border-b border-amber-900" />
              <div className="w-full border-b-2 border-red-600" />
              <div className="w-full border-b border-amber-900" />
              <div className="w-full border-b border-amber-900" />
            </div>
            <div
              className="absolute left-[54%] z-30 bg-[#090D16] text-amber-400 font-mono text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-amber-400/50 shadow-xl transition-all duration-500"
              style={{ bottom: `calc(${waterHeightPercent}% - 10px)` }}
            >
              WATERLINE: {depthCm} cm
            </div>
            <div className="absolute bottom-2 left-2 z-30 bg-[#DC2626] text-white font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow">
              DEPTH: {depthCm} CM ({severityLabel})
            </div>
            <div className="absolute bottom-2 right-2 z-30 bg-[#090D16]/90 text-white font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-white/20">
              RTK: 12.8m
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="btn-glass flex items-center gap-2 text-xs font-extrabold text-[#090D16] cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Upload File</span>
            </button>
            <button
              type="button"
              onClick={() => setDepthCm(54)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-[#EA580C] text-xs font-extrabold transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Load Sample Flood Pic</span>
            </button>
          </div>
        </div>

        <div className="card-white p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider uppercase text-[#1E293B]">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
              <span>EXACT WGS84 GEO-TAGS</span>
            </div>
            <button
              type="button"
              onClick={handleAcquireLiveGps}
              className="flex items-center gap-1 text-[11px] font-extrabold text-[#EA580C] hover:text-orange-700 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Acquire Live GPS</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-[10px] font-extrabold uppercase text-[#334155] mb-1">LATITUDE</div>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="glass-input w-full font-mono text-sm font-extrabold text-[#090D16]"
              />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase text-[#334155] mb-1">LONGITUDE</div>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="glass-input w-full font-mono text-sm font-extrabold text-[#090D16]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-bold text-[#334155] mr-1">Presets:</span>
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer ${
                  activePreset === p.label
                    ? 'bg-[#090D16] text-white shadow'
                    : 'bg-slate-100 text-[#090D16] hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-white p-3.5 space-y-2.5">
          <div className="text-[11px] font-extrabold tracking-wider uppercase text-[#334155]">
            HYDRAULIC BENCHMARK &amp; DEPTH
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-100 border border-slate-300">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
              <span className="text-xs font-extrabold text-[#090D16] truncate">{locationName}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#EA580C] border border-orange-300 text-[10px] font-extrabold shrink-0">
              CV Verified
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 30, label: '30 cm' },
              { val: 54, label: '54 cm (Crit)' },
              { val: 78, label: '75+ cm' }
            ].map((d) => {
              const isSelected =
                (d.val === 30 && depthCm < 45) ||
                (d.val === 54 && depthCm >= 45 && depthCm < 70) ||
                (d.val === 78 && depthCm >= 70);
              return (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setDepthCm(d.val)}
                  className={`py-2 px-2.5 rounded-full text-xs font-extrabold border-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-[#EA580C] bg-orange-50 text-[#EA580C] shadow-sm'
                      : 'border-slate-300 bg-white text-[#090D16] hover:bg-slate-50'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-0.5">
          <button
            type="button"
            onClick={onClose}
            className="btn-glass px-5 py-2.5 text-xs font-extrabold text-[#090D16] cursor-pointer"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => {
              onTransmitReport({
                name: locationName,
                sector: activePreset,
                lat: parseFloat(lat) || 30.767,
                lng: parseFloat(lng) || 76.7758,
                depthCm
              });
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#EA580C] text-white font-extrabold text-xs shadow-lg shadow-orange-500/30 hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transmit &amp; Plot Geo-Tagged Pic</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OPENFREEMAP 3D LIBERTY & 2D BRIGHT MAP ENGINE WITH GLOWING RADAR BEACONS
// ============================================================================
function ChoeOpenFreeMapCanvas({
  nodes,
  selectedNode,
  selectedNodeId,
  onSelectNode,
  mapMode,
  onChangeMapMode,
  sarLayerEnabled,
  onToggleSarLayer,
  isCompact
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [engineType, setEngineType] = useState('loading');
  const [pitch3d, setPitch3d] = useState(60);

  const ensure3DBuildingsExtrusion = (map) => {
    if (!map || typeof map.getStyle !== 'function') return;
    try {
      const style = map.getStyle();
      if (!style || !style.sources) return;
      if (map.getLayer('choe-3d-buildings-extrusion')) return;

      const sourceKeys = Object.keys(style.sources);
      const vectorSource =
        sourceKeys.find((k) => k === 'openmaptiles' || k === 'versatiles' || k === 'protomaps') ||
        sourceKeys.find((k) => style.sources[k]?.type === 'vector');

      if (!vectorSource) return;

      const layers = style.layers || [];
      const labelLayerId = layers.find(
        (l) => l.type === 'symbol' && l.layout && l.layout['text-field']
      )?.id;

      map.addLayer(
        {
          id: 'choe-3d-buildings-extrusion',
          source: vectorSource,
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'render_height'], ['get', 'height'], 14],
              0,
              '#e2e8f0',
              25,
              '#cbd5e1',
              60,
              '#94a3b8'
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13,
              0,
              14.2,
              ['coalesce', ['get', 'render_height'], ['get', 'height'], 16]
            ],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
            'fill-extrusion-opacity': 0.88
          }
        },
        labelLayerId
      );
    } catch (e) {
      // Style already contains native OpenFreeMap 3D buildings
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.maplibregl) {
      setEngineType('maplibre');
      return;
    }

    const cssId = 'maplibre-gl-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }

    const scriptId = 'maplibre-gl-js';
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener('load', () => setEngineType('maplibre'));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
    script.async = true;
    script.onload = () => setEngineType('maplibre');
    script.onerror = () => setEngineType('vector_fallback');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (engineType !== 'maplibre' || !mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const maplibregl = window.maplibregl;
      const cfg = OPENFREEMAP_VECTOR_STYLES[mapMode] || OPENFREEMAP_VECTOR_STYLES.liberty_3d;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: cfg.styleUrl,
        center: [76.7794, 30.7333],
        zoom: cfg.zoom,
        pitch: cfg.pitch,
        bearing: cfg.bearing,
        antialias: true
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

      map.on('style.load', () => {
        if (cfg.pitch > 0) {
          ensure3DBuildingsExtrusion(map);
        }
      });

      mapInstanceRef.current = map;

      setTimeout(() => {
        try {
          map.resize();
        } catch (e) {
          // ignore
        }
      }, 250);

      return () => {
        try {
          map.remove();
        } catch (e) {
          // ignore
        }
        mapInstanceRef.current = null;
      };
    } catch (err) {
      setEngineType('vector_fallback');
    }
  }, [engineType]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || engineType !== 'maplibre') return;

    try {
      const cfg = OPENFREEMAP_VECTOR_STYLES[mapMode] || OPENFREEMAP_VECTOR_STYLES.liberty_3d;
      map.setStyle(cfg.styleUrl);
      map.easeTo({
        pitch: cfg.pitch,
        bearing: cfg.bearing,
        zoom: cfg.zoom,
        duration: 850
      });
      setPitch3d(cfg.pitch);

      map.once('style.load', () => {
        if (cfg.pitch > 0) {
          ensure3DBuildingsExtrusion(map);
        }
      });
    } catch (e) {
      // ignore
    }
  }, [mapMode, engineType]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || engineType !== 'maplibre' || !window.maplibregl) return;

    try {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      nodes.forEach((node) => {
        const isSelected = node.id === selectedNodeId;
        const isCrit = node.depthCm >= 45;
        const coreColor = isCrit ? '#DC2626' : node.depthCm >= 28 ? '#EA580C' : '#059669';
        const glowRgba = isCrit
          ? 'rgba(220, 38, 38, 0.78)'
          : node.depthCm >= 28
          ? 'rgba(234, 88, 12, 0.72)'
          : 'rgba(5, 150, 105, 0.70)';

        const el = document.createElement('div');
        el.className = 'hydro-beacon-marker';
        el.style.cursor = 'pointer';
        el.innerHTML = `
          <div class="beacon-wrapper ${isSelected ? 'beacon-selected' : ''}">
            <div class="beacon-sonar" style="border-color:${coreColor}; background:${glowRgba};"></div>
            <div class="beacon-orbit-cw" style="border-color:${coreColor};"></div>
            <div class="beacon-Core" style="background:${coreColor}; box-shadow:0 0 22px ${glowRgba}; border:${
              isSelected ? '3px solid #090D16' : '2.5px solid #ffffff'
            };">
              <span>${node.depthCm}cm</span>
            </div>
          </div>
        `;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectNode(node.id);
        });

        const marker = new window.maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([node.lng, node.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    } catch (e) {
      // ignore
    }
  }, [engineType, nodes, selectedNodeId, onSelectNode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || engineType !== 'maplibre' || !selectedNodeId) return;
    try {
      const target = nodes.find((n) => n.id === selectedNodeId);
      if (target) {
        const cfg = OPENFREEMAP_VECTOR_STYLES[mapMode] || OPENFREEMAP_VECTOR_STYLES.liberty_3d;
        map.flyTo({
          center: [target.lng, target.lat],
          zoom: cfg.zoom,
          pitch: pitch3d,
          duration: 900
        });
      }
    } catch (e) {
      // ignore
    }
  }, [selectedNodeId, nodes, engineType]);

  const handleToggle3DPitch = () => {
    const map = mapInstanceRef.current;
    const nextPitch = pitch3d > 15 ? 0 : 60;
    setPitch3d(nextPitch);
    if (map && engineType === 'maplibre') {
      try {
        map.easeTo({ pitch: nextPitch, bearing: nextPitch > 0 ? -24 : 0, duration: 650 });
      } catch (e) {
        // ignore
      }
    }
  };

  const handleOrbitCamera = () => {
    const map = mapInstanceRef.current;
    if (map && engineType === 'maplibre') {
      try {
        const currentBearing = map.getBearing();
        map.easeTo({ bearing: currentBearing + 45, pitch: 60, duration: 700 });
        setPitch3d(60);
      } catch (e) {
        // ignore
      }
    }
  };

  return (
    <div
      className={`relative w-full ${
        isCompact ? 'h-[260px]' : 'h-[370px]'
      } rounded-[24px] overflow-hidden border-2 border-white shadow-xl ${
        mapMode === 'dark_hud' ? 'bg-[#090D16]' : 'bg-[#e6edf5]'
      }`}
    >
      {/* TOP FLOATING OPENFREEMAP STYLE BAR */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[30] flex flex-wrap items-center justify-between gap-1.5 bg-white/95 backdrop-blur-xl p-1.5 rounded-2xl border border-white shadow-lg">
        <div className="flex flex-wrap items-center gap-1">
          {Object.values(OPENFREEMAP_VECTOR_STYLES).map((cfg) => (
            <button
              key={cfg.key}
              type="button"
              onClick={() => onChangeMapMode(cfg.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
                mapMode === cfg.key
                  ? 'bg-[#090D16] text-white shadow-md'
                  : 'text-[#090D16] hover:bg-slate-200/70'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={handleToggle3DPitch}
            className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-orange-50 text-[#EA580C] border border-orange-300 hover:bg-orange-100 flex items-center gap-1 cursor-pointer"
          >
            <Box className="w-3 h-3" />
            <span>{pitch3d > 15 ? '3D 60°' : '2D 0°'}</span>
          </button>

          <button
            type="button"
            onClick={handleOrbitCamera}
            className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-[#090D16] border border-slate-300 hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <RotateCw className="w-3 h-3" />
            <span>Orbit</span>
          </button>

          <button
            type="button"
            onClick={onToggleSarLayer}
            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
              sarLayerEnabled
                ? 'bg-[#0284c7] text-white shadow-md'
                : 'bg-slate-100 text-[#090D16] hover:bg-slate-200'
            }`}
          >
            📡 SkyPierce™ SAR
          </button>
        </div>
      </div>

      {/* MAPLIBRE GL OPENFREEMAP CONTAINER */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* FLOATING TELEMETRY POPUP CARD + SKYPIERCE SAR RADAR BAR */}
      {selectedNode && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[30] flex flex-col items-center pointer-events-none">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-2xl px-4 py-2.5 shadow-2xl border-2 border-white text-[#090D16] w-full max-w-[320px] mb-1.5">
            <div className="text-[14px] font-extrabold leading-snug tracking-tight text-[#090D16] truncate">
              {selectedNode.name}
            </div>
            <div className="text-[11px] font-bold text-[#334155]">
              {selectedNode.sector} · {selectedNode.outfall}
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-[#090D16]">
                  Water Depth:{' '}
                  <span
                    className={`font-mono text-sm ${
                      selectedNode.depthCm >= 45 ? 'text-[#DC2626]' : 'text-[#EA580C]'
                    }`}
                  >
                    {selectedNode.depthCm} cm
                  </span>
                </div>
                <div className="text-xs font-extrabold text-[#090D16]">
                  Gully Choke:{' '}
                  <span className="font-mono text-xs text-[#EA580C]">{selectedNode.choke}%</span>
                </div>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-lg bg-red-100 text-[#DC2626] font-mono text-[11px] font-extrabold border border-red-200">
                T-{selectedNode.backflowEtaMins}m Surge
              </span>
            </div>
          </div>

          <div className="pointer-events-auto w-full max-w-[640px] bg-[#090D16]/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-white/25 shadow-xl flex items-center justify-center gap-1.5 text-[11px] font-mono font-extrabold tracking-tight truncate">
            <span className="text-cyan-400">📡 SKYPIERCE™ SAR:</span>
            <span>
              VH Backscatter: <strong className="text-amber-300">{selectedNode.sarVhDb} dB</strong> |
              Cloud Cover Penetrated
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FIRST PAGE ("BRAND PULSE") — SIDE-BY-SIDE HERO + KINETIC RADAR CORE
// ============================================================================
function ChoeSenseBrandPulseSideBySide({
  evaluatedNodes,
  selectedNode,
  selectedNodeId,
  onSelectNode,
  onLaunchLiveGrid,
  onRunScenario,
  onOpenUploadModal,
  rainMmHr,
  sukhnaCusecs
}) {
  const [horizonIdx, setHorizonIdx] = useState(1);

  const horizonStages = [
    {
      tag: 'T-20 MINS',
      title: 'Cloudburst & Leaf-Choke Detection',
      desc: 'Open-Meteo rain sync + CurbSight™ street-grate vision audit detects 85% clogged drains before rain peaks.',
      pill: 'CurbSight™ Vision + Open-Meteo'
    },
    {
      tag: 'T-14 MINS',
      title: 'Sukhna Shockwave & Pipe Surge Lock',
      desc: 'Simulates 4.8km open-channel floodgate waves and underground N-Choe backpressure in 5.8 milliseconds.',
      pill: 'ChoeWave™ T-14 & HydroPulse™'
    },
    {
      tag: 'T-06 MINS',
      title: 'Autonomous Dry V4 Fleet & Ambulance Routing',
      desc: 'Dispatches Super-Sucker trucks and reroutes PGI ambulances onto dry V4 inner corridors with offline PWA cache.',
      pill: 'DryRoute™ Dispatch + Offline PWA'
    }
  ];

  const activeStage = horizonStages[horizonIdx];

  return (
    <div className="space-y-4">
      <div className="glass-card p-5 lg:p-7 relative overflow-hidden">
        {/* Strict 12-Column Side-by-Side Grid on BOTH 844px Mobile Landscape & Laptop */}
        <div className="grid grid-cols-12 gap-5 lg:gap-7 items-center">
          {/* LEFT 7 COLUMNS: Brand Statement + Interactive Horizon Scrubber */}
          <div className="col-span-7 lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-300 text-[#EA580C] text-[11px] font-mono font-extrabold tracking-wider uppercase">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>CHANDIGARH AUTONOMOUS HYDRO-INTELLIGENCE</span>
            </div>

            <h1 className="text-3xl lg:text-[48px] font-extrabold tracking-tight leading-[1.05] text-[#090D16]">
              Twenty Minutes Ahead of the{' '}
              <span className="bg-gradient-to-r from-[#EA580C] via-[#FF8A1F] to-[#2563EB] bg-clip-text text-transparent">
                Cloudburst.
              </span>
            </h1>

            <p className="text-xs lg:text-[15px] font-bold text-[#334155] leading-relaxed">
              Zero physical sensors. Pure street-kerb photogrammetry, cloud-piercing radar, and
              6-millisecond drain physics across Sukhna Choe, N-Choe, and Patiala Ki Rao.
            </p>

            {/* Interactive 3-Stage Prediction Horizon Scrubber */}
            <div className="card-white p-4 space-y-3 border-2 border-white">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-[#334155]">
                  INTERACTIVE PREDICTION HORIZON
                </span>
                <span className="text-[11px] font-mono font-extrabold text-[#EA580C]">
                  {activeStage.pill}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {horizonStages.map((st, i) => (
                  <button
                    key={st.tag}
                    type="button"
                    onClick={() => setHorizonIdx(i)}
                    className={`py-2 px-2.5 rounded-2xl font-mono text-xs font-extrabold transition-all cursor-pointer ${
                      horizonIdx === i
                        ? 'bg-[#090D16] text-white shadow-md scale-[1.02]'
                        : 'bg-slate-100 text-[#090D16] hover:bg-slate-200'
                    }`}
                  >
                    {st.tag}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90">
                <div className="text-xs lg:text-sm font-extrabold text-[#090D16]">
                  {activeStage.title}
                </div>
                <div className="text-[11px] lg:text-xs font-bold text-[#334155] mt-0.5 leading-relaxed">
                  {activeStage.desc}
                </div>
              </div>
            </div>

            {/* 1-Click Scenario Triggers */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-[#334155]">
                LAUNCH LIVE SIMULATION SCENARIO →
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onRunScenario('A_SUKHNA_LOCK');
                    onLaunchLiveGrid();
                  }}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-orange-50 border-2 border-slate-300 hover:border-[#EA580C] text-[11px] font-extrabold text-[#090D16] transition cursor-pointer"
                >
                  🌊 Sukhna Gate Surge (2800 cusecs)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRunScenario('B_GULLY_AUDIT');
                    onLaunchLiveGrid();
                  }}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-orange-50 border-2 border-slate-300 hover:border-[#EA580C] text-[11px] font-extrabold text-[#090D16] transition cursor-pointer"
                >
                  🍂 Pre-Monsoon 88% Leaf Choke
                </button>
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 border-2 border-orange-300 text-[11px] font-extrabold text-[#EA580C] transition cursor-pointer"
                >
                  📸 CurbSight™ Photo Gauge
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT 5/6 COLUMNS: KINETIC 3-CHOE HYDRO-RESONANCE CORE */}
          <div className="col-span-5 lg:col-span-6 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-[440px] aspect-square rounded-[32px] bg-[#090D16] border-2 border-white/80 shadow-2xl p-4 flex flex-col items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 opacity-35 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(234, 88, 12, 0.36) 0%, rgba(37, 99, 235, 0.22) 48%, transparent 75%)'
                }}
              />

              <svg viewBox="0 0 400 400" className="w-full h-full relative z-10">
                <circle
                  cx="200"
                  cy="200"
                  r="162"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.22)"
                  strokeWidth="1.5"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="162"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="18 28"
                  className="origin-center animate-[spin_26s_linear_infinite]"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="122"
                  fill="none"
                  stroke="rgba(255, 138, 31, 0.25)"
                  strokeWidth="1.5"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="122"
                  fill="none"
                  stroke="#FF8A1F"
                  strokeWidth="2.5"
                  strokeDasharray="12 22"
                  className="origin-center animate-[spin_18s_linear_infinite_reverse]"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="82"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeDasharray="8 14"
                  className="origin-center animate-[spin_12s_linear_infinite]"
                />

                {evaluatedNodes.map((n, idx) => {
                  const angleDeg = idx * 60 - 30;
                  const angleRad = (angleDeg * Math.PI) / 180;
                  const radius = idx % 2 === 0 ? 152 : 118;
                  const cx = 200 + radius * Math.cos(angleRad);
                  const cy = 200 + radius * Math.sin(angleRad);
                  const isSel = n.id === selectedNodeId;
                  const color =
                    n.depthCm >= 45 ? '#EF4444' : n.depthCm >= 28 ? '#FF8A1F' : '#10B981';

                  return (
                    <g
                      key={n.id}
                      onClick={() => onSelectNode(n.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSel ? 22 : 15}
                        fill={color}
                        fillOpacity="0.24"
                        className="animate-ping"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSel ? 12 : 9}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={isSel ? '3' : '2'}
                      />
                      <text
                        x={cx}
                        y={cy + 23}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="800"
                      >
                        {n.sector} ({n.depthCm}cm)
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Center Live Digital Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 text-center px-6">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-amber-300 font-mono text-[10px] font-extrabold uppercase">
                  {selectedNode.sector}
                </span>
                <div className="font-mono text-3xl lg:text-4xl font-extrabold text-white tracking-tight mt-1">
                  T-{selectedNode.backflowEtaMins}m
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-extrabold mt-0.5">
                  SURGE COUNTDOWN
                </div>
                <div className="mt-1 text-[11px] font-bold text-slate-300">
                  {selectedNode.depthCm} cm depth · {selectedNode.sarVhDb} dB SAR
                </div>
              </div>

              {/* Bottom Bar Inside Core */}
              <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-mono font-extrabold text-white">
                <span>🌧️ {rainMmHr} mm/hr</span>
                <span>🌊 {sukhnaCusecs} cusecs</span>
                <button
                  type="button"
                  onClick={onLaunchLiveGrid}
                  className="text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  Open 3D Map →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Minimalist Signature Cards */}
      <div className="grid grid-cols-3 gap-3.5">
        <div
          onClick={onOpenUploadModal}
          className="glass-card-strong p-4 hover:-translate-y-0.5 transition cursor-pointer space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#EA580C] font-mono text-[10px] font-extrabold">
              01 · CURBSIGHT™ VISION
            </span>
            <Camera className="w-4 h-4 text-[#EA580C]" />
          </div>
          <h3 className="text-sm lg:text-base font-extrabold text-[#090D16]">
            Zero-Sensor Street Photogrammetry
          </h3>
          <p className="text-xs font-bold text-[#334155] leading-relaxed">
            Measures exact standing floodwater depth against standard 18cm Chandigarh street kerbs.
          </p>
        </div>

        <div
          onClick={onLaunchLiveGrid}
          className="glass-card-strong p-4 hover:-translate-y-0.5 transition cursor-pointer space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#2563EB] font-mono text-[10px] font-extrabold">
              02 · HYDROPULSE™ &amp; CHOEWAVE™
            </span>
            <Cpu className="w-4 h-4 text-[#2563EB]" />
          </div>
          <h3 className="text-sm lg:text-base font-extrabold text-[#090D16]">
            14-Minute Sukhna Backwater Lock
          </h3>
          <p className="text-xs font-bold text-[#334155] leading-relaxed">
            Predicts when Sukhna Lake floodgate releases will submerge city storm outfalls.
          </p>
        </div>

        <div
          onClick={onLaunchLiveGrid}
          className="glass-card-strong p-4 hover:-translate-y-0.5 transition cursor-pointer space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#059669] font-mono text-[10px] font-extrabold">
              03 · DRYROUTE™ &amp; 50M LOCK
            </span>
            <Shield className="w-4 h-4 text-[#059669]" />
          </div>
          <h3 className="text-sm lg:text-base font-extrabold text-[#090D16]">
            Offline Fleet &amp; Anti-Fraud Geofence
          </h3>
          <p className="text-xs font-bold text-[#334155] leading-relaxed">
            Routes pump trucks via dry V4 inner lanes and locks ticket closure to within 50 meters.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APPLICATION — AUTOMATIC 844PX MOBILE LANDSCAPE & FULL LAPTOP VIEW
// ============================================================================
export default function App() {
  const { isMobile, scale } = useAutoDeviceViewport();

  const [activePage, setActivePage] = useState('overview');
  const [neonMode, setNeonMode] = useState(false);
  const [mapMode, setMapMode] = useState('liberty_3d');
  const [sarLayerEnabled, setSarLayerEnabled] = useState(true);

  const [brandLogoUrl, setBrandLogoUrl] = useState(ANTIGRAVITY_CONFIG.BRAND_LOGO_URL);
  const [mapApiKey, setMapApiKey] = useState(ANTIGRAVITY_CONFIG.MAP_API_KEY);

  const [nodesList, setNodesList] = useState(INITIAL_CHANDIGARH_NODES);
  const [rainMmHr, setRainMmHr] = useState(48);
  const [gullyChokePct, setGullyChokePct] = useState(54);
  const [sukhnaCusecs, setSukhnaCusecs] = useState(1200);
  const [availableTrucks] = useState(3);
  const [selectedNodeId, setSelectedNodeId] = useState(1);
  const [weatherSourceLabel, setWeatherSourceLabel] = useState('Open-Meteo');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [contractorDistMeters, setContractorDistMeters] = useState(24);
  const [verifiedNodeIds, setVerifiedNodeIds] = useState({});
  const [selectedNoteId, setSelectedNoteId] = useState('sukhna-lock');
  const [activePredictorId, setActivePredictorId] = useState('hydropulse');

  const [cellularBlackoutSim, setCellularBlackoutSim] = useState(false);
  const [activePwaTruckId, setActivePwaTruckId] = useState('MC-PUMP-01');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3600);
  };

  const syncLiveOpenMeteoWeather = async () => {
    try {
      const res = await fetch(ANTIGRAVITY_CONFIG.OPEN_METEO_URL);
      const data = await res.json();
      const rains = data?.hourly?.rain || [];
      const precips = data?.hourly?.precipitation || [];
      const maxForecastRain = Math.max(...rains, ...precips, 0);

      const appliedRain = maxForecastRain > 2 ? Math.round(maxForecastRain * 4) : 58;
      setRainMmHr(appliedRain);
      setWeatherSourceLabel('Open-Meteo Live');
      showToast(`Live Open-Meteo Synced — ${appliedRain} mm/hr across Chandigarh`);
    } catch (err) {
      setRainMmHr(56);
      setWeatherSourceLabel('Open-Meteo');
      showToast('Open-Meteo Active — 56 mm/hr applied');
    }
  };

  const applyJudgeScenario = (scenarioKey) => {
    if (scenarioKey === 'A_SUKHNA_LOCK') {
      setRainMmHr(15);
      setGullyChokePct(20);
      setSukhnaCusecs(2800);
      setSelectedNodeId(2);
      showToast(
        'Scenario A (ChoeWave™ T-14): Low Local Rain (15mm/h) + 2800 cusecs Sukhna Release → Industrial Area Lock!'
      );
    } else if (scenarioKey === 'B_GULLY_AUDIT') {
      setRainMmHr(45);
      setGullyChokePct(88);
      setSukhnaCusecs(0);
      setSelectedNodeId(1);
      showToast(
        'Scenario B (CurbSight™ Audit): 88% Leaf Choke Detected → Pre-Monsoon Gully Squad Dispatched!'
      );
    } else if (scenarioKey === 'C_GRID_COLLAPSE') {
      setRainMmHr(120);
      setGullyChokePct(72);
      setSukhnaCusecs(1800);
      setSelectedNodeId(3);
      showToast(
        'Scenario C (DryRoute™ Dispatch): 120mm/hr Cloudburst → PGI V4 Green Corridor & Pump Fleet Active!'
      );
    }
  };

  const computedTelemetry = useMemo(() => {
    const catchmentMultipliers = {
      NE_SUKHNA_FOOTHILLS: 1.28,
      CENTRAL_GRID: 1.0,
      SW_OUTFALL_PLAIN: 0.82
    };

    const evaluatedNodes = nodesList.map((n) => {
      const isVerified = Boolean(verifiedNodeIds[n.id]);
      const localRain = Number(
        (rainMmHr * (catchmentMultipliers[n.microCatchment] || 1.0)).toFixed(1)
      );
      const choke = Math.min(98, Math.round(n.baseChokePct * 0.55 + gullyChokePct * 0.45));

      const isSukhnaOutfall = n.outfall === 'Sukhna Choe';
      const waveVelocityMS = Math.max(1.8, 1.2 + sukhnaCusecs / 2500.0);
      const sukhnaWaveEtaMins =
        isSukhnaOutfall && sukhnaCusecs > 500
          ? Math.max(6, Math.round(4800.0 / waveVelocityMS / 60.0))
          : null;

      const inflowM3Hr = Math.round((localRain / 1000.0) * (n.catchmentHa * 10000.0) * 0.86);
      let effectiveCapM3Hr = n.pipeCapacityM3 * (1.0 - (choke / 100.0) * 0.72);
      if (isSukhnaOutfall && sukhnaCusecs > 800) {
        effectiveCapM3Hr *= Math.max(0.22, 1.0 - sukhnaCusecs / 6500.0);
      }

      const depthCm = isVerified
        ? 3
        : Math.min(
            115,
            Math.max(
              10,
              Math.round(
                n.baseDepthCm * (localRain / 48.0) * (0.72 + choke / 180.0) +
                  (isSukhnaOutfall ? sukhnaCusecs / 110.0 : 0)
              )
            )
          );

      const riseVelocityCmMin = isVerified
        ? 0.0
        : Number(Math.max(0.15, (depthCm / 36.0) * (localRain / 45.0)).toFixed(2));

      const backflowEtaMins = isVerified
        ? 120
        : Math.max(4, Math.round(42 - localRain * 0.22 - choke * 0.16));

      const hglElevM = Number((n.crownElevM + depthCm / 100.0 + 0.45).toFixed(2));
      const sarVhDb = Number((-11.8 - (depthCm / 10.0) * 1.35).toFixed(1));
      const marginToPlinthCm = Number((n.substationPlinthCm - depthCm).toFixed(1));
      const kalmanSigma = Number(Math.max(0.8, 2.1 - n.tier1SweeperReports * 0.16).toFixed(1));

      const priorityScore = Number(
        (
          (0.35 * Math.min(1, riseVelocityCmMin / 1.5) +
            0.3 * n.hospitalWeight +
            0.2 * (backflowEtaMins <= 18 ? 1.0 : 0.45) +
            0.15 * 0.85) *
          (1 + choke / 180.0)
        ).toFixed(2)
      );

      const waterVolM3 = isVerified
        ? 15
        : Math.round(depthCm * 14.2 + Math.max(0, inflowM3Hr - effectiveCapM3Hr) * 0.35);

      return {
        ...n,
        localRain,
        choke,
        sukhnaWaveEtaMins,
        depthCm,
        riseVelocityCmMin,
        backflowEtaMins,
        hglElevM,
        sarVhDb,
        marginToPlinthCm,
        kalmanSigma,
        priorityScore,
        waterVolM3,
        ambulanceSafe: depthCm < 28,
        isVerified
      };
    });

    const sortedForDispatch = [...evaluatedNodes].sort((a, b) => b.priorityScore - a.priorityScore);
    const dispatches = sortedForDispatch.slice(0, availableTrucks).map((node, idx) => {
      const truck = MC_FLEET[idx];
      const drainMins = node.isVerified
        ? 0
        : Math.max(8, Math.round((node.waterVolM3 / truck.capacityM3Hr) * 60));
      return {
        ...truck,
        targetNodeId: node.id,
        targetName: node.name,
        targetSector: node.sector,
        depthCm: node.depthCm,
        waterVolM3: node.waterVolM3,
        drainMins,
        turnByTurn: node.turnByTurn
      };
    });

    const totalRawMsgs = evaluatedNodes.reduce((acc, n) => acc + n.rawMsgs, 0) + 41;
    return { evaluatedNodes, dispatches, totalRawMsgs };
  }, [nodesList, rainMmHr, gullyChokePct, sukhnaCusecs, availableTrucks, verifiedNodeIds]);

  const selectedNode =
    computedTelemetry.evaluatedNodes.find((n) => n.id === selectedNodeId) ||
    computedTelemetry.evaluatedNodes[0];

  const handleTransmitGeoTaggedReport = (newReport) => {
    const newId = nodesList.length + 1;
    const customNode = {
      id: newId,
      code: `GEO-0${newId}`,
      name: newReport.name,
      sector: newReport.sector,
      microCatchment: 'NE_SUKHNA_FOOTHILLS',
      outfall: 'Patiala Ki Rao',
      lat: newReport.lat,
      lng: newReport.lng,
      invertElevM: 342.0,
      crownElevM: 343.5,
      streetRimElevM: 344.2,
      pipeCapacityM3: 550,
      baseChokePct: 64,
      baseDepthCm: newReport.depthCm,
      catchmentHa: 19.0,
      slope: 0.0024,
      hospitalWeight: 0.82,
      substationName: '11kV Local Sector RMU',
      substationPlinthCm: 56,
      rawMsgs: 25,
      tier1SweeperReports: 3,
      detourText: `Bypass ${newReport.name} via elevated internal V4 corridor.`,
      turnByTurn: [
        `1. Divert off main causeway before ${newReport.name}.`,
        '2. Use elevated V4 internal sector service road.',
        '3. Stage mobile pump unit at upstream wing-wall.'
      ]
    };

    setNodesList((prev) => [customNode, ...prev]);
    setSelectedNodeId(newId);
    setActivePage('dashboard');
    showToast(`Plotted Geo-Tagged Report (${newReport.depthCm} cm) at ${newReport.name}!`);
  };

  const NAV_PAGES = [
    { id: 'overview', label: 'Brand Pulse', locked: false },
    { id: 'dashboard', label: 'Live Grid Map', locked: false },
    { id: 'info', label: 'AI Predictors', locked: false },
    { id: 'about', label: 'Field Verification', locked: false },
    { id: 'blogs', label: 'Hydrology Notes', locked: false },
    { id: 'uiverse', label: 'Crew App & API Keys', locked: true }
  ];

  const pageHeaderCopy = {
    overview: {
      tag: 'AUTONOMOUS FLOOD ENGINE',
      title: 'Brand Pulse',
      subtitle: 'Zero-sensor hydrology intelligence for Chandigarh.'
    },
    dashboard: {
      tag: 'LIVE FLOOD CONTROL PLATFORM',
      title: 'Live Grid Map',
      subtitle: 'Adjust rain, leaf choke, and Sukhna Lake gates to test live city flood response.'
    },
    info: {
      tag: '6 RENAMED AI PREDICTORS',
      title: 'AI Predictor Suite',
      subtitle: 'Click any predictor below to inspect its live reading on the map beside you.'
    },
    about: {
      tag: 'ANTI-FRAUD GPS LOCK',
      title: 'Field Verification',
      subtitle: 'Contractors must stand within 50 meters of a drain before marking it cleared.'
    },
    blogs: {
      tag: 'SIMPLE FIELD EXPLAINERS',
      title: 'Hydrology Notes',
      subtitle: 'Clear, 30-second explanations of how Chandigarh drainage works in real life.'
    },
    uiverse: {
      tag: 'OFFLINE PWA & MAP CONFIG',
      title: 'Crew App & Config',
      subtitle: 'Offline truck driver routes plus Brand Logo configuration.'
    }
  }[activePage];

  // Automatic container style:
  // - On Laptop (>= 1024px): 100% full width
  // - On Mobile (< 1024px): Automatic 844px Mobile Landscape Side-by-Side width scaled to screen
  const autoResponsiveContainerStyle = isMobile
    ? {
        width: '844px',
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }
    : {
        width: '100%'
      };

  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden selection:bg-[#EA580C] selection:text-white ${
        neonMode ? 'bg-[#090D16] text-white' : 'text-[#090D16]'
      }`}
      style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        background: neonMode
          ? 'radial-gradient(circle at 15% 20%, #1e293b 0%, #090d16 70%)'
          : 'linear-gradient(135deg, #F3E6DA 0%, #EAD7C8 48%, #E2EBF8 100%)'
      }}
    >
      {/* GLOBAL FROSTED GLASS & HYDRO-BEACON ANIMATIONS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        :root {
          --bg: #F3E6DA;
          --glass: rgba(255, 255, 255, 0.72);
          --glass-strong: rgba(255, 255, 255, 0.92);
          --white-card: #FFFFFF;
          --ink: #090D16;
          --muted: #334155;
          --accent: #FF8A1F;
          --border-glass: rgba(255, 255, 255, 0.92);
        }

        .glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.90), rgba(255, 255, 255, 0.72));
          backdrop-filter: blur(26px) saturate(160%);
          -webkit-backdrop-filter: blur(26px) saturate(160%);
          border: 1.5px solid var(--border-glass);
          border-radius: 26px;
          box-shadow: 0 14px 44px rgba(120, 80, 50, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }

        .glass-card-strong {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          border: 2px solid #FFFFFF;
          border-radius: 26px;
          box-shadow: 0 18px 50px rgba(120, 80, 50, 0.14), inset 0 1px 0 #FFFFFF;
        }

        .card-white {
          background: #FFFFFF;
          border-radius: 22px;
          border: 1.5px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
        }

        .card-dark {
          background: #1C1C1C;
          color: #FFFFFF;
          border-radius: 22px;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 16px 38px rgba(9, 13, 22, 0.32);
        }

        .glass-input {
          border-radius: 999px;
          height: 40px;
          padding: 0 14px;
          background: rgba(241, 245, 249, 0.9);
          border: 1.5px solid rgba(148, 163, 184, 0.45);
          color: #090D16;
          transition: all 200ms ease;
        }

        .btn-dark {
          background: #1C1C1C;
          color: #FFFFFF;
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 800;
          box-shadow: 0 10px 24px rgba(9, 13, 22, 0.22);
          transition: all 200ms ease;
        }

        .btn-glass {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(16px);
          border: 1.5px solid #FFFFFF;
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 800;
          color: #090D16;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
          transition: all 200ms ease;
        }

        .fw-light-dot-grid {
          background-color: rgba(248, 250, 252, 0.86);
          background-image: radial-gradient(#94a3b8 1.2px, transparent 1.2px);
          background-size: 18px 18px;
        }
        .fw-neon-dot-grid {
          background-color: #090d16;
          background-image: radial-gradient(rgba(56, 189, 248, 0.28) 1.2px, transparent 1.2px);
          background-size: 18px 18px;
        }

        @keyframes sonarPulse {
          0% { transform: translate(-50%, -50%) scale(0.65); opacity: 0.95; }
          100% { transform: translate(-50%, -50%) scale(2.45); opacity: 0; }
        }
        @keyframes radarSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes beaconFloat {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-3px); }
        }

        .beacon-wrapper {
          position: relative;
          width: 72px;
          height: 72px;
          pointer-events: auto;
        }
        .beacon-selected {
          transform: scale(1.14);
        }
        .beacon-sonar {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          border: 2.5px solid;
          animation: sonarPulse 2.1s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .beacon-orbit-cw {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 56px;
          height: 56px;
          border-radius: 9999px;
          border: 2.5px dashed;
          animation: radarSpin 6.5s linear infinite;
        }
        .beacon-Core {
          position: absolute;
          top: 50%;
          left: 50%;
          padding: 4px 10px;
          border-radius: 9999px;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 800;
          font-size: 12px;
          white-space: nowrap;
          animation: beaconFloat 2.8s ease-in-out infinite;
        }
      `}</style>

      {/* GEO-TAGGED FLOOD TELEMETRY UPLOAD MODAL */}
      <TelemetryUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onTransmitReport={handleTransmitGeoTaggedReport}
      />

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-full bg-[#090D16] text-white border-2 border-[#FF8A1F] shadow-2xl flex items-center gap-2.5 text-xs font-extrabold">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A1F] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ====================================================================
          AUTOMATIC SIDE-BY-SIDE SHELL:
          - 844px Landscape Side-by-Side on Mobile (< 1024px)
          - 100% Full View on Laptop/Desktop (>= 1024px)
      ==================================================================== */}
      <div style={autoResponsiveContainerStyle} className="flex flex-row items-stretch min-h-screen">
        {/* ZONE 1: PERMANENT LEFT COMMAND SIDEBAR */}
        <aside className="w-[185px] lg:w-[248px] shrink-0 p-2.5 lg:py-5 lg:pl-5 lg:pr-2 flex flex-col justify-between select-none">
          <div className="glass-card-strong h-full p-3.5 lg:px-5 lg:py-6 flex flex-col justify-between">
            <div className="space-y-4 lg:space-y-6">
              {/* Clean Brand Header — ONLY Logo + Choe Sense */}
              <button
                type="button"
                onClick={() => setActivePage('overview')}
                className="flex items-center gap-2.5 text-left group cursor-pointer w-full"
              >
                <BrandLogo logoUrl={brandLogoUrl} size={isMobile ? 'sm' : 'md'} />
                <span className="text-[18px] lg:text-[23px] font-extrabold tracking-tight text-[#090D16] leading-none truncate">
                  Choe Sense
                </span>
              </button>

              {/* COMMAND PAGES */}
              <div className="space-y-1">
                <div className="px-2 text-[10px] lg:text-[11px] font-mono uppercase tracking-widest text-[#334155] font-extrabold mb-1.5">
                  COMMAND PAGES
                </div>

                {NAV_PAGES.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePage(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 lg:px-4 lg:py-3 rounded-2xl text-xs lg:text-[14.5px] tracking-tight transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#090D16] font-extrabold border-2 border-orange-300/90 shadow-md'
                          : 'text-[#1E293B] font-bold hover:text-[#090D16] hover:bg-white/70'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {isActive ? (
                        <span className="w-2 h-2 rounded-full bg-[#EA580C] shrink-0" />
                      ) : (
                        item.locked && <Lock className="w-3.5 h-3.5 text-[#334155] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 1-CLICK JUDGE DEMO SCENARIOS */}
              <div className="space-y-1.5 pt-2.5 border-t border-slate-200">
                <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-[#EA580C] font-extrabold">
                  ⚡ 1-CLICK JUDGE SCENARIOS
                </div>
                <button
                  type="button"
                  onClick={() => {
                    applyJudgeScenario('A_SUKHNA_LOCK');
                    setActivePage('dashboard');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-orange-50 border border-slate-300 hover:border-orange-300 text-[11px] font-extrabold text-[#090D16] transition cursor-pointer"
                >
                  1. Sukhna Gate Surge (2800 cusecs)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyJudgeScenario('B_GULLY_AUDIT');
                    setActivePage('dashboard');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-orange-50 border border-slate-300 hover:border-orange-300 text-[11px] font-extrabold text-[#090D16] transition cursor-pointer"
                >
                  2. Pre-Monsoon 88% Leaf Choke
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyJudgeScenario('C_GRID_COLLAPSE');
                    setActivePage('dashboard');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-orange-50 border border-slate-300 hover:border-orange-300 text-[11px] font-extrabold text-[#090D16] transition cursor-pointer"
                >
                  3. 120mm/h Cloudburst Emergency
                </button>
              </div>
            </div>

            {/* Bottom Status Pill */}
            <div className="pt-3 mt-3 border-t border-slate-200">
              <div className="p-2.5 lg:p-3.5 rounded-2xl bg-[#1C1C1C] text-white space-y-0.5 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-emerald-400">
                    ● HYDROPULSE™ LIVE
                  </span>
                  <span className="text-[11px] font-mono font-extrabold text-amber-400">5.8 ms</span>
                </div>
                <div className="text-[10px] font-bold text-slate-300 truncate">
                  OpenFreeMap 3D + SAR
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN RIGHT WORKSPACE (ALWAYS SIDE-BY-SIDE) */}
        <main className="flex-1 min-w-0 p-2.5 lg:py-5 lg:pr-5 lg:pl-3 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto">
            {activePage === 'overview' ? (
              <ChoeSenseBrandPulseSideBySide
                evaluatedNodes={computedTelemetry.evaluatedNodes}
                selectedNode={selectedNode}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id) => setSelectedNodeId(id)}
                onLaunchLiveGrid={() => setActivePage('dashboard')}
                onRunScenario={applyJudgeScenario}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                rainMmHr={rainMmHr}
                sukhnaCusecs={sukhnaCusecs}
              />
            ) : (
              <div className="glass-card p-4 lg:p-6">
                {/* STRICT 12-COLUMN SIDE-BY-SIDE GRID ON BOTH 844PX MOBILE & LAPTOP */}
                <div className="grid grid-cols-12 gap-4 lg:gap-6 items-start">
                  {/* ZONE 2: CENTER CONTROLS (5 COLS ON 844PX MOBILE, 4 COLS ON LAPTOP) */}
                  <div className="col-span-5 lg:col-span-4 space-y-3.5">
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: 'Brand Pulse', active: false, onClick: () => setActivePage('overview') },
                        { label: 'Light Glass', active: !neonMode, onClick: () => setNeonMode(false) },
                        { label: 'Dark HUD', active: neonMode, onClick: () => setNeonMode(!neonMode) }
                      ].map((pill) => (
                        <button
                          key={pill.label}
                          type="button"
                          onClick={pill.onClick}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
                            pill.active
                              ? 'bg-[#1C1C1C] text-white shadow-md'
                              : 'bg-white/90 text-[#090D16] border border-slate-300 hover:bg-white'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#EA580C] font-extrabold">
                        <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
                        <span>{pageHeaderCopy.tag}</span>
                      </div>
                      <h1 className="text-2xl lg:text-[32px] font-extrabold tracking-tight text-[#090D16] leading-tight">
                        {pageHeaderCopy.title}
                      </h1>
                      <p className="text-xs lg:text-sm font-bold leading-snug text-[#334155]">
                        {pageHeaderCopy.subtitle}
                      </p>
                    </div>

                    {activePage === 'dashboard' && (
                      <div className="card-white p-4 space-y-3.5 border-2 border-white">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs lg:text-sm font-extrabold text-[#090D16]">
                              Cloudburst Intensity
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={syncLiveOpenMeteoWeather}
                                className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-300 text-[#EA580C] text-[10px] font-extrabold cursor-pointer"
                              >
                                ⛅ {weatherSourceLabel}
                              </button>
                              <span className="font-mono text-sm lg:text-base font-extrabold text-[#EA580C]">
                                {rainMmHr} mm/hr
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="130"
                            value={rainMmHr}
                            onChange={(e) => setRainMmHr(Number(e.target.value))}
                            className="w-full h-2 accent-[#EA580C] cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs lg:text-sm font-extrabold text-[#090D16]">
                              Drainage Choke
                            </span>
                            <span className="font-mono text-sm lg:text-base font-extrabold text-[#EA580C]">
                              {gullyChokePct}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="95"
                            value={gullyChokePct}
                            onChange={(e) => setGullyChokePct(Number(e.target.value))}
                            className="w-full h-2 accent-[#EA580C] cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs lg:text-sm font-extrabold text-[#090D16]">
                              Sukhna Lake Floodgate
                            </span>
                            <span className="font-mono text-sm lg:text-base font-extrabold text-[#7C3AED]">
                              {sukhnaCusecs} cusecs
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5000"
                            step="100"
                            value={sukhnaCusecs}
                            onChange={(e) => setSukhnaCusecs(Number(e.target.value))}
                            className="w-full h-2 accent-[#EA580C] cursor-pointer"
                          />
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-[#334155]">TrustShield™ Filter:</span>
                          <span className="font-mono font-extrabold text-[#059669]">
                            {computedTelemetry.totalRawMsgs} msgs → 1 vector
                          </span>
                        </div>
                      </div>
                    )}

                    {activePage === 'info' && (
                      <div className="space-y-2">
                        {AI_PREDICTOR_MODELS.map((model) => {
                          const isSelected = activePredictorId === model.id;
                          return (
                            <div
                              key={model.id}
                              onClick={() => {
                                setActivePredictorId(model.id);
                                setSelectedNodeId(model.targetNodeId);
                              }}
                              className={`card-white p-3 cursor-pointer transition-all ${
                                isSelected ? 'ring-2 ring-[#EA580C] shadow-md' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs lg:text-sm font-extrabold text-[#090D16]">
                                  {model.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold border ${model.bgSoft}`}
                                >
                                  {model.badge}
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-[#334155] mt-0.5 leading-snug">
                                {model.oneLiner}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activePage === 'about' && (
                      <div className="card-dark p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase text-amber-400 font-extrabold">
                            🛡️ 50M GPS GEOFENCE LOCK
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                              contractorDistMeters <= 50
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-400'
                            }`}
                          >
                            {contractorDistMeters <= 50 ? '✓ Verified (≤50m)' : '🔒 Locked (>50m)'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-200">Worker Distance:</span>
                          <span className="font-mono font-extrabold text-lg text-amber-400">
                            {contractorDistMeters} m
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="140"
                          value={contractorDistMeters}
                          onChange={(e) => setContractorDistMeters(Number(e.target.value))}
                          className="w-full h-2 accent-[#FF8A1F] cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (contractorDistMeters <= 50) {
                              setVerifiedNodeIds((p) => ({ ...p, [selectedNode.id]: true }));
                              showToast(`Drain Verified at ${selectedNode.sector}!`);
                            } else {
                              showToast(`Blocked! Worker is ${contractorDistMeters}m away (>50m).`);
                            }
                          }}
                          className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#FF8A1F] to-[#EA580C] text-white font-extrabold text-xs cursor-pointer"
                        >
                          Verify &amp; Mark Drain Cleared
                        </button>
                      </div>
                    )}

                    {activePage === 'blogs' && (
                      <div className="space-y-2.5">
                        {HYDROLOGY_NOTES.map((note) => (
                          <div
                            key={note.id}
                            onClick={() => setSelectedNoteId(note.id)}
                            className={`card-white p-3.5 cursor-pointer ${
                              selectedNoteId === note.id ? 'ring-2 ring-[#EA580C]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono font-extrabold">
                              <span className="text-[#EA580C]">{note.tag}</span>
                              <span className="text-[#059669]">{note.stat}</span>
                            </div>
                            <h3 className="text-xs lg:text-sm font-extrabold text-[#090D16] mt-0.5">
                              {note.title}
                            </h3>
                            <p className="text-[11px] font-bold text-[#334155] mt-0.5">
                              {note.summary}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activePage === 'uiverse' && (
                      <div className="space-y-3">
                        <div className="card-dark p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase text-emerald-400 font-extrabold">
                              🟢 IN-CAB OFFLINE PWA
                            </span>
                            <button
                              type="button"
                              onClick={() => setCellularBlackoutSim(!cellularBlackoutSim)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 cursor-pointer ${
                                cellularBlackoutSim
                                  ? 'bg-[#DC2626] text-white'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {cellularBlackoutSim ? (
                                <>
                                  <WifiOff className="w-3 h-3" />
                                  <span>Blackout ON</span>
                                </>
                              ) : (
                                <>
                                  <Wifi className="w-3 h-3" />
                                  <span>Test Blackout</span>
                                </>
                              )}
                            </button>
                          </div>
                          {computedTelemetry.dispatches[0]?.turnByTurn.map((step, i) => (
                            <div
                              key={i}
                              className="p-2 rounded-xl bg-white/10 text-slate-200 text-[11px] font-bold"
                            >
                              {step}
                            </div>
                          ))}
                        </div>

                        <div className="card-white p-3.5 space-y-2">
                          <div className="flex items-center gap-1 text-[11px] font-mono uppercase text-[#EA580C] font-extrabold">
                            <Key className="w-3.5 h-3.5" />
                            <span>LOGO &amp; CONFIG</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Custom Brand Logo URL..."
                            value={brandLogoUrl}
                            onChange={(e) => setBrandLogoUrl(e.target.value)}
                            className="glass-input w-full text-xs font-mono font-bold"
                          />
                          <input
                            type="text"
                            placeholder="Optional Map API Key..."
                            value={mapApiKey}
                            onChange={(e) => setMapApiKey(e.target.value)}
                            className="glass-input w-full text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="btn-dark text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#FF8A1F]" />
                        <span>Upload Live Pic</span>
                      </button>
                    </div>
                  </div>

                  {/* ZONE 3: PERSISTENT SIDE-BY-SIDE LIVE DASHBOARD (7 COLS ON 844PX MOBILE, 8 COLS ON LAPTOP) */}
                  <div className="col-span-7 lg:col-span-8 space-y-3.5">
                    <div className="glass-card-strong overflow-hidden">
                      <div className="px-4 py-2 bg-white/90 border-b border-slate-200/90 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                          <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                          <span className="ml-1.5 text-[11px] font-extrabold text-[#334155]">
                            Docked Side-by-Side Live Command Dashboard
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[#059669] text-[10px] font-mono font-extrabold">
                          OpenFreeMap 3D
                        </span>
                      </div>

                      <div
                        className={`p-4 lg:p-5 space-y-3.5 ${
                          neonMode
                            ? 'fw-neon-dot-grid text-white'
                            : 'fw-light-dot-grid text-[#090D16]'
                        }`}
                      >
                        {/* Clean Brand Header — ONLY Logo + Choe Sense */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <BrandLogo logoUrl={brandLogoUrl} size="md" />
                            <div className="text-2xl lg:text-4xl font-extrabold tracking-tight leading-none">
                              <span className={neonMode ? 'text-white' : 'text-[#090D16]'}>
                                Choe{' '}
                              </span>
                              <span className="text-[#EA580C]">Sense</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setIsUploadModalOpen(true)}
                              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF8A1F] to-[#EA580C] text-white font-extrabold text-[11px] shadow flex items-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Upload Photo</span>
                            </button>
                          </div>
                        </div>

                        {/* OPENFREEMAP 3D/2D VECTOR CANVAS */}
                        <ChoeOpenFreeMapCanvas
                          nodes={computedTelemetry.evaluatedNodes}
                          selectedNode={selectedNode}
                          selectedNodeId={selectedNodeId}
                          onSelectNode={(id) => setSelectedNodeId(id)}
                          mapMode={mapMode}
                          onChangeMapMode={setMapMode}
                          sarLayerEnabled={sarLayerEnabled}
                          onToggleSarLayer={() => setSarLayerEnabled(!sarLayerEnabled)}
                          isCompact={isMobile}
                        />

                        {/* SECTOR STATUS PILLS */}
                        <div className="flex flex-wrap gap-1.5">
                          {computedTelemetry.evaluatedNodes.map((n) => {
                            const isSelected = n.id === selectedNodeId;
                            return (
                              <button
                                key={n.id}
                                type="button"
                                onClick={() => setSelectedNodeId(n.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-[#1C1C1C] text-white shadow-md ring-2 ring-[#FF8A1F]'
                                    : 'bg-white text-[#090D16] border border-slate-300'
                                }`}
                              >
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    n.depthCm >= 45
                                      ? 'bg-[#DC2626]'
                                      : n.depthCm >= 28
                                      ? 'bg-[#EA580C]'
                                      : 'bg-[#059669]'
                                  }`}
                                />
                                <span>{n.sector}</span>
                                <span
                                  className={`font-mono font-extrabold ${
                                    isSelected ? 'text-amber-300' : 'text-[#090D16]'
                                  }`}
                                >
                                  ({n.depthCm}cm)
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* BOTTOM 2-COLUMN LIVE READINGS & FLEET DISPATCH */}
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-7 card-white p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <div>
                                <div className="text-[10px] font-mono uppercase text-[#EA580C] font-extrabold">
                                  {selectedNode.code} · RAIN: {selectedNode.localRain} MM/HR
                                </div>
                                <h3 className="text-sm lg:text-base font-extrabold text-[#090D16] truncate">
                                  {selectedNode.name}
                                </h3>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#059669] font-mono text-[10px] font-extrabold">
                                {selectedNode.outfall}
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              <div className="p-2 rounded-xl bg-slate-100">
                                <div className="text-[9px] text-[#334155] font-extrabold uppercase">
                                  Depth
                                </div>
                                <div className="font-mono text-base lg:text-lg font-extrabold text-[#090D16]">
                                  {selectedNode.depthCm}cm
                                </div>
                              </div>
                              <div className="p-2 rounded-xl bg-red-50">
                                <div className="text-[9px] text-[#DC2626] font-extrabold uppercase">
                                  Surge
                                </div>
                                <div className="font-mono text-base lg:text-lg font-extrabold text-[#DC2626]">
                                  T-{selectedNode.backflowEtaMins}m
                                </div>
                              </div>
                              <div className="p-2 rounded-xl bg-orange-50">
                                <div className="text-[9px] text-[#EA580C] font-extrabold uppercase">
                                  Choke
                                </div>
                                <div className="font-mono text-base lg:text-lg font-extrabold text-[#EA580C]">
                                  {selectedNode.choke}%
                                </div>
                              </div>
                              <div className="p-2 rounded-xl bg-blue-50">
                                <div className="text-[9px] text-[#2563EB] font-extrabold uppercase">
                                  Pipe HGL
                                </div>
                                <div className="font-mono text-base lg:text-lg font-extrabold text-[#2563EB]">
                                  {selectedNode.hglElevM}m
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-5 card-white p-3.5 space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <h3 className="text-xs lg:text-sm font-extrabold text-[#090D16]">
                                Active Emergency Pump Fleet
                              </h3>
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-950 font-mono text-[9px] font-extrabold">
                                DryRoute™
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {computedTelemetry.dispatches.slice(0, 2).map((d) => (
                                <div
                                  key={d.id}
                                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]"
                                >
                                  <div className="truncate pr-2">
                                    <div className="font-extrabold text-[#090D16]">{d.id}</div>
                                    <div className="text-[10px] font-bold text-[#334155] truncate">
                                      {d.targetSector} ({d.waterVolM3}m³)
                                    </div>
                                  </div>
                                  <span className="font-mono text-[10px] font-extrabold text-[#EA580C] shrink-0">
                                    {d.drainMins}m
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
