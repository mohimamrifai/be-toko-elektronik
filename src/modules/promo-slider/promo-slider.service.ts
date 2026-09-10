import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { promoSliders } from '../../database/schema/promo-sliders.schema.js';
import { CreatePromoSliderDto } from './dto/create-promo-slider.dto.js';
import { UpdatePromoSliderDto } from './dto/update-promo-slider.dto.js';

const publicPromoSliderFields = {
  id: promoSliders.id,
  title: promoSliders.title,
  imageUrl: promoSliders.imageUrl,
  href: promoSliders.href,
};

const adminPromoSliderFields = {
  id: promoSliders.id,
  title: promoSliders.title,
  imageUrl: promoSliders.imageUrl,
  href: promoSliders.href,
  isActive: promoSliders.isActive,
  sortOrder: promoSliders.sortOrder,
  startsAt: promoSliders.startsAt,
  endsAt: promoSliders.endsAt,
  createdAt: promoSliders.createdAt,
  updatedAt: promoSliders.updatedAt,
};

@Injectable()
export class PromoSliderService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAllPublic() {
    return this.db
      .select(publicPromoSliderFields)
      .from(promoSliders)
      .where(eq(promoSliders.isActive, true))
      .orderBy(asc(promoSliders.sortOrder));
  }

  async findOnePublic(id: string) {
    const [slider] = await this.db
      .select(publicPromoSliderFields)
      .from(promoSliders)
      .where(and(eq(promoSliders.id, id), eq(promoSliders.isActive, true)))
      .limit(1);

    if (!slider) {
      throw new NotFoundException(`Promo slider #${id} not found`);
    }

    return slider;
  }

  findAllAdmin() {
    return this.db
      .select(adminPromoSliderFields)
      .from(promoSliders)
      .orderBy(asc(promoSliders.sortOrder));
  }

  async findOneAdmin(id: string) {
    const [slider] = await this.db
      .select(adminPromoSliderFields)
      .from(promoSliders)
      .where(eq(promoSliders.id, id))
      .limit(1);

    if (!slider) {
      throw new NotFoundException(`Promo slider #${id} not found`);
    }

    return slider;
  }

  async create(createPromoSliderDto: CreatePromoSliderDto) {
    const [slider] = await this.db
      .insert(promoSliders)
      .values({
        title: createPromoSliderDto.title,
        imageUrl: createPromoSliderDto.imageUrl,
        href: createPromoSliderDto.href,
        isActive: createPromoSliderDto.isActive ?? true,
        sortOrder: createPromoSliderDto.sortOrder ?? 0,
        startsAt: createPromoSliderDto.startsAt
          ? new Date(createPromoSliderDto.startsAt)
          : undefined,
        endsAt: createPromoSliderDto.endsAt
          ? new Date(createPromoSliderDto.endsAt)
          : undefined,
      })
      .returning(adminPromoSliderFields);

    return slider;
  }

  async update(id: string, updatePromoSliderDto: UpdatePromoSliderDto) {
    const [slider] = await this.db
      .update(promoSliders)
      .set({
        ...(updatePromoSliderDto.title !== undefined && {
          title: updatePromoSliderDto.title,
        }),
        ...(updatePromoSliderDto.imageUrl !== undefined && {
          imageUrl: updatePromoSliderDto.imageUrl,
        }),
        ...(updatePromoSliderDto.href !== undefined && {
          href: updatePromoSliderDto.href,
        }),
        ...(updatePromoSliderDto.isActive !== undefined && {
          isActive: updatePromoSliderDto.isActive,
        }),
        ...(updatePromoSliderDto.sortOrder !== undefined && {
          sortOrder: updatePromoSliderDto.sortOrder,
        }),
        ...(updatePromoSliderDto.startsAt !== undefined && {
          startsAt: updatePromoSliderDto.startsAt
            ? new Date(updatePromoSliderDto.startsAt)
            : null,
        }),
        ...(updatePromoSliderDto.endsAt !== undefined && {
          endsAt: updatePromoSliderDto.endsAt
            ? new Date(updatePromoSliderDto.endsAt)
            : null,
        }),
      })
      .where(eq(promoSliders.id, id))
      .returning(adminPromoSliderFields);

    if (!slider) {
      throw new NotFoundException(`Promo slider #${id} not found`);
    }

    return slider;
  }

  async remove(id: string) {
    const [slider] = await this.db
      .delete(promoSliders)
      .where(eq(promoSliders.id, id))
      .returning(adminPromoSliderFields);

    if (!slider) {
      throw new NotFoundException(`Promo slider #${id} not found`);
    }

    return slider;
  }
}
