// Entra pela tela de login, como o usuário faz. `perfil` é uma chave de USERS
// (rh, lider ou membro); a senha padrão é a do cenário de teste.
import { PASSWORD, USERS } from '../../support/users';

Cypress.Commands.add('entrar', (perfil, senha = PASSWORD) => {
  const { email } = USERS[perfil];
  cy.visit('/login');
  cy.get('#email').type(email);
  cy.get('#password').type(senha, { log: false });
  cy.contains('button', 'Entrar').click();
});

// Pelo menu lateral, onde ficam as opções de cada perfil.
Cypress.Commands.add('menu', () =>
  cy.get('nav[aria-label="Navegação principal"]'),
);

beforeEach(() => {
  cy.task('resetDatabase');
});
