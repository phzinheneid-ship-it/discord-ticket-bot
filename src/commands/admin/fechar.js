const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ticketDB = require('../../database/database');
const { solicitarFechamento } = require('../../handlers/ticketHandler');
const { embedErro } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fechar')
    .setDescription('Fecha o ticket atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  cooldown: 5,

  async execute(interaction) {
    const ticket = ticketDB.buscarPorCanal(interaction.channelId);

    if (!ticket) {
      return interaction.reply({
        embeds: [embedErro('Este canal não é um ticket.')],
        ephemeral: true,
      });
    }

    await solicitarFechamento(interaction);
  },
};
