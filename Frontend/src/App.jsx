import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import ProfileReviewPage from './pages/ProfileReviewPage';
import HomeHubPage from './pages/HomeHubPage';
import SwipeDiscoveryPage from './pages/SwipeDiscoveryPage';
import SavedJobsPage from './pages/SavedJobsPage';
import CareerCopilotPage from './pages/CareerCopilotPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthRoute from './components/AuthRoute';

const WorkspaceLayout = ({ children }) => (
  <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
    <Sidebar />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <main style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  </div>
);

function App() {
  return (
    <Routes>
      {/* Public Pages - Redirected to /home if logged in */}
      <Route path="/" element={<AuthRoute><LandingPage /></AuthRoute>} />
      <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
      
      {/* Workspace Pages - Redirected to /auth if not logged in */}
      <Route path="/onboarding" element={<ProtectedRoute><WorkspaceLayout><OnboardingPage /></WorkspaceLayout></ProtectedRoute>} />
      <Route path="/profile-review" element={<ProtectedRoute><WorkspaceLayout><ProfileReviewPage /></WorkspaceLayout></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute><WorkspaceLayout><HomeHubPage /></WorkspaceLayout></ProtectedRoute>} />
      <Route path="/swipe" element={<ProtectedRoute><WorkspaceLayout><SwipeDiscoveryPage /></WorkspaceLayout></ProtectedRoute>} />
      <Route path="/saved-jobs" element={<ProtectedRoute><WorkspaceLayout><SavedJobsPage /></WorkspaceLayout></ProtectedRoute>} />
      <Route path="/copilot" element={<ProtectedRoute><WorkspaceLayout><CareerCopilotPage /></WorkspaceLayout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><WorkspaceLayout><DashboardPage /></WorkspaceLayout></ProtectedRoute>} />
    </Routes>
  )
}

export default App
