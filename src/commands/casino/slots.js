const Discord = require('discord.js');
const Schema = require("../../database/models/economy");

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🍉', '⭐', '💎', '7️⃣'];
const SPIN = '🎰';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const PAYOUTS = {
    '💎': 20, '7️⃣': 15, '⭐': 10,
    '🍇': 8, '🍉': 6, '🍊': 4, '🍋': 3, '🍒': 2
};

function roll() {
    const weights = [15, 10, 8, 6, 5, 4, 2, 1]; // common→rare
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
    }
    return 0;
}

function makeEmbed(s1, s2, s3, bet, balance, status, profit) {
    const isSpinning = s1 === SPIN || s2 === SPIN || s3 === SPIN;
    const color = isSpinning ? '#c0a000' : profit > 0 ? '#00c853' : profit < 0 ? '#d50000' : '#c0a000';

    const reelBar = `┃ ${s1}  ${s2}  ${s3} ┃`;
    const topBar  = `┏━━━━━━━━━━━━━━━┓`;
    const botBar  = `┗━━━━━━━━━━━━━━━┛`;

    const embed = new Discord.EmbedBuilder()
        .setTitle('🎰  S L O T S')
        .setColor(color)
        .setDescription(`\`\`\`\n${topBar}\n${reelBar}\n${botBar}\`\`\``)
        .addFields(
            { name: '💰 Bet', value: `$${bet.toLocaleString()}`, inline: true },
            { name: '🏦 Balance', value: `$${balance.toLocaleString()}`, inline: true },
        );

    if (status) embed.addFields({ name: '​', value: status, inline: false });
    if (isSpinning) embed.setFooter({ text: 'Spinning the reels...' });

    return embed;
}

module.exports = async (client, interaction, args) => {
    const user = interaction.user;

    Schema.findOne({ Guild: interaction.guild.id, User: user.id }, async (err, data) => {
        if (!data) return client.errNormal({ error: `You don't have any coins!`, type: 'editreply' }, interaction);

        const money = parseInt(interaction.options.getNumber('amount'));
        if (!money || money < 1) return client.errUsage({ usage: 'slots [amount]', type: 'editreply' }, interaction);
        if (money > data.Money) return client.errNormal({ error: `You're betting more than you have!`, type: 'editreply' }, interaction);

        // Spin animation
        await interaction.editReply({ embeds: [makeEmbed(SPIN, SPIN, SPIN, money, data.Money, null, 0)] });
        await wait(800);

        const f = [roll(), roll(), roll()];

        await interaction.editReply({ embeds: [makeEmbed(SYMBOLS[f[0]], SPIN, SPIN, money, data.Money, null, 0)] });
        await wait(600);
        await interaction.editReply({ embeds: [makeEmbed(SYMBOLS[f[0]], SYMBOLS[f[1]], SPIN, money, data.Money, null, 0)] });
        await wait(600);

        // Calculate result
        let profit = 0;
        let statusMsg = '';

        if (f[0] === f[1] && f[1] === f[2]) {
            // Jackpot
            const mult = PAYOUTS[SYMBOLS[f[0]]] || 2;
            profit = money * mult;
            data.Money += profit;
            statusMsg = `🎊 **JACKPOT! ${mult}x** — You won **+$${profit.toLocaleString()}**!`;
        } else if (f[0] === f[1] || f[0] === f[2] || f[1] === f[2]) {
            // Two match
            profit = money;
            data.Money += profit;
            statusMsg = `✅ **2x Match** — You won **+$${profit.toLocaleString()}**!`;
        } else {
            profit = -money;
            data.Money -= money;
            statusMsg = `❌ **No match** — You lost **$${money.toLocaleString()}**.`;
        }
        data.save();

        await interaction.editReply({
            embeds: [makeEmbed(SYMBOLS[f[0]], SYMBOLS[f[1]], SYMBOLS[f[2]], money, data.Money, statusMsg, profit)]
        });
    });
};
