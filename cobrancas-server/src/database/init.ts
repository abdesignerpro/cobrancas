import sequelize from './index';
import Charge from './models/Charge';
import Config from './models/Config';

const initializeDatabase = async () => {
  try {
    // Força a recriação das tabelas
    await sequelize.sync({ force: true });
    console.log('Banco de dados sincronizado com sucesso');
  } catch (error) {
    console.error('Erro ao sincronizar banco de dados:', error);
    throw error;
  }
};

// Executa a inicialização se este arquivo for executado diretamente
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Inicialização completa!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Falha na inicialização:', error);
      process.exit(1);
    });
}

export default initializeDatabase;
