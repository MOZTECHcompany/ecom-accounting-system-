import React, { createContext, useContext, useState, useEffect } from 'react'
import { ConfigProvider, theme } from 'antd'

type ThemeMode = 'light' | 'dark'
type PrimaryColor = 'blue' | 'purple' | 'green' | 'orange' | 'black'

interface ThemeContextType {
  mode: ThemeMode
  toggleMode: () => void
  primaryColor: PrimaryColor
  setPrimaryColor: (color: PrimaryColor) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

const COLOR_MAP = {
  blue: '#1677ff',
  purple: '#722ed1',
  green: '#52c41a',
  orange: '#fa8c16',
  black: '#000000',
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [primaryColor, setPrimaryColor] = useState<PrimaryColor>('black')

  useEffect(() => {
    // Apply dark mode class to body
    if (mode === 'dark') {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
  }, [mode])

  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, primaryColor, setPrimaryColor }}>
      <ConfigProvider
        theme={{
          algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: COLOR_MAP[primaryColor],
            borderRadius: 16,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          },
          components: {
            Button: {
              controlHeight: 40,
              borderRadius: 12,
            },
            Card: {
              borderRadiusLG: 24,
            },
            Input: {
              controlHeight: 42,
              borderRadius: 12,
            },
            Select: {
              controlHeight: 42,
              borderRadius: 12,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
