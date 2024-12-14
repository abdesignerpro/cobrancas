@echo off
echo Iniciando verificacao de mensagens...
cd "C:\Users\BARBO\Downloads\Cobrancas\cobrancas-server"

echo Instalando dependencias...
call npm install

echo Compilando TypeScript...
call npx tsc

echo Executando script...
call npx ts-node src/index.ts --check-messages > logs.txt 2>&1

echo Verificacao concluida.
