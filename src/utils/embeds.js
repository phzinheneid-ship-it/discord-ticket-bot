const { EmbedBuilder, Colors } = require('discord.js');

const CORES = {
  primaria: 0x5865F2,
  sucesso: 0x57F287,
  erro: 0xED4245,
  aviso: 0xFEE75C,
  info: 0x5865F2,
  fechado: 0x99AAB5,
};

const CATEGORIAS = {
  denuncia: { nome: '🚨 Denúncia de Player', prefixo: 'denuncia', cor: 0xED4245 },
  denunciastaff: { nome: '🛡️ Denúncia de Staff', prefixo: 'den-staff', cor: 0xFF6B35 },
  doacao: { nome: '💰 Doações', prefixo: 'doacao', cor: 0x57F287 },
  duvida: { nome: '❓ Dúvidas', prefixo: 'duvida', cor: 0x5865F2 },
  organizacao: { nome: '🏢 Assumir Organização', prefixo: 'org', cor: 0xFEE75C },
  faccao: { nome: '🔫 Assumir Facção', prefixo: 'fac', cor: 0xEB459E },
};

function embedPainel() {
  return new EmbedBuilder()
    .setTitle('🎫 Central de Atendimento')
    .setDescription(
      '**Bem-vindo ao nosso sistema de suporte!**\n\n' +
      'Selecione uma categoria abaixo para abrir um ticket.\n' +
      'Nossa equipe entrará em contato o mais breve possível.\n\n' +
      '> 🚨 **Denúncia de Player** — Reporte jogadores infratores\n' +
      '> 🛡️ **Denúncia de Staff** — Reporte um membro da equipe\n' +
      '> 💰 **Doações** — Envie comprovantes de doação\n' +
      '> ❓ **Dúvidas** — Tire suas dúvidas com a equipe\n' +
      '> 🏢 **Assumir Organização** — Candidate-se a liderar uma org\n' +
      '> 🔫 **Assumir Facção** — Candidate-se a liderar uma facção\n\n' +
      '⚠️ *Não abra tickets sem necessidade. Uso indevido pode resultar em punição.*'
    )
    .setColor(CORES.primaria)
    .setFooter({ text: 'Sistema de Tickets • Atendimento Online' })
    .setTimestamp();
}

function embedTicketAberto(categoria, usuario) {
  const cat = CATEGORIAS[categoria];
  const mensagens = {
    denuncia: (
      '**Por favor, preencha as informações abaixo:**\n\n' +
      '```\n' +
      '👤 Nome do jogador:\n' +
      '🆔 ID do jogador:\n' +
      '📋 Motivo da denúncia:\n' +
      '📝 Descrição completa:\n' +
      '📸 Provas (prints/vídeos):\n' +
      '```'
    ),
    denunciastaff: (
      '**Por favor, preencha as informações abaixo:**\n\n' +
      '```\n' +
      '🛡️ Nome do staff:\n' +
      '🆔 ID do staff:\n' +
      '📋 Motivo da denúncia:\n' +
      '📝 Descrição completa do ocorrido:\n' +
      '📸 Provas (prints/vídeos):\n' +
      '```'
    ),
    doacao: (
      '**Por favor, preencha as informações abaixo:**\n\n' +
      '```\n' +
      '👤 Nome:\n' +
      '📎 Comprovante (envie o arquivo):\n' +
      '💵 Valor:\n' +
      '🎁 Benefício adquirido:\n' +
      '```'
    ),
    duvida: (
      '**Por favor, preencha as informações abaixo:**\n\n' +
      '```\n' +
      '❓ Pergunta:\n' +
      '📝 Detalhes da dúvida:\n' +
      '```'
    ),
    organizacao: (
      '**Por favor, preencha as informações abaixo:**\n\n' +
      '```\n' +
      '🏢 Nome da organização:\n' +
      '💼 Experiência:\n' +
      '🕐 Disponibilidade:\n' +
      '👥 Quantidade de membros:\n' +
      '📋 Planejamento:\n' +
      '```'
    ),
    faccao: (
      '**Por favor, preencha as informações abaixo:**\n\n' +
      '```\n' +
      '🔫 Nome da facção:\n' +
      '💼 Experiência:\n' +
      '🕐 Disponibilidade:\n' +
      '👥 Quantidade de membros:\n' +
      '📋 Planejamento:\n' +
      '```'
    ),
  };

  return new EmbedBuilder()
    .setTitle(`${cat.nome}`)
    .setDescription(
      `Olá ${usuario}! Seu ticket foi aberto com sucesso.\n\n` +
      mensagens[categoria]
    )
    .setColor(cat.cor)
    .addFields(
      { name: '👤 Aberto por', value: usuario.toString(), inline: true },
      { name: '📂 Categoria', value: cat.nome, inline: true },
      { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    )
    .setFooter({ text: 'Use os botões abaixo para gerenciar o ticket' })
    .setTimestamp();
}

function embedFechamentoConfirmacao(usuario) {
  return new EmbedBuilder()
    .setTitle('🔒 Fechar Ticket')
    .setDescription(
      `${usuario} solicitou o fechamento deste ticket.\n\n` +
      '**Tem certeza que deseja fechar este ticket?**\n' +
      '> • Um transcript HTML será gerado\n' +
      '> • O transcript será enviado para os logs\n' +
      '> • O canal será excluído em seguida'
    )
    .setColor(CORES.aviso)
    .setTimestamp();
}

function embedTicketFechado(ticket, staff, categoria, duracao) {
  return new EmbedBuilder()
    .setTitle('📋 Ticket Fechado')
    .setColor(CORES.fechado)
    .addFields(
      { name: '🆔 ID do Ticket', value: `#${ticket.id}`, inline: true },
      { name: '📂 Categoria', value: CATEGORIAS[ticket.category]?.nome || ticket.category, inline: true },
      { name: '👤 Aberto por', value: `<@${ticket.user_id}>`, inline: true },
      { name: '🛡️ Staff responsável', value: staff ? `<@${staff}>` : 'Não assumido', inline: true },
      { name: '⏱️ Tempo de atendimento', value: duracao, inline: true },
      { name: '📅 Fechado em', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )
    .setFooter({ text: 'Sistema de Tickets • Registro de Atendimento' })
    .setTimestamp();
}

function embedAssumido(staff) {
  return new EmbedBuilder()
    .setTitle('👤 Ticket Assumido')
    .setDescription(`Este ticket foi assumido por ${staff}.\n\nA equipe irá te atender em breve!`)
    .setColor(CORES.sucesso)
    .setTimestamp();
}

function embedMembroAdicionado(usuario, addedBy) {
  return new EmbedBuilder()
    .setTitle('➕ Membro Adicionado')
    .setDescription(`${usuario} foi adicionado ao ticket por ${addedBy}.`)
    .setColor(CORES.sucesso)
    .setTimestamp();
}

function embedMembroRemovido(usuario, removedBy) {
  return new EmbedBuilder()
    .setTitle('➖ Membro Removido')
    .setDescription(`${usuario} foi removido do ticket por ${removedBy}.`)
    .setColor(CORES.erro)
    .setTimestamp();
}

function embedLog(tipo, dados) {
  const tipos = {
    abertura: { titulo: '🎫 Ticket Aberto', cor: CORES.sucesso },
    fechamento: { titulo: '🔒 Ticket Fechado', cor: CORES.fechado },
    claim: { titulo: '👤 Ticket Assumido', cor: CORES.info },
    adicao: { titulo: '➕ Membro Adicionado', cor: CORES.sucesso },
    remocao: { titulo: '➖ Membro Removido', cor: CORES.erro },
  };

  const config = tipos[tipo] || { titulo: '📋 Log', cor: CORES.primaria };

  const embed = new EmbedBuilder()
    .setTitle(config.titulo)
    .setColor(config.cor)
    .setTimestamp();

  if (dados.fields) {
    embed.addFields(dados.fields);
  }

  if (dados.description) {
    embed.setDescription(dados.description);
  }

  return embed;
}

function embedErro(mensagem) {
  return new EmbedBuilder()
    .setTitle('❌ Erro')
    .setDescription(mensagem)
    .setColor(CORES.erro)
    .setTimestamp();
}

function embedSucesso(mensagem) {
  return new EmbedBuilder()
    .setTitle('✅ Sucesso')
    .setDescription(mensagem)
    .setColor(CORES.sucesso)
    .setTimestamp();
}

function embedInfo(mensagem) {
  return new EmbedBuilder()
    .setDescription(mensagem)
    .setColor(CORES.info)
    .setTimestamp();
}

module.exports = {
  CATEGORIAS,
  CORES,
  embedPainel,
  embedTicketAberto,
  embedFechamentoConfirmacao,
  embedTicketFechado,
  embedAssumido,
  embedMembroAdicionado,
  embedMembroRemovido,
  embedLog,
  embedErro,
  embedSucesso,
  embedInfo,
};
