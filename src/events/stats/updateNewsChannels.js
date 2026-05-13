const Discord = require('discord.js');

const Schema = require("../../database/models/stats");

module.exports = async (client, channel, guild) => {
    if (channel.type ==  Discord.ChannelType.GuildAnnouncement) {
        try {
            var channelName = await client.getTemplate(guild);
            channelName = channelName.replace(`{emoji}`, "📢")
            channelName = channelName.replace(`{name}`, `News Channels: ${guild.channels.cache.filter(channel => channel.type ===  Discord.ChannelType.GuildAnnouncement).size || 0}`)

            const data = await Schema.findOne({ Guild: guild.id });
            if (!data) return;
            const changeChannel = guild.channels.cache.get(data.NewsChannels)
            if (!changeChannel) return;
            await changeChannel.setName(channelName)
        }
        catch { }
    }
};