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

const db = new Collection(); // Memória temporária para edições
const dataH = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

// ===================== COMANDOS =====================
client.once("ready", async () => {
    const guild = client.guilds.cache.first();
    if (guild) await guild.commands.set([{ name: 'painel', description: 'Envia o painel de registro.' }]);
    console.log("✅ Bot Online - IDs de botões sincronizados.");
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. ENVIAR PAINEL (ID SINCRONIZADO: iniciar_registro) ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2).setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription('Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('iniciar_registro').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
            );
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Painel enviado!", ephemeral: true });
        }

        // --- 2. ABRIR FORMULÁRIO (ID SINCRONIZADO) ---
        if (interaction.isButton() && interaction.customId === "iniciar_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- 3. ENVIO DO FORMULÁRIO ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "Cargo inválido (Use 1 a 6).", ephemeral: true });

            const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields({ name: "👤 Usuário", value: `${interaction.user}` }, { name: "🆔 Nick", value: `\`${nick}\`` }, { name: "💼 Cargo", value: `\`${cargos[cId].nome}\`` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${cId}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`painel_edit_${interaction.user.id}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );
            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "✅ Registro enviado com sucesso!", ephemeral: true });
        }

        // --- 4. PAINEL DE EDIÇÃO (Mudar Cargo, Mudar Nick, Confirmar, Cancelar) ---
        if (interaction.isButton() && interaction.customId.startsWith("painel_edit")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            if (!db.has(uid)) db.set(uid, { cO: cId, cA: cId, nO: nick, nA: nick });
            const d = db.get(uid);

            const embedEdit = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO STAFF")
                .setDescription(`Membro: <@${uid}>\n\n**Dados Atuais:**\nNick: \`${d.nA}\`\nCargo: \`${cargos[d.cA].nome}\``);

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_c_${uid}`).setPlaceholder("Mudar Cargo...").addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`btn_edit_nick_${uid}`).setLabel("Mudar Nick").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`confirmar_final_${uid}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("fechar_painel").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
        }

        // --- 5. MUDAR NICK DENTRO DA EDIÇÃO ---
        if (interaction.isButton() && interaction.customId.startsWith("btn_edit_nick")) {
            const uid = interaction.customId.split("_")[3];
            const modal = new ModalBuilder().setCustomId(`save_nick_db_${uid}`).setTitle("Alterar Nick");
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("n").setLabel("NOVO NICK").setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("save_nick_db")) {
            const uid = interaction.customId.split("_")[3];
            db.get(uid).nA = interaction.fields.getTextInputValue("n");
            return interaction.reply({ content: "✅ Nick alterado na memória! Clique em **Confirmar** no painel de edição.", ephemeral: true });
        }

        // --- 6. SELECIONAR CARGO NA EDIÇÃO ---
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sel_c")) {
            const uid = interaction.customId.split("_")[2];
            db.get(uid).cA = interaction.values[0];
            return interaction.reply({ content: "✅ Cargo alterado na memória! Clique em **Confirmar** no painel de edição.", ephemeral: true });
        }

        // --- 7. CONFIRMAR FINAL (RELATÓRIO PROFISSIONAL) ---
        if (interaction.isButton() && (interaction.customId.startsWith("confirmar_final") || interaction.customId.startsWith("aceitar"))) {
            const uid = interaction.customId.split("_").pop();
            const d = db.get(uid) || { cA: interaction.customId.split("_")[2], nA: interaction.customId.split("_")[3], cO: interaction.customId.split("_")[2], nO: interaction.customId.split("_")[3] };

            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.set([cargos[d.cA].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${d.nA}`).catch(() => {});
            }

            const relatorio = new EmbedBuilder().setColor(0x00FF00).setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                .addFields(
                    { name: "👤 Membro", value: `<@${uid}>`, inline: true },
                    { name: "🆔 Nick Atualizado", value: `\`${d.nA}\``, inline: true },
                    { name: "💼 Cargo Assumido", value: `\`${cargos[d.cA].nome}\``, inline: true },
                    { name: "👮 Responsável", value: `${interaction.user.tag}`, inline: true },
                    { name: "⏰ Horário", value: `\`${dataH()}\`` }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`painel_edit_${uid}_${d.cA}_${d.nA}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [relatorio], components: [row] });
            membro?.send({ embeds: [relatorio] }).catch(() => {});
            return interaction.reply({ content: "✅ Registro Finalizado!", ephemeral: true });
        }

        if (interaction.isButton() && interaction.customId === "fechar_painel") return interaction.deleteReply();

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
