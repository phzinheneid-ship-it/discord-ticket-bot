const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Bot online como ${client.user.tag}`);
    logger.info(`Servindo ${client.guilds.cache.size} servidor(es)`);
    logger.info(`Total de comandos: ${client.commands.size}`);

    client.user.setPresence({
      activities: [
        {
          name: '🎫 Sistema de Tickets',
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });

    setInterval(() => {
      const atividades = [
        { name: '🎫 Sistema de Tickets', type: ActivityType.Watching },
        { name: `${client.guilds.cache.size} servidor(es)`, type: ActivityType.Watching },
        { name: '/ticket para abrir suporte', type: ActivityType.Listening },
      ];
      const atividade = atividades[Math.floor(Math.random() * atividades.length)];
      client.user.setActivity(atividade.name, { type: atividade.type });
    }, 30000);
  },
};
