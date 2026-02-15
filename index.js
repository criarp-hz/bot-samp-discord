const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

// ===================== CONFIGURAÇÃO =====================
const REGISTRO_CANAL = "1472463885620609180";
const APROVACAO_CANAL = "1472464723738886346";
const CARGO_AUTOMATICO = "1472054758415138960";
const TAG = "『Ⓗ¹』";

const cargos = {
  1: { nome: "Ajudante", id: "1472055381713883187", nivel: 1 },
  2: { nome: "Moderador(a)", id: "1472055978911465673", nivel: 2 },
  3: { nome: "Administrador(a)", id: "1472056709349511263", nivel: 3 },
  4: { nome: "Auxiliar", id: "1472057320799338639", nivel: 4 },
  5: { nome: "Coordenador(a)", id: "1472058121529593906", nivel: 5 },
  6: { nome: "Direção", id: "1472058401394655355", nivel: 6 }
};

const limiteTentativas = 3;
const tentativas = new Collection();

// ===================== FUNÇÕES =====================

// Pega nível do usuário baseado nos cargos
function getNivel(member) {
  let nivel = 0;
  for (const key in cargos) {
    if (member.roles.cache.has(cargos[key].id)) {
      if (cargos[key].nivel > nivel) nivel = cargos[key].nivel;
    }
  }
  return nivel;
}

// Data e hora formatada
function dataAtual() {
  return new Date().toLocaleString("pt-BR");
}

// Envia painel de registro
async function enviarPainel(guild) {
  const canal = guild.channels.cache.get(REGISTRO_CANAL);
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("📋 SISTEMA DE REGISTRO")
    .setDescription(
      `Bem-vindo ao sistema de registro do servidor!\n\n` +
      `Para que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n` +
      `⚠️ **Usar cargo incorreto pode causar:**\n` +
      `• Erros no registro\n` +
      `• Problemas de permissão\n` +
      `• Penalidades administrativas\n\n` +
      `✅ Em caso de dúvida, procure um responsável do seu setor.`
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

// Registro aceito / promoção
async function registroAceito(member, cargoInfo, aprovador, nivelAnterior = null) {
  const embed = new EmbedBuilder()
    .setColor("#2bff2b")
    .setTitle("✅ REGISTRO ACEITO / PROMOÇÃO")
    .addFields(
      { name: "Usuário", value: `${member}`, inline: true },
      { name: "Nick", value: member.displayName, inline: true },
      { name: "Cargo Atual", value: cargoInfo.nome, inline: true },
      nivelAnterior ? { name: "Cargo Anterior", value: nivelAnterior, inline: true } : {},
      { name: "Responsável", value: aprovador.user.tag, inline: true },
      { name: "Data e Hora", value: dataAtual(), inline: false }
    )
    .setFooter({ text: "Sistema desenvolvido pela Horizonte Roleplay" });

  const canal = member.guild.channels.cache.get(APROVACAO_CANAL);
  if(canal) canal.send({ embeds: [embed] });
}

// Registro recusado
async function registroRecusado(member, aprovador) {
  const embed = new EmbedBuilder()
    .setColor("#ff2b2b")
    .setTitle("❌ REGISTRO RECUSADO")
    .addFields(
      { name: "Usuário", value: `${member}`, inline: true },
      { name: "Responsável", value: aprovador.user.tag, inline: true },
      { name: "Data e Hora", value: dataAtual(), inline: false },
      { name: "Observação", value: "Caso ache que foi um erro, envie novamente o registro." }
    )
    .setFooter({ text: "Sistema desenvolvido pela Horizonte Roleplay" });

  const canal = member.guild.channels.cache.get(APROVACAO_CANAL);
  if(canal) canal.send({ embeds: [embed] });
}

// ===================== EVENTOS =====================

// Novo membro entra → recebe cargo automático
client.on("guildMemberAdd", async (member) => {
  try { await member.roles.add(CARGO_AUTOMATICO); } catch {}
});

// Bot online → envia painel
client.once("ready", async () => {
  console.log("Bot online:", client.user.tag);
  const guild = client.guilds.cache.first();
  if(guild) enviarPainel(guild);
});

// Interações
client.on("interactionCreate", async (interaction) => {
  try {
    // Botão registrar
    if(interaction.isButton() && interaction.customId === "registrar") {
      const modal = new ModalBuilder()
        .setCustomId("modalRegistro")
        .setTitle("Registro de Membro");

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

    // Submissão do modal
    if(interaction.isModalSubmit() && interaction.customId === "modalRegistro") {
      const nick = interaction.fields.getTextInputValue("nick");
      const cargoNum = interaction.fields.getTextInputValue("cargo");

      const cargoInfo = cargos[cargoNum];
      if(!cargoInfo) return interaction.reply({ content: "❌ Cargo inválido.", ephemeral: true });

      // Tentativas
      const userTentativas = tentativas.get(interaction.user.id) || 0;
      if(userTentativas >= limiteTentativas) {
        await interaction.user.kick();
        return interaction.reply({ content: "❌ Limite de tentativas atingido. Você foi expulso.", ephemeral: true });
      }
      tentativas.set(interaction.user.id, userTentativas + 1);

      // Enviar para aprovação
      const canal = client.channels.cache.get(APROVACAO_CANAL);
      if(!canal) return interaction.reply({ content: "❌ Canal de aprovação não encontrado.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle("📥 NOVO REGISTRO")
        .addFields(
          { name: "Usuário", value: `${interaction.user}`, inline: true },
          { name: "Nick", value: nick, inline: true },
          { name: "Cargo", value: cargoInfo.nome, inline: true },
          { name: "Data e Hora", value: dataAtual(), inline: false }
        );

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId("aceitarRegistro").setLabel("Aceitar").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("recusarRegistro").setLabel("Recusar").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("editarRegistro").setLabel("Editar").setStyle(ButtonStyle.Secondary)
        );

      canal.send({ embeds: [embed], components: [row] });
      interaction.reply({ content: "✅ Registro enviado para aprovação.", ephemeral: true });
    }

    // Aqui você pode expandir os botões de Aceitar, Recusar, Editar e Remoção
    // incluindo o sistema de promoção/rebaixamento automático,
    // mudança de apelido e envio de mensagem administrativa detalhada

  } catch(err) {
    console.error("[Erro Interaction]:", err);
  }
});

// ===================== LOGIN =====================
client.login(TOKEN).catch(console.error);
