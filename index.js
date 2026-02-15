const { 
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
  TextInputStyle, Collection, StringSelectMenuBuilder, REST, Routes 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// ===================== CONFIGURAÇÕES =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "SEU_ID_DO_BOT_AQUI"; // <--- COLOQUE O ID DO SEU BOT AQUI
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

// ===================== REGISTRO DE COMANDOS (REST) =====================
const commands = [{ name: 'painel', description: 'Envia o painel oficial de registro.' }];
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔄 Atualizando comandos Slash...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Comandos Slash registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }
})();

client.on("interactionCreate", async (interaction) => {
    // PREVENÇÃO DE TIMEOUT: Resposta imediata para comandos
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "painel") {
            const embedPainel = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription('Bem-vindo ao sistema de registro!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.');
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abrir_registro').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
            );

            return await interaction.reply({ embeds: [embedPainel], components: [row] });
        }
    }

    try {
        // --- ABRIR FORMULÁRIO ---
        if (interaction.isButton() && interaction.customId === "abrir_registro") {
            const modal = new ModalBuilder().setCustomId("modal_reg").setTitle("Registro de Membro");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_nick").setLabel("NICK").setPlaceholder("Nome do seu personagem").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("m_cargo").setLabel("CARGO (1 a 6)").setPlaceholder("Digite o número do seu cargo (1-6)").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // --- RECEBER FORMULÁRIO (LOG IGUAL AO PRINT) ---
        if (interaction.isModalSubmit() && interaction.customId === "modal_reg") {
            const nick = interaction.fields.getTextInputValue("m_nick");
            const cId = interaction.fields.getTextInputValue("m_cargo");
            if (!cargos[cId]) return interaction.reply({ content: "⚠️ Cargo inválido! Use de 1 a 6.", ephemeral: true });

            const logEmbed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 NOVO REGISTRO PENDENTE")
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user}` },
                    { name: "🆔 Nick", value: `\`${nick}\`` },
                    { name: "💼 Cargo", value: `\`${cargos[cId].nome}\`` }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}_${cId}_${nick}`).setLabel("Aceitar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}_${nick}`).setLabel("Recusar").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edit_painel_${interaction.user.id}_${cId}_${nick}`).setLabel("Editar").setStyle(ButtonStyle.Secondary)
            );

            await client.channels.cache.get(APROVACAO_CANAL).send({ embeds: [logEmbed], components: [row] });
            return interaction.reply({ content: "✅ Registro enviado!", ephemeral: true });
        }

        // --- SISTEMA DE ACEITAR / EDITAR / RECUSAR ---
        if (interaction.isButton()) {
            const [acao, uid, cId, nick] = interaction.customId.split("_");

            if (acao === "aceitar") {
                const membro = await interaction.guild.members.fetch(uid).catch(() => null);
                if (membro) {
                    await membro.roles.add([cargos[cId].id, CARGO_AUTOMATICO]);
                    await membro.setNickname(`${TAG_PREFIXO} ${nick}`).catch(() => {});
                    
                    // DM PROFISSIONAL (IGUAL AO PRINT)
                    const dmEmbed = new EmbedBuilder().setColor(0x43b581).setTitle("✅ REGISTRO APROVADO")
                        .setDescription(`Prezado(a) **${nick}**,\n\nSeu registro foi analisado e **APROVADO**.`)
                        .addFields(
                            { name: "💼 Cargo Assumido", value: `${cargos[cId].nome}`, inline: true },
                            { name: "👮 Responsável", value: `${interaction.user.username}`, inline: true },
                            { name: "⏰ Horário", value: `${dataH()}` }
                        );
                    await membro.send({ embeds: [dmEmbed] }).catch(() => {});
                }

                const finalEmbed = new EmbedBuilder().setColor(0x2b2d31).setTitle("📥 REGISTRO CONCLUÍDO")
                    .addFields({ name: "Usuário", value: `<@${uid}>` }, { name: "Nick", value: `${nick}` }, { name: "Cargo", value: `${cargos[cId].nome}` }, { name: "Responsável", value: `${interaction.user.username}` });

                return interaction.update({ embeds: [finalEmbed], components: [] });
            }
        }
    } catch (e) {
        console.error(e);
        if (!interaction.replied) interaction.reply({ content: "Erro na operação.", ephemeral: true }).catch(() => {});
    }
});

client.login(TOKEN);
