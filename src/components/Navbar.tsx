'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { href: '/outlets', label: 'Outlets', icon: 'fas fa-store', roles: ['SUPERADMIN', 'ADMIN'] },
    { href: '/customers', label: 'Customers', icon: 'fas fa-users' },
    { href: '/users', label: 'Pengguna', icon: 'fas fa-users-cog', roles: ['SUPERADMIN'] },
  ]

  const hasAccess = (roles?: string[]) => {
    if (!roles) return true
    if (!session?.user?.role) return false
    return roles.includes(session.user.role)
  }

  if (!session) return null

  return (
    <div className="sidebar d-flex flex-column p-3">
      {/* Logo */}
      <div className="mb-4">
        <h4 className="text-white fw-bold">
          <i className="fas fa-paper-plane me-2"></i>
          Marketing NBP
        </h4>
        <small className="text-white-50">WhatsApp Marketing System</small>
      </div>

      {/* Navigation Menu */}
      <nav className="nav nav-pills flex-column mb-auto">
        {menuItems.map((item) => (
          hasAccess(item.roles) && (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            >
              <i className={`${item.icon} me-2`}></i>
              {item.label}
            </Link>
          )
        ))}
      </nav>

      {/* Logout Button */}
      <div className="mt-auto">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="btn btn-outline-light w-100"
        >
          <i className="fas fa-sign-out-alt me-2"></i>
          Logout
        </button>
      </div>
    </div>
  )
}