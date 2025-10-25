'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'

interface Outlet {
  id: string
  namaOutlet: string
  whatsappNumber: string
  status?: 'connected' | 'disconnected' | 'connecting'
}

interface MessageTemplate {
  id: string
  name: string
  content: string
  category?: string
}

interface AttachedFile {
  file: File
  preview?: string
  type: 'image' | 'document'
}

export default function BlastPage() {
  const { data: session } = useSession()
  const [message, setMessage] = useState('')
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [blastResult, setBlastResult] = useState<any>(null)
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [outletsLoading, setOutletsLoading] = useState(true)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  
  // New states for WhatsApp-like features
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [sendMode, setSendMode] = useState<'separate' | 'caption'>('separate') // New: send mode
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch outlets on mount
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const response = await fetch('/api/outlets')
        if (response.ok) {
          const data = await response.json()
          const outletsData = data.outlets || []
          
          // Fetch connection status for each outlet
          const outletsWithStatus = await Promise.all(
            outletsData.map(async (outlet: Outlet) => {
              try {
                const statusResponse = await fetch(`/api/blast/qr/${outlet.whatsappNumber}`)
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json()
                  return {
                    ...outlet,
                    status: statusData.status || 'disconnected'
                  }
                }
              } catch (error) {
                console.error(`Error fetching status for ${outlet.namaOutlet}:`, error)
              }
              return {
                ...outlet,
                status: 'disconnected' as const
              }
            })
          )
          
          setOutlets(outletsWithStatus)
        }
      } catch (error) {
        console.error('Error fetching outlets:', error)
      } finally {
        setOutletsLoading(false)
      }
    }

    if (session?.user?.role === 'SUPERADMIN' || session?.user?.role === 'ADMIN') {
      fetchOutlets()
    } else {
      setOutletsLoading(false)
    }
  }, [session])

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      setTemplatesLoading(true)
      try {
        const response = await fetch('/api/templates')
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates || [])
        }
      } catch (error) {
        console.error('Error fetching templates:', error)
      } finally {
        setTemplatesLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  // Emoji handler
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newMessage = message.substring(0, start) + emojiData.emoji + message.substring(end)
      setMessage(newMessage)
      
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length)
      }, 0)
    }
  }

  // File handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const files = event.target.files
    if (!files) return

    const newFiles: AttachedFile[] = []
    
    Array.from(files).forEach(file => {
      // Validate file size (max 16MB for WhatsApp)
      if (file.size > 16 * 1024 * 1024) {
        alert(`File ${file.name} terlalu besar. Maksimal 16MB`)
        return
      }

      const attachedFile: AttachedFile = {
        file,
        type
      }

      // Create preview for images
      if (type === 'image' && file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          attachedFile.preview = reader.result as string
          setAttachedFiles(prev => [...prev, attachedFile])
        }
        reader.readAsDataURL(file)
      } else {
        newFiles.push(attachedFile)
      }
    })

    if (newFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...newFiles])
    }

    // Reset input
    event.target.value = ''
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendBlast = async () => {
    if (!message.trim() && attachedFiles.length === 0) {
      alert('Silakan masukkan pesan atau lampirkan file terlebih dahulu')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('message', message)
      formData.append('sendMode', sendMode) // Add send mode
      
      if (selectedOutlets.length > 0) {
        formData.append('outletIds', JSON.stringify(selectedOutlets))
      }

      // Append files
      attachedFiles.forEach((attachedFile, index) => {
        formData.append(`files`, attachedFile.file)
      })

      const response = await fetch('/api/blast', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setBlastResult(result)
        // Clear form on success
        setMessage('')
        setAttachedFiles([])
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error sending blast:', error)
      alert('Gagal mengirim blast')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreview = () => {
    if (!message.trim()) {
      alert('Silakan masukkan pesan terlebih dahulu')
      return
    }
    
    const previewText = `
📱 PREVIEW BLAST
━━━━━━━━━━━━━━━━━━━━━
Target: ${selectedOutlets.length === 0 ? 'Semua Outlets' : `${selectedOutlets.length} Outlet Terpilih`}

Pesan:
${message}

━━━━━━━━━━━━━━━━━━━━━
Karakter: ${message.length}/4000
    `.trim()
    
    alert(previewText)
  }

  const handleSaveDraft = () => {
    if (!message.trim()) {
      alert('Tidak ada pesan untuk disimpan')
      return
    }

    // Save to localStorage as draft
    const draft = {
      message,
      selectedOutlets,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem('blastDraft', JSON.stringify(draft))
    alert(`✅ Draft tersimpan! (${message.length} karakter)`)
  }

  return (
    <AuthenticatedLayout>
      <div className="main-content">
        {/* Page Header */}
        <div className="page-header p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1 text-dark fw-bold">
                <i className="fab fa-whatsapp text-success me-2"></i>
                WhatsApp Blast
              </h1>
              <p className="text-muted mb-0">
                Kirim pesan WhatsApp massal ke pelanggan dengan mudah dan efektif
              </p>
            </div>
            <div>
              <span className="badge bg-success-subtle text-success px-3 py-2">
                <i className="fas fa-broadcast-tower me-1"></i>
                Broadcast Ready
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="row">
          <div className="col-lg-8 mb-4">
            {/* Blast Results - MOVED TO TOP */}
            {blastResult && (
              <div className="card mb-4">
                <div className="card-header bg-white border-bottom">
                  <h5 className="card-title mb-0 text-dark fw-bold">
                    <i className="fas fa-chart-bar text-primary me-2"></i>
                    Hasil Blast
                  </h5>
                </div>
                <div className="card-body p-4">
                  <div className="row text-center mb-4">
                    <div className="col-6 col-md-3 mb-3">
                      <div className="p-3 bg-primary-subtle rounded">
                        <div className="text-primary h3 fw-bold">{blastResult.totalTargets}</div>
                        <small className="text-muted fw-medium">Total Target</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3 mb-3">
                      <div className="p-3 bg-success-subtle rounded">
                        <div className="text-success h3 fw-bold">{blastResult.sentCount}</div>
                        <small className="text-muted fw-medium">Terkirim</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3 mb-3">
                      <div className="p-3 bg-danger-subtle rounded">
                        <div className="text-danger h3 fw-bold">{blastResult.failedCount}</div>
                        <small className="text-muted fw-medium">Gagal</small>
                      </div>
                    </div>
                    <div className="col-6 col-md-3 mb-3">
                      <div className="p-3 bg-info-subtle rounded">
                        <div className="text-info h3 fw-bold">
                          {blastResult.totalTargets > 0 
                            ? Math.round((blastResult.sentCount / blastResult.totalTargets) * 100)
                            : 0}%
                        </div>
                        <small className="text-muted fw-medium">Tingkat Keberhasilan</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`alert ${blastResult.success ? 'alert-success' : 'alert-warning'} d-flex align-items-center`}>
                    <i className={`fas ${blastResult.success ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                    {blastResult.message}
                  </div>
                </div>
              </div>
            )}

            {/* Tulis Pesan Broadcast */}
            <div className="card h-100">
              <div className="card-header bg-white border-bottom">
                <h5 className="card-title mb-0 text-dark fw-bold">
                  <i className="fas fa-edit text-primary me-2"></i>
                  Tulis Pesan Broadcast
                </h5>
              </div>
              <div className="card-body p-4">
                {/* Template Selector */}
                {templates.length > 0 && (
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-file-alt text-info me-2"></i>
                      Gunakan Template Pesan (Opsional)
                    </label>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const template = templates.find((t) => t.id === e.target.value)
                            if (template) {
                              setMessage(template.content)
                            }
                          }
                          e.target.value = '' // Reset dropdown
                        }}
                      >
                        <option value="">Pilih Template...</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.category ? `[${template.category}] ${template.name}` : template.name}
                          </option>
                        ))}
                      </select>
                      <a
                        href="/templates"
                        className="btn btn-outline-info"
                        title="Kelola template"
                      >
                        <i className="fas fa-cog me-1"></i>
                        Kelola
                      </a>
                    </div>
                    <small className="text-muted d-block mt-2">
                      <i className="fas fa-lightbulb me-1"></i>
                      Pilih template untuk mengisi pesan secara otomatis
                    </small>
                  </div>
                )}

                {/* WhatsApp-like Message Input */}
                <div className="mb-4">
                  <label htmlFor="message" className="form-label fw-semibold">
                    <i className="fab fa-whatsapp text-success me-2"></i>
                    Konten Pesan
                  </label>
                  
                  {/* Attached Files Preview */}
                  {attachedFiles.length > 0 && (
                    <div className="border rounded p-3 mb-3 bg-light">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center">
                          <i className="fas fa-paperclip text-primary me-2"></i>
                          <small className="fw-semibold">Lampiran ({attachedFiles.length})</small>
                        </div>
                        
                        {/* Send Mode Selector - Show if there are any files (images or documents) and message */}
                        {attachedFiles.length > 0 && message.trim() && (
                          <div className="btn-group btn-group-sm" role="group">
                            <input
                              type="radio"
                              className="btn-check"
                              name="sendMode"
                              id="mode-separate"
                              checked={sendMode === 'separate'}
                              onChange={() => setSendMode('separate')}
                            />
                            <label className="btn btn-outline-primary" htmlFor="mode-separate" title="Kirim teks terlebih dahulu, kemudian file">
                              <i className="fas fa-list me-1"></i>
                              Terpisah
                            </label>

                            <input
                              type="radio"
                              className="btn-check"
                              name="sendMode"
                              id="mode-caption"
                              checked={sendMode === 'caption'}
                              onChange={() => setSendMode('caption')}
                            />
                            <label className="btn btn-outline-success" htmlFor="mode-caption" title="Teks menjadi caption file pertama">
                              <i className="fas fa-paperclip me-1"></i>
                              Caption
                            </label>
                          </div>
                        )}
                      </div>
                      
                      {/* Mode Description */}
                      {attachedFiles.length > 0 && message.trim() && (
                        <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: '0.75rem' }}>
                          <i className="fas fa-info-circle me-1"></i>
                          {sendMode === 'separate' ? (
                            <span>
                              <strong>Mode Terpisah:</strong> Pesan teks dikirim terlebih dahulu, kemudian file dikirim terpisah.
                            </span>
                          ) : (
                            <span>
                              <strong>Mode Caption:</strong> Teks menjadi caption file pertama. {attachedFiles.some(f => f.type === 'image') ? 'Gambar' : 'Dokumen'} pertama akan memiliki caption, file selanjutnya tanpa caption.
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="row g-2">
                        {attachedFiles.map((file, index) => (
                          <div key={index} className="col-6 col-md-4">
                            <div className="position-relative border rounded p-2 bg-white">
                              {file.type === 'image' && file.preview ? (
                                <div>
                                  <img 
                                    src={file.preview} 
                                    alt={file.file.name}
                                    className="img-fluid rounded mb-2"
                                    style={{ maxHeight: '120px', objectFit: 'cover', width: '100%' }}
                                  />
                                  <small className="d-block text-truncate">
                                    <i className="fas fa-image text-success me-1"></i>
                                    {file.file.name}
                                  </small>
                                </div>
                              ) : (
                                <div className="text-center py-3">
                                  <i className="fas fa-file-alt fa-2x text-primary mb-2"></i>
                                  <small className="d-block text-truncate">{file.file.name}</small>
                                  <small className="text-muted">
                                    {(file.file.size / 1024).toFixed(1)} KB
                                  </small>
                                </div>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 rounded-circle p-1"
                                style={{ width: '24px', height: '24px', fontSize: '12px' }}
                                onClick={() => removeFile(index)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WhatsApp-style Message Box */}
                  <div className="position-relative" style={{ 
                    background: '#f0f2f5',
                    borderRadius: '12px',
                    padding: '8px'
                  }}>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #d1d7db'
                    }}>
                      <textarea
                        ref={textareaRef}
                        id="message"
                        className="form-control border-0"
                        rows={8}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ketik pesan WhatsApp Anda di sini... 💬"
                        style={{ 
                          minHeight: '200px',
                          resize: 'vertical',
                          fontSize: '15px',
                          lineHeight: '1.5',
                          borderRadius: '8px 8px 0 0'
                        }}
                      />
                      
                      {/* WhatsApp-like Action Bar */}
                      <div className="d-flex align-items-center justify-content-between px-3 py-2 border-top bg-light" style={{ borderRadius: '0 0 8px 8px' }}>
                        <div className="d-flex gap-2">
                          {/* Emoji Button */}
                          <div className="position-relative">
                            <button
                              type="button"
                              className="btn btn-sm btn-light rounded-circle"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              title="Tambah Emoji"
                              style={{ width: '36px', height: '36px' }}
                            >
                              <i className="far fa-smile" style={{ fontSize: '18px', color: '#54656f' }}></i>
                            </button>
                            
                            {/* Emoji Picker */}
                            {showEmojiPicker && (
                              <div className="position-absolute bottom-100 start-0 mb-2" style={{ zIndex: 1000 }}>
                                <div className="position-relative">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light position-absolute top-0 end-0 m-2"
                                    onClick={() => setShowEmojiPicker(false)}
                                    style={{ zIndex: 1001 }}
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                  <EmojiPicker 
                                    onEmojiClick={handleEmojiClick}
                                    width={350}
                                    height={400}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Attach Image */}
                          <button
                            type="button"
                            className="btn btn-sm btn-light rounded-circle"
                            onClick={() => imageInputRef.current?.click()}
                            title="Lampirkan Gambar"
                            style={{ width: '36px', height: '36px' }}
                          >
                            <i className="fas fa-image" style={{ fontSize: '18px', color: '#54656f' }}></i>
                          </button>
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="d-none"
                            onChange={(e) => handleFileSelect(e, 'image')}
                          />

                          {/* Attach Document */}
                          <button
                            type="button"
                            className="btn btn-sm btn-light rounded-circle"
                            onClick={() => fileInputRef.current?.click()}
                            title="Lampirkan File"
                            style={{ width: '36px', height: '36px' }}
                          >
                            <i className="fas fa-paperclip" style={{ fontSize: '18px', color: '#54656f' }}></i>
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                            multiple
                            className="d-none"
                            onChange={(e) => handleFileSelect(e, 'document')}
                          />
                        </div>

                        {/* Character Counter */}
                        <div className="d-flex align-items-center gap-2">
                          <small className={`${message.length > 4000 ? 'text-danger fw-bold' : message.length > 3800 ? 'text-warning' : 'text-muted'}`}>
                            {message.length}/4000
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Help Text */}
                  <div className="mt-2">
                    <small className="text-muted d-flex align-items-start gap-2">
                      <i className="fas fa-info-circle mt-1"></i>
                      <span>
                        <strong>Tips:</strong> Gunakan emoji untuk membuat pesan lebih menarik. 
                        Anda dapat melampirkan gambar atau dokumen (max 16MB per file).
                        {attachedFiles.length > 0 && (
                          <span className="text-success d-block mt-1">
                            <i className="fas fa-check-circle me-1"></i>
                            {attachedFiles.length} file terlampir
                          </span>
                        )}
                        {attachedFiles.some(f => f.type === 'image') && message.trim() && (
                          <span className="d-block mt-2">
                            <strong>Mode Pengiriman:</strong>
                            {sendMode === 'separate' ? (
                              <span className="text-primary d-block">
                                → Teks dulu, lalu gambar terpisah
                              </span>
                            ) : (
                              <span className="text-success d-block">
                                → Teks sebagai caption gambar
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </small>
                  </div>
                </div>

                {(session?.user?.role === 'SUPERADMIN' || session?.user?.role === 'ADMIN') && (
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-store text-warning me-2"></i>
                      Target Outlets (Opsional)
                    </label>
                    <div className="form-text mb-3">
                      <i className="fas fa-info-circle me-1"></i>
                      Kosongkan untuk mengirim ke semua outlet
                    </div>
                    
                    {outletsLoading ? (
                      <div className="text-center py-3">
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Loading outlets...
                      </div>
                    ) : (
                      <div className="border rounded p-3 bg-light">
                        {/* Connection Status Summary */}
                        {outlets.length > 0 && (
                          <div className="alert alert-info mb-3 py-2 px-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <small>
                                <i className="fas fa-info-circle me-2"></i>
                                Status Koneksi Outlets
                              </small>
                              <div className="d-flex gap-2">
                                <span className="badge bg-success-subtle text-success">
                                  <i className="fas fa-check-circle me-1"></i>
                                  {outlets.filter(o => o.status === 'connected').length} Online
                                </span>
                                <span className="badge bg-danger-subtle text-danger">
                                  <i className="fas fa-times-circle me-1"></i>
                                  {outlets.filter(o => o.status === 'disconnected').length} Offline
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Warning if offline outlets exist */}
                        {outlets.filter(o => o.status !== 'connected').length > 0 && (
                          <div className="alert alert-warning mb-3 py-2 px-3">
                            <small>
                              <i className="fas fa-exclamation-triangle me-2"></i>
                              Outlet yang offline tidak dapat dipilih. Silakan hubungkan WhatsApp terlebih dahulu di menu Outlets.
                            </small>
                          </div>
                        )}
                        
                        {/* Select All checkbox */}
                        <div className="form-check mb-3">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="outlet-all"
                            checked={selectedOutlets.length === 0}
                            onChange={() => setSelectedOutlets([])}
                          />
                          <label className="form-check-label fw-medium d-flex align-items-center justify-content-between w-100" htmlFor="outlet-all">
                            <span>
                              <i className="fas fa-building me-2 text-primary"></i>
                              Semua Outlets ({outlets.length})
                            </span>
                            <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '0.7rem' }}>
                              {outlets.filter(o => o.status === 'connected').length} Online
                            </span>
                          </label>
                        </div>
                        
                        {/* Individual outlet checkboxes */}
                        {outlets.length > 0 ? (
                          <div className="ms-3 border-top pt-3">
                            {outlets.map(outlet => {
                              const isConnected = outlet.status === 'connected'
                              const isConnecting = outlet.status === 'connecting'
                              
                              return (
                                <div key={outlet.id} className="form-check mb-2">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`outlet-${outlet.id}`}
                                    checked={selectedOutlets.includes(outlet.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedOutlets([...selectedOutlets, outlet.id])
                                      } else {
                                        setSelectedOutlets(selectedOutlets.filter(id => id !== outlet.id))
                                      }
                                    }}
                                    disabled={isLoading || !isConnected}
                                  />
                                  <label className="form-check-label d-flex align-items-center justify-content-between w-100" htmlFor={`outlet-${outlet.id}`}>
                                    <span>
                                      {isConnected ? (
                                        <i className="fas fa-check-circle text-success me-2" style={{ fontSize: '0.9rem' }} title="Terhubung"></i>
                                      ) : isConnecting ? (
                                        <i className="fas fa-circle-notch fa-spin text-warning me-2" style={{ fontSize: '0.9rem' }} title="Menghubungkan..."></i>
                                      ) : (
                                        <i className="fas fa-times-circle text-danger me-2" style={{ fontSize: '0.9rem' }} title="Tidak Terhubung"></i>
                                      )}
                                      <span className={!isConnected ? 'text-muted' : ''}>
                                        {outlet.namaOutlet}
                                      </span>
                                      <small className="text-muted ms-2">
                                        <i className="fab fa-whatsapp me-1"></i>
                                        {outlet.whatsappNumber}
                                      </small>
                                    </span>
                                    
                                    {/* Status Badge */}
                                    <span className="ms-2">
                                      {isConnected ? (
                                        <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.7rem' }}>
                                          <i className="fas fa-circle me-1" style={{ fontSize: '0.5rem' }}></i>
                                          Online
                                        </span>
                                      ) : isConnecting ? (
                                        <span className="badge bg-warning-subtle text-warning" style={{ fontSize: '0.7rem' }}>
                                          <i className="fas fa-circle me-1" style={{ fontSize: '0.5rem' }}></i>
                                          Connecting
                                        </span>
                                      ) : (
                                        <span className="badge bg-danger-subtle text-danger" style={{ fontSize: '0.7rem' }}>
                                          <i className="fas fa-circle me-1" style={{ fontSize: '0.5rem' }}></i>
                                          Offline
                                        </span>
                                      )}
                                    </span>
                                  </label>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="alert alert-warning mb-0 py-2 px-3">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            <small>Tidak ada outlets yang tersedia</small>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="d-flex gap-3">
                  <button
                    className="btn btn-success btn-lg px-4"
                    onClick={handleSendBlast}
                    disabled={isLoading || !message.trim()}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <i className="fab fa-whatsapp me-2"></i>
                        Kirim Blast
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-lg px-4"
                    onClick={handlePreview}
                    disabled={isLoading}
                  >
                    <i className="fas fa-eye me-2"></i>
                    Preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-lg px-4"
                    onClick={handleSaveDraft}
                    disabled={isLoading}
                  >
                    <i className="fas fa-save me-2"></i>
                    Simpan Draft
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            <div className="card mb-4">
              <div className="card-header bg-white border-bottom">
                <h6 className="card-title mb-0 text-dark fw-bold">
                  <i className="fas fa-info-circle text-primary me-2"></i>
                  Informasi Blast
                </h6>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <strong>Role Anda:</strong>
                  <span className="badge bg-primary ms-2 px-3 py-2">
                    <i className="fas fa-user me-1"></i>
                    {session?.user?.role}
                  </span>
                </div>
                
                {session?.user?.role === 'USER' && session?.user?.outlet && (
                  <div className="mb-3 p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-store text-primary me-2"></i>
                      <strong>Outlet Anda:</strong>
                    </div>
                    <div className="text-dark fw-medium">
                      {session.user.outlet.namaOutlet}
                    </div>
                    <small className="text-muted">
                      <i className="fas fa-info-circle me-1"></i>
                      Anda hanya dapat mengirim ke pelanggan dari outlet ini
                    </small>
                  </div>
                )}

                <div className="mb-3 p-3 bg-light rounded">
                  <div className="d-flex align-items-center mb-2">
                    <i className="fab fa-whatsapp text-success me-2"></i>
                    <strong>Pengirim WhatsApp:</strong>
                  </div>
                  <div className="text-dark">
                    {session?.user?.outlet?.whatsappNumber || 'Multiple senders'}
                  </div>
                </div>

                <div className="alert alert-info">
                  <i className="fas fa-lightbulb me-2"></i>
                  <small>
                    Pesan akan dikirim dari nomor WhatsApp yang terdaftar di setiap outlet.
                  </small>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header bg-white border-bottom">
                <h6 className="card-title mb-0 text-dark fw-bold">
                  <i className="fas fa-tips text-warning me-2"></i>
                  Tips Pesan Efektif
                </h6>
              </div>
              <div className="card-body p-4">
                <ul className="list-unstyled mb-0">
                  <li className="mb-3 d-flex align-items-start">
                    <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                    <small>Batasi pesan maksimal 4000 karakter</small>
                  </li>
                  <li className="mb-3 d-flex align-items-start">
                    <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                    <small>Sertakan nama bisnis Anda</small>
                  </li>
                  <li className="mb-3 d-flex align-items-start">
                    <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                    <small>Tambahkan call-to-action yang jelas</small>
                  </li>
                  <li className="mb-3 d-flex align-items-start">
                    <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                    <small>Gunakan emoticon untuk menarik perhatian</small>
                  </li>
                  <li className="mb-3 d-flex align-items-start">
                    <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                    <small>Lampirkan gambar/dokumen untuk informasi lebih detail</small>
                  </li>
                  <li className="d-flex align-items-start">
                    <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                    <small>Personalisasi pesan jika memungkinkan</small>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles for WhatsApp-like UI */}
      <style jsx>{`
        textarea:focus {
          box-shadow: none !important;
          border-color: #25d366 !important;
        }

        .btn-light:hover {
          background-color: #e9ecef !important;
        }

        .EmojiPickerReact {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          border-radius: 8px !important;
        }

        @media (max-width: 768px) {
          .EmojiPickerReact {
            width: 280px !important;
          }
        }
      `}</style>
    </AuthenticatedLayout>
  )
}