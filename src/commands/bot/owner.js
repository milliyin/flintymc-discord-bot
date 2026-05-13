const Discord = require('discord.js');

module.exports = async (client, interaction, args) => {
    client.embed({
        title: `📘・Owner information`,
        desc: `____________________________`,
        thumbnail: client.user.avatarURL({ dynamic: true, size: 1024 }),
        fields: [{
            name: "👑┆Owner name",
            value: `FlintyMc`,
            inline: true,
        },
        {
            name: "🏷┆Discord tag",
            value: `FlintyMc`,
            inline: true,
        },
        {
            name: "🏢┆Organization",
            value: `FlintyMc`,
            inline: true,
        },
        {
            name: "🌐┆Website",
            value: `FlintyMc`,
            inline: true,
        }],
        type: 'editreply'
    }, interaction)
}

 