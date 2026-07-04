const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ticketDB = require('../../database/database');
const { removerUsuario } = require('../../handlers/ticketHandler');
const { embedErro } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove um usuário do ticket atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuário a ser removido')
        .setRequired(true)
    ),

  cooldown: 3,

  async execute(interaction) {
    const ticket = ticketDB.buscarPorCanal(interaction.channelId);
    if (!ticket) {
      return interaction.reply({
        embeds: [embedErro('Este canal não é um ticket.')],
        ephemeral: true,
      });
    }

    const usuario = interaction.options.getUser('usuario');

    if (usuario.id === ticket.user_id) {
      return interaction.reply({
        embeds: [embedErro('Não é possível remover o dono do ticket.')],
        ephemeral: true,
      });
    }

    await removerUsuario(interaction, usuario);
  },
};
