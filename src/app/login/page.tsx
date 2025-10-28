'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [noHp, setNoHp] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        noHp,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Nomor Handphone atau password tidak valid')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      setError('Terjadi kesalahan saat login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{
      background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)'
    }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-lg border-0" style={{ borderRadius: '1rem' }}>
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="fas fa-paper-plane text-primary" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <h1 className="h3 mb-2 fw-bold text-dark">Marketing NBP</h1>
                  <p className="text-muted">WhatsApp Marketing System</p>
                </div>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="noHp" className="form-label fw-semibold">
                      <i className="fas fa-envelope me-2 text-primary"></i>
                      Nomor Handphone
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id="noHp"
                      value={noHp}
                      onChange={(e) => setNoHp(e.target.value)}
                      required
                      autoComplete="tel"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="form-label fw-semibold">
                      <i className="fas fa-lock me-2 text-primary"></i>
                      Password
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 fw-semibold"
                    disabled={isLoading}
                    style={{ borderRadius: '0.75rem' }}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Masuk...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Masuk
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}