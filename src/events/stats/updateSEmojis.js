const Discord = require('discord.js');

const Schema = require("../../database/models/stats");

module.exports = async (client, emoji, guild) => {
    if (!emoji.animated) {
        try {
            let EmojiCount = 0;

            function Emoji(id) {
                return client.emojis.cache.get(id).toString();
            }

            guild.emojis.cache.forEach((emoji) => {
                if (!emoji.animated) {
                    EmojiCount++;
                }
            });

            var channelName = await client.getTemplate(guild);
            channelName = channelName.replace(`{emoji}`, "🤡")
            channelName = channelName.replace(`{name}`, `Static Emojis: ${EmojiCount || '0'}`)

            const data = await Schema.findOne({ Guild: guild.id });
            if (!data) return;
            const channel = guild.channels.cache.get(data.StaticEmojis)
            if (!channel) return;
            await channel.setName(channelName)
        }
        catch { }
    }
};