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
    console.log("🚀 Sistema Horizonte RP Totalmente Ativado.");
    const guild = client.guilds.cache.first();
    if (guild) {
        await guild.commands.set([
            { name: 'painel', description: 'Envia o painel de registro público.' },
            { name: 'configadm', description: 'Central de controle da Staff.' }
        ]);
    }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- COMANDO /PAINEL (Fiel ao seu Print) ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription('Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('iniciar_registro').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
            );
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Painel enviado!", ephemeral: true });
        }

        // --- COMANDO /CONFIGADM ---
        if (interaction.isChatInputCommand() && interaction.commandName === "configadm") {
            const embedAdm = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle("🛠️ PAINEL ADMINISTRATIVO")
                .setDescription("Selecione uma ação de gerenciamento.");
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("limpar").setLabel("Limpar Logs").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("status").setLabel("Status do Sistema").setStyle(ButtonStyle.Success)
            );
            return interaction.reply({ embeds: [embedAdm], components: [row], ephemeral: true });
        }

        // --- MODAL DE REGISTRO (CAMPOS NICK E CARGO) ---
        if (interaction.isButton() && interaction.customId === "iniciar_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número (1-6)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- RECEBIMENTO DO REGISTRO (NOVO REGISTRO PENDENTE) ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cNum = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cNum]) return interaction.reply({ content: "Cargo inválido.", ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31).setTitle("📩 NOVO REGISTRO PENDENTE")
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user}` },
                    { name: "🆔 Nick", value: `\`${nick}\`` },
                    { name: "💼 Cargo", value: `\`${cargos[cNum].nome}\`` }
                ).setFooter({ text: "Aguardando análise da Staff" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cNum}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${cNum}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`editar_p_${interaction.user.id}_${cNum}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Registro enviado com sucesso!", ephemeral: true });
        }

        // --- PAINEL DE EDIÇÃO (DINÂMICO PARA TODOS OS ESTADOS) ---
        if (interaction.isButton() && interaction.customId.startsWith("editar_")) {
            const [, status, uid, cId, nick] = interaction.customId.split("_");
            db.set(uid, { cAtu: cId, nAtu: nick, fase: status });

            const embedEdit = new EmbedBuilder()
                .setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO")
                .setDescription(`Membro: <@${uid}>\nStatus: **${status === 'p' ? 'Pendente' : 'Processado'}**`);

            const rowSelect = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId(`sel_${uid}`).setPlaceholder("Alterar Cargo...")
                    .addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k })))
            );

            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`confirmar_${uid}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`aprovar_acao_${uid}`).setLabel("Aprovar").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`cancelar`).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );

            return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
        }

        // --- LÓGICA DE APROVAR/ACEITAR (GERA O RELATÓRIO PROFISSIONAL) ---
        if (interaction.isButton() && (interaction.customId.startsWith("aceitar") || interaction.customId.startsWith("aprovar_acao") || interaction.customId.startsWith("confirmar"))) {
            const uid = interaction.customId.split("_").pop();
            const data = db.get(uid) || { cAtu: interaction.customId.split("_")[2], nAtu: interaction.customId.split("_")[3] };
            
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.add([cargos[data.cAtu].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${data.nAtu}`).catch(() => {});
            }

            const embedRelatorio = new EmbedBuilder()
                .setColor(0x00FF00).setTitle("✅ REGISTRO APROVADO - HORIZONTE RP")
                .setThumbnail(membro?.user.displayAvatarURL())
                .setDescription(`Prezado(a) **${data.nAtu}**, seu registro foi aprovado.`)
                .addFields(
                    { name: "💼 Cargo Assumido", value: `\`${cargos[data.cAtu].nome}\``, inline: true },
                    { name: "👮 Responsável", value: `${interaction.user}`, inline: true },
                    { name: "📅 Data/Hora", value: `\`${getData()}\``, inline: false }
                );

            const rowFinal = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`editar_a_${uid}_${data.cAtu}_${data.nAtu}`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
            );

            await interaction.update({ content: "Registro Processado.", embeds: [embedRelatorio], components: [rowFinal] });
            membro?.send({ embeds: [embedRelatorio] }).catch(() => {});
        }

        // --- REMOÇÃO (RELATÓRIO DE SAÍDA) ---
        if (interaction.isButton() && interaction.customId.startsWith("remover")) {
            const uid = interaction.customId.split("_")[1];
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            
            const embedSaida = new EmbedBuilder()
                .setColor(0xFF0000).setTitle("🚫 RELATÓRIO DE REMOÇÃO")
                .addFields(
                    { name: "👤 Membro", value: `<@${uid}>` },
                    { name: "👮 Responsável", value: `${interaction.user}` },
                    { name: "📅 Data de Saída", value: `\`${getData()}\`` }
                );

            if (membro) {
                await membro.roles.set([]).catch(() => {});
                membro.send("Sua saída do suporte foi registrada.").catch(() => {});
            }
            return interaction.update({ content: "Membro Removido.", embeds: [embedSaida], components: [] });
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
