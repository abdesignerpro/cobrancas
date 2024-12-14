// Importa as classes necessárias
import { BaseScheduler } from './schedulers/base';

// Configura os dados em memória
const config = {
    enabled: true,
    daysBeforeDue: "1",
    sendTime: "12:39",
    messageTemplate: "Olá {nome}! 👋\n\nEsperamos que esteja bem!\n\n📋 *Detalhes do Serviço*\n○ Serviço: {servico}\n○ Valor: R$ {valor}\n○ Vencimento: {dias}\n\n💳 *Opções de Pagamento*\nPara sua comodidade, disponibilizamos o pagamento via PIX:"
};

const client = {
    id: "1734189772123",
    name: "Anderson Silva",
    whatsapp: "5583994094835",
    service: "Manutenção de site",
    value: 80,
    billingDay: 15,
    recurrence: "monthly"
};

const apiConfig = {
    apiUrl: "https://evolution.abdesignerpro.com.br",
    instanceName: "anderson",
    apiKey: "E62B2FC8FEB2-48A8-8AAC-38C637367B96",
    pixName: "AndersonBarbosa",
    pixCity: "CampinaGrande",
    pixKey: "70408834498",
    pixTxid: "abdesignerpro",
    pixKeyType: "cpf"
};

// Armazena os dados em memória
BaseScheduler.inMemoryStorage['automaticSendingConfig'] = JSON.stringify(config);
BaseScheduler.inMemoryStorage['clients'] = JSON.stringify([client]);
BaseScheduler.inMemoryStorage['apiConfig'] = JSON.stringify(apiConfig);

// Cria uma instância do scheduler e testa o envio
class TestScheduler extends BaseScheduler {
    start() { }
    stop() { }
}

const scheduler = new TestScheduler();
scheduler.testSendMessages().then(() => {
    console.log('Teste concluído');
    process.exit(0);
}).catch(error => {
    console.error('Erro:', error);
    process.exit(1);
});
