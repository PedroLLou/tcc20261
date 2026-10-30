// Usuários do cenário de teste. Usado pelo preparo do banco (seed.js) e pelos
// comandos do Cypress, por isso não importa nada do Node.
const PASSWORD = 'Senha@123';

const USERS = {
  rh: { name: 'RH Teste', email: 'rh@teste.com', role: 'ADMIN_RH' },
  lider: { name: 'Líder Teste', email: 'lider@teste.com', role: 'ADMIN_LEADER' },
  membro: { name: 'Membro Teste', email: 'membro@teste.com', role: 'TEAM_MEMBER' },
};

module.exports = { PASSWORD, USERS };
