import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateFactDto, FactQueryDto } from '../dto/fact.dto';
import { FactService, FactUpload } from '../services/fact.service';

type AuthenticatedRequest = Request & {
  user: { id: number; role: string };
};

@ApiTags('Facts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facts')
export class FactController {
  constructor(private readonly factService: FactService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFactDto,
    @UploadedFiles() files: FactUpload[],
  ) {
    return this.factService.create(request.user.id, dto, files ?? []);
  }

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.factService.list(request.user.id, request.user.role);
  }

  @Get('available')
  listAvailable(
    @Req() request: AuthenticatedRequest,
    @Query() query: FactQueryDto,
  ) {
    return this.factService.listAvailable(
      request.user.id,
      request.user.role,
      query,
    );
  }

  @Get(':factId/attachments/:attachmentId')
  download(
    @Req() request: AuthenticatedRequest,
    @Param('factId', ParseIntPipe) factId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Res() response: Response,
  ) {
    return this.factService
      .downloadAttachment(
        request.user.id,
        request.user.role,
        factId,
        attachmentId,
      )
      .then((attachment) => {
        response.type(attachment.mimeType);
        response.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
        );
        response.send(Buffer.from(attachment.content));
      });
  }
}
