import { Controller, Get, Header, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { LandingPageService } from '../services/landing-page.service';

@Controller('public')
export class PublicLandingPageController {
  constructor(private readonly service: LandingPageService) {}

  @Get('landing-page')
  @Header('Cache-Control', 'public, max-age=60, stale-if-error=86400')
  landingPage() { return this.service.publicPage(); }

  @Get('media/:assetId')
  async media(@Param('assetId') id: string, @Res({ passthrough: true }) response: Response) {
    const asset = await this.service.publicMedia(id);
    if (!asset) throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media asset not found.', details: null });
    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${asset.safeFilename}"`);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('ETag', `"${asset.checksum}"`);
    return new StreamableFile(asset.data);
  }
}
