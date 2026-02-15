const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  SlashCommandBuilder,
  REST,
  Routes,
  ActivityType
} = require('discord.js');

const TOKEN = process.env.TOKEN || "SEU_TOKEN_AQUI";
const CLIENT_ID = "SEU_CLIENT_ID";
const GUILD_ID = "SEU_GUILD_ID";
const CANAL_PAINEL_ID = "ID_DO_CANAL";

// IDs dos cargos (use os mesmos que você já tinha)
const CARGO_PROMOCAO = "ID_CARGO_PROMOCAO";
const CARGO_REBAIXAMENTO = "ID_CARGO_REBAIXAMENTO";

// =====================
// PROTEÇÕES ANTI-CRASH
// =====================
process.on('unhandledRejection', (err) => {
  console.error('Erro não tratado:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Exceção não capturada:', err);
});

// =====================
// CLIENT
// =====================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// =====================
// SLASH COMMAND
// =====================
const commands = [
  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Enviar painel administrativo')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registrarComandos() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados");
  } catch (err) {
    console.error("Erro ao registrar comandos:", err);
  }
}

// =====================
// BOT ONLINE
// =====================
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Online como ${client.user.tag}`);

  client.user.setPresence({
    activities: [{
      name: "Sistema Staff",
      type: ActivityType.Watching
    }],
    status: "online"
  });

  await registrarComandos();
});

// =====================
// FUNÇÃO CRIAR PAINEL
// =====================
function criarPainel() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("promover")
      .setLabel("📈 Promover")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("rebaixar")
      .setLabel("📉 Rebaixar")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("aceitar")
      .setLabel("✅ Aceitar")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("recusar")
      .setLabel("❌ Recusar")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("editar")
      .setLabel("✏️ Editar")
      .setStyle(ButtonStyle.Secondary)
  );

  return { components: [row] };
}

// =====================
// COMANDO /PAINEL
// =====================
client.on(Events.InteractionCreate, async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {

        // responde invisível e apaga depois (não polui canal)
        await interaction.deferReply({ ephemeral: true });

        const canal = await client.channels.fetch(CANAL_PAINEL_ID);

        await canal.send(criarPainel());

        // remove mensagem do comando
        await interaction.deleteReply().catch(() => {});
      }
    }

    // =====================
    // BOTÕES
    // =====================
    if (interaction.isButton()) {

      const member = interaction.member;

      if (interaction.customId === "promover") {
        await member.roles.add(CARGO_PROMOCAO).catch(() => {});
        await interaction.reply({
          content: "✅ Promoção realizada.\nCaso de dúvida procure o responsável do setor.",
          ephemeral: true
        });
      }

      if (interaction.customId === "rebaixar") {
        await member.roles.add(CARGO_REBAIXAMENTO).catch(() => {});
        await interaction.reply({
          content: "📉 Rebaixamento realizado.\nCaso de dúvida procure o responsável do setor.",
          ephemeral: true
        });
      }

      if (interaction.customId === "aceitar") {
        await interaction.reply({
          content: "✅ Solicitação aceita.",
          ephemeral: true
        });
      }

      if (interaction.customId === "recusar") {
        await interaction.reply({
          content: "❌ Solicitação recusada.",
          ephemeral: true
        });
      }

      if (interaction.customId === "editar") {
        await interaction.reply({
          content: "✏️ Função de edição ativada.\nCaso de dúvida procure o responsável do setor.",
          ephemeral: true
        });
      }

    }

  } catch (err) {
    console.error("Erro interação:", err);
  }
});

// =====================
// LOGIN COM PROTEÇÃO
// =====================
async function iniciar() {
  try {
    await client.login(TOKEN);
  } catch (err) {
    console.error("Erro ao logar:", err);
    setTimeout(iniciar, 5000); // tenta novamente
  }
}

iniciar();
