const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ticketDB = require('../../database/database');
const { adicionarUsuario } = require('../../handlers/ticketHandler');
const { embedErro } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Adiciona um usuário ao ticket atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuário a ser adicionado')
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
    if (usuario.bot) {
      return interaction.reply({
        embeds: [embedErro('Não é possível adicionar bots ao ticket.')],
        ephemeral: true,
      });
    }

    await adicionarUsuario(interaction, usuario);
  },
};
