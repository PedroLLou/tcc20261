import { FeedbackPlanningService } from './feedback-planning.service';

describe('FeedbackPlanningService', () => {
  let service: FeedbackPlanningService;

  beforeEach(() => {
    service = new FeedbackPlanningService();
  });

  it('deve permitir salvar um planejamento incompleto como rascunho', () => {
    const planejamentoIncompleto = {
      objective: 'Melhorar a comunicação da equipe',
    };

    const result = service.saveDraft(planejamentoIncompleto);

    expect(result).toEqual(
      expect.objectContaining({
        objective: 'Melhorar a comunicação da equipe',
        status: 'RASCUNHO',
      }),
    );
  });
});
