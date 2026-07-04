const { Events, InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, UserSelectMenuBuilder } = require('discord.js');
const {
  criarTicket,
  solicitarFechamento,
  confirmarFechamento,
  assumirTicket,
  gerarTranscript,
  adicionarUsuario,
  removerUsuario,
} = require('../handlers/ticketHandler');
const { embedErro } = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction, client);
      } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
      } else if (interaction.isButton()) {
        await handleButton(interaction);
      } else if (interaction.isUserSelectMenu()) {
        await handleUserSelectMenu(interaction);
      }
    } catch (error) {
      logger.error(`Erro na interação ${interaction.type}: ${error.message}`);
      try {
        const payload = { embeds: [embedErro('Ocorreu um erro inesperado. Tente novamente.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch {}
    }
  },
};

async function handleSlashCommand(interaction, client) {
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Comando desconhecido: /${interaction.commandName}`);
    return interaction.reply({ embeds: [embedErro(`Comando \`/${interaction.commandName}\` não encontrado.`)], ephemeral: true });
  }

  const cooldowns = client.cooldowns;
  if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Map());

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const cooldownAmount = (command.cooldown ?? 3) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expiration = timestamps.get(interaction.user.id) + cooldownAmount;
    if (now < expiration) {
      const seconds = Math.ceil((expiration - now) / 1000);
      return interaction.reply({
        embeds: [embedErro(`Aguarde **${seconds}s** antes de usar este comando novamente.`)],
        ephemeral: true,
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  await command.execute(interaction, client);
}

async function handleSelectMenu(interaction) {
  if (interaction.customId !== 'ticket_categoria') return;

  const categoria = interaction.values[0];
  const categoriasValidas = ['denuncia', 'denunciastaff', 'doacao', 'duvida', 'organizacao', 'faccao'];

  if (!categoriasValidas.includes(categoria)) {
    return interaction.reply({ embeds: [embedErro('Categoria inválida.')], ephemeral: true });
  }

  await criarTicket(interaction, categoria);
}

async function handleButton(interaction) {
  const id = interaction.customId;

  if (id.startsWith('ticket_fechar_')) {
    await solicitarFechamento(interaction);
  } else if (id.startsWith('ticket_confirmar_fechar_')) {
    const channelId = id.replace('ticket_confirmar_fechar_', '');
    await confirmarFechamento(interaction, channelId);
  } else if (id.startsWith('ticket_cancelar_fechar_')) {
    await interaction.update({ content: null, embeds: [], components: [] });
  } else if (id.startsWith('ticket_assumir_')) {
    await assumirTicket(interaction);
  } else if (id.startsWith('ticket_transcript_')) {
    await gerarTranscript(interaction);
  } else if (id.startsWith('ticket_add_')) {
    const selectMenu = new UserSelectMenuBuilder()
      .setCustomId('ticket_select_add')
      .setPlaceholder('Selecione um usuário para adicionar')
      .setMinValues(1)
      .setMaxValues(1);
    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ content: '**Selecione o usuário a adicionar:**', components: [row], ephemeral: true });
  } else if (id.startsWith('ticket_remove_')) {
    const selectMenu = new UserSelectMenuBuilder()
      .setCustomId('ticket_select_remove')
      .setPlaceholder('Selecione um usuário para remover')
      .setMinValues(1)
      .setMaxValues(1);
    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ content: '**Selecione o usuário a remover:**', components: [row], ephemeral: true });
  }
}

async function handleUserSelectMenu(interaction) {
  const usuario = interaction.users.first();
  if (!usuario) return interaction.reply({ embeds: [embedErro('Nenhum usuário selecionado.')], ephemeral: true });

  if (interaction.customId === 'ticket_select_add') {
    await interaction.deferUpdate();
    await adicionarUsuario(interaction, usuario);
  } else if (interaction.customId === 'ticket_select_remove') {
    await interaction.deferUpdate();
    await removerUsuario(interaction, usuario);
  }
}
