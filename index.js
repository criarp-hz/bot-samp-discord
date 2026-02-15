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

const db_edit = new Collection();
const dataH = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

// ===================== REGISTRO DE COMANDO FORÇADO =====================
client.once("ready", async () => {
    // Isso força o Discord a atualizar o comando instantaneamente no seu servidor
    const guild = client.guilds.cache.first();
    if (guild) {
        await guild.commands.set([
            { name: 'painel', description: 'Envia o painel de registro oficial.' }
        ]);
    }
    console.log(`✅ Bot ${client.user.tag} Online e Sincronizado!`);
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. COMANDO /PAINEL (RESPOSTA INSTANTÂNEA) ---
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
                    .setCustomId('abrir_registro')
                    .setLabel('Registrar-se')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Primary)
            );

            return await interaction.reply({ embeds: [registroEmbed], components: [row] });
        }

        // --- 2. ABRIR FORMULÁRIO ---
        if (interaction.isButton() && interaction.customId === "abrir_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Seu Nick").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO (1 a 6)").setPlaceholder("Digite o número do cargo").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- 3. ENVIO DO FORMULÁRIO (LOG PENDENTE) ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "❌ Cargo inválido! Use de 1 a 6.", ephemeral: true });

            const logEmbed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user}` },
                    { name: "🆔 Nick", value: `\`${nick}\`` },
                    { name: "💼 Cargo", value: `\`${cargos[cId].nome}\`` }
                );

            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edit_painel_${interaction.user.id}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [logEmbed], components: [rowBtns] });
            return interaction.reply({ content: "✅ Registro enviado para aprovação!", ephemeral: true });
        }

        // --- 4. ACEITAR (VISUAL IGUAL AO PRINT NO PV) ---
        if (interaction.isButton() && interaction.customId.startsWith("aceitar")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);

            if (membro) {
                await membro.roles.add([cargos[cId].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${nick}`).catch(() => {});

                const dmEmbed = new EmbedBuilder()
                    .setColor(0x43b581)
                    .setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                    .setDescription(`Prezado(a) **${nick}**,\n\nSeu registro foi analisado pela equipe administrativa e foi **APROVADO**.`)
                    .addFields(
                        { name: "💼 Cargo Assumido", value: `${cargos[cId].nome}`, inline: true },
                        { name: "👮 Responsável", value: `${interaction.user.username}`, inline: true },
                        { name: "📅 Data/Hora", value: `${dataH()}`, inline: false }
                    ).setFooter({ text: "Bem-vindo à equipe!" });

                await membro.send({ embeds: [dmEmbed] }).catch(() => {});
            }

            // Relatório Final no Canal (Visual do Print)
            const logFinal = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 REGISTRO ATUALIZADO")
                .addFields(
                    { name: "Usuário", value: `<@${uid}>` },
                    { name: "Nick", value: `${nick}` },
                    { name: "Cargo", value: `${cargos[cId].nome}` },
                    { name: "Responsável", value: `${interaction.user.username}` }
                );

            return interaction.update({ embeds: [logFinal], components: [] });
        }

        // --- 5. RECUSAR ---
        if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
            const [, uid, nick] = interaction.customId.split("_");
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                const dmRecusa = new EmbedBuilder().setColor(0xff0000).setTitle("❌ REGISTRO RECUSADO").setDescription(`Olá **${nick}**, seu registro foi recusado.`);
                await membro.send({ embeds: [dmRecusa] }).catch(() => {});
            }
            return interaction.update({ content: `❌ Registro de <@${uid}> recusado.`, embeds: [], components: [] });
        }

    } catch (e) {
        console.error(e);
    }
});

client.login(TOKEN);
