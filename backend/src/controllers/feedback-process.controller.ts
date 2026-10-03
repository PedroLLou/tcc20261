import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import {
  CreateFeedbackProcessDto,
  FeedbackProcessObservationDto,
  UpdateFeedbackProcessDto,
} from '../dto/feedback-process.dto';
import { FeedbackProcessService } from '../services/feedback-process.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Feedback processes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feedback-processes')
export class FeedbackProcessController {
  constructor(private readonly feedbackProcessService: FeedbackProcessService) {}

  @Get('participants')
  @Roles('ADMIN_LEADER', 'ADMIN_RH')
  @UseGuards(RolesGuard)
  listParticipants() {
    return this.feedbackProcessService.listParticipants();
  }

  @Get()
  @Roles('ADMIN_LEADER', 'ADMIN_RH')
  @UseGuards(RolesGuard)
  list() {
    return this.feedbackProcessService.list();
  }

  @Get(':id')
  @Roles('ADMIN_LEADER', 'ADMIN_RH')
  @UseGuards(RolesGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackProcessService.findOne(id);
  }

  @Post()
  @Roles('ADMIN_LEADER')
  @UseGuards(RolesGuard)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFeedbackProcessDto,
  ) {
    return this.feedbackProcessService.create(request.user.id, dto);
  }

  @Patch(':id')
  @Roles('ADMIN_LEADER', 'ADMIN_RH')
  @UseGuards(RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeedbackProcessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.feedbackProcessService.update(
      id,
      dto,
      request.user.id,
      request.user.role,
    );
  }

  @Post(':id/submit')
  @Roles('ADMIN_LEADER', 'ADMIN_RH')
  @UseGuards(RolesGuard)
  submitForValidation(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.feedbackProcessService.submitForValidation(
      id,
      request.user.id,
      request.user.role,
    );
  }

  @Post(':id/approve')
  @Roles('ADMIN_RH')
  @UseGuards(RolesGuard)
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackProcessService.approve(id);
  }

  @Post(':id/observation')
  @Roles('ADMIN_RH')
  @UseGuards(RolesGuard)
  registerObservation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FeedbackProcessObservationDto,
  ) {
    return this.feedbackProcessService.registerObservation(id, dto.observation);
  }

  @Post(':id/request-adjustments')
  @Roles('ADMIN_RH')
  @UseGuards(RolesGuard)
  requestAdjustments(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FeedbackProcessObservationDto,
  ) {
    return this.feedbackProcessService.requestAdjustments(id, dto.observation);
  }

  @Delete(':id')
  @Roles('ADMIN_LEADER', 'ADMIN_RH')
  @UseGuards(RolesGuard)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackProcessService.delete(id);
  }
}