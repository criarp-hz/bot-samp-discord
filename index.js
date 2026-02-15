const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection
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

const dataH = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

// ===================== LOGICA =====================

client.once("ready", async () => {
    const guild = client.guilds.cache.first();
    if (guild) await guild.commands.set([{ name: 'painel', description: 'Envia o painel de registro.' }]);
    console.log("✅ Sistema Online - Mensagens Profissionais Ativadas.");
});

client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('📋 SISTEMA DE REGISTRO').setDescription('Bem-vindo ao sistema de registro do servidor!\n\nUtilize o botão abaixo para iniciar o seu formulário.');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_registro').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary));
            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        if (interaction.isButton() && interaction.customId === "abrir_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO (1 a 6)").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "⚠️ Use 1 a 6.", ephemeral: true });

            const logPendente = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields({ name: "👤 Usuário", value: `${interaction.user}` }, { name: "🆔 Nick", value: `\`${nick}\`` }, { name: "💼 Cargo", value: `\`${cargos[cId].nome}\`` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edit_indisponivel`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [logPendente], components: [row] });
            return interaction.reply({ content: "✅ Enviado!", ephemeral: true });
        }

        // --- BOTÃO EDITAR INDISPONÍVEL ---
        if (interaction.isButton() && interaction.customId === "edit_indisponivel") {
            return interaction.reply({ content: "❌ O sistema de editar ainda não está disponível. Em breve será! Entre em contato com **Criarp**.", ephemeral: true });
        }

        // --- AÇÃO: ACEITAR (MENSAGEM IGUAL AO PRINT) ---
        if (interaction.isButton() && interaction.customId.startsWith("aceitar")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);

            if (membro) {
                await membro.roles.add([cargos[cId].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${nick}`).catch(() => {});

                const embedAceitoPV = new EmbedBuilder()
                    .setColor(0x43b581)
                    .setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                    .setDescription(`Prezado(a) **${nick}**,\n\nSeu registro foi analisado pela equipe administrativa e foi **APROVADO**.`)
                    .addFields(
                        { name: "💼 Cargo Assumido", value: `${cargos[cId].nome}`, inline: true },
                        { name: "👮 Responsável", value: `${interaction.user.username}`, inline: true },
                        { name: "📅 Data/Hora", value: `${dataH()}`, inline: false }
                    ).setFooter({ text: "Horizonte RP - Compromisso e Qualidade" });

                await membro.send({ embeds: [embedAceitoPV] }).catch(() => {});
            }
            return interaction.update({ content: `✅ Registro de <@${uid}> aprovado.`, embeds: [], components: [] });
        }

        // --- AÇÃO: RECUSAR (MENSAGEM PROFISSIONAL NO PV) ---
        if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
            const [, uid, nick] = interaction.customId.split("_");
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);

            if (membro) {
                const embedRecusaPV = new EmbedBuilder()
                    .setColor(0xf04747)
                    .setTitle("❌ COMUNICADO DE RECUSA - HORIZONTE RP")
                    .setDescription(`Prezado(a) **${nick}**,\n\nInformamos que seu registro de acesso ao suporte foi **RECUSADO** após análise.`)
                    .addFields(
                        { name: "📝 Motivo", value: "Dados inconsistentes ou falta de requisitos mínimos.", inline: false },
                        { name: "👮 Analisado por", value: `${interaction.user.username}`, inline: true },
                        { name: "⏰ Horário", value: `${dataH()}`, inline: true }
                    ).setFooter({ text: "Caso deseje contestar, procure um superior." });

                await membro.send({ embeds: [embedRecusaPV] }).catch(() => {});
            }
            return interaction.update({ content: `❌ Registro de <@${uid}> recusado.`, embeds: [], components: [] });
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
