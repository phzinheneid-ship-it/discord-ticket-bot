const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  let total = 0;

  for (const file of files) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = require(filePath);

      if (!event.name || !event.execute) {
        logger.warn(`Evento em ${filePath} não tem 'name' ou 'execute'.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      total++;
      logger.info(`Evento carregado: ${event.name}`);
    } catch (error) {
      logger.error(`Erro ao carregar evento ${filePath}: ${error.message}`);
    }
  }

  logger.info(`Total de eventos carregados: ${total}`);
}

module.exports = { loadEvents };
