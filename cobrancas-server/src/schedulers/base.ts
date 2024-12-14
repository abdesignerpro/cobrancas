// Base Scheduler que será usado tanto local quanto no servidor
export abstract class BaseScheduler {
  protected config: any;
  static inMemoryStorage: { [key: string]: string } = {};

  constructor() {
    this.loadConfig();
  }

  abstract start(): void;
  abstract stop(): void;

  // Método público para teste
  public async testSendMessages() {
    return this.checkAndSendMessages();
  }

  protected async loadConfig() {
    try {
      const config = BaseScheduler.inMemoryStorage['automaticSendingConfig'];
      this.config = config ? JSON.parse(config) : {
        enabled: true,
        daysBeforeDue: "1",
        messageTemplate: "Olá {nome}! Lembrete de pagamento: R$ {valor} referente ao serviço de {servico}. Vencimento em {dias} dias."
      };
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }

  protected async checkAndSendMessages() {
    if (!this.config?.enabled) {
      console.log('Envio automático está desabilitado');
      return;
    }

    try {
      console.log('\n=== Iniciando verificação de mensagens ===');
      console.log('Configuração atual:', this.config);
      
      const apiConfig = BaseScheduler.inMemoryStorage['apiConfig'];
      console.log('API Config:', apiConfig ? JSON.parse(apiConfig) : 'Não encontrada');
      
      const clients = await this.getClientsToNotify();
      console.log('\nClientes para notificar:', clients);
      
      if (clients.length === 0) {
        console.log('Nenhum cliente para notificar hoje.');
        return;
      }

      for (const client of clients) {
        await this.sendMessage(client);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
    }
  }

  protected async getClientsToNotify() {
    const clients = BaseScheduler.inMemoryStorage['clients'];
    if (!clients) {
      console.log('Nenhum cliente encontrado no armazenamento');
      return [];
    }

    const clientList = JSON.parse(clients);
    console.log('\nTotal de clientes:', clientList.length);
    console.log('Data atual:', new Date().toISOString());
    console.log('Dias antes do vencimento:', this.config.daysBeforeDue);

    const toNotify = clientList.filter((client: any) => {
      const shouldNotify = this.shouldNotifyClient(client);
      if (shouldNotify) {
        console.log('\nCliente que será notificado:', client.name);
        console.log('Dia de cobrança:', client.billingDay);
        console.log('Recorrência:', client.recurrence);
        console.log('Última cobrança:', client.lastBillingDate);
      }
      return shouldNotify;
    });
    
    console.log('Clientes filtrados para notificação:', toNotify);
    return toNotify;
  }

  protected shouldNotifyClient(client: any): boolean {
    const config = JSON.parse(BaseScheduler.inMemoryStorage['automaticSendingConfig'] || '{}');
    const daysBeforeDue = config.daysBeforeDue || '1';
    
    const today = new Date();
    const billingDay = client.billingDay;
    
    // Ajusta para o início do dia para evitar problemas com timezone
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log(`\nVerificando cliente ${client.name}:`);
    console.log('Data atual (raw):', today.toISOString());
    console.log('Data atual (ajustada):', todayStart.toISOString());
    console.log('Dia atual:', todayStart.getDate());
    console.log('Dia de vencimento:', billingDay);
    
    // Primeiro verifica se é o dia do vencimento
    if (todayStart.getDate() === billingDay) {
      console.log('É o dia do vencimento!');
      return true;
    }
    
    // Calcula a próxima data de vencimento
    let nextBillingDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    
    // Se hoje é depois do dia do vencimento, o próximo vencimento é no mês seguinte
    if (todayStart.getDate() > billingDay) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }
    
    // Calcula os dias até o vencimento usando as datas ajustadas
    const daysUntilDue = Math.round((nextBillingDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('Próximo vencimento:', nextBillingDate.toISOString());
    console.log('Dias até o vencimento:', daysUntilDue);
    console.log('Dias configurados para notificar antes:', daysBeforeDue);
    
    // Verifica se já foi enviada notificação hoje
    if (client.lastBillingDate) {
      const lastBilling = new Date(client.lastBillingDate);
      const isToday = lastBilling.getDate() === today.getDate() && 
                     lastBilling.getMonth() === today.getMonth() && 
                     lastBilling.getFullYear() === today.getFullYear();
      if (isToday) {
        console.log('Notificação já enviada hoje:', client.lastBillingDate);
        return false;
      }
    }
    
    // Se não for o dia do vencimento, verifica se faltam os dias configurados
    const daysBeforeDueNumber = parseInt(daysBeforeDue);
    const shouldNotify = daysUntilDue === daysBeforeDueNumber;
    
    console.log('Deve notificar?', shouldNotify);
    if (shouldNotify) {
      console.log('Motivo: Faltam exatamente', daysBeforeDueNumber, 'dias para o vencimento');
    } else {
      console.log('Motivo: Não é o dia do vencimento nem faltam', daysBeforeDueNumber, 'dias para o vencimento');
    }
    
    return shouldNotify;
  }

  protected async sendMessage(client: any) {
    try {
      const apiConfig = JSON.parse(BaseScheduler.inMemoryStorage['apiConfig'] || '{}');
      const message = this.generateMessage(client);
      const phoneNumber = client.whatsapp.replace(/\D/g, '');

      // Primeiro envia a mensagem de texto
      const textPayload = {
        number: phoneNumber,
        text: message,
        options: {
          delay: 1000,
          presence: "composing"
        }
      };

      const textResponse = await fetch(`${apiConfig.apiUrl}/message/sendText/${apiConfig.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiConfig.apiKey
        },
        body: JSON.stringify(textPayload)
      });

      const textResult = await textResponse.text();
      if (!textResponse.ok) {
        throw new Error(`Erro ao enviar mensagem de texto: ${textResult}`);
      }

      // Depois envia o QR Code como imagem
      const qrCodeUrl = `https://gerarqrcodepix.com.br/api/v1?nome=${apiConfig.pixName}&cidade=${apiConfig.pixCity}&valor=${client.value}&saida=qr&chave=${apiConfig.pixKey}&txid=${apiConfig.pixTxid}`;
      
      const mediaPayload = {
        number: phoneNumber,
        mediatype: "image",
        media: qrCodeUrl,
        fileName: "qrcode_pix.png",
        caption: "QR Code para pagamento via PIX\n\n*Código PIX abaixo para copiar e colar 👇🏼*",
        options: {
          delay: 1000,
          presence: "composing"
        }
      };

      const mediaResponse = await fetch(`${apiConfig.apiUrl}/message/sendMedia/${apiConfig.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiConfig.apiKey
        },
        body: JSON.stringify(mediaPayload)
      });

      const mediaResult = await mediaResponse.text();
      if (!mediaResponse.ok) {
        throw new Error(`Erro ao enviar QR Code: ${mediaResult}`);
      }

      // Por fim, envia o código PIX como texto
      const brcode = `00020126330014br.gov.bcb.pix0111${apiConfig.pixKey}5204000053039865406${client.value.toFixed(2)}5802BR5915${apiConfig.pixName}6013${apiConfig.pixCity}62170513${apiConfig.pixTxid}6304`;
      const crc16 = this.calculateCRC16(brcode);
      const fullBRCode = brcode + crc16;

      const pixPayload = {
        number: phoneNumber,
        text: `${fullBRCode}`,
        options: {
          delay: 1000,
          presence: "composing"
        }
      };

      const pixTextResponse = await fetch(`${apiConfig.apiUrl}/message/sendText/${apiConfig.instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiConfig.apiKey
        },
        body: JSON.stringify(pixPayload)
      });

      const pixResult = await pixTextResponse.text();
      if (!pixTextResponse.ok) {
        throw new Error(`Erro ao enviar código PIX: ${pixResult}`);
      }

      // Atualiza a data do último envio
      const updatedClient = {
        ...client,
        lastBillingDate: new Date().toISOString().split('T')[0]
      };

      // Atualiza o cliente no armazenamento
      const clients = JSON.parse(BaseScheduler.inMemoryStorage['clients'] || '[]');
      const updatedClients = clients.map((c: any) => 
        c.id === client.id ? updatedClient : c
      );
      BaseScheduler.inMemoryStorage['clients'] = JSON.stringify(updatedClients);

      console.log(`\n=== Mensagem enviada com sucesso para ${client.name} ===`);
    } catch (error) {
      console.error(`Erro ao enviar mensagem para ${client.name}:`, error);
    }
  }

  protected generateMessage(client: any): string {
    const config = JSON.parse(BaseScheduler.inMemoryStorage['automaticSendingConfig'] || '{}');
    const daysBeforeDue = parseInt(config.daysBeforeDue || '1');
    
    const today = new Date();
    const billingDay = client.billingDay;
    
    // Ajusta para o início do dia para evitar problemas com timezone
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Calcula a próxima data de vencimento
    let nextBillingDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    
    // Se hoje é depois do dia do vencimento, o próximo vencimento é no mês seguinte
    // Se hoje é o dia do vencimento, mantém a data atual
    if (todayStart.getDate() > billingDay) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }
    
    // Calcula os dias até o vencimento usando as datas ajustadas
    const daysUntilDue = Math.round((nextBillingDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Define o texto do vencimento
    let vencimentoText;
    if (daysUntilDue === 0) {
      vencimentoText = "hoje";
    } else if (daysUntilDue === 1) {
      vencimentoText = "amanhã";
    } else {
      vencimentoText = `em ${daysUntilDue} dias`;
    }

    return config.messageTemplate
      .replace('{nome}', client.name)
      .replace('{servico}', client.service)
      .replace('{valor}', client.value.toFixed(2))
      .replace('{dias}', vencimentoText);
  }

  private calculateCRC16(data: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >> 8) ^ this.crc16Table[(crc ^ data.charCodeAt(i)) & 0xFF];
    }
    return (crc & 0xFF).toString(16).padStart(2, '0') + ((crc >> 8) & 0xFF).toString(16).padStart(2, '0');
  }

  private crc16Table: number[] = [
    0x0000, 0x1189, 0x2312, 0x329B, 0x4624, 0x57AD, 0x6536, 0x74BF,
    0x8C48, 0x9DC1, 0xAF5A, 0xBED3, 0xCA6C, 0xDBE5, 0xE97E, 0xF8F7,
    0x1081, 0x0108, 0x3393, 0x221A, 0x56A5, 0x472C, 0x75B7, 0x643E,
    0x9CC9, 0x8D40, 0xBFDB, 0xAE52, 0xDAED, 0xCB64, 0xF9FF, 0xE876,
    0x2102, 0x308B, 0x0210, 0x1399, 0x6726, 0x76AF, 0x4434, 0x55BD,
    0xAD4A, 0xBCC3, 0x8E58, 0x9FD1, 0xEB6E, 0xFAE7, 0xC87C, 0xD9F5,
    0x3183, 0x200A, 0x1291, 0x0318, 0x77A7, 0x662E, 0x54B5, 0x453C,
    0xBDCB, 0xAC42, 0x9ED9, 0x8F50, 0xFBEF, 0xEA66, 0xD8FD, 0xC974,
    0x4204, 0x538D, 0x6116, 0x709F, 0x0420, 0x15A9, 0x2732, 0x36BB,
    0xCE4C, 0xDFC5, 0xED5E, 0xFCD7, 0x8868, 0x99E1, 0xAB7A, 0xBAF3,
    0x5285, 0x430C, 0x7197, 0x601E, 0x14A1, 0x0528, 0x37B3, 0x263A,
    0xDECD, 0xCF44, 0xFDDF, 0xEC56, 0x98E9, 0x8960, 0xBBFB, 0xAA72,
    0x6306, 0x728F, 0x4014, 0x519D, 0x2522, 0x34AB, 0x0630, 0x17B9,
    0xEF4E, 0xFEC7, 0xCC5C, 0xDDD5, 0xA96A, 0xB8E3, 0x8A78, 0x9BF1,
    0x7387, 0x620E, 0x5095, 0x411C, 0x35A3, 0x242A, 0x16B1, 0x0738,
    0xFFCF, 0xEE46, 0xDCDD, 0xCD54, 0xB9EB, 0xA862, 0x9AF9, 0x8B70,
    0x8408, 0x9581, 0xA71A, 0xB693, 0xC22C, 0xD3A5, 0xE13E, 0xF0B7,
    0x0840, 0x19C9, 0x2B52, 0x3ADB, 0x4E64, 0x5FED, 0x6D76, 0x7CFF,
    0x9489, 0x8500, 0xB79B, 0xA612, 0xD2AD, 0xC324, 0xF1BF, 0xE036,
    0x18C1, 0x0948, 0x3BD3, 0x2A5A, 0x5EE5, 0x4F6C, 0x7DF7, 0x6C7E,
    0xA50A, 0xB483, 0x8618, 0x9791, 0xE32E, 0xF2A7, 0xC03C, 0xD1B5,
    0x2942, 0x38CB, 0x0A50, 0x1BD9, 0x6F66, 0x7EEF, 0x4C74, 0x5DFD,
    0xB58B, 0xA402, 0x9699, 0x8710, 0xF3AF, 0xE226, 0xD0BD, 0xC134,
    0x39C3, 0x284A, 0x1AD1, 0x0B58, 0x7FE7, 0x6E6E, 0x5CF5, 0x4D7C,
    0xC60C, 0xD785, 0xE51E, 0xF497, 0x8028, 0x91A1, 0xA33A, 0xB2B3,
    0x4A44, 0x5BCD, 0x6956, 0x78DF, 0x0C60, 0x1DE9, 0x2F72, 0x3EFB,
    0xD68D, 0xC704, 0xF59F, 0xE416, 0x90A9, 0x8120, 0xB3BB, 0xA232,
    0x5AC5, 0x4B4C, 0x79D7, 0x685E, 0x1CE1, 0x0D68, 0x3FF3, 0x2E7A,
    0xE70E, 0xF687, 0xC41C, 0xD595, 0xA12A, 0xB0A3, 0x8238, 0x93B1,
    0x6B46, 0x7ACF, 0x4854, 0x59DD, 0x2D62, 0x3CEB, 0x0E70, 0x1FF9,
    0xF78F, 0xE606, 0xD49D, 0xC514, 0xB1AB, 0xA022, 0x92B9, 0x8330,
    0x7BC7, 0x6A4E, 0x58D5, 0x495C, 0x3DE3, 0x2C6A, 0x1EF1, 0x0F78
  ];
}
