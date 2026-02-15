const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection, StringSelectMenuBuilder, ChannelType 
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
        new ButtonBuilder().setCustomId("staff_forms").setLabel("Novo Formulário").setStyle(ButtonStyle.Secondary).setEmoji("📝")
      );
      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // --- MODAL MENSAGEM AUTOMÁTICA ---
    if (interaction.isButton() && interaction.customId === "staff_msg") {
      const modal = new ModalBuilder().setCustomId("modal_msg_auto").setTitle("Programar Mensagem");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t").setLabel("TÍTULO").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("d").setLabel("DESCRIÇÃO").setStyle(TextInputStyle.Paragraph)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("c").setLabel("ID DO CANAL").setStyle(TextInputStyle.Short))
      );
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "modal_msg_auto") {
      const t = interaction.fields.getTextInputValue("t");
      const d = interaction.fields.getTextInputValue("d");
      const cId = interaction.fields.getTextInputValue("c");
      const canal = client.channels.cache.get(cId);

      if (!canal) return interaction.reply({ content: "Canal não encontrado.", ephemeral: true });

      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(t).setDescription(d)
        .setFooter({ text: `Enviado por: ${interaction.user.tag} | ${dataAtual()}` });
      
      await canal.send({ embeds: [embed] });
      return interaction.reply({ content: "✅ Mensagem enviada com sucesso!", ephemeral: true });
    }

    // --- BOTÃO REGISTRAR ---
    if (interaction.isButton() && interaction.customId === "abrir_modal") {
        const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem na cidade").setStyle(TextInputStyle.Short)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short))
        );
        return interaction.showModal(modal);
    }

    // --- RECEBER REGISTRO (PROFISSIONAL) ---
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
        ).setFooter({ text: "Horizonte Roleplay - Sistema de Gestão" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`editar_menu_${interaction.user.id}_${cNum}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
      );

      await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: "✅ Registro enviado para a staff!", ephemeral: true });
    }

    // --- LÓGICA DE EDIÇÃO (NÃO GERA MENSAGENS EXTRAS) ---
    if (interaction.isButton() && interaction.customId.startsWith("editar_menu")) {
        const [, , userId, cNum, nick] = interaction.customId.split("_");
        memoriaEdicao.set(userId, { cargoOriginal: cNum, cargoEditado: cNum, nickOriginal: nick, nickEditado: nick });

        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO").setDescription(`Editando membro: <@${userId}>`);
        const rowSelect = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId(`sel_c_${userId}`).setPlaceholder("Alterar o Cargo...").addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
        );
        const rowBtns = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`edit_nick_${userId}`).setLabel("Alterar Nick").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`confirm_edit_${userId}`).setLabel("Salvar e Voltar").setStyle(ButtonStyle.Success)
        );
        return interaction.reply({ embeds: [embed], components: [rowSelect, rowBtns], ephemeral: true });
    }

    // --- CONFIRMAR EDIÇÃO (ATUALIZA A MENSAGEM ORIGINAL) ---
    if (interaction.isButton() && interaction.customId.startsWith("confirm_edit")) {
        const userId = interaction.customId.split("_")[2];
        const dados = memoriaEdicao.get(userId);
        
        const embedAtu = new EmbedBuilder()
          .setColor(0x0099ff).setTitle("📝 REGISTRO EDITADO PELA STAFF")
          .addFields(
            { name: "👤 Membro", value: `<@${userId}>`, inline: false },
            { name: "🆔 Nick (Original -> Editado)", value: `\`${dados.nickOriginal}\` -> \`${dados.nickEditado}\``, inline: false },
            { name: "💼 Cargo (Original -> Editado)", value: `\`${cargos[dados.cargoOriginal].nome}\` -> \`${cargos[dados.cargoEditado].nome}\``, inline: false },
            { name: "👮 Editado por", value: `${interaction.user.tag}`, inline: true }
          ).setFooter({ text: `Data da alteração: ${dataAtual()}` });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`aceitar_${userId}_${dados.cargoEditado}_${dados.nickEditado}`).setLabel("Aceitar Alterações").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`recusar_${userId}_${dados.nickEditado}`).setLabel("Recusar Registro").setStyle(ButtonStyle.Danger)
        );

        await interaction.message.edit({ embeds: [embedAtu], components: [row] });
        return interaction.reply({ content: "✅ Alterações aplicadas no registro!", ephemeral: true });
    }

    // --- ACEITAR / PROMOVER (MENSAGEM GRANDE) ---
    if (interaction.isButton() && interaction.customId.startsWith("aceitar")) {
        await interaction.deferUpdate();
        const [, userId, cNum, nick] = interaction.customId.split("_");
        const target = await interaction.guild.members.fetch(userId).catch(() => null);

        if (target) {
            const ids = Object.values(cargos).filter(c => c.nivel <= cargos[cNum].nivel).map(c => c.id);
            await target.roles.add(ids);
            await target.setNickname(`${TAG_PREFIXO} ${nick}`).catch(() => {});

            const dm = new EmbedBuilder().setColor(0x2bff2b).setTitle("👑 REGISTRO APROVADO - HORIZONTE RP")
              .setDescription(`Prezado(a) **${nick}**,\n\nSua trajetória na **Horizonte Roleplay** começa agora! Seu registro foi minuciosamente analisado e **APROVADO** pela nossa diretoria.`)
              .addFields(
                  { name: "💼 Cargo", value: cargos[cNum].nome, inline: true },
                  { name: "👮 Autorizado por", value: interaction.user.tag, inline: true },
                  { name: "⏰ Horário", value: dataAtual(), inline: true }
              ).setFooter({ text: "Seja bem-vindo e bom trabalho!" });
            await target.send({ embeds: [dm] }).catch(() => {});
        }

        const resEmbed = new EmbedBuilder().setColor(0x2bff2b).setTitle("✅ REGISTRO CONCLUÍDO")
          .setDescription(`O membro <@${userId}> foi devidamente registrado no cargo **${cargos[cNum].nome}**.`);
        
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`editar_menu_${userId}_${cNum}_${nick}`).setLabel("Editar/Mudar Cargo").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`recusar_${userId}_${nick}`).setLabel("Recusar/Retirar").setStyle(ButtonStyle.Danger)
        );
        return interaction.editReply({ embeds: [resEmbed], components: [row] });
    }

    // --- REMOÇÃO / EXPULSÃO ---
    if (interaction.isButton() && interaction.customId.startsWith("remover")) {
        const userId = interaction.customId.split("_")[1];
        const target = await interaction.guild.members.fetch(userId).catch(() => null);
        
        const log = new EmbedBuilder().setColor(0xff0000).setTitle("🚨 REMOÇÃO ADMINISTRATIVA")
          .addFields(
            { name: "👤 Usuário", value: `<@${userId}>`, inline: true },
            { name: "👮 Responsável", value: interaction.user.tag, inline: true },
            { name: "📅 Data", value: dataAtual() }
          );

        if (target) {
            await target.send("🚨 Você foi desligado da Horizonte Roleplay.").catch(() => {});
            await target.kick("Remoção via Painel Administrativo");
        }
        return interaction.update({ embeds: [log], components: [] });
    }

  } catch (e) { console.error(e); }
});

client.login(TOKEN);
