import api from './api'

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  category: string
  read: boolean
  data?: any
  createdAt: string
}

export const notificationService = {
  async getNotifications() {
    const { data } = await api.get<Notification[]>('/notifications')
    return data
  },

  async markAsRead(id: string) {
    await api.patch(`/notifications/${id}/read`)
  },

  async markAllAsRead() {
    await api.patch('/notifications/read-all')
  }
}
