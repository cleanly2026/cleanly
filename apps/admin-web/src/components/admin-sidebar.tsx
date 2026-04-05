'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

// Inline SVG icons to avoid lucide-react dependency
function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
  )
}

function IconShoppingCart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  )
}

function IconAlertTriangle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  )
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  )
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: IconDashboard, label: 'Dashboard', href: '' },
  { icon: IconBuilding, label: 'Companies', href: '/companies' },
  { icon: IconShoppingCart, label: 'Orders', href: '/orders' },
  { icon: IconAlertTriangle, label: 'Disputes', href: '/disputes' },
  { icon: IconMapPin, label: 'Cities / Categories', href: '/cities' },
  { icon: IconClipboard, label: 'Audit Log', href: '/audit-log' },
]

interface AdminSidebarProps {
  locale: string
}

export function AdminSidebar({ locale }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string): boolean {
    const fullPath = `/${locale}${href}`
    if (href === '') {
      return pathname === `/${locale}` || pathname === `/${locale}/`
    }
    return pathname.startsWith(fullPath)
  }

  const sidebarContent = (
    <nav className="flex flex-col h-full" aria-label="Admin navigation">
      <div className="px-lg py-lg border-b border-white/10">
        <span className="text-heading font-semibold text-brand-gold">Cleanly</span>
        <span className="block text-label text-white/60 mt-xs">Admin Panel</span>
      </div>
      <ul className="flex-1 py-sm">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          const href = `/${locale}${item.href}`
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={href}
                onClick={() => setMobileOpen(false)}
                className={[
                  'flex items-center gap-sm px-lg min-h-[44px] text-label transition-colors',
                  active
                    ? 'border-s-4 border-brand-gold bg-brand-gold/10 text-white font-semibold'
                    : 'border-s-4 border-transparent text-white/70 hover:bg-white/5 hover:text-white',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar — fixed, inset-inline-start: 0 for RTL support */}
      <aside
        className="hidden md:flex flex-col w-[240px] bg-brand-navy fixed top-0 bottom-0 z-40"
        style={{ insetInlineStart: 0 }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-4 z-50 bg-brand-navy text-white p-sm rounded-md"
        style={{ insetInlineStart: '16px' }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
      >
        <IconMenu className="w-5 h-5" />
      </button>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="relative w-[240px] bg-brand-navy flex flex-col"
            style={{ insetInlineStart: 0 }}
          >
            <button
              className="absolute top-4 text-white p-xs"
              style={{ insetInlineEnd: '16px' }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
            >
              <IconX className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
