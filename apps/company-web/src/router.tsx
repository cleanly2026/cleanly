import { Routes, Route, Navigate } from 'react-router'
import { OrderFeed } from './pages/OrderFeed'
import { useAuth } from './lib/auth-context'

// TODO: These will be real pages in gap closure or Phase 3+
function OnboardingPage() { return <div>Onboarding</div> }
function PackagesPage() { return <div>Packages — coming soon</div> }
function WashersPage() { return <div>Washers — coming soon</div> }

export function AppRoutes() {
  const { companyId } = useAuth()

  return (
    <Routes>
      {/* Root redirects to /orders — the primary company dashboard view */}
      <Route path="/" element={<Navigate to="/orders" replace />} />
      <Route path="/orders" element={<OrderFeed companyId={companyId!} />} />
      <Route path="/onboarding/*" element={<OnboardingPage />} />
      <Route path="/packages" element={<PackagesPage />} />
      <Route path="/washers" element={<WashersPage />} />
    </Routes>
  )
}
