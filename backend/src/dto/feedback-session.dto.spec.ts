import { validate } from 'class-validator';
import { DefineFeedbackSessionScheduleDto } from './feedback-session.dto';

describe('DefineFeedbackSessionScheduleDto', () => {
  const check = (scheduledAt: unknown) => {
    const dto = new DefineFeedbackSessionScheduleDto();
    Object.assign(dto, { scheduledAt });
    return validate(dto);
  };

  it('deve aceitar uma data e um horário no formato ISO 8601', async () => {
    expect(await check('2026-11-05T13:00:00.000Z')).toHaveLength(0);
  });

  it.each([
    ['ausente', undefined],
    ['vazia', ''],
    ['em texto livre', 'amanhã às 10h'],
    ['só um número', 20261105],
  ])('deve recusar uma data %s', async (_caso, scheduledAt) => {
    expect(await check(scheduledAt)).not.toHaveLength(0);
  });
});
