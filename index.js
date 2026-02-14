// index.js
const express = require("express");
const bodyParser = require("body-parser");
const { Client, GatewayIntentBits } = require("discord.js");

const TOKEN = process.env.TOKEN;
const DISCORD_CHANNEL_ID = '1472065290929180764';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const app = express();
app.use(bodyParser.json());

// Armazena mensagens do SAMP para enviar para o Lua
let messages = [];
let lastID = 0;

// Recebe mensagens do Lua (SAMP)
app.post("/message", (req, res) => {
    const { type, text } = req.body;
    const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
    if (type === "chat" && text) {
        if(channel) channel.send(`💬 [SAMP] ${text}`);
        messages.push({id: ++lastID, text}); // armazena para Lua buscar
    } else if (type === "status" && text) {
        if(channel) channel.send(`ℹ️ ${text}`);
    }
    res.sendStatus(200);
});

// Endpoint que o Lua vai consultar para receber mensagens
app.get("/fetch", (req, res) => {
    res.json({messages});
});

client.once("ready", () => {
    console.log(`Bot online: ${client.user.tag}`);
});

client.login(TOKEN);

// Inicia servidor HTTP
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor HTTP rodando na porta ${PORT}`));
