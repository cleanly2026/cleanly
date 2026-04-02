import { Routes, Route } from 'react-router'

// Placeholder pages — actual implementations in later plans
function DashboardPage() { return <div>Dashboard</div> }
function OnboardingPage() { return <div>Onboarding</div> }

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/onboarding/*" element={<OnboardingPage />} />
      <Route path="/packages" element={<div>Packages</div>} />
      <Route path="/washers" element={<div>Washers</div>} />
    </Routes>
  )
}
