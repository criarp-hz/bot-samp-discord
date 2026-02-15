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
  "1": { nome: "Ajudante", id: "1472055381713883187", nivel: 1 },
  "2": { nome: "Moderador(a)", id: "1472055978911465673", nivel: 2 },
  "3": { nome: "Administrador(a)", id: "1472056709349511263", nivel: 3 },
  "4": { nome: "Auxiliar", id: "1472057320799338639", nivel: 4 },
  "5": { nome: "Coordenador(a)", id: "1472058121529593906", nivel: 5 },
  "6": { nome: "Direção", id: "1472058401394655355", nivel: 6 }
};

const db = new Collection(); // Memória temporária para edições

const getData = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

// ===================== LÓGICA DE INTERAÇÃO =====================

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. ABRIR FORMULÁRIO ---
        if (interaction.isButton() && interaction.customId === "iniciar_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem na cidade").setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short))
            );
            return await interaction.showModal(modal);
        }

        // --- 2. RECEBER REGISTRO (NOVO) ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cNum = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cNum]) return interaction.reply({ content: "Cargo inválido.", ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31).setTitle("📩 NOVO REGISTRO PENDENTE")
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user}`, inline: true },
                    { name: "🆔 Nick", value: `\`${nick}\``, inline: true },
                    { name: "💼 Cargo", value: `\`${cargos[cNum].nome}\``, inline: true }
                ).setFooter({ text: `Solicitado em: ${getData()}` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edit_tipo1_${interaction.user.id}_${cNum}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Registro enviado com sucesso!", ephemeral: true });
        }

        // --- 3. PAINEL DE EDIÇÃO (TIPO 1 E 2) ---
        if (interaction.isButton() && (interaction.customId.startsWith("edit_tipo1") || interaction.customId.startsWith("edit_tipo2"))) {
            const [, tipo, uid, cId, nick] = interaction.customId.split("_");
            db.set(uid, { originalC: cId, novoC: cId, originalN: nick, novoN: nick, status: tipo });

            const embedEdit = new EmbedBuilder()
                .setColor(0xFFA500).setTitle("⚙️ PAINEL DE CONTROLE / EDIÇÃO")
                .setDescription(`Membro: <@${uid}>\nStatus Atual: ${tipo === "tipo1" ? "Pendente" : "Processado"}`)
                .addFields(
                    { name: "📝 Nick Atual", value: `\`${nick}\``, inline: true },
                    { name: "💼 Cargo Atual", value: `\`${cargos[cId].nome}\``, inline: true }
                );

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_c_${uid}`).setPlaceholder("Mudar Cargo...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );

            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_nick_modal_${uid}`).setLabel("Mudar Nick").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`confirm_edit_${uid}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`cancelar_edit`).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );

            // Se for Tipo 2, adiciona botão de remoção
            if (tipo === "tipo2") {
                rowBtns.addComponents(new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção (Expulsar)").setStyle(ButtonStyle.Secondary));
            }

            return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
        }

        // --- 4. SELEÇÃO DE CARGO NO MENU ---
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sel_c")) {
            const uid = interaction.customId.split("_")[2];
            const data = db.get(uid);
            data.novoC = interaction.values[0];
            db.set(uid, data);
            return interaction.update({ content: `✅ Cargo alterado para **${cargos[data.novoC].nome}** na pré-edição.` });
        }

        // --- 5. CONFIRMAR EDIÇÃO (GERA RELATÓRIO PROFISSIONAL) ---
        if (interaction.isButton() && interaction.customId.startsWith("confirm_edit")) {
            const uid = interaction.customId.split("_")[2];
            const d = db.get(uid);
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);

            // Lógica de Promoção/Rebaixamento no Tipo 2
            let tipoAviso = "ATUALIZADO";
            if (d.status === "tipo2") {
                if (parseInt(d.novoC) > parseInt(d.originalC)) tipoAviso = "PROMOVIDO";
                else if (parseInt(d.novoC) < parseInt(d.originalC)) tipoAviso = "REBAIXADO";
            }

            const embedRelatorio = new EmbedBuilder()
                .setColor(0x00AAFF).setTitle(`📑 RELATÓRIO DE REGISTRO - ${tipoAviso}`)
                .addFields(
                    { name: "👤 Membro", value: `<@${uid}>`, inline: true },
                    { name: "🆔 Nick", value: d.originalN === d.novoN ? `\`${d.novoN}\`` : `\`${d.originalN}\` ➔ \`${d.novoN}\``, inline: true },
                    { name: "💼 Cargo", value: d.originalC === d.novoC ? `\`${cargos[d.novoC].nome}\`` : `\`${cargos[d.originalC].nome}\` ➔ \`${cargos[d.novoC].nome}\``, inline: true },
                    { name: "👮 Responsável", value: `${interaction.user}`, inline: true },
                    { name: "📅 Data/Hora", value: `\`${getData()}\``, inline: true }
                );

            // Aplica as mudanças no Discord se for Tipo 2 (Confirmar automático)
            if (membro) {
                await membro.setNickname(`${TAG_PREFIXO} ${d.novoN}`).catch(() => {});
                if (d.status === "tipo2") {
                    await membro.roles.remove(Object.values(cargos).map(c => c.id)).catch(() => {});
                    await membro.roles.add([cargos[d.novoC].id, CARGO_AUTOMATICO]);
                }
            }

            const rowLogs = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_tipo2_${uid}_${d.novoC}_${d.novoN}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
            );

            // Envia para o canal de registros e DM do jogador
            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embedRelatorio], components: [rowLogs] });
            membro?.send({ embeds: [embedRelatorio] }).catch(() => {});

            return interaction.update({ content: "🔥 Alterações confirmadas e relatório gerado!", embeds: [], components: [] });
        }

        // --- 6. REMOÇÃO (RELATÓRIO DE EXPULSÃO) ---
        if (interaction.isButton() && interaction.customId.startsWith("remover")) {
            const uid = interaction.customId.split("_")[1];
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);

            const embedSaida = new EmbedBuilder()
                .setColor(0xFF0000).setTitle("🚫 RELATÓRIO DE REMOÇÃO")
                .setDescription(`Sua permanência no setor chegou ao fim. Agradecemos pelo tempo dedicado ao **Horizonte RP**.`)
                .addFields(
                    { name: "👤 Usuário", value: `<@${uid}>`, inline: true },
                    { name: "👮 Responsável", value: `${interaction.user}`, inline: true },
                    { name: "📅 Data de Saída", value: `\`${getData()}\``, inline: true }
                ).setFooter({ text: "Obrigado por sua colaboração." });

            if (membro) {
                await membro.send({ embeds: [embedSaida] }).catch(() => {});
                await membro.roles.remove(Object.values(cargos).map(c => c.id)).catch(() => {});
                await membro.roles.remove(CARGO_AUTOMATICO).catch(() => {});
                await membro.setNickname("").catch(() => {});
            }

            return interaction.update({ content: "Membro removido com sucesso.", embeds: [embedSaida], components: [] });
        }

    } catch (e) { console.error("Erro no sistema:", e); }
});

client.login(TOKEN);
