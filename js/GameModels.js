// GameModels.js — шаблоны моделей игры (реквизит трассы, декор) и их инстансы.
//
// Шаблон строится один раз на сцену (сцена живёт между уровнями: Location3D меняет карту, вид
// остаётся), его меши невидимы; spawn() даёт иерархию инстансов — дёшево для десятков монет,
// шипов и блоков. Пути — литералами (сборщик берёт в архив только такие ссылки).
// Нет файла — spawn() отдаёт null, вызывающий ставит запасную форму.

/** @satisfies {Record<string, any>} */
const GameModels = {
    URLS: {
        jumpPad: 'assets/models/props/jump_pad.glb',
        finishGate: 'assets/models/props/finish_gate.glb',
        spinner: 'assets/models/props/spinner.glb',
        pole: 'assets/models/props/pole.glb',
        coin: 'assets/models/props/coin.glb',
        gateFrame: 'assets/models/props/gate_frame.glb',
        smashBlock: 'assets/models/props/smash_block.glb',
        blockChunk: 'assets/models/props/block_chunk.glb',
        spike: 'assets/models/props/spike_ball.glb',
        island: 'assets/models/decor/island.glb',
        lollipop: 'assets/models/decor/lollipop_tree.glb',
        lollipopB: 'assets/models/decor/lollipop_tree_b.glb',
        balloons: 'assets/models/decor/balloon_cluster.glb',
        cloud: 'assets/models/decor/cloud_puff.glb',
        mushroom: 'assets/models/decor/candy_mushroom.glb',
    },
    /** @type {Record<string, BABYLON.Mesh | null>} */
    templates: {},
    /** @type {Map<string, Promise<BABYLON.Mesh | null>>} */
    _loading: new Map(),
    /** @type {BABYLON.Scene | null} */
    scene: null,
    /** @type {any} */
    view: null,

    /** @param {any} view */
    bind(view) {
        if (this.view === view) return;
        this.view = view;
        this.scene = view.scene;
        this.templates = {};
        this._loading = new Map();
    },

    /** @param {string} url @param {string} name */
    async template(url, name) {
        const key = url;
        if (key in this.templates) return this.templates[key];
        if (!this._loading.has(key)) {
            this._loading.set(key, (async () => {
                let root = null;
                try {
                    const model = await Model3D.load(url);
                    root = Model3D.build(model, this.scene, { name: 'tpl-' + name });
                    World3D.addObject(this.view, root, 'prop', { castShadow: false, ink: false, outline: false });
                    root.position.set(0, -100000, 0);
                    for (const m of root.getChildMeshes(false)) {
                        m.isVisible = false; m.isPickable = false;
                        // Светящиеся материалы косметики (в Blender — emission; glTF-разборщик берёт только цвет):
                        // нимб, шарики антенн, полосы визора — светятся своим цветом.
                        const mat = /** @type {any} */ (m.material);
                        for (const sm of mat ? (mat.subMaterials || [mat]) : []) {
                            if (sm && /halo_gold|alien_glow|visor_cyan|visor_line|visor_pink/.test(sm.name)) sm.emissiveColor = sm.diffuseColor.scale(0.85);
                        }
                    }
                } catch (e) {
                    console.warn('Модель не загрузилась: ' + url, e);
                    root = null;
                }
                this.templates[key] = root;
                return root;
            })());
        }
        return this._loading.get(key);
    },

    // Предзагрузка набора ключей URLS (под экраном загрузки).
    /** @param {string[]} [keys] */
    async preload(keys) {
        const list = keys || Object.keys(this.URLS);
        await Promise.all(list.map(k => this.template(this.URLS[k], k)));
    },

    /** @param {string} key */
    has(key) { return !!this.templates[this.URLS[key]]; },

    // Иерархия инстансов шаблона: корень TransformNode, части — InstancedMesh с metadata.part.
    /** @param {string} key @param {BABYLON.Node} [parent] @returns {BABYLON.TransformNode | null} */
    spawn(key, parent) {
        const tpl = this.templates[this.URLS[key]];
        if (!tpl) return null;
        const root = new BABYLON.TransformNode('m-' + key, this.scene);
        for (const child of tpl.getChildMeshes(true)) {
            const src = /** @type {BABYLON.Mesh} */ (child);
            if (!src.getTotalVertices || !src.getTotalVertices()) continue;
            const inst = src.createInstance(src.name + '#');
            inst.parent = root;
            inst.isPickable = false;
            inst.metadata = { part: src.metadata && src.metadata.part, pivot: src.metadata && src.metadata.pivot };
        }
        if (parent) root.parent = parent;
        return root;
    },

    // То же по адресу модели (косметика: шапки и лица грузятся по мере надобности).
    /** @param {string} url @param {BABYLON.Node} [parent] @returns {Promise<BABYLON.TransformNode | null>} */
    async spawnUrl(url, parent) {
        const tpl = await this.template(url, url.replace(/^.*\//, '').replace(/\.glb$/, ''));
        if (!tpl) return null;
        const root = new BABYLON.TransformNode('m-' + url, this.scene);
        for (const child of tpl.getChildMeshes(true)) {
            const src = /** @type {BABYLON.Mesh} */ (child);
            if (!src.getTotalVertices || !src.getTotalVertices()) continue;
            const inst = src.createInstance(src.name + '#');
            inst.parent = root;
            inst.isPickable = false;
        }
        if (parent) root.parent = parent;
        return root;
    },

    // Часть инстанса по имени части из Blender (spinner: 'bar').
    /** @param {BABYLON.TransformNode} root @param {string} part */
    part(root, part) {
        for (const m of root.getChildMeshes(true)) if (m.metadata && m.metadata.part === part) return m;
        return null;
    },
};
