import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiModel {
  id: string;
  name: string;
  description?: string;
  isExperimental?: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  
  // Default supported models - this can be moved to DB later for full dynamic control
  private readonly supportedModels: AiModel[] = [
    { id: 'gemini-3.0-pro-exp', name: 'Gemini 3.0 Pro (Preview)', description: 'Latest & Most Capable', isExperimental: true },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fastest, multimodal', isExperimental: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Best for complex reasoning' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and cost-effective' },
  ];

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set. AI features will be disabled.');
    }
  }

  getAvailableModels(): AiModel[] {
    return this.supportedModels;
  }

  async generateContent(prompt: string, modelId: string = 'gemini-3.0-pro-exp'): Promise<string | null> {
    if (!this.apiKey) {
      this.logger.warn('Attempted to use AI without API Key');
      return null;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      return text || null;
    } catch (error) {
      this.logger.error(`AI Generation failed for model ${modelId}`, error);
      throw error;
    }
  }

  /**
   * Helper to parse JSON response from AI which might be wrapped in markdown code blocks
   */
  parseJsonOutput<T>(text: string): T | null {
    try {
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonString) as T;
    } catch (error) {
      this.logger.error('Failed to parse AI JSON output', error);
      return null;
    }
  }
}
