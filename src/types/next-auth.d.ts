import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    id: string
    email: string | null
    name: string
    noHp: string
    role: string
    outletId: string | null
    outlet?: {
      id: string
      namaOutlet: string
      alamat: string
      whatsappNumber: string
    } | null
  }

  interface Session {
    user: {
      id: string
      email: string | null
      name: string
      noHp: string
      role: string
      outletId: string | null
      outlet?: {
        id: string
        namaOutlet: string
        alamat: string
        whatsappNumber: string
      } | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    noHp?: string
    outletId?: string | null
    outlet?: {
      id: string
      namaOutlet: string
      alamat: string
      whatsappNumber: string
    } | null
  }
}