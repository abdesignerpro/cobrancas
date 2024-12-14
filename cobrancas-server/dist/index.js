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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const local_1 = require("./schedulers/local");
const server_1 = require("./schedulers/server");
const base_1 = require("./schedulers/base");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001; // Porta correta do servidor
// Configuração do CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express_1.default.json());
// Determina qual scheduler usar baseado no ambiente
const isProduction = process.env.NODE_ENV === 'production';
const scheduler = isProduction ? new server_1.ServerScheduler() : new local_1.LocalScheduler();
// Configuração para servir arquivos estáticos do frontend
app.use(express_1.default.static(path_1.default.join(__dirname, '../../cobrancas-app/build')));
// Carrega configurações iniciais apenas se não existir
const defaultConfig = {
    enabled: true,
    daysBeforeDue: "1",
    sendTime: "13:27",
    messageTemplate: "Olá {nome}! 👋\n\nEsperamos que esteja bem!\n\n📋 *Detalhes do Serviço*\n○ Serviço: {servico}\n○ Valor: R$ {valor}\n○ Vencimento: {dias}\n\n💳 *Opções de Pagamento*\nPara sua comodidade, disponibilizamos o pagamento via PIX:"
};
if (!base_1.BaseScheduler.inMemoryStorage['automaticSendingConfig']) {
    const configPath = path_1.default.join(__dirname, '../data/config.json');
    try {
        const configFile = fs_1.default.readFileSync(configPath, 'utf8');
        base_1.BaseScheduler.inMemoryStorage['automaticSendingConfig'] = configFile;
    }
    catch (error) {
        base_1.BaseScheduler.inMemoryStorage['automaticSendingConfig'] = JSON.stringify(defaultConfig);
    }
}
// Endpoint para teste manual do scheduler
app.post('/test/check-messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Recebendo requisição para teste manual do scheduler');
        yield scheduler.testSendMessages();
        res.json({ message: 'Teste de envio executado com sucesso' });
    }
    catch (error) {
        console.error('Erro no teste:', error);
        res.status(500).json({ error: 'Erro ao executar teste' });
    }
}));
// Endpoint para iniciar o agendamento
app.post('/scheduler/start', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Recebendo requisição para iniciar o agendamento');
        yield scheduler.start();
        res.json({ message: 'Agendamento iniciado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao iniciar agendamento:', error);
        res.status(500).json({ error: 'Erro ao iniciar agendamento' });
    }
}));
// Endpoint para parar o agendamento
app.post('/scheduler/stop', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Recebendo requisição para parar o agendamento');
        yield scheduler.stop();
        res.json({ message: 'Agendamento parado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao parar agendamento:', error);
        res.status(500).json({ error: 'Erro ao parar agendamento' });
    }
}));
// Endpoint para atualizar configuração
app.post('/config/update', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Recebendo requisição para atualizar configuração:', req.body);
        base_1.BaseScheduler.inMemoryStorage['automaticSendingConfig'] = JSON.stringify(req.body);
        // Salva a configuração em disco também
        const configPath = path_1.default.join(__dirname, '../data/config.json');
        fs_1.default.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
        yield scheduler.start(); // Reinicia o agendamento com a nova configuração
        res.json({ message: 'Configuração atualizada com sucesso' });
    }
    catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
}));
// Endpoint para atualizar configuração da API
app.post('/api/config/update', (req, res) => {
    try {
        console.log('Recebendo configuração da API:', req.body);
        base_1.BaseScheduler.inMemoryStorage['apiConfig'] = JSON.stringify(req.body);
        res.json({ message: 'Configuração da API atualizada com sucesso' });
    }
    catch (error) {
        console.error('Erro ao atualizar configuração da API:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração da API' });
    }
});
// Endpoint para recuperar configuração da API
app.get('/api/config', (req, res) => {
    try {
        console.log('Recebendo requisição para recuperar configuração da API');
        const apiConfig = base_1.BaseScheduler.inMemoryStorage['apiConfig'];
        res.json(apiConfig ? JSON.parse(apiConfig) : null);
    }
    catch (error) {
        console.error('Erro ao recuperar configuração da API:', error);
        res.status(500).json({ error: 'Erro ao recuperar configuração da API' });
    }
});
// Endpoint para recuperar clientes
app.get('/clients', (req, res) => {
    try {
        console.log('Recebendo requisição para recuperar clientes');
        const clients = base_1.BaseScheduler.inMemoryStorage['clients'];
        res.json(clients ? JSON.parse(clients) : []);
    }
    catch (error) {
        console.error('Erro ao recuperar clientes:', error);
        res.status(500).json({ error: 'Erro ao recuperar clientes' });
    }
});
// Endpoint para atualizar lista de clientes
app.post('/clients/update', (req, res) => {
    try {
        console.log('Recebendo atualização de clientes:', req.body);
        // Remove lastBillingDate para teste
        const clients = req.body.map((client) => {
            const { lastBillingDate } = client, rest = __rest(client, ["lastBillingDate"]);
            return rest;
        });
        base_1.BaseScheduler.inMemoryStorage['clients'] = JSON.stringify(clients);
        res.json({ message: 'Lista de clientes atualizada com sucesso' });
    }
    catch (error) {
        console.error('Erro ao atualizar lista de clientes:', error);
        res.status(500).json({ error: 'Erro ao atualizar lista de clientes' });
    }
});
// Se o script foi executado com a flag --check-messages
if (process.argv.includes('--check-messages')) {
    console.log('Executando verificação agendada de mensagens...');
    console.log('Argumentos:', process.argv);
    console.log('Diretório atual:', process.cwd());
    // Carrega as configurações iniciais
    const defaultConfig = {
        enabled: true,
        daysBeforeDue: "1",
        sendTime: "13:27",
        messageTemplate: "Olá {nome}! 👋\n\nEsperamos que esteja bem!\n\n📋 *Detalhes do Serviço*\n○ Serviço: {servico}\n○ Valor: R$ {valor}\n○ Vencimento: {dias}\n\n💳 *Opções de Pagamento*\nPara sua comodidade, disponibilizamos o pagamento via PIX:"
    };
    try {
        // Carrega os clientes do arquivo
        const clientsPath = require('path').resolve(__dirname, '../data/clients.json');
        const clientsData = require('fs').readFileSync(clientsPath, 'utf8');
        const clients = JSON.parse(clientsData);
        console.log('Clientes carregados:', clients);
        base_1.BaseScheduler.inMemoryStorage['clients'] = JSON.stringify(clients);
        // Carrega a configuração da API
        const apiConfigPath = require('path').resolve(__dirname, '../data/api_config.json');
        const apiConfigData = require('fs').readFileSync(apiConfigPath, 'utf8');
        const apiConfig = JSON.parse(apiConfigData);
        console.log('Configuração da API carregada:', apiConfig);
        base_1.BaseScheduler.inMemoryStorage['apiConfig'] = JSON.stringify(apiConfig);
    }
    catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
    if (!base_1.BaseScheduler.inMemoryStorage['automaticSendingConfig']) {
        base_1.BaseScheduler.inMemoryStorage['automaticSendingConfig'] = JSON.stringify(defaultConfig);
    }
    // Teste manual do cálculo de dias
    const client = JSON.parse(base_1.BaseScheduler.inMemoryStorage['clients'])[0];
    const today = new Date();
    const billingDay = client.billingDay;
    let nextBillingDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    if (today.getDate() >= billingDay) {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }
    const daysUntilDue = Math.ceil((nextBillingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    console.log('\nTeste manual de datas:');
    console.log('Data atual:', today.toISOString());
    console.log('Dia de vencimento:', billingDay);
    console.log('Próximo vencimento:', nextBillingDate.toISOString());
    console.log('Dias até o vencimento:', daysUntilDue);
    console.log('Deve notificar?', daysUntilDue === 1);
    // Executa o teste
    scheduler.testSendMessages().then(() => {
        console.log('Verificação concluída com sucesso');
        process.exit(0);
    }).catch(error => {
        console.error('Erro ao executar verificação:', error);
        process.exit(1);
    });
}
else {
    // Inicia o servidor normalmente
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}
