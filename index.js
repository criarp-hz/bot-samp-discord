const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ================= CONFIG =================

const TAG = '『Ⓗ¹』';

// Cargo automático ao entrar
const AUTO_ROLE = '1472054758415138960';

// Cargos disponíveis
const ROLES = {
    'cargo1': '1472055381713883187',
    'cargo2': '1472055978911465673',
    'cargo4': '1472057320799338639',
    'cargo5': '1472058121529593906',
    'cargo6': '1472058401394655355'
};

// Canal onde ADM aceita
const STAFF_CHANNEL = '1472464723738886346';

// ===========================================

// Quando bot liga
client.once('ready', () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
});

// Cargo automático ao entrar
client.on(Events.GuildMemberAdd, async member => {
    try {
        await member.roles.add(AUTO_ROLE);
    } catch (e) {
        console.log('Erro ao dar cargo automático:', e);
    }
});

// ================= PAINEL COMANDO =================

client.on(Events.MessageCreate, async message => {

    if (message.author.bot) return;

    if (message.content === '!painel') {

        const embed = new EmbedBuilder()
            .setTitle('📋 Registro do Servidor')
            .setDescription('Clique no botão abaixo para iniciar seu registro.')
            .setColor('#00ff88');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('registrar')
                .setLabel('Registrar-se')
                .setStyle(ButtonStyle.Primary)
        );

        message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }

});

// ================= INTERAÇÕES =================

client.on(Events.InteractionCreate, async interaction => {

    // BOTÃO REGISTRAR
    if (interaction.isButton() && interaction.customId === 'registrar') {

        const modal = new ModalBuilder()
            .setCustomId('modal_registro')
            .setTitle('Registro');

        const nome = new TextInputBuilder()
            .setCustomId('nome')
            .setLabel('Nome do Personagem')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const cargo = new TextInputBuilder()
            .setCustomId('cargo')
            .setLabel('Cargo (cargo1, cargo2, cargo4...)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nome),
            new ActionRowBuilder().addComponents(cargo)
        );

        return interaction.showModal(modal);
    }

    // MODAL REGISTRO ENVIADO
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro') {

        const nome = interaction.fields.getTextInputValue('nome');
        const cargo = interaction.fields.getTextInputValue('cargo');

        const canalStaff = client.channels.cache.get(STAFF_CHANNEL);

        const embed = new EmbedBuilder()
            .setTitle('📥 Novo Registro')
            .addFields(
                { name: 'Usuário', value: `<@${interaction.user.id}>` },
                { name: 'Nome', value: nome },
                { name: 'Cargo', value: cargo }
            )
            .setColor('#ffaa00');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aceitar_${interaction.user.id}_${nome}_${cargo}`)
                .setLabel('Aceitar')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`editar_${interaction.user.id}`)
                .setLabel('Editar')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`recusar_${interaction.user.id}`)
                .setLabel('Recusar')
                .setStyle(ButtonStyle.Danger)
        );

        canalStaff.send({
            embeds: [embed],
            components: [row]
        });

        interaction.reply({
            content: '✅ Registro enviado para aprovação!',
            ephemeral: true
        });
    }

    // ================= ACEITAR =================

    if (interaction.isButton() && interaction.customId.startsWith('aceitar_')) {

        const parts = interaction.customId.split('_');

        const userId = parts[1];
        const nome = parts[2];
        const cargoKey = parts[3];

        const member = await interaction.guild.members.fetch(userId);

        const roleId = ROLES[cargoKey];

        if (!roleId) {
            return interaction.reply({
                content: '❌ Cargo inválido.',
                ephemeral: true
            });
        }

        await member.roles.add(roleId);
        await member.setNickname(`${TAG} ${nome}`);

        await interaction.reply({
            content: '✅ Jogador registrado com sucesso!',
            ephemeral: true
        });

        try {
            await member.send('✅ Seu registro foi aprovado!');
        } catch {}

    }

    // ================= RECUSAR =================

    if (interaction.isButton() && interaction.customId.startsWith('recusar_')) {

        const userId = interaction.customId.split('_')[1];
        const member = await interaction.guild.members.fetch(userId);

        try {
            await member.send('❌ Seu registro foi recusado. Se acha que foi engano, envie novamente.');
        } catch {}

        interaction.reply({
            content: '❌ Registro recusado.',
            ephemeral: true
        });
    }

    // ================= EDITAR =================

    if (interaction.isButton() && interaction.customId.startsWith('editar_')) {

        const userId = interaction.customId.split('_')[1];

        const modal = new ModalBuilder()
            .setCustomId(`modal_editar_${userId}`)
            .setTitle('Editar Registro');

        const nome = new TextInputBuilder()
            .setCustomId('nome')
            .setLabel('Novo Nome')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const cargo = new TextInputBuilder()
            .setCustomId('cargo')
            .setLabel('Novo Cargo')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nome),
            new ActionRowBuilder().addComponents(cargo)
        );

        interaction.showModal(modal);
    }

    // MODAL EDITAR ENVIADO
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_editar_')) {

        const userId = interaction.customId.split('_')[2];

        const nome = interaction.fields.getTextInputValue('nome');
        const cargoKey = interaction.fields.getTextInputValue('cargo');

        const roleId = ROLES[cargoKey];

        if (!roleId) {
            return interaction.reply({
                content: '❌ Cargo inválido.',
                ephemeral: true
            });
        }

        const member = await interaction.guild.members.fetch(userId);

        await member.roles.add(roleId);
        await member.setNickname(`${TAG} ${nome}`);

        await interaction.reply({
            content: '✅ Registro editado e aprovado!',
            ephemeral: true
        });

        try {
            await member.send('✅ Seu registro foi aprovado após edição!');
        } catch {}
    }

});

// ================= LOGIN =================

client.login(process.env.TOKEN);
