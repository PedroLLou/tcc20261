describe('Planejamento de feedback: do envio à validação', () => {
  const objetivo = 'Desenvolver a comunicação com a equipe';

  const abrirProcesso = () => cy.contains('.process-list-open', 'Membro Teste').click();

  it('o líder envia o planejamento e o RH o valida', () => {
    cy.entrar('lider');
    cy.menu().contains('button', 'Novo planejamento').click();

    cy.get('#feedback-participant').select('Membro Teste (membro@teste.com)');
    cy.get('#feedback-objective').type(objetivo);
    cy.contains('button', 'Continuar').click();

    cy.get('#feedback-start-date').type('2026-12-01');
    cy.get('#feedback-end-date').type('2026-12-15');
    cy.get('#feedback-criteria').type('Comunicação{enter}Trabalho em equipe');
    cy.contains('button', 'Enviar para validação').click();

    cy.contains('.process-list-item', 'Membro Teste')
      .should('contain', objetivo)
      .and('contain', 'Enviado para validação');

    // O Cypress aceita automaticamente o "Deseja realmente sair?".
    cy.get('.user-menu-button').click();
    cy.contains('[role="menuitem"]', 'Sair').click();
    cy.location('pathname').should('eq', '/login');

    cy.entrar('rh');
    abrirProcesso();
    cy.contains('Enviado para validação').should('be.visible');
    cy.contains('button', 'Validar planejamento').click();

    cy.contains('.process-list-item', 'Membro Teste').should('contain', 'Planejado');
  });
});
