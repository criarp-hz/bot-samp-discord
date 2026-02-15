const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection 
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

function dataAtual() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// ===================== EVENTOS =====================

client.once("ready", async () => {
  console.log(`✅ Horizonte RP - Sistema Profissional Ativo: ${client.user.tag}`);
  
  // Registro manual dos comandos Slash para garantir que apareçam
  const guild = client.guilds.cache.first(); 
  if (guild) {
    await guild.commands.set([
      { name: 'painel', description: 'Envia o painel de registro' },
      { name: 'painelstaff', description: 'Abre o menu administrativo' }
    ]);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    // --- COMANDOS SLASH ---
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("📋 SISTEMA DE REGISTRO")
          .setDescription("Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("abrir_modal").setLabel("Registrar-se").setEmoji("📋").setStyle(ButtonStyle.Primary)
        );
        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: "Painel enviado com sucesso.", ephemeral: true });
      }

      if (interaction.commandName === "painelstaff") {
        const staffEmbed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle("🛠️ CENTRAL ADMINISTRATIVA")
          .setDescription("Olá, administrador. Selecione uma função abaixo para gerenciar o sistema.");

        const rowStaff = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("staff_msg").setLabel("Mensagem Automática").setStyle(ButtonStyle.Secondary).setEmoji("⏰"),
          new ButtonBuilder().setCustomId("staff_config").setLabel("Ajustar Sistema").setStyle(ButtonStyle.Danger).setEmoji("⚙️")
        );
        return interaction.reply({ embeds: [staffEmbed], components: [rowStaff], ephemeral: true });
      }
    }

    // --- FORMULÁRIO (MODAL) ---
    if (interaction.isButton() && interaction.customId === "abrir_modal") {
      const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
      
      const nickInput = new TextInputBuilder()
        .setCustomId("n_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem na cidade").setStyle(TextInputStyle.Short).setRequired(true);
      
      const cargoInput = new TextInputBuilder()
        .setCustomId("n_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo (1 a 6)").setStyle(TextInputStyle.Short).setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nickInput), new ActionRowBuilder().addComponents(cargoInput));
      return interaction.showModal(modal);
    }

    // --- RECEBIMENTO DO REGISTRO ---
    if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
      const nick = interaction.fields.getTextInputValue("n_nick");
      const cargoNum = interaction.fields.getTextInputValue("n_cargo");
      const info = cargos[cargoNum];

      if (!info) return interaction.reply({ content: "❌ Cargo Inválido. Use números de 1 a 6.", ephemeral: true });

      const embedAdm = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle("📥 NOVO REGISTRO RECEBIDO")
        .addFields(
          { name: "👤 Usuário", value: `${interaction.user}`, inline: true },
          { name: "🆔 Nick do Personagem", value: nick, inline: true },
          { name: "💼 Cargo Solicitado", value: info.nome, inline: true },
          { name: "⏰ Horário do Envio", value: dataAtual() }
        );

      const rowAdm = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cargoNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`editar_${interaction.user.id}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
      );

      const canal = client.channels.cache.get(APROVACAO_CANAL);
      await canal.send({ embeds: [embedAdm], components: [rowAdm] });
      return interaction.reply({ content: "✅ Seu registro foi enviado para análise.", ephemeral: true });
    }

    // --- LÓGICA DE DECISÃO ---
    if (interaction.isButton()) {
      const [acao, userId, cNum, nick] = interaction.customId.split("_");
      const target = await interaction.guild.members.fetch(userId).catch(() => null);

      if (acao === "aceitar") {
        await interaction.deferUpdate(); // Evita o erro de "falha na interação"
        
        const nivelAlvo = cargos[cNum].nivel;
        let cargosAdicionar = [];
        for (let k in cargos) { if (cargos[k].nivel <= nivelAlvo) cargosAdicionar.push(cargos[k].id); }
        
        if (target) {
          await target.roles.add(cargosAdicionar);
          await target.roles.remove(CARGO_AUTOMATICO).catch(() => {});
          await target.setNickname(`${TAG_PREFIXO} ${nick}`).catch(() => {});

          const embedDm = new EmbedBuilder()
            .setColor(0x2BFF2B)
            .setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
            .setDescription(`Prezado(a) **${nick}**,\n\nInformamos que seu registro foi **analisado e aprovado** pela nossa equipe administrativa. Você agora faz parte oficialmente do nosso corpo de membros.`)
            .addFields(
              { name: "💼 Cargo Assumido", value: cargos[cNum].nome, inline: true },
              { name: "👮 Responsável", value: interaction.user.tag, inline: true },
              { name: "⏰ Data de Aprovação", value: dataAtual(), inline: false }
            )
            .setFooter({ text: "Administração Horizonte Roleplay" });

          await target.send({ embeds: [embedDm] }).catch(() => {});
        }

        const embedFinal = EmbedBuilder.from(interaction.message.embeds[0]).setTitle("✅ REGISTRO FINALIZADO E ACEITO").setColor(0x2BFF2B);
        return interaction.editReply({ embeds: [embedFinal], components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`remover_${userId}`).setLabel("Remoção Administrativa").setStyle(ButtonStyle.Danger)
          )
        ]});
      }

      if (acao === "recusar") {
        await interaction.deferUpdate();
        const tent = (tentativas.get(userId) || 0) + 1;
        tentativas.set(userId, tent);

        if (target) {
          const embedRec = new EmbedBuilder()
            .setColor(0xFF2B2B)
            .setTitle("❌ REGISTRO RECUSADO - HORIZONTE RP")
            .setDescription(`Olá **${nick}**,\n\nSeu registro foi analisado pela nossa equipe e **não foi aceito** no momento. Por favor, revise as informações enviadas.`)
            .addFields(
                { name: "Tentativa", value: `${tent}/3`, inline: true },
                { name: "Data", value: dataAtual(), inline: true }
            );
          
          if (tent >= 3) {
            await target.send("❌ Você atingiu o limite de 3 erros e foi removido do servidor.").catch(() => {});
            await target.kick("Limite de registros excedido.");
          } else {
            await target.send({ embeds: [embedRec] }).catch(() => {});
          }
        }
        return interaction.editReply({ content: `Registro recusado (${tent}/3) por ${interaction.user.tag}`, components: [] });
      }

      if (acao === "remover") {
        await interaction.deferUpdate();
        if (target) {
           await target.send(`🚨 **REMOÇÃO:** Você foi removido da equipe Horizonte RP por ${interaction.user.tag}. Data: ${dataAtual()}`).catch(() => {});
           await target.kick("Remoção por botão administrativo.");
        }
        return interaction.editReply({ content: `🚨 Jogador removido por ${interaction.user.tag}`, components: [] });
      }
    }

  } catch (err) { console.log("Erro Silencioso evitado para o bot não cair."); }
});

client.login(TOKEN);
