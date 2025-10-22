import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        noHp: { label: 'Nomor Handphone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.noHp || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            noHp: credentials.noHp,
          },
          include: {
            outlet: true,
          },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email || null,
          noHp: user.noHp,
          name: user.name,
          role: user.role,
          outletId: user.outletId,
          outlet: user.outlet,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.noHp = user.noHp
        token.outletId = user.outletId
        token.outlet = user.outlet
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.noHp = token.noHp as string
        session.user.outletId = token.outletId as string | null
        session.user.outlet = token.outlet as any
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}