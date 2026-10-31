import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import {
  CreateFeedbackSessionDto,
  DefineFeedbackSessionObjectiveDto,
  DefineFeedbackSessionScheduleDto,
} from '../dto/feedback-session.dto';
import { FeedbackSessionService } from '../services/feedback-session.service';
import { FactQueryDto, SelectFactsDto } from '../dto/fact.dto';

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

  @Patch(':id/objective')
  @Roles('ADMIN_LEADER')
  @UseGuards(RolesGuard)
  defineObjective(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: DefineFeedbackSessionObjectiveDto,
  ) {
    return this.feedbackSessionService.defineObjective(
      id,
      request.user.id,
      dto,
    );
  }

  @Patch(':id/schedule')
  @Roles('ADMIN_LEADER')
  @UseGuards(RolesGuard)
  defineSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: DefineFeedbackSessionScheduleDto,
  ) {
    return this.feedbackSessionService.defineSchedule(id, request.user.id, dto);
  }

  @Get(':id/facts/available')
  listAvailableFacts(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Query() query: FactQueryDto,
  ) {
    return this.feedbackSessionService.listAvailableFacts(
      id,
      request.user.id,
      request.user.role,
      query,
    );
  }

  @Post(':id/facts')
  @Roles('ADMIN_LEADER')
  @UseGuards(RolesGuard)
  selectFacts(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: SelectFactsDto,
  ) {
    return this.feedbackSessionService.selectFacts(
      request.user.id,
      request.user.role,
      id,
      dto.factIds,
    );
  }
}
