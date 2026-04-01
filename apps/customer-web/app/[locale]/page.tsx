import { useTranslations } from 'next-intl'

export default function HomePage() {
  const t = useTranslations('common')
  // I18N-01: zero hardcoded strings — all strings via useTranslations
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <p className="text-heading font-semibold">{t('loading')}</p>
    </main>
  )
}
