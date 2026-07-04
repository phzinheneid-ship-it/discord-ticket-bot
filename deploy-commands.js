const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./src/config');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');

function loadCommandsRecursive(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandsRecursive(fullPath);
    } else if (entry.endsWith('.js')) {
      const command = require(fullPath);
      if (command.data) {
        commands.push(command.data.toJSON());
        console.log(`✅ Comando carregado: /${command.data.name}`);
      }
    }
  }
}

loadCommandsRecursive(commandsPath);

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`\n🔄 Registrando ${commands.length} comando(s) slash...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(`\n✅ ${data.length} comando(s) registrado(s) com sucesso!`);
    console.log('\nComandos registrados:');
    data.forEach(cmd => console.log(`  • /${cmd.name}`));
  } catch (error) {
    console.error('\n❌ Erro ao registrar comandos:', error);
    process.exit(1);
  }
})();
