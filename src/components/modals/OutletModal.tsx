'use client'

import { useState, useEffect } from 'react'
import { Outlet } from '@prisma/client'

interface OutletModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (outletData: any) => void
  outlet?: Outlet
  mode: 'create' | 'edit'
}

export default function OutletModal({
  isOpen,
  onClose,
  onSave,
  outlet,
  mode
}: OutletModalProps) {
  const [formData, setFormData] = useState({
    namaOutlet: '',
    alamat: '',
    telepon: '',
    whatsappNumber: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && outlet) {
        setFormData({
          namaOutlet: outlet.namaOutlet || '',
          alamat: outlet.alamat || '',
          telepon: outlet.telepon || '',
          whatsappNumber: outlet.whatsappNumber || ''
        })
      } else {
        setFormData({
          namaOutlet: '',
          alamat: '',
          telepon: '',
          whatsappNumber: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, mode, outlet])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.namaOutlet.trim()) {
      newErrors.namaOutlet = 'Nama outlet wajib diisi'
    }

    if (!formData.alamat.trim()) {
      newErrors.alamat = 'Alamat wajib diisi'
    }

    if (!formData.telepon.trim()) {
      newErrors.telepon = 'Nomor telepon wajib diisi'
    } else if (!/^\+?[0-9\s-()]+$/.test(formData.telepon)) {
      newErrors.telepon = 'Format nomor telepon tidak valid'
    }

    if (!formData.whatsappNumber.trim()) {
      newErrors.whatsappNumber = 'Nomor WhatsApp wajib diisi'
    } else if (!/^\+?[0-9\s-()]+$/.test(formData.whatsappNumber)) {
      newErrors.whatsappNumber = 'Format nomor WhatsApp tidak valid'
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
      console.error('Error saving outlet:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
              {mode === 'create' ? 'Tambah Outlet Baru' : 'Edit Outlet'}
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
                <div className="col-md-12 mb-3">
                  <label htmlFor="namaOutlet" className="form-label">
                    Nama Outlet <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.namaOutlet ? 'is-invalid' : ''}`}
                    id="namaOutlet"
                    name="namaOutlet"
                    value={formData.namaOutlet}
                    onChange={handleChange}
                    placeholder="Masukkan nama outlet"
                    disabled={loading}
                  />
                  {errors.namaOutlet && (
                    <div className="invalid-feedback">{errors.namaOutlet}</div>
                  )}
                </div>

                <div className="col-md-12 mb-3">
                  <label htmlFor="alamat" className="form-label">
                    Alamat <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className={`form-control ${errors.alamat ? 'is-invalid' : ''}`}
                    id="alamat"
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleChange}
                    placeholder="Masukkan alamat lengkap outlet"
                    rows={3}
                    disabled={loading}
                  />
                  {errors.alamat && (
                    <div className="invalid-feedback">{errors.alamat}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="telepon" className="form-label">
                    Nomor Telepon <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.telepon ? 'is-invalid' : ''}`}
                    id="telepon"
                    name="telepon"
                    value={formData.telepon}
                    onChange={handleChange}
                    placeholder="+62 21 1234567"
                    disabled={loading}
                  />
                  {errors.telepon && (
                    <div className="invalid-feedback">{errors.telepon}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="whatsappNumber" className="form-label">
                    Nomor WhatsApp <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.whatsappNumber ? 'is-invalid' : ''}`}
                    id="whatsappNumber"
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    placeholder="+62 812 3456 7890"
                    disabled={loading}
                  />
                  {errors.whatsappNumber && (
                    <div className="invalid-feedback">{errors.whatsappNumber}</div>
                  )}
                </div>
              </div>

              <div className="alert alert-info border-0 bg-info bg-opacity-10 mt-3">
                <i className="fas fa-info-circle me-2"></i>
                <small>
                  Pastikan nomor WhatsApp aktif dan dapat menerima pesan untuk fitur blast marketing.
                </small>
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
                    {mode === 'create' ? 'Tambah Outlet' : 'Simpan Perubahan'}
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