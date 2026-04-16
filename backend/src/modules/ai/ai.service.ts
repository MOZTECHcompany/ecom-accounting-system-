import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiModel {
  id: string;
  name: string;
  description?: string;
  isExperimental?: boolean;
}

const DEFAULT_STANDARD_MODEL = 'gemini-2.5-flash';
const DEFAULT_DEEP_MODEL = 'gemini-2.5-pro';

const LEGACY_MODEL_ALIASES: Record<string, string> = {
  'gemini-1.5-flash': DEFAULT_STANDARD_MODEL,
  'gemini-1.5-pro': DEFAULT_DEEP_MODEL,
  'gemini-2.0-flash': DEFAULT_STANDARD_MODEL,
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;

  // Default supported models - this can be moved to DB later for full dynamic control
  private readonly supportedModels: AiModel[] = [
    {
      id: DEFAULT_STANDARD_MODEL,
      name: '標準模式',
      description: '速度較快，適合日常問答與建議',
    },
    {
      id: DEFAULT_DEEP_MODEL,
      name: '深度模式',
      description: '思考較深，適合分析與判斷',
    },
  ];

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set. AI features will be disabled.',
      );
    }
  }

  getAvailableModels(): AiModel[] {
    return this.supportedModels;
  }

  resolveModelId(modelId?: string): string {
    if (!modelId) {
      return DEFAULT_STANDARD_MODEL;
    }

    const normalizedModelId = LEGACY_MODEL_ALIASES[modelId] || modelId;
    const isSupportedModel = this.supportedModels.some(
      (model) => model.id === normalizedModelId,
    );

    if (!isSupportedModel) {
      this.logger.warn(
        `Unsupported Gemini model "${modelId}" requested. Falling back to ${DEFAULT_STANDARD_MODEL}.`,
      );
      return DEFAULT_STANDARD_MODEL;
    }

    if (normalizedModelId !== modelId) {
      this.logger.log(
        `Mapped legacy Gemini model "${modelId}" to "${normalizedModelId}".`,
      );
    }

    return normalizedModelId;
  }

  async generateContent(
    prompt: string,
    modelId?: string,
  ): Promise<string | null> {
    if (!this.apiKey) {
      this.logger.warn('Attempted to use AI without API Key');
      return null;
    }

    const resolvedModelId = this.resolveModelId(modelId);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModelId}:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        throw new Error(
          `AI API Error: ${response.status} ${response.statusText}${raw ? ` - ${raw}` : ''}`,
        );
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      return text || null;
    } catch (error) {
      this.logger.error(
        `AI Generation failed for model ${resolvedModelId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Helper to parse JSON response from AI which might be wrapped in markdown code blocks
   */
  parseJsonOutput<T>(text: string): T | null {
    try {
      const jsonString = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(jsonString) as T;
    } catch (error) {
      this.logger.error('Failed to parse AI JSON output', error);
      return null;
    }
  }
}
