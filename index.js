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
const getData = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

client.once("ready", async () => {
    console.log("🚀 Sistema Horizonte RP: Relatórios Profissionais Online.");
    const guild = client.guilds.cache.first();
    if (guild) await guild.commands.set([
        { name: 'painel', description: 'Envia o painel de registro.' },
        { name: 'configadm', description: 'Painel administrativo Staff.' }
    ]);
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. SOLICITAÇÃO (SEM EMOJIS - CONFORME PEDIDO) ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cNum = interaction.fields.getTextInputValue("m_cargo");
            
            const embed = new EmbedBuilder()
                .setColor(0x2b2d31).setTitle("NOVO REGISTRO PENDENTE")
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: "Usuário", value: `${interaction.user}` },
                    { name: "Nick", value: `\`${nick}\`` },
                    { name: "Cargo", value: `\`${cargos[cNum]?.nome || "Indefinido"}\`` }
                ).setFooter({ text: "Aguardando análise da Staff" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${cNum}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edit_p_${interaction.user.id}_${cNum}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Seu registro foi enviado!", ephemeral: true });
        }

        // --- 2. PAINEL DE EDIÇÃO (COM BOTÃO APROVAR/REPROVAR) ---
        if (interaction.isButton() && interaction.customId.startsWith("edit_")) {
            const [, status, uid, cId, nick] = interaction.customId.split("_");
            db.set(uid, { cOrig: cId, cAtu: cId, nOrig: nick, nAtu: nick, fase: status });

            const embedEdit = new EmbedBuilder()
                .setColor(0xFFA500).setTitle("⚙️ CONTROLE DE REGISTRO")
                .setDescription(`Membro: <@${uid}>\nEstado: **${status === 'p' ? 'Pendente' : 'Processado'}**`);

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_${uid}`).setPlaceholder("Selecione o Cargo correto...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );

            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`confirmar_${uid}`).setLabel("Confirmar e Salvar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`aprovar_direto_${uid}`).setLabel("Aprovar Agora").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`cancelar`).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
        }

        // --- 3. RELATÓRIO DE APROVAÇÃO (PROFISSIONAL COM EMOJIS) ---
        if (interaction.isButton() && (interaction.customId.startsWith("aceitar") || interaction.customId.startsWith("aprovar_direto"))) {
            const uid = interaction.customId.split("_").pop();
            const d = db.get(uid) || { cAtu: interaction.customId.split("_")[2], nAtu: interaction.customId.split("_")[3], cOrig: interaction.customId.split("_")[2], nOrig: interaction.customId.split("_")[3] };
            
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.add([cargos[d.cAtu].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${d.nAtu}`).catch(() => {});
            }

            const embedRelatorio = new EmbedBuilder()
                .setColor(0x00FF00).setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                .setThumbnail(membro?.user.displayAvatarURL())
                .setDescription(`Prezado(a) **${d.nAtu}**, seu registro foi analisado e **APROVADO**.`)
                .addFields(
                    { name: "💼 Cargo Assumido", value: `\`${cargos[d.cAtu].nome}\``, inline: true },
                    { name: "👮 Responsável", value: `${interaction.user}`, inline: true },
                    { name: "📅 Data/Hora", value: `\`${getData()}\``, inline: false }
                ).setFooter({ text: "Bem-vindo à equipe!" });

            const rowLogs = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_a_${uid}_${d.cAtu}_${d.nAtu}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
            );

            await interaction.update({ content: "✅ Registro Processado.", embeds: [embedRelatorio], components: [rowLogs] });
            membro?.send({ embeds: [embedRelatorio] }).catch(() => {});
        }

        // --- 4. RELATÓRIO DE RECUSA ---
        if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            const embedRecusa = new EmbedBuilder()
                .setColor(0xFF0000).setTitle("❌ REGISTRO RECUSADO")
                .addFields(
                    { name: "👤 Usuário", value: `<@${uid}>`, inline: true },
                    { name: "🆔 Nick", value: `\`${nick}\``, inline: true },
                    { name: "👮 Responsável", value: `${interaction.user}`, inline: true },
                    { name: "📅 Data/Hora", value: `\`${getData()}\`` }
                );

            const rowRecusa = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_r_${uid}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
            );

            return interaction.update({ embeds: [embedRecusa], components: [rowRecusa] });
        }

        // --- 5. RELATÓRIO DE REMOÇÃO (HISTÓRICO) ---
        if (interaction.isButton() && interaction.customId.startsWith("remover")) {
            const uid = interaction.customId.split("_")[1];
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);

            const embedSaida = new EmbedBuilder()
                .setColor(0x2b2d31).setTitle("🚫 RELATÓRIO DE REMOÇÃO")
                .setDescription("O ciclo do membro no suporte foi encerrado.")
                .addFields(
                    { name: "👤 Usuário", value: `<@${uid}>`, inline: true },
                    { name: "📅 Data de Saída", value: `\`${getData()}\``, inline: true },
                    { name: "👮 Responsável", value: `${interaction.user}`, inline: true }
                ).setFooter({ text: "Horizonte RP - Sistema de Logs" });

            if (membro) {
                await membro.roles.set([]).catch(() => {});
                await membro.setNickname("").catch(() => {});
                membro.send("Sua saída foi registrada no sistema. Agradecemos sua colaboração.").catch(() => {});
            }
            return interaction.update({ embeds: [embedSaida], components: [] });
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
