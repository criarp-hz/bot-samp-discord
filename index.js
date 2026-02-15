const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection 
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages
  ]
});

// ===================== CONFIGURAÇÕES =====================
const TOKEN = process.env.TOKEN;
const APROVACAO_CANAL = "1472464723738886346";
const STAFF_CANAL_ID = "1472065290929180764";
const TAG_PREFIXO = "『Ⓗ¹』";
const CARGO_AUTOMATICO = "1472054758415138960";

const cargos = {
  "1": { nome: "Ajudante", id: "1472055381713883187" },
  "2": { nome: "Moderador(a)", id: "1472055978911465673" },
  "3": { nome: "Administrador(a)", id: "1472056709349511263" },
  "4": { nome: "Auxiliar", id: "1472057320799338639" },
  "5": { nome: "Coordenador(a)", id: "1472058121529593906" },
  "6": { nome: "Direção", id: "1472058401394655355" }
};

function dataAtual() { return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }); }

client.once("ready", async () => {
    console.log("🚀 Sistema Horizonte RP Blindado Online.");
    const guild = client.guilds.cache.first();
    if (guild) {
        await guild.commands.set([
            { name: 'painel', description: 'Envia o painel de registro público.' }
        ]);
    }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- COMANDO /PAINEL (RESTAURADO IGUAL À FOTO) ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            // Responde o comando imediatamente para evitar o erro "não respondeu"
            await interaction.reply({ content: "Gerando painel...", ephemeral: true });

            const registroEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription(
                    'Bem-vindo ao sistema de registro do servidor!\n\n' +
                    'Para que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n' +
                    '⚠️ **Usar cargo incorrecto pode causar:**\n' +
                    '• Erros no registro\n' +
                    '• Problemas de permissão\n' +
                    '• Penalidades administrativas\n\n' +
                    '✅ Em caso de dúvida, procure um responsável do seu setor.'
                ); // Layout fiel à imagem

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('iniciar_registro')
                    .setLabel('Registrar-se')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [registroEmbed], components: [row] });
            return;
        }

        // --- FORMULÁRIO (NICK E CARGO RESTAURADOS) ---
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
                ), // Conforme solicitado
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("m_cargo")
                        .setLabel("CARGO")
                        .setPlaceholder("Digite o número do seu cargo")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ) // Conforme solicitado
            );
            return await interaction.showModal(modal);
        }

        // --- ENVIO DO MODAL ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            await interaction.deferReply({ ephemeral: true }); // Evita erro de tempo no envio

            const nick = interaction.fields.getTextInputValue("m_nick");
            const numCargo = interaction.fields.getTextInputValue("m_cargo");
            const cargoInfo = cargos[numCargo];

            if (!cargoInfo) {
                return interaction.editReply({ content: "❌ Número de cargo inválido! Use de 1 a 6." });
            }

            const embedStaff = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("📩 NOVO REGISTRO")
                .addFields(
                    { name: "👤 Membro", value: `${interaction.user}` },
                    { name: "🆔 Nick", value: `\`${nick}\`` },
                    { name: "💼 Cargo", value: `\`${cargoInfo.nome}\`` }
                );

            const canal = client.channels.cache.get(APROVACAO_CANAL);
            if (canal) {
                await canal.send({ embeds: [embedStaff] });
                return interaction.editReply({ content: "✅ Registro enviado com sucesso!" });
            }
        }

    } catch (error) {
        console.error("Erro:", error);
    }
});

client.login(TOKEN);
