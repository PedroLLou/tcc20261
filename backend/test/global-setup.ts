import { assertTestDatabase } from './test-database';

export default function globalSetup() {
  assertTestDatabase(process.env);
}
