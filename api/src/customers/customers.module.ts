// customers/customers.module.ts
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}

// ─────────────────────────────────────────────────────────────────────────────
// customers/customers.service.ts
// (รวมไว้ในไฟล์เดียวเพื่อความสะดวก แยกออกได้ภายหลัง)
