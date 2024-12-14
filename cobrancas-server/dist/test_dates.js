// Função para testar o cálculo de datas
function testDateCalculation(currentDate, billingDay) {
    console.log('\n=== Teste de Datas ===');
    console.log('Data atual:', currentDate.toISOString());
    console.log('Dia de vencimento:', billingDay);
    // Calcula a próxima data de vencimento
    let nextBillingDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), billingDay);
    if (currentDate.getDate() >= billingDay) {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }
    // Calcula os dias até o vencimento
    const daysUntilDue = Math.ceil((nextBillingDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log('Próximo vencimento:', nextBillingDate.toISOString());
    console.log('Dias até o vencimento:', daysUntilDue);
    console.log('Deve notificar?', daysUntilDue === 1);
    console.log('-------------------');
}
// Testes com diferentes cenários
console.log('Executando testes de datas...\n');
// Teste 1: Dia atual é 14, vencimento é 15 (deveria notificar)
const test1 = new Date(2024, 11, 14); // 14 de dezembro
testDateCalculation(test1, 15);
// Teste 2: Dia atual é 15, vencimento é 15 (não deveria notificar)
const test2 = new Date(2024, 11, 15); // 15 de dezembro
testDateCalculation(test2, 15);
// Teste 3: Dia atual é 13, vencimento é 15 (não deveria notificar)
const test3 = new Date(2024, 11, 13); // 13 de dezembro
testDateCalculation(test3, 15);
// Teste 4: Dia atual é 14, vencimento é 16 (não deveria notificar)
const test4 = new Date(2024, 11, 14); // 14 de dezembro
testDateCalculation(test4, 16);
// Teste 5: Último dia do mês
const test5 = new Date(2024, 11, 31); // 31 de dezembro
testDateCalculation(test5, 1); // Vencimento dia 1
