import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import { AuthProvider } from './contexts/AuthContext'
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          colorBgContainer: 'rgba(30, 30, 30, 0.6)',
          colorBgElevated: 'rgba(30, 30, 30, 0.9)',
          borderRadius: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 40,
          },
          Input: {
            controlHeight: 42,
            colorBgContainer: 'rgba(255, 255, 255, 0.05)',
            colorBorder: 'rgba(255, 255, 255, 0.1)',
          },
          Card: {
            colorBgContainer: 'rgba(30, 30, 30, 0.4)',
          },
          Menu: {
            colorBgContainer: 'transparent',
          }
        }
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="accounting/accounts" element={<AccountsPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
