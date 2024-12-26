import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import initializeDatabase from './database/init';
import Charge from './database/models/Charge';
import Config from './database/models/Config';
import axios from 'axios';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Função para enviar mensagem via WhatsApp
async function sendWhatsAppMessage(phoneNumber: string, message: string, apiConfig: any) {
  try {
    const payload = {
      number: phoneNumber,
      text: message,
      apikey: apiConfig.apiKey,
      delay: 2
    };

    const response = await axios.post(`${apiConfig.apiUrl}/message/sendText/${apiConfig.instanceName}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiConfig.apiKey
      }
    });
    
    console.log('Mensagem enviada com sucesso:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
}

// Função para verificar cobranças agendadas
async function checkScheduledCharges() {
  try {
    // Ajusta para o fuso horário de Brasília (UTC-3)
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    console.log('\n=== Verificando cobranças agendadas ===');
    console.log('Data atual:', today.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

    // Busca configurações
    const configs = await Config.findAll();
    const configObject: { [key: string]: string } = {};
    configs.forEach(c => {
      configObject[c.key] = c.value;
    });
    
    console.log('Configurações:', configObject);

    // Verifica se o envio automático está ativado
    if (configObject.automaticSendingEnabled !== 'true') {
      console.log('Envio automático desativado');
      return;
    }

    // Verifica se é hora de enviar
    const sendTime = configObject.sendTime || '09:00';
    const [sendHour, sendMinute] = sendTime.split(':').map(Number);
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    console.log('Horário configurado:', sendTime);
    console.log('Horário atual:', `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);

    if (currentHour !== sendHour || currentMinute !== sendMinute) {
      console.log('Fora do horário de envio');
      return;
    }

    // Busca cobranças
    const charges = await Charge.findAll();
    console.log('Total de cobranças:', charges.length);

    // Dias antes do vencimento
    const daysBeforeDue = parseInt(configObject.daysBeforeDue || '1');
    console.log('Dias antes do vencimento:', daysBeforeDue);

    for (const charge of charges) {
      console.log('\nVerificando cobrança:', charge.name);

      // Calcula a data do próximo vencimento
      const nextDueDate = new Date();
      nextDueDate.setDate(charge.billingDay);
      if (nextDueDate < today) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      // Calcula a data de envio (dias antes do vencimento)
      const sendDate = new Date(nextDueDate);
      sendDate.setDate(sendDate.getDate() - daysBeforeDue);

      console.log('Data de vencimento:', nextDueDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
      console.log('Data de envio:', sendDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
      console.log('Data atual:', today.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

      // Verifica se é dia de enviar
      if (
        sendDate.getDate() === today.getDate() &&
        sendDate.getMonth() === today.getMonth() &&
        sendDate.getFullYear() === today.getFullYear()
      ) {
        console.log('É dia de enviar cobrança');

        // Verifica se já foi enviado hoje
        const lastBillingDate = charge.lastBillingDate ? new Date(charge.lastBillingDate) : null;
        if (!lastBillingDate || lastBillingDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) !== today.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })) {
          try {
            // Formata a mensagem
            const messageTemplate = configObject.messageTemplate || '';
            const formattedValue = Number(charge.value).toFixed(2);
            const message = messageTemplate
              .replace(/{nome}/g, charge.name)
              .replace(/{servico}/g, charge.service)
              .replace(/{valor}/g, formattedValue)
              .replace(/{dias}/g, charge.billingDay.toString());

            console.log('Mensagem formatada:', message);

            // Envia a mensagem
            await sendWhatsAppMessage(
              charge.whatsapp.replace(/\D/g, ''),
              message,
              configObject
            );

            // Atualiza a data do último envio
            await charge.update({
              lastBillingDate: today.toISOString().split('T')[0]
            });

            console.log('Cobrança enviada com sucesso');
          } catch (error) {
            console.error('Erro ao enviar cobrança:', error);
          }
        } else {
          console.log('Já foi enviado hoje');
        }
      } else {
        console.log('Não é dia de enviar');
      }
    }
  } catch (error) {
    console.error('Erro ao verificar cobranças agendadas:', error);
  }
}

// Agenda a verificação para rodar a cada minuto
cron.schedule('* * * * *', () => {
  console.log('\n=== Iniciando verificação agendada ===');
  checkScheduledCharges();
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({ message: 'API do Sistema de Cobranças está funcionando!' });
});

// Rotas de Configuração
app.get('/config', async (req, res) => {
  try {
    const configs = await Config.findAll();
    const configObject: { [key: string]: any } = {};
    configs.forEach((config) => {
      configObject[config.key] = config.value;
    });
    res.json(configObject);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

app.post('/config', async (req, res) => {
  try {
    const configData = req.body;
    
    // Converte o objeto de configuração em registros individuais
    for (const [key, value] of Object.entries(configData)) {
      await Config.upsert({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value)
      });
    }
    
    res.status(200).json({ message: 'Configurações salvas com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

// Rotas de Cobranças
app.get('/charges', async (req, res) => {
  try {
    const charges = await Charge.findAll();
    res.json(charges);
  } catch (error) {
    console.error('Erro ao buscar cobranças:', error);
    res.status(500).json({ error: 'Erro ao buscar cobranças' });
  }
});

app.post('/charges', async (req, res) => {
  try {
    console.log('Recebendo requisição POST /charges:', req.body);

    // Se for um array, cria/atualiza múltiplas cobranças
    if (Array.isArray(req.body)) {
      const charges = await Promise.all(
        req.body.map(async (charge) => {
          try {
            if (!charge.id) {
              console.error('Erro: ID não fornecido para a cobrança:', charge);
              return null;
            }

            // Converte o valor para número
            const value = typeof charge.value === 'string' 
              ? parseFloat(charge.value) 
              : charge.value;

            // Converte o billingDay para número
            const billingDay = typeof charge.billingDay === 'string'
              ? parseInt(charge.billingDay)
              : charge.billingDay;

            const [updatedCharge, created] = await Charge.upsert({
              id: charge.id,
              name: charge.name,
              whatsapp: charge.whatsapp,
              service: charge.service,
              value: value,
              billingDay: billingDay,
              recurrence: charge.recurrence,
              lastBillingDate: charge.lastBillingDate
            });

            console.log(
              created ? 'Cobrança criada:' : 'Cobrança atualizada:',
              updatedCharge.toJSON()
            );

            return updatedCharge;
          } catch (error) {
            console.error('Erro ao processar cobrança:', charge, error);
            return null;
          }
        })
      );

      // Remove os nulls do array
      const validCharges = charges.filter(charge => charge !== null);
      console.log('Cobranças processadas:', validCharges);

      res.status(201).json(validCharges);
    } 
    // Se for um objeto único, cria/atualiza uma única cobrança
    else {
      const charge = req.body;
      
      if (!charge.id) {
        throw new Error('ID não fornecido para a cobrança');
      }

      // Converte o valor para número
      const value = typeof charge.value === 'string' 
        ? parseFloat(charge.value) 
        : charge.value;

      // Converte o billingDay para número
      const billingDay = typeof charge.billingDay === 'string'
        ? parseInt(charge.billingDay)
        : charge.billingDay;

      const [updatedCharge, created] = await Charge.upsert({
        id: charge.id,
        name: charge.name,
        whatsapp: charge.whatsapp,
        service: charge.service,
        value: value,
        billingDay: billingDay,
        recurrence: charge.recurrence,
        lastBillingDate: charge.lastBillingDate
      });

      console.log(
        created ? 'Cobrança criada:' : 'Cobrança atualizada:',
        updatedCharge.toJSON()
      );

      res.status(created ? 201 : 200).json(updatedCharge);
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar cobrança:', error);
    res.status(500).json({ error: 'Erro ao criar/atualizar cobrança' });
  }
});

app.put('/charges/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Charge.update(req.body, {
      where: { id }
    });
    if (updated) {
      const updatedCharge = await Charge.findByPk(id);
      res.json(updatedCharge);
    } else {
      res.status(404).json({ error: 'Cobrança não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao atualizar cobrança:', error);
    res.status(500).json({ error: 'Erro ao atualizar cobrança' });
  }
});

app.delete('/charges/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Charge.destroy({
      where: { id }
    });
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Cobrança não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao excluir cobrança:', error);
    res.status(500).json({ error: 'Erro ao excluir cobrança' });
  }
});

// Interface para os parâmetros da query
interface PixQueryParams {
  nome?: string;
  cidade?: string;
  valor?: string;
  chave?: string;
  txid?: string;
}

// Endpoint para gerar código PIX e QR Code
app.get('/pix/generate', async (req, res) => {
  try {
    const { nome, cidade, valor, chave, txid } = req.query as PixQueryParams;
    
    console.log('Parâmetros recebidos:', { nome, cidade, valor, chave, txid });
    
    if (!nome || !cidade || !valor || !chave || !txid) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos'
      });
    }
    
    // Busca o código PIX
    const pixUrl = `https://gerarqrcodepix.com.br/api/v1?nome=${encodeURIComponent(nome)}&cidade=${encodeURIComponent(cidade)}&valor=${valor}&saida=br&chave=${encodeURIComponent(chave)}&txid=${encodeURIComponent(txid)}`;
    console.log('URL do PIX:', pixUrl);
    
    const pixResponse = await axios.get(pixUrl);
    console.log('Resposta do PIX:', pixResponse.data);
    
    // Busca o QR Code
    const qrCodeUrl = `https://gerarqrcodepix.com.br/api/v1?nome=${encodeURIComponent(nome)}&cidade=${encodeURIComponent(cidade)}&valor=${valor}&saida=qr&chave=${encodeURIComponent(chave)}&txid=${encodeURIComponent(txid)}`;
    console.log('URL do QR Code:', qrCodeUrl);
    
    res.json({
      success: true,
      pixCode: pixResponse.data,
      qrCodeUrl
    });
  } catch (error: any) {
    console.error('Erro ao gerar PIX:', error.message);
    if (error.response) {
      console.error('Resposta de erro:', error.response.data);
    }
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar código PIX'
    });
  }
});

// Função para gerar QR Code PIX
app.get('/generate-pix-qr', async (req, res) => {
  try {
    const { nome, cidade, valor, chave, txid } = req.query as PixQueryParams;
    
    if (!nome || !cidade || !valor || !chave || !txid) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros inválidos'
      });
    }
    
    const qrCodeUrl = `https://gerarqrcodepix.com.br/api/v1?nome=${encodeURIComponent(nome)}&cidade=${encodeURIComponent(cidade)}&valor=${valor}&saida=qr&chave=${encodeURIComponent(chave)}&txid=${encodeURIComponent(txid)}`;
    
    const response = await axios.get(qrCodeUrl, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(response.data as ArrayBuffer).toString('base64');
    
    res.json({ 
      success: true, 
      qrcode: `data:image/png;base64,${base64Image}` 
    });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar QR Code PIX' 
    });
  }
});

// Inicializa o banco de dados e inicia o servidor
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      // Executa a verificação de cobranças assim que o servidor iniciar
      checkScheduledCharges();
    });
  })
  .catch((error) => {
    console.error('Erro ao inicializar o servidor:', error);
    process.exit(1);
  });
