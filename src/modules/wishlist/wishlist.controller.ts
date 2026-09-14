import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { PublicUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { WishlistService } from './wishlist.service.js';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findAll(@CurrentUser() user: PublicUser) {
    return this.wishlistService.findAll(user.id);
  }

  @Post(':productId')
  add(@CurrentUser() user: PublicUser, @Param('productId') productId: string) {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  remove(
    @CurrentUser() user: PublicUser,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.remove(user.id, productId);
  }
}
