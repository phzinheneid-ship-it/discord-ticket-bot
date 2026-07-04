const {
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  AttachmentBuilder,
} = require('discord.js');
const ticketDB = require('../database/database');
const {
  CATEGORIAS,
  embedTicketAberto,
  embedFechamentoConfirmacao,
  embedTicketFechado,
  embedAssumido,
  embedMembroAdicionado,
  embedMembroRemovido,
  embedLog,
  embedErro,
  embedSucesso,
} = require('../utils/embeds');
const { gerarTranscriptHTML, calcularDuracaoTicket } = require('../utils/transcript');
const config = require('../config');
const logger = require('../utils/logger');

function botoesTicket(ticketId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_fechar_${ticketId}`)
      .setLabel('Fechar Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_assumir_${ticketId}`)
      .setLabel('Assumir Atendimento')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ticket_add_${ticketId}`)
      .setLabel('Adicionar Usuário')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ticket_remove_${ticketId}`)
      .setLabel('Remover Usuário')
      .setEmoji('➖')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ticket_transcript_${ticketId}`)
      .setLabel('Gerar Transcript')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),
  );
}

function botoesConfirmacaoFechamento(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_confirmar_fechar_${channelId}`)
      .setLabel('Sim, fechar')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_cancelar_fechar_${channelId}`)
      .setLabel('Cancelar')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary),
  );
}

async function obterConfigGuild(guild) {
  const dbConfig = ticketDB.buscarConfig(guild.id);
  const categoriasBanco = ticketDB.buscarCategoriasCanais(guild.id);
  return {
    ticketCategory: dbConfig?.ticket_category || config.ticketCategory,
    staffRole: dbConfig?.staff_role || config.staffRole,
    logsChannel: dbConfig?.logs_channel || config.logsChannel,
    // Prioridade: o que foi definido via /categoria no Discord (banco) sobrescreve
    // o que veio das variáveis de ambiente do Railway (config.categoryChannels).
    categoryChannels: { ...config.categoryChannels, ...categoriasBanco },
  };
}

async function enviarLog(guild, embed, files = []) {
  try {
    const cfg = await obterConfigGuild(guild);
    if (!cfg.logsChannel) return;
    const canal = guild.channels.cache.get(cfg.logsChannel);
    if (!canal) return;
    await canal.send({ embeds: [embed], files });
  } catch (error) {
    logger.error(`Erro ao enviar log: ${error.message}`);
  }
}

async function criarTicket(interaction, categoria) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const usuario = interaction.user;
    const cfg = await obterConfigGuild(guild);

    const ticketExistente = ticketDB.buscarTicketAbertoDoUsuario(usuario.id, categoria);
    if (ticketExistente) {
      const canalExistente = guild.channels.cache.get(ticketExistente.channel_id);
      if (canalExistente) {
        return interaction.editReply({
          embeds: [embedErro(`Você já tem um ticket desta categoria aberto em ${canalExistente}.`)],
        });
      }
      // O canal não existe mais (foi apagado manualmente ou o bot não conseguiu excluí-lo).
      // Em vez de travar o usuário para sempre, marcamos o ticket antigo como fechado e seguimos com a criação do novo.
      ticketDB.fecharPorCanalInexistente(ticketExistente.channel_id);
      logger.warn(`Ticket #${ticketExistente.id} estava "aberto" com canal inexistente; marcado como fechado automaticamente.`);
    }

    const catInfo = CATEGORIAS[categoria];
    const nomeCanal = `${catInfo.prefixo}-${usuario.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const permissoes = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: usuario.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

    if (cfg.staffRole) {
      const cargo = guild.roles.cache.get(cfg.staffRole);
      if (cargo) {
        permissoes.push({
          id: cfg.staffRole,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages,
          ],
        });
      }
    }

    let parentId = cfg.categoryChannels[categoria] || cfg.ticketCategory || null;

    if (parentId) {
      const categoriaDiscord = guild.channels.cache.get(parentId);
      if (!categoriaDiscord || categoriaDiscord.type !== ChannelType.GuildCategory) {
        logger.warn(`Categoria configurada (${parentId}) para "${categoria}" não existe mais ou não é uma categoria válida. Criando ticket sem categoria.`);
        parentId = null;
      }
    }

    const canal = await guild.channels.create({
      name: nomeCanal,
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: permissoes,
      topic: `Ticket de ${usuario.tag} | Categoria: ${catInfo.nome}`,
    });

    const registro = ticketDB.criar(canal.id, usuario.id, categoria);

    const embed = embedTicketAberto(categoria, usuario);
    const botoes = botoesTicket(canal.id);
    const mencionarStaff = cfg.staffRole ? `<@&${cfg.staffRole}>` : '';

    await canal.send({
      content: `${usuario} ${mencionarStaff}`,
      embeds: [embed],
      components: [botoes],
    });

    await interaction.editReply({
      embeds: [embedSucesso(`Seu ticket foi criado com sucesso! Acesse ${canal}.`)],
    });

    await enviarLog(guild, embedLog('abertura', {
      fields: [
        { name: '🆔 Ticket', value: `#${registro.lastInsertRowid}`, inline: true },
        { name: '📂 Categoria', value: catInfo.nome, inline: true },
        { name: '👤 Usuário', value: `${usuario.tag} (${usuario.id})`, inline: true },
        { name: '📌 Canal', value: canal.toString(), inline: true },
        { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      ],
    }));

    logger.info(`Ticket criado: #${registro.lastInsertRowid} por ${usuario.tag} (${categoria})`);
  } catch (error) {
    logger.error(`Erro ao criar ticket: ${error.message}`);
    try {
      await interaction.editReply({
        embeds: [embedErro('Ocorreu um erro ao criar o ticket. Tente novamente.')],
      });
    } catch {}
  }
}

async function solicitarFechamento(interaction) {
  const ticket = ticketDB.buscarPorCanal(interaction.channelId);
  if (!ticket) {
    return interaction.reply({
      embeds: [embedErro('Este canal não é um ticket.')],
      ephemeral: true,
    });
  }

  await interaction.reply({
    embeds: [embedFechamentoConfirmacao(interaction.user)],
    components: [botoesConfirmacaoFechamento(interaction.channelId)],
  });
}

async function confirmarFechamento(interaction, channelId) {
  try {
    await interaction.deferUpdate();

    const ticket = ticketDB.buscarPorCanal(channelId);
    if (!ticket) {
      return interaction.followUp({ embeds: [embedErro('Ticket não encontrado.')], ephemeral: true });
    }

    const guild = interaction.guild;
    const canal = guild.channels.cache.get(channelId);

    const html = await gerarTranscriptHTML(canal, ticket);
    const buffer = Buffer.from(html, 'utf-8');
    const arquivo = new AttachmentBuilder(buffer, { name: `transcript-ticket-${ticket.id}.html` });

    const duracao = calcularDuracaoTicket(ticket.created_at);
    ticketDB.fechar(channelId, null);

    const embedFechado = embedTicketFechado(ticket, ticket.staff_id, ticket.category, duracao);

    await enviarLog(guild, embedFechado, [arquivo]);

    await enviarLog(guild, embedLog('fechamento', {
      fields: [
        { name: '🆔 Ticket', value: `#${ticket.id}`, inline: true },
        { name: '📂 Categoria', value: CATEGORIAS[ticket.category]?.nome || ticket.category, inline: true },
        { name: '👤 Usuário', value: `<@${ticket.user_id}>`, inline: true },
        { name: '🛡️ Staff', value: ticket.staff_id ? `<@${ticket.staff_id}>` : 'Não assumido', inline: true },
        { name: '⏱️ Duração', value: duracao, inline: true },
        { name: '🔒 Fechado por', value: `${interaction.user.tag}`, inline: true },
      ],
    }));

    logger.info(`Ticket #${ticket.id} fechado por ${interaction.user.tag}`);

    await interaction.editReply({ content: '🔒 Fechando ticket...', embeds: [], components: [] });
    setTimeout(() => canal?.delete().catch(() => {}), 3000);
  } catch (error) {
    logger.error(`Erro ao fechar ticket: ${error.message}`);
    interaction.followUp({ embeds: [embedErro('Erro ao fechar o ticket.')], ephemeral: true }).catch(() => {});
  }
}

async function assumirTicket(interaction) {
  const ticket = ticketDB.buscarPorCanal(interaction.channelId);
  if (!ticket) return interaction.reply({ embeds: [embedErro('Este canal não é um ticket.')], ephemeral: true });

  if (ticket.staff_id === interaction.user.id) {
    return interaction.reply({ embeds: [embedErro('Você já está atendendo este ticket.')], ephemeral: true });
  }

  ticketDB.assumir(interaction.channelId, interaction.user.id);

  await interaction.reply({ embeds: [embedAssumido(interaction.user)] });

  await enviarLog(interaction.guild, embedLog('claim', {
    fields: [
      { name: '🆔 Ticket', value: `#${ticket.id}`, inline: true },
      { name: '👤 Staff', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
      { name: '📌 Canal', value: interaction.channel.toString(), inline: true },
    ],
  }));

  logger.info(`Ticket #${ticket.id} assumido por ${interaction.user.tag}`);
}

async function gerarTranscript(interaction) {
  const ticket = ticketDB.buscarPorCanal(interaction.channelId);
  if (!ticket) return interaction.reply({ embeds: [embedErro('Este canal não é um ticket.')], ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  try {
    const html = await gerarTranscriptHTML(interaction.channel, ticket);
    const buffer = Buffer.from(html, 'utf-8');
    const arquivo = new AttachmentBuilder(buffer, { name: `transcript-ticket-${ticket.id}.html` });

    await interaction.editReply({
      embeds: [embedSucesso('Transcript gerado com sucesso!')],
      files: [arquivo],
    });
  } catch (error) {
    logger.error(`Erro ao gerar transcript: ${error.message}`);
    interaction.editReply({ embeds: [embedErro('Erro ao gerar o transcript.')] });
  }
}

async function adicionarUsuario(interaction, usuario) {
  const ticket = ticketDB.buscarPorCanal(interaction.channelId);
  if (!ticket) return interaction.reply({ embeds: [embedErro('Este canal não é um ticket.')], ephemeral: true });

  if (usuario.bot) return interaction.reply({ embeds: [embedErro('Não é possível adicionar bots ao ticket.')], ephemeral: true });

  try {
    await interaction.channel.permissionOverwrites.create(usuario, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    });

    ticketDB.adicionarMembro(interaction.channelId, usuario.id, interaction.user.id);

    await interaction.reply({ embeds: [embedMembroAdicionado(usuario, interaction.user)] });

    await enviarLog(interaction.guild, embedLog('adicao', {
      fields: [
        { name: '🆔 Ticket', value: `#${ticket.id}`, inline: true },
        { name: '➕ Adicionado', value: `${usuario.tag} (${usuario.id})`, inline: true },
        { name: '👤 Por', value: `${interaction.user.tag}`, inline: true },
      ],
    }));

    logger.info(`Usuário ${usuario.tag} adicionado ao ticket #${ticket.id}`);
  } catch (error) {
    logger.error(`Erro ao adicionar usuário: ${error.message}`);
    interaction.reply({ embeds: [embedErro('Erro ao adicionar o usuário.')], ephemeral: true });
  }
}

async function removerUsuario(interaction, usuario) {
  const ticket = ticketDB.buscarPorCanal(interaction.channelId);
  if (!ticket) return interaction.reply({ embeds: [embedErro('Este canal não é um ticket.')], ephemeral: true });

  if (usuario.id === ticket.user_id) {
    return interaction.reply({ embeds: [embedErro('Não é possível remover o dono do ticket.')], ephemeral: true });
  }

  try {
    await interaction.channel.permissionOverwrites.delete(usuario);
    ticketDB.removerMembro(interaction.channelId, usuario.id);

    await interaction.reply({ embeds: [embedMembroRemovido(usuario, interaction.user)] });

    await enviarLog(interaction.guild, embedLog('remocao', {
      fields: [
        { name: '🆔 Ticket', value: `#${ticket.id}`, inline: true },
        { name: '➖ Removido', value: `${usuario.tag} (${usuario.id})`, inline: true },
        { name: '👤 Por', value: `${interaction.user.tag}`, inline: true },
      ],
    }));

    logger.info(`Usuário ${usuario.tag} removido do ticket #${ticket.id}`);
  } catch (error) {
    logger.error(`Erro ao remover usuário: ${error.message}`);
    interaction.reply({ embeds: [embedErro('Erro ao remover o usuário.')], ephemeral: true });
  }
}

module.exports = {
  criarTicket,
  solicitarFechamento,
  confirmarFechamento,
  assumirTicket,
  gerarTranscript,
  adicionarUsuario,
  removerUsuario,
};
