// GamePlayer.js — число игрока: значение, цифры-клоны с желейным шейдером, пружины (наклон,
// сплющивание, дрожь), шапка и лицо (косметика), след, разлёт при проигрыше.
// Логика бега (столкновения, прыжки, падение) — в Game.js; здесь вид и «характер».

class GamePlayer {
    /** @param {any} app */
    constructor(app) {
        this.app = app;
        this.scene = app.location.view.scene;
        this.value = 1;
        this.text = '';
        this.x = 800; this.y = 0; this.h = 0;
        this.vx = 0;
        this.t = 0;
        this.running = false;
        this.hidden = false;
        this.root = new BABYLON.TransformNode('player', this.scene);
        this.body = new BABYLON.TransformNode('player-body', this.scene);
        this.body.parent = this.root;
        /** @type {{ mesh: BABYLON.Mesh | null, mat: BABYLON.StandardMaterial, jelly: JellyPlugin, bx: JellySpring, bz: JellySpring, sq: JellySpring, x: number, key: string }[]} */
        this.slots = [];
        this.heightSpring = new JellySpring(60, 12);
        this.heightSpring.reset(this.targetHeight());
        this.hop = new JellySpring(120, 10);           // подскок всего числа (поедание, приземление)
        /** @type {BABYLON.TransformNode | null} */
        this.hat = null;
        /** @type {BABYLON.TransformNode | null} */
        this.face = null;
        this.hatUrl = '';
        this.faceUrl = '';
        this.hatToken = 0;
        this.faceToken = 0;
        /** @type {any} */
        this.skin = null;
        /** @type {any} */
        this.trail = null;
        /** @type {any} */
        this.trailHandle = null;
        /** @type {any[]} */
        this.shards = [];
        this.blink = 0;
        this.groundH = 0;
        this.shadow = BABYLON.MeshBuilder.CreateGround('player-shadow', { width: 1, height: 1 }, this.scene);
        this.shadow.material = GameLevel.mats.shadow || null;
        this.shadow.isPickable = false;
        this.setSkin(null);
        this.setValue(1, false);
    }

    targetHeight() {
        const base = typeof PLAYER_HEIGHT !== 'undefined' ? PLAYER_HEIGHT : 112;
        const grow = typeof PLAYER_GROW !== 'undefined' ? PLAYER_GROW : 0.12;
        let h = base * (1 + grow * Math.log10(Math.max(1, this.value)));
        const w = GameGlyphs.layout(GameGlyphs.text(this.value)).width;
        if (w * h > 400) h = 400 / w;                    // широкое число не вылезает за трассу
        return h;
    }

    get height() { return this.heightSpring.value; }

    /** Видимая полуширина, px. */
    visualHalfW() { return GameGlyphs.layout(this.text).width * this.height / 2; }

    /** Полуширина для столкновения с опасным (docs/LEVEL-FORMAT.md). */
    deathHalfW() { return 30 + 14 * Math.max(0, this.text.length - 1); }

    /** Полуширина «рта» — чем ест синие числа (щедрее, чем опасная). */
    eatHalfW() { return Math.max(this.deathHalfW() + 18, this.visualHalfW() * (typeof PLAYER_EAT_REACH !== 'undefined' ? PLAYER_EAT_REACH : 0.85) + 12); }

    // --- Значение и цифры ---------------------------------------------------------------

    /** @param {number} v @param {boolean} [bounce] */
    setValue(v, bounce) {
        this.value = Math.max(0, Math.round(v));
        const text = GameGlyphs.text(Math.max(1, this.value));
        if (text !== this.text) this._rebuild(text);
        this.heightSpring.target = this.targetHeight();
        if (bounce) this.gulp(1);
    }

    _rebuild(text) {
        this.text = text;
        const lay = GameGlyphs.layout(text);
        while (this.slots.length < lay.glyphs.length) this.slots.push(this._slot(this.slots.length));
        this.slots.forEach((s, i) => {
            const g = lay.glyphs[i];
            if (!g) { if (s.mesh) s.mesh.setEnabled(false); return; }
            if (!s.mesh || s.key !== g.key) {
                if (s.mesh) s.mesh.dispose(false, false);
                s.mesh = GameGlyphs.clone(g.key, s.mat);
                if (s.mesh) s.mesh.parent = this.body;
                s.key = g.key;
            }
            if (s.mesh) { s.mesh.setEnabled(!this.hidden); s.mesh.position.x = g.x; }
            s.x = g.x;
        });
        this._placeFace();
    }

    _slot(i) {
        const mat = new BABYLON.StandardMaterial('player-digit-' + i, this.scene);
        const jelly = GameJelly.attach(mat);
        const stiff = (typeof JELLY_STIFF !== 'undefined' ? JELLY_STIFF : 170) * (1 - 0.07 * (i % 4));
        const slot = { mesh: null, mat, jelly, bx: new JellySpring(stiff), bz: new JellySpring(stiff), sq: new JellySpring(stiff * 1.1), x: 0, key: '' };
        this._applySkin(slot, i);
        return slot;
    }

    // --- Скин (материал) ------------------------------------------------------------------

    // def: { color, color2?, spec?, power?, emissive?, alpha?, rim?, anim?: 'rainbow'|'pulse'|'shift'|'sparkle' }
    /** @param {any} def */
    setSkin(def) {
        this.skin = def || { color: '#2b74f4', rim: '#9fd0ff' };
        this.slots.forEach((s, i) => this._applySkin(s, i));
    }

    _applySkin(slot, i) {
        const d = this.skin || {};
        const m = slot.mat;
        m.diffuseColor = BABYLON.Color3.FromHexString(d.color || '#2b74f4');
        const sp = d.spec != null ? d.spec : 0.75;
        m.specularColor = new BABYLON.Color3(sp, sp, sp);
        m.specularPower = d.power || 48;
        m.emissiveColor = d.emissive ? BABYLON.Color3.FromHexString(d.emissive) : m.diffuseColor.scale(0.22);
        m.alpha = d.alpha != null ? d.alpha : 1;
        m.backFaceCulling = true;
        const rim = BABYLON.Color3.FromHexString(d.rim || '#ffffff');
        m.emissiveFresnelParameters = new BABYLON.FresnelParameters({ bias: 0.15, power: 2.2, leftColor: rim.scale(0.75), rightColor: new BABYLON.Color3(0, 0, 0) });
        m.emissiveFresnelParameters.isEnabled = true;
    }

    // --- Косметика -------------------------------------------------------------------------

    /** @param {string} url */
    async setHat(url) {
        const token = ++this.hatToken;
        if (this.hat) { this.hat.dispose(false, false); this.hat = null; }
        this.hatUrl = url || '';
        if (!url) return;
        const n = await GameModels.spawnUrl(url, this.root);
        if (token !== this.hatToken) { if (n) n.dispose(false, false); return; }
        this.hat = n;
        if (n) n.setEnabled(!this.hidden);
    }

    /** @param {string} url */
    async setFace(url) {
        const token = ++this.faceToken;
        if (this.face) { this.face.dispose(false, false); this.face = null; }
        this.faceUrl = url || '';
        if (!url) return;
        const n = await GameModels.spawnUrl(url, this.root);
        if (token !== this.faceToken) { if (n) n.dispose(false, false); return; }
        this.face = n || this._fallbackFace();
        this.face.setEnabled(!this.hidden);
        this._placeFace();
    }

    _fallbackFace() {
        const n = new BABYLON.TransformNode('face-fallback', this.scene);
        n.parent = this.root;
        const white = new BABYLON.StandardMaterial('eye-w', this.scene);
        white.diffuseColor = new BABYLON.Color3(1, 1, 1); white.emissiveColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        const black = new BABYLON.StandardMaterial('eye-b', this.scene);
        black.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.08);
        for (const s of [-1, 1]) {
            const e = BABYLON.MeshBuilder.CreateSphere('eye', { diameter: 18, segments: 10 }, this.scene);
            e.scaling.set(1, 1.25, 0.45); e.position.set(s * 12, 0, 2); e.parent = n; e.material = white;
            const p = BABYLON.MeshBuilder.CreateSphere('pupil', { diameter: 10, segments: 8 }, this.scene);
            p.scaling.set(1, 1.2, 0.4); p.position.set(s * 12, -1, 6); p.parent = n; p.material = black;
        }
        return n;
    }

    _placeFace() { /* позиция лица считается каждый кадр в update() */ }

    // def: { color, color2, rate, size, life, texture? } — след из частиц у основания числа
    /** @param {any} def */
    setTrail(def) {
        this.trail = def || null;
        if (this.trailHandle) { this.trailHandle.dispose(); this.trailHandle = null; }
        if (def && this.running) this._startTrail();
    }

    _startTrail() {
        const d = this.trail;
        if (!d || !this.app.fx || this.trailHandle) return;
        this.trailHandle = this.app.fx.create(Object.assign({
            follow: () => new BABYLON.Vector3(this.x, this.h + 18, this.y + 22),
            rate: 60, life: [0.35, 0.8], size: [8, 18], speed: [10, 60],
            direction: [[-0.6, 0.6, 0.6], [0.6, 1.4, 1.4]],
            color: '#ffffff', blend: 'additive',
            sizeGradient: [[0, 1], [1, 0.1]],
        }, d));
    }

    /** @param {boolean} on */
    setRunning(on) {
        this.running = on;
        if (on) this._startTrail();
        else if (this.trailHandle) { this.trailHandle.stop(); this.trailHandle = null; }
    }

    // --- «Характер»: события --------------------------------------------------------------

    /** Поедание: «глоток» — вытянуться и осесть. @param {number} k */
    gulp(k) {
        this.slots.forEach((s, i) => { s.sq.kick(-(typeof JELLY_SQUASH !== 'undefined' ? JELLY_SQUASH : 0.32) * 7 * k * (1 + 0.12 * i)); s.bz.kick(1.4 * k); });
        this.hop.kick(260 * k);
    }

    /** Удар/потеря значения: сжаться и затрястись. */
    hurt() {
        this.slots.forEach((s, i) => { s.sq.kick(-3.5); s.bx.kick((i % 2 ? 1 : -1) * 4); });
        this.blink = 0.5;
    }

    takeoff() { this.slots.forEach(s => { s.sq.kick(4.5); s.bz.kick(2.2); }); }
    land() { this.slots.forEach((s, i) => s.sq.kick(-4.2 * (1 + 0.1 * i))); this.hop.kick(-120); }

    // Разлёт цифр при проигрыше: осколки-клоны летят и кувыркаются; само число прячется.
    /** @param {string} [color] */
    shatter(color) {
        this.setHidden(true);
        for (const s of this.slots) {
            if (!s.mesh || !s.mesh.isEnabled(false)) continue;
        }
        const lay = GameGlyphs.layout(this.text);
        const H = this.height;
        lay.glyphs.forEach((g, i) => {
            const slot = this.slots[i];
            const m = GameGlyphs.clone(g.key, slot.mat);
            if (!m) return;
            m.scaling.set(H, H, H);
            m.position.set(this.x + g.x * H, this.h, this.y);
            const dir = (g.x === 0 ? (i % 2 ? 1 : -1) : Math.sign(g.x));
            this.shards.push({ m, vx: dir * (180 + Math.random() * 220), vy: 520 + Math.random() * 260, vz: 120 + Math.random() * 200,
                rx: (Math.random() - 0.5) * 12, rz: (Math.random() - 0.5) * 14, t: 0 });
        });
        if (this.app.fx) {
            this.app.fx.create({ position: new BABYLON.Vector3(this.x, this.h + H * 0.5, this.y), burst: 70, capacity: 80, life: [0.4, 1.1],
                size: [10, 26], speed: [200, 520], direction: [[-1, 0.3, -1], [1, 1.4, 1]], gravity: [0, -900, 0],
                color: color || (this.skin && this.skin.color) || '#2b74f4', blend: 'standard', duration: 0.08,
                sizeGradient: [[0, 1], [1, 0.2]] });
        }
    }

    /** @param {boolean} on */
    setHidden(on) {
        this.hidden = on;
        for (const s of this.slots) if (s.mesh) s.mesh.setEnabled(!on && !!s.key && s.mesh.parent === this.body && this._slotUsed(s));
        if (this.hat) this.hat.setEnabled(!on);
        if (this.face) this.face.setEnabled(!on);
        this.shadow.setEnabled(!on);
    }

    _slotUsed(s) { return this.slots.indexOf(s) < GameGlyphs.layout(this.text).glyphs.length; }

    clearShards() {
        for (const s of this.shards) s.m.dispose(false, false);
        this.shards = [];
    }

    // Мгновенно поставить без пружинных хвостов (старт уровня, возрождение).
    /** @param {number} x @param {number} y @param {number} h */
    place(x, y, h) {
        this.x = x; this.y = y; this.h = h; this.vx = 0;
        for (const s of this.slots) { s.bx.reset(0); s.bz.reset(0); s.sq.reset(0); }
        this.hop.reset(0);
        this.heightSpring.reset(this.targetHeight());
        this.update(0);
    }

    // --- Кадр -------------------------------------------------------------------------------

    /** @param {number} dt */
    update(dt) {
        this.t += dt;
        const H = this.heightSpring.update(dt);
        const hop = this.hop.update(dt);
        const lean = typeof JELLY_LEAN !== 'undefined' ? JELLY_LEAN : 0.22;
        const leanTarget = Math.max(-0.35, Math.min(0.35, -this.vx / 1500 * lean * 2));
        const runWob = this.running ? 0.02 : 0.012;
        const idleSq = this.running ? Math.sin(this.t * 15) * 0.035 : Math.sin(this.t * 3.2) * 0.03;
        this.root.position.set(this.x, this.h + Math.max(-20, hop * 0.08), this.y);
        this.body.scaling.set(H, H, H);
        const anim = this.skin && this.skin.anim;
        this.slots.forEach((s, i) => {
            s.bx.target = leanTarget;
            s.bz.target = this.running ? 0.05 : 0;
            s.sq.target = idleSq;
            s.bx.update(dt); s.bz.update(dt); s.sq.update(dt);
            s.jelly.bendX = s.bx.value;
            s.jelly.bendZ = s.bz.value;
            s.jelly.squash = Math.max(-0.45, Math.min(0.6, s.sq.value));
            s.jelly.wobPhase = this.t * 9 + i * 0.9;
            s.jelly.wobAmp = runWob + Math.min(0.06, Math.abs(s.sq.velocity) * 0.004);
            if (anim) this._animSkin(s, i, anim);
        });
        // Шапка — на верхушке средней цифры, с её наклоном и сплющиванием.
        const mid = this.slots[Math.floor((GameGlyphs.layout(this.text).glyphs.length - 1) / 2)] || this.slots[0];
        if (this.hat && mid) {
            const sq = 1 + (mid.jelly.squash || 0);
            const hatScale = H / 100;
            this.hat.position.set(mid.x * H * 0 + mid.jelly.bendX * H, H * sq - 4, mid.jelly.bendZ * H);
            this.hat.position.x += 0;
            this.hat.rotation.z = -Math.atan(mid.jelly.bendX * 2);
            this.hat.rotation.x = Math.atan(mid.jelly.bendZ * 2);
            this.hat.scaling.set(hatScale, hatScale, hatScale);
        }
        if (this.face && mid) {
            const sq = 1 + (mid.jelly.squash || 0);
            const fs = H / 100 * 1.2;
            const yk = 0.56 * sq;
            this.face.position.set(mid.jelly.bendX * H * yk * yk, H * yk, H * GameGlyphs.DEPTH / 2 / Math.sqrt(sq) + 1 + mid.jelly.bendZ * H * yk * yk);
            this.face.scaling.set(fs, fs, fs);
        }
        // Мигание после удара/возрождения.
        if (this.blink > 0) {
            this.blink -= dt;
            const vis = this.blink <= 0 || Math.floor(this.blink * 16) % 2 === 0;
            for (const s of this.slots) if (s.mesh) s.mesh.visibility = vis ? 1 : 0.35;
        }
        // Тень-пятно.
        const w = this.visualHalfW() * 2 + 30;
        this.shadow.scaling.set(w, 1, 70);
        this.shadow.position.set(this.x, (this.groundH != null ? this.groundH : this.h) + 2.5, this.y);
        if (this.shadow.material !== GameLevel.mats.shadow) this.shadow.material = GameLevel.mats.shadow || null;
        // Осколки.
        for (const sh of this.shards) {
            sh.t += dt;
            sh.vy -= 1800 * dt;
            sh.m.position.x += sh.vx * dt; sh.m.position.y += sh.vy * dt; sh.m.position.z += sh.vz * dt;
            sh.m.rotation.x += sh.rx * dt; sh.m.rotation.z += sh.rz * dt;
            const k = Math.max(0, 1 - Math.max(0, sh.t - 0.6) / 0.6);
            const H2 = this.height * k;
            sh.m.scaling.set(H2, H2, H2);
        }
    }

    _animSkin(s, i, anim) {
        const m = s.mat, t = this.t;
        if (anim === 'rainbow') {
            const c = BABYLON.Color3.FromHSV((t * 90 + i * 40) % 360, 0.62, 1);
            m.diffuseColor = c; m.emissiveColor = c.scale(0.25);
        } else if (anim === 'pulse') {
            const base = BABYLON.Color3.FromHexString(this.skin.emissive || this.skin.color || '#ffffff');
            m.emissiveColor = base.scale(0.35 + 0.3 * (0.5 + 0.5 * Math.sin(t * 5 + i)));
        } else if (anim === 'shift') {
            const a = BABYLON.Color3.FromHexString(this.skin.color || '#ffffff'), b = BABYLON.Color3.FromHexString(this.skin.color2 || '#000000');
            const k = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.8);
            m.diffuseColor = BABYLON.Color3.Lerp(a, b, k);
            m.emissiveColor = m.diffuseColor.scale(0.22);
        }
    }

    dispose() {
        this.clearShards();
        if (this.trailHandle) { this.trailHandle.dispose(); this.trailHandle = null; }
        for (const s of this.slots) { if (s.mesh) s.mesh.dispose(false, false); s.mat.dispose(); }
        this.slots = [];
        if (this.hat) this.hat.dispose(false, false);
        if (this.face) this.face.dispose(false, false);
        this.shadow.dispose();
        this.root.dispose(false, false);
    }
}
