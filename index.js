const {
    Client,
    GatewayIntentBits,
    Partials,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const TOKEN = process.env.TOKEN;

/* ================= CONFIG ================= */

const TAG = "『Ⓗ¹』";

const CANAL_REGISTRO = "1472463885620609180";
const CANAL_APROVACAO = "1472464723738886346";

const CARGO_AUTO_ENTRAR = "1472054758415138960";

const CARGOS = {
    1: { id: "1472055381713883187", nome: "Ajudante", nivel: 1 },
    2: { id: "1472055978911465673", nome: "Moderador", nivel: 2 },
    3: { id: "1472056709349511263", nome: "Administrador", nivel: 3 },
    4: { id: "1472057320799338639", nome: "Coordenador(a)", nivel: 4 },
    5: { id: "1472058121529593906", nome: "Supervisor", nivel: 5 },
    6: { id: "1472058401394655355", nome: "Direção", nivel: 6 }
};

/* ================= CLIENT ================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

/* ================= FUNÇÕES ================= */

function dataHora() {
    return new Date().toLocaleString("pt-BR");
}

function getNivel(member) {
    let nivel = 0;
    for (const key in CARGOS) {
        if (member.roles.cache.has(CARGOS[key].id)) {
            nivel = Math.max(nivel, CARGOS[key].nivel);
        }
    }
    return nivel;
}

async function aplicarCargo(member, cargoNumero, nick) {

    const cargo = CARGOS[cargoNumero];

    await member.roles.add(cargo.id);

    if (cargoNumero == 3) {
        await member.roles.add(CARGOS[2].id);
    }

    await member.setNickname(`${TAG}${nick}`).catch(()=>{});
}

/* ================= REGISTRO AUTOMÁTICO COMANDOS ================= */

client.once("clientReady", async () => {

    console.log(`✅ Bot online: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName("painel")
            .setDescription("Enviar painel de registro")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON()
    ];

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
    );

    console.log("✅ Comandos registrados!");
});

/* ================= CARGO AUTOMÁTICO AO ENTRAR ================= */

client.on("guildMemberAdd", async member => {
    try {
        await member.roles.add(CARGO_AUTO_ENTRAR);
    } catch {}
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async interaction => {

    /* COMANDO PAINEL */

    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === "painel") {

            const embed = new EmbedBuilder()
                .setTitle("📋 Sistema de Registro")
                .setDescription(
`Bem-vindo ao sistema administrativo.

Clique no botão abaixo para iniciar seu registro.

Preencha corretamente todas as informações solicitadas.

Após o envio, aguarde a análise da administração.`
                )
                .setColor("#2b2d31");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("registrar")
                    .setLabel("Registrar-se")
                    .setStyle(ButtonStyle.Success)
            );

            const canal = await client.channels.fetch(CANAL_REGISTRO);

            await canal.send({ embeds: [embed], components: [row] });

            await interaction.reply({
                content: "✅ Painel enviado.",
                ephemeral: true
            });
        }
    }

    /* BOTÃO REGISTRAR */

    if (interaction.isButton()) {

        if (interaction.customId === "registrar") {

            const modal = new ModalBuilder()
                .setCustomId("modal_registro")
                .setTitle("Formulário de Registro");

            const nick = new TextInputBuilder()
                .setCustomId("nick")
                .setLabel("Nick")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const cargo = new TextInputBuilder()
                .setCustomId("cargo")
                .setLabel("Digite o número do seu cargo")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nick),
                new ActionRowBuilder().addComponents(cargo)
            );

            await interaction.showModal(modal);
        }
    }

    /* ENVIO FORMULÁRIO */

    if (interaction.isModalSubmit()) {

        if (interaction.customId === "modal_registro") {

            const nick = interaction.fields.getTextInputValue("nick");
            const cargoNumero = interaction.fields.getTextInputValue("cargo");

            const embed = new EmbedBuilder()
                .setTitle("📨 Novo Registro")
                .addFields(
                    { name: "Usuário", value: `${interaction.user}`, inline: true },
                    { name: "Nick", value: nick, inline: true },
                    { name: "Cargo Desejado", value: cargoNumero, inline: true },
                    { name: "Data", value: dataHora() }
                )
                .setColor("Yellow");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprovar_${interaction.user.id}_${cargoNumero}_${nick}`)
                    .setLabel("Aceitar")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId(`recusar_${interaction.user.id}`)
                    .setLabel("Recusar")
                    .setStyle(ButtonStyle.Danger)
            );

            const canal = await client.channels.fetch(CANAL_APROVACAO);

            await canal.send({
                embeds: [embed],
                components: [row]
            });

            await interaction.reply({
                content: "✅ Registro enviado para análise.",
                ephemeral: true
            });
        }
    }

    /* APROVAR */

    if (interaction.isButton() && interaction.customId.startsWith("aprovar_")) {

        const dados = interaction.customId.split("_");

        const userId = dados[1];
        const cargoNumero = Number(dados[2]);
        const nick = dados.slice(3).join("_");

        const member = await interaction.guild.members.fetch(userId);

        const nivelStaff = getNivel(interaction.member);
        const nivelAlvo = CARGOS[cargoNumero]?.nivel || 0;

        if (nivelStaff < nivelAlvo) {
            return interaction.reply({
                content: "❌ Você não pode aprovar alguém com cargo superior ao seu.",
                ephemeral: true
            });
        }

        await aplicarCargo(member, cargoNumero, nick);

        const embed = new EmbedBuilder()
            .setTitle("✅ Registro Aprovado")
            .setDescription(
`O seu registro foi aprovado com sucesso.

Cargo: ${CARGOS[cargoNumero].nome}
Responsável: ${interaction.user}

Data: ${dataHora()}`
            )
            .setColor("Green");

        await member.send({ embeds: [embed] }).catch(()=>{});

        await interaction.update({
            content: "✅ Registro aprovado.",
            embeds: [],
            components: []
        });
    }

    /* RECUSAR */

    if (interaction.isButton() && interaction.customId.startsWith("recusar_")) {

        const userId = interaction.customId.split("_")[1];

        const member = await interaction.guild.members.fetch(userId);

        const embed = new EmbedBuilder()
            .setTitle("❌ Registro Recusado")
            .setDescription(
`Seu registro foi recusado pela administração.

Caso acredite que houve erro, envie novamente.

Data: ${dataHora()}`
            )
            .setColor("Red");

        await member.send({ embeds: [embed] }).catch(()=>{});

        await interaction.update({
            content: "❌ Registro recusado.",
            embeds: [],
            components: []
        });
    }

});

/* ================= LOGIN ================= */

client.login(TOKEN);
