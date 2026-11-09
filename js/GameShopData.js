// GameShopData.js — данные магазина, подарка дня и колеса фортуны Number Merge Run.
// Вкладки: skin (материал числа), hat (GLB), face (GLB), trail (частицы), track (тема трассы), victory (эффект победы).
// Предмет: { id, tab, name:{ru,en}, rarity, price:{coins}|{ads}, ...вид }. Вид:
//   skin   — skin: def для GamePlayer.setSkin, fx?: { glow, sparkle, aura } (GameShop дорисовывает свечение)
//   hat/face — model: путь GLB (литерал: сборщик видит только их)
//   trail  — trail: опции app.fx.create (follow ставит GamePlayer), shape — форма частицы (SHOP_SHAPES)
//   track  — theme: top/chevron/shade/side/lip + skyTop/skyMid/skyHorizon + fog (GameLevel)
//   victory — layers: слои app.fx.create (at:[dx,dy,dz] от игрока, delay), icon: { style, shape, colors }
// Редкости: common < rare < epic < legendary < mythic (mythic добавлен в Shop.RARITIES ниже).
// Цены: common 800–2500, rare 4000–9000, epic 15000–30000, legendary 50000+; за рекламу 1/2/3/4/5 просмотров.

if (typeof Shop !== 'undefined') {
    // Мифический — выше легендарного: нужен и для порядка (maxRarity случайных наград), и для веса выпадения.
    if (Shop.RARITIES.indexOf('mythic') < 0) Shop.RARITIES.push('mythic');
    const w = /** @type {Record<string, number>} */ (Shop.RARITY_WEIGHT);
    if (!(w.mythic > 0)) w.mythic = 0.25;
}

/** Формы частиц и иконок: ops — слои SVG (viewBox 24) и те же пути для Path2D-текстуры частиц. */
const SHOP_SHAPES = {
    star: [{ d: 'M12 1.8l3 6.9 7.5.7-5.7 5 1.7 7.4L12 17.8l-6.5 4 1.7-7.4-5.7-5 7.5-.7z' }],
    heart: [{ d: 'M12 21.2C5 15.6 2 12.2 2 8.4 2 5.4 4.3 3.3 7 3.3c2 0 3.9 1.1 5 3 1.1-1.9 3-3 5-3 2.7 0 5 2.1 5 5.1 0 3.8-3 7.2-10 12.8z' }],
    drop: [{ d: 'M12 2C9 7.5 5.5 11 5.5 15a6.5 6.5 0 0 0 13 0C18.5 11 15 7.5 12 2z' }],
    spark: [{ d: 'M12 1c.9 6 2.4 9.9 11 11-8.6 1.1-10.1 5-11 11-.9-6-2.4-9.9-11-11C9.6 10.9 11.1 7 12 1z' }],
    bolt: [{ d: 'M13.5 1L4 13.5h6.2L8.5 23 20 9.5h-6.6z' }],
    leaf: [{ d: 'M20.5 3.5C11 3 4 8 4 15.5c0 1.8.5 3.2 1.2 4.3C6.3 14 10 10.7 15 9c-4 3-6.7 6.3-8 11.6 1.1.5 2.5.9 4 .9 6.2 0 10.2-6.3 9.5-18z' }],
    petal: [{ d: 'M12 2c6 4 8 9 5 14-1.5 2.5-3.5 4-5 6-1.5-2-3.5-3.5-5-6-3-5-1-10 5-14z' }],
    flame: [{ d: 'M12 1.5c1 4.5 6.5 7 6.5 13a6.5 6.5 0 0 1-13 0c0-3 1.5-4.8 3-6.3.2 2 1 3 2.2 3.4C10 8.6 10.7 5 12 1.5z' }],
    diamond: [{ d: 'M12 1.5l8 10.5-8 10.5-8-10.5z' }],
    square: [{ d: 'M5 3h14v18H5z' }],
    coin: [{ d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' }, { d: 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', stroke: 'rgba(0,0,0,.28)', w: 1.8 }],
    bubble: [{ d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', alpha: 0.3 }, { d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', stroke: '#fff', w: 1.8 }, { d: 'M6.5 10a6 6 0 0 1 4-4.6', stroke: '#fff', w: 2 }],
    snow: [{ d: 'M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5', stroke: '#fff', w: 2.2 }],
    dot: [{ d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' }],
    ring: [{ d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', stroke: '#fff', w: 3 }],
};

/** Текстура частицы формы shape: белая картинка на canvas (data URL), цвет даёт частица. '' — запасная мягкая точка. @type {Record<string, string>} */
const SHOP_SHAPE_TEX = {};
/** @param {string} shape */
function shopShapeTexture(shape) {
    if (!shape || shape === 'dot') return '';
    if (shape in SHOP_SHAPE_TEX) return SHOP_SHAPE_TEX[shape];
    let url = '';
    try {
        const ops = SHOP_SHAPES[shape];
        const cv = document.createElement('canvas');
        cv.width = cv.height = 64;
        const g = cv.getContext('2d');
        if (ops && g && typeof Path2D !== 'undefined') {
            g.scale(64 / 24, 64 / 24);
            g.lineCap = 'round'; g.lineJoin = 'round';
            for (const op of ops) {
                const p = new Path2D(op.d);
                g.globalAlpha = op.alpha != null ? op.alpha : 1;
                if (op.stroke) { g.strokeStyle = op.stroke; g.lineWidth = op.w || 2; g.stroke(p); }
                else { g.fillStyle = '#ffffff'; g.fill(p); }
            }
            url = cv.toDataURL('image/png');
        }
    } catch (e) { url = ''; }
    SHOP_SHAPE_TEX[shape] = url;
    return url;
}

const SHOP_TABS = [
    { id: 'skin', name: { ru: 'Скины', en: 'Skins' } },
    { id: 'hat', name: { ru: 'Шапки', en: 'Hats' } },
    { id: 'face', name: { ru: 'Лица', en: 'Faces' } },
    { id: 'trail', name: { ru: 'Следы', en: 'Trails' } },
    { id: 'track', name: { ru: 'Трассы', en: 'Tracks' } },
    { id: 'victory', name: { ru: 'Победа', en: 'Victory' } },
];

/** @param {number} n */ const _C = (n) => ({ coins: n });
/** @param {number} n */ const _A = (n) => ({ ads: n });

/** Скины: [id, ru, en, rarity, price, def, fx?] */
const _SKINS = [
    ['classic', 'Классика', 'Classic Blue', 'common', null, { color: '#2b74f4', rim: '#9fd0ff' }],
    ['strawberry', 'Клубничка', 'Strawberry', 'common', _C(800), { color: '#ff5f8f', rim: '#ffc2d6' }],
    ['lemon', 'Лимон', 'Lemon', 'common', _A(1), { color: '#ffd93b', rim: '#fff3a6' }],
    ['mint', 'Мята', 'Mint', 'common', _C(1200), { color: '#3fdcae', rim: '#c6fff0' }],
    ['grape', 'Виноград', 'Grape', 'common', _A(1), { color: '#8a63f0', rim: '#d8c8ff' }],
    ['orange', 'Апельсин', 'Orange', 'common', _C(1600), { color: '#ff9a2e', rim: '#ffe0b0' }],
    ['bubblegum', 'Жвачка', 'Bubblegum', 'common', _A(1), { color: '#ff8fe0', rim: '#ffe0f8' }],
    ['lime', 'Лайм', 'Lime', 'common', _A(1), { color: '#a4e33a', rim: '#eaffb5' }],
    ['sky', 'Небесный', 'Sky', 'common', _C(2200), { color: '#59c8ff', rim: '#d6f3ff' }],
    ['coral', 'Коралл', 'Coral', 'common', _A(1), { color: '#ff6f61', rim: '#ffc9c2' }],
    ['jelly_blue', 'Голубое желе', 'Blue Jelly', 'rare', _C(4500), { color: '#4aa8ff', alpha: 0.75, spec: 1, power: 90, rim: '#d9efff' }],
    ['jelly_red', 'Малиновое желе', 'Berry Jelly', 'rare', _A(2), { color: '#ff4d6d', alpha: 0.75, spec: 1, power: 90, rim: '#ffd0da' }],
    ['jelly_green', 'Лаймовое желе', 'Lime Jelly', 'rare', _A(2), { color: '#4fe07a', alpha: 0.75, spec: 1, power: 90, rim: '#d4ffe0' }],
    ['bronze', 'Бронза', 'Bronze', 'rare', _C(5200), { color: '#cd7f32', spec: 0.95, power: 90, rim: '#ffd9a0' }],
    ['silver', 'Серебро', 'Silver', 'rare', _C(7000), { color: '#cfd6e0', spec: 1.15, power: 120, rim: '#fff1d6', emissive: '#3a3e46' }],
    ['chrome', 'Хром', 'Chrome', 'rare', _C(8800), { color: '#9fb4c9', spec: 1.3, power: 160, rim: '#ffffff', emissive: '#2a3a4a' }],
    ['pearl', 'Жемчуг', 'Pearl', 'rare', _A(2), { color: '#fff1f6', spec: 1.1, power: 140, rim: '#ffc8ee', emissive: '#5a4a52' }],
    ['cotton_candy', 'Сладкая вата', 'Cotton Candy', 'rare', _A(2), { color: '#ff9ad5', color2: '#8fd8ff', anim: 'shift', rim: '#ffffff' }],
    ['neon_cyan', 'Неон: бирюза', 'Neon Cyan', 'epic', _C(16000), { color: '#18e6ff', emissive: '#18e6ff', anim: 'pulse', rim: '#d8fcff', spec: 0.4 }, { glow: { color: '#18e6ff', amp: 0.25, speed: 5 } }],
    ['neon_pink', 'Неон: малина', 'Neon Pink', 'epic', _A(3), { color: '#ff3fa4', emissive: '#ff3fa4', anim: 'pulse', rim: '#ffd0ec', spec: 0.4 }, { glow: { color: '#ff3fa4', amp: 0.25, speed: 5 } }],
    ['neon_lime', 'Неон: лайм', 'Neon Lime', 'epic', _A(3), { color: '#a6ff1f', emissive: '#a6ff1f', anim: 'pulse', rim: '#f0ffcc', spec: 0.4 }, { glow: { color: '#a6ff1f', amp: 0.25, speed: 5 } }],
    ['gold', 'Золото', 'Gold', 'epic', _C(24000), { color: '#ffc83a', spec: 1.4, power: 150, rim: '#ffe9a0', emissive: '#6b4a00' }, { glow: { color: '#ffb400', amp: 0.18, speed: 2.4 } }],
    ['ocean', 'Океан', 'Ocean', 'epic', _A(3), { color: '#1fa7ff', color2: '#1ee0c0', anim: 'shift', spec: 0.9, rim: '#bff4ff' }],
    ['sunset', 'Закат', 'Sunset', 'epic', _A(3), { color: '#ff6b8a', color2: '#ffb347', anim: 'shift', rim: '#ffe0b0' }],
    ['galaxy', 'Галактика', 'Galaxy', 'epic', _A(4), { color: '#2a1466', color2: '#7a4bff', anim: 'shift', rim: '#c7a6ff', spec: 0.9 }, { sparkle: ['#ffffff', '#c7a6ff', '#8fd8ff'] }],
    ['diamond', 'Алмаз', 'Diamond', 'legendary', _C(60000), { color: '#bff3ff', alpha: 0.88, spec: 1.6, power: 200, rim: '#ffffff', emissive: '#6fd0ff', anim: 'pulse' }, { sparkle: ['#ffffff', '#bff3ff'] }],
    ['rainbow', 'Радуга', 'Rainbow', 'legendary', _A(4), { color: '#ff7ab8', anim: 'rainbow', spec: 0.9, rim: '#ffffff' }, { sparkle: ['#ffffff'] }],
    ['lava', 'Лава', 'Lava', 'legendary', _A(4), { color: '#ff3b1f', color2: '#ffb020', anim: 'shift', rim: '#ffd27a', spec: 0.6 }, { glow: { color: '#ff5a1a', amp: 0.4, speed: 4 }, aura: { color: '#ff7a1a', color2: '#ffd23a', rate: 22, size: [8, 16], gravity: [0, 150, 0], life: [0.5, 1.1] } }],
    ['aurora', 'Северное сияние', 'Aurora', 'legendary', _A(4), { color: '#2bf5b0', color2: '#9a5bff', anim: 'shift', rim: '#d6fff0' }, { glow: { color: '#42ffd0', amp: 0.3, speed: 2.2 }, sparkle: ['#d6fff0', '#e0c8ff'] }],
    ['void', 'Бездна', 'Void', 'mythic', _A(5), { color: '#150a2e', color2: '#4b1fa8', anim: 'shift', rim: '#b28cff', spec: 0.9 }, { glow: { color: '#7a3cff', amp: 0.5, speed: 3 }, aura: { color: '#7a3cff', color2: '#2b0a55', rate: 26, size: [10, 22], gravity: [0, 90, 0], life: [0.6, 1.3] } }],
    ['phoenix', 'Феникс', 'Phoenix', 'mythic', _A(5), { color: '#ff4a1f', color2: '#ffd23a', anim: 'shift', rim: '#fff0a0', spec: 0.8 }, { glow: { color: '#ff8a1f', amp: 0.5, speed: 5 }, aura: { color: '#ffb02e', color2: '#ff4a1f', rate: 40, size: [10, 22], gravity: [0, 220, 0], life: [0.4, 0.9] } }],
];

/** Эксклюзивы Daily Gift (день 7, по очереди; не продаются и не выпадают на колесе). */
const _SKINS_DAILY = [
    ['x_sapphire', 'Королевский сапфир', 'Royal Sapphire', 'legendary', { color: '#1f4fd6', color2: '#5aa8ff', anim: 'shift', spec: 1.4, power: 160, rim: '#ffe08a' }, { glow: { color: '#3d7bff', amp: 0.35, speed: 2.5 }, sparkle: ['#ffffff', '#ffe08a'] }],
    ['x_dragon', 'Золотой дракон', 'Golden Dragon', 'mythic', { color: '#ffb52e', color2: '#ff3b2e', anim: 'shift', spec: 1.3, power: 140, rim: '#fff2a0' }, { glow: { color: '#ff9a1f', amp: 0.45, speed: 4 }, aura: { color: '#ffb02e', color2: '#ff3b2e', rate: 34, size: [10, 20], gravity: [0, 200, 0], life: [0.4, 1] } }],
    ['x_stardust', 'Звёздный принц', 'Star Prince', 'mythic', { color: '#241a5e', color2: '#ffd86b', anim: 'shift', rim: '#fff0b0', spec: 1 }, { sparkle: ['#ffffff', '#ffd86b', '#ffb0f0'], aura: { color: '#ffe08a', color2: '#ffffff', rate: 20, size: [6, 12], gravity: [0, 40, 0], life: [0.8, 1.6] } }],
    ['x_ghost', 'Призрак', 'Phantom', 'mythic', { color: '#e8f4ff', alpha: 0.55, spec: 1.2, rim: '#9fd8ff', emissive: '#7fb8ff', anim: 'pulse' }, { aura: { color: '#cfeaff', color2: '#ffffff', rate: 24, size: [10, 20], gravity: [0, 60, 0], life: [0.8, 1.5] } }],
    ['x_prism', 'Призма', 'Prism', 'mythic', { color: '#ffffff', alpha: 0.8, spec: 1.5, power: 200, rim: '#ffffff', anim: 'rainbow' }, { sparkle: ['#ffffff', '#ffe0ff', '#e0ffff'], glow: { color: '#ffffff', amp: 0.2, speed: 3 } }],
];

/** Шапки: [id, ru, en, rarity, price] — модели art/blender/cosmetics/catalog.py; пути литералами ниже. */
const _HATS = [
    ['crown', 'Корона', 'Crown', 'rare', _A(3), 'assets/models/hats/crown.glb'],
    ['party_cone', 'Праздничный колпак', 'Party Hat', 'common', _C(900), 'assets/models/hats/party_cone.glb'],
    ['top_hat', 'Цилиндр', 'Top Hat', 'rare', _C(4500), 'assets/models/hats/top_hat.glb'],
    ['baseball_cap', 'Бейсболка', 'Baseball Cap', 'common', _C(1300), 'assets/models/hats/baseball_cap.glb'],
    ['beanie', 'Шапка с помпоном', 'Pom-Pom Beanie', 'common', _C(1700), 'assets/models/hats/beanie.glb'],
    ['cowboy', 'Ковбойская шляпа', 'Cowboy Hat', 'rare', _C(5500), 'assets/models/hats/cowboy.glb'],
    ['viking', 'Шлем викинга', 'Viking Helmet', 'epic', _C(16000), 'assets/models/hats/viking.glb'],
    ['wizard', 'Шляпа волшебника', 'Wizard Hat', 'epic', _A(3), 'assets/models/hats/wizard.glb'],
    ['pirate', 'Пиратская шляпа', 'Pirate Hat', 'rare', _A(2), 'assets/models/hats/pirate.glb'],
    ['chef', 'Колпак повара', 'Chef Hat', 'common', _C(2200), 'assets/models/hats/chef.glb'],
    ['graduation', 'Шапочка выпускника', 'Graduation Cap', 'rare', _A(2), 'assets/models/hats/graduation.glb'],
    ['propeller_cap', 'Кепка с пропеллером', 'Propeller Cap', 'rare', _A(2), 'assets/models/hats/propeller_cap.glb'],
    ['halo', 'Нимб', 'Halo', 'epic', _A(4), 'assets/models/hats/halo.glb'],
    ['bunny_ears', 'Ушки зайчика', 'Bunny Ears', 'common', _A(1), 'assets/models/hats/bunny_ears.glb'],
    ['cat_ears', 'Кошачьи ушки', 'Cat Ears', 'common', _A(1), 'assets/models/hats/cat_ears.glb'],
    ['devil_horns', 'Рожки чертёнка', 'Devil Horns', 'rare', _A(2), 'assets/models/hats/devil_horns.glb'],
    ['flower_crown', 'Венок из цветов', 'Flower Crown', 'rare', _A(2), 'assets/models/hats/flower_crown.glb'],
    ['headphones', 'Наушники', 'Headphones', 'rare', _A(2), 'assets/models/hats/headphones.glb'],
    ['sombrero', 'Сомбреро', 'Sombrero', 'epic', _A(3), 'assets/models/hats/sombrero.glb'],
    ['santa', 'Шапка Санты', 'Santa Hat', 'rare', _C(6800), 'assets/models/hats/santa.glb'],
    ['tiara', 'Диадема', 'Tiara', 'epic', _A(4), 'assets/models/hats/tiara.glb'],
    ['beret', 'Берет', 'Beret', 'common', _A(1), 'assets/models/hats/beret.glb'],
    ['fez', 'Феска', 'Fez', 'common', _A(1), 'assets/models/hats/fez.glb'],
    ['mushroom_cap', 'Грибная шляпка', 'Mushroom Cap', 'rare', _A(2), 'assets/models/hats/mushroom_cap.glb'],
    ['antenna_alien', 'Антенки пришельца', 'Alien Antennae', 'epic', _A(3), 'assets/models/hats/antenna_alien.glb'],
    ['crown_royal', 'Королевская корона', 'Royal Crown', 'legendary', _C(55000), 'assets/models/hats/crown_royal.glb'],
];

/** Лица: [id, ru, en, rarity, price, model] */
const _FACES = [
    ['eyes_classic', 'Классические глазки', 'Classic Eyes', 'common', null, 'assets/models/faces/eyes_classic.glb'],
    ['eyes_happy', 'Счастливые глазки', 'Happy Eyes', 'common', _C(800), 'assets/models/faces/eyes_happy.glb'],
    ['eyes_angry', 'Сердитые глазки', 'Angry Eyes', 'common', _C(1000), 'assets/models/faces/eyes_angry.glb'],
    ['eyes_sleepy', 'Сонные глазки', 'Sleepy Eyes', 'common', _A(1), 'assets/models/faces/eyes_sleepy.glb'],
    ['googly', 'Глаза-вертушки', 'Googly Eyes', 'rare', _A(2), 'assets/models/faces/googly.glb'],
    ['star_eyes', 'Глаза-звёзды', 'Star Eyes', 'epic', _A(3), 'assets/models/faces/star_eyes.glb'],
    ['heart_eyes', 'Влюблённые глаза', 'Heart Eyes', 'epic', _C(17500), 'assets/models/faces/heart_eyes.glb'],
    ['sunglasses', 'Солнечные очки', 'Sunglasses', 'rare', _C(4800), 'assets/models/faces/sunglasses.glb'],
    ['heart_glasses', 'Очки-сердечки', 'Heart Glasses', 'rare', _A(2), 'assets/models/faces/heart_glasses.glb'],
    ['shutter_shades', 'Очки-жалюзи', 'Shutter Shades', 'epic', _A(3), 'assets/models/faces/shutter_shades.glb'],
    ['cyber_visor', 'Кибер-визор', 'Cyber Visor', 'legendary', _C(58000), 'assets/models/faces/cyber_visor.glb'],
    ['monocle', 'Монокль', 'Monocle', 'epic', _A(3), 'assets/models/faces/monocle.glb'],
    ['mustache', 'Усы', 'Mustache', 'rare', _C(5600), 'assets/models/faces/mustache.glb'],
    ['nerd_glasses', 'Очки ботаника', 'Nerd Glasses', 'rare', _A(2), 'assets/models/faces/nerd_glasses.glb'],
    ['cyclops', 'Циклоп', 'Cyclops', 'epic', _A(4), 'assets/models/faces/cyclops.glb'],
    ['ski_goggles', 'Лыжная маска', 'Ski Goggles', 'rare', _A(2), 'assets/models/faces/ski_goggles.glb'],
    ['hero_mask', 'Маска героя', 'Hero Mask', 'epic', _A(3), 'assets/models/faces/hero_mask.glb'],
    ['blush_cute', 'Милашка', 'Cutie Blush', 'common', _A(1), 'assets/models/faces/blush_cute.glb'],
    ['fangs', 'Клыки', 'Fangs', 'rare', _A(2), 'assets/models/faces/fangs.glb'],
    ['big_smile', 'Широкая улыбка', 'Big Smile', 'common', _C(1600), 'assets/models/faces/big_smile.glb'],
];

// --- Следы: [id, ru, en, rarity, price, shape, def]. follow/texture ставит GameShop. ---------------------
const _RAINBOW = [[0, '#ff4d6d', 1], [0.2, '#ffb03a', 1], [0.4, '#ffee3a', 1], [0.6, '#4de88a', 0.9], [0.8, '#4db8ff', 0.7], [1, '#a05bff', 0]];
const _TRAILS = [
    ['sparkle', 'Блёстки', 'Glitter', 'common', _C(900), 'spark', { rate: 55, life: [0.4, 0.9], size: [10, 20], speed: [20, 70], gravity: [0, -30, 0], spin: [-3, 3], color: '#fff2a8', color2: '#ffffff', sizeGradient: [[0, 0.2], [0.3, 1], [1, 0]] }],
    ['bubbles', 'Пузырьки', 'Bubbles', 'common', _A(1), 'bubble', { rate: 22, life: [0.8, 1.6], size: [10, 24], speed: [10, 35], gravity: [0, 60, 0], color: '#ffffff', color2: '#a8e4ff', blend: 'standard', alpha: 0.9, sizeGradient: [[0, 0.6], [1, 1]] }],
    ['smoke', 'Дымок', 'Puffs', 'common', _C(1100), 'dot', { rate: 30, life: [0.5, 1.1], size: [14, 30], speed: [10, 40], gravity: [0, 20, 0], color: '#ffffff', color2: '#dfe8f5', blend: 'standard', alpha: 0.55, sizeGradient: [[0, 0.4], [1, 1.8]] }],
    ['leaves', 'Листочки', 'Leaves', 'common', _C(1500), 'leaf', { rate: 20, life: [0.7, 1.4], size: [12, 22], speed: [10, 50], gravity: [0, -120, 0], spin: [-6, 6], color: '#6fd45a', color2: '#3fae4a', blend: 'standard', sizeGradient: [[0, 1], [0.8, 1], [1, 0.2]] }],
    ['confetti', 'Конфетти', 'Confetti', 'common', _A(1), 'square', { rate: 35, life: [0.6, 1.2], size: [8, 14], speed: [30, 90], gravity: [0, -200, 0], spin: [-9, 9], color: '#ff6fb1', color2: '#5ad1ff', blend: 'standard' }],
    ['hearts', 'Сердечки', 'Hearts', 'rare', _A(2), 'heart', { rate: 14, life: [0.8, 1.5], size: [14, 26], speed: [15, 50], gravity: [0, 50, 0], color: '#ff5f9e', color2: '#ffb0d0', blend: 'standard', sizeGradient: [[0, 0.3], [0.25, 1], [1, 0.5]] }],
    ['stars', 'Звёздочки', 'Stars', 'rare', _C(4200), 'star', { rate: 24, life: [0.5, 1.1], size: [12, 22], speed: [30, 90], gravity: [0, -40, 0], spin: [-5, 5], color: '#ffe14d', color2: '#fff3a0', sizeGradient: [[0, 0.3], [0.3, 1], [1, 0]] }],
    ['coins', 'Монетки', 'Coins', 'rare', _C(5500), 'coin', { rate: 14, life: [0.7, 1.2], size: [14, 22], speed: [40, 100], gravity: [0, -600, 0], spin: [-8, 8], color: '#ffcf3a', color2: '#fff0a0', blend: 'standard' }],
    ['snow', 'Снежинки', 'Snowflakes', 'rare', _A(2), 'snow', { rate: 24, life: [0.9, 1.6], size: [10, 20], speed: [10, 50], gravity: [0, -60, 0], spin: [-3, 3], color: '#ffffff', color2: '#cfeaff', blend: 'standard' }],
    ['ice', 'Ледяные осколки', 'Ice Shards', 'rare', _A(2), 'diamond', { rate: 28, life: [0.4, 0.9], size: [10, 20], speed: [40, 110], gravity: [0, -150, 0], spin: [-4, 4], color: '#a8e6ff', color2: '#e8f8ff', sizeGradient: [[0, 1], [1, 0.2]] }],
    ['petals', 'Лепестки', 'Petals', 'rare', _A(2), 'petal', { rate: 18, life: [0.9, 1.6], size: [12, 22], speed: [15, 60], gravity: [0, -90, 0], spin: [-5, 5], color: '#ffb3d1', color2: '#ff7fb0', blend: 'standard' }],
    ['slime', 'Слизь', 'Slime', 'rare', _C(6200), 'drop', { rate: 20, life: [0.5, 1], size: [12, 22], speed: [20, 60], gravity: [0, -500, 0], color: '#7be85a', color2: '#c8ff7a', blend: 'standard' }],
    ['fire', 'Огонь', 'Fire', 'epic', _A(3), 'flame', { rate: 70, capacity: 160, life: [0.3, 0.7], size: [16, 30], speed: [10, 40], gravity: [0, 160, 0], direction: [[-0.4, 0.8, 0.3], [0.4, 1.6, 1]], color: '#ffb02e', colorGradient: [[0, '#fff3a0', 1], [0.3, '#ffb02e', 0.9], [0.7, '#ff4a1f', 0.6], [1, '#7a1010', 0]], sizeGradient: [[0, 0.6], [0.3, 1], [1, 0.2]] }],
    ['rainbow', 'Радужный след', 'Rainbow Ribbon', 'epic', _C(16500), 'dot', { rate: 90, capacity: 200, life: [0.5, 0.9], size: [14, 24], speed: [60, 100], direction: [[-0.1, 0, 0.8], [0.1, 0.1, 1.2]], color: '#ffffff', colorGradient: _RAINBOW }],
    ['lightning', 'Молнии', 'Lightning', 'epic', _C(21000), 'bolt', { rate: 18, life: [0.15, 0.35], size: [16, 30], speed: [80, 180], spin: [-6, 6], color: '#7df9ff', color2: '#ffffff' }],
    ['magic', 'Магия', 'Magic', 'epic', _A(3), 'spark', { rate: 45, life: [0.6, 1.2], size: [10, 20], speed: [20, 70], gravity: [0, 80, 0], spin: [-3, 3], color: '#ffffff', colorGradient: [[0, '#ffffff', 1], [0.4, '#7be8ff', 0.9], [0.8, '#b06bff', 0.5], [1, '#6a2bff', 0]], sizeGradient: [[0, 0.3], [0.3, 1], [1, 0.2]] }],
    ['embers', 'Угольки', 'Embers', 'epic', _A(3), 'dot', { rate: 40, life: [0.6, 1.3], size: [5, 10], speed: [20, 80], gravity: [0, 120, 0], color: '#ff9a3a', color2: '#ff4a1a' }],
    ['aurora', 'Северное сияние', 'Aurora', 'epic', _A(3), 'dot', { rate: 70, capacity: 180, life: [0.6, 1.1], size: [16, 28], speed: [50, 90], direction: [[-0.2, 0.1, 0.6], [0.2, 0.5, 1.2]], color: '#ffffff', colorGradient: [[0, '#8dffd0', 0.9], [0.5, '#3ec8ff', 0.7], [1, '#a05bff', 0]] }],
    ['toxic', 'Токсичный', 'Toxic', 'epic', _A(3), 'bubble', { rate: 26, life: [0.7, 1.4], size: [10, 22], speed: [15, 50], gravity: [0, 70, 0], color: '#b6ff4a', color2: '#4fe03a' }],
    ['stardust', 'Звёздная пыль', 'Stardust', 'legendary', _A(4), 'star', { rate: 80, capacity: 200, life: [0.6, 1.2], size: [10, 22], speed: [30, 100], spin: [-5, 5], color: '#ffffff', colorGradient: [[0, '#ffffff', 1], [0.4, '#c9a8ff', 0.9], [1, '#5a3cff', 0]], sizeGradient: [[0, 0.4], [0.3, 1], [1, 0.1]] }],
    ['goldrush', 'Золотой дождь', 'Gold Rush', 'legendary', _C(52000), 'coin', { rate: 40, capacity: 120, life: [0.6, 1.2], size: [14, 26], speed: [40, 120], gravity: [0, -500, 0], spin: [-9, 9], color: '#ffd24a', color2: '#fff0a0', blend: 'standard' }],
    ['galaxy', 'Галактика', 'Galaxy', 'legendary', _A(4), 'spark', { rate: 100, capacity: 220, life: [0.6, 1.2], size: [10, 24], speed: [40, 120], spin: [-4, 4], color: '#ffffff', colorGradient: [[0, '#ffffff', 1], [0.3, '#ff7ad9', 0.9], [0.7, '#6a7bff', 0.6], [1, '#2a1a8a', 0]], sizeGradient: [[0, 0.3], [0.3, 1], [1, 0.1]] }],
    ['phoenix', 'Феникс', 'Phoenix', 'mythic', _A(5), 'flame', { rate: 120, capacity: 240, life: [0.4, 0.9], size: [20, 40], speed: [20, 70], gravity: [0, 220, 0], direction: [[-0.6, 0.6, 0.3], [0.6, 1.6, 1.4]], color: '#ffb02e', colorGradient: [[0, '#ffffff', 1], [0.2, '#ffe15a', 1], [0.5, '#ff7a1f', 0.8], [0.8, '#d4281a', 0.4], [1, '#400808', 0]], sizeGradient: [[0, 0.5], [0.3, 1], [1, 0.3]] }],
    ['void', 'Пустота', 'Void', 'mythic', _A(5), 'dot', { rate: 60, capacity: 200, life: [0.7, 1.3], size: [18, 34], speed: [20, 60], gravity: [0, 40, 0], blend: 'standard', color: '#2b0a55', colorGradient: [[0, '#9a4bff', 0.9], [0.5, '#2b0a55', 0.7], [1, '#0b0220', 0]], sizeGradient: [[0, 0.4], [1, 1.6]] }],
];

// --- Трассы: [id, ru, en, rarity, price, theme] ------------------------------------------------------------
/** @param {string} top @param {string} chevron @param {string} shade @param {string} side @param {string} lip @param {string} a @param {string} b @param {string} c @param {number} [fog] */
const _T = (top, chevron, shade, side, lip, a, b, c, fog) => ({ top, chevron, shade, side, lip, skyTop: a, skyMid: b, skyHorizon: c, fog: fog || 0.0002 });
const _TRACKS = [
    ['pearl', 'Жемчуг', 'Pearl', 'common', null, _T('#eef2f9', '#ffffff', '#dfe6f2', '#c9d3e6', '#ffffff', '#2fb3f3', '#7ad0f6', '#cdeefc', 0.0002)],
    ['candy', 'Конфетная', 'Candy Pink', 'common', _C(900), _T('#ffe3ef', '#ffffff', '#ffc3da', '#ffb0cf', '#fff5fa', '#ff8fc4', '#ffc0e0', '#ffe7f3', 0.00018)],
    ['mint', 'Мятная', 'Mint', 'common', _A(1), _T('#e1fbef', '#ffffff', '#bff0d8', '#a9e5c8', '#f5fffa', '#2fd6a4', '#8be9c9', '#d9fbef', 0.00018)],
    ['lavender', 'Лаванда', 'Lavender', 'common', _C(1100), _T('#ece6ff', '#ffffff', '#d4c8ff', '#c3b3fa', '#faf7ff', '#8d73ff', '#b9a6ff', '#e8e0ff', 0.0002)],
    ['peach', 'Персик', 'Peach', 'common', _A(1), _T('#ffe9dc', '#ffffff', '#ffd0b5', '#ffbf9e', '#fff7f1', '#ff9d6e', '#ffc4a1', '#ffe8da', 0.0002)],
    ['lemon', 'Лимонад', 'Lemonade', 'common', _C(1500), _T('#fff7c9', '#ffffff', '#ffec8f', '#ffe26b', '#fffbe3', '#ffd13d', '#ffe480', '#fff6c9', 0.00018)],
    ['blueberry', 'Черника', 'Blueberry', 'common', _A(1), _T('#dfe3ff', '#ffffff', '#c1c8ff', '#a9b2f5', '#f4f6ff', '#4b4fd6', '#8a8fee', '#d6d8ff', 0.00022)],
    ['cotton', 'Сахарная вата', 'Cotton Cloud', 'rare', _C(4200), _T('#f6e6ff', '#ffffff', '#ffd6ee', '#d9c6ff', '#ffffff', '#7fd4ff', '#d5b8ff', '#ffd2ec', 0.00018)],
    ['desert', 'Пустыня', 'Desert Sand', 'rare', _C(4800), _T('#f7e3b8', '#fff4d8', '#e8c98a', '#d6ad66', '#fff3d1', '#4fb6f0', '#a5dcf5', '#fde9bd', 0.00022)],
    ['autumn', 'Осень', 'Autumn', 'rare', _C(6500), _T('#ffe3b8', '#fff1d4', '#ffc17d', '#e6975a', '#fff2dc', '#ff9a4d', '#ffc98a', '#ffeccd', 0.00022)],
    ['sunset', 'Закат', 'Sunset', 'rare', _A(2), _T('#ffe1c9', '#fff0e1', '#ffb48a', '#e98c78', '#fff1e6', '#6b4bd6', '#ff7aa2', '#ffc28a', 0.00022)],
    ['ocean', 'Океан', 'Ocean', 'rare', _A(2), _T('#d9f4ff', '#ffffff', '#a8dcf5', '#7cc4e8', '#f2fcff', '#0f7bd6', '#3fb2ec', '#bde9fa', 0.0002)],
    ['chocolate', 'Шоколад', 'Chocolate', 'rare', _A(2), _T('#8a5a3c', '#a97551', '#6e4429', '#5a341e', '#d9a77a', '#f2c6a0', '#f7dbc0', '#fff1e3', 0.00018)],
    ['forest', 'Лес', 'Forest', 'rare', _A(2), _T('#d6f2c8', '#f1ffe9', '#a9dc95', '#7fc26d', '#f4ffee', '#3fa76a', '#8fd9a0', '#d7f6d9', 0.00022)],
    ['sakura', 'Сакура', 'Sakura', 'rare', _A(2), _T('#ffe8f1', '#fff6fa', '#ffc6dc', '#f5a8c6', '#ffffff', '#ffb3d1', '#ffd3e4', '#fff0f6', 0.00018)],
    ['mars', 'Марс', 'Mars', 'rare', _A(2), _T('#e8a083', '#ffcdb5', '#c97a5e', '#a85a42', '#ffd9c7', '#2a0f1e', '#a8503a', '#f2a47d', 0.00024)],
    ['ice', 'Лёд', 'Ice', 'epic', _A(3), _T('#e4f6ff', '#ffffff', '#b9e3fa', '#93d0f2', '#ffffff', '#5ec4ff', '#a9e3ff', '#eefaff', 0.00018)],
    ['neon', 'Неон', 'Neon', 'epic', _A(3), _T('#1d1f3d', '#34f5ff', '#12142b', '#0b0d22', '#ff3fd0', '#0a0420', '#2b0f5e', '#6d1fa8', 0.00026)],
    ['aurora', 'Северное сияние', 'Aurora', 'epic', _A(3), _T('#cfe8f5', '#eefcff', '#9fcbe0', '#7fb3cc', '#f4feff', '#041a3a', '#0f6b6a', '#3de3a8', 0.00024)],
    ['night', 'Ночь', 'Night', 'epic', _C(16000), _T('#3b4a8f', '#5668b8', '#2b3874', '#222c5e', '#7f90e0', '#0b1240', '#232b73', '#4a4fa0', 0.00028)],
    ['lava', 'Лава', 'Lava', 'epic', _C(20000), _T('#4a2018', '#ff6a2e', '#2e120d', '#220c08', '#ffb347', '#2a0a0a', '#8a1f10', '#ff7a2e', 0.00026)],
    ['galaxy', 'Космос', 'Cosmos', 'legendary', _A(4), _T('#2a1b5e', '#7a56ff', '#1c1245', '#150d36', '#c9b6ff', '#05030f', '#1b0f45', '#4b2a9a', 0.00028)],
    ['gold', 'Золотая', 'Golden', 'legendary', _C(55000), _T('#ffe9a6', '#fff6cf', '#f3c94d', '#d9a822', '#fff3b8', '#ffb52e', '#ffd773', '#fff0bf', 0.00018)],
    ['rainbow', 'Радужная', 'Rainbow', 'legendary', _A(4), _T('#fff0fa', '#ffffff', '#ffd1f0', '#c9a9ff', '#ffffff', '#ff6fb1', '#ffd34d', '#6fe0ff', 0.00018)],
    ['diamond', 'Алмазная', 'Diamond', 'mythic', _A(5), _T('#e0fbff', '#ffffff', '#a8f0ff', '#7fe0f5', '#ffffff', '#37d6ff', '#a0f1ff', '#f0ffff', 0.00016)],
    ['void', 'Разлом', 'Rift', 'mythic', _A(5), _T('#14122b', '#a77bff', '#0b0a1e', '#07061a', '#ff5fd2', '#000000', '#1a0b3d', '#7a2bff', 0.00028)],
];

// --- Победа: [id, ru, en, rarity, price, icon, layers, sfx?] ----------------------------------------------
/** Выброс вверх: слой burst. @param {Record<string, any>} o */
const _vb = (o) => Object.assign({ burst: 70, capacity: 80, life: [0.8, 1.7], size: [8, 16], speed: [300, 700], direction: [[-0.8, 1, -0.3], [0.8, 2, 0.3]], gravity: [0, -900, 0], blend: 'standard', spin: [-8, 8], duration: 0.05, at: [0, 200, 0] }, o);
/** Падение сверху (непрерывно). @param {Record<string, any>} o */
const _vr = (o) => Object.assign({ rate: 90, capacity: 160, duration: 2.4, life: [1.6, 2.6], size: [10, 18], speed: [60, 200], direction: [[-0.2, -1, -0.1], [0.2, -1, 0.1]], gravity: [0, -200, 0], box: [[-420, 0, -240], [420, 0, 80]], blend: 'standard', spin: [-4, 4], at: [0, 560, 0] }, o);
/** Фонтан (непрерывно). @param {Record<string, any>} o */
const _vf = (o) => Object.assign({ rate: 110, capacity: 160, duration: 1.4, life: [1, 1.7], size: [12, 22], speed: [500, 900], direction: [[-0.35, 1, -0.2], [0.35, 1.6, 0.2]], gravity: [0, -1500, 0], blend: 'standard', spin: [-8, 8], at: [0, 30, 0] }, o);
/** Шар фейерверка. @param {Record<string, any>} o */
const _vw = (o) => Object.assign({ burst: 90, capacity: 100, life: [0.9, 1.6], size: [8, 16], speed: [200, 420], direction: [[-1, -1, -1], [1, 1, 1]], gravity: [0, -260, 0], sizeGradient: [[0, 1], [1, 0.1]], duration: 0.05, at: [0, 420, -80] }, o);
const _GOLDGRAD = [[0, '#ffffff', 1], [0.25, '#ffe15a', 1], [0.7, '#ff9a1f', 0.7], [1, '#a03a10', 0]];
const _PINKGRAD = [[0, '#ffffff', 1], [0.3, '#ff7ad9', 1], [0.8, '#a04bff', 0.6], [1, '#401080', 0]];
const _CYANGRAD = [[0, '#ffffff', 1], [0.3, '#7df9ff', 1], [0.8, '#3d7bff', 0.6], [1, '#102070', 0]];
const _GREENGRAD = [[0, '#ffffff', 1], [0.3, '#8dff7a', 1], [0.8, '#1fb86a', 0.6], [1, '#0a4030', 0]];

/** @type {Array<[string, string, string, string, any, any, any[], any[]?]>} */
const _VICTORY = [
    ['confetti', 'Конфетти', 'Confetti', 'common', null, { style: 'burst', shape: 'square', colors: ['#ff6fb1', '#ffe066', '#5ad1ff', '#8bff9a'] }, [
        _vb({ shape: 'square', burst: 90, capacity: 100, color: '#ff6fb1', color2: '#ffe066' }),
        _vb({ shape: 'square', burst: 90, capacity: 100, color: '#5ad1ff', color2: '#8bff9a' })]],
    ['stars', 'Звёздный взрыв', 'Star Burst', 'common', _C(900), { style: 'burst', shape: 'star', colors: ['#ffe14d', '#ffffff'] }, [
        _vb({ shape: 'star', burst: 60, color: '#ffe14d', color2: '#ffffff', blend: 'additive', speed: [300, 650], size: [14, 26], gravity: [0, -500, 0] })]],
    ['hearts', 'Сердечки', 'Hearts', 'common', _A(1), { style: 'rise', shape: 'heart', colors: ['#ff5f9e', '#ffb0d0'] }, [
        _vf({ shape: 'heart', rate: 40, duration: 1.6, color: '#ff5f9e', color2: '#ffb0d0', speed: [150, 320], gravity: [0, 60, 0], life: [1.2, 2], size: [18, 34], direction: [[-0.6, 1, -0.3], [0.6, 1.4, 0.3]], box: [[-90, 0, -40], [90, 80, 40]] })]],
    ['bubbles', 'Пузыри', 'Bubbles', 'common', _C(1300), { style: 'rise', shape: 'bubble', colors: ['#ffffff', '#a8e4ff'] }, [
        _vf({ shape: 'bubble', rate: 50, duration: 2, color: '#ffffff', color2: '#a8e4ff', speed: [60, 160], gravity: [0, 90, 0], life: [1.4, 2.4], size: [16, 40], direction: [[-0.8, 0.6, -0.4], [0.8, 1.4, 0.4]], box: [[-200, 0, -80], [200, 40, 80]] })]],
    ['snow', 'Снегопад', 'Snowfall', 'common', _A(1), { style: 'fall', shape: 'snow', colors: ['#ffffff', '#cfeaff'] }, [
        _vr({ shape: 'snow', color: '#ffffff', color2: '#cfeaff', gravity: [0, -90, 0], speed: [30, 90], size: [12, 24] })]],
    ['leaves', 'Листопад', 'Leaf Fall', 'common', _C(1800), { style: 'fall', shape: 'leaf', colors: ['#6fd45a', '#ffb02e', '#ff7a3a'] }, [
        _vr({ shape: 'leaf', color: '#6fd45a', color2: '#ffb02e', rate: 55, size: [14, 26] }),
        _vr({ shape: 'leaf', color: '#ff7a3a', color2: '#ffd23a', rate: 35, size: [14, 26] })]],
    ['coins', 'Монетный фонтан', 'Coin Fountain', 'rare', _C(5000), { style: 'fountain', shape: 'coin', colors: ['#ffcf3a', '#fff0a0'] }, [
        _vf({ shape: 'coin', color: '#ffcf3a', color2: '#fff0a0', size: [16, 28], rate: 70, duration: 1.8 })], [{ name: 'coin', delay: 0.05 }, { name: 'coin', delay: 0.35 }, { name: 'coin', delay: 0.65 }]],
    ['petals', 'Лепестки', 'Petal Shower', 'rare', _C(6000), { style: 'fall', shape: 'petal', colors: ['#ffb3d1', '#ff7fb0'] }, [
        _vr({ shape: 'petal', color: '#ffb3d1', color2: '#ff7fb0', rate: 70, size: [14, 26], spin: [-6, 6] })]],
    ['rainbow_wave', 'Радужная волна', 'Rainbow Wave', 'rare', _C(7500), { style: 'ring', shape: 'dot', colors: ['#ff4d6d', '#ffee3a', '#4de88a', '#4db8ff'] }, [
        { burst: 120, capacity: 140, life: [0.9, 1.3], size: [18, 30], speed: [380, 440], direction: [[-1, 0.05, -1], [1, 0.2, 1]], gravity: [0, 0, 0], colorGradient: _RAINBOW, color: '#ffffff', sizeGradient: [[0, 1], [1, 0.3]], duration: 0.05, at: [0, 30, 0] }]],
    ['fireworks', 'Фейерверк', 'Fireworks', 'rare', _A(2), { style: 'burst', shape: 'spark', colors: ['#ffe15a', '#ff7ad9', '#7df9ff'] }, [
        _vw({ colorGradient: _GOLDGRAD, color: '#ffffff', at: [-180, 380, -60] }),
        _vw({ colorGradient: _PINKGRAD, color: '#ffffff', at: [170, 440, -100], delay: 0.35 }),
        _vw({ colorGradient: _CYANGRAD, color: '#ffffff', at: [0, 520, -140], delay: 0.7 })], [{ name: 'pop', delay: 0.1 }, { name: 'pop', delay: 0.45 }, { name: 'pop', delay: 0.8 }]],
    ['sparkle_rain', 'Дождь искр', 'Spark Rain', 'rare', _A(2), { style: 'fall', shape: 'spark', colors: ['#ffe14d', '#ffffff'] }, [
        _vr({ shape: 'spark', color: '#ffe14d', color2: '#ffffff', blend: 'additive', rate: 100, size: [14, 28], gravity: [0, -300, 0], speed: [80, 200] })]],
    ['rockets', 'Ракеты', 'Rockets', 'rare', _A(2), { style: 'rise', shape: 'drop', colors: ['#ff6a3d', '#ffe14d'] }, [
        _vf({ shape: 'drop', color: '#ff6a3d', color2: '#ffe14d', rate: 36, duration: 0.9, speed: [700, 1100], gravity: [0, -300, 0], direction: [[-0.5, 1, -0.2], [0.5, 1.2, 0.2]], life: [0.9, 1.3], size: [10, 20], blend: 'additive' }),
        _vw({ colorGradient: _GOLDGRAD, color: '#ffffff', at: [0, 600, -100], delay: 0.8, burst: 120, capacity: 130 })]],
    ['tornado', 'Вихрь', 'Whirlwind', 'rare', _A(2), { style: 'ring', shape: 'leaf', colors: ['#7be8ff', '#ffffff'] }, [
        { rate: 120, capacity: 150, duration: 1.6, life: [0.8, 1.3], size: [10, 20], speed: [300, 420], direction: [[-1, 0.4, -1], [1, 1.2, 1]], gravity: [0, 0, 0], color: '#7be8ff', color2: '#ffffff', shape: 'spark', spin: [-10, 10], at: [0, 40, 0], sizeGradient: [[0, 1], [1, 0.2]] }]],
    ['ice_burst', 'Ледяной взрыв', 'Ice Burst', 'epic', _A(3), { style: 'burst', shape: 'diamond', colors: ['#a8e6ff', '#ffffff'] }, [
        _vb({ shape: 'diamond', burst: 80, color: '#a8e6ff', color2: '#ffffff', blend: 'additive', speed: [350, 800], size: [12, 26], gravity: [0, -400, 0] }),
        _vr({ shape: 'snow', color: '#ffffff', color2: '#cfeaff', rate: 50, delay: 0.4, size: [12, 22] })]],
    ['cannons', 'Конфетти-пушки', 'Confetti Cannons', 'epic', _A(3), { style: 'burst', shape: 'square', colors: ['#ff6fb1', '#5ad1ff', '#ffe066'] }, [
        _vb({ shape: 'square', burst: 80, color: '#ff6fb1', color2: '#ffe066', at: [-300, 40, 0], direction: [[0.3, 1, -0.2], [1.2, 2, 0.2]], speed: [700, 1100] }),
        _vb({ shape: 'square', burst: 80, color: '#5ad1ff', color2: '#8bff9a', at: [300, 40, 0], direction: [[-1.2, 1, -0.2], [-0.3, 2, 0.2]], speed: [700, 1100] }),
        _vb({ shape: 'square', burst: 90, color: '#ffe066', color2: '#ff6fb1', at: [0, 40, 0], delay: 0.35, speed: [600, 1000] })], [{ name: 'pop', delay: 0 }, { name: 'pop', delay: 0.35 }]],
    ['volcano', 'Вулкан', 'Volcano', 'epic', _C(19000), { style: 'fountain', shape: 'flame', colors: ['#ffb02e', '#ff4a1f'] }, [
        _vf({ shape: 'flame', blend: 'additive', color: '#ffb02e', colorGradient: [[0, '#fff3a0', 1], [0.4, '#ffb02e', 0.9], [1, '#a01010', 0]], rate: 130, duration: 1.8, speed: [600, 1000], size: [20, 40], gravity: [0, -1100, 0] }),
        _vf({ shape: 'dot', color: '#ff6a2e', color2: '#ffd23a', rate: 60, duration: 1.8, speed: [500, 900], size: [6, 12], blend: 'additive', gravity: [0, -900, 0] })]],
    ['thunder', 'Гроза', 'Thunderstorm', 'epic', _C(24000), { style: 'burst', shape: 'bolt', colors: ['#7df9ff', '#ffffff'] }, [
        _vb({ shape: 'bolt', burst: 36, blend: 'additive', color: '#7df9ff', color2: '#ffffff', speed: [500, 900], size: [24, 46], life: [0.3, 0.6], gravity: [0, -200, 0], direction: [[-1, 0.5, -0.5], [1, 1.5, 0.5]] }),
        _vw({ colorGradient: _CYANGRAD, color: '#ffffff', at: [0, 300, 0], delay: 0.15, burst: 70, capacity: 80 }),
        _vr({ shape: 'spark', color: '#7df9ff', color2: '#ffffff', blend: 'additive', delay: 0.3, rate: 70, size: [12, 24] })]],
    ['candy_rain', 'Конфетный дождь', 'Candy Rain', 'epic', _A(3), { style: 'fall', shape: 'drop', colors: ['#ff8fe0', '#ffd93b', '#5ad1ff', '#8bff9a'] }, [
        _vr({ shape: 'drop', color: '#ff8fe0', color2: '#ffd93b', rate: 60, size: [14, 26] }),
        _vr({ shape: 'dot', color: '#5ad1ff', color2: '#8bff9a', rate: 60, size: [12, 22] })]],
    ['mega_fireworks', 'Большой салют', 'Grand Salute', 'legendary', _A(4), { style: 'burst', shape: 'spark', colors: ['#ffe15a', '#ff7ad9', '#7df9ff', '#8dff7a'] }, [
        _vw({ colorGradient: _GOLDGRAD, color: '#ffffff', at: [-220, 380, -60], burst: 110, capacity: 120 }),
        _vw({ colorGradient: _PINKGRAD, color: '#ffffff', at: [220, 420, -90], delay: 0.3, burst: 110, capacity: 120 }),
        _vw({ colorGradient: _CYANGRAD, color: '#ffffff', at: [-90, 560, -140], delay: 0.65, burst: 110, capacity: 120 }),
        _vw({ colorGradient: _GREENGRAD, color: '#ffffff', at: [120, 600, -160], delay: 1.0, burst: 110, capacity: 120 }),
        _vw({ colorGradient: _GOLDGRAD, color: '#ffffff', at: [0, 480, -120], delay: 1.5, burst: 170, capacity: 180, speed: [260, 560], life: [1.1, 2] }),
        _vb({ shape: 'square', delay: 1.6, burst: 90, color: '#ff6fb1', color2: '#ffe066', at: [0, 120, 0] })], [{ name: 'pop', delay: 0.05 }, { name: 'pop', delay: 0.35 }, { name: 'pop', delay: 0.7 }, { name: 'pop', delay: 1.05 }, { name: 'reward', delay: 1.5 }]],
    ['diamond_rain', 'Алмазный дождь', 'Diamond Rain', 'legendary', _A(4), { style: 'fall', shape: 'diamond', colors: ['#bff3ff', '#ffffff'] }, [
        _vr({ shape: 'diamond', color: '#bff3ff', color2: '#ffffff', blend: 'additive', rate: 80, size: [16, 30], gravity: [0, -350, 0], speed: [100, 260], spin: [-6, 6] }),
        _vr({ shape: 'spark', color: '#ffffff', color2: '#7df9ff', blend: 'additive', rate: 90, delay: 0.3, size: [12, 24] }),
        _vb({ shape: 'spark', delay: 0.9, burst: 60, color: '#ffffff', color2: '#bff3ff', blend: 'additive', at: [0, 160, 0], size: [18, 34] })], [{ name: 'reward', delay: 0.6 }]],
    ['phoenix_burst', 'Взлёт феникса', 'Phoenix Rise', 'legendary', _A(4), { style: 'fountain', shape: 'flame', colors: ['#ffe15a', '#ff4a1f'] }, [
        _vf({ shape: 'flame', blend: 'additive', colorGradient: [[0, '#ffffff', 1], [0.3, '#ffe15a', 1], [0.7, '#ff4a1f', 0.7], [1, '#400808', 0]], rate: 150, duration: 1.5, speed: [700, 1200], size: [26, 50], gravity: [0, -300, 0], direction: [[-0.25, 1, -0.15], [0.25, 1.4, 0.15]], capacity: 200 }),
        _vw({ colorGradient: _GOLDGRAD, color: '#ffffff', at: [0, 560, -80], delay: 0.9, burst: 150, capacity: 160, speed: [260, 520] }),
        _vr({ shape: 'spark', color: '#ffb02e', color2: '#ff4a1f', blend: 'additive', delay: 1.0, rate: 80, size: [12, 24], gravity: [0, -140, 0] })], [{ name: 'reward', delay: 0.9 }]],
    ['supernova', 'Сверхновая', 'Supernova', 'mythic', _A(5), { style: 'ring', shape: 'star', colors: ['#ffffff', '#ff7ad9', '#7df9ff'] }, [
        _vw({ colorGradient: [[0, '#ffffff', 1], [1, '#ffffff', 0]], color: '#ffffff', burst: 60, capacity: 70, speed: [50, 160], size: [60, 120], life: [0.25, 0.5], at: [0, 220, 0] }),
        _vw({ colorGradient: _PINKGRAD, color: '#ffffff', at: [0, 220, 0], delay: 0.2, burst: 160, capacity: 170, speed: [420, 760], life: [1.2, 2] }),
        _vw({ colorGradient: _CYANGRAD, color: '#ffffff', at: [0, 220, 0], delay: 0.45, burst: 150, capacity: 160, speed: [300, 560], life: [1.2, 2] }),
        { burst: 140, capacity: 150, life: [1.2, 1.6], size: [18, 32], speed: [560, 620], direction: [[-1, 0.05, -1], [1, 0.1, 1]], gravity: [0, 0, 0], colorGradient: _RAINBOW, color: '#ffffff', shape: 'ring', duration: 0.05, delay: 0.3, at: [0, 60, 0] },
        _vr({ shape: 'star', color: '#ffffff', color2: '#ffe15a', blend: 'additive', delay: 0.8, rate: 90, size: [14, 30], gravity: [0, -250, 0] })], [{ name: 'pop', delay: 0.2 }, { name: 'reward', delay: 0.5 }, { name: 'reward', delay: 1.2 }]],
    ['cosmic_rainbow', 'Космическая радуга', 'Cosmic Rainbow', 'mythic', _A(5), { style: 'fountain', shape: 'spark', colors: ['#ff4d6d', '#ffee3a', '#4de88a', '#4db8ff', '#a05bff'] }, [
        _vf({ shape: 'spark', blend: 'additive', color: '#ffffff', colorGradient: _RAINBOW, rate: 160, duration: 1.8, speed: [700, 1100], size: [18, 36], gravity: [0, -900, 0], direction: [[-0.7, 1, -0.3], [0.7, 1.6, 0.3]], capacity: 220 }),
        { burst: 160, capacity: 170, life: [1.1, 1.5], size: [20, 34], speed: [480, 540], direction: [[-1, 0.05, -1], [1, 0.15, 1]], gravity: [0, 0, 0], colorGradient: _RAINBOW, color: '#ffffff', duration: 0.05, delay: 0.2, at: [0, 40, 0] },
        _vw({ colorGradient: _PINKGRAD, color: '#ffffff', at: [-200, 520, -120], delay: 0.9, burst: 120, capacity: 130 }),
        _vw({ colorGradient: _CYANGRAD, color: '#ffffff', at: [200, 560, -140], delay: 1.2, burst: 120, capacity: 130 }),
        _vr({ shape: 'star', color: '#ffffff', color2: '#ffe15a', blend: 'additive', delay: 1.2, rate: 80, size: [14, 28], gravity: [0, -250, 0] })], [{ name: 'reward', delay: 0.2 }, { name: 'pop', delay: 0.95 }, { name: 'pop', delay: 1.25 }]],
    ['gold_shower', 'Золотой ливень', 'Gold Shower', 'legendary', _C(58000), { style: 'fall', shape: 'coin', colors: ['#ffd24a', '#fff0a0'] }, [
        _vr({ shape: 'coin', color: '#ffd24a', color2: '#fff0a0', rate: 110, capacity: 200, duration: 2.6, size: [18, 32], gravity: [0, -500, 0], speed: [100, 260], spin: [-9, 9] }),
        _vb({ shape: 'spark', burst: 80, color: '#fff0a0', color2: '#ffffff', blend: 'additive', delay: 0.1, at: [0, 160, 0], size: [16, 30] }),
        _vf({ shape: 'coin', color: '#ffcf3a', color2: '#fff0a0', rate: 60, duration: 1.4, delay: 0.2, size: [16, 28] })], [{ name: 'coin', delay: 0.1 }, { name: 'coin', delay: 0.4 }, { name: 'coin', delay: 0.7 }, { name: 'reward', delay: 0.3 }]],
];

/** Собрать предметы каталога. */
function _shopBuildItems() {
    const out = [];
    const name = (ru, en) => ({ ru, en });
    for (const [id, ru, en, rarity, price, def, fx] of _SKINS) {
        out.push({ id: 'skin_' + id, tab: 'skin', name: name(ru, en), rarity, price: price || undefined, default: !price || undefined, skin: def, fx: fx || null });
    }
    for (const [id, ru, en, rarity, def, fx] of _SKINS_DAILY) {
        out.push({ id: 'skin_' + id, tab: 'skin', name: name(ru, en), rarity, exclusive: 'daily', skin: def, fx: fx || null });
    }
    for (const [id, ru, en, rarity, price, model] of _HATS) out.push({ id: 'hat_' + id, tab: 'hat', name: name(ru, en), rarity, price, model });
    for (const [id, ru, en, rarity, price, model] of _FACES) {
        out.push({ id: id === 'eyes_classic' ? 'eyes_classic' : 'face_' + id, tab: 'face', name: name(ru, en), rarity, price: price || undefined, default: !price || undefined, model });
    }
    for (const [id, ru, en, rarity, price, shape, def] of _TRAILS) out.push({ id: 'trail_' + id, tab: 'trail', name: name(ru, en), rarity, price, shape, trail: def });
    for (const [id, ru, en, rarity, price, theme] of _TRACKS) {
        out.push({ id: 'track_' + id, tab: 'track', name: name(ru, en), rarity, price: price || undefined, default: !price || undefined, theme });
    }
    for (const [id, ru, en, rarity, price, icon, layers, sfx] of _VICTORY) {
        out.push({ id: 'fx_' + id, tab: 'victory', name: name(ru, en), rarity, price: price || undefined, default: !price || undefined, icon, layers, sfx: sfx || [] });
    }
    return out;
}

const SHOP_ITEMS = _shopBuildItems();

/** Daily Gift: награды дней 1–6 (нарастают; x2 удваивает coins и randomItems). День 7 — эксклюзивный скин (очередь Shop.exclusiveIds('daily')). */
const DAILY_REWARDS = [
    { coins: 300 },
    { coins: 500 },
    { coins: 800 },
    { coins: 1200, randomItems: 1, maxRarity: 'rare' },
    { coins: 1800 },
    { coins: 2500 },
];

/** Колесо: 8 секторов (равные по углу, вес = шанс). coins — монеты; randomItem — предмет магазина дня до maxRarity. */
const WHEEL_SECTORS = [
    { coins: 150, weight: 26 },
    { coins: 400, weight: 14 },
    { randomItem: true, maxRarity: 'rare', weight: 8 },
    { coins: 250, weight: 20 },
    { coins: 1000, weight: 7 },
    { coins: 600, weight: 12 },
    { randomItem: true, maxRarity: 'epic', weight: 3 },
    { coins: 2500, weight: 2 },
];
