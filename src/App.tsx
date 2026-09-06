import React, { useState, useEffect, useMemo } from 'react'
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
  const [appError, setAppError] = useState<string | null>(null)
  const [appLoading, setAppLoading] = useState(true)

  useEffect(() => {
    fetch('/data/gtfs.json')
      .then(res => res.json())
      .then(data => {
        setGtfsData(data)
        useGtfsStore.getState().setStops(data?.stops || [])
        useGtfsStore.getState().setRoutes(data?.routes || [])
        setAppLoading(false)
      })
      .catch(err => {
        setAppError(err.message)
        setAppLoading(false)
      })
  }, [])

  const filteredStops = useMemo(() => {
    if (!stops || stops.length === 0 || !routes || routes.length === 0) return []
    const hour = new Date().getHours()
    return stops.filter(s => {
      return hour >= filterState.timeRange[0] && hour <= filterState.timeRange[1]
    })
  }, [stops, routes, filterState])

  const routeRankings = useMemo(() => {
    if (!stops || stops.length === 0 || !routes || routes.length === 0) return []
    return routes
      .map(route => ({
        route: route?.name || 'Unknown',
        trips: stops.filter(s => s?.routeIds?.includes(route?.id)).length,
        type: route?.type || 'bus'
      }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 15)
  }, [stops, routes])

  const insights = useMemo(() => {
    if (!stops || stops.length === 0 || !routes || routes.length === 0) return ['Loading...']
    const busiestStop = stops.reduce((max: any, s: any) => {
      const maxCount = max?.dailyTripCount || 0
      const sCount = s?.dailyTripCount || 0
      return sCount > maxCount ? s : max
    }, stops[0] || { name: 'N/A', dailyTripCount: 0 })
    const railRoutes = routes.filter((r: any) => r?.type === 'rail')
    const busRoutes = routes.filter((r: any) => r?.type === 'bus')
    const avgRail = railRoutes.length > 0
      ? railRoutes.reduce((sum: number, r: any) => sum + (r?.avgHeadwayMinutes || 0), 0) / railRoutes.length
      : 0
    const avgBus = busRoutes.length > 0
      ? busRoutes.reduce((sum: number, r: any) => sum + (r?.avgHeadwayMinutes || 0), 0) / busRoutes.length
      : 0
    return [
      `Busiest stop: ${busiestStop?.name || 'N/A'} (${busiestStop?.dailyTripCount || 0} trips/day)`,
      `Rail avg headway: ${avgRail.toFixed(1)} min`,
      `Bus avg headway: ${avgBus.toFixed(1)} min`,
      `${routes?.length || 0} routes`,
      `Peak hours: 7-9 AM, 5-8 PM`
    ]
  }, [stops, routes])

  const handleStopClick = (stop: any) => {
    setSelectedStop(stop)
  }

  // Debug overlay
  const showDebug = true

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {showDebug && (
        <div style={{
          position: 'fixed',
          top: 10,
          left: 10,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.9)',
          color: '#0f0',
          padding: '1rem',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          maxWidth: '400px',
          border: '2px solid #0f0'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>🐞 DEBUG</h4>
          <div>Stops: {stops?.length || 0}</div>
          <div>Routes: {routes?.length || 0}</div>
          <div>Loading: {appLoading ? 'YES' : 'NO'}</div>
          <div>Error: {appError || 'none'}</div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800 p-4 shadow-lg border-b border-gray-700">
        <h1 className="text-2xl font-bold">Transit Dashboard</h1>
        <p className="text-sm text-gray-400">MapLibre (free, no token)</p>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar flex flex-wrap gap-4 px-4 py-2 bg-gray-800/50">
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
      </div>

      {/* Main content with Map and Analytics */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 min-w-0">
          <div className="h-[60vh] w-full bg-gray-800 relative">
            {appLoading ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <p>Loading GTFS data...</p>
              </div>
            ) : (
              <StopsMap
                stops={filteredStops}
                routes={routes || []}
                onStopClick={handleStopClick}
                selectedStopId={selectedStop?.id || null}
              />
            )}
          </div>
        </div>

        {/* Analytics Panel */}
        <div className="w-96 bg-gray-800 p-4 overflow-y-auto border-l border-gray-700">
          <div className="card mb-4 bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">🚦 Insights</h3>
            {insights.map((insight, i) => (
              <div key={i} className="border-l-4 border-blue-500 bg-blue-900/10 p-3 rounded-r mb-2">
                <p className="text-sm text-gray-200">{insight}</p>
              </div>
            ))}
          </div>

          <div className="card bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">📊 Routes</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={routeRankings} layout="vertical">
                <YAxis dataKey="route" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="trips">
                  {routeRankings.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={typeColors[entry.type] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {selectedStop && (
            <div className="card mt-4 bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">📍 Stop</h3>
              <p><strong>{selectedStop?.name || 'Unknown'}</strong></p>
              <p className="text-sm text-gray-400">{selectedStop?.dailyTripCount || 0} trips/day</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App