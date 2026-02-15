const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// ===================== CONFIGURAÇÕES =====================
const TOKEN = process.env.TOKEN;
const APROVACAO_CANAL = "1472464723738886346";
const STAFF_CANAL_ID = "1472065290929180764";

const cargos = {
  "1": { nome: "Ajudante", id: "1472055381713883187" },
  "2": { nome: "Moderador(a)", id: "1472055978911465673" },
  "3": { nome: "Administrador(a)", id: "1472056709349511263" },
  "4": { nome: "Auxiliar", id: "1472057320799338639" },
  "5": { nome: "Coordenador(a)", id: "1472058121529593906" },
  "6": { nome: "Direção", id: "1472058401394655355" }
};

client.once("ready", () => {
    console.log("🚀 Sistema Horizonte RP Online e Restaurado!");
    // Registra os comandos localmente para evitar erros de ID global
    client.application.commands.set([
        { name: 'painel', description: 'Envia o painel de registro público.' }
    ]);
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- COMANDO /PAINEL (IGUAL À PRIMEIRA IMAGEM) ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription(
                    'Bem-vindo ao sistema de registro do servidor!\n\n' +
                    'Para que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n' +
                    '⚠️ **Usar cargo incorreto pode causar:**\n' +
                    '• Erros no registro\n' +
                    '• Problemas de permissão\n' +
                    '• Penalidades administrativas\n\n' +
                    '✅ Em caso de dúvida, procure um responsável do seu setor.'
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('iniciar_registro')
                    .setLabel('Registrar-se')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Painel enviado com sucesso!", ephemeral: true });
        }

        // --- ABRIR FORMULÁRIO (NICK E CARGO) ---
        if (interaction.isButton() && interaction.customId === "iniciar_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("m_nick")
                        .setLabel("NICK")
                        .setPlaceholder("Nome do seu personagem na cidade")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("m_cargo")
                        .setLabel("CARGO")
                        .setPlaceholder("Digite o número do seu cargo")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );
            return await interaction.showModal(modal);
        }

        // --- PROCESSAR ENVIO DO REGISTRO ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const numCargo = interaction.fields.getTextInputValue("m_cargo");
            const cargoInfo = cargos[numCargo];

            if (!cargoInfo) {
                return interaction.reply({ content: "❌ Número de cargo inválido (Use de 1 a 6).", ephemeral: true });
            }

            const embedStaff = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("📩 NOVO REGISTRO PARA AVALIAÇÃO")
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user} (${interaction.user.id})` },
                    { name: "🆔 Nick solicitado", value: `\`${nick}\`` },
                    { name: "💼 Cargo solicitado", value: `\`${cargoInfo.nome}\`` }
                )
                .setTimestamp();

            const rowStaff = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${numCargo}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel("Recusar").setStyle(ButtonStyle.Danger)
            );

            const canal = client.channels.cache.get(APROVACAO_CANAL);
            if (canal) await canal.send({ embeds: [embedStaff], components: [rowStaff] });

            return interaction.reply({ content: "✅ Seu registro foi enviado para a Staff!", ephemeral: true });
        }

    } catch (err) {
        console.error("Erro detectado:", err);
    }
});

client.login(TOKEN);
