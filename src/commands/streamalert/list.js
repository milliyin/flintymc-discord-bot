const Schema = require("../../database/models/streamAlerts");

module.exports = async (client, interaction, args) => {
    const alerts = await Schema.find({ Guild: interaction.guild.id });

    if (!alerts || alerts.length === 0) {
        return client.errNormal({
            error: `No stream alerts set up in this server! Use \`/streamalert add\` to add one.`,
            type: 'editreply'
        }, interaction);
    }

    const fields = alerts.map(a => ({
        name: `🎮 ${a.Streamer}`,
        value: `📢 <#${a.Channel}> • 🔔 <@&${a.Role}> • ${a.IsLive ? '🔴 Live now' : '⚫ Offline'}`,
        inline: false,
    }));

    client.embed({
        title: `📡・Stream Alerts`,
        desc: `${alerts.length} alert(s) configured`,
        fields,
        type: 'editreply'
    }, interaction);
};
