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
}
