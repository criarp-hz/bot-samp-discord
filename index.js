const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const TOKEN = process.env.TOKEN;
const DISCORD_CHANNEL_ID = '1472065290929180764';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const app = express();
app.use(express.json());

let messagesForSAMP = []; // Fila de mensagens do Discord para o Jogo

// Quando alguém digita no Discord
client.on("messageCreate", (message) => {
    if (message.author.bot || message.channel.id !== DISCORD_CHANNEL_ID) return;
    
    // Adiciona na fila para o SAMP buscar
    messagesForSAMP.push({ text: message.content });
});

// SAMP envia mensagem para o Discord
app.post("/message", (req, res) => {
    const { type, text } = req.body;
    const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
    
    if (channel && text) {
        const prefix = type === "status" ? "ℹ️" : "💬 [SAMP]";
        channel.send(`${prefix} ${text}`);
    }
    res.sendStatus(200);
});

// SAMP busca mensagens novas do Discord
app.get("/fetch", (req, res) => {
    res.json({ messages: messagesForSAMP });
    messagesForSAMP = []; // Limpa a fila após o envio
});

client.login(TOKEN);
app.listen(process.env.PORT || 3000, () => console.log("Servidor rodando!"));
