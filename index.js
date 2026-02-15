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

const db_edit = new Collection();
const dataH = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

// ===================== LOGICA DO SISTEMA =====================

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. FORMULÁRIO (ID: abrir_registro) ---
        if (interaction.isButton() && interaction.customId === "abrir_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO (1 a 6)").setPlaceholder("Digite o número do seu cargo (1 a 6)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- 2. ENVIO DO REGISTRO ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "⚠️ Cargo inválido (1-6).", ephemeral: true });

            const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user}` },
                    { name: "🆔 Nick", value: `\`${nick}\``, inline: true },
                    { name: "💼 Cargo", value: `\`${cargos[cId].nome}\``, inline: true }
                ).setFooter({ text: "Aguardando análise da Staff" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${cId}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`painel_edit_${interaction.user.id}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "✅ Enviado!", ephemeral: true });
        }

        // --- 3. ACEITAR / CONFIRMAR (MENSAGEM IGUAL AO PRINT) ---
        if (interaction.isButton() && (interaction.customId.startsWith("aceitar") || interaction.customId.startsWith("confirmar_final"))) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            const d = db_edit.get(uid) || { cA: cId, nA: nick, cO: cId, nO: nick };

            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.add([cargos[d.cA].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${d.nA}`).catch(() => {});

                // MENSAGEM DO SEU PRINT (MUITO PROFISSIONAL)
                const embedDM = new EmbedBuilder()
                    .setColor(0x43b581) // Verde igual do print
                    .setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                    .setDescription(`Prezado(a) **${d.nA}**,\n\nSeu registro foi analisado pela equipe administrativa e foi **APROVADO**.`)
                    .addFields(
                        { name: "💼 Cargo Assumido", value: `${cargos[d.cA].nome}`, inline: true },
                        { name: "👮 Responsável", value: `${interaction.user.username}`, inline: true },
                        { name: "📅 Data/Hora", value: `${dataH()}`, inline: false }
                    ).setFooter({ text: "Bem-vindo à equipe!" });

                await membro.send({ embeds: [embedDM] }).catch(() => {});
            }

            const relatorioCanal = new EmbedBuilder().setColor(0x00FF00).setTitle("📑 REGISTRO CONCLUÍDO")
                .addFields({ name: "Membro", value: `<@${uid}>`, inline: true }, { name: "Cargo", value: cargos[d.cA].nome, inline: true });

            return interaction.update({ embeds: [relatorioCanal], components: [] });
        }

        // --- 4. RECUSAR (FIXADO) ---
        if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
            const [, uid, , nick] = interaction.customId.split("_");
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);

            if (membro) {
                const embedRecusa = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ REGISTRO RECUSADO - HORIZONTE RP")
                    .setDescription(`Prezado(a) **${nick}**, seu registro foi analisado e **RECUSADO**.`)
                    .addFields({ name: "👮 Responsável", value: `${interaction.user.username}` }, { name: "⏰ Horário", value: `${dataH()}` });

                await membro.send({ embeds: [embedRecusa] }).catch(() => {});
                // Opcional: remover cargos se ele já tinha
                await membro.roles.remove(Object.values(cargos).map(c => c.id)).catch(() => {});
            }
            return interaction.update({ content: `❌ Registro de <@${uid}> recusado.`, embeds: [], components: [] });
        }

        // --- 5. PAINEL DE EDIÇÃO (COM MUDAR NICK) ---
        if (interaction.isButton() && interaction.customId.startsWith("painel_edit")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            if (!db_edit.has(uid)) db_edit.set(uid, { cA: cId, nA: nick, cO: cId, nO: nick });
            const d = db_edit.get(uid);

            const embedEdit = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO")
                .setDescription(`Editando: <@${uid}>\nNick: \`${d.nA}\`\nCargo: \`${cargos[d.cA].nome}\``);

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_c_${uid}`).setPlaceholder("Mudar Cargo...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_nick_${uid}`).setLabel("Mudar Nick").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`confirmar_final_${uid}`).setLabel("Confirmar e Aprovar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("fechar").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
        }

        // --- MODAL MUDAR NICK NA EDIÇÃO ---
        if (interaction.isButton() && interaction.customId.startsWith("edit_nick")) {
            const uid = interaction.customId.split("_")[2];
            const modal = new ModalBuilder().setCustomId(`save_n_${uid}`).setTitle("Novo Nick");
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("n").setLabel("NICK").setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("save_n")) {
            const uid = interaction.customId.split("_")[2];
            db_edit.get(uid).nA = interaction.fields.getTextInputValue("n");
            return interaction.reply({ content: "✅ Nick atualizado na memória! Clique em **Confirmar** no painel de edição.", ephemeral: true });
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
