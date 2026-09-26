import 'dotenv/config';
import { createInterface } from 'node:readline';
import { StringDecoder } from 'node:string_decoder';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const ask = (question: string): Promise<string> => {
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    terminal.question(question, (answer) => {
      terminal.close();
      resolve(answer.trim());
    });
  });
};

const askHidden = (question: string): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('Execute este comando em um terminal interativo.'));
      return;
    }

    const decoder = new StringDecoder('utf8');
    let value = '';
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const finish = (error?: Error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', handleInput);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };

    const handleInput = (chunk: Buffer) => {
      for (const character of decoder.write(chunk)) {
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u0003') {
          finish(new Error('Operação cancelada.'));
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }
        value += character;
      }
    };

    process.stdin.on('data', handleInput);
  });

const main = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não está configurada no ambiente do backend.');
  }

  const name = await ask('Nome completo: ');
  const age = Number(await ask('Idade: '));
  const email = await ask('Email: ');
  if (!name || !Number.isInteger(age) || age < 1 || !email.includes('@')) {
    throw new Error('Nome, idade ou email inválido.');
  }

  const password = await askHidden('Senha (mínimo de 8 caracteres): ');
  const confirmation = await askHidden('Confirme a senha: ');
  if (password.length < 8 || password !== confirmation) {
    throw new Error('As senhas não coincidem ou têm menos de 8 caracteres.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Já existe uma conta com esse email.');
    }

    const user = await prisma.user.create({
      data: {
        name,
        age,
        email,
        password: await bcrypt.hash(password, 10),
        role: 'ADMIN_RH',
      },
      select: { name: true, email: true, role: true },
    });
    process.stdout.write(`Conta ${user.role} criada para ${user.name} (${user.email}).\n`);
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Falha ao criar a conta.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});