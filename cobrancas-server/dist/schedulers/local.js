"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalScheduler = void 0;
const child_process_1 = require("child_process");
const base_1 = require("./base");
class LocalScheduler extends base_1.BaseScheduler {
    constructor() {
        super(...arguments);
        this.taskName = 'CobrancasAutomaticas';
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            // Pega o horário da configuração
            const config = JSON.parse(base_1.BaseScheduler.inMemoryStorage['automaticSendingConfig'] || '{}');
            const time = (config === null || config === void 0 ? void 0 : config.sendTime) || '09:00';
            console.log('Configurando tarefa para horário:', time);
            // Cria um arquivo .bat para executar o teste
            const batPath = require('path').resolve(__dirname, 'check_messages.bat');
            const projectRoot = require('path').resolve(__dirname, '../../');
            console.log('Criando arquivo batch em:', batPath);
            console.log('Project root:', projectRoot);
            const batContent = `@echo off
echo Iniciando verificacao de mensagens...
cd "${projectRoot}"

echo Instalando dependencias...
call npm install

echo Compilando TypeScript...
call npx tsc

echo Executando script...
call npx ts-node src/index.ts --check-messages > logs.txt 2>&1

echo Verificacao concluida.
`;
            require('fs').writeFileSync(batPath, batContent, { encoding: 'utf8' });
            console.log('Conteúdo do arquivo batch:', batContent);
            const command = `schtasks /create /tn "${this.taskName}" /tr "${batPath}" /sc daily /st ${time} /f`;
            console.log('Comando do schtasks:', command);
            (0, child_process_1.exec)(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Erro ao criar tarefa agendada: ${error}`);
                    return;
                }
                console.log('Tarefa agendada criada com sucesso!');
                console.log(stdout);
            });
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove a tarefa do Windows Task Scheduler
            const command = `schtasks /delete /tn "${this.taskName}" /f`;
            (0, child_process_1.exec)(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Erro ao remover tarefa agendada: ${error}`);
                    return;
                }
                console.log('Tarefa agendada removida com sucesso!');
            });
        });
    }
    // Se este arquivo for executado diretamente pelo Task Scheduler
    static runScheduledTask() {
        return __awaiter(this, void 0, void 0, function* () {
            const scheduler = new LocalScheduler();
            yield scheduler.checkAndSendMessages();
        });
    }
}
exports.LocalScheduler = LocalScheduler;
// Se este arquivo for executado diretamente
if (require.main === module) {
    LocalScheduler.runScheduledTask();
}
