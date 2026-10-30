const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const { assertTestDatabase } = require('./test-database');

const { PASSWORD, USERS } = require('./users');

// Apaga os dados do sistema e cria o cenário conhecido: uma equipe, um RH,
// um líder e um membro. Só roda em banco de teste.
async function resetDatabase(databaseUrl = process.env.DATABASE_URL) {
  assertTestDatabase(databaseUrl);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      'TRUNCATE TABLE "FeedbackProcess", "User", "Team" RESTART IDENTITY CASCADE',
    );
    const team = await client.query(
      'INSERT INTO "Team" (name, "updatedAt") VALUES ($1, NOW()) RETURNING id',
      ['Equipe Teste'],
    );
    const password = await bcrypt.hash(PASSWORD, 10);
    for (const user of Object.values(USERS)) {
      await client.query(
        'INSERT INTO "User" (name, age, email, password, role, "teamId", "updatedAt") VALUES ($1, 30, $2, $3, $4::"UserRole", $5, NOW())',
        [user.name, user.email, password, user.role, team.rows[0].id],
      );
    }
  } finally {
    await client.end();
  }
  return null;
}

module.exports = { resetDatabase };
