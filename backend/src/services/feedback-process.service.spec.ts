import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type {
  FeedbackProcess,
  FeedbackProcessStatus,
} from '../models/feedback-process.model';
import { FeedbackProcessRepository } from '../repositories/feedback-process.repository';
import { UserRepository } from '../repositories/user.repository';
import { FeedbackProcessService } from './feedback-process.service';

const statuses: FeedbackProcessStatus[] = [
  'DRAFT',
  'SENT_FOR_VALIDATION',
  'PLANNED',
];
const processes = { findById: jest.fn(), delete: jest.fn() };
let service: FeedbackProcessService;

function processWithStatus(status: FeedbackProcessStatus): FeedbackProcess {
  return {
    id: 7,
    ownerId: 10,
    status,
    description: null,
    objective: 'Melhorar a comunicação',
    startsAt: null,
    endsAt: null,
    criteria: [],
    observation: null,
    participantId: null,
    participant: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  service = new FeedbackProcessService(
    processes as unknown as FeedbackProcessRepository,
    {} as UserRepository,
  );
});

it.each(statuses)(
  'permite ao líder excluir seu processo %s',
  async (status) => {
    processes.findById.mockResolvedValue(processWithStatus(status));

    await expect(service.delete(7, 10, 'ADMIN_LEADER')).resolves.toEqual({
      id: 7,
    });
    expect(processes.delete).toHaveBeenCalledWith(7);
    expect(processes.delete).toHaveBeenCalledTimes(1);
  },
);

it.each(statuses)(
  'impede que outro líder exclua o processo %s',
  async (status) => {
    processes.findById.mockResolvedValue(processWithStatus(status));

    await expect(service.delete(7, 20, 'ADMIN_LEADER')).rejects.toThrow(
      ForbiddenException,
    );
    expect(processes.delete).not.toHaveBeenCalled();
  },
);

it.each(statuses)(
  'preserva a exclusão pelo RH de processo %s de outro usuário',
  async (status) => {
    processes.findById.mockResolvedValue(processWithStatus(status));

    await expect(service.delete(7, 30, 'ADMIN_RH')).resolves.toEqual({ id: 7 });
    expect(processes.delete).toHaveBeenCalledWith(7);
  },
);

it('retorna não encontrado sem excluir um processo inexistente', async () => {
  processes.findById.mockResolvedValue(null);

  await expect(service.delete(99, 10, 'ADMIN_LEADER')).rejects.toThrow(
    NotFoundException,
  );
  expect(processes.delete).not.toHaveBeenCalled();
});
