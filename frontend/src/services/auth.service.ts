import api from './api'
import { LoginRequest, LoginResponse, User } from '../types'

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', data)
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token)
    }
    return response.data
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/users/me')
    return response.data
  },

  logout() {
    localStorage.removeItem('access_token')
  },

  getToken(): string | null {
    return localStorage.getItem('access_token')
  },
}
