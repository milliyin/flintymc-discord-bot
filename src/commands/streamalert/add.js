const Discord = require('discord.js');
const Schema = require("../../database/models/streamAlerts");

module.exports = async (client, interaction, args) => {
    const perms = await client.checkUserPerms({
        flags: [Discord.PermissionsBitField.Flags.ManageGuild],
        perms: [Discord.PermissionsBitField.Flags.ManageGuild]
    }, interaction);
    if (perms == false) return;

    const streamer = interaction.options.getString('streamer').toLowerCase().trim();
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');

    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
        return client.errNormal({
            error: `Twitch API keys not set! Add \`TWITCH_CLIENT_ID\` and \`TWITCH_CLIENT_SECRET\` to .env`,
            type: 'editreply'
        }, interaction);
    }

    const existing = await Schema.findOne({ Guild: interaction.guild.id, Streamer: streamer });
    if (existing) {
        return client.errNormal({
            error: `Alert for **${streamer}** already exists in this server!`,
            type: 'editreply'
        }, interaction);
    }

    await new Schema({
        Guild: interaction.guild.id,
        Channel: channel.id,
        Role: role.id,
        Streamer: streamer,
        IsLive: false,
    }).save();

    client.succNormal({
        text: `Stream alert added for **${streamer}**!`,
        fields: [
            { name: `🎮┆Streamer`, value: `[${streamer}](https://twitch.tv/${streamer})`, inline: true },
            { name: `📢┆Channel`, value: `${channel}`, inline: true },
            { name: `🔔┆Ping role`, value: `${role}`, inline: true },
        ],
        type: 'editreply'
    }, interaction);
};
