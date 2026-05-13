const Discord = require('discord.js');
const ticketSchema = require("../../database/models/tickets");

module.exports = async (client, interaction, args) => {
    const channel = interaction.options.getChannel('channel');

    ticketSchema.findOne({ Guild: interaction.guild.id }, async (err, data) => {
        if (!data) return client.errNormal({
            error: 'Run `/setup tickets` first!',
            type: 'editreply'
        }, interaction);

        const menu = new Discord.StringSelectMenuBuilder()
            .setCustomId('Bot_ticketcategory')
            .setPlaceholder('Make a selection')
            .addOptions([
                {
                    label: 'General Support',
                    description: 'Other issues',
                    emoji: '🔧',
                    value: 'general-support',
                },
                {
                    label: 'Player Report',
                    description: 'Report a player for breaking the rules',
                    emoji: '🛡️',
                    value: 'player-report',
                },
                {
                    label: 'Punishment Appeals',
                    description: 'Appeal a punishment',
                    emoji: '📨',
                    value: 'punishment-appeals',
                },
                {
                    label: 'Development Issue',
                    description: 'Report bugs or other issues on the server',
                    emoji: '💻',
                    value: 'development-issue',
                },
            ]);

        const row = new Discord.ActionRowBuilder().addComponents(menu);

        client.embed({
            title: 'Tickets',
            desc: 'Select a category to create a ticket in.',
            components: [row]
        }, channel);

        client.succNormal({
            text: `Ticket panel posted in ${channel}!`,
            type: 'editreply'
        }, interaction);
    });
}
