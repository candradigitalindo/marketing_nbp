'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Outlet } from '@prisma/client'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'
import OutletModal from '@/components/modals/OutletModal'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal'
import ConnectionModal from '@/components/modals/ConnectionModal'

type OutletWithCounts = Outlet & {
  _count?: {
    users: number
    customers: number
  }
}
type OutletWithStatus = OutletWithCounts & { connectionStatus?: string }

export default function OutletsPage() {
  const { data: session } = useSession()
  const [outlets, setOutlets] = useState<OutletWithCounts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | undefined>()
  
  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [outletToDelete, setOutletToDelete] = useState<Outlet | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)

  // Connection Modal
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false)
  const [selectedOutletForConnection, setSelectedOutletForConnection] = useState<Outlet | null>(null)

  const fetchOutlets = async () => {
    try {
      const response = await fetch('/api/outlets')
      if (response.ok) {
        const data = await response.json()
        setOutlets(data.outlets || [])
      } else {
        showToast('error', 'Gagal memuat data outlets')
      }
    } catch (error) {
      console.error('Error fetching outlets:', error)
      showToast('error', 'Gagal memuat data outlets')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOutlets()
    
    // Setup polling to refresh outlets every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchOutlets()
    }, 5000)
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const handleCreateOutlet = () => {
    setModalMode('create')
    setSelectedOutlet(undefined)
    setIsModalOpen(true)
  }

  const handleEditOutlet = (outlet: Outlet) => {
    setModalMode('edit')
    setSelectedOutlet(outlet)
    setIsModalOpen(true)
  }

  const handleDeleteOutlet = (outlet: Outlet) => {
    setOutletToDelete(outlet)
    setIsDeleteModalOpen(true)
  }

  const handleManageConnection = (outlet: Outlet) => {
    setSelectedOutletForConnection(outlet)
    setIsConnectionModalOpen(true)
  }

  const handleSaveOutlet = async (outletData: any) => {
    try {
      const url = modalMode === 'create' 
        ? '/api/outlets'
        : `/api/outlets/${selectedOutlet?.id}`
      
      const method = modalMode === 'create' ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outletData),
      })

      if (response.ok) {
        await fetchOutlets()
        showToast('success', 
          modalMode === 'create' 
            ? 'Outlet berhasil ditambahkan' 
            : 'Outlet berhasil diperbarui'
        )
      } else {
        const error = await response.json()
        showToast('error', error.error || 'Terjadi kesalahan')
      }
    } catch (error) {
      console.error('Error saving outlet:', error)
      showToast('error', 'Terjadi kesalahan saat menyimpan')
    }
  }

  const handleRefreshStatus = async (outlet: Outlet) => {
    try {
      showToast('info', 'Menyinkronkan status WhatsApp...')
      
      const response = await fetch('/api/outlets/sync-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outletId: outlet.id }),
      })

      if (response.ok) {
        const data = await response.json()
        await fetchOutlets()
        
        // Use the descriptive message from API instead of just the status
        const toastType = data.status === 'CONNECTED' ? 'success' : 
                         data.status === 'CONNECTING' ? 'info' : 
                         'error'
        showToast(toastType, data.message || `Status: ${data.status}`)
      } else {
        const error = await response.json()
        showToast('error', error.error || 'Gagal menyinkronkan status')
      }
    } catch (error) {
      console.error('Error refreshing status:', error)
      showToast('error', 'Terjadi kesalahan saat menyinkronkan status')
    }
  }

  const confirmDeleteOutlet = async () => {
    if (!outletToDelete) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/outlets/${outletToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchOutlets()
        showToast('success', 'Outlet berhasil dihapus')
        setIsDeleteModalOpen(false)
        setOutletToDelete(null)
      } else {
        const error = await response.json()
        showToast('error', error.error || 'Gagal menghapus outlet')
      }
    } catch (error) {
      console.error('Error deleting outlet:', error)
      showToast('error', 'Terjadi kesalahan saat menghapus')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Check if user is SUPERADMIN
  const userRole = session?.user?.role;

  return (
    <AuthenticatedLayout>
      <div className="main-content">
        {/* Page Header */}
        <div className="page-header p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1 text-dark fw-bold">
                <i className="fas fa-store text-primary me-2"></i>
                Kelola Outlets
              </h1>
              <p className="text-muted mb-0">
                Manajemen lokasi outlet dan nomor WhatsApp untuk marketing
              </p>
            </div>
            {userRole === 'SUPERADMIN' && (
              <button 
                className="btn btn-primary btn-lg"
                onClick={handleCreateOutlet}
              >
                <i className="fas fa-plus me-2"></i>
                Tambah Outlet
              </button>
            )}
          </div>
        </div>

        {/* Outlets Table */}
        <div className="card">
          <div className="card-header bg-white border-bottom">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 text-dark fw-bold">
                <i className="fas fa-list text-primary me-2"></i>
                Daftar Outlets
              </h5>
              <div className="d-flex gap-2">
                <div className="input-group" style={{ width: '300px' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Cari outlet..."
                  />
                  <button className="btn btn-outline-secondary">
                    <i className="fas fa-search"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Memuat data outlets...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>
                        <i className="fas fa-store me-2 text-primary"></i>
                        Nama Outlet
                      </th>
                      <th>
                        <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                        Alamat
                      </th>
                      <th>
                        <i className="fab fa-whatsapp me-2 text-success"></i>
                        WhatsApp
                      </th>
                      <th>
                        <i className="fas fa-users me-2 text-info"></i>
                        Users
                      </th>
                      <th>
                        <i className="fas fa-address-book me-2 text-secondary"></i>
                        Customers
                      </th>
                      <th>
                        <i className="fas fa-signal me-2 text-info"></i>
                        Status
                      </th>
                      <th>
                        <i className="fas fa-cogs me-2 text-dark"></i>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outlets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-5">
                          <div className="text-muted">
                            <i className="fas fa-store fa-3x mb-3 opacity-50"></i>
                            <p className="mb-0">Belum ada data outlet</p>
                            <small>Klik tombol "Tambah Outlet" untuk memulai</small>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      outlets.map((outlet: any) => (
                        <tr key={outlet.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-circle me-3" style={{ 
                                width: '40px', 
                                height: '40px', 
                                background: 'var(--bs-primary)' 
                              }}>
                                <i className="fas fa-store text-white"></i>
                              </div>
                              <div>
                                <strong className="text-dark">{outlet.namaOutlet}</strong>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="text-muted small">
                              <i className="fas fa-map-marker-alt me-1"></i>
                              {outlet.alamat}
                            </div>
                          </td>
                          <td>
                            <a 
                              href={`https://wa.me/${outlet.whatsappNumber.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-success text-decoration-none"
                            >
                              <i className="fab fa-whatsapp me-1"></i>
                              {outlet.whatsappNumber}
                            </a>
                          </td>
                          <td>
                            <span className="badge bg-info-subtle text-info px-3 py-2">
                              <i className="fas fa-users me-1"></i>
                              {outlet._count?.users || 0}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-secondary-subtle text-secondary px-3 py-2">
                              <i className="fas fa-address-book me-1"></i>
                              {outlet._count?.customers || 0}
                            </span>
                          </td>
                          <td>
                            {outlet.isWhatsappActive ? (
                              <span className="badge bg-success-subtle text-success px-3 py-2">
                                <i className="fas fa-circle text-success me-2"></i>
                                Online
                              </span>
                            ) : (
                              <span className="badge bg-light text-dark px-3 py-2">
                                <i className="fas fa-circle text-secondary me-2"></i>
                                Offline
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                title="Edit Outlet"
                                onClick={() => handleEditOutlet(outlet)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-info"
                                title="Refresh Status WhatsApp"
                                onClick={() => handleRefreshStatus(outlet)}
                              >
                                <i className="fas fa-sync-alt"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-success"
                                title="Kelola Koneksi WhatsApp"
                                onClick={() => handleManageConnection(outlet)}
                              >
                                <i className="fas fa-qrcode"></i>
                              </button>
                              {userRole === 'SUPERADMIN' && (
                                <button 
                                  className="btn btn-sm btn-outline-danger" 
                                  title="Delete Outlet"
                                  onClick={() => handleDeleteOutlet(outlet)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notifications */}
        {toast && (
          <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1055 }}>
            <div className={`alert alert-${toast.type === 'success' ? 'success' : toast.type === 'error' ? 'danger' : 'info'} alert-dismissible fade show`}>
              <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2`}></i>
              {toast.message}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setToast(null)}
              ></button>
            </div>
          </div>
        )}
      </div>

      {/* Outlet Modal */}
      {(userRole === 'SUPERADMIN' || userRole === 'ADMIN' || userRole === 'USER') && (
        <OutletModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveOutlet}
          outlet={selectedOutlet}
          mode={modalMode}
        />
      )}

      {/* Connection Modal */}
      {(userRole === 'SUPERADMIN' || userRole === 'ADMIN' || userRole === 'USER') && selectedOutletForConnection && (
        <ConnectionModal
          isOpen={isConnectionModalOpen}
          onClose={() => {
            setIsConnectionModalOpen(false)
            // Refresh outlets after connection modal closes to see updated status
            setTimeout(() => {
              fetchOutlets()
            }, 500)
          }}
          outlet={selectedOutletForConnection}
        />
      )}

      {/* Delete Confirmation Modal */}
      {userRole === 'SUPERADMIN' && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setOutletToDelete(null)
          }}
          onConfirm={confirmDeleteOutlet}
          title="Hapus Outlet"
          message="Apakah Anda yakin ingin menghapus outlet ini? Semua user dan customer yang terkait akan terpengaruh."
          itemName={outletToDelete?.namaOutlet}
          loading={deleteLoading}
        />
      )}
    </AuthenticatedLayout>
  )
}