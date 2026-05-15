const { CommandInteraction, Client } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('streamalert')
        .setDescription('Manage Twitch stream alerts')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a Twitch stream alert')
                .addStringOption(option => option.setName('streamer').setDescription('Twitch username').setRequired(true))
                .addChannelOption(option => option.setName('channel').setDescription('Channel to post alerts in').setRequired(true))
                .addRoleOption(option => option.setName('role').setDescription('Role to ping when live').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a Twitch stream alert')
                .addStringOption(option => option.setName('streamer').setDescription('Twitch username to remove').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all stream alerts in this server')
        ),

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */

    run: async (client, interaction, args) => {
        await interaction.deferReply({ fetchReply: true });
        client.loadSubcommands(client, interaction, args);
    },
};
