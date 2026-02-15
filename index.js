const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection, StringSelectMenuBuilder, REST, Routes 
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

const tentativas = new Collection();
const memoriaEdicao = new Collection();

function dataAtual() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// ===================== REGISTRO DE COMANDOS =====================
client.once("ready", async () => {
  console.log(`✅ Horizonte RP Online.`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: [
        { name: 'painel', description: 'Envia o painel de registro público.' },
        { name: 'configadm', description: 'Abre a central de comando da administração.' }
      ]
    });
    console.log('Comandos Slash registrados!');
  } catch (e) { console.error(e); }
});

client.on("interactionCreate", async (interaction) => {
  try {
    // --- COMANDO /PAINEL ---
    if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2).setTitle("📋 SISTEMA DE REGISTRO")
        .setDescription("Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.");
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("abrir_modal").setLabel("Registrar-se").setEmoji("📋").setStyle(ButtonStyle.Primary));
      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: "Painel enviado.", ephemeral: true });
    }

    // --- COMANDO /CONFIGADM ---
    if (interaction.isChatInputCommand() && interaction.commandName === "configadm") {
      if (interaction.channelId !== STAFF_CANAL_ID) return interaction.reply({ content: "Canal incorreto.", ephemeral: true });
      const embedStaff = new EmbedBuilder().setColor(0x2b2d31).setTitle("🛠️ CONFIGURAÇÃO ADMINISTRATIVA").setDescription("Gerencie o servidor por aqui.");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("staff_agendar").setLabel("Mensagem Automática").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("staff_forms").setLabel("Novo Formulário").setStyle(ButtonStyle.Primary)
      );
      return interaction.reply({ embeds: [embedStaff], components: [row], ephemeral: true });
    }

    // --- MODAL DE REGISTRO ---
    if (interaction.isButton() && interaction.customId === "abrir_modal") {
      const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem na cidade").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return interaction.showModal(modal);
    }

    // --- RECEBER REGISTRO ---
    if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
      const nick = interaction.fields.getTextInputValue("m_nick");
      const cNum = interaction.fields.getTextInputValue("m_cargo");
      if (!cargos[cNum]) return interaction.reply({ content: "Cargo inválido (1-6).", ephemeral: true });

      const embed = new EmbedBuilder().setColor(0x2B2D31).setTitle("📥 NOVO REGISTRO").addFields(
        { name: "Usuário", value: `${interaction.user}`, inline: true },
        { name: "Nick", value: nick, inline: true },
        { name: "Cargo", value: cargos[cNum].nome, inline: true }
      );
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`editar_menu_${interaction.user.id}_${cNum}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
      );
      client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: "✅ Registro enviado!", ephemeral: true });
    }

    // --- MENU DE EDIÇÃO COM BOTÃO CANCELAR ---
    if (interaction.isButton() && interaction.customId.startsWith("editar_menu")) {
      const [, , userId, cNum, nick] = interaction.customId.split("_");
      memoriaEdicao.set(userId, { cargo: cNum, nick: nick, originalCargo: cNum });

      const embedEdit = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ MENU DE EDIÇÃO").setDescription(`Editando: <@${userId}>`);
      const rowSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(`sel_c_${userId}`).setPlaceholder("Mudar Cargo...").addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
      );
      const rowBtns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`edit_nick_modal_${userId}`).setLabel("Editar Nick").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`finalizar_edit_${userId}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`cancelar_edit`).setLabel("Cancelar").setStyle(ButtonStyle.Danger) // BOTÃO CANCELAR
      );
      return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
    }

    // --- LÓGICA CANCELAR ---
    if (interaction.isButton() && interaction.customId === "cancelar_edit") {
      return interaction.update({ content: "❌ Edição cancelada.", embeds: [], components: [] });
    }

    // --- MODAL NICK EDIÇÃO ---
    if (interaction.isButton() && interaction.customId.startsWith("edit_nick_modal")) {
      const userId = interaction.customId.split("_")[3];
      const modal = new ModalBuilder().setCustomId(`modal_edit_nick_${userId}`).setTitle("Alterar Nick");
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("new_nick").setLabel("NOVO NICK").setStyle(TextInputStyle.Short).setRequired(true)));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_edit_nick")) {
      const userId = interaction.customId.split("_")[3];
      const newNick = interaction.fields.getTextInputValue("new_nick");
      const dados = memoriaEdicao.get(userId);
      if (dados) { dados.nick = newNick; memoriaEdicao.set(userId, dados); }
      return interaction.reply({ content: `✅ Nick alterado para: **${newNick}**.`, ephemeral: true });
    }

    // --- SELEÇÃO CARGO EDIÇÃO ---
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sel_c")) {
      const userId = interaction.customId.split("_")[2];
      const newCargo = interaction.values[0];
      const dados = memoriaEdicao.get(userId);
      if (dados) { dados.cargo = newCargo; memoriaEdicao.set(userId, dados); }
      return interaction.reply({ content: `✅ Cargo alterado para: **${cargos[newCargo].nome}**.`, ephemeral: true });
    }

    // --- CONFIRMAR EDIÇÃO (PROMOÇÃO/REBAIXAMENTO) ---
    if (interaction.isButton() && interaction.customId.startsWith("finalizar_edit")) {
      const userId = interaction.customId.split("_")[2];
      const dados = memoriaEdicao.get(userId);
      if (!dados) return interaction.reply({ content: "Dados expirados.", ephemeral: true });

      const embedAtu = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 REGISTRO ATUALIZADO (EDITADO)").addFields(
        { name: "Usuário", value: `<@${userId}>`, inline: true },
        { name: "Nick", value: dados.nick, inline: true },
        { name: "Cargo", value: cargos[dados.cargo].nome, inline: true },
        { name: "Responsável", value: interaction.user.tag, inline: false }
      );
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aceitar_${userId}_${dados.cargo}_${dados.nick}`).setLabel("Confirmar e Aceitar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${userId}_${dados.nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger)
      );

      await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embedAtu], components: [row] });
      return interaction.update({ content: "✅ Alterações aplicadas e enviadas ao canal de aprovação!", embeds: [], components: [] });
    }

    // --- LÓGICA DE ACEITAR / RECUSAR ---
    if (interaction.isButton()) {
      const [acao, userId, cNum, nick] = interaction.customId.split("_");
      const target = await interaction.guild.members.fetch(userId).catch(() => null);

      if (acao === "aceitar") {
        await interaction.deferUpdate();
        if (target) {
          const ids = Object.values(cargos).filter(c => c.nivel <= cargos[cNum].nivel).map(c => c.id);
          await target.roles.add(ids);
          await target.roles.remove(CARGO_AUTOMATICO).catch(() => {});
          await target.setNickname(`${TAG_PREFIXO} ${nick}`).catch(() => {});
          
          const embedDM = new EmbedBuilder().setColor(0x2BFF2B).setTitle("✅ REGISTRO APROVADO").setDescription(`Parabéns **${nick}**, seu registro foi aceito!`).addFields({ name: "Cargo", value: cargos[cNum].nome }, { name: "Responsável", value: interaction.user.tag });
          await target.send({ embeds: [embedDM] }).catch(() => {});
        }
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`recusar_${userId}_${nick}`).setLabel("Recusar / Retirar Cargo").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`remover_${userId}`).setLabel("Remoção (Expulsar)").setStyle(ButtonStyle.Secondary)
        );
        return interaction.editReply({ components: [row] });
      }

      if (acao === "recusar") {
        await interaction.deferUpdate();
        if (target) {
          await target.roles.remove(Object.values(cargos).map(c => c.id)).catch(() => {});
          await target.roles.add(CARGO_AUTOMATICO).catch(() => {});
        }
        return interaction.editReply({ content: "❌ Registro Recusado e Cargos Removidos.", components: [
            new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`editar_menu_${userId}_1_${nick}`).setLabel("Editar / Aceitar").setStyle(ButtonStyle.Success))
        ] });
      }

      if (acao === "remover") {
        if (target) await target.kick("Remoção Administrativa");
        return interaction.reply({ content: "Jogador expulso.", ephemeral: true });
      }
    }

  } catch (err) { console.error(err); }
});

client.login(TOKEN);
