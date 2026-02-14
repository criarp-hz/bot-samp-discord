const WebSocket = require('ws');
const { Client, GatewayIntentBits } = require('discord.js');

const TOKEN = process.env.TOKEN;
const DISCORD_CHANNEL_ID = '1472065290929180764';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let luaSockets = [];

client.once('ready', () => {
    console.log(`[Bot] Online como ${client.user.tag}`);
});

// WebSocket server para receber mensagens do mod Lua
const wss = new WebSocket.Server({ port: 12345 });
wss.on('connection', ws => {
    console.log('[Bot] Mod Lua conectado');
    luaSockets.push(ws);

    ws.on('message', msg => {
        const canal = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if(canal) canal.send(`💬 [SAMP] ${msg}`);
    });

    ws.on('close', () => {
        luaSockets = luaSockets.filter(s => s !== ws);
        console.log('[Bot] Mod Lua desconectado');
    });
});

client.login(TOKEN);
