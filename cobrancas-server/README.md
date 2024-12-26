# Cobrancas Server

Backend do sistema de cobranças desenvolvido com Node.js, TypeScript, Express e PostgreSQL.

## Requisitos

- Node.js 18+
- PostgreSQL 15+
- Docker (opcional)

## Configuração

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente no arquivo `.env`:
```
DB_HOST=postgres
DB_USER=postgres
DB_PASS=postgres
DB_NAME=cobrancas_db
DB_PORT=5432
NODE_ENV=production
```

4. Compile o TypeScript:
```bash
npm run build
```

5. Inicie o servidor:
```bash
npm start
```

## Docker

Para rodar com Docker:

1. Construa a imagem:
```bash
docker build -t cobrancas-server .
```

2. Execute com docker-compose:
```bash
docker-compose up -d
```

O servidor estará disponível em `http://localhost:3000`
