import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { CreateFeedbackProcessDto } from '../dto/feedback-process.dto';
import { FeedbackProcessService } from '../services/feedback-process.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Feedback processes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feedback-processes')
export class FeedbackProcessController {
  constructor(private readonly feedbackProcessService: FeedbackProcessService) {}

  @Post()
  @Roles('ADMIN_LEADER', 'ADMIN_RH')
  @UseGuards(RolesGuard)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFeedbackProcessDto,
  ) {
    return this.feedbackProcessService.create(request.user.id, dto);
  }
}