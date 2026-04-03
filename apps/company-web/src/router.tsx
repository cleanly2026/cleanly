import { Routes, Route, Navigate } from 'react-router'
import { OrderFeed } from './pages/OrderFeed'

// TODO: These will be real pages in gap closure or Phase 3+
function OnboardingPage() { return <div>Onboarding</div> }
function PackagesPage() { return <div>Packages — coming soon</div> }
function WashersPage() { return <div>Washers — coming soon</div> }

export function AppRoutes() {
  // In a real app, companyId comes from auth context.
  // For now, use a placeholder that the auth layer will provide.
  // The OrderFeed component needs a companyId prop.
  const companyId = 'TODO_FROM_AUTH'  // Will be replaced when auth context is wired

  return (
    <Routes>
      {/* Root redirects to /orders — the primary company dashboard view */}
      <Route path="/" element={<Navigate to="/orders" replace />} />
      <Route path="/orders" element={<OrderFeed companyId={companyId} />} />
      <Route path="/onboarding/*" element={<OnboardingPage />} />
      <Route path="/packages" element={<PackagesPage />} />
      <Route path="/washers" element={<WashersPage />} />
    </Routes>
  )
}
