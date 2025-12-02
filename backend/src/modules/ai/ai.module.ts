import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Global() // Make it global so we don't have to import it everywhere
@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
