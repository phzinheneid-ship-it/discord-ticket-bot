const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const ticketDB = require('../../database/database');
const { embedSucesso, embedErro } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configurar')
    .setDescription('Configura o sistema de tickets do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('categoria')
        .setDescription('Categoria onde os canais de tickets serão criados')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .addRoleOption(opt =>
      opt.setName('cargo_equipe')
        .setDescription('Cargo da equipe de suporte')
        .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('logs')
        .setDescription('Canal para envio dos logs de tickets')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  cooldown: 5,

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const categoria = interaction.options.getChannel('categoria');
    const cargoEquipe = interaction.options.getRole('cargo_equipe');
    const canalLogs = interaction.options.getChannel('logs');

    if (!categoria && !cargoEquipe && !canalLogs) {
      const configAtual = ticketDB.buscarConfig(interaction.guild.id);
      if (!configAtual) {
        return interaction.editReply({
          embeds: [embedErro('Nenhuma configuração encontrada. Forneça ao menos um parâmetro para configurar.')],
        });
      }

      return interaction.editReply({
        embeds: [{
          color: 0x5865F2,
          title: '⚙️ Configuração Atual',
          fields: [
            { name: '📁 Categoria dos Tickets', value: configAtual.ticket_category ? `<#${configAtual.ticket_category}>` : 'Não configurada', inline: true },
            { name: '🛡️ Cargo da Equipe', value: configAtual.staff_role ? `<@&${configAtual.staff_role}>` : 'Não configurado', inline: true },
            { name: '📋 Canal de Logs', value: configAtual.logs_channel ? `<#${configAtual.logs_channel}>` : 'Não configurado', inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      });
    }

    const configAtual = ticketDB.buscarConfig(interaction.guild.id) || {};

    ticketDB.salvarConfig(interaction.guild.id, {
      ticketCategory: categoria?.id || configAtual.ticket_category || null,
      staffRole: cargoEquipe?.id || configAtual.staff_role || null,
      logsChannel: canalLogs?.id || configAtual.logs_channel || null,
    });

    const campos = [];
    if (categoria) campos.push({ name: '📁 Categoria', value: `${categoria}`, inline: true });
    if (cargoEquipe) campos.push({ name: '🛡️ Cargo da Equipe', value: `${cargoEquipe}`, inline: true });
    if (canalLogs) campos.push({ name: '📋 Canal de Logs', value: `${canalLogs}`, inline: true });

    await interaction.editReply({
      embeds: [{
        color: 0x57F287,
        title: '✅ Configuração Atualizada',
        description: 'As configurações do sistema de tickets foram atualizadas com sucesso!',
        fields: campos,
        timestamp: new Date().toISOString(),
      }],
    });
  },
};
