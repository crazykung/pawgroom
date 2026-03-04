#!/usr/bin/env bash
# =============================================================================
# สร้าง stub modules ที่เหลือทั้งหมด
# ใช้งาน: bash scripts/create-stubs.sh (จาก /opt/pawgroom/api/)
# =============================================================================

set -e

MODULES=(pets services resources appointments queue job-orders invoices compensation reports settings media users)

for MOD in "${MODULES[@]}"; do
  DIR="src/${MOD}"
  mkdir -p "$DIR/dto"

  # Module file
  cat > "$DIR/${MOD}.module.ts" << MODEOF
import { Module } from '@nestjs/common';
import { ${MOD^}Controller } from './${MOD}.controller';
import { ${MOD^}Service } from './${MOD}.service';

@Module({
  controllers: [${MOD^}Controller],
  providers: [${MOD^}Service],
  exports: [${MOD^}Service],
})
export class ${MOD^}Module {}
MODEOF

  # Service stub
  cat > "$DIR/${MOD}.service.ts" << SVCEOF
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ${MOD^}Service {
  constructor(private prisma: PrismaService) {}

  // TODO: implement methods
}
SVCEOF

  # Controller stub
  cat > "$DIR/${MOD}.controller.ts" << CTLEOF
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ${MOD^}Service } from './${MOD}.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('${MOD}')
@UseGuards(JwtAuthGuard)
export class ${MOD^}Controller {
  constructor(private ${MOD}Service: ${MOD^}Service) {}

  @Get()
  findAll() {
    return [];
  }
}
CTLEOF

  echo "✓ Created: $DIR"
done

echo ""
echo "✅ Stub modules สร้างแล้ว! ต่อไปให้ implement service logic ในแต่ละ module"
