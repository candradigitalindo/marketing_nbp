import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Redirect to login if not authenticated (except for login page)
    if (!token && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Redirect to dashboard if authenticated user tries to access login
    if (token && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Role-based access control
    if (token) {
      const userRole = token.role as string

      // SUPERADMIN access control
      if (pathname.startsWith("/outlets") && userRole !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }

      // API route protection
      if (pathname.startsWith("/api/outlets") && userRole !== "SUPERADMIN") {
        return NextResponse.json(
          { error: "Unauthorized - SUPERADMIN access required" },
          { status: 403 }
        )
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page without token
        if (req.nextUrl.pathname === "/login") {
          return true
        }
        // Require token for all other pages
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
}