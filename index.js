const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const express = require("express");
const app = express();

/* KEEP ALIVE */
app.get("/", (req, res) => res.send("Bot Online"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;

/* CONFIG */
const REGISTRO_CANAL = "1472463885620609180";
const APROVACAO_CANAL = "1472464723738886346";
const CARGO_AUTOMATICO = "1472054758415138960";
const TAG = "『Ⓗ¹』";

/* CARGOS */
const cargos = {
  1: { nome: "Ajudante", id: "1472055381713883187", nivel: 1 },
  2: { nome: "Moderador(a)", id: "1472055978911465673", nivel: 2 },
  3: { nome: "Administrador(a)", id: "1472056709349511263", nivel: 3 },
  4: { nome: "Auxiliar", id: "1472057320799338639", nivel: 4 },
  5: { nome: "Coordenador(a)", id: "1472058121529593906", nivel: 5 },
  6: { nome: "Direção", id: "1472058401394655355", nivel: 6 }
};

function dataAtual() {
  return new Date().toLocaleString("pt-BR");
}

function getNivel(member) {
  let nivel = 0;
  for (const key in cargos) {
    if (member.roles.cache.has(cargos[key].id)) {
      if (cargos[key].nivel > nivel) nivel = cargos[key].nivel;
    }
  }
  return nivel;
}

/* PAINEL */
async function enviarPainel(guild) {
  try {
    const canal = guild.channels.cache.get(REGISTRO_CANAL);
    if (!canal) return;

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📋 SISTEMA DE REGISTRO")
      .setDescription(
`Bem-vindo ao sistema de registro do servidor!

Para que tudo funcione corretamente, selecione e utilize apenas o cargo correspondente ao seu setor atual.

⚠️ **Usar cargo incorreto pode causar:**
• Erros no registro  
• Problemas de permissão  
• Penalidades administrativas  

✅ Em caso de dúvida, procure um responsável do seu setor.`
      );

    const botao = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("registrar")
        .setLabel("Registrar-se")
        .setStyle(ButtonStyle.Primary)
    );

    await canal.send({ embeds: [embed], components: [botao] });

  } catch (e) {
    console.log("Erro painel:", e);
  }
}

/* ENTRAR */
client.on("guildMemberAdd", async (member) => {
  try {
    await member.roles.add(CARGO_AUTOMATICO);
  } catch (e) {
    console.log("Erro cargo automático:", e);
  }
});

/* READY */
client.once("clientReady", async () => {
  console.log("Bot Online:", client.user.tag);

  const guild = client.guilds.cache.first();
  if (guild) enviarPainel(guild);
});

/* INTERAÇÕES */
client.on("interactionCreate", async (interaction) => {

  try {

    /* BOTÃO REGISTRAR */
    if (interaction.isButton() && interaction.customId === "registrar") {

      const modal = new ModalBuilder()
        .setCustomId("modalRegistro")
        .setTitle("Registro");

      const nick = new TextInputBuilder()
        .setCustomId("nick")
        .setLabel("NOME DO SEU PERSONAGEM NA CIDADE")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const cargo = new TextInputBuilder()
        .setCustomId("cargo")
        .setLabel("DIGITE O NÚMERO DO SEU CARGO")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nick),
        new ActionRowBuilder().addComponents(cargo)
      );

      return interaction.showModal(modal);
    }

    /* ENVIAR REGISTRO */
    if (interaction.isModalSubmit() && interaction.customId === "modalRegistro") {

      await interaction.deferReply({ ephemeral: true });

      const nick = interaction.fields.getTextInputValue("nick");
      const cargoNum = interaction.fields.getTextInputValue("cargo");
      const cargoInfo = cargos[cargoNum];

      if (!cargoInfo) {
        return interaction.editReply("❌ Cargo inválido.");
      }

      const canal = client.channels.cache.get(APROVACAO_CANAL);

      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle("📥 NOVO REGISTRO")
        .addFields(
          { name: "Usuário", value: `${interaction.user}`, inline: true },
          { name: "Nick", value: nick, inline: true },
          { name: "Cargo", value: cargoInfo.nome, inline: true },
          { name: "Data", value: dataAtual() }
        );

      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`aceitar_${interaction.user.id}_${cargoNum}_${nick}`)
          .setLabel("Aceitar")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`editar_${interaction.user.id}_${nick}`)
          .setLabel("Editar")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`recusar_${interaction.user.id}`)
          .setLabel("Recusar")
          .setStyle(ButtonStyle.Danger)
      );

      await canal.send({ embeds: [embed], components: [botoes] });

      await interaction.editReply("📨 Registro enviado com sucesso!");
    }

    /* ACEITAR */
    if (interaction.isButton() && interaction.customId.startsWith("aceitar_")) {

      await interaction.deferReply({ ephemeral: true });

      const [, userId, cargoNum, nick] = interaction.customId.split("_");

      const member = await interaction.guild.members.fetch(userId);
      const admNivel = getNivel(interaction.member);
      const cargoInfo = cargos[cargoNum];

      if (!member || !cargoInfo) {
        return interaction.editReply("Erro ao processar.");
      }

      if (cargoInfo.nivel > admNivel) {
        return interaction.editReply("❌ Você não pode aprovar cargo maior que o seu.");
      }

      for (const key in cargos) {
        if (member.roles.cache.has(cargos[key].id)) {
          await member.roles.remove(cargos[key].id);
        }
      }

      await member.roles.add(cargoInfo.id);

      if (cargoNum >= 3) {
        await member.roles.add(cargos[2].id);
      }

      try {
        await member.setNickname(`${TAG} ${nick}`);
      } catch {}

      await interaction.editReply(`✅ Registro aprovado para ${member.user.tag}`);
    }

    /* RECUSAR */
    if (interaction.isButton() && interaction.customId.startsWith("recusar_")) {

      await interaction.reply({
        content: "❌ Registro recusado.",
        ephemeral: true
      });
    }

  } catch (err) {
    console.log("ERRO INTERAÇÃO:", err);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Ocorreu um erro interno.",
          ephemeral: true
        });
      }
    } catch {}
  }

});

/* PROTEÇÃO GLOBAL */
process.on("unhandledRejection", (reason) => {
  console.log("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception:", err);
});

/* LOGIN */
client.login(TOKEN).catch(console.error);
