const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection, StringSelectMenuBuilder, REST, Routes 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// ===================== CONFIGURAÇÕES (SUBSTITUA OS CAMPOS) =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "SEU_ID_NUMERICO_AQUI"; // ⚠️ IMPORTANTE: COLOQUE O ID DO BOT AQUI
const APROVACAO_CANAL = "1472464723738886346";
const STAFF_CANAL_ID = "1472065290929180764";
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

// ===================== REGISTRO DE COMANDOS =====================
client.once("ready", async (clientReady) => {
    console.log(`🚀 ${clientReady.user.tag} está online e estável!`);

    const commands = [
        { name: 'painel', description: 'Envia o painel de registro público.' },
        { name: 'configadm', description: 'Central administrativa da Staff.' }
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        // Isso registra os comandos globais para evitar que o bot não responda
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log("✅ Comandos Slash registrados.");
    } catch (e) { console.error("❌ Erro ao registrar comandos:", e); }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- LÓGICA DO COMANDO /PAINEL ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            // Respondemos imediatamente para o Discord não dar erro de "não respondeu"
            await interaction.reply({ content: "Enviando painel...", ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("📋 SISTEMA DE REGISTRO")
                .setDescription("Bem-vindo ao sistema de registro do servidor!\n\nUtilize o botão abaixo para iniciar seu formulário.");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("abrir_modal").setLabel("Registrar-se").setEmoji("📋").setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return;
        }

        // --- LÓGICA DO COMANDO /CONFIGADM ---
        if (interaction.isChatInputCommand() && interaction.commandName === "configadm") {
            if (interaction.channelId !== STAFF_CANAL_ID) return interaction.reply({ content: "❌ Este comando é restrito ao canal de Staff.", ephemeral: true });
            
            const embed = new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTitle("🛠️ CENTRAL STAFF - HORIZONTE RP")
                .setDescription("Gerenciamento de comunicados e configurações.");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("staff_msg_auto").setLabel("Mensagem Automática").setStyle(ButtonStyle.Primary).setEmoji("⏰"),
                new ButtonBuilder().setCustomId("fechar_painel").setLabel("Fechar").setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // --- MODAL DE MENSAGEM AUTOMÁTICA ---
        if (interaction.isButton() && interaction.customId === "staff_msg_auto") {
            const modal = new ModalBuilder().setCustomId("modal_global_msg").setTitle("Configurar Comunicado");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t").setLabel("TÍTULO DO AVISO").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("d").setLabel("DESCRIÇÃO/MENSAGEM").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("c").setLabel("ID DO CANAL DE DESTINO").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === "modal_global_msg") {
            const t = interaction.fields.getTextInputValue("t");
            const d = interaction.fields.getTextInputValue("d");
            const cId = interaction.fields.getTextInputValue("c");
            const canalDestino = client.channels.cache.get(cId);

            if (!canalDestino) return interaction.reply({ content: "❌ Canal não encontrado. Verifique se o ID está correto.", ephemeral: true });

            const embedAviso = new EmbedBuilder().setColor(0x00FF7F).setTitle(t).setDescription(d)
                .setFooter({ text: `Publicado por: ${interaction.user.tag} | ${dataAtual()}` });

            await canalDestino.send({ embeds: [embedAviso] });
            return interaction.reply({ content: "✅ Comunicado enviado com sucesso!", ephemeral: true });
        }

        // --- BOTÃO FECHAR PAINEL ---
        if (interaction.isButton() && interaction.customId === "fechar_painel") {
            return interaction.update({ content: "Painel fechado.", embeds: [], components: [] });
        }

    } catch (error) {
        console.error("Erro interno:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "Ocorreu um erro no processamento.", ephemeral: true }).catch(() => {});
        }
    }
});

client.login(TOKEN);
