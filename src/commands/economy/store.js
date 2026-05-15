const Discord = require('discord.js');

const store = require("../../database/models/economyStore");

module.exports = async (client, interaction, args, message) => {
    store.find({ Guild: interaction.guild.id }, async (err, storeData) => {
        if (storeData && storeData.length > 0) {
            const lb = storeData.map(e => `**<@&${e.Role}>** - ${client.emotes.economy.coins} $${e.Amount} \n**To buy:** \`/economy buy\``);
            await client.createLeaderboard(`🛒・${interaction.guild.name}'s Store`, lb, interaction);
        }
        else {
            client.errNormal({
                error: `No items in the store! An admin can add items with \`/economy additem\`.`,
                type: 'editreply'
            }, interaction);
        }
    })
}

 