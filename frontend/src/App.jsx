import React, { useState, useEffect, useRef, useCallback } from 'react'
import CommandCenter from './pages/CommandCenter.jsx'
import ChoeSenseMap from './components/ChoeSenseMap.jsx'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const API = ''  // empty → uses Vite proxy to localhost:8000

const PIPE_CONNECTIONS = [
  // [from_node_id, to_node_id]
  ['NODE-PGI-SEC12',    'NODE-SEC22-23'],
  ['NODE-SEC22-23',     'NODE-SEC36-NCHOE'],
  ['NODE-TRIBUNE-CHOWK','NODE-IND-PH1'],
]

// Static node positions for pipe rendering (lng, lat → [lat, lng] for Leaflet)
const NODE_POSITIONS = {
  'NODE-SEC36-NCHOE':    [30.7285, 76.7562],
  'NODE-IND-PH1':        [30.7062, 76.8045],
  'NODE-ZIRAKPUR-RAO':   [30.6542, 76.8214],
  'NODE-SEC22-23':       [30.7368, 76.7738],
  'NODE-PGI-SEC12':      [30.7615, 76.7751],
  'NODE-TRIBUNE-CHOWK':  [30.7098, 76.7912],
}

// Jurisdiction polygons [lat, lng]
const JURISDICTION_POLYS = [
  {
    id: 'chandigarh-mc',
    label: 'Chandigarh MC',
    color: '#00d4ff22',
    border: '#00d4ff55',
    coords: [[30.78,76.73],[30.78,76.82],[30.70,76.82],[30.70,76.73]],
  },
  {
    id: 'gmada',
    label: 'GMADA',
    color: '#bf5af222',
    border: '#bf5af255',
    coords: [[30.70,76.73],[30.70,76.82],[30.64,76.82],[30.64,76.73]],
  },
]

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function riskColor(level, depth) {
  if (level === 'Critical' || depth >= 45) return '#ff3b3b'
  if (level === 'High'     || depth >= 25) return '#ff9f0a'
  if (level === 'Medium'   || depth >= 10) return '#ffd60a'
  return '#30d158'
}

function statusColor(status) {
  if (status === 'EN_ROUTE')       return '#ffd60a'
  if (status === 'ON_SITE_PUMPING') return '#00d4ff'
  if (status === 'MAINTENANCE')    return '#ff3b3b'
  return '#30d158'
}

function fmtMins(mins) {
  if (mins == null) return '—'
  return `${mins}m`
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

/** Leaflet polygon via useMap */
function JurisdictionOverlay({ polys }) {
  const map = useMap()
  useEffect(() => {
    const L = window.L || window.leaflet
    if (!L) return
    const layers = polys.map(p => {
      const latlngs = p.coords
      return L.polygon(latlngs, {
        color: p.border,
        fillColor: p.color,
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '6 4',
      }).bindTooltip(`<span style="color:#00d4ff;font-family:monospace;font-size:11px">${p.label}</span>`, {
        permanent: true, direction: 'center', className: 'leaflet-jurs-label',
      }).addTo(map)
    })
    return () => layers.forEach(l => l.remove())
  }, [map, polys])
  return null
}

/** Animated pipe polyline */
function PipeLine({ from, to, isActive, color }) {
  const weight = isActive ? 4 : 2
  const dashArray = isActive ? null : '6 6'
  const opacity = isActive ? 0.9 : 0.35
  return (
    <Polyline
      positions={[from, to]}
      pathOptions={{ color, weight, dashArray, opacity }}
    />
  )
}

/** Node marker on map */
function NodeMarker({ node, simNode }) {
  const depth = simNode?.estimated_depth_cm ?? node.current_depth_cm ?? 0
  const risk = simNode?.risk_level ?? (depth >= 45 ? 'Critical' : depth >= 25 ? 'High' : depth >= 10 ? 'Medium' : 'Low')
  const color = riskColor(risk, depth)
  const radius = 10 + Math.min(depth / 8, 14)
  const pos = NODE_POSITIONS[node.id] || [30.73, 76.77]
  const eta = simNode?.backflow_eta_mins ?? node.backflow_eta_mins

  return (
    <CircleMarker
      center={pos}
      radius={radius}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 2 }}
    >
      <Popup>
        <div className="font-mono text-xs text-gray-100" style={{ minWidth: 220 }}>
          <div className="font-bold text-sm mb-1" style={{ color }}>{node.name}</div>
          <div>Sector: {node.sector}</div>
          <div>Depth: <span style={{ color }} className="font-bold">{depth.toFixed(0)} cm</span></div>
          {eta && <div className="text-red-400 font-bold mt-1">⚠ BACKFLOW SURGE: T-{eta}m</div>}
          <div className="mt-1 text-gray-400">Choe: {node.outfall_choe}</div>
          {simNode && (
            <>
              <div>Overflow: {simNode.overflow_m3_hr?.toFixed(0)} m³/hr</div>
              <div>Priority: {(simNode.priority_score * 100).toFixed(0)}%</div>
              <div className="mt-1 text-yellow-300 text-xs leading-snug">{simNode.citizen_bypass_advisory}</div>
            </>
          )}
        </div>
      </Popup>
    </CircleMarker>
  )
}

/** Fleet asset card */
function FleetCard({ asset, dispatch }) {
  const currentStatus = dispatch?.status || asset.status
  const sc = statusColor(currentStatus)
  const isPump = asset.asset_type === 'SUPER_SUCKER_PUMP'
  const icon = isPump ? '🚛' : '🛠️'
  const capacity = isPump
    ? `${asset.pump_capacity_m3_hr?.toFixed(0)} m³/hr`
    : `${asset.gully_clearance_rate_pct_hr?.toFixed(0) || 65}%/hr clearance`

  const assignedNode = dispatch?.node_name || asset.assigned_node_id
  const etaMins = dispatch?.truck_eta_mins ?? dispatch?.eta_mins ?? asset.eta_mins
  const drainMins = dispatch?.time_to_drain_mins ?? 30

  return (
    <div className="rounded-lg border border-command-border bg-command-panel p-3 mb-2 transition-all">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="text-xs font-mono font-bold text-gray-100 leading-tight">
              {asset.asset_id}
            </div>
            <div className="text-xs text-gray-400 leading-tight truncate max-w-[150px]">
              {asset.asset_name?.split('(')[0].trim()}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
            style={{ backgroundColor: sc + '22', color: sc, border: `1px solid ${sc}` }}
          >
            {currentStatus.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] font-mono text-gray-400 mt-1.5">
        <span>⚡ {capacity}</span>
        <span>🏠 {asset.base_sector?.split(' ').slice(0, 2).join(' ')}</span>
        {assignedNode && (
          <span className="text-yellow-400 truncate col-span-2">
            📍 {assignedNode}
          </span>
        )}
        {etaMins && (
          <span className="text-command-accent font-semibold">ETA {etaMins}m via V4/V5</span>
        )}
        {dispatch && isPump && (
          <span className="text-purple-300">Drain: ~{Math.round(drainMins)}m</span>
        )}
      </div>

      {dispatch && isPump && (
        <div className="mt-2 pt-1 border-t border-command-border/50">
          <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
            <span>💧 Dewatering ({dispatch.water_volume_m3 || 0} m³)</span>
            <span className="text-command-accent">ACTIVE</span>
          </div>
          <div className="w-full h-1.5 bg-command-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: '65%',
                background: 'linear-gradient(90deg, #00d4ff, #bf5af2)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** Choe Telemetry Pill */
function ChoeTelemetryBar({ telemetry }) {
  if (!telemetry) return null
  const choes = [
    { name: 'N-Choe', data: telemetry['N-Choe'] },
    { name: 'Sukhna Choe', data: telemetry['Sukhna Choe'] },
    { name: 'Patiala Ki Rao', data: telemetry['Patiala Ki Rao'] },
  ]
  return (
    <div className="flex items-center gap-3 bg-command-panel/90 backdrop-blur border border-command-border/80 rounded-lg px-3 py-1.5 text-xs font-mono">
      <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Outfall Telemetry:</span>
      {choes.map(({ name, data }) => {
        if (!data) return null
        const isSurge = data.hydraulic_status?.includes('SURGE') || data.surcharge_pct >= 70
        return (
          <div key={name} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isSurge ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
            <span className="text-gray-300 font-medium">{name}:</span>
            <span className={isSurge ? 'text-red-400 font-bold' : 'text-command-accent'}>
              {data.surcharge_pct?.toFixed(0)}%
            </span>
            <span className="text-[10px] text-gray-500">({data.hydraulic_status})</span>
          </div>
        )
      })}
    </div>
  )
}

/** Vision Gauge Inspector card */
function VisionCard({ data, onSimulateReport }) {
  const depthColor = data?.water_depth_cm >= 45 ? '#ff3b3b' : data?.water_depth_cm >= 25 ? '#ff9f0a' : '#ffd60a'
  return (
    <div className="rounded-lg border font-mono text-xs bg-command-panel p-3"
      style={{ borderColor: data ? depthColor + '88' : '#1e3a5f' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm" style={{ color: data ? depthColor : '#00d4ff' }}>
          📸 Vision Gauge Inspector
        </div>
        <button
          onClick={onSimulateReport}
          className="text-[10px] bg-command-accent/20 hover:bg-command-accent/30 text-command-accent px-2 py-0.5 rounded border border-command-accent/40 transition-colors"
        >
          ⚡ Simulate WhatsApp
        </button>
      </div>

      {!data ? (
        <div className="text-center text-xs text-gray-500 py-3">
          Click <span className="text-command-accent">⚡ Simulate WhatsApp</span> to trigger a live vision analysis demo.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-y-1 text-gray-300">
          <span className="text-gray-500">Reference:</span>
          <span className="text-white font-medium">{data.reference_object_detected?.replace(/_/g, ' ')}</span>
          <span className="text-gray-500">Depth:</span>
          <span style={{ color: depthColor }} className="font-bold">{data.water_depth_cm?.toFixed(0)} cm</span>
          <span className="text-gray-500">Gully choke:</span>
          <span className="text-orange-400">{data.gully_choke_pct?.toFixed(0)}%</span>
          <span className="text-gray-500">Drain rate:</span>
          <span>{data.effective_drain_rate_in_hr?.toFixed(3)} in/hr</span>
          <span className="text-gray-500">Passability:</span>
          <span className={data.vehicle_passability === 'IMPASSABLE_ALL' ? 'text-red-400' : 'text-yellow-400'}>
            {data.vehicle_passability?.replace(/_/g, ' ')}
          </span>
          <span className="text-gray-500">Confidence:</span>
          <span className="text-green-400">{(data.confidence_score * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  )
}

/** SLA Bar Chart */
function SLAChart({ simData }) {
  if (!simData) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-gray-500 font-mono">
        Move sliders to run simulation ↑
      </div>
    )
  }

  const nodes = simData.node_assessments || []
  const labels = nodes.map(n => n.name.split(' ').slice(0, 2).join(' '))
  const oldSystem = nodes.map(n => n.passive_ticket_blocked_mins || 0)
  const newSystem = nodes.map(n =>
    Math.max(0, (n.passive_ticket_blocked_mins || 0) - (n.autonomous_saved_mins || 0))
  )

  const data = {
    labels,
    datasets: [
      {
        label: 'Old Ticket System (mins)',
        data: oldSystem,
        backgroundColor: '#ff3b3b99',
        borderColor: '#ff3b3b',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Choe Sense 2.0 (mins)',
        data: newSystem,
        backgroundColor: '#00d4ff99',
        borderColor: '#00d4ff',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'monospace', size: 11 } },
      },
      title: {
        display: true,
        text: 'Hospital Corridor Blocked Time (Minutes): Old System vs Choe Sense 2.0',
        color: '#e2e8f0',
        font: { family: 'monospace', size: 12, weight: 'bold' },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { family: 'monospace', size: 10 } },
        grid: { color: '#1e3a5f44' },
      },
      y: {
        ticks: { color: '#64748b', font: { family: 'monospace', size: 10 } },
        grid: { color: '#1e3a5f44' },
        title: { display: true, text: 'Minutes blocked', color: '#64748b', font: { size: 10 } },
      },
    },
  }

  return <Bar data={data} options={options} />
}

/** Simulator slider row */
function SliderRow({ label, min, max, value, onChange, unit, step = 1 }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
        <span>{label}</span>
        <span className="text-command-accent font-bold">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        style={{ '--value': `${pct}%` }}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────
export default function App() {
  const [viewMode, setViewMode] = useState('command-center') // 'command-center' | 'console'
  const [commandState, setCommandState] = useState(null)
  const [simData, setSimData] = useState(null)
  const [simLoading, setSimLoading] = useState(false)
  const [visionData, setVisionData] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Simulator sliders
  const [rainMm, setRainMm] = useState(0)
  const [chokePct, setChokePct] = useState(35)
  const [choeLevel, setChoeLevel] = useState(0)
  const [activeTrucks, setActiveTrucks] = useState(3)

  const simTimer = useRef(null)

  // ── Fetch command state every 15 s ──
  const fetchCommandState = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/command-state`)
      if (!res.ok) return
      const data = await res.json()
      setCommandState(data)
      setLastUpdated(new Date().toLocaleTimeString('en-IN'))
    } catch { /* backend offline gracefully */ }
  }, [])

  useEffect(() => {
    fetchCommandState()
    const interval = setInterval(fetchCommandState, 15000)
    return () => clearInterval(interval)
  }, [fetchCommandState])

  // ── Debounced simulation on slider change ──
  const runSimulation = useCallback(async (rain, choke, choe, trucks) => {
    setSimLoading(true)
    try {
      const res = await fetch(`${API}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rain_mm_hr: rain,
          gully_choke_pct: choke,
          choe_level_pct: choe,
          active_trucks: trucks,
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      setSimData(data)
    } catch { /* backend offline */ }
    finally { setSimLoading(false) }
  }, [])

  useEffect(() => {
    if (simTimer.current) clearTimeout(simTimer.current)
    simTimer.current = setTimeout(() => {
      runSimulation(rainMm, chokePct, choeLevel, activeTrucks)
    }, 600)
    return () => clearTimeout(simTimer.current)
  }, [rainMm, chokePct, choeLevel, activeTrucks, runSimulation])

  // ── Derive node data (merge DB + sim results) ──
  const nodes = commandState?.flood_nodes || []
  const fleet  = commandState?.mc_fleet   || []
  const dispatches = commandState?.active_dispatches || []
  const summary = commandState?.summary || {}

  const simNodeMap = {}
  if (simData?.node_assessments) {
    simData.node_assessments.forEach(n => { simNodeMap[n.node_id] = n })
  }

  // ── Pipe connections enriched ──
  const pipeLines = PIPE_CONNECTIONS.map(([fromId, toId]) => {
    const fromPos = NODE_POSITIONS[fromId]
    const toPos   = NODE_POSITIONS[toId]
    if (!fromPos || !toPos) return null
    const simFrom = simNodeMap[fromId]
    const isActive = simFrom?.overflow_m3_hr > 0
    const color = isActive ? riskColor(simFrom?.risk_level, simFrom?.estimated_depth_cm) : '#1e3a5f'
    return { fromId, toId, fromPos, toPos, isActive, color }
  }).filter(Boolean)

  // ── SLA metrics ──
  const sla = simData?.sla_comparison
  const savedMins = sla?.autonomous_dispatch_saved_mins ?? 0
  const lostMins  = sla?.reactive_ticket_loss_mins ?? 0

  const alerts = simData?.backflow_alerts || []
  const choeTelemetry = simData?.choe_outfall_telemetry || commandState?.choe_outfall_telemetry

  const handleSimulateReport = () => {
    setVisionData({
      source_image: "whatsapp_cctv_isbt17_frame.jpg",
      reference_object_detected: "sedan_wheel_arch",
      water_depth_cm: 55.0,
      vehicle_passability: "SUVS_ONLY",
      gully_choke_pct: 75.0,
      effective_drain_rate_in_hr: 0.181,
      confidence_score: 0.94,
    })
  }

  if (viewMode === 'command-center') {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        <CommandCenter />
        <div className="fixed bottom-3 left-20 z-[2000] flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-lg shadow-xl backdrop-blur text-[11px] font-mono text-slate-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Choe Sense 2.0</span>
          <span className="text-slate-600">|</span>
          <button 
            onClick={() => setViewMode('choe-map')}
            className="text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
          >
            Live Hydrology Map &rarr;
          </button>
          <span className="text-slate-600">|</span>
          <button 
            onClick={() => setViewMode('console')}
            className="text-slate-400 hover:text-slate-300 underline font-semibold cursor-pointer"
          >
            Engineering Console &rarr;
          </button>
        </div>
      </div>
    )
  }

  if (viewMode === 'choe-map') {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        <ChoeSenseMap />
        <div className="fixed bottom-3 left-20 z-[2000] flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-lg shadow-xl backdrop-blur text-[11px] font-mono text-slate-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Choe Sense 2.0</span>
          <span className="text-slate-600">|</span>
          <button 
            onClick={() => setViewMode('command-center')}
            className="text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
          >
            &larr; Command Center 2.0
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-command-bg text-gray-100 overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-command-border bg-command-panel flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-command-accent animate-pulse_slow" />
          <span className="font-mono font-bold text-command-accent text-sm tracking-widest">
            CHOE SENSE 2.0
          </span>
          <span className="text-gray-500 text-xs font-mono hidden md:block">
            Hydraulic Command Center — Chandigarh Tricity
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          {summary.critical_nodes > 0 && (
            <span className="text-red-400 font-bold animate-pulse">
              🔴 {summary.critical_nodes} CRITICAL
            </span>
          )}
          <span className="text-gray-500">
            Fleet: <span className="text-green-400">{summary.fleet_available ?? '…'} AVL</span>
            {' / '}
            <span className="text-yellow-400">{summary.fleet_deployed ?? '…'} DEPLOYED</span>
          </span>
          {lastUpdated && <span className="text-gray-600">↻ {lastUpdated}</span>}
          <button 
            onClick={() => setViewMode('command-center')}
            className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition shadow cursor-pointer ml-2"
          >
            &larr; Command Center 2.0
          </button>
        </div>
      </header>

      {/* ── Emergency Backflow Alert Ticker ── */}
      {alerts.length > 0 && (
        <div className="bg-red-950/80 border-b border-red-500/50 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-red-200 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold text-red-400">HYDRAULIC SURGE ACTIVE:</span>
            <span className="truncate">{alerts[0].countdown_banner}</span>
          </div>
          <span className="text-[10px] text-red-400/80 flex-shrink-0 ml-2">
            ({alerts.length} node{alerts.length > 1 ? 's' : ''} surcharging)
          </span>
        </div>
      )}

      {/* ── Main 3-column layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ═══ LEFT: Map (flex-grow) ═══ */}
        <div className="flex-1 relative">
          {/* Choe Telemetry bar overlay on map */}
          <div className="absolute top-3 left-3 z-[1000]">
            <ChoeTelemetryBar telemetry={choeTelemetry} />
          </div>

          <MapContainer
            center={[30.72, 76.77]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <JurisdictionOverlay polys={JURISDICTION_POLYS} />

            {/* Storm-pipe trunk lines */}
            {pipeLines.map(pl => (
              <PipeLine
                key={`${pl.fromId}-${pl.toId}`}
                from={pl.fromPos}
                to={pl.toPos}
                isActive={pl.isActive}
                color={pl.color}
              />
            ))}

            {/* Flood node markers */}
            {nodes.map(n => (
              <NodeMarker key={n.id} node={n} simNode={simNodeMap[n.id]} />
            ))}
          </MapContainer>

          {/* Map legend overlay */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-command-panel border border-command-border rounded-lg p-2 text-xs font-mono space-y-1">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Low risk</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Medium</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> High</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Critical</div>
            <div className="flex items-center gap-2 pt-1 border-t border-command-border">
              <span className="w-6 h-0.5 bg-command-accent inline-block" /> Storm pipe
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 bg-red-500 inline-block" /> Backflow surge
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Fleet Console ═══ */}
        <div className="w-72 flex flex-col border-l border-command-border bg-command-panel overflow-y-auto flex-shrink-0">
          <div className="px-3 pt-3 pb-2 border-b border-command-border">
            <div className="text-xs font-mono font-bold text-command-accent tracking-wider mb-0.5">
              AUTONOMOUS FLEET CONSOLE
            </div>
            <div className="text-xs text-gray-500 font-mono">MC Chandigarh — 3 Pumps + 3 Squads</div>
          </div>

          <div className="px-3 py-3 flex-1 overflow-y-auto">
            {/* Pump trucks */}
            <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">Super-Sucker Pumps</div>
            {(fleet.filter(a => a.asset_type === 'SUPER_SUCKER_PUMP').length > 0
              ? fleet.filter(a => a.asset_type === 'SUPER_SUCKER_PUMP')
              : [
                  { asset_id: 'MC-PUMP-01', asset_name: 'MC Super-Sucker Alpha (1200 m3/hr)', asset_type: 'SUPER_SUCKER_PUMP', pump_capacity_m3_hr: 1200, base_sector: 'Sector 17 MC Main Depot', status: 'AVAILABLE' },
                  { asset_id: 'MC-PUMP-02', asset_name: 'MC Super-Sucker Bravo (900 m3/hr)', asset_type: 'SUPER_SUCKER_PUMP', pump_capacity_m3_hr: 900, base_sector: 'Industrial Area Ph-1 Station', status: 'AVAILABLE' },
                  { asset_id: 'MC-PUMP-03', asset_name: 'MC High-Head Pump Charlie (600 m3/hr)', asset_type: 'SUPER_SUCKER_PUMP', pump_capacity_m3_hr: 600, base_sector: 'Sector 14/15 Emergency Yard', status: 'AVAILABLE' },
                ]
            ).map(a => {
              const disp = simData?.dispatch_plan?.orders?.find(d => d.asset_id === a.asset_id) || dispatches.find(d => d.asset_id === a.asset_id)
              return <FleetCard key={a.asset_id} asset={a} dispatch={disp} />
            })}

            {/* Gully squads */}
            <div className="text-xs font-mono text-gray-500 mb-2 mt-3 uppercase tracking-widest">Gully Desilting Squads</div>
            {(fleet.filter(a => a.asset_type === 'GULLY_SQUAD').length > 0
              ? fleet.filter(a => a.asset_type === 'GULLY_SQUAD')
              : [
                  { asset_id: 'GULLY-SQUAD-A', asset_name: 'Rapid Gully Desilting Squad Alpha', asset_type: 'GULLY_SQUAD', gully_clearance_rate_pct_hr: 65, base_sector: 'Sector 15 Sub-Office', status: 'AVAILABLE' },
                  { asset_id: 'GULLY-SQUAD-B', asset_name: 'Rapid Gully Desilting Squad Bravo', asset_type: 'GULLY_SQUAD', gully_clearance_rate_pct_hr: 65, base_sector: 'Sector 22 Maintenance Booth', status: 'AVAILABLE' },
                  { asset_id: 'GULLY-SQUAD-C', asset_name: 'Rapid Gully Desilting Squad Charlie', asset_type: 'GULLY_SQUAD', gully_clearance_rate_pct_hr: 65, base_sector: 'Sector 31 MC Yard', status: 'AVAILABLE' },
                ]
            ).map(a => {
              const disp = simData?.dispatch_plan?.orders?.find(d => d.asset_id === a.asset_id) || dispatches.find(d => d.asset_id === a.asset_id)
              return <FleetCard key={a.asset_id} asset={a} dispatch={disp} />
            })}

            {/* Vision Gauge Inspector */}
            <div className="text-xs font-mono text-gray-500 mb-2 mt-3 uppercase tracking-widest">Vision Gauge Inspector</div>
            <VisionCard data={visionData} onSimulateReport={handleSimulateReport} />

            {/* SLA savings summary from sim */}
            {sla && (
              <div className="mt-3 rounded-lg border border-command-border bg-command-bg p-3 text-xs font-mono">
                <div className="text-command-accent font-bold mb-2">⚡ SLA Impact</div>
                <div className="flex justify-between text-gray-400 mb-1">
                  <span>Old ticket loss:</span>
                  <span className="text-red-400 font-bold">{lostMins.toFixed(0)} min</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Autonomous saved:</span>
                  <span className="text-green-400 font-bold">{savedMins.toFixed(0)} min</span>
                </div>
                <div className="mt-2 w-full h-1 bg-command-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-700"
                    style={{ width: `${lostMins > 0 ? (savedMins / lostMins) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-gray-500 text-center mt-1">
                  {lostMins > 0 ? `${((savedMins / lostMins) * 100).toFixed(0)}% efficiency gain` : 'No active flood nodes'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM: Judge Stress-Test Simulator ═══ */}
      <div className="border-t border-command-border bg-command-panel flex-shrink-0">
        <div className="flex items-center px-4 pt-2 pb-1 gap-2">
          <span className="text-xs font-mono font-bold text-command-purple tracking-widest">
            ⚡ JUDGE STRESS-TEST SIMULATOR
          </span>
          {simLoading && (
            <span className="text-xs font-mono text-gray-500 animate-pulse">Running cascade…</span>
          )}
          {simData && !simLoading && (
            <span className="text-xs font-mono text-green-500">
              ✓ {simData.node_assessments?.filter(n => n.risk_level === 'Critical').length ?? 0} critical nodes
              {' · '}
              {simData.dispatch_plan?.orders_count ?? 0} dispatches
            </span>
          )}
        </div>

        <div className="flex gap-0 px-2 pb-2">
          {/* Sliders */}
          <div className="flex-1 px-3 grid grid-cols-2 gap-x-6 gap-y-0">
            <SliderRow
              label="☁️ Cloudburst Intensity"
              min={0} max={120} value={rainMm}
              onChange={setRainMm} unit=" mm/hr"
            />
            <SliderRow
              label="🍂 Leaf/Plastic Gully Choke"
              min={0} max={100} value={chokePct}
              onChange={setChokePct} unit="%"
            />
            <SliderRow
              label="🌊 N-Choe Outfall Capacity"
              min={0} max={100} value={choeLevel}
              onChange={setChoeLevel} unit="% back-pressure"
            />
            <SliderRow
              label="🚛 Available MC Pump Trucks"
              min={1} max={3} value={activeTrucks}
              onChange={setActiveTrucks} unit=" trucks" step={1}
            />
          </div>

          {/* Chart */}
          <div className="w-[520px] h-40 flex-shrink-0">
            <SLAChart simData={simData} />
          </div>
        </div>
      </div>

    </div>
  )
}
