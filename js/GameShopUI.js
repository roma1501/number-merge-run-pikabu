// GameShopUI.js — окна магазина, подарка дня и колеса фортуны Number Merge Run («конфетная лавка игрушек»):
// полноэкранный слой поверх HUD, тот же желейный язык, что у GameHud (NM Nunito 900 / NM Titan, кнопки с
// нижней тенью, .nm-jelly). Логика — Shop / DailyGift / Wheel, связка с игрой — GameShop.js.
//   · магазин: на экране живое 3D-число (камера GameShop), панель — снизу (портрет) или справа (альбом);
//   · карточки: превью (цифра с материалом скина, настоящая 3D-иконка шапки/лица из отдельной сцены, CSS-значки
//     следов, трасс и эффектов победы), рамка редкости, состояние, прогресс рекламы;
//   · все кнопки, кроме рекламных (data-noad), зовут GameHud.uiAd() и GameSfx 'click'.
// Тексты — Lang (ключи nm.shop.*, nm.gift.*, nm.wheel.*; ru + en ниже).

Object.assign(LANG_STRINGS.ru, {
    'nm.shop.title': 'Магазин',
    'nm.shop.tab.skin': 'Скины',
    'nm.shop.tab.hat': 'Шапки',
    'nm.shop.tab.face': 'Лица',
    'nm.shop.tab.trail': 'Следы',
    'nm.shop.tab.track': 'Трассы',
    'nm.shop.tab.victory': 'Победа',
    'nm.shop.rarity.common': 'Обычный',
    'nm.shop.rarity.rare': 'Редкий',
    'nm.shop.rarity.epic': 'Эпический',
    'nm.shop.rarity.legendary': 'Легендарный',
    'nm.shop.rarity.mythic': 'Мифический',
    'nm.shop.buyFor': 'Купить',
    'nm.shop.forAd': 'За рекламу',
    'nm.shop.tryOn': 'Примерка: пока не твоё',
    'nm.shop.noAds': 'Реклама на этой площадке недоступна',
    'nm.shop.daily': 'Подарок 7-го дня',
    'nm.shop.dailyHint': 'Достаётся только за 7-й день ежедневного подарка',
    'nm.shop.unlocked': 'Открыто!',
    'nm.shop.progress': 'Просмотр засчитан: {a} из {b}',
    'nm.shop.rebuild': 'Строим трассу…',
    'nm.shop.owned': 'Есть',
    'nm.gift.title': 'Подарок дня',
    'nm.gift.exclusive': 'Эксклюзивный скин',
    'nm.gift.got': 'Ты получил!',
    'nm.gift.adFailed': 'Реклама не показана. Награду можно забрать и без неё.',
    'nm.gift.claimed': 'Сегодняшний подарок получен',
    'nm.gift.ok': 'Супер!',
    'nm.gift.x2sub': 'Получишь: {r}',
    'nm.gift.noX2': 'Скин выдаётся один раз',
    'nm.gift.coins': 'Монеты',
    'nm.gift.big': 'Крупная награда',
    'nm.wheel.title': 'Колесо фортуны',
    'nm.wheel.item': 'Предмет',
    'nm.wheel.mystery': 'Сюрприз',
    'nm.wheel.won': 'Ты выиграл!',
    'nm.wheel.ok': 'Круто!',
    'nm.wheel.equip': 'Надеть',
    'nm.wheel.noAds': 'Реклама на этой площадке недоступна',
    'nm.wheel.dup': 'Такой предмет уже есть — вместо него монеты',
    'nm.wheel.adFailed': 'Реклама не показана. Вращение не потрачено.',
    'nm.wheel.timer': 'Бесплатное вращение через {t}',
});

Object.assign(LANG_STRINGS.en, {
    'nm.shop.title': 'Shop',
    'nm.shop.tab.skin': 'Skins',
    'nm.shop.tab.hat': 'Hats',
    'nm.shop.tab.face': 'Faces',
    'nm.shop.tab.trail': 'Trails',
    'nm.shop.tab.track': 'Tracks',
    'nm.shop.tab.victory': 'Victory',
    'nm.shop.rarity.common': 'Common',
    'nm.shop.rarity.rare': 'Rare',
    'nm.shop.rarity.epic': 'Epic',
    'nm.shop.rarity.legendary': 'Legendary',
    'nm.shop.rarity.mythic': 'Mythic',
    'nm.shop.buyFor': 'Buy',
    'nm.shop.forAd': 'Watch ad',
    'nm.shop.tryOn': 'Trying on: not yours yet',
    'nm.shop.noAds': 'Ads are not available on this platform',
    'nm.shop.daily': 'Day 7 gift',
    'nm.shop.dailyHint': 'Only given on day 7 of the daily gift',
    'nm.shop.unlocked': 'Unlocked!',
    'nm.shop.progress': 'View counted: {a} of {b}',
    'nm.shop.rebuild': 'Building the track…',
    'nm.shop.owned': 'Owned',
    'nm.gift.title': 'Daily Gift',
    'nm.gift.exclusive': 'Exclusive skin',
    'nm.gift.got': 'You got!',
    'nm.gift.adFailed': 'No ad shown. You can still claim the reward without it.',
    'nm.gift.claimed': "Today's gift is claimed",
    'nm.gift.ok': 'Awesome!',
    'nm.gift.x2sub': 'You get: {r}',
    'nm.gift.noX2': 'The skin is given once',
    'nm.gift.coins': 'Coins',
    'nm.gift.big': 'Big reward',
    'nm.wheel.title': 'Wheel of Fortune',
    'nm.wheel.item': 'Item',
    'nm.wheel.mystery': 'Mystery',
    'nm.wheel.won': 'You won!',
    'nm.wheel.ok': 'Cool!',
    'nm.wheel.equip': 'Equip',
    'nm.wheel.noAds': 'Ads are not available on this platform',
    'nm.wheel.dup': 'You already have it — coins instead',
    'nm.wheel.adFailed': 'No ad shown. The spin was not used.',
    'nm.wheel.timer': 'Free spin in {t}',
});

// ======================================================================================================
// Цвета
// ======================================================================================================

/** @param {string} h @returns {number[]} */
function shopRgb(h) {
    const s = String(h || '#ffffff').replace('#', '');
    const v = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s.padEnd(6, '0').slice(0, 6), 16) || 0;
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
/** @param {string} a @param {string} b @param {number} t */
function shopMix(a, b, t) {
    const x = shopRgb(a), y = shopRgb(b);
    return '#' + x.map((c, i) => Math.round(c + (y[i] - c) * t).toString(16).padStart(2, '0')).join('');
}
/** f < 0 темнее, f > 0 светлее. @param {string} c @param {number} f */
function shopShade(c, f) { return f < 0 ? shopMix(c, '#000000', -f) : shopMix(c, '#ffffff', f); }

// ======================================================================================================
// Иконки шапок и лиц: настоящая 3D-иконка из отдельной сцены на том же движке
// ======================================================================================================

/** @satisfies {Record<string, any>} */
const GameShopIcons = {
    /** id -> data URL @type {Map<string, string>} */
    cache: new Map(),
    /** @type {Set<string>} */
    failed: new Set(),
    /** @type {Array<{ item: any, cb: (url: string) => void }>} */
    queue: [],
    running: false,
    /** @type {any} */
    scene: null,
    /** @type {any} */
    cam: null,
    size: 128,

    /** @param {string} id */
    get(id) { return this.cache.get(id) || ''; },

    /** Поставить иконку в очередь; cb(url) — когда готова (сразу, если есть). @param {any} item @param {(url: string) => void} cb */
    request(item, cb) {
        const have = this.cache.get(item.id);
        if (have) { cb(have); return; }
        if (this.failed.has(item.id)) return;
        if (this.queue.some((j) => j.item.id === item.id)) { this.queue.find((j) => j.item.id === item.id).cb = cb; return; }
        this.queue.push({ item, cb });
        this._pump();
    },

    /** Очередь по одной, с паузой между иконками: рендер не занимает кадры игры. */
    async _pump() {
        if (this.running) return;
        this.running = true;
        while (this.queue.length) {
            const job = this.queue.shift();
            try {
                const url = await this._render(job.item);
                if (url) { this.cache.set(job.item.id, url); job.cb(url); } else this.failed.add(job.item.id);
            } catch (e) {
                this.failed.add(job.item.id);
                console.warn('GameShopIcons:', job.item.id, (e && e.message) || e);
            }
            await new Promise((r) => setTimeout(r, 40));
        }
        this.running = false;
    },

    _init() {
        const engine = typeof World3D !== 'undefined' ? World3D.engine : null;
        if (!engine) throw new Error('нет движка');
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
        scene.autoClear = true;
        const hemi = new BABYLON.HemisphericLight('ic-h', new BABYLON.Vector3(0.2, 1, 0.5), scene);
        hemi.intensity = 0.95;
        hemi.groundColor = new BABYLON.Color3(0.62, 0.62, 0.7);
        const sun = new BABYLON.DirectionalLight('ic-d', new BABYLON.Vector3(-0.4, -0.7, -0.8), scene);
        sun.intensity = 0.55;
        const cam = new BABYLON.ArcRotateCamera('ic-cam', Math.PI / 2, 1.1, 300, BABYLON.Vector3.Zero(), scene);
        cam.fov = 0.5; cam.minZ = 1; cam.maxZ = 100000;
        scene.activeCamera = cam;
        this.scene = scene; this.cam = cam;
    },

    /** @param {any} item @returns {Promise<string>} */
    async _render(item) {
        if (!this.scene) this._init();
        const scene = this.scene, cam = this.cam;
        const model = await Model3D.load(item.model);
        const root = Model3D.build(model, scene, { name: 'icon-' + item.id });
        try {
            root.computeWorldMatrix(true);
            const b = root.getHierarchyBoundingVectors(true);
            const c = b.min.add(b.max).scale(0.5), ext = b.max.subtract(b.min);
            const maxDim = Math.max(ext.x, ext.y, ext.z, 1);
            const face = item.tab === 'face';
            cam.target = c;
            cam.alpha = Math.PI / 2 + (face ? 0 : 0.22);
            cam.beta = face ? 1.45 : 1.05;
            cam.radius = (maxDim * 0.5) / Math.tan(cam.fov / 2) * 1.3;
            await scene.whenReadyAsync();
            const url = await BABYLON.Tools.CreateScreenshotUsingRenderTargetAsync(scene.getEngine(), cam, { width: this.size, height: this.size }, 'image/png', 1, true);
            return url;
        } finally {
            root.dispose(false, true);
        }
    },
};

// ======================================================================================================
// Окна
// ======================================================================================================

const SHOP_RARITY_COLOR = { common: '#b9c6e4', rare: '#4aa8ff', epic: '#b06bff', legendary: '#ffb02e', mythic: '#ff4fa3' };

/** @satisfies {Record<string, any>} */
const GameShopUI = {
    /** @type {any} */
    game: null,
    /** @type {HTMLElement | null} */
    root: null,
    /** @type {Record<string, HTMLElement>} */
    el: {},
    /** '' | 'shop' | 'gift' | 'wheel' */
    mode: '',
    tab: 'skin',
    /** @type {Record<string, string>} */
    sel: {},
    k: 1,
    land: false,
    W: 800, H: 600, headH: 54,
    /** @type {{ W: number, H: number, x0: number, y0: number, x1: number, y1: number } | null} */
    region: null,
    busy: false,
    actBusy: false,
    spinning: false,
    wheelAngle: 0,
    /** @type {any} */
    giftOver: null,
    uid: 0,
    timer: 0,
    toastT: 0,
    coinShown: -1,
    /** @type {any} */
    popItem: null,

    TAB_ICONS: {
        skin: '<svg viewBox="0 0 32 32"><path d="M16 3C13 9 7 14 7 20a9 9 0 0 0 18 0c0-6-6-11-9-17z" fill="#fff"/><path d="M12 21a4 4 0 0 0 4 4" fill="none" stroke="#ff5fa2" stroke-width="2.4" stroke-linecap="round"/></svg>',
        hat: '<svg viewBox="0 0 32 32"><rect x="9" y="5" width="14" height="16" rx="3" fill="#fff"/><rect x="9" y="15" width="14" height="4" fill="#ff5fa2"/><rect x="3.5" y="20" width="25" height="5" rx="2.5" fill="#fff"/></svg>',
        face: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12.5" fill="#fff"/><circle cx="11.5" cy="13.5" r="2.4" fill="#1f2d5c"/><circle cx="20.5" cy="13.5" r="2.4" fill="#1f2d5c"/><path d="M10 19.5c1.5 3.2 4 4.5 6 4.5s4.5-1.3 6-4.5" fill="none" stroke="#1f2d5c" stroke-width="2.4" stroke-linecap="round"/></svg>',
        trail: '<svg viewBox="0 0 32 32"><path d="M26 6l-5 8h5l-12 12 3-9H11z" fill="#fff"/><circle cx="6" cy="24" r="2.5" fill="#fff" opacity=".8"/><circle cx="10" cy="28" r="1.6" fill="#fff" opacity=".6"/></svg>',
        track: '<svg viewBox="0 0 32 32"><path d="M12 5h8l9 22H3z" fill="#fff"/><path d="M16 8v4M16 15v4M16 22v3" stroke="#2f7df6" stroke-width="2.4" stroke-linecap="round"/></svg>',
        victory: '<svg viewBox="0 0 32 32"><path d="M9 5h14v7a7 7 0 0 1-14 0z" fill="#fff"/><path d="M9 7H4.5a4.5 4.5 0 0 0 5 6M23 7h4.5a4.5 4.5 0 0 1-5 6" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="14" y="18" width="4" height="5" fill="#fff"/><rect x="9.5" y="23" width="13" height="5" rx="2" fill="#fff"/></svg>',
    },
    TAB_COLOR: {
        skin: 'linear-gradient(#ff8cc3,#ff5fa2)', hat: 'linear-gradient(#ffd96b,#ffad2e)', face: 'linear-gradient(#6ff0c4,#2fcf97)',
        trail: 'linear-gradient(#b49bff,#8462ff)', track: 'linear-gradient(#69b4ff,#2f7df6)', victory: 'linear-gradient(#ffb06b,#ff6a3d)',
    },

    /** @param {string} k @param {any} [p] */
    t(k, p) { return Lang.t(k, p); },

    // --- Сборка ---------------------------------------------------------------------------------------

    /** @param {any} game */
    init(game) {
        this.game = game;
        if (!document.getElementById('nms-css')) {
            const s = document.createElement('style');
            s.id = 'nms-css';
            s.textContent = GAME_SHOP_CSS;
            document.head.appendChild(s);
        }
        const root = document.createElement('div');
        root.id = 'nm-shop';
        const I = GameHud.ICONS;
        root.innerHTML = `
<div class="nms-dim"></div>
<div class="nms-flash" id="nms-flash"></div>
<header class="nms-head">
  <div class="nms-title" id="nms-title"></div>
  <div class="nms-coins" id="nms-coins"><i>${I.coin}</i><b id="nms-coins-n">0</b></div>
  <button class="nms-x" data-a="close" id="nms-x" aria-label="close">${I.close}</button>
</header>
<section class="nms-panel" id="nms-panel">
  <nav class="nms-tabs" id="nms-tabs"></nav>
  <div class="nms-grid" id="nms-grid"></div>
  <footer class="nms-dock" id="nms-dock"></footer>
</section>
<div class="nms-modal" id="nms-modal"></div>
<div class="nms-pop" id="nms-pop"></div>
<div class="nms-toast" id="nms-toast"></div>
<div class="nms-busy" id="nms-busy"><span data-t="nm.shop.rebuild"></span></div>`;
        document.body.appendChild(root);
        this.root = root;
        for (const n of root.querySelectorAll('[id]')) this.el[n.id] = /** @type {HTMLElement} */ (n);
        root.addEventListener('click', (e) => this._click(e));
        // Клик мимо окна (по затемнению или свободной части экрана) закрывает его; открытый попап приза — сначала его.
        root.addEventListener('click', (e) => {
            if (!this.mode) return;
            const t = /** @type {HTMLElement} */ (e.target);
            const pop = this.el['nms-pop'];
            if (pop && pop.classList.contains('on')) {
                if (!t.closest('.nms-popcard')) pop.classList.remove('on');
                return;
            }
            if (t.closest('.nms-win, .nms-panel, .nms-head, .nms-popcard, .nms-toast, button')) return;
            GameSfx.play('click');
            this.close();
        });
        root.addEventListener('pointerdown', (e) => {
            const b = /** @type {HTMLElement} */ (e.target).closest('button');
            if (b) { b.classList.remove('nm-jelly'); void b.offsetWidth; b.classList.add('nm-jelly'); }
        });
        window.addEventListener('resize', () => { if (this.mode) this.layout(); });
        window.addEventListener('lory-viewcap', () => { if (this.mode) this.layout(); });
        // Esc не используем: браузер оставляет его для выхода из полного экрана (Playgama 1.5.2). Закрыть — крестик или клик мимо.
        window.addEventListener('lory-language', () => { Lang.apply(); if (this.mode) this.render(); });
        if (Platform.onRewardedCooldown) Platform.onRewardedCooldown(() => { if (this.mode) this._paintAds(); });
        Lang.apply();
    },

    isOpen() { return !!this.mode; },

    // --- Открыть / закрыть -----------------------------------------------------------------------------

    /** @param {'shop' | 'gift' | 'wheel'} which */
    open(which) {
        if (this.mode || !this.root) return;
        this.mode = which;
        this.root.className = 'on m-' + which;
        if (GameHud.root) GameHud.root.style.visibility = 'hidden';
        this.layout();
        this.render();
        if (which === 'shop') {
            const p = this.game.player;
            if (p && p.trail && !p.running) p._startTrail();
        }
        this.coinShown = -1;
        this.refreshCoins();
        clearInterval(this.timer);
        this.timer = /** @type {any} */ (setInterval(() => this._tick(), 1000));
    },

    close() {
        if (!this.mode || !this.root || this.spinning || this.busy) return;
        const was = this.mode;
        this.mode = '';
        clearInterval(this.timer);
        this.root.className = '';
        this.el['nms-pop'].classList.remove('on');
        if (GameHud.root) GameHud.root.style.visibility = '';
        Shop.clearPreview();
        const p = this.game.player;
        if (was === 'shop' && p && !p.running && p.trailHandle) p.setRunning(false);   // след виден только в магазине
        this.region = null;
        GameHud.refreshMenu();
        GameHud.coins(this.game.save.coins);
    },

    /** Свободная от панели часть экрана (px в системе окна) — GameShop ставит туда число. */
    freeRegion() { return this.mode === 'shop' ? this.region : null; },

    /** Размеры и положение слоя и панели: портрет — панель снизу (58%), альбом — справа (55%). */
    layout() {
        const root = this.root;
        if (!root) return;
        const cv = document.getElementById('world3d');
        const r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const W = Math.max(200, r.width), H = Math.max(200, r.height);
        root.style.left = r.left + 'px'; root.style.top = r.top + 'px';
        root.style.width = W + 'px'; root.style.height = H + 'px';
        const k = Math.max(0.68, Math.min(1.25, Math.min(W, H) / 520));
        const land = W >= H * 1.1;
        const headH = Math.round(54 * k);
        this.k = k; this.land = land; this.W = W; this.H = H; this.headH = headH;
        root.style.setProperty('--k', k.toFixed(3));
        root.style.setProperty('--headH', headH + 'px');
        const panel = this.el['nms-panel'];
        panel.classList.toggle('land', land);
        let reg;
        if (land) {
            const pw = Math.round(Math.min(W * 0.55, 780 * Math.max(1, k)));
            panel.style.cssText = `left:auto;right:0;top:${headH}px;width:${pw}px;height:${H - headH}px`;
            reg = { W, H, x0: 0, y0: headH, x1: W - pw, y1: H };
        } else {
            const ph = Math.round(H * 0.58), pw = Math.min(W, Math.round(720 * Math.max(1, k)));
            panel.style.cssText = `left:${Math.round((W - pw) / 2)}px;right:auto;top:auto;bottom:0;width:${pw}px;height:${ph}px`;
            reg = { W, H, x0: 0, y0: headH, x1: W, y1: H - ph };
        }
        this.region = reg;
        const short = land && H < 560;
        const ws = short ? Math.min(H - headH - 84, W * 0.42, 300) : Math.min(W * 0.82, (H - headH) * 0.52, 340 * Math.max(0.8, k));
        root.style.setProperty('--ws', Math.max(150, Math.round(ws)) + 'px');
    },

    render() {
        const m = this.mode;
        this.el['nms-title'].textContent = this.t(m === 'shop' ? 'nm.shop.title' : m === 'gift' ? 'nm.gift.title' : 'nm.wheel.title');
        if (m === 'shop') { this._renderTabs(); this._renderGrid(); }
        else if (m === 'gift') this._renderGift();
        else if (m === 'wheel') this._renderWheel();
    },

    /** Залить экран под пересборку уровня. @param {() => Promise<any>} fn */
    async flash(fn) {
        const f = this.el['nms-flash'];
        f.classList.add('on');
        await new Promise((r) => setTimeout(r, 230));
        try { await fn(); } finally { setTimeout(() => f.classList.remove('on'), 80); }
    },

    /** @param {boolean} on */
    setBusy(on) {
        this.busy = on;
        if (this.root) this.root.classList.toggle('is-busy', on);
    },

    refreshCoins() {
        const n = this.game.save.coins;
        const el = this.el['nms-coins-n'];
        if (!el) return;
        el.textContent = GameHud.fmt(n);
        if (this.coinShown >= 0 && this.coinShown !== n) GameHud._pulse(this.el['nms-coins']);
        this.coinShown = n;
        if (this.mode === 'shop') this._refreshShop(true);
    },

    // --- Клики ---------------------------------------------------------------------------------------

    /** @param {MouseEvent} e */
    async _click(e) {
        const b = /** @type {HTMLElement} */ (/** @type {HTMLElement} */ (e.target).closest('[data-a]'));
        if (!b || /** @type {HTMLButtonElement} */ (b).disabled || b.classList.contains('is-off')) return;
        const a = b.getAttribute('data-a') || '';
        GameSfx.play('click');
        if (!b.hasAttribute('data-noad')) GameHud.uiAd();
        switch (a) {
            case 'close': this.close(); break;
            case 'tab': this._setTab(b.getAttribute('data-tab') || 'skin'); break;
            case 'card': this._select(b.getAttribute('data-id') || ''); break;
            case 'act': await this._act(); break;
            case 'gclaim': this._giftClaim(false); break;
            case 'gx2': await this._giftClaim(true); break;
            case 'wfree': this._spin(false); break;
            case 'wad': this._spin(true); break;
            case 'popok': this._closePop(); break;
            case 'popeq': if (this.popItem) { Shop.equip(this.popItem); } this._closePop(); break;
            default: break;
        }
    },

    /** @param {string} text */
    toast(text) {
        const t = this.el['nms-toast'];
        t.textContent = text;
        t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
        clearTimeout(this.toastT);
        this.toastT = /** @type {any} */ (setTimeout(() => t.classList.remove('on'), 2600));
    },

    // ====================================================================================================
    // Магазин
    // ====================================================================================================

    _renderTabs() {
        const nav = this.el['nms-tabs'];
        nav.innerHTML = Shop.tabs().map((t) => `<button class="nms-tab ${t.id === this.tab ? 'on' : ''}" data-a="tab" data-tab="${t.id}" style="--tb:${this.TAB_COLOR[t.id]}">${this.TAB_ICONS[t.id]}<span>${this.t('nm.shop.tab.' + t.id)}</span></button>`).join('');
    },

    /** @param {string} tab */
    _setTab(tab) {
        if (tab === this.tab) return;
        this.tab = tab;
        Shop.clearPreview();
        this._renderTabs();
        this._renderGrid();
        this.el['nms-grid'].scrollTop = 0;
    },

    _renderGrid() {
        const grid = this.el['nms-grid'];
        const cards = Shop.cards(this.tab);
        const slot = this.tab;
        if (!this.sel[slot] || !cards.some((c) => c.id === this.sel[slot])) this.sel[slot] = Shop.equippedId(slot) || (cards[0] && cards[0].id) || '';
        grid.innerHTML = cards.map((c) => this._cardHtml(c)).join('');
        for (const c of cards) if (c.item.model) this._want3d(c.item);
        this._paintDock();
    },

    /** @param {any} c */
    _cardHtml(c) {
        const it = c.item, r = it.rarity || 'common';
        const sel = this.sel[c.slot] === c.id;
        return `<button class="nms-card r-${r} ${sel ? 'is-sel' : ''} ${c.equipped ? 'is-eq' : ''} ${c.owned ? 'is-own' : ''}" data-a="card" data-id="${c.id}" style="--rc:${SHOP_RARITY_COLOR[r]}">
<span class="nms-gem"></span><span class="nms-chk"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
<span class="nms-dome"><span class="nms-ico">${this.iconHtml(it)}</span></span>
<span class="nms-name">${c.name}</span>
<span class="nms-tag">${this._tagHtml(c)}</span></button>`;
    },

    /** Нижняя плашка карточки: цена / прогресс рекламы / состояние. @param {any} c */
    _tagHtml(c) {
        const I = GameHud.ICONS;
        if (c.equipped) return `<em class="t-eq">${this.t('shop.equipped')}</em>`;
        if (c.owned) return `<em class="t-own">${this.t('shop.owned')}</em>`;
        if (c.kind === 'coins') return `<em class="t-coin ${c.affordable ? '' : 'poor'}"><i>${I.coin}</i>${GameHud.fmt(c.price)}</em>`;
        if (c.kind === 'ads') {
            let pips = '';
            for (let i = 0; i < c.need; i++) pips += `<s class="${i < c.progress ? 'on' : ''}"></s>`;
            return `<em class="t-ad"><i>${I.ad}</i><span class="pips">${pips}</span></em>`;
        }
        if (c.kind === 'exclusive') return `<em class="t-ex"><i>${I.gift}</i>${this.t('nm.shop.daily')}</em>`;
        return '';
    },

    /** @param {string} id */
    _select(id) {
        const it = Shop.item(id);
        if (!it) return;
        const slot = Shop.slotOf(it);
        this.sel[slot] = id;
        if (Shop.equippedId(slot) === id) Shop.clearPreview(slot); else Shop.preview(id);
        this._refreshShop(false);
    },

    /** Обновить карточки и док на месте, не пересоздавая превью (иначе сбросятся их анимации). @param {boolean} [tagsOnly] */
    _refreshShop(tagsOnly) {
        const grid = this.el['nms-grid'];
        if (!grid) return;
        for (const c of Shop.cards(this.tab)) {
            const el = /** @type {HTMLElement | null} */ (grid.querySelector(`[data-id="${c.id}"]`));
            if (!el) continue;
            el.classList.toggle('is-sel', this.sel[c.slot] === c.id);
            el.classList.toggle('is-eq', c.equipped);
            el.classList.toggle('is-own', c.owned);
            const tag = /** @type {HTMLElement} */ (el.querySelector('.nms-tag'));
            const html = this._tagHtml(c);
            if (tag.innerHTML !== html) tag.innerHTML = html;
        }
        void tagsOnly;
        this._paintDock();
    },

    /** Док: выбранный предмет, состояние и главное действие. */
    _paintDock() {
        const dock = this.el['nms-dock'];
        const id = this.sel[this.tab];
        const c = id ? Shop.card(id) : null;
        if (!c) { dock.innerHTML = ''; return; }
        const it = c.item, I = GameHud.ICONS, r = it.rarity || 'common';
        const adsOk = typeof Platform.rewardedSupported === 'function' ? Platform.rewardedSupported() : true;
        let info = '', btn = '';
        if (c.equipped) info = this.t('shop.equipped');
        else if (c.owned) info = this.t('shop.owned');
        else if (c.kind === 'coins') info = `<i class="ic">${I.coin}</i>${GameHud.fmt(c.price)}`;
        else if (c.kind === 'ads') info = c.priceLabel;
        else if (c.kind === 'exclusive') info = this.t('nm.shop.daily');
        let hint = '';
        if (!c.owned && Shop.look()[Shop.slotOf(it)] === c.id) hint = this.t('nm.shop.tryOn');
        if (!c.enabled && c.hint) hint = c.hint;
        if (c.kind === 'ads' && !c.owned && !adsOk) hint = this.t('nm.shop.noAds');
        if (c.kind === 'exclusive' && !c.owned) hint = this.t('nm.shop.dailyHint');
        const dis = this.actBusy || this.busy;
        if (c.action === 'buy') {
            btn = `<button class="nms-btn b-coral" data-a="act" ${c.enabled && !dis ? '' : 'disabled'}><i>${I.coin}</i><b>${GameHud.fmt(c.price)}</b><small>${this.t('nm.shop.buyFor')}</small></button>`;
        } else if (c.action === 'watch') {
            const wait = c.adWait > 0 && c.hint && c.actionLabel !== this.t('shop.watch');
            btn = `<button class="nms-btn b-green" data-a="act" data-noad ${c.enabled && !dis && adsOk ? '' : 'disabled'}><i>${I.ad}</i><b>${wait ? c.actionLabel : this.t('nm.shop.forAd')}</b><small>${c.progress}/${c.need}</small></button>`;
        } else if (c.action === 'equip') {
            btn = `<button class="nms-btn b-blue" data-a="act" ${dis ? 'disabled' : ''}><b>${c.actionLabel}</b></button>`;
        } else if (c.action === 'unequip') {
            btn = `<button class="nms-btn b-grey" data-a="act" ${dis ? 'disabled' : ''}><b>${c.actionLabel}</b></button>`;
        } else {
            btn = `<button class="nms-btn ${c.equipped ? 'b-green' : 'b-grey'}" disabled><b>${c.equipped ? this.t('shop.equipped') : c.priceLabel || this.t('shop.locked')}</b></button>`;
        }
        dock.innerHTML = `<span class="nms-dome mini r-${r}" style="--rc:${SHOP_RARITY_COLOR[r]}"><span class="nms-ico">${this.iconHtml(it)}</span></span>
<div class="nms-dock-info"><b class="nms-dock-name">${c.name}</b><span class="nms-rar r-${r}" style="--rc:${SHOP_RARITY_COLOR[r]}">${this.t('nm.shop.rarity.' + r)}</span><small>${info}${hint ? (info ? ' · ' : '') + hint : ''}</small></div>${btn}`;
        if (it.model) this._want3d(it);
    },

    /** Все «за рекламу» кнопки: пауза между rewarded, таймеры. */
    _paintAds() {
        if (this.mode === 'shop') this._paintDock();
        else if (this.mode === 'gift') this._paintGiftButtons();
        else if (this.mode === 'wheel') this._paintWheelButtons();
    },

    _tick() {
        if (!this.mode) return;
        if (this.mode === 'gift') this._paintGiftButtons();
        else if (this.mode === 'wheel') this._paintWheelButtons();
    },

    /** @param {string} reason @param {any} c */
    _failText(reason, c) {
        if (reason === 'noCoins') return c.hint;
        if (reason === 'cooldown') return c.hint || Shop.adWaitLabel();
        if (reason === 'adUnavailable' || reason === 'adFailed') return this.t('shop.adUnavailable');
        return '';
    },

    async _act() {
        if (this.actBusy || this.busy) return;
        const id = this.sel[this.tab];
        const c = id ? Shop.card(id) : null;
        if (!c || !c.enabled || c.action === 'none') return;
        this.actBusy = true;
        this._paintDock();
        const r = await Shop.act(id);
        this.actBusy = false;
        if (r && r.ok) {
            if (c.action === 'buy') { GameSfx.play('coin'); GameSfx.play('upgrade'); this._celebrate(id); this.toast(this.t('nm.shop.unlocked')); }
            else if (c.action === 'watch') {
                GameSfx.play('reward');
                if (r.unlocked) { this._celebrate(id); this.toast(this.t('nm.shop.unlocked')); }
                else this.toast(this.t('nm.shop.progress', { a: r.progress, b: r.need }));
            } else if (c.action === 'equip') GameSfx.play('pop');
        } else if (r && r.reason) {
            const msg = this._failText(r.reason, Shop.card(id) || c);
            if (msg) this.toast(msg);
        }
        this._refreshShop(false);
    },

    /** Праздничная вспышка вокруг числа + прыжок значка в доке. @param {string} id */
    _celebrate(id) {
        void id;
        const g = this.game, p = g.player;
        if (p && g.app.fx) g.app.fx.play('magic', new BABYLON.Vector3(p.x, p.h + p.height * 0.6, p.y));
        if (p) p.gulp(1.2);
        const d = this.el['nms-dock'].querySelector('.nms-dome');
        if (d) GameHud._pulse(/** @type {HTMLElement} */ (d));
    },

    // --- Превью предметов ------------------------------------------------------------------------------

    /** Содержимое «купола» карточки: цифра, 3D-иконка, значок следа, трассы или победы. @param {any} it */
    iconHtml(it) {
        switch (it.tab) {
            case 'skin': return this._skinIcon(it);
            case 'hat': case 'face': return this._img3dIcon(it);
            case 'trail': return this._trailIcon(it);
            case 'track': return this._trackIcon(it.theme);
            case 'victory': return this._fxIcon(it.icon.style, it.icon.shape, it.icon.colors);
            default: return '';
        }
    },

    /** Цифра «7» нужного материала: градиент цвета, блик металла, мерцание, пульс, радуга. @param {any} it */
    _skinIcon(it) {
        const d = it.skin || {}, fx = it.fx || {};
        const c1 = d.color || '#2b74f4';
        const c2 = d.color2 || shopShade(c1, -0.3);
        const glow = (fx.glow && fx.glow.color) || d.emissive || shopShade(c1, 0.2);
        const cls = ['nms-digit', d.anim ? 'a-' + d.anim : '', (d.spec || 0) >= 1 ? 'shine' : '', d.alpha != null && d.alpha < 1 ? 'trans' : '', fx.glow || d.anim === 'pulse' ? 'glow' : ''].join(' ');
        let tw = '';
        if (fx.sparkle || it.rarity === 'mythic') {
            for (let i = 0; i < 4; i++) tw += `<i class="nms-tw" style="--x:${[8, 78, 26, 88][i]}%;--y:${[18, 10, 74, 62][i]}%;--d:${i * 0.45}s"></i>`;
        }
        return `<span class="${cls}" data-d="7" style="--c1:${c1};--c2:${c2};--hl:${shopShade(c1, 0.6)};--edge:${shopShade(c1, -0.5)};--glow:${glow}">7</span>${tw}`;
    },

    /** Шапка / лицо: заглушка, пока 3D-иконка рендерится (или если модели нет). @param {any} it */
    _img3dIcon(it) {
        const url = GameShopIcons.get(it.id);
        const ph = it.tab === 'hat'
            ? '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="34" rx="19" ry="6" fill="currentColor" opacity=".55"/><path d="M13 33c0-12 4-22 11-22s11 10 11 22z" fill="currentColor"/></svg>'
            : '<svg viewBox="0 0 48 48"><ellipse cx="16" cy="24" rx="7" ry="9" fill="currentColor" opacity=".55"/><ellipse cx="32" cy="24" rx="7" ry="9" fill="currentColor" opacity=".55"/><circle cx="17" cy="26" r="3.2" fill="#fff"/><circle cx="31" cy="26" r="3.2" fill="#fff"/></svg>';
        return `<span class="nms-ph ${url ? 'gone' : ''}" data-ph="${it.id}">${ph}</span><img class="nms-img ${url ? 'on' : ''}" data-icon="${it.id}" alt="" ${url ? `src="${url}"` : ''}>`;
    },

    /** Поставить в очередь 3D-иконку; готовую подставить во все копии (карточка, док). @param {any} it */
    _want3d(it) {
        if (!it.model || GameShopIcons.get(it.id)) return;
        GameShopIcons.request(it, (url) => {
            if (!this.root) return;
            for (const img of this.root.querySelectorAll(`img[data-icon="${it.id}"]`)) { /** @type {HTMLImageElement} */ (img).src = url; img.classList.add('on'); }
            for (const ph of this.root.querySelectorAll(`[data-ph="${it.id}"]`)) ph.classList.add('gone');
        });
    },

    /** SVG-разметка формы (fill/stroke = currentColor). @param {string} shape */
    _shapeSvg(shape) {
        const ops = SHOP_SHAPES[shape] || SHOP_SHAPES.dot;
        return ops.map((/** @type {any} */ op) => (op.stroke
            ? `<path d="${op.d}" fill="none" stroke="${op.stroke === '#fff' ? 'currentColor' : op.stroke}" stroke-width="${op.w || 2}" stroke-linecap="round" stroke-linejoin="round"/>`
            : `<path d="${op.d}" fill="currentColor"${op.alpha != null ? ` opacity="${op.alpha}"` : ''}/>`)).join('');
    },

    /** Значок «брызг»: частицы формы shape по кругу/вверх/вниз. style: burst | rise | fall | fountain | ring | trail. @param {string} style @param {string} shape @param {string[]} colors @param {number} [n] */
    _fxIcon(style, shape, colors, n) {
        const N = n || 11, svg = this._shapeSvg(shape);
        let h = '';
        for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2 + (i % 2 ? 0.3 : 0);
            const col = colors[i % colors.length];
            let dx = Math.cos(a) * 25, dy = Math.sin(a) * 25;
            if (style === 'rise' || style === 'fountain') { dx = ((i * 37) % 44) - 22; dy = -26 - ((i * 13) % 14); }
            if (style === 'fall') { dx = ((i * 37) % 48) - 24; dy = 26 + ((i * 11) % 12); }
            if (style === 'trail') { dx = -14 - ((i * 17) % 22); dy = ((i * 29) % 30) - 15; }
            h += `<i class="p" style="--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--dl:${(i * 0.17).toFixed(2)}s;--s:${(0.7 + ((i * 7) % 5) * 0.12).toFixed(2)};color:${col}"><svg viewBox="0 0 24 24">${svg}</svg></i>`;
        }
        return `<span class="nms-fxi s-${style}">${h}</span>`;
    },

    /** Значок следа: частицы тянутся за маленьким числом. @param {any} it */
    _trailIcon(it) {
        const d = it.trail || {};
        let colors = [];
        if (d.colorGradient) colors = d.colorGradient.filter((/** @type {any} */ g, /** @type {number} */ i) => i < d.colorGradient.length - 1 || d.colorGradient.length < 3).map((/** @type {any} */ g) => g[1]);
        else colors = [d.color || '#ffffff', d.color2 || d.color || '#ffffff'];
        const up = d.gravity && d.gravity[1] > 20;
        return this._fxIcon(up ? 'trailup' : 'trail', it.shape, colors, 8) + '<span class="nms-mini">1</span>';
    },

    /** Мини-трасса с небом: плита, шевроны, бортики. @param {any} th */
    _trackIcon(th) {
        const id = 'tk' + (++this.uid);
        return `<svg class="nms-trk" viewBox="0 0 64 64"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${th.skyTop}"/><stop offset=".55" stop-color="${th.skyMid}"/><stop offset="1" stop-color="${th.skyHorizon}"/></linearGradient></defs>
<rect width="64" height="64" fill="url(#${id})"/><polygon points="25,26 39,26 60,64 4,64" fill="${th.side}"/><polygon points="26,26 38,26 56,64 8,64" fill="${th.top}"/>
<path d="M13 57l19-14 19 14M20 48l12-9 12 9M26 38l6-4.5 6 4.5" fill="none" stroke="${th.shade}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1.5)"/>
<path d="M13 57l19-14 19 14M20 48l12-9 12 9M26 38l6-4.5 6 4.5" fill="none" stroke="${th.chevron}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M25 26L4 64M39 26l21 38" stroke="${th.lip}" stroke-width="2.4"/></svg>`;
    },

    // ====================================================================================================
    // Подарок дня
    // ====================================================================================================

    _renderGift() {
        const modal = this.el['nms-modal'];
        const v = DailyGift.view();
        const I = GameHud.ICONS;
        const days = v.days.map((d) => {
            const big = d.exclusive;
            let body;
            if (big) {
                const it = d.skin ? Shop.item(d.skin) : null;
                body = it
                    ? `<span class="nms-dome mini r-${it.rarity}" style="--rc:${SHOP_RARITY_COLOR[it.rarity]}"><span class="nms-ico">${this._skinIcon(it)}</span></span><span class="dtxt"><b>${this.t('nm.gift.exclusive')}</b><small>${Shop.name(it.id)}</small></span>`
                    : `<span class="dico">${I.coin}</span><span class="dtxt"><b>${this.t('nm.gift.big')}</b><small>${GameHud.fmt(d.reward.coins || 0)}</small></span>`;
            } else {
                const r = d.reward;
                body = `<span class="dico">${I.coin}</span><b class="dnum">${GameHud.fmt(r.coins || 0)}</b>${r.randomItems || r.item ? `<span class="dico dgift">${I.gift}</span>` : ''}`;
            }
            return `<div class="nms-day st-${d.state} ${big ? 'big' : ''}"><em>${d.dayLabel}</em>${body}${d.state === 'claimed' ? `<span class="dchk"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>` : ''}${d.state === 'today' ? `<span class="dtag">${d.stateLabel}</span>` : ''}</div>`;
        }).join('');
        modal.innerHTML = `<div class="nms-win nms-gift">
<div class="nms-ribbon">${this.t('nm.gift.title')}</div>
<div class="nms-days">${days}</div>
<div class="nms-btns" id="nms-gbtns"></div>
<div class="nms-note" id="nms-gnote"></div></div>`;
        for (const n of modal.querySelectorAll('[id]')) this.el[n.id] = /** @type {HTMLElement} */ (n);
        this._paintGiftButtons();
    },

    _paintGiftButtons() {
        const box = this.el['nms-gbtns'];
        if (!box) return;
        const v = DailyGift.view(), I = GameHud.ICONS;
        const adsOk = typeof Platform.rewardedSupported === 'function' ? Platform.rewardedSupported() : true;
        const dis = this.giftBusy ? 'disabled' : '';
        let html = `<button class="nms-btn b-gold nms-wide" data-a="gclaim" ${v.claim.enabled && !dis ? '' : 'disabled'}><i>${I.gift}</i><b>${v.claim.label}</b></button>`;
        if (v.x2.available) {
            html += `<button class="nms-btn b-green nms-wide" data-a="gx2" data-noad ${v.x2.enabled && adsOk && !dis ? '' : 'disabled'}><i>${I.ad}</i><b>${v.x2.label}</b><small>${this.t('nm.gift.x2sub', { r: v.x2.rewardLabel })}</small></button>`;
        }
        if (box.getAttribute('data-h') !== html) { box.innerHTML = html; box.setAttribute('data-h', html); }
        let note = '';
        if (!v.canClaim) note = `${this.t('nm.gift.claimed')} · ${v.nextLabel}`;
        else if (v.x2.available && !adsOk) note = this.t('nm.shop.noAds');
        else if (v.x2.available && v.x2.hint) note = v.x2.hint;
        else if (!v.x2.available && v.days.some((d) => d.state === 'today' && d.exclusive)) note = this.t('nm.gift.noX2');
        const n = this.el['nms-gnote'];
        if (n && n.textContent !== note) n.textContent = note;
    },

    giftBusy: false,
    _lastTick: 0,

    /** @param {boolean} x2 */
    async _giftClaim(x2) {
        if (this.giftBusy) return;
        this.giftBusy = true;
        this._paintGiftButtons();
        const r = x2 ? await DailyGift.claimX2() : DailyGift.claim();
        this.giftBusy = false;
        if (r && r.ok) {
            GameSfx.play('reward');
            this._celebrate('');
            this._renderGift();
            this._showPrize(this.t('nm.gift.got'), r.got, r.day === DailyGift.cycleDays());
        } else {
            this._paintGiftButtons();
            if (r && (r.reason === 'adFailed' || r.reason === 'adUnavailable')) this.toast(this.t('nm.gift.adFailed'));
        }
    },

    // ====================================================================================================
    // Колесо фортуны
    // ====================================================================================================

    /** Картинки колеса: грузятся один раз, пока нет — рисуется запасная форма. @type {Record<string, HTMLImageElement>} */
    wImgs: {},
    _wImgPaths: {
        coin: 'assets/ui/icons/coin.webp', bag: 'assets/ui/icons/money-bag.webp', chest: 'assets/ui/icons/chest.webp',
        gift: 'assets/ui/icons/gift.webp', star: 'assets/ui/icons/star.webp', sparkles: 'assets/ui/icons/sparkles.webp', crown: 'assets/ui/icons/crown.webp',
    },
    /** @type {any} */
    rimTimer: 0,
    rimPhase: 0,
    /** Подсветка выигравшего сектора: до какого момента (мс) и номер. */
    winGlow: { until: 0, sector: -1 },

    _loadWheelImgs() {
        for (const k of Object.keys(this._wImgPaths)) {
            if (this.wImgs[k]) continue;
            const im = new Image();
            im.onload = () => { if (this.mode === 'wheel' && !this.spinning) this._drawWheel(); };
            im.src = this._wImgPaths[k];
            this.wImgs[k] = im;
        }
    },

    _renderWheel() {
        const modal = this.el['nms-modal'];
        modal.innerHTML = `<div class="nms-win nms-wheelwin">
<div class="nms-ribbon">${this.t('nm.wheel.title')}</div>
<div class="nms-wheel-box" id="nms-wbox">
  <div class="nms-wheel-wrap"><canvas id="nms-wheel" width="900" height="900"></canvas><canvas id="nms-rim" width="900" height="900"></canvas><div class="nms-wgloss"></div><div class="nms-hub"><img class="nm-ic" src="assets/ui/icons/star.webp" alt="" draggable="false"></div></div>
  <div class="nms-pointer" id="nms-pointer"><svg viewBox="0 0 40 56"><path d="M20 54C9 38 3 29 3 20 3 9 10 2 20 2s17 7 17 18c0 9-6 18-17 34z" fill="#e8303f" stroke="#ffc533" stroke-width="4"/><path d="M11 13c2-5 7-7 11-6" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="20" r="6" fill="#ffe9a0" stroke="#e0a020" stroke-width="2"/></svg></div>
</div>
<div class="nms-wright"><div class="nms-btns" id="nms-wbtns"></div><div class="nms-note" id="nms-wnote"></div></div></div>`;
        for (const n of modal.querySelectorAll('[id]')) this.el[n.id] = /** @type {HTMLElement} */ (n);
        this._loadWheelImgs();
        this._drawWheel();
        this._applyWheel(this.wheelAngle);
        this._paintWheelButtons();
        clearInterval(this.rimTimer);
        this._drawRim();
        this.rimTimer = setInterval(() => {
            if (this.mode !== 'wheel') { clearInterval(this.rimTimer); return; }
            this.rimPhase++;
            this._drawRim();
        }, 110);
    },

    /** @param {number} deg */
    _applyWheel(deg) {
        const cv = this.el['nms-wheel'];
        if (cv) cv.style.transform = `rotate(${deg.toFixed(2)}deg)`;
    },

    /** Неподвижный золотой обод с лампочками (бегущие огни — быстрее при вращении) и подсветка выигрыша. */
    _drawRim() {
        const cv = /** @type {HTMLCanvasElement} */ (this.el['nms-rim']);
        if (!cv) return;
        const g = cv.getContext('2d');
        const S = 340, sc = cv.width / S;
        g.setTransform(sc, 0, 0, sc, 0, 0);
        g.clearRect(0, 0, S, S);
        const C = S / 2, Ro = C - 1, Ri = C * 0.87;
        const gr = g.createLinearGradient(0, 0, S, S);
        gr.addColorStop(0, '#fff0a0'); gr.addColorStop(0.45, '#f2b52a'); gr.addColorStop(1, '#c97d10');
        g.beginPath(); g.arc(C, C, Ro, 0, Math.PI * 2); g.arc(C, C, Ri, 0, Math.PI * 2, true);
        g.fillStyle = gr; g.fill('evenodd');
        g.lineWidth = 2; g.strokeStyle = '#a8640a'; g.beginPath(); g.arc(C, C, Ro - 1, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(C, C, Ri + 1.5, 0, Math.PI * 2); g.stroke();
        const N = 16, rb = (Ro + Ri) / 2, speed = this.spinning ? 1 : 2;
        for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2 - Math.PI / 2;
            const lit = (((i - Math.floor(this.rimPhase / speed)) % 4) + 4) % 4 < 2;
            const x = C + Math.cos(a) * rb, y = C + Math.sin(a) * rb;
            if (lit) { const gl = g.createRadialGradient(x, y, 0, x, y, 11); gl.addColorStop(0, 'rgba(255,250,190,.95)'); gl.addColorStop(1, 'rgba(255,230,120,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill(); }
            g.beginPath(); g.arc(x, y, 4.6, 0, Math.PI * 2); g.fillStyle = lit ? '#fffbd0' : '#b9741a'; g.fill();
            g.lineWidth = 1.2; g.strokeStyle = '#8a5008'; g.stroke();
        }
        // выигрышный сектор (всегда под стрелкой, сверху)
        const left = this.winGlow.until - performance.now();
        if (left > 0) {
            const step = (Math.PI * 2) / Math.max(1, Wheel.sectors().length), pulse = 0.35 + 0.3 * Math.sin(performance.now() / 90);
            g.beginPath(); g.moveTo(C, C); g.arc(C, C, Ri, -Math.PI / 2 - step / 2, -Math.PI / 2 + step / 2); g.closePath();
            g.fillStyle = `rgba(255,255,255,${(pulse * Math.min(1, left / 600)).toFixed(2)})`; g.fill();
            g.lineWidth = 4; g.strokeStyle = `rgba(255,236,140,${Math.min(1, left / 600).toFixed(2)})`; g.stroke();
        }
    },

    _drawWheel() {
        const cv = /** @type {HTMLCanvasElement} */ (this.el['nms-wheel']);
        if (!cv) return;
        const g = cv.getContext('2d');
        const S = 340, sc = cv.width / S;
        g.setTransform(sc, 0, 0, sc, 0, 0);
        g.clearRect(0, 0, S, S);
        const C = S / 2, R = C * 0.87;       // диск = внутренность обода
        const secs = Wheel.sectors();
        const n = secs.length, step = (Math.PI * 2) / n;
        const pal = ['#ff7eb6', '#ffc93c', '#4fc3ff', '#6fe39a', '#a98bff', '#ff8f5e', '#4ad8e8', '#ffd84a'];
        const maxCoins = Math.max(0, ...secs.map((s) => s.coins || 0));
        g.save(); g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); g.clip();
        secs.forEach((s, i) => {
            const mid = -Math.PI / 2 + i * step;
            const col = pal[i % pal.length];
            g.beginPath(); g.moveTo(C, C); g.arc(C, C, R + 2, mid - step / 2, mid + step / 2); g.closePath();
            const gx = C + Math.cos(mid) * R * 0.55, gy = C + Math.sin(mid) * R * 0.55;
            const gr = g.createRadialGradient(gx, gy, 4, C, C, R);
            gr.addColorStop(0, shopShade(col, 0.55)); gr.addColorStop(0.55, col); gr.addColorStop(1, shopShade(col, -0.18));
            g.fillStyle = gr; g.fill();
            // мягкий блик вдоль сектора и светлая дуга у края
            g.save(); g.clip();
            const hl = g.createLinearGradient(C + Math.cos(mid - step / 2) * R, C + Math.sin(mid - step / 2) * R, C + Math.cos(mid + step / 2) * R, C + Math.sin(mid + step / 2) * R);
            hl.addColorStop(0, 'rgba(255,255,255,.38)'); hl.addColorStop(0.5, 'rgba(255,255,255,0)');
            g.fillStyle = hl; g.fillRect(0, 0, S, S);
            g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.32)'; g.beginPath(); g.arc(C, C, R - 10, mid - step / 2 + 0.06, mid + step / 2 - 0.06); g.stroke();
            g.restore();
            // содержимое: иконка + подпись стопкой, всегда «стоя»
            const rr = R * 0.68, px = C + Math.cos(mid) * rr, py = C + Math.sin(mid) * rr;
            g.save(); g.translate(px, py);
            const edge = shopShade(col, -0.58);
            let label, labelNun = false;
            if (s.kind === 'coins') {
                label = GameHud.fmt(s.coins);
                if (s.coins >= maxCoins && s.coins >= 2000) this._wImg(g, 'chest', 0, -14, 58);
                else if (s.coins >= 1000) this._wImg(g, 'bag', 0, -14, 52);
                else if (s.coins >= 500) { this._wImg(g, 'coin', -11, -10, 34); this._wImg(g, 'coin', 11, -14, 34); this._wImg(g, 'coin', 0, -20, 34); }
                else this._wImg(g, 'coin', 0, -14, 42);
            } else {
                const it = s.itemId ? Shop.item(s.itemId) : null;
                const rc = it ? SHOP_RARITY_COLOR[it.rarity || 'common'] : '#b49bff';
                label = this.t('nm.wheel.mystery'); labelNun = true;
                const url = it ? GameShopIcons.get(it.id) : '';
                if (it && it.model && !url) this._want3d(it);
                const ic = url ? this._wDyn(url) : null;
                const glow = g.createRadialGradient(0, -14, 2, 0, -14, 34);
                glow.addColorStop(0, rc + 'cc'); glow.addColorStop(1, rc + '00');
                g.fillStyle = glow; g.beginPath(); g.arc(0, -14, 34, 0, Math.PI * 2); g.fill();
                if (ic && ic.complete && ic.naturalWidth) g.drawImage(ic, -25, -39, 50, 50); else this._wImg(g, 'gift', 0, -14, 46);
                this._wImg(g, 'sparkles', 20, -34, 22);
            }
            g.font = labelNun ? "900 17px 'NM Nunito',sans-serif" : "400 27px 'NM Titan','NM Nunito',sans-serif";
            g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = labelNun ? 5 : 6.5;
            g.strokeStyle = edge; g.strokeText(label, 0, 21, 84);
            g.fillStyle = '#ffffff'; g.fillText(label, 0, 21, 84);
            g.restore();
        });
        // белые разделители и золотые колышки
        for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + i * step + step / 2;
            g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.moveTo(C, C); g.lineTo(C + Math.cos(a) * R, C + Math.sin(a) * R); g.stroke();
            const x = C + Math.cos(a) * (R - 6), y = C + Math.sin(a) * (R - 6);
            g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.fillStyle = '#e8a41a'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#8a5008'; g.stroke();
            g.beginPath(); g.arc(x - 1.5, y - 1.8, 2, 0, Math.PI * 2); g.fillStyle = '#fff6c0'; g.fill();
        }
        g.restore();
    },

    /** Картинка по ключу, по центру (x, y), размер size; нет файла — жёлтый кружок. @param {CanvasRenderingContext2D} g @param {string} key @param {number} x @param {number} y @param {number} size */
    _wImg(g, key, x, y, size) {
        const im = this.wImgs[key];
        if (im && im.complete && im.naturalWidth) { g.drawImage(im, x - size / 2, y - size / 2, size, size); return; }
        g.beginPath(); g.arc(x, y, size * 0.4, 0, Math.PI * 2); g.fillStyle = '#ffc533'; g.fill();
        g.lineWidth = 3; g.strokeStyle = '#e08a00'; g.stroke();
    },

    /** @type {Record<string, HTMLImageElement>} */
    _dynImgs: {},
    /** Картинка из data URL (3D-иконка предмета). @param {string} url */
    _wDyn(url) {
        let im = this._dynImgs[url];
        if (!im) { im = new Image(); im.onload = () => { if (this.mode === 'wheel' && !this.spinning) this._drawWheel(); }; im.src = url; this._dynImgs[url] = im; }
        return im;
    },

    /** Конфетти и монетки из центра колеса при остановке. */
    _wheelBurst() {
        const box = this.el['nms-wbox'];
        if (!box) return;
        const cols = ['#ff7eb6', '#ffc93c', '#4fc3ff', '#6fe39a', '#a98bff', '#ff8f5e'];
        for (let i = 0; i < 34; i++) {
            const e = document.createElement('i');
            const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 130;
            e.className = 'nms-conf' + (i % 4 === 0 ? ' coin' : '');
            e.style.cssText = `--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - 40).toFixed(0)}px;--r:${Math.round(Math.random() * 720)}deg;background-color:${cols[i % cols.length]};animation-delay:${(Math.random() * 0.15).toFixed(2)}s`;
            if (i % 4 === 0) e.style.backgroundImage = "url('assets/ui/icons/coin.webp')";
            box.appendChild(e);
            setTimeout(() => e.remove(), 1700);
        }
    },

    _paintWheelButtons() {
        const box = this.el['nms-wbtns'];
        if (!box) return;
        const st = Wheel.status(), I = GameHud.ICONS;
        const adsOk = typeof Platform.rewardedSupported === 'function' ? Platform.rewardedSupported() : true;
        const lock = this.spinning;
        const html = `<button class="nms-btn b-gold nms-wide ${st.canSpinFree && !lock ? 'pulse' : ''}" data-a="wfree" ${st.canSpinFree && !lock ? '' : 'disabled'}><i>${I.wheel}</i><b>${st.freeLabel}</b></button>
<button class="nms-btn b-green nms-wide" data-a="wad" data-noad ${st.canSpinAd && adsOk && !lock ? '' : 'disabled'}><i>${I.ad}</i><b>${st.adLabel}</b></button>`;
        if (box.getAttribute('data-h') !== html) { box.innerHTML = html; box.setAttribute('data-h', html); }
        let note = '';
        if (lock) note = Wheel.t('wheel.spinning');
        else if (!adsOk && !st.freeAvailable) note = this.t('nm.wheel.noAds');
        else if (st.hint) note = st.hint;
        const n = this.el['nms-wnote'];
        if (n && n.textContent !== note) n.textContent = note;
        const x = this.el['nms-x'];
        if (x) x.toggleAttribute('disabled', lock);
    },

    /** @param {boolean} ad */
    async _spin(ad) {
        if (this.spinning) return;
        const st = Wheel.status();
        if (ad ? !st.canSpinAd : !st.canSpinFree) return;
        this.spinning = true;
        this._paintWheelButtons();
        const res = ad ? await Wheel.spinAd() : Wheel.spinFree();
        if (!res || !res.ok) {
            this.spinning = false;
            this._paintWheelButtons();
            if (res && (res.reason === 'adFailed' || res.reason === 'adUnavailable')) this.toast(this.t('nm.wheel.adFailed'));
            return;
        }
        this._animate(res);
    },

    /** Диск крутится до угла, выбранного заранее (Wheel.angleFrom), и встаёт ровно на сектор; приз — Wheel.finish(). @param {any} res */
    _animate(res) {
        const a0 = this.wheelAngle;
        const target = Wheel.angleFrom(a0, res);
        const dur = Math.max(1500, res.durationMs || 5500);
        const t0 = performance.now();
        let lastSector = Wheel.sectorAt(a0), done = false;
        const pointer = this.el['nms-pointer'];
        const finish = () => {
            if (done) return;
            done = true;
            this.wheelAngle = ((target % 360) + 360) % 360;
            this._applyWheel(this.wheelAngle);
            const fin = Wheel.finish();
            this.spinning = false;
            this.winGlow = { until: performance.now() + 2400, sector: res.sector };
            if (this.mode === 'wheel') this._wheelBurst();
            if (fin && fin.ok) {
                GameSfx.play('reward');
                this._celebrate('');
                this._showPrize(this.t('nm.wheel.won'), fin.got, false);
            }
            if (this.mode === 'wheel') { this._drawWheel(); this._paintWheelButtons(); }
        };
        const step = (/** @type {number} */ now) => {
            if (done) return;
            const k = Math.min(1, (now - t0) / dur);
            const e = 1 - Math.pow(1 - k, 3.6);
            const ang = a0 + (target - a0) * e;
            this._applyWheel(ang);
            const s = Wheel.sectorAt(ang);
            if (s !== lastSector) {
                lastSector = s;
                const nowT = performance.now();
                if (nowT - this._lastTick > 55) { this._lastTick = nowT; GameSfx.play('click', { rate: 0.9 + 0.4 * (1 - k), volume: 0.5 }); }
                if (pointer) { pointer.classList.remove('flick'); void pointer.offsetWidth; pointer.classList.add('flick'); }
            }
            if (k < 1) requestAnimationFrame(step); else finish();
        };
        requestAnimationFrame(step);
        setTimeout(finish, dur + 700);   // вкладка в фоне: rAF молчит, приз всё равно выдаётся один раз
    },

    // ====================================================================================================
    // Окно приза
    // ====================================================================================================

    /** @param {string} title @param {any[]} got @param {boolean} [skin] */
    _showPrize(title, got, skin) {
        const pop = this.el['nms-pop'];
        const I = GameHud.ICONS;
        let items = '';
        this.popItem = null;
        let eq = '';
        for (const x of got || []) {
            if (x.type === 'coins') {
                items += `<div class="nms-prize"><span class="pico">${I.coin}</span><b class="pnum">+${GameHud.fmt(x.amount)}</b>${x.converted ? `<small>${this.t('nm.wheel.dup')}</small>` : ''}</div>`;
            } else if (x.id) {
                const it = Shop.item(x.id);
                if (!it) continue;
                this.popItem = x.id;
                items += `<div class="nms-prize"><span class="nms-dome big r-${it.rarity}" style="--rc:${SHOP_RARITY_COLOR[it.rarity]}"><span class="nms-ico">${this.iconHtml(it)}</span></span><b class="pname">${Shop.name(x.id)}</b><span class="nms-rar r-${it.rarity}" style="--rc:${SHOP_RARITY_COLOR[it.rarity]}">${this.t('nm.shop.rarity.' + it.rarity)}</span></div>`;
                if (it.model) this._want3d(it);
                eq = `<button class="nms-btn b-blue nms-wide" data-a="popeq"><b>${this.t('nm.wheel.equip')}</b></button>`;
            }
        }
        void skin;
        pop.innerHTML = `<div class="nms-popcard"><div class="nms-rays"></div><div class="nms-ribbon">${title}</div>${items}${eq}<button class="nms-btn b-green nms-wide" data-a="popok"><b>${this.t('nm.wheel.ok')}</b></button></div>`;
        pop.classList.add('on');
    },

    _closePop() {
        this.el['nms-pop'].classList.remove('on');
        this.popItem = null;
        if (this.mode === 'shop') this._refreshShop(false);
    },

    /** Событие Shop при открытом окне: обновить карточки (покупка из подарка, колеса, рекламы). @param {any} e */
    onShopEvent(e) {
        if (this.mode === 'shop' && e.type !== 'preview') this._refreshShop(false);
        else if (this.mode === 'shop') this._paintDock();
    },
};

// ======================================================================================================
// Стили
// ======================================================================================================

const GAME_SHOP_CSS = `
#nm-shop{position:fixed;left:0;top:0;width:100%;height:100%;z-index:30;display:none;overflow:hidden;font-family:'NM Nunito',system-ui,sans-serif;color:#1f2d5c;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;
 --k:1;--headH:54px;--ws:300px;--safe-t:env(safe-area-inset-top,0px);--safe-b:env(safe-area-inset-bottom,0px);--safe-r:env(safe-area-inset-right,0px);--safe-l:env(safe-area-inset-left,0px)}
#nm-shop.on{display:block}
#nm-shop *{box-sizing:border-box}
#nm-shop button{font-family:inherit;cursor:pointer;border:0;outline:none;padding:0;color:inherit;background:none;-webkit-tap-highlight-color:transparent}
#nm-shop svg,#nm-shop img.nm-ic{display:block;width:100%;height:100%;object-fit:contain;-webkit-user-drag:none;pointer-events:none}
.nms-dim{position:absolute;inset:0;background:rgba(40,70,140,.4);opacity:0;transition:opacity .25s;pointer-events:none}
.m-gift .nms-dim,.m-wheel .nms-dim{opacity:1}
.nms-flash{position:absolute;inset:0;background:#f4fbff;opacity:0;pointer-events:none;transition:opacity .2s;z-index:1}
.nms-flash.on{opacity:1}
.nms-head{position:absolute;left:0;right:0;top:0;height:calc(var(--headH) + var(--safe-t));display:flex;align-items:center;gap:calc(8px*var(--k));padding:var(--safe-t) calc(10px*var(--k) + var(--safe-r)) 0 calc(12px*var(--k) + var(--safe-l));z-index:4;pointer-events:none}
.nms-title{font-family:'NM Nunito',system-ui,sans-serif;font-weight:900;font-synthesis:none;letter-spacing:.02em;font-size:calc(30px*var(--k));line-height:1.05;color:#fff;-webkit-text-stroke:calc(8px*var(--k)) #ff5fa2;paint-order:stroke fill;text-transform:uppercase;filter:drop-shadow(0 calc(4px*var(--k)) 0 rgba(120,30,90,.25));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.m-gift .nms-title,.m-wheel .nms-title{visibility:hidden}
.nms-coins{margin-left:auto;display:flex;align-items:center;gap:6px;background:#fff;border-radius:999px;padding:calc(5px*var(--k)) calc(16px*var(--k)) calc(5px*var(--k)) calc(6px*var(--k));box-shadow:0 4px 0 #b9c8ea,0 8px 18px rgba(30,60,140,.18);pointer-events:auto;flex:none}
.nms-coins i{display:block;width:calc(26px*var(--k));height:calc(26px*var(--k))}
.nms-coins b{font-family:'NM Titan','NM Nunito',sans-serif;font-weight:400;font-size:calc(19px*var(--k));color:#1f2d5c}
.nms-x{flex:none;width:calc(44px*var(--k));height:calc(44px*var(--k));border-radius:calc(15px*var(--k))!important;background:linear-gradient(#ff8c96,#ff4f5e)!important;padding:calc(10px*var(--k))!important;box-shadow:inset 0 -4px 0 rgba(0,0,0,.15),inset 0 3px 0 rgba(255,255,255,.4),0 5px 12px rgba(30,60,140,.25);pointer-events:auto}
.nms-x:disabled{filter:grayscale(.6);opacity:.6}
.nms-panel{position:absolute;display:none;flex-direction:column;z-index:3;padding:calc(10px*var(--k)) calc(10px*var(--k)) calc(8px*var(--k) + var(--safe-b));
 background:radial-gradient(circle at 12px 12px,rgba(255,255,255,.75) 2.2px,transparent 2.8px) 0 0/26px 26px,linear-gradient(#fffdf6,#e6f0ff);
 border:calc(4px*var(--k)) solid #fff;border-bottom:0;border-radius:calc(30px*var(--k)) calc(30px*var(--k)) 0 0;box-shadow:0 calc(-6px*var(--k)) 0 #c6d4f2,0 -10px 40px rgba(20,40,110,.28);animation:nms-rise .4s cubic-bezier(.2,1.3,.4,1)}
.nms-panel.land{border-right:0;border-radius:calc(30px*var(--k)) 0 0 0;box-shadow:calc(-6px*var(--k)) 0 0 #c6d4f2,-10px 0 40px rgba(20,40,110,.28);padding-right:calc(10px*var(--k) + var(--safe-r));animation:nms-slide .4s cubic-bezier(.2,1.3,.4,1)}
.m-shop .nms-panel{display:flex}
.nms-tabs{flex:none;display:flex;gap:calc(6px*var(--k));overflow-x:auto;overflow-y:hidden;padding:calc(5px*var(--k)) calc(3px*var(--k)) calc(9px*var(--k));scrollbar-width:none}
.nms-tabs::-webkit-scrollbar{display:none}
.nms-tab{position:relative;flex:1 0 calc(54px*var(--k));max-width:calc(92px*var(--k));height:calc(56px*var(--k));border-radius:calc(18px*var(--k))!important;background:var(--tb)!important;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;box-shadow:inset 0 calc(-5px*var(--k)) 0 rgba(0,0,0,.16),inset 0 3px 0 rgba(255,255,255,.45),0 4px 8px rgba(30,60,140,.18);opacity:.82;filter:saturate(.8);transition:transform .18s cubic-bezier(.3,1.6,.5,1),opacity .15s}
.nms-tab svg{width:calc(25px*var(--k));height:calc(25px*var(--k));flex:none}
.nms-tab span{font-size:calc(10px*var(--k));font-weight:900;text-transform:uppercase;text-shadow:0 1px 0 rgba(0,0,0,.28);letter-spacing:.02em;line-height:1}
.nms-tab.on{opacity:1;filter:none;transform:translateY(-3px) scale(1.07);box-shadow:inset 0 calc(-5px*var(--k)) 0 rgba(0,0,0,.16),inset 0 3px 0 rgba(255,255,255,.45),0 0 0 calc(3px*var(--k)) #fff,0 7px 14px rgba(30,60,140,.3)}
.nms-grid{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:grid;grid-template-columns:repeat(auto-fill,minmax(calc(100px*var(--k)),1fr));gap:calc(9px*var(--k));padding:calc(8px*var(--k)) calc(4px*var(--k)) calc(12px*var(--k));align-content:start;scrollbar-width:thin;scrollbar-color:#b9c8ea transparent;overscroll-behavior:contain;touch-action:pan-y}
.nms-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:calc(4px*var(--k));padding:calc(8px*var(--k)) calc(5px*var(--k)) calc(7px*var(--k));min-width:0;border-radius:calc(22px*var(--k))!important;border:calc(3px*var(--k)) solid transparent!important;
 background:linear-gradient(#ffffff,#f1f5ff) padding-box,linear-gradient(var(--rc),var(--rc)) border-box!important;box-shadow:0 calc(4px*var(--k)) 0 rgba(150,170,215,.55),0 8px 14px rgba(30,60,140,.1);text-align:center;transition:transform .18s cubic-bezier(.3,1.6,.5,1)}
.nms-card.is-sel{transform:translateY(-3px) scale(1.04);box-shadow:0 0 0 calc(3px*var(--k)) #fff,0 0 0 calc(6px*var(--k)) #2f7df6,0 8px 16px rgba(30,60,140,.25);z-index:1}
.nms-card.r-epic{background:linear-gradient(#ffffff,#f6efff) padding-box,linear-gradient(110deg,#b06bff,#e7c8ff,#7a4bff,#b06bff) border-box!important;background-size:100% 100%,300% 100%!important;animation:nms-flow 3.2s linear infinite,nms-glowe 2.4s ease-in-out infinite}
.nms-card.r-legendary{background:linear-gradient(#ffffff,#fff6e0) padding-box,linear-gradient(110deg,#ffb02e,#fff2a8,#ff7a1f,#ffd24a,#ffb02e) border-box!important;background-size:100% 100%,300% 100%!important;animation:nms-flow 2.6s linear infinite,nms-glowl 2s ease-in-out infinite}
.nms-card.r-mythic{background:linear-gradient(#ffffff,#fff0f8) padding-box,linear-gradient(110deg,#ff4fa3,#ffd23a,#4dffb0,#4db8ff,#b06bff,#ff4fa3) border-box!important;background-size:100% 100%,400% 100%!important;animation:nms-flow 2.2s linear infinite,nms-glowm 1.8s ease-in-out infinite}
.nms-card.r-epic.is-sel,.nms-card.r-legendary.is-sel,.nms-card.r-mythic.is-sel{animation:nms-flow 2.6s linear infinite}
.nms-gem{position:absolute;left:calc(7px*var(--k));top:calc(7px*var(--k));width:calc(11px*var(--k));height:calc(11px*var(--k));border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--rc) 60%);box-shadow:0 0 0 calc(2px*var(--k)) #fff,0 2px 4px rgba(30,60,140,.3);z-index:2}
.nms-chk{position:absolute;right:calc(6px*var(--k));top:calc(6px*var(--k));width:calc(22px*var(--k));height:calc(22px*var(--k));border-radius:50%;background:linear-gradient(#59e08a,#1fae68);padding:calc(4px*var(--k));box-shadow:0 0 0 calc(2px*var(--k)) #fff,0 3px 6px rgba(20,100,60,.35);transform:scale(0);transition:transform .25s cubic-bezier(.3,1.8,.5,1);z-index:2}
.is-eq .nms-chk{transform:scale(1)}
.nms-dome{position:relative;flex:none;display:flex;align-items:center;justify-content:center;width:calc(70px*var(--k));height:calc(70px*var(--k));border-radius:50%;background:radial-gradient(circle at 32% 24%,rgba(255,255,255,.95) 0,rgba(255,255,255,0) 38%),radial-gradient(circle at 50% 62%,color-mix(in srgb,var(--rc,#b9c6e4) 28%,#fff),color-mix(in srgb,var(--rc,#b9c6e4) 55%,#fff));box-shadow:inset 0 calc(-5px*var(--k)) 0 rgba(30,60,140,.12),0 calc(5px*var(--k)) 0 rgba(30,60,140,.1);overflow:hidden}
.nms-dome.mini{width:calc(52px*var(--k));height:calc(52px*var(--k))}
.nms-dome.big{width:calc(110px*var(--k));height:calc(110px*var(--k))}
.nms-ico{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.nms-name{font-weight:900;font-size:calc(11.5px*var(--k));line-height:1.12;min-height:2.24em;display:flex;align-items:center;justify-content:center;max-width:100%;overflow:hidden;color:#1f2d5c;padding:0 2px}
.nms-tag{display:flex;align-items:center;justify-content:center;min-height:calc(23px*var(--k));width:100%}
.nms-tag em{font-style:normal;display:inline-flex;align-items:center;justify-content:center;gap:calc(4px*var(--k));padding:calc(3px*var(--k)) calc(9px*var(--k));border-radius:99px;font-weight:900;font-size:calc(11px*var(--k));text-transform:uppercase;line-height:1.1;white-space:nowrap;max-width:100%}
.nms-tag i{display:block;width:calc(16px*var(--k));height:calc(16px*var(--k));flex:none}
.t-coin{background:#fff3cf;color:#c77a00;font-family:'NM Titan','NM Nunito',sans-serif;font-weight:400!important;font-size:calc(13px*var(--k))!important;box-shadow:inset 0 -2px 0 #ffe08a}
.t-coin.poor{color:#c4574a;background:#ffe3df;box-shadow:inset 0 -2px 0 #ffc4bc}
.t-ad{background:#dcf8e6;box-shadow:inset 0 -2px 0 #aeeac4}
.pips{display:flex;gap:calc(3px*var(--k))}
.pips s{display:block;width:calc(8px*var(--k));height:calc(8px*var(--k));border-radius:50%;background:#fff;box-shadow:inset 0 0 0 calc(2px*var(--k)) #7fd6a2}
.pips s.on{background:#2fbf71;box-shadow:none}
.t-eq{background:#d9f7e5;color:#17894f;box-shadow:inset 0 -2px 0 #aeeac4}
.t-own{background:#e6edfb;color:#5a6a9a;box-shadow:inset 0 -2px 0 #cfdaf1}
.t-ex{background:#ffe6f2;color:#d23d86;box-shadow:inset 0 -2px 0 #ffc3df;font-size:calc(9.5px*var(--k))!important}
.nms-dock{flex:none;display:flex;align-items:center;gap:calc(10px*var(--k));padding:calc(8px*var(--k)) calc(10px*var(--k));border-radius:calc(24px*var(--k));background:linear-gradient(#ffffff,#eef4ff);box-shadow:inset 0 calc(-4px*var(--k)) 0 #cfdcf5,0 3px 10px rgba(30,60,140,.12);min-height:calc(70px*var(--k))}
.nms-dock-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:calc(2px*var(--k))}
.nms-dock-name{font-weight:900;font-size:calc(15px*var(--k));line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-transform:uppercase}
.nms-rar{align-self:flex-start;font-size:calc(10px*var(--k));font-weight:900;text-transform:uppercase;color:#fff;background:var(--rc);padding:calc(2px*var(--k)) calc(9px*var(--k));border-radius:99px;text-shadow:0 1px 0 rgba(0,0,0,.25);letter-spacing:.03em}
.nms-dock-info small{font-size:calc(11px*var(--k));font-weight:800;color:#5a6a9a;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nms-dock-info small .ic{display:inline-block;width:calc(14px*var(--k));height:calc(14px*var(--k));vertical-align:-3px;margin-right:3px}
.nms-btn{position:relative;display:flex;align-items:center;justify-content:center;gap:calc(6px*var(--k));min-height:calc(48px*var(--k));min-width:calc(104px*var(--k));padding:calc(8px*var(--k)) calc(14px*var(--k)) calc(11px*var(--k));border-radius:calc(17px*var(--k))!important;color:#fff!important;font-weight:900;font-size:calc(15px*var(--k));text-transform:uppercase;text-shadow:0 2px 0 rgba(0,0,0,.18);box-shadow:inset 0 calc(-5px*var(--k)) 0 rgba(0,0,0,.17),inset 0 3px 0 rgba(255,255,255,.4),0 5px 12px rgba(30,60,140,.2);flex-wrap:wrap;line-height:1.05}
.nms-btn i{display:block;width:calc(22px*var(--k));height:calc(22px*var(--k));flex:none}
.nms-btn b{font-weight:900}
.nms-btn small{flex-basis:100%;text-align:center;font-size:calc(10.5px*var(--k));text-transform:none;font-weight:800;opacity:.92;margin-top:-3px}
.nms-btn:disabled{filter:grayscale(.55) brightness(.97);opacity:.72;cursor:default}
.nms-btn.b-coral{background:linear-gradient(#ff8b6a,#ff5a4a)!important;font-family:'NM Titan','NM Nunito',sans-serif;font-weight:400}
.nms-btn.b-coral b{font-family:'NM Titan','NM Nunito',sans-serif;font-weight:400;font-size:1.1em}
.nms-btn.b-green{background:linear-gradient(#7ef08f,#2fbf71)!important}
.nms-btn.b-blue{background:linear-gradient(#69b4ff,#2f7df6)!important}
.nms-btn.b-gold{background:linear-gradient(#ffd96b,#ffad2e)!important}
.nms-btn.b-grey{background:linear-gradient(#b9c4de,#8c9bc0)!important}
.nms-wide{width:100%}
.nm-jelly{animation:nm-jelly .45s cubic-bezier(.3,1.6,.5,1)}
/* превью */
.nms-digit{position:relative;display:inline-block;font-family:'NM Titan','NM Nunito',sans-serif;font-size:calc(46px*var(--k));line-height:1;color:transparent;-webkit-text-stroke:calc(2.2px*var(--k)) var(--edge);background:linear-gradient(165deg,var(--hl) 0%,var(--c1) 45%,var(--c2) 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 calc(3px*var(--k)) 0 rgba(30,40,90,.28))}
.nms-digit.a-shift{background:linear-gradient(120deg,var(--c1),var(--hl),var(--c2),var(--c1));background-size:300% 100%;-webkit-background-clip:text;background-clip:text;animation:nms-bgpos 3.2s ease-in-out infinite}
.nms-digit.a-rainbow{background:linear-gradient(165deg,#fff3fb 0,#ff7ab8 45%,#ffb347 100%);-webkit-background-clip:text;background-clip:text;animation:nms-hue 3.4s linear infinite}
.nms-digit.a-pulse{animation:nms-pulse 1.3s ease-in-out infinite}
.nms-digit.glow:not(.a-pulse){animation:nms-pulse 2s ease-in-out infinite}
.nms-digit.trans{opacity:.82}
.nms-digit.shine::after{content:attr(data-d);position:absolute;left:0;top:0;width:100%;height:100%;color:transparent;-webkit-text-stroke:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.95) 50%,transparent 62%) -150% 0/260% 100% no-repeat;-webkit-background-clip:text;background-clip:text;animation:nms-shine 2.4s ease-in-out infinite}
.nms-tw{position:absolute;left:var(--x);top:var(--y);width:calc(11px*var(--k));height:calc(11px*var(--k));background:#fff;clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);animation:nms-twink 1.7s ease-in-out infinite;animation-delay:var(--d);opacity:0;filter:drop-shadow(0 0 3px #fff)}
.nms-img{position:absolute;inset:6%;width:88%;height:88%;object-fit:contain;opacity:0;transition:opacity .25s;filter:drop-shadow(0 calc(3px*var(--k)) 2px rgba(30,40,90,.25));pointer-events:none}
.nms-img.on{opacity:1}
.nms-ph{position:absolute;inset:14%;color:var(--rc,#b9c6e4);transition:opacity .2s;animation:nms-breathe 1.6s ease-in-out infinite}
.nms-ph.gone{opacity:0;animation:none}
.nms-trk{width:100%;height:100%;border-radius:50%;filter:none}
.nms-fxi{position:absolute;inset:0;overflow:visible}
.nms-fxi .p{position:absolute;left:50%;top:50%;width:calc(20px*var(--k));height:calc(20px*var(--k));margin:calc(-10px*var(--k)) 0 0 calc(-10px*var(--k));opacity:0;animation:nms-p-burst 1.9s ease-out infinite;animation-delay:calc(var(--dl) - 1.6s);transform:scale(var(--s));filter:drop-shadow(0 1px 1px rgba(30,40,90,.45))}
.nms-fxi.s-fall .p{top:18%;animation-name:nms-p-fall}
.nms-fxi.s-rise .p,.nms-fxi.s-fountain .p{top:78%;animation-name:nms-p-rise}
.nms-fxi.s-fountain .p{animation-name:nms-p-fount}
.nms-fxi.s-ring .p{animation-name:nms-p-ring}
.nms-fxi.s-trail .p,.nms-fxi.s-trailup .p{left:62%;animation-name:nms-p-trail;animation-duration:1.5s}
.nms-fxi.s-trailup .p{animation-name:nms-p-trailup}
.nms-mini{position:absolute;right:16%;top:50%;transform:translateY(-52%);font-family:'NM Titan',sans-serif;font-size:calc(30px*var(--k));line-height:1;color:#2b74f4;-webkit-text-stroke:calc(2px*var(--k)) #1b4db0;filter:drop-shadow(0 2px 0 rgba(30,40,90,.25))}
/* окна подарка и колеса */
.nms-modal{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:calc(var(--headH) + var(--safe-t)) calc(12px + var(--safe-r)) calc(12px + var(--safe-b)) calc(12px + var(--safe-l));z-index:3}
.m-gift .nms-modal,.m-wheel .nms-modal{display:flex}
.nms-win{position:relative;width:min(calc(440px*var(--k)),100%);max-height:100%;overflow-y:auto;overflow-x:hidden;background:radial-gradient(circle at 12px 12px,rgba(255,255,255,.8) 2.2px,transparent 2.8px) 0 0/26px 26px,linear-gradient(#ffffff,#eaf1ff);border-radius:calc(30px*var(--k));padding:calc(20px*var(--k)) calc(16px*var(--k)) calc(16px*var(--k));display:flex;flex-direction:column;align-items:center;gap:calc(10px*var(--k));box-shadow:0 8px 0 #c6d4f2,0 20px 50px rgba(20,40,110,.35);scrollbar-width:none;animation:nms-pop .45s cubic-bezier(.2,1.5,.4,1)}
.nms-ribbon{font-family:'NM Nunito',system-ui,sans-serif;font-weight:900;font-synthesis:none;letter-spacing:.02em;font-size:calc(28px*var(--k));line-height:1.05;color:#fff;-webkit-text-stroke:calc(8px*var(--k)) #ff9d1f;paint-order:stroke fill;text-transform:uppercase;text-align:center;filter:drop-shadow(0 calc(3px*var(--k)) 0 rgba(150,90,0,.25))}
.m-wheel .nms-ribbon{-webkit-text-stroke-color:#7b5cff}
.nms-days{display:grid;grid-template-columns:repeat(4,1fr);gap:calc(8px*var(--k));width:100%}
.nms-day{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(3px*var(--k));min-height:calc(92px*var(--k));padding:calc(8px*var(--k)) calc(4px*var(--k));border-radius:calc(20px*var(--k));background:linear-gradient(#fff,#f1f5ff);box-shadow:inset 0 calc(-4px*var(--k)) 0 #d7e1f6,0 3px 8px rgba(30,60,140,.12);text-align:center}
.nms-day em{font-style:normal;font-weight:900;font-size:calc(10.5px*var(--k));text-transform:uppercase;color:#5a6a9a}
.nms-day .dico{display:block;width:calc(30px*var(--k));height:calc(30px*var(--k))}
.nms-day .dgift{position:absolute;right:calc(5px*var(--k));bottom:calc(20px*var(--k));width:calc(20px*var(--k));height:calc(20px*var(--k));filter:drop-shadow(0 1px 0 rgba(30,60,140,.35))}
.nms-day .dnum{font-family:'NM Titan','NM Nunito',sans-serif;font-weight:400;font-size:calc(17px*var(--k));color:#e08a00}
.nms-day.st-today{background:linear-gradient(#fffbe6,#ffeaa1);box-shadow:inset 0 calc(-4px*var(--k)) 0 #ffd24a,0 0 0 calc(3px*var(--k)) #ffb02e,0 6px 14px rgba(255,160,30,.4);animation:nms-wobble 1.4s ease-in-out infinite}
.nms-day.st-claimed{background:linear-gradient(#e8fbef,#c9f2d9);box-shadow:inset 0 calc(-4px*var(--k)) 0 #a9e4c0}
.nms-day.st-claimed .dico,.nms-day.st-claimed .dnum{opacity:.55}
.nms-day.st-locked,.nms-day.st-tomorrow{opacity:.86}
.nms-day .dchk{position:absolute;right:calc(5px*var(--k));top:calc(5px*var(--k));width:calc(22px*var(--k));height:calc(22px*var(--k));border-radius:50%;background:linear-gradient(#59e08a,#1fae68);padding:calc(4px*var(--k));box-shadow:0 0 0 calc(2px*var(--k)) #fff}
.nms-day .dtag{position:absolute;top:calc(-9px*var(--k));left:50%;transform:translateX(-50%);background:#ff5a4a;color:#fff;font-weight:900;font-size:calc(10px*var(--k));padding:calc(2px*var(--k)) calc(9px*var(--k));border-radius:99px;text-transform:uppercase;box-shadow:0 2px 0 rgba(150,30,20,.35);white-space:nowrap}
.nms-day.big{grid-column:3/-1;flex-direction:row;gap:calc(10px*var(--k));padding:calc(8px*var(--k)) calc(10px*var(--k));background:linear-gradient(#fff6ff,#ecdfff);box-shadow:inset 0 calc(-4px*var(--k)) 0 #cdb6f5,0 0 0 calc(2px*var(--k)) #b06bff,0 3px 8px rgba(120,60,200,.2)}
.nms-day.big em{position:absolute;left:calc(8px*var(--k));top:calc(5px*var(--k))}
.nms-day.big .dtxt{display:flex;flex-direction:column;align-items:flex-start;text-align:left;min-width:0}
.nms-day.big .dtxt b{font-weight:900;font-size:calc(12.5px*var(--k));text-transform:uppercase;color:#7a3fd0}
.nms-day.big .dtxt small{font-weight:900;font-size:calc(13px*var(--k));color:#1f2d5c}
.nms-day.big.st-today{animation:nms-wobble 1.4s ease-in-out infinite;box-shadow:inset 0 calc(-4px*var(--k)) 0 #cdb6f5,0 0 0 calc(3px*var(--k)) #b06bff,0 6px 16px rgba(160,90,255,.45)}
.nms-btns{display:flex;flex-direction:column;gap:calc(8px*var(--k));width:100%}
.nms-note{min-height:calc(16px*var(--k));text-align:center;font-weight:800;font-size:calc(12px*var(--k));color:#5a6a9a;line-height:1.25}
.nms-wheelwin{gap:calc(8px*var(--k))}
.nms-wheel-box{position:relative;width:var(--ws);height:var(--ws);flex:none;margin-top:calc(14px*var(--k))}
.nms-wheel-wrap{position:absolute;inset:0;border-radius:50%;box-shadow:0 calc(14px*var(--k)) calc(18px*var(--k)) -6px rgba(20,30,90,.45),0 calc(6px*var(--k)) 0 #a8640a}
.nms-wheel-wrap canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:50%}
.nms-wheel-wrap #nms-wheel{inset:6.5%;width:87%;height:87%;will-change:transform}
.nms-wgloss{position:absolute;inset:6.5%;border-radius:50%;pointer-events:none;background:radial-gradient(ellipse at 34% 20%,rgba(255,255,255,.5) 0,rgba(255,255,255,0) 40%)}
.nms-hub{position:absolute;left:50%;top:50%;width:calc(var(--ws)*.17);height:calc(var(--ws)*.17);transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 28%,#fff6c0 0,#ffc93c 38%,#e08a00 100%);box-shadow:inset 0 calc(-5px*var(--k)) 0 rgba(120,60,0,.3),0 0 0 calc(4px*var(--k)) #fff,0 calc(5px*var(--k)) 10px rgba(30,40,110,.4)}
.nms-hub img{position:absolute;left:18%;top:18%;width:64%;height:64%;animation:nms-breathe 1.6s ease-in-out infinite}
.nms-hub::after{content:'';position:absolute;left:14%;top:8%;width:46%;height:28%;border-radius:50%;background:linear-gradient(rgba(255,255,255,.75),rgba(255,255,255,0));pointer-events:none}
.nms-pointer{position:absolute;left:50%;top:calc(var(--ws)*-.045);width:calc(var(--ws)*.12);height:calc(var(--ws)*.17);margin-left:calc(var(--ws)*-.06);filter:drop-shadow(0 calc(4px*var(--k)) 2px rgba(60,10,20,.5));transform-origin:50% 22%;z-index:2}
.nms-pointer.flick{animation:nms-flick .14s ease-out}
.nms-conf{position:absolute;left:50%;top:50%;width:calc(11px*var(--k));height:calc(11px*var(--k));margin:calc(-5px*var(--k)) 0 0 calc(-5px*var(--k));border-radius:3px;background-size:contain;background-repeat:no-repeat;pointer-events:none;z-index:3;animation:nms-conf 1.5s cubic-bezier(.2,.8,.4,1) forwards}
.nms-conf.coin{width:calc(20px*var(--k));height:calc(20px*var(--k));background-color:transparent!important;border-radius:0}
.nms-btn.pulse{animation:nms-btnglow 1.2s ease-in-out infinite}
@keyframes nms-conf{0%{opacity:1;transform:translate(0,0) rotate(0) scale(.5)}70%{opacity:1}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) + 80px)) rotate(var(--r)) scale(1)}}
@keyframes nms-btnglow{0%,100%{box-shadow:inset 0 calc(-5px*var(--k)) 0 rgba(0,0,0,.17),inset 0 3px 0 rgba(255,255,255,.4),0 5px 12px rgba(30,60,140,.2),0 0 0 rgba(255,200,40,0)}50%{box-shadow:inset 0 calc(-5px*var(--k)) 0 rgba(0,0,0,.17),inset 0 3px 0 rgba(255,255,255,.4),0 5px 12px rgba(30,60,140,.2),0 0 calc(18px*var(--k)) calc(5px*var(--k)) rgba(255,200,40,.85)}}
.nms-wright{width:100%;display:flex;flex-direction:column;gap:calc(6px*var(--k))}
@media (orientation:landscape) and (max-height:560px){
 .nms-wheelwin{flex-direction:row;flex-wrap:wrap;justify-content:center;align-items:center;column-gap:calc(18px*var(--k));width:min(calc(720px*var(--k)),100%);padding:calc(14px*var(--k)) calc(16px*var(--k))}
 .nms-wheelwin .nms-ribbon{flex-basis:100%}
 .nms-wheel-box{margin-top:calc(10px*var(--k))}
 .nms-wright{flex:1;min-width:calc(200px*var(--k));max-width:calc(320px*var(--k));width:auto}
 .nms-gift .nms-days{grid-template-columns:repeat(7,1fr)}
 .nms-gift{width:min(calc(760px*var(--k)),100%)}
 .nms-day{min-height:calc(78px*var(--k))}
 .nms-day.big{grid-column:auto;flex-direction:column;gap:2px;padding:calc(6px*var(--k)) 2px}
 .nms-day.big .dtxt{align-items:center;text-align:center}
 .nms-day.big .dtxt b{font-size:calc(9px*var(--k))}
 .nms-day.big .dtxt small{font-size:calc(10px*var(--k))}
 .nms-day.big em{position:static}
 .nms-day.big .nms-dome.mini{width:calc(40px*var(--k));height:calc(40px*var(--k))}
 .nms-dome{width:calc(56px*var(--k));height:calc(56px*var(--k))}
 .nms-dome.mini{width:calc(44px*var(--k));height:calc(44px*var(--k))}
 .nms-digit{font-size:calc(36px*var(--k))}
 .nms-name{font-size:calc(10.5px*var(--k))}
 .nms-btn{min-height:calc(42px*var(--k))}
}
/* окно приза */
.nms-pop{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(30,50,110,.5);z-index:6;padding:12px}
.nms-pop.on{display:flex}
.nms-popcard{position:relative;width:min(calc(320px*var(--k)),100%);max-height:100%;overflow:hidden auto;background:linear-gradient(#ffffff,#eef4ff);border-radius:calc(30px*var(--k));padding:calc(22px*var(--k)) calc(18px*var(--k)) calc(16px*var(--k));display:flex;flex-direction:column;align-items:center;gap:calc(10px*var(--k));box-shadow:0 8px 0 #c6d4f2,0 20px 50px rgba(20,40,110,.4);animation:nms-pop .5s cubic-bezier(.2,1.6,.4,1);scrollbar-width:none}
.nms-rays{position:absolute;left:50%;top:calc(34px*var(--k));width:calc(300px*var(--k));height:calc(300px*var(--k));margin:calc(-150px*var(--k)) 0 0 calc(-150px*var(--k));background:repeating-conic-gradient(rgba(255,214,90,.5) 0 9deg,transparent 9deg 18deg);border-radius:50%;-webkit-mask-image:radial-gradient(circle,#000 20%,transparent 68%);mask-image:radial-gradient(circle,#000 20%,transparent 68%);animation:nms-spin 9s linear infinite;pointer-events:none}
.nms-popcard>*{position:relative}
.nms-popcard .nms-rays{position:absolute}
.nms-prize{display:flex;flex-direction:column;align-items:center;gap:calc(6px*var(--k))}
.nms-prize .pico{display:block;width:calc(64px*var(--k));height:calc(64px*var(--k));animation:nms-wobble 1.2s ease-in-out infinite}
.nms-prize .pnum{font-family:'NM Titan','NM Nunito',sans-serif;font-weight:400;font-size:calc(40px*var(--k));line-height:1;color:#ffc533;-webkit-text-stroke:calc(3px*var(--k)) #e08a00;paint-order:stroke fill;filter:drop-shadow(0 calc(4px*var(--k)) 0 rgba(150,90,0,.25))}
.nms-prize small{font-weight:800;font-size:calc(12px*var(--k));color:#5a6a9a;text-align:center}
.nms-prize .pname{font-weight:900;font-size:calc(17px*var(--k));text-transform:uppercase;text-align:center}
.nms-toast{position:absolute;left:50%;bottom:calc(var(--safe-b) + 14px);transform:translate(-50%,30px);max-width:min(90%,420px);padding:calc(9px*var(--k)) calc(18px*var(--k));border-radius:99px;background:#1f2d5c;color:#fff;font-weight:900;font-size:calc(13px*var(--k));text-align:center;opacity:0;pointer-events:none;z-index:7;box-shadow:0 6px 16px rgba(10,20,60,.35)}
.nms-toast.on{animation:nms-toast 2.6s ease-out forwards}
.m-shop .nms-toast{bottom:auto;top:calc(var(--headH) + var(--safe-t) + 4px)}
.nms-busy{position:absolute;left:0;right:0;top:50%;text-align:center;font-family:'NM Nunito',system-ui,sans-serif;font-weight:900;font-synthesis:none;letter-spacing:.02em;font-size:calc(22px*var(--k));color:#fff;-webkit-text-stroke:calc(7px*var(--k)) #2b5bc4;paint-order:stroke fill;opacity:0;pointer-events:none;z-index:2;transition:opacity .2s}
.is-busy .nms-busy{opacity:1}
.is-busy .nms-panel{pointer-events:none}
.is-busy .nms-panel .nms-card,.is-busy .nms-panel .nms-btn{filter:saturate(.7)}
@keyframes nms-rise{from{transform:translateY(60%);opacity:0}to{transform:none;opacity:1}}
@keyframes nms-slide{from{transform:translateX(60%);opacity:0}to{transform:none;opacity:1}}
@keyframes nms-pop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes nms-spin{to{transform:rotate(360deg)}}
@keyframes nms-flow{from{background-position:0 0,0% 0}to{background-position:0 0,300% 0}}
@keyframes nms-glowe{0%,100%{box-shadow:0 calc(4px*var(--k)) 0 rgba(150,170,215,.55),0 0 6px rgba(176,107,255,.2)}50%{box-shadow:0 calc(4px*var(--k)) 0 rgba(150,170,215,.55),0 0 16px rgba(176,107,255,.7)}}
@keyframes nms-glowl{0%,100%{box-shadow:0 calc(4px*var(--k)) 0 rgba(150,170,215,.55),0 0 8px rgba(255,176,46,.3)}50%{box-shadow:0 calc(4px*var(--k)) 0 rgba(150,170,215,.55),0 0 20px rgba(255,176,46,.85)}}
@keyframes nms-glowm{0%,100%{box-shadow:0 calc(4px*var(--k)) 0 rgba(150,170,215,.55),0 0 10px rgba(255,79,163,.4)}50%{box-shadow:0 calc(4px*var(--k)) 0 rgba(150,170,215,.55),0 0 24px rgba(77,184,255,.9)}}
@keyframes nms-bgpos{0%,100%{background-position:0% 0}50%{background-position:100% 0}}
@keyframes nms-hue{from{filter:drop-shadow(0 3px 0 rgba(30,40,90,.28)) hue-rotate(0)}to{filter:drop-shadow(0 3px 0 rgba(30,40,90,.28)) hue-rotate(360deg)}}
@keyframes nms-pulse{0%,100%{filter:drop-shadow(0 0 2px var(--glow)) drop-shadow(0 2px 0 rgba(30,40,90,.2))}50%{filter:drop-shadow(0 0 9px var(--glow)) drop-shadow(0 0 3px var(--glow)) drop-shadow(0 2px 0 rgba(30,40,90,.2))}}
@keyframes nms-shine{0%{background-position:-150% 0}60%,100%{background-position:250% 0}}
@keyframes nms-twink{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
@keyframes nms-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes nms-wobble{0%,100%{transform:scale(1,1)}25%{transform:scale(1.04,.97)}50%{transform:scale(.98,1.03)}75%{transform:scale(1.02,.99)}}
@keyframes nms-flick{0%{transform:rotate(0)}40%{transform:rotate(-22deg)}100%{transform:rotate(0)}}
@keyframes nms-toast{0%{opacity:0;transform:translate(-50%,20px)}12%,80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-8px)}}
@keyframes nms-p-burst{0%{opacity:0;transform:translate(0,0) scale(.2)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(var(--s))}}
@keyframes nms-p-fall{0%{opacity:0;transform:translate(var(--dx),calc(var(--dy)*-1)) scale(var(--s))}20%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(var(--s)) rotate(200deg)}}
@keyframes nms-p-rise{0%{opacity:0;transform:translate(var(--dx),0) scale(.4)}20%{opacity:1}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy)*1.4)) scale(var(--s))}}
@keyframes nms-p-fount{0%{opacity:0;transform:translate(0,0) scale(.5)}20%{opacity:1}60%{transform:translate(calc(var(--dx)*.7),calc(var(--dy)*1.3)) scale(var(--s))}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy)*-.4)) scale(var(--s)) rotate(160deg)}}
@keyframes nms-p-ring{0%{opacity:0;transform:translate(0,0) scale(.3)}25%{opacity:1}100%{opacity:0;transform:translate(calc(var(--dx)*1.25),calc(var(--dy)*1.25)) scale(var(--s)) rotate(120deg)}}
@keyframes nms-p-trail{0%{opacity:0;transform:translate(0,0) scale(.5)}20%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(var(--s)) rotate(100deg)}}
@keyframes nms-p-trailup{0%{opacity:0;transform:translate(0,0) scale(.5)}20%{opacity:1}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) - 14px)) scale(var(--s))}}
@media (max-height:430px) and (orientation:landscape){
 .nms-title{font-size:calc(24px*var(--k))}
 .nms-tab{height:calc(46px*var(--k))}
 .nms-tab span{font-size:calc(9px*var(--k))}
 .nms-tabs{padding-bottom:calc(6px*var(--k))}
 .nms-card{padding:calc(5px*var(--k)) calc(4px*var(--k)) calc(5px*var(--k));gap:calc(2px*var(--k))}
 .nms-name{min-height:2.24em}
 .nms-dock{min-height:calc(58px*var(--k));padding:calc(5px*var(--k)) calc(8px*var(--k))}
 .nms-dock-name{font-size:calc(13px*var(--k))}
 .nms-btn{min-height:calc(42px*var(--k));min-width:calc(92px*var(--k));padding-top:calc(5px*var(--k))}
 .nms-btn small{display:none}
}
`;
