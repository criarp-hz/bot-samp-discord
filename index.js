const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require('discord.js');

const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot Online'));
app.listen(3000, () => console.log('🌐 Web server ativo'));

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

const TOKEN = process.env.TOKEN;

// ===== IDs =====
const GUILD_ID = "SEU_GUILD_ID";

// cargos
const ROLES = {
    AJUDANTE: "ID_AJUDANTE",
    MODERADOR: "1472058121529593906",
    ADMIN: "1472058401394655355",
    COORDENADOR: "1472057320799338639",
    DIRECAO: "ID_DIRECAO",
    AUTO_ROLE: "1472054758415138960"
};

// ===== HIERARQUIA =====
const hierarchy = [
    ROLES.AJUDANTE,
    ROLES.MODERADOR,
    ROLES.ADMIN,
    ROLES.COORDENADOR,
    ROLES.DIRECAO
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// ================= READY =================

client.once('ready', () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
});

// ================= AUTO ROLE =================

client.on('guildMemberAdd', async member => {
    try {
        if (member.guild.id !== GUILD_ID) return;

        const role = member.guild.roles.cache.get(ROLES.AUTO_ROLE);
        if (!role) return;

        await member.roles.add(role).catch(() => null);

    } catch (err) {
        console.error(err);
    }
});

// ================= FUNÇÕES =================

function getDateTime() {
    return new Date().toLocaleString("pt-BR");
}

function getMemberHighest(member) {
    return hierarchy.find(r => member.roles.cache.has(r));
}

function canManage(staff, targetRole) {
    const staffIndex = hierarchy.indexOf(getMemberHighest(staff));
    const targetIndex = hierarchy.indexOf(targetRole);
    return staffIndex > targetIndex;
}

// ================= PAINEL REGISTRO =================

async function sendRegistroPanel(channel) {

    const embed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle("📋 SISTEMA DE REGISTRO")
        .setDescription(`
Bem-vindo ao sistema de registro do servidor.

Para que tudo funcione corretamente, selecione e utilize apenas o cargo correspondente ao seu setor atual.

⚠️ Usar cargo incorreto pode causar:
• Erros no registro  
• Problemas de permissão  
• Penalidades administrativas  

✅ Em caso de dúvida, procure um responsável do seu setor.
`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("registrar")
            .setLabel("Registrar-se")
            .setEmoji("📋")
            .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
}

// ================= INTERAÇÕES =================

client.on('interactionCreate', async interaction => {

    try {

        if (!interaction.guild) return;

        // ===== BOTÃO REGISTRAR =====

        if (interaction.isButton() && interaction.customId === "registrar") {

            const modal = new ModalBuilder()
                .setCustomId("modal_registro")
                .setTitle("Registro de Usuário");

            const nick = new TextInputBuilder()
                .setCustomId("nick")
                .setLabel("Nick")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const cargo = new TextInputBuilder()
                .setCustomId("cargo")
                .setLabel("Digite o número do seu cargo")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nick),
                new ActionRowBuilder().addComponents(cargo)
            );

            return interaction.showModal(modal);
        }

        // ===== ENVIO REGISTRO =====

        if (interaction.isModalSubmit() && interaction.customId === "modal_registro") {

            const nick = interaction.fields.getTextInputValue("nick");
            const cargoNum = interaction.fields.getTextInputValue("cargo");

            const embed = new EmbedBuilder()
                .setColor("Yellow")
                .setTitle("📥 Novo Registro")
                .addFields(
                    { name: "Usuário", value: `<@${interaction.user.id}>` },
                    { name: "Nick", value: nick },
                    { name: "Cargo", value: cargoNum },
                    { name: "Data", value: getDateTime() }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprovar_${interaction.user.id}`)
                    .setLabel("Aprovar")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId(`recusar_${interaction.user.id}`)
                    .setLabel("Recusar")
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({
                content: "✅ Registro enviado com sucesso.",
                ephemeral: true
            });

            return interaction.channel.send({
                embeds: [embed],
                components: [row]
            });
        }

        // ===== APROVAR =====

        if (interaction.isButton() && interaction.customId.startsWith("aprovar_")) {

            const userId = interaction.customId.split("_")[1];

            const guild = client.guilds.cache.get(GUILD_ID);
            if (!guild) return;

            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) return interaction.reply({ content: "Usuário não encontrado.", ephemeral: true });

            const staff = interaction.member;

            // exemplo: admin ganha moderador automático
            const roleAdmin = guild.roles.cache.get(ROLES.ADMIN);
            const roleMod = guild.roles.cache.get(ROLES.MODERADOR);

            if (roleAdmin && roleMod) {
                await member.roles.add(roleAdmin).catch(() => null);
                await member.roles.add(roleMod).catch(() => null);
            }

            await member.setNickname(member.user.username).catch(() => null);

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ Registro Aprovado")
                .addFields(
                    { name: "Usuário", value: `<@${member.id}>` },
                    { name: "Aprovado por", value: `<@${staff.id}>` },
                    { name: "Data", value: getDateTime() }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`editar_${member.id}`)
                    .setLabel("Editar")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId(`remover_${member.id}`)
                    .setLabel("Remoção")
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

            await member.send("✅ Seu registro foi aprovado com sucesso.").catch(() => null);

        }

        // ===== RECUSAR =====

        if (interaction.isButton() && interaction.customId.startsWith("recusar_")) {

            const userId = interaction.customId.split("_")[1];

            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ Registro Recusado")
                .addFields(
                    { name: "Usuário", value: `<@${userId}>` },
                    { name: "Responsável", value: `<@${interaction.user.id}>` },
                    { name: "Data", value: getDateTime() }
                );

            await interaction.update({
                embeds: [embed],
                components: []
            });

        }

        // ===== REMOVER =====

        if (interaction.isButton() && interaction.customId.startsWith("remover_")) {

            const userId = interaction.customId.split("_")[1];

            const guild = client.guilds.cache.get(GUILD_ID);
            if (!guild) return;

            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) return;

            await member.kick().catch(() => null);

            await interaction.reply({
                content: "🚫 Usuário removido com sucesso.",
                ephemeral: true
            });

        }

        // ===== EDITAR =====

        if (interaction.isButton() && interaction.customId.startsWith("editar_")) {

            const userId = interaction.customId.split("_")[1];

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`menu_edit_${userId}`)
                .setPlaceholder("Selecione uma opção")
                .addOptions([
                    {
                        label: "Mudar Cargo",
                        value: "cargo"
                    },
                    {
                        label: "Mudar Apelido",
                        value: "nick"
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(menu);

            return interaction.reply({
                content: "Selecione o que deseja alterar:",
                components: [row],
                ephemeral: true
            });
        }

    } catch (err) {
        console.error(err);
    }

});

// ================= LOGIN =================

client.login(TOKEN);
