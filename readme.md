## Estrutura do Projeto

Este repositório está organizado como um monorepo, contendo:

- **frontend/**: Aplicação React + TypeScript
- **backend/**: API Node.js + NestJS

---

## Como rodar o projeto

### Containers com Podman ou Docker

Consulte [o guia de containers](docs/containers.md) para configuração, build, migrações, persistência e testes. As imagens e o Compose não dependem de provedor de nuvem. Podman precisa de um provedor Compose externo.

```bash
node scripts/create-container-env.mjs
podman compose config >/dev/null
podman compose up -d --build
```

Abrir http://127.0.0.1:8080. O helper exige Node 24 ou superior e cria `.env` sem exibir segredos. Os builds e as verificações HTTP foram validados com Podman. O guia inclui os comandos para testar login, autorização e persistência em um projeto isolado.

### Frontend (React + TypeScript)

```bash
cd frontend
npm install
npm start
```
O frontend estará disponível em http://localhost:3000

### Backend (NestJS + Node)

```bash
cd backend
npm install
npm run start
```
O backend estará disponível em http://localhost:3001 (ou porta configurada)

---

Qualquer dúvida, consulte a documentação de cada subprojeto.
