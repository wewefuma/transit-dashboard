import React, { useEffect, useRef, useState } from 'react'

// maplibre-gl types
declare const maplibregl: any

interface MaplibreMapProps {
  stops: any[]
  routes: any[]
  onStopClick: (stop: any) => void
  selectedStopId: string | null
}

const typeColors: Record<string, string> = {
  rail: '#E74C3C',
  bus: '#3498DB',
  jeepney: '#F1C40F'
}

const StopsMap: React.FC<MaplibreMapProps> = ({ stops, routes, onStopClick, selectedStopId }) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const initMap = async () => {
      // Dynamically load maplibre-gl to avoid SSR issues
      const maplibregl = (await import('maplibre-gl')).default

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://demotiles.maplibre.org/style.json', // free style
        center: [120.9842, 14.5995], // Manila
        zoom: 12
      })

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

      map.current.on('load', () => {
        setMapLoaded(true)
      })
    }

    initMap()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Add stops as circle layer once map and stops are ready
  useEffect(() => {
    if (!map.current || !mapLoaded || !stops.length) return

    const maplibregl = (window as any).maplibregl
    const mapInstance = map.current

    // Add source if not exists
    if (!mapInstance.getSource('stops')) {
      mapInstance.addSource('stops', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: stops.map((stop: any) => ({
            type: 'Feature',
            id: stop.id,
            geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
            properties: {
              id: stop.id,
              name: stop.name,
              dailyTripCount: stop.dailyTripCount,
              type: stop.type || 'bus',
              routeIds: stop.routeIds
            }
          }))
        }
      })

      // Add circle layer for stops
      mapInstance.addLayer({
        id: 'stops-circle',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'id'], selectedStopId || ''], 8,
            4
          ],
          'circle-color': [
            'match', ['get', 'type'],
            'rail', typeColors.rail,
            'jeepney', typeColors.jeepney,
            typeColors.bus
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Click handler
      mapInstance.on('click', 'stops-circle', (e: any) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties
          onStopClick({
            id: props.id,
            name: props.name,
            dailyTripCount: props.dailyTripCount,
            type: props.type,
            routeIds: props.routeIds,
            lat: e.features[0].geometry.coordinates[1],
            lng: e.features[0].geometry.coordinates[0]
          })
        }
      })

      // Hover cursor
      mapInstance.on('mouseenter', 'stops-circle', () => {
        mapInstance.getCanvas().style.cursor = 'pointer'
      })
      mapInstance.on('mouseleave', 'stops-circle', () => {
        mapInstance.getCanvas().style.cursor = ''
      })
    }
  }, [mapLoaded, stops, selectedStopId])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-2">⏳</div>
            <p>Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default StopsMap