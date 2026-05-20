const { CommandInteraction, Client, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Build and send a custom embed")
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("Channel to send the embed in")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    run: async (client, interaction, args) => {
        await interaction.deferReply({ fetchReply: true, ephemeral: true });

        const perms = await client.checkPerms({
            flags: [PermissionsBitField.Flags.ManageMessages],
            perms: [PermissionsBitField.Flags.ManageMessages],
        }, interaction);
        if (perms == false) return;

        const targetChannel = interaction.options.getChannel("channel");

        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("embedSelect")
                .setPlaceholder("✏️ Select a field to edit...")
                .addOptions([
                    { emoji: "✏️", label: "Title",       description: "Set the embed title",       value: "title" },
                    { emoji: "💬", label: "Description", description: "Set the embed description", value: "description" },
                    { emoji: "🕵️", label: "Author",      description: "Set the embed author",      value: "author" },
                    { emoji: "🔻", label: "Footer",      description: "Set the embed footer",      value: "footer" },
                    { emoji: "🔳", label: "Thumbnail",   description: "Set a thumbnail URL",       value: "thumbnail" },
                    { emoji: "🖼️", label: "Image",       description: "Set a large image URL",     value: "image" },
                    { emoji: "🎨", label: "Color",       description: "Pick from preset colors",   value: "color" },
                    { emoji: "🕙", label: "Timestamp",   description: "Toggle timestamp",          value: "timestamp" },
                ])
        );

        const sendRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("send_embed")
                .setEmoji("✅")
                .setLabel("Send Embed")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("cancel_embed")
                .setEmoji("❌")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger),
        );

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.normal)
            .setDescription("Use the dropdown below to build your embed, then click **Send Embed**.");

        await interaction.editReply({ embeds: [embed], components: [selectRow, sendRow] });

        async function promptInput(promptText) {
            const prompt = await interaction.channel.send({ content: `📝 ${promptText} *(reply in this channel, 5 min timeout)*` });
            try {
                const collected = await interaction.channel.awaitMessages({
                    filter: m => m.author.id === interaction.user.id && !m.author.bot,
                    max: 1,
                    time: 300000,
                    errors: ["time"],
                });
                setTimeout(() => prompt.delete().catch(() => {}), 500);
                setTimeout(() => collected.first().delete().catch(() => {}), 500);
                return collected.first().content;
            } catch {
                prompt.delete().catch(() => {});
                return null;
            }
        }

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 600000 });

        collector.on("collect", async i => {
            if (i.customId === "cancel_embed") {
                await i.deferUpdate();
                collector.stop();
                return interaction.editReply({ content: "Cancelled.", embeds: [], components: [] });
            }

            if (i.customId === "send_embed") {
                await i.deferUpdate();
                collector.stop();
                try {
                    await targetChannel.send({ embeds: [embed] });
                    await interaction.editReply({
                        content: `✅ Embed sent to ${targetChannel}!`,
                        embeds: [],
                        components: []
                    });
                } catch {
                    await interaction.editReply({ content: `❌ Failed to send — check bot permissions in ${targetChannel}.`, embeds: [], components: [] });
                }
                return;
            }

            if (i.customId === "embedColor") {
                await i.deferUpdate();
                embed.setColor(i.values[0]);
                return interaction.editReply({ embeds: [embed], components: [selectRow, sendRow] });
            }

            if (i.customId === "embedSelect") {
                await i.deferUpdate();
                const val = i.values[0];

                if (val === "timestamp") {
                    embed.setTimestamp();
                    return interaction.editReply({ embeds: [embed], components: [selectRow, sendRow] });
                }

                if (val === "color") {
                    const colorRow = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("embedColor")
                            .setPlaceholder("🎨 Pick a color...")
                            .addOptions([
                                { emoji: "🔴", label: "Red",        value: "#ED4245" },
                                { emoji: "🟠", label: "Orange",     value: "#E67E22" },
                                { emoji: "🟡", label: "Yellow",     value: "#F1C40F" },
                                { emoji: "🟢", label: "Green",      value: "#57F287" },
                                { emoji: "🔵", label: "Blue",       value: "#5865F2" },
                                { emoji: "🟣", label: "Purple",     value: "#9B59B6" },
                                { emoji: "🩷", label: "Pink",       value: "#EB459E" },
                                { emoji: "🩵", label: "Cyan",       value: "#1ABC9C" },
                                { emoji: "⚫", label: "Dark",       value: "#23272A" },
                                { emoji: "⚪", label: "White",      value: "#FFFFFF" },
                                { emoji: "🤍", label: "Light Gray", value: "#99AAB5" },
                                { emoji: "🟤", label: "Brown",      value: "#A0522D" },
                                { emoji: "🌸", label: "Blush",      value: "#FFB6C1" },
                                { emoji: "🌊", label: "Teal",       value: "#008080" },
                                { emoji: "✨", label: "Gold",       value: "#FFD700" },
                            ])
                    );
                    return interaction.editReply({ embeds: [embed], components: [colorRow, sendRow] });
                }

                const prompts = {
                    title:       "Enter the embed **title**:",
                    description: "Enter the embed **description** (supports markdown & newlines):",
                    author:      "Enter the **author name**:",
                    footer:      "Enter the **footer text**:",
                    thumbnail:   "Enter a **thumbnail image URL** (must start with https://):",
                    image:       "Enter a **large image URL** (must start with https://):",
                };

                const input = await promptInput(prompts[val]);
                if (!input) return;

                try {
                    if (val === "title")       embed.setTitle(input);
                    if (val === "description") embed.setDescription(input);
                    if (val === "author")      embed.setAuthor({ name: input, iconURL: interaction.guild.iconURL({ size: 1024 }) });
                    if (val === "footer")      embed.setFooter({ text: input });
                    if (val === "thumbnail")   embed.setThumbnail(input);
                    if (val === "image")       embed.setImage(input);
                } catch {
                    return interaction.channel.send({ content: `❌ Invalid value for **${val}**. Try again.` })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
                }

                await interaction.editReply({ embeds: [embed], components: [selectRow, sendRow] });
            }
        });

        collector.on("end", (_, reason) => {
            if (reason === "time") {
                interaction.editReply({ content: "⏰ Embed builder timed out.", embeds: [], components: [] }).catch(() => {});
            }
        });
    },
};
