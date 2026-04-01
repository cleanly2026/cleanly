import { LanguageToggle } from '@cleanly/ui'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-surface flex flex-col">
      {/* Top bar with language toggle — UI-SPEC: visible on ALL auth screens */}
      <header className="flex items-center justify-between px-md py-sm h-16">
        <div />
        <LanguageToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-md py-3xl">
        {children}
      </main>
    </div>
  )
}
