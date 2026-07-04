const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(path.join(dbDir, 'tickets.db'));

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    staff_id TEXT,
    status TEXT NOT NULL DEFAULT 'aberto',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    closed_at TEXT,
    close_reason TEXT
  );

  CREATE TABLE IF NOT EXISTS ticket_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    added_by TEXT NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(channel_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS config (
    guild_id TEXT PRIMARY KEY,
    ticket_category TEXT,
    staff_role TEXT,
    logs_channel TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS category_channels (
    guild_id TEXT NOT NULL,
    category TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    PRIMARY KEY (guild_id, category)
  );
`);

logger.info('Banco de dados SQLite (node:sqlite) inicializado com sucesso.');

const ticketDB = {
  criar(channelId, userId, category) {
    const stmt = db.prepare(`
      INSERT INTO tickets (channel_id, user_id, category)
      VALUES (?, ?, ?)
    `);
    return stmt.run(channelId, userId, category);
  },

  buscarPorCanal(channelId) {
    return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
  },

  buscarTicketAbertoDoUsuario(userId, category) {
    return db.prepare(`
      SELECT * FROM tickets WHERE user_id = ? AND category = ? AND status = 'aberto'
    `).get(userId, category);
  },

  assumir(channelId, staffId) {
    return db.prepare(`
      UPDATE tickets SET staff_id = ? WHERE channel_id = ?
    `).run(staffId, channelId);
  },

  fechar(channelId, closeReason) {
    return db.prepare(`
      UPDATE tickets
      SET status = 'fechado', closed_at = datetime('now', 'localtime'), close_reason = ?
      WHERE channel_id = ?
    `).run(closeReason ?? null, channelId);
  },

  listarAbertos() {
    return db.prepare("SELECT * FROM tickets WHERE status = 'aberto'").all();
  },

  adicionarMembro(channelId, userId, addedBy) {
    try {
      return db.prepare(`
        INSERT INTO ticket_members (channel_id, user_id, added_by)
        VALUES (?, ?, ?)
      `).run(channelId, userId, addedBy);
    } catch {
      return null;
    }
  },

  removerMembro(channelId, userId) {
    return db.prepare(`
      DELETE FROM ticket_members WHERE channel_id = ? AND user_id = ?
    `).run(channelId, userId);
  },

  buscarMembros(channelId) {
    return db.prepare('SELECT * FROM ticket_members WHERE channel_id = ?').all(channelId);
  },

  salvarConfig(guildId, data) {
    return db.prepare(`
      INSERT INTO config (guild_id, ticket_category, staff_role, logs_channel)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        ticket_category = excluded.ticket_category,
        staff_role = excluded.staff_role,
        logs_channel = excluded.logs_channel,
        updated_at = datetime('now', 'localtime')
    `).run(guildId, data.ticketCategory, data.staffRole, data.logsChannel);
  },

  buscarConfig(guildId) {
    return db.prepare('SELECT * FROM config WHERE guild_id = ?').get(guildId);
  },

  salvarCategoriaCanal(guildId, category, channelId) {
    return db.prepare(`
      INSERT INTO category_channels (guild_id, category, channel_id)
      VALUES (?, ?, ?)
      ON CONFLICT(guild_id, category) DO UPDATE SET
        channel_id = excluded.channel_id,
        updated_at = datetime('now', 'localtime')
    `).run(guildId, category, channelId);
  },

  removerCategoriaCanal(guildId, category) {
    return db.prepare(`
      DELETE FROM category_channels WHERE guild_id = ? AND category = ?
    `).run(guildId, category);
  },

  buscarCategoriasCanais(guildId) {
    const linhas = db.prepare(`
      SELECT category, channel_id FROM category_channels WHERE guild_id = ?
    `).all(guildId);
    const mapa = {};
    for (const linha of linhas) mapa[linha.category] = linha.channel_id;
    return mapa;
  },

  // Marca como fechado (sem tentar excluir canal) um ticket cujo canal já não existe mais.
  fecharPorCanalInexistente(channelId) {
    return db.prepare(`
      UPDATE tickets
      SET status = 'fechado', closed_at = datetime('now', 'localtime'), close_reason = 'canal_excluido_manualmente'
      WHERE channel_id = ? AND status = 'aberto'
    `).run(channelId);
  },
};

module.exports = ticketDB;
