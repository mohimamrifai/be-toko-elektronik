import { Injectable } from '@nestjs/common';
import { CreateTopBannerDto } from './dto/create-top-banner.dto.js';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto.js';

@Injectable()
export class TopBannerService {
  create(createTopBannerDto: CreateTopBannerDto) {
    return 'This action adds a new topBanner';
  }

  findAll() {
    return [
      {
        id: '1',
        message: '🚀 Free shipping on orders over $50!',
        href: '/promo/free-shipping',
        // isActive: true,
        // startsAt: '2026-09-01T00:00:00.000Z',
        // endsAt: '2026-12-31T23:59:59.000Z',
      },
      {
        id: '2',
        message: '⚡ Flash Sale hingga 70% — hanya hari ini!',
        href: '/promo/flash-sale',
        // isActive: false,
        // startsAt: '2026-09-10T00:00:00.000Z',
        // endsAt: '2026-09-10T23:59:59.000Z',
      },
    ];
  }

  findOne(id: number) {
    return `This action returns a #${id} topBanner`;
  }

  update(id: number, updateTopBannerDto: UpdateTopBannerDto) {
    return `This action updates a #${id} topBanner`;
  }

  remove(id: number) {
    return `This action removes a #${id} topBanner`;
  }
}
