const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    Events
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

const TOKEN = "SEU_TOKEN_AQUI";

const CANAL_REGISTRO = "ID_CANAL_REGISTRO";
const CANAL_ANALISE = "ID_CANAL_ANALISE";
const CANAL_RESPOSTA = "ID_CANAL_RESPOSTA";

const CARGO_AUTO = "1472054758415138960";

const CARGOS = {
    moderador: "ID_MODERADOR",
    administrador: "ID_ADMIN",
    coordenador: "ID_COORDENADOR"
};

function dataHora() {
    return new Date().toLocaleString("pt-BR");
}

async function aplicarCargo(member, roleId) {
    await member.roles.add(roleId);

    if (roleId === CARGOS.administrador) {
        if (!member.roles.cache.has(CARGOS.moderador)) {
            await member.roles.add(CARGOS.moderador);
        }
    }
}

client.once("ready", async () => {
    console.log(`✅ Online: ${client.user.tag}`);

    try {
        const canal = await client.channels.fetch(CANAL_REGISTRO);

        const embed = new EmbedBuilder()
            .setTitle("📋 Painel de Registro")
            .setDescription("Clique no botão abaixo para iniciar seu registro.")
            .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("registrar")
                .setLabel("Fazer Registro")
                .setStyle(ButtonStyle.Primary)
        );

        const mensagens = await canal.messages.fetch({ limit: 10 });
        const existe = mensagens.find(m => m.author.id === client.user.id);

        if (!existe) {
            await canal.send({
                embeds: [embed],
                components: [row]
            });
        }

    } catch (err) {
        console.log("Erro ao enviar painel:", err);
    }
});

client.on(Events.GuildMemberAdd, async member => {
    try {
        await member.roles.add(CARGO_AUTO);
    } catch (e) {
        console.log("Erro cargo auto:", e);
    }
});

client.on(Events.InteractionCreate, async interaction => {

    // BOTÃO REGISTRAR
    if (interaction.isButton() && interaction.customId === "registrar") {

        const modal = new ModalBuilder()
            .setCustomId("modal_registro")
            .setTitle("Registro Staff");

        const usuario = new TextInputBuilder()
            .setCustomId("usuario")
            .setLabel("Seu Nome")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const nick = new TextInputBuilder()
            .setCustomId("nick")
            .setLabel("Nick no Servidor")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const cargo = new TextInputBuilder()
            .setCustomId("cargo")
            .setLabel("Cargo Desejado")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(usuario),
            new ActionRowBuilder().addComponents(nick),
            new ActionRowBuilder().addComponents(cargo)
        );

        return interaction.showModal(modal);
    }

    // ENVIO MODAL
    if (interaction.isModalSubmit() && interaction.customId === "modal_registro") {

        const usuario = interaction.fields.getTextInputValue("usuario");
        const nick = interaction.fields.getTextInputValue("nick");
        const cargo = interaction.fields.getTextInputValue("cargo");

        const embed = new EmbedBuilder()
            .setTitle("📥 Novo Registro")
            .addFields(
                { name: "Usuário", value: usuario },
                { name: "Nick", value: nick },
                { name: "Cargo Desejado", value: cargo },
                { name: "Data", value: dataHora() }
            )
            .setColor("Yellow");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aprovar_${interaction.user.id}`)
                .setLabel("Aprovar")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`recusar_${interaction.user.id}`)
                .setLabel("Recusar")
                .setStyle(ButtonStyle.Danger)
        );

        const canal = await client.channels.fetch(CANAL_ANALISE);

        await canal.send({
            content: `<@${interaction.user.id}>`,
            embeds: [embed],
            components: [row]
        });

        return interaction.reply({
            content: "✅ Registro enviado para análise.",
            ephemeral: true
        });
    }

    // APROVAR
    if (interaction.isButton() && interaction.customId.startsWith("aprovar_")) {

        const userId = interaction.customId.split("_")[1];
        const member = await interaction.guild.members.fetch(userId);

        await aplicarCargo(member, CARGOS.moderador);

        const embed = new EmbedBuilder()
            .setTitle("✅ Registro Aprovado")
            .setDescription(`Aprovado por ${interaction.user}`)
            .addFields({ name: "Data", value: dataHora() })
            .setColor("Green");

        const painel = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`editar_${userId}`)
                .setLabel("Editar")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`remover_${userId}`)
                .setLabel("Remoção")
                .setStyle(ButtonStyle.Danger)
        );

        const canalResposta = await client.channels.fetch(CANAL_RESPOSTA);

        await canalResposta.send({
            content: `<@${userId}>`,
            embeds: [embed],
            components: [painel]
        });

        try { await member.send({ embeds: [embed] }); } catch {}

        await interaction.message.delete();

        return interaction.reply({
            content: "✅ Aprovado.",
            ephemeral: true
        });
    }

    // RECUSAR
    if (interaction.isButton() && interaction.customId.startsWith("recusar_")) {

        const userId = interaction.customId.split("_")[1];
        const member = await interaction.guild.members.fetch(userId);

        const embed = new EmbedBuilder()
            .setTitle("❌ Registro Recusado")
            .setDescription(`Recusado por ${interaction.user}`)
            .addFields({ name: "Data", value: dataHora() })
            .setColor("Red");

        const canalResposta = await client.channels.fetch(CANAL_RESPOSTA);

        await canalResposta.send({
            content: `<@${userId}>`,
            embeds: [embed]
        });

        try { await member.send({ embeds: [embed] }); } catch {}

        await interaction.message.delete();

        return interaction.reply({
            content: "❌ Recusado.",
            ephemeral: true
        });
    }

    // REMOVER
    if (interaction.isButton() && interaction.customId.startsWith("remover_")) {

        const userId = interaction.customId.split("_")[1];
        const member = await interaction.guild.members.fetch(userId);

        await member.kick("Remoção Staff");

        return interaction.reply({
            content: "🚫 Membro removido.",
            ephemeral: true
        });
    }

    // EDITAR MENU
    if (interaction.isButton() && interaction.customId.startsWith("editar_")) {

        const userId = interaction.customId.split("_")[1];

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`menu_${userId}`)
            .setPlaceholder("Selecione")
            .addOptions([
                { label: "Mudar Cargo", value: "cargo" },
                { label: "Mudar Apelido", value: "nick" }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
            content: "Escolha uma opção:",
            components: [row],
            ephemeral: true
        });
    }

    // MENU SELEÇÃO
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("menu_")) {

        const userId = interaction.customId.split("_")[1];
        const escolha = interaction.values[0];

        const member = await interaction.guild.members.fetch(userId);

        if (escolha === "nick") {

            const modal = new ModalBuilder()
                .setCustomId(`modal_nick_${userId}`)
                .setTitle("Alterar Apelido");

            const input = new TextInputBuilder()
                .setCustomId("novo_nick")
                .setLabel("Novo Apelido")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(input)
            );

            return interaction.showModal(modal);
        }

        if (escolha === "cargo") {

            await aplicarCargo(member, CARGOS.administrador);

            return interaction.reply({
                content: "✅ Cargo atualizado.",
                ephemeral: true
            });
        }
    }

    // MODAL NICK
    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_nick_")) {

        const userId = interaction.customId.split("_")[2];
        const novoNick = interaction.fields.getTextInputValue("novo_nick");

        const member = await interaction.guild.members.fetch(userId);

        await member.setNickname(novoNick);

        return interaction.reply({
            content: "✅ Apelido alterado.",
            ephemeral: true
        });
    }

});

client.login(TOKEN);
