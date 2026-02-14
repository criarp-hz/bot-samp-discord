const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
app.use(express.json());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;

client.once('ready', () => {
    console.log(`Bot online: ${client.user.tag}`);
});

app.post('/chat', async (req, res) => {
    try {
        const { channelId, message } = req.body;
        const channel = await client.channels.fetch(channelId);

        if (channel) {
            channel.send(message);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.listen(3000, () => {
    console.log('API rodando na porta 3000');
});

client.login(TOKEN);
