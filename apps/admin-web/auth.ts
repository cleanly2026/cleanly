import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // AUTH-06: Restrict to Cleanly Google Workspace domain ONLY
      const email = profile?.email ?? ''
      if (!email.endsWith('@cleanly.ae')) {
        console.warn(`[Auth] Rejected sign-in attempt from non-workspace email: ${email}`)
        return false
      }
      return true
    },
    async session({ session }) {
      // Attach the exchange token so admin-web can call Fastify API
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})
