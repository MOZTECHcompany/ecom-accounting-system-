#!/bin/bash

# 腳本用於快速生成模組骨架
# 使用方法: ./generate-module.sh <module-name>

MODULE_NAME=$1
MODULE_PATH="/workspaces/ecom-accounting-system-/backend/src/modules/$MODULE_NAME"

if [ -z "$MODULE_NAME" ]; then
  echo "請提供模組名稱"
  exit 1
fi

echo "正在生成模組: $MODULE_NAME ..."

# Controller
cat > "$MODULE_PATH/${MODULE_NAME}.controller.ts" << 'EOF'
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('MODULE_NAME')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('MODULE_NAME')
export class MODULE_NAMEController {
  constructor() {}

  @Get()
  @ApiOperation({ summary: 'List all MODULE_NAME' })
  async findAll() {
    return [];
  }
}
EOF

# Service
cat > "$MODULE_PATH/${MODULE_NAME}.service.ts" << 'EOF'
import { Injectable } from '@nestjs/common';

@Injectable()
export class MODULE_NAMEService {
  constructor() {}

  async findAll() {
    return [];
  }
}
EOF

# Repository
cat > "$MODULE_PATH/${MODULE_NAME}.repository.ts" << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MODULE_NAMERepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return [];
  }
}
EOF

# Module
cat > "$MODULE_PATH/${MODULE_NAME}.module.ts" << 'EOF'
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class MODULE_NAMEModule {}
EOF

echo "✅ 模組 $MODULE_NAME 生成完成"
