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

// ===================== REGISTRO DE COMANDOS =====================
client.once("ready", async () => {
    try {
        // Registra o comando /painel globalmente para evitar o erro de "Não respondeu"
        await client.application.commands.set([
            { name: 'painel', description: 'Envia o painel oficial de registro.' }
        ]);
        console.log(`✅ Bot Online: ${client.user.tag} | Comando /painel registrado.`);
    } catch (err) {
        console.error("Erro ao registrar comandos:", err);
    }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- TRATAMENTO DO COMANDO /PAINEL ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            // Resposta imediata para evitar "O aplicativo não respondeu"
            const embedPainel = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO - HORIZONTE RP')
                .setDescription('Clique no botão abaixo para iniciar seu formulário de registro.\n\n**Atenção:** Siga as orientações da sua coordenação.');
            
            const btn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abrir_registro').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
            );

            return await interaction.reply({ embeds: [embedPainel], components: [btn] });
        }

        // --- ABRIR MODAL ---
        if (interaction.isButton() && interaction.customId === "abrir_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Ex: João Silva").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("NÚMERO DO CARGO (1-6)").setPlaceholder("Digite o número correspondente").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- RECEBER FORMULÁRIO (LOG PENDENTE) ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "❌ Use apenas números de 1 a 6.", ephemeral: true });

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

        // --- SISTEMA DE EDIÇÃO (CORREÇÃO DE RESPOSTA) ---
        if (interaction.isButton() && interaction.customId.startsWith("edit_painel")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            db_sessao.set(uid, { cA: cId, nA: nick });

            const editEmbed = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ MODO EDIÇÃO")
                .setDescription(`Editando: <@${uid}>\n**Nick:** ${nick}\n**Cargo:** ${cargos[cId].nome}`);

            const rowSel = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_c_${uid}`).setPlaceholder("Trocar Cargo...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`edit_n_modal_${uid}`).setLabel("Mudar Nick").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`aceitar_${uid}_${cId}_${nick}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("cancelar").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );

            // Se já foi respondido antes (em botões de log), usamos followUp ou update
            return interaction.reply({ embeds: [editEmbed], components: [rowSel, rowBtns], ephemeral: true });
        }

        // --- ACEITAR / FINALIZAR (IGUAL AO SEU PRINT) ---
        if (interaction.isButton() && interaction.customId.startsWith("aceitar")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            const d = db_sessao.get(uid) || { cA: cId, nA: nick };

            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.add([cargos[d.cA].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${d.nA}`).catch(() => {});

                // DM PROFISSIONAL (Visual do Print)
                const embedDM = new EmbedBuilder().setColor(0x43b581).setTitle("✅ REGISTRO APROVADO")
                    .setDescription(`Prezado(a) **${d.nA}**,\n\nSeu registro foi analisado e **APROVADO**.`)
                    .addFields(
                        { name: "💼 Cargo", value: `${cargos[d.cA].nome}`, inline: true },
                        { name: "👮 Responsável", value: `${interaction.user.username}`, inline: true }
                    ).setFooter({ text: "Horizonte RP" });
                await membro.send({ embeds: [embedDM] }).catch(() => {});
            }

            // Log de Registro Atualizado (Visual do Print)
            const logFinal = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 REGISTRO ATUALIZADO (EDITADO)")
                .addFields(
                    { name: "Usuário", value: `<@${uid}>` },
                    { name: "Nick", value: `${d.nA}` },
                    { name: "Cargo", value: `${cargos[d.cA].nome}` },
                    { name: "Responsável", value: `${interaction.user.username}` }
                );

            return interaction.update({ embeds: [logFinal], components: [] });
        }

    } catch (e) {
        console.error("Erro na interação:", e);
        if (!interaction.replied) interaction.reply({ content: "Houve um erro interno.", ephemeral: true }).catch(() => {});
    }
});

client.login(TOKEN);
