import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ClaimService } from './claim.service.js';
import { CreateClaimDto } from './dto/create-claim.dto.js';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimController {
  constructor(private readonly claimService: ClaimService) {}

  @Get()
  findAll(
    @CurrentUser() user: PublicUser,
    @Query('orderId') orderId?: string,
  ) {
    return this.claimService.findAll(user.id, orderId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.claimService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() createClaimDto: CreateClaimDto) {
    return this.claimService.create(user.id, createClaimDto);
  }
}
