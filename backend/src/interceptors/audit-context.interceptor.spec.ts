import { CallHandler, ExecutionContext } from '@nestjs/common';
import { defer, lastValueFrom, of } from 'rxjs';
import {
  AuditContextInterceptor,
  buildAuditContext,
} from './audit-context.interceptor';
import {
  AuditContext,
  AuditContextService,
} from '../services/audit-context.service';

describe('AuditContextInterceptor', () => {
  const auditContext = new AuditContextService();
  const interceptor = new AuditContextInterceptor(auditContext);

  const request = {
    user: { id: 5, email: 'lider@empresa.com' },
    ip: '10.0.0.8',
    method: 'PATCH',
    originalUrl: '/api/v1/feedback-processes/3?email=dado@pessoal.com',
  };

  const httpContext = (req: unknown) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  // O handler lê o contexto no momento em que executa, como fazem os services.
  const handlerReadingContext: CallHandler = {
    handle: () => defer(() => of(auditContext.current())),
  };

  const contextSeenByHandler = (context: ExecutionContext) =>
    lastValueFrom(
      interceptor.intercept(context, handlerReadingContext),
    ) as Promise<AuditContext>;

  it('deve disponibilizar o usuário autenticado para o handler', async () => {
    const result = await contextSeenByHandler(httpContext(request));

    expect(result).toEqual({
      actorId: 5,
      actorEmail: 'lider@empresa.com',
      clientIp: '10.0.0.8',
      request: 'PATCH /api/v1/feedback-processes/3',
    });
  });

  it('deve deixar o autor nulo em rotas públicas', () => {
    const context = buildAuditContext({
      method: 'POST',
      originalUrl: '/api/v1/auth/register',
      ip: '10.0.0.9',
    } as never);

    expect(context.actorId).toBeNull();
    expect(context.actorEmail).toBeNull();
    expect(context.request).toBe('POST /api/v1/auth/register');
  });

  it('não deve alterar requisições que não são HTTP', async () => {
    const rpcContext = {
      getType: () => 'rpc',
    } as unknown as ExecutionContext;

    const result = await contextSeenByHandler(rpcContext);

    expect(result.actorId).toBeNull();
  });
});
