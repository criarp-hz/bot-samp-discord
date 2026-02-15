const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  Events,
  PermissionsBitField
} = require("discord.js");

const TOKEN = process.env.TOKEN || "SEU_TOKEN_AQUI";

const TAG = "『Ⓗ¹』";

// ================= CARGOS =================

const ROLES = {
  VISITANTE: "1472054758415138960",
  AJUDANTE: "1472055381713883187",
  MODERADOR: "1472055978911465673",
  ADMIN: "1472056709349511263",
  COORDENADOR: "1472057320799338639",
  DIRECAO: "1472058401394655355"
};

const HIERARQUIA = [
  ROLES.AJUDANTE,
  ROLES.MODERADOR,
  ROLES.ADMIN,
  ROLES.COORDENADOR,
  ROLES.DIRECAO
];

// ================= CLIENT =================

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

// ================= FUNÇÕES =================

function cargoIndex(roleId) {
  return HIERARQUIA.indexOf(roleId);
}

function podeGerenciar(executor, alvo) {
  return cargoIndex(executor) >= cargoIndex(alvo);
}

function dataHora() {
  return new Date().toLocaleString("pt-BR");
}

function embedBase(titulo, desc) {
  return new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle(titulo)
    .setDescription(desc)
    .setFooter({ text: "Sistema Administrativo Hz" })
    .setTimestamp();
}

// ================= ONLINE =================

client.once("ready", async () => {
  console.log(`✅ Online como ${client.user.tag}`);
});

// ================= AUTO ROLE =================

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await member.roles.add(ROLES.VISITANTE);
  } catch {}
});

// ================= COMANDO /PAINEL =================

client.on(Events.InteractionCreate, async (interaction) => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "painel") {

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📋 SISTEMA DE REGISTRO")
        .setDescription(`
Bem-vindo ao sistema de registro do servidor!

Para que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**

⚠️ **Usar cargo incorreto pode causar:**
• Erros no registro  
• Problemas de permissão  
• Penalidades administrativas  

✅ Em caso de dúvida, procure um responsável do seu setor.
        `);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("registrar")
          .setLabel("Registrar-se")
          .setEmoji("📋")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // ================= BOTÃO REGISTRAR =================

  if (interaction.isButton()) {

    if (interaction.customId === "registrar") {

      const modal = new ModalBuilder()
        .setCustomId("modal_registro")
        .setTitle("Registro de Staff");

      const nick = new TextInputBuilder()
        .setCustomId("nick")
        .setLabel("Nome do seu personagem")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const cargo = new TextInputBuilder()
        .setCustomId("cargo")
        .setLabel("Digite o número do cargo")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nick),
        new ActionRowBuilder().addComponents(cargo)
      );

      await interaction.showModal(modal);
    }
  }

  // ================= FORM REGISTRO =================

  if (interaction.isModalSubmit()) {

    if (interaction.customId === "modal_registro") {

      const nick = interaction.fields.getTextInputValue("nick");
      const cargoNum = interaction.fields.getTextInputValue("cargo");

      const embed = embedBase(
        "📨 NOVO REGISTRO",
        `
👤 Usuário: ${interaction.user}
🏷 Nick: ${nick}
📌 Cargo solicitado: ${cargoNum}

📅 Data: ${dataHora()}
        `
      );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("aprovar_" + cargoNum)
          .setLabel("Aceitar")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("editar_" + cargoNum)
          .setLabel("Editar")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("recusar_" + cargoNum)
          .setLabel("Recusar")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        content: "✅ Registro enviado para análise.",
        ephemeral: true
      });

      await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // ================= APROVAR =================

  if (interaction.isButton() && interaction.customId.startsWith("aprovar")) {

    const member = interaction.member;
    const roleId = ROLES.ADMIN; // exemplo

    try {

      await member.roles.add(roleId);

      // ADMIN ganha MODERADOR
      if (roleId === ROLES.ADMIN) {
        await member.roles.add(ROLES.MODERADOR);
      }

      await member.setNickname(`${TAG} ${member.user.username}`);

      const embed = embedBase(
        "✅ REGISTRO APROVADO",
        `
👤 Usuário: ${member}
👮 Aprovado por: ${interaction.user}
📅 ${dataHora()}
        `
      );

      await interaction.update({
        embeds: [embed],
        components: []
      });

    } catch (err) {
      console.log(err);
    }
  }

  // ================= RECUSAR =================

  if (interaction.isButton() && interaction.customId.startsWith("recusar")) {

    const embed = embedBase(
      "❌ REGISTRO RECUSADO",
      `
👮 Responsável: ${interaction.user}
📅 ${dataHora()}

Caso acredite que seja um erro, envie novamente.
      `
    );

    await interaction.update({
      embeds: [embed],
      components: []
    });
  }

});

// ================= LOGIN =================

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
