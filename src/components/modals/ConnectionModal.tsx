"use client";

import { useState, useEffect, useRef } from "react";
import { Outlet } from "@prisma/client";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlet: Outlet;
}

type WhatsAppStatus = "disconnected" | "connecting" | "connected" | "error";
type ModalMode = "status" | "connect"; // status = show connection info, connect = show QR for connection

export default function ConnectionModal({
  isOpen,
  onClose,
  outlet,
}: ConnectionModalProps) {
  const [state, setState] = useState({
    status: "disconnected" as WhatsAppStatus,
    qrCode: null as string | null,
    deviceName: null as string | null,
    loading: true,
    retrying: false,
    countdown: 60, // QR expires after 60 seconds (matching backend qrTimeout)
    phoneMismatch: null as { registered: string; connected: string } | null,
  });
  const [modalMode, setModalMode] = useState<ModalMode>("status");
  const [wantToReconnect, setWantToReconnect] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastQrRef = useRef<string | null>(null); // Track QR changes
  const shouldAutoRefreshRef = useRef<boolean>(true); // Control auto-refresh

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const fetchQR = async () => {
      try {
        const url = `/api/blast/qr/${outlet.whatsappNumber}`;
        const response = await fetch(url, { cache: "no-store" });

        if (response.ok) {
          const data = await response.json();

          if (isMounted) {
            console.log(`[Modal] Status: ${data.status}, QR: ${!!data.qrCode}, Name: ${data.name}`);
            
            // Check for phone mismatch error
            const mismatchError = data.deviceInfo?.error === 'Phone number mismatch' 
              ? { registered: data.deviceInfo.registered, connected: data.deviceInfo.connected }
              : null;
            
            if (mismatchError) {
              console.error(`[Modal] ⚠️ Phone mismatch detected!`, mismatchError);
            }
            
            // Check if QR code changed (new QR generated)
            const qrChanged = data.qrCode && data.qrCode !== lastQrRef.current;
            if (qrChanged) {
              console.log(`[Modal] 🔄 New QR code received, resetting countdown to 60s`);
              lastQrRef.current = data.qrCode;
            }
            
            setState((prev) => ({
              ...prev,
              status: data.status as WhatsAppStatus,
              qrCode: data.qrCode || null,
              deviceName: data.name ?? null,
              loading: false,
              retrying: false,
              countdown: qrChanged ? 60 : prev.countdown, // Reset countdown only on new QR
              phoneMismatch: mismatchError,
            }));

            // Stop all polling when connected
            if (data.status === "connected") {
              console.log(`[Modal] ✅ Connected! Stopping all polling.`);
              if (pollingInterval) clearInterval(pollingInterval);
              if (fetchRef.current) clearInterval(fetchRef.current);
              if (countdownRef.current) clearInterval(countdownRef.current);
              setModalMode("status");
              setWantToReconnect(false);
              return true; // Signal to stop polling
            }
          }
        } else {
          if (isMounted) {
            setState((prev) => ({
              ...prev,
              status: "error",
              loading: false,
              retrying: false,
            }));
          }
        }
        return false;
      } catch (error) {
        console.error("[ConnectionModal] Error fetching QR:", error);
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            status: "error",
            loading: false,
            retrying: false,
          }));
        }
        return false;
      }
    };

    // Initial fetch
    setState((prev) => ({ ...prev, loading: true }));
    fetchQR();

    // Aggressive polling every 1 second while connecting
    pollingInterval = setInterval(async () => {
      const connected = await fetchQR();
      if (connected) {
        clearInterval(pollingInterval!);
      }
    }, 1000);

    fetchRef.current = pollingInterval;

    // Countdown timer with auto-refresh when expired
    countdownRef.current = setInterval(() => {
      setState((prev) => {
        const newCountdown = prev.countdown > 0 ? prev.countdown - 1 : 0;
        
        // Auto-refresh QR when countdown reaches 0 (only if connecting and has QR)
        if (newCountdown === 0 && prev.status === 'connecting' && prev.qrCode && shouldAutoRefreshRef.current) {
          console.log('[Modal] ⏰ QR expired (60s), will auto-refresh on next poll...');
        }
        
        return {
          ...prev,
          countdown: newCountdown,
        };
      });
    }, 1000);

    return () => {
      isMounted = false;
      if (pollingInterval) clearInterval(pollingInterval);
      if (fetchRef.current) clearInterval(fetchRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isOpen, outlet.whatsappNumber, wantToReconnect]);

  if (!isOpen) return null;

  const handleRetry = async () => {
    setState((prev) => ({ ...prev, retrying: true, loading: true }));
    await new Promise((r) => setTimeout(r, 100));

    try {
      const url = `/api/blast/qr/${outlet.whatsappNumber}?reset=1`;
      const response = await fetch(url, { cache: "no-store" });

      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          status: data.status as WhatsAppStatus,
          qrCode: data.qrCode ?? null,
          deviceName: data.name ?? null,
          loading: false,
          retrying: false,
          countdown: 60, // Reset to 60 seconds
        }));
      } else {
        setState((prev) => ({
          ...prev,
          status: "error",
          loading: false,
          retrying: false,
        }));
      }
    } catch (error) {
      console.error("[ConnectionModal] Retry error:", error);
      setState((prev) => ({
        ...prev,
        status: "error",
        loading: false,
        retrying: false,
      }));
    }
  };

  const renderContent = () => {
    if (state.loading) {
      return <LoadingMessage message="Memeriksa status koneksi..." />;
    }

    // Check for phone mismatch error first (highest priority)
    if (state.phoneMismatch) {
      return (
        <DisconnectedContent 
          retrying={state.retrying} 
          onRetry={handleRetry}
          phoneMismatch={state.phoneMismatch}
          outlet={outlet}
        />
      );
    }

    // If connected and not wanting to reconnect, show connected info
    if (state.status === "connected" && !wantToReconnect) {
      return (
        <ConnectedInfoContent
          outlet={outlet}
          deviceName={state.deviceName}
          onReconnect={() => {
            console.log('[Modal] User wants to reconnect to different device');
            setWantToReconnect(true);
          }}
        />
      );
    }

    // Show QR for connecting/reconnecting
    if (state.status === "connecting" || wantToReconnect) {
      return (
        <ConnectingContent
          qrCode={state.qrCode}
          countdown={state.countdown}
          retrying={state.retrying}
          onRetry={handleRetry}
        />
      );
    }

    // Error or disconnected (no phone mismatch)
    return (
      <DisconnectedContent 
        retrying={state.retrying} 
        onRetry={handleRetry}
        phoneMismatch={null}
        outlet={outlet}
      />
    );
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fab fa-whatsapp me-2 text-success"></i>
              Koneksi WhatsApp - {outlet.namaOutlet}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">{renderContent()}</div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LoadingMessage = ({ message }: { message: string }) => (
  <div className="text-center p-5">
    <div className="spinner-border text-primary" role="status"></div>
    <p className="mt-3 text-muted">{message}</p>
  </div>
);

const ConnectingContent = ({
  qrCode,
  countdown,
  retrying,
  onRetry,
}: {
  qrCode: string | null;
  countdown: number;
  retrying: boolean;
  onRetry: () => void;
}) => (
  <div className="text-center">
    <p className="fw-bold">Scan QR Code untuk menghubungkan</p>
    <p className="text-muted small">
      Buka WhatsApp di HP Anda: Menu &gt; Perangkat Tertaut &gt; Tautkan Perangkat.
      Pastikan koneksi internet stabil.
    </p>
    {qrCode ? (
      <div>
        <img
          src={qrCode}
          alt="WhatsApp QR Code"
          className="img-fluid"
          style={{ maxWidth: "300px", margin: "20px 0" }}
        />
        <p className="text-muted small">
          QR Code akan diganti dalam <strong>{countdown} detik</strong>
        </p>
      </div>
    ) : (
      <div className="d-flex flex-column align-items-center gap-3">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-muted small">Menunggu QR code...</p>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? "Mengulang..." : "Coba lagi"}
        </button>
      </div>
    )}
  </div>
);

const ConnectedContent = ({
  outlet,
  deviceName,
}: {
  outlet: Outlet;
  deviceName: string | null;
}) => (
  <div className="text-center p-5">
    <div style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", 
                  borderRadius: "50%", 
                  width: "80px", 
                  height: "80px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  margin: "0 auto 20px"
                }}>
      <i className="fas fa-check text-white fa-3x"></i>
    </div>
    
    <h4 className="fw-bold mb-2" style={{ color: "#25D366" }}>
      Perangkat Terhubung
    </h4>
    
    <div className="alert alert-success border-2" role="alert" style={{ textAlign: "left", marginBottom: "20px" }}>
      <div className="mb-3">
        <small className="text-muted d-block mb-1">Nomor WhatsApp</small>
        <strong className="d-block" style={{ fontSize: "16px" }}>
          {outlet.whatsappNumber}
        </strong>
      </div>
      
      {deviceName && (
        <div>
          <small className="text-muted d-block mb-1">Nama Perangkat</small>
          <strong className="d-block" style={{ fontSize: "16px" }}>
            {deviceName}
          </strong>
        </div>
      )}
    </div>

    <div className="alert alert-info" role="alert">
      <i className="fas fa-info-circle me-2"></i>
      <small>
        Koneksi berhasil disimpan. Anda dapat mengirim pesan WhatsApp sekarang.
      </small>
    </div>
  </div>
);

const ConnectedInfoContent = ({
  outlet,
  deviceName,
  onReconnect,
}: {
  outlet: Outlet;
  deviceName: string | null;
  onReconnect: () => void;
}) => (
  <div className="p-5">
    <div className="text-center mb-4">
      <div style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", 
                    borderRadius: "50%", 
                    width: "80px", 
                    height: "80px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    margin: "0 auto 20px"
                  }}>
        <i className="fas fa-check text-white fa-3x"></i>
      </div>
      
      <h4 className="fw-bold mb-1" style={{ color: "#25D366" }}>
        Perangkat Sudah Terhubung
      </h4>
      <p className="text-muted small mb-4">
        Sistem siap untuk pengiriman pesan WhatsApp
      </p>
    </div>

    <div className="card border-success-subtle bg-light" style={{ marginBottom: "20px" }}>
      <div className="card-body">
        <div className="mb-3">
          <label className="form-label small text-muted mb-1">
            <i className="fas fa-phone me-1 text-success"></i>
            Nomor WhatsApp
          </label>
          <div className="p-2 bg-white rounded border border-success-subtle">
            <strong className="d-block">{outlet.whatsappNumber}</strong>
          </div>
        </div>

        {deviceName && (
          <div>
            <label className="form-label small text-muted mb-1">
              <i className="fas fa-mobile-alt me-1 text-success"></i>
              Nama Perangkat
            </label>
            <div className="p-2 bg-white rounded border border-success-subtle">
              <strong className="d-block">{deviceName}</strong>
            </div>
          </div>
        )}
      </div>
    </div>

    <div className="alert alert-info mb-4">
      <i className="fas fa-lightbulb me-2"></i>
      <small>
        Koneksi ini tersimpan di database dan akan tetap aktif selama tidak di-disconnect secara manual.
      </small>
    </div>

    <div className="d-grid gap-2">
      <button
        className="btn btn-outline-warning"
        onClick={onReconnect}
      >
        <i className="fas fa-sync-alt me-2"></i>
        Hubungkan ke Perangkat Lain
      </button>
    </div>
  </div>
);

const DisconnectedContent = ({
  retrying,
  onRetry,
  phoneMismatch,
  outlet,
}: {
  retrying: boolean;
  onRetry: () => void;
  phoneMismatch: { registered: string; connected: string } | null;
  outlet: Outlet;
}) => {
  if (phoneMismatch) {
    return (
      <div className="text-center p-4">
        <div className="alert alert-danger" role="alert">
          <h5 className="alert-heading">
            <i className="fas fa-exclamation-triangle me-2"></i>
            Nomor WhatsApp Tidak Sesuai!
          </h5>
          <hr />
          <div className="text-start">
            <p className="mb-2">
              <strong>Nomor terdaftar di outlet:</strong><br />
              <code className="fs-6">{phoneMismatch.registered}</code>
            </p>
            <p className="mb-2">
              <strong>Nomor yang Anda scan:</strong><br />
              <code className="fs-6 text-danger">{phoneMismatch.connected}</code>
            </p>
          </div>
          <hr />
          <p className="mb-3 small">
            Untuk keamanan, koneksi telah diputus. Pastikan Anda men-scan QR code 
            dengan nomor WhatsApp yang terdaftar di outlet ini (<code>{phoneMismatch.registered}</code>).
          </p>
          <button
            className="btn btn-danger"
            onClick={onRetry}
            disabled={retrying}
          >
            <i className="fas fa-qrcode me-2"></i>
            {retrying ? "Mengulang..." : "Scan dengan Nomor yang Benar"}
          </button>
        </div>
        <div className="mt-3 text-muted small">
          <p className="mb-1">
            <i className="fas fa-info-circle me-1"></i>
            <strong>Tips:</strong>
          </p>
          <ul className="text-start" style={{ fontSize: '0.85rem' }}>
            <li>Pastikan Anda login di WhatsApp dengan nomor <code>{phoneMismatch.registered}</code></li>
            <li>Jika nomor outlet salah, edit outlet dan perbarui nomor WhatsApp</li>
            <li>Setiap outlet hanya bisa terhubung dengan 1 nomor WhatsApp</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center text-danger p-5">
      <h4 className="fw-bold">Terputus</h4>
      <p className="text-muted">
        Koneksi WhatsApp terputus. Silakan coba lagi.
      </p>
      <button
        className="btn btn-outline-secondary"
        onClick={onRetry}
        disabled={retrying}
      >
        {retrying ? "Mengulang..." : "Coba lagi"}
      </button>
    </div>
  );
};
