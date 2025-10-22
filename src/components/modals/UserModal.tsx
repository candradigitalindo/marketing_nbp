import { useState, useEffect } from 'react'
import { User, Outlet } from '@prisma/client'

type UserWithOutlet = User & {
  outlet?: {
    id: string
    namaOutlet: string
  } | null
}

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: any) => void
  user?: UserWithOutlet
  outlets: Outlet[]
  mode: 'create' | 'edit'
}

export default function UserModal({ isOpen, onClose, onSave, user, outlets, mode }: UserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    noHp: '',
    email: '',
    password: '',
    role: 'USER',
    outletId: '',
  })

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        noHp: user.noHp || '',
        email: user.email || '',
        password: '', // Password should not be pre-filled
        role: user.role || 'USER',
        outletId: user.outletId || '',
      })
    } else {
      // Reset form for create mode or when modal closes
      setFormData({
        name: '',
        noHp: '',
        email: '',
        password: '',
        role: 'USER',
        outletId: '',
      })
    }
  }, [isOpen, user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSave = { ...formData }
    if (mode === 'edit' && !dataToSave.password) {
      delete (dataToSave as any).password // Don't send empty password on edit
    }
    onSave(dataToSave)
    onClose()
  }

  if (!isOpen) return null

  const title = mode === 'create' ? 'Tambah Pengguna Baru' : 'Edit Pengguna'

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="name" className="form-label">Nama Pengguna</label>
                <input type="text" className="form-control" id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label htmlFor="noHp" className="form-label">Nomor Handphone (untuk login)</label>
                <input type="text" className="form-control" id="noHp" name="noHp" value={formData.noHp} onChange={handleChange} required placeholder="e.g., 081234567890" />
              </div>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input type="email" className="form-control" id="email" name="email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input type="password" className="form-control" id="password" name="password" value={formData.password} onChange={handleChange} required={mode === 'create'} placeholder={mode === 'edit' ? 'Kosongkan jika tidak ingin mengubah' : ''} />
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="role" className="form-label">Role</label>
                  <select className="form-select" id="role" name="role" value={formData.role} onChange={handleChange}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="outletId" className="form-label">Outlet</label>
                  <select className="form-select" id="outletId" name="outletId" value={formData.outletId} onChange={handleChange} disabled={formData.role === 'SUPERADMIN'}>
                    <option value="">{formData.role === 'SUPERADMIN' ? 'Semua Outlet' : 'Pilih Outlet'}</option>
                    {outlets.map(outlet => (
                      <option key={outlet.id} value={outlet.id}>{outlet.namaOutlet}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
              <button type="submit" className="btn btn-primary">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}