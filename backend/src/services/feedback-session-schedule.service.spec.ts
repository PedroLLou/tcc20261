import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackSessionService } from './feedback-session.service';
import type { FeedbackSessionRepository } from '../repositories/feedback-session.repository';
import type { FeedbackProcessRepository } from '../repositories/feedback-process.repository';

describe('FeedbackSessionService.defineSchedule', () => {
  let service: FeedbackSessionService;
  let sessions: { findById: jest.Mock; update: jest.Mock };

  const ownerId = 7;
  const now = new Date('2026-11-02T12:00:00.000Z');
  const session = { id: 1, processId: 3, process: { ownerId } };
  const define = (scheduledAt: string, id = 1) =>
    service.defineSchedule(id, ownerId, { scheduledAt });

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    sessions = { findById: jest.fn(), update: jest.fn() };
    service = new FeedbackSessionService(
      sessions as unknown as FeedbackSessionRepository,
      {} as unknown as FeedbackProcessRepository,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['de dias depois', '2026-11-05T13:00:00.000Z'],
    ['de um instante depois de agora', '2026-11-02T12:00:00.001Z'],
  ])('deve gravar uma data e um horário %s', async (_caso, iso) => {
    const scheduledAt = new Date(iso);
    sessions.findById.mockResolvedValue(session);
    sessions.update.mockResolvedValue({ id: 1, scheduledAt });

    const result = await define(iso);

    expect(sessions.update).toHaveBeenCalledWith(1, { scheduledAt });
    expect(result).toEqual({ id: 1, scheduledAt });
  });

  it.each([
    ['não existe', null, NotFoundException],
    [
      'é de outro líder',
      { ...session, process: { ownerId: 8 } },
      ForbiddenException,
    ],
  ])('deve recusar quando a sessão %s', async (_caso, found, error) => {
    sessions.findById.mockResolvedValue(found);

    await expect(define('2026-11-05T13:00:00.000Z')).rejects.toThrow(error);
    expect(sessions.update).not.toHaveBeenCalled();
  });

  it.each([
    ['no passado', '2026-11-01T12:00:00.000Z'],
    ['igual ao instante atual', '2026-11-02T12:00:00.000Z'],
    ['inexistente', '2026-13-45T99:00:00.000Z'],
  ])('deve recusar uma data e um horário %s', async (_caso, scheduledAt) => {
    sessions.findById.mockResolvedValue(session);

    await expect(define(scheduledAt)).rejects.toThrow(BadRequestException);
    expect(sessions.update).not.toHaveBeenCalled();
  });
});
