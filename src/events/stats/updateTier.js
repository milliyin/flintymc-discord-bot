const Discord = require('discord.js');

const Schema = require("../../database/models/stats");

module.exports = async (client, guild) => {
    let tier = {
        "TIER_1": `1`,
        "TIER_2": `2`,
        "TIER_3": `3`,
        "NONE": `0`,
    }

    try {
        var channelName = await client.getTemplate(guild);
        channelName = channelName.replace(`{emoji}`, "🥇")
        channelName = channelName.replace(`{name}`, `Tier: ${tier[guild.premiumTier] || '0'}`)

        const data = await Schema.findOne({ Guild: guild.id });
        if (!data) return;
        const channel = guild.channels.cache.get(data.BoostTier)
        if (!channel) return;
        await channel.setName(channelName)
    }
    catch { }
};