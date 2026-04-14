import { type NextAuthOptions } from 'next-auth'
import Google from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email ?? ''
      if (!email.endsWith('@cleanly.ae')) {
        console.warn(`[Auth] Rejected sign-in attempt from non-workspace email: ${email}`)
        return false
      }
      return true
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}
