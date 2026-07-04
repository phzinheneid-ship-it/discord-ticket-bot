const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '../commands');
  const categories = fs.readdirSync(commandsPath);

  let total = 0;

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      try {
        const command = require(filePath);

        if (!command.data || !command.execute) {
          logger.warn(`Comando em ${filePath} não tem 'data' ou 'execute'.`);
          continue;
        }

        client.commands.set(command.data.name, command);
        total++;
        logger.info(`Comando carregado: /${command.data.name}`);
      } catch (error) {
        logger.error(`Erro ao carregar ${filePath}: ${error.message}`);
      }
    }
  }

  logger.info(`Total de comandos carregados: ${total}`);
}

module.exports = { loadCommands };
