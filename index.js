const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection, StringSelectMenuBuilder, REST, Routes 
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages
  ]
});

// ===================== CONFIGURAÇÕES (MANTENHA SEUS IDS) =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "SEU_ID_DO_BOT_AQUI"; // PEGUE O ID NO DISCORD DEVELOPER PORTAL
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

// ===================== REGISTRO DE COMANDOS =====================
client.once("ready", async () => {
    const commands = [
        { name: 'painel', description: 'Envia o painel de registro público.' },
        { name: 'configadm', description: 'Central administrativa para a Staff.' }
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log("✅ Comandos registrados e Bot Online!");
    } catch (e) { console.error("Erro ao registrar comandos:", e); }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- COMANDO /PAINEL ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            // "deferReply" impede o erro de "aplicativo não respondeu"
            await interaction.deferReply({ ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("📋 SISTEMA DE REGISTRO")
                .setDescription("Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**")
                .setFooter({ text: "Horizonte Roleplay" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("abrir_modal").setLabel("Registrar-se").setEmoji("📋").setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.editReply({ content: "Painel enviado com sucesso!" });
        }

        // --- COMANDO /CONFIGADM ---
        if (interaction.isChatInputCommand() && interaction.commandName === "configadm") {
            if (interaction.channelId !== STAFF_CANAL_ID) return interaction.reply({ content: "Use este comando no canal de Staff.", ephemeral: true });
            
            await interaction.deferReply({ ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTitle("🛠️ CONFIGURAÇÃO ADMINISTRATIVA")
                .setDescription("Gerencie as funções do servidor abaixo:");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("staff_msg").setLabel("Mensagem Automática").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("fechar_painel").setLabel("Fechar").setStyle(ButtonStyle.Danger)
            );

            return interaction.editReply({ embeds: [embed], components: [row] });
        }

        // --- BOTÃO ABRIR MODAL (REGISTRO) ---
        if (interaction.isButton() && interaction.customId === "abrir_modal") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem na cidade").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo (1-6)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        // --- FECHAR PAINEL ---
        if (interaction.isButton() && interaction.customId === "fechar_painel") {
            return interaction.update({ content: "Painel encerrado.", embeds: [], components: [] });
        }

        // [O restante da lógica de aceitar/recusar/editar continua aqui...]

    } catch (err) {
        console.error("Erro detectado:", err);
        // Tenta avisar o usuário se algo deu errado
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: "Ocorreu um erro ao processar sua solicitação." }).catch(() => {});
        } else {
            await interaction.reply({ content: "Ocorreu um erro interno.", ephemeral: true }).catch(() => {});
        }
    }
});

client.login(TOKEN);
