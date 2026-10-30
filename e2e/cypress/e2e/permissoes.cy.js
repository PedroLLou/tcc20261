describe('Menu lateral por perfil', () => {
  [
    ['membro', ['Painel', 'Registrar fato']],
    ['lider', ['Painel', 'Registrar fato', 'Novo planejamento']],
    ['rh', ['Painel', 'Registrar fato', 'Usuários', 'Equipes']],
  ].forEach(([perfil, opcoes]) => {
    it(`mostra para ${perfil} somente: ${opcoes.join(', ')}`, () => {
      cy.entrar(perfil);

      cy.menu()
        .find('button')
        .should('have.length', opcoes.length)
        .then(($botoes) => {
          expect([...$botoes].map((botao) => botao.textContent.trim())).to.deep.equal(opcoes);
        });
    });
  });
});
