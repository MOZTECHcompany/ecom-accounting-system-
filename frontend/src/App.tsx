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
import AccessControlPage from './pages/AccessControlPage'
import ArInvoicesPage from './pages/ArInvoicesPage'
import ApInvoicesPage from './pages/ApInvoicesPage'
import BankingPage from './pages/BankingPage'
import PayrollPage from './pages/PayrollPage'
import EmployeesPage from './pages/EmployeesPage'

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
                
                {/* New Module Routes */}
                <Route path="sales/invoices" element={<ArInvoicesPage />} />
                <Route path="purchasing/invoices" element={<ApInvoicesPage />} />
                <Route path="banking" element={<BankingPage />} />
                <Route path="payroll/runs" element={<PayrollPage />} />
                <Route path="payroll/employees" element={<EmployeesPage />} />
                <Route path="admin/access-control" element={<AccessControlPage />} />
                
                {/* Placeholder Routes */}
                <Route path="customers" element={<div className="p-4">Customers Page (Coming Soon)</div>} />
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
