# Sistema de gestão de feedbacks

## Estrutura do projeto

Este repositório está organizado como um monorepo, contendo:

- **frontend/**: Aplicação React + TypeScript
- **backend/**: API Node.js + NestJS

---

## Rodar o projeto

### Containers com Podman ou Docker

Consulte [o guia de containers](docs/containers.md) para configuração, build, migrações, persistência e testes. As imagens e o Compose não dependem de provedor de nuvem. Podman precisa de um provedor Compose externo.

```bash
node scripts/create-container-env.mjs
podman compose config >/dev/null
podman compose up -d --build
```

Abra http://127.0.0.1:8080. O helper exige Node 24 ou superior, cria `.env` privado sem exibir segredos e recusa sobrescrever um arquivo existente.

Em 12/10/2026, os containers finais passaram login, permissões, feedback aprovado, auditoria e persistência após recriação. A API executa em Distroless com Node 24. O navegador passou 22 verificações funcionais, de teclado e mobile, sem erros JavaScript nos estados exercitados.

Para repetir a validação em projetos isolados:

```bash
bash scripts/verify-containers.sh
node scripts/verify-observability.mjs
```

O mesmo guia reúne [observabilidade](docs/containers.md#observabilidade), [exportação Honeycomb](docs/containers.md#exportar-para-honeycomb) e [deploy no Render com Neon](docs/containers.md#render-e-neon). Traces e as seis métricas nativas foram recuperados no Honeycomb TCC/test com tráfego sintético. Os containers também passaram com PostgreSQL 18 no Neon, incluindo migrations, feedback, auditoria e persistência após reiniciar a API. O Blueprint de dois containers gratuitos no Render está preparado; implantação e HTTP público continuam pendentes.

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
