// GameLevel.js — уровень из маркеров карты: трасса (платформы, дыры, бортики), числа, стенки −N,
// ворота ×K/÷K, батуты, шипы, вертушки, столбики, монеты, финиш и блоки после него, декор.
// Формат маркеров — docs/LEVEL-FORMAT.md. Координаты карты (x, y) -> Babylon (x, h, y);
// бег — на север (к меньшему y), камера смотрит с юга, числа повёрнуты к ней лицом (+Z).

/** @typedef {{ x0: number, x1: number, y0: number, y1: number, h: number }} Rect */

/** @satisfies {Record<string, any>} */
const GameLevel = {
    /** @type {any} */
    app: null,
    /** @type {BABYLON.Scene | null} */
    scene: null,
    /** @type {BABYLON.TransformNode | null} */
    root: null,
    /** @type {Rect[]} */
    segs: [],
    /** @type {Rect[]} */
    holes: [],
    /** @type {any[]} */
    ents: [],
    /** @type {any[]} */
    pads: [],
    /** @type {any[]} */
    poles: [],
    /** @type {any[]} */
    spins: [],
    /** @type {any[]} */
    blocks: [],
    /** @type {any[]} */
    decor: [],
    spawn: { x: 800, y: 0, h: 0 },
    finishY: 0,
    startY: 0,
    par: 100,
    time: 0,
    /** @type {any} */
    theme: null,
    /** @type {Record<string, any>} */
    mats: {},
    /** @type {Record<string, BABYLON.Mesh>} */
    tinted: {},
    /** @type {any} */
    sky: null,
    /** @type {BABYLON.Mesh | null} */
    track: null,
    /** @type {any[]} */
    bubbles: [],
    /** @type {any[]} */
    chunks: [],
    /** @type {BABYLON.Mesh | null} */
    _blobSrc: null,
    /** @type {Record<string, BABYLON.Mesh>} */
    _glowSrc: {},
    /** @type {BABYLON.DynamicTexture | null} */
    _glowTex: null,
    /** @type {any} */
    dust: null,
    _py: 0,

    COLORS: {
        blue: '#3a88ff',
        red: '#ff4752',
        wall: '#ff4f5e',
        mul: '#3fd67a',
        div: '#ffa23a',
    },

    /** Параметр маркера: num-16 -> 16, sub-20-2 -> 20. @param {string} name @param {number} def */
    param(name, def) {
        const m = /^[a-z]+-(\d+(?:\.\d+)?)/i.exec(String(name || ''));
        return m ? Number(m[1]) : def;
    },

    color4(hex, a) {
        const c = BABYLON.Color3.FromHexString(hex);
        return new BABYLON.Color4(c.r, c.g, c.b, a == null ? 1 : a);
    },

    // --- Сборка ---------------------------------------------------------------------------

    /** @param {any} app @param {any} theme */
    async build(app, theme) {
        this.dispose();
        this.app = app;
        this.scene = app.location.view.scene;
        this.theme = theme;
        this.time = 0;
        const scene = this.scene;
        this.root = new BABYLON.TransformNode('level', scene);
        await GameGlyphs.init(scene);
        GameModels.bind(app.location.view);
        await GameModels.preload();
        this._tuneTemplates();
        this._materials();
        const loc = app.location;
        const P = (n, d) => this.param(n, d);
        const sp = loc.marker('spawn');
        this.spawn = sp ? { x: sp.x, y: sp.y, h: sp.h || 0 } : { x: 800, y: loc.height - 400, h: 0 };
        this.startY = this.spawn.y;
        this.segs = loc.markers('seg').map(d => this._rect(d, 600, 1000));
        if (!this.segs.length) this.segs = [{ x0: 500, x1: 1100, y0: 0, y1: loc.height, h: 0 }];
        this.holes = loc.markers('hole').map(d => this._rect(d, 200, 200));
        const fin = loc.marker('finish');
        this.finishY = fin ? fin.y : Math.min(...this.segs.map(s => s.y0)) + 3800;
        const parM = loc.marker('par');
        this.ents = [];
        let sumUp = 1;
        for (const d of loc.markers('num')) { const v = P(d.name, 1); sumUp += v; this._addNumber(d.x, d.y, d.h || 0, v, 0); }
        for (const d of loc.markers('move')) { const v = P(d.name, 1); sumUp += v; this._addNumber(d.x, d.y, d.h || 0, v, (d.scale && d.scale[0] || 1) * 150); }
        for (const d of loc.markers('grid')) {
            const v = P(d.name, 2), cols = Math.max(1, Math.round(d.scale ? d.scale[0] : 1)), rows = Math.max(1, Math.round(d.scale ? d.scale[2] : 1));
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                sumUp += v;
                this._addNumber(d.x + (c - (cols - 1) / 2) * 140, d.y + (r - (rows - 1) / 2) * 140, d.h || 0, v, 0);
            }
        }
        this.par = parM ? Math.max(5, P(parM.name, 100)) : Math.max(20, Math.round(sumUp * 0.6));
        for (const d of loc.markers('sub')) this._addWall(d, P(d.name, 10));
        for (const d of loc.markers('mul')) this._addGate(d, 'mul', P(d.name, 2));
        for (const d of loc.markers('div')) this._addGate(d, 'div', P(d.name, 2));
        for (const d of loc.markers('spike')) this._addSpike(d);
        for (const d of loc.markers('coin')) this._addCoin(d);
        this.pads = loc.markers('jump').map(d => this._addPad(d, P(d.name, typeof RUN_JUMP_DIST !== 'undefined' ? RUN_JUMP_DIST : 900)));
        this.poles = loc.markers('pole').map(d => this._addPole(d));
        this.spins = loc.markers('spin').map(d => this._addSpin(d, P(d.name, 10)));
        this.ents.sort((a, b) => b.y - a.y);
        this._buildTrack();
        this._buildFinish();
        this._buildDecor();
        this._buildSky();
        // Земли под трассой нет: трасса висит в небе (как на промо). Плоскость карты с краем давала «пробел» —
        // прячем её; фон — сплошной градиент неба, глубину внизу дают облака.
        const ter = app.location.terrain;
        if (ter && ter.meshes) for (const m of ter.meshes) m.setEnabled(false);
    },

    // Подсветка шаблонов: монета золотится, батут и шипы ярче (их материал — белый + цвета вершин).
    _tuneTemplates() {
        const glow = (key, hex, spec) => {
            const t = GameModels.templates[GameModels.URLS[key]];
            if (!t || (t.metadata && t.metadata.tuned)) return;
            t.metadata = Object.assign({}, t.metadata, { tuned: true });
            for (const m of t.getChildMeshes(false)) {
                const mat = /** @type {any} */ (m.material);
                for (const sm of mat ? (mat.subMaterials || [mat]) : []) {
                    if (!sm) continue;
                    sm.emissiveColor = BABYLON.Color3.FromHexString(hex);
                    if (spec != null) { sm.specularColor = new BABYLON.Color3(spec, spec, spec); sm.specularPower = 24; }
                }
            }
        };
        glow('coin', '#5a3c00', 0.9);
        glow('jumpPad', '#1c4a24', 0.4);
        glow('spike', '#3a0508', 0.6);
        glow('finishGate', '#2a2a30', 0.3);
        glow('pole', '#2a2a34', 0.4);
        glow('gateFrame', '#3a3a44', 0.5);
    },

    _rect(d, w, l) {
        const sw = (d.scale && d.scale[0] ? d.scale[0] * 100 : w) / 2, sl = (d.scale && d.scale[2] ? d.scale[2] * 100 : l) / 2;
        return { x0: d.x - sw, x1: d.x + sw, y0: d.y - sl, y1: d.y + sl, h: d.h || 0 };
    },

    _materials() {
        const scene = this.scene, th = this.theme || {};
        const mk = (name, hex, o) => {
            const m = new BABYLON.StandardMaterial(name, scene);
            m.diffuseColor = BABYLON.Color3.FromHexString(hex);
            m.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            m.specularPower = 32;
            Object.assign(m, o || {});
            return m;
        };
        for (const k in this.mats) if (this.mats[k] && this.mats[k].dispose) this.mats[k].dispose(false, true);
        this.mats = {};
        this.mats.track = mk('track', '#ffffff', { specularColor: new BABYLON.Color3(0.12, 0.12, 0.14), specularPower: 18 });
        this.mats.track.diffuseTexture = this._chevronTexture(th);
        this.mats.track.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.06);
        this.mats.lip = mk('lip', th.lip || '#ffffff', { emissiveColor: new BABYLON.Color3(0.12, 0.12, 0.14) });
        this.mats.glow = mk('pad-ring', '#7dff9a', { emissiveColor: BABYLON.Color3.FromHexString('#4fe07a'), alpha: 0.55, disableLighting: true });
        this.mats.mulPanel = mk('mul-panel', this.COLORS.mul, { alpha: 0.55, emissiveColor: BABYLON.Color3.FromHexString('#1f9a4e'), backFaceCulling: false });
        this.mats.divPanel = mk('div-panel', this.COLORS.div, { alpha: 0.55, emissiveColor: BABYLON.Color3.FromHexString('#b8650f'), backFaceCulling: false });
        this.mats.rail = mk('rail', '#ffffff', { emissiveColor: new BABYLON.Color3(0.2, 0.2, 0.22) });
        this.mats.checker = mk('checker', '#ffffff', { specularColor: new BABYLON.Color3(0, 0, 0) });
        this.mats.checker.diffuseTexture = this._checkerTexture();
        this.mats.shadow = new BABYLON.StandardMaterial('blob', scene);
        this.mats.shadow.diffuseColor = new BABYLON.Color3(0, 0, 0);
        this.mats.shadow.specularColor = new BABYLON.Color3(0, 0, 0);
        this.mats.shadow.opacityTexture = this._blobTexture();
        this.mats.shadow.disableLighting = true;
        this.mats.shadow.alpha = 0.22;
        this.mats.shadow.zOffset = -2;
    },

    _chevronTexture(th) {
        const t = new BABYLON.DynamicTexture('chevron', { width: 512, height: 512 }, this.scene, true);
        const g = /** @type {CanvasRenderingContext2D} */ (/** @type {unknown} */ (t.getContext()));
        g.fillStyle = th.top || '#eef2f9';
        g.fillRect(0, 0, 512, 512);
        const chev = (col, dy, w) => {
            g.strokeStyle = col;
            g.lineWidth = w;
            g.lineJoin = 'round';
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(70, 330 + dy);
            g.lineTo(256, 170 + dy);
            g.lineTo(442, 330 + dy);
            g.stroke();
        };
        chev(th.shade || '#dfe6f2', 7, 34);
        chev(th.chevron || '#ffffff', 0, 30);
        t.update(true);
        t.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        t.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        t.anisotropicFilteringLevel = 8;
        return t;
    },

    _checkerTexture() {
        const t = new BABYLON.DynamicTexture('checker', { width: 256, height: 64 }, this.scene, true);
        const g = /** @type {CanvasRenderingContext2D} */ (/** @type {unknown} */ (t.getContext()));
        for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
            g.fillStyle = (i + j) % 2 ? '#2b2f3a' : '#ffffff';
            g.fillRect(i * 16, j * 16, 16, 16);
        }
        t.update(true);
        return t;
    },

    _blobTexture() {
        const t = new BABYLON.DynamicTexture('blob', { width: 128, height: 128 }, this.scene, true);
        const g = /** @type {CanvasRenderingContext2D} */ (/** @type {unknown} */ (t.getContext()));
        const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.55, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.clearRect(0, 0, 128, 128);
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 128);
        t.hasAlpha = true;
        t.update(true);
        t.getAlphaFromRGB = true;
        return t;
    },

    // Источник с цветом на инстанс: шаблонная модель (или запасная форма) с белым материалом.
    /** @param {string} key @param {() => BABYLON.Mesh} fallback */
    _tintedSource(key, fallback) {
        if (this.tinted[key]) return this.tinted[key];
        let mesh = null;
        const tpl = GameModels.templates[GameModels.URLS[key]];
        if (tpl) {
            const parts = tpl.getChildMeshes(true).filter(m => /** @type {any} */ (m).getTotalVertices && /** @type {any} */ (m).getTotalVertices() > 0);
            if (parts.length) {
                const clones = parts.map(p => { const c = /** @type {BABYLON.Mesh} */ (p).clone('tint-' + key, null, true); c.parent = null; c.position.set(0, 0, 0); c.isVisible = true; return c; });
                mesh = clones.length > 1 ? BABYLON.Mesh.MergeMeshes(clones, true, true, undefined, false, false) : clones[0];
            }
        }
        if (!mesh) mesh = fallback();
        const mat = new BABYLON.StandardMaterial('tint-' + key, this.scene);
        mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        mat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        mat.specularPower = 40;
        mat.emissiveColor = new BABYLON.Color3(0.12, 0.12, 0.12);
        mesh.material = mat;
        mesh.name = 'tint-' + key;
        mesh.registerInstancedBuffer('color', 4);
        mesh.instancedBuffers.color = new BABYLON.Color4(1, 1, 1, 1);
        mesh.isVisible = false;
        mesh.isPickable = false;
        mesh.position.set(0, -100000, 0);
        this.tinted[key] = mesh;
        return mesh;
    },

    // Пятно тени: инстанс одного источника (сотни чисел — один вызов отрисовки).
    _blob(parent, w, d) {
        if (!this._blobSrc || this._blobSrc.isDisposed()) {
            const src = BABYLON.MeshBuilder.CreateGround('blob-src', { width: 1, height: 1 }, this.scene);
            src.material = this.mats.shadow;
            src.isVisible = false;
            src.isPickable = false;
            src.position.y = -100000;
            this._blobSrc = src;
        }
        if (this._blobSrc.material !== this.mats.shadow) this._blobSrc.material = this.mats.shadow;
        const p = this._blobSrc.createInstance('blob');
        p.parent = parent;
        p.scaling.set(w, 1, d);
        p.position.y = 2;
        p.isPickable = false;
        return p;
    },

    // --- Числа ------------------------------------------------------------------------------

    /** Вид числа: корень + инстансы цифр. @param {string} text @param {BABYLON.Color4} color @param {number} height */
    makeNumberView(text, color, height, shadow) {
        const root = new BABYLON.TransformNode('num', this.scene);
        const lay = GameGlyphs.layout(text);
        const insts = [];
        for (const g of lay.glyphs) {
            const inst = GameGlyphs.instance(g.key, color);
            if (!inst) continue;
            inst.parent = root;
            inst.position.x = g.x;
            insts.push(inst);
            if (shadow) {
                // Тёмная копия чуть сзади и ниже — читаемая «тень» белой надписи на ярком фоне.
                const sh = GameGlyphs.instance(g.key, this.color4(shadow));
                if (sh) { sh.parent = root; sh.position.set(g.x + 0.035, -0.06, -0.05); }
            }
        }
        root.scaling.set(height, height, height);
        return { root, insts, width: lay.width * height, color: color.clone() };
    },

    _addNumber(x, y, h, v, amp) {
        const height = this.numHeight(v);
        const view = this.makeNumberView(GameGlyphs.text(v), this.color4(this.COLORS.blue), height);
        view.root.parent = this.root;
        view.root.position.set(x, h, y);
        const blob = this._blob(this.root, view.width * 0.9 + 30, 60);
        blob.position.set(x, h + 2, y);
        this.ents.push({ type: 'num', v, x, y, h, baseX: x, amp, phase: (y % 997) / 997 * Math.PI * 2, view, blob,
            halfW: GameGlyphs.layout(String(v)).glyphs.length * 22, height, state: 'idle', red: null, t: 0 });
    },

    /** Высота числа на трассе по значению. @param {number} v */
    numHeight(v) {
        const base = typeof NUM_HEIGHT !== 'undefined' ? NUM_HEIGHT : 92;
        return base * (1 + 0.1 * Math.max(0, Math.log10(Math.max(1, v)) - 1));
    },

    _addWall(d, v) {
        const w = (d.scale && d.scale[0] ? d.scale[0] : 2.6) * 100;
        const src = this._tintedSource('smashBlock', () => BABYLON.MeshBuilder.CreateBox('wallbox', { width: 170, height: 100, depth: 100 }, this.scene));
        const node = new BABYLON.TransformNode('wall', this.scene);
        node.parent = this.root;
        node.position.set(d.x, d.h || 0, d.y);
        const box = src.createInstance('wall');
        box.instancedBuffers.color = this.color4(this.COLORS.wall);
        box.parent = node;
        const bb = src.getBoundingInfo().boundingBox;
        const sx = w / Math.max(1, bb.maximum.x - bb.minimum.x), sz = 64 / Math.max(1, bb.maximum.z - bb.minimum.z);
        const sy = 86 / Math.max(1, bb.maximum.y - bb.minimum.y);
        box.scaling.set(sx, sy, sz);
        box.position.y = -bb.minimum.y * sy;
        const label = this.makeNumberView('-' + v, this.color4('#ffffff'), 58);
        label.root.parent = node;
        label.root.position.set(0, 14, 34);
        this.ents.push({ type: 'sub', v, x: d.x, y: d.y, h: d.h || 0, halfW: w / 2, node, label, box, state: 'idle', t: 0 });
    },

    _addGate(d, kind, k) {
        const w = (d.scale && d.scale[0] ? d.scale[0] : 2.6) * 100;
        const node = new BABYLON.TransformNode('gate', this.scene);
        node.parent = this.root;
        node.position.set(d.x, d.h || 0, d.y);
        const frame = GameModels.spawn('gateFrame', node);
        if (frame) frame.scaling.set(w / 260, 1, 1);
        const panel = BABYLON.MeshBuilder.CreatePlane('gate-panel', { width: w - 30, height: 160 }, this.scene);
        panel.material = kind === 'mul' ? this.mats.mulPanel : this.mats.divPanel;
        panel.parent = node;
        panel.position.y = 92;
        if (!frame) {
            const rim = BABYLON.MeshBuilder.CreateTorus('gate-rim', { diameter: w * 0.5, thickness: 14, tessellation: 24 }, this.scene);
            rim.parent = node; rim.rotation.x = Math.PI / 2; rim.scaling.set(2, 1, 0.7); rim.position.y = 92; rim.material = this.mats.rail;
        }
        const label = this.makeNumberView((kind === 'mul' ? '×' : '÷') + k, this.color4(kind === 'mul' ? '#0e7a3c' : '#b04f00'), 74);
        label.root.parent = node;
        label.root.position.set(0, 58, 6);
        this.ents.push({ type: kind, v: k, x: d.x, y: d.y, h: d.h || 0, halfW: w / 2, node, label, panel, state: 'idle', t: 0 });
    },

    _addSpike(d) {
        const node = GameModels.spawn('spike', this.root) || (() => {
            const n = new BABYLON.TransformNode('spike', this.scene);
            n.parent = this.root;
            const b = BABYLON.MeshBuilder.CreateIcoSphere('spike-ball', { radius: 24, subdivisions: 1 }, this.scene);
            b.parent = n; b.position.y = 26;
            const m = new BABYLON.StandardMaterial('spike-fallback', this.scene);
            m.diffuseColor = BABYLON.Color3.FromHexString(this.COLORS.red);
            b.material = m;
            return n;
        })();
        node.position.set(d.x, d.h || 0, d.y);
        node.scaling.set(1.3, 1.3, 1.3);
        const blob = this._blob(this.root, 80, 56);
        blob.position.set(d.x, (d.h || 0) + 2, d.y);
        this.ents.push({ type: 'spike', x: d.x, y: d.y, h: d.h || 0, halfW: 34, node, blob, state: 'idle', t: 0, phase: d.x * 0.01 });
    },

    _addCoin(d) {
        const node = GameModels.spawn('coin', this.root) || (() => {
            const n = new BABYLON.TransformNode('coin', this.scene);
            n.parent = this.root;
            const c = BABYLON.MeshBuilder.CreateCylinder('coin-c', { diameter: 50, height: 8, tessellation: 24 }, this.scene);
            c.rotation.x = Math.PI / 2; c.parent = n;
            const m = new BABYLON.StandardMaterial('coin-fallback', this.scene);
            m.diffuseColor = BABYLON.Color3.FromHexString('#ffc533'); m.emissiveColor = new BABYLON.Color3(0.3, 0.2, 0);
            c.material = m;
            return n;
        })();
        node.position.set(d.x, (d.h || 0) + 45, d.y);
        this.ents.push({ type: 'coin', x: d.x, y: d.y, h: d.h || 0, halfW: 26, node, state: 'idle', t: 0, phase: d.y * 0.003 });
    },

    _addPad(d, dist) {
        const node = GameModels.spawn('jumpPad', this.root) || (() => {
            const n = new BABYLON.TransformNode('pad', this.scene);
            n.parent = this.root;
            const b = BABYLON.MeshBuilder.CreateBox('pad-b', { width: 260, height: 14, depth: 160 }, this.scene);
            b.parent = n; b.position.y = 7;
            const m = new BABYLON.StandardMaterial('pad-fallback', this.scene);
            m.diffuseColor = BABYLON.Color3.FromHexString('#5be37d');
            b.material = m;
            return n;
        })();
        node.position.set(d.x, (d.h || 0) + 1, d.y);
        const ring = BABYLON.MeshBuilder.CreateTorus('pad-ring', { diameter: 300, thickness: 10, tessellation: 40 }, this.scene);
        ring.material = this.mats.glow;
        ring.parent = this.root;
        ring.scaling.z = 0.66;
        ring.position.set(d.x, (d.h || 0) + 4, d.y);
        return { x: d.x, y: d.y, h: d.h || 0, dist, node, ring, t: Math.random() };
    },

    _addPole(d) {
        const len = (d.scale && d.scale[2] ? d.scale[2] : 1.6) * 100;
        const node = new BABYLON.TransformNode('pole', this.scene);
        node.parent = this.root;
        node.position.set(d.x, d.h || 0, d.y);
        const rail = BABYLON.MeshBuilder.CreateCapsule('pole-rail', { radius: 9, height: len, tessellation: 10, capSubdivisions: 3 }, this.scene);
        rail.rotation.x = Math.PI / 2;
        rail.position.y = 70;
        rail.parent = node;
        rail.material = this.mats.rail;
        for (const s of [-1, 1]) {
            const post = GameModels.spawn('pole', node);
            if (post) post.position.z = s * (len / 2 - 8);
            else {
                const c = BABYLON.MeshBuilder.CreateCylinder('pole-post', { diameter: 16, height: 120 }, this.scene);
                c.parent = node; c.position.set(0, 60, s * (len / 2 - 8)); c.material = this.mats.rail;
            }
        }
        return { x: d.x, y: d.y, h: d.h || 0, len, node };
    },

    _addSpin(d, v) {
        const len = (d.scale && d.scale[0] ? d.scale[0] : 4) * 100;
        const dir = d.rot && Math.abs(d.rot[1]) > 90 ? -1 : 1;
        const node = GameModels.spawn('spinner', this.root);
        let bar = node ? GameModels.part(node, 'bar') : null;
        let holder = node;
        if (!node) {
            holder = new BABYLON.TransformNode('spin', this.scene);
            holder.parent = this.root;
            const m = new BABYLON.StandardMaterial('spin-fallback', this.scene);
            m.diffuseColor = BABYLON.Color3.FromHexString(this.COLORS.red);
            const hub = BABYLON.MeshBuilder.CreateCylinder('hub', { diameter: 40, height: 50 }, this.scene);
            hub.parent = holder; hub.position.y = 25; hub.material = m;
            bar = BABYLON.MeshBuilder.CreateBox('bar', { width: 400, height: 22, depth: 22 }, this.scene);
            bar.parent = holder; bar.position.y = 35; bar.material = m;
        }
        holder.position.set(d.x, d.h || 0, d.y);
        if (bar) bar.scaling.x = len / 400;
        const label = this.makeNumberView('-' + v, this.color4(this.COLORS.red), 50);
        label.root.parent = holder;
        label.root.position.set(0, 60, 0);
        return { x: d.x, y: d.y, h: d.h || 0, len, v, dir, angle: (d.y % 360) * Math.PI / 180, node: holder, bar, label, cool: 0 };
    },

    // --- Трасса -------------------------------------------------------------------------------

    _buildTrack() {
        const TH = 90;                        // толщина плиты
        const pos = [], nrm = [], uv = [], col = [], idx = [];
        const tileW = 600, tileL = 560;
        const top = (x0, x1, y0, y1, h) => {
            const b = pos.length / 3;
            const P = [[x0, y1], [x1, y1], [x1, y0], [x0, y0]];
            for (const [x, y] of P) {
                pos.push(x, h, y); nrm.push(0, 1, 0);
                uv.push((x - 800) / tileW + 0.5, -y / tileL);
                col.push(1, 1, 1, 1);
            }
            idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
        };
        const sideCol = BABYLON.Color3.FromHexString((this.theme && this.theme.side) || '#c9d3e6');
        // Стенка: от (ax, ay) до (bx, by), наружу — нормаль (nx, ny).
        const wall = (ax, ay, bx, by, h, nx, ny) => {
            const b = pos.length / 3;
            const P = [[ax, ay, h], [bx, by, h], [bx, by, h - TH], [ax, ay, h - TH]];
            P.forEach(([x, y, hh], i) => {
                pos.push(x, hh, y); nrm.push(nx, 0, ny);
                uv.push(0.02, 0.02);
                const k = i < 2 ? 1 : 0.62;
                col.push(sideCol.r * k, sideCol.g * k, sideCol.b * k, 1);
            });
            // Обход: лицевая сторона смотрит по нормали.
            const cross = (bx - ax) * ny - (by - ay) * nx;
            if (cross > 0) idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
            else idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
        };
        const lips = [];
        for (const s of this.segs) {
            const holes = this.holes.filter(o => o.x1 > s.x0 && o.x0 < s.x1 && o.y1 > s.y0 && o.y0 < s.y1);
            const ys = [s.y0, s.y1];
            for (const o of holes) { if (o.y0 > s.y0 && o.y0 < s.y1) ys.push(o.y0); if (o.y1 > s.y0 && o.y1 < s.y1) ys.push(o.y1); }
            const Y = [...new Set(ys)].sort((a, b) => a - b);
            const slices = [];
            for (let i = 0; i + 1 < Y.length; i++) {
                const ya = Y[i], yb = Y[i + 1], ym = (ya + yb) / 2;
                const cut = holes.filter(o => o.y0 < ym && o.y1 > ym).map(o => [Math.max(s.x0, o.x0), Math.min(s.x1, o.x1)]).sort((a, b) => a[0] - b[0]);
                const iv = [];
                let x = s.x0;
                for (const [a, b] of cut) { if (a > x) iv.push([x, a]); x = Math.max(x, b); }
                if (x < s.x1) iv.push([x, s.x1]);
                slices.push({ ya, yb, iv });
            }
            const minus = (a, b, list) => {
                let parts = [[a, b]];
                for (const [c, d] of list) {
                    const next = [];
                    for (const [p, q] of parts) {
                        if (d <= p || c >= q) { next.push([p, q]); continue; }
                        if (c > p) next.push([p, c]);
                        if (d < q) next.push([d, q]);
                    }
                    parts = next;
                }
                return parts.filter(([p, q]) => q - p > 1);
            };
            slices.forEach((sl, i) => {
                for (const [a, b] of sl.iv) {
                    top(a, b, sl.ya, sl.yb, s.h);
                    wall(a, sl.yb, a, sl.ya, s.h, -1, 0);      // запад
                    wall(b, sl.ya, b, sl.yb, s.h, 1, 0);       // восток
                    const north = i > 0 ? slices[i - 1].iv : [];
                    const south = i + 1 < slices.length ? slices[i + 1].iv : [];
                    for (const [p, q] of minus(a, b, north)) wall(q, sl.ya, p, sl.ya, s.h, 0, -1);
                    for (const [p, q] of minus(a, b, south)) wall(p, sl.yb, q, sl.yb, s.h, 0, 1);
                }
            });
            // Бортики вдоль длинных краёв сегмента, кроме участков над дырами.
            for (const edge of [s.x0 + 13, s.x1 - 13]) {
                const blocked = holes.filter(o => o.x0 < edge + 14 && o.x1 > edge - 14).map(o => [o.y0, o.y1]);
                for (const [p, q] of minus(s.y0, s.y1, blocked)) if (q - p > 40) lips.push({ x: edge, y0: p, y1: q, h: s.h });
            }
        }
        const mesh = new BABYLON.Mesh('track', this.scene);
        const vd = new BABYLON.VertexData();
        vd.positions = pos; vd.normals = nrm; vd.uvs = uv; vd.colors = col; vd.indices = idx;
        vd.applyToMesh(mesh);
        mesh.material = this.mats.track;
        mesh.parent = this.root;
        mesh.isPickable = false;
        this.track = mesh;
        const lipMeshes = lips.map(l => {
            const m = BABYLON.MeshBuilder.CreateCapsule('lip', { radius: 13, height: l.y1 - l.y0, tessellation: 10, capSubdivisions: 2 }, this.scene);
            m.rotation.x = Math.PI / 2;
            m.position.set(l.x, l.h + 6, (l.y0 + l.y1) / 2);
            return m;
        });
        if (lipMeshes.length) {
            const merged = BABYLON.Mesh.MergeMeshes(lipMeshes, true, true);
            if (merged) { merged.material = this.mats.lip; merged.parent = this.root; merged.isPickable = false; }
        }
    },

    // Финиш: арка, клетчатая полоса и блоки для разбивания (значения — от par уровня).
    _buildFinish() {
        const seg = this.segAt(800, this.finishY + 1) || this.segs[0];
        const h = seg ? seg.h : 0;
        const gate = GameModels.spawn('finishGate', this.root);
        if (gate) gate.position.set(800, h, this.finishY);
        const strip = BABYLON.MeshBuilder.CreateGround('finish-strip', { width: seg ? seg.x1 - seg.x0 - 30 : 570, height: 70 }, this.scene);
        strip.material = this.mats.checker;
        strip.parent = this.root;
        strip.position.set(800, h + 1.5, this.finishY);
        const n = typeof SMASH_BLOCKS !== 'undefined' ? SMASH_BLOCKS : 15;
        const gap = typeof SMASH_SPACING !== 'undefined' ? SMASH_SPACING : 210;
        const step = this.niceStep(this.par / 10);
        const src = this._tintedSource('smashBlock', () => BABYLON.MeshBuilder.CreateBox('blockbox', { width: 170, height: 100, depth: 100 }, this.scene));
        const bb = src.getBoundingInfo().boundingBox;
        const bw = Math.max(1, bb.maximum.x - bb.minimum.x), bh = Math.max(1, bb.maximum.y - bb.minimum.y), bd = Math.max(1, bb.maximum.z - bb.minimum.z);
        const hues = ['#ff9ec7', '#ff8fb6', '#f78cd6', '#d68cf5', '#b48cff', '#968fff', '#7f9dff', '#6fb0ff', '#5fc4f5', '#5ad6e0', '#63e0c2', '#7fe6a1', '#a4e77f', '#cfe46b', '#ffd65e'];
        this.blocks = [];
        for (let i = 0; i < n; i++) {
            const y = this.finishY - 320 - i * gap;
            const node = new BABYLON.TransformNode('block', this.scene);
            node.parent = this.root;
            node.position.set(800, h, y);
            const box = src.createInstance('block');
            box.instancedBuffers.color = this.color4(hues[i % hues.length]);
            box.parent = node;
            const sx = 380 / bw, sy = (110 + i * 6) / bh, sz = 150 / bd;
            box.scaling.set(sx, sy, sz);
            box.position.y = -bb.minimum.y * sy;
            const v = step * (i + 1);
            const label = this.makeNumberView(String(v), this.color4('#2b3170'), 64);
            label.root.parent = node;
            label.root.position.set(0, 22, 78);
            this.blocks.push({ v, y, node, box, label, broken: false, color: hues[i % hues.length] });
        }
    },

    niceStep(x) {
        const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, x))));
        const m = x / p;
        return Math.max(1, (m < 1.5 ? 1 : m < 3.5 ? 2.5 : m < 7.5 ? 5 : 10) * p);
    },

    // Декор по бокам: леденцы, острова, облака, шары — детерминированно от длины уровня.
    _buildDecor() {
        let seed = Math.round(this.startY * 7 + this.finishY * 13) % 2147483647 || 1;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        const q = typeof Quality !== 'undefined' && Quality.level != null ? Quality.level : 2;
        const keep = q <= 0 ? 0.35 : q === 1 ? 0.6 : 1;
        const yTop = this.finishY - (typeof SMASH_BLOCKS !== 'undefined' ? SMASH_BLOCKS : 15) * 210 - 1600;
        const yBot = this.startY + 2200;
        // Левитация: у каждого предмета свой ритм парения, покачивание и медленный поворот;
        // свечение — ореол у шара леденца, «антигравитационный» свет под островом и грибом.
        const FLOAT = {
            lollipop: { amp: 45, f: 0.55, sway: 0.05, spin: 0, glow: 'halo', gy: 490, gs: 2.7, col: '#a6f5d8' },
            lollipopB: { amp: 45, f: 0.6, sway: 0.05, spin: 0, glow: 'halo', gy: 470, gs: 2.3, col: '#9fe9ff' },
            island: { amp: 70, f: 0.32, sway: 0.03, spin: 0.05, glow: 'aura', gy: -30, gs: 7.5, col: '#9fdcff' },
            mushroom: { amp: 55, f: 0.45, sway: 0.06, spin: 0.12, glow: 'aura', gy: -15, gs: 3.4, col: '#ffb3e8' },
            balloons: { amp: 60, f: 0.7, sway: 0.09, spin: 0.15, glow: '', gy: 0, gs: 0, col: '' },
            cloud: { amp: 35, f: 0.25, sway: 0.02, spin: 0.02, glow: '', gy: 0, gs: 0, col: '' },
        };
        const place = (key, x, h, y, s, rot) => {
            const n = GameModels.spawn(key, this.root) || this._fallbackDecor(key);
            if (!n) return null;
            n.parent = this.root;
            n.position.set(x, h, y);
            n.scaling.set(s, s, s);
            n.rotation.y = rot;
            const fl = FLOAT[key] || FLOAT.cloud;
            const d = { node: n, key, bx: x, bh: h, ph: rnd() * 6.28, amp: fl.amp * (0.7 + rnd() * 0.6), f: fl.f * (0.8 + rnd() * 0.4),
                sway: fl.sway, spin: fl.spin * (rnd() < 0.5 ? -1 : 1), glow: null, gs: fl.gs };
            if (fl.glow && keep > 0.4) d.glow = this._decorGlow(fl.glow, n, fl.gy, fl.gs, fl.col);
            this.decor.push(d);
            return n;
        };
        this.decor = [];
        for (let y = yBot; y > yTop; y -= 380 + rnd() * 420) {
            if (rnd() > keep) continue;
            const side = rnd() < 0.5 ? -1 : 1;
            const r = rnd();
            if (r < 0.5) {
                const key = rnd() < 0.5 ? 'lollipop' : 'lollipopB';
                place(key, 800 + side * (760 + rnd() * 1100), -700 - rnd() * 700, y, 1.8 + rnd() * 1.0, rnd() * 6.28);
            } else if (r < 0.66) {
                place('island', 800 + side * (2700 + rnd() * 1500), -1000 - rnd() * 800, y, 1.4 + rnd() * 1.0, rnd() * 6.28);
            } else if (r < 0.82) {
                place('cloud', 800 + side * (1300 + rnd() * 2000), -800 - rnd() * 700, y, 2 + rnd() * 2.2, rnd() * 6.28);
            } else if (r < 0.92) {
                place('balloons', 800 + side * (800 + rnd() * 800), 0 + rnd() * 300, y, 1 + rnd() * 0.5, rnd() * 6.28);
            } else {
                place('mushroom', 800 + side * (1600 + rnd() * 1200), -900 - rnd() * 500, y, 2 + rnd(), rnd() * 6.28);
            }
        }
        // Нижний ярус облаков — под трассой и вокруг (видны в пропастях и по краям кадра).
        for (let y = yBot; y > yTop; y -= 700 + rnd() * 700) {
            if (rnd() > keep) continue;
            place('cloud', 800 + (rnd() - 0.5) * 5200, -1500 - rnd() * 900, y, 3.5 + rnd() * 3, rnd() * 6.28);
        }
        // Пузыри: полупрозрачные шары по бокам, медленно поднимаются.
        const bm = new BABYLON.StandardMaterial('bubble', this.scene);
        bm.diffuseColor = new BABYLON.Color3(0.85, 0.95, 1);
        bm.emissiveColor = new BABYLON.Color3(0.45, 0.6, 0.7);
        bm.alpha = 0.28;
        bm.specularColor = new BABYLON.Color3(1, 1, 1);
        bm.specularPower = 64;
        this.mats.bubble = bm;
        const bubbleSrc = BABYLON.MeshBuilder.CreateSphere('bubble', { diameter: 100, segments: 12 }, this.scene);
        bubbleSrc.material = bm;
        bubbleSrc.isVisible = false;
        bubbleSrc.parent = this.root;
        this.bubbles = [];
        // Волшебная пыль в воздухе: одна система частиц едет перед камерой, искорки мерцают и медленно всплывают.
        if (this.app && this.app.fx) {
            this.dust = this.app.fx.create({
                follow: () => new BABYLON.Vector3(800, 40, (this._py || this.startY) - 1300),
                box: [[-2300, -800, -1900], [2300, 700, 1900]], rate: Math.round(34 * keep), capacity: Math.round(160 * keep),
                life: [2.2, 4.2], size: [5, 13], speed: [6, 26], direction: [[-0.25, 0.4, -0.25], [0.25, 1, 0.25]],
                color: '#fff4c4', color2: '#c4f4ff', blend: 'additive', sizeGradient: [[0, 0], [0.25, 1], [0.7, 0.8], [1, 0]],
            });
        }
        const nb = Math.round(26 * keep);
        for (let i = 0; i < nb; i++) {
            const b = bubbleSrc.createInstance('bubble');
            b.parent = this.root;
            const side = i % 2 ? 1 : -1;
            const s = 0.4 + rnd() * 1.6;
            b.scaling.set(s, s, s);
            this.bubbles.push({ m: b, x: 800 + side * (420 + rnd() * 900), y: 0, h: -400 + rnd() * 900, sp: 30 + rnd() * 60, off: rnd() * 2400 });
        }
    },

    // Свечение декора: ореол (плоскость всегда к камере) или световой диск под предметом. Инстансы
    // общих источников по цвету; аддитивное смешивание, свет не нужен.
    /** @param {'halo' | 'aura'} kind @param {BABYLON.TransformNode} parent @param {number} gy @param {number} gs @param {string} col */
    _decorGlow(kind, parent, gy, gs, col) {
        const key = kind + col;
        this._glowSrc = this._glowSrc || {};
        let src = this._glowSrc[key];
        if (!src || src.isDisposed()) {
            if (!this._glowTex || !this._glowTex.getScene()) {
                const t = new BABYLON.DynamicTexture('decor-glow', { width: 128, height: 128 }, this.scene, true);
                const g = /** @type {CanvasRenderingContext2D} */ (/** @type {unknown} */ (t.getContext()));
                const gr = g.createRadialGradient(64, 64, 2, 64, 64, 63);
                gr.addColorStop(0, 'rgba(255,255,255,1)');
                gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
                gr.addColorStop(1, 'rgba(255,255,255,0)');
                g.clearRect(0, 0, 128, 128);
                g.fillStyle = gr;
                g.fillRect(0, 0, 128, 128);
                t.hasAlpha = true;
                t.update(true);
                this._glowTex = t;
            }
            const m = new BABYLON.StandardMaterial('decor-glow-' + key, this.scene);
            m.disableLighting = true;
            m.emissiveColor = BABYLON.Color3.FromHexString(col).scale(0.72);
            m.diffuseColor = new BABYLON.Color3(0, 0, 0);
            m.opacityTexture = this._glowTex;
            m.alphaMode = BABYLON.Engine.ALPHA_ADD;
            m.backFaceCulling = false;
            m.disableDepthWrite = true;
            m.fogEnabled = true;
            src = kind === 'halo'
                ? BABYLON.MeshBuilder.CreatePlane('glow-' + key, { size: 100 }, this.scene)
                : BABYLON.MeshBuilder.CreateGround('glow-' + key, { width: 100, height: 100 }, this.scene);
            src.material = m;
            src.isVisible = false;
            src.isPickable = false;
            src.renderingGroupId = World3D.LAYER.OVERLAY;
            src.parent = this.root;
            this._glowSrc[key] = src;
            this.mats['glow-' + key] = m;
        }
        const g = src.createInstance('glow');
        g.parent = parent;
        g.position.y = gy;
        g.scaling.set(gs, gs, gs);
        if (kind === 'halo') g.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        return g;
    },

    _fallbackDecor(key) {
        if (key !== 'lollipop' && key !== 'lollipopB') return null;
        const n = new BABYLON.TransformNode('lolli', this.scene);
        if (!this.mats.lolli) {
            const m = new BABYLON.StandardMaterial('lolli', this.scene);
            m.diffuseColor = BABYLON.Color3.FromHexString('#bff0dd');
            m.emissiveColor = BABYLON.Color3.FromHexString('#3c6e62');
            m.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
            this.mats.lolli = m;
        }
        const ball = BABYLON.MeshBuilder.CreateSphere('lolli-ball', { diameter: 160, segments: 14 }, this.scene);
        ball.parent = n; ball.position.y = 450; ball.material = this.mats.lolli;
        const stick = BABYLON.MeshBuilder.CreateCylinder('lolli-stick', { diameter: 14, height: 450, tessellation: 8 }, this.scene);
        stick.parent = n; stick.position.y = 225; stick.material = this.mats.lolli;
        return n;
    },

    // Небо: купол с градиентом (глубокий голубой сверху, светлая дымка у горизонта) и солнце.
    // Небо — фоновый слой во весь экран (за всей сценой): насыщенный голубой сверху, светлая
    // дымка к низу, мягкое солнце в углу. Туман сцены — цвет дымки: дальние объекты тают в ней.
    _buildSky() {
        const th = this.theme || {};
        const scene = this.scene;
        if (this.sky) { this.sky.dispose(); this.sky = null; }
        const W = 256, H = 512;
        const t = new BABYLON.DynamicTexture('sky-grad', { width: W, height: H }, scene, false);
        const g = /** @type {CanvasRenderingContext2D} */ (/** @type {unknown} */ (t.getContext()));
        const grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, th.skyTop || '#2fb3f3');
        grad.addColorStop(0.45, th.skyMid || '#7ad0f6');
        grad.addColorStop(1, th.skyHorizon || '#cdeefc');
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
        const sun = g.createRadialGradient(18, 10, 4, 18, 10, 190);
        sun.addColorStop(0, 'rgba(255,255,240,0.95)');
        sun.addColorStop(0.25, 'rgba(255,255,235,0.45)');
        sun.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sun;
        g.fillRect(0, 0, W, H);
        t.update(false);
        const layer = new BABYLON.Layer('sky', null, scene, true);
        layer.texture = t;
        this.sky = layer;
        const hz = BABYLON.Color3.FromHexString(th.skyHorizon || '#cdeefc');
        const hex = (Math.round(hz.r * 255) << 16) | (Math.round(hz.g * 255) << 8) | Math.round(hz.b * 255);
        World3D.setLighting({ sky: hex, fog: th.fog || 0.0002 });
    },

    // --- Запросы логики -------------------------------------------------------------------------

    /** Сегмент под точкой (без учёта дыр). */
    segAt(x, y) {
        let best = null;
        for (const s of this.segs) if (x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1) { if (!best || s.h > best.h) best = s; }
        return best;
    },

    /** Сегмент по y (для зажима x): самый широкий, накрывающий y. */
    segAtY(y, h) {
        let best = null;
        for (const s of this.segs) {
            if (y < s.y0 || y > s.y1) continue;
            if (h != null && Math.abs(s.h - h) > 60) continue;
            if (!best || (s.x1 - s.x0) > (best.x1 - best.x0)) best = s;
        }
        return best;
    },

    inHole(x, y) {
        for (const o of this.holes) if (x > o.x0 && x < o.x1 && y > o.y0 && y < o.y1) return true;
        return false;
    },

    /** Опора под точкой: сегмент или null (дыра, пропасть). */
    groundAt(x, y) {
        const s = this.segAt(x, y);
        if (!s || this.inHole(x, y)) return null;
        return s;
    },

    // --- Кадр ---------------------------------------------------------------------------------

    /** @param {number} dt @param {any} player */
    update(dt, player) {
        this.time += dt;
        const t = this.time;
        const V = player ? player.value : 1;
        const blue = this.color4(this.COLORS.blue), red = this.color4(this.COLORS.red);
        const py = player ? player.y : this.startY;
        for (const e of this.ents) {
            if (e.y > py + 1200 || e.y < py - 5200) continue;
            if (e.type === 'num') {
                if (e.state === 'idle') {
                    const isRed = e.v > V;
                    if (isRed !== e.red) {
                        e.red = isRed;
                        for (const i of e.view.insts) i.instancedBuffers.color = (isRed ? red : blue).clone();
                        e.pop = 0.25;
                    }
                    if (e.amp) e.x = e.baseX + Math.sin(t * Math.PI * 2 / 2.4 + e.phase) * e.amp;
                    const near = Math.abs(e.y - py) < 600;
                    const breathe = Math.sin(t * 3.2 + e.phase) * 0.035;
                    let sy = 1 + breathe, sx = 1 - breathe * 0.6, rz = 0;
                    if (e.pop > 0) { e.pop = Math.max(0, e.pop - dt); const k = Math.sin(e.pop / 0.25 * Math.PI) * 0.18; sy += k; sx -= k * 0.5; }
                    if (near && e.red) rz = Math.sin(t * 22 + e.phase) * 0.03;           // красные «дрожат от нетерпения»
                    else if (near) sy += Math.sin(t * 9 + e.phase) * 0.03;              // синие подпрыгивают в ожидании
                    const hgt = e.height;
                    e.view.root.scaling.set(hgt * sx, hgt * sy, hgt * sx);
                    e.view.root.rotation.z = rz;
                    e.view.root.position.x = e.x;
                    if (e.blob) e.blob.position.x = e.x;
                } else if (e.state === 'eaten') {
                    e.t += dt;
                    const k = Math.min(1, e.t / 0.22);
                    if (player) {
                        e.view.root.position.x += (player.x - e.view.root.position.x) * Math.min(1, dt * 18);
                        e.view.root.position.z += (player.y - e.view.root.position.z) * Math.min(1, dt * 18);
                        e.view.root.position.y = e.h + Math.sin(k * Math.PI) * 40;
                    }
                    const s = e.height * (1 - k);
                    e.view.root.scaling.set(s * (1 + k * 0.6), s, s);
                    if (k >= 1) this._hide(e);
                }
            } else if (e.type === 'coin') {
                if (e.state === 'idle') { e.node.rotation.y = t * 3 + e.phase; e.node.position.y = e.h + 45 + Math.sin(t * 4 + e.phase) * 8; }
                else if (e.state === 'taken') {
                    e.t += dt;
                    e.node.position.y += dt * 700;
                    e.node.rotation.y += dt * 20;
                    const s = Math.max(0, 1 - e.t * 3);
                    e.node.scaling.set(s, s, s);
                    if (e.t > 0.4) this._hide(e);
                }
            } else if (e.type === 'spike') {
                if (e.state === 'idle') e.node.rotation.y = t * 0.8 + e.phase;
            } else if (e.type === 'sub' || e.type === 'mul' || e.type === 'div') {
                if (e.state === 'hit') {
                    e.t += dt;
                    const k = Math.max(0, 1 - e.t / 0.45);
                    const wob = Math.sin(e.t * 30) * 0.12 * k;
                    e.node.scaling.set(1 + wob, 1 - wob, 1 + wob);
                    if (e.t > 0.45) { e.state = 'done'; e.node.scaling.set(1, 1, 1); }
                } else if (e.state === 'idle' && e.label) {
                    e.label.root.position.y = (e.type === 'sub' ? 14 : 58) + Math.sin(t * 2.6 + e.x) * 3;
                }
            }
        }
        for (const s of this.spins) {
            s.angle += s.dir * dt * Math.PI * 2 * (40 / 60);
            if (s.bar) s.bar.rotation.y = -s.angle;
            if (s.cool > 0) s.cool -= dt;
        }
        for (const p of this.pads) {
            p.t += dt;
            const k = (p.t % 1.1) / 1.1;
            const s = 0.75 + k * 0.45;
            p.ring.scaling.set(s, 1, s * 0.66);
            p.ring.visibility = 1 - k;
        }
        // Левитация декора (только рядом с игроком — дальний всё равно в дымке).
        for (const d of this.decor) {
            if (d.node.position.z > py + 3500 || d.node.position.z < py - 9000) continue;
            const k = t * d.f + d.ph;
            d.node.position.y = d.bh + Math.sin(k) * d.amp;
            d.node.rotation.z = Math.sin(k * 0.7 + 1.3) * d.sway;
            d.node.rotation.x = Math.cos(k * 0.6) * d.sway * 0.7;
            if (d.spin) d.node.rotation.y += d.spin * dt;
            if (d.glow) {
                const p = d.gs * (1 + 0.14 * Math.sin(k * 2.3));
                d.glow.scaling.set(p, p, p);
            }
        }
        this._py = py;
        if (this.bubbles) {
            for (const b of this.bubbles) {
                const span = 2600;
                const off = ((t * b.sp + b.off) % span);
                b.m.position.set(b.x + Math.sin(t * 0.7 + b.off) * 40, b.h + off * 0.35, py - 1800 + ((b.off * 3) % span) - off * 0.2);
            }
        }
        for (const b of this.blocks) {
            if (b.broken) continue;
            b.label.root.position.y = 22 + Math.sin(t * 3 + b.y) * 2;
        }
        if (this.chunks.length) this._updateChunks(dt);
    },

    // Осколки разбитого блока: кубики цвета блока разлетаются вперёд и вбок, кувыркаются, гаснут.
    /** @param {any} b */
    spawnChunks(b) {
        const src = this._tintedSource('blockChunk', () => BABYLON.MeshBuilder.CreateBox('chunkbox', { size: 25 }, this.scene));
        const col = this.color4(b.color);
        const n = (typeof Quality !== 'undefined' && Quality.level === 0) ? 6 : 12;
        for (let i = 0; i < n; i++) {
            const m = src.createInstance('chunk');
            m.instancedBuffers.color = col.clone();
            m.parent = this.root;
            const s = 0.8 + Math.random() * 1.1;
            m.scaling.set(s, s, s);
            m.position.set(800 + (Math.random() - 0.5) * 300, b.node.position.y + 30 + Math.random() * 90, b.y + (Math.random() - 0.5) * 60);
            this.chunks.push({ m, vx: (Math.random() - 0.5) * 900, vy: 300 + Math.random() * 600, vz: -200 - Math.random() * 500,
                rx: (Math.random() - 0.5) * 14, rz: (Math.random() - 0.5) * 14, t: 0, s });
        }
    },

    _updateChunks(dt) {
        for (let i = this.chunks.length - 1; i >= 0; i--) {
            const c = this.chunks[i];
            c.t += dt;
            c.vy -= 2000 * dt;
            c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.position.z += c.vz * dt;
            c.m.rotation.x += c.rx * dt; c.m.rotation.z += c.rz * dt;
            const k = Math.max(0, 1 - Math.max(0, c.t - 0.7) / 0.5);
            c.m.scaling.set(c.s * k, c.s * k, c.s * k);
            if (c.t > 1.2) { c.m.dispose(); this.chunks.splice(i, 1); }
        }
    },

    _hide(e) {
        e.state = 'gone';
        if (e.view) e.view.root.setEnabled(false);
        if (e.node) e.node.setEnabled(false);
        if (e.blob) e.blob.setEnabled(false);
    },

    dispose() {
        if (this.root) this.root.dispose(false, false);
        this.root = null;
        if (this.sky) { this.sky.dispose(); this.sky = null; }
        if (this.dust) { this.dust.dispose(); this.dust = null; }
        this.ents = []; this.pads = []; this.poles = []; this.spins = []; this.blocks = []; this.decor = []; this.bubbles = []; this.chunks = [];
        this.segs = []; this.holes = [];
        this.track = null;
    },
};
