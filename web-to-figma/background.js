function stripImageProcessingParams(url) {
  try {
    const u = new URL(url);
    if (u.search && /imageView[12]?\/|imageMogr2\/|x-oss-process=image/i.test(u.search)) {
      return u.origin + u.pathname;
    }
  } catch {}
  return url;
}

async function proxyFetchAsset(url) {
  const fetchUrl = stripImageProcessingParams(url);
  try {
    const resp = await fetch(fetchUrl, { credentials: 'omit', cache: 'force-cache' });
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 32768;
    for (let i = 0; i < bytes.length; i += chunk)
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    return 'data:' + contentType + ';base64,' + btoa(binary);
  } catch { return null; }
}

async function activate(tab) {
  try {
    // 1. Patch closed shadow roots
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.__shadowPatch) return;
        window.__shadowPatch = true;
        const orig = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function(init) {
          const sr = orig.call(this, init);
          if (init.mode === 'closed') {
            try { this.__sr = sr; } catch (e) {}
          }
          return sr;
        };
      },
      world: 'MAIN'
    });

    // 2. Install clipboard interceptor (CJK font fix + DOM cleanup)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: installInterceptor,
      world: 'MAIN'
    });

    // NOTE: No more replaceCrossOriginImages!
    // declarativeNetRequest rules inject CORS headers, so capture.js
    // can fetch cross-origin images directly without DOM pollution.
    // This avoids duplicating 10MB+ of image data as base64 in the DOM.

    // 3. Inject fetch proxy bridge (ISOLATED world → service worker)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED',
      func: () => {
        if (window.__fgBridgeReady) return;
        window.__fgBridgeReady = true;
        window.addEventListener('message', async (event) => {
          if (event.data?.type !== '__FG_PROXY_FETCH_REQUEST') return;
          const { id, url } = event.data;
          try {
            const resp = await new Promise((resolve, reject) => {
              chrome.runtime.sendMessage({ type: 'FIGMA_CAPTURE_FETCH_ASSET', url }, (response) => {
                if (chrome.runtime.lastError || !response?.ok) {
                  reject(new Error(chrome.runtime.lastError?.message || 'PROXY_FETCH_FAILED'));
                } else {
                  resolve(response);
                }
              });
            });
            window.postMessage({ type: '__FG_PROXY_FETCH_RESPONSE', id, ok: true, contentType: resp.contentType, base64: resp.base64 }, '*');
          } catch (e) {
            window.postMessage({ type: '__FG_PROXY_FETCH_RESPONSE', id, ok: false, error: e.message }, '*');
          }
        });
      }
    });

    // 4. Fetch patch: fallback to service worker proxy when CORS still fails
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: () => {
        if (window.__fgFetchPatched) return;
        window.__fgFetchPatched = true;
        const _origFetch = window.fetch;
        let _reqId = 0;
        window.fetch = function(input, init) {
          return _origFetch.call(this, input, init).catch(err => {
            const url = typeof input === 'string' ? input : input?.url;
            if (!url || !url.startsWith('http')) throw err;
            return new Promise((resolve, reject) => {
              const id = '__fg_proxy_' + (++_reqId);
              const timeout = setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(err);
              }, 15000);
              function handler(event) {
                if (event.data?.type !== '__FG_PROXY_FETCH_RESPONSE' || event.data?.id !== id) return;
                clearTimeout(timeout);
                window.removeEventListener('message', handler);
                if (!event.data.ok) { reject(err); return; }
                const bytes = Uint8Array.from(atob(event.data.base64), c => c.charCodeAt(0));
                resolve(new Response(bytes, {
                  status: 200,
                  headers: { 'Content-Type': event.data.contentType }
                }));
              }
              window.addEventListener('message', handler);
              window.postMessage({ type: '__FG_PROXY_FETCH_REQUEST', id, url }, '*');
            });
          });
        };
      }
    });

    // 5. Inject capture.js
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['capture.js'],
      world: 'MAIN'
    });

    // 6. Inject content script (element picker UI)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
      world: 'MAIN'
    });

  } catch (e) {
    console.warn('[web-to-figma] inject failed:', e.message);
  }
}

chrome.action.onClicked.addListener(activate);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'FIGMA_CAPTURE_FETCH_ASSET' && msg.url) {
    (async () => {
      const dataUrl = await proxyFetchAsset(msg.url);
      if (dataUrl) {
        const parts = dataUrl.split(',');
        const meta = parts[0].match(/data:([^;]+)/);
        const base64 = parts[1];
        sendResponse({ ok: true, status: 200, contentType: meta?.[1] || 'image/png', base64 });
      } else {
        sendResponse({ ok: false, status: 0, error: 'PROXY_FETCH_FAILED' });
      }
    })();
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'capture') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) activate(tab);
  }
});

// Clipboard interceptor: CJK font fix + DOM flattening
function installInterceptor() {
  if (window.__figmaCaptureInterceptor) return;
  window.__figmaCaptureInterceptor = true;

  const _styleCache = new WeakMap();
  const CJK_RE = /[一-鿿㐀-䶿぀-ゟ゠-ヿ가-힯]/;
  const ICON_RE = /Material|Symbol|Icon|FontAwesome|fa-/i;
  const SERIF_FONTS = new Set(['Georgia','Times New Roman','Times','Palatino','Garamond','Cambria']);
  const PASSTHROUGH_TAGS = new Set(['DIV','SPAN','SECTION','ARTICLE','MAIN','ASIDE','HEADER','FOOTER','NAV']);

  function collectText(node) {
    if (!node || typeof node !== 'object') return '';
    if (node.nodeType === 3) return node.text || '';
    if (node.nodeType === 1 && Array.isArray(node.childNodes))
      return node.childNodes.map(collectText).join('');
    return '';
  }

  function isSerif(ff) {
    return ff.split(',').map(f => f.trim().replace(/^["']|["']$/g, '')).some(f => SERIF_FONTS.has(f) || f === 'serif');
  }

  function fixFont(node) {
    if (!node || typeof node !== 'object' || node.nodeType === 3) return;
    if (node.nodeType === 1) {
      if (Array.isArray(node.childNodes)) node.childNodes.forEach(fixFont);
      const ff = node.styles?.fontFamily;
      const cachedStyle = _styleCache.get(node);
      const existingStyle = cachedStyle || (node.styles || {});
      if (!ff) { _styleCache.set(node, { ...existingStyle, fontFamily: 'Noto Sans SC' }); return; }
      if (/PingFang|Noto (Sans|Serif) SC/i.test(ff)) return;
      if (ICON_RE.test(ff)) {
        const text = collectText(node);
        if (text && CJK_RE.test(text)) { _styleCache.set(node, { ...(_styleCache.get(node) || {}), fontFamily: ff + ', PingFang SC' }); }
        return;
      }
      const text = collectText(node);
      if (text && CJK_RE.test(text)) {
        _styleCache.set(node, { ...(_styleCache.get(node) || {}), fontFamily: isSerif(ff) ? 'Noto Serif SC' : 'PingFang SC' });
      }
    }
  }

  const TRANSPARENT_RE = /transparent|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(\.0+)?\s*\)/i;

  function hasDecoration(node) {
    const s = node.styles || {};
    if (s.backgroundColor && !TRANSPARENT_RE.test(s.backgroundColor) && s.backgroundColor !== 'rgba(0, 0, 0, 0)') return true;
    if (s.backgroundImage && s.backgroundImage !== 'none') return true;
    for (const key of ['boxShadow', 'outline']) { if (s[key] && s[key] !== 'none') return true; }
    if (s.opacity && s.opacity !== '1') return true;
    for (const side of ['Top','Right','Bottom','Left']) {
      const w = s[`border${side}Width`];
      if (w && w !== '0' && w !== '0px') {
        const c = s[`border${side}Color`];
        if (c && !TRANSPARENT_RE.test(c)) return true;
      }
    }
    return false;
  }

  function sizeMatch(a, b) {
    if (!a || !b) return true;
    return Math.abs((a.width||0)-(b.width||0)) <= 4 && Math.abs((a.height||0)-(b.height||0)) <= 4;
  }

  function canFlatten(node) {
    if (!node || node.nodeType !== 1) return false;
    if (!PASSTHROUGH_TAGS.has((node.tag||'').toUpperCase())) return false;
    if (hasDecoration(node)) return false;
    const children = Array.isArray(node.childNodes) ? node.childNodes : [];
    if (children.length !== 1) return false;
    const child = children[0];
    const s = node.styles || {};
    const hasClip = s.overflow === 'hidden' || s.overflow === 'clip';
    if (hasClip && !sizeMatch(node.rect, child.rect)) return false;
    if (child.nodeType === 3) return true;
    return sizeMatch(node.rect, child.rect);
  }

  function flatten(node) {
    if (!node || typeof node !== 'object' || node.nodeType === 3) return node;
    if (node.nodeType === 1 && Array.isArray(node.childNodes)) {
      node.childNodes = node.childNodes.map(flatten);
      const hasSiblings = node.childNodes.length > 1;
      node.childNodes = node.childNodes.map(child => {
        if (canFlatten(child)) {
          const promoted = child.childNodes[0];
          if (promoted.nodeType === 3 && hasSiblings) return child;
          return promoted;
        }
        return child;
      });
    }
    return node;
  }

  function cleanup(node) {
    if (!node || typeof node !== 'object' || node.nodeType === 3) return node;
    if (node.nodeType === 1 && Array.isArray(node.childNodes)) {
      node.childNodes = node.childNodes.map(cleanup).filter(Boolean);
      node.childNodes = node.childNodes.filter(child => {
        if (child.nodeType === 3) return (child.text || '').trim().length > 0;
        return true;
      });
    }
    return node;
  }

  function transform(root) {
    fixFont(root);
    for (let i = 0; i < 3; i++) { cleanup(root); flatten(root); }
    return root;
  }

  const origWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
  navigator.clipboard.writeText = async function(text) {
    try {
      if (typeof text !== 'string' || !text.trim().startsWith('{')) return origWriteText(text);
      const obj = JSON.parse(text);
      const root = obj.root || obj;
      if (root.nodeType === 1) { transform(root); return origWriteText(JSON.stringify(obj)); }
    } catch {}
    return origWriteText(text);
  };

  const H2D_PREFIX = '<!--(figh2d)';
  const H2D_SUFFIX = '(/figh2d)-->';
  const origWrite = navigator.clipboard.write.bind(navigator.clipboard);
  navigator.clipboard.write = async function(items) {
    const newItems = await Promise.all([...items].map(async (item) => {
      const types = item.types || [];
      if (!types.includes('text/html')) return item;
      try {
        const blob = await item.getType('text/html');
        const html = await blob.text();
        const match = html.match(/data-h2d="([^"]*)"/);
        if (!match) return item;
        let encoded = match[1];
        if (encoded.startsWith(H2D_PREFIX)) encoded = encoded.slice(H2D_PREFIX.length);
        if (encoded.endsWith(H2D_SUFFIX)) encoded = encoded.slice(0, -H2D_SUFFIX.length);
        const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const payload = JSON.parse(new TextDecoder().decode(bytes));
        const root = payload.root || payload;
        if (root.nodeType === 1) transform(root);
        const outBytes = new TextEncoder().encode(JSON.stringify(payload));
        let binary = '';
        for (let i = 0; i < outBytes.length; i += 8192)
          binary += String.fromCharCode(...outBytes.subarray(i, i + 8192));
        const newAttr = H2D_PREFIX + btoa(binary) + H2D_SUFFIX;
        const fixedHtml = html.replace(match[1], newAttr);
        const data = {};
        for (const t of types)
          data[t] = t === 'text/html' ? new Blob([fixedHtml], { type: 'text/html' }) : await item.getType(t);
        return new ClipboardItem(data);
      } catch { return item; }
    }));
    return origWrite(newItems);
  };
}
