const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection, StringSelectMenuBuilder, InteractionType 
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===================== CONFIGURAÇÕES (AJUSTE OS IDS) =====================
const TOKEN = process.env.TOKEN;
const REGISTRO_CANAL = "1472463885620609180";
const APROVACAO_CANAL = "1472464723738886346";
const CARGO_AUTOMATICO = "1472054758415138960";
const TAG_PREFIXO = "『Ⓗ¹』";

const cargos = {
  "1": { nome: "Ajudante", id: "1472055381713883187", nivel: 1 },
  "2": { nome: "Moderador(a)", id: "1472055978911465673", nivel: 2 },
  "3": { nome: "Administrador(a)", id: "1472056709349511263", nivel: 3 },
  "4": { nome: "Auxiliar", id: "1472057320799338639", nivel: 4 },
  "5": { nome: "Coordenador(a)", id: "1472058121529593906", nivel: 5 },
  "6": { nome: "Direção", id: "1472058401394655355", nivel: 6 }
};

const tentativas = new Collection();
const dados_temporarios = new Collection(); // Armazena edições antes de confirmar

// ===================== FUNÇÕES DE APOIO =====================

function dataAtual() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Sistema de cargos em cascata (se ganha 4, ganha 3, 2 e 1)
async function aplicarCargos(member, nivelAlvo) {
  let idsParaAdicionar = [];
  for (let key in cargos) {
    if (cargos[key].nivel <= nivelAlvo) idsParaAdicionar.push(cargos[key].id);
  }
  await member.roles.add(idsParaAdicionar);
  await member.roles.remove(CARGO_AUTOMATICO).catch(() => {});
}

// ===================== INÍCIO DO CÓDIGO =====================

client.once("ready", () => {
  console.log(`🚀 Horizonte RP logado como ${client.user.tag}`);
});

// Recebe cargo automático ao entrar
client.on("guildMemberAdd", async (m) => {
  try { await m.roles.add(CARGO_AUTOMATICO); } catch(e) {}
});

client.on("interactionCreate", async (interaction) => {
  // Tratamento de erros global para o bot não cair
  try {

    // --- COMANDOS /PAINEL E /PAINELSTAFF ---
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("📋 SISTEMA DE REGISTRO")
          .setDescription("Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.")
          .setFooter({ text: "Horizonte Roleplay" });

        const btn = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("abrir_modal_registro").setLabel("Registrar-se").setEmoji("📋").setStyle(ButtonStyle.Primary)
        );
        await interaction.channel.send({ embeds: [embed], components: [btn] });
        return interaction.reply({ content: "Painel enviado!", ephemeral: true });
      }

      if (interaction.commandName === "painelstaff") {
        const embedStaff = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle("🛠️ PAINEL ADMINISTRATIVO")
          .setDescription("Selecione abaixo o que deseja gerenciar:");

        const rowStaff = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("staff_msg_automatica").setLabel("Mensagem Automática").setStyle(ButtonStyle.Secondary).setEmoji("⏰"),
          new ButtonBuilder().setCustomId("staff_novos_forms").setLabel("Criar Formulários").setStyle(ButtonStyle.Secondary).setEmoji("📝")
        );
        return interaction.reply({ embeds: [embedStaff], components: [rowStaff], ephemeral: true });
      }
    }

    // --- BOTÃO REGISTRAR-SE ---
    if (interaction.isButton() && interaction.customId === "abrir_modal_registro") {
      const modal = new ModalBuilder().setCustomId("modal_registro").setTitle("Registro de Membro");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reg_nick").setLabel("NOME DO SEU PERSONAGEM").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reg_cargo").setLabel("NÚMERO DO CARGO (1 a 6)").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return interaction.showModal(modal);
    }

    // --- SUBMISSÃO DO REGISTRO ---
    if (interaction.isModalSubmit() && interaction.customId === "modal_registro") {
      const nick = interaction.fields.getTextInputValue("reg_nick");
      const cargoNum = interaction.fields.getTextInputValue("reg_cargo");
      const cargoInfo = cargos[cargoNum];

      if (!cargoInfo) return interaction.reply({ content: "❌ Cargo Inválido! Use números de 1 a 6.", ephemeral: true });

      const embedReq = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle("📥 NOVO REGISTRO")
        .addFields(
          { name: "Usuário", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Nick", value: nick, inline: true },
          { name: "Cargo", value: cargoInfo.nome, inline: true },
          { name: "Data/Hora", value: dataAtual() }
        );

      const btns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cargoNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`editar_antes_${interaction.user.id}_${cargoNum}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
      );

      const canalAprov = client.channels.cache.get(APROVACAO_CANAL);
      await canalAprov.send({ embeds: [embedReq], components: [btns] });
      return interaction.reply({ content: "✅ Registro enviado com sucesso!", ephemeral: true });
    }

    // --- LÓGICA DE ACEITAR / RECUSAR / EDITAR ---
    if (interaction.isButton()) {
      const parts = interaction.customId.split("_");
      const acao = parts[0];
      const targetId = parts[1];
      const member = await interaction.guild.members.fetch(targetId).catch(() => null);

      if (acao === "aceitar") {
        const cNum = parts[2];
        const nName = parts[3];
        await aplicarCargos(member, cargos[cNum].nivel);
        await member.setNickname(`${TAG_PREFIXO} ${nName}`).catch(() => {});

        // Mensagem Profissional ao Jogador
        const embedDm = new EmbedBuilder()
          .setColor(0x2BFF2B)
          .setTitle("✅ REGISTRO APROVADO")
          .setDescription(`Olá **${nName}**, seu registro na **Horizonte Roleplay** foi aprovado!`)
          .addFields(
            { name: "Cargo", value: cargos[cNum].nome, inline: true },
            { name: "Responsável", value: interaction.user.tag, inline: true }
          );
        await member.send({ embeds: [embedDm] }).catch(() => {});

        const embedAceito = EmbedBuilder.from(interaction.message.embeds[0]).setTitle("✅ REGISTRO ACEITO").setColor(0x2BFF2B);
        const btnFinais = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`editar_depois_${targetId}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`remover_${targetId}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
        );
        return interaction.update({ embeds: [embedAceito], components: [btnFinais] });
      }

      if (acao === "recusar") {
        const tentativa = (tentativas.get(targetId) || 0) + 1;
        tentativas.set(targetId, tentativa);

        if (tentativa >= 3) {
          await member.send("Seu registro foi recusado 3 vezes e você foi expulso do servidor.").catch(() => {});
          await member.kick("Limite de tentativas de registro.");
          return interaction.update({ content: "❌ Usuário expulso (3 erros).", components: [] });
        }

        await member.send(`❌ Seu registro foi recusado. Caso ache que foi um erro, retorne ao canal de registro. Tentativa ${tentativa}/3`).catch(() => {});
        return interaction.update({ content: `❌ Registro Recusado por ${interaction.user.tag}`, components: [] });
      }

      if (acao === "remover") {
        // Remove tudo e expulsa
        await member.roles.set([]).catch(() => {});
        await member.kick("Remoção administrativa.");
        return interaction.update({ content: `🚨 Jogador removido por ${interaction.user.tag}`, components: [] });
      }
    }

    // --- AGENDAMENTO DE MENSAGEM (STAFF) ---
    if (interaction.isButton() && interaction.customId === "staff_msg_automatica") {
        const modalMsg = new ModalBuilder().setCustomId("modal_msg_auto").setTitle("Agendar Mensagem");
        modalMsg.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("msg_titulo").setLabel("TÍTULO").setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("msg_desc").setLabel("DESCRIÇÃO").setStyle(TextInputStyle.Paragraph)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("msg_tempo").setLabel("EM QUANTOS MINUTOS ENVIAR?").setStyle(TextInputStyle.Short))
        );
        return interaction.showModal(modalMsg);
    }

    if (interaction.isModalSubmit() && interaction.customId === "modal_msg_auto") {
        const tit = interaction.fields.getTextInputValue("msg_titulo");
        const des = interaction.fields.getTextInputValue("msg_desc");
        const min = parseInt(interaction.fields.getTextInputValue("msg_tempo"));

        interaction.reply({ content: `✅ Mensagem agendada para daqui a ${min} minutos!`, ephemeral: true });

        setTimeout(async () => {
            const embedAuto = new EmbedBuilder().setTitle(tit).setDescription(des).setColor(0x5865F2).setTimestamp();
            const canal = interaction.channel;
            await canal.send({ embeds: [embedAuto] });
        }, min * 60000);
    }

  } catch (err) {
    console.error("Erro detectado:", err);
    if (!interaction.replied) interaction.reply({ content: "Ocorreu um erro interno, mas o bot continua online.", ephemeral: true }).catch(() => {});
  }
});

client.login(TOKEN);
