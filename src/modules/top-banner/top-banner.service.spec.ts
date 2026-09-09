import { Test, TestingModule } from '@nestjs/testing';
import { TopBannerService } from './top-banner.service.js';
import { CreateTopBannerDto } from './dto/create-top-banner.dto.js';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto.js';

describe('TopBannerService', () => {
  let service: TopBannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TopBannerService],
    }).compile();

    service = module.get<TopBannerService>(TopBannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should return create message', () => {
      const dto: CreateTopBannerDto = {};

      expect(service.create(dto)).toBe('This action adds a new topBanner');
    });
  });

  describe('findAll', () => {
    it('should return list of top banners', () => {
      const result = service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        message: '🚀 Free shipping on orders over $50!',
        href: '/promo/free-shipping',
      });
      expect(result[1]).toEqual({
        id: '2',
        message: '⚡ Flash Sale hingga 70% — hanya hari ini!',
        href: '/promo/flash-sale',
      });
    });
  });

  describe('findOne', () => {
    it('should return find one message with id', () => {
      expect(service.findOne(1)).toBe('This action returns a #1 topBanner');
    });
  });

  describe('update', () => {
    it('should return update message with id', () => {
      const dto: UpdateTopBannerDto = {};

      expect(service.update(5, dto)).toBe('This action updates a #5 topBanner');
    });
  });

  describe('remove', () => {
    it('should return remove message with id', () => {
      expect(service.remove(7)).toBe('This action removes a #7 topBanner');
    });
  });
});
