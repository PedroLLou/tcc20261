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
});
