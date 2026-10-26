import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FactService } from './fact.service';
import type { FactRepository } from '../repositories/fact.repository';
import type { FeedbackSessionRepository } from '../repositories/feedback-session.repository';
import type { UserRepository } from '../repositories/user.repository';

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

  it('recusa mais de 10 anexos', async () => {
    const files = Array.from({ length: 11 }, (_, index) => ({
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

  it('recusa arquivo maior que 50 MB', async () => {
    await expect(
      service.create(3, { description: 'Fato' }, [
        {
          originalname: 'video.mp4',
          mimetype: 'video/mp4',
          size: 50 * 1024 * 1024 + 1,
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
