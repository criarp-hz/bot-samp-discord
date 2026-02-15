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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;

/* ========= CONFIGURAÇÃO ========= */

const CANAL_REGISTRO = '1472463885620609180';
const CANAL_APROVACAO = '1472464723738886346';

const CARGO_AUTO = '1472054758415138960';

const CARGOS = {
    "1": '1472055381713883187',
    "2": '1472055978911465673',
    "3": '1472056709349511263',
    "4": '1472057320799338639',
    "5": '1472058121529593906',
    "6": '1472058401394655355'
};

const TAG = '『Ⓗ¹』';

/* ========= BOT ONLINE ========= */

client.once('ready', () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
});

/* ========= CARGO AUTOMÁTICO AO ENTRAR ========= */

client.on(Events.GuildMemberAdd, async member => {
    try {
        await member.roles.add(CARGO_AUTO);
    } catch (err) {
        console.log('Erro ao dar cargo automático');
    }
});

/* ========= COMANDO PAINEL ========= */

client.on('messageCreate', async message => {

    if (message.content === '!painel') {

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📋 SISTEMA DE REGISTRO')
            .setDescription(
`Bem-vindo ao sistema de registro do servidor!

Para que tudo funcione corretamente, selecione e utilize apenas o cargo correspondente ao seu setor atual.

⚠️ **Usar cargo incorreto pode causar:**
• Erros no registro
• Problemas de permissão
• Penalidades administrativas

✅ Em caso de dúvida, procure um responsável do seu setor.`
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('registrar')
                .setLabel('📋 Registrar-se')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });

    }

});

/* ========= INTERAÇÕES ========= */

client.on(Events.InteractionCreate, async interaction => {

    /* BOTÃO REGISTRAR */
    if (interaction.isButton() && interaction.customId === 'registrar') {

        const modal = new ModalBuilder()
            .setCustomId('modal_registro')
            .setTitle('Registro de Membro');

        const nick = new TextInputBuilder()
            .setCustomId('nick')
            .setLabel('Nick')
            .setPlaceholder('Nome do seu personagem na cidade')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const cargo = new TextInputBuilder()
            .setCustomId('cargo')
            .setLabel('Cargo')
            .setPlaceholder('Digite o número do seu cargo')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nick),
            new ActionRowBuilder().addComponents(cargo)
        );

        return interaction.showModal(modal);
    }

    /* ENVIO DO FORMULÁRIO */
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro') {

        const nick = interaction.fields.getTextInputValue('nick');
        const cargoNum = interaction.fields.getTextInputValue('cargo');

        const embed = new EmbedBuilder()
            .setColor('Yellow')
            .setTitle('📋 Novo Registro')
            .setDescription(
`👤 Usuário: ${interaction.user}
🎮 Nick: ${nick}
📌 Cargo: ${cargoNum}`
            );

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aceitar_${interaction.user.id}_${nick}_${cargoNum}`)
                .setLabel('Aceitar')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`editar_${interaction.user.id}_${nick}_${cargoNum}`)
                .setLabel('Editar')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`recusar_${interaction.user.id}`)
                .setLabel('Recusar')
                .setStyle(ButtonStyle.Danger)
        );

        const canal = await client.channels.fetch(CANAL_APROVACAO);

        await canal.send({
            embeds: [embed],
            components: [botoes]
        });

        return interaction.reply({
            content: '✅ Registro enviado para aprovação!',
            ephemeral: true
        });
    }

    /* ACEITAR */
    if (interaction.isButton() && interaction.customId.startsWith('aceitar_')) {

        const dados = interaction.customId.split('_');

        const userId = dados[1];
        const nick = dados[2];
        const cargoNum = dados[3];

        const member = await interaction.guild.members.fetch(userId);

        const cargoId = CARGOS[cargoNum];

        if (!cargoId) {
            return interaction.reply({
                content: '❌ Cargo inválido.',
                ephemeral: true
            });
        }

        await member.roles.add(cargoId);

        await member.setNickname(`${TAG} ${nick}`);

        await member.send('✅ Seu registro foi aprovado!');

        await interaction.update({
            content: '✅ Registro aprovado',
            embeds: [],
            components: []
        });
    }

    /* RECUSAR */
    if (interaction.isButton() && interaction.customId.startsWith('recusar_')) {

        const userId = interaction.customId.split('_')[1];

        const member = await interaction.guild.members.fetch(userId);

        await member.send('❌ Seu registro foi recusado. Se acha que foi engano, envie novamente.');

        await interaction.update({
            content: '❌ Registro recusado',
            embeds: [],
            components: []
        });
    }

});

/* ========= LOGIN ========= */

client.login(TOKEN);
