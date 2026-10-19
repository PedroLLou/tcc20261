import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackSessionService } from './feedback-session.service';
import type { FeedbackSessionRepository } from '../repositories/feedback-session.repository';
import type { FeedbackProcessRepository } from '../repositories/feedback-process.repository';

describe('FeedbackSessionService', () => {
  let service: FeedbackSessionService;
  let sessions: { create: jest.Mock };
  let processes: { findById: jest.Mock };

  const ownerId = 7;
  const plannedProcess = { id: 3, status: 'PLANNED', ownerId };

  beforeEach(() => {
    sessions = { create: jest.fn() };
    processes = { findById: jest.fn() };
    service = new FeedbackSessionService(
      sessions as unknown as FeedbackSessionRepository,
      processes as unknown as FeedbackProcessRepository,
    );
  });

  it('deve criar a sessão ligada a um processo planejado do próprio líder', async () => {
    processes.findById.mockResolvedValue(plannedProcess);
    sessions.create.mockResolvedValue({ id: 1, processId: 3 });

    const result = await service.create(ownerId, { processId: 3 });

    expect(sessions.create).toHaveBeenCalledWith({
      process: { connect: { id: 3 } },
    });
    expect(result).toEqual({ id: 1, processId: 3 });
  });

  it('deve recusar quando o processo não existe', async () => {
    processes.findById.mockResolvedValue(null);

    await expect(service.create(ownerId, { processId: 99 })).rejects.toThrow(
      NotFoundException,
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('deve recusar quando o processo pertence a outro líder', async () => {
    processes.findById.mockResolvedValue({ ...plannedProcess, ownerId: 8 });

    await expect(service.create(ownerId, { processId: 3 })).rejects.toThrow(
      ForbiddenException,
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('deve recusar quando o processo não está planejado', async () => {
    processes.findById.mockResolvedValue({
      ...plannedProcess,
      status: 'DRAFT',
    });

    await expect(service.create(ownerId, { processId: 3 })).rejects.toThrow(
      BadRequestException,
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });
});
