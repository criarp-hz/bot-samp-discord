const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const TOKEN = process.env.TOKEN;
const DISCORD_CHANNEL_ID = '1472065290929180764';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent // Essencial para o bot ler o que voce escreve
    ]
});

const app = express();
app.use(express.json());

let messagesForSAMP = [];

// Quando voce digita no Discord
client.on("messageCreate", (message) => {
    if (message.author.bot || message.channel.id !== DISCORD_CHANNEL_ID) return;

    console.log(`Mensagem recebida no Discord: ${message.content}`);
    
    // Adiciona para o SAMP buscar (Sem acentos na confirmacao interna)
    messagesForSAMP.push({ text: message.content });
});

app.post("/message", (req, res) => {
    const { type, text } = req.body;
    const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
    
    if (channel && text) {
        // Removemos acentos das mensagens que vao para o Discord tambem, se preferir
        const prefix = type === "status" ? "[INFO]" : "[SAMP]";
        channel.send(`${prefix} ${text}`);
    }
    res.sendStatus(200);
});

app.get("/fetch", (req, res) => {
    res.json({ messages: messagesForSAMP });
    messagesForSAMP = []; 
});

client.once("ready", () => {
    console.log("Bot conectado com sucesso no Discord!");
});

client.login(TOKEN);
app.listen(process.env.PORT || 3000, () => console.log("Servidor rodando!"));
