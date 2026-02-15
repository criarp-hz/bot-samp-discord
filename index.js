const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder,
  ActivityType
} = require("discord.js");

// ========= CONFIG =========

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const REGISTRO_CANAL = "1472463885620609180";
const LOG_CANAL = "1472464723738886346";
const CARGO_AUTOMATICO = "1472054758415138960";

const TAG = "『Ⓗ¹』";

const cargos = {
  1: { nome: "Ajudante", id: "1472055381713883187" },
  2: { nome: "Moderador(a)", id: "1472055978911465673" },
  3: { nome: "Administrador(a)", id: "1472056709349511263" },
  4: { nome: "Auxiliar", id: "1472057320799338639" },
  5: { nome: "Coordenador(a)", id: "1472058121529593906" },
  6: { nome: "Direção", id: "1472058401394655355" }
};

// ========= ANTI CRASH =========

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ========= CLIENT =========

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ========= SLASH =========

const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Enviar painel de registro")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// ========= ONLINE =========

client.once("ready", async () => {

  console.log("✅ Online:", client.user.tag);

  client.user.setPresence({
    activities: [{ name: "Sistema Staff", type: ActivityType.Watching }],
    status: "online"
  });

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
  } catch (err) {
    console.log(err);
  }
});

// ========= ENTRADA =========

client.on("guildMemberAdd", async (member) => {
  try {
    await member.roles.add(CARGO_AUTOMATICO);
  } catch {}
});

// ========= FUNÇÃO PAINEL =========

async function enviarPainel(guild) {

  const canal = guild.channels.cache.get(REGISTRO_CANAL);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("📋 SISTEMA DE REGISTRO")
    .setDescription(
`Bem-vindo ao sistema de registro do servidor!

Clique no botão abaixo para realizar seu registro.

Em caso de dúvida procure um responsável do setor.`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("registrar")
      .setLabel("Registrar-se")
      .setStyle(ButtonStyle.Primary)
  );

  await canal.send({ embeds: [embed], components: [row] });
}

// ========= INTERAÇÕES =========

client.on("interactionCreate", async (interaction) => {

  try {

    // ===== COMANDO /painel =====
    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "painel") {

        await interaction.reply({ content: "‎", ephemeral: true });

        enviarPainel(interaction.guild);
      }
    }

    // ===== BOTÃO REGISTRAR =====
    if (interaction.isButton() && interaction.customId === "registrar") {

      const modal = new ModalBuilder()
        .setCustomId("modalRegistro")
        .setTitle("Registro");

      const nick = new TextInputBuilder()
        .setCustomId("nick")
        .setLabel("Nome do personagem")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const cargo = new TextInputBuilder()
        .setCustomId("cargo")
        .setLabel("Número do cargo (1 a 6)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nick),
        new ActionRowBuilder().addComponents(cargo)
      );

      return interaction.showModal(modal);
    }

    // ===== MODAL ENVIO =====
    if (interaction.isModalSubmit()) {

      if (interaction.customId === "modalRegistro") {

        const nick = interaction.fields.getTextInputValue("nick");
        const cargoNum = interaction.fields.getTextInputValue("cargo");

        const cargoInfo = cargos[cargoNum];

        if (!cargoInfo) {
          return interaction.reply({
            content: "Cargo inválido.",
            ephemeral: true
          });
        }

        const canal = client.channels.cache.get(LOG_CANAL);

        const embed = new EmbedBuilder()
          .setColor("#2b2d31")
          .setTitle("📥 Novo Registro")
          .addFields(
            { name: "Usuário", value: `${interaction.user}` },
            { name: "Nick", value: nick },
            { name: "Cargo", value: cargoInfo.nome }
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`aceitar_${interaction.user.id}_${cargoNum}_${nick}`)
            .setLabel("Aceitar")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId(`recusar_${interaction.user.id}`)
            .setLabel("Recusar")
            .setStyle(ButtonStyle.Danger)
        );

        await canal.send({ embeds: [embed], components: [row] });

        await interaction.reply({
          content: "Registro enviado para aprovação.",
          ephemeral: true
        });
      }
    }

    // ===== ACEITAR =====
    if (interaction.isButton() && interaction.customId.startsWith("aceitar")) {

      const [, userId, cargoNum, nick] = interaction.customId.split("_");

      const member = await interaction.guild.members.fetch(userId);
      const cargoInfo = cargos[cargoNum];

      await member.setNickname(`${TAG} ${nick}`).catch(() => {});
      await member.roles.add(cargoInfo.id).catch(() => {});

      // ADMIN ganha MOD
      if (cargoNum === "3") {
        await member.roles.add(cargos[2].id).catch(() => {});
      }

      await interaction.reply({
        content: "✅ Registro aprovado.",
        ephemeral: true
      });
    }

    // ===== RECUSAR =====
    if (interaction.isButton() && interaction.customId.startsWith("recusar")) {

      await interaction.reply({
        content: "❌ Registro recusado.",
        ephemeral: true
      });
    }

  } catch (err) {
    console.log("Erro:", err);
  }

});

// ========= LOGIN =========

client.login(TOKEN);
