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
    whatsappNumber: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [checkingNumber, setCheckingNumber] = useState(false)
  const [numberCheckResult, setNumberCheckResult] = useState<{ valid: boolean; exists: boolean; message: string } | null>(null)
  const [lastCheckedNumber, setLastCheckedNumber] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && outlet) {
        setFormData({
          namaOutlet: outlet.namaOutlet || '',
          alamat: outlet.alamat || '',
          whatsappNumber: outlet.whatsappNumber || ''
        })
      } else {
        setFormData({
          namaOutlet: '',
          alamat: '',
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

    // telepon field removed from model

    if (!formData.whatsappNumber.trim()) {
      newErrors.whatsappNumber = 'Nomor WhatsApp wajib diisi'
    } else if (!/^\+?[0-9\s-()]+$/.test(formData.whatsappNumber)) {
      newErrors.whatsappNumber = 'Format nomor WhatsApp tidak valid'
    } else if (numberCheckResult === null) {
      // No check result yet - ask user to verify first
      newErrors.whatsappNumber = 'Silakan klik tombol Check untuk verifikasi nomor'
    } else if (!numberCheckResult.valid && numberCheckResult.exists === false && 
               !numberCheckResult.message?.includes('format valid') &&
               !numberCheckResult.message?.includes('Silakan hubungkan') &&
               !numberCheckResult.message?.includes('coba manual')) {
      // Only block if explicitly not found on WhatsApp
      newErrors.whatsappNumber = numberCheckResult.message || 'Nomor tidak valid'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkWhatsAppNumber = async (phoneNumber: string) => {
    if (!phoneNumber.trim() || !/^\+?[0-9\s-()]+$/.test(phoneNumber)) {
      setNumberCheckResult(null)
      return
    }

    // Skip if we already checked this number
    if (lastCheckedNumber === phoneNumber) {
      return
    }

    setCheckingNumber(true)
    try {
      const response = await fetch('/api/outlets/check-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber: phoneNumber })
      })

      const result = await response.json()
      setNumberCheckResult(result)
      setLastCheckedNumber(phoneNumber)
      
      if (!result.exists) {
        console.log('[OutletModal] WhatsApp number check result:', result.message)
      }
    } catch (error) {
      console.error('[OutletModal] Error checking WhatsApp number:', error)
      setNumberCheckResult({
        valid: false,
        exists: false,
        message: 'Gagal memverifikasi nomor WhatsApp'
      })
    } finally {
      setCheckingNumber(false)
    }
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

    // Reset number check result when user changes WhatsApp number
    if (name === 'whatsappNumber') {
      setNumberCheckResult(null)
      setLastCheckedNumber('')
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

                {/* telepon field removed */}

                <div className="col-md-6 mb-3">
                  <label htmlFor="whatsappNumber" className="form-label">
                    Nomor WhatsApp <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="text"
                      className={`form-control ${errors.whatsappNumber ? 'is-invalid' : ''}`}
                      id="whatsappNumber"
                      name="whatsappNumber"
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      placeholder="08xxxxxxxxx"
                      disabled={loading || checkingNumber}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => checkWhatsAppNumber(formData.whatsappNumber)}
                      disabled={loading || checkingNumber || !formData.whatsappNumber.trim()}
                      title="Verifikasi nomor WhatsApp"
                    >
                      {checkingNumber ? (
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                      ) : (
                        <i className="fas fa-check"></i>
                      )}
                    </button>
                  </div>
                  {errors.whatsappNumber && (
                    <div className="invalid-feedback d-block">{errors.whatsappNumber}</div>
                  )}
                  
                  {/* Show number check result */}
                  {numberCheckResult && (
                    <div className={`mt-2 alert border-0 py-2 px-3 ${
                      numberCheckResult.exists 
                        ? 'alert-success' 
                        : (numberCheckResult.message?.includes('format valid') || 
                           numberCheckResult.message?.includes('Silakan hubungkan') ||
                           numberCheckResult.message?.includes('coba manual'))
                        ? 'alert-info'
                        : 'alert-warning'
                    }`}>
                      <small>
                        <i className={`fas ${
                          numberCheckResult.exists 
                            ? 'fa-check-circle' 
                            : (numberCheckResult.message?.includes('format valid') || 
                               numberCheckResult.message?.includes('Silakan hubungkan'))
                            ? 'fa-info-circle'
                            : 'fa-exclamation-triangle'
                        } me-2`}></i>
                        {numberCheckResult.message}
                      </small>
                      
                      {/* Show guidance when no WhatsApp session is connected */}
                      {numberCheckResult.message?.includes('Silakan hubungkan') && (
                        <div className="mt-2 pt-2 border-top border-info border-opacity-50">
                          <small className="d-block mb-2">
                            <strong>💡 Solusi:</strong> Silakan hubungkan akun WhatsApp Anda terlebih dahulu di halaman Outlets sebelum melakukan verifikasi nomor.
                          </small>
                          <a href="/outlets" className="btn btn-sm btn-outline-info">
                            <i className="fas fa-arrow-right me-1"></i>
                            Ke Halaman Outlets
                          </a>
                        </div>
                      )}
                    </div>
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