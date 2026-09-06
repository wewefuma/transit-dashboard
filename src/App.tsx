import React, { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import StopsMap from './components/StopsMap'
import { useGtfsStore } from './store/useGtfsStore'

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
    setFilterState
  } = useGtfsStore()

  const [gtfsData, setGtfsData] = useState<any>(null)

  // Load GTFS data on mount
  useEffect(() => {
    fetch('/data/gtfs.json')
      .then(res => res.json())
      .then(data => {
        setGtfsData(data)
        useGtfsStore.getState().setStops(data.stops)
        useGtfsStore.getState().setRoutes(data.routes)
      })
      .catch(err => console.error('Failed to load GTFS data:', err))
  }, [])

  const filteredStops = useMemo(() => {
    if (!stops || !routes) return []
    return stops.filter(s => {
      const hour = new Date().getHours()
      return hour >= filterState.timeRange[0] && hour <= filterState.timeRange[1]
    })
  }, [stops, filterState])

  const routeRankings = useMemo(() => {
    if (!stops || !routes) return []
    return routes
      .map(route => ({
        route: route.name,
        trips: stops.filter(s => s.routeIds.includes(route.id)).length,
        type: route.type
      }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 15)
  }, [stops, routes])

  const insights = useMemo(() => {
    if (!stops || !routes) return []
    const busiestStop = stops.reduce((max, s) => s.dailyTripCount > max.dailyTripCount ? s : max, stops[0])
    const railRoutes = routes.filter(r => r.type === 'rail')
    const busRoutes = routes.filter(r => r.type === 'bus')
    const avgRail = railRoutes.length > 0 
      ? railRoutes.reduce((sum, r) => sum + r.avgHeadwayMinutes, 0) / railRoutes.length 
      : 0
    const avgBus = busRoutes.length > 0
      ? busRoutes.reduce((sum, r) => sum + r.avgHeadwayMinutes, 0) / busRoutes.length
      : 0
    return [
      `Busiest stop: ${busiestStop.name} (${busiestStop.dailyTripCount} trips/day)`,
      `Average rail headway: ${avgRail.toFixed(1)} min`,
      `Average bus headway: ${avgBus.toFixed(1)} min`,
      `${routes.length} routes total`,
      `Peak hours: 7-9 AM, 5-8 PM`
    ]
  }, [stops, routes])

  const handleStopClick = (stop: any) => {
    setSelectedStop(stop)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-lg border-b border-gray-700">
        <h1 className="text-2xl font-bold">Transit Dashboard</h1>
        <p className="text-sm text-gray-400">Sakay.ph GTFS Analytics</p>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar flex flex-wrap gap-4 px-4 py-2">
        <select
          value={filterState.dayType}
          onChange={(e) => setFilterState({ ...filterState, dayType: e.target.value as any })}
          className="bg-gray-800 border-gray-600 text-white rounded px-3 py-2"
        >
          <option value="weekday">Weekday</option>
          <option value="saturday">Saturday</option>
          <option value="sunday">Sunday</option>
        </select>
        <select
          value={filterState.timeRange[0]}
          onChange={(e) => setFilterState({ ...filterState, timeRange: [parseInt(e.target.value), filterState.timeRange[1]] })}
          className="bg-gray-800 border-gray-600 text-white rounded px-3 py-2"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
          ))}
        </select>
        <select
          multiple
          value={filterState.modes}
          onChange={(e) => setFilterState({ ...filterState, modes: Array.from(e.target.selectedOptions, o => o.value as any) })}
          className="bg-gray-800 border-gray-600 text-white rounded px-3 py-2"
        >
          <option value="rail">Rail</option>
          <option value="bus">Bus</option>
          <option value="jeepney">Jeepney</option>
        </select>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 min-w-0">
          <div className="h-[60vh] w-full">
            <StopsMap
              stops={filteredStops}
              routes={routes}
              onStopClick={handleStopClick}
              selectedStopId={selectedStop?.id || null}
            />
          </div>
        </div>

        {/* Analytics Panel */}
        <div className="w-96 bg-gray-800 p-4 overflow-y-auto border-l border-gray-700">
          <div className="card mb-4 bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">🚦 Insights</h3>
            {insights.map((insight, i) => (
              <div key={i} className="insight-item border-l-3 border-blue-500 bg-blue-900/20 p-3 rounded-r mb-2">
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>

          <div className="card bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">📊 Route Rankings</h3>
            {routeRankings.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={routeRankings} layout="vertical">
                  <YAxis 
                    dataKey="route" 
                    type="category" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    width={120}
                  />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    formatter={(value: number) => [value, 'trips']}
                  />
                  <Bar dataKey="trips">
                    {routeRankings.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={typeColors[entry.type] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">No route data available</p>
            )}
          </div>

          {selectedStop && (
            <div className="card mt-4 bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">📍 Stop Details</h3>
              <div className="space-y-2">
                <p><strong>{selectedStop.name}</strong></p>
                <p className="text-sm text-gray-400">{selectedStop.dailyTripCount} trips/day</p>
                <p className="text-sm text-gray-400">{selectedStop.routeIds.length} routes</p>
                <p className="text-sm text-gray-400">Type: {selectedStop.type}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App