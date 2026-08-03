import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import { ToastHost } from './components/ui'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CertificateFormPage from './pages/CertificateFormPage'
import CertificatesPage from './pages/CertificatesPage'
import CertificateDetailPage from './pages/CertificateDetailPage'
import PrintCertificatePage from './pages/PrintCertificatePage'
import SearchPage from './pages/SearchPage'
import TemplatesPage from './pages/TemplatesPage'
import PrintHistoryPage from './pages/PrintHistoryPage'
import SettingsPage from './pages/SettingsPage'
import BackupPage from './pages/BackupPage'
import ReportsPage from './pages/ReportsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastHost />
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="certificates" element={<CertificatesPage />} />
              <Route path="certificates/new" element={<DashboardPage />} />
              <Route path="new-certificate" element={<DashboardPage />} />
              <Route path="certificates/:id" element={<CertificateDetailPage />} />
              <Route path="certificates/:id/edit" element={<CertificateFormPage />} />
              <Route path="certificates/:id/print" element={<PrintCertificatePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="print-history" element={<PrintHistoryPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="backup" element={<BackupPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
