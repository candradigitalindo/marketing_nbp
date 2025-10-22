'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { User, Outlet } from '@prisma/client'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'
import UserModal from '@/components/modals/UserModal'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal'

type UserWithOutlet = User & {
  outlet?: {
    id: string
    namaOutlet: string
  } | null
}

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserWithOutlet[]>([])
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<UserWithOutlet | undefined>()
  
  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserWithOutlet | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else {
        showToast('error', 'Gagal memuat data pengguna')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      showToast('error', 'Gagal memuat data pengguna')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOutlets = async () => {
    try {
      const response = await fetch('/api/outlets')
      if (response.ok) {
        const data = await response.json()
        setOutlets(data.outlets || [])
      }
    } catch (error) {
      console.error('Error fetching outlets:', error)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'SUPERADMIN') {
      fetchUsers()
      fetchOutlets()
    }
  }, [session])

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const handleCreateUser = () => {
    setModalMode('create')
    setSelectedUser(undefined)
    setIsModalOpen(true)
  }

  const handleEditUser = (user: UserWithOutlet) => {
    setModalMode('edit')
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleDeleteUser = (user: UserWithOutlet) => {
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  const handleSaveUser = async (userData: any) => {
    try {
      const url = modalMode === 'create' 
        ? '/api/users'
        : `/api/users/${selectedUser?.id}`
      
      const method = modalMode === 'create' ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        await fetchUsers()
        showToast('success', 
          modalMode === 'create' 
            ? 'Pengguna berhasil ditambahkan' 
            : 'Pengguna berhasil diperbarui'
        )
      } else {
        const error = await response.json()
        showToast('error', error.error || 'Terjadi kesalahan')
      }
    } catch (error) {
      console.error('Error saving user:', error)
      showToast('error', 'Terjadi kesalahan saat menyimpan')
    }
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchUsers()
        showToast('success', 'Pengguna berhasil dihapus')
        setIsDeleteModalOpen(false)
        setUserToDelete(null)
      } else {
        const error = await response.json()
        showToast('error', error.error || 'Gagal menghapus pengguna')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('error', 'Terjadi kesalahan saat menghapus')
    } finally {
      setDeleteLoading(false)
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-danger-subtle text-danger'
      case 'ADMIN':
        return 'bg-warning-subtle text-warning'
      case 'USER':
        return 'bg-success-subtle text-success'
      default:
        return 'bg-secondary-subtle text-secondary'
    }
  }

  // Check if user is SUPERADMIN
  const isSuperAdmin = session?.user?.role === 'SUPERADMIN'

  if (!isSuperAdmin) {
    return (
      <AuthenticatedLayout>
        <div className="main-content">
          <div className="text-center py-5">
            <i className="fas fa-lock fa-3x text-muted mb-3"></i>
            <h3 className="text-muted">Akses Terbatas</h3>
            <p className="text-muted">Halaman ini hanya dapat diakses oleh SUPERADMIN</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="main-content">
        {/* Page Header */}
        <div className="page-header p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1 text-dark fw-bold">
                <i className="fas fa-users-cog text-primary me-2"></i>
                Kelola Pengguna
              </h1>
              <p className="text-muted mb-0">
                Manajemen pengguna sistem dengan berbagai role dan akses
              </p>
            </div>
            <button 
              className="btn btn-primary btn-lg"
              onClick={handleCreateUser}
            >
              <i className="fas fa-user-plus me-2"></i>
              Tambah Pengguna
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="card-header bg-white border-bottom">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 text-dark fw-bold">
                <i className="fas fa-list text-primary me-2"></i>
                Daftar Pengguna
              </h5>
              <div className="text-muted">
                <small>Total: {users.length} pengguna</small>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">Memuat data pengguna...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>
                        <i className="fas fa-user me-2 text-primary"></i>
                        Nama & No Hp
                      </th>
                      <th>
                        <i className="fas fa-shield-alt me-2 text-primary"></i>
                        Role
                      </th>
                      <th>
                        <i className="fas fa-store me-2 text-warning"></i>
                        Outlet
                      </th>
                      <th>
                        <i className="fas fa-calendar me-2 text-secondary"></i>
                        Bergabung
                      </th>
                      <th>
                        <i className="fas fa-cogs me-2 text-dark"></i>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-5">
                          <div className="text-muted">
                            <i className="fas fa-users fa-3x mb-3 opacity-50"></i>
                            <p className="mb-0">Belum ada data pengguna</p>
                            <small>Klik tombol "Tambah Pengguna" untuk memulai</small>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-circle me-3" style={{ 
                                width: '40px', 
                                height: '40px', 
                                background: 'var(--bs-info)' 
                              }}>
                                <i className="fas fa-user text-white"></i>
                              </div>
                              <div>
                                <strong className="text-dark">{user.name}</strong>
                                <br />
                                <small className="text-muted">
                                  <i className="fab fa-whatsapp me-1"></i>
                                  {user.noHp}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${getRoleBadgeClass(user.role)} px-3 py-2`}>
                              <i className="fas fa-shield-alt me-1"></i>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            {user.outlet ? (
                              <span className="badge bg-warning-subtle text-warning px-3 py-2">
                                <i className="fas fa-store me-1"></i>
                                {user.outlet.namaOutlet}
                              </span>
                            ) : (
                              <span className="text-muted">
                                <i className="fas fa-globe me-1"></i>
                                All Outlets
                              </span>
                            )}
                          </td>
                          <td>
                            <small className="text-muted">
                              <i className="fas fa-calendar me-1"></i>
                              {new Date(user.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </small>
                          </td>
                          <td>
                            <div className="btn-group">
                              <button 
                                className="btn btn-sm btn-outline-primary" 
                                title="Edit Pengguna"
                                onClick={() => handleEditUser(user)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger" 
                                title="Delete Pengguna"
                                onClick={() => handleDeleteUser(user)}
                                disabled={user.id === session?.user?.id}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
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

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
        outlets={outlets}
        mode={modalMode}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setUserToDelete(null)
        }}
        onConfirm={confirmDeleteUser}
        title="Hapus Pengguna"
        message="Apakah Anda yakin ingin menghapus pengguna ini?"
        itemName={userToDelete?.name}
        loading={deleteLoading}
      />
    </AuthenticatedLayout>
  )
}