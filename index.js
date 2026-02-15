const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection, StringSelectMenuBuilder, REST, Routes 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// ===================== CONFIGURAÇÕES =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "123456789012345678"; // <--- COLOQUE O ID DO SEU BOT AQUI (SÓ NÚMEROS)
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
    console.log(`🚀 Sistema Horizonte RP Blindado Online.`);
    
    const commands = [
        { name: 'painel', description: 'Envia o painel de registro público.' },
        { name: 'configadm', description: 'Central administrativa.' }
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        // Registro forçado para evitar o "Aplicativo não respondeu"
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    } catch (e) { console.error("Erro no registro:", e); }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- COMANDO /PAINEL ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("📋 SISTEMA DE REGISTRO")
                .setDescription("Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("abrir_modal").setLabel("Registrar-se").setStyle(ButtonStyle.Primary)
            );
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Painel enviado!", ephemeral: true });
        }

        // --- COMANDO /CONFIGADM ---
        if (interaction.isChatInputCommand() && interaction.commandName === "configadm") {
            if (interaction.channelId !== STAFF_CANAL_ID) return interaction.reply({ content: "Canal errado.", ephemeral: true });
            
            const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle("🛠️ CENTRAL STAFF").setDescription("Escolha uma opção:");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("staff_msg_auto").setLabel("Mensagem Automática").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("fechar_p").setLabel("Fechar").setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // --- SEU FORMULÁRIO ORIGINAL (NICK E CARGO) ---
        if (interaction.isButton() && interaction.customId === "abrir_modal") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO (Número)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        // --- EDIÇÃO SILENCIOSA (SEM MENSAGEM DE FALHA) ---
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sel_c")) {
            const userId = interaction.customId.split("_")[2];
            const dados = memoriaEdicao.get(userId);
            if (dados) {
                dados.cargoEditado = interaction.values[0];
                memoriaEdicao.set(userId, dados);
            }
            return interaction.deferUpdate(); // Silencioso, não falha
        }

        if (interaction.isButton() && interaction.customId.startsWith("edit_nick")) {
            const userId = interaction.customId.split("_")[2];
            const modal = new ModalBuilder().setCustomId(`modal_n_${userId}`).setTitle("Alterar Nick");
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId("n").setLabel("NOVO NICK").setStyle(TextInputStyle.Short).setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_n")) {
            const userId = interaction.customId.split("_")[2];
            const dados = memoriaEdicao.get(userId);
            if (dados) {
                dados.nickEditado = interaction.fields.getTextInputValue("n");
                memoriaEdicao.set(userId, dados);
            }
            return interaction.reply({ content: "Nick atualizado na memória!", ephemeral: true });
        }

        // --- BOTÃO CONFIRMAR EDIÇÃO (GERA A MENSAGEM DE APROVADO/EDITADO) ---
        if (interaction.isButton() && interaction.customId.startsWith("confirm_edit")) {
            const userId = interaction.customId.split("_")[2];
            const d = memoriaEdicao.get(userId);
            
            const embedFinal = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("✅ REGISTRO APROVADO E EDITADO")
                .addFields(
                    { name: "Membro", value: `<@${userId}>`, inline: true },
                    { name: "Nick Final", value: `\`${d.nickEditado}\``, inline: true },
                    { name: "Cargo Final", value: `\`${cargos[d.cargoEditado].nome}\``, inline: true },
                    { name: "Editado por", value: `${interaction.user.tag}`, inline: false }
                ).setFooter({ text: `Data: ${dataAtual()}` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${userId}_${d.cargoEditado}_${d.nickEditado}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${userId}_${d.nickEditado}`).setLabel("Recusar").setStyle(ButtonStyle.Danger)
            );

            await interaction.message.delete().catch(() => {});
            return interaction.channel.send({ embeds: [embedFinal], components: [row] });
        }

        // --- BOTÃO FECHAR / CANCELAR ---
        if (interaction.isButton() && (interaction.customId === "fechar_p" || interaction.customId === "cancelar_edit")) {
            return interaction.message.delete().catch(() => {});
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
