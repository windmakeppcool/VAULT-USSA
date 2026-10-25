/* ==========================================================================
   VAULT / USSA — local PDF manual reader
   Self-contained: injects its nav entry, modal and stylesheet.
   ========================================================================== */
'use strict';

(() => {
  if (window.__vaultManualsReader) return;
  window.__vaultManualsReader = true;

  /* ---------- data ---------- */

  const MANUALS = [
    {
      id: '01',
      titleZh: '使用说明书',
      titleEn: 'Instructions Manual',
      files: { zh: '01_使用说明书_中文版.pdf', en: '01_Instructions Manual.pdf' },
    },
    {
      id: '02',
      titleZh: '抽屉组装',
      titleEn: 'Drawer Assembly',
      files: { zh: '02_抽屉组装_中文版.pdf', en: '02_Drawer Assembly.pdf' },
    },
    {
      id: '03',
      titleZh: '承托收纳盒组装',
      titleEn: 'Sustainers Assembly',
      files: { zh: '03_承托收纳盒组装_中文版.pdf', en: '03_Sustainers Assembly.pdf' },
    },
    {
      id: '04',
      titleZh: '选配改造件',
      titleEn: 'Modifications',
      files: { zh: '04_选配改造件_中文版.pdf', en: '04_Modifications.pdf' },
    },
    {
      id: '05',
      titleZh: '安装说明',
      titleEn: 'Mounting Instructions',
      files: { zh: '05_安装说明_中文版.pdf', en: '05_Mounting Instructions.pdf' },
    },
  ];

  const MANUAL_BY_ID = new Map(MANUALS.map((manual) => [manual.id, manual]));
  const STORAGE_KEY = 'vault-ussat-manual-v1';
  const FILE_MODE = location.protocol === 'file:';
  const LANG_LABEL = { zh: '中文版', en: '英文版' };
  const SCRIPT_SRC = document.currentScript && document.currentScript.src ? document.currentScript.src : '';

  function detectLang() {
    return String(document.documentElement.lang || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  const state = { id: '01', lang: detectLang() };

  /* ---------- storage ---------- */

  function readSavedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && MANUAL_BY_ID.has(saved.id)) state.id = saved.id;
      if (saved && (saved.lang === 'zh' || saved.lang === 'en')) state.lang = saved.lang;
    } catch (_) {
      /* storage can be unavailable under file:// or private mode */
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: state.id, lang: state.lang }));
    } catch (_) {
      /* non-fatal */
    }
  }

  /* ---------- paths ---------- */

  function manualURL(filename) {
    return '../' + encodeURIComponent(filename);
  }

  /* HEAD checks are cached; null means the server could not be verified. */
  const availability = new Map();

  function checkAvailability(url) {
    if (FILE_MODE) return Promise.resolve(true);
    if (availability.has(url)) return availability.get(url);

    const pending = fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then((response) => {
        if (response.ok) return true;
        if (response.status === 404 || response.status === 410) return false;
        return null;
      })
      .catch(() => null);

    availability.set(url, pending);
    return pending;
  }

  async function resolveManual(manual, lang) {
    const primaryName = manual.files[lang];
    const primaryURL = manualURL(primaryName);

    if (FILE_MODE) {
      return {
        name: primaryName,
        url: primaryURL,
        lang,
        fallback: false,
        missing: false,
        local: true,
      };
    }

    const primary = await checkAvailability(primaryURL);
    if (primary !== false) {
      return { name: primaryName, url: primaryURL, lang, fallback: false, missing: false, unknown: primary === null };
    }

    const altLang = lang === 'zh' ? 'en' : 'zh';
    const altName = manual.files[altLang];
    const altURL = manualURL(altName);
    const alt = await checkAvailability(altURL);

    if (alt === false) {
      return { name: primaryName, url: primaryURL, lang, fallback: false, missing: true };
    }

    return { name: altName, url: altURL, lang: altLang, fallback: true, missing: false, unknown: alt === null };
  }

  /* ---------- stylesheet ---------- */

  function injectStylesheet() {
    const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((link) =>
      /(^|\/)manuals\.css(?:[?#].*)?$/i.test(link.getAttribute('href') || link.href || '')
    );
    if (existing) return;

    let href = 'manuals.css';
    if (SCRIPT_SRC) {
      try {
        href = new URL('manuals.css', SCRIPT_SRC).href;
      } catch (_) {
        /* keep relative href */
      }
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  /* ---------- injection ---------- */

  function injectRailButton() {
    const rail = document.querySelector('.rail');
    if (!rail || document.getElementById('vm-open')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'vm-open';
    button.className = 'rail-btn rail-btn--manuals';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'vm-overlay');
    button.innerHTML = '<span>PDF</span><b>说明书</b><i>MANUALS</i>';

    const bomButton = rail.querySelector('[data-tab="bom"]');
    const foot = rail.querySelector('.rail-foot');
    rail.insertBefore(button, bomButton || foot || null);
  }

  function manualItemHTML(manual) {
    return (
      '<button type="button" class="vm-item" role="option" aria-selected="false" data-vm-id="' + manual.id + '">' +
        '<span class="vm-item-num">' + manual.id + '</span>' +
        '<span class="vm-item-titles">' +
          '<b>' + manual.titleZh + '</b>' +
          '<i>' + manual.titleEn + '</i>' +
        '</span>' +
        '<span class="vm-item-arrow" aria-hidden="true">→</span>' +
      '</button>'
    );
  }

  function injectModal() {
    if (document.getElementById('vm-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'vm-overlay';
    overlay.id = 'vm-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="vm-panel" role="dialog" aria-modal="true" aria-labelledby="vm-title">' +
        '<header class="vm-head">' +
          '<div>' +
            '<div class="vm-kicker">VAULT / DOCUMENTATION · PDF</div>' +
            '<h2 class="vm-title" id="vm-title">说明书 <span>MANUALS</span></h2>' +
          '</div>' +
          '<div class="vm-head-meta">' +
            '<span class="vm-count">05 FILES / 本地文件</span>' +
            '<button type="button" class="vm-close" id="vm-close" aria-label="关闭说明书">×</button>' +
          '</div>' +
        '</header>' +
        '<div class="vm-body">' +
          '<aside class="vm-side">' +
            '<div class="vm-side-head"><span>SELECT MANUAL</span><b>选择手册</b></div>' +
            '<div class="vm-list" id="vm-list" role="listbox" aria-label="说明书列表">' +
              MANUALS.map(manualItemHTML).join('') +
            '</div>' +
            '<div class="vm-lang">' +
              '<span class="vm-lang-label">LANGUAGE / 语言</span>' +
              '<div class="vm-lang-toggle" role="group" aria-label="说明书语言">' +
                '<button type="button" class="vm-lang-btn" data-vm-lang="zh" aria-pressed="false">中文</button>' +
                '<button type="button" class="vm-lang-btn" data-vm-lang="en" aria-pressed="false">EN</button>' +
              '</div>' +
              '<p class="vm-mode-note" id="vm-mode-note" hidden></p>' +
            '</div>' +
          '</aside>' +
          '<section class="vm-viewer">' +
            '<div class="vm-viewer-head">' +
              '<div class="vm-file">' +
                '<span class="vm-file-label">CURRENT FILE / 当前文件</span>' +
                '<b class="vm-filename" id="vm-filename">—</b>' +
              '</div>' +
              '<div class="vm-status-row">' +
                '<span class="vm-badge" id="vm-badge" hidden></span>' +
                '<span class="vm-status" id="vm-status" role="status" aria-live="polite"></span>' +
              '</div>' +
            '</div>' +
            '<div class="vm-frame-wrap">' +
              '<iframe class="vm-frame" id="vm-frame" title="PDF 说明书预览"></iframe>' +
              '<div class="vm-empty" id="vm-empty" hidden>' +
                '<div><b>NO PDF</b><span id="vm-empty-text"></span></div>' +
              '</div>' +
            '</div>' +
            '<footer class="vm-actions">' +
              '<a class="vm-action vm-action--primary" id="vm-open-link" target="_blank" rel="noopener">' +
                '在新窗口打开 <span aria-hidden="true">↗</span>' +
              '</a>' +
              '<a class="vm-action" id="vm-download-link" download>下载 PDF <span aria-hidden="true">↓</span></a>' +
              '<span class="vm-hint">本地 PDF · 无需上传</span>' +
            '</footer>' +
          '</section>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
  }

  /* ---------- elements ---------- */

  const el = {};
  let opener = null;
  let loadToken = 0;

  function cacheElements() {
    el.overlay = document.getElementById('vm-overlay');
    el.panel = el.overlay.querySelector('.vm-panel');
    el.close = document.getElementById('vm-close');
    el.list = document.getElementById('vm-list');
    el.filename = document.getElementById('vm-filename');
    el.status = document.getElementById('vm-status');
    el.badge = document.getElementById('vm-badge');
    el.frame = document.getElementById('vm-frame');
    el.empty = document.getElementById('vm-empty');
    el.emptyText = document.getElementById('vm-empty-text');
    el.openLink = document.getElementById('vm-open-link');
    el.downloadLink = document.getElementById('vm-download-link');
    el.modeNote = document.getElementById('vm-mode-note');
    el.langButtons = Array.from(el.overlay.querySelectorAll('[data-vm-lang]'));
  }

  /* ---------- rendering ---------- */

  function syncChrome() {
    Array.from(el.list.querySelectorAll('[data-vm-id]')).forEach((item) => {
      const active = item.dataset.vmId === state.id;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    el.langButtons.forEach((button) => {
      const active = button.dataset.vmLang === state.lang;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (FILE_MODE) {
      el.modeNote.hidden = false;
      el.modeNote.textContent =
        'FILE:// 模式：无法校验语言版本，内嵌预览也可能被浏览器阻止；请使用下方链接打开或下载。';
    } else {
      el.modeNote.hidden = true;
      el.modeNote.textContent = '';
    }
  }

  function setBadge(text, variant) {
    if (!text) {
      el.badge.hidden = true;
      el.badge.textContent = '';
      el.badge.className = 'vm-badge';
      return;
    }
    el.badge.hidden = false;
    el.badge.textContent = text;
    el.badge.className = 'vm-badge' + (variant ? ' ' + variant : '');
  }

  function setStatus(text, warn) {
    el.status.textContent = text;
    el.status.classList.toggle('is-warn', Boolean(warn));
  }

  function setLinks(url, filename, enabled) {
    if (!enabled) {
      el.openLink.removeAttribute('href');
      el.downloadLink.removeAttribute('href');
      el.openLink.classList.add('is-disabled');
      el.downloadLink.classList.add('is-disabled');
      el.downloadLink.removeAttribute('download');
      return;
    }

    el.openLink.href = url;
    el.downloadLink.href = url;
    el.downloadLink.setAttribute('download', filename);
    el.openLink.classList.remove('is-disabled');
    el.downloadLink.classList.remove('is-disabled');
  }

  function clearFrame() {
    el.frame.classList.add('is-disabled');
    el.frame.removeAttribute('src');
    el.empty.hidden = true;
    el.emptyText.textContent = '';
  }

  function showEmpty(message) {
    el.frame.classList.add('is-disabled');
    el.frame.removeAttribute('src');
    el.empty.hidden = false;
    el.emptyText.innerHTML = message;
  }

  function applyResult(manual, result) {
    if (result.missing) {
      el.filename.textContent = manual.files[state.lang];
      setBadge('MISSING / 缺失', 'is-missing');
      setStatus('中文版与英文版均未找到，请确认 PDF 文件位于项目根目录。', true);
      setLinks('', '', false);
      showEmpty('中文版与英文版均未找到<br>请确认 PDF 文件位于项目根目录');
      return;
    }

    el.filename.textContent = result.name;
    setLinks(result.url, result.name, true);
    el.empty.hidden = true;

    if (result.local) {
      setBadge('LOCAL / 本地', 'is-local');
      setStatus('本地文件模式：已尝试内嵌预览；若空白，请使用新窗口或下载链接。', false);
    } else if (result.fallback) {
      setBadge('FALLBACK / 已回退', 'is-warn');
      setStatus('未找到' + LANG_LABEL[state.lang] + '，已自动显示' + LANG_LABEL[result.lang], true);
    } else if (result.unknown) {
      setBadge('UNVERIFIED', 'is-local');
      setStatus('无法确认文件状态，已尝试加载' + LANG_LABEL[result.lang] + '。', false);
    } else {
      setBadge(result.lang === 'zh' ? 'ZH / 中文' : 'EN / ENGLISH', 'is-ok');
      setStatus('已加载' + LANG_LABEL[result.lang] + ' PDF。', false);
    }

    el.frame.classList.remove('is-disabled');
    el.frame.src = result.url;
  }

  async function renderManual() {
    const manual = MANUAL_BY_ID.get(state.id) || MANUALS[0];
    state.id = manual.id;
    syncChrome();
    saveState();

    const token = ++loadToken;
    setBadge('', '');
    setStatus('正在检查 PDF 文件…', false);
    el.filename.textContent = manual.files[state.lang];

    const result = await resolveManual(manual, state.lang);
    if (token !== loadToken) return;
    applyResult(manual, result);
  }

  /* ---------- open / close ---------- */

  function openModal() {
    if (!el.overlay || !el.overlay.hidden) return;
    opener = document.activeElement;
    el.overlay.hidden = false;
    document.body.classList.add('vm-locked');
    syncChrome();
    renderManual();
    el.close.focus();
  }

  function closeModal() {
    if (!el.overlay || el.overlay.hidden) return;
    el.overlay.hidden = true;
    document.body.classList.remove('vm-locked');
    if (opener && typeof opener.focus === 'function') opener.focus();
    opener = null;
  }

  /* ---------- events ---------- */

  function onKeydown(event) {
    if (!el.overlay || el.overlay.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      el.panel.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
    ).filter((node) => node.offsetParent !== null || node === document.activeElement);

    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindEvents() {
    const railButton = document.getElementById('vm-open');
    if (railButton) railButton.addEventListener('click', openModal);

    el.close.addEventListener('click', closeModal);

    el.overlay.addEventListener('click', (event) => {
      if (event.target === el.overlay) closeModal();
    });

    el.list.addEventListener('click', (event) => {
      const item = event.target.closest('[data-vm-id]');
      if (!item || !MANUAL_BY_ID.has(item.dataset.vmId)) return;
      if (item.dataset.vmId === state.id) return;
      state.id = item.dataset.vmId;
      renderManual();
    });

    el.langButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const lang = button.dataset.vmLang;
        if (lang !== 'zh' && lang !== 'en') return;
        if (lang === state.lang) return;
        state.lang = lang;
        renderManual();
      });
    });

    document.addEventListener('keydown', onKeydown);
  }

  /* ---------- init ---------- */

  function init() {
    injectStylesheet();
    injectRailButton();
    injectModal();
    cacheElements();
    readSavedState();
    bindEvents();
    syncChrome();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
