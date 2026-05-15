const Discord = require('discord.js');
const Schema = require("../../database/models/economy");

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Multiplier per survived pull
const MULTIPLIERS = [1.5, 2.0, 3.0, 5.0, 10.0];

function chamberDisplay(pulled, total = 6) {
    let out = '';
    for (let i = 0; i < total; i++) {
        if (i < pulled) out += '`✓` ';
        else out += '`?` ';
    }
    return out;
}

function rrEmbed(user, pulled, bet, balance, status, multiplier) {
    const remaining = 6 - pulled;
    const survivalOdds = remaining > 0 ? Math.round(((remaining - 1) / remaining) * 100) : 0;
    const nextMult = MULTIPLIERS[pulled] || 10;

    let color = '#2c2f33';
    let desc = '';

    if (status === 'playing') {
        desc = [
            `> 🔫 **${user.username}** raises the revolver...`,
            ``,
            `**Chambers:** ${chamberDisplay(pulled)}`,
            ``,
            `📊 Odds of survival this pull: **${survivalOdds}%**`,
            `💎 Cash out now: **${multiplier ? multiplier + 'x' : '—'}**`,
            `⬆️ Next multiplier if survive: **${nextMult}x**`,
        ].join('\n');
    } else if (status === 'dead') {
        color = '#d50000';
        desc = [
            `> 💥 **BANG!**`,
            ``,
            `The bullet was loaded. **${user.username}** didn't make it.`,
            `**Chambers cleared:** ${chamberDisplay(pulled)}`,
        ].join('\n');
    } else if (status === 'survived') {
        color = '#ff9800';
        desc = [
            `> *click* — Empty chamber!`,
            ``,
            `**${user.username}** survived pull **#${pulled}**!`,
            `**Chambers:** ${chamberDisplay(pulled)}`,
        ].join('\n');
    } else if (status === 'walkaway') {
        color = '#00c853';
        desc = `> 🏃 **${user.username}** wisely pocketed the winnings and walked away.`;
    }

    const embed = new Discord.EmbedBuilder()
        .setTitle('🔫  R U S S I A N  R O U L E T T E')
        .setColor(color)
        .setDescription(desc)
        .addFields(
            { name: '💰 Bet', value: `$${bet.toLocaleString()}`, inline: true },
            { name: '🏦 Balance', value: `$${balance.toLocaleString()}`, inline: true },
        );

    if (multiplier && status !== 'dead') {
        const cashout = Math.floor(bet * multiplier);
        embed.addFields({ name: '💎 Current Multiplier', value: `${multiplier}x  (+$${(cashout - bet).toLocaleString()})`, inline: false });
    }

    return embed;
}

module.exports = async (client, interaction, args) => {
    const user = interaction.user;

    Schema.findOne({ Guild: interaction.guild.id, User: user.id }, async (err, data) => {
        if (!data) return client.errNormal({ error: `You don't have any coins!`, type: 'editreply' }, interaction);

        const money = parseInt(interaction.options.getNumber('amount'));
        if (!money || money < 1) return client.errUsage({ usage: 'russianroulette [amount]', type: 'editreply' }, interaction);
        if (money > data.Money) return client.errNormal({ error: `You're betting more than you have!`, type: 'editreply' }, interaction);

        // Bullet is at a random chamber 0–5
        const bulletAt = Math.floor(Math.random() * 6);
        let pulled = 0;
        let gameOver = false;
        let currentMult = null;

        const makeRows = (canWalkAway) => new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder()
                .setCustomId('rr_pull')
                .setLabel('Pull Trigger 🔫')
                .setStyle(Discord.ButtonStyle.Danger),
            ...(canWalkAway ? [
                new Discord.ButtonBuilder()
                    .setCustomId('rr_walk')
                    .setLabel(`Cash Out (${currentMult}x) 💰`)
                    .setStyle(Discord.ButtonStyle.Success),
            ] : [])
        );

        const disabledRow = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder().setCustomId('rr_pull').setLabel('Pull Trigger 🔫').setStyle(Discord.ButtonStyle.Danger).setDisabled(true),
            new Discord.ButtonBuilder().setCustomId('rr_walk').setLabel('Cash Out 💰').setStyle(Discord.ButtonStyle.Success).setDisabled(true),
        );

        await interaction.editReply({
            embeds: [rrEmbed(user, 0, money, data.Money, 'playing', null)],
            components: [makeRows(false)]
        });

        const filter = i => i.user.id === user.id && ['rr_pull', 'rr_walk'].includes(i.customId);
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (gameOver) return;
            await i.deferUpdate();

            if (i.customId === 'rr_walk' && currentMult) {
                gameOver = true;
                collector.stop();
                const cashout = Math.floor(money * currentMult);
                const profit = cashout - money;
                data.Money += profit;
                data.save();

                const e = rrEmbed(user, pulled, money, data.Money, 'walkaway', currentMult);
                e.addFields({ name: '✅ Cashed Out', value: `**${currentMult}x** — +$${profit.toLocaleString()}`, inline: false });
                await interaction.editReply({ embeds: [e], components: [disabledRow] });
                return;
            }

            if (i.customId === 'rr_pull') {
                if (pulled === bulletAt) {
                    // BANG
                    gameOver = true;
                    collector.stop();
                    data.Money -= money;
                    data.save();

                    await wait(600);
                    const e = rrEmbed(user, pulled, money, data.Money, 'dead', null);
                    e.addFields({ name: '❌ Lost', value: `-$${money.toLocaleString()}`, inline: false });
                    await interaction.editReply({ embeds: [e], components: [disabledRow] });
                } else {
                    pulled++;
                    currentMult = MULTIPLIERS[pulled - 1] || 10;

                    if (pulled >= 6) {
                        // Survived all 6 (bullet was never pulled — impossible normally but safety)
                        gameOver = true;
                        collector.stop();
                        const cashout = Math.floor(money * 20);
                        data.Money += cashout - money;
                        data.save();
                        const e = rrEmbed(user, pulled, money, data.Money, 'walkaway', 20);
                        e.setDescription('> 🏆 **IMPOSSIBLE!** You survived all 6 chambers!');
                        e.addFields({ name: '✅ Jackpot!', value: `20x — +$${(cashout - money).toLocaleString()}`, inline: false });
                        await interaction.editReply({ embeds: [e], components: [disabledRow] });
                        return;
                    }

                    await wait(400);
                    const e = rrEmbed(user, pulled, money, data.Money, 'survived', currentMult);
                    await interaction.editReply({ embeds: [e], components: [makeRows(true)] });

                    await wait(1000);
                    const e2 = rrEmbed(user, pulled, money, data.Money, 'playing', currentMult);
                    await interaction.editReply({ embeds: [e2], components: [makeRows(true)] });
                }
            }
        });

        collector.on('end', async (_, reason) => {
            if (!gameOver) {
                // Timeout — walk away with current mult or nothing
                gameOver = true;
                if (currentMult) {
                    const cashout = Math.floor(money * currentMult);
                    data.Money += cashout - money;
                    data.save();
                }
                await interaction.editReply({ components: [disabledRow] }).catch(() => {});
            }
        });
    });
};
