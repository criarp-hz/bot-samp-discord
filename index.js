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
  StringSelectMenuBuilder
} = require("discord.js");

const express = require("express");
const app = express();

const TOKEN = process.env.TOKEN || "SEU_TOKEN_AQUI";

// ===== CONFIG =====

const TAG = "『Ⓗ¹』";

const AUTO_ROLE = "1472054758415138960";

const REGISTRO_CANAL = "1472463885620609180";
const APROVACAO_CANAL = "1472464723738886346";

const CARGOS = {
  1: { id: "1472055381713883187", nome: "Ajudante" },
  2: { id: "1472055978911465673", nome: "Moderador" },
  3: { id: "1472056709349511263", nome: "Administrador" },
  4: { id: "1472057320799338639", nome: "Auxiliar" },
  5: { id: "1472058121529593906", nome: "Coordenação" },
  6: { id: "1472058401394655355", nome: "Direção" }
};

// ===== CLIENT =====

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// ===== KEEP ONLINE =====

app.get("/", (req, res) => res.send("Bot online"));
app.listen(process.env.PORT || 3000);

// ===== DATA =====

const registros = new Map();

// ===== DATA HORA =====

function getDataHora() {
  return new Date().toLocaleString("pt-BR");
}

// ===== AUTO ROLE ENTRADA =====

client.on("guildMemberAdd", async (member) => {
  try {
    await member.roles.add(AUTO_ROLE);
  } catch {}
});

// ===== ENVIAR PAINEL =====

async function enviarPainel() {
  const canal = await client.channels.fetch(REGISTRO_CANAL);

  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setDescription(
`📋 **SISTEMA DE REGISTRO**

Bem-vindo ao sistema de registro do servidor.

Para que tudo funcione corretamente, selecione e utilize apenas o cargo correspondente ao seu setor atual.

⚠️ **Usar cargo incorreto pode causar:**
• Erros no registro  
• Problemas de permissão  
• Penalidades administrativas  

✅ Em caso de dúvida, procure um responsável.`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("registrar")
      .setLabel("Registrar-se")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Primary)
  );

  await canal.send({ embeds: [embed], components: [row] });
}

// ===== READY =====

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} ONLINE`);
  await enviarPainel();
});

// ===== INTERAÇÕES =====

client.on("interactionCreate", async (interaction) => {

  // ===== BOTÃO REGISTRAR =====

  if (interaction.isButton() && interaction.customId === "registrar") {

    const modal = new ModalBuilder()
      .setCustomId("modal_registro")
      .setTitle("Registro de Membro");

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

    return interaction.showModal(modal);
  }

  // ===== ENVIO REGISTRO =====

  if (interaction.isModalSubmit() && interaction.customId === "modal_registro") {

    const nick = interaction.fields.getTextInputValue("nick");
    const cargoNum = interaction.fields.getTextInputValue("cargo");

    const cargoInfo = CARGOS[cargoNum];

    if (!cargoInfo)
      return interaction.reply({ content: "❌ Cargo inválido.", ephemeral: true });

    registros.set(interaction.user.id, {
      nick,
      cargoNum,
      userId: interaction.user.id
    });

    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setTitle("📨 Novo Registro")
      .addFields(
        { name: "Usuário", value: `<@${interaction.user.id}>` },
        { name: "Nick", value: nick },
        { name: "Cargo", value: cargoInfo.nome },
        { name: "Data / Hora", value: getDataHora() }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`aceitar_${interaction.user.id}`)
        .setLabel("Aceitar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`recusar_${interaction.user.id}`)
        .setLabel("Recusar")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`editar_${interaction.user.id}`)
        .setLabel("Editar")
        .setStyle(ButtonStyle.Secondary)
    );

    const canal = await client.channels.fetch(APROVACAO_CANAL);
    await canal.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: "✅ Registro enviado para análise.",
      ephemeral: true
    });
  }

  // ===== ACEITAR =====

  if (interaction.isButton() && interaction.customId.startsWith("aceitar_")) {

    const userId = interaction.customId.split("_")[1];
    const dados = registros.get(userId);

    if (!dados)
      return interaction.reply({ content: "Registro não encontrado.", ephemeral: true });

    const member = await interaction.guild.members.fetch(userId);

    const cargoInfo = CARGOS[dados.cargoNum];

    await member.roles.add(cargoInfo.id);
    await member.setNickname(`${TAG} ${dados.nick}`);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("✅ Registro Aprovado")
      .setDescription(
`Seu registro foi aprovado com sucesso!

Cargo: ${cargoInfo.nome}
Nick: ${TAG} ${dados.nick}
Data: ${getDataHora()}

Equipe Horizonte RP`
      );

    await member.send({ embeds: [embed] }).catch(() => {});

    await interaction.reply({
      content: `✅ Aprovado por ${interaction.user}`,
      ephemeral: false
    });
  }

  // ===== RECUSAR =====

  if (interaction.isButton() && interaction.customId.startsWith("recusar_")) {

    const userId = interaction.customId.split("_")[1];

    const member = await interaction.guild.members.fetch(userId).catch(() => null);

    if (member) {

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("❌ Registro Não Aprovado")
        .setDescription(
`Seu registro não foi aprovado.

Caso acredite que houve erro,
envie novamente.

Equipe Horizonte RP`
        );

      await member.send({ embeds: [embed] }).catch(() => {});
    }

    await interaction.reply({ content: "Registro recusado.", ephemeral: false });
  }

  // ===== EDITAR MENU =====

  if (interaction.isButton() && interaction.customId.startsWith("editar_")) {

    const userId = interaction.customId.split("_")[1];

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`editnick_${userId}`)
        .setLabel("Alterar Apelido")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`editcargo_${userId}`)
        .setLabel("Alterar Cargo")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      content: "Painel de edição:",
      components: [row],
      ephemeral: true
    });
  }

  // ===== EDITAR NICK =====

  if (interaction.isButton() && interaction.customId.startsWith("editnick_")) {

    const userId = interaction.customId.split("_")[1];

    const modal = new ModalBuilder()
      .setCustomId(`modal_editnick_${userId}`)
      .setTitle("Alterar Nick");

    const nick = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Novo nick")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(nick));

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_editnick_")) {

    const userId = interaction.customId.split("_")[2];
    const novoNick = interaction.fields.getTextInputValue("nick");

    const member = await interaction.guild.members.fetch(userId);

    await member.setNickname(`${TAG} ${novoNick}`);

    await interaction.reply({
      content: "✅ Nick alterado.",
      ephemeral: true
    });
  }

  // ===== EDITAR CARGO =====

  if (interaction.isButton() && interaction.customId.startsWith("editcargo_")) {

    const userId = interaction.customId.split("_")[1];

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`selectcargo_${userId}`)
      .setPlaceholder("Selecionar cargo")
      .addOptions([
        { label: "Ajudante", value: "1" },
        { label: "Moderador", value: "2" },
        { label: "Administrador", value: "3" },
        { label: "Auxiliar", value: "4" },
        { label: "Coordenação", value: "5" },
        { label: "Direção", value: "6" }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: "Selecione o cargo:",
      components: [row],
      ephemeral: true
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("selectcargo_")) {

    const userId = interaction.customId.split("_")[1];
    const cargoNum = interaction.values[0];

    const member = await interaction.guild.members.fetch(userId);

    const cargoInfo = CARGOS[cargoNum];

    await member.roles.add(cargoInfo.id);

    await interaction.reply({
      content: `✅ Cargo alterado para ${cargoInfo.nome}`,
      ephemeral: true
    });
  }

});

// ===== LOGIN =====

client.login(TOKEN);
