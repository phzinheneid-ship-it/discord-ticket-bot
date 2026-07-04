const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const http = require('http');
const { token } = require('./config');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot online!');
});
server.listen(PORT, () => {
  logger.info(`Servidor keep-alive rodando na porta ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();
client.cooldowns = new Collection();

(async () => {
  try {
    await loadCommands(client);
    await loadEvents(client);

    client.on('error', (error) => {
      logger.error(`Erro no cliente Discord: ${error.message}`);
    });

    client.on('warn', (info) => {
      logger.warn(`Aviso do cliente Discord: ${info}`);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Promise não tratada em: ${promise}, motivo: ${reason}`);
    });

    process.on('uncaughtException', (error) => {
      logger.error(`Exceção não capturada: ${error.message}`);
      process.exit(1);
    });

    await client.login(token);
  } catch (error) {
    logger.error(`Falha ao iniciar o bot: ${error.message}`);
    process.exit(1);
  }
})();
