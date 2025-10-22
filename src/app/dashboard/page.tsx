'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

interface DashboardStats {
  totalOutlets: number
  totalCustomers: number
  myCustomers: number
  recentBlasts: number
  totalUsers: number
  successRate: number
}

interface RecentActivity {
  id: number
  type: string
  message: string
  timestamp: string
}

interface DashboardData {
  stats: DashboardStats
  recentActivity: RecentActivity[]
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/dashboard')
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        
        const data: DashboardData = await response.json()
        setDashboardData(data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setError('Gagal memuat data dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    if (session) {
      fetchDashboardData()
    }
  }, [session])

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Memuat data dashboard...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (error) {
    return (
      <AuthenticatedLayout>
        <div className="main-content">
          <div className="alert alert-danger" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
            <button 
              className="btn btn-outline-danger btn-sm ms-3"
              onClick={() => window.location.reload()}
            >
              <i className="fas fa-refresh me-1"></i>
              Muat Ulang
            </button>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!dashboardData) {
    return (
      <AuthenticatedLayout>
        <div className="main-content">
          <div className="alert alert-warning" role="alert">
            <i className="fas fa-info-circle me-2"></i>
            Data dashboard tidak tersedia
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  const { stats, recentActivity } = dashboardData

  return (
    <AuthenticatedLayout>
      <div className="main-content">
        {/* Page Header */}
        <div className="page-header p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1 text-dark fw-bold">
                <i className="fas fa-tachometer-alt text-primary me-2"></i>
                Dashboard
              </h1>
              <p className="text-muted mb-0">
                Selamat datang kembali, <strong>{session?.user?.name}</strong>! Berikut ringkasan marketing Anda.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => window.location.reload()}
                title="Refresh data"
              >
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </button>
              <span className="badge bg-primary px-3 py-2">
                <i className="fas fa-user me-1"></i>
                {session?.user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row mb-4">
          {session?.user?.role === 'SUPERADMIN' && (
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="card stat-card h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h2 className="fw-bold mb-1">{stats.totalOutlets}</h2>
                      <p className="mb-0 fw-medium">Total Outlets</p>
                    </div>
                    <div className="text-white-50">
                      <i className="fas fa-store fa-3x"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {session?.user?.role === 'SUPERADMIN' && (
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="card stat-card h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h2 className="fw-bold mb-1">{stats.totalUsers}</h2>
                      <p className="mb-0 fw-medium">Total Users</p>
                    </div>
                    <div className="text-white-50">
                      <i className="fas fa-users-cog fa-3x"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card stat-card h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="fw-bold mb-1">{stats.totalCustomers}</h2>
                    <p className="mb-0 fw-medium">
                      {session?.user?.role === 'USER' ? 'Pelanggan Saya' : 'Total Pelanggan'}
                    </p>
                  </div>
                  <div className="text-white-50">
                    <i className="fas fa-users fa-3x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card stat-card h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="fw-bold mb-1">{stats.recentBlasts}</h2>
                    <p className="mb-0 fw-medium">Blast Terakhir</p>
                  </div>
                  <div className="text-white-50">
                    <i className="fab fa-whatsapp fa-3x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-4">
            <div className="card stat-card h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="fw-bold mb-1">{stats.successRate}%</h2>
                    <p className="mb-0 fw-medium">Tingkat Keberhasilan</p>
                  </div>
                  <div className="text-white-50">
                    <i className="fas fa-chart-line fa-3x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Account Info */}
        <div className="row">
          <div className="col-lg-8 mb-4">
            <div className="card h-100">
              <div className="card-header bg-white border-bottom">
                <h5 className="card-title mb-0 text-dark fw-bold">
                  <i className="fas fa-bolt text-primary me-2"></i>
                  Aksi Cepat
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="d-grid">
                      <a href="/customers" className="btn btn-primary btn-lg py-3">
                        <i className="fas fa-user-plus me-2"></i>
                        <div>
                          <div className="fw-bold">Tambah Pelanggan</div>
                          <small className="opacity-75">Daftarkan pelanggan baru</small>
                        </div>
                      </a>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-grid">
                      <a href="/blast" className="btn btn-success btn-lg py-3">
                        <i className="fab fa-whatsapp me-2"></i>
                        <div>
                          <div className="fw-bold">Kirim Blast WA</div>
                          <small className="opacity-75">Broadcast pesan WhatsApp</small>
                        </div>
                      </a>
                    </div>
                  </div>
                  {session?.user?.role === 'SUPERADMIN' && (
                    <>
                      <div className="col-md-6">
                        <div className="d-grid">
                          <a href="/outlets" className="btn btn-outline-primary btn-lg py-3">
                            <i className="fas fa-store me-2"></i>
                            <div>
                              <div className="fw-bold">Kelola Outlet</div>
                              <small className="opacity-75">Manajemen outlet</small>
                            </div>
                          </a>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-grid">
                          <a href="/customers" className="btn btn-outline-info btn-lg py-3">
                            <i className="fas fa-users me-2"></i>
                            <div>
                              <div className="fw-bold">Lihat Semua Pelanggan</div>
                              <small className="opacity-75">Database pelanggan</small>
                            </div>
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4 mb-4">
            {/* Recent Activity */}
            <div className="card mb-4">
              <div className="card-header bg-white border-bottom">
                <h6 className="card-title mb-0 text-dark fw-bold">
                  <i className="fas fa-clock text-info me-2"></i>
                  Aktivitas Terbaru
                </h6>
              </div>
              <div className="card-body p-0">
                {recentActivity.length > 0 ? (
                  <div className="list-group list-group-flush">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="list-group-item border-0 py-3">
                        <div className="d-flex align-items-start">
                          <div className="flex-shrink-0 me-3">
                            <div className="avatar-circle" style={{ 
                              width: '32px', 
                              height: '32px', 
                              background: activity.type === 'blast_sent' ? 'var(--bs-success)' : activity.type === 'customer_added' ? 'var(--bs-primary)' : 'var(--bs-warning)' 
                            }}>
                              <i className={`fas ${
                                activity.type === 'blast_sent' ? 'fa-paper-plane' : 
                                activity.type === 'customer_added' ? 'fa-user-plus' : 
                                'fa-edit'
                              } text-white`} style={{ fontSize: '0.8rem' }}></i>
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-1 small text-dark">{activity.message}</p>
                            <small className="text-muted">
                              <i className="fas fa-clock me-1"></i>
                              {new Date(activity.timestamp).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted">
                    <i className="fas fa-inbox fa-2x mb-2 opacity-50"></i>
                    <p className="mb-0 small">Belum ada aktivitas terbaru</p>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="card h-100">
              <div className="card-header bg-white border-bottom">
                <h6 className="card-title mb-0 text-dark fw-bold">
                  <i className="fas fa-user-circle text-primary me-2"></i>
                  Informasi Akun
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="avatar-circle mx-auto mb-3" style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)' 
                  }}>
                    <i className="fas fa-user text-white" style={{ fontSize: '2rem' }}></i>
                  </div>
                  <h5 className="fw-bold text-dark">{session?.user?.name}</h5>
                  <span className="badge bg-primary px-3 py-2">
                    {session?.user?.role}
                  </span>
                </div>

                {session?.user?.outlet && (
                  <div className="mb-3 p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-store text-primary me-2"></i>
                      <strong>Outlet:</strong>
                    </div>
                    <div className="text-dark fw-medium">
                      {session.user.outlet.namaOutlet}
                    </div>
                    <small className="text-muted">
                      <i className="fas fa-map-marker-alt me-1"></i>
                      {session.user.outlet.alamat}
                    </small>
                  </div>
                )}

                <div className="p-3 bg-light rounded">
                  <div className="d-flex align-items-center mb-2">
                    <i className="fab fa-whatsapp text-success me-2"></i>
                    <strong>WhatsApp:</strong>
                  </div>
                  <div className="text-dark">
                    {session?.user?.outlet?.whatsappNumber || 'Belum diatur'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}