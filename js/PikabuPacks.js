// @ts-nocheck
// PikabuPacks.js — наборы за рубли в сборке Пикабу Игр (js/PikabuShop.js). Цены и названия товаров — в Студии
// (каталог CSV: coins_s 19 ₽, coins_m 49 ₽, coins_l 99 ₽, starter 29 ₽, no_ads 59 ₽), здесь — что игрок получает.
// Валюта — монеты движкового Shop (Shop.addCoins), предметы набора — лучшие «за рекламу» из каталога Shop.
PikabuShop.setup({
    colors: ['#00c2ff', '#ff4fa3'],
    ready: () => !!(typeof Shop !== 'undefined' && Shop.state && Shop.items().length && typeof Game !== 'undefined'),
    visible: () => Game.state === 'menu',
    persist: () => Shop._save('pikabu'),
    button: { corner: 'tr', x: 12, y: 280 },
    packs: [
        { id: 'coins_s', type: 'consumable', icon: '🪙', name: 'Горсть монет', desc: '8 000 монет на облики, следы и трассы', grant: () => Shop.addCoins(8000) },
        { id: 'coins_m', type: 'consumable', icon: '💰', name: 'Мешок монет', desc: '25 000 монет', grant: () => Shop.addCoins(25000) },
        { id: 'coins_l', type: 'consumable', icon: '🏆', name: 'Сундук монет', desc: '60 000 монет — хватит на самые дорогие предметы', best: true, grant: () => Shop.addCoins(60000) },
        {
            id: 'starter', type: 'non_consumable', icon: '🔥', name: 'Набор феникса', best: 'Один раз',
            desc: '12 000 монет, облик «Бездна», след «Феникс» и алмазная трасса',
            grant: () => Shop.addCoins(12000),
            apply: () => PikabuShop.shopGrant(['skin_void', 'trail_phoenix', 'track_diamond']),
        },
        { id: 'no_ads', type: 'non_consumable', icon: '🚫', name: 'Без рекламы', desc: 'Убирает рекламу между забегами навсегда. Награды за рекламу остаются', noAds: true },
    ],
});
