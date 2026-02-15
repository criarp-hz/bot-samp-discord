const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN || "SEU_TOKEN_AQUI";
const CLIENT_ID = "SEU_CLIENT_ID_AQUI";
const GUILD_ID = "SEU_SERVIDOR_ID_AQUI";

const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Enviar painel de registro")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registrando comandos...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Comandos registrados com sucesso!");
  } catch (err) {
    console.error(err);
  }
})();
