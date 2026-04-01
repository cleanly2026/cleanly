import { auth } from './auth'

export default auth((req) => {
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isAuthenticated = !!req.auth

  if (!isAuthenticated && !isAuthPage) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return Response.redirect(signInUrl)
  }
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
