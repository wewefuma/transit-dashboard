import React, { useState, useCallback } from 'react'
import { useMapGL } from 'react-map-gl'
import { useEffect } from 'react'

const StopsMap = ({ stops, routes }) => {
  const mapRef = useRef(null)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  // Select a route by clicking on a stop
  const handleClick = useCallback((stopId: string) => {
    setSelectedRoute(stopId)
  }, [])

  // Show route details when selected
  const routeDetails = selectedRoute ? routes.find(r => r.id === selectedRoute) : null

  return (
    <div className="relative w-full h-[60vh]">
      <div className="absolute inset-0 bg-black/60"></div>
      <mapRef.current={mapRef}>
        {routeDetails && (
          <div className="absolute inset-0 bg-black/80 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-2">{routeDetails.name}</h3>
            <ul className="space-y-1">
              {routeDetails.routes.map(r => (
                <li key={r.id} className="text-gray-300">{r.type} – {r.dailyTripCount} trips/day</li>
              ))}
            </ul>
          </div>
        )}
      </mapRef>
      {selectedRoute && (
        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg">
          <strong>{selectedRoute}</strong>
        </div>
      )}
    </div>
  )
}

export default StopsMap
