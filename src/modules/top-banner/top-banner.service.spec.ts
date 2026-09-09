import { Test, TestingModule } from '@nestjs/testing';
import { TopBannerService } from './top-banner.service.js';

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
});
