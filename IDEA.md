Verdict
Build a browser-based transit analytics dashboard using Sakay.ph GTFS static data. Stack: React + TypeScript, Mapbox GL JS, Recharts, Zustand, PapaParse. Deploy to Vercel.
Scope / WBS
Table
ID	Task	Owner	Dependency	Est.
1.1	Download and audit Sakay.ph GTFS ZIP	You	—	1h
1.2	Pre-process CSVs → normalized JSON (stops, routes, trips, stop_times, calendar)	You	1.1	4h
1.3	Validate referential integrity (orphan stops, missing trip IDs)	You	1.2	2h
2.1	Scaffold React + Vite + TypeScript + Tailwind	You	—	1h
2.2	Integrate Mapbox GL JS with dark theme base map	You	2.1	2h
2.3	Render stops as circle layers; routes as line layers	You	1.3, 2.2	3h
3.1	Build Zustand store for GTFS entities + filter state	You	2.1	2h
3.2	Implement temporal aggregations (trips per stop per hour, headways)	You	1.3, 3.1	4h
4.1	Construct analytics panel: frequency heatmap, route rankings, peak vs. off-peak	You	3.2	4h
4.2	Build filter bar: time-of-day slider, day type toggle, mode multi-select	You	3.1	3h
5.1	Add stop detail popup (name, daily volume, simulated next departures)	You	2.3, 3.2	3h
5.2	Generate auto-insights from aggregated data	You	4.1	2h
6.1	Responsive layout + mobile bottom sheet for stop details	You	5.1	3h
6.2	Deploy to Vercel; configure build output	You	6.1	1h
Critical path: 1.1 → 1.2 → 1.3 → 2.2 → 2.3 → 3.2 → 4.1 → 5.1 → 6.2
Rationale
Metro Manila transit is recognizable, the Sakay.ph feed is actively maintained and open, and the data contains sufficient complexity (trains, buses, jeepneys) to demonstrate ETL, geospatial, and temporal analytics skills without requiring API keys or scraping infrastructure.
Artifact: Build Specification
1. Data Source
Feed: Sakay.ph GTFS static feed
URL: https://github.com/sakayph/gtfs/archive/master.zip
License: Assume open data; verify LICENSE file post-download. Do not redistribute raw feed without checking terms.
2. Pre-Processing Pipeline
Run this once locally. Do not ship raw CSVs to the client.
bash
# Extract ZIP
# Parse with PapaParse (Node script) or Python pandas
# Output: public/data/gtfs.json
Target schema:
TypeScript
interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routeIds: string[];
  dailyTripCount: number;
  hourlyTrips: number[]; // index 0-23
}

interface Route {
  id: string;
  name: string;
  color: string;
  type: 'rail' | 'bus' | 'jeepney';
  stopIds: string[];
  avgHeadwayMinutes: number; // AM peak only
}

interface ScheduleAggregate {
  stopId: string;
  hour: number;
  dayType: 'weekday' | 'saturday' | 'sunday';
  tripCount: number;
}
Validation gates:
Every stop_id in stop_times.txt must exist in stops.txt
Every trip_id in stop_times.txt must exist in trips.txt
Flag routes with zero trips; exclude from render set
3. Frontend Architecture
Table
Concern	Choice
Framework	React 18 + Vite
Language	TypeScript (strict)
Styling	Tailwind CSS
Maps	Mapbox GL JS (react-map-gl wrapper)
Charts	Recharts
State	Zustand
CSV Parsing	PapaParse (build script only)
4. Map Layer Specification
plain
Base: Mapbox Dark v11
  ├── stops-layer (circle)
  │     color: by route.type (rail=#E74C3C, bus=#3498DB, jeepney=#F1C40F)
  │     radius: 4px static, 6px on hover
  │     opacity: 0.8
  ├── routes-layer (line)
  │     color: route.color
  │     width: 2px
  └── selected-stop-highlight (circle)
        radius: 8px
        color: #FFFFFF
        stroke: #000000
Interaction: Click stop → flyTo(14) → open detail panel → filter analytics to that stop.
5. Analytics Panel Specification
Frequency Heatmap
X-axis: Hour (00–23)
Y-axis: Top 20 stops by daily volume
Cell color intensity: tripCount normalized per row
Filter: day type toggle (weekday / saturday / sunday)
Route Rankings
Bar chart: Routes sorted by dailyTripCount descending
Truncated to top 15; remainder grouped as "Other"
Peak vs. Off-Peak
Definition: Peak = 07:00–09:00 and 17:00–20:00
Display: Average headway per route during peak vs. midday (10:00–15:00)
Format: Table with delta column
6. Filter State (Zustand)
TypeScript
interface FilterState {
  dayType: 'weekday' | 'saturday' | 'sunday';
  timeRange: [number, number]; // 0-23
  modes: ('rail' | 'bus' | 'jeepney')[];
  selectedStopId: string | null;
}
All map layers and charts derive from this state. No prop drilling.
7. Insights Engine (Deterministic)
Generate exactly 5 insights on data load:
Busiest stop by dailyTripCount
Route with largest weekday vs. Sunday service gap (% delta)
Mode with shortest average peak headway
Hour with system-wide maximum trip volume
Route with longest continuous service gap (consecutive hours with zero trips on weekdays)
Format: "{Route X} has {Y}% less service on Sundays vs. weekdays."
8. File Structure
plain
src/
  components/
    Map.tsx
    StopDetail.tsx
    FilterBar.tsx
    AnalyticsPanel.tsx
    FrequencyHeatmap.tsx
    RouteRankings.tsx
    PeakOffPeak.tsx
    Insights.tsx
  store/
    useGtfsStore.ts
  types/
    gtfs.ts
  utils/
    aggregate.ts
    insights.ts
public/
  data/
    gtfs.json   # pre-processed, < 2MB target
Safety & Rollback
Table
Risk	Mitigation
GTFS feed copyright	Verify LICENSE in downloaded ZIP before public repo. If unclear, document data provenance in README only.
Mapbox token exposure	Store token in .env.local; inject via Vite import.meta.env. Rotate token if committed.
Large JSON blocking render	Target < 2MB for gtfs.json. If larger, split by entity and lazy-load.
PII in stop names	GTFS stop names are public infrastructure names. No residential PII expected. Audit before deploy.
Irreversible deploy	Vercel preview deployments on every push. Promote to production domain manually.
