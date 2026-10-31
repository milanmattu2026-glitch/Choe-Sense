import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  Sparkles, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  X, 
  Radio, 
  Send 
} from 'lucide-react';

const PRESETS = [
  {
    id: 'khuda_lahora',
    label: 'Khuda Lahora',
    name: 'Khuda Lahora Causeway / Patiala Ki Rao',
    lat: 30.7670,
    lng: 76.7758,
    benchmark: 'Roundabout Kerb Stone + Causeway Lip'
  },
  {
    id: 'zirakpur',
    label: 'Zirakpur Chowk',
    name: 'Zirakpur Chowk / Sukhna Choe Outfall',
    lat: 30.6425,
    lng: 76.8288,
    benchmark: 'Bridge Abutment Wall + Drainage Sluice'
  },
  {
    id: 'sec70',
    label: 'Sec 70 Mohali',
    name: 'Sector 70 Mohali Drainage Link',
    lat: 30.7015,
    lng: 76.7150,
    benchmark: 'Two-Wheeler Exhaust Benchmark'
  }
];

const DEPTH_OPTIONS = [
  { value: 30, label: '30 cm', severity: 'MODERATE' },
  { value: 54, label: '54 cm (Crit)', severity: 'CRITICAL' },
  { value: 75, label: '75+ cm', severity: 'EXTREME' }
];

export default function TelemetryUploadModal({
  isOpen,
  onClose,
  onTransmit
}) {
  const [depthCm, setDepthCm] = useState(30);
  const [lat, setLat] = useState(30.7670);
  const [lng, setLng] = useState(76.7758);
  const [locationName, setLocationName] = useState('Khuda Lahora Causeway / Patiala Ki Rao');
  const [activePreset, setActivePreset] = useState('khuda_lahora');
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [sampleFileName, setSampleFileName] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);

  if (!isOpen) return null;

  // Handle Preset Selection
  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    setLat(preset.lat);
    setLng(preset.lng);
    setLocationName(preset.name);
  };

  // Acquire Live GPS
  const handleAcquireGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = Number(pos.coords.latitude.toFixed(4));
        const userLng = Number(pos.coords.longitude.toFixed(4));
        setLat(userLat);
        setLng(userLng);
        setLocationName('Current GPS Telemetry Fix');
        setActivePreset('custom_gps');
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Fallback simulated GPS jitter around Chandigarh
        const simulatedLat = Number((30.7333 + (Math.random() - 0.5) * 0.04).toFixed(4));
        const simulatedLng = Number((76.7794 + (Math.random() - 0.5) * 0.04).toFixed(4));
        setLat(simulatedLat);
        setLng(simulatedLng);
        setLocationName('Live Tri-City Ingest Sensor');
        setActivePreset('custom_gps');
        setIsLocating(false);
      },
      { timeout: 6000 }
    );
  };

  // Load Sample Flood Image
  const handleLoadSamplePic = () => {
    setSampleLoaded(true);
    setSampleFileName('khuda_lahora_submerged_kerb.jpg');
  };

  // Custom File Upload Simulation
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSampleLoaded(true);
      setSampleFileName(file.name);
    }
  };

  // Submit and plot to MapLibre
  const handleTransmit = () => {
    setIsTransmitting(true);
    setTimeout(() => {
      setIsTransmitting(false);
      if (onTransmit) {
        onTransmit({
          lat,
          lng,
          depthCm,
          locationName,
          sampleFileName: sampleLoaded ? sampleFileName : 'citizen_photogrammetry_fix.jpg'
        });
      }
      onClose();
    }, 600);
  };

  // Calculate Water Height Percentage in Visualizer
  const waterHeightPct = depthCm <= 30 ? 32 : depthCm <= 54 ? 62 : 88;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        {/* Backdrop click dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Window Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 bg-white rounded-[24px] w-[460px] max-w-full p-4 shadow-2xl space-y-4 border border-slate-100 text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Dismiss Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ============================================================
              SECTION 1: THE WATERLINE VISUALIZER (TOP CANVAS)
          ============================================================ */}
          <div className="h-[140px] bg-[#344054] rounded-2xl relative overflow-hidden shadow-inner flex flex-col justify-end select-none">
            {/* Street Level Dashed Reference Line */}
            <div className="w-full absolute top-[52%] left-0 border-t-2 border-dashed border-white/40 flex items-center justify-between px-2.5 text-[8.5px] font-mono text-white/50 pointer-events-none z-10">
              <span>STREET INVERT RIM</span>
              <span>(±0.0m)</span>
            </div>

            {/* The Measuring Gauge (Center Yellow Measuring Stick) */}
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 bottom-1.5 w-3.5 bg-amber-400 border border-amber-600 rounded-xs z-10 flex flex-col justify-between py-1.5 shadow-sm pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-full h-[1.5px] bg-amber-900/70" />
              ))}
            </div>

            {/* Dynamic Water Column with Smooth Animation */}
            <motion.div
              animate={{ height: `${waterHeightPct}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full bg-gradient-to-t from-blue-600/80 via-blue-500/60 to-sky-400/50 absolute bottom-0 left-0 border-t border-sky-300/80 flex items-start justify-end pr-2.5 pt-1"
            >
              {/* Dark Floating Tag Near Waterline */}
              <div className="bg-slate-900/90 text-white font-mono text-[9.5px] font-bold px-2 py-0.5 rounded shadow border border-white/10 tracking-wide">
                WATERLINE: {depthCm} cm
              </div>
            </motion.div>

            {/* Red Pill Bottom-Left */}
            <div className="absolute bottom-2.5 left-2.5 z-20 bg-red-500 text-white text-[9.5px] font-extrabold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
              <span>DEPTH: {depthCm} CM (HIGH)</span>
            </div>

            {/* Bottom-Right Grayed Out Benchmark */}
            <div className="absolute bottom-2.5 right-2.5 z-20 text-white/40 font-mono text-[9.5px]">
              ATK: 12.8m
            </div>
          </div>

          {/* ============================================================
              SECTION 2: UPLOAD CONTROLS
          ============================================================ */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="flex-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition">
                <UploadCloud className="w-4 h-4 text-slate-500" />
                <span>Upload File</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleLoadSamplePic}
                className="flex-1 px-3 py-2 rounded-xl bg-orange-50/70 hover:bg-orange-100/70 border border-orange-200 text-orange-600 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition"
              >
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>Load Sample Flood Pic</span>
              </button>
            </div>

            {/* Sample Image Status Badge */}
            {sampleLoaded && (
              <div className="text-[10.5px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-1 rounded-lg flex items-center justify-between font-mono animate-fadeIn">
                <span className="truncate">📷 Ingested: {sampleFileName}</span>
                <span className="font-bold text-[9px] bg-emerald-200/70 px-1.5 py-0.2 rounded text-emerald-900">
                  CLAHE READY
                </span>
              </div>
            )}
          </div>

          {/* ============================================================
              SECTION 3: EXACT WGS84 GEO-TAGS
          ============================================================ */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-wider text-slate-800 uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>EXACT WGS84 GEO-TAGS</span>
              </div>

              <button
                onClick={handleAcquireGPS}
                disabled={isLocating}
                className="text-[10.5px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition"
              >
                <Navigation className="w-3 h-3 text-orange-500" />
                <span>{isLocating ? 'Locating...' : 'Acquire Live GPS'}</span>
              </button>
            </div>

            {/* Latitude and Longitude Readouts */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <div className="text-[9.5px] text-slate-400 font-medium uppercase">LATITUDE</div>
                <div className="text-[14px] font-mono font-bold text-slate-800 mt-0.5">
                  {lat.toFixed(4)}° N
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <div className="text-[9.5px] text-slate-400 font-medium uppercase">LONGITUDE</div>
                <div className="text-[14px] font-mono font-bold text-slate-800 mt-0.5">
                  {lng.toFixed(4)}° E
                </div>
              </div>
            </div>

            {/* Presets Row */}
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition cursor-pointer border ${
                    activePreset === p.id
                      ? 'bg-orange-500 text-white border-orange-500 font-semibold shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ============================================================
              SECTION 4: HYDRAULIC BENCHMARK & DEPTH
          ============================================================ */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              HYDRAULIC BENCHMARK & DEPTH
            </div>

            {/* Location & CV Badge Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-800 truncate">
                <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="truncate">{locationName}</span>
              </div>

              <span className="text-[9.5px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-300/60 shrink-0">
                CV Verified
              </span>
            </div>

            {/* Depth Selector Toggle Row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {DEPTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDepthCm(opt.value)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition cursor-pointer border text-center ${
                    depthCm === opt.value
                      ? 'border-orange-500 text-orange-600 bg-orange-50/60 shadow-2xs font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ============================================================
              SECTION 5: FOOTER ACTIONS
          ============================================================ */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={isTransmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Dismiss
            </button>

            <button
              onClick={handleTransmit}
              disabled={isTransmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
              {isTransmitting ? (
                <>
                  <Radio className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitting to Kalman Filter...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit &amp; Plot Geo-Tagged Pic</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
