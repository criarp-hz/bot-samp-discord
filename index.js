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
function dataAtual() { return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }); }

// ===================== STARTUP =====================
client.once("ready", async () => {
  console.log(`✅ Horizonte RP - Sistema Master Restaurado.`);
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
    // --- /PAINEL (RESTALRADO DO SEU CÓDIGO) ---
    if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2).setTitle('📋 SISTEMA DE REGISTRO')
          .setDescription('Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('abrir_modal').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: "Painel enviado!", ephemeral: true });
    }

    // --- /CONFIGADM ---
    if (interaction.isChatInputCommand() && interaction.commandName === "configadm") {
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31).setTitle("🛠️ PAINEL ADMINISTRATIVO").setDescription("Gestão de Mensagens e Formulários.");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("staff_msg").setLabel("Mensagem Automática").setStyle(ButtonStyle.Primary).setEmoji("⏰"),
        new ButtonBuilder().setCustomId("staff_forms").setLabel("Novo Formulário").setStyle(ButtonStyle.Secondary).setEmoji("📝")
      );
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // --- ABRIR MODAL (CAMPOS ORIGINAIS) ---
    if (interaction.isButton() && interaction.customId === "abrir_modal") {
        const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem na cidade").setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short).setRequired(true))
        );
        return interaction.showModal(modal);
    }

    // --- RECEBER REGISTRO (CONFORME SEU PRINT) ---
    if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
      const nick = interaction.fields.getTextInputValue("m_nick");
      const cNum = interaction.fields.getTextInputValue("m_cargo");
      if (!cargos[cNum]) return interaction.reply({ content: "Cargo inválido.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: "👤 Usuário Discord", value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: false },
          { name: "🆔 Nome no Personagem", value: `\`${nick}\``, inline: true },
          { name: "💼 Cargo Selecionado", value: `\`${cargos[cNum].nome}\``, inline: true },
          { name: "📆 Data de Solicitação", value: dataAtual(), inline: false }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`editar_menu_${interaction.user.id}_${cNum}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
      );

      await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: "✅ Registro enviado!", ephemeral: true });
    }

    // --- LÓGICA DE EDIÇÃO (RESTALRADA) ---
    if (interaction.isButton() && interaction.customId.startsWith("editar_menu")) {
        const [, , userId, cNum, nick] = interaction.customId.split("_");
        memoriaEdicao.set(userId, { cargoOriginal: cNum, cargoEditado: cNum, nickOriginal: nick, nickEditado: nick });

        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO").setDescription(`Editando membro: <@${userId}>`);
        const rowSelect = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(`sel_c_${userId}`).setPlaceholder("Alterar o Cargo...").addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
        );
        const rowBtns = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confirm_edit_${userId}`).setLabel("Confirmar Alterações").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`cancelar`).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ embeds: [embed], components: [rowSelect, rowBtns], ephemeral: true });
    }

    // --- ACEITAR E GERAR RELATÓRIO ---
    if (interaction.isButton() && interaction.customId.startsWith("aceitar")) {
        const [, userId, cNum, nick] = interaction.customId.split("_");
        const target = await interaction.guild.members.fetch(userId).catch(() => null);

        if (target) {
            await target.roles.add([cargos[cNum].id, CARGO_AUTOMATICO]);
            await target.setNickname(`${TAG_PREFIXO} ${nick}`).catch(() => {});
            
            const dm = new EmbedBuilder().setColor(0x00FF00).setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
              .addFields(
                  { name: "💼 Cargo", value: cargos[cNum].nome, inline: true },
                  { name: "👮 Autorizado por", value: interaction.user.tag, inline: true },
                  { name: "⏰ Horário", value: dataAtual(), inline: false }
              );
            await target.send({ embeds: [dm] }).catch(() => {});
        }

        const logEmbed = new EmbedBuilder().setColor(0x00FF00).setTitle("📑 RELATÓRIO DE REGISTRO")
            .addFields(
                { name: "👤 Usuário", value: `<@${userId}>`, inline: true },
                { name: "💼 Cargo", value: `\`${cargos[cNum].nome}\``, inline: true },
                { name: "👮 Responsável", value: `${interaction.user.tag}`, inline: true },
                { name: "📅 Data/Hora", value: `\`${dataAtual()}\`` }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`editar_menu_${userId}_${cNum}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`remover_${userId}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
        );

        return interaction.update({ embeds: [logEmbed], components: [row] });
    }

    // --- REMOÇÃO (HISTÓRICO) ---
    if (interaction.isButton() && interaction.customId.startsWith("remover")) {
        const userId = interaction.customId.split("_")[1];
        const target = await interaction.guild.members.fetch(userId).catch(() => null);
        
        const log = new EmbedBuilder().setColor(0xff0000).setTitle("🚫 RELATÓRIO DE REMOÇÃO")
          .addFields({ name: "👤 Usuário", value: `<@${userId}>` }, { name: "👮 Responsável", value: interaction.user.tag });

        if (target) {
            await target.roles.set([]).catch(() => {});
            target.send("🚨 Sua saída foi registrada no Horizonte RP.").catch(() => {});
        }
        return interaction.update({ embeds: [log], components: [] });
    }

  } catch (e) { console.error(e); }
});

client.login(TOKEN);
