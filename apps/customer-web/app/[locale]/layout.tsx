import '../globals.css'
import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/src/i18n/routing'
import { QueryProvider } from '@/src/providers/query-provider'

// I18N-05: display: 'swap' is mandatory for zero CLS
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo',
  weight: ['400', '600'], // Only the two weights we use (UI-SPEC)
})

export const metadata: Metadata = {
  title: 'Cleanly',
  description: 'Book cleaning services in the UAE',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }> // Next.js 16: params is a Promise
}) {
  // CRITICAL: await params — Pitfall 4 prevention (Next.js 16 async params)
  const { locale } = await params
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const messages = await getMessages()

  return (
    <html lang={locale} dir={dir} className={cairo.variable}>
      <body className="bg-brand-surface font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            {children}
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

// Generate static params for en and ar locales
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}
