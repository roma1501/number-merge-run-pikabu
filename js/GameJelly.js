// GameJelly.js — «желейные» числа: мягкий изгиб, сплющивание и дрожь в вершинном шейдере
// (плагин материала JellyPlugin) + пружины, которые им управляют (JellySpring).
//
// Цифра в своих координатах — высота 1 (низ y = 0, центр x = 0, z = 0): см. GameGlyphs.js.
// Плагин сдвигает вершины тем сильнее, чем выше точка: верх отстаёт при повороте (наклон
// bend), число сплющивается и раздаётся вширь (squash), по высоте бежит волна (wobble).
// Нормали не правятся: отклонения малы, а свет остаётся мягким.

/** @satisfies {Record<string, any>} */
const GameJelly = {
    /** @param {BABYLON.StandardMaterial} material @returns {JellyPlugin} */
    attach(material) {
        return new JellyPlugin(material);
    },
};

class JellyPlugin extends BABYLON.MaterialPluginBase {
    /** @param {BABYLON.Material} material */
    constructor(material) {
        super(material, 'Jelly', 320, { JELLY: false }, true, true);
        this.bendX = 0;      // смещение верха вбок (доля высоты цифры)
        this.bendZ = 0;      // смещение верха вперёд/назад
        this.squash = 0;     // >0 — вытянуто вверх, <0 — сплющено
        this.wobPhase = 0;   // фаза волны дрожи
        this.wobAmp = 0;     // амплитуда волны (доля высоты)
        this.wobFreq = 3;    // волн на высоту цифры
    }

    getClassName() { return 'JellyPlugin'; }

    prepareDefines(defines) { defines.JELLY = true; }

    getUniforms() {
        return {
            ubo: [
                { name: 'jellyA', size: 4, type: 'vec4' },
                { name: 'jellyB', size: 4, type: 'vec4' },
            ],
            vertex: '#ifdef JELLY\nuniform vec4 jellyA;\nuniform vec4 jellyB;\n#endif',
        };
    }

    bindForSubMesh(ubo) {
        ubo.updateFloat4('jellyA', this.bendX, this.bendZ, this.squash, 0);
        ubo.updateFloat4('jellyB', this.wobPhase, this.wobAmp, this.wobFreq, 0);
    }

    getCustomCode(shaderType) {
        if (shaderType !== 'vertex') return null;
        return {
            CUSTOM_VERTEX_UPDATE_POSITION: `
#ifdef JELLY
{
    float jh = clamp(positionUpdated.y, 0.0, 1.4);
    float jk = jh * jh;
    float js = max(0.35, 1.0 + jellyA.z);
    positionUpdated.y *= js;
    positionUpdated.x *= inversesqrt(js);
    positionUpdated.z *= inversesqrt(js);
    positionUpdated.x += jellyA.x * jk + jellyB.y * sin(jellyB.x + jh * jellyB.z) * jh;
    positionUpdated.z += jellyA.y * jk;
}
#endif
`,
        };
    }
}

// Пружина с затуханием: value тянется к target. kick(v) — толчок скорости (поедание, удар).
class JellySpring {
    /** @param {number} [stiff] @param {number} [damp] */
    constructor(stiff, damp) {
        this.value = 0;
        this.velocity = 0;
        this.target = 0;
        this.stiff = stiff || (typeof JELLY_STIFF !== 'undefined' ? JELLY_STIFF : 170);
        this.damp = damp || (typeof JELLY_DAMP !== 'undefined' ? JELLY_DAMP : 7.5);
    }

    /** @param {number} v */
    kick(v) { this.velocity += v; }

    /** @param {number} dt */
    update(dt) {
        // Полу-неявный Эйлер мелкими шагами: стабилен при любых dt кадра.
        let left = Math.min(0.1, Math.max(0, dt));
        while (left > 1e-6) {
            const h = Math.min(left, 1 / 120);
            const a = -this.stiff * (this.value - this.target) - this.damp * this.velocity;
            this.velocity += a * h;
            this.value += this.velocity * h;
            left -= h;
        }
        return this.value;
    }

    reset(value) { this.value = value || 0; this.velocity = 0; }
}
