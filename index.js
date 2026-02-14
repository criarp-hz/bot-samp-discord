const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const app = express();
app.use(express.json());

// O bot vai pegar o TOKEN direto das variáveis da Railway
const TOKEN = process.env.TOKEN; 
const CLIENT_ID = 'SEU_ID_DO_BOT_AQUI'; 
const CHANNEL_ID = '1472065290929180764';

let messagesForSAMP = [];

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Comandos de Barra
const commands = [
    new SlashCommandBuilder().setName('mshz').setDescription('Ligar integracao'),
    new SlashCommandBuilder().setName('ms').setDescription('Enviar comando ao jogo')
        .addStringOption(opt => opt.setName('texto').setDescription('Mensagem ou /comando').setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // RESOLVE O ERRO "O APLICATIVO NAO RESPONDEU"
    await interaction.reply({ content: '✅ Processando...', ephemeral: true });

    if (interaction.commandName === 'mshz') {
        await interaction.followUp({ content: 'Integracao pronta!', ephemeral: true });
    } else if (interaction.commandName === 'ms') {
        const msg = interaction.options.getString('texto');
        messagesForSAMP.push({ text: msg });
        await interaction.followUp({ content: `Enviado: ${msg}`, ephemeral: true });
    }
});

app.post('/message', (req, res) => {
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) channel.send(`💬 **[SAMP]**: ${req.body.text}`);
    res.sendStatus(200);
});

app.get('/fetch', (req, res) => {
    res.json({ messages: messagesForSAMP });
    messagesForSAMP = [];
});

client.login(TOKEN);
app.listen(process.env.PORT || 3000, () => console.log("Servidor Online"));
