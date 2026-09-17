import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { products } from '../../database/schema/products.schema.js';
import {
  promoProducts,
  promos,
} from '../../database/schema/promos.schema.js';
import type { CreatePromoDto } from './dto/create-promo.dto.js';
import type { UpdatePromoDto } from './dto/update-promo.dto.js';

export type PromoCartItem = {
  productId: string;
  price: number;
  quantity: number;
};

function toNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function normalizePromoCode(code: string) {
  return code.trim().toUpperCase();
}

@Injectable()
export class PromoService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async getPromoProductIds(promoId: string) {
    const rows = await this.db
      .select({ productId: promoProducts.productId })
      .from(promoProducts)
      .where(eq(promoProducts.promoId, promoId));

    return rows.map((row) => row.productId);
  }

  private mapPromoRow<
    T extends {
      discountValue: string;
      minPurchase: string;
    },
  >(promo: T) {
    return {
      ...promo,
      discountValue: toNumber(promo.discountValue),
      minPurchase: toNumber(promo.minPurchase),
    };
  }

  private async attachProducts<
    T extends {
      id: string;
      discountValue: string;
      minPurchase: string;
    },
  >(promo: T) {
    const productIds = await this.getPromoProductIds(promo.id);

    return {
      ...this.mapPromoRow(promo),
      productIds,
    };
  }

  private validatePromoPeriod(startsAt: Date, endsAt: Date) {
    if (startsAt >= endsAt) {
      throw new BadRequestException(
        'Tanggal berakhir promo harus setelah tanggal mulai',
      );
    }
  }

  private validateDiscountValue(
    discountType: 'percentage' | 'fixed',
    discountValue: number,
  ) {
    if (discountValue <= 0) {
      throw new BadRequestException('Nilai diskon harus lebih dari 0');
    }

    if (discountType === 'percentage' && discountValue > 100) {
      throw new BadRequestException('Diskon persentase maksimal 100%');
    }
  }

  private async ensureUniqueCode(code: string, excludePromoId?: string) {
    const normalizedCode = normalizePromoCode(code);

    const [existing] = await this.db
      .select({ id: promos.id })
      .from(promos)
      .where(eq(promos.code, normalizedCode))
      .limit(1);

    if (existing && existing.id !== excludePromoId) {
      throw new ConflictException('Kode promo sudah digunakan');
    }
  }

  private async ensureProductsExist(productIds: string[]) {
    if (!productIds.length) {
      return;
    }

    const rows = await this.db
      .select({ id: products.id })
      .from(products)
      .where(inArray(products.id, productIds));

    if (rows.length !== productIds.length) {
      throw new BadRequestException('Beberapa produk promo tidak ditemukan');
    }
  }

  private async replacePromoProducts(promoId: string, productIds?: string[]) {
    await this.db
      .delete(promoProducts)
      .where(eq(promoProducts.promoId, promoId));

    if (productIds?.length) {
      await this.db.insert(promoProducts).values(
        productIds.map((productId) => ({
          promoId,
          productId,
        })),
      );
    }
  }

  private calculateEligibleSubtotal(
    items: PromoCartItem[],
    eligibleProductIds: string[],
  ) {
    const appliesToAll = eligibleProductIds.length === 0;

    return items.reduce((total, item) => {
      if (appliesToAll || eligibleProductIds.includes(item.productId)) {
        return total + item.price * item.quantity;
      }

      return total;
    }, 0);
  }

  private calculateDiscountAmount(
    discountType: 'percentage' | 'fixed',
    discountValue: number,
    eligibleSubtotal: number,
  ) {
    if (eligibleSubtotal <= 0) {
      return 0;
    }

    if (discountType === 'percentage') {
      return Math.min(
        eligibleSubtotal,
        Math.floor((eligibleSubtotal * discountValue) / 100),
      );
    }

    return Math.min(discountValue, eligibleSubtotal);
  }

  async validateForCart(code: string, items: PromoCartItem[], subtotal: number) {
    const normalizedCode = normalizePromoCode(code);

    if (!normalizedCode) {
      throw new BadRequestException('Kode promo wajib diisi');
    }

    const [promo] = await this.db
      .select({
        id: promos.id,
        code: promos.code,
        name: promos.name,
        discountType: promos.discountType,
        discountValue: promos.discountValue,
        minPurchase: promos.minPurchase,
        startsAt: promos.startsAt,
        endsAt: promos.endsAt,
      })
      .from(promos)
      .where(eq(promos.code, normalizedCode))
      .limit(1);

    if (!promo) {
      throw new NotFoundException('Kode promo tidak ditemukan');
    }

    const now = new Date();

    if (now < promo.startsAt || now > promo.endsAt) {
      throw new BadRequestException('Kode promo tidak berlaku pada periode ini');
    }

    const minPurchase = toNumber(promo.minPurchase);

    if (subtotal < minPurchase) {
      throw new BadRequestException(
        `Minimal belanja untuk promo ini adalah Rp${minPurchase.toLocaleString('id-ID')}`,
      );
    }

    const eligibleProductIds = await this.getPromoProductIds(promo.id);
    const eligibleSubtotal = this.calculateEligibleSubtotal(
      items,
      eligibleProductIds,
    );

    if (eligibleSubtotal <= 0) {
      throw new BadRequestException(
        'Tidak ada produk eligible untuk kode promo ini',
      );
    }

    const discountAmount = this.calculateDiscountAmount(
      promo.discountType,
      toNumber(promo.discountValue),
      eligibleSubtotal,
    );

    if (discountAmount <= 0) {
      throw new BadRequestException('Kode promo tidak memberikan potongan harga');
    }

    return {
      promoId: promo.id,
      code: promo.code,
      name: promo.name,
      discountType: promo.discountType,
      discountValue: toNumber(promo.discountValue),
      minPurchase,
      eligibleSubtotal,
      discountAmount,
    };
  }

  async findAllAdmin() {
    const rows = await this.db
      .select({
        id: promos.id,
        code: promos.code,
        name: promos.name,
        discountType: promos.discountType,
        discountValue: promos.discountValue,
        minPurchase: promos.minPurchase,
        startsAt: promos.startsAt,
        endsAt: promos.endsAt,
        createdAt: promos.createdAt,
        updatedAt: promos.updatedAt,
      })
      .from(promos)
      .orderBy(asc(promos.startsAt));

    return Promise.all(rows.map((row) => this.attachProducts(row)));
  }

  async findOneAdmin(id: string) {
    const [promo] = await this.db
      .select({
        id: promos.id,
        code: promos.code,
        name: promos.name,
        discountType: promos.discountType,
        discountValue: promos.discountValue,
        minPurchase: promos.minPurchase,
        startsAt: promos.startsAt,
        endsAt: promos.endsAt,
        createdAt: promos.createdAt,
        updatedAt: promos.updatedAt,
      })
      .from(promos)
      .where(eq(promos.id, id))
      .limit(1);

    if (!promo) {
      throw new NotFoundException(`Promo #${id} not found`);
    }

    return this.attachProducts(promo);
  }

  async createAdmin(createPromoDto: CreatePromoDto) {
    const code = normalizePromoCode(createPromoDto.code);
    const startsAt = new Date(createPromoDto.startsAt);
    const endsAt = new Date(createPromoDto.endsAt);

    this.validatePromoPeriod(startsAt, endsAt);
    this.validateDiscountValue(
      createPromoDto.discountType,
      createPromoDto.discountValue,
    );
    await this.ensureUniqueCode(code);
    await this.ensureProductsExist(createPromoDto.productIds ?? []);

    const promoId = await this.db.transaction(async (tx) => {
      const [promo] = await tx
        .insert(promos)
        .values({
          code,
          name: createPromoDto.name.trim(),
          discountType: createPromoDto.discountType,
          discountValue: formatMoney(createPromoDto.discountValue),
          minPurchase: formatMoney(createPromoDto.minPurchase ?? 0),
          startsAt,
          endsAt,
        })
        .returning({ id: promos.id });

      if (createPromoDto.productIds?.length) {
        await tx.insert(promoProducts).values(
          createPromoDto.productIds.map((productId) => ({
            promoId: promo.id,
            productId,
          })),
        );
      }

      return promo.id;
    });

    return this.findOneAdmin(promoId);
  }

  async updateAdmin(id: string, updatePromoDto: UpdatePromoDto) {
    const existing = await this.findOneAdmin(id);

    const discountType = updatePromoDto.discountType ?? existing.discountType;
    const discountValue =
      updatePromoDto.discountValue ?? toNumber(existing.discountValue);
    const startsAt = updatePromoDto.startsAt
      ? new Date(updatePromoDto.startsAt)
      : existing.startsAt;
    const endsAt = updatePromoDto.endsAt
      ? new Date(updatePromoDto.endsAt)
      : existing.endsAt;

    this.validatePromoPeriod(startsAt, endsAt);
    this.validateDiscountValue(discountType, discountValue);

    if (updatePromoDto.code) {
      await this.ensureUniqueCode(updatePromoDto.code, id);
    }

    if (updatePromoDto.productIds) {
      await this.ensureProductsExist(updatePromoDto.productIds);
    }

    await this.db.transaction(async (tx) => {
      const [promo] = await tx
        .update(promos)
        .set({
          ...(updatePromoDto.code !== undefined && {
            code: normalizePromoCode(updatePromoDto.code),
          }),
          ...(updatePromoDto.name !== undefined && {
            name: updatePromoDto.name.trim(),
          }),
          ...(updatePromoDto.discountType !== undefined && {
            discountType: updatePromoDto.discountType,
          }),
          ...(updatePromoDto.discountValue !== undefined && {
            discountValue: formatMoney(updatePromoDto.discountValue),
          }),
          ...(updatePromoDto.minPurchase !== undefined && {
            minPurchase: formatMoney(updatePromoDto.minPurchase),
          }),
          ...(updatePromoDto.startsAt !== undefined && { startsAt }),
          ...(updatePromoDto.endsAt !== undefined && { endsAt }),
        })
        .where(eq(promos.id, id))
        .returning({ id: promos.id });

      if (!promo) {
        throw new NotFoundException(`Promo #${id} not found`);
      }

      if (updatePromoDto.productIds !== undefined) {
        await tx
          .delete(promoProducts)
          .where(eq(promoProducts.promoId, id));

        if (updatePromoDto.productIds.length) {
          await tx.insert(promoProducts).values(
            updatePromoDto.productIds.map((productId) => ({
              promoId: id,
              productId,
            })),
          );
        }
      }
    });

    return this.findOneAdmin(id);
  }

  async removeAdmin(id: string) {
    const [existing] = await this.db
      .select({ id: promos.id })
      .from(promos)
      .where(eq(promos.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Promo #${id} not found`);
    }

    await this.db.delete(promos).where(eq(promos.id, id));

    return { message: 'Promo berhasil dihapus' };
  }

  async findActivePromosForAdminStats() {
    const now = new Date();

    return this.db
      .select({ id: promos.id })
      .from(promos)
      .where(and(lte(promos.startsAt, now), gte(promos.endsAt, now)));
  }
}
