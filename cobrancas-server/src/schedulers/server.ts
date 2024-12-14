import schedule from 'node-schedule';
import { BaseScheduler } from './base';

export class ServerScheduler extends BaseScheduler {
  private jobs: schedule.Job[] = [];

  async start() {
    // Cancela jobs existentes
    this.stop();

    if (!this.config?.enabled) return;

    const time = this.config.sendTime || '09:00';
    const [hours, minutes] = time.split(':');

    // Cria regra para executar todo dia no horário configurado
    const rule = new schedule.RecurrenceRule();
    rule.hour = parseInt(hours);
    rule.minute = parseInt(minutes);
    
    // Agenda o job
    const job = schedule.scheduleJob(rule, () => this.checkAndSendMessages());
    this.jobs.push(job);
    
    console.log(`Agendamento configurado para ${time}`);
  }

  stop() {
    // Cancela todos os jobs agendados
    this.jobs.forEach(job => job.cancel());
    this.jobs = [];
    console.log('Agendamentos cancelados');
  }
}
