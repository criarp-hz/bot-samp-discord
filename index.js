const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const app = express();
app.use(express.json());

const TOKEN = 'SEU_TOKEN_AQUI';
const CLIENT_ID = 'SEU_CLIENT_ID';
const CHANNEL_ID = '1472065290929180764';

let messagesForSAMP = [];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Comandos de Barra (Slash Commands)
const commands = [
    new SlashCommandBuilder().setName('mshz').setDescription('Ativa integracao com a cidade'),
    new SlashCommandBuilder().setName('ms').setDescription('Envia comando/mensagem para o jogo').addStringOption(opt => opt.setName('texto').setDescription('O que enviar').setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => { try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); } catch (e) { console.error(e); } })();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply({ ephemeral: true }); // ESSENCIAL PARA NAO DAR ERRO

    if (interaction.commandName === 'mshz') {
        await interaction.editReply("✅ Comando de ativacao enviado para a cidade!");
    } else if (interaction.commandName === 'ms') {
        const txt = interaction.options.getString('texto');
        messagesForSAMP.push({ text: txt });
        await interaction.editReply(`Enviando para o SAMP: ${txt}`);
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
