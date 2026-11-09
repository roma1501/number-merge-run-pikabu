// GameShop.js — магазин косметики, Daily Gift и колесо фортуны Number Merge Run: связка движковых модулей
// Shop / DailyGift / Wheel с игрой (сохранение, монеты, внешний вид числа, тема трассы, эффект победы,
// камера магазина). Данные — GameShopData.js, окна — GameShopUI.js. Контракт для Game.js / GameHud.js:
//   init(game), open('shop'|'gift'|'wheel'), isOpen(), badges() -> { gift, wheel }, trackTheme(),
//   async applyLook(player), victoryFx(player), onUpgrade().
//
// Монеты: источник правды — game.save.coins (его правит Game.addCoins). Shop.state.coins — невидимое для JSON
// свойство-«зеркало» этого поля, поэтому покупки, призы колеса и подарка меняют те же монеты, а счётчик
// GameHud.coins обновляется по событию Shop 'coins'.
//
// Камера магазина: Game._camUpdate обёрнут (в Game.js правок нет) — пока открыт магазин, кадр плавно уходит
// на число и сдвигает его в свободную от панели часть экрана (GameShopUI.freeRegion()).

/** @satisfies {Record<string, any>} */
const GameShop = {
    /** @type {any} */
    game: null,
    inited: false,
    /** Номер последнего applyLook: устаревшие асинхронные применения не мешают новым. */
    _seq: 0,
    /** @type {any} */
    _skinItem: null,
    /** @type {any} */
    _aura: null,
    _auraRate: 0,
    /** Где сейчас нарисована тема трассы вживую (id), чтобы не перерисовывать зря. */
    _liveTrack: '',
    _rebuilding: false,
    _blend: 0,
    _sway: 0,
    _offerReady: 0,

    /** @param {any} game */
    async init(game) {
        this.game = game;
        const save = game.save;
        Shop.init({
            tabs: SHOP_TABS, items: SHOP_ITEMS, state: save.shop,
            persist: () => game.persist(),
        });
        save.shop = Shop.state;
        // Монеты Shop — это game.save.coins (не сохраняются в save.shop: свойство не перечисляется).
        Object.defineProperty(Shop.state, 'coins', {
            get: () => Math.max(0, Math.floor(Number(game.save.coins)) || 0),
            set: (v) => { game.save.coins = v; },
            enumerable: false, configurable: true,
        });
        Shop.on((e) => this._onShop(e));
        DailyGift.init({ rewards: DAILY_REWARDS, rewardsSink: Shop, state: save.daily, persist: () => game.persist() });
        save.daily = DailyGift.state;
        Wheel.init({ sectors: WHEEL_SECTORS, rewardsSink: Shop, state: save.wheel, persist: () => game.persist() });
        save.wheel = Wheel.state;
        this.inited = true;
        /** @type {Array<[string, any]>} */
        const checks = [['Shop', Shop.validate()], ['DailyGift', DailyGift.validate()], ['Wheel', Wheel.validate()]];
        for (const [name, r] of checks) {
            if (!r.ok) console.warn('GameShop: данные ' + name + ' не прошли проверку', r.problems);
        }
        GameShopUI.init(game);
        GameHud.coins(game.save.coins);
        this._patchCamera(game);
        // Аппаратная «Назад» (Android-обёртка): сначала закрыть своё окно.
        const prevBack = Platform.backHandler;
        Platform.backHandler = () => {
            if (this.isOpen()) { GameShopUI.close(); return true; }
            return typeof prevBack === 'function' ? prevBack() : false;
        };
        this._watchOffer();
    },

    // --- Контракт ------------------------------------------------------------------------------------

    /** @param {'shop' | 'gift' | 'wheel'} which */
    open(which) {
        const g = this.game;
        if (!this.inited || !g || g.state !== 'menu' || this.isOpen()) return;
        GameShopUI.open(which);
    },

    isOpen() { return this.inited && GameShopUI.isOpen(); },

    badges() {
        if (!this.inited) return { gift: false, wheel: false };
        return { gift: DailyGift.badge() > 0, wheel: Wheel.badge() > 0 };
    },

    /** Тема трассы для GameLevel.build (надетая «Трасса»). */
    trackTheme() {
        if (!this.inited) return null;
        return this._themeOf(Shop.equippedId('track'));
    },

    /** @param {string | null} id */
    _themeOf(id) {
        const it = id ? Shop.item(id) : null;
        return it && it.theme ? { ...it.theme } : null;
    },

    /** Надеть на число игрока выбранную косметику (надетое + примерка магазина). @param {GamePlayer} player */
    async applyLook(player) {
        const seq = ++this._seq;
        if (!this.inited) {
            player.setSkin(null);
            await player.setFace('assets/models/faces/eyes_classic.glb');
            return;
        }
        const look = Shop.look();
        const item = (slot) => (look[slot] ? Shop.item(look[slot]) : null);
        const skin = item('skin'), hat = item('hat'), face = item('face'), trail = item('trail');
        player.setSkin(skin && skin.skin ? skin.skin : null);
        this._skinItem = skin;
        this._setAura(player, skin);
        player.setTrail(trail ? this._trailDef(trail) : null);
        if (trail && this.isOpen() && !player.running && player.trail) player._startTrail();
        await Promise.all([
            player.setHat(hat && hat.model ? hat.model : ''),
            player.setFace(face && face.model ? face.model : 'assets/models/faces/eyes_classic.glb'),
        ]);
        void seq;
    },

    /** Опции частиц следа: def предмета + текстура формы (canvas, data URL). */
    _trailDef(item) {
        const def = { ...item.trail };
        const tex = shopShapeTexture(item.shape);
        if (tex) def.texture = tex;
        return def;
    },

    /** Эффект победы: слои надетого предмета «Победа» вокруг числа. @param {GamePlayer} player */
    victoryFx(player) {
        const g = this.game;
        const fx = g && g.app && g.app.fx;
        if (!fx) return;
        const it = this.inited ? Shop.item(Shop.equippedId('victory')) : null;
        const layers = it && it.layers && it.layers.length ? it.layers : [{ burst: 90, capacity: 100, life: [0.8, 1.8], size: [8, 16], speed: [300, 700], direction: [[-0.8, 1, -0.3], [0.8, 2, 0.3]], gravity: [0, -900, 0], color: '#ff6fb1', color2: '#ffe066', blend: 'standard', spin: [-8, 8], duration: 0.05, at: [0, 200, 0] }];
        for (const layer of layers) {
            const { at, shape, ...opts } = layer;
            const a = at || [0, 200, 0];
            const tex = shopShapeTexture(shape);
            const o = { ...opts, position: new BABYLON.Vector3(player.x + a[0], player.h + a[1], player.y + a[2]) };
            if (tex) o.texture = tex;
            fx.create(o);
        }
        if (it && it.sfx) {
            for (const s of it.sfx) setTimeout(() => { if (g.state === 'won') GameSfx.play(s.name); }, Math.round((s.delay || 0) * 1000));
        }
    },

    onUpgrade() { if (this.inited) GameShopUI.refreshCoins(); },

    // --- События Shop ---------------------------------------------------------------------------------

    _onShop(e) {
        const g = this.game;
        if (e.type === 'coins') {
            GameHud.coins(g.save.coins, Math.abs(e.delta) >= 2 ? 'shop' : undefined);
            GameShopUI.refreshCoins();
            return;
        }
        if (e.type === 'equip' || e.type === 'unequip' || e.type === 'preview') {
            if (g.player) this.applyLook(g.player);
            if (e.slot === 'track') {
                this._paintTheme(this._themeOf(Shop.look().track));
                if (e.type !== 'preview' && e.prev !== e.id) this.rebuildTrack();
            }
        }
        if (this.isOpen()) GameShopUI.onShopEvent(e);
    },

    /** Трасса надета: пересобрать уровень под шторкой (только в меню — это безопасно). */
    async rebuildTrack() {
        const g = this.game;
        if (this._rebuilding || !g || g.state !== 'menu') return;
        this._rebuilding = true;
        GameShopUI.setBusy(true);
        try { await GameShopUI.flash(() => g.restartLevel()); }
        catch (err) { console.warn('GameShop: трасса не пересобралась', err); }
        this._rebuilding = false;
        this._liveTrack = '';
        GameShopUI.setBusy(false);
    },

    /** Живая подмена цветов трассы и неба (примерка): боковые стенки обновятся при пересборке. */
    _paintTheme(th) {
        const L = typeof GameLevel !== 'undefined' ? GameLevel : null;
        if (!L || !L.scene || !L.mats || !L.mats.track) return;
        const key = th ? JSON.stringify(th) : '';
        if (key === this._liveTrack) return;
        this._liveTrack = key;
        try {
            const t = th || (SHOP_ITEMS.find((i) => i.id === 'track_pearl') || {}).theme || {};
            L.theme = t;
            const old = L.mats.track.diffuseTexture;
            L.mats.track.diffuseTexture = L._chevronTexture(t);
            if (old) old.dispose();
            L.mats.lip.diffuseColor = BABYLON.Color3.FromHexString(t.lip || '#ffffff');
            L._buildSky();
        } catch (err) { console.warn('GameShop: примерка трассы', err); }
    },

    // --- Камера магазина -----------------------------------------------------------------------------

    _patchCamera(game) {
        if (game._camPatched) return;
        game._camPatched = true;
        const orig = game._camUpdate.bind(game);
        game._camUpdate = (/** @type {number} */ dt) => { orig(dt); this._frame(dt); };
    },

    /** После Game._camUpdate: дорисовать свечение скина, качание числа и сдвиг камеры магазина. @param {number} dt */
    _frame(dt) {
        const g = this.game, p = g.player;
        if (!p || !this.inited) return;
        this._tickSkin(p);
        const want = GameShopUI.mode === 'shop' ? 1 : 0;
        this._blend += Math.max(-1, Math.min(1, want - this._blend)) * Math.min(1, dt * 3.2) * (want > this._blend ? 1.4 : 1.1);
        if (Math.abs(want - this._blend) < 0.003) this._blend = want;
        if (want === 1) { this._sway += dt; p.root.rotation.y = Math.sin(this._sway * 1.1) * 0.42; }
        else if (p.root.rotation.y) { p.root.rotation.y = Math.abs(p.root.rotation.y) < 0.01 ? 0 : p.root.rotation.y * 0.85; }
        if (this._blend <= 0) return;
        const e = this._blend * this._blend * (3 - 2 * this._blend);
        const R = GameShopUI.freeRegion();
        if (!R) return;
        const cam = g.cam;
        const Wd = R.W, Hd = R.H;
        const rw = Math.max(60, R.x1 - R.x0), rh = Math.max(60, R.y1 - R.y0);
        const hp = Math.max(40, p.height), nw = Math.max(60, p.visualHalfW() * 2);
        // Число (с шапкой ~1.6 высоты) занимает около половины свободной от панели области.
        let z = Math.min(0.5 * rh / hp, 0.7 * rw / nw);
        z = Math.max(0.3, Math.min(2.2, z));
        // Точка взгляда — на самом числе (по высоте — его середина): так масштаб z верен именно для числа,
        // а не для точки перед ним (прежде камера на низком экране подходила вплотную мимо числа).
        // Сдвиг в центр свободной области: по x — в мировых px, по высоте — с поправкой на наклон камеры.
        const dx = (R.x0 + R.x1) / 2 - Wd / 2, dy = (R.y0 + R.y1) / 2 - Hd / 2;
        const tilt = Math.cos(((typeof CAMERA_PITCH_DEG !== 'undefined' ? CAMERA_PITCH_DEG : 38) * Math.PI) / 180);
        const shop = {
            x: p.x - dx / z,
            y: p.y,
            h: p.h + 0.55 * hp + dy / (z * Math.max(0.3, tilt)),
            fw: Wd / z, fh: Hd / z,
        };
        const defFw = typeof RUN_FRAME_WIDTH !== 'undefined' ? RUN_FRAME_WIDTH : 820;
        const defFh = (typeof RUN_FRAME_HEIGHT !== 'undefined' ? RUN_FRAME_HEIGHT : 1500) * 0.78;
        cam.x += (shop.x - cam.x) * e;
        cam.y += (shop.y - cam.y) * e;
        cam.h += (shop.h - cam.h) * e;
        cam.frameWidth = defFw + (shop.fw - defFw) * e;
        cam.frameHeight = defFh + (shop.fh - defFh) * e;
    },

    /** Свечение и мерцание скина поверх анимации GamePlayer (она переписывает emissive каждый кадр). @param {GamePlayer} p */
    _tickSkin(p) {
        const it = this._skinItem;
        if (this._aura) this._aura.setRate(p.hidden ? 0 : this._auraRate);
        if (!it || !it.fx || !(it.fx.glow || it.fx.sparkle) || !p.slots) return;
        const def = it.skin || {}, fx = it.fx, t = p.t;
        const hex = (h) => BABYLON.Color3.FromHexString(h || '#ffffff');
        p.slots.forEach((s, i) => {
            const m = s.mat;
            let r, gg, b;
            if (def.anim) { r = m.emissiveColor.r; gg = m.emissiveColor.g; b = m.emissiveColor.b; }
            else {
                const base = def.emissive ? hex(def.emissive) : m.diffuseColor.scale(0.22);
                r = base.r; gg = base.g; b = base.b;
            }
            if (fx.glow) {
                const c = hex(fx.glow.color), k = fx.glow.amp * (0.5 + 0.5 * Math.sin(t * fx.glow.speed + i * 0.7));
                r += c.r * k; gg += c.g * k; b += c.b * k;
            }
            if (fx.sparkle) {
                const n = Math.sin(t * 17 + i * 2.3) * Math.sin(t * 9.1 + i * 1.7);
                if (n > 0.5) {
                    const c = hex(fx.sparkle[Math.floor(t * 5 + i) % fx.sparkle.length]), k = 0.75 * (n - 0.5) / 0.5;
                    r += c.r * k; gg += c.g * k; b += c.b * k;
                }
            }
            m.emissiveColor.copyFromFloats(Math.min(1, r), Math.min(1, gg), Math.min(1, b));
        });
    },

    /** Постоянная аура мифических скинов (частицы вокруг числа). @param {GamePlayer} p @param {any} item */
    _setAura(p, item) {
        if (this._aura) { this._aura.dispose(); this._aura = null; }
        const a = item && item.fx && item.fx.aura;
        const fx = this.game.app && this.game.app.fx;
        if (!a || !fx) return;
        this._auraRate = a.rate || 24;
        this._aura = fx.create(Object.assign({
            follow: () => new BABYLON.Vector3(p.x, p.h + p.height * 0.45, p.y + 6),
            rate: this._auraRate, capacity: 90, life: [0.5, 1.1], size: [8, 16], speed: [15, 60],
            box: [[-34, 0, -10], [34, 40, 10]], direction: [[-0.7, 0.2, -0.4], [0.7, 1.2, 0.8]],
            color: '#ffffff', blend: 'additive', sizeGradient: [[0, 0.3], [0.3, 1], [1, 0]],
        }, a));
    },

    // --- Подарок дня: предложить один раз после туториала ------------------------------------------------

    _watchOffer() {
        const check = () => {
            const g = this.game;
            if (!this.inited || !g || g.state !== 'menu' || this.isOpen() || GameHud.modal) { this._offerReady = 0; return; }
            if (!DailyGift.shouldOffer()) return;
            // Меню должно простоять пару проверок: не выскакивать посреди загрузки уровня.
            if (++this._offerReady < 2) return;
            this._offerReady = 0;
            DailyGift.markOffered();
            this.open('gift');
        };
        // Туториал не закончился — одна отложенная проверка (Tutorial.whenIdle), а не очередь на каждый тик.
        let queued = false;
        setInterval(() => {
            if (typeof Tutorial !== 'undefined' && typeof Tutorial.whenIdle === 'function' && Tutorial.active) {
                if (!queued) { queued = true; Tutorial.whenIdle(() => { queued = false; check(); }); }
                return;
            }
            check();
        }, 1200);
    },
};
