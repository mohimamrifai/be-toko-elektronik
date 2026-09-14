import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClaimController } from './claim.controller.js';
import { ClaimService } from './claim.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ClaimController],
  providers: [ClaimService],
  exports: [ClaimService],
})
export class ClaimModule {}
