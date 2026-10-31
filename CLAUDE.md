# CHOE SENSE 2.0 — AUTONOMOUS HYDROLOGICAL AI & FLEET DISPATCH ENGINE

## Project Overview
**Choe Sense 2.0** is an autonomous urban flood prediction, hydraulic backflow modeling, and constrained fleet dispatch engine designed for the planned grid topography of Chandigarh and the Tri-City region. It pairs physics-informed hydrology models and zero-hardware photogrammetry with the **Uiverse "Fairweather" Design System** and a zero-API-key vector map engine powered by **MapLibre GL JS + OpenFreeMap**.

---

## Current Architecture & Tech Stack

### 1. Backend (`main.py`, `ml/`)
* **Framework**: FastAPI (Python 3.11), Uvicorn ASGI, Pydantic v2.
* **Physics & Machine Learning**:
  * `ml/vision_gauge.py`:
    * Master Zero-Hardware Photogrammetry & Sentinel-1 SAR Radar Fusion:
      * Standardized Chandigarh reference catalog: Roundabout Kerb ($18\,\text{cm}$), Two-Wheeler Footboard ($30\,\text{cm}$), Sedan Wheel Arch ($52\,\text{cm}$), Vehicle Bonnet/Barrier ($85\,\text{cm}$).
      * Sentinel-1 C-band SAR satellite backscatter fallback ($\le -16.5\,\text{dB}$ specular water detection proxy).
      * Multi-modal night storm fusion ($0.55 \times \text{Optical CLAHE} + 0.45 \times \text{SAR}$).
    * 3-Tier Inverse-Variance Citizen Trust Ledger (PetaBencana-inspired with civic karma rewards):
      * `TIER_1_MC_SWEEPER_WARD_GUARD` ($\sigma = 1.2\,\text{cm}$, weight $0.96$, $+50$ karma).
      * `TIER_2_TRUSTED_CIVIC_SCOUT` ($\sigma = 2.2\,\text{cm}$, weight $0.84$, $+25$ karma).
      * `TIER_3_FIRST_TIME_CITIZEN` ($\sigma = 5.0\,\text{cm}$, weight $0.45$, $+10$ karma).
    * Mahalanobis $3.0\sigma$ outlier gating & Bayesian 1D Kalman crowd fusion (weights verified field sensors $17\times$ over first-time reports, filtering $>95\%$ crowd spoofing).
    * Torricelli Orifice Discharge Choke Penalty: $Q = C_d A \sqrt{2gh}$ (models drain capacity drops from $0.50\,\text{in/hr}$ down to $0.08\text{--}0.25\,\text{in/hr}$ during leaf/plastic occlusions).
    * Cryptographic $50\,\text{m}$ PostGIS Geofence Contractor Proof-of-Work Verification (locks ticket closure until worker is within $50\,\text{m}$ and depth drops $< 5\,\text{cm}$).
  * `ml/backflow_engine.py`:
    * EPA-SWMM 5.2 Calibrated Surrogate & 1D Saint-Venant Piezometric Hydraulic Grade Line (HGL) Engine:
      * Solves Piezometric Head ($H = Z_{\text{invert}} + d + h_{\text{surcharge}}$) and pressurized pipe backwater lock across invert, crown, and street rim elevations.
      * Fast `HistGradientBoostingRegressor` surrogate ($5.8\,\text{ms}$ inference vs $10.5\,\text{min}$ full SWMM) calibrated on 800 synthetic EPA-SWMM 5.2 Dynamic Wave simulations.
      * Hyperlocal Micro-Catchment IDW Rainfall interpolation (`NE_SUKHNA_FOOTHILLS` $\times 1.28$, `CENTRAL_GRID` $\times 1.00$, `SW_OUTFALL_PLAIN` $\times 0.78$) eliminating uniform city-wide rain assumptions.
      * Sentinel-1 SAR Backscatter ($VV/VH\,\text{dB}$) flood polygon verification through monsoon cloud cover with $\le -16.5\,\text{dB}$ threshold.
      * Multi-step horizon forecast: $Now \longrightarrow T+15\text{m} \longrightarrow T+30\text{m}$ with adaptive trust-weighted Kalman confidence bounds ($\sigma \approx 0.8\text{--}1.8\,\text{cm}$).
      * Sukhna Lake Regulatory Floodgate Release Shockwave routing ($0\text{--}5000\,\text{cusecs}$ discharge with kinematic celerity $v = \max(1.8, 1.2 + Q/2500)\,\text{m/s}$ and downstream arrival ETA for Sukhna Choe nodes).
      * PSPCL Electrical Substation Auto-Isolation Guard ($\Delta h = h_{\text{plinth}} - h_{\text{water}}$ monitoring across 11kV/66kV transformers with auto-trip warning at $\le 20\,\text{cm}$ and circuit breaker isolation at $\le 8\,\text{cm}$).
  * `ml/fleet_dispatcher.py`:
    * Constrained Operations Research (OR) Fleet Dispatcher + Offline-First In-Cab PWA Vector Cache:
      * Solves cellular blackout vulnerability: generates self-contained IndexedDB / Service-Worker offline route bundle (`choe_pwa_route_{pump_id}_{hash}`).
      * Turn-by-turn V4 elevated corridor waypoints and navigation instructions for dispatched crew.
      * SMS / USSD dead-zone fallback payload (`CMD:{pump_id}->NODE:{node_id}|V4_DRY_ROUTE|DEPTH:{cm}CM|DRAIN:{mins}M`).
      * Mathematical OR priority score:
        $$\text{Score} = 0.35(\text{Rise Rate}) + 0.30(\text{Hospital Weight}) + 0.20(\text{Backflow Urgency}) + 0.15(\text{Traffic Density}) + \text{Substation Bonus}$$
      * Allocates finite Super-Sucker pump trucks and pre-emptive gully squads.
      * PGI / GMCH-32 Ambulance "Green-Corridor" Hydrolock Shield ($< 28\,\text{cm}$ passable; $\ge 28\,\text{cm}$ triggers automated dry V4/V5 elevated inner-sector rerouting).
  * `services/weather_client.py`:
    * Real-time zero-API-key weather integration via Open-Meteo API (`lat=30.7333, lon=76.7794`).
    * Hourly precipitation, rainfall rates, and 24-hour forecast curve for Chandigarh.
    * Built with Python's standard `urllib.request` with robust deterministic fallback simulation on rate limits or network timeout.
  * `main.py` (v2.5.0):
    * Unified API entrypoint with live endpoints:
      * `GET /api/live-weather`: Real-time Open-Meteo precipitation data & 24h forecast for Chandigarh.
      * `GET /api/map-data`: Hyperlocal micro-catchment rain (with optional `use_live_weather`), Sukhna cusecs, SAR flood polygons, active dispatches with offline PWA bundles.
      * `POST /api/simulate-cascade`: Cascade simulation + fleet dispatch optimizer.
      * `POST /api/verify-work`: 50m PostGIS geofence proof-of-work clearance.
      * `POST /webhook/whatsapp`: Twilio webhook supporting night storm SAR fusion and 3-tier citizen trust ledger karma badges.
* **Database & Migrations**: Supabase (PostgreSQL + PostGIS), `supabase/migrations/20261030_choe_sense_v2.sql`.

### 2. Frontend (`frontend/src/`)
* **Framework**: React 18, Vite 5, Tailwind CSS, Framer Motion, Lucide Icons.
* **Map Engine (`ChoeMapLibre.jsx`)**:
  * MapLibre GL JS + OpenFreeMap vector tiles (`openfreemap.org`), centered on Chandigarh (`[76.7794, 30.7333]`).
  * Zero API keys, zero watermarks, zero tile limits.
  * 3 Visual Modes:
    1. `2D Bright Map` (`styles/bright`, pitch $0^\circ$, bearing $0^\circ$, zoom 12.6)
    2. `3D Buildings Mode` (`styles/liberty`, pitch $60^\circ$, bearing $-18^\circ$, zoom 15.0)
    3. `Dark HUD` (`styles/dark`, pitch $45^\circ$, bearing $0^\circ$, zoom 13.2)
  * Renders underground storm trunks and dry elevated V4 detour routes via GeoJSON.
  * **OpenStreetMap Overpass GIS Hospital Emergency Layer**:
    * Dynamically queries Overpass API (`node["amenity"="hospital"](30.68,76.72,30.78,76.83)`) with automatic fallback to verified Chandigarh apex trauma centers (PGIMER, GMCH-32, GMSH-16, Fortis, Command Hospital).
    * Plots interactive hospital emergency badges (`🏥`) with one-click fly-to camera tracking, trauma status, and dry ambulance corridor hydrolock safety (<28cm) verification.
    * Toolbar toggle pill: `🏥 Emergency Hospitals ({count})` with loading states.
  * **Geo-Tagged Flood Telemetry Upload Modal (`TelemetryUploadModal.jsx`)**:
    * Interactive modal matching reference photogrammetry layout: animated water column visualizer with yellow measuring stick gauge (`WATERLINE: {depth} cm`, `DEPTH: {depth} CM (HIGH)`), live WGS84 GPS coordinate acquisition (`Acquire Live GPS`), Tri-City location presets (Khuda Lahora, Zirakpur Chowk, Sec 70 Mohali), and hydraulic benchmark depth toggles (`30cm`, `54cm (Crit)`, `75+cm`).
    * "Transmit & Plot Geo-Tagged Pic" broadcasts report into Kalman 1D filter, injects real-time beacon node into MapLibre GL, and triggers dynamic camera fly-to centering the report location.
* **Design System (Unified Uiverse "Fairweather" 3-Zone Shell)**:
  * **Zone 1 (Obsidian Sidebar, `w-[210px]`, `#0b0c0e`)**: Compact file-tree explorer with direct links to views and ML modules (`vision_gauge.py`, `backflow_engine.py`, `fleet_dispatcher.py`, `choe_sense_v2.sql`).
  * **Zone 2 (Editorial Column, `w-[340px]`)**: Tag pills, 4-petal geometric clover mark, title `Choe Sense 2.0`, lavender pill button (`#e5d4ef`), and live simulation stress-test sliders.
  * **Zone 3 (macOS Showcase Window, `flex-1`)**: Dark window frame (`#15171c`) with traffic light dots, dithered pixel-art sky banner, dot-grid canvas (`#f8f9fa` in light mode, `#080c14` in neon mode), soft cards, and 6-thumbnail bottom carousel strip.
  * **Theme Transition**: Seamless switching between Fairweather Light Mode and Neonistic Cyber Mode via `fw-dot-canvas` / `fw-neon-canvas` with 400ms transitions.

---

## 6 Seed Real-World Chandigarh Nodes

1. **Sector 22/23 ISBT-17 Roundabout** (`SEC22-0882`): Outfall N-Choe, Substation: 66kV Sector-22 (Plinth: 58cm).
2. **Industrial Area Ph-1 Railway Underpass** (`IND1-0419`): Outfall Sukhna Choe, Substation: 11kV Ind-Area (Plinth: 50cm).
3. **PGI / Sector 12 V2 Emergency Gate** (`PGI12-0104`): Outfall N-Choe, Substation: PGI Trauma Critical Feeder (Plinth: 65cm), Hospital Priority 1.0.
4. **Sector 36 N-Choe Arterial Trunk** (`SEC36-0611`): Outfall N-Choe, Substation: 11kV Sector-36 RMU (Plinth: 54cm).
5. **Tribune Chowk Sector 29/31** (`TRIB-0920`): Outfall Sukhna Choe, Substation: 33kV Sector-29 Grid Feeder (Plinth: 52cm).
6. **Zirakpur–Patiala Ki Rao Outfall** (`ZRK-0774`): Outfall Patiala Ki Rao, Substation: 66kV Dhakoli Feeder (Plinth: 55cm).

---

## Key Development & Run Commands

### 1. Run Python FastAPI Backend
```powershell
# From project root:
.\.venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000 --reload
# Health Check:
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/map-data?rain_mm_hr=48&sukhna_cusecs=1200"
```

### 2. Run React Frontend (Vite)
```powershell
# In frontend directory:
cd frontend
npm run dev
# Production Build Verification:
npm run build
```

---

## Active Status & Verifications
* **Vite Build**: Production compilation passing with `0 errors` (built in ~7s).
* **Map Tile Engine**: OpenFreeMap vector tiles verified with zero API key requirement and zero watermarks.
* **Backend API**: All endpoints (`/api/map-data`, `/api/simulate-cascade`, `/api/verify-work`, `/webhook/whatsapp`) operational.
* **Theme System**: Full bidirectional transition between Fairweather Light and Cyber Neon surfaces with adaptive card styling.
