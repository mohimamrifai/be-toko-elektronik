import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller.js';
import { StorageService } from './storage.service.js';

describe('StorageController', () => {
  let controller: StorageController;
  let service: StorageService;

  const mockStorageService = {
    uploadImage: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    controller = module.get<StorageController>(StorageController);
    service = module.get<StorageService>(StorageService);
    vi.clearAllMocks();
  });

  it('should upload file and return url', async () => {
    const file = {
      originalname: 'promo.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image'),
    } as Express.Multer.File;

    mockStorageService.uploadImage.mockResolvedValue(
      'https://res.cloudinary.com/test-cloud/image/upload/v1/promo-sliders/test.jpg',
    );

    const result = await controller.upload(file);

    expect(service.uploadImage).toHaveBeenCalledWith(file, 'promo-sliders');
    expect(result).toEqual({
      url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/promo-sliders/test.jpg',
    });
  });
});
