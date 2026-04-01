import createMiddleware from 'next-intl/middleware'
import { auth } from './auth'
import { routing } from './src/i18n/routing'

const intlMiddleware = createMiddleware(routing)

// Chain next-intl locale routing with auth.js session guard
export default auth((req) => {
  const isAuthPage = req.nextUrl.pathname.startsWith('/en/auth') ||
    req.nextUrl.pathname.startsWith('/ar/auth')
  const isAuthenticated = !!req.auth

  if (!isAuthenticated && !isAuthPage) {
    const signInUrl = new URL('/en/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return Response.redirect(signInUrl)
  }

  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
