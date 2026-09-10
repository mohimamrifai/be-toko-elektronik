import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateTopBannerDto } from './dto/create-top-banner.dto.js';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto.js';
import { TopBannerService } from './top-banner.service.js';

@Controller('admin/top-banner')
export class AdminTopBannerController {
  constructor(private readonly topBannerService: TopBannerService) {}

  @Post()
  create(@Body() createTopBannerDto: CreateTopBannerDto) {
    return this.topBannerService.create(createTopBannerDto);
  }

  @Get()
  findAll() {
    return this.topBannerService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.topBannerService.findOneAdmin(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTopBannerDto: UpdateTopBannerDto,
  ) {
    return this.topBannerService.update(id, updateTopBannerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.topBannerService.remove(id);
  }
}
