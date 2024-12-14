# Sistema de Cobranças

## Configuração do Deploy Automático

1. Crie um repositório no GitHub e faça push deste código

2. No GitHub, vá em Settings > Secrets and variables > Actions e adicione as seguintes secrets:

- `DOCKERHUB_USERNAME`: seu usuário do Docker Hub
- `DOCKERHUB_TOKEN`: seu token do Docker Hub (gere em https://hub.docker.com/settings/security)
- `SERVER_HOST`: 95.217.166.178
- `SERVER_USERNAME`: root
- `SERVER_PASSWORD`: sua senha do servidor
- `SERVER_PORT`: 22

3. Faça push do código para a branch main:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin SEU_REPOSITORIO_GITHUB
git push -u origin main
```

O GitHub Actions irá automaticamente:
1. Construir as imagens Docker
2. Publicar no Docker Hub
3. Fazer deploy no servidor

Cada vez que você fizer push para a branch main, o deploy será feito automaticamente.
