# Análise de segurança do sistema

Revisão de segurança do código do sistema, feita na frente de banco de dados,
persistência e segurança do TCC. Responsável: Fillipe.

- **Data:** 04/10/2026
- **Versão analisada:** `main` no commit `bac3ea1`
- **Acompanhamento:** cada ponto virou uma *issue* no GitHub (#104 a #111). A
  correção fecha a *issue* pelo fluxo normal de PR (`Closes #N`).

> Para a auditoria das alterações de dados (não-repúdio), ver
> [`docs/auditoria.md`](auditoria.md).

---

## 1. Escopo e método

- **Escopo:** *backend* (NestJS + Prisma + PostgreSQL) e a parte de
  autenticação do *frontend*.
- **Método:**
  - revisão manual do código, arquivo por arquivo;
  - testes locais com a API rodando e PostgreSQL 17.
- **Referências:**
  - OWASP Top 10 2021;
  - ISO/IEC 27002:2022 (controles de segurança da informação);
  - princípio do menor privilégio (Saltzer e Schroeder, 1975).

---

## 2. Resumo dos pontos encontrados

| Issue | Gravidade | Ponto | Área sugerida | Referência |
|---|---|---|---|---|
| [#104](https://github.com/PedroLLou/tcc20261/issues/104) | 🔴 Alta | `JWT_SECRET` usa um valor fixo (`'your-secret-key'`) quando a variável não está definida | *back-end* | OWASP A02/A07 · ISO 8.5 |
| [#105](https://github.com/PedroLLou/tcc20261/issues/105) | 🔴 Alta | Administrador RH padrão com senha fixa no código e no README | *back-end* | OWASP A07 · CWE-798 · ISO 5.17 |
| [#106](https://github.com/PedroLLou/tcc20261/issues/106) | 🔴 Alta | Falta um usuário de banco com privilégios mínimos para a API | banco de dados | Menor privilégio · ISO 8.2 |
| [#107](https://github.com/PedroLLou/tcc20261/issues/107) | 🟡 Média | Líder consegue excluir processo de feedback de outro líder | *back-end* | OWASP A01 · ISO 5.15 |
| [#108](https://github.com/PedroLLou/tcc20261/issues/108) | 🟡 Média | Excluir um usuário apaga em cascata os processos de feedback dele | *back-end* e banco | Integridade / não-repúdio |
| [#109](https://github.com/PedroLLou/tcc20261/issues/109) | 🟡 Média | Entrada da API sem validação (DTOs sem regras e sem `ValidationPipe`) | *back-end* | OWASP A03 · ISO 8.28 |
| [#110](https://github.com/PedroLLou/tcc20261/issues/110) | 🟢 Baixa | CORS liberado para qualquer origem e login sem limite de tentativas | *back-end* | OWASP A05/A07 · ISO 8.5 |
| [#111](https://github.com/PedroLLou/tcc20261/issues/111) | 🟢 Baixa | Token JWT guardado no `localStorage` e válido por 24 horas | *front-end* | OWASP A07 · ISO 8.5 |

Cada *issue* traz o arquivo e a linha, o risco, uma sugestão de correção e as
referências.

**Prioridade sugerida:** as três de gravidade alta primeiro, porque são
correções pequenas e de impacto alto.

---

## 3. Pontos positivos já existentes

A revisão também encontrou boas práticas que já estão no sistema:

- Senhas guardadas com *hash* **bcrypt** (custo 10), nunca em texto puro.
- Autorização por papel com `JwtAuthGuard` + `RolesGuard` + `@Roles()` nas
  rotas protegidas.
- Exclusão de usuário em transação **`Serializable`**, que impede apagar o
  último administrador RH com duas exclusões simultâneas.
- Acesso ao banco pelo Prisma, com **consultas parametrizadas**, o que
  protege contra *SQL Injection*.
- `.env` fora do controle de versão (`.gitignore`).
- Restrições de unicidade no banco (e-mail do usuário, nome da equipe).
- CI com **CodeQL** e `npm audit` (análise estática e de dependências).

---

## 4. Relação com a auditoria do banco

A auditoria implementada nesta *branch* (`feat/auditoria-banco`) não corrige
os pontos acima, mas reduz o impacto de alguns deles:

- **#108 (exclusão em cascata):** o conteúdo apagado fica preservado em
  `AuditLog` (`oldData`), com autor e transação.
- **#104, #105 e #107:** se forem explorados, as alterações feitas ficam
  registradas com o autor, o IP e a rota, o que permite investigar depois.

O ponto **#106** complementa a auditoria. Com um usuário de banco restrito, a
API deixa de ter permissão de escrever na `AuditLog`, e só o *trigger* grava ali.

---

## 5. Observação fora do escopo de segurança

A idade do usuário é armazenada como número (`User.age`), um atributo que muda
com o tempo. Guardar a **data de nascimento** e calcular a idade quando
necessário evita dados desatualizados. Fica como sugestão de modelagem.
