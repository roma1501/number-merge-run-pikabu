// GameSfx.js — звуки игры по именам (пути литералами: сборщик берёт в архив только такие).
// Частые звуки — списком вариантов (Sound.play([...]) берёт случайный, не повторяя подряд).

/** @satisfies {Record<string, any>} */
const GameSfx = {
    musicOn: false,
    /** @type {any} */
    musicHandle: null,

    init() {
        Sound.preload && Sound.preload([
            'assets/sounds/pop-1.ogg', 'assets/sounds/pop-2.ogg', 'assets/sounds/pop-3.ogg',
            'assets/sounds/coin.ogg', 'assets/sounds/jump.ogg', 'assets/sounds/land.ogg',
            'assets/sounds/crunch-1.ogg', 'assets/sounds/crunch-2.ogg', 'assets/sounds/crunch-3.ogg',
            'assets/sounds/wall.wav', 'assets/sounds/gate-good.ogg', 'assets/sounds/gate-bad.ogg',
            'assets/sounds/spike.ogg', 'assets/sounds/lose.wav', 'assets/sounds/win.ogg', 'assets/sounds/click.ogg',
            'assets/sounds/upgrade.ogg', 'assets/sounds/reward.wav', 'assets/sounds/whoosh.ogg',
        ]);
    },

    /** @param {string} name @param {{ rate?: number, volume?: number }} [o] */
    play(name, o) {
        const opts = Object.assign({}, o || {});
        switch (name) {
            case 'pop': return Sound.play(['assets/sounds/pop-1.ogg', 'assets/sounds/pop-2.ogg', 'assets/sounds/pop-3.ogg'], opts);
            case 'crunch': return Sound.play(['assets/sounds/crunch-1.ogg', 'assets/sounds/crunch-2.ogg', 'assets/sounds/crunch-3.ogg'], opts);
            case 'coin': return Sound.play('assets/sounds/coin.ogg', Object.assign({ volume: 0.7 }, opts));
            case 'jump': return Sound.play('assets/sounds/jump.ogg', opts);
            case 'land': return Sound.play('assets/sounds/land.ogg', opts);
            case 'wall': return Sound.play('assets/sounds/wall.wav', Object.assign({ volume: 0.7 }, opts));
            case 'gate-good': return Sound.play('assets/sounds/gate-good.ogg', opts);
            case 'gate-bad': return Sound.play('assets/sounds/gate-bad.ogg', Object.assign({ volume: 0.7 }, opts));
            case 'spike': return Sound.play('assets/sounds/spike.ogg', opts);
            case 'lose': return Sound.play('assets/sounds/lose.wav', Object.assign({ volume: 0.8 }, opts));
            case 'win': return Sound.play('assets/sounds/win.ogg', opts);
            case 'click': return Sound.play('assets/sounds/click.ogg', Object.assign({ volume: 0.6 }, opts));
            case 'upgrade': return Sound.play('assets/sounds/upgrade.ogg', opts);
            case 'reward': return Sound.play('assets/sounds/reward.wav', Object.assign({ volume: 0.8 }, opts));
            case 'whoosh': return Sound.play('assets/sounds/whoosh.ogg', Object.assign({ volume: 0.6 }, opts));
            default: return null;
        }
    },

    /** @param {boolean} on */
    music(on) {
        this.musicOn = !!on;
        if (on) Sound.music('assets/sounds/music.ogg');
        else Sound.stopMusic();
    },
};
