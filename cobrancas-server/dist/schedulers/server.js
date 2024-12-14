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
exports.ServerScheduler = void 0;
const node_schedule_1 = __importDefault(require("node-schedule"));
const base_1 = require("./base");
class ServerScheduler extends base_1.BaseScheduler {
    constructor() {
        super(...arguments);
        this.jobs = [];
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Cancela jobs existentes
            this.stop();
            if (!((_a = this.config) === null || _a === void 0 ? void 0 : _a.enabled))
                return;
            const time = this.config.sendTime || '09:00';
            const [hours, minutes] = time.split(':');
            // Cria regra para executar todo dia no horário configurado
            const rule = new node_schedule_1.default.RecurrenceRule();
            rule.hour = parseInt(hours);
            rule.minute = parseInt(minutes);
            // Agenda o job
            const job = node_schedule_1.default.scheduleJob(rule, () => this.checkAndSendMessages());
            this.jobs.push(job);
            console.log(`Agendamento configurado para ${time}`);
        });
    }
    stop() {
        // Cancela todos os jobs agendados
        this.jobs.forEach(job => job.cancel());
        this.jobs = [];
        console.log('Agendamentos cancelados');
    }
}
exports.ServerScheduler = ServerScheduler;
