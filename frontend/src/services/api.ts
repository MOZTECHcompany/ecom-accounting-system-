import axios from 'axios'

// 根據環境自動選擇 baseURL
// 本地開發：使用 proxy (/api/v1)
// 正式環境：使用環境變數 (VITE_API_URL)
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim()
  if (envUrl) {
    return envUrl
  }
  if (import.meta.env.DEV) {
    return '/api/v1'
  }
  return 'https://ecom-accounting-backend.onrender.com/api/v1'
}

export const API_URL = getBaseURL()

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 請求攔截器：自動添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 回應攔截器：處理錯誤
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
