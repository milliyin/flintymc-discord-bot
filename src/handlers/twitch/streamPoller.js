const axios = require('axios');
const Discord = require('discord.js');
const Schema = require("../../database/models/streamAlerts");

let twitchToken = null;
let tokenExpiry = 0;

async function getTwitchToken() {
    if (twitchToken && Date.now() < tokenExpiry) return twitchToken;

    const res = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
        params: {
            client_id: process.env.TWITCH_CLIENT_ID,
            client_secret: process.env.TWITCH_CLIENT_SECRET,
            grant_type: 'client_credentials',
        }
    });

    twitchToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000;
    return twitchToken;
}

async function checkStreams(client) {
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return;

    try {
        const alerts = await Schema.find();
        if (!alerts || alerts.length === 0) return;

        const token = await getTwitchToken();
        const streamers = [...new Set(alerts.map(a => a.Streamer))];

        const res = await axios.get(`https://api.twitch.tv/helix/streams`, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`,
            },
            params: { user_login: streamers, first: 100 },
        });

        const liveStreams = new Map(res.data.data.map(s => [s.user_login.toLowerCase(), s]));

        for (const alert of alerts) {
            const streamData = liveStreams.get(alert.Streamer.toLowerCase());
            const isLive = !!streamData;

            if (isLive && !alert.IsLive) {
                // Went live — send alert
                alert.IsLive = true;
                await alert.save();

                const guild = client.guilds.cache.get(alert.Guild);
                if (!guild) continue;
                const channel = guild.channels.cache.get(alert.Channel);
                if (!channel) continue;

                const embed = new Discord.EmbedBuilder()
                    .setColor('#9146FF')
                    .setTitle(`🔴 ${streamData.user_name} is now live on Twitch!`)
                    .setURL(`https://twitch.tv/${alert.Streamer}`)
                    .setDescription(streamData.title || 'No title')
                    .addFields(
                        { name: '🎮 Game', value: streamData.game_name || 'Unknown', inline: true },
                        { name: '👥 Viewers', value: `${streamData.viewer_count.toLocaleString()}`, inline: true },
                    )
                    .setThumbnail(streamData.thumbnail_url.replace('{width}', '320').replace('{height}', '180'))
                    .setFooter({ text: `FlintyMC Stream Alerts` })
                    .setTimestamp();

                channel.send({
                    content: `<@&${alert.Role}>`,
                    embeds: [embed],
                });
            } else if (!isLive && alert.IsLive) {
                // Went offline — reset flag
                alert.IsLive = false;
                await alert.save();
            }
        }
    } catch (e) {
        // Silently fail — Twitch API may be temporarily unavailable
    }
}

module.exports = (client) => {
    // Check every 3 minutes
    setInterval(() => checkStreams(client), 180000);
    // Also check immediately on startup
    setTimeout(() => checkStreams(client), 10000);
};
