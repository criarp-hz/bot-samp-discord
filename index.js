require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
} = require("discord.js");

/* ================== CONFIG ================== */
/* USE OS MESMOS IDS QUE VOCÊ JÁ TINHA */

const CANAL_REGISTRO = "ID_CANAL_REGISTRO";

const cargos = {
  1: "ID_CARGO_1",
  2: "ID_CARGO_2",
  3: "ID_CARGO_3",
  4: "ID_CARGO_4",
  5: "ID_CARGO_5"
};

/* ============================================ */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* ================= READY ================= */

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

/* ================= INTERAÇÕES ================= */

client.on(Events.InteractionCreate, async interaction => {

  try {

    /* ===== COMANDO ===== */
    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "painel") {

        const embed = new EmbedBuilder()
          .setTitle("📋 Sistema de Registro")
          .setDescription(
`📝 Clique no botão abaixo para iniciar seu registro.

📌 Como usar:
Preencha todas as informações corretamente.

❓ Caso tenha dúvidas procure o responsável do setor.`
          )
          .setColor("#2b2d31");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("abrir_registro")
            .setLabel("Iniciar Registro")
            .setEmoji("📝")
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
          embeds: [embed],
          components: [row]
        });
      }
    }

    /* ===== BOTÃO ABRIR ===== */
    if (interaction.isButton() && interaction.customId === "abrir_registro") {

      const modal = new ModalBuilder()
        .setCustomId("modal_registro")
        .setTitle("Formulário de Registro");

      const nome = new TextInputBuilder()
        .setCustomId("nome")
        .setLabel("Seu nome")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const id = new TextInputBuilder()
        .setCustomId("id")
        .setLabel("Seu ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nome),
        new ActionRowBuilder().addComponents(id)
      );

      await interaction.showModal(modal);
    }

    /* ===== ENVIO REGISTRO ===== */
    if (interaction.isModalSubmit() && interaction.customId === "modal_registro") {

      const nome = interaction.fields.getTextInputValue("nome");
      const id = interaction.fields.getTextInputValue("id");

      const canal = interaction.guild.channels.cache.get(CANAL_REGISTRO);

      const embed = new EmbedBuilder()
        .setTitle("📨 Novo Registro")
        .addFields(
          { name: "Usuário", value: `${interaction.user}` },
          { name: "Nome", value: nome },
          { name: "ID", value: id }
        )
        .setColor("Yellow");

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

      await canal.send({
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: "✅ Registro enviado com sucesso.",
        ephemeral: true
      });
    }

    /* ===== ACEITAR ===== */
    if (interaction.isButton() && interaction.customId.startsWith("aceitar_")) {

      const userId = interaction.customId.split("_")[1];
      const member = await interaction.guild.members.fetch(userId);

      await member.roles.add(cargos[1]);

      await interaction.reply({
        content: `✅ Registro aprovado para ${member.user.tag}`
      });
    }

    /* ===== RECUSAR ===== */
    if (interaction.isButton() && interaction.customId.startsWith("recusar_")) {

      const userId = interaction.customId.split("_")[1];
      const member = await interaction.guild.members.fetch(userId);

      await interaction.reply({
        content: `❌ Registro recusado para ${member.user.tag}`
      });
    }

    /* ===== EDITAR ===== */
    if (interaction.isButton() && interaction.customId.startsWith("editar_")) {

      const userId = interaction.customId.split("_")[1];

      const modal = new ModalBuilder()
        .setCustomId(`modal_edit_${userId}`)
        .setTitle("Editar Cargo");

      const cargo = new TextInputBuilder()
        .setCustomId("cargo")
        .setLabel("Número do Cargo (1-5)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(cargo)
      );

      await interaction.showModal(modal);
    }

    /* ===== MODAL EDITAR ===== */
    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_edit_")) {

      const userId = interaction.customId.split("_")[2];
      const novoCargo = parseInt(interaction.fields.getTextInputValue("cargo"));

      const member = await interaction.guild.members.fetch(userId);

      if (!cargos[novoCargo]) {
        return interaction.reply({
          content: "❌ Cargo inválido.",
          ephemeral: true
        });
      }

      /* descobrir cargo antigo */
      let cargoAntigo = 0;

      for (let i = 5; i >= 1; i--) {
        if (member.roles.cache.has(cargos[i])) {
          cargoAntigo = i;
          break;
        }
      }

      /* remover todos */
      for (let c of Object.values(cargos)) {
        if (member.roles.cache.has(c)) {
          await member.roles.remove(c);
        }
      }

      /* adicionar cascata */
      for (let i = 1; i <= novoCargo; i++) {
        await member.roles.add(cargos[i]);
      }

      /* PROMOÇÃO / REBAIXAMENTO */
      let tipo = "Atualização";

      if (novoCargo > cargoAntigo) tipo = "Promoção";
      if (novoCargo < cargoAntigo) tipo = "Rebaixamento";

      const embed = new EmbedBuilder()
        .setTitle("📢 Atualização Administrativa")
        .setDescription(
`O colaborador ${member} teve alteração em seu nível hierárquico.

Tipo: ${tipo}
Cargo anterior: ${cargoAntigo || "Nenhum"}
Novo cargo: ${novoCargo}

Caso tenha dúvidas procure a administração.`
        )
        .setColor("Blue");

      await interaction.reply({
        embeds: [embed]
      });
    }

  } catch (err) {

    console.log("❌ ERRO:", err);

    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ Ocorreu um erro interno.",
        ephemeral: true
      });
    }
  }

});

/* ================= LOGIN ================= */

client.login(process.env.TOKEN);
