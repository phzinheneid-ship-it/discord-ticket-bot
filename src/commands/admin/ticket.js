const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { embedPainel, embedErro } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Envia o painel de tickets no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  cooldown: 5,

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_categoria')
        .setPlaceholder('📂 Selecione uma categoria...')
        .addOptions([
          { label: 'Denúncia de Player', description: 'Reporte um jogador infrator', value: 'denuncia', emoji: '🚨' },
          { label: 'Denúncia de Staff', description: 'Reporte um membro da equipe', value: 'denunciastaff', emoji: '🛡️' },
          { label: 'Doações', description: 'Envie seu comprovante de doação', value: 'doacao', emoji: '💰' },
          { label: 'Dúvidas', description: 'Tire suas dúvidas com a equipe', value: 'duvida', emoji: '❓' },
          { label: 'Assumir Organização', description: 'Candidate-se a liderar uma organização', value: 'organizacao', emoji: '🏢' },
          { label: 'Assumir Facção', description: 'Candidate-se a liderar uma facção', value: 'faccao', emoji: '🔫' },
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.channel.send({
        embeds: [embedPainel()],
        components: [row],
      });

      await interaction.editReply({ embeds: [{ color: 0x57F287, description: '✅ Painel enviado com sucesso!' }] });
    } catch (error) {
      await interaction.editReply({ embeds: [embedErro('Erro ao enviar o painel de tickets.')] });
    }
  },
};
