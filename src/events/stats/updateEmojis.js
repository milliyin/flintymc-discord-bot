const Discord = require('discord.js');

const Schema = require("../../database/models/stats");

module.exports = async (client, emoji, guild) => {
    try {
        var channelName = await client.getTemplate(guild);
        channelName = channelName.replace(`{emoji}`, "😛")
        channelName = channelName.replace(`{name}`, `Emojis: ${guild.emojis.cache.size || '0'}`)

        const data = await Schema.findOne({ Guild: guild.id });
        if (!data) return;
        const channel = guild.channels.cache.get(data.Emojis)
        if (!channel) return;
        await channel.setName(channelName)
    }
    catch { }
};