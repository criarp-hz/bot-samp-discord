const WebSocket = require('ws');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

const TOKEN = process.env.TOKEN;
const DISCORD_CHANNEL_ID = '1472065290929180764'; // Seu canal

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Lista de conexões de mods Lua
let luaSockets = [];

client.once('ready', async () => {
    console.log(`Bot Discord online: ${client.user.tag}`);

    // Registrar comandos Slash
    const commands = [
        new SlashCommandBuilder().setName('mshz').setDescription('Ativa integração'),
        new SlashCommandBuilder()
            .setName('ms')
            .setDescription('Envia mensagem ao SAMP')
            .addStringOption(option => option.setName('mensagem').setDescription('Mensagem').setRequired(true))
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

// WebSocket server para mod Lua
const wss = new WebSocket.Server({ port: 12345 });
wss.on('connection', ws => {
    console.log('[Bot] Mod Lua conectado');
    luaSockets.push(ws);

    ws.on('message', msg => {
        // Toda mensagem do mod Lua vai para o Discord
        const canal = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if(canal) canal.send(`💬 [SAMP] ${msg}`);
    });

    ws.on('close', () => {
        luaSockets = luaSockets.filter(s => s !== ws);
        console.log('[Bot] Mod Lua desconectado');
    });
});

// Receber comando /ms do Discord
client.on('interactionCreate', async interaction => {
    if(!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if(commandName === 'mshz') {
        interaction.reply('🔗 Integração ativada! Use o mod no GTA.');
    }

    if(commandName === 'ms') {
        const mensagem = options.getString('mensagem');
        luaSockets.forEach(ws => ws.send(mensagem));
        interaction.reply(`💬 Mensagem enviada ao SAMP: ${mensagem}`);
    }
});

client.login(TOKEN);
