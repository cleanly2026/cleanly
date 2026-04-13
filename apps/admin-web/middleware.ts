import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

// next-intl locale routing only — auth guard removed from middleware
// to avoid Edge Runtime 'eval' error with next-auth v4.
// Auth protection is handled in layout.tsx via getServerSession() instead.
const intlMiddleware = createMiddleware(routing)

export default intlMiddleware

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
