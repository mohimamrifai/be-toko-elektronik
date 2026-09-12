import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AddressController } from './address.controller.js';
import { AddressService } from './address.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
