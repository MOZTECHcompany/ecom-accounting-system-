import React, { useState, useEffect } from 'react'
import { Card, Typography, Button, Steps, QRCode, Input, message, Spin, Divider, Tag } from 'antd'
import { motion } from 'framer-motion'
import { SafetyCertificateOutlined, CheckCircleOutlined, LockOutlined } from '@ant-design/icons'
import { authService } from '../services/auth.service'

const { Title, Text } = Typography
const { Step } = Steps

const ProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null)
  const [token, setToken] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const userData = await authService.getCurrentUser()
      setUser(userData)
      // Check if user has 2FA enabled based on backend data (if available in user object)
      // Currently backend mapManagedUserToUser doesn't mapping is_two_factor_enabled
      // but let's assume valid setup flow is available.
    } catch (error) {
       // ignore
    }
  }

  const handleStartSetup = async () => {
    setLoading(true)
    try {
      const data = await authService.get2FASetup()
      setSetupData(data)
      setCurrentStep(1)
    } catch (error) {
      message.error('Failed to initiate 2FA setup')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!setupData || !token) return
    setLoading(true)
    try {
      await authService.enable2FA(token, setupData.secret)
      message.success('Two-Factor Authentication Enabled Successfully!')
      setCurrentStep(2)
    } catch (error) {
      message.error('Invalid Verification Code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Title level={2} className="!mb-1 !font-light">
        My Profile
      </Title>
      
      <Card title={<span><SafetyCertificateOutlined /> Security Settings</span>}>
        <div className="max-w-xl mx-auto">
          <Title level={4}>Two-Factor Authentication (2FA)</Title>
          <Text type="secondary">
            Protect your account with an extra layer of security.
          </Text>
          
          <Divider />

          {currentStep === 2 ? (
             <div className="text-center py-8">
                <CheckCircleOutlined className="text-6xl text-green-500 mb-4" />
                <Title level={3}>2FA is Active</Title>
                <Text>Your account is now secured.</Text>
             </div>
          ) : (
            <>
              <Steps current={currentStep} className="mb-8">
                <Step title="Start" description="Initiate Setup" />
                <Step title="Scan" description="Scan QR Code" />
                <Step title="Verify" description="Enter Code" />
              </Steps>

              {currentStep === 0 && (
                <div className="text-center">
                   <LockOutlined className="text-6xl text-blue-500 mb-4" />
                   <div className="mb-4">
                     <Text>Click the button below to set up 2FA using Google Authenticator or similar apps.</Text>
                   </div>
                   <Button type="primary" onClick={handleStartSetup} loading={loading}>
                     Setup 2FA
                   </Button>
                </div>
              )}

              {currentStep === 1 && setupData && (
                <div className="flex flex-col items-center space-y-6">
                  <div className="p-4 border rounded bg-white">
                    <QRCode value={setupData.otpauthUrl} size={200} />
                  </div>
                  <div className="text-center">
                    <Text strong>Scan this QR Code with your Authenticator App</Text>
                    <br />
                    <Text type="secondary" copyable>{setupData.secret}</Text>
                  </div>
                  
                  <div className="w-full max-w-xs">
                    <Input.OTP 
                      length={6} 
                      value={token} 
                      onChange={(val) => setToken(val)} 
                      size="large"
                    />
                    <Button 
                      type="primary" 
                      block 
                      className="mt-4" 
                      onClick={handleVerify} 
                      loading={loading}
                      disabled={token.length !== 6}
                    >
                      Verify & Enable
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

export default ProfilePage
