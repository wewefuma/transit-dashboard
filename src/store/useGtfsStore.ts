import { create } from 'zustand'

interface FilterState {
  dayType: 'weekday' | 'saturday' | 'sunday'
  timeRange: [number, number]
  modes: ('rail' | 'bus' | 'jeepney')[]
  selectedStopId: string | null
}

interface GtfsStore {
  stops: any[]
  routes: any[]
  selectedStop: any
  filterState: FilterState
  analyticsData: any
  setStops: (s: any[]) => void
  setRoutes: (r: any[]) => void
  setSelectedStop: (s: any) => void
  setFilterState: (f: Partial<FilterState>) => void
  setAnalyticsData: (d: any) => void
}

export const useGtfsStore = create<GtfsStore>((set) => ({
  stops: [],
  routes: [],
  selectedStop: null,
  filterState: {
    dayType: 'weekday',
    timeRange: [7, 9],
    modes: ['rail', 'bus', 'jeepney'],
    selectedStopId: null
  },
  analyticsData: null,
  setStops: (stops) => set({ stops }),
  setRoutes: (routes) => set({ routes }),
  setSelectedStop: (selectedStop) => set({ selectedStop }),
  setFilterState: (partial) => set((state) => ({ filterState: { ...state.filterState, ...partial } })),
  setAnalyticsData: (analyticsData) => set({ analyticsData })
}))