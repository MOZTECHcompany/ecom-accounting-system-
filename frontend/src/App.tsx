import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'
import SalesPage from './pages/SalesPage'
import ReportsPage from './pages/ReportsPage'
import VendorsPage from './pages/VendorsPage'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="accounting/accounts" element={<AccountsPage />} />
                <Route path="sales/orders" element={<SalesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="vendors" element={<VendorsPage />} />
                
                {/* Placeholder Routes for new sections */}
                <Route path="users" element={<div className="p-4">Users Page (Coming Soon)</div>} />
                <Route path="customers" element={<div className="p-4">Customers Page (Coming Soon)</div>} />
                <Route path="vendors" element={<VendorsPage />} />
                <Route path="sales" element={<div className="p-4">Sales Page (Coming Soon)</div>} />
                <Route path="expenses" element={<div className="p-4">Expenses Page (Coming Soon)</div>} />
                <Route path="payroll" element={<div className="p-4">Payroll Page (Coming Soon)</div>} />
                <Route path="banking" element={<div className="p-4">Banking Page (Coming Soon)</div>} />
                <Route path="import" element={<div className="p-4">Import Center (Coming Soon)</div>} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
