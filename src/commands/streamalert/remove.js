const Discord = require('discord.js');
const Schema = require("../../database/models/streamAlerts");

module.exports = async (client, interaction, args) => {
    const perms = await client.checkUserPerms({
        flags: [Discord.PermissionsBitField.Flags.ManageGuild],
        perms: [Discord.PermissionsBitField.Flags.ManageGuild]
    }, interaction);
    if (perms == false) return;

    const streamer = interaction.options.getString('streamer').toLowerCase().trim();

    const data = await Schema.findOneAndDelete({ Guild: interaction.guild.id, Streamer: streamer });
    if (!data) {
        return client.errNormal({
            error: `No alert found for **${streamer}** in this server!`,
            type: 'editreply'
        }, interaction);
    }

    client.succNormal({
        text: `Stream alert removed for **${streamer}**.`,
        type: 'editreply'
    }, interaction);
};
