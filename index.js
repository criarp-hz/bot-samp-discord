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
  Events
} = require("discord.js");

const TOKEN = process.env.TOKEN;

const TAG = "『Ⓗ¹』";

// ================= CANAIS =================

const CANAL_REGISTRO = "1472463885620609180";
const CANAL_ANALISE = "1472464723738886346";

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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// ================= FUNÇÕES =================

function dataHora() {
  return new Date().toLocaleString("pt-BR");
}

function cargoIndex(roleId) {
  return HIERARQUIA.indexOf(roleId);
}

function maiorCargo(member) {
  let maior = -1;
  for (const role of member.roles.cache.values()) {
    const idx = cargoIndex(role.id);
    if (idx > maior) maior = idx;
  }
  return maior;
}

function cargoPorNumero(num) {
  const mapa = {
    "1": ROLES.AJUDANTE,
    "2": ROLES.MODERADOR,
    "3": ROLES.ADMIN,
    "4": ROLES.COORDENADOR,
    "5": ROLES.DIRECAO
  };
  return mapa[num];
}

function nomeCargo(roleId) {
  const nomes = {
    [ROLES.AJUDANTE]: "Ajudante",
    [ROLES.MODERADOR]: "Moderador",
    [ROLES.ADMIN]: "Administrador",
    [ROLES.COORDENADOR]: "Coordenador(a)",
    [ROLES.DIRECAO]: "Direção"
  };
  return nomes[roleId] || "Cargo";
}

function embed(t, d, cor = "#2b2d31") {
  return new EmbedBuilder()
    .setColor(cor)
    .setTitle(t)
    .setDescription(d)
    .setFooter({ text: "Sistema Administrativo Hz" })
    .setTimestamp();
}

// ================= ONLINE =================

client.once("ready", () => {
  console.log("✅ Bot online:", client.user.tag);
});

// ================= AUTO ROLE =================

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    await member.roles.add(ROLES.VISITANTE);
  } catch {}
});

// ================= INTERAÇÕES =================

client.on(Events.InteractionCreate, async (interaction) => {

  // ================= COMANDO /PAINEL =================

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "painel") {

      const painel = embed(
        "📋 SISTEMA DE REGISTRO",
        `
Bem-vindo ao sistema de registro.

Selecione corretamente seu cargo atual.

⚠️ Uso incorreto pode gerar penalidades administrativas.

Clique no botão abaixo para iniciar seu registro.
        `,
        "#5865F2"
      );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("registrar")
          .setLabel("Registrar-se")
          .setEmoji("📋")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        embeds: [painel],
        components: [row]
      });
    }
  }

  // ================= BOTÃO REGISTRAR =================

  if (interaction.isButton() && interaction.customId === "registrar") {

    const modal = new ModalBuilder()
      .setCustomId("modal_registro")
      .setTitle("Registro Staff");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nick")
          .setLabel("Nick")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("cargo")
          .setLabel("Digite o número do cargo")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }

  // ================= FORM REGISTRO =================

  if (interaction.isModalSubmit() && interaction.customId === "modal_registro") {

    const nick = interaction.fields.getTextInputValue("nick");
    const cargoNum = interaction.fields.getTextInputValue("cargo");

    const canal = client.channels.cache.get(CANAL_ANALISE);

    const embedRegistro = embed(
      "📨 NOVO REGISTRO SOLICITADO",
      `
👤 Usuário: ${interaction.user}
🏷 Nick: ${nick}
📌 Cargo: ${cargoNum}

📅 Data: ${dataHora()}
      `,
      "#ffaa00"
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`aprovar_${interaction.user.id}_${cargoNum}_${nick}`)
        .setLabel("Aceitar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`recusar_${interaction.user.id}`)
        .setLabel("Recusar")
        .setStyle(ButtonStyle.Danger)
    );

    canal.send({
      embeds: [embedRegistro],
      components: [row]
    });

    await interaction.reply({
      content: "✅ Registro enviado para análise.",
      ephemeral: true
    });
  }

  // ================= APROVAR =================

  if (interaction.isButton() && interaction.customId.startsWith("aprovar")) {

    const [, userId, cargoNum, nick] = interaction.customId.split("_");

    const guild = interaction.guild;
    const membro = await guild.members.fetch(userId);

    const roleId = cargoPorNumero(cargoNum);

    if (!roleId) {
      return interaction.reply({
        content: "❌ Cargo inválido.",
        ephemeral: true
      });
    }

    const executorNivel = maiorCargo(interaction.member);
    const alvoNivel = cargoIndex(roleId);

    if (executorNivel < alvoNivel) {
      return interaction.reply({
        content: "❌ Você não pode aprovar cargo maior que o seu.",
        ephemeral: true
      });
    }

    try {

      await membro.roles.add(roleId);

      if (roleId === ROLES.ADMIN) {
        await membro.roles.add(ROLES.MODERADOR);
      }

      await membro.setNickname(`${TAG} ${nick}`);

      const aprovado = embed(
        "✅ REGISTRO APROVADO",
        `
👤 Jogador: ${membro}
🏷 Nick: ${nick}
📌 Cargo: ${nomeCargo(roleId)}

👮 Aprovado por: ${interaction.user}

📅 ${dataHora()}
        `,
        "#00ff88"
      );

      await interaction.update({
        embeds: [aprovado],
        components: []
      });

    } catch (err) {
      console.log(err);
    }
  }

  // ================= RECUSAR =================

  if (interaction.isButton() && interaction.customId.startsWith("recusar")) {

    const recusado = embed(
      "❌ REGISTRO RECUSADO",
      `
👮 Responsável: ${interaction.user}

Seu registro foi recusado.

Caso acredite que seja um erro, envie novamente.

📅 ${dataHora()}
      `,
      "#ff0000"
    );

    await interaction.update({
      embeds: [recusado],
      components: []
    });
  }

});

// ================= ANTI CRASH =================

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
