import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  // `withAuth` akan memperkaya `req` dengan `token` jika pengguna sudah login
  function middleware(req) {
    const { token } = req.nextauth
    const { pathname } = req.nextUrl

    // Rute yang dilindungi dan role yang diizinkan
    const roleBasedRoutes: Record<string, string[]> = {
      '/users': ['SUPERADMIN'],
      // '/outlets' tidak lagi di sini, karena sekarang dapat diakses oleh semua role yang login.
      // Logika untuk menampilkan data di halaman /outlets sudah diatur di API dan komponen halaman.
    }

    // Temukan rute yang cocok dengan path saat ini
    const protectedPath = Object.keys(roleBasedRoutes).find((p) =>
      pathname.startsWith(p)
    )

    if (protectedPath) {
      const requiredRoles = roleBasedRoutes[protectedPath]
      const userRole = token?.role as string

      // Jika role pengguna tidak termasuk dalam role yang diizinkan, alihkan ke dashboard
      if (!userRole || !requiredRoles.includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Jika tidak ada aturan yang dilanggar, lanjutkan permintaan
    return NextResponse.next()
  },
  {
    callbacks: {
      // Callback ini memastikan middleware hanya berjalan jika pengguna sudah terotentikasi
      authorized: ({ token }) => !!token,
    },
  }
)

// Tentukan rute mana yang akan dilindungi oleh middleware
export const config = {
  matcher: ['/dashboard/:path*', '/outlets/:path*', '/customers/:path*', '/users/:path*', '/blast/:path*'],
}