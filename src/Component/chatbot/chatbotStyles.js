export const CHATBOT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap');

  /* ════════════════════════════════════════════
     DESIGN TOKENS
  ════════════════════════════════════════════ */
  .chatbot-wrapper {
    --g1: #c9a96e;
    --g2: #f1d486;
    --g3: #b78a2d;
    --g-pale: rgba(201,169,110,0.14);
    --g-ring: rgba(201,169,110,0.45);

    --ink: #09090b;
    --ink2: #141418;
    --ink3: #1e1e24;
    --ink4: #2c2820;

    --surface: #fafaf8;
    --surface2: #f4f2ec;
    --surface3: #ece9e0;

    --border: rgba(201,169,110,0.22);
    --border2: rgba(201,169,110,0.45);

    --shadow-deep: 0 32px 80px rgba(0,0,0,0.36), 0 8px 24px rgba(0,0,0,0.18);
    --shadow-gold: 0 8px 32px rgba(183,138,45,0.28);
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.1);

    --r-card: 24px;
    --r-msg: 18px;
    --r-chip: 999px;

    --font-ui: 'Inter','Segoe UI',system-ui,sans-serif;
    --font-brand: 'Sora','Inter',system-ui,sans-serif;
    --font-serif: 'Playfair Display',Georgia,serif;

    position: fixed;
    right: 24px;
    bottom: 22px;
    z-index: 9000;
    font-family: var(--font-ui);
    display: flex;
    align-items: flex-end;
    gap: 10px;
    /* prevent text-size-adjust on iOS */
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  /* ════════════════════════════════════════════
     GRIP HANDLE
  ════════════════════════════════════════════ */
  .grip-handle {
    position: absolute;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(12,12,14,0.88);
    border: 1px solid var(--border2);
    border-radius: 999px;
    padding: 7px 10px;
    backdrop-filter: blur(12px);
    cursor: grab;
    transition: opacity 0.2s, transform 0.2s;
    opacity: 0.7;
  }
  .grip-handle:hover { opacity: 1; transform: translateX(-50%) scale(1.08); }

  /* ════════════════════════════════════════════
     LAUNCHER BUBBLE
  ════════════════════════════════════════════ */
  .chatbot-bubble {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 999px;
    border: none;
    outline: none;
    cursor: pointer;
    padding: 0;
    /* layered gold gradient */
    background:
      radial-gradient(circle at 30% 24%, rgba(255,255,255,0.38) 0%, transparent 52%),
      linear-gradient(145deg, #fae98a 0%, #d4a53a 38%, #a37018 100%);
    box-shadow:
      0 0 0 6px rgba(201,169,110,0.13),
      0 0 0 12px rgba(201,169,110,0.06),
      0 18px 40px rgba(183,138,45,0.38),
      0 6px 16px rgba(0,0,0,0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.38s cubic-bezier(0.34,1.56,0.64,1);
    overflow: visible;
  }

  /* shimmer sweep */
  .chatbot-bubble::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.32) 50%, transparent 80%);
    animation: bubble-shimmer 3.8s ease-in-out infinite;
  }

  @keyframes bubble-shimmer {
    0%,100% { transform: translateX(-120%) rotate(30deg); opacity: 0; }
    50%      { transform: translateX(120%)  rotate(30deg); opacity: 1; }
  }

  /* rotating gold ring */
  .chatbot-bubble::after {
    content: '';
    position: absolute;
    inset: -5px;
    border-radius: 999px;
    background: conic-gradient(
      from 0deg,
      transparent 0%,
      rgba(201,169,110,0.7) 18%,
      rgba(241,212,134,0.9) 28%,
      rgba(201,169,110,0.7) 38%,
      transparent 55%
    );
    animation: ring-spin 4s linear infinite;
    z-index: -1;
  }

  @keyframes ring-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .chatbot-bubble.active {
    box-shadow:
      0 0 0 8px rgba(201,169,110,0.18),
      0 10px 24px rgba(183,138,45,0.35),
      0 4px 10px rgba(0,0,0,0.22);
    transform: scale(0.94);
  }

  .robot-shell {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    overflow: visible;
  }

  /* notification badge */
  .notif-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 20px;
    height: 20px;
    border-radius: 999px;
    background: linear-gradient(135deg,#ff5858,#e0184a);
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    font-weight: 800;
    color: #fff;
    box-shadow: 0 2px 10px rgba(224,24,74,0.55);
    animation: badge-pulse 2.2s ease infinite;
    padding: 0 3px;
  }

  @keyframes badge-pulse {
    0%,100% { box-shadow: 0 2px 8px rgba(224,24,74,0.45); }
    50%      { box-shadow: 0 2px 18px rgba(224,24,74,0.8); }
  }

  /* ════════════════════════════════════════════
     CHAT CARD  (the main window)
  ════════════════════════════════════════════ */
  .chat-card {
    position: fixed;
    right: 20px;
    bottom: 112px;
    width: min(420px, 92vw);
    height: min(600px, calc(100vh - 148px));
    max-height: calc(100vh - 138px);
    background: var(--surface);
    border-radius: var(--r-card);
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow-deep);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* subtle glass */
    backdrop-filter: blur(1px);
    /* animated top glow line */
    outline: none;
  }

  /* top accent line */
  .chat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2.5px;
    background: linear-gradient(90deg,
      transparent 0%,
      var(--g1) 20%,
      var(--g2) 50%,
      var(--g1) 80%,
      transparent 100%
    );
    z-index: 10;
    animation: glow-line 4s ease-in-out infinite;
  }

  @keyframes glow-line {
    0%,100% { opacity: 0.7; }
    50%      { opacity: 1; filter: drop-shadow(0 0 6px #f1d48699); }
  }

  /* bottom fade for scroll depth */
  .chat-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(0deg, rgba(201,169,110,0.15), transparent);
    z-index: 5;
    pointer-events: none;
  }

  .chat-card.fullscreen {
    position: fixed !important;
    left: 0 !important; right: 0 !important;
    bottom: 0 !important; top: 0 !important;
    width: 100vw !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
    border-radius: 0 !important;
    border: none !important;
    z-index: 9200 !important;
  }

  /* ════════════════════════════════════════════
     HEADER
  ════════════════════════════════════════════ */
  .chat-header {
    flex-shrink: 0;
    background: linear-gradient(150deg, #0b0b0e 0%, #16161c 48%, #221808 100%);
    padding: 14px 16px 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(201,169,110,0.35);
    position: relative;
    overflow: hidden;
  }

  /* subtle moving shimmer in header */
  .chat-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(201,169,110,0.07) 40%,
      rgba(241,212,134,0.1) 50%,
      rgba(201,169,110,0.07) 60%,
      transparent 100%
    );
    animation: header-sweep 9s ease-in-out infinite;
  }

  @keyframes header-sweep {
    0%,100% { transform: translateX(-100%); }
    50%      { transform: translateX(100%); }
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 11px;
    z-index: 1;
    min-width: 0;
  }

  .header-logo-wrap {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: linear-gradient(145deg, #f0d060, #b07820);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow:
      0 0 0 2px rgba(201,169,110,0.45),
      0 6px 16px rgba(0,0,0,0.35);
    position: relative;
    overflow: hidden;
  }

  .header-logo-wrap::after {
    content: '';
    position: absolute;
    top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.18), transparent);
    animation: logo-shine 5s ease-in-out infinite;
  }

  @keyframes logo-shine {
    0%,100% { transform: translateX(-100%) rotate(45deg); }
    50%      { transform: translateX(100%)  rotate(45deg); }
  }

  .header-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }

  .header-name {
    margin: 0;
    font-family: var(--font-brand);
    font-size: 15px;
    font-weight: 700;
    color: #f4e3b2;
    letter-spacing: 0.3px;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }

  .status-dot {
    width: 7px; height: 7px;
    border-radius: 999px;
    background: #22d47a;
    box-shadow: 0 0 0 2px rgba(34,212,122,0.22), 0 0 8px rgba(34,212,122,0.9);
    flex-shrink: 0;
    animation: dot-pulse 2.2s ease infinite;
  }

  @keyframes dot-pulse {
    0%,100% { box-shadow: 0 0 0 2px rgba(34,212,122,0.2), 0 0 6px rgba(34,212,122,0.7); }
    50%      { box-shadow: 0 0 0 4px rgba(34,212,122,0.12), 0 0 14px rgba(34,212,122,1); }
  }

  .status-text {
    font-size: 10.5px;
    color: rgba(244,227,178,0.7);
    font-weight: 500;
    letter-spacing: 0.2px;
  }

  .ai-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 8.5px;
    font-weight: 700;
    color: #c9a96e;
    background: rgba(201,169,110,0.12);
    border: 1px solid rgba(201,169,110,0.32);
    border-radius: 5px;
    padding: 2px 6px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    z-index: 1;
    flex-shrink: 0;
  }

  .hdr-btn {
    width: 30px; height: 30px;
    border-radius: 9px;
    border: 1px solid rgba(201,169,110,0.35);
    background: rgba(201,169,110,0.1);
    color: rgba(244,227,178,0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .hdr-btn:hover {
    background: rgba(201,169,110,0.22);
    color: #f4e3b2;
    border-color: rgba(201,169,110,0.6);
    transform: scale(1.08);
  }

  .hdr-close {
    width: 32px; height: 32px;
    border-radius: 10px;
    border: 1px solid rgba(201,169,110,0.4);
    background: rgba(201,169,110,0.14);
    color: #f4e3b2;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .hdr-close:hover {
    background: rgba(220,60,60,0.25);
    border-color: rgba(220,60,60,0.5);
    color: #ff9090;
    transform: scale(1.08);
  }

  /* ════════════════════════════════════════════
     QUICK CHIPS
  ════════════════════════════════════════════ */
  .chips-bar {
    flex-shrink: 0;
    padding: 8px 14px 7px;
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    background: #f7f5ef;
    border-bottom: 1px solid rgba(201,169,110,0.14);
    -webkit-overflow-scrolling: touch;
  }

  .chips-bar::-webkit-scrollbar { display: none; }

  .chip {
    flex-shrink: 0;
    padding: 5px 12px;
    border-radius: var(--r-chip);
    border: 1px solid rgba(201,169,110,0.38);
    background: linear-gradient(135deg, #fffdf5 0%, #f5f0e0 100%);
    color: #6a4e14;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    white-space: nowrap;
    letter-spacing: 0.1px;
    box-shadow: 0 1px 4px rgba(201,169,110,0.1);
    -webkit-tap-highlight-color: transparent;
  }

  .chip:hover, .chip:active {
    background: linear-gradient(135deg, var(--g2) 0%, var(--g1) 100%);
    color: #1a0e00;
    border-color: var(--g1);
    box-shadow: 0 4px 14px rgba(201,169,110,0.35);
    transform: translateY(-2px) scale(1.04);
  }

  /* ════════════════════════════════════════════
     CHAT BODY
  ════════════════════════════════════════════ */
  .chat-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 14px 14px 6px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background:
      radial-gradient(ellipse 80% 50% at 80% 10%, rgba(201,169,110,0.07) 0%, transparent 70%),
      radial-gradient(ellipse 60% 40% at 20% 90%, rgba(201,169,110,0.05) 0%, transparent 70%),
      linear-gradient(180deg, #faf8f2 0%, #f4f1e8 100%);
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  .chat-body::-webkit-scrollbar { width: 3px; }
  .chat-body::-webkit-scrollbar-track { background: transparent; }
  .chat-body::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(201,169,110,0.4);
  }

  /* ─── Welcome card ─── */
  .welcome-card {
    border-radius: 18px;
    border: 1px solid rgba(201,169,110,0.28);
    background: linear-gradient(145deg, #fffdf7 0%, #f8f4e6 100%);
    padding: 16px 16px 14px;
    box-shadow: 0 4px 20px rgba(201,169,110,0.14), var(--shadow-sm);
    position: relative;
    overflow: hidden;
  }

  .welcome-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--g1), var(--g2), var(--g1), transparent);
  }

  .welcome-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 9.5px;
    font-weight: 700;
    color: var(--g3);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 8px;
  }

  .welcome-tag::before {
    content: '';
    display: block;
    width: 16px; height: 1px;
    background: var(--g1);
  }

  .welcome-tag::after {
    content: '';
    display: block;
    width: 16px; height: 1px;
    background: var(--g1);
  }

  .welcome-title {
    font-family: var(--font-serif);
    font-size: 17px;
    font-weight: 600;
    color: #111;
    margin: 0 0 6px;
    line-height: 1.35;
  }

  .welcome-body {
    font-size: 12.5px;
    color: #5a4e38;
    line-height: 1.65;
    margin: 0;
    font-weight: 400;
  }

  .welcome-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201,169,110,0.35), transparent);
    margin: 10px 0;
  }

  /* ─── Date divider ─── */
  .date-divider {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .date-divider::before, .date-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201,169,110,0.28), transparent);
  }

  .date-divider span {
    font-size: 9.5px;
    color: #a09070;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* ════════════════════════════════════════════
     MESSAGE ROW
  ════════════════════════════════════════════ */
  .msg-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }

  .msg-user {
    flex-direction: row-reverse;
    justify-content: flex-start;
  }

  .avatar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
    width: 38px;
  }

  .avatar-col small {
    font-size: 8.5px;
    color: #a09070;
    font-weight: 600;
    letter-spacing: 0.2px;
    text-transform: uppercase;
    text-align: center;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    overflow: hidden;
    border: 1.5px solid rgba(201,169,110,0.32);
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
  }

  .avatar img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
  }

  .bot-av {
    background: linear-gradient(135deg, #fffbe8, #eaf8ff);
    color: #7a5c1e;
  }

  .user-av {
    background: linear-gradient(135deg, #16161c, #2a1e0c);
    color: var(--g2);
  }

  /* ────── message bubble ────── */
  .msg-content {
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-width: min(290px, calc(100vw - 100px));
  }

  .msg-user .msg-content { align-items: flex-end; }

  .bubble {
    border-radius: var(--r-msg);
    padding: 11px 15px;
    line-height: 1.68;
    font-size: 13.5px;
    font-weight: 400;
    word-break: break-word;
    letter-spacing: 0.08px;
    border: 1.5px solid transparent;
    transition: box-shadow 0.22s ease, transform 0.22s ease;
    position: relative;
    font-family: var(--font-ui);
  }

  .bubble:hover { transform: translateY(-1px); }

  /* bot bubble */
  .bubble-bot {
    background: linear-gradient(145deg, #ffffff 0%, #fffcf0 100%);
    color: #141414;
    border-color: rgba(201,169,110,0.28);
    border-bottom-left-radius: 5px;
    box-shadow: 0 3px 12px rgba(201,169,110,0.1), 0 1px 4px rgba(0,0,0,0.07);
  }

  .bubble-bot:hover {
    border-color: rgba(201,169,110,0.5);
    box-shadow: 0 6px 20px rgba(201,169,110,0.18), 0 2px 8px rgba(0,0,0,0.1);
  }

  /* user bubble */
  .bubble-user {
    background: linear-gradient(145deg, #111116 0%, #241809 100%);
    color: #f2e8d4;
    border-color: rgba(201,169,110,0.28);
    border-bottom-right-radius: 5px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.24);
  }

  .bubble-user:hover {
    background: linear-gradient(145deg, #17171e 0%, #2e2010 100%);
    box-shadow: 0 6px 22px rgba(0,0,0,0.3);
  }

  .msg-time {
    font-size: 9.5px;
    color: #b0a088;
    font-weight: 500;
    padding: 0 2px;
    letter-spacing: 0.1px;
  }

  .msg-user .msg-time { text-align: right; }

  /* ────── typing indicator ────── */
  .typing-wrap {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 15px;
    border-radius: var(--r-msg);
    border-bottom-left-radius: 5px;
    border: 1.5px solid rgba(201,169,110,0.22);
    background: linear-gradient(145deg, #fff 0%, #fffbf0 100%);
    box-shadow: 0 3px 12px rgba(201,169,110,0.1);
    width: fit-content;
  }

  .typing-lbl {
    font-size: 10.5px;
    color: #a09070;
    font-weight: 500;
    font-style: italic;
  }

  .typing-dots { display: flex; gap: 4px; align-items: center; }

  .dot {
    width: 6px; height: 6px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--g2), var(--g3));
  }

  /* ════════════════════════════════════════════
     PRODUCT GRID
  ════════════════════════════════════════════ */
  .product-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .product-card {
    display: flex;
    flex-direction: column;
    border-radius: 15px;
    overflow: hidden;
    border: 1.5px solid rgba(201,169,110,0.22);
    background: #fff;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    transition: all 0.28s cubic-bezier(0.34,1.56,0.64,1);
    -webkit-tap-highlight-color: transparent;
  }

  .product-card:hover {
    border-color: rgba(201,169,110,0.5);
    box-shadow: 0 12px 32px rgba(0,0,0,0.16), 0 3px 12px rgba(201,169,110,0.2);
  }

  .p-img {
    height: 100px;
    background: linear-gradient(135deg, #f0ede5, #e5e1d8);
    overflow: hidden;
    position: relative;
  }

  .p-img img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.35s ease;
  }

  .product-card:hover .p-img img { transform: scale(1.06); }

  .p-no-img {
    width: 100%; height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 22px;
    color: #ccc;
  }

  .p-no-img span { font-size: 9px; color: #aaa; font-weight: 600; }

  .p-badge {
    position: absolute;
    top: 6px; left: 6px;
    background: linear-gradient(135deg, #c07800, #f0b000);
    color: #1a0800;
    font-size: 7.5px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 6px;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(192,120,0,0.4);
  }

  .p-meta {
    padding: 8px 9px 7px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .p-name {
    font-size: 10.5px;
    font-weight: 600;
    color: #1a1a1a;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .p-price-row {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
  }

  .p-price {
    font-size: 12px;
    color: #8a5c0e;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .p-price-old {
    font-size: 9.5px;
    color: #aaa;
    font-weight: 500;
    text-decoration: line-through;
  }

  .p-rating {
    font-size: 9.5px;
    color: #c09020;
    font-weight: 700;
    margin: 0;
  }

  .p-fabric {
    font-size: 9px;
    color: #888;
    font-weight: 500;
    margin: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .p-link {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    color: #7a5010;
    font-weight: 700;
    margin-top: 2px;
    letter-spacing: 0.1px;
  }

  /* ════════════════════════════════════════════
     FOOTER / INPUT
  ════════════════════════════════════════════ */
  .chat-footer {
    flex-shrink: 0;
    padding: 10px 13px 11px;
    border-top: 1px solid rgba(201,169,110,0.18);
    background: linear-gradient(180deg, #f8f6f0 0%, #f2efe6 100%);
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }

  .input-box {
    flex: 1;
    position: relative;
    display: flex;
  }

  .chat-input {
    flex: 1;
    border: 1.5px solid rgba(201,169,110,0.35);
    border-radius: 14px;
    padding: 10px 40px 10px 14px;
    font-size: 13.5px;
    background: #fff;
    outline: none;
    font-family: var(--font-ui);
    color: #141414;
    font-weight: 400;
    line-height: 1.5;
    resize: none;
    max-height: 96px;
    min-height: 42px;
    overflow-y: auto;
    scrollbar-width: none;
    transition: border-color 0.22s, box-shadow 0.22s;
    -webkit-appearance: none;
    appearance: none;
    box-shadow: 0 1px 4px rgba(201,169,110,0.1);
  }

  .chat-input::-webkit-scrollbar { display: none; }

  .chat-input:focus {
    border-color: var(--g1);
    box-shadow: 0 0 0 3.5px rgba(201,169,110,0.18), 0 2px 8px rgba(201,169,110,0.16);
    background: #fffef8;
  }

  .chat-input::placeholder { color: #b0a08a; font-weight: 400; }
  .chat-input:disabled { opacity: 0.5; cursor: not-allowed; }

  .char-count {
    position: absolute;
    right: 11px;
    bottom: 9px;
    font-size: 8.5px;
    color: #c0b090;
    font-weight: 600;
    pointer-events: none;
  }

  .send-btn {
    width: 44px;
    height: 44px;
    border-radius: 13px;
    border: none;
    outline: none;
    background: linear-gradient(145deg, #f5d870 0%, #c8a040 55%, #9a7018 100%);
    color: #1a0e00;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.26s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow: 0 4px 16px rgba(201,169,110,0.4), 0 2px 6px rgba(0,0,0,0.14);
    -webkit-tap-highlight-color: transparent;
  }

  .send-btn:hover:not(:disabled) {
    background: linear-gradient(145deg, #fae48a 0%, #d4ad50 55%, #a87c22 100%);
    transform: translateY(-2px) scale(1.07);
    box-shadow: 0 8px 24px rgba(201,169,110,0.5), 0 3px 10px rgba(0,0,0,0.16);
  }

  .send-btn:active:not(:disabled) {
    transform: scale(0.93);
    box-shadow: 0 2px 6px rgba(201,169,110,0.25);
  }

  .send-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    transform: none;
  }

  .footer-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1px;
  }

  .footer-brand {
    font-size: 9.5px;
    color: #b0a080;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .footer-brand b { color: var(--g3); font-weight: 700; }

  .footer-hint {
    font-size: 9px;
    color: #c0b090;
    font-weight: 500;
  }

  /* ════════════════════════════════════════════
     ANIMATIONS
  ════════════════════════════════════════════ */
  .spin { animation: spin 0.9s linear infinite; }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* ════════════════════════════════════════════
     TABLET  (max 768px)
  ════════════════════════════════════════════ */
  @media (max-width: 768px) {
    .chatbot-wrapper { right: 16px; bottom: 16px; }
    .chatbot-bubble  { width: 66px; height: 66px; }
    .robot-shell     { width: 52px; height: 52px; }

    .chat-card {
      right: 14px;
      bottom: 98px;
      width: min(390px, 94vw);
      height: min(560px, calc(100vh - 132px));
      max-height: calc(100vh - 122px);
      border-radius: 22px;
    }

    .bubble      { font-size: 13px; }
    .msg-content { max-width: min(270px, calc(100vw - 96px)); }
    .header-name { font-size: 14px; }
    .chips-bar   { padding: 7px 12px 6px; }
  }

  /* ════════════════════════════════════════════
     MOBILE (max 640px)
  ════════════════════════════════════════════ */
  @media (max-width: 640px) {
    .chatbot-wrapper { right: 14px; bottom: 14px; }
    .chatbot-bubble  { width: 62px; height: 62px; }
    .robot-shell     { width: 48px; height: 48px; }
    .grip-handle     { bottom: 76px; }

    .chat-card {
      right: 8px;
      bottom: 88px;
      width: min(380px, 96vw);
      height: min(540px, calc(100vh - 116px));
      max-height: calc(100vh - 108px);
      border-radius: 22px;
    }

    .msg-content { max-width: min(255px, calc(100vw - 90px)); }
    .bubble      { font-size: 13px; }
    .p-img       { height: 120px; }
    .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

    /* ════════════════════════════════════════════
      SMALL MOBILE  (max 500px)  — full-screen chat view
    ════════════════════════════════════════════ */
  @media (max-width: 500px) {
    .chatbot-wrapper {
      right: 12px;
      bottom: 12px;
    }

    .chatbot-bubble {
      width: 56px;
      height: 56px;
      box-shadow:
        0 8px 20px rgba(212, 175, 55, 0.4),
        0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .robot-shell { width: 42px; height: 42px; }
    .grip-handle { bottom: 68px; padding: 5px; }

    .chat-card {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100dvh !important;
      max-height: 100dvh !important;
      border-radius: 0 !important;
      border: none !important;
      z-index: 9200 !important;
    }

    .chat-card.fullscreen {
      inset: 0 !important;
      width: 100vw !important;
      height: 100dvh !important;
      max-height: 100dvh !important;
      border-radius: 0 !important;
    }

    .chat-header {
      padding: max(14px, calc(env(safe-area-inset-top) + 8px)) 16px 14px;
    }
    .header-logo-wrap { width: 38px; height: 38px; }
    .header-name { font-size: 14px; }
    .ai-badge    { display: none; }

    .chat-body {
      padding: 12px;
      padding-bottom: max(12px, calc(env(safe-area-inset-bottom) + 8px));
    }
    .msg-content { max-width: calc(100vw - 80px); }
    .bubble { font-size: 12.5px; padding: 10px 13px; }

    .p-img { height: 140px; }
    .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

    .chat-footer {
      padding: 12px;
      padding-bottom: max(12px, calc(env(safe-area-inset-bottom) + 10px));
    }
    .chat-input  { font-size: 12.5px; padding: 9px 14px; }
    .send-btn    { width: 38px; height: 38px; }
    .footer-meta { display: none; }
    .chips-bar   { padding: 8px 12px 6px; }
  }

  /* ════════════════════════════════════════════
     EXTRA SMALL  (max 360px)
  ════════════════════════════════════════════ */
  @media (max-width: 360px) {
    .chatbot-bubble  { width: 56px; height: 56px; }
    .robot-shell     { width: 43px; height: 43px; }
    .header-name     { font-size: 13px; }
    .status-text     { font-size: 9.5px; }
    .bubble          { font-size: 12.5px; padding: 10px 12px; }
    .chat-input      { font-size: 13px; }
    .chip            { font-size: 10.5px; padding: 4px 10px; }
    .p-name          { font-size: 10px; }
    .welcome-title   { font-size: 15px; }
  }

  /* ════════════════════════════════════════════
     SAFE AREA (iPhone notch / home bar)
  ════════════════════════════════════════════ */
  @supports (padding: max(0px)) {
    @media (max-width: 480px) {
      .chat-header {
        padding-top: max(14px, calc(env(safe-area-inset-top) + 8px));
      }
      .chat-footer {
        padding-bottom: max(12px, calc(env(safe-area-inset-bottom) + 6px));
      }
    }
  }
`
