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
import { CreateReviewDto } from './dto/create-review.dto.js';
import { QueryReviewsDto } from './dto/query-reviews.dto.js';
import { ReviewService } from './review.service.js';

@Controller('products')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get(':slug/reviews')
  findByProductSlug(@Param('slug') slug: string, @Query() query: QueryReviewsDto) {
    return this.reviewService.findByProductSlug(
      slug,
      query.page ? Number(query.page) : undefined,
      query.limit ? Number(query.limit) : undefined,
    );
  }

  @Get(':productId/reviews/eligibility')
  @UseGuards(JwtAuthGuard)
  getEligibility(
    @CurrentUser() user: PublicUser,
    @Param('productId') productId: string,
  ) {
    return this.reviewService.getEligibility(user.id, productId);
  }

  @Post(':productId/reviews')
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: PublicUser,
    @Param('productId') productId: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewService.create(user.id, productId, createReviewDto);
  }
}
