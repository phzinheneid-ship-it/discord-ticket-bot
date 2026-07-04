const { CATEGORIAS } = require('./embeds');

function formatarData(data) {
  if (!data) return 'N/A';
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function calcularDuracao(inicio, fim) {
  const diff = new Date(fim) - new Date(inicio);
  const horas = Math.floor(diff / 3600000);
  const minutos = Math.floor((diff % 3600000) / 60000);
  const segundos = Math.floor((diff % 60000) / 1000);
  return `${horas}h ${minutos}m ${segundos}s`;
}

async function gerarTranscriptHTML(channel, ticket) {
  const mensagens = await channel.messages.fetch({ limit: 100 });
  const ordenadas = [...mensagens.values()].reverse();

  const categoria = CATEGORIAS[ticket.category]?.nome || ticket.category;
  const dataAbertura = formatarData(ticket.created_at);
  const dataFechamento = formatarData(ticket.closed_at || new Date().toISOString());
  const duracao = calcularDuracao(ticket.created_at, ticket.closed_at || new Date().toISOString());

  const mensagensHTML = ordenadas.map((msg) => {
    const avatarUrl = msg.author.displayAvatarURL({ size: 64, extension: 'png' });
    const timestamp = new Date(msg.createdTimestamp).toLocaleString('pt-BR');
    const isBot = msg.author.bot;
    const roleClass = isBot ? 'bot' : 'user';

    const anexos = msg.attachments.size > 0
      ? [...msg.attachments.values()].map(a => {
          if (a.contentType?.startsWith('image')) {
            return `<div class="attachment"><img src="${a.url}" alt="Anexo" class="attachment-image" /></div>`;
          }
          return `<div class="attachment"><a href="${a.url}" target="_blank" class="attachment-file">📎 ${a.name}</a></div>`;
        }).join('')
      : '';

    const embeds = msg.embeds.length > 0
      ? msg.embeds.map(e => `
        <div class="embed" style="border-left-color: #${e.color?.toString(16).padStart(6, '0') || '5865F2'}">
          ${e.title ? `<div class="embed-title">${e.title}</div>` : ''}
          ${e.description ? `<div class="embed-description">${e.description.replace(/\n/g, '<br/>')}</div>` : ''}
          ${e.fields.length > 0 ? `
            <div class="embed-fields">
              ${e.fields.map(f => `
                <div class="embed-field ${f.inline ? 'inline' : ''}">
                  <div class="embed-field-name">${f.name}</div>
                  <div class="embed-field-value">${f.value.replace(/\n/g, '<br/>')}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')
      : '';

    const conteudo = msg.content
      ? msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
      : '';

    return `
      <div class="message ${roleClass}">
        <img class="avatar" src="${avatarUrl}" alt="${msg.author.username}" />
        <div class="message-content">
          <div class="message-header">
            <span class="username ${isBot ? 'bot-name' : ''}">${msg.author.username}${isBot ? ' <span class="badge">BOT</span>' : ''}</span>
            <span class="timestamp">${timestamp}</span>
          </div>
          ${conteudo ? `<div class="text">${conteudo}</div>` : ''}
          ${embeds}
          ${anexos}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Transcript — #${channel.name}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #313338;
      color: #dbdee1;
      font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
    }
    header {
      background: #1e1f22;
      padding: 24px 32px;
      border-bottom: 2px solid #5865F2;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    header .logo {
      font-size: 28px;
      font-weight: 800;
      color: #5865F2;
      letter-spacing: -1px;
    }
    header .info { flex: 1; }
    header h1 { font-size: 20px; color: #fff; font-weight: 700; }
    header p { font-size: 13px; color: #949ba4; }
    .stats {
      background: #2b2d31;
      padding: 16px 32px;
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
      border-bottom: 1px solid #1e1f22;
    }
    .stat { display: flex; flex-direction: column; }
    .stat-label { font-size: 11px; font-weight: 700; color: #949ba4; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 14px; color: #dbdee1; margin-top: 2px; }
    .messages { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
    .message {
      display: flex;
      gap: 16px;
      padding: 8px 16px;
      border-radius: 4px;
      margin-bottom: 4px;
      transition: background 0.1s;
    }
    .message:hover { background: #2e3035; }
    .avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .message-content { flex: 1; min-width: 0; }
    .message-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
    .username { font-weight: 600; color: #fff; font-size: 15px; }
    .bot-name { color: #5865F2; }
    .badge {
      background: #5865F2; color: #fff;
      font-size: 10px; padding: 1px 5px;
      border-radius: 3px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .timestamp { font-size: 12px; color: #949ba4; }
    .text { color: #dbdee1; word-break: break-word; white-space: pre-wrap; }
    .embed {
      border-left: 4px solid #5865F2;
      background: #2b2d31;
      border-radius: 0 4px 4px 0;
      padding: 12px 16px;
      margin-top: 8px;
      max-width: 520px;
    }
    .embed-title { font-weight: 700; color: #fff; margin-bottom: 8px; }
    .embed-description { color: #dbdee1; font-size: 14px; }
    .embed-fields { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .embed-field { flex: 1 1 45%; min-width: 120px; }
    .embed-field.inline { flex: 0 1 30%; }
    .embed-field-name { font-weight: 700; font-size: 13px; color: #dbdee1; margin-bottom: 2px; }
    .embed-field-value { font-size: 13px; color: #b5bac1; }
    .attachment { margin-top: 8px; }
    .attachment-image { max-width: 400px; max-height: 300px; border-radius: 4px; }
    .attachment-file {
      color: #00a8fc; text-decoration: none;
      background: #2b2d31; padding: 8px 12px;
      border-radius: 4px; display: inline-block;
    }
    .attachment-file:hover { text-decoration: underline; }
    footer {
      text-align: center;
      padding: 24px;
      color: #4e5058;
      font-size: 13px;
      border-top: 1px solid #1e1f22;
    }
    footer span { color: #5865F2; font-weight: 600; }
  </style>
</head>
<body>
  <header>
    <div class="logo">🎫</div>
    <div class="info">
      <h1>Transcript — #${channel.name}</h1>
      <p>Registro completo de atendimento • Sistema de Tickets</p>
    </div>
  </header>

  <div class="stats">
    <div class="stat">
      <span class="stat-label">Ticket ID</span>
      <span class="stat-value">#${ticket.id}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Categoria</span>
      <span class="stat-value">${categoria}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Usuário</span>
      <span class="stat-value">${ticket.user_id}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Staff</span>
      <span class="stat-value">${ticket.staff_id || 'Não assumido'}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Abertura</span>
      <span class="stat-value">${dataAbertura}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Fechamento</span>
      <span class="stat-value">${dataFechamento}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Duração</span>
      <span class="stat-value">${duracao}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Mensagens</span>
      <span class="stat-value">${ordenadas.length}</span>
    </div>
  </div>

  <div class="messages">
    ${mensagensHTML || '<p style="color:#949ba4;text-align:center;padding:32px;">Nenhuma mensagem encontrada.</p>'}
  </div>

  <footer>
    Gerado em ${new Date().toLocaleString('pt-BR')} por <span>Sistema de Tickets</span>
  </footer>
</body>
</html>`;
}

function calcularDuracaoTicket(inicio, fim) {
  return calcularDuracao(inicio, fim || new Date().toISOString());
}

module.exports = { gerarTranscriptHTML, calcularDuracaoTicket };
