import React, { useState, useEffect, useMemo } from 'react'
import { Map, Navigation, Popup } from 'react-map-gl'
import 'react-map-gl/dist/styles.css'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStore } from './store/useGtfsStore'

// Types
interface Stop {
  id: string
  name: string
  lat: number
  lng: number
  routeIds: string[]
  dailyTripCount: number
  hourlyTrips: number[]
  type: string
}

interface Route {
  id: string
  name: string
  color: string
  type: string
  avgHeadwayMinutes: number
}

// Load GTFS data
const gtfsData = require('/public/data/gtfs.json')

const typeColors: Record<string, string> = {
  rail: '#E74C3C',
  bus: '#3498DB',
  jeepney: '#F1C40F'
}

const App: React.FC = () => {
  const {
    stops,
    routes,
    selectedStop,
    setSelectedStop,
    filterState,
    setFilterState,
    analyticsData
  } = useStore()

  const [viewState, setViewState] = useState({
    latitude: 14.5995,
    longitude: 120.9842,
    zoom: 12
  })

  const filteredStops = useMemo(() => {
    if (!stops) return []
    return stops.filter(s => {
      const hour = new Date().getHours()
      return hour >= filterState.timeRange[0] && hour <= filterState.timeRange[1]
    })
  }, [stops, filterState])

  const stopCounts = useMemo(() => {
    if (!stops) return []
    return routes.map(route => ({
      route: route.name,
      trips: stops.filter(s => s.routeIds.includes(route.id)).length,
      type: route.type
    }))
  }, [stops, routes])

  const insights = useMemo(() => {
    if (!stops || !routes) return []
    const busiestStop = stops.reduce((max, s) => s.dailyTripCount > max.dailyTripCount ? s : max, stops[0])
    const railRoutes = routes.filter(r => r.type === 'rail')
    const busRoutes = routes.filter(r => r.type === 'bus')
    const avgRail = railRoutes.reduce((sum, r) => sum + r.avgHeadwayMinutes, 0) / railRoutes.length
    const avgBus = busRoutes.reduce((sum, r) => sum + r.avgHeadwayMinutes, 0) / busRoutes.length
    return [
      `Busiest stop: ${busiestStop.name} (${busiestStop.dailyTripCount} trips/day)`,
      `Average rail headway: ${avgRail.toFixed(1)} min`,
      `Average bus headway: ${avgBus.toFixed(1)} min`,
      `${routes.length} routes total`,
      `Peak hours: 7-9 AM, 5-8 PM`
    ]
  }, [stops, routes])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-lg">
        <h1 className="text-2xl font-bold">Transit Dashboard</h1>
        <p className="text-sm text-gray-400">Sakay.ph GTFS Analytics</p>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar">
        <select
          value={filterState.dayType}
          onChange={(e) => setFilterState({ ...filterState, dayType: e.target.value as any })}
        >
          <option value="weekday">Weekday</option>
          <option value="saturday">Saturday</option>
          <option value="sunday">Sunday</option>
        </select>
        <select
          value={filterState.timeRange[0]}
          onChange={(e) => setFilterState({ ...filterState, timeRange: [parseInt(e.target.value), filterState.timeRange[1]] })}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{i}:00</option>
          ))}
        </select>
        <select
          multiple
          value={filterState.modes}
          onChange={(e) => setFilterState({ ...filterState, modes: Array.from(e.target.selectedOptions, o => o.value as any) })}
        >
          <option value="rail">Rail</option>
          <option value="bus">Bus</option>
          <option value="jeepney">Jeepney</option>
        </select>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="map-container">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapboxAccessToken="pk.eyJ1IjoiYXp1cmUyMDI0IiwiYSI6ImNpeWd5NnR6NjAyZ3MycGx3Y3BteWQxODYifQ.XXXXXXXXX"
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: '100%', height: '100%' }}
          >
            <Navigation />
            {filteredStops.map(stop => (
              <Popup
                key={stop.id}
                latitude={stop.lat}
                longitude={stop.lng}
                onClose={() => setSelectedStop(null)}
              >
                <div className="p-2">
                  <h4 className="font-bold">{stop.name}</h4>
                  <p className="text-sm">{stop.dailyTripCount} trips/day</p>
                  <p className="text-xs text-gray-400">{stop.routeIds.length} routes</p>
                </div>
              </Popup>
            ))}
          </Map>
        </div>

        {/* Analytics Panel */}
        <div className="w-96 bg-gray-800 p-4 overflow-y-auto">
          <div className="card mb-4">
            <h3>🚦 Insights</h3>
            {insights.map((insight, i) => (
              <div key={i} className="insight-item">
                <p>{insight}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>📊 Route Rankings</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stopCounts}>
                <XAxis dataKey="route" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="trips">
                  {stopCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={typeColors[entry.type] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App