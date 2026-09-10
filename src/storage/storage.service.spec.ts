import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service.js';

const { mockConfig, mockUploadStream, mockEnd } = vi.hoisted(() => {
  const mockEnd = vi.fn();
  const mockUploadStream = vi.fn(() => ({
    end: mockEnd,
  }));

  return {
    mockEnd,
    mockUploadStream,
    mockConfig: vi.fn(),
  };
});

vi.mock('cloudinary', () => ({
  v2: {
    config: mockConfig,
    uploader: {
      upload_stream: mockUploadStream,
    },
  },
}));

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              const values: Record<string, string> = {
                CLOUDINARY_CLOUD_NAME: 'test-cloud',
                CLOUDINARY_API_KEY: 'test-api-key',
                CLOUDINARY_API_SECRET: 'test-api-secret',
              };

              return values[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    mockUploadStream.mockClear();
    mockEnd.mockClear();
  });

  it('should upload image and return secure url', async () => {
    expect(mockConfig).toHaveBeenCalledWith({
      cloud_name: 'test-cloud',
      api_key: 'test-api-key',
      api_secret: 'test-api-secret',
    });
    const file = {
      originalname: 'promo.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image'),
    } as Express.Multer.File;

    mockUploadStream.mockImplementation((_options, callback) => {
      callback(null, {
        secure_url:
          'https://res.cloudinary.com/test-cloud/image/upload/v1/promo-sliders/promo.jpg',
      });

      return { end: mockEnd };
    });

    const url = await service.uploadImage(file, 'promo-sliders');

    expect(mockUploadStream).toHaveBeenCalledWith(
      {
        folder: 'promo-sliders',
        resource_type: 'image',
      },
      expect.any(Function),
    );
    expect(mockEnd).toHaveBeenCalledWith(file.buffer);
    expect(url).toBe(
      'https://res.cloudinary.com/test-cloud/image/upload/v1/promo-sliders/promo.jpg',
    );
  });

  it('should reject when cloudinary upload fails', async () => {
    const file = {
      originalname: 'promo.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image'),
    } as Express.Multer.File;

    mockUploadStream.mockImplementation((_options, callback) => {
      callback(new Error('Upload failed'), undefined);

      return { end: mockEnd };
    });

    await expect(service.uploadImage(file, 'promo-sliders')).rejects.toThrow(
      'Upload failed',
    );
  });
});
