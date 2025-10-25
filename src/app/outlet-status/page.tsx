'use client'

import { useEffect, useState } from 'react'

interface OutletStatus {
  outletId: string
  outlet: {
    name: string
    whatsappNumber: string
    isActive: boolean
  }
  session: {
    status: string
    sessionName: string | null
    connectedAt: string | null
    lastSeen: string | null
    qrCode: string | null
    autoReconnect: boolean
    retryCount: number
  }
  liveStatus: {
    status: string
    qrCode: string | null
    name: string | null
  }
  healthy: boolean
}

interface StatusResponse {
  success: boolean
  count: number
  healthy: number
  statuses: OutletStatus[]
}

export default function OutletConnectionStatus() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/outlets/status')
      
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`)
      }
      
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Status check error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusBadgeClass = (status: string, healthy: boolean) => {
    if (healthy) return 'bg-success'
    if (status === 'CONNECTING') return 'bg-warning'
    if (status === 'DISCONNECTED') return 'bg-danger'
    return 'bg-secondary'
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return '✓ Terhubung'
      case 'CONNECTING':
        return '⟳ Menghubung'
      case 'DISCONNECTED':
        return '✗ Terputus'
      case 'PAUSED':
        return '‖ Dijeda'
      case 'FAILED':
        return '⚠ Gagal'
      case 'TIMEOUT':
        return '⏱ Timeout'
      default:
        return status
    }
  }

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Status Koneksi Outlet WhatsApp</h5>
          <button 
            className="btn btn-sm btn-light"
            onClick={fetchStatus}
            disabled={loading}
          >
            {loading ? '⟳ Memeriksa...' : '🔄 Refresh'}
          </button>
        </div>

        <div className="card-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          {loading && !data && (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Memeriksa status koneksi...</p>
            </div>
          )}

          {data && (
            <>
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="card text-center">
                    <div className="card-body">
                      <h6 className="card-title">Total Outlet</h6>
                      <h3 className="text-primary">{data.count}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card text-center">
                    <div className="card-body">
                      <h6 className="card-title">Terhubung</h6>
                      <h3 className="text-success">{data.healthy}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card text-center">
                    <div className="card-body">
                      <h6 className="card-title">Bermasalah</h6>
                      <h3 className="text-danger">{data.count - data.healthy}</h3>
                    </div>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Outlet</th>
                      <th>No. WhatsApp</th>
                      <th>Status DB</th>
                      <th>Status Live</th>
                      <th>Session Name</th>
                      <th>Retry Count</th>
                      <th>Connected At</th>
                      <th>Last Seen</th>
                      <th>Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.statuses.map((status) => (
                      <tr key={status.outletId}>
                        <td>
                          <strong>{status.outlet.name}</strong>
                        </td>
                        <td>
                          <code>{status.outlet.whatsappNumber}</code>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(status.session.status, status.healthy)}`}>
                            {getStatusText(status.session.status)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(status.liveStatus.status, status.healthy)}`}>
                            {getStatusText(status.liveStatus.status)}
                          </span>
                        </td>
                        <td>
                          <small>{status.session.sessionName || '-'}</small>
                        </td>
                        <td>
                          <code>{status.session.retryCount} / {status.session.autoReconnect ? 'Auto' : 'Manual'}</code>
                        </td>
                        <td>
                          <small>
                            {status.session.connectedAt
                              ? new Date(status.session.connectedAt).toLocaleString('id-ID')
                              : '-'}
                          </small>
                        </td>
                        <td>
                          <small>
                            {status.session.lastSeen
                              ? new Date(status.session.lastSeen).toLocaleString('id-ID')
                              : '-'}
                          </small>
                        </td>
                        <td>
                          <span className={`badge ${status.healthy ? 'bg-success' : 'bg-danger'}`}>
                            {status.healthy ? '✓ OK' : '✗ Not OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-muted small mt-3">
                Last refresh: {lastRefresh?.toLocaleTimeString('id-ID')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
