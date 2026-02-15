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
const TAG_PREFIXO = "『Ⓗ¹』";
const CARGO_AUTOMATICO = "1472054758415138960";

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

client.once("ready", async () => {
    console.log("🚀 Sistema Horizonte RP Blindado Online.");
    // Comando simples sem registro REST externo para evitar erros de ID
    const guild = client.guilds.cache.first();
    if (guild) await guild.commands.set([
        { name: 'painel', description: 'Envia o painel de registro público.' },
        { name: 'configadm', description: 'Central administrativa.' }
    ]);
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. SELEÇÃO DE CARGO (CORREÇÃO DE FALHA) ---
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sel_c")) {
            const userId = interaction.customId.split("_")[2];
            let dados = memoriaEdicao.get(userId);
            if (!dados) return interaction.reply({ content: "Dados expirados.", ephemeral: true });

            dados.cargoEditado = interaction.values[0];
            memoriaEdicao.set(userId, dados);

            const embedEdit = EmbedBuilder.from(interaction.message.embeds[0])
                .setFields(
                    { name: "👤 Membro", value: `<@${userId}>`, inline: true },
                    { name: "🆔 Nick Atual", value: `\`${dados.nickEditado}\``, inline: true },
                    { name: "💼 Novo Cargo Selecionado", value: `\`${cargos[dados.cargoEditado].nome}\``, inline: true }
                );

            // "update" previne o erro de falha na interação
            return await interaction.update({ embeds: [embedEdit] });
        }

        // --- 2. SEU FORMULÁRIO ORIGINAL (RESTAURADO) ---
        if (interaction.isButton() && interaction.customId === "abrir_modal") {
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

        // --- 3. BOTÃO EDITAR NICK (MODAL) ---
        if (interaction.isButton() && interaction.customId.startsWith("edit_nick")) {
            const userId = interaction.customId.split("_")[2];
            const modal = new ModalBuilder().setCustomId(`modal_n_${userId}`).setTitle("Alterar Nick");
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId("n").setLabel("NOVO NICK").setStyle(TextInputStyle.Short).setRequired(true)
            ));
            return await interaction.showModal(modal);
        }

        // --- 4. RECEBER NOVO NICK (CORREÇÃO DE FALHA) ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_n")) {
            const userId = interaction.customId.split("_")[2];
            const dados = memoriaEdicao.get(userId);
            if (!dados) return interaction.reply({ content: "Erro de memória.", ephemeral: true });

            dados.nickEditado = interaction.fields.getTextInputValue("n");
            memoriaEdicao.set(userId, dados);

            const embedEdit = new EmbedBuilder()
                .setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO")
                .setFields(
                    { name: "👤 Membro", value: `<@${userId}>`, inline: true },
                    { name: "🆔 Novo Nick Selecionado", value: `\`${dados.nickEditado}\``, inline: true },
                    { name: "💼 Cargo Selecionado", value: `\`${cargos[dados.cargoEditado].nome}\``, inline: true }
                );

            return await interaction.update({ embeds: [embedEdit] });
        }

        // --- 5. CONFIRMAR / CANCELAR (LÓGICA SILENCIOSA) ---
        if (interaction.isButton() && interaction.customId.startsWith("confirm_edit")) {
            const userId = interaction.customId.split("_")[2];
            const d = memoriaEdicao.get(userId);
            
            const embedFinal = new EmbedBuilder()
                .setColor(0x00AAFF).setTitle("📝 REGISTRO ATUALIZADO")
                .addFields(
                    { name: "👤 Usuário", value: `<@${userId}>`, inline: false },
                    { name: "📝 Nick", value: `\`${d.nickOriginal}\` ➔ \`${d.nickEditado}\``, inline: false },
                    { name: "💼 Cargo", value: `\`${cargos[d.cargoOriginal].nome}\` ➔ \`${cargos[d.cargoEditado].nome}\``, inline: false }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${userId}_${d.cargoEditado}_${d.nickEditado}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${userId}_${d.nickEditado}`).setLabel("Recusar").setStyle(ButtonStyle.Danger)
            );

            await interaction.message.delete().catch(() => {});
            return await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embedFinal], components: [row] });
        }

        if (interaction.isButton() && interaction.customId === "cancelar_edit") {
            return await interaction.message.delete().catch(() => {});
        }

    } catch (error) {
        console.error("Erro:", error);
    }
});

client.login(TOKEN);
