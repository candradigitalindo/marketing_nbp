'use client'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  itemName?: string
  loading?: boolean
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  loading = false
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title text-danger">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {title}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>

          <div className="modal-body">
            <div className="text-center mb-3">
              <div className="text-danger mb-3">
                <i className="fas fa-trash-alt" style={{ fontSize: '3rem' }}></i>
              </div>
              <p className="mb-2">{message}</p>
              {itemName && (
                <p className="fw-bold text-primary mb-0">"{itemName}"</p>
              )}
            </div>
            <div className="alert alert-warning border-0 bg-warning bg-opacity-10">
              <small>
                <i className="fas fa-info-circle me-2"></i>
                Tindakan ini tidak dapat dibatalkan. Data yang dihapus tidak dapat dikembalikan.
              </small>
            </div>
          </div>

          <div className="modal-footer border-0">
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
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Menghapus...
                </>
              ) : (
                <>
                  <i className="fas fa-trash me-2"></i>
                  Ya, Hapus
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}