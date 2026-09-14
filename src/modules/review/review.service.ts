import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  avg,
  count,
  desc,
  eq,
  inArray,
  sql,
} from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { orderItems, orders } from '../../database/schema/orders.schema.js';
import { products } from '../../database/schema/products.schema.js';
import { reviews } from '../../database/schema/reviews.schema.js';
import { users } from '../../database/schema/users.schema.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const ELIGIBLE_ORDER_STATUSES = [
  'paid',
  'processing',
  'shipped',
  'completed',
] as const;

export interface ProductReviewStats {
  avgRating: number;
  reviewCount: number;
}

function roundRating(value: number) {
  return Math.round(value * 10) / 10;
}

function mapReview(row: {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  userName: string;
  orderItemId: string | null;
}) {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt,
    userName: row.userName,
    isVerifiedBuyer: Boolean(row.orderItemId),
  };
}

@Injectable()
export class ReviewService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getStatsByProductIds(productIds: string[]) {
    if (productIds.length === 0) {
      return new Map<string, ProductReviewStats>();
    }

    const rows = await this.db
      .select({
        productId: reviews.productId,
        avgRating: avg(reviews.rating),
        reviewCount: count(),
      })
      .from(reviews)
      .where(inArray(reviews.productId, productIds))
      .groupBy(reviews.productId);

    return new Map(
      rows.map((row) => [
        row.productId,
        {
          avgRating: roundRating(Number(row.avgRating ?? 0)),
          reviewCount: Number(row.reviewCount),
        },
      ]),
    );
  }

  private async getProductBySlug(slug: string) {
    const [product] = await this.db
      .select({ id: products.id, slug: products.slug })
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }

    return product;
  }

  private async getProductById(productId: string) {
    const [product] = await this.db
      .select({ id: products.id, slug: products.slug })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }

    return product;
  }

  async findByProductSlug(slug: string, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
    const product = await this.getProductBySlug(slug);
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const offset = (safePage - 1) * safeLimit;

    const whereClause = eq(reviews.productId, product.id);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(reviews)
      .where(whereClause);

    const rows = await this.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        orderItemId: reviews.orderItemId,
        userName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(whereClause)
      .orderBy(desc(reviews.createdAt))
      .limit(safeLimit)
      .offset(offset);

    const stats = await this.getStatsByProductIds([product.id]);
    const productStats = stats.get(product.id) ?? {
      avgRating: 0,
      reviewCount: 0,
    };

    return {
      items: rows.map(mapReview),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
      summary: productStats,
    };
  }

  async getEligibility(userId: string, productId: string) {
    await this.getProductById(productId);

    const [existingReview] = await this.db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(eq(reviews.userId, userId), eq(reviews.productId, productId)),
      )
      .limit(1);

    if (existingReview) {
      return {
        canReview: false,
        eligibleOrderItems: [],
        hasReviewed: true,
      };
    }

    const purchasedItems = await this.db
      .select({
        id: orderItems.id,
        orderNumber: orders.orderNumber,
        productName: orderItems.productName,
        createdAt: orders.createdAt,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, userId),
          eq(orderItems.productId, productId),
          inArray(orders.status, [...ELIGIBLE_ORDER_STATUSES]),
        ),
      )
      .orderBy(desc(orders.createdAt));

    const reviewedOrderItemIds = await this.db
      .select({ orderItemId: reviews.orderItemId })
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          eq(reviews.productId, productId),
          sql`${reviews.orderItemId} IS NOT NULL`,
        ),
      );

    const reviewedIds = reviewedOrderItemIds
      .map((row) => row.orderItemId)
      .filter((id): id is string => Boolean(id));

    const eligibleOrderItems = purchasedItems.filter(
      (item) => !reviewedIds.includes(item.id),
    );

    return {
      canReview: eligibleOrderItems.length > 0,
      eligibleOrderItems,
      hasReviewed: false,
    };
  }

  private validateRating(rating: number) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating harus berupa angka bulat antara 1–5');
    }
  }

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    this.validateRating(dto.rating);

    const product = await this.getProductById(productId);

    const [existingReview] = await this.db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(eq(reviews.userId, userId), eq(reviews.productId, productId)),
      )
      .limit(1);

    if (existingReview) {
      throw new ConflictException('Anda sudah memberikan ulasan untuk produk ini');
    }

    const [orderItem] = await this.db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        orderUserId: orders.userId,
        orderStatus: orders.status,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orderItems.id, dto.orderItemId))
      .limit(1);

    if (!orderItem) {
      throw new NotFoundException('Item pesanan tidak ditemukan');
    }

    if (orderItem.orderUserId !== userId) {
      throw new ForbiddenException(
        'Item pesanan tidak termasuk dalam pesanan Anda',
      );
    }

    if (orderItem.productId !== product.id) {
      throw new BadRequestException(
        'Item pesanan tidak sesuai dengan produk yang diulas',
      );
    }

    if (
      !ELIGIBLE_ORDER_STATUSES.includes(
        orderItem.orderStatus as (typeof ELIGIBLE_ORDER_STATUSES)[number],
      )
    ) {
      throw new ForbiddenException(
        'Ulasan hanya dapat diberikan setelah pembayaran berhasil',
      );
    }

    const [created] = await this.db
      .insert(reviews)
      .values({
        productId: product.id,
        userId,
        orderItemId: dto.orderItemId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      })
      .returning({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        orderItemId: reviews.orderItemId,
      });

    const [user] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return mapReview({
      ...created,
      userName: user?.name ?? 'Pengguna',
    });
  }
}
