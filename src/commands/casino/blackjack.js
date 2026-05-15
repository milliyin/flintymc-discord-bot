const Discord = require('discord.js');
const Schema = require("../../database/models/economy");

const SUITS = { b: '♠️', d: '♥️', g: '♦️', s: '♣️' };
const RED_SUITS = new Set(['d', 'g']);

function cardStr(card) {
    return `[${card.rank}${SUITS[card.suit]}]`;
}

function handStr(cards) {
    return cards.map(cardStr).join(' ');
}

function getHandValue(cards) {
    let sum = 0, aces = 0;
    for (const c of cards) {
        if (['J', 'Q', 'K'].includes(c.rank)) sum += 10;
        else if (c.rank === 'A') { sum += 11; aces++; }
        else sum += c.rank;
    }
    while (aces > 0 && sum > 21) { sum -= 10; aces--; }
    return sum;
}

function buildDeck() {
    const suits = ['b', 'd', 'g', 's'];
    const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    const deck = suits.flatMap(s => ranks.map(r => ({ rank: r, suit: s })));
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function bjEmbed(playerCards, dealerCards, dealerHidden, bet, balance, status) {
    const pScore = getHandValue(playerCards);
    const dScore = dealerHidden ? getHandValue([dealerCards[0]]) : getHandValue(dealerCards);

    let color = '#c0a000';
    if (status === 'win') color = '#00c853';
    else if (status === 'lose') color = '#d50000';
    else if (status === 'tie') color = '#5865F2';

    const dealerDisplay = dealerHidden
        ? `${cardStr(dealerCards[0])} [?]`
        : handStr(dealerCards);
    const dealerScoreDisplay = dealerHidden ? `${dScore}+?` : `${dScore}`;

    return new Discord.EmbedBuilder()
        .setTitle('♠️  B L A C K J A C K')
        .setColor(color)
        .addFields(
            {
                name: `🤖 Dealer  (${dealerScoreDisplay})`,
                value: `\`${dealerDisplay}\``,
                inline: false,
            },
            {
                name: `👤 You  (${pScore})`,
                value: `\`${handStr(playerCards)}\``,
                inline: false,
            },
            { name: '💰 Bet', value: `$${bet.toLocaleString()}`, inline: true },
            { name: '🏦 Balance', value: `$${balance.toLocaleString()}`, inline: true },
        );
}

module.exports = async (client, interaction, args) => {
    const user = interaction.user;

    Schema.findOne({ Guild: interaction.guild.id, User: user.id }, async (err, data) => {
        if (!data) return client.errNormal({ error: `You don't have any coins!`, type: 'editreply' }, interaction);

        const money = parseInt(interaction.options.getNumber('amount'));
        if (!money || money < 1) return client.errUsage({ usage: 'blackjack [amount]', type: 'editreply' }, interaction);
        if (money > data.Money) return client.errNormal({ error: `You're betting more than you have!`, type: 'editreply' }, interaction);

        const deck = buildDeck();
        let di = 0;
        const draw = () => deck[di++];

        const player = [draw(), draw()];
        const dealer = [draw(), draw()];

        const hitRow = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder().setCustomId('bj_hit').setLabel('Hit 🃏').setStyle(Discord.ButtonStyle.Primary),
            new Discord.ButtonBuilder().setCustomId('bj_stand').setLabel('Stand ✋').setStyle(Discord.ButtonStyle.Secondary),
        );
        const disabledRow = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder().setCustomId('bj_hit').setLabel('Hit 🃏').setStyle(Discord.ButtonStyle.Primary).setDisabled(true),
            new Discord.ButtonBuilder().setCustomId('bj_stand').setLabel('Stand ✋').setStyle(Discord.ButtonStyle.Secondary).setDisabled(true),
        );

        async function endGame(result, embed) {
            if (result === 'win') {
                data.Money += money;
                embed.addFields({ name: '✅ Result', value: `You **won** +$${money.toLocaleString()}!`, inline: false });
            } else if (result === 'lose') {
                data.Money -= money;
                embed.addFields({ name: '❌ Result', value: `You **lost** -$${money.toLocaleString()}.`, inline: false });
            } else {
                embed.addFields({ name: '🤝 Result', value: `**Tie!** Bet returned.`, inline: false });
            }
            data.save();
            await interaction.editReply({ embeds: [embed], components: [disabledRow] });
        }

        async function checkEnd(showDealer) {
            const ps = getHandValue(player);
            const ds = getHandValue(dealer);

            if (ps > 21) {
                const e = bjEmbed(player, dealer, false, money, data.Money - money, 'lose')
                    .setDescription('> 💥 Bust! You went over 21.');
                await endGame('lose', e);
                return true;
            }
            if (ps === 21) {
                const e = bjEmbed(player, dealer, false, money, data.Money + money, 'win')
                    .setDescription('> 🎉 Blackjack! You hit 21!');
                await endGame('win', e);
                return true;
            }
            if (showDealer) {
                // Dealer draws to 17
                while (getHandValue(dealer) < 17) dealer.push(draw());
                const ds2 = getHandValue(dealer);

                if (ds2 > 21 || ps > ds2) {
                    const e = bjEmbed(player, dealer, false, money, data.Money + money, 'win')
                        .setDescription(`> ✅ You beat the dealer! (${ps} vs ${ds2})`);
                    await endGame('win', e);
                } else if (ps < ds2) {
                    const e = bjEmbed(player, dealer, false, money, data.Money - money, 'lose')
                        .setDescription(`> ❌ Dealer wins! (${ps} vs ${ds2})`);
                    await endGame('lose', e);
                } else {
                    const e = bjEmbed(player, dealer, false, money, data.Money, 'tie')
                        .setDescription(`> 🤝 Tie! (${ps} vs ${ds2})`);
                    await endGame('tie', e);
                }
                return true;
            }
            return false;
        }

        // Initial deal — check for natural blackjack
        const initialEmbed = bjEmbed(player, dealer, true, money, data.Money, null)
            .setDescription('> Your turn. Hit for another card or Stand to hold.');
        await interaction.editReply({ embeds: [initialEmbed], components: [hitRow] });

        if (await checkEnd(false)) return;

        const filter = i => i.user.id === user.id && ['bj_hit', 'bj_stand'].includes(i.customId);
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 });

        collector.on('collect', async i => {
            await i.deferUpdate();

            if (i.customId === 'bj_hit') {
                player.push(draw());
                const embed = bjEmbed(player, dealer, true, money, data.Money, null)
                    .setDescription('> Hit! Choose again.');
                await interaction.editReply({ embeds: [embed], components: [hitRow] });
                if (await checkEnd(false)) collector.stop();
            } else {
                collector.stop('stand');
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'stand' || reason === 'time') {
                await checkEnd(true);
            }
        });
    });
};
