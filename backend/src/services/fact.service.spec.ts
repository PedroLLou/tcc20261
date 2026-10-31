import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FactService } from './fact.service';
import type { FactRepository } from '../repositories/fact.repository';
import type { FeedbackSessionRepository } from '../repositories/feedback-session.repository';
import type { UserRepository } from '../repositories/user.repository';
import { FactQueryDto } from '../dto/fact.dto';

// The setup and integration-shaped assertions are kept together for readability.
// eslint-disable-next-line max-lines-per-function
describe('FactService', () => {
  let service: FactService;
  let facts: { create: jest.Mock };
  let sessions: { findById: jest.Mock };
  let users: { findById: jest.Mock };

  beforeEach(() => {
    facts = { create: jest.fn() };
    sessions = { findById: jest.fn() };
    users = { findById: jest.fn() };
    service = new FactService(
      facts as unknown as FactRepository,
      sessions as unknown as FeedbackSessionRepository,
      users as unknown as UserRepository,
    );
  });

  it('registra um fato textual com pessoa, sessão e anexos opcionais', async () => {
    sessions.findById.mockResolvedValue({
      id: 4,
      process: { ownerId: 3, participantId: 8 },
    });
    users.findById.mockResolvedValue({ id: 8 });
    facts.create.mockResolvedValue({ id: 1, description: 'Fato registrado' });

    const result = await service.create(
      3,
      {
        description: '  Fato registrado  ',
        sessionId: 4,
        relatedUserId: 8,
      },
      [
        {
          originalname: 'evidencia.png',
          mimetype: 'IMAGE/PNG',
          size: 120,
          buffer: Buffer.from('conteudo'),
        },
      ],
    );

    expect(facts.create).toHaveBeenCalledWith({
      description: 'Fato registrado',
      author: { connect: { id: 3 } },
      session: { connect: { id: 4 } },
      relatedUser: { connect: { id: 8 } },
      attachments: {
        create: [
          {
            originalName: 'evidencia.png',
            mimeType: 'image/png',
            size: 120,
            content: Buffer.from('conteudo'),
          },
        ],
      },
    });
    expect(result).toEqual({ id: 1, description: 'Fato registrado' });
  });

  it('registra um fato sem sessão ou pessoa associada', async () => {
    facts.create.mockResolvedValue({ id: 1 });

    await service.create(3, { description: 'Fato independente' });

    expect(facts.create).toHaveBeenCalledWith({
      description: 'Fato independente',
      author: { connect: { id: 3 } },
      attachments: undefined,
    });
  });
});

// eslint-disable-next-line max-lines-per-function
describe('FactService - validação', () => {
  let service: FactService;
  let facts: { create: jest.Mock };
  let sessions: { findById: jest.Mock };
  let users: { findById: jest.Mock };

  beforeEach(() => {
    facts = { create: jest.fn() };
    sessions = { findById: jest.fn() };
    users = { findById: jest.fn() };
    service = new FactService(
      facts as unknown as FactRepository,
      sessions as unknown as FeedbackSessionRepository,
      users as unknown as UserRepository,
    );
  });

  it('recusa fato sem descrição', async () => {
    await expect(service.create(3, { description: '  ' })).rejects.toThrow(
      BadRequestException,
    );
    expect(facts.create).not.toHaveBeenCalled();
  });

  it('recusa sessão inexistente', async () => {
    sessions.findById.mockResolvedValue(null);

    await expect(
      service.create(3, { description: 'Fato', sessionId: 99 }),
    ).rejects.toThrow(NotFoundException);
    expect(facts.create).not.toHaveBeenCalled();
  });

  it('recusa pessoa associada inexistente', async () => {
    users.findById.mockResolvedValue(null);

    await expect(
      service.create(3, { description: 'Fato', relatedUserId: 99 }),
    ).rejects.toThrow(NotFoundException);
    expect(facts.create).not.toHaveBeenCalled();
  });

  it('recusa fato associado a sessão de outro usuário', async () => {
    sessions.findById.mockResolvedValue({
      id: 4,
      process: { ownerId: 10, participantId: 8 },
    });

    await expect(
      service.create(3, { description: 'Fato', sessionId: 4 }),
    ).rejects.toThrow(ForbiddenException);
    expect(facts.create).not.toHaveBeenCalled();
  });

  it('recusa arquivos de áudio como anexos', async () => {
    await expect(
      service.create(3, { description: 'Fato' }, [
        {
          originalname: 'evidencia.mp3',
          mimetype: 'audio/mpeg',
          size: 120,
          buffer: Buffer.from('audio'),
        },
      ]),
    ).rejects.toThrow(BadRequestException);
    expect(facts.create).not.toHaveBeenCalled();
  });

  it('recusa arquivos de tipo não permitido', async () => {
    await expect(
      service.create(3, { description: 'Fato' }, [
        {
          originalname: 'programa.exe',
          mimetype: 'application/octet-stream',
          size: 100,
          buffer: Buffer.from('arquivo'),
        },
      ]),
    ).rejects.toThrow(BadRequestException);
    expect(facts.create).not.toHaveBeenCalled();
  });

  it('recusa mais de 5 anexos', async () => {
    const files = Array.from({ length: 6 }, (_, index) => ({
      originalname: `arquivo-${index}.png`,
      mimetype: 'image/png',
      size: 100,
      buffer: Buffer.from('arquivo'),
    }));

    await expect(
      service.create(3, { description: 'Fato' }, files),
    ).rejects.toThrow(BadRequestException);
    expect(facts.create).not.toHaveBeenCalled();
  });

  it('recusa arquivo maior que 10 MB', async () => {
    await expect(
      service.create(3, { description: 'Fato' }, [
        {
          originalname: 'video.mp4',
          mimetype: 'video/mp4',
          size: 10 * 1024 * 1024 + 1,
          buffer: Buffer.from('video'),
        },
      ]),
    ).rejects.toThrow(BadRequestException);
    expect(facts.create).not.toHaveBeenCalled();
  });

  it('propaga a falha ao salvar o fato', async () => {
    facts.create.mockRejectedValue(new Error('falha no banco'));

    await expect(
      service.create(3, { description: 'Fato válido' }),
    ).rejects.toThrow('falha no banco');
  });
});

// eslint-disable-next-line max-lines-per-function
describe('FactService - acesso aos fatos', () => {
  let service: FactService;
  let facts: {
    listForViewer: jest.Mock;
    findAttachmentForViewer: jest.Mock;
  };
  let users: { findById: jest.Mock };

  beforeEach(() => {
    facts = {
      listForViewer: jest.fn(),
      findAttachmentForViewer: jest.fn(),
    };
    users = { findById: jest.fn() };
    service = new FactService(
      facts as unknown as FactRepository,
      {} as FeedbackSessionRepository,
      users as unknown as UserRepository,
    );
  });

  // eslint-disable-next-line max-lines-per-function
  describe('FactService - fatos disponíveis e seleção', () => {
    let service: FactService;
    let facts: {
      listAvailableForViewer: jest.Mock;
      findForSelection: jest.Mock;
      selectForSession: jest.Mock;
    };
    let sessions: { findById: jest.Mock };
    let users: { findById: jest.Mock };

    beforeEach(() => {
      facts = {
        listAvailableForViewer: jest.fn(),
        findForSelection: jest.fn(),
        selectForSession: jest.fn(),
      };
      sessions = { findById: jest.fn() };
      users = { findById: jest.fn() };
      service = new FactService(
        facts as unknown as FactRepository,
        sessions as unknown as FeedbackSessionRepository,
        users as unknown as UserRepository,
      );
    });

    it('consulta fatos disponíveis com paginação e escopo do usuário', async () => {
      users.findById.mockResolvedValue({ id: 3, teamId: 9 });
      facts.listAvailableForViewer.mockResolvedValue({ items: [], total: 0 });

      const query = Object.assign(new FactQueryDto(), {
        page: 2,
        pageSize: 10,
      });

      await expect(
        service.listAvailable(3, 'ADMIN_LEADER', query),
      ).resolves.toEqual({
        items: [],
        total: 0,
      });
      expect(facts.listAvailableForViewer).toHaveBeenCalledWith(
        3,
        'ADMIN_LEADER',
        9,
        {
          page: 2,
          pageSize: 10,
          relatedUserId: undefined,
          from: undefined,
          to: undefined,
        },
      );
    });

    it('associa fatos válidos à sessão do líder', async () => {
      sessions.findById.mockResolvedValue({
        process: { ownerId: 3, participantId: 8 },
      });
      users.findById.mockResolvedValue({ id: 3, teamId: 9 });
      facts.findForSelection.mockResolvedValue([
        { id: 4, sessionId: null },
        { id: 5, sessionId: 12 },
      ]);
      facts.selectForSession.mockResolvedValue([{ id: 4 }, { id: 5 }]);

      await expect(
        service.selectForSession(3, 'ADMIN_LEADER', 12, [4, 5]),
      ).resolves.toEqual([{ id: 4 }, { id: 5 }]);
      expect(facts.selectForSession).toHaveBeenCalledWith(12, [4, 5]);
    });

    it('rejeita seleção parcial quando algum fato não está disponível', async () => {
      sessions.findById.mockResolvedValue({
        process: { ownerId: 3, participantId: 8 },
      });
      users.findById.mockResolvedValue({ id: 3, teamId: 9 });
      facts.findForSelection.mockResolvedValue([{ id: 4, sessionId: null }]);

      await expect(
        service.selectForSession(3, 'ADMIN_LEADER', 12, [4, 5]),
      ).rejects.toThrow(BadRequestException);
      expect(facts.selectForSession).not.toHaveBeenCalled();
    });

    it('converte conflito transacional em erro de negócio', async () => {
      sessions.findById.mockResolvedValue({
        process: { ownerId: 3, participantId: 8 },
      });
      users.findById.mockResolvedValue({ id: 3, teamId: 9 });
      facts.findForSelection.mockResolvedValue([{ id: 4, sessionId: null }]);
      facts.selectForSession.mockRejectedValue(
        new Error('FACT_SELECTION_CONFLICT'),
      );

      await expect(
        service.selectForSession(3, 'ADMIN_LEADER', 12, [4]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('lista fatos para o usuário autenticado', async () => {
    users.findById.mockResolvedValue({ id: 7, teamId: 3 });
    facts.listForViewer.mockResolvedValue([{ id: 1 }]);

    await expect(service.list(7, 'ADMIN_LEADER')).resolves.toEqual([{ id: 1 }]);
    expect(facts.listForViewer).toHaveBeenCalledWith(7, 'ADMIN_LEADER', 3);
  });

  it('permite baixar anexo usando o escopo do líder', async () => {
    users.findById.mockResolvedValue({ id: 7, teamId: 3 });
    facts.findAttachmentForViewer.mockResolvedValue({
      originalName: 'evidencia.png',
    });

    await expect(
      service.downloadAttachment(7, 'ADMIN_LEADER', 10, 20),
    ).resolves.toEqual({ originalName: 'evidencia.png' });
    expect(facts.findAttachmentForViewer).toHaveBeenCalledWith(
      10,
      20,
      7,
      'ADMIN_LEADER',
      3,
    );
  });

  it('não baixa anexo sem usuário autenticado válido', async () => {
    users.findById.mockResolvedValue(null);

    await expect(
      service.downloadAttachment(7, 'ADMIN_LEADER', 10, 20),
    ).rejects.toThrow(NotFoundException);
    expect(facts.findAttachmentForViewer).not.toHaveBeenCalled();
  });
});
