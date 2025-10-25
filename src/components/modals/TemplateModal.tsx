'use client'

import { useState, useEffect } from 'react'

interface MessageTemplate {
  id?: string
  name: string
  content: string
  category?: string
  description?: string
  variables?: string[]
}

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (template: any) => Promise<void>
  outletId: string
  initialTemplate?: MessageTemplate
  mode: 'create' | 'edit'
}

export default function TemplateModal({
  isOpen,
  onClose,
  onSave,
  outletId,
  initialTemplate,
  mode,
}: TemplateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [template, setTemplate] = useState<MessageTemplate>({
    name: '',
    content: '',
    category: '',
    description: '',
    variables: [],
  })
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialTemplate) {
        setTemplate(initialTemplate)
        setCharCount(initialTemplate.content.length)
      } else {
        setTemplate({
          name: '',
          content: '',
          category: '',
          description: '',
          variables: [],
        })
        setCharCount(0)
      }
      setError('')
    }
  }, [isOpen, mode, initialTemplate])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setTemplate({ ...template, content: newContent })
    setCharCount(newContent.length)
  }

  const handleSave = async () => {
    // Validation
    if (!template.name.trim()) {
      setError('Nama template wajib diisi')
      return
    }

    if (!template.content.trim()) {
      setError('Konten pesan wajib diisi')
      return
    }

    if (template.content.length > 4000) {
      setError('Konten pesan tidak boleh lebih dari 4000 karakter')
      return
    }

    setLoading(true)
    try {
      await onSave({
        ...template,
        outletId,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan template')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {mode === 'edit' ? '✏️ Edit Template' : '➕ Template Baru'}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={loading}
            />
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">
                <strong>Nama Template</strong>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Promo Ramadan, Reminder Appointment"
                value={template.name}
                onChange={(e: any) =>
                  setTemplate({ ...template, name: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                <strong>Kategori</strong>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Promo, Reminder, Notifikasi"
                value={template.category || ''}
                onChange={(e: any) =>
                  setTemplate({ ...template, category: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                <strong>Deskripsi</strong>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Deskripsi singkat tentang template ini"
                value={template.description || ''}
                onChange={(e: any) =>
                  setTemplate({ ...template, description: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                <strong>Konten Pesan</strong>
                <span className="float-end text-muted">
                  {charCount}/4000 karakter
                </span>
              </label>
              <textarea
                className={`form-control ${
                  charCount > 4000
                    ? 'border-danger'
                    : charCount > 3800
                    ? 'border-warning'
                    : ''
                }`}
                rows={6}
                placeholder="Ketik pesan Anda di sini..."
                value={template.content}
                onChange={handleContentChange}
                disabled={loading}
              />
              {charCount > 4000 && (
                <small className="text-danger d-block mt-1">
                  ⚠️ Pesan terlalu panjang! Kurangi {charCount - 4000} karakter
                </small>
              )}
              {charCount > 3800 && charCount <= 4000 && (
                <small className="text-warning d-block mt-1">
                  ⚠️ Mendekati batas maksimal ({4000 - charCount} karakter tersisa)
                </small>
              )}
            </div>

            <div className="alert alert-info small">
              <strong>💡 Tips:</strong>
              <ul className="mb-0 ms-3">
                <li>Gunakan template untuk pesan yang sering diulang</li>
                <li>Berikan nama yang deskriptif untuk kemudahan mencari</li>
                <li>Anda bisa mengedit atau menghapus template kapan saja</li>
              </ul>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={
                loading ||
                !template.name.trim() ||
                !template.content.trim() ||
                charCount > 4000
              }
            >
              {loading ? '⏳ Menyimpan...' : '✅ Simpan Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
