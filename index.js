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

const TOKEN = process.env.TOKEN;

const REGISTRO_CHANNEL = '1472463885620609180';
const APROVACAO_CHANNEL = '1472464723738886346';
const AUTO_ROLE = '1472054758415138960';

const ROLES = {
    1: '1472055381713883187',
    2: '1472055978911465673',
    3: '1472056709349511263',
    4: '1472057320799338639',
    5: '1472058121529593906',
    6: '1472058401394655355'
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});


// =========================
// CARGO AUTOMÁTICO AO ENTRAR
// =========================

client.on(Events.GuildMemberAdd, async member => {
    try {
        await member.roles.add(AUTO_ROLE);
    } catch (e) {
        console.log('Erro auto role', e);
    }
});


// =========================
// BOT ONLINE
// =========================

client.once('ready', () => {
    console.log(`✅ Bot online ${client.user.tag}`);
});


// =========================
// INTERAÇÕES
// =========================

client.on(Events.InteractionCreate, async interaction => {

    // BOTÃO REGISTRAR
    if (interaction.isButton() && interaction.customId === 'registrar') {

        const modal = new ModalBuilder()
            .setCustomId('formRegistro')
            .setTitle('Registro de Membro');

        const nick = new TextInputBuilder()
            .setCustomId('nick')
            .setLabel('Nick')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const cargo = new TextInputBuilder()
            .setCustomId('cargo')
            .setLabel('Cargo (1 até 6)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nick),
            new ActionRowBuilder().addComponents(cargo)
        );

        return interaction.showModal(modal);
    }


    // ENVIO FORMULÁRIO
    if (interaction.isModalSubmit() && interaction.customId === 'formRegistro') {

        const nick = interaction.fields.getTextInputValue('nick');
        const cargoNum = interaction.fields.getTextInputValue('cargo');

        if (!ROLES[cargoNum]) {
            return interaction.reply({
                content: '❌ Cargo inválido.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Novo Registro')
            .setColor('Yellow')
            .addFields(
                { name: 'Usuário', value: `<@${interaction.user.id}>` },
                { name: 'Nick', value: nick },
                { name: 'Cargo', value: cargoNum }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aceitar_${interaction.user.id}_${cargoNum}_${nick}`)
                .setLabel('Aceitar')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`recusar_${interaction.user.id}`)
                .setLabel('Recusar')
                .setStyle(ButtonStyle.Danger)
        );

        const canal = client.channels.cache.get(APROVACAO_CHANNEL);
        canal.send({ embeds: [embed], components: [row] });

        interaction.reply({
            content: '✅ Registro enviado para aprovação.',
            ephemeral: true
        });
    }


    // ACEITAR
    if (interaction.isButton() && interaction.customId.startsWith('aceitar')) {

        const data = interaction.customId.split('_');
        const userId = data[1];
        const cargoNum = data[2];
        const nick = data.slice(3).join('_');

        const member = await interaction.guild.members.fetch(userId);

        const roleId = ROLES[cargoNum];

        await member.roles.add(roleId);

        await member.setNickname(`『Ⓗ¹』${nick}`);

        try {
            member.send('✅ Seu registro foi aprovado!');
        } catch { }

        interaction.update({
            content: '✅ Registro aprovado',
            embeds: [],
            components: []
        });
    }


    // RECUSAR
    if (interaction.isButton() && interaction.customId.startsWith('recusar')) {

        const userId = interaction.customId.split('_')[1];

        const member = await interaction.guild.members.fetch(userId);

        try {
            member.send('❌ Seu registro foi recusado. Se acha que foi erro envie novamente.');
        } catch { }

        interaction.update({
            content: '❌ Registro recusado',
            embeds: [],
            components: []
        });
    }

});


// =========================
// COMANDO PARA ENVIAR PAINEL
// =========================

client.on(Events.MessageCreate, async msg => {

    if (msg.content === '!painel') {

        const embed = new EmbedBuilder()
            .setTitle('📋 SISTEMA DE REGISTRO')
            .setDescription(`
Bem-vindo ao sistema de registro do servidor!

Para que tudo funcione corretamente, selecione e utilize apenas o cargo correspondente ao seu setor atual.

⚠️ Usar cargo incorreto pode causar:
• Erros no registro
• Problemas de permissão
• Penalidades administrativas

✅ Em caso de dúvida, procure um responsável do seu setor.
`)
            .setColor('#5865F2');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('registrar')
                .setLabel('Registrar-se')
                .setStyle(ButtonStyle.Primary)
        );

        msg.channel.send({ embeds: [embed], components: [row] });
    }

});


client.login(TOKEN);
