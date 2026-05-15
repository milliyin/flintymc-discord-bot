const Discord = require('discord.js');
const Schema = require("../../database/models/economy");

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const WHEEL = ['🟢', '🔴', '⚫', '🔴', '⚫', '🔴', '⚫', '🔴', '⚫', '🔴',
               '⚫', '🔴', '⚫', '🔴', '⚫', '🔴', '⚫', '🔴', '⚫', '🟢',
               '⚫', '🔴', '⚫', '🔴', '⚫', '🔴', '⚫', '🔴', '⚫', '🔴',
               '⚫', '🔴', '⚫', '🔴', '⚫', '🔴', '⚫'];

function spinEmbed(frame, bet, balance) {
    const frames = ['🎡 Spinning...', '🎡 S p i n n i n g . . .', '🎡  The ball is rolling...'];
    return new Discord.EmbedBuilder()
        .setTitle('🎡  R O U L E T T E')
        .setColor('#c0a000')
        .setDescription(`\`\`\`\n  ╔══════════════╗\n  ║  ${frames[frame % frames.length]}  ║\n  ╚══════════════╝\`\`\``)
        .addFields(
            { name: '💰 Bet', value: `$${bet.toLocaleString()}`, inline: true },
            { name: '🏦 Balance', value: `$${balance.toLocaleString()}`, inline: true },
        )
        .setFooter({ text: 'Placing your bet...' });
}

function resultEmbed(number, colorEmoji, colorName, bet, balance, won, amount) {
    const color = won ? '#00c853' : '#d50000';
    const result = won ? `✅ **+$${amount.toLocaleString()}**` : `❌ **-$${bet.toLocaleString()}**`;

    const display = [
        `╔═══════════════════╗`,
        `║  ${colorEmoji}  Number: **${number}**  ${colorEmoji}  ║`,
        `╚═══════════════════╝`,
    ].join('\n');

    return new Discord.EmbedBuilder()
        .setTitle('🎡  R O U L E T T E  —  Result')
        .setColor(color)
        .setDescription(display)
        .addFields(
            { name: '🎯 Landed on', value: `${colorEmoji} ${colorName} (${number})`, inline: true },
            { name: '💰 Bet', value: `$${bet.toLocaleString()}`, inline: true },
            { name: '🏦 New Balance', value: `$${balance.toLocaleString()}`, inline: true },
            { name: '​', value: result, inline: false },
        );
}

module.exports = async (client, interaction, args) => {
    const user = interaction.user;

    Schema.findOne({ Guild: interaction.guild.id, User: user.id }, async (err, data) => {
        if (!data) return client.errNormal({ error: `You don't have any coins!`, type: 'editreply' }, interaction);

        let colour = interaction.options.getString('color');
        const money = parseInt(interaction.options.getNumber('amount'));

        if (!colour || !money) return client.errUsage({ usage: 'roulette [color: red/black/green] [amount]', type: 'editreply' }, interaction);
        if (money > data.Money) return client.errNormal({ error: `You're betting more than you have!`, type: 'editreply' }, interaction);

        colour = colour.toLowerCase();
        let betColor;
        if (colour === 'r' || colour.startsWith('red')) betColor = 'red';
        else if (colour === 'b' || colour.startsWith('black')) betColor = 'black';
        else if (colour === 'g' || colour.startsWith('green')) betColor = 'green';
        else return client.errNormal({ error: `Invalid color! Use **red**, **black**, or **green**.`, type: 'editreply' }, interaction);

        // Spin animation
        await interaction.editReply({ embeds: [spinEmbed(0, money, data.Money)] });
        await wait(800);
        await interaction.editReply({ embeds: [spinEmbed(1, money, data.Money)] });
        await wait(800);
        await interaction.editReply({ embeds: [spinEmbed(2, money, data.Money)] });
        await wait(700);

        const number = Math.floor(Math.random() * 37); // 0–36
        let landedColor, colorEmoji;
        if (number === 0) { landedColor = 'green'; colorEmoji = '🟢'; }
        else if (number % 2 === 1) { landedColor = 'red'; colorEmoji = '🔴'; }
        else { landedColor = 'black'; colorEmoji = '⚫'; }

        const won = betColor === landedColor;
        let payout = 0;

        if (won) {
            if (betColor === 'green') payout = money * 14;       // 14x profit on green
            else if (betColor === 'red') payout = money;          // 1x profit
            else payout = money;                                   // 1x profit
            data.Money += payout;
        } else {
            data.Money -= money;
        }
        data.save();

        await interaction.editReply({
            embeds: [resultEmbed(number, colorEmoji, landedColor.toUpperCase(), money, data.Money, won, payout)]
        });
    });
};
