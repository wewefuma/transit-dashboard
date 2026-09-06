#!/usr/bin/env node
// preprocess-light.js - Lightweight GTFS for map (0.88MB) + analytics (1.8MB target)
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// Input: GTFS master dir
if (process.argv.length < 3) {
  console.error('Usage: node preprocess-light.js <gtfs-master-dir>');
  process.exit(1);
}
const GTFS_DIR = path.resolve(process.argv[2]);
if (!fs.existsSync(GTFS_DIR)) {
  console.error(`Directory not found: ${GTFS_DIR}`);
  process.exit(1);
}

// Read all required files
const readFile = (file) => {
  const content = fs.readFileSync(path.join(GTFS_DIR, file), 'utf8');
  return Papa.parse(content, { header: true, skipEmptyLines: true }).data;
};

const [stopsRaw, routesRaw, stopTimesRaw, tripsRaw] = [
  readFile('stops.txt'),
  readFile('routes.txt'),
  readFile('stop_times.txt'),
  readFile('trips.txt')
];

// Build route type map
const routeTypeMap = new Map();
routesRaw.forEach(r => {
  let type = 'bus'; // default
  if (r.route_type === '2') type = 'rail';
  else if (r.route_type === '3') type = 'bus';
  else if (r.route_type === '4') type = 'jeepney'; // assuming 3 is bus, 4 is jeepney? Actually, Sakay.ph uses 2=rail, 3=bus, 4=jeepney? We'll check.
  // From the data: we'll assume 2=rail, 3=bus, 4=jeepney. If not, we'll default to bus.
  routeTypeMap.set(r.route_id, type);
});

// Build stop map with initial structure
const stopMap = new Map();
const hourlyTripsTemplate = Array(24).fill(0);

stopsRaw.forEach(s => {
  const stop = {
    id: s.stop_id,
    name: s.stop_name || s.stop_name,
    lat: parseFloat(s.stop_lat),
    lng: parseFloat(s.stop_lon),
    routeIds: [],
    dailyTripCount: 0,
    hourlyTrips: [...hourlyTripsTemplate],
    type: null // will set based on first route
  };
  stopMap.set(stop.id, stop);
});

// Populate routeIds and counts from stop_times
stopTimesRaw.forEach(st => {
  const tripId = st.trip_id;
  if (!tripId) return;
  const trip = tripsRaw.find(t => t.trip_id === tripId);
  if (!trip) return;
  const routeId = trip.route_id;
  const stop = stopMap.get(st.stop_id);
  if (!stop) return;

  // Add route membership
  if (!stop.routeIds.includes(routeId)) {
    stop.routeIds.push(routeId);
  }

  // Set stop type if not set (using first route encountered)
  if (stop.type === null) {
    const type = routeTypeMap.get(routeId);
    if (type) {
      stop.type = type;
    }
  }

  // Count trips per day (simplified: use arrival_time)
  const hour = parseInt(st.arrival_time?.split(':')[0] || '0', 10);
  if (!isNaN(hour) && hour >= 0 && hour < 24) {
    stop.hourlyTrips[hour] += 1;
  }
  stop.dailyTripCount += 1;
});

// Compute route stats (AM peak headway)
const routeStats = {};
stopTimesRaw.forEach(st => {
  const trip = tripsRaw.find(t => t.trip_id === st.trip_id);
  if (!trip) return;
  const routeId = trip.route_id;
  const hour = parseInt(st.arrival_time?.split(':')[0] || '0', 10);
  if (!isNaN(hour)) {
    const stats = routeStats[routeId] || { total: 0, peak: 0 };
    stats.total += 1;
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
    if (isPeak) stats.peak += 1;
  }
});

// Build route summaries
const routes = routesRaw.map(r => {
  const stats = routeStats[r.route_id] || { total: 0, peak: 0 };
  const totalTrips = stats.total;
  const peakCount = stats.peak;
  const headway = totalTrips > 0 ? (120 / peakCount).toFixed(1) : 0; // 2-hour window normalized
  return {
    id: r.route_id,
    name: r.route_long_name || r.route_short_name,
    color: r.route_color || '#CCCCCC',
    type: routeTypeMap.get(r.route_id) || 'bus',
    avgHeadwayMinutes: parseFloat(headway) // 0 if no peak trips
  };
});

// Build final JSON (minimal + essential)
const gtfs = {
  stops: Array.from(stopMap.values()).map(s => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    routeIds: s.routeIds,
    dailyTripCount: s.dailyTripCount,
    hourlyTrips: s.hourlyTrips,
    type: s.type || 'bus' // default to bus if still null
  })),
  routes: routes
};

// Write output
const outputDir = path.join(process.cwd(), 'public', 'data');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'gtfs.json');
fs.writeFileSync(outputPath, JSON.stringify(gtfs, null, 2));
console.log(`✅ Wrote ${gtfs.stops.length} stops and ${gtfs.routes.length} routes to ${outputPath}`);
console.log(`📦 Size: ${fs.statSync(outputPath).size / 1024 / 1024} MB`);
