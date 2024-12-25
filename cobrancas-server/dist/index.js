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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const init_1 = __importDefault(require("./database/init"));
const Charge_1 = __importDefault(require("./database/models/Charge"));
const Config_1 = __importDefault(require("./database/models/Config"));
// Carrega variáveis de ambiente
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Rotas
app.get('/config', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const configs = yield Config_1.default.findAll();
        res.json(configs);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
}));
app.get('/charges', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const charges = yield Charge_1.default.findAll();
        res.json(charges);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cobranças' });
    }
}));
app.post('/charges', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const charge = yield Charge_1.default.create(req.body);
        res.status(201).json(charge);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar cobrança' });
    }
}));
// Inicializa o banco de dados e inicia o servidor
(0, init_1.default)()
    .then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
})
    .catch((error) => {
    console.error('Erro ao inicializar o servidor:', error);
    process.exit(1);
});
