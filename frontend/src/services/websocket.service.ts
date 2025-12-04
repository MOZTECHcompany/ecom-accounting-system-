import { io, Socket } from 'socket.io-client'
import { authService } from './auth.service'
import { Notification } from './notification.service'

class WebSocketService {
  private socket: Socket | null = null
  private listeners: ((notification: Notification) => void)[] = []

  connect() {
    const token = authService.getToken()
    if (!token) return

    // Assuming backend is on the same host/port or configured via env
    // For dev: http://localhost:3000
    const url = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    
    this.socket = io(url, {
      auth: {
        token: `Bearer ${token}`
      },
      transports: ['websocket']
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
    })

    this.socket.on('notification', (notification: Notification) => {
      this.notifyListeners(notification)
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  subscribe(callback: (notification: Notification) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  private notifyListeners(notification: Notification) {
    this.listeners.forEach(listener => listener(notification))
  }
}

export const webSocketService = new WebSocketService()
