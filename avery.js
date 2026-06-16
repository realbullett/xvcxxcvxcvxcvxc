(async () => {
    "use strict";

    /* ── config ────────────────────────────────────────────────── */
    const CONFIG = {
        NAME: "Avery",
        VERSION: "v1.0.0",
        THEME: "#5865F2",
        SUCCESS: "#3BA55C",
        WARN: "#faa61a",
        ERR: "#f04747",
        HIDE_ACTIVITY: false,
        MAX_LOG_ITEMS: 45
    };

    const SYS = Object.freeze({
        MAX_TIME: 25 * 60 * 1000,
        MAX_TASK_FAILURES: 5,
        MAX_RETRIES: 3,
        IS_DESKTOP: typeof window.DiscordNative !== 'undefined'
    });

    const RUNTIME = {
        running: true,
        cleanups: new Set(),
        autoEnroll: true,
        autoClaim: false,
        playSound: false,
        randomDelay: false
    };

    /* ── audio cue ──────────────────────────────────────────────── */
    const Sound = {
        play(type) {
            if (!RUNTIME.playSound) return;
            try {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return;
                const ctx = new Ctx();
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sine';
                const t0 = ctx.currentTime;
                if (type === 'done') {
                    o.frequency.setValueAtTime(523.25, t0);
                    o.frequency.setValueAtTime(659.25, t0 + 0.12);
                    o.frequency.setValueAtTime(783.99, t0 + 0.24);
                    g.gain.setValueAtTime(0.55, t0);
                    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
                    o.start(t0); o.stop(t0 + 0.6);
                } else {
                    o.frequency.value = 880;
                    g.gain.setValueAtTime(0.45, t0);
                    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
                    o.start(t0); o.stop(t0 + 0.2);
                }
            } catch (_) { }
        }
    };

    /* ── icons (Discord‑like) ──────────────────────────────────── */
    const ICONS = {
        BOLT: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.29-.62L14.5 3h1l-1 7h3.5c.58 0 .57.32.29.62L11 21z"/></svg>`,
        VIDEO: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>`,
        GAME: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>`,
        CHECK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
        CLOCK: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.59 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
        STOP: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>`,
        SETTINGS: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.33-.02-.64-.06-.94l2.02-1.58c.18-.14.23-.38.12-.56l-1.89-3.28c-.12-.19-.36-.26-.56-.18l-2.38.96c-.5-.38-1.06-.68-1.66-.88L14.45 3.5c-.04-.2-.2-.34-.4-.34h-3.78c-.2 0-.36.14-.4.34l-.3 2.52c-.6.2-1.16.5-1.66.88l-2.38-.96c-.2-.08-.44-.01-.56.18l-1.89 3.28c-.12.19-.07.42.12.56l2.02 1.58c-.04.3-.06.61-.06.94 0 .33.02.64.06.94l-2.02 1.58c-.18.14-.23.38-.12.56l1.89 3.28c.12.19.36.26.56.18l2.38-.96c.5.38 1.06.68 1.66.88l.3 2.52c.04.2.2.34.4.34h3.78c.2 0 .36-.14.4-.34l.3-2.52c.6-.2 1.16-.5 1.66-.88l2.38.96c.2.08.44.01.56-.18l1.89-3.28c.12-.19.07-.42-.12-.56l-2.02-1.58zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>`
    };

    const CONST = Object.freeze({
        ID: "1412491570820812933",
        EVT: { HEARTBEAT: "QUESTS_SEND_HEARTBEAT_SUCCESS", GAME: "RUNNING_GAMES_CHANGE", RPC: "LOCAL_ACTIVITY_UPDATE" }
    });

    if (window.averyLock) {
        const existingUI = document.getElementById('avery-ui');
        if (existingUI) existingUI.style.display = 'flex';
        return console.warn(`[Avery] Already running.`);
    }
    window.averyLock = true;

    /* ── helpers ───────────────────────────────────────────────── */
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    /* ── error handling ────────────────────────────────────────── */
    const ErrorHandler = {
        RETRYABLE: new Set([429, 500, 502, 503, 504, 408]),
        CLIENT_ERRORS: new Set([400, 403, 404, 409, 410]),
        classify(error) {
            const status = error?.status ?? error?.statusCode;
            return { isRetryable: this.RETRYABLE.has(status), isClientError: this.CLIENT_ERRORS.has(status), status, message: error?.message ?? error?.body?.message ?? `HTTP ${status ?? 'UNKNOWN'}` };
        },
        isSkippableQuest(error) { const s = error?.status; return s === 404 || s === 403 || s === 410; }
    };

    /* ── UI Logger – Discord-styled, fully draggable, human-feeling ── */
    const Logger = {
        root: null,
        tasks: new Map(),
        tickerId: null,
        _settingsOpen: false,
        _logsOpen: true,
        _validKey: "averyuser1",
        _isPickerOpen: false,

        init() {
            return new Promise((resolveInit) => {
                // clean up any previous instance first
                document.getElementById('avery-ui')?.remove();
                document.getElementById('avery-styles')?.remove();

                const style = document.createElement('style');
                style.id = 'avery-styles';
            style.innerHTML = `
                /* ── Glassmorphism Discord Tokens ── */
                #avery-ui {
                    --bg-glass:       rgba(22, 23, 26, 0.7);
                    --bg-glass-heavy: rgba(15, 16, 18, 0.85);
                    --bg-glass-light: rgba(255, 255, 255, 0.03);
                    --bg-hover:       rgba(255, 255, 255, 0.08);
                    --bg-active:      rgba(255, 255, 255, 0.12);
                    --border-glass:   rgba(255, 255, 255, 0.1);
                    --border-bright:  rgba(255, 255, 255, 0.2);
                    --text-normal:    #dbdee1;
                    --text-muted:     #949ba4;
                    --text-header:    #ffffff;
                    --brand:          #5865f2;
                    --brand-gradient: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
                    --green:          #23a55a;
                    --green-gradient: linear-gradient(135deg, #23a55a 0%, #1e9450 100%);
                    --yellow:         #f0b232;
                    --red:            #f23f43;
                    --radius-lg:      20px;
                    --radius-md:      12px;
                    --radius-sm:      8px;
                    --shadow-xl:      0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1);
                    --glass-blur:     blur(25px) saturate(190%);
                }

                /* ── panel shell ── */
                #avery-ui {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.9);
                    width: 400px;
                    height: 300px;
                    background: var(--bg-glass);
                    backdrop-filter: var(--glass-blur);
                    -webkit-backdrop-filter: var(--glass-blur);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-glass);
                    box-shadow: var(--shadow-xl);
                    font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    color: var(--text-normal);
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    user-select: none;
                    opacity: 0;
                    transition: all 1.2s cubic-bezier(0.645, 0.045, 0.355, 1);
                    will-change: transform, opacity, top, left, width, height;
                }
                
                #avery-ui.av-key-active {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                    width: 400px;
                    height: 380px;
                }

                #avery-ui.av-splash-active {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                    width: 300px;
                    height: 180px;
                }

                #avery-ui.av-splash-expand {
                    width: 440px;
                    height: 260px;
                    transform: translate(-50%, -50%) scale(1.05);
                }

                /* ── key system ── */
                .av-key-box {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    gap: 20px;
                    z-index: 20;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.5s ease;
                }
                #avery-ui.av-key-active .av-key-box {
                    opacity: 1;
                    visibility: visible;
                }
                .av-key-input {
                    width: 100%;
                    background: rgba(0,0,0,0.25);
                    border: 1px solid var(--border-glass);
                    border-radius: var(--radius-md);
                    padding: 14px 18px;
                    color: white;
                    font-family: inherit;
                    font-size: 15px;
                    outline: none;
                    transition: all 0.3s ease;
                    text-align: center;
                    letter-spacing: 2px;
                    font-weight: 600;
                }
                .av-key-input:focus {
                    border-color: var(--brand);
                    background: rgba(0,0,0,0.35);
                    box-shadow: 0 0 15px rgba(88, 101, 242, 0.4);
                }
                .av-key-input.error {
                    border-color: var(--red);
                    animation: av-shake 0.4s ease;
                }
                @keyframes av-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }


                 #avery-ui.av-ready {
                    top: calc(100% - 24px);
                    left: calc(100% - 24px);
                    transform: translate(-100%, -100%);
                    width: 360px;
                    height: auto;
                    max-height: 85vh;
                }

                #avery-ui.av-minimized {
                    transform: translate(-100%, -100%) translateY(calc(100% - 80px)) scale(0.9);
                    opacity: 0.85;
                }
                #avery-ui.av-minimized:hover { opacity: 1; transform: translate(-100%, -100%) translateY(calc(100% - 80px)) scale(0.92); }

                /* ── splash content ── */
                .av-splash-box {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    gap: 16px;
                    z-index: 10;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.4s ease, visibility 0.4s;
                }
                #avery-ui.av-splash-active .av-splash-box,
                #avery-ui.av-splash-expand .av-splash-box,
                #avery-ui.av-closing .av-splash-box {
                    opacity: 1;
                    visibility: visible;
                }
                #avery-ui.av-ready .av-splash-box,
                #avery-ui.av-key-active .av-splash-box {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }
                #avery-ui.av-closing .av-splash-text {
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: normal;
                    text-transform: none;
                    background: none !important;
                    -webkit-background-clip: initial !important;
                    -webkit-text-fill-color: initial !important;
                    color: #ffffff !important;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    animation: av-farewell-glow 4s linear infinite;
                }
                #avery-ui.av-closing .av-splash-sub {
                    font-size: 14px;
                    letter-spacing: 0.5px;
                    text-transform: none;
                    color: var(--text-muted);
                    opacity: 0;
                    animation: av-sub-fadein 0.8s ease 0.6s forwards;
                }
                @keyframes av-sub-fadein {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 0.8; transform: translateY(0); }
                }
                @keyframes av-farewell-glow {
                    0%   { filter: drop-shadow(0 0 12px rgba(242, 63, 67, 0.6)); transform: scale(1); }
                    20%  { filter: drop-shadow(0 0 15px rgba(240, 178, 50, 0.7)); }
                    40%  { filter: drop-shadow(0 0 18px rgba(35, 165, 90, 0.8)); transform: scale(1.02); }
                    60%  { filter: drop-shadow(0 0 18px rgba(88, 101, 242, 0.8)); }
                    80%  { filter: drop-shadow(0 0 15px rgba(155, 89, 182, 0.7)); transform: scale(1.02); }
                    100% { filter: drop-shadow(0 0 12px rgba(242, 63, 67, 0.6)); transform: scale(1); }
                }
                #avery-ui.av-closing .av-farewell-wave {
                    display: inline-block;
                    animation: av-wave 1s ease-in-out 3 0.4s;
                    transform-origin: 70% 70%;
                }
                @keyframes av-wave {
                    0%   { transform: rotate(0deg); }
                    15%  { transform: rotate(14deg); }
                    30%  { transform: rotate(-8deg); }
                    40%  { transform: rotate(14deg); }
                    50%  { transform: rotate(-4deg); }
                    60%  { transform: rotate(10deg); }
                    70%  { transform: rotate(0deg); }
                    100% { transform: rotate(0deg); }
                }
                #avery-ui.av-closing {
                    border-color: transparent !important;
                    animation: av-closing-border 4s linear infinite;
                }
                @keyframes av-closing-border {
                    0%   { box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(242,63,67,0.3),   0 0 30px rgba(242,63,67,0.15); }
                    20%  { box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(240,178,50,0.3),  0 0 30px rgba(240,178,50,0.15); }
                    40%  { box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(35,165,90,0.3),   0 0 30px rgba(35,165,90,0.15); }
                    60%  { box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(88,101,242,0.3),  0 0 30px rgba(88,101,242,0.15); }
                    80%  { box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(155,89,182,0.3),  0 0 30px rgba(155,89,182,0.15); }
                    100% { box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(242,63,67,0.3),   0 0 30px rgba(242,63,67,0.15); }
                }
                .av-farewell-particle {
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    pointer-events: none;
                    opacity: 0;
                    animation: av-particle-float 2.5s ease-out forwards;
                }
                @keyframes av-particle-float {
                    0%   { opacity: 1; transform: translate(0, 0) scale(1); }
                    50%  { opacity: 0.8; }
                    100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0); }
                }
                .av-splash-text {
                    font-size: 32px;
                    font-weight: 800;
                    letter-spacing: 4px;
                    text-transform: uppercase;
                    background: linear-gradient(135deg, #fff 0%, var(--brand) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 10px rgba(88, 101, 242, 0.4));
                    animation: av-text-glow 2s infinite alternate;
                    transition: all 1.2s cubic-bezier(0.645, 0.045, 0.355, 1);
                }
                #avery-ui.av-splash-expand .av-splash-text {
                    font-size: 54px;
                    letter-spacing: 10px;
                }
                @keyframes av-text-glow {
                    from { filter: drop-shadow(0 0 10px rgba(88, 101, 242, 0.4)); transform: scale(1); }
                    to   { filter: drop-shadow(0 0 20px rgba(88, 101, 242, 0.8)); transform: scale(1.05); }
                }
                .av-splash-sub {
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    opacity: 0.6;
                }

                /* ── main content visibility ── */
                #avery-ui > *:not(.av-splash-box):not(.av-key-box) {
                    opacity: 0;
                    transition: opacity 0.5s ease 0.4s;
                }
                #avery-ui.av-ready > *:not(.av-splash-box):not(.av-key-box) {
                    opacity: 1;
                }

                @keyframes av-entry {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8) rotateX(-20deg); filter: blur(15px); }
                    100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotateX(0); filter: blur(0); }
                }

                #avery-ui.av-closing {
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) scale(1) !important;
                    width: 440px !important;
                    height: 240px !important;
                    opacity: 1 !important;
                }
                
                @keyframes av-exit {
                    0%   { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); filter: blur(0); }
                    40%  { opacity: 1; transform: translate(-50%, -50%) scale(1.06) rotate(0deg); filter: blur(0); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.4) rotate(8deg); filter: blur(20px); }
                }
                
                #avery-ui.av-exit-final {
                    animation: av-exit 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards !important;
                    pointer-events: none;
                }

                /* ── header icons pulse ── */
                #avery-header {
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    cursor: grab;
                    background: linear-gradient(to bottom, rgba(255,255,255,0.03), transparent);
                    border-bottom: 1px solid var(--border-glass);
                    flex-shrink: 0;
                }
                #avery-header:active { cursor: grabbing; }

                #avery-title {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    min-width: 0;
                }
                .d-title-name {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-header);
                    letter-spacing: 0.2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .d-title-sub {
                    font-size: 12px;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .d-hbtns {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }
                .d-hbtn {
                    width: 32px;
                    height: 32px;
                    border-radius: var(--radius-sm);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--text-muted);
                    transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
                    background: transparent;
                }
                .d-hbtn:hover {
                    background: var(--bg-hover);
                    color: var(--text-header);
                    transform: translateY(-2px) scale(1.1);
                }
                .d-hbtn:active { transform: translateY(0) scale(0.9); }
                .d-hbtn.d-close:hover { background: rgba(242, 63, 67, 0.2); color: var(--red); }
                .d-hbtn.d-active { color: var(--brand); background: var(--bg-active); transform: rotate(45deg); }

                .d-app-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-md);
                    background: var(--brand-gradient);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
                    position: relative;
                    overflow: hidden;
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    flex-shrink: 0;
                }
                .d-app-icon:hover { transform: scale(1.1) rotate(5deg); }
                .d-app-icon::after {
                    content: '';
                    position: absolute;
                    top: -50%; left: -50%; width: 200%; height: 200%;
                    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                    transform: rotate(45deg);
                    animation: av-shine 3s infinite;
                }
                @keyframes av-shine {
                    0% { left: -100%; }
                    20%, 100% { left: 100%; }
                }

                /* ── buttons ── */
                .d-btn {
                    height: 34px;
                    padding: 0 16px;
                    border: 1px solid var(--border-glass);
                    border-radius: var(--radius-sm);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    backdrop-filter: blur(8px);
                    position: relative;
                    overflow: hidden;
                    color: var(--text-header);
                    background: var(--bg-glass-light);
                }
                .d-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); background: var(--bg-hover); border-color: var(--border-bright); }
                .d-btn:active { transform: translateY(1px) scale(0.96); }
                
                .d-btn-brand {
                    background: var(--brand-gradient);
                    border: none;
                    box-shadow: 0 4px 12px rgba(88, 101, 242, 0.4);
                }
                .d-btn-brand:hover {
                    box-shadow: 0 6px 16px rgba(88, 101, 242, 0.6);
                    filter: brightness(1.1);
                }
                
                .d-btn-green {
                    background: var(--green-gradient);
                    border: none;
                }
                
                .d-btn-ghost {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border-glass);
                }

                /* ── sections ── */
                .d-section-label {
                    padding: 16px 20px 8px;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }

                #avery-content {
                    padding: 0 12px 16px;
                    max-height: 400px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex: 1;
                }

                /* ── list animations ── */
                .d-row {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 12px;
                    border-radius: var(--radius-md);
                    background: var(--bg-glass-light);
                    border: 1px solid transparent;
                    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
                    animation: av-list-item-entry .5s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes av-list-item-entry {
                    from { opacity: 0; transform: translateX(-20px); filter: blur(5px); }
                    to { opacity: 1; transform: translateX(0); filter: blur(0); }
                }
                .d-row:hover {
                    background: var(--bg-hover);
                    border-color: var(--border-glass);
                    transform: translateX(8px) scale(1.02);
                    box-shadow: -10px 0 20px rgba(0,0,0,0.1);
                }
                
                /* ── progress glow ── */
                .d-prog-fill {
                    height: 100%;
                    border-radius: 10px;
                    background: var(--brand-gradient);
                    box-shadow: 0 0 15px rgba(88, 101, 242, 0.6);
                    transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                }
                .d-prog-fill::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: av-prog-sweep 2s infinite linear;
                }
                @keyframes av-prog-sweep {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }

                /* ── settings & log transitions ── */
                #av-settings-panel {
                    max-height: 0;
                    opacity: 0;
                    background: rgba(0,0,0,0.15);
                    border-bottom: 1px solid var(--border-glass);
                    overflow: hidden;
                    transition: max-height 0.4s cubic-bezier(0.22, 1, 0.36, 1), 
                                opacity 0.3s ease,
                                padding 0.4s ease;
                }
                #av-settings-panel.open { 
                    max-height: 500px;
                    opacity: 1;
                    padding: 8px 0;
                }

                .d-setting-row {
                    display: flex;
                    align-items: center;
                    padding: 10px 20px;
                    gap: 16px;
                    transition: background 0.2s ease;
                }
                .d-setting-row:hover { background: rgba(255,255,255,0.03); }
                .d-setting-text { flex: 1; }
                .d-setting-name { font-size: 14px; font-weight: 600; color: var(--text-header); }
                .d-setting-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

                /* toggle switch */
                .d-toggle {
                    position: relative;
                    width: 36px;
                    height: 20px;
                    cursor: pointer;
                }
                .d-toggle input { opacity: 0; width: 0; height: 0; }
                .d-track {
                    position: absolute;
                    inset: 0;
                    border-radius: 20px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid var(--border-glass);
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .d-thumb {
                    position: absolute;
                    top: 3px; left: 3px;
                    width: 14px; height: 14px;
                    border-radius: 50%;
                    background: #fff;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .d-toggle input:checked ~ .d-track { background: var(--green); border-color: rgba(255,255,255,0.1); box-shadow: 0 0 10px rgba(35, 165, 90, 0.4); }
                .d-toggle input:checked ~ .d-thumb { transform: translateX(16px); }

                /* ── scroll smoother ── */
                #avery-content, #avery-logs {
                    scroll-behavior: smooth;
                }

                /* ── picker row hover ── */
                .d-picker-row {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 12px 16px;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                                background 0.4s ease, 
                                border-color 0.4s ease,
                                box-shadow 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                    background: var(--bg-glass-light);
                    border: 1px solid transparent;
                    animation: av-list-item-entry .5s cubic-bezier(0.22, 1, 0.36, 1) both;
                    position: relative;
                    overflow: hidden;
                    will-change: transform, background, border-color;
                }
                .d-picker-row:hover {
                    background: var(--bg-hover);
                    border-color: var(--border-glass);
                    transform: translateX(4px) scale(1.01);
                }
                .d-picker-row.selected {
                    background: rgba(88, 101, 242, 0.18);
                    border-color: rgba(88, 101, 242, 0.4);
                    transform: scale(1.02) translateX(6px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(88, 101, 242, 0.2);
                }
                .d-picker-row:active {
                    transform: scale(0.98) translateX(2px);
                    transition: all 0.1s ease;
                }

                .d-picker-cb {
                    width: 22px;
                    height: 22px;
                    border-radius: 6px;
                    border: 2px solid rgba(255,255,255,0.2);
                    background: rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .d-picker-row.selected .d-picker-cb {
                    background: var(--brand);
                    border-color: var(--brand);
                    transform: scale(1.2) rotate(360deg);
                    box-shadow: 0 0 15px var(--brand);
                }
                .d-picker-tick { 
                    display: block;
                    opacity: 0;
                    transform: scale(0.5) rotate(-45deg);
                    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
                }
                .d-picker-row.selected .d-picker-tick { 
                    opacity: 1;
                    transform: scale(1) rotate(0);
                }

                .d-picker-row img, .d-picker-row .d-avatar-fallback {
                    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .d-picker-row.selected img, .d-picker-row.selected .d-avatar-fallback {
                    transform: scale(1.1) rotate(5deg);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }

                /* ── log header ── */
                #av-log-wrapper { 
                    border-top: 1px solid var(--border-glass);
                    display: flex;
                    flex-direction: column;
                    background: rgba(0,0,0,0.2);
                }
                .d-log-header {
                    padding: 12px 20px;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    background: rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                }
                .d-log-header:hover { color: var(--text-header); background: rgba(255,255,255,0.05); }
                .d-log-chevron { transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .d-log-header.open .d-log-chevron { transform: rotate(180deg); }

                #avery-logs {
                    display: none;
                    max-height: 160px;
                    overflow-y: auto;
                    padding: 8px 0;
                    background: rgba(0,0,0,0.3);
                    scroll-behavior: smooth;
                }
                #avery-logs.open { display: block; }

                /* ── log messages ── */
                .d-log-msg {
                    padding: 8px 20px;
                    display: flex;
                    gap: 12px;
                    font-size: 12px;
                    line-height: 1.5;
                    transition: all 0.2s ease;
                    animation: av-list-item-entry 0.4s ease both;
                    border-left: 3px solid transparent;
                    margin-bottom: 2px;
                }
                .d-log-msg:hover { background: rgba(255,255,255,0.05); border-left-color: var(--brand); transform: translateX(4px); }
                .d-log-ts { color: var(--text-muted); font-weight: 700; flex-shrink: 0; font-variant-numeric: tabular-nums; opacity: 0.8; }
                .d-log-text { color: #dcddde; flex: 1; word-break: break-word; font-weight: 500; }
                
                .av-log-success .d-log-text { color: var(--green); }
                .av-log-warn    .d-log-text { color: var(--yellow); }
                .av-log-err     .d-log-text { color: var(--red); }
                .av-log-debug   .d-log-text { color: var(--text-muted); opacity: 0.7; }

                /* ── quest picker footer fix ── */
                .d-picker-footer {
                    display: flex;
                    gap: 12px;
                    padding: 20px;
                    margin-top: auto;
                    border-top: 1px solid var(--border-glass);
                    background: rgba(0,0,0,0.1);
                }
                .d-picker-footer .d-btn { flex: 1; height: 38px; font-size: 14px; }

                /* ── scrollbars ── */
                #avery-content::-webkit-scrollbar,
                #avery-logs::-webkit-scrollbar { width: 4px; }
                #avery-content::-webkit-scrollbar-thumb,
                #avery-logs::-webkit-scrollbar-thumb {
                    background: var(--border-bright);
                    border-radius: 4px;
                }

                @keyframes d-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(35,165,90, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(35,165,90, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(35,165,90, 0); }
                }
                .d-status-badge.online { animation: d-pulse 2s infinite; }
            `;
            document.head.appendChild(style);

            // ── build the panel ────────────────────────────────────────
            this.root = document.createElement('div');
            this.root.id = 'avery-ui';
            this.root.innerHTML = `
                <div class="av-splash-box">
                    <div class="av-splash-text">Avery</div>
                    <div class="av-splash-sub">Premium Quest Automator</div>
                </div>

                <div class="av-key-box">
                    <div class="av-splash-text" style="font-size: 38px; margin-bottom: 4px;">Avery</div>
                    <input type="password" class="av-key-input" placeholder="Enter Key" id="av-key-field">
                    <button class="d-btn d-btn-brand" id="av-key-submit" style="width:100%; height:40px;">Verify Key</button>
                </div>

                <div id="avery-header">
                    <div class="d-app-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2ZM12 15.5L8.5 17.5L12 6.5L15.5 17.5L12 15.5Z"/>
                        </svg>
                    </div>
                    <div id="avery-title">
                        <span class="d-title-name">Avery</span>
                        <span class="d-title-sub">Monitoring Quests</span>
                    </div>
                    <div class="d-hbtns">
                        <div class="d-hbtn" id="av-btn-settings" title="Settings">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.3-.07.62-.07.94s.03.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                            </svg>
                        </div>
                        <div class="d-hbtn" id="av-btn-minimize" title="Minimize (Shift+.)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 13H5v-2h14v2z"/>
                            </svg>
                        </div>
                        <div class="d-hbtn d-close" id="av-btn-stop" title="Shutdown">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <div id="av-settings-panel">
                    <div class="d-section-label" style="padding-top:12px;padding-bottom:4px">Preferences</div>

                    <div class="d-setting-row">
                        <div class="d-setting-text">
                            <div class="d-setting-name">Auto Enroll</div>
                            <div class="d-setting-desc">Automatically join available quests</div>
                        </div>
                        <label class="d-toggle">
                            <input type="checkbox" id="av-tog-enroll" ${RUNTIME.autoEnroll ? 'checked' : ''}>
                            <div class="d-track"></div>
                            <div class="d-thumb"></div>
                        </label>
                    </div>

                    <div class="d-setting-row">
                        <div class="d-setting-text">
                            <div class="d-setting-name">Auto Claim</div>
                            <div class="d-setting-desc">Claim rewards automatically when done</div>
                        </div>
                        <label class="d-toggle">
                            <input type="checkbox" id="av-tog-claim" ${RUNTIME.autoClaim ? 'checked' : ''}>
                            <div class="d-track"></div>
                            <div class="d-thumb"></div>
                        </label>
                    </div>

                    <div class="d-setting-row">
                        <div class="d-setting-text">
                            <div class="d-setting-name">Sound Effects</div>
                            <div class="d-setting-desc">Play a tone when a quest completes</div>
                        </div>
                        <label class="d-toggle">
                            <input type="checkbox" id="av-tog-sound" ${RUNTIME.playSound ? 'checked' : ''}>
                            <div class="d-track"></div>
                            <div class="d-thumb"></div>
                        </label>
                    </div>

                    <div class="d-setting-row">
                        <div class="d-setting-text">
                            <div class="d-setting-name">Random Delay</div>
                            <div class="d-setting-desc">Wait 1–30 min between cycles</div>
                        </div>
                        <label class="d-toggle">
                            <input type="checkbox" id="av-tog-delay" ${RUNTIME.randomDelay ? 'checked' : ''}>
                            <div class="d-track"></div>
                            <div class="d-thumb"></div>
                        </label>
                    </div>
                </div>

                <div class="d-section-label" id="av-tasks-label">
                    Active Quests
                    <span id="av-task-count" style="font-size:11px;font-weight:700;color:white;background:var(--brand);padding:2px 8px;border-radius:20px;text-transform:none;letter-spacing:0;box-shadow: 0 2px 6px rgba(88,101,242,0.4);"></span>
                </div>

                <div id="avery-content"></div>

                <div id="av-log-wrapper">
                    <div class="d-log-header" id="av-log-toggle">
                        Activity Log
                        <svg class="d-log-chevron" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10l5 5 5-5z"/>
                        </svg>
                    </div>
                    <div id="avery-logs"></div>
                </div>
            `;

            document.body.appendChild(this.root);

            // ── auth and splash sequence ──────────────────────────────
            const startSplash = () => {
                this.root.classList.remove('av-key-active');
                
                // Stage 1: Shrink to splash size
                setTimeout(() => {
                    this.root.classList.add('av-splash-active');
                    
                    setTimeout(() => {
                        // Stage 2: Expand in center
                        this.root.classList.add('av-splash-expand');
                        
                        setTimeout(() => {
                            // Stage 3: Morph & Move to corner
                            this.root.classList.remove('av-splash-expand', 'av-splash-active');
                            this.root.classList.add('av-ready');
                            setTimeout(() => { 
                                this.startTicker(); 
                                resolveInit(); 
                            }, 1200); 
                        }, 1600);
                    }, 1400);
                }, 600); // Wait for key box to fade
            };

            setTimeout(() => {
                this.root.style.opacity = '1';
                this.root.classList.add('av-key-active');
                
                const field = document.getElementById('av-key-field');
                const submit = document.getElementById('av-key-submit');
                
                const verify = () => {
                    if (field.value === this._validKey) {
                        // Key Accepted Animation
                        submit.textContent = "Access Granted";
                        submit.style.background = "var(--green-gradient)";
                        field.style.borderColor = "var(--green)";
                        this.log("License key verified. Welcome back.", "success");
                        startSplash();
                    } else {
                        field.classList.add('error');
                        field.value = "";
                        field.placeholder = "Invalid Key";
                        setTimeout(() => field.classList.remove('error'), 400);
                    }
                };
                
                submit.onclick = verify;
                field.onkeydown = (e) => { if (e.key === 'Enter') verify(); };
            }, 100);

            // ── dragging ───────────────────────────────────────────────
            const header = document.getElementById('avery-header');
            let dragging = false, startX, startY;

            const onMouseMove = (e) => {
                if (!dragging) return;
                
                let left = e.clientX - startX;
                let top  = e.clientY - startY;
                
                // Clamp to viewport
                const viewportW = window.innerWidth;
                const viewportH = window.innerHeight;
                const rootW = this.root.offsetWidth;
                const rootH = this.root.offsetHeight;
                
                left = Math.min(viewportW - rootW, Math.max(0, left));
                top  = Math.min(viewportH - rootH, Math.max(0, top));
                
                this.root.style.left   = `${left}px`;
                this.root.style.top    = `${top}px`;
                this.root.style.right  = 'auto';
                this.root.style.bottom = 'auto';
            };

            const onMouseUp = () => {
                dragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.root.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease';
            };

            const setupDrag = (targetEl) => {
                targetEl.addEventListener('mousedown', (e) => {
                    if (e.target.closest('.d-hbtns') || e.target.closest('.av-key-box')) return;
                    dragging = true;
                    
                    this.root.style.transition = 'none';
                    
                    const rect = this.root.getBoundingClientRect();
                    this.root.style.top = `${rect.top}px`;
                    this.root.style.left = `${rect.left}px`;
                    this.root.style.transform = 'none';
                    this.root.style.right = 'auto';
                    this.root.style.bottom = 'auto';
                    
                    startX = e.clientX - rect.left;
                    startY = e.clientY - rect.top;
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                    e.preventDefault();
                });
            };

            setupDrag(header);
            setupDrag(this.root); // Allow dragging from the login panel background too

            // ── button wiring ─────────────────────────────────────────
            document.getElementById('av-btn-minimize').onclick = () => this.toggle();
            document.getElementById('av-btn-stop').onclick     = () => this.shutdown();
            document.getElementById('av-btn-settings').onclick = () => this.toggleSettings();

            // settings toggles — live update RUNTIME as the user flips them
            document.getElementById('av-tog-enroll').onchange = (e) => {
                RUNTIME.autoEnroll = e.target.checked;
                this.log(`Auto-enroll ${RUNTIME.autoEnroll ? 'enabled' : 'disabled'}`, 'info');
            };
            document.getElementById('av-tog-claim').onchange = (e) => {
                RUNTIME.autoClaim = e.target.checked;
                this.log(`Auto-claim ${RUNTIME.autoClaim ? 'enabled' : 'disabled'}`, 'info');
            };
            document.getElementById('av-tog-sound').onchange = (e) => {
                RUNTIME.playSound = e.target.checked;
                this.log(`Sound ${RUNTIME.playSound ? 'on' : 'off'}`, 'info');
            };
            document.getElementById('av-tog-delay').onchange = (e) => {
                RUNTIME.randomDelay = e.target.checked;
                this.log(`Random delay ${RUNTIME.randomDelay ? 'on' : 'off'}`, 'info');
            };

            // log section collapse/expand
            const logToggle = document.getElementById('av-log-toggle');
            const logBox    = document.getElementById('avery-logs');
            logToggle.classList.add('open');
            logBox.classList.add('open');
            logToggle.onclick = () => {
                const open = logBox.classList.toggle('open');
                logToggle.classList.toggle('open', open);
            };

            // keyboard shortcut to minimize
            document.addEventListener('keydown', (e) => {
                if (e.shiftKey && e.key === '.') this.toggle();
            });
        });
    },

        // flip minimized state
        toggle() {
            const minimized = this.root.classList.toggle('av-minimized');
            const btn = document.getElementById('av-btn-minimize');
            if (btn) {
                btn.title = minimized ? 'Expand (Shift+.)' : 'Minimize (Shift+.)';
                btn.classList.toggle('d-active', minimized);
            }
        },

        // open/close settings panel inline
        toggleSettings() {
            const panel = document.getElementById('av-settings-panel');
            const btn   = document.getElementById('av-btn-settings');
            if (!panel) return;
            this._settingsOpen = !this._settingsOpen;
            panel.classList.toggle('open', this._settingsOpen);
            btn.classList.toggle('d-active', this._settingsOpen);
        },

        // clean everything up on stop
        shutdown() {
            if (!RUNTIME.running) return;
            RUNTIME.running = false;
            this.log('Shutting down...', 'warn');
            
            // Step 1: Morph back to center
            this.root.classList.remove('av-ready', 'av-minimized');
            this.root.classList.add('av-closing');
            
            // Step 2: Spawn particles
            const colors = ['#5865f2', '#23a55a', '#f0b232', '#f23f43', '#ffffff'];
            for (let i = 0; i < 20; i++) {
                const p = document.createElement('div');
                p.className = 'av-farewell-particle';
                p.style.background = colors[Math.floor(Math.random() * colors.length)];
                p.style.left = '50%';
                p.style.top = '50%';
                p.style.setProperty('--px', `${(Math.random() - 0.5) * 300}px`);
                p.style.setProperty('--py', `${(Math.random() - 0.5) * 300}px`);
                p.style.animationDelay = `${Math.random() * 0.8}s`;
                p.style.width = p.style.height = `${4 + Math.random() * 6}px`;
                this.root.appendChild(p);
            }
            
            // Step 3: Set farewell text directly
            const splashText = this.root.querySelector('.av-splash-text');
            const splashSub  = this.root.querySelector('.av-splash-sub');
            if (splashText) {
                splashText.innerHTML = 'It was good seeing you! <span class="av-farewell-wave">👋</span>';
            }
            if (splashSub) splashSub.textContent = 'Until next time...';
            
            if (this.tickerId) clearInterval(this.tickerId);
            for (const fn of RUNTIME.cleanups) { try { fn(); } catch (_) {} }
            Patcher.clean();
            
            // Step 4: Final exit animation
            setTimeout(() => {
                this.root.classList.add('av-exit-final');
                setTimeout(() => {
                    document.getElementById('avery-styles')?.remove();
                    this.root?.remove();
                    window.averyLock = false;
                }, 1200);
            }, 3500);
        },

        // tick running tasks' progress every second
        startTicker() {
            if (this.tickerId) clearInterval(this.tickerId);
            this.tickerId = setInterval(() => {
                if (!RUNTIME.running) return clearInterval(this.tickerId);
                for (const [id, task] of this.tasks.entries()) {
                    if (task.status === 'RUNNING' && task.type !== 'ACHIEVEMENT') {
                        const cur = Math.min(task.cur + 1, task.max);
                        this.updateTask(id, { cur });
                    }
                }
            }, 1000);
        },

        updateTask(id, data) {
            const existing = this.tasks.get(id) || {};
            this.tasks.set(id, { ...existing, ...data });
            this.render();
        },

        removeTask(id) {
            this.tasks.delete(id);
            this.render();
        },

        // append a log line with colour-coding
        log(msg, type = 'info') {
            const box = document.getElementById('avery-logs');
            if (box) {
                const line = document.createElement('div');
                line.className = `d-log-msg av-log-${type}`;
                const t = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                line.innerHTML = `<span class="d-log-ts">${t}</span><span class="d-log-text">${msg}</span>`;
                box.appendChild(line);
                box.scrollTop = box.scrollHeight;
                // trim old lines
                while (box.children.length > CONFIG.MAX_LOG_ITEMS) box.firstChild.remove();
            }
            console.log(`[Avery] ${msg}`);
        },

        // rebuild task rows — Discord friend-list style
        render() {
            if (this._isPickerOpen) return;
            const container = document.getElementById('avery-content');
            if (!container) return;

            const badge = document.getElementById('av-task-count');
            if (badge) badge.textContent = this.tasks.size > 0 ? this.tasks.size : '';

            if (this.tasks.size === 0) {
                container.innerHTML = `
                    <div class="d-empty" style="padding: 48px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; opacity: 0.8;">
                        <div class="d-empty-img" style="width: 64px; height: 64px; border-radius: 50%; background: var(--bg-glass-light); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-glass);">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style="color: var(--text-muted);">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                            </svg>
                        </div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-header);">No Active Quests</div>
                        <div style="font-size: 13px; color: var(--text-muted); max-width: 200px; line-height: 1.4;">Tracker is scanning for eligible quests in the background...</div>
                    </div>`;
                return;
            }

            let html = '';
            for (const [id, t] of this.tasks.entries()) {
                const pct = t.max ? Math.min(100, Math.round((t.cur / t.max) * 100)) : 0;
                const progLabel = t.max ? `${Math.min(Math.floor(t.cur), t.max)} / ${t.max}` : '';

                let emoji = '🎮', avClass = 'game', statusDot = 'online';
                const isDone   = t.done   || t.status === 'COMPLETED' || t.status === 'CLAIMED';
                const isFailed = t.failed || t.status === 'FAILED';
                
                if      (isDone)   { emoji = '✅'; avClass = 'done';     statusDot = 'online'; }
                else if (isFailed) { emoji = '❌'; avClass = 'failed';   statusDot = 'dnd';    }
                else if (t.type === 'VIDEO' || t.type === 'WATCH_VIDEO') { emoji = '🎬'; avClass = 'video';    statusDot = 'online'; }
                else if (t.type === 'STREAM')      { emoji = '📡'; avClass = 'stream';   statusDot = 'busy';   }
                else if (t.type === 'ACHIEVEMENT') { emoji = '🏆'; avClass = 'achieve';  statusDot = 'busy';   }
                else if (t.type === 'ACTIVITY')    { emoji = '🕹️'; avClass = 'activity'; statusDot = 'busy';   }

                const avatarContent = t.image ? `<img src="${t.image}" alt="">` : emoji;

                let subText = 'Running...';
                if      (isDone)                    subText = t.status === 'CLAIMED' ? 'Reward claimed' : 'Quest completed';
                else if (isFailed)                  subText = 'Failed — skipped';
                else if (t.pending || t.actionRequired) subText = 'Waiting to enroll';

                const fillClass = isDone ? 'green' : (isFailed ? 'red' : '');
                let rowClass = 'd-row';
                if (isDone)   rowClass += ' d-row-done';
                if (isFailed) rowClass += ' d-row-failed';

                let actionBtn = '';
                if (t.claimable) {
                    actionBtn = `<button class="d-btn d-btn-green" data-id="${id}">Claim</button>`;
                } else if (t.actionRequired === 'ENROLL') {
                    actionBtn = `<button class="d-btn d-btn-brand" data-id="${id}">Enroll</button>`;
                }

                html += `
                    <div class="${rowClass}" data-id="${id}">
                        <div class="d-avatar ${avClass}">
                            ${avatarContent}
                            <div class="d-status-badge ${statusDot}"></div>
                        </div>
                        <div class="d-row-body">
                            <div class="d-row-name">${escapeHtml(t.name)}</div>
                            <div class="d-row-sub">${subText}</div>
                            ${t.max ? `
                            <div class="d-prog">
                                <div class="d-prog-track">
                                    <div class="d-prog-fill ${fillClass}" style="width:${pct}%"></div>
                                </div>
                                <span class="d-prog-time">${progLabel}</span>
                            </div>` : ''}
                        </div>
                        ${actionBtn}
                    </div>`;
            }
            container.innerHTML = html;

            // wire claim buttons
            container.querySelectorAll('.d-btn-green[data-id]').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const taskId = btn.getAttribute('data-id');
                    const task   = this.tasks.get(taskId);
                    if (!task) return;
                    btn.disabled    = true;
                    btn.textContent = '...';
                    try {
                        await Tasks.claimReward(taskId);
                        this.log(`Claimed "${task.name}" 🎉`, 'success');
                        this.updateTask(taskId, { claimable: false, done: true, status: 'CLAIMED' });
                        setTimeout(() => this.removeTask(taskId), 2000);
                    } catch (err) {
                        this.log(`Couldn't claim "${task.name}" — try manually`, 'err');
                        btn.textContent = 'Retry';
                        btn.disabled    = false;
                    }
                };
            });

            // wire enroll buttons
            container.querySelectorAll('.d-btn-brand[data-id]').forEach(btn => {
                btn.onclick = () => {
                    if (Mods.Router) Mods.Router.transitionTo('/quest-home');
                };
            });
        },

        // full-panel quest picker — Glassmorphism modern style
        showQuestPicker(quests) {
            this._isPickerOpen = true;
            return new Promise((resolve) => {
                const container = document.getElementById('avery-content');
                if (!container) {
                    this._isPickerOpen = false;
                    return resolve({ selectedQuests: new Set(), autoEnroll: false, autoClaim: false, playSound: false, randomDelay: false });
                }

                const items = quests.map(q => {
                    const icon = q.config?.application?.icon;
                    const asset = q.config?.assets?.banner || q.config?.assets?.thumbnail;
                    let image = null;
                    if (icon) image = `https://cdn.discordapp.com/app-icons/${q.config.application.id}/${icon}.webp?size=128`;
                    else if (asset) image = `https://cdn.discordapp.com/assets/quests/${q.id}/${asset}.webp?size=128`;
                    return { id: q.id, name: q.config?.messages?.questName ?? 'Unknown Quest', image };
                });
                const selected = new Set(items.map(i => i.id));

                let html = `<div id="av-picker-wrap" style="display: flex; flex-direction: column; gap: 8px;">
                    <div class="d-picker-head" style="animation: av-list-item-entry 0.4s ease both;">Select Available Quests</div>`;

                items.forEach((it, index) => {
                    const isSel = selected.has(it.id);
                    const avatar = it.image ? `<img src="${it.image}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;transition: transform 0.3s ease;">` : `<div class="d-avatar-fallback" style="width:32px;height:32px;background:var(--bg-glass-heavy);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;">🎮</div>`;
                    html += `
                    <div class="d-picker-row ${isSel ? 'selected' : ''}" data-id="${it.id}" style="animation-delay: ${index * 0.05}s">
                        <div class="d-picker-cb">
                            <svg class="d-picker-tick" width="12" height="12" viewBox="0 0 24 24" fill="white">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" stroke="white" stroke-width="2"/>
                            </svg>
                        </div>
                        ${avatar}
                        <span class="d-picker-label">${escapeHtml(it.name)}</span>
                    </div>`;
                });

                html += `
                    <div class="d-picker-footer" style="animation: av-list-item-entry 0.5s ease both; animation-delay: ${items.length * 0.05}s">
                        <button class="d-btn d-btn-brand" id="av-pk-start">
                            Start (${selected.size})
                        </button>
                        <button class="d-btn d-btn-ghost" id="av-pk-cancel">Cancel</button>
                    </div>
                </div>`;

                container.innerHTML = html;

                const startBtn = document.getElementById('av-pk-start');
                container.querySelectorAll('.d-picker-row').forEach(row => {
                    row.onclick = () => {
                        const id = row.getAttribute('data-id');
                        if (selected.has(id)) {
                            selected.delete(id);
                            row.classList.remove('selected');
                        } else {
                            selected.add(id);
                            row.classList.add('selected');
                        }
                        if (startBtn) startBtn.textContent = `Start ${selected.size > 0 ? `(${selected.size})` : ''}`;
                    };
                });

                document.getElementById('av-pk-start').onclick = () => {
                    this._isPickerOpen = false;
                    resolve({
                        selectedQuests: new Set(selected),
                        autoEnroll:  RUNTIME.autoEnroll,
                        autoClaim:   RUNTIME.autoClaim,
                        playSound:   RUNTIME.playSound,
                        randomDelay: RUNTIME.randomDelay
                    });
                };

                document.getElementById('av-pk-cancel').onclick = () => {
                    this._isPickerOpen = false;
                    this.shutdown();
                    resolve({ selectedQuests: new Set(), autoEnroll: false, autoClaim: false, playSound: false, randomDelay: false });
                };
            });
        }

    };  // end Logger

    function escapeHtml(str) { return str.replace(/[&<>]/g, function(m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }

    /* ── request queue ──────────────────────────────────────────── */
    const Traffic = {
        queue: [], processing: false,
        async enqueue(url, body) {
            if (!RUNTIME.running) return Promise.reject(new Error("Stopped"));
            return new Promise((resolve, reject) => {
                this.queue.push({ url, body, resolve, reject, attempts: 0 });
                this.process();
            });
        },
        async process() {
            if (this.processing || this.queue.length === 0) return;
            this.processing = true;
            while (this.queue.length > 0) {
                if (!RUNTIME.running) {
                    this.queue.forEach(req => req.reject(new Error("Shutdown")));
                    this.queue = [];
                    this.processing = false;
                    return;
                }
                const req = this.queue.shift();
                try {
                    const res = await Mods.API.post({ url: req.url, body: req.body });
                    req.resolve(res);
                } catch (e) {
                    const err = ErrorHandler.classify(e);
                    if (err.isRetryable && req.attempts < SYS.MAX_RETRIES) {
                        req.attempts++;
                        const delay = (e.body?.retry_after ?? Math.pow(2, req.attempts)) * 1000;
                        const isGlobal = e.body?.global === true;
                        Logger.log(`[Network] Retry ${req.attempts}/${SYS.MAX_RETRIES} in ${(delay / 1000).toFixed(1)}s (HTTP ${err.status})`, 'warn');
                        const retryJitter = rnd(200, 800);
                        if (isGlobal) {
                            this.queue.unshift(req);
                            await sleep(delay + retryJitter);
                        } else {
                            setTimeout(() => { if (RUNTIME.running) { this.queue.push(req); this.process(); } }, delay + retryJitter);
                        }
                    } else if (err.isClientError) {
                        Logger.log(`[Network] HTTP ${err.status}: ${req.url}`, 'debug');
                        req.reject(e);
                    } else {
                        Logger.log(`[Network] Request to ${req.url} failed: ${err.message}`, 'err');
                        req.reject(e);
                    }
                }
                await sleep(rnd(1200, 1800));
            }
            this.processing = false;
        }
    };

    /* ── store patching ─────────────────────────────────────────── */
    let Mods = {};
    const Patcher = {
        games: [], realGames: null, realPID: null, active: false,
        init(Store) { if (Store) { this.realGames = Store.getRunningGames; this.realPID = Store.getGameForPID; } },
        toggle(on) {
            if (on && !this.active) {
                Mods.RunStore.getRunningGames = () => [...this.realGames.call(Mods.RunStore), ...this.games];
                Mods.RunStore.getGameForPID = (pid) => this.games.find(g => g.pid === pid) || this.realPID.call(Mods.RunStore, pid);
                this.active = true;
            } else if (!on && this.active) {
                Mods.RunStore.getRunningGames = this.realGames;
                Mods.RunStore.getGameForPID = this.realPID;
                this.active = false;
            }
        },
        add(g) { if (!this.games.some(x => x.pid === g.pid)) { this.games.push(g); this.toggle(true); this.dispatch(g, []); this.rpc(g); } },
        remove(g) {
            const before = this.games.length;
            this.games = this.games.filter(x => x.pid !== g.pid);
            if (this.games.length === before) return;
            this.dispatch([], [g]);
            if (!this.games.length) { this.toggle(false); this.rpc(null); } else { this.rpc(this.games[0]); }
        },
        dispatch(added, removed) { Mods.Dispatcher?.dispatch({ type: CONST.EVT.GAME, added: added ? [added] : [], removed: removed ? [removed] : [], games: Mods.RunStore.getRunningGames() }); },
        rpc(g) { if (CONFIG.HIDE_ACTIVITY && g) return; try { Mods.Dispatcher?.dispatch({ type: CONST.EVT.RPC, socketId: null, pid: g ? g.pid : 9999, activity: g ? { application_id: g.id, name: g.name, type: 0, details: null, state: null, timestamps: { start: g.start }, icon: g.icon, assets: null } : null }); } catch (e) { Logger.log(`[RPC Cleanup] ${e.message}`, 'debug'); } },
        clean() { this.games = []; this.toggle(false); this.rpc(null); }
    };

    /* ── task handlers (same as before, compact but complete) ───── */
    const Tasks = {
        skipped: new Set(),
        sanitize(name) { return name.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, " "); },
        detectType(cfg, applicationId) {
            const taskKeys = Object.keys(cfg.tasks);
            const typeMap = [
                { key: "PLAY", type: "GAME" }, { key: "STREAM", type: "STREAM" }, { key: "VIDEO", type: "WATCH_VIDEO" },
                { key: "ACHIEVEMENT_IN_ACTIVITY", type: "ACHIEVEMENT" }, { key: "ACTIVITY", type: "ACTIVITY" }
            ];
            for (const { key, type } of typeMap) {
                const keyName = taskKeys.find(k => k.includes(key));
                if (keyName) return { type, keyName, target: cfg.tasks[keyName]?.target ?? 0 };
            }
            if (applicationId) return { type: "GAME", keyName: "PLAY_ON_DESKTOP", target: cfg.tasks[taskKeys[0]]?.target ?? 0 };
            return null;
        },
        async fetchGameData(appId, appName) {
            try {
                const res = await Mods.API.get({ url: `/applications/public?application_ids=${appId}` });
                const appData = res?.body?.[0];
                const exeEntry = appData?.executables?.find(x => x.os === "win32");
                const rawExe = exeEntry ? exeEntry.name.replace(">", "") : `${this.sanitize(appName)}.exe`;
                const cleanName = this.sanitize(appData?.name || appName);
                const iconUrl = appData?.icon ? `https://cdn.discordapp.com/app-icons/${appId}/${appData.icon}.webp?size=128` : null;
                return { name: appData?.name || appName, icon: appData?.icon, iconUrl, exeName: rawExe, cmdLine: `C:\\Program Files\\${cleanName}\\${rawExe}`, exePath: `c:/program files/${cleanName.toLowerCase()}/${rawExe}`, id: appId };
            } catch (e) {
                const cleanName = this.sanitize(appName);
                const safeExe = `${cleanName.replace(/\s+/g, "")}.exe`;
                return { name: appName, exeName: safeExe, cmdLine: `C:\\Program Files\\${cleanName}\\${safeExe}`, exePath: `c:/program files/${cleanName.toLowerCase()}/${safeExe}`, id: appId, iconUrl: null };
            }
        },
        async claimReward(questId) {
            return await Mods.API.post({ url: `/quests/${questId}/claim-reward`, body: { platform: 0, location: 11, is_targeted: false, metadata_raw: null, metadata_sealed: null, traffic_metadata_raw: null, traffic_metadata_sealed: null } });
        },
        failTask(q, t, reason) {
            const currentProgress = Logger.tasks.get(q.id)?.cur ?? 0;
            Logger.updateTask(q.id, { name: t.name, type: t.type, cur: currentProgress, max: t.target, status: "FAILED" });
            Logger.log(`[Task] Aborted "${t.name}": ${reason}`, 'err');
            Tasks.skipped.add(q.id);
            setTimeout(() => Logger.removeTask(q.id), 2000);
        },
        async VIDEO(q, t, s) {
            let cur = s?.progress?.[t.keyName]?.value ?? s?.progress?.[t.type]?.value ?? 0;
            let failCount = 0;
            Logger.updateTask(q.id, { name: t.name, type: "VIDEO", cur, max: t.target, status: "RUNNING" });
            const startTime = Date.now();
            let calls = 0;
            if (cur === 0) {
                await sleep(rnd(200, 350));
                cur = 0.2 + (Math.random() * 0.05);
                try { await Traffic.enqueue(`/quests/${q.id}/video-progress`, { timestamp: Number(cur.toFixed(6)) }); calls++; } catch (e) { Logger.log(`[Video] Initial ping failed: ${e.message}`, 'debug'); }
            }
            while (cur < t.target && RUNTIME.running) {
                const delayMs = rnd(3500, 4750);
                await sleep(delayMs);
                const elapsedSec = (delayMs / 1000) + (Math.random() * 0.02 - 0.01);
                cur += elapsedSec;
                const payloadTs = Number(Math.min(t.target, cur).toFixed(6));
                try {
                    const r = await Traffic.enqueue(`/quests/${q.id}/video-progress`, { timestamp: payloadTs });
                    calls++;
                    const serverVal = r?.body?.progress?.[t.keyName]?.value ?? r?.body?.progress?.WATCH_VIDEO?.value;
                    if (serverVal > cur) cur = Math.min(t.target, serverVal);
                    if (r?.body?.completed_at) break;
                    failCount = 0;
                } catch (e) {
                    failCount++;
                    const err = ErrorHandler.classify(e);
                    if (err.isClientError) { Logger.log(`[Task] Video quest unavailable (HTTP ${err.status}). Skipping.`, 'warn'); return Tasks.failTask(q, t, `Client Error ${err.status}`); }
                    if (failCount >= SYS.MAX_TASK_FAILURES) return Tasks.failTask(q, t, 'Too many network failures');
                    Logger.log(`[Task] VIDEO progress failed (${failCount}/${SYS.MAX_TASK_FAILURES}): ${err.message}`, 'debug');
                }
                Logger.updateTask(q.id, { name: t.name, type: "VIDEO", cur, max: t.target, status: "RUNNING" });
                if (Date.now() - startTime > SYS.MAX_TIME) return Tasks.failTask(q, t, 'Timeout exceeded');
            }
            if (RUNTIME.running) { Logger.log(`[Task] VIDEO "${t.name}" done in ${calls} API calls`, 'debug'); Tasks.finish(q, t); }
        },
        GAME(q, t, s) { return Tasks.generic(q, t, "GAME", "PLAY_ON_DESKTOP", s); },
        STREAM(q, t, s) { return Tasks.generic(q, t, "STREAM", "STREAM_ON_DESKTOP", s); },
        async generic(q, t, type, key, s) {
            if (!RUNTIME.running) return;
            const gameData = await this.fetchGameData(t.appId, t.name);
            return new Promise(resolve => {
                const pid = rnd(2500, 12500) * 4;
                const game = { id: gameData.id, name: gameData.name, icon: gameData.icon, pid, pidPath: [pid], processName: gameData.name, start: Date.now(), exeName: gameData.exeName, exePath: gameData.exePath, cmdLine: gameData.cmdLine, executables: [{ os: 'win32', name: gameData.exeName, is_launcher: false }], windowHandle: 0, fullscreenType: 0, overlay: true, sandboxed: false, hidden: false, isLauncher: false };
                let cleanupHook, cleaned = false, safetyTimer;
                if (type === "STREAM") {
                    const real = Mods.StreamStore?.getStreamerActiveStreamMetadata;
                    if (Mods.StreamStore) Mods.StreamStore.getStreamerActiveStreamMetadata = () => ({ id: gameData.id, pid, sourceName: gameData.name });
                    cleanupHook = () => { if (Mods.StreamStore && real) Mods.StreamStore.getStreamerActiveStreamMetadata = real; };
                } else { Patcher.add(game); cleanupHook = () => Patcher.remove(game); }
                Logger.updateTask(q.id, { name: t.name, type, cur: 0, max: t.target, status: "RUNNING", image: gameData.iconUrl });
                Logger.log(`[Task] Started ${type}: ${gameData.name}`, 'info');
                const finish = () => {
                    if (cleaned) return;
                    cleaned = true;
                    clearTimeout(safetyTimer);
                    try { cleanupHook(); } catch (e) { Logger.log(`[Task] Cleanup: ${e.message}`, 'debug'); }
                    try { Mods.Dispatcher?.unsubscribe(CONST.EVT.HEARTBEAT, check); } catch (e) { Logger.log(`[Dispatcher] Unsubscribe failed: ${e.message}`, 'debug'); }
                    RUNTIME.cleanups.delete(finish);
                };
                safetyTimer = setTimeout(() => { if (RUNTIME.running) Tasks.failTask(q, t, 'Timeout exceeded (25m)'); finish(); resolve(); }, SYS.MAX_TIME);
                const check = (d) => {
                    if (!RUNTIME.running) { finish(); resolve(); return; }
                    if (d?.questId !== q.id) return;
                    const prog = d.userStatus?.progress?.[key]?.value ?? d.userStatus?.streamProgressSeconds ?? 0;
                    Logger.updateTask(q.id, { name: t.name, type, cur: prog, max: t.target, status: "RUNNING" });
                    if (prog >= t.target) { finish(); Tasks.finish(q, t); resolve(); }
                };
                Mods.Dispatcher?.subscribe(CONST.EVT.HEARTBEAT, check);
                RUNTIME.cleanups.add(finish);
            });
        },
        _relayChecked: false, _relayUrl: 'http://127.0.0.1:43210',
        async _probeRelay() {
            if (this._relayChecked) return this._relayAvailable;
            this._relayChecked = true;
            try {
                const r = await Promise.race([fetch(`${this._relayUrl}/health`, { method: 'GET' }), new Promise((_, reject) => setTimeout(() => reject(new Error('probe timeout')), 800))]);
                this._relayAvailable = r.ok;
                if (r.ok) Logger.log('[Bypass] Silence Relay detected on 127.0.0.1:43210.', 'info');
            } catch (_) { this._relayAvailable = false; }
            return this._relayAvailable;
        },
        async _bypassPost(url, headers, jsonBody) {
            if (await this._probeRelay()) {
                const r = await fetch(`${this._relayUrl}/proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, headers, body: jsonBody }) });
                if (!r.ok) throw { status: r.status, body: await r.text() };
                const result = await r.json();
                if (!result.ok) throw { status: result.status, body: result.body };
                return result;
            }
            try {
                const helper = window.VencordNative?.pluginHelpers?.OrionQuests;
                if (helper) {
                    const u = new URL(url); const appId = u.hostname.split('.')[0]; const questId = headers['X-Discord-Quest-ID']; const referrer = headers['Referer'];
                    if (u.pathname.endsWith('/acf/authorize')) {
                        const { code } = JSON.parse(jsonBody);
                        const r = await helper.discordsaysAuthorize({ appId, questId, authCode: code, referrer });
                        if (!r.ok) throw { status: r.status, body: r.body };
                        return { ok: true, status: r.status, body: r.body };
                    }
                    if (u.pathname.endsWith('/acf/quest/progress')) {
                        const { progress } = JSON.parse(jsonBody);
                        const token = headers['X-Auth-Token'];
                        const r = await helper.discordsaysProgress({ appId, questId, token, target: progress, referrer });
                        if (!r.ok) throw { status: r.status, body: r.body };
                        return { ok: true, status: r.status, body: r.body };
                    }
                }
            } catch (e) { if (e?.status) throw e; Logger.log(`[Bypass] VencordNative path errored: ${e?.message ?? e}`, 'debug'); }
            const dn = window.DiscordNative;
            if (dn) {
                const probes = [() => dn.http?.makeRequest, () => dn.fileManager?.fetchURL, () => dn.processUtils?.fetch, () => dn.app?.makeRequest];
                for (const probe of probes) {
                    try {
                        const fn = probe();
                        if (typeof fn === 'function') {
                            const r = await fn.call(dn, { method: 'POST', url, headers, body: jsonBody });
                            if (r && (r.status || r.statusCode)) {
                                const status = r.status ?? r.statusCode;
                                return { ok: status >= 200 && status < 300, status, body: r.body ?? r.responseText ?? '' };
                            }
                        }
                    } catch (_) { }
                }
            }
            const res = await fetch(url, { method: 'POST', headers, body: jsonBody });
            const body = await res.text();
            if (!res.ok) throw { status: res.status, body };
            return { ok: true, status: res.status, body };
        },
        async bypassAchievement(q, t) {
            const appId = q.config?.application?.id;
            if (!appId) return false;
            try {
                Logger.log(`[Bypass] Trying Discord Says auth flow for "${t.name}"...`, 'info');
                const authRes = await Mods.API.post({ url: '/oauth2/authorize', query: { response_type: 'code', client_id: appId, scope: 'identify applications.commands applications.entitlements' }, body: { permissions: '0', authorize: true, integration_type: 1, location_context: { guild_id: '10000', channel_id: '10000', channel_type: 10000 } } });
                const location = authRes?.body?.location;
                if (!location) throw new Error('no location');
                const authCode = new URL(location).searchParams.get('code');
                if (!authCode) throw new Error('no code');
                const ticketRes = await Mods.API.post({ url: `/applications/${appId}/proxy-tickets`, body: {} });
                const proxyTicket = ticketRes?.body?.ticket;
                if (!proxyTicket) throw new Error('no proxy ticket');
                const referrer = `https://${appId}.discordsays.com/?instance_id=example-cl-instance&platform=desktop&discord_proxy_ticket=${encodeURIComponent(proxyTicket)}`;
                const dsAuthRes = await Tasks._bypassPost(`https://${appId}.discordsays.com/.proxy/acf/authorize`, { 'Content-Type': 'application/json', 'X-Auth-Token': '', 'X-Discord-Quest-ID': q.id, 'Referer': referrer }, JSON.stringify({ code: authCode }));
                const { token: dsToken } = JSON.parse(dsAuthRes.body);
                if (!dsToken) throw new Error('no discordsays token');
                await Tasks._bypassPost(`https://${appId}.discordsays.com/.proxy/acf/quest/progress`, { 'Content-Type': 'application/json', 'X-Auth-Token': dsToken, 'X-Discord-Quest-ID': q.id, 'Referer': referrer }, JSON.stringify({ progress: t.target }));
                Logger.log(`[Bypass] Success — "${t.name}" completed via Discord Says.`, 'success');
                try {
                    const tokens = await Mods.API.get({ url: '/oauth2/tokens' });
                    const grant = (tokens?.body || []).find(tk => tk.application?.id === appId);
                    if (grant) await Mods.API.del({ url: `/oauth2/tokens/${grant.id}` });
                } catch (e) { Logger.log(`[Bypass] Deauthorize cleanup non-fatal: ${e?.message}`, 'debug'); }
                return true;
            } catch (e) {
                if (e instanceof TypeError && /failed to fetch|networkerror/i.test(e.message)) { Logger.log(`[Bypass] Discord's CSP blocks the script. Skipping.`, 'warn'); return false; }
                const code = e?.body?.code;
                if (code === 50165) { Logger.log(`[Bypass] "${t.name}" age-gated/delisted.`, 'warn'); return false; }
                Logger.log(`[Bypass] Failed: ${e?.status ? `HTTP ${e.status}` : e?.message || 'unknown'}`, 'warn');
                return false;
            }
        },
        async ACHIEVEMENT(q, t) {
            Logger.updateTask(q.id, { name: t.name, type: "ACHIEVEMENT", cur: 0, max: t.target, status: "RUNNING" });
            let chan = null;
            try {
                chan = Mods.ChanStore?.getSortedPrivateChannels()?.[0]?.id ?? Object.values(Mods.GuildChanStore?.getAllGuilds() ?? {}).find(g => g?.VOCAL?.length)?.VOCAL?.[0]?.channel?.id;
            } catch (e) { Logger.log(`[Achievement] Channel lookup: ${e.message}`, 'debug'); }
            if (chan) {
                Logger.log(`[Task] Attempting heartbeat spoofing for "${t.name}"...`, 'info');
                const key = `call:${chan}:${rnd(1000, 9999)}`;
                let cur = 0, failCount = 0;
                while (cur < t.target && RUNTIME.running) {
                    try {
                        const r = await Traffic.enqueue(`/quests/${q.id}/heartbeat`, { stream_key: key, terminal: false });
                        cur = r?.body?.progress?.[t.keyName]?.value ?? r?.body?.progress?.ACHIEVEMENT_IN_ACTIVITY?.value ?? cur;
                        Logger.updateTask(q.id, { name: t.name, type: "ACHIEVEMENT", cur, max: t.target, status: "RUNNING" });
                        failCount = 0;
                        if (cur >= t.target) { try { await Traffic.enqueue(`/quests/${q.id}/heartbeat`, { stream_key: key, terminal: true }); } catch (_) { } break; }
                    } catch (e) {
                        failCount++;
                        const err = ErrorHandler.classify(e);
                        if (err.isClientError) { Logger.log(`[Achievement] Heartbeat rejected (HTTP ${err.status}). Falling back.`, 'warn'); break; }
                        if (failCount >= SYS.MAX_TASK_FAILURES) { Logger.log(`[Achievement] Too many failures. Falling back.`, 'warn'); break; }
                    }
                    await sleep(rnd(19000, 22000));
                }
                if (cur >= t.target && RUNTIME.running) return Tasks.finish(q, t);
            }
            if (!RUNTIME.running) return;
            const bypassed = await Tasks.bypassAchievement(q, t);
            if (bypassed) return Tasks.finish(q, t);
            Logger.log(`[Task] Skipping "${t.name}" — no auto-completion path worked.`, 'warn');
            return Tasks.failTask(q, t, 'Cannot auto-complete');
        },
        async ACTIVITY(q, t) {
            let chan = null;
            try {
                chan = Mods.ChanStore?.getSortedPrivateChannels()?.[0]?.id ?? Object.values(Mods.GuildChanStore?.getAllGuilds() ?? {}).find(g => g?.VOCAL?.length)?.VOCAL?.[0]?.channel?.id;
            } catch (e) { Logger.log(`[Task] ACTIVITY channel lookup error: ${e.message}`, 'debug'); }
            if (!chan) return Tasks.failTask(q, t, 'No voice channel found');
            const key = `call:${chan}:${rnd(1000, 9999)}`;
            let cur = 0, failCount = 0;
            Logger.updateTask(q.id, { name: t.name, type: "ACTIVITY", cur, max: t.target, status: "RUNNING" });
            const startTime = Date.now();
            while (cur < t.target && RUNTIME.running) {
                try {
                    const r = await Traffic.enqueue(`/quests/${q.id}/heartbeat`, { stream_key: key, terminal: false });
                    cur = r?.body?.progress?.[t.keyName]?.value ?? r?.body?.progress?.PLAY_ACTIVITY?.value ?? cur + 20;
                    Logger.updateTask(q.id, { name: t.name, type: "ACTIVITY", cur, max: t.target, status: "RUNNING" });
                    failCount = 0;
                    if (cur >= t.target) { try { await Traffic.enqueue(`/quests/${q.id}/heartbeat`, { stream_key: key, terminal: true }); } catch (e) { Logger.log(`[ACTIVITY] Final heartbeat failed: ${e?.message}`, 'debug'); } break; }
                } catch (e) {
                    failCount++;
                    const err = ErrorHandler.classify(e);
                    if (err.isClientError) { Logger.log(`[Task] Activity quest unavailable (HTTP ${err.status}). Skipping.`, 'warn'); return Tasks.failTask(q, t, `Client Error ${err.status}`); }
                    if (failCount >= SYS.MAX_TASK_FAILURES) return Tasks.failTask(q, t, 'Too many network failures');
                    Logger.log(`[Task] ACTIVITY heartbeat failed (${failCount}/${SYS.MAX_TASK_FAILURES}): ${err.message}`, 'debug');
                }
                if (Date.now() - startTime > SYS.MAX_TIME) return Tasks.failTask(q, t, 'Timeout exceeded');
                await sleep(rnd(19000, 22000));
            }
            if (RUNTIME.running && cur >= t.target) Tasks.finish(q, t);
        },
        async finish(q, t) {
            Logger.updateTask(q.id, { name: t.name, type: t.type, cur: t.target, max: t.target, status: "COMPLETED" });
            Logger.log(`[Task] Completed "${t.name}"!`, 'success');
            Sound.play('tick');
            try { if (typeof Notification !== 'undefined' && Notification.permission === "granted") new Notification("Avery: Quest Completed", { body: t.name, icon: "https://cdn.discordapp.com/emojis/1120042457007792168.webp", tag: `avery-${q.id}` }); } catch (e) { }
            if (RUNTIME.autoClaim) {
                try {
                    await sleep(rnd(2500, 6000));
                    if (!RUNTIME.running) return;
                    const claimRes = await this.claimReward(q.id);
                    if (claimRes?.body?.claimed_at) {
                        Logger.log(`[Claim] Reward for "${t.name}" claimed automatically!`, 'success');
                        Logger.updateTask(q.id, { name: t.name, type: t.type, cur: t.target, max: t.target, status: "CLAIMED" });
                        setTimeout(() => Logger.removeTask(q.id), 2000);
                        return;
                    }
                } catch (e) {
                    const needsCaptcha = e?.body?.captcha_key || e?.body?.captcha_sitekey;
                    if (needsCaptcha) Logger.log(`[Claim] Captcha required for "${t.name}". Use UI button.`, 'warn');
                    else Logger.log(`[Claim] Auto-claim failed for "${t.name}": ${e?.body?.message ?? e?.message}`, 'err');
                }
            }
            Logger.updateTask(q.id, { name: t.name, type: t.type, cur: t.target, max: t.target, status: "COMPLETED", claimable: true, questId: q.id });
        }
    };

    /* ── webpack module extraction ─────────────────────────────── */
    function loadModules() {
        try {
            if (typeof window.Vencord !== 'undefined' && window.Vencord.Webpack) {
                Logger.log('[System] Vencord detected. Using Vencord Webpack API...', 'info');
                const W = window.Vencord.Webpack;
                let routerModule;
                try {
                    const m = W.findByCode('transitionTo -');
                    if (m) {
                        for (const prop of [m, m.default, ...Object.values(m)]) {
                            if (typeof prop === 'function' && prop.toString().includes('transitionTo -')) { routerModule = { transitionTo: prop }; break; }
                        }
                    }
                } catch (e) { }
                Mods = {
                    QuestStore: W.findStore('QuestStore') || W.findStore('QuestsStore'),
                    RunStore: W.findStore('RunningGameStore'),
                    StreamStore: W.findStore('ApplicationStreamingStore'),
                    ChanStore: W.findStore('ChannelStore'),
                    GuildChanStore: W.findStore('GuildChannelStore'),
                    Dispatcher: W.Common?.FluxDispatcher || W.findByProps('dispatch', 'subscribe', 'flushWaitQueue'),
                    API: W.Common?.RestAPI || W.findByProps('get', 'post', 'del'),
                    Router: routerModule
                };
                const required = ['QuestStore', 'API', 'Dispatcher', 'RunStore'];
                const missing = required.filter(k => !Mods[k]);
                if (missing.length === 0) {
                    const optional = ['StreamStore', 'ChanStore', 'GuildChanStore', 'Router'];
                    optional.forEach(k => { if (!Mods[k]) Logger.log(`[System] Optional module '${k}' not found. Features may be limited.`, 'warn'); });
                    Patcher.init(Mods.RunStore);
                    return true;
                }
                Logger.log(`[System] Vencord extraction missed: ${missing.join(', ')}. Falling back to native...`, 'warn');
            }
            if (typeof webpackChunkdiscord_app === 'undefined') throw new Error("Webpack chunk not found");
            let req;
            webpackChunkdiscord_app.push([[Symbol()], {}, (r) => { const cur = Object.keys(req?.c || {}).length; const incoming = Object.keys(r?.c || {}).length; if (incoming > cur) req = r; }]);
            webpackChunkdiscord_app.pop();
            if (!req?.c) throw new Error("Module registry not available");
            const modules = Object.values(req.c);
            function findStore(storeName) {
                for (const m of modules) {
                    try {
                        const exp = m?.exports;
                        if (!exp || typeof exp !== 'object') continue;
                        for (const key of Object.keys(exp)) {
                            const prop = exp[key];
                            if (prop && typeof prop === 'object' && prop.__proto__?.constructor?.displayName === storeName) return prop;
                        }
                    } catch { }
                }
                return undefined;
            }
            function findDispatcher() {
                for (const m of modules) {
                    try {
                        const exp = m?.exports;
                        if (!exp || typeof exp !== 'object') continue;
                        for (const key of Object.keys(exp)) {
                            const prop = exp[key];
                            if (prop && prop._subscriptions && typeof prop.subscribe === 'function' && typeof prop.dispatch === 'function' && typeof prop.__proto__?.flushWaitQueue === 'function') return prop;
                        }
                    } catch { }
                }
                return undefined;
            }
            function findAPI() {
                for (const m of modules) {
                    try {
                        const exp = m?.exports;
                        if (!exp || typeof exp !== 'object') continue;
                        for (const key of Object.keys(exp)) {
                            const prop = exp[key];
                            if (prop && typeof prop.get === 'function' && typeof prop.post === 'function' && typeof prop.del === 'function' && !prop._dispatcher) return prop;
                        }
                    } catch { }
                }
                return undefined;
            }
            function findRouter() {
                for (const m of modules) {
                    try {
                        const exp = m?.exports;
                        if (!exp) continue;
                        for (const prop of [exp, exp.default, ...Object.values(exp)]) {
                            if (typeof prop === 'function' && prop.toString().includes('transitionTo -')) return { transitionTo: prop };
                        }
                    } catch { }
                }
                return undefined;
            }
            Mods = {
                QuestStore: findStore('QuestStore'),
                RunStore: findStore('RunningGameStore'),
                StreamStore: findStore('ApplicationStreamingStore'),
                ChanStore: findStore('ChannelStore'),
                GuildChanStore: findStore('GuildChannelStore'),
                Dispatcher: findDispatcher(),
                API: findAPI(),
                Router: findRouter()
            };
            const required = ['QuestStore', 'API', 'Dispatcher', 'RunStore'];
            const missing = required.filter(k => !Mods[k]);
            if (missing.length > 0) throw new Error(`Core modules not found: ${missing.join(', ')}`);
            const optional = ['StreamStore', 'ChanStore', 'GuildChanStore', 'Router'];
            optional.forEach(k => { if (!Mods[k]) Logger.log(`[System] Optional module '${k}' not found. Features may be limited.`, 'warn'); });
            Patcher.init(Mods.RunStore);
            return true;
        } catch (e) { Logger.log(`[System] Module loading error: ${e.message ?? e}`, 'err'); console.error(e); return false; }
    }

    /* ── main loop ─────────────────────────────────────────────── */
    async function runConcurrent(tasks, limit) {
        const executing = new Set();
        for (const task of tasks) {
            if (!RUNTIME.running) break;
            const p = task().finally(() => executing.delete(p));
            executing.add(p);
            await sleep(rnd(1500, 4000));
            if (executing.size >= limit) await Promise.race(executing);
        }
        return Promise.allSettled(executing);
    }

    async function main() {
        await Logger.init();
        if (!loadModules()) return Logger.log('[System] Failed to load Discord modules. Aborting.', 'err');
        const getQuests = () => { const q = Mods.QuestStore.quests; return q instanceof Map ? [...q.values()] : Object.values(q); };
        let quests = getQuests().filter(q => !q.userStatus?.completedAt && new Date(q.config?.expiresAt).getTime() > Date.now() && q.id !== CONST.ID && !Tasks.skipped.has(q.id));
        if (!quests.length) { Logger.log('[System] All available quests are completed!', 'success'); return Logger.shutdown(); }
        const pickerResult = await Logger.showQuestPicker(quests);
        if (!RUNTIME.running) return;
        RUNTIME.autoEnroll = pickerResult.autoEnroll;
        RUNTIME.autoClaim = pickerResult.autoClaim;
        RUNTIME.playSound = pickerResult.playSound;
        RUNTIME.randomDelay = pickerResult.randomDelay;
        if (pickerResult.selectedQuests.size === 0) { Logger.log('[System] No quests selected. Shutting down.', 'info'); return Logger.shutdown(); }
        let loopCount = 1;
        while (RUNTIME.running) {
            try {
                Logger.log(`[Cycle] Starting loop #${loopCount}...`, 'info');
                quests = getQuests();
                const active = quests.filter(q => pickerResult.selectedQuests.has(q.id) && !q.userStatus?.completedAt && new Date(q.config?.expiresAt).getTime() > Date.now() && q.id !== CONST.ID && !Tasks.skipped.has(q.id));
                if (!active.length) { Logger.log('[System] All available quests are completed!', 'success'); Sound.play('done'); break; }
                const queues = { video: [], game: [] };
                active.forEach(q => {
                    try {
                        const cfg = q.config?.taskConfig ?? q.config?.taskConfigV2;
                        if (!cfg?.tasks || typeof cfg.tasks !== 'object') { Logger.log(`[Quest] ${q.id} has invalid task config. Skipping.`, 'warn'); return; }
                        const typeData = Tasks.detectType(cfg, q.config?.application?.id);
                        if (!typeData) { Logger.log(`[Quest] Unknown task type: ${q.config?.messages?.questName ?? q.id}`, 'warn'); return; }
                        if (!SYS.IS_DESKTOP && (typeData.type === 'GAME' || typeData.type === 'STREAM')) { Logger.log(`[Quest] "${q.config?.messages?.questName}" requires desktop app. Skipping.`, 'warn'); return; }
                        const { type, keyName, target } = typeData;
                        if (target <= 0) { Logger.log(`[Quest] Invalid target (${target}) for ${q.id}. Skipping.`, 'warn'); return; }
                        
                        // Enhanced image extraction
                        const questIcon = q.config?.application?.icon;
                        const questAsset = q.config?.assets?.banner || q.config?.assets?.thumbnail;
                        let image = null;
                        if (questIcon) image = `https://cdn.discordapp.com/app-icons/${q.config.application.id}/${questIcon}.webp?size=128`;
                        else if (questAsset) image = `https://cdn.discordapp.com/assets/quests/${q.id}/${questAsset}.webp?size=128`;
                        
                        const tInfo = { id: q.id, appId: q.config?.application?.id ?? 0, name: q.config?.messages?.questName ?? "Unknown Quest", target, type, keyName, image };
                        
                        if (!q.userStatus?.enrolledAt && !RUNTIME.autoEnroll) { 
                            Logger.updateTask(tInfo.id, { name: tInfo.name, type: tInfo.type, cur: 0, max: tInfo.target, status: "PENDING", actionRequired: 'ENROLL', image: tInfo.image }); 
                            return; 
                        }
                        
                        if (Logger.tasks.has(q.id) && Logger.tasks.get(q.id).status === "RUNNING") return;
                        
                        Logger.updateTask(tInfo.id, { name: tInfo.name, type: tInfo.type, cur: 0, max: tInfo.target, status: "QUEUE", actionRequired: null, image: tInfo.image });
                        const taskFunc = async () => {
                            if (!q.userStatus?.enrolledAt) {
                                Logger.log(`[Enroll] Accepting quest: ${tInfo.name}`, 'info');
                                try {
                                    await Traffic.enqueue(`/quests/${q.id}/enroll`, { location: 11, is_targeted: false });
                                    await sleep(rnd(800, 1500));
                                } catch (e) {
                                    const err = ErrorHandler.classify(e);
                                    if (ErrorHandler.isSkippableQuest(e)) { Tasks.skipped.add(q.id); Logger.log(`[Enroll] ${tInfo.name} unavailable (${err.status}). Skipping.`, 'warn'); } else { Logger.log(`[Enroll] Failed for ${tInfo.name}: ${err.message}`, 'err'); }
                                    return Tasks.failTask(q, tInfo, `Enrollment failed`);
                                }
                            }
                            if (type === "WATCH_VIDEO") return Tasks.VIDEO(q, tInfo, q.userStatus);
                            if (type === "ACHIEVEMENT") return Tasks.ACHIEVEMENT(q, tInfo);
                            const runner = type === "STREAM" ? Tasks.STREAM : (type === "ACTIVITY" ? Tasks.ACTIVITY : Tasks.GAME);
                            return runner(q, tInfo, q.userStatus);
                        };
                        if (type === "WATCH_VIDEO") queues.video.push(taskFunc);
                        else queues.game.push(taskFunc);
                    } catch (e) { Logger.log(`[Quest] Error processing ${q.id}: ${e.message}`, 'err'); }
                });
                const totalTasks = queues.video.length + queues.game.length;
                if (totalTasks > 0) {
                    Logger.log(`[Cycle] Processing: ${queues.video.length} videos, ${queues.game.length} games.`, 'info');
                    await Promise.all([runConcurrent(queues.game, 1), runConcurrent(queues.video, 2)]);
                } else {
                    if (active.length === 0) { Logger.log('[System] All available quests are completed!', 'success'); break; }
                    else await sleep(rnd(4000, 6000));
                }
                if (!RUNTIME.running) break;
                if (RUNTIME.randomDelay) {
                    const delayMs = rnd(60000, 1800000);
                    Logger.log(`[Cycle] Loop #${loopCount} complete. Random delay: ${Math.round(delayMs / 60000)}m before rescan.`, 'info');
                    await sleep(delayMs);
                } else {
                    Logger.log(`[Cycle] Loop #${loopCount} complete. Waiting before rescan...`, 'info');
                    await sleep(rnd(2500, 4500));
                }
                loopCount++;
            } catch (cycleError) { Logger.log(`[Cycle] Error in loop #${loopCount}: ${cycleError?.message ?? cycleError}`, 'err'); console.error(cycleError); await sleep(3000); loopCount++; }
        }
        const hasUnclaimed = [...Logger.tasks.values()].some(t => t.claimable && !t.removing);
        if (hasUnclaimed) { Logger.log('[System] Quest cycle finished. Claim your rewards above, then click STOP.', 'info'); return; }
        Logger.shutdown();
    }
    main().catch(e => { const msg = e?.message ?? e?.toString?.() ?? "Unknown fatal error"; console.error('[Avery Fatal]', e); try { Logger.log(`[System] FATAL: ${msg}`, 'err'); } catch (_) { } Logger.shutdown(); setTimeout(() => { window.averyLock = false; }, 1500); });
})();
