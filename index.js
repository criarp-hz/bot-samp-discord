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

const memoriaEdicao = new Collection();

client.once("ready", async () => {
    console.log("🚀 Sistema Horizonte RP Online.");
    const guild = client.guilds.cache.first();
    if (guild) await guild.commands.set([{ name: 'painel', description: 'Envia o painel de registro.' }]);
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- COMANDO PAINEL (CONFORME PRINT 2) ---
        if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('SISTEMA DE REGISTRO')
                .setDescription('Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\nUsar cargo incorreto pode causar:\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\nEm caso de dúvida, procure um responsável do seu setor.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('iniciar_registro').setLabel('Registrar-se').setStyle(ButtonStyle.Primary)
            );
            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: "Painel enviado!", ephemeral: true });
        }

        // --- FORMULÁRIO (CONFORME PRINT 1) ---
        if (interaction.isButton() && interaction.customId === "iniciar_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem na cidade").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO").setPlaceholder("Digite o número do seu cargo").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- ENVIO DO REGISTRO (CONFORME PRINT 8/9) ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const numCargo = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[numCargo]) return interaction.reply({ content: "Cargo inválido.", ephemeral: true });

            const embedStaff = new EmbedBuilder()
                .setColor(0x2b2d31).setTitle("NOVO REGISTRO PENDENTE")
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: "Usuário", value: `${interaction.user}` },
                    { name: "Nick", value: `\`${nick}\`` },
                    { name: "Cargo", value: `\`${cargos[numCargo].nome}\`` }
                ).setFooter({ text: "Aguardando análise da Staff" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${numCargo}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edit_painel_${interaction.user.id}_${numCargo}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [embedStaff], components: [row] });
            return interaction.reply({ content: "Registro enviado!", ephemeral: true });
        }

        // --- BOTÃO EDITAR (ABRE PAINEL DE CONTROLE) ---
        if (interaction.isButton() && interaction.customId.startsWith("edit_painel")) {
            const [, , uid, cId, nick] = interaction.customId.split("_");
            memoriaEdicao.set(uid, { c: cId, n: nick });

            const embedEdit = new EmbedBuilder()
                .setColor(0x2b2d31).setTitle("REGISTRO ATUALIZADO (EDITADO)")
                .addFields(
                    { name: "Usuário", value: `<@${uid}>` },
                    { name: "Nick", value: `\`${nick}\`` },
                    { name: "Cargo", value: `\`${cargos[cId].nome}\`` }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${uid}_${cId}_${nick}`).setLabel("Editar / Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_cargo_${uid}`).setLabel("Recusar / Retirar Cargo").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`remover_expulsar_${uid}`).setLabel("Remoção (Expulsar)").setStyle(ButtonStyle.Secondary)
            );

            return interaction.reply({ embeds: [embedEdit], components: [row], ephemeral: true });
        }

        // --- LÓGICA FINAL (ACEITAR / RECUSAR / REMOVER) ---
        if (interaction.isButton() && interaction.customId.startsWith("aceitar")) {
            const [, uid, cId, nick] = interaction.customId.split("_");
            const membro = await interaction.guild.members.fetch(uid).catch(() => null);
            if (membro) {
                await membro.roles.add([cargos[cId].id, CARGO_AUTOMATICO]);
                await membro.setNickname(`${TAG_PREFIXO} ${nick}`).catch(() => {});
                membro.send("Seu registro foi aceito!").catch(() => {});
            }
            return interaction.update({ content: "Registro Aceito e Aplicado.", embeds: [], components: [] });
        }

        if (interaction.isButton() && interaction.customId.startsWith("recusar")) {
            const uid = interaction.customId.split("_")[1];
            return interaction.update({ content: "Registro Recusado.", embeds: [], components: [] });
        }

    } catch (e) { console.error(e); }
});

client.login(TOKEN);
