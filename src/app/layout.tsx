import type { Metadata } from "next";
import { SessionProvider } from "./providers/SessionProvider";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Marketing NBP - WhatsApp Blast System",
  description: "Marketing management system with WhatsApp blast functionality",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
          crossOrigin="anonymous"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          rel="stylesheet"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --bs-primary: #38bdf8;
              --bs-primary-rgb: 56, 189, 248;
              --bs-secondary: #facc15;
              --bs-secondary-rgb: 250, 204, 21;
            }
            
            .btn-primary {
              background-color: var(--bs-primary) !important;
              border-color: var(--bs-primary) !important;
            }
            
            .btn-primary:hover {
              background-color: #0ea5e9 !important;
              border-color: #0ea5e9 !important;
            }
            
            .btn-secondary {
              background-color: var(--bs-secondary) !important;
              border-color: var(--bs-secondary) !important;
              color: #1e293b !important;
            }
            
            .sidebar {
              background: linear-gradient(180deg, var(--bs-primary) 0%, #0ea5e9 100%);
              min-height: 100vh;
              position: fixed;
              top: 0;
              left: 0;
              width: 250px;
              z-index: 1000;
            }
            
            @media (max-width: 767.98px) {
              .sidebar {
                position: relative;
                width: 100%;
                min-height: auto;
              }
            }
            
            .sidebar .nav-link {
              color: rgba(255, 255, 255, 0.8);
              border-radius: 0.5rem;
              margin: 0.125rem 0;
              padding: 0.75rem 1rem;
              transition: all 0.2s;
            }
            
            .sidebar .nav-link:hover,
            .sidebar .nav-link.active {
              color: white;
              background-color: rgba(255, 255, 255, 0.1);
            }
            
            .card {
              border: none;
              box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
              border-radius: 0.75rem;
            }
            
            .stat-card {
              background: linear-gradient(135deg, var(--bs-primary) 0%, #0ea5e9 100%);
              color: white;
              border: none;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #f8fafc;
            }
            
            .avatar-circle {
              width: 40px;
              height: 40px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .table th {
              background-color: #f8fafc;
              border-bottom: 2px solid #e2e8f0;
              font-weight: 600;
              color: #475569;
            }
            
            .form-control:focus {
              border-color: var(--bs-primary);
              box-shadow: 0 0 0 0.2rem rgba(56, 189, 248, 0.25);
            }
            
            .btn {
              border-radius: 0.5rem;
              font-weight: 500;
              padding: 0.5rem 1rem;
            }
            
            .btn-sm {
              padding: 0.25rem 0.75rem;
              font-size: 0.875rem;
            }
            
            .page-header {
              background: white;
              border-radius: 0.75rem;
              box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
              margin-bottom: 1.5rem;
            }
            
            .main-content {
              padding: 1.5rem;
              margin-left: 250px;
            }
            
            @media (max-width: 767.98px) {
              .main-content {
                margin-left: 0;
              }
            }
            
            .main-content-wrapper {
              margin-left: 250px;
              min-height: 100vh;
            }
            
            @media (max-width: 767.98px) {
              .main-content-wrapper {
                margin-left: 0;
              }
            }
            
            /* Custom Badge Styles */
            .badge {
              font-weight: 500;
              letter-spacing: 0.025em;
            }
            
            .bg-primary-subtle {
              background-color: rgba(56, 189, 248, 0.1) !important;
            }
            
            .bg-success-subtle {
              background-color: rgba(34, 197, 94, 0.1) !important;
            }
            
            .bg-danger-subtle {
              background-color: rgba(239, 68, 68, 0.1) !important;
            }
            
            .bg-warning-subtle {
              background-color: rgba(250, 204, 21, 0.1) !important;
            }
            
            .bg-info-subtle {
              background-color: rgba(14, 165, 233, 0.1) !important;
            }
            
            .bg-secondary-subtle {
              background-color: rgba(107, 114, 128, 0.1) !important;
            }
            
            /* Hover Effects */
            .card:hover {
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
              transition: box-shadow 0.2s ease-in-out;
            }
            
            .btn:hover {
              transform: translateY(-1px);
              transition: transform 0.2s ease-in-out;
            }
            
            /* Custom Scrollbar */
            ::-webkit-scrollbar {
              width: 8px;
            }
            
            ::-webkit-scrollbar-track {
              background: #f1f5f9;
            }
            
            ::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
            
            /* Loading Animation */
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            
            .pulse {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
          `
        }} />
      </head>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
