import { Test, TestingModule } from '@nestjs/testing';
import { TopBannerController } from './top-banner.controller.js';
import { TopBannerService } from './top-banner.service.js';

describe('TopBannerController', () => {
  let controller: TopBannerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TopBannerController],
      providers: [TopBannerService],
    }).compile();

    controller = module.get<TopBannerController>(TopBannerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
