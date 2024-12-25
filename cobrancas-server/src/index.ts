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
      message: message,
      ...apiConfig
    };

    const response = await axios.post('https://api.z-api.io/instances/3C6938B52A93B3378D0D5834A44DC873/token/A8B5DF14C35D80D9F9A4967B/send-text', payload);
    
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
    const today = new Date();
    console.log('\n=== Verificando cobranças agendadas ===');
    console.log('Data atual:', today.toLocaleString());

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

    console.log('Horário configurado:', sendHour + ':' + sendMinute);
    console.log('Horário atual:', currentHour + ':' + currentMinute);

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

      console.log('Data de vencimento:', nextDueDate.toLocaleDateString());
      console.log('Data de envio:', sendDate.toLocaleDateString());
      console.log('Data atual:', today.toLocaleDateString());

      // Verifica se é dia de enviar
      if (
        sendDate.getDate() === today.getDate() &&
        sendDate.getMonth() === today.getMonth() &&
        sendDate.getFullYear() === today.getFullYear()
      ) {
        console.log('É dia de enviar cobrança');

        // Verifica se já foi enviado hoje
        const lastBillingDate = charge.lastBillingDate ? new Date(charge.lastBillingDate) : null;
        if (!lastBillingDate || lastBillingDate.toLocaleDateString() !== today.toLocaleDateString()) {
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
