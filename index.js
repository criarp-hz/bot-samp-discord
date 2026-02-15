const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection, StringSelectMenuBuilder 
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===================== CONFIGURAÇÕES =====================
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
const dados_edit = new Collection(); // Cache para edições temporárias

function dataAtual() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// ===================== REGISTRO DE COMANDOS =====================
client.once("ready", async () => {
  console.log(`✅ Horizonte RP - Sistema Profissional Ativo.`);
  const guild = client.guilds.cache.first();
  if (guild) {
    await guild.commands.set([
      { name: 'painel', description: 'Envia o painel de registro público.' },
      { name: 'painelstaff', description: 'Abre a central de comando da administração.' }
    ]);
  }
});

// ===================== LÓGICA DE INTERAÇÃO =====================
client.on("interactionCreate", async (interaction) => {
  try {
    // --- COMANDO PAINEL PÚBLICO ---
    if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📋 SISTEMA DE REGISTRO")
        .setDescription("Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("abrir_modal").setLabel("Registrar-se").setEmoji("📋").setStyle(ButtonStyle.Primary)
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: "Painel enviado.", ephemeral: true });
    }

    // --- COMANDO PAINEL STAFF ---
    if (interaction.isChatInputCommand() && interaction.commandName === "painelstaff") {
      if (!interaction.member.permissions.has("Administrator")) return interaction.reply({ content: "Sem permissão.", ephemeral: true });

      const embedStaff = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("🛠️ PAINEL STAFF - HORIZONTE RP")
        .setDescription("Central administrativa para gestão de membros e mensagens.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("staff_agendar").setLabel("Agendar Mensagem").setStyle(ButtonStyle.Secondary).setEmoji("⏰"),
        new ButtonBuilder().setCustomId("staff_forms").setLabel("Gerenciar Forms").setStyle(ButtonStyle.Secondary).setEmoji("📝")
      );
      return interaction.reply({ embeds: [embedStaff], components: [row], ephemeral: true });
    }

    // --- MODAL DE REGISTRO (CONFORME PEDIDO) ---
    if (interaction.isButton() && interaction.customId === "abrir_modal") {
      const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
      
      const nickInput = new TextInputBuilder()
        .setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem na cidade").setStyle(TextInputStyle.Short).setRequired(true);
      
      const cargoInput = new TextInputBuilder()
        .setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short).setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nickInput), new ActionRowBuilder().addComponents(cargoInput));
      return interaction.showModal(modal);
    }

    // --- RECEBIMENTO DO FORMULÁRIO ---
    if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
      const nick = interaction.fields.getTextInputValue("m_nick");
      const cargoNum = interaction.fields.getTextInputValue("m_cargo");
      if (!cargos[cargoNum]) return interaction.reply({ content: "Cargo inválido (1-6).", ephemeral: true });

      const embedReq = new EmbedBuilder()
        .setColor(0x2B2D31).setTitle("📥 NOVO REGISTRO")
        .addFields(
          { name: "Usuário", value: `${interaction.user}`, inline: true },
          { name: "Nick", value: nick, inline: true },
          { name: "Cargo", value: cargos[cargoNum].nome, inline: true },
          { name: "Data", value: dataAtual() }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cargoNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`editar_menu_${interaction.user.id}_${cargoNum}_${nick}_novo`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
      );

      client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embedReq], components: [row] });
      return interaction.reply({ content: "✅ Registro enviado!", ephemeral: true });
    }

    // --- MENU DE EDIÇÃO (DINÂMICO) ---
    if (interaction.isButton() && interaction.customId.startsWith("editar_menu")) {
      const [, , userId, cNum, nick, tipo] = interaction.customId.split("_");
      
      const embedEdit = new EmbedBuilder()
        .setColor(0xFFA500).setTitle("⚙️ MENU DE EDIÇÃO")
        .setDescription(`Editando registro de: <@${userId}>\nNick Atual: **${nick}**\nCargo Atual: **${cargos[cNum].nome}**`);

      const rowSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`sel_cargo_${userId}_${cNum}_${nick}_${tipo}`)
          .setPlaceholder("Alterar Cargo para...")
          .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
      );

      const rowBtns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`edit_nick_${userId}_${cNum}_${nick}_${tipo}`).setLabel("Editar Nick").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`confirm_edit_${userId}_${tipo}`).setLabel("Confirmar Alterações").setStyle(ButtonStyle.Success)
      );

      return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
    }

    // --- LÓGICA DE ACEITAR / PROMOÇÃO / REBAIXAMENTO ---
    if (interaction.isButton() && interaction.customId.startsWith("aceitar")) {
      await interaction.deferUpdate();
      const [, userId, cNum, nick] = interaction.customId.split("_");
      const target = await interaction.guild.members.fetch(userId).catch(() => null);

      if (target) {
        // Hierarquia: Adiciona cargo alvo e todos os menores
        const ids = Object.values(cargos).filter(c => c.nivel <= cargos[cNum].nivel).map(c => c.id);
        await target.roles.add(ids);
        await target.roles.remove(CARGO_AUTOMATICO).catch(() => {});
        await target.setNickname(`${TAG_PREFIXO} ${nick}`).catch(() => {});

        // Mensagem Profissional
        const embedDM = new EmbedBuilder()
          .setColor(0x2BFF2B).setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
          .setDescription(`Prezado(a) **${nick}**,\n\nSeu registro foi analisado pela equipe administrativa e foi **APROVADO**.`)
          .addFields(
            { name: "💼 Cargo Assumido", value: cargos[cNum].nome, inline: true },
            { name: "👮 Responsável", value: interaction.user.tag, inline: true },
            { name: "📅 Data/Hora", value: dataAtual() }
          ).setFooter({ text: "Bem-vindo à equipe!" });

        await target.send({ embeds: [embedDM] }).catch(() => {});
      }

      const editEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(0x2BFF2B).setTitle("✅ REGISTRO ACEITO");
      return interaction.editReply({ embeds: [editEmbed], components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`editar_menu_${userId}_${cNum}_${nick}_aceito`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`remover_${userId}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
        )
      ]});
    }

    // --- AGENDAMENTO (STAFF) ---
    if (interaction.isButton() && interaction.customId === "staff_agendar") {
      const modalMsg = new ModalBuilder().setCustomId("modal_staff_msg").setTitle("Agendar Mensagem Profissional");
      modalMsg.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t").setLabel("TÍTULO").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("d").setLabel("DESCRIÇÃO").setStyle(TextInputStyle.Paragraph)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m").setLabel("MINUTOS PARA ENVIAR").setStyle(TextInputStyle.Short))
      );
      return interaction.showModal(modalMsg);
    }

    // --- RECUSAR (COM 3 TENTATIVAS) ---
    if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
      const [, userId, nick] = interaction.customId.split("_");
      const tent = (tentativas.get(userId) || 0) + 1;
      tentativas.set(userId, tent);

      const target = await interaction.guild.members.fetch(userId).catch(() => null);
      if (target) {
        if (tent >= 3) {
          await target.send("❌ Você foi recusado 3 vezes e expulso da Horizonte RP.").catch(() => {});
          await target.kick("Excedeu limite de registros.");
        } else {
          const embedRec = new EmbedBuilder()
            .setColor(0xFF2B2B).setTitle("❌ REGISTRO RECUSADO")
            .setDescription(`Olá **${nick}**, seu registro foi recusado por **${interaction.user.tag}**.\n\nCaso ache que foi um engano, envie o formulário novamente. Se for recusado 3 vezes, você será expulso.`)
            .addFields({ name: "Tentativas", value: `${tent}/3` });
          await target.send({ embeds: [embedRec] }).catch(() => {});
        }
      }
      return interaction.reply({ content: `Recusado. Tentativa ${tent}/3`, ephemeral: true });
    }

  } catch (err) {
    console.error("Erro interno:", err);
  }
});

client.login(TOKEN);
