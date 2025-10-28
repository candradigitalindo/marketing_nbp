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
  const [blastStatus, setBlastStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle')
  const [currentBlastId, setCurrentBlastId] = useState<string | null>(null)
  const [jobProgress, setJobProgress] = useState<any>(0)
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [outletsLoading, setOutletsLoading] = useState(true)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  
  // NEW: Real-time blast results
  const [sentList, setSentList] = useState<any[]>([])
  const [failedList, setFailedList] = useState<any[]>([])
  // skipSentCustomers removed - hanya untuk resend dari histori
  
  // NEW: Blast History
  const [blastHistory, setBlastHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null) // NEW: Track which blast is being resent
  
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
    setBlastStatus('idle')
    setSentList([]) // Reset sent list
    setFailedList([]) // Reset failed list
    
    try {
      const formData = new FormData()
      formData.append('message', message)
      formData.append('sendMode', sendMode) // Add send mode
      // skipSentCustomers REMOVED - hanya untuk resend dari histori
      
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
        
        // NEW: Handle background job response
        if (result.blastId && result.status === 'QUEUED') {
          setCurrentBlastId(result.blastId)
          setBlastStatus('queued')
          setBlastResult(null)
          
          // Clear form on success
          setMessage('')
          setAttachedFiles([])
          
          // Start polling for status
          pollBlastStatus(result.blastId)
        } else {
          // Fallback for old synchronous response
          setBlastResult(result)
          setBlastStatus('completed')
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
        setBlastStatus('failed')
      }
    } catch (error) {
      console.error('Error sending blast:', error)
      alert('Gagal mengirim blast')
      setBlastStatus('failed')
    } finally {
      setIsLoading(false)
    }
  }

  // NEW: Poll blast status with real-time updates
  const pollBlastStatus = async (blastId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/blast/${blastId}`)
        if (response.ok) {
          const data = await response.json()
          
          const blastData = data.blast || data
          setBlastStatus(blastData.status?.toLowerCase() || 'unknown')
          setJobProgress(data.job?.progress || 0)
          
          // Update sent and failed lists in real-time
          if (data.sent) {
            setSentList(data.sent)
          }
          if (data.failed) {
            setFailedList(data.failed)
          }
          
          // Stop polling when completed or failed
          if (blastData.status === 'COMPLETED' || blastData.status === 'FAILED') {
            clearInterval(pollInterval)
            setBlastResult(data)
            setCurrentBlastId(null)
          }
        }
      } catch (error) {
        console.error('Error polling blast status:', error)
      }
    }, 2000) // Poll every 2 seconds
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

  // Fetch blast history
  const fetchBlastHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch('/api/blast?limit=20')
      if (response.ok) {
        const data = await response.json()
        setBlastHistory(data.blasts || [])
      }
    } catch (error) {
      console.error('Error fetching blast history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Load history when modal opens
  useEffect(() => {
    if (showHistory) {
      fetchBlastHistory()
    }
  }, [showHistory])

  // Resend blast (hanya yang gagal)
  const handleResend = async (blastItem: any) => {
    console.log('🔄 Resend blast:', blastItem)
    
    // Check permission: USER can only resend from their outlet
    if (session?.user?.role === 'USER' && blastItem.outletId !== session?.user?.outletId) {
      alert('❌ Anda hanya bisa mengirim ulang blast dari outlet Anda sendiri')
      return
    }

    if (!confirm(`Kirim ulang blast ke ${blastItem.failedCount} customer yang gagal?`)) {
      return
    }

    setResendingId(blastItem.id) // Mark this blast as being resent
    try {
      console.log('📡 Fetching blast details:', blastItem.id)
      // Get failed customer IDs from the blast
      const response = await fetch(`/api/blast/${blastItem.id}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Fetch failed:', response.status, errorText)
        throw new Error('Failed to fetch blast details')
      }
      
      const data = await response.json()
      console.log('📊 Blast data:', data)
      
      const failedCustomerIds = data.failed?.map((r: any) => r.customerId) || []
      console.log('❌ Failed customer IDs:', failedCustomerIds)
      
      if (failedCustomerIds.length === 0) {
        alert('Tidak ada customer yang gagal')
        setResendingId(null)
        return
      }

      // Send blast to failed customers only
      const formData = new FormData()
      formData.append('message', blastItem.message)
      formData.append('customerIds', JSON.stringify(failedCustomerIds))
      formData.append('sendMode', blastItem.sendMode || 'separate')
      formData.append('skipSentCustomers', 'true') // Skip customers yang sudah pernah terkirim
      
      // If resending from specific outlet, include outletId
      if (blastItem.outletId) {
        formData.append('outletIds', JSON.stringify([blastItem.outletId]))
      }

      console.log('📤 Sending blast request...')
      console.log('  - Message length:', blastItem.message.length)
      console.log('  - Customer IDs:', failedCustomerIds.length)
      console.log('  - Send mode:', blastItem.sendMode || 'separate')
      console.log('  - Outlet ID:', blastItem.outletId)

      const sendResponse = await fetch('/api/blast', {
        method: 'POST',
        body: formData,
      })

      if (!sendResponse.ok) {
        const error = await sendResponse.json()
        console.error('❌ Send failed:', error)
        throw new Error(error.error || 'Gagal mengirim blast')
      }

      const result = await sendResponse.json()
      console.log('✅ Blast created:', result)
      
      setCurrentBlastId(result.blastId)
      setBlastStatus('queued')
      
      // Close modal and stop loading IMMEDIATELY
      setShowHistory(false)
      setResendingId(null)
      
      // Show success alert
      alert(`✅ Blast dijadwalkan untuk ${failedCustomerIds.length} customer yang gagal`)
      
      // Refresh history in background (after modal closed)
      setTimeout(() => {
        fetchBlastHistory().catch(err => {
          console.error('Failed to refresh history:', err)
        })
      }, 100)
      
    } catch (error: any) {
      console.error('❌ Resend error:', error)
      setResendingId(null) // Stop loading on error too
      alert(`❌ Error: ${error.message}`)
    } finally {
      // Double-ensure loading is stopped
      setResendingId(null)
    }
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
              <button
                className="btn btn-outline-primary me-2"
                onClick={() => setShowHistory(true)}
              >
                <i className="fas fa-history me-2"></i>
                Riwayat Blast
              </button>
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
            {/* Blast Status Indicator - NEW */}
            {(blastStatus === 'queued' || blastStatus === 'processing') && (
              <div className="card mb-4">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="spinner-border text-primary me-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <div>
                      <h5 className="mb-1 fw-bold">
                        {blastStatus === 'queued' ? '📋 Blast Dijadwalkan' : '⚡ Blast Sedang Berjalan'}
                      </h5>
                      <small className="text-muted">
                        {blastStatus === 'queued' 
                          ? 'Blast Anda telah masuk antrian dan akan segera diproses...'
                          : 'Sedang mengirim pesan ke pelanggan...'}
                      </small>
                    </div>
                  </div>
                  
                  {blastStatus === 'processing' && (
                    <>
                      <div className="progress mb-3" style={{ height: '25px' }}>
                        <div 
                          className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                          role="progressbar" 
                          style={{ width: `${typeof jobProgress === 'number' ? jobProgress : 0}%` }}
                        >
                          {typeof jobProgress === 'number' ? `${jobProgress}%` : 'Processing...'}
                        </div>
                      </div>

                      {/* Real-time results */}
                      <div className="row mt-3">
                        <div className="col-md-6">
                          <div className="p-3 bg-success-subtle rounded">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-success fw-bold">
                                <i className="fas fa-check-circle me-2"></i>
                                Terkirim
                              </span>
                              <span className="badge bg-success">{sentList.length}</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="p-3 bg-danger-subtle rounded">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-danger fw-bold">
                                <i className="fas fa-times-circle me-2"></i>
                                Gagal
                              </span>
                              <span className="badge bg-danger">{failedList.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="alert alert-info mt-3 mb-0 d-flex align-items-center">
                    <i className="fas fa-info-circle me-2"></i>
                    Anda dapat menutup halaman ini. Blast akan berjalan di background dan hasil akan tersimpan.
                  </div>
                </div>
              </div>
            )}

            {/* Real-time Sent/Failed Lists - NEW */}
            {(sentList.length > 0 || failedList.length > 0) && (
              <div className="card mb-4">
                <div className="card-header bg-white">
                  <ul className="nav nav-tabs card-header-tabs" role="tablist">
                    <li className="nav-item">
                      <a 
                        className="nav-link active" 
                        data-bs-toggle="tab" 
                        href="#sentTab" 
                        role="tab"
                      >
                        <i className="fas fa-check-circle text-success me-2"></i>
                        Terkirim ({sentList.length})
                      </a>
                    </li>
                    <li className="nav-item">
                      <a 
                        className="nav-link" 
                        data-bs-toggle="tab" 
                        href="#failedTab" 
                        role="tab"
                      >
                        <i className="fas fa-times-circle text-danger me-2"></i>
                        Gagal ({failedList.length})
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="card-body p-0">
                  <div className="tab-content">
                    {/* Sent Tab */}
                    <div className="tab-pane fade show active" id="sentTab" role="tabpanel">
                      {sentList.length > 0 ? (
                        <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <table className="table table-hover mb-0">
                            <thead className="sticky-top bg-white">
                              <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th>Nama Customer</th>
                                <th>Nomor WhatsApp</th>
                                <th>Waktu Terkirim</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sentList.map((item, idx) => (
                                <tr key={item.id || idx}>
                                  <td>{idx + 1}</td>
                                  <td>
                                    <i className="fas fa-user-circle text-muted me-2"></i>
                                    {item.customerName}
                                  </td>
                                  <td>
                                    <i className="fab fa-whatsapp text-success me-2"></i>
                                    {item.customerPhone}
                                  </td>
                                  <td>
                                    <small className="text-muted">
                                      {item.sentAt ? new Date(item.sentAt).toLocaleTimeString('id-ID') : '-'}
                                    </small>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted">
                          <i className="fas fa-inbox fa-3x mb-3"></i>
                          <p>Belum ada pesan yang terkirim</p>
                        </div>
                      )}
                    </div>

                    {/* Failed Tab */}
                    <div className="tab-pane fade" id="failedTab" role="tabpanel">
                      {failedList.length > 0 ? (
                        <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <table className="table table-hover mb-0">
                            <thead className="sticky-top bg-white">
                              <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th>Nama Customer</th>
                                <th>Nomor WhatsApp</th>
                                <th>Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {failedList.map((item, idx) => (
                                <tr key={item.id || idx}>
                                  <td>{idx + 1}</td>
                                  <td>
                                    <i className="fas fa-user-circle text-muted me-2"></i>
                                    {item.customerName}
                                  </td>
                                  <td>
                                    <i className="fab fa-whatsapp text-danger me-2"></i>
                                    {item.customerPhone}
                                  </td>
                                  <td>
                                    <small className="text-danger">
                                      {item.errorMessage || 'Unknown error'}
                                    </small>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted">
                          <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                          <p>Tidak ada pesan yang gagal</p>
                        </div>
                      )}
                    </div>
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
                        {attachedFiles.length > 0 && message.trim() && (
                          <span className="d-block mt-2">
                            <strong>Mode Pengiriman:</strong>
                            {sendMode === 'separate' ? (
                              <span className="text-primary d-block">
                                → Teks dulu, lalu file terpisah
                              </span>
                            ) : (
                              <span className="text-success d-block">
                                → Teks sebagai caption file pertama
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </small>
                  </div>
                  
                  {/* Anti-Spam Tips */}
                  <div className="alert alert-warning mt-3 py-2 px-3" style={{ fontSize: '0.85rem' }}>
                    <div className="d-flex align-items-start gap-2">
                      <i className="fas fa-shield-alt mt-1"></i>
                      <div>
                        <strong>Anti-Spam Protection Aktif:</strong>
                        <ul className="mb-0 mt-1 ps-3" style={{ fontSize: '0.8rem' }}>
                          <li>Delay acak 1.5-3.5 detik (text) atau 3-5 detik (media) antar pesan</li>
                          <li>Untuk blast besar (100+ customer), disarankan kirim bertahap</li>
                          <li>Personalisasi pesan dengan nama customer untuk hasil lebih baik</li>
                          <li>Hindari blast lebih dari 500 pesan/hari per nomor</li>
                        </ul>
                      </div>
                    </div>
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

      {/* Blast History Modal */}
      {showHistory && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-history text-primary me-2"></i>
                  Riwayat Blast
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowHistory(false)}
                ></button>
              </div>
              <div className="modal-body">
                {historyLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : blastHistory.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="fas fa-inbox fa-3x mb-3"></i>
                    <p>Belum ada riwayat blast</p>
                  </div>
                ) : (
                  <div className="list-group">
                    {blastHistory.map((item, index) => (
                      <div key={item.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-2">
                              <span className="badge bg-secondary me-2">#{index + 1}</span>
                              <small className="text-muted">
                                {new Date(item.createdAt).toLocaleString('id-ID')}
                              </small>
                              <span className={`badge ms-2 ${
                                item.status === 'COMPLETED' ? 'bg-success' :
                                item.status === 'FAILED' ? 'bg-danger' :
                                item.status === 'PROCESSING' ? 'bg-warning' :
                                'bg-secondary'
                              }`}>
                                {item.status}
                              </span>
                              {item.sendMode && (
                                <span className="badge bg-info ms-2">
                                  {item.sendMode === 'caption' ? '📷 With Caption' : '📝 Separate Messages'}
                                </span>
                              )}
                              {item.user?.outlet && (
                                <span className="badge bg-warning-subtle text-warning ms-2">
                                  <i className="fas fa-store me-1"></i>
                                  {item.user.outlet.namaOutlet}
                                </span>
                              )}
                              {item.user?.name && (
                                <small className="text-muted ms-2">
                                  <i className="fas fa-user me-1"></i>
                                  {item.user.name}
                                </small>
                              )}
                            </div>
                            
                            <div className="mb-2">
                              <strong className="text-dark">Pesan:</strong>
                              <p className="mb-1 ms-3" style={{ whiteSpace: 'pre-wrap' }}>
                                {item.message.length > 200 
                                  ? item.message.substring(0, 200) + '...' 
                                  : item.message}
                              </p>
                            </div>

                            {item.mediaType && (
                              <div className="mb-2">
                                <span className="badge bg-primary-subtle text-primary">
                                  <i className="fas fa-paperclip me-1"></i>
                                  {item.mediaType}
                                </span>
                              </div>
                            )}

                            <div className="row g-2 mt-2">
                              <div className="col-auto">
                                <small className="badge bg-primary-subtle text-primary">
                                  <i className="fas fa-users me-1"></i>
                                  Target: {item.targetCount || 0}
                                </small>
                              </div>
                              <div className="col-auto">
                                <small className="badge bg-success-subtle text-success">
                                  <i className="fas fa-check me-1"></i>
                                  Terkirim: {item.sentCount || 0}
                                </small>
                              </div>
                              <div className="col-auto">
                                <small className="badge bg-danger-subtle text-danger">
                                  <i className="fas fa-times me-1"></i>
                                  Gagal: {item.failedCount || 0}
                                </small>
                              </div>
                              <div className="col-auto">
                                <small className="badge bg-info-subtle text-info">
                                  <i className="fas fa-percentage me-1"></i>
                                  {item.targetCount > 0 
                                    ? Math.round((item.sentCount / item.targetCount) * 100) 
                                    : 0}% Sukses
                                </small>
                              </div>
                            </div>
                          </div>

                          <div className="ms-3">
                            {item.failedCount > 0 && item.status === 'COMPLETED' && (
                              <>
                                {/* Check if user has permission to resend */}
                                {(session?.user?.role === 'SUPERADMIN' || 
                                  session?.user?.role === 'ADMIN' ||
                                  (session?.user?.role === 'USER' && item.outletId === session?.user?.outletId)) ? (
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleResend(item)}
                                    disabled={resendingId === item.id}
                                  >
                                    {resendingId === item.id ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <i className="fas fa-redo me-1"></i>
                                        Kirim Ulang Gagal ({item.failedCount})
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <small className="text-muted">
                                    <i className="fas fa-lock me-1"></i>
                                    Hanya outlet sendiri
                                  </small>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowHistory(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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