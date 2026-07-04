const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const ticketDB = require('../../database/database');
const { CATEGORIAS } = require('../../utils/embeds');
const { embedSucesso, embedErro } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('categoria')
    .setDescription('Define em qual categoria do Discord um tipo de ticket deve ser criado')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('definir')
        .setDescription('Define a categoria do Discord para um tipo de ticket')
        .addStringOption(opt =>
          opt.setName('tipo')
            .setDescription('Tipo de ticket')
            .setRequired(true)
            .addChoices(
              ...Object.entries(CATEGORIAS).map(([valor, dados]) => ({ name: dados.nome, value: valor }))
            )
        )
        .addChannelOption(opt =>
          opt.setName('canal')
            .setDescription('Categoria do Discord onde este tipo de ticket deve ser criado')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remover')
        .setDescription('Remove a categoria específica de um tipo de ticket (volta a usar a categoria geral)')
        .addStringOption(opt =>
          opt.setName('tipo')
            .setDescription('Tipo de ticket')
            .setRequired(true)
            .addChoices(
              ...Object.entries(CATEGORIAS).map(([valor, dados]) => ({ name: dados.nome, value: valor }))
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('listar')
        .setDescription('Lista a categoria do Discord configurada para cada tipo de ticket')
    ),

  cooldown: 5,

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'definir') {
      const tipo = interaction.options.getString('tipo');
      const canal = interaction.options.getChannel('canal');

      ticketDB.salvarCategoriaCanal(guildId, tipo, canal.id);

      return interaction.editReply({
        embeds: [embedSucesso(`Tickets do tipo **${CATEGORIAS[tipo].nome}** agora serão criados dentro da categoria ${canal}.`)],
      });
    }

    if (sub === 'remover') {
      const tipo = interaction.options.getString('tipo');
      ticketDB.removerCategoriaCanal(guildId, tipo);

      return interaction.editReply({
        embeds: [embedSucesso(`A categoria específica de **${CATEGORIAS[tipo].nome}** foi removida. Esse tipo de ticket voltará a usar a categoria geral configurada em /configurar.`)],
      });
    }

    if (sub === 'listar') {
      const mapa = ticketDB.buscarCategoriasCanais(guildId);
      const config = ticketDB.buscarConfig(guildId);

      const linhas = Object.entries(CATEGORIAS).map(([valor, dados]) => {
        const canalId = mapa[valor];
        if (canalId) {
          return `${dados.nome} → <#${canalId}>`;
        }
        if (config?.ticket_category) {
          return `${dados.nome} → <#${config.ticket_category}> *(categoria geral)*`;
        }
        return `${dados.nome} → ⚠️ *nenhuma categoria configurada*`;
      });

      return interaction.editReply({
        embeds: [{
          color: 0x5865F2,
          title: '📂 Categorias configuradas por tipo de ticket',
          description: linhas.join('\n'),
          timestamp: new Date().toISOString(),
        }],
      });
    }
  },
};
