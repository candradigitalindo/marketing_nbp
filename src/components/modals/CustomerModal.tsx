'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Customer, Outlet } from '@prisma/client'

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (customerData: any) => void
  customer?: Customer & { outlet?: Outlet }
  outlets: Outlet[]
  mode: 'create' | 'edit'
  user: Session['user'] | null | undefined
}

export default function CustomerModal({
  isOpen,
  onClose,
  onSave,
  customer,
  outlets,
  mode,
  user
}: CustomerModalProps) {
  const [formData, setFormData] = useState({
    nama: '',
    noWa: '',
    outletId: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const isSuperAdmin = user?.role === 'SUPERADMIN'
    if (isOpen) {
      if (mode === 'edit' && customer) {
        setFormData({
          nama: customer.nama || '',
          noWa: customer.noWa || '',
          outletId: customer.outletId || ''
        })
      } else {
        setFormData({
          nama: '',
          noWa: '',
          outletId: isSuperAdmin ? (outlets[0]?.id || '') : (user?.outletId || '')
        })
      }
      setErrors({})
    }
  }, [isOpen, mode, customer, outlets, user])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nama.trim()) {
      newErrors.nama = 'Nama wajib diisi'
    }

    if (!formData.noWa.trim()) {
      newErrors.noWa = 'Nomor WhatsApp wajib diisi'
    } else if (!/^\+?[0-9\s-]+$/.test(formData.noWa)) {
      newErrors.noWa = 'Format nomor WhatsApp tidak valid'
    }

    if (!formData.outletId) {
      newErrors.outletId = 'Outlet wajib dipilih'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`fas ${mode === 'create' ? 'fa-plus' : 'fa-edit'} me-2`}></i>
              {mode === 'create' ? 'Tambah Customer Baru' : 'Edit Customer'}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="nama" className="form-label">
                    Nama Lengkap <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.nama ? 'is-invalid' : ''}`}
                    id="nama"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    placeholder="Masukkan nama lengkap"
                    disabled={loading}
                  />
                  {errors.nama && (
                    <div className="invalid-feedback">{errors.nama}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="noWa" className="form-label">
                    Nomor WhatsApp <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.noWa ? 'is-invalid' : ''}`}
                    id="noWa"
                    name="noWa"
                    value={formData.noWa}
                    onChange={handleChange}
                    placeholder="+62 812 3456 7890"
                    disabled={loading}
                  />
                  {errors.noWa && (
                    <div className="invalid-feedback">{errors.noWa}</div>
                  )}
                </div>

                {(user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') && (
                  <div className="col-md-6 mb-3">
                    <label htmlFor="outletId" className="form-label">
                      Outlet <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.outletId ? 'is-invalid' : ''}`}
                      id="outletId"
                      name="outletId"
                      value={formData.outletId}
                      onChange={handleChange}
                      disabled={loading || user?.role !== 'SUPERADMIN'}
                    >
                      <option value="">Pilih Outlet</option>
                      {outlets.map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.namaOutlet}
                        </option>
                      ))}
                    </select>
                    {errors.outletId && (
                      <div className="invalid-feedback">{errors.outletId}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                <i className="fas fa-times me-2"></i>
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    {mode === 'create' ? 'Tambah Customer' : 'Simpan Perubahan'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}