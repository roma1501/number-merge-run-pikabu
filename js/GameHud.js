// GameHud.js — интерфейс Number Merge Run: «желейные» кнопки и плашки поверх 3D (DOM).
// Верх: уровень, полоса пути до финиша, монеты. Меню перед бегом: улучшения, подсказка «тяни»,
// кнопки магазина, подарка, колеса, рекордов, настроек. Окна: победа, проигрыш, настройки, рекорды.
// Все тексты — Lang (ключи nm.*). Реклама Playables: межстраничная по клику на кнопки интерфейса
// вне игрового процесса и не во время rewarded (GameHud.uiAd).

/** @satisfies {Record<string, any>} */
const GameHud = {
    /** @type {any} */
    game: null,
    /** @type {HTMLElement | null} */
    root: null,
    /** @type {Record<string, HTMLElement>} */
    el: {},
    modal: '',
    /** @type {(() => void) | null} */
    _cooldownOff: null,
    coinShown: 0,

    ICONS: {
        coin: '<img class="nm-ic" src="assets/ui/icons/coin.webp" alt="" draggable="false">',
        shop: '<img class="nm-ic" src="assets/ui/icons/shop.webp" alt="" draggable="false">',
        gift: '<img class="nm-ic" src="assets/ui/icons/gift.webp" alt="" draggable="false">',
        wheel: '<img class="nm-ic" src="assets/ui/icons/wheel.webp" alt="" draggable="false">',
        trophy: '<img class="nm-ic" src="assets/ui/icons/top.webp" alt="" draggable="false">',
        gear: '<img class="nm-ic" src="assets/ui/icons/settings.webp" alt="" draggable="false">',
        restart: '<img class="nm-ic" src="assets/ui/icons/rebirth.webp" alt="" draggable="false">',
        ad: '<img class="nm-ic" src="assets/ui/icons/ad.webp" alt="" draggable="false">',
        flag: '<svg viewBox="0 0 32 32"><path d="M8 4v25" stroke="#3a4a7a" stroke-width="3" stroke-linecap="round"/><path d="M9 5h17l-4 5 4 5H9z" fill="#fff" stroke="#3a4a7a" stroke-width="2"/><path d="M13 5v10M17 5v10M21 5v10M9 10h15" stroke="#3a4a7a" stroke-width="1.5"/></svg>',
        hand: '<img class="nm-ic" src="assets/ui/icons/hand.webp" alt="" draggable="false">',
        close: '<img class="nm-ic" src="assets/ui/icons/close.webp" alt="" draggable="false">',
        sound: '<img class="nm-ic" src="assets/ui/icons/sound.webp" alt="" draggable="false">',
    },

    /** @param {any} game */
    init(game) {
        this.game = game;
        this._css();
        const root = document.createElement('div');
        root.id = 'nm-hud';
        root.innerHTML = `
<div class="nm-top">
  <div class="nm-pill nm-level" id="nm-level"></div>
  <div class="nm-prog" id="nm-prog"><div class="nm-prog-bar"><div class="nm-prog-fill" id="nm-prog-fill"></div></div><div class="nm-prog-flag">${this.ICONS.flag}</div></div>
  <div class="nm-pill nm-coins" id="nm-coins"><i>${this.ICONS.coin}</i><b id="nm-coins-n">0</b></div>
</div>
<div class="nm-side nm-left" id="nm-left">
  <button class="nm-round nm-pink" data-act="shop" id="nm-btn-shop">${this.ICONS.shop}<span data-t="nm.shop"></span></button>
  <button class="nm-round nm-gold" data-act="gift" id="nm-btn-gift">${this.ICONS.gift}<span data-t="nm.gift"></span><em class="nm-dot" id="nm-dot-gift"></em></button>
  <button class="nm-round nm-violet" data-act="wheel" id="nm-btn-wheel">${this.ICONS.wheel}<span data-t="nm.wheel"></span><em class="nm-dot" id="nm-dot-wheel"></em></button>
</div>
<div class="nm-side nm-right" id="nm-right">
  <button class="nm-round nm-mint" data-act="records" id="nm-btn-records">${this.ICONS.trophy}<span data-t="nm.records"></span></button>
  <button class="nm-round nm-blue" data-act="settings" id="nm-btn-settings">${this.ICONS.gear}<span data-t="nm.settings"></span></button>
</div>
<button class="nm-round nm-blue nm-small nm-pause" data-act="pause" id="nm-btn-pause">${this.ICONS.gear}</button>
<div class="nm-start" id="nm-start">
  <div class="nm-swipe"><div class="nm-swipe-track"><span>◀</span><span>▶</span></div><div class="nm-hand">${this.ICONS.hand}</div></div>
  <div class="nm-start-text" data-t="nm.dragToRun"></div>
</div>
<div class="nm-upgrades" id="nm-upgrades">
  <div class="nm-up nm-up-start" id="nm-up-start"><div class="nm-up-t" data-t="nm.upStart"></div><div class="nm-up-v" id="nm-up-start-v"></div><button class="nm-btn nm-btn-up" id="nm-up-start-b" data-act="up-start"></button></div>
  <div class="nm-up nm-up-income" id="nm-up-income"><div class="nm-up-t" data-t="nm.upIncome"></div><div class="nm-up-v" id="nm-up-income-v"></div><button class="nm-btn nm-btn-up" id="nm-up-income-b" data-act="up-income"></button></div>
</div>
<div class="nm-floats" id="nm-floats"></div>
<div class="nm-combo" id="nm-combo"></div>
<div class="nm-modal" id="nm-modal"><div class="nm-card" id="nm-card"></div></div>
<div class="nm-curtain" id="nm-curtain"></div>`;
        document.body.appendChild(root);
        this.root = root;
        const fit = () => {
            const w = typeof ViewCap !== 'undefined' && ViewCap.width ? ViewCap.width() : window.innerWidth;
            const k = Math.max(0.68, Math.min(1.25, Math.min(w, window.innerHeight) / 520));
            root.style.setProperty('--k', k.toFixed(3));
        };
        fit();
        window.addEventListener('resize', fit);
        window.addEventListener('lory-viewcap', fit);
        for (const n of root.querySelectorAll('[id]')) this.el[n.id] = /** @type {HTMLElement} */ (n);
        if (typeof Lang !== 'undefined') Lang.apply();
        root.addEventListener('click', (e) => {
            const b = /** @type {HTMLElement} */ (e.target).closest('[data-act]');
            if (!b || (/** @type {HTMLButtonElement} */ (b)).disabled) return;
            this._act(b.getAttribute('data-act') || '', /** @type {HTMLElement} */ (b));
        });
        // Настройки и рекорды закрываются кликом мимо карточки (победа и проигрыш — нет: там нужно выбрать действие).
        this.el['nm-modal'].addEventListener('click', (e) => {
            if (e.target !== this.el['nm-modal']) return;
            if (this.modal === 'settings' || this.modal === 'records') { GameSfx.play('click'); this.closeModal(); }
        });
        root.addEventListener('pointerdown', (e) => {
            const b = /** @type {HTMLElement} */ (e.target).closest('button');
            if (b) { b.classList.remove('nm-jelly'); void b.offsetWidth; b.classList.add('nm-jelly'); }
        });
        this.coins(game.save.coins);
        this.coinShown = game.save.coins;
        if (Platform.onRewardedCooldown) this._cooldownOff = Platform.onRewardedCooldown(() => { this.refreshMenu(); this._refreshModalAds(); });
        window.addEventListener('lory-language', () => { Lang.apply(); this.refreshMenu(); });
        setInterval(() => this._dots(), 1000);
    },

    // --- Кнопки ----------------------------------------------------------------------------------

    // Playables: межстраничная реклама по клику на кнопку интерфейса — не в игре и не во время rewarded.
    uiAd() {
        const g = this.game;
        if (Platform.name !== 'playables' || !Platform.interstitialSupported()) return Promise.resolve(false);
        if (Platform.adActive || (g && (g.state === 'run' || g.state === 'finish'))) return Promise.resolve(false);
        return Platform.interstitial().catch(() => false);
    },

    /** @param {string} act @param {HTMLElement} btn */
    async _act(act, btn) {
        const g = this.game;
        GameSfx.play('click');
        const adFree = btn.hasAttribute('data-noad');
        if (!adFree && act !== 'next' && act !== 'retry') this.uiAd();
        switch (act) {
            case 'up-start': case 'up-income': {
                const kind = act === 'up-start' ? 'start' : 'income';
                const cost = kind === 'start' ? g.startCost() : g.incomeCost();
                if (g.save.coins >= cost) { g.upgrade(kind, false); this._pulse(btn); }
                else {
                    if (!Platform.rewardedReady || !Platform.rewardedReady()) return;
                    btn.setAttribute('disabled', '');
                    const ok = await Platform.rewarded('upgrade');
                    btn.removeAttribute('disabled');
                    if (ok) { g.upgrade(kind, true); this._pulse(btn); }
                    this.refreshMenu();
                }
                break;
            }
            case 'shop': if (typeof GameShop !== 'undefined') GameShop.open('shop'); break;
            case 'gift': if (typeof GameShop !== 'undefined') GameShop.open('gift'); break;
            case 'wheel': if (typeof GameShop !== 'undefined') GameShop.open('wheel'); break;
            case 'records': this.showRecords(); break;
            case 'settings': case 'pause': this.showSettings(); break;
            case 'close': this.closeModal(); break;
            case 'next': {
                btn.setAttribute('disabled', '');
                if (Platform.name === 'playables') { await this.uiAd(); Platform.ads.results = 0; }
                this.closeModal();
                await g.next();
                break;
            }
            case 'retry': {
                btn.setAttribute('disabled', '');
                if (Platform.name === 'playables') { await this.uiAd(); Platform.ads.results = 0; }
                this.closeModal();
                await g.retry();
                break;
            }
            case 'x2': {
                btn.setAttribute('disabled', '');
                const ok = await g.doubleReward();
                if (ok) { btn.classList.add('nm-done'); btn.innerHTML = `<b>${Lang.t('nm.doubled')}</b>`; this._setWinCoins(g.run.claimed * 2); }
                else btn.removeAttribute('disabled');
                break;
            }
            case 'revive': {
                btn.setAttribute('disabled', '');
                const ok = await g.revive();
                if (ok) this.closeModal(); else btn.removeAttribute('disabled');
                break;
            }
            case 'sound': Sound.toggleMuted(); this.showSettings(); break;
            case 'music': g.save.music = !(g.save.music !== false); g.persist(); GameSfx.music(g.save.music); this.showSettings(); break;
            case 'quality': {
                if (typeof Quality !== 'undefined' && Quality.set) { Quality.set(((Quality.level != null ? Quality.level : 2) + 1) % 3); }
                this.showSettings();
                break;
            }
            case 'howto': {
                this.closeModal();
                if (typeof Tutorial !== 'undefined') Tutorial.start({ replay: true });
                break;
            }
            case 'login': {
                if (Platform.canLogin && Platform.canLogin()) { const ok = await Platform.login(); if (ok) this.showRecords(); }
                break;
            }
            default: break;
        }
    },

    _pulse(el) { el.classList.remove('nm-pop'); void el.offsetWidth; el.classList.add('nm-pop'); },

    // --- Верхняя полоса ---------------------------------------------------------------------------

    /** @param {number} n */
    level(n) { this.el['nm-level'].textContent = Lang.t('nm.level', { n }); },

    /** @param {number} k */
    progress(k) { this.el['nm-prog-fill'].style.width = (Math.max(0, Math.min(1, k)) * 100).toFixed(1) + '%'; },

    /** @param {number} n @param {any} [from] */
    coins(n, from) {
        const el = this.el['nm-coins-n'];
        const start = this.coinShown, end = n;
        this.coinShown = n;
        if (from === undefined || Math.abs(end - start) < 2) { el.textContent = this.fmt(end); return; }
        const t0 = performance.now(), dur = 700;
        const step = () => {
            const k = Math.min(1, (performance.now() - t0) / dur);
            el.textContent = this.fmt(Math.round(start + (end - start) * (1 - Math.pow(1 - k, 3))));
            if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        this._pulse(this.el['nm-coins']);
    },

    /** @param {number} n */
    fmt(n) {
        n = Math.round(n);
        if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
        if (n >= 1e5) return Math.round(n / 1e3) + 'K';
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },

    // --- Состояния экрана -------------------------------------------------------------------------

    showMenu() {
        const r = this.root;
        if (!r) return;
        r.classList.add('nm-is-menu');
        r.classList.remove('nm-is-run');
        this.refreshMenu();
        this._dots();
    },

    showRun() {
        const r = this.root;
        if (!r) return;
        r.classList.remove('nm-is-menu');
        r.classList.add('nm-is-run');
        this.closeModal();
    },

    hideAll() {
        if (!this.root) return;
        this.root.classList.remove('nm-is-menu', 'nm-is-run');
        this.closeModal();
    },

    refreshMenu() {
        const g = this.game;
        if (!g || !g.save || !this.root) return;
        const set = (kind) => {
            const cost = kind === 'start' ? g.startCost() : g.incomeCost();
            const v = this.el[kind === 'start' ? 'nm-up-start-v' : 'nm-up-income-v'];
            const b = /** @type {HTMLButtonElement} */ (this.el[kind === 'start' ? 'nm-up-start-b' : 'nm-up-income-b']);
            v.innerHTML = kind === 'start'
                ? `<span>${g.startValue()}</span><i>➜</i><b>${g.startValue(g.save.upStart + 1)}</b>`
                : `<span>×${g.income().toFixed(1)}</span><i>➜</i><b>×${g.income(g.save.upIncome + 1).toFixed(1)}</b>`;
            if (g.save.coins >= cost) {
                b.className = 'nm-btn nm-btn-up nm-coinbtn';
                b.removeAttribute('data-noad');
                b.disabled = false;
                b.innerHTML = `<i>${this.ICONS.coin}</i><b>${this.fmt(cost)}</b>`;
            } else if (Platform.rewardedSupported()) {
                const wait = Platform.rewardedCooldownLeft ? Platform.rewardedCooldownLeft() : 0;
                b.className = 'nm-btn nm-btn-up nm-adbtn';
                b.setAttribute('data-noad', '');
                b.disabled = wait > 0;
                b.innerHTML = wait > 0 ? `<b>${Platform.rewardedCooldownLabel()}</b>` : `<i>${this.ICONS.ad}</i><b>${Lang.t('nm.forAd')}</b>`;
            } else {
                b.className = 'nm-btn nm-btn-up nm-coinbtn nm-poor';
                b.disabled = true;
                b.innerHTML = `<i>${this.ICONS.coin}</i><b>${this.fmt(cost)}</b>`;
            }
        };
        set('start');
        set('income');
        const hasShop = typeof GameShop !== 'undefined';
        for (const id of ['nm-btn-shop', 'nm-btn-gift', 'nm-btn-wheel']) this.el[id].style.display = hasShop ? '' : 'none';
        this.el['nm-btn-records'].style.display = this._recordsAvailable === false ? 'none' : '';
    },

    _dots() {
        if (typeof GameShop === 'undefined' || !GameShop.badges) return;
        const b = GameShop.badges();
        this.el['nm-dot-gift'].classList.toggle('nm-on', !!b.gift);
        this.el['nm-dot-wheel'].classList.toggle('nm-on', !!b.wheel);
    },

    // Монеты летят от элемента к счётчику монет (награда за уровень, x2).
    /** @param {string} fromId */
    coinBurst(fromId) {
        const from = document.getElementById(fromId), to = this.el['nm-coins'];
        if (!from || !to || !this.root) return;
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        const n = 10;
        for (let i = 0; i < n; i++) {
            const c = document.createElement('i');
            c.className = 'nm-flycoin';
            c.innerHTML = this.ICONS.coin;
            const sx = a.left + a.width / 2 + (Math.random() - 0.5) * 60, sy = a.top + a.height / 2 + (Math.random() - 0.5) * 30;
            const ex = b.left + 18, ey = b.top + b.height / 2;
            c.style.left = sx + 'px'; c.style.top = sy + 'px';
            this.root.appendChild(c);
            const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 160, my = Math.min(sy, ey) - 60 - Math.random() * 80;
            const anim = c.animate([
                { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
                { transform: 'translate(calc(-50% + ' + (mx - sx) + 'px), calc(-50% + ' + (my - sy) + 'px)) scale(1.1)', opacity: 1, offset: 0.45 },
                { transform: 'translate(calc(-50% + ' + (ex - sx) + 'px), calc(-50% + ' + (ey - sy) + 'px)) scale(.6)', opacity: 1 },
            ], { duration: 650 + i * 45, easing: 'cubic-bezier(.4,0,.6,1)', delay: i * 35 });
            anim.onfinish = () => { c.remove(); if (i === n - 1) this._pulse(to); };
        }
    },

    // --- Всплывающие числа ---------------------------------------------------------------------

    /** @param {string} text @param {string} kind @param {BABYLON.Vector3} at */
    floatText(text, kind, at) {
        const g = this.game;
        if (!g || !g.app || !this.root) return;
        const p = g.app.location.view.projectToScreen(at.x, at.z, at.y);
        if (!p || !p.visible) return;
        const d = document.createElement('div');
        d.className = 'nm-float nm-f-' + kind;
        d.textContent = text;
        d.style.left = p.x + 'px';
        d.style.top = p.y + 'px';
        this.el['nm-floats'].appendChild(d);
        setTimeout(() => d.remove(), 900);
    },

    /** @param {number} n */
    combo(n) {
        const el = this.el['nm-combo'];
        el.textContent = Lang.t('nm.combo', { n });
        el.classList.remove('nm-show'); void el.offsetWidth; el.classList.add('nm-show');
    },

    // --- Окна -------------------------------------------------------------------------------------

    modalOpen() { return !!this.modal || (typeof GameShop !== 'undefined' && GameShop.isOpen && GameShop.isOpen()); },

    /** @param {string} name @param {string} html @param {string} [cls] */
    openModal(name, html, cls) {
        this.modal = name;
        const card = this.el['nm-card'];
        card.className = 'nm-card ' + (cls || '');
        card.innerHTML = html;
        Lang.apply();
        this.el['nm-modal'].classList.add('nm-open');
    },

    closeModal() {
        const wasPause = this.modal === 'settings' && Pause.has && Pause.has('manual');
        this.modal = '';
        this.el['nm-modal'].classList.remove('nm-open');
        if (wasPause) Pause.set('manual', false);
    },

    /** @param {number} value @param {number} reward @param {number} blocks */
    showWin(value, reward, blocks) {
        const canAd = Platform.rewardedSupported();
        const wait = Platform.rewardedCooldownLeft ? Platform.rewardedCooldownLeft() : 0;
        this.openModal('win', `
<div class="nm-ribbon nm-ribbon-win" data-t="nm.great"></div>
<div class="nm-burst"></div>
<div class="nm-big nm-big-blue">${this.fmt(value)}</div>
<div class="nm-sub">${Lang.t('nm.blocks', { n: blocks })}</div>
<div class="nm-reward"><i>${this.ICONS.coin}</i><b id="nm-win-coins">+${this.fmt(reward)}</b></div>
${canAd ? `<button class="nm-btn nm-green nm-wide" data-act="x2" data-noad id="nm-x2" ${wait > 0 ? 'disabled' : ''}><i>${this.ICONS.ad}</i><b>${wait > 0 ? Platform.rewardedCooldownLabel() : Lang.t('nm.x2')}</b><small>${Lang.t('nm.x2sub', { n: this.fmt(reward * 2) })}</small></button>` : ''}
<button class="nm-btn nm-blue nm-wide" data-act="next"><b data-t="nm.next"></b></button>`, 'nm-card-win');
    },

    _setWinCoins(n) { const e = document.getElementById('nm-win-coins'); if (e) { e.textContent = '+' + this.fmt(n); this._pulse(e); } },

    /** @param {string} reason @param {number} value @param {boolean} canRevive */
    showLose(reason, value, canRevive) {
        const wait = Platform.rewardedCooldownLeft ? Platform.rewardedCooldownLeft() : 0;
        this.openModal('lose', `
<div class="nm-ribbon nm-ribbon-lose" data-t="nm.lost"></div>
<div class="nm-sub nm-reason">${Lang.t('nm.why.' + reason)}</div>
<div class="nm-big nm-big-red">${this.fmt(Math.max(0, value))}</div>
${canRevive ? `<button class="nm-btn nm-green nm-wide" data-act="revive" data-noad id="nm-revive" ${wait > 0 ? 'disabled' : ''}><i>${this.ICONS.ad}</i><b>${wait > 0 ? Platform.rewardedCooldownLabel() : Lang.t('nm.revive')}</b><small data-t="nm.reviveSub"></small></button>` : ''}
<button class="nm-btn nm-blue nm-wide" data-act="retry"><i>${this.ICONS.restart}</i><b data-t="nm.retry"></b></button>`, 'nm-card-lose');
    },

    _refreshModalAds() {
        const wait = Platform.rewardedCooldownLeft ? Platform.rewardedCooldownLeft() : 0;
        const upd = (id, key) => {
            const b = /** @type {HTMLButtonElement | null} */ (document.getElementById(id));
            if (!b || b.classList.contains('nm-done')) return;
            const label = b.querySelector('b');
            b.disabled = wait > 0;
            if (label) label.textContent = wait > 0 ? Platform.rewardedCooldownLabel() : Lang.t(key);
        };
        upd('nm-x2', 'nm.x2');
        upd('nm-revive', 'nm.revive');
    },

    showSettings() {
        const g = this.game;
        if (g.state === 'run' || g.state === 'finish') Pause.set('manual', true);
        const q = typeof Quality !== 'undefined' && Quality.level != null ? Quality.level : 2;
        const muted = Sound.muted;
        this.openModal('settings', `
<div class="nm-ribbon" data-t="nm.settings"></div>
<button class="nm-x" data-act="close">${this.ICONS.close}</button>
<div class="nm-rows">
  <button class="nm-row" data-act="sound"><span data-t="nm.sound"></span><b class="${muted ? 'nm-off' : 'nm-on'}">${Lang.t(muted ? 'nm.off' : 'nm.on')}</b></button>
  <button class="nm-row" data-act="music"><span data-t="nm.music"></span><b class="${g.save.music !== false ? 'nm-on' : 'nm-off'}">${Lang.t(g.save.music !== false ? 'nm.on' : 'nm.off')}</b></button>
  <button class="nm-row" data-act="quality"><span data-t="nm.quality"></span><b class="nm-on">${Lang.t('nm.q' + q)}</b></button>
  <button class="nm-row" data-act="howto"><span data-t="nm.howto"></span><b class="nm-on">?</b></button>
</div>
<button class="nm-btn nm-blue nm-wide" data-act="close"><b data-t="nm.continue"></b></button>`, 'nm-card-settings');
    },

    _recordsAvailable: /** @type {boolean | null} */ (null),

    async showRecords() {
        this.openModal('records', `<div class="nm-ribbon" data-t="nm.records"></div><button class="nm-x" data-act="close">${this.ICONS.close}</button><div class="nm-lb" id="nm-lb"><div class="nm-lb-empty" data-t="nm.loading"></div></div>`, 'nm-card-records');
        let rows = null;
        try { rows = await Platform.leaderboard({ avatarSize: 'small' }); } catch (e) { rows = null; }
        const box = document.getElementById('nm-lb');
        if (!box || this.modal !== 'records') return;
        const login = Platform.canLogin && Platform.canLogin() && !(Platform.authorized && Platform.authorized());
        const myLevel = this.game.save.level;
        if (!rows || !rows.length) {
            box.innerHTML = `<div class="nm-lb-empty">${Lang.t(rows ? 'nm.lbEmpty' : 'nm.lbLocal', { n: myLevel })}</div>` + (login ? `<button class="nm-btn nm-blue nm-wide" data-act="login" data-noad><b>${Lang.t('nm.login')}</b></button>` : '');
            return;
        }
        const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        box.innerHTML = rows.slice(0, 20).map(r => `<div class="nm-lb-row ${r.me ? 'nm-me' : ''}"><b>${r.rank}</b>${r.avatar ? `<img src="${esc(r.avatar)}" alt="">` : '<i></i>'}<span>${esc(r.name) || Lang.t('nm.anon')}</span><em>${Lang.t('nm.levelShort', { n: r.score })}</em></div>`).join('')
            + (login ? `<button class="nm-btn nm-blue nm-wide" data-act="login" data-noad><b>${Lang.t('nm.login')}</b></button>` : '');
    },

    // Шторка при перезапуске уровня: белая вспышка, пересборка, растворение.
    /** @param {() => Promise<void>} fn */
    async curtain(fn) {
        const c = this.el['nm-curtain'];
        c.classList.add('nm-on');
        await new Promise(r => setTimeout(r, 220));
        try { await fn(); } finally {
            setTimeout(() => c.classList.remove('nm-on'), 60);
        }
    },

    // --- Стили -------------------------------------------------------------------------------------

    _css() {
        if (document.getElementById('nm-css')) return;
        const s = document.createElement('style');
        s.id = 'nm-css';
        s.textContent = GAME_HUD_CSS;
        document.head.appendChild(s);
    },
};

const GAME_HUD_CSS = `
#nm-hud{position:fixed;inset:0;pointer-events:none;z-index:20;font-family:'NM Nunito',system-ui,sans-serif;color:#1f2d5c;-webkit-tap-highlight-color:transparent;
 --k:1;--safe-t:env(safe-area-inset-top,0px);--safe-l:env(safe-area-inset-left,0px);--safe-r:env(safe-area-inset-right,0px);--safe-b:env(safe-area-inset-bottom,0px)}
#nm-hud button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;pointer-events:auto;border:0;outline:none}
#nm-hud svg,#nm-hud img.nm-ic{display:block;width:100%;height:100%;object-fit:contain;-webkit-user-drag:none;pointer-events:none}
.nm-top{position:absolute;left:0;right:0;top:calc(var(--safe-t) + 10px);display:flex;align-items:center;justify-content:space-between;padding:0 calc(10px + max(var(--safe-l),var(--safe-r)));gap:10px}
.nm-pill{background:#fff;border-radius:999px;padding:calc(7px*var(--k)) calc(16px*var(--k));font-weight:900;font-size:calc(16px*var(--k));letter-spacing:.02em;box-shadow:0 4px 0 #b9c8ea,0 8px 18px rgba(30,60,140,.18);white-space:nowrap;text-transform:uppercase}
.nm-coins{display:flex;align-items:center;gap:6px;padding-left:calc(6px*var(--k))}
.nm-coins i{width:calc(26px*var(--k));height:calc(26px*var(--k));display:block}
.nm-coins b{font-family:'NM Titan','NM Nunito',sans-serif;font-weight:400;font-size:calc(19px*var(--k));color:#1f2d5c}
.nm-prog{flex:0 1 calc(300px*var(--k));display:flex;align-items:center;gap:4px;opacity:0;transition:opacity .3s}
.nm-is-run .nm-prog,.nm-is-menu .nm-prog{opacity:1}
.nm-prog-bar{flex:1;height:calc(14px*var(--k));background:rgba(255,255,255,.75);border-radius:99px;padding:3px;box-shadow:inset 0 2px 4px rgba(30,60,140,.18)}
.nm-prog-fill{height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#55e6b0,#3fb7ff);transition:width .15s linear;box-shadow:inset 0 -3px 0 rgba(0,0,0,.08),inset 0 2px 0 rgba(255,255,255,.6)}
.nm-prog-flag{width:calc(26px*var(--k));height:calc(26px*var(--k))}
.nm-side{position:absolute;top:calc(var(--safe-t) + 64px*var(--k) + 8px);display:flex;flex-direction:column;gap:calc(10px*var(--k));opacity:0;transform:translateX(-20px);transition:opacity .25s,transform .25s;pointer-events:none}
.nm-left{left:calc(10px + var(--safe-l))}
.nm-right{right:calc(10px + var(--safe-r));transform:translateX(20px)}
.nm-is-menu .nm-side{opacity:1;transform:none}
.nm-is-menu .nm-side button{pointer-events:auto}
.nm-side button{pointer-events:none}
.nm-round{position:relative;width:calc(58px*var(--k));height:calc(58px*var(--k));border-radius:calc(20px*var(--k));padding:calc(9px*var(--k)) calc(9px*var(--k)) calc(14px*var(--k));display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 -5px 0 rgba(0,0,0,.16),inset 0 3px 0 rgba(255,255,255,.45),0 6px 14px rgba(30,60,140,.22)}
.nm-round svg,.nm-round img.nm-ic{width:calc(38px*var(--k));height:calc(38px*var(--k))}
.nm-round span{position:absolute;bottom:calc(-7px*var(--k));left:50%;transform:translateX(-50%);font-size:calc(11px*var(--k));font-weight:900;color:#fff;white-space:nowrap;text-shadow:0 1px 0 #1f2d5c,0 0 3px #1f2d5c,1px 0 0 #1f2d5c,-1px 0 0 #1f2d5c,0 -1px 0 #1f2d5c;text-transform:uppercase;letter-spacing:.02em}
.nm-pink{background:linear-gradient(#ff8cc3,#ff5fa2)}
.nm-gold{background:linear-gradient(#ffd96b,#ffad2e)}
.nm-violet{background:linear-gradient(#b49bff,#8462ff)}
.nm-mint{background:linear-gradient(#6ff0c4,#2fcf97)}
.nm-blue{background:linear-gradient(#69b4ff,#2f7df6)}
.nm-green{background:linear-gradient(#7ef08f,#2fbf71)}
.nm-dot{position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:#ff3d46;border:3px solid #fff;display:none;animation:nm-beat 1s infinite}
.nm-dot.nm-on{display:block}
.nm-pause{position:absolute;left:calc(10px + var(--safe-l));top:calc(var(--safe-t) + 64px*var(--k) + 8px);opacity:0;pointer-events:none!important;transition:opacity .2s}
.nm-small{width:calc(46px*var(--k));height:calc(46px*var(--k));border-radius:calc(16px*var(--k));padding:calc(8px*var(--k)) calc(8px*var(--k)) calc(11px*var(--k))}
.nm-small svg{width:calc(24px*var(--k));height:calc(24px*var(--k))}
.nm-is-run .nm-pause{opacity:1;pointer-events:auto!important}
.nm-start{position:absolute;left:50%;bottom:calc(var(--safe-b) + 170px*var(--k) + 14px);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;opacity:0;transition:opacity .25s}
.nm-is-menu .nm-start{opacity:1}
.nm-swipe{position:relative;width:calc(190px*var(--k));height:calc(64px*var(--k))}
.nm-swipe-track{position:absolute;left:0;right:0;top:calc(10px*var(--k));height:calc(30px*var(--k));border-radius:99px;background:rgba(255,255,255,.55);border:3px solid rgba(255,255,255,.95);display:flex;justify-content:space-between;align-items:center;padding:0 10px;color:#ff8a3d;font-size:calc(14px*var(--k));box-shadow:0 4px 12px rgba(30,60,140,.15)}
.nm-hand{position:absolute;top:calc(14px*var(--k));left:50%;width:calc(46px*var(--k));height:calc(46px*var(--k));margin-left:calc(-14px*var(--k));animation:nm-swipe 1.6s ease-in-out infinite}
.nm-start-text{font-weight:900;font-size:calc(17px*var(--k));color:#fff;text-transform:uppercase;letter-spacing:.04em;text-shadow:0 2px 0 #2b5bc4,0 0 6px rgba(30,60,160,.5),1px 0 0 #2b5bc4,-1px 0 0 #2b5bc4;animation:nm-breathe 1.6s ease-in-out infinite}
.nm-upgrades{position:absolute;left:50%;bottom:calc(var(--safe-b) + 12px);transform:translate(-50%,20px);display:flex;gap:calc(12px*var(--k));opacity:0;transition:opacity .25s,transform .25s;pointer-events:none}
.nm-is-menu .nm-upgrades{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.nm-up{width:calc(138px*var(--k));border-radius:calc(22px*var(--k));padding:calc(10px*var(--k)) calc(8px*var(--k)) calc(10px*var(--k));text-align:center;box-shadow:0 5px 0 rgba(30,60,140,.18),0 10px 22px rgba(30,60,140,.18);display:flex;flex-direction:column;align-items:center;gap:calc(6px*var(--k))}
.nm-up-start{background:linear-gradient(#fffaf0,#ffe8c4)}
.nm-up-income{background:linear-gradient(#f2fff7,#cdf6dc)}
.nm-up-t{font-weight:900;font-size:calc(12px*var(--k));text-transform:uppercase;line-height:1.05;min-height:2.1em;display:flex;align-items:center}
.nm-up-v{display:flex;align-items:center;gap:5px;font-family:'NM Titan','NM Nunito',sans-serif;font-size:calc(20px*var(--k))}
.nm-up-v i{font-style:normal;font-size:.7em;color:#ff8a3d}
.nm-up-start .nm-up-v b{color:#ff6a3d;font-weight:400}
.nm-up-income .nm-up-v b{color:#1fae68;font-weight:400}
.nm-up-v span{color:#1f2d5c}
.nm-btn{display:flex;align-items:center;justify-content:center;gap:6px;border-radius:calc(16px*var(--k));padding:calc(8px*var(--k)) calc(14px*var(--k)) calc(11px*var(--k));color:#fff;font-weight:900;font-size:calc(16px*var(--k));text-transform:uppercase;text-shadow:0 2px 0 rgba(0,0,0,.18);box-shadow:inset 0 -5px 0 rgba(0,0,0,.17),inset 0 3px 0 rgba(255,255,255,.4),0 5px 12px rgba(30,60,140,.2);position:relative}
.nm-btn i{display:block;width:calc(22px*var(--k));height:calc(22px*var(--k))}
.nm-btn:disabled{filter:grayscale(.55) brightness(.95);opacity:.75;cursor:default}
.nm-btn-up{width:100%;font-family:'NM Titan','NM Nunito',sans-serif;font-weight:400;font-size:calc(17px*var(--k))}
.nm-coinbtn{background:linear-gradient(#ff8b6a,#ff5a4a)}
.nm-up-income .nm-coinbtn{background:linear-gradient(#4fd2ff,#1fa3ec)}
.nm-adbtn{background:linear-gradient(#7ef08f,#2fbf71);font-family:'NM Nunito',sans-serif;font-weight:900;font-size:calc(13px*var(--k))}
.nm-poor{opacity:.6}
.nm-floats{position:absolute;inset:0;overflow:hidden}
.nm-flycoin{position:fixed;width:calc(30px*var(--k));height:calc(30px*var(--k));z-index:40;pointer-events:none;transform:translate(-50%,-50%);opacity:0}
.nm-float{position:absolute;transform:translate(-50%,-50%);font-family:'NM Titan','NM Nunito',sans-serif;font-size:calc(30px*var(--k));color:#fff;pointer-events:none;animation:nm-float .9s ease-out forwards;-webkit-text-stroke:calc(2px*var(--k)) #1f5fd6;paint-order:stroke fill;text-shadow:0 3px 0 rgba(0,0,0,.15)}
.nm-f-bad{-webkit-text-stroke-color:#d6202f;color:#fff}
.nm-f-good{-webkit-text-stroke-color:#1a9e55;color:#fff;font-size:calc(38px*var(--k))}
.nm-f-coin{-webkit-text-stroke-color:#d98a00;color:#fff6c7;font-size:calc(24px*var(--k))}
.nm-combo{position:absolute;left:50%;top:22%;transform:translate(-50%,-50%) scale(0);font-family:'NM Nunito',system-ui,sans-serif;font-weight:900;font-synthesis:none;letter-spacing:.02em;font-size:calc(36px*var(--k));color:#ffe066;-webkit-text-stroke:calc(8px*var(--k)) #ff5fa2;paint-order:stroke fill;white-space:nowrap;text-transform:uppercase;filter:drop-shadow(0 calc(4px*var(--k)) 0 rgba(160,30,90,.3))}
.nm-combo.nm-show{animation:nm-combo 1.1s ease-out forwards}
.nm-modal{position:absolute;inset:0;background:rgba(40,70,140,.32);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;padding:calc(var(--safe-t) + 10px) 12px calc(var(--safe-b) + 10px)}
.nm-modal.nm-open{opacity:1;pointer-events:auto}
.nm-card{position:relative;width:min(340px,88vw);max-height:calc(100% - 20px);overflow:auto;background:linear-gradient(#ffffff,#f1f6ff);border-radius:30px;padding:calc(34px*var(--k)) calc(20px*var(--k)) calc(18px*var(--k));display:flex;flex-direction:column;align-items:center;gap:calc(10px*var(--k));box-shadow:0 8px 0 #c6d4f2,0 20px 50px rgba(20,40,110,.35);transform:scale(.6);transition:transform .35s cubic-bezier(.2,1.6,.4,1);scrollbar-width:none}
.nm-open .nm-card{transform:scale(1)}
.nm-ribbon{font-family:'NM Nunito',system-ui,sans-serif;font-weight:900;font-synthesis:none;letter-spacing:.02em;font-size:calc(32px*var(--k));color:#fff;-webkit-text-stroke:calc(8px*var(--k)) #2b5bc4;paint-order:stroke fill;text-transform:uppercase;text-align:center;line-height:1.05;filter:drop-shadow(0 calc(4px*var(--k)) 0 rgba(30,60,140,.25))}
.nm-ribbon-win{color:#ffe066;-webkit-text-stroke-color:#ff6a3d}
.nm-ribbon-lose{color:#fff;-webkit-text-stroke-color:#e0303e}
.nm-big{font-family:'NM Titan',sans-serif;font-size:calc(64px*var(--k));line-height:1;-webkit-text-stroke:calc(3px*var(--k)) #fff;paint-order:stroke fill;filter:drop-shadow(0 5px 0 rgba(30,60,140,.2));animation:nm-wobble 1.6s ease-in-out infinite}
.nm-big-blue{color:#2f7df6}
.nm-big-red{color:#ff3d46}
.nm-sub{font-weight:800;font-size:calc(14px*var(--k));color:#5a6a9a;text-align:center}
.nm-reason{font-size:calc(16px*var(--k));color:#1f2d5c}
.nm-reward{display:flex;align-items:center;gap:6px;background:#fff6d6;border-radius:99px;padding:6px 18px 6px 8px;box-shadow:inset 0 -3px 0 #ffe08a}
.nm-reward i{width:calc(30px*var(--k));height:calc(30px*var(--k));display:block}
.nm-reward b{font-family:'NM Titan',sans-serif;font-weight:400;font-size:calc(26px*var(--k));color:#e08a00}
.nm-wide{width:100%;flex-wrap:wrap;min-height:calc(52px*var(--k))}
.nm-wide small{flex-basis:100%;font-size:calc(10.5px*var(--k));opacity:.92;text-transform:none;font-weight:800;margin-top:-2px}
.nm-x{position:absolute;right:12px;top:12px;width:40px;height:40px;border-radius:14px;background:linear-gradient(#ff8c96,#ff4f5e);padding:9px;box-shadow:inset 0 -4px 0 rgba(0,0,0,.15)}
.nm-rows{display:flex;flex-direction:column;gap:8px;width:100%}
.nm-row{display:flex;justify-content:space-between;align-items:center;width:100%;background:#fff;border-radius:16px;padding:12px 16px;font-weight:900;font-size:calc(15px*var(--k));color:#1f2d5c;box-shadow:inset 0 -3px 0 #dce5f7}
.nm-row b{padding:4px 12px;border-radius:99px;color:#fff;font-size:.85em;text-transform:uppercase}
.nm-row .nm-on{background:#2fbf71}
.nm-row .nm-off{background:#b3bdd6}
.nm-lb{width:100%;display:flex;flex-direction:column;gap:6px;min-height:80px}
.nm-lb-row{display:flex;align-items:center;gap:8px;background:#fff;border-radius:14px;padding:7px 10px;font-weight:800;font-size:14px;box-shadow:inset 0 -3px 0 #dce5f7}
.nm-lb-row b{width:26px;text-align:center;font-family:'NM Titan',sans-serif;font-weight:400;color:#8462ff}
.nm-lb-row img,.nm-lb-row i{width:28px;height:28px;border-radius:50%;background:#dfe8fb;object-fit:cover}
.nm-lb-row span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nm-lb-row em{font-style:normal;color:#2f7df6}
.nm-lb-row.nm-me{background:#fff6d6}
.nm-lb-empty{text-align:center;font-weight:800;color:#5a6a9a;padding:16px 4px}
.nm-curtain{position:absolute;inset:0;background:#f4fbff;opacity:0;pointer-events:none;transition:opacity .2s}
.nm-curtain.nm-on{opacity:1;pointer-events:auto}
.nm-jelly{animation:nm-jelly .45s cubic-bezier(.3,1.6,.5,1)}
.nm-pop{animation:nm-jelly .45s cubic-bezier(.3,1.6,.5,1)}
@keyframes nm-jelly{0%{transform:scale(1,1)}30%{transform:scale(1.12,.86)}55%{transform:scale(.94,1.08)}75%{transform:scale(1.03,.97)}100%{transform:scale(1,1)}}
@keyframes nm-swipe{0%,100%{transform:translateX(calc(-62px*var(--k))) rotate(-8deg)}50%{transform:translateX(calc(62px*var(--k))) rotate(8deg)}}
@keyframes nm-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes nm-float{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}20%{transform:translate(-50%,-80%) scale(1.15);opacity:1}100%{transform:translate(-50%,-220%) scale(.9);opacity:0}}
@keyframes nm-combo{0%{transform:translate(-50%,-50%) scale(0) rotate(-8deg)}25%{transform:translate(-50%,-50%) scale(1.25) rotate(4deg)}45%{transform:translate(-50%,-50%) scale(1) rotate(0)}80%{opacity:1}100%{transform:translate(-50%,-90%) scale(1);opacity:0}}
@keyframes nm-wobble{0%,100%{transform:scale(1,1)}25%{transform:scale(1.05,.96)}50%{transform:scale(.97,1.04)}75%{transform:scale(1.02,.99)}}
@keyframes nm-beat{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
@media (max-height:420px) and (orientation:landscape){
 .nm-side{top:calc(var(--safe-t) + 50px)}
 .nm-round{width:46px;height:46px;border-radius:15px}
 .nm-round svg{width:24px;height:24px}
 .nm-round span{display:none}
 .nm-side{gap:7px}
 .nm-up{width:124px;padding:7px 6px 8px;gap:4px}
 .nm-up-t{font-size:10.5px;min-height:0}
 .nm-start{bottom:calc(var(--safe-b) + 128px)}
 .nm-card{padding:22px 16px 12px;gap:6px}
 .nm-big{font-size:46px}
 .nm-ribbon{font-size:24px}
}
`;
