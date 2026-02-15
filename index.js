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

// ===================== STARTUP =====================
client.once("ready", async () => {
    console.log("🚀 Sistema Horizonte RP Online com seu Layout Original.");
    const guild = client.guilds.cache.first();
    if (guild) await guild.commands.set([{ name: 'painel', description: 'Envia o painel de registro.' }]);
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. SEU PAINEL ORIGINAL (CONFORME O CÓDIGO QUE VOCÊ MANDOU) ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const registroEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription(
                    'Bem-vindo ao sistema de registro do servidor!\n\n' +
                    'Para que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n' +
                    '⚠️ **Usar cargo incorreto pode causar:**\n' +
                    '• Erros no registro\n' +
                    '• Problemas de permissão\n' +
                    '• Penalidades administrativas\n\n' +
                    '✅ Em caso de dúvida, procure um responsável do seu setor.'
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('iniciar_registro')
                    .setLabel('Registrar-se')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [registroEmbed], components: [row] });
            return interaction.reply({ content: "Painel enviado!", ephemeral: true });
        }

        // --- 2. MODAL DE REGISTRO ---
        if (interaction.isButton() && interaction.customId === "iniciar_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Número (1-6)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- 3. RELATÓRIO PENDENTE ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "Cargo inválido.", ephemeral: true });

            const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user}`, inline: false },
                    { name: "🆔 Nick", value: `\`${nick}\``, inline: true },
                    { name: "💼 Cargo", value: `\`${cargos[cId].nome}\``, inline: true }
                ).setFooter({ text: "Aguardando análise da Staff" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${cId}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edit_${interaction.user.id}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );
            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Enviado com sucesso!", ephemeral: true });
        }

        // --- 4. LÓGICA DE ACEITAR / RELATÓRIO PROFISSIONAL ---
        if (interaction.isButton() && (interaction.customId.startsWith("aceitar") || interaction.customId.startsWith("save_edit"))) {
            const uid = interaction.customId.split("_")[1];
            // Recupera dados editados ou usa os originais do botão
            const d = db.get(uid) || { 
                cA: interaction.customId.split("_")[2], 
                nA: interaction.customId.split("_")[3], 
                cO: interaction.customId.split("_")[2], 
                nO: interaction.customId.split("_")[3] 
            };
            
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.add([cargos[d.cA].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${d.nA}`).catch(() => {});
            }

            const embedAprovado = new EmbedBuilder().setColor(0x00FF00).setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                .setDescription(`Prezado(a) **${d.nA}**, seu registro foi analisado e **APROVADO**.`)
                .addFields(
                    { name: "💼 Cargo Solicitado", value: `${cargos[d.cO].nome}`, inline: true },
                    { name: "💼 Cargo Atualizado", value: `${cargos[d.cA].nome}`, inline: true },
                    { name: "👤 Responsável", value: `${interaction.user.username}`, inline: true },
                    { name: "📅 Data/Hora", value: `${dataH()}`, inline: false }
                ).setFooter({ text: "Bem-vindo à equipe!" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_${uid}_${d.cA}_${d.nA}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção (Expulsar)").setStyle(ButtonStyle.Danger)
            );

            await interaction.update({ embeds: [embedAprovado], components: [row] });
            membro?.send({ embeds: [embedAprovado] }).catch(() => {});
        }

        // --- 5. RECUSAR ---
        if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            const embedRecusa = new EmbedBuilder().setColor(0xFF0000).setTitle("❌ REGISTRO RECUSADO - HORIZONTE RP")
                .setDescription(`Prezado(a) **${nick}**, seu registro foi **RECUSADO** no momento.`)
                .addFields(
                    { name: "👤 Responsável", value: `${interaction.user.username}`, inline: true },
                    { name: "📅 Data/Hora", value: `${dataH()}`, inline: true }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_${uid}_${cId}_${nick}`).setLabel("Editar / Aprovar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção (Expulsar)").setStyle(ButtonStyle.Danger)
            );
            await interaction.update({ embeds: [embedRecusa], components: [row] });
            const target = await interaction.guild.members.fetch(uid).catch(() => null);
            target?.send({ embeds: [embedRecusa] }).catch(() => {});
        }

        // --- 6. PAINEL DE EDIÇÃO (MUDAR CARGO/NICK) ---
        if (interaction.isButton() && interaction.customId.startsWith("edit")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            db.set(uid, { cO: cId, cA: cId, nO: nick, nA: nick });

            const embedEdit = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ EDIÇÃO DE REGISTRO")
                .setDescription(`Ajuste as informações para <@${uid}>`);

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_c_${uid}`).setPlaceholder("Escolha o Novo Cargo...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`save_edit_${uid}`).setLabel("Salvar e Aprovar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("cancelar").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
        }

        // --- 7. REMOÇÃO (EXPULSAR) ---
        if (interaction.isButton() && interaction.customId.startsWith("remover")) {
            const uid = interaction.customId.split("_")[1];
            const target = await interaction.guild.members.fetch(uid).catch(() => null);
            if (target) {
                await target.send("🚨 Você foi removido da equipe Horizonte RP.").catch(() => {});
                await target.kick("Remoção via Painel").catch(() => {});
            }
            return interaction.update({ content: "🚫 Membro removido e expulso do servidor.", embeds: [], components: [] });
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
