module.exports = async (client, guild) => {
    if (!client.config.discord.allowedGuilds.includes(guild.id)) {
        guild.leave();
    }
}
