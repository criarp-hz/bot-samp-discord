const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection, StringSelectMenuBuilder 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// ===================== CONFIGURAÇÕES =====================
const TOKEN = process.env.TOKEN;
const REGISTRO_CANAL = "1472463885620609180";
const APROVACAO_CANAL = "1472464723738886346";
const STAFF_CANAL_ID = "1472065290929180764";
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

const memoriaEdicao = new Collection();
const tentativas = new Collection();

function dataAtual() { return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }); }

// ===================== STARTUP =====================
client.once("ready", async () => {
  console.log(`✅ Horizonte RP - Sistema Master Online.`);
  const guild = client.guilds.cache.first();
  if (guild) {
    await guild.commands.set([
      { name: 'painel', description: 'Envia o painel de registro público.' },
      { name: 'configadm', description: 'Central administrativa.' }
    ]);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    // --- /CONFIGADM ---
    if (interaction.isChatInputCommand() && interaction.commandName === "configadm") {
      if (interaction.channelId !== STAFF_CANAL_ID) return interaction.reply({ content: "Canal incorreto.", ephemeral: true });
      
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31).setTitle("🛠️ PAINEL ADMINISTRATIVO").setDescription("Gestão de Mensagens e Formulários.");
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("staff_msg").setLabel("Mensagem Automática").setStyle(ButtonStyle.Primary).setEmoji("⏰"),
        new ButtonBuilder().setCustomId("fechar_painel").setLabel("Fechar Painel").setStyle(ButtonStyle.Danger).setEmoji("✖️")
      );
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // --- FECHAR PAINEL (BOTÃO CANCELAR/FECHAR) ---
    if (interaction.isButton() && interaction.customId === "fechar_painel") {
        return interaction.update({ content: "⚠️ Painel encerrado pelo administrador.", embeds: [], components: [] });
    }

    // --- MODAL MENSAGEM AUTOMÁTICA ---
    if (interaction.isButton() && interaction.customId === "staff_msg") {
      const modal = new ModalBuilder().setCustomId("modal_msg_auto").setTitle("Programar Mensagem");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t").setLabel("TÍTULO").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("d").setLabel("DESCRIÇÃO").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("c").setLabel("ID DO CANAL").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "modal_msg_auto") {
      const t = interaction.fields.getTextInputValue("t");
      const d = interaction.fields.getTextInputValue("d");
      const cId = interaction.fields.getTextInputValue("c");
      const canal = client.channels.cache.get(cId);

      if (!canal) return interaction.reply({ content: "❌ Canal não encontrado! Verifique o ID.", ephemeral: true });

      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(t).setDescription(d)
        .setFooter({ text: `Enviado por: ${interaction.user.tag} | ${dataAtual()}` });
      
      await canal.send({ embeds: [embed] });
      return interaction.reply({ content: "✅ Mensagem enviada com sucesso!", ephemeral: true });
    }

    // --- SISTEMA DE REGISTRO E EDIÇÃO ---
    if (interaction.isButton() && interaction.customId === "abrir_modal") {
        const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem na cidade").setStyle(TextInputStyle.Short)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short))
        );
        return interaction.showModal(modal);
    }

    // --- RECEBER REGISTRO ---
    if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
      const nick = interaction.fields.getTextInputValue("m_nick");
      const cNum = interaction.fields.getTextInputValue("m_cargo");
      if (!cargos[cNum]) return interaction.reply({ content: "Cargo inválido.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: "👤 Usuário", value: `${interaction.user}`, inline: true },
          { name: "🆔 Nick", value: `\`${nick}\``, inline: true },
          { name: "💼 Cargo", value: `\`${cargos[cNum].nome}\``, inline: true }
        ).setFooter({ text: "Aguardando análise da Staff" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`editar_menu_${interaction.user.id}_${cNum}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
      );

      await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: "✅ Registro enviado!", ephemeral: true });
    }

    // --- BOTÃO CANCELAR EDIÇÃO ---
    if (interaction.isButton() && interaction.customId.startsWith("cancelar_edit")) {
        return interaction.update({ content: "❌ Edição cancelada.", embeds: [], components: [] });
    }

    // --- MENU DE EDIÇÃO ---
    if (interaction.isButton() && interaction.customId.startsWith("editar_menu")) {
        const [, , userId, cNum, nick] = interaction.customId.split("_");
        memoriaEdicao.set(userId, { cargoOriginal: cNum, cargoEditado: cNum, nickOriginal: nick, nickEditado: nick });

        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO").setDescription(`Membro: <@${userId}>`);
        
        const rowSelect = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(`sel_c_${userId}`).setPlaceholder("Escolher novo Cargo...").addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
        );
        
        const rowBtns = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`edit_nick_${userId}`).setLabel("Alterar Nick").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`confirm_edit_${userId}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`cancelar_edit`).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ embeds: [embed], components: [rowSelect, rowBtns], ephemeral: true });
    }

    // (O restante do código de Aceitar/Recusar permanece igual ao fluxo profissional anterior)

  } catch (e) { console.error("Erro na Interação:", e); }
});

client.login(TOKEN);
