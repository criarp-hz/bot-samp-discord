const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const WebSocket = require('ws');

// Configurações
const TOKEN = process.env.TOKEN;
const DISCORD_CHANNEL_ID = '1472065290929180764'; // Seu canal do Discord
const SAMP_WS_URL = 'ws://127.0.0.1:12345'; // Configure seu servidor SAMP

// Inicializa Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let integracaoAtivada = false; // Se o /mshz foi usado
let ws; // Conexão WebSocket com SAMP

client.once('ready', async () => {
    console.log(`Bot online: ${client.user.tag}`);

    // Registrar comandos slash
    const commands = [
        new SlashCommandBuilder()
            .setName('mshz')
            .setDescription('Ativa a integração SAMP ↔ Discord'),
        new SlashCommandBuilder()
            .setName('ms')
            .setDescription('Envia mensagem para o chat do SAMP')
            .addStringOption(option =>
                option.setName('mensagem')
                      .setDescription('Mensagem que será enviada')
                      .setRequired(true)
            )
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Comandos Slash registrados ✅');
    } catch (err) {
        console.error('Erro ao registrar comandos Slash:', err);
    }
});

// Receber comandos
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    // Ativar integração
    if (commandName === 'mshz') {
        if (!integracaoAtivada) {
            integracaoAtivada = true;
            interaction.reply('🔗 Integração SAMP ↔ Discord ativada com sucesso!');

            // Conecta no SAMP via WebSocket
            ws = new WebSocket(SAMP_WS_URL);

            ws.on('open', () => {
                console.log('Conexão com SAMP aberta ✅');
                const canal = client.channels.cache.get(DISCORD_CHANNEL_ID);
                if (canal) canal.send('🚀 Conexão com SAMP estabelecida! Chat ativo.');
            });

            ws.on('message', async (data) => {
                // Recebe mensagem do SAMP e envia para o Discord
                if (!integracaoAtivada) return;
                try {
                    const canal = await client.channels.fetch(DISCORD_CHANNEL_ID);
                    canal.send(`💬 [SAMP] ${data.toString()}`);
                } catch (err) {
                    console.error('Erro enviando mensagem para Discord:', err);
                }
            });

            ws.on('close', () => console.log('Conexão SAMP fechada ❌'));
            ws.on('error', console.error);
        } else {
            interaction.reply('ℹ️ Integração já está ativada!');
        }
    }

    // Enviar mensagem para SAMP
    if (commandName === 'ms') {
        if (!integracaoAtivada) return interaction.reply('⚠️ Use /mshz primeiro para ativar a integração');

        let mensagem = options.getString('mensagem');

        if (!mensagem) return interaction.reply('⚠️ Digite uma mensagem válida');

        try {
            if (mensagem.startsWith('/c ')) {
                ws.send(mensagem); // envia comando direto para SAMP
                interaction.reply(`✅ Comando enviado para SAMP: \`${mensagem}\``);
            } else {
                ws.send(mensagem); // envia mensagem normal
                interaction.reply(`💬 Mensagem enviada para o chat do SAMP: \`${mensagem}\``);
            }
        } catch (err) {
            console.error('Erro enviando para SAMP:', err);
            interaction.reply('❌ Erro ao enviar mensagem para o SAMP');
        }
    }
});

// Inicializa o bot no Discord
client.login(TOKEN);
