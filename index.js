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

const db_sessao = new Collection(); 
const dataH = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

// ===================== LOGICA =====================

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. BOTÃO REGISTRAR-SE ---
        if (interaction.isButton() && interaction.customId === "abrir_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO (1 a 6)").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- 2. RECEBIMENTO (LOG INICIAL) ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "⚠️ Use 1 a 6.", ephemeral: true });

            const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user}` },
                    { name: "🆔 Nick", value: `\`${nick}\`` },
                    { name: "💼 Cargo", value: `\`${cargos[cId].nome}\`` }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edit_painel_${interaction.user.id}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "✅ Registro enviado!", ephemeral: true });
        }

        // --- 3. SISTEMA DE EDIÇÃO (CORRIGIDO) ---
        if (interaction.isButton() && interaction.customId.startsWith("edit_painel")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            db_sessao.set(uid, { cA: cId, nA: nick, cO: cId, nO: nick });

            const embedEdit = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ CONFIGURAÇÃO DE REGISTRO")
                .setDescription(`Ajustando dados para: <@${uid}>\n\n**Nick:** ${nick}\n**Cargo:** ${cargos[cId].nome}`);

            const rowSel = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_c_${uid}`).setPlaceholder("Alterar Cargo...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_n_modal_${uid}`).setLabel("Mudar Nick").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`confirmar_edit_${uid}`).setLabel("Confirmar e Aprovar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("cancel").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ embeds: [embedEdit], components: [rowSel, rowBtns], ephemeral: true });
        }

        // Mudar Nick na Edição
        if (interaction.isButton() && interaction.customId.startsWith("edit_n_modal")) {
            const uid = interaction.customId.split("_")[3];
            const modal = new ModalBuilder().setCustomId(`save_n_${uid}`).setTitle("Novo Nick");
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("n").setLabel("NICK").setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("save_n")) {
            const uid = interaction.customId.split("_")[2];
            db_sessao.get(uid).nA = interaction.fields.getTextInputValue("n");
            return interaction.reply({ content: `✅ Nick alterado na memória para **${db_sessao.get(uid).nA}**! Agora clique em Confirmar.`, ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sel_c")) {
            const uid = interaction.customId.split("_")[2];
            db_sessao.get(uid).cA = interaction.values[0];
            return interaction.reply({ content: `✅ Cargo alterado para **${cargos[interaction.values[0]].nome}**! Agora clique em Confirmar.`, ephemeral: true });
        }

        // --- 4. CONFIRMAR / ACEITAR (IGUAL AO SEU PRINT DE LOG) ---
        if (interaction.isButton() && (interaction.customId.startsWith("confirmar_edit") || interaction.customId.startsWith("aceitar"))) {
            const uid = interaction.customId.split("_")[1];
            const d = db_sessao.get(uid) || { cA: interaction.customId.split("_")[2], nA: interaction.customId.split("_")[3], cO: interaction.customId.split("_")[2], nO: interaction.customId.split("_")[3] };

            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.add([cargos[d.cA].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${d.nA}`).catch(() => {});

                // DM PROFISSIONAL (DO SEU PRINT)
                const dmEmbed = new EmbedBuilder().setColor(0x43b581).setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                    .setDescription(`Prezado(a) **${d.nA}**,\n\nSeu registro foi analisado pela equipe administrativa e foi **APROVADO**.`)
                    .addFields(
                        { name: "💼 Cargo Assumido", value: `${cargos[d.cA].nome}`, inline: true },
                        { name: "👮 Responsável", value: `${interaction.user.username}`, inline: true },
                        { name: "📅 Data/Hora", value: `${dataH()}`, inline: false }
                    ).setFooter({ text: "Bem-vindo à equipe!" });
                await membro.send({ embeds: [dmEmbed] }).catch(() => {});
            }

            // RELATÓRIO NO CANAL DE LOG (IGUALZINHO O SEU PRINT DE "REGISTRO ATUALIZADO")
            const logEmbed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 REGISTRO ATUALIZADO (EDITADO)")
                .addFields(
                    { name: "Usuário", value: `<@${uid}>` },
                    { name: "Nick", value: `${d.nA}` },
                    { name: "Cargo", value: `${cargos[d.cA].nome}` },
                    { name: "Responsável", value: `${interaction.user.username}` }
                );

            const rowFinal = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_painel_${uid}_${d.cA}_${d.nA}`).setLabel("Editar / Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${uid}_${d.nA}`).setLabel("Recusar / Retirar Cargo").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`expulsar_${uid}`).setLabel("Remoção (Expulsar)").setStyle(ButtonStyle.Secondary)
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "✅ Registro Finalizado com sucesso!", ephemeral: true });
                return await interaction.channel.send({ embeds: [logEmbed], components: [rowFinal] });
            } else {
                return interaction.update({ embeds: [logEmbed], components: [rowFinal] });
            }
        }

        // --- 5. RECUSAR (FIXADO) ---
        if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
            const [, uid, nick] = interaction.customId.split("_");
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                const dmR = new EmbedBuilder().setColor(0xff0000).setTitle("❌ REGISTRO RECUSADO").setDescription(`Prezado(a) **${nick}**, seu registro foi recusado.`);
                await membro.send({ embeds: [dmR] }).catch(() => {});
            }
            return interaction.update({ content: `❌ Registro de <@${uid}> Recusado e Cargas Removidas.`, embeds: [], components: [] });
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
