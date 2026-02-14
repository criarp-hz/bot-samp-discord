const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const app = express();
app.use(express.json());

// Variáveis do bot
const TOKEN = process.env.TOKEN;
const CLIENT_ID = 'SEU_ID_DO_BOT_AQUI';
const GUILD_ID = 'SEU_ID_DO_SERVIDOR'; // importante para registrar comandos rapidamente
const CHANNEL_ID = '1472065290929180764';

let messagesForSAMP = [];
let lastMessageID = 0;

// Inicializa bot Discord
let client;

function startBot() {
    client = new Client({ 
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
    });

    // Registrar comandos de Slash Commands
    async function registerCommands() {
        const commands = [
            new SlashCommandBuilder().setName('mshz').setDescription('Ligar integracao'),
            new SlashCommandBuilder()
                .setName('ms')
                .setDescription('Enviar comando ao jogo')
                .addStringOption(opt => opt.setName('texto').setDescription('Mensagem ou /comando').setRequired(true))
        ].map(cmd => cmd.toJSON());

        const rest = new REST({ version: '10' }).setToken(TOKEN);
        try {
            console.log('[Bot] Registrando comandos...');
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            );
            console.log('[Bot] Comandos registrados com sucesso!');
        } catch (err) {
            console.error('[Bot] Erro ao registrar comandos:', err);
        }
    }

    // Interações Slash Commands
    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        await interaction.reply({ content: '✅ Processando...', ephemeral: true });

        if (interaction.commandName === 'mshz') {
            await interaction.followUp({ content: '🔗 Integração ativada!', ephemeral: true });
        } else if (interaction.commandName === 'ms') {
            const msg = interaction.options.getString('texto');
            messagesForSAMP.push({ id: ++lastMessageID, text: msg });
            await interaction.followUp({ content: `💬 Enviado: ${msg}`, ephemeral: true });
        }
    });

    // Endpoint para receber mensagens do SAMP via Lua
    app.post('/message', (req, res) => {
        try {
            const channel = client.channels.cache.get(CHANNEL_ID);
            if(channel) channel.send(`💬 **[SAMP]**: ${req.body.text}`);
            res.sendStatus(200);
        } catch(e) {
            console.error('[Bot] Erro no POST /message:', e);
            res.sendStatus(500);
        }
    });

    // Endpoint para o Lua buscar novas mensagens
    app.get('/fetch', (req, res) => {
        try {
            res.json({ messages: messagesForSAMP });
            messagesForSAMP = [];
        } catch(e) {
            console.error('[Bot] Erro no GET /fetch:', e);
            res.json({ messages: [] });
        }
    });

    // Tenta logar e reconectar automaticamente
    client.login(TOKEN).then(() => {
        console.log('[Bot] Bot online:', client.user.tag);

        registerCommands().catch(console.error);

        // Só inicia servidor HTTP depois do bot online
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`[Bot] Servidor HTTP rodando na porta ${PORT}`));
    }).catch(err => {
        console.error('[Bot] Falha ao logar:', err);
        console.log('[Bot] Tentando reconectar em 10 segundos...');
        setTimeout(startBot, 10000); // reconecta se falhar
    });

    // Reconectar automaticamente se cair
    client.on('shardDisconnect', () => {
        console.warn('[Bot] Conexão perdida! Reconectando...');
        setTimeout(startBot, 5000);
    });
}

// Inicia o bot pela primeira vez
startBot();
