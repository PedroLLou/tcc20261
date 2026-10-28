import { assertTestDatabase } from './test-database';

try {
  assertTestDatabase(process.env);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
