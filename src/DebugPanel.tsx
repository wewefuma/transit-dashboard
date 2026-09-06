import React from 'react'

interface DebugPanelProps {
  stops: any[]
  routes: any[]
  loading: boolean
  error: string | null
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ stops, routes, loading, error }) => {
  return (
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
      <h4 style={{ margin: '0 0 0.5rem 0' }}>🔧 DEBUG PANEL</h4>
      <div>Stops: {stops?.length || 0}</div>
      <div>Routes: {routes?.length || 0}</div>
      <div>Loading: {loading ? 'YES' : 'NO'}</div>
      <div>Error: {error || 'none'}</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
    </div>
  )
}