// GameGlyphs.js — 3D-цифры игры из assets/models/glyphs.glb (Blender, шрифт Titan One).
//
// Каждая цифра приводится к единичной высоте: низ y = 0, центр по x и z — 0, высота «0» = 1.
// Числа на трассе — инстансы исходных мешей (цвет — instancedBuffers.color), число игрока —
// клоны со своими материалами (желе, скины). Нет модели — цифры из скруглённых коробок
// (игра не падает, но так быть не должно).

/** @satisfies {Record<string, any>} */
const GameGlyphs = {
    KEYS: ['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'gplus', 'gminus', 'gmul', 'gdiv'],
    CHAR: { '0': 'g0', '1': 'g1', '2': 'g2', '3': 'g3', '4': 'g4', '5': 'g5', '6': 'g6', '7': 'g7', '8': 'g8', '9': 'g9',
        '+': 'gplus', '-': 'gminus', '×': 'gmul', '÷': 'gdiv' },
    SPACING: 0.08,           // доля высоты между соседними знаками (цифры не слипаются)
    DEPTH: 0.4,              // глубина цифры (доля высоты) — для лица на передней грани
    /** @type {Record<string, { mesh: BABYLON.Mesh, width: number }>} */
    src: {},
    /** @type {BABYLON.StandardMaterial | null} */
    trackMat: null,
    /** @type {BABYLON.Scene | null} */
    scene: null,
    ready: false,

    /** @param {BABYLON.Scene} scene */
    async init(scene) {
        if (this.scene === scene && this.ready) return;
        this.scene = scene;
        this.src = {};
        const mat = new BABYLON.StandardMaterial('glyph-track', scene);
        mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        mat.specularColor = new BABYLON.Color3(0.85, 0.85, 0.85);
        mat.specularPower = 26;
        mat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.22);
        this.trackMat = mat;
        let model = null;
        try { model = await Model3D.load('assets/models/glyphs.glb'); } catch (e) { console.warn('glyphs.glb:', e); }
        let root = null;
        if (model) root = Model3D.build(model, scene, { name: 'glyphs' });
        const parts = root ? root.getChildMeshes(true) : [];
        // Высота «0» — эталон масштаба для всех знаков.
        let unit = 0;
        for (const m of parts) {
            if (m.metadata && m.metadata.part === 'g0') {
                const bb = m.getBoundingInfo().boundingBox;
                unit = bb.maximum.y - bb.minimum.y;
            }
        }
        for (const key of this.KEYS) {
            let mesh = null;
            const part = parts.find(m => m.metadata && m.metadata.part === key);
            if (part && unit > 0) {
                mesh = /** @type {BABYLON.Mesh} */ (part);
                mesh.parent = null;
                const bb = mesh.getBoundingInfo().boundingBox;
                const cx = (bb.minimum.x + bb.maximum.x) / 2, cz = (bb.minimum.z + bb.maximum.z) / 2;
                const s = 1 / unit;
                // Цифры стоят на нуле; знаки + − × ÷ — по центру строки (середина на высоте 0.5).
                const ty = key.length > 2 ? 0.5 / s - (bb.minimum.y + bb.maximum.y) / 2 : -bb.minimum.y;
                mesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(-cx, ty, -cz).multiply(BABYLON.Matrix.Scaling(s, s, s)));
                if (mesh.material && mesh.material !== mat) mesh.material.dispose();
            } else {
                mesh = this._fallback(key, scene);
            }
            mesh.name = 'glyph-' + key;
            mesh.material = mat;
            mesh.isPickable = false;
            mesh.alwaysSelectAsActiveMesh = false;
            mesh.registerInstancedBuffer('color', 4);
            mesh.instancedBuffers.color = new BABYLON.Color4(1, 1, 1, 1);
            mesh.isVisible = false;
            mesh.refreshBoundingInfo();
            const bb = mesh.getBoundingInfo().boundingBox;
            this.src[key] = { mesh, width: Math.max(0.2, bb.maximum.x - bb.minimum.x) };
        }
        if (root) root.dispose(false, false);
        this.ready = true;
    },

    // Запасной знак: скруглённая коробка разной ширины (только если модель не загрузилась).
    _fallback(key, scene) {
        const w = key === 'g1' ? 0.42 : key.length > 2 ? 0.5 : 0.66;
        const h = key === 'gminus' ? 0.18 : key.length > 2 ? 0.5 : 1;
        const m = BABYLON.MeshBuilder.CreateBox('glyph-fallback-' + key, { width: w, height: h, depth: this.DEPTH }, scene);
        m.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, key.length > 2 ? 0.25 + h / 2 : h / 2, 0));
        return m;
    },

    /** Строка числа: '1250', '-20', '×2', '÷3'. @param {number} v */
    text(v) { return String(Math.round(v)); },

    // Раскладка строки: [{ key, x }] — x центра знака в долях высоты; width — общая ширина.
    /** @param {string} str */
    layout(str) {
        const out = [];
        let x = 0;
        for (const ch of String(str)) {
            const key = this.CHAR[ch];
            if (!key || !this.src[key]) continue;
            const w = this.src[key].width;
            if (out.length) x += this.SPACING;
            out.push({ key, x: x + w / 2, w });
            x += w;
        }
        for (const g of out) g.x -= x / 2;
        return { glyphs: out, width: x };
    },

    // Инстанс знака (для чисел на трассе). color — BABYLON.Color4.
    /** @param {string} key @param {BABYLON.Color4} color */
    instance(key, color) {
        const s = this.src[key];
        if (!s) return null;
        const inst = s.mesh.createInstance('n-' + key);
        inst.instancedBuffers.color = color.clone();
        inst.isPickable = false;
        return inst;
    },

    // Клон знака со своим материалом (число игрока): геометрия общая.
    /** @param {string} key @param {BABYLON.Material} material */
    clone(key, material) {
        const s = this.src[key];
        if (!s) return null;
        const m = new BABYLON.Mesh('p-' + key, this.scene, null, s.mesh, true);
        m.isVisible = true;
        m.material = material;
        m.isPickable = false;
        return m;
    },

    /** @param {string} key */
    width(key) { return this.src[key] ? this.src[key].width : 0.6; },
};
