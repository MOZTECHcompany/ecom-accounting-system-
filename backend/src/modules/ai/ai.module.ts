import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiInsightsService } from './ai-insights.service';
import { AiCopilotService } from './ai-copilot.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService, AiInsightsService, AiCopilotService],
  exports: [AiService, AiInsightsService, AiCopilotService],
})
export class AiModule {}
