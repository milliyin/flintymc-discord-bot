const Discord = require('discord.js');
const Schema = require("../../database/models/economy");

function rocketBar(multiplier, crashAt) {
    const progress = Math.min(multiplier / crashAt, 1);
    const filled = Math.round(progress * 12);
    const bar = '█'.repeat(filled) + '░'.repeat(12 - filled);
    return bar;
}

function rocketEmoji(multiplier) {
    if (multiplier < 2) return '🚀';
    if (multiplier < 4) return '🔥🚀';
    if (multiplier < 7) return '💥🔥🚀';
    return '☄️💥🔥🚀';
}

function crashEmbed(multiplier, profit, bet, balance, active, crashed) {
    const color = crashed ? '#d50000' : multiplier >= 3 ? '#ff9800' : '#00c853';
    const rocket = rocketEmoji(multiplier);
    const bar = rocketBar(multiplier, 12);

    const embed = new Discord.EmbedBuilder()
        .setTitle(`${crashed ? '💥' : rocket}  C R A S H`)
        .setColor(color)
        .setDescription(
            crashed
                ? `> 💥 **CRASH!** The rocket exploded at **${multiplier.toFixed(2)}x**!`
                : `> ${rocket} Rocket flying at **${multiplier.toFixed(2)}x**!\n> \`[${bar}]\``
        )
        .addFields(
            { name: '📈 Multiplier', value: `**${multiplier.toFixed(2)}x**`, inline: true },
            { name: '💰 Bet', value: `$${bet.toLocaleString()}`, inline: true },
            { name: '📊 Profit', value: profit >= 0 ? `+$${profit.toFixed(0)}` : `-$${Math.abs(profit).toFixed(0)}`, inline: true },
            { name: '🏦 Balance', value: `$${balance.toLocaleString()}`, inline: true },
        );

    if (crashed) embed.addFields({ name: '❌ Result', value: `-$${bet.toLocaleString()} — You lost.`, inline: false });
    return embed;
}

module.exports = async (client, interaction, args) => {
    const user = interaction.user;
    const crashAt = parseFloat((1 + Math.random() * 11).toFixed(2)); // 1.00 – 12.00

    Schema.findOne({ Guild: interaction.guild.id, User: user.id }, async (err, data) => {
        if (!data) return client.errNormal({ error: `You don't have any coins!`, type: 'editreply' }, interaction);

        const money = parseInt(interaction.options.getNumber('amount'));
        if (!money || money < 1) return client.errUsage({ usage: 'crash [amount]', type: 'editreply' }, interaction);
        if (money > data.Money) return client.errNormal({ error: `You're betting more than you have!`, type: 'editreply' }, interaction);

        const stopRow = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder()
                .setCustomId('crash_stop')
                .setLabel('Cash Out 💰')
                .setStyle(Discord.ButtonStyle.Success),
        );
        const disabledRow = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder()
                .setCustomId('crash_stop')
                .setLabel('Cash Out 💰')
                .setStyle(Discord.ButtonStyle.Success)
                .setDisabled(true),
        );

        let multiplier = 1.0;
        let stopped = false;
        let crashed = false;

        await interaction.editReply({
            embeds: [crashEmbed(multiplier, 0, money, data.Money, true, false)],
            components: [stopRow]
        });

        const filter = i => i.user.id === user.id && i.customId === 'crash_stop';
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: (crashAt * 2000) + 5000 });

        collector.on('collect', async i => {
            if (stopped || crashed) return;
            stopped = true;
            collector.stop();
            await i.deferUpdate();

            const profit = Math.floor(money * multiplier) - money;
            data.Money += Math.floor(money * multiplier);
            data.save();

            await interaction.editReply({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle('💰  C R A S H  —  Cashed Out')
                        .setColor('#00c853')
                        .setDescription(`> ✅ **Cashed out at ${multiplier.toFixed(2)}x** before crash at ${crashAt.toFixed(2)}x!`)
                        .addFields(
                            { name: '📈 Cashed at', value: `${multiplier.toFixed(2)}x`, inline: true },
                            { name: '💰 Profit', value: `+$${profit.toLocaleString()}`, inline: true },
                            { name: '🏦 New Balance', value: `$${data.Money.toLocaleString()}`, inline: true },
                        )
                ],
                components: [disabledRow]
            });
        });

        const tick = setInterval(async () => {
            if (stopped) { clearInterval(tick); return; }

            multiplier = parseFloat((multiplier + 0.2).toFixed(2));

            if (multiplier >= crashAt) {
                clearInterval(tick);
                if (!stopped) {
                    crashed = true;
                    collector.stop();
                    data.Money -= money;
                    data.save();

                    await interaction.editReply({
                        embeds: [crashEmbed(crashAt, -money, money, data.Money, false, true)],
                        components: [disabledRow]
                    });
                }
                return;
            }

            const profit = Math.floor(money * multiplier) - money;
            await interaction.editReply({
                embeds: [crashEmbed(multiplier, profit, money, data.Money, true, false)],
                components: [stopRow]
            }).catch(() => {});
        }, 2000);
    });
};
