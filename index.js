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
const CARGO_AUTOMATICO = "1472054758415138960"; // Cargo que todos recebem

const cargos = {
  "1": { nome: "Ajudante", id: "1472055381713883187" },
  "2": { nome: "Moderador(a)", id: "1472055978911465673" },
  "3": { nome: "Administrador(a)", id: "1472056709349511263" },
  "4": { nome: "Auxiliar", id: "1472057320799338639" },
  "5": { nome: "Coordenador(a)", id: "1472058121529593906" },
  "6": { nome: "Direção", id: "1472058401394655355" }
};

const db_edicao = new Collection();
const dataH = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

// ===================== STARTUP =====================
client.once("ready", async () => {
    console.log("✅ Sistema Horizonte RP Ativo.");
    const guild = client.guilds.cache.first();
    if (guild) await guild.commands.set([{ name: 'painel', description: 'Envia o painel de registro.' }]);
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. COMANDO /PAINEL ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2).setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription('Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abrir_registro').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
            );
            return interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- 2. ABRIR FORMULÁRIO ---
        if (interaction.isButton() && interaction.customId === "abrir_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO (1 a 6)").setPlaceholder("Digite o número do seu cargo (1-6)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- 3. LOG DE REGISTRO PENDENTE ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "⚠️ Use apenas números de 1 a 6!", ephemeral: true });

            const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user} (\`${interaction.user.id}\`)` },
                    { name: "🆔 Nick", value: `\`${nick}\``, inline: true },
                    { name: "💼 Cargo", value: `\`${cargos[cId].nome}\``, inline: true }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`p_edit_${interaction.user.id}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "✅ Seu registro foi enviado para análise!", ephemeral: true });
        }

        // --- 4. APROVAÇÃO E ENTREGA DE CARGOS ---
        if (interaction.isButton() && (interaction.customId.startsWith("aceitar") || interaction.customId.startsWith("confirma_edit"))) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            const d = db_edicao.get(uid) || { cA: cId, nA: nick, cO: cId, nO: nick };
            
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                // DAR TAG E CARGOS
                await membro.roles.add([cargos[d.cA].id, CARGO_AUTOMATICO]).catch(e => console.log("Erro cargo"));
                await membro.setNickname(`${TAG_PREFIXO} ${d.nA}`).catch(e => console.log("Erro nick"));

                // DM PROFISSIONAL
                const dmEmbed = new EmbedBuilder().setColor(0x00FF00).setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                    .setDescription(`Olá **${d.nA}**, seu acesso foi liberado!`)
                    .addFields(
                        { name: "💼 Cargo Assumido", value: `\`${cargos[d.cA].nome}\``, inline: true },
                        { name: "👮 Responsável", value: `${interaction.user.username}`, inline: true },
                        { name: "⏰ Horário", value: `\`${dataH()}\`` }
                    ).setFooter({ text: "Bom trabalho no suporte!" });
                await membro.send({ embeds: [dmEmbed] }).catch(() => {});
            }

            const relatorio = new EmbedBuilder().setColor(0x00FF00).setTitle("📑 RELATÓRIO DE REGISTRO - APROVADO")
                .addFields(
                    { name: "👤 Membro", value: `<@${uid}>`, inline: true },
                    { name: "🆔 Nick/TAG", value: `\`${d.nA}\``, inline: true },
                    { name: "💼 Cargo", value: `\`${cargos[d.cA].nome}\``, inline: true },
                    { name: "📅 Data", value: `\`${dataH()}\`` }
                );

            return interaction.update({ embeds: [relatorio], components: [] });
        }

        // --- 5. RECUSAR E AVISAR NO PRIVADO ---
        if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
            const [, uid, nick] = interaction.customId.split("_");
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);

            const dmRecusa = new EmbedBuilder().setColor(0xFF0000).setTitle("❌ REGISTRO RECUSADO - HORIZONTE RP")
                .setDescription(`Olá **${nick}**, infelizmente seu registro não foi aceito.`)
                .addFields({ name: "👮 Responsável", value: `${interaction.user.username}` }, { name: "⏰ Horário", value: `\`${dataH()}\`` });

            await membro?.send({ embeds: [dmRecusa] }).catch(() => {});
            return interaction.update({ content: "❌ Registro Recusado.", embeds: [], components: [] });
        }

        // --- 6. PAINEL DE EDIÇÃO ---
        if (interaction.isButton() && interaction.customId.startsWith("p_edit")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            db_edicao.set(uid, { cA: cId, nA: nick, cO: cId, nO: nick });

            const embed = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ MODO EDIÇÃO").setDescription(`Membro: <@${uid}>`);
            const rowSel = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_${uid}`).setPlaceholder("Mudar Cargo...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`confirma_edit_${uid}_${cId}_${nick}`).setLabel("Confirmar e Aprovar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("cancelar").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [embed], components: [rowSel, rowBtns], ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sel")) {
            const uid = interaction.customId.split("_")[1];
            db_edicao.get(uid).cA = interaction.values[0];
            return interaction.reply({ content: "✅ Cargo alterado na memória!", ephemeral: true });
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
