import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { CreateFeedbackSessionDto } from '../dto/feedback-session.dto';
import { FeedbackSessionService } from '../services/feedback-session.service';

type AuthenticatedRequest = Request & {
  user: { id: number; role: string };
};

@ApiTags('Feedback sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feedback-sessions')
export class FeedbackSessionController {
  constructor(
    private readonly feedbackSessionService: FeedbackSessionService,
  ) {}

  @Post()
  @Roles('ADMIN_LEADER')
  @UseGuards(RolesGuard)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFeedbackSessionDto,
  ) {
    return this.feedbackSessionService.create(request.user.id, dto);
  }
}
