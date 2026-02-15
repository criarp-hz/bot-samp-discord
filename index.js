const {
    Client,
    GatewayIntentBits,
    Partials,
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
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel]
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

const HIERARQUIA = [
    CARGOS.moderador,
    CARGOS.administrador,
    CARGOS.coordenador
];

function dataHora() {
    return new Date().toLocaleString("pt-BR");
}

async function aplicarCargo(member, roleId) {
    await member.roles.add(roleId);

    // Admin ganha moderador automático
    if (roleId === CARGOS.administrador) {
        if (!member.roles.cache.has(CARGOS.moderador)) {
            await member.roles.add(CARGOS.moderador);
        }
    }
}

client.once("ready", async () => {
    console.log(`✅ Bot online: ${client.user.tag}`);

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
        canal.send({ embeds: [embed], components: [row] });
    }
});

client.on(Events.GuildMemberAdd, async member => {
    try {
        await member.roles.add(CARGO_AUTO);
    } catch {}
});

client.on(Events.InteractionCreate, async interaction => {

    // BOTÃO REGISTRO
    if (interaction.isButton() && interaction.customId === "registrar") {

        const modal = new ModalBuilder()
            .setCustomId("modal_registro")
            .setTitle("Registro de Staff");

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

    // ENVIO REGISTRO
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

        const embed = new EmbedBuilder()
            .setTitle("✅ Registro Aprovado")
            .setDescription(`Seu registro foi aprovado por ${interaction.user}.`)
            .addFields(
                { name: "Data", value: dataHora() }
            )
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

        await aplicarCargo(member, CARGOS.moderador);

        const canalResposta = await client.channels.fetch(CANAL_RESPOSTA);

        await canalResposta.send({
            content: `<@${userId}>`,
            embeds: [embed],
            components: [painel]
        });

        try {
            await member.send({ embeds: [embed] });
        } catch {}

        await interaction.message.delete();

        return interaction.reply({
            content: "✅ Registro aprovado com sucesso.",
            ephemeral: true
        });
    }

    // RECUSAR
    if (interaction.isButton() && interaction.customId.startsWith("recusar_")) {

        const userId = interaction.customId.split("_")[1];
        const member = await interaction.guild.members.fetch(userId);

        const embed = new EmbedBuilder()
            .setTitle("❌ Registro Recusado")
            .setDescription(`Seu registro foi recusado por ${interaction.user}.`)
            .addFields(
                { name: "Data", value: dataHora() }
            )
            .setColor("Red");

        const canalResposta = await client.channels.fetch(CANAL_RESPOSTA);

        await canalResposta.send({
            content: `<@${userId}>`,
            embeds: [embed]
        });

        try {
            await member.send({ embeds: [embed] });
        } catch {}

        await interaction.message.delete();

        return interaction.reply({
            content: "❌ Registro recusado.",
            ephemeral: true
        });
    }

    // REMOVER
    if (interaction.isButton() && interaction.customId.startsWith("remover_")) {

        const userId = interaction.customId.split("_")[1];
        const member = await interaction.guild.members.fetch(userId);

        await member.kick("Remoção da staff");

        return interaction.reply({
            content: "🚫 Membro removido da staff.",
            ephemeral: true
        });
    }

    // EDITAR
    if (interaction.isButton() && interaction.customId.startsWith("editar_")) {

        const userId = interaction.customId.split("_")[1];

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`menu_editar_${userId}`)
            .setPlaceholder("Selecione uma opção")
            .addOptions([
                {
                    label: "Mudar Cargo",
                    value: "cargo"
                },
                {
                    label: "Mudar Apelido",
                    value: "nick"
                }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({
            content: "Selecione o que deseja editar:",
            components: [row],
            ephemeral: true
        });
    }

});
client.login(TOKEN);
