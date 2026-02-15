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

const db = new Collection();
const dataH = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

// ===================== LÓGICA DE INTERAÇÃO =====================

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. ABRIR FORMULÁRIO (COM TEXTO COMBINADO) ---
        if (interaction.isButton() && interaction.customId === "iniciar_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- 2. RECEBER REGISTRO ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "Cargo inválido.", ephemeral: true });

            const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields({ name: "👤 Usuário", value: `${interaction.user}` }, { name: "🆔 Nick", value: `\`${nick}\`` }, { name: "💼 Cargo", value: `\`${cargos[cId].nome}\`` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${cId}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`painel_edit_${interaction.user.id}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );
            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Enviado!", ephemeral: true });
        }

        // --- 3. PAINEL DE EDIÇÃO (Mudar Cargo, Mudar Nick, Confirmar, Cancelar) ---
        if (interaction.isButton() && interaction.customId.startsWith("painel_edit")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            if (!db.has(uid)) db.set(uid, { cO: cId, cA: cId, nO: nick, nA: nick });
            const d = db.get(uid);

            const embedEdit = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO")
                .setDescription(`Membro: <@${uid}>\n\n**Nick Atual:** ${d.nA}\n**Cargo Atual:** ${cargos[d.cA].nome}`);

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_c_${uid}`).setPlaceholder("Mudar Cargo...").addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_nick_modal_${uid}`).setLabel("Mudar Nick").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`confirmar_final_${uid}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("cancelar").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
        }

        // --- 4. MODAL PARA MUDAR NICK NA EDIÇÃO ---
        if (interaction.isButton() && interaction.customId.startsWith("edit_nick_modal")) {
            const uid = interaction.customId.split("_")[3];
            const modal = new ModalBuilder().setCustomId(`save_nick_db_${uid}`).setTitle("Alterar Nick do Jogador");
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("new_nick").setLabel("NOVO NICK").setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("save_nick_db")) {
            const uid = interaction.customId.split("_")[3];
            const novoNick = interaction.fields.getTextInputValue("new_nick");
            const d = db.get(uid);
            d.nA = novoNick;
            return interaction.reply({ content: `✅ Nick alterado para **${novoNick}**. Clique em Confirmar no painel.`, ephemeral: true });
        }

        // --- 5. SELEÇÃO DE CARGO NA EDIÇÃO ---
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sel_c")) {
            const uid = interaction.customId.split("_")[2];
            const d = db.get(uid);
            d.cA = interaction.values[0];
            return interaction.reply({ content: `✅ Cargo alterado para **${cargos[d.cA].nome}**. Clique em Confirmar no painel.`, ephemeral: true });
        }

        // --- 6. CONFIRMAÇÃO FINAL E RELATÓRIO PROFISSIONAL ---
        if (interaction.isButton() && (interaction.customId.startsWith("confirmar_final") || interaction.customId.startsWith("aceitar"))) {
            const uid = interaction.customId.split("_")[2] || interaction.customId.split("_")[1];
            const d = db.get(uid) || { cA: interaction.customId.split("_")[2], nA: interaction.customId.split("_")[3], cO: interaction.customId.split("_")[2], nO: interaction.customId.split("_")[3] };

            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.set([cargos[d.cA].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${d.nA}`).catch(() => {});
            }

            const relatorio = new EmbedBuilder().setColor(0x00FF00).setTitle("👑 REGISTRO APROVADO - HORIZONTE RP")
                .setDescription(`Prezado(a) **${d.nA}**, seu registro foi concluído.`)
                .addFields(
                    { name: "💼 Cargo Solicitado", value: `${cargos[d.cO].nome}`, inline: true },
                    { name: "💼 Cargo Assumido", value: `${cargos[d.cA].nome}`, inline: true },
                    { name: "👤 Responsável", value: `${interaction.user.username}`, inline: true },
                    { name: "⏰ Horário", value: `${dataH()}` }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`painel_edit_${uid}_${d.cA}_${d.nA}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção (Expulsar)").setStyle(ButtonStyle.Danger)
            );

            // Se for vindo da edição (ephemeral), precisamos editar a mensagem original do canal de aprovação
            const canal = client.channels.cache.get(APROVACAO_CANAL);
            // Lógica para encontrar e editar a mensagem de log se necessário ou apenas responder
            await interaction.reply({ content: "✅ Registro processado com sucesso!", ephemeral: true });
            await canal.send({ embeds: [relatorio], components: [row] });
            membro?.send({ embeds: [relatorio] }).catch(() => {});
        }

    } catch (e) { console.error(e); }
});
