import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService, AiModel } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('AI Core')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('models')
  @ApiOperation({ summary: '取得可用 AI 模型列表' })
  @ApiResponse({ status: 200, description: '成功取得模型列表' })
  getModels(): AiModel[] {
    return this.aiService.getAvailableModels();
  }
}
