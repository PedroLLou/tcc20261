import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SessionScheduleForm from './SessionScheduleForm';

describe('SessionScheduleForm', () => {
  const onSave = jest.fn();
  const futureLocal = '2099-11-05T10:00';
  const pastLocal = '2000-01-01T10:00';

  const renderForm = () => render(<SessionScheduleForm sessionId={1} onSave={onSave} />);
  const typeSchedule = (value: string) =>
    fireEvent.change(screen.getByLabelText('Data e horário da sessão'), {
      target: { value },
    });
  const saveButton = () =>
    screen.getByRole('button', { name: 'Salvar data e horário' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve manter o botão desabilitado com o campo vazio', () => {
    renderForm();

    expect(saveButton()).toBeDisabled();
    typeSchedule(futureLocal);
    expect(saveButton()).toBeEnabled();
  });

  it('deve enviar a data e o horário em formato ISO e confirmar', async () => {
    onSave.mockResolvedValue(undefined);
    renderForm();

    typeSchedule(futureLocal);
    fireEvent.click(saveButton());

    expect(
      await screen.findByText('Data e horário da sessão salvos.'),
    ).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith(new Date(futureLocal).toISOString());
  });

  it('deve recusar uma data e um horário que já passaram, sem chamar a API', async () => {
    renderForm();

    typeSchedule(pastLocal);
    fireEvent.click(saveButton());

    expect(
      await screen.findByText('Escolha uma data e um horário futuros.'),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('deve mostrar o erro quando a data e o horário não podem ser salvos', async () => {
    onSave.mockRejectedValue(new Error('falha'));
    renderForm();

    typeSchedule(futureLocal);
    fireEvent.click(saveButton());

    expect(
      await screen.findByText('Não foi possível salvar a data e o horário. Tente novamente.'),
    ).toBeInTheDocument();
  });
});
