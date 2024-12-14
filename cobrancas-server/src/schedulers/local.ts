import { exec } from 'child_process';
import { BaseScheduler } from './base';

export class LocalScheduler extends BaseScheduler {
  private taskName = 'CobrancasAutomaticas';

  async start() {
    // Pega o horário da configuração
    const config = JSON.parse(BaseScheduler.inMemoryStorage['automaticSendingConfig'] || '{}');
    const time = config?.sendTime || '09:00';
    
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
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao criar tarefa agendada: ${error}`);
        return;
      }
      console.log('Tarefa agendada criada com sucesso!');
      console.log(stdout);
    });
  }

  async stop() {
    // Remove a tarefa do Windows Task Scheduler
    const command = `schtasks /delete /tn "${this.taskName}" /f`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao remover tarefa agendada: ${error}`);
        return;
      }
      console.log('Tarefa agendada removida com sucesso!');
    });
  }

  // Se este arquivo for executado diretamente pelo Task Scheduler
  static async runScheduledTask() {
    const scheduler = new LocalScheduler();
    await scheduler.checkAndSendMessages();
  }
}

// Se este arquivo for executado diretamente
if (require.main === module) {
  LocalScheduler.runScheduledTask();
}
