FROM node:18-alpine

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto dos arquivos
COPY . .

# Compilar TypeScript
RUN npm run build

# Expor a porta 3001
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["npm", "start"]
