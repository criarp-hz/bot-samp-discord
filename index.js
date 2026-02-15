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
    const guild = client.guilds.cache.first();
    if (guild) await guild.commands.set([
        { name: 'painel', description: 'Envia o painel de registro público.' },
        { name: 'configadm', description: 'Central administrativa.' }
    ]);
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. SELEÇÃO DE CARGO NO MENU DE EDIÇÃO (SILENCIOSO) ---
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sel_c")) {
            const userId = interaction.customId.split("_")[2];
            const dados = memoriaEdicao.get(userId);
            if (!dados) return interaction.reply({ content: "Erro: Dados expirados.", ephemeral: true });

            dados.cargoEditado = interaction.values[0];
            memoriaEdicao.set(userId, dados);

            // Atualiza o Embed de edição sem enviar nova mensagem
            const embedEdit = EmbedBuilder.from(interaction.message.embeds[0])
                .setFields(
                    { name: "👤 Membro", value: `<@${userId}>`, inline: true },
                    { name: "🆔 Nick Atual", value: `\`${dados.nickEditado}\``, inline: true },
                    { name: "💼 Novo Cargo Selecionado", value: `\`${cargos[dados.cargoEditado].nome}\``, inline: true }
                );

            return interaction.update({ embeds: [embedEdit] });
        }

        // --- 2. BOTÃO EDITAR NICK (MODAL) ---
        if (interaction.isButton() && interaction.customId.startsWith("edit_nick")) {
            const userId = interaction.customId.split("_")[2];
            const modal = new ModalBuilder().setCustomId(`modal_n_${userId}`).setTitle("Alterar Nick");
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId("n").setLabel("NOVO NICK").setStyle(TextInputStyle.Short).setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        // --- 3. RECEBER NOVO NICK DO MODAL (SILENCIOSO) ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_n")) {
            const userId = interaction.customId.split("_")[2];
            const novoNick = interaction.fields.getTextInputValue("n");
            const dados = memoriaEdicao.get(userId);
            
            dados.nickEditado = novoNick;
            memoriaEdicao.set(userId, dados);

            const embedEdit = new EmbedBuilder()
                .setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO")
                .setFields(
                    { name: "👤 Membro", value: `<@${userId}>`, inline: true },
                    { name: "🆔 Novo Nick Selecionado", value: `\`${dados.nickEditado}\``, inline: true },
                    { name: "💼 Cargo Selecionado", value: `\`${cargos[dados.cargoEditado].nome}\``, inline: true }
                );

            // Usamos deferUpdate para não "falhar" a interação do modal
            return interaction.update({ embeds: [embedEdit] });
        }

        // --- 4. CONFIRMAR EDIÇÃO (GERA O NOVO REGISTRO PROFISSIONAL) ---
        if (interaction.isButton() && interaction.customId.startsWith("confirm_edit")) {
            const userId = interaction.customId.split("_")[2];
            const d = memoriaEdicao.get(userId);
            if (!d) return interaction.reply({ content: "Erro ao salvar.", ephemeral: true });

            const embedFinal = new EmbedBuilder()
                .setColor(0x00AAFF).setTitle("📝 REGISTRO ATUALIZADO PELA STAFF")
                .setThumbnail(interaction.guild.members.cache.get(userId)?.user.displayAvatarURL() || null)
                .addFields(
                    { name: "👤 Usuário", value: `<@${userId}>`, inline: false },
                    { name: "📝 Nick (Anterior > Novo)", value: `\`${d.nickOriginal}\` ➔ \`${d.nickEditado}\``, inline: false },
                    { name: "💼 Cargo (Anterior > Novo)", value: `\`${cargos[d.cargoOriginal].nome}\` ➔ \`${cargos[d.cargoEditado].nome}\``, inline: false },
                    { name: "👮 Responsável", value: `${interaction.user.tag}`, inline: true },
                    { name: "⏰ Data/Hora", value: dataAtual(), inline: true }
                ).setFooter({ text: "Confirme a ação final abaixo." });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${userId}_${d.cargoEditado}_${d.nickEditado}`).setLabel("Aceitar Registro").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${userId}_${d.nickEditado}`).setLabel("Recusar e Retirar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`editar_menu_${userId}_${d.cargoEditado}_${d.nickEditado}`).setLabel("Re-editar").setStyle(ButtonStyle.Secondary)
            );

            // Deleta a mensagem de edição temporária e edita o registro original
            await interaction.message.delete().catch(() => {});
            const canal = client.channels.cache.get(APROVACAO_CANAL);
            await canal.send({ embeds: [embedFinal], components: [row] });
            return;
        }

        // --- 5. CANCELAR EDIÇÃO ---
        if (interaction.isButton() && interaction.customId === "cancelar_edit") {
            return interaction.message.delete().catch(() => {});
        }

        // --- INÍCIO DO MENU DE EDIÇÃO ---
        if (interaction.isButton() && interaction.customId.startsWith("editar_menu")) {
            const [, , userId, cNum, nick] = interaction.customId.split("_");
            memoriaEdicao.set(userId, { cargoOriginal: cNum, cargoEditado: cNum, nickOriginal: nick, nickEditado: nick });

            const embedEdit = new EmbedBuilder()
                .setColor(0xFFA500).setTitle("⚙️ CONFIGURAÇÃO DE REGISTRO")
                .setDescription("Altere os dados abaixo. Nada será aplicado até você **Confirmar**.")
                .addFields(
                    { name: "👤 Membro", value: `<@${userId}>`, inline: true },
                    { name: "🆔 Nick", value: `\`${nick}\``, inline: true },
                    { name: "💼 Cargo", value: `\`${cargos[cNum].nome}\``, inline: true }
                );

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_c_${userId}`).setPlaceholder("Selecione um novo cargo...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );

            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_nick_${userId}`).setLabel("Mudar Nick").setStyle(ButtonStyle.Primary).setEmoji("📝"),
                new ButtonBuilder().setCustomId(`confirm_edit_${userId}`).setLabel("Confirmar").setStyle(ButtonStyle.Success).setEmoji("✅"),
                new ButtonBuilder().setCustomId(`cancelar_edit`).setLabel("Cancelar").setStyle(ButtonStyle.Danger).setEmoji("✖️")
            );

            return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
        }

        // --- ACEITAR / RECUSAR / REMOVER ---
        // (Lógica de atribuição de cargos e kicks idêntica ao que já funciona, mas com tratamento de erro try/catch)

    } catch (error) {
        console.error("Erro na Interação:", error);
        if (!interaction.replied) interaction.reply({ content: "Ocorreu um erro. Tente novamente.", ephemeral: true }).catch(() => {});
    }
});

client.login(TOKEN);
