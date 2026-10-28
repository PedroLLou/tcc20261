import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SessionObjectiveForm from './SessionObjectiveForm';

describe('SessionObjectiveForm', () => {
  const onSave = jest.fn();

  const renderForm = () =>
    render(
      <SessionObjectiveForm sessionId={1} participantName="Ana Lima" onSave={onSave} />,
    );
  const typeObjective = (text: string) =>
    fireEvent.change(screen.getByLabelText('Objetivo da sessão'), {
      target: { value: text },
    });
  const saveButton = () => screen.getByRole('button', { name: 'Salvar objetivo' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve identificar de quem é a sessão', () => {
    renderForm();

    expect(screen.getByText('Sessão de Ana Lima')).toBeInTheDocument();
  });

  it('deve manter o botão desabilitado com o campo vazio ou só com espaços', () => {
    renderForm();

    expect(saveButton()).toBeDisabled();
    typeObjective('   ');
    expect(saveButton()).toBeDisabled();
  });

  it('deve limitar o objetivo a 500 caracteres', () => {
    renderForm();

    expect(screen.getByLabelText('Objetivo da sessão')).toHaveAttribute(
      'maxLength',
      '500',
    );
  });

  it('deve enviar o objetivo sem os espaços das pontas e confirmar', async () => {
    onSave.mockResolvedValue(undefined);
    renderForm();

    typeObjective('  Alinhar metas  ');
    fireEvent.click(saveButton());

    expect(await screen.findByText('Objetivo da sessão salvo.')).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith('Alinhar metas');
  });

  it('deve mostrar o erro quando o objetivo não pode ser salvo', async () => {
    onSave.mockRejectedValue(new Error('falha'));
    renderForm();

    typeObjective('Alinhar metas');
    fireEvent.click(saveButton());

    expect(
      await screen.findByText('Não foi possível salvar o objetivo. Tente novamente.'),
    ).toBeInTheDocument();
  });
});
