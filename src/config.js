const fs = require('fs');
const path = require('path');
const { CATEGORIAS } = require('./utils/embeds');

let fileConfig = {};
try {
  fileConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));
} catch {}

// Permite configurar a categoria do Discord de cada tipo de ticket via variável de ambiente,
// no formato CATEGORIA_<TIPO> (ex: CATEGORIA_DENUNCIA, CATEGORIA_DOACAO, CATEGORIA_DUVIDA...).
// Isso é útil pra configurar tudo direto no painel do Railway, sem precisar rodar comando no Discord.
const categoryChannelsEnv = {};
for (const tipo of Object.keys(CATEGORIAS)) {
  const envKey = `CATEGORIA_${tipo.toUpperCase()}`;
  if (process.env[envKey]) categoryChannelsEnv[tipo] = process.env[envKey];
}

const config = {
  token: process.env.DISCORD_TOKEN || fileConfig.token,
  clientId: process.env.DISCORD_CLIENT_ID || fileConfig.clientId,
  guildId: process.env.DISCORD_GUILD_ID || fileConfig.guildId,
  ticketCategory: process.env.TICKET_CATEGORY || fileConfig.ticketCategory || null,
  staffRole: process.env.STAFF_ROLE || fileConfig.staffRole || null,
  logsChannel: process.env.LOGS_CHANNEL || fileConfig.logsChannel || null,
  // Ordem de prioridade: variáveis de ambiente primeiro, depois config.json (se existir).
  categoryChannels: { ...categoryChannelsEnv, ...(fileConfig.categoryChannels || {}) },
};

module.exports = config;
