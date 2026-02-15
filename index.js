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

// ===================== LOGICA DO SISTEMA =====================

client.on("interactionCreate", async (interaction) => {
    try {
        // 1. PAINEL DE REGISTRO (NOVO VISUAL)
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setTitle("📋 SISTEMA DE REGISTRO")
                .setDescription("Bem-vindo ao sistema de registro do servidor!\n\nUtilize o botão abaixo para iniciar seu formulário.")
                .addFields({ name: "\u200B", value: "Para que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abrir_modal').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Painel enviado com sucesso!", ephemeral: true });
        }

        // 2. MODAL DE REGISTRO
        if (interaction.isButton() && interaction.customId === "abrir_modal") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome no personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Número (1-6)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // 3. RECEBIMENTO (NOVO REGISTRO PENDENTE)
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "Cargo inválido!", ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user}`, inline: false },
                    { name: "🆔 Nick", value: `\`${nick}\``, inline: true },
                    { name: "💼 Cargo", value: `\`${cargos[cId].nome}\``, inline: true }
                ).setFooter({ text: "Aguardando análise da Staff" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${cId}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edit_init_${interaction.user.id}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Seu registro foi enviado!", ephemeral: true });
        }

        // 4. LÓGICA DE APROVAÇÃO (RELATÓRIO PROFISSIONAL)
        if (interaction.isButton() && (interaction.customId.startsWith("aceitar") || interaction.customId.startsWith("save_edit"))) {
            const uid = interaction.customId.split("_")[1];
            const d = db.get(uid) || { cA: interaction.customId.split("_")[2], nA: interaction.customId.split("_")[3], cO: interaction.customId.split("_")[2], nO: interaction.customId.split("_")[3] };
            
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.add([cargos[d.cA].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${d.nA}`).catch(() => {});
            }

            const embedRelatorio = new EmbedBuilder()
                .setColor(0x00FF00).setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                .setDescription(`Prezado(a) **${d.nA}**,\n\nSeu registro foi analisado pela equipe administrativa e foi **APROVADO**.`)
                .addFields(
                    { name: "💼 Cargo Solicitado", value: `${cargos[d.cO].nome}`, inline: true },
                    { name: "💼 Cargo Assumido", value: `${cargos[d.cA].nome}`, inline: true },
                    { name: "👤 Responsável", value: `${interaction.user.username}`, inline: true },
                    { name: "📅 Data/Hora", value: `${getData()}`, inline: false }
                ).setFooter({ text: "Bem-vindo à equipe!" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_init_${uid}_${d.cA}_${d.nA}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção (Expulsar)").setStyle(ButtonStyle.Danger)
            );

            await interaction.update({ embeds: [embedRelatorio], components: [row] });
            membro?.send({ embeds: [embedRelatorio] }).catch(() => {});
        }

        // 5. PAINEL DE EDIÇÃO (EDITAR NICK, CARGO OU APROVAR)
        if (interaction.isButton() && interaction.customId.startsWith("edit_init")) {
            const [, , uid, cId, nick] = interaction.customId.split("_");
            db.set(uid, { cO: cId, cA: cId, nO: nick, nA: nick });

            const embed = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ EDITAR REGISTRO").setDescription(`Membro: <@${uid}>`);
            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_c_${uid}`).setPlaceholder("Mudar Cargo...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`save_edit_${uid}`).setLabel("Aprovar / Salvar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("cancel").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [embed], components: [rowSelect, rowBtns], ephemeral: true });
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
