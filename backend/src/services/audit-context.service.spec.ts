import { AuditContextService } from './audit-context.service';

describe('AuditContextService', () => {
  const service = new AuditContextService();
  const context = {
    actorId: 7,
    actorEmail: 'rh@empresa.com',
    clientIp: '10.0.0.1',
    request: 'POST /api/v1/auth/teams',
  };

  it('deve retornar contexto vazio fora de uma requisição', () => {
    expect(service.current()).toEqual({
      actorId: null,
      actorEmail: null,
      clientIp: null,
      request: null,
    });
    expect(service.isInBatchTransaction()).toBe(false);
  });

  it('deve disponibilizar o contexto durante a execução, inclusive após await', async () => {
    const result = await service.run(context, async () => {
      await Promise.resolve();
      return service.current();
    });

    expect(result).toEqual(context);
    expect(service.current().actorId).toBeNull();
  });

  it('deve isolar o contexto de requisições simultâneas', async () => {
    const read = (actorId: number) =>
      service.run({ ...context, actorId }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return service.current().actorId;
      });

    await expect(Promise.all([read(1), read(2), read(3)])).resolves.toEqual([
      1, 2, 3,
    ]);
  });

  it('deve marcar transações em lote sem perder o autor', () => {
    service.run(context, () => {
      expect(service.isInBatchTransaction()).toBe(false);
      service.runInBatchTransaction(() => {
        expect(service.isInBatchTransaction()).toBe(true);
        expect(service.current()).toEqual(context);
      });
      expect(service.isInBatchTransaction()).toBe(false);
    });
  });
});
