'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'
import TemplateModal from '@/components/modals/TemplateModal'

interface MessageTemplate {
  id: string
  name: string
  content: string
  category?: string
  description?: string
  usageCount: number
  outletId: string
}

interface Outlet {
  id: string
  namaOutlet: string
}

export default function TemplatesPage() {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOutletId, setSelectedOutletId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch outlets
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await fetch('/api/outlets')
        if (response.ok) {
          const data = await response.json()
          setOutlets(data.outlets || [])
          if (data.outlets && data.outlets.length > 0) {
            setSelectedOutletId(data.outlets[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching outlets:', error)
      }
    }

    if (session?.user?.role === 'SUPERADMIN' || session?.user?.role === 'ADMIN') {
      fetchOutlets()
    }
  }, [session])

  // Fetch templates
  useEffect(() => {
    fetchTemplates()
  }, [selectedOutletId, selectedCategory])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedOutletId) {
        params.append('outletId', selectedOutletId)
      }
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      const response = await fetch(`/api/templates?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async (templateData: any) => {
    try {
      const method = editingTemplate ? 'PUT' : 'POST'
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      })

      if (response.ok) {
        alert(editingTemplate ? '✅ Template berhasil diupdate' : '✅ Template berhasil dibuat')
        setEditingTemplate(null)
        await fetchTemplates()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save template')
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Yakin ingin menghapus template ini?')) return

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('✅ Template berhasil dihapus')
        await fetchTemplates()
      } else {
        throw new Error('Failed to delete template')
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleUseTemplate = (template: MessageTemplate) => {
    // Copy to clipboard and notify
    navigator.clipboard.writeText(template.content)
    alert(`✅ Template "${template.name}" disalin ke clipboard!`)
  }

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AuthenticatedLayout>
      <div className="container-fluid mt-4">
        <div className="row mb-4">
          <div className="col-md-8">
            <h2>📋 Template Pesan WhatsApp</h2>
            <p className="text-muted">Kelola dan gunakan template pesan untuk setiap outlet</p>
          </div>
          <div className="col-md-4 text-end">
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingTemplate(null)
                setShowModal(true)
              }}
            >
              ➕ Template Baru
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="row mb-3 g-2">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="🔍 Cari template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <select
              className="form-select"
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
            >
              <option value="">Semua Outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.namaOutlet}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="alert alert-info text-center">
            <strong>📭 Belum ada template</strong>
            <p>Buat template baru untuk memulai.</p>
          </div>
        ) : (
          <div className="row g-3">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title">{template.name}</h5>
                    {template.category && (
                      <span className="badge bg-secondary mb-2">{template.category}</span>
                    )}
                    {template.description && (
                      <p className="card-text text-muted small mb-2">{template.description}</p>
                    )}
                    <div className="bg-light p-2 rounded mb-3" style={{ maxHeight: '100px', overflow: 'auto' }}>
                      <p className="text-dark small mb-0">{template.content}</p>
                    </div>
                    <small className="text-muted d-block mb-2">
                      ✉️ Digunakan {template.usageCount} kali
                    </small>
                  </div>
                  <div className="card-footer bg-white border-top">
                    <div className="btn-group w-100" role="group">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleUseTemplate(template)}
                        title="Salin ke clipboard"
                      >
                        📋 Gunakan
                      </button>
                      <button
                        className="btn btn-sm btn-outline-warning"
                        onClick={() => {
                          setEditingTemplate(template)
                          setShowModal(true)
                        }}
                        title="Edit template"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteTemplate(template.id)}
                        title="Hapus template"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Modal */}
      <TemplateModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingTemplate(null)
        }}
        onSave={handleSaveTemplate}
        outletId={selectedOutletId}
        initialTemplate={editingTemplate || undefined}
        mode={editingTemplate ? 'edit' : 'create'}
      />
    </AuthenticatedLayout>
  )
}
