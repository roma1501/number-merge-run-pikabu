// Game.js — Number Merge Run: цикл уровня (меню → бег → финиш → победа/проигрыш), столкновения,
// прыжки и падения, монеты и улучшения, реклама, сохранение. Вид трассы — GameLevel, число игрока —
// GamePlayer, интерфейс — GameHud, магазин/подарок/колесо — GameShop (если подключён).

/** @satisfies {Record<string, any>} */
const Game = {
    /** @type {any} */
    app: null,
    /** @type {any} */
    save: null,
    /** @type {GamePlayer | null} */
    player: null,
    state: 'boot',          // boot | menu | run | finish | won | lost | busy
    /** @type {any} */
    run: null,
    cam: { x: 800, y: 0, h: 0, frameWidth: 820, frameHeight: 1300 },
    steer: { active: false, id: -1, startX: 0, startTx: 0, tx: 800, left: false, right: false },
    loadFailed: false,
    sessionResults: 0,
    lossCount: 0,
    shake: 0,
    combo: 0,
    comboT: 0,

    // --- Сохранение -------------------------------------------------------------------------

    defaults() {
        return { v: 1, level: 1, map: 'lvl-001', coins: 0, upStart: 0, upIncome: 0, tutorialDone: false,
            best: 0, wins: 0, runs: 0, shop: null, daily: null, wheel: null, music: true, mirror: false };
    },

    async firstMap() {
        let s = null;
        try { s = await Platform.load(); } catch (e) { this.loadFailed = true; console.warn('Platform.load:', e); }
        this.save = Object.assign(this.defaults(), s && typeof s === 'object' ? s : {});
        if (!this.save.map || !GAME_MAPS.some(m => m.id === this.save.map)) this.save.map = this.mapFor(this.save.level);
        return this.save.map;
    },

    persist() {
        if (!this.save || this.loadFailed) return;
        try { Platform.save(this.save); } catch (e) { console.warn('Platform.save:', e); }
    },

    /** id карты уровня: первые LEVELS_DESIGNED — по порядку, дальше случайная из пула. @param {number} level */
    mapFor(level) {
        const ids = GAME_MAPS.map(m => m.id).filter(id => /^lvl-\d+$/.test(id));
        if (!ids.length) return GAME_MAPS[0].id;
        const designed = Math.min(ids.length, typeof LEVELS_DESIGNED !== 'undefined' ? LEVELS_DESIGNED : 120);
        if (level <= designed) return ids[level - 1];
        const from = Math.min(designed, Math.max(1, typeof LEVELS_RANDOM_FROM !== 'undefined' ? LEVELS_RANDOM_FROM : 21)) - 1;
        const pool = ids.slice(from, designed);
        let id = pool[Math.floor(Math.random() * pool.length)];
        if (pool.length > 1 && id === (this.save && this.save.map)) id = pool[(pool.indexOf(id) + 1) % pool.length];
        return id;
    },

    // --- Экономика -------------------------------------------------------------------------------

    startValue(lv) {
        const t = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22, 26, 30, 35, 40, 46, 52, 60, 70, 80, 90, 100];
        const n = lv == null ? this.save.upStart : lv;
        return n < t.length ? t[n] : 100 + (n - t.length + 1) * 15;
    },
    startCost() { return Math.round((typeof UPG_START_COST !== 'undefined' ? UPG_START_COST : 200) * Math.pow(typeof UPG_START_GROWTH !== 'undefined' ? UPG_START_GROWTH : 1.32, this.save.upStart) / 10) * 10; },
    income(lv) { return 1 + (typeof UPG_INCOME_STEP !== 'undefined' ? UPG_INCOME_STEP : 0.1) * (lv == null ? this.save.upIncome : lv); },
    incomeCost() { return Math.round((typeof UPG_INCOME_COST !== 'undefined' ? UPG_INCOME_COST : 800) * Math.pow(typeof UPG_INCOME_GROWTH !== 'undefined' ? UPG_INCOME_GROWTH : 1.4, this.save.upIncome) / 10) * 10; },

    /** @param {number} n @param {any} [from] */
    addCoins(n, from) {
        n = Math.max(0, Math.round(n));
        this.save.coins += n;
        this.persist();
        GameHud.coins(this.save.coins, from);
    },

    /** @param {'start' | 'income'} kind @param {boolean} free */
    upgrade(kind, free) {
        const cost = kind === 'start' ? this.startCost() : this.incomeCost();
        if (!free) {
            if (this.save.coins < cost) return false;
            this.save.coins -= cost;
        }
        if (kind === 'start') this.save.upStart++; else this.save.upIncome++;
        this.persist();
        GameSfx.play('upgrade');
        GameHud.coins(this.save.coins);
        if (kind === 'start' && this.player && this.state === 'menu') {
            this.player.setValue(this.startValue(), true);
            if (this.app.fx) this.app.fx.play('magic', new BABYLON.Vector3(this.player.x, 60, this.player.y));
        }
        GameHud.refreshMenu();
        if (typeof GameShop !== 'undefined' && GameShop.onUpgrade) GameShop.onUpgrade();
        return true;
    },

    // --- Хуки движка ------------------------------------------------------------------------------

    /** @param {any} app */
    async init(app) {
        this.app = app;
        if (!this.save) await this.firstMap();
        app.camera.ignorePointer = () => true;          // камерой управляет игра (палец — руль)
        app.camera.follow(this.cam);
        this._registerFx(app);
        GameSfx.init();
        GameHud.init(this);
        if (typeof GameShop !== 'undefined') await GameShop.init(this);
        this._bindInput(app);
        this._initTutorial(app);
        await this.setupLevel();
        if (this.save.music !== false) GameSfx.music(true);
    },

    async ready() {
        GameHud.showMenu();
    },

    _registerFx(app) {
        if (!app.fx) return;
        app.fx.register('eat', [
            { burst: 18, capacity: 24, life: [0.25, 0.55], size: [8, 18], speed: [140, 340], direction: [[-1, 0.4, -1], [1, 1.6, 1]], gravity: [0, -700, 0], color: '#5aa2ff', blend: 'standard', sizeGradient: [[0, 1], [1, 0.1]], duration: 0.05 },
            { burst: 10, capacity: 12, life: [0.2, 0.4], size: [14, 30], speed: [20, 60], color: '#d8ecff', sizeGradient: [[0, 0.4], [0.3, 1], [1, 0]], duration: 0.05 },
        ]);
        app.fx.register('hurt', [
            { burst: 22, capacity: 26, life: [0.3, 0.6], size: [8, 16], speed: [160, 360], direction: [[-1, 0.5, -1], [1, 1.6, 1]], gravity: [0, -800, 0], color: '#ff5560', blend: 'standard', sizeGradient: [[0, 1], [1, 0.1]], duration: 0.05 },
        ]);
        app.fx.register('gate', [
            { burst: 40, capacity: 44, life: [0.35, 0.8], size: [6, 16], speed: [120, 300], direction: [[-1, 0.6, -0.4], [1, 1.8, 0.4]], gravity: [0, -400, 0], color: '#7dffa6', color2: '#ffffff', sizeGradient: [[0, 1], [1, 0]], duration: 0.05 },
        ]);
        app.fx.register('block', [
            { burst: 26, capacity: 30, life: [0.4, 0.9], size: [12, 26], speed: [220, 520], direction: [[-1, 0.5, -1.2], [1, 1.8, 0.2]], gravity: [0, -1300, 0], color: '#ffffff', blend: 'standard', sizeGradient: [[0, 1], [1, 0.3]], duration: 0.05 },
            { burst: 12, capacity: 14, life: [0.3, 0.6], size: [30, 60], speed: [30, 90], color: '#ffffff', sizeGradient: [[0, 0.3], [0.4, 1], [1, 0]], duration: 0.05 },
        ]);
        app.fx.register('confetti', [
            { burst: 90, capacity: 100, life: [0.8, 1.8], size: [8, 16], speed: [300, 700], direction: [[-0.8, 1, -0.3], [0.8, 2, 0.3]], gravity: [0, -900, 0], color: '#ff6fb1', color2: '#ffe066', blend: 'standard', spin: [-8, 8], duration: 0.05 },
            { burst: 90, capacity: 100, life: [0.8, 1.8], size: [8, 16], speed: [300, 700], direction: [[-0.8, 1, -0.3], [0.8, 2, 0.3]], gravity: [0, -900, 0], color: '#5ad1ff', color2: '#8bff9a', blend: 'standard', spin: [-8, 8], duration: 0.05 },
        ]);
        app.fx.register('land', [
            { burst: 16, capacity: 18, life: [0.3, 0.6], size: [16, 34], speed: [80, 200], direction: [[-1, 0.1, -1], [1, 0.4, 1]], color: '#ffffff', blend: 'standard', sizeGradient: [[0, 0.5], [0.3, 1], [1, 0]], duration: 0.05 },
        ]);
    },

    // --- Уровень --------------------------------------------------------------------------------

    theme() {
        return (typeof GameShop !== 'undefined' && GameShop.trackTheme) ? GameShop.trackTheme() : null;
    },

    // Построить текущий уровень из маркеров загруженной карты и поставить игрока на старт.
    async setupLevel() {
        this.state = 'busy';
        const app = this.app;
        if (this.player) { this.player.dispose(); this.player = null; }
        const map = app.location.map;
        if (map && !!this.save.mirror !== !!map.mirrored) {
            // Зеркало по ширине (x = 1600 − x): копия карты в игре, Maps.js не меняется.
            for (const o of map.objects) {
                o.x = 1600 - o.x;
                if (o.name && /^spin/.test(o.name)) o.rot = [o.rot ? o.rot[0] : 0, o.rot && Math.abs(o.rot[1]) > 90 ? 0 : 180, o.rot ? o.rot[2] : 0];
            }
            map.mirrored = !!this.save.mirror;
        }
        await GameLevel.build(app, this.theme() || {});
        this.player = new GamePlayer(app);
        if (typeof GameShop !== 'undefined' && GameShop.applyLook) await GameShop.applyLook(this.player);
        else await this.player.setFace('assets/models/faces/eyes_classic.glb');
        this.resetRun();
        this.state = 'menu';
        GameHud.level(this.save.level);
        GameHud.progress(0);
        GameHud.showMenu();
        this.cam.frameHeight = 1150;
        this._camUpdate(1);
        app.camera.update(0);
        if (app.camera.snap) app.camera.snap();
    },

    resetRun() {
        const sp = GameLevel.spawn;
        const v = this.startValue();
        this.run = { value: v, eaten: 0, coins: 0, air: null, fall: null, finish: false, stopped: false, revived: false,
            invuln: 0, cursor: 0, blocks: 0, blockIdx: 0, hist: [], wonT: 0, lostT: 0, reason: '', culprit: null, prevValue: v,
            speed: typeof RUN_SPEED !== 'undefined' ? RUN_SPEED : 620, hitStop: 0, tStart: 0, maxValue: v };
        this.player.setValue(v, false);
        this.player.place(sp.x, sp.y, sp.h);
        this.player.groundH = sp.h;
        this.player.setHidden(false);
        this.player.clearShards();
        this.steer.tx = sp.x;
        this.combo = 0;
    },

    // Следующий уровень: другая карта движка — загрузка под экраном движка.
    async goLevel(level) {
        this.save.level = level;
        this.save.map = this.mapFor(level);
        const designed = typeof LEVELS_DESIGNED !== 'undefined' ? LEVELS_DESIGNED : 120;
        this.save.mirror = level > designed && Math.random() < 0.5;   // случайный уровень иногда зеркальный
        this.persist();
        this.state = 'busy';
        GameHud.hideAll();
        await this.app.loadMap(this.save.map, {
            label: Lang.t('nm.levelN', { n: level }),
            prepare: async () => { await this.setupLevel(); },
        });
    },

    // Перезапуск того же уровня: карта та же, пересобираем объекты под шторкой интерфейса.
    async restartLevel() {
        this.state = 'busy';
        await GameHud.curtain(async () => { await this.setupLevel(); });
    },

    // --- Ввод -------------------------------------------------------------------------------------

    _bindInput(app) {
        const canvas = app.location.view.scene.getEngine().getRenderingCanvas();
        const trackW = () => {
            const s = GameLevel.segAtY(this.player ? this.player.y : 0);
            return s ? s.x1 - s.x0 : 600;
        };
        const down = (e) => {
            if (this.state === 'menu' && !GameHud.modalOpen()) { this.startRun(); }
            if (this.state !== 'run' && this.state !== 'menu') return;
            this.steer.active = true;
            this.steer.id = e.pointerId;
            this.steer.startX = e.clientX;
            this.steer.startTx = this.player ? this.player.x : 800;
            this.steer.tx = this.steer.startTx;
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* синтетическое */ }
        };
        const move = (e) => {
            if (!this.steer.active || e.pointerId !== this.steer.id) return;
            const w = typeof ViewCap !== 'undefined' && ViewCap.width ? ViewCap.width() : window.innerWidth;
            const sens = typeof RUN_STEER_SENS !== 'undefined' ? RUN_STEER_SENS : 1.35;
            this.steer.tx = this.steer.startTx + (e.clientX - this.steer.startX) / Math.max(320, w) * trackW() * sens;
            if (this.run) this.run.steerDist = (this.run.steerDist || 0) + Math.abs(e.movementX || 0);
        };
        const up = (e) => { if (e.pointerId === this.steer.id) this.steer.active = false; };
        canvas.addEventListener('pointerdown', down);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            const k = e.code;
            if (k === 'ArrowLeft' || k === 'KeyA') this.steer.left = true;
            else if (k === 'ArrowRight' || k === 'KeyD') this.steer.right = true;
            else return;
            if (this.state === 'menu' && !GameHud.modalOpen()) this.startRun();
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.steer.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.steer.right = false;
        });
        window.addEventListener('lory-release-input', () => { this.steer.active = false; this.steer.left = false; this.steer.right = false; });
    },

    _initTutorial(app) {
        if (typeof Tutorial === 'undefined') return;
        Tutorial.init({
            app,
            steps: [
                { id: 'steer', title: 'nm.tut.steer.t', hint: { touch: 'nm.tut.steer.h', mouse: 'nm.tut.steer.hm', keyboard: 'nm.tut.steer.hk', any: 'nm.tut.steer.h' }, icons: { touch: ['swipe'], mouse: ['mouse'] },
                    check: () => Math.min(1, ((this.run && this.run.steerDist) || 0) / 260) },
                { id: 'eat', title: 'nm.tut.eat.t', hint: 'nm.tut.eat.h', check: () => Math.min(1, ((this.run && this.run.eaten) || 0) / 3) },
                { id: 'red', title: 'nm.tut.red.t', hint: 'nm.tut.red.h', check: (ctx) => Math.min(1, ctx.time / 3.5) },
                { id: 'finish', title: 'nm.tut.finish.t', hint: 'nm.tut.finish.h', event: 'finish' },
            ],
            state: () => this.save, field: 'tutorialDone',
            persist: () => this.persist(),
            onFinish: () => {},
        });
    },

    // --- Раунд --------------------------------------------------------------------------------------

    startRun() {
        if (this.state !== 'menu') return;
        this.state = 'run';
        this.run.tStart = this.app.location ? performance.now() : 0;
        this.save.runs = (this.save.runs || 0) + 1;
        GameHud.showRun();
        GameSfx.play('whoosh');
        this.player.setRunning(true);
        Platform.gameplay(true);
        if (typeof Telemetry !== 'undefined' && Telemetry.progress) Telemetry.progress('started', 'level_' + this.save.level, { step_index: this.save.level });
        if (typeof Tutorial !== 'undefined' && !this.save.tutorialDone) Tutorial.autoStart();
    },

    /** @param {number} dt */
    update(dt) {
        if (!this.player) return;
        const p = this.player, r = this.run;
        if (this.state === 'run' || this.state === 'finish') this._runStep(dt);
        else if (this.state === 'won') {
            r.wonT += dt;
            p.vx *= 0.8;
            if (r.wonT > 1.0 && !r.winShown) { r.winShown = true; this._showWin(); }
        } else if (this.state === 'lost') {
            r.lostT += dt;
            if (r.fall) { r.fall.vy += (typeof RUN_FALL_GRAVITY !== 'undefined' ? RUN_FALL_GRAVITY : 3200) * dt; p.h -= r.fall.vy * dt; p.y -= r.speed * 0.4 * dt; }
            if (r.lostT > 0.95 && !r.loseShown) { r.loseShown = true; GameHud.showLose(r.reason, r.value, this.canRevive()); }
        } else if (this.state === 'menu') {
            p.vx *= 0.85;
        }
        if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
        p.update(dt);
        GameLevel.update(dt, p);
        this._camUpdate(dt);
    },

    _camUpdate(dt) {
        const p = this.player;
        if (!p) return;
        // Упал с трассы — камера замирает там, где была: число улетает вниз из кадра, а не тянет камеру за собой.
        if (this.state === 'lost' && this.run && this.run.fall) {
            if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
            return;
        }
        const ahead = typeof RUN_CAMERA_AHEAD !== 'undefined' ? RUN_CAMERA_AHEAD : 420;
        const xf = typeof RUN_CAMERA_X_FOLLOW !== 'undefined' ? RUN_CAMERA_X_FOLLOW : 0.35;
        const seg = GameLevel.segAtY(p.y);
        const cx = seg ? (seg.x0 + seg.x1) / 2 : 800;
        this.cam.x = cx + (p.x - cx) * xf;
        this.cam.y = p.y - (this.state === 'menu' ? -60 : ahead);
        this.cam.h = Math.max(-200, p.h * 0.6 + (this.run && this.run.fall ? 0 : 0));
        const fw = typeof RUN_FRAME_WIDTH !== 'undefined' ? RUN_FRAME_WIDTH : 820;
        const fh = typeof RUN_FRAME_HEIGHT !== 'undefined' ? RUN_FRAME_HEIGHT : 1500;
        const wantH = this.state === 'menu' ? fh * 0.78 : fh * (1 + Math.min(0.25, Math.log10(Math.max(1, p.value)) * 0.05));
        this.cam.frameHeight += (wantH - this.cam.frameHeight) * Math.min(1, dt * 2.5);
        this.cam.frameWidth = fw;
        if (this.shake > 0) {
            this.shake = Math.max(0, this.shake - dt);
            this.cam.x += (Math.random() - 0.5) * 30 * this.shake;
            this.cam.y += (Math.random() - 0.5) * 30 * this.shake;
        }
    },

    _runStep(dt) {
        const p = this.player, r = this.run, L = GameLevel;
        if (r.hitStop > 0) { r.hitStop -= dt; return; }
        if (r.invuln > 0) r.invuln -= dt;
        // Руль: палец/мышь ведут точку tx, клавиши двигают её.
        const keyDir = (this.steer.right ? 1 : 0) - (this.steer.left ? 1 : 0);
        if (keyDir) {
            const ks = typeof RUN_KEY_STEER !== 'undefined' ? RUN_KEY_STEER : 820;
            this.steer.tx = p.x + keyDir * ks * 0.2;
            r.steerDist = (r.steerDist || 0) + ks * dt;
        }
        let tx = r.finish ? 800 : this.steer.tx;
        const maxLat = (typeof RUN_MAX_LATERAL !== 'undefined' ? RUN_MAX_LATERAL : 1500) * dt;
        const lerp = Math.min(1, (typeof RUN_STEER_LERP !== 'undefined' ? RUN_STEER_LERP : 16) * dt);
        const prevX = p.x;
        let nx = p.x + Math.max(-maxLat, Math.min(maxLat, (tx - p.x) * lerp));
        // Вперёд.
        const speed = r.finish ? r.speed * 1.12 : r.speed;
        const prevY = p.y;
        p.y -= speed * dt;
        // Зажим по ширине трассы под игроком.
        const seg = L.segAtY(p.y, r.air ? null : p.h);
        if (seg && !r.fall) {
            const m = Math.min(70, p.visualHalfW() * 0.45) + 14;
            nx = Math.max(seg.x0 + m, Math.min(seg.x1 - m, nx));
            if (!this.steer.active && !keyDir) this.steer.tx = Math.max(seg.x0 + m, Math.min(seg.x1 - m, this.steer.tx));
        }
        // Столбики-разделители: не перейти по x, пока рядом.
        for (const pole of L.poles) {
            if (Math.abs(p.y - pole.y) > pole.len / 2 + 20 || Math.abs(p.h - pole.h) > 80) continue;
            const half = p.deathHalfW() * 0.55 + 12;
            if (prevX <= pole.x) nx = Math.min(nx, pole.x - half);
            else nx = Math.max(nx, pole.x + half);
        }
        p.vx = (nx - prevX) / Math.max(1e-4, dt);
        p.x = nx;
        // Высота: прыжок, падение, опора.
        if (r.air) {
            const a = r.air;
            const k = Math.min(1, (a.y0 - p.y) / a.dist);
            p.h = a.h0 + (a.h1 - a.h0) * k + 4 * a.arc * k * (1 - k);
            p.groundH = a.h0 + (a.h1 - a.h0) * k;
            const under = L.groundAt(p.x, p.y);
            if (under) p.groundH = under.h;
            if (k >= 1) {
                r.air = null;
                p.h = a.h1;
                const g = L.groundAt(p.x, p.y);
                if (!g || Math.abs(g.h - p.h) > 40) { this._startFall(); }
                else { p.land(); GameSfx.play('land'); if (this.app.fx) this.app.fx.play('land', new BABYLON.Vector3(p.x, p.h + 5, p.y)); this.shake = 0.15; }
            }
        } else if (r.fall) {
            // (падение обрабатывается в состоянии lost)
        } else {
            const g = L.groundAt(p.x, p.y);
            if (!g || Math.abs(g.h - p.h) > 40) {
                r.coyote = (r.coyote || 0) + dt;
                if (r.coyote > 0.05) { this._startFall(); return; }
            } else {
                r.coyote = 0;
                p.h = g.h;
                p.groundH = g.h;
                if (!r.hist.length || prevY - r.hist[r.hist.length - 1].y > 60) {
                    r.hist.push({ x: p.x, y: p.y, h: p.h });
                    if (r.hist.length > 80) r.hist.shift();
                }
            }
        }
        if (r.finish) { this._smashStep(dt); return; }
        // Батуты.
        if (!r.air) {
            for (const pad of L.pads) {
                if (Math.abs(p.y - pad.y) < 80 && Math.abs(p.x - pad.x) < 140 && Math.abs(p.h - pad.h) < 40) { this._jump(pad); break; }
            }
        }
        this._collide(dt);
        if (this.state !== 'run') return;
        // Вертушки.
        for (const s of L.spins) {
            if (Math.abs(p.y - s.y) > s.len / 2 + 80 || s.cool > 0 || Math.abs(p.h - s.h) > 70) continue;
            const cx = Math.cos(s.angle) * s.len / 2, cy = Math.sin(s.angle) * s.len / 2;
            const ax = s.x - cx, ay = s.y - cy, bx = s.x + cx, by = s.y + cy;
            const vx = bx - ax, vy = by - ay;
            const t = Math.max(0, Math.min(1, ((p.x - ax) * vx + (p.y - ay) * vy) / (vx * vx + vy * vy)));
            const dx = p.x - (ax + vx * t), dy = p.y - (ay + vy * t);
            if (dx * dx + dy * dy < Math.pow(p.deathHalfW() * 0.8 + 18, 2)) {
                s.cool = 0.8;
                const side = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx);
                this.steer.tx = p.x + side * 200;
                this._changeValue(-s.v, 'spin', new BABYLON.Vector3(p.x, p.h + 60, p.y));
                if (this.state !== 'run') return;
            }
        }
        // Финиш.
        GameHud.progress(Math.max(0, Math.min(1, (L.startY - p.y) / Math.max(1, L.startY - L.finishY))));
        if (p.y <= L.finishY) this._enterFinish();
    },

    _collide() {
        const p = this.player, r = this.run, L = GameLevel, ents = L.ents;
        while (r.cursor < ents.length && ents[r.cursor].y > p.y + 220) r.cursor++;
        const V = r.value;
        for (let i = r.cursor; i < ents.length; i++) {
            const e = ents[i];
            if (e.y < p.y - 220) break;
            if (e.state !== 'idle') continue;
            const dx = Math.abs(p.x - e.x), dy = Math.abs(p.y - e.y), dh = Math.abs(p.h - e.h);
            if (e.type === 'num') {
                if (dh > 75) continue;
                if (e.v <= r.value) {
                    if (dx < p.eatHalfW() + e.halfW - 8 && dy < 55) this._eat(e);
                } else if (r.invuln <= 0 && dx < p.deathHalfW() + e.halfW - 8 && dy < 45) {
                    this._lose('big', e);
                    return;
                }
            } else if (e.type === 'spike') {
                if (dh < 60 && r.invuln <= 0 && dx < p.deathHalfW() + e.halfW - 8 && dy < 35) { this._lose('spike', e); return; }
            } else if (e.type === 'coin') {
                if (dh < 90 && dx < p.eatHalfW() + 30 && dy < 55) {
                    e.state = 'taken'; e.t = 0;
                    const amount = Math.round((typeof COIN_PICKUP !== 'undefined' ? COIN_PICKUP : 10) * (1 + this.save.level / 20));
                    r.coins += amount;
                    GameSfx.play('coin');
                    GameHud.floatText('+' + amount, 'coin', new BABYLON.Vector3(e.x, e.h + 80, e.y));
                }
            } else if (e.type === 'sub' || e.type === 'mul' || e.type === 'div') {
                if (dh < 80 && dy < 40 && dx < e.halfW + 6) {
                    e.state = 'hit'; e.t = 0;
                    const at = new BABYLON.Vector3(p.x, p.h + 90, p.y);
                    if (e.type === 'sub') this._changeValue(-e.v, 'sub', at);
                    else if (e.type === 'mul') this._changeValue(r.value * (e.v - 1), 'mul', at, '×' + e.v);
                    else this._changeValue(Math.ceil(r.value / e.v) - r.value, 'div', at, '÷' + e.v);
                    if (this.state !== 'run') return;
                }
            }
        }
        void V;
    },

    _eat(e) {
        const p = this.player, r = this.run;
        e.state = 'eaten'; e.t = 0;
        r.value += e.v;
        r.eaten++;
        r.maxValue = Math.max(r.maxValue, r.value);
        p.setValue(r.value, true);
        this.combo++;
        this.comboT = 0.7;
        GameSfx.play('pop', { rate: 1 + Math.min(0.6, this.combo * 0.05) });
        if (this.app.fx) this.app.fx.play('eat', new BABYLON.Vector3(e.x, e.h + 50, e.y));
        GameHud.floatText('+' + e.v, 'plus', new BABYLON.Vector3(p.x, p.h + p.height + 30, p.y));
        if (this.combo >= 5 && this.combo % 5 === 0) GameHud.combo(this.combo);
    },

    /** @param {number} delta @param {string} kind @param {BABYLON.Vector3} at @param {string} [label] */
    _changeValue(delta, kind, at, label) {
        const p = this.player, r = this.run;
        const before = r.value;
        r.prevValue = before;
        r.value = Math.max(0, Math.round(before + delta));
        r.maxValue = Math.max(r.maxValue, r.value);
        if (delta >= 0) {
            p.setValue(r.value, true);
            GameSfx.play('gate-good');
            if (this.app.fx) this.app.fx.play('gate', at);
            GameHud.floatText(label || ('+' + delta), 'good', at);
        } else {
            GameSfx.play(kind === 'div' ? 'gate-bad' : 'wall');
            if (this.app.fx) this.app.fx.play('hurt', at);
            GameHud.floatText(label || String(Math.round(delta)), 'bad', at);
            this.shake = 0.25;
            if (r.value <= 0) { this._lose('zero', null); return; }
            p.setValue(r.value, false);
            p.hurt();
        }
    },

    _jump(pad) {
        const p = this.player, r = this.run, L = GameLevel;
        const land = L.groundAt(p.x, pad.y - pad.dist) || L.segAtY(pad.y - pad.dist);
        r.air = { y0: p.y, dist: pad.dist, h0: p.h, h1: land ? land.h : p.h, arc: pad.dist * (typeof RUN_JUMP_ARC !== 'undefined' ? RUN_JUMP_ARC : 0.32) };
        p.takeoff();
        GameSfx.play('jump');
        if (this.app.fx) this.app.fx.play('land', new BABYLON.Vector3(pad.x, pad.h + 10, pad.y));
    },

    _startFall() {
        const r = this.run;
        r.fall = { vy: 200 };
        if (this.player) this.player.shadow.setEnabled(false);   // под пропастью тени нет
        this._lose('fall', null);
    },

    _enterFinish() {
        const r = this.run;
        if (r.finish) return;
        r.finish = true;
        this.state = 'finish';
        GameSfx.play('gate-good');
        if (this.app.fx) this.app.fx.play('confetti', new BABYLON.Vector3(800, GameLevel.spawn.h + 300, GameLevel.finishY));
        if (typeof Tutorial !== 'undefined') Tutorial.complete('finish');
        GameHud.progress(1);
    },

    _smashStep() {
        const p = this.player, r = this.run, L = GameLevel;
        const b = L.blocks[r.blockIdx];
        if (!b) {
            if (p.y < (L.blocks.length ? L.blocks[L.blocks.length - 1].y - 260 : L.finishY - 600)) this._win();
            return;
        }
        if (p.y > b.y + 95) return;
        if (b.v <= r.value) {
            b.broken = true;
            r.blockIdx++;
            r.blocks++;
            b.node.setEnabled(false);
            if (this.app.fx) {
                const h = this.app.fx.play('block', new BABYLON.Vector3(800, b.node.position.y + 70, b.y));
                void h;
            }
            GameLevel.spawnChunks(b);
            GameSfx.play('crunch');
            this.shake = 0.22;
            r.hitStop = 0.035;
            p.gulp(0.6);
        } else {
            p.y = b.y + 96;
            p.hurt();
            b.node.scaling.set(1.06, 0.94, 1.06);
            setTimeout(() => b.node.scaling.set(1, 1, 1), 120);
            this._win();
        }
    },

    _win() {
        if (this.state === 'won') return;
        const r = this.run;
        this.state = 'won';
        r.wonT = 0;
        this.player.setRunning(false);
        Platform.gameplay(false);
        const base = Math.round(r.value * this.income() * (1 + 0.05 * r.blocks));
        r.reward = base + r.coins;
        this.save.best = Math.max(this.save.best || 0, r.value);
        this.save.wins = (this.save.wins || 0) + 1;
        this._roundEnded(true);
        GameSfx.play('win');
        if (typeof GameShop !== 'undefined' && GameShop.victoryFx) GameShop.victoryFx(this.player);
        else if (this.app.fx) this.app.fx.play('confetti', new BABYLON.Vector3(this.player.x, this.player.h + 200, this.player.y));
        if (typeof Telemetry !== 'undefined' && Telemetry.progress) Telemetry.progress('completed', 'level_' + this.save.level, { step_index: this.save.level });
    },

    _showWin() {
        const r = this.run;
        r.claimed = r.reward;
        this.save.coins += r.reward;            // начислено сразу (сохранение), счётчик догонит с полётом монет
        this.persist();
        GameHud.showWin(r.value, r.reward, r.blocks);
        setTimeout(() => { GameHud.coinBurst('nm-win-coins'); GameSfx.play('reward'); GameHud.coins(this.save.coins, 'win'); }, 550);
    },

    /** @param {string} reason @param {any} culprit */
    _lose(reason, culprit) {
        if (this.state === 'lost') return;
        const p = this.player, r = this.run;
        this.state = 'lost';
        r.reason = reason;
        r.culprit = culprit;
        r.lostT = 0;
        r.loseShown = false;
        p.setRunning(false);
        Platform.gameplay(false);
        if (reason === 'fall') { GameSfx.play('lose'); }
        else {
            GameSfx.play(reason === 'spike' ? 'spike' : 'lose');
            p.shatter(reason === 'big' ? '#ff4a56' : undefined);
            this.shake = 0.4;
            if (culprit && culprit.view) { culprit.pop = 0.25; }
        }
        this._roundEnded(false);
        if (typeof Tutorial !== 'undefined' && Tutorial.active) Tutorial.finish('abort');   // обучение начнётся заново на «Ещё раз»
        if (typeof Telemetry !== 'undefined' && Telemetry.progress) Telemetry.progress('failed', 'level_' + this.save.level, { step_index: this.save.level, reason });
    },

    _roundEnded(win) {
        const tutorialRun = typeof Tutorial !== 'undefined' && Tutorial.active;
        if (!tutorialRun) {
            Platform.ads.roundEnded(win, this.save.level);
            this.sessionResults++;
            Platform.submitScore(this.save.level);
        }
        this.persist();
    },

    canRevive() {
        return !this.run.revived && Platform.rewardedSupported();
    },

    // Продолжить после проигрыша за рекламу: то же число, опасность убрана, короткая неуязвимость.
    async revive() {
        const r = this.run, p = this.player;
        if (!this.canRevive() || this.state !== 'lost') return false;
        const ok = await Platform.rewarded('revive');
        if (!ok || this.state !== 'lost') return false;
        r.revived = true;
        p.clearShards();
        p.setHidden(false);
        if (r.reason === 'fall') {
            const back = [...r.hist].reverse().find(h => h.y > p.y + 260 && GameLevel.groundAt(h.x, h.y)) || r.hist[0] || GameLevel.spawn;
            p.place(back.x, back.y, back.h);
            this.steer.tx = back.x;
        } else if (r.reason === 'zero') {
            r.value = Math.max(1, r.prevValue);
        } else if (r.culprit) {
            GameLevel._hide(r.culprit);
            if (this.app.fx) this.app.fx.play('gate', new BABYLON.Vector3(r.culprit.x, 60, r.culprit.y));
        }
        r.fall = null; r.air = null;
        p.setValue(r.value, true);
        r.invuln = 1.6;
        p.blink = 1.6;
        this.state = r.finish ? 'finish' : 'run';
        p.setRunning(true);
        Platform.gameplay(true);
        GameHud.showRun();
        return true;
    },

    // «Ещё раз»: реклама за проигрыш (после второго результата сессии), затем тот же уровень заново.
    retry() {
        const every = Math.max(1, typeof LOSS_AD_EVERY !== 'undefined' ? LOSS_AD_EVERY : 1);
        this.lossCount++;
        if (this.sessionResults >= 2 && this.lossCount % every === 0) Platform.ads.results = Math.max(Platform.ads.results, 2);
        return Platform.ads.next(() => this.restartLevel());
    },

    // «Дальше» после победы: межстраничная по правилу двух результатов, затем следующий уровень.
    next() {
        return Platform.ads.next(() => this.goLevel(this.save.level + 1));
    },

    // x2 награды за рекламу.
    async doubleReward() {
        const r = this.run;
        if (!r || r.doubled || !r.claimed) return false;
        const ok = await Platform.rewarded('win-x2');
        if (!ok) return false;
        r.doubled = true;
        this.save.coins += r.claimed;
        this.persist();
        GameHud.coinBurst('nm-x2');
        GameSfx.play('reward');
        setTimeout(() => GameHud.coins(this.save.coins, 'x2'), 350);
        return true;
    },
};
