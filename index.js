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

// ===================== COMANDOS =====================
client.once("ready", async () => {
    console.log("🚀 Sistema Horizonte RP: Modo Profissional Ativado.");
    const guild = client.guilds.cache.first();
    if (guild) await guild.commands.set([{ name: 'painel', description: 'Envia o painel de registro.' }]);
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. PAINEL INICIAL ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('📋 SISTEMA DE REGISTRO').setDescription('Seja bem-vindo ao suporte Horizonte RP.\n\nClique no botão abaixo para iniciar seu formulário de identificação.');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_modal').setLabel('Registrar-se').setStyle(ButtonStyle.Primary));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Painel enviado!", ephemeral: true });
        }

        // --- 2. MODAL ---
        if (interaction.isButton() && interaction.customId === "abrir_modal") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem").setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Número do cargo (1 a 6)").setStyle(TextInputStyle.Short))
            );
            return await interaction.showModal(modal);
        }

        // --- 3. ENVIO PENDENTE ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "Cargo inválido.", ephemeral: true });

            const embed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields({ name: "Usuário", value: `${interaction.user}` }, { name: "Nick", value: `\`${nick}\`` }, { name: "Cargo", value: `\`${cargos[cId].nome}\`` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${cId}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`editar_${interaction.user.id}_${cId}_${nick}_p`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );
            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Enviado!", ephemeral: true });
        }

        // --- 4. PAINEL DE EDIÇÃO ---
        if (interaction.isButton() && interaction.customId.startsWith("editar")) {
            const [, uid, cId, nick, status] = interaction.customId.split("_");
            db.set(uid, { cO: cId, cA: cId, nO: nick, nA: nick });

            const embedEdit = new EmbedBuilder().setColor(0xFFA500).setTitle("⚙️ PAINEL DE EDIÇÃO STAFF")
                .setDescription(`Editando: <@${uid}>\nStatus: ${status === 'p' ? 'Pendente' : 'Processado'}`);

            const rowSelect = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`sel_${uid}`).setPlaceholder("Mudar Cargo...").addOptions(Object.keys(cargos).map(k => ({ label: cargos[k].nome, value: k }))));
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`confirmar_${uid}`).setLabel("Confirmar e Aprovar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("cancelar").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            );
            return interaction.reply({ embeds: [embedEdit], components: [rowSelect, rowBtns], ephemeral: true });
        }

        // --- 5. LÓGICA DE APROVAR / RELATÓRIO PROFISSIONAL ---
        if (interaction.isButton() && (interaction.customId.startsWith("aceitar") || interaction.customId.startsWith("confirmar"))) {
            const uid = interaction.customId.split("_")[1];
            const d = db.get(uid) || { cA: interaction.customId.split("_")[2], nA: interaction.customId.split("_")[3], cO: interaction.customId.split("_")[2], nO: interaction.customId.split("_")[3] };
            
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.add([cargos[d.cA].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${d.nA}`).catch(() => {});
            }

            const relatorio = new EmbedBuilder().setColor(0x00FF00).setTitle("👑 RELATÓRIO DE REGISTRO - APROVADO")
                .setThumbnail(membro?.user.displayAvatarURL())
                .setDescription(`Prezado(a) **${d.nA}**, temos o prazer de informar que seu registro na equipe foi **CONCLUÍDO** com sucesso.`)
                .addFields(
                    { name: "💼 Cargo Solicitado", value: `\`${cargos[d.cO].nome}\``, inline: true },
                    { name: "💼 Cargo Atualizado", value: `\`${cargos[d.cA].nome}\``, inline: true },
                    { name: "👮 Responsável", value: `${interaction.user}`, inline: true },
                    { name: "⏰ Horário", value: `\`${dataH()}\``, inline: false }
                ).setFooter({ text: "Seja muito bem-vindo!" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`editar_${uid}_${d.cA}_${d.nA}_a`).setLabel("Editar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
            );

            await (interaction.isButton() && interaction.customId.startsWith("confirmar") ? interaction.update : interaction.update)({ embeds: [relatorio], components: [row] });
            membro?.send({ embeds: [relatorio] }).catch(() => {});
        }

        // --- 6. RECUSAR ---
        if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            const relatorioR = new EmbedBuilder().setColor(0xFF0000).setTitle("❌ RELATÓRIO DE REGISTRO - RECUSADO")
                .setDescription(`Prezado(a) **${nick}**, seu registro foi analisado e **RECUSADO** no momento.`)
                .addFields({ name: "👮 Responsável", value: `${interaction.user}` }, { name: "⏰ Horário", value: `\`${dataH()}\`` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`editar_${uid}_${cId}_${nick}_r`).setLabel("Editar / Reavaliar").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`remover_${uid}`).setLabel("Remoção").setStyle(ButtonStyle.Danger)
            );
            await interaction.update({ embeds: [relatorioR], components: [row] });
            const target = await interaction.guild.members.fetch(uid).catch(() => null);
            target?.send({ embeds: [relatorioR] }).catch(() => {});
        }

        // --- 7. REMOÇÃO ---
        if (interaction.isButton() && interaction.customId.startsWith("remover")) {
            const uid = interaction.customId.split("_")[1];
            const target = await interaction.guild.members.fetch(uid).catch(() => null);
            if (target) {
                target.send("🚨 Você foi removido do suporte Horizonte RP. Agradecemos seus serviços.").catch(() => {});
                await target.kick("Remoção via Painel").catch(() => {});
            }
            return interaction.update({ content: "🚫 Jogador Removido e Expulso.", embeds: [], components: [] });
        }

        if (interaction.isButton() && interaction.customId === "cancelar") return interaction.deleteReply();

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
