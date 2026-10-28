import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackSessionService } from './feedback-session.service';
import type { FeedbackSessionRepository } from '../repositories/feedback-session.repository';
import type { FeedbackProcessRepository } from '../repositories/feedback-process.repository';

describe('FeedbackSessionService.defineObjective', () => {
  let service: FeedbackSessionService;
  let sessions: { findById: jest.Mock; update: jest.Mock };

  const ownerId = 7;
  const session = { id: 1, processId: 3, process: { ownerId } };
  const define = (objective: string, id = 1) =>
    service.defineObjective(id, ownerId, { objective });

  beforeEach(() => {
    sessions = { findById: jest.fn(), update: jest.fn() };
    service = new FeedbackSessionService(
      sessions as unknown as FeedbackSessionRepository,
      {} as unknown as FeedbackProcessRepository,
    );
  });

  it('deve gravar o objetivo sem os espaços das pontas e devolver a sessão', async () => {
    sessions.findById.mockResolvedValue(session);
    sessions.update.mockResolvedValue({ id: 1, objective: 'Alinhar metas' });

    const result = await define('  Alinhar metas  ');

    expect(sessions.update).toHaveBeenCalledWith(1, {
      objective: 'Alinhar metas',
    });
    expect(result).toEqual({ id: 1, objective: 'Alinhar metas' });
  });

  it('deve recusar quando a sessão não existe', async () => {
    sessions.findById.mockResolvedValue(null);

    await expect(define('Alinhar metas', 99)).rejects.toThrow(
      NotFoundException,
    );
    expect(sessions.update).not.toHaveBeenCalled();
  });

  it('deve recusar quando o processo da sessão é de outro líder', async () => {
    sessions.findById.mockResolvedValue({
      ...session,
      process: { ownerId: 8 },
    });

    await expect(define('Alinhar metas')).rejects.toThrow(ForbiddenException);
    expect(sessions.update).not.toHaveBeenCalled();
  });

  it.each([
    ['vazio', ''],
    ['só com espaços', '   '],
    ['com mais de 500 caracteres', 'a'.repeat(501)],
  ])('deve recusar um objetivo %s', async (_caso, objective) => {
    sessions.findById.mockResolvedValue(session);

    await expect(define(objective)).rejects.toThrow(BadRequestException);
    expect(sessions.update).not.toHaveBeenCalled();
  });
});
