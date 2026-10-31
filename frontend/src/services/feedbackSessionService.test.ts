import api from './api';
import feedbackSessionService from './feedbackSessionService';

jest.mock('./api');

describe('feedbackSessionService', () => {
  const apiMock = api as jest.Mocked<typeof api>;

  it('deve enviar o processo escolhido e devolver a sessão criada', async () => {
    const session = { id: 1, processId: 3 };
    apiMock.post.mockResolvedValue({ data: session });

    const result = await feedbackSessionService.create(3);

    expect(apiMock.post).toHaveBeenCalledWith('/feedback-sessions', { processId: 3 });
    expect(result).toEqual(session);
  });

  it('deve enviar o objetivo da sessão e devolver a sessão atualizada', async () => {
    const session = { id: 1, processId: 3, objective: 'Alinhar metas' };
    apiMock.patch.mockResolvedValue({ data: session });

    const result = await feedbackSessionService.defineObjective(1, 'Alinhar metas');

    expect(apiMock.patch).toHaveBeenCalledWith('/feedback-sessions/1/objective', {
      objective: 'Alinhar metas',
    });
    expect(result).toEqual(session);
  });

  it('deve enviar a data e o horário da sessão e devolver a sessão atualizada', async () => {
    const scheduledAt = '2099-11-05T13:00:00.000Z';
    const session = { id: 1, processId: 3, scheduledAt };
    apiMock.patch.mockResolvedValue({ data: session });

    const result = await feedbackSessionService.defineSchedule(1, scheduledAt);

    expect(apiMock.patch).toHaveBeenCalledWith('/feedback-sessions/1/schedule', {
      scheduledAt,
    });
    expect(result).toEqual(session);
  });
});
