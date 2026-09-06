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

  useEffect(() => {
    fetch('/data/gtfs.json')
      .then(res => res.json())
      .then(data => {
        setGtfsData(data)
        useGtfsStore.getState().setStops(data?.stops || [])
        useGtfsStore.getState().setRoutes(data?.routes || [])
      })
      .catch(err => console.error('Failed to load GTFS data:', err))
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
      `Average rail headway: ${avgRail.toFixed(1)} min`,
      `Average bus headway: ${avgBus.toFixed(1)} min`,
      `${routes?.length || 0} routes total`,
      `Peak hours: 7-9 AM, 5-8 PM`
    ]
  }, [stops, routes])

  const handleStopClick = (stop: any) => {
    setSelectedStop(stop)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 shadow-lg border-b border-gray-700">
        <h1 className="text-2xl font-bold">Transit Dashboard</h1>
        <p className="text-sm text-gray-400">Sakay.ph GTFS Analytics · MapLibre (free, open-source)</p>
      </header>

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

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0 relative bg-gray-900">
          <div className="h-[60vh] w-full relative">
            {stops && stops.length > 0 ? (
              <StopsMap
                stops={filteredStops}
                routes={routes || []}
                onStopClick={handleStopClick}
                selectedStopId={selectedStop?.id || null}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900">
                <div className="text-center">
                  <p>Loading GTFS data...</p>
                  <p className="text-sm mt-1">{gtfsData ? `Loaded ${gtfsData.stops?.length || 0} stops` : 'Fetching from /data/gtfs.json'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

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
            <h3 className="text-lg font-semibold mb-3">📊 Route Rankings</h3>
            {routeRankings.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={routeRankings} layout="vertical">
                  <YAxis dataKey="route" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
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
              <h3 className="text-lg font-semibold mb-3">📍 Selected Stop</h3>
              <div className="space-y-2">
                <p><strong>{selectedStop?.name || 'Unknown'}</strong></p>
                <p className="text-sm text-gray-400">{selectedStop?.dailyTripCount || 0} trips/day</p>
                <p className="text-sm text-gray-400">{selectedStop?.routeIds?.length || 0} routes</p>
                <p className="text-sm text-gray-400">Type: {selectedStop?.type || 'unknown'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App