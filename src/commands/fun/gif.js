const Discord = require('discord.js');

module.exports = async (client, interaction, args) => {
    const msg = interaction.options.getString('text');
    if (!msg) return client.errUsage({ usage: "gif [text]", type: 'editreply' }, interaction);

    if (!process.env.GIPHY_TOKEN) return client.errNormal({ error: `GIPHY token not set!`, type: 'editreply' }, interaction);

    try {
        const giphy = require('giphy-api')(process.env.GIPHY_TOKEN);

        giphy.random({ tag: msg }, function (err, res) {
            if (err || !res || !res.data || !res.data.id) {
                return client.errNormal({ error: `No gif found for **${msg}**!`, type: 'editreply' }, interaction);
            }

            client.embed({
                title: `📺・${msg} Gif`,
                image: `https://media1.giphy.com/media/${res.data.id}/giphy.gif`,
                type: 'editreply'
            }, interaction);
        });
    } catch (e) {
        client.errNormal({ error: `Failed to fetch gif!`, type: 'editreply' }, interaction);
    }
}
