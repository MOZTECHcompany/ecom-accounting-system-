import api from './api'

export interface AiModel {
  id: string
  name: string
  description?: string
  isExperimental?: boolean
}

export const aiService = {
  async getAvailableModels() {
    const response = await api.get<AiModel[]>('/ai/models')
    return response.data
  },

  async getDailyBriefing(entityId: string, modelId?: string) {
    const response = await api.post<{ insight: string }>('/ai/insights/daily-briefing', {
      entityId,
      modelId,
    })
    return response.data
  },

  async chat(message: string, entityId: string, modelId?: string) {
    const response = await api.post<{ reply: string; data?: any }>('/ai/copilot/chat', {
      message,
      entityId,
      modelId,
    })
    return response.data
  },
}
