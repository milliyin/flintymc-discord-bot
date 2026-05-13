const Discord = require('discord.js');
const moment = require('moment');
const tz = require('moment-timezone');

const Schema = require("../../database/models/stats");

module.exports = async (client) => {
    try {
        setInterval(async () => {
            const data = await Schema.find();

            if (data) {
                data.forEach(async d => {
                    if (!d.TimeZone || !d.Time) return;
                    try {
                        const timeNow = moment().tz(d.TimeZone).format("HH:mm (z)");
                        const guild = client.guilds.cache.get(d.Guild);
                        if (!guild) return;

                        var channelName = await client.getTemplate(guild);
                        channelName = channelName.replace(`{emoji}`, "⏰")
                        channelName = channelName.replace(`{name}`, `${timeNow}`)

                        const channel = guild.channels.cache.get(d.Time)
                        if (!channel) return;
                        await channel.setName(channelName)
                    }
                    catch (e) { }
                })
            }
        }, 600000);
    }
    catch (err) { }
};