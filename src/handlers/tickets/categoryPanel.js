const Discord = require('discord.js');
const ticketSchema = require("../../database/models/tickets");
const ticketChannels = require("../../database/models/ticketChannels");
const ticketMessageConfig = require("../../database/models/ticketMessage");

const categoryLabels = {
    'general-support': { name: 'General Support', emoji: '🔧' },
    'player-report': { name: 'Player Report', emoji: '🛡️' },
    'punishment-appeals': { name: 'Punishment Appeals', emoji: '📨' },
    'development-issue': { name: 'Development Issue', emoji: '💻' },
};

module.exports = async (client) => {
    client.on(Discord.Events.InteractionCreate, async (interaction) => {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'Bot_ticketcategory') return;

        if (!client.config.discord.allowedGuilds.includes(interaction.guildId)) return;

        const categoryValue = interaction.values[0];
        const category = categoryLabels[categoryValue];
        if (!category) return;

        await interaction.deferReply({ ephemeral: true });

        const existing = await ticketChannels.findOne({
            Guild: interaction.guild.id,
            creator: interaction.user.id,
            resolved: false
        });

        if (existing) {
            return interaction.editReply({
                embeds: [new Discord.EmbedBuilder()
                    .setDescription('❌ Ticket limit reached. You already have an open ticket.')
                    .setColor('#ED4245')]
            });
        }

        const ticketData = await ticketSchema.findOne({ Guild: interaction.guild.id });
        if (!ticketData) {
            return interaction.editReply({
                embeds: [new Discord.EmbedBuilder()
                    .setDescription('❌ Ticket system not configured. Run `/setup tickets` first.')
                    .setColor('#ED4245')]
            });
        }

        const ticketCategory = interaction.guild.channels.cache.get(ticketData.Category);
        const ticketRole = interaction.guild.roles.cache.get(ticketData.Role);
        const logsChannel = interaction.guild.channels.cache.get(ticketData.Logs);

        if (!ticketCategory || !ticketRole) {
            return interaction.editReply({
                embeds: [new Discord.EmbedBuilder()
                    .setDescription('❌ Ticket setup incomplete. Category or role missing.')
                    .setColor('#ED4245')]
            });
        }

        ticketData.TicketCount = (ticketData.TicketCount || 0) + 1;
        await ticketData.save();

        const ticketId = String(ticketData.TicketCount).padStart(4, '0');

        const perms = [
            Discord.PermissionsBitField.Flags.AddReactions,
            Discord.PermissionsBitField.Flags.SendMessages,
            Discord.PermissionsBitField.Flags.ViewChannel,
            Discord.PermissionsBitField.Flags.AttachFiles,
            Discord.PermissionsBitField.Flags.ReadMessageHistory,
        ];

        const channel = await interaction.guild.channels.create({
            name: `${categoryValue}-${ticketId}`,
            permissionOverwrites: [
                { deny: [Discord.PermissionsBitField.Flags.ViewChannel], id: interaction.guild.id },
                { allow: perms, id: interaction.user.id },
                { allow: perms, id: ticketRole.id },
            ],
            parent: ticketCategory.id
        });

        await new ticketChannels({
            Guild: interaction.guild.id,
            TicketID: ticketId,
            channelID: channel.id,
            creator: interaction.user.id,
            claimed: 'None'
        }).save();

        let openTicket = 'Thanks for creating a ticket! \nSupport will be with you shortly \n\n🔒 - Close ticket \n✋ - Claim ticket \n📝 - Save transcript \n🔔 - Send a notification';
        const msgConfig = await ticketMessageConfig.findOne({ Guild: interaction.guild.id });
        if (msgConfig) openTicket = msgConfig.openTicket;

        const actionRow = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder().setCustomId('Bot_closeticket').setEmoji('🔒').setStyle(Discord.ButtonStyle.Primary),
            new Discord.ButtonBuilder().setCustomId('Bot_claimTicket').setEmoji('✋').setStyle(Discord.ButtonStyle.Primary),
            new Discord.ButtonBuilder().setCustomId('Bot_transcriptTicket').setEmoji('📝').setStyle(Discord.ButtonStyle.Primary),
            new Discord.ButtonBuilder().setCustomId('Bot_noticeTicket').setEmoji('🔔').setStyle(Discord.ButtonStyle.Primary),
        );

        await client.embed({
            desc: openTicket,
            fields: [
                { name: '👤┆Creator', value: `${interaction.user}`, inline: true },
                { name: `${category.emoji}┆Category`, value: category.name, inline: true },
                { name: '⏰┆Created at', value: `<t:${(Date.now() / 1000).toFixed(0)}:F>`, inline: true },
            ],
            components: [actionRow],
            content: `${interaction.user}, ${ticketRole}`
        }, channel);

        if (logsChannel) {
            client.embed({
                title: '📝・Open ticket',
                desc: 'A new ticket has been created',
                fields: [
                    { name: '👤┆Creator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
                    { name: `${category.emoji}┆Category`, value: category.name, inline: false },
                    { name: '📂┆Channel', value: `${channel.name} → ${channel}`, inline: false },
                    { name: '⏰┆Created at', value: `<t:${(Date.now() / 1000).toFixed(0)}:F>`, inline: false },
                ],
            }, logsChannel);
        }

        interaction.editReply({
            embeds: [new Discord.EmbedBuilder()
                .setDescription(`✅ Ticket created: ${channel}`)
                .setColor('#57F287')]
        });
    }).setMaxListeners(0);
}
