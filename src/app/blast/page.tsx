'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'

export default function BlastPage() {
  const { data: session } = useSession()
  const [message, setMessage] = useState('')
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [blastResult, setBlastResult] = useState<any>(null)

  const handleSendBlast = async () => {
    if (!message.trim()) {
      alert('Silakan masukkan pesan terlebih dahulu')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/blast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          outletIds: selectedOutlets.length > 0 ? selectedOutlets : undefined,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setBlastResult(result)
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
            <div className="card h-100">
              <div className="card-header bg-white border-bottom">
                <h5 className="card-title mb-0 text-dark fw-bold">
                  <i className="fas fa-edit text-primary me-2"></i>
                  Tulis Pesan Broadcast
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <label htmlFor="message" className="form-label fw-semibold">
                    <i className="fas fa-comment-dots text-success me-2"></i>
                    Konten Pesan
                  </label>
                  <textarea
                    id="message"
                    className="form-control form-control-lg"
                    rows={8}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ketik pesan WhatsApp yang akan dikirim ke pelanggan...

Contoh:
Halo! 👋

Kami punya penawaran menarik untuk Anda:
🎉 Diskon 20% untuk semua produk
🕒 Berlaku hingga akhir bulan

Hubungi kami sekarang untuk info lebih lanjut!

Terima kasih,
Tim Marketing"
                    style={{ minHeight: '200px' }}
                  />
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div className="form-text">
                      <i className="fas fa-info-circle me-1"></i>
                      Gunakan emoticon untuk membuat pesan lebih menarik
                    </div>
                    <div className={`small ${message.length > 3800 ? 'text-warning' : message.length > 4000 ? 'text-danger' : 'text-muted'}`}>
                      <i className="fas fa-counter me-1"></i>
                      {message.length}/4000 karakter
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
                    <div className="border rounded p-3 bg-light">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="outlet-all"
                          checked={selectedOutlets.length === 0}
                          onChange={() => setSelectedOutlets([])}
                        />
                        <label className="form-check-label fw-medium" htmlFor="outlet-all">
                          <i className="fas fa-building me-2 text-primary"></i>
                          Semua Outlets
                        </label>
                      </div>
                    </div>
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
                  <button className="btn btn-outline-primary btn-lg px-4">
                    <i className="fas fa-eye me-2"></i>
                    Preview
                  </button>
                  <button className="btn btn-outline-secondary btn-lg px-4">
                    <i className="fas fa-save me-2"></i>
                    Simpan Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Blast Results */}
            {blastResult && (
              <div className="card mt-4">
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
    </AuthenticatedLayout>
  )
}