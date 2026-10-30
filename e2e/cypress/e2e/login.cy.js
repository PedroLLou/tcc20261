describe('Login', () => {
  [
    ['lider', 'Painel do Líder de Equipe'],
    ['rh', 'Painel de Administração de RH'],
    ['membro', 'Painel do Membro da Equipe'],
  ].forEach(([perfil, painel]) => {
    it(`abre o painel de ${perfil} com e-mail e senha corretos`, () => {
      cy.entrar(perfil);

      cy.location('pathname').should('eq', '/dashboard');
      cy.contains('h2', painel).should('be.visible');
    });
  });

  it('mostra o erro e permanece no login com senha incorreta', () => {
    cy.entrar('membro', 'senha-errada');

    cy.contains('.error-message', 'Credenciais inválidas').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('redireciona para o login quem abre o painel sem estar autenticado', () => {
    cy.visit('/dashboard');

    cy.location('pathname').should('eq', '/login');
  });
});
