import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { claims } from '../../database/schema/claims.schema.js';
import { orderItems, orders } from '../../database/schema/orders.schema.js';
import { products } from '../../database/schema/products.schema.js';
import type { CreateClaimDto } from './dto/create-claim.dto.js';

const ELIGIBLE_ORDER_STATUSES = [
  'paid',
  'processing',
  'shipped',
  'completed',
] as const;

const ACTIVE_CLAIM_STATUSES = ['submitted', 'reviewing', 'approved'] as const;

function mapClaim(row: {
  id: string;
  orderItemId: string;
  userId: string;
  type: 'warranty' | 'return';
  reason: string;
  proofImageUrl: string | null;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
}) {
  return {
    id: row.id,
    orderItemId: row.orderItemId,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    productId: row.productId,
    productName: row.productName,
    productSlug: row.productSlug,
    quantity: row.quantity,
    type: row.type,
    reason: row.reason,
    proofImageUrl: row.proofImageUrl,
    status: row.status,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class ClaimService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async fetchClaimRows(userId: string, claimId?: string) {
    const conditions = [eq(claims.userId, userId)];

    if (claimId) {
      conditions.push(eq(claims.id, claimId));
    }

    return this.db
      .select({
        id: claims.id,
        orderItemId: claims.orderItemId,
        userId: claims.userId,
        type: claims.type,
        reason: claims.reason,
        proofImageUrl: claims.proofImageUrl,
        status: claims.status,
        createdAt: claims.createdAt,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        productId: orderItems.productId,
        productName: orderItems.productName,
        productSlug: products.slug,
        quantity: orderItems.quantity,
      })
      .from(claims)
      .innerJoin(orderItems, eq(claims.orderItemId, orderItems.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(claims.createdAt));
  }

  async findAll(userId: string, orderId?: string) {
    const rows = await this.fetchClaimRows(userId);

    if (!orderId) {
      return rows.map(mapClaim);
    }

    return rows.filter((row) => row.orderId === orderId).map(mapClaim);
  }

  async findOne(userId: string, claimId: string) {
    const [row] = await this.fetchClaimRows(userId, claimId);

    if (!row) {
      throw new NotFoundException('Klaim tidak ditemukan');
    }

    return mapClaim(row);
  }

  async create(userId: string, dto: CreateClaimDto) {
    const reason = dto.reason?.trim();

    if (!reason) {
      throw new BadRequestException('Alasan klaim wajib diisi');
    }

    if (dto.type !== 'warranty' && dto.type !== 'return') {
      throw new BadRequestException('Tipe klaim tidak valid');
    }

    const [orderItem] = await this.db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderUserId: orders.userId,
        orderStatus: orders.status,
        productSlug: products.slug,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
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

    if (
      !ELIGIBLE_ORDER_STATUSES.includes(
        orderItem.orderStatus as (typeof ELIGIBLE_ORDER_STATUSES)[number],
      )
    ) {
      throw new ForbiddenException(
        'Klaim hanya dapat diajukan untuk pesanan yang sudah dibayar',
      );
    }

    const existingClaims = await this.db
      .select({ status: claims.status })
      .from(claims)
      .where(eq(claims.orderItemId, dto.orderItemId));

    const hasActiveClaim = existingClaims.some((claim) =>
      ACTIVE_CLAIM_STATUSES.includes(
        claim.status as (typeof ACTIVE_CLAIM_STATUSES)[number],
      ),
    );

    if (hasActiveClaim) {
      throw new ConflictException(
        'Item pesanan ini masih memiliki klaim yang sedang diproses',
      );
    }

    const [created] = await this.db
      .insert(claims)
      .values({
        orderItemId: dto.orderItemId,
        userId,
        type: dto.type,
        reason,
        proofImageUrl: dto.proofImageUrl?.trim() || null,
        status: 'submitted',
      })
      .returning({
        id: claims.id,
        orderItemId: claims.orderItemId,
        userId: claims.userId,
        type: claims.type,
        reason: claims.reason,
        proofImageUrl: claims.proofImageUrl,
        status: claims.status,
        createdAt: claims.createdAt,
      });

    return mapClaim({
      ...created,
      orderId: orderItem.orderId,
      orderNumber: orderItem.orderNumber,
      productId: orderItem.productId,
      productName: orderItem.productName,
      productSlug: orderItem.productSlug,
      quantity: orderItem.quantity,
    });
  }

  async getActiveClaimOrderItemIds(orderItemIds: string[]) {
    if (orderItemIds.length === 0) {
      return new Set<string>();
    }

    const rows = await this.db
      .select({
        orderItemId: claims.orderItemId,
        status: claims.status,
      })
      .from(claims)
      .where(inArray(claims.orderItemId, orderItemIds));

    return new Set(
      rows
        .filter((row) =>
          ACTIVE_CLAIM_STATUSES.includes(
            row.status as (typeof ACTIVE_CLAIM_STATUSES)[number],
          ),
        )
        .map((row) => row.orderItemId),
    );
  }
}
