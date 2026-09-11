import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { promoBanners } from '../../database/schema/promo-banners.schema.js';
import { CreatePromoBannerDto } from './dto/create-promo-banner.dto.js';
import { UpdatePromoBannerDto } from './dto/update-promo-banner.dto.js';

const publicPromoBannerFields = {
  id: promoBanners.id,
  title: promoBanners.title,
  subtitle: promoBanners.subtitle,
  buttonText: promoBanners.buttonText,
  href: promoBanners.href,
  imageUrl: promoBanners.imageUrl,
  badge: promoBanners.badge,
  sortOrder: promoBanners.sortOrder,
};

const adminPromoBannerFields = {
  id: promoBanners.id,
  title: promoBanners.title,
  subtitle: promoBanners.subtitle,
  buttonText: promoBanners.buttonText,
  href: promoBanners.href,
  imageUrl: promoBanners.imageUrl,
  badge: promoBanners.badge,
  sortOrder: promoBanners.sortOrder,
  isActive: promoBanners.isActive,
};

@Injectable()
export class PromoBannerService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAllPublic() {
    return this.db
      .select(publicPromoBannerFields)
      .from(promoBanners)
      .where(eq(promoBanners.isActive, true))
      .orderBy(asc(promoBanners.sortOrder));
  }

  async findOnePublic(id: string) {
    const [banner] = await this.db
      .select(publicPromoBannerFields)
      .from(promoBanners)
      .where(and(eq(promoBanners.id, id), eq(promoBanners.isActive, true)))
      .limit(1);

    if (!banner) {
      throw new NotFoundException(`Promo banner #${id} not found`);
    }

    return banner;
  }

  findAllAdmin() {
    return this.db
      .select(adminPromoBannerFields)
      .from(promoBanners)
      .orderBy(asc(promoBanners.sortOrder));
  }

  async findOneAdmin(id: string) {
    const [banner] = await this.db
      .select(adminPromoBannerFields)
      .from(promoBanners)
      .where(eq(promoBanners.id, id))
      .limit(1);

    if (!banner) {
      throw new NotFoundException(`Promo banner #${id} not found`);
    }

    return banner;
  }

  async create(createPromoBannerDto: CreatePromoBannerDto) {
    const [banner] = await this.db
      .insert(promoBanners)
      .values({
        title: createPromoBannerDto.title,
        subtitle: createPromoBannerDto.subtitle,
        buttonText: createPromoBannerDto.buttonText,
        href: createPromoBannerDto.href,
        imageUrl: createPromoBannerDto.imageUrl,
        badge: createPromoBannerDto.badge,
        isActive: createPromoBannerDto.isActive ?? true,
        sortOrder: createPromoBannerDto.sortOrder ?? 0,
      })
      .returning(adminPromoBannerFields);

    return banner;
  }

  async update(id: string, updatePromoBannerDto: UpdatePromoBannerDto) {
    const [banner] = await this.db
      .update(promoBanners)
      .set({
        ...(updatePromoBannerDto.title !== undefined && {
          title: updatePromoBannerDto.title,
        }),
        ...(updatePromoBannerDto.subtitle !== undefined && {
          subtitle: updatePromoBannerDto.subtitle,
        }),
        ...(updatePromoBannerDto.buttonText !== undefined && {
          buttonText: updatePromoBannerDto.buttonText,
        }),
        ...(updatePromoBannerDto.href !== undefined && {
          href: updatePromoBannerDto.href,
        }),
        ...(updatePromoBannerDto.imageUrl !== undefined && {
          imageUrl: updatePromoBannerDto.imageUrl,
        }),
        ...(updatePromoBannerDto.badge !== undefined && {
          badge: updatePromoBannerDto.badge,
        }),
        ...(updatePromoBannerDto.isActive !== undefined && {
          isActive: updatePromoBannerDto.isActive,
        }),
        ...(updatePromoBannerDto.sortOrder !== undefined && {
          sortOrder: updatePromoBannerDto.sortOrder,
        }),
      })
      .where(eq(promoBanners.id, id))
      .returning(adminPromoBannerFields);

    if (!banner) {
      throw new NotFoundException(`Promo banner #${id} not found`);
    }

    return banner;
  }

  async remove(id: string) {
    const [banner] = await this.db
      .delete(promoBanners)
      .where(eq(promoBanners.id, id))
      .returning(adminPromoBannerFields);

    if (!banner) {
      throw new NotFoundException(`Promo banner #${id} not found`);
    }

    return banner;
  }
}
