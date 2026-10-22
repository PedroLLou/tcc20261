export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim()) {
    throw new Error('JWT_SECRET deve ser definido e não pode estar vazio.');
  }
  return secret;
}
