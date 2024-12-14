"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testClients = void 0;
exports.testClients = [
    {
        id: '1',
        name: 'Cliente Mensal',
        whatsapp: '5511999999999',
        service: 'Manutenção',
        value: 100,
        billingDay: new Date().getDate() + 1, // Vence amanhã
        recurrence: 'monthly',
        lastBillingDate: null
    },
    {
        id: '2',
        name: 'Cliente Trimestral',
        whatsapp: '5511999999998',
        service: 'Manutenção de site',
        value: 300,
        billingDay: new Date().getDate() + 1, // Vence amanhã
        recurrence: '3_months',
        lastBillingDate: null
    },
    {
        id: '3',
        name: 'Cliente Semestral',
        whatsapp: '5511999999997',
        service: 'Hospedagem',
        value: 600,
        billingDay: new Date().getDate() + 1, // Vence amanhã
        recurrence: '6_months',
        lastBillingDate: null
    },
    {
        id: '4',
        name: 'Cliente Já Cobrado',
        whatsapp: '5511999999996',
        service: 'Manutenção',
        value: 150,
        billingDay: new Date().getDate() + 1,
        recurrence: 'monthly',
        lastBillingDate: new Date().toISOString() // Já foi cobrado este mês
    }
];
