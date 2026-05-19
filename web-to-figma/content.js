(() => {
  const ROOT_ID = '__w2f_root__';
  const OVERLAY_ID = '__w2f_overlay__';
  const STYLE_ID = '__w2f_style__';

  function cleanup() {
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onPickClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  }

  if (document.getElementById(ROOT_ID)) { cleanup(); return; }

  const ICONS = {
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
    target: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    checkCircle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  };

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 300px;
      z-index: 2147483647;
      border-radius: 14px;
      border: 1px solid #e5e5e5;
      background: #ffffff;
      box-shadow: 0 16px 40px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
      color: #171717;
      overflow: hidden;
      animation: w2f-slide-in 200ms ease-out;
    }
    @keyframes w2f-slide-in {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #${ROOT_ID} * { box-sizing: border-box; }

    #${ROOT_ID} .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid #e5e5e5;
      background: #ffffff;
    }
    #${ROOT_ID} .title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #171717;
    }

    #${ROOT_ID} .close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      color: #a3a3a3;
      transition: background 120ms ease, color 120ms ease;
    }
    #${ROOT_ID} .close:hover { background: #f5f5f5; color: #737373; }
    #${ROOT_ID} .close:active { transform: scale(.95); }
    #${ROOT_ID} .close svg { display: block; }

    #${ROOT_ID} .body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    #${ROOT_ID} .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    #${ROOT_ID} .capture {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      border: 1px solid transparent;
      border-radius: 10px;
      background: #18181b;
      color: #ffffff;
      font-size: 13px;
      font-weight: 500;
      padding: 10px 12px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 180ms ease, box-shadow 180ms ease, transform 120ms ease;
    }
    #${ROOT_ID} .capture:hover {
      background: #27272a;
      box-shadow: 0 4px 12px rgba(0,0,0,.15);
    }
    #${ROOT_ID} .capture:active {
      background: #09090b;
      transform: translateY(1px);
    }
    #${ROOT_ID} .capture:disabled {
      opacity: .5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    #${ROOT_ID} .capture svg { flex-shrink: 0; }

    #${ROOT_ID} .pick-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      border: 1px solid #d4d4d4;
      border-radius: 10px;
      background: #fafafa;
      color: #171717;
      font-size: 13px;
      font-weight: 500;
      padding: 10px 12px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 180ms ease, border-color 180ms ease, transform 120ms ease;
    }
    #${ROOT_ID} .pick-btn:hover {
      background: #f0f0f0;
      border-color: #a3a3a3;
    }
    #${ROOT_ID} .pick-btn:active {
      transform: translateY(1px);
      background: #f5f5f5;
    }
    #${ROOT_ID} .pick-btn.active {
      background: #fef2f2;
      border-color: #fca5a5;
      color: #ef4444;
    }
    #${ROOT_ID} .pick-btn svg { flex-shrink: 0; color: #737373; }

    #${ROOT_ID} .status {
      text-align: center;
      font-size: 11.5px;
      color: #9ca3af;
      min-height: 18px;
      margin: 0;
      line-height: 1.4;
    }
    #${ROOT_ID} .status.success { color: #16a34a; }
    #${ROOT_ID} .status.error { color: #ef4444; }
    #${ROOT_ID} .status.info { color: #0ea5e9; }

    #${OVERLAY_ID} {
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      border: 2px solid #0d99ff;
      background: rgba(13,153,255,0.08);
      border-radius: 2px;
      display: none;
      box-sizing: border-box;
      transition: all 0.05s ease;
    }
  `;
  document.documentElement.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  document.documentElement.appendChild(overlay);

  const toolbar = document.createElement('div');
  toolbar.id = ROOT_ID;
  toolbar.setAttribute('data-figma-capture-ignore', '1');
  toolbar.innerHTML = `
    <div class="bar" data-figma-capture-ignore="1">
      <div class="title" data-figma-capture-ignore="1">
        <span data-figma-capture-ignore="1">网页转 Figma</span>
      </div>
      <button class="close" type="button" title="关闭" data-figma-capture-ignore="1">${ICONS.x}</button>
    </div>
    <div class="body" data-figma-capture-ignore="1">
      <div class="actions" data-figma-capture-ignore="1">
        <button class="capture" id="w2f-full" type="button" data-figma-capture-ignore="1">
          ${ICONS.image}
          <span data-figma-capture-ignore="1">全页采集</span>
        </button>
        <button class="pick-btn" id="w2f-pick" type="button" data-figma-capture-ignore="1">
          ${ICONS.target}
          <span data-figma-capture-ignore="1">选取元素</span>
        </button>
      </div>
      <p class="status" id="w2f-status" data-figma-capture-ignore="1"></p>
    </div>
  `;
  document.documentElement.appendChild(toolbar);

  const btnFull = document.getElementById('w2f-full');
  const btnPick = document.getElementById('w2f-pick');
  const statusEl = document.getElementById('w2f-status');
  const closeBtn = toolbar.querySelector('.close');

  let pickMode = false;
  let hoveredEl = null;
  let _pickCounter = 0;

  function setStatus(text, type = '') {
    statusEl.textContent = text;
    statusEl.className = 'status' + (type ? ' ' + type : '');
  }

  function setLoading(loading) {
    btnFull.disabled = loading;
    btnPick.disabled = loading;
    btnFull.style.opacity = loading ? '0.6' : '1';
    btnPick.style.opacity = loading ? '0.6' : '1';
  }

  async function captureFullPage() {
    if (!window.figma?.captureForDesign) {
      setStatus('需要 Figma 桌面应用', 'error');
      return;
    }
    setLoading(true);
    setStatus('正在加载图片...', 'info');

    try {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await delay(300);
      }
      window.scrollTo(0, 0);
      await delay(800);

      await Promise.allSettled(
        Array.from(document.images).map(img =>
          img.complete ? Promise.resolve() :
          new Promise(r => {
            img.addEventListener('load', r, { once: true });
            img.addEventListener('error', r, { once: true });
            setTimeout(r, 8000);
          })
        )
      );

      if (document.fonts?.ready) await Promise.race([document.fonts.ready, delay(2000)]);
      await delay(500);

      setStatus('正在复制到剪贴板...', 'info');
      cleanup();
      await window.figma.captureForDesign({ selector: 'body' });
      setStatus('✓ 粘贴到 Figma (Ctrl+V)', 'success');
    } catch (e) {
      setStatus('错误: ' + e.message, 'error');
      setLoading(false);
    }
  }

  function enterPickMode() {
    pickMode = true;
    btnPick.classList.add('active');
    setStatus('点击任意元素进行采集', 'info');
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onPickClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  function exitPickMode() {
    pickMode = false;
    btnPick.classList.remove('active');
    btnPick.style.background = '';
    btnPick.style.borderColor = '';
    btnPick.style.color = '';
    overlay.style.display = 'none';
    hoveredEl = null;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onPickClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    setStatus('');
  }

  function onMouseMove(e) {
    if (!pickMode) return;
    const el = e.target;
    if (!el || el === toolbar || toolbar.contains(el)) return;
    hoveredEl = el;
    const rect = el.getBoundingClientRect();
    Object.assign(overlay.style, {
      display: 'block',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
    });
  }

  async function onPickClick(e) {
    if (!pickMode) return;
    const el = e.target;
    if (!el || el === toolbar || toolbar.contains(el)) return;
    e.stopPropagation();
    e.preventDefault();

    if (!window.figma?.captureForDesign) {
      setStatus('需要 Figma 桌面应用', 'error');
      exitPickMode();
      return;
    }

    exitPickMode();
    setLoading(true);
    setStatus('正在采集元素...', 'info');

    try {
      let selector;
      if (el.id) {
        selector = '#' + CSS.escape(el.id);
      } else {
        _pickCounter++;
        const tempId = '__w2f_t_' + Date.now() + '_' + _pickCounter + '__';
        el.id = tempId;
        selector = '#' + tempId;
      }

      const delay = ms => new Promise(r => setTimeout(r, ms));
      await delay(100);

      await window.figma.captureForDesign({ selector });
      setStatus('✓ 粘贴到 Figma (Ctrl+V)', 'success');
    } catch (err) {
      setStatus('错误: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') exitPickMode();
  }

  closeBtn.addEventListener('click', cleanup);
  btnFull.addEventListener('click', captureFullPage);
  btnPick.addEventListener('click', () => {
    if (pickMode) exitPickMode();
    else enterPickMode();
  });

  if (!window.figma?.captureForDesign) {
    btnFull.disabled = true;
    btnPick.disabled = true;
    setStatus('未检测到 Figma 桌面应用，请先打开 Figma', 'error');
  }

  toolbar.addEventListener('click', e => e.stopPropagation());
  toolbar.addEventListener('mousedown', e => e.stopPropagation());
})();
