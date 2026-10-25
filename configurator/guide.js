/* ==========================================================================
   VAULT / USSA — 装配指南（阶段 4）
   四个分区：抽屉组装 / 储物箱组装 / 安装与改装 / 小零件图鉴
   内容见 data/guide-content.js，分页图见 assets/manuals/<doc>/page-XX.jpg
   ========================================================================== */
'use strict';

(() => {
  const DATA = window.VAULT_GUIDE_DATA || null;

  const state = {
    tab: 'drawer',
    step: 0,
    mount: 'wall'
  };

  const TABS = [
    { id: 'drawer', label: '抽屉组装', en: 'DRAWER' },
    { id: 'sustainer', label: '储物箱组装', en: 'SUSTAINER' },
    { id: 'mounts', label: '安装与改装', en: 'MOUNT' },
    { id: 'parts', label: '小零件图鉴', en: 'SMALL PARTS' }
  ];

  /* ---------------- helpers ---------------- */

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function manualTitle(doc) {
    const manual = DATA && DATA.manuals ? DATA.manuals[doc] : null;
    return manual ? manual.title : `手册 ${doc}`;
  }

  function imgPath(doc, page) {
    return `assets/manuals/${doc}/page-${pad2(page)}.jpg`;
  }

  function pdfHref(doc, page) {
    const manual = DATA && DATA.manuals ? DATA.manuals[doc] : null;
    if (!manual || !manual.pdf) return '';
    return `../${encodeURIComponent(manual.pdf)}#page=${page}`;
  }

  function pdfLink(doc, page, label) {
    const href = pdfHref(doc, page);
    if (!href) return '';
    return `<a class="guide-pdf" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function wireImages(scope) {
    scope.querySelectorAll('img[data-guide-img]').forEach((img) => {
      const markMissing = () => {
        const box = img.closest('[data-figure]');
        if (box) box.classList.add('is-missing');
      };
      img.addEventListener('error', markMissing, { once: true });
      if (img.complete && img.naturalWidth === 0) markMissing();
    });
  }

  /* ---------------- assembly ---------------- */

  function stepCard(set, doc, page, index) {
    const total = set.steps.length;
    const step = set.steps[index];
    const title = manualTitle(doc);
    const prevDisabled = index === 0 ? ' disabled' : '';
    const nextDisabled = index === total - 1 ? ' disabled' : '';
    return `
      <article class="guide-step-card">
        <header class="guide-step-head">
          <span><b>STEP ${pad2(index + 1)}</b> / ${pad2(total)}</span>
          <span>${esc(title)} · 第 ${page} 页</span>
        </header>
        <figure class="guide-figure" data-figure>
          <img src="${imgPath(doc, page)}" alt="${esc(`${set.name}组装第${index + 1}步：${step.title}`)}"
               loading="lazy" decoding="async" data-guide-img>
          <span class="guide-figure-missing">该页图片未载入 · 请打开 PDF 第 ${page} 页</span>
        </figure>
        <div class="guide-step-body">
          <span class="guide-kicker">ASSEMBLY / ${esc(set.name)} · ${pad2(index + 1)}</span>
          <h2>${esc(step.title)}</h2>
          <p>${esc(step.text)}</p>
          <div class="guide-step-bar">
            <button type="button" class="guide-btn" data-guide-prev${prevDisabled}>← 上一步</button>
            <span class="guide-count">${pad2(index + 1)} / ${pad2(total)}</span>
            <button type="button" class="guide-btn is-accent" data-guide-next${nextDisabled}>下一步 →</button>
            ${pdfLink(doc, page, '在说明书中打开')}
          </div>
        </div>
      </article>
    `;
  }

  function hardwareCard(hardware) {
    if (!hardware) return '';
    const items = (hardware.items || []).map(([name, qty]) => `
      <li><span>${esc(name)}</span><b>${esc(qty)}</b></li>
    `).join('');
    return `
      <section class="guide-hw-card">
        <header>
          <h3>${esc(hardware.title)}</h3>
          <span>PAGE ${pad2(hardware.page)}</span>
        </header>
        <ul>${items}</ul>
        ${hardware.note ? `<p>${esc(hardware.note)}</p>` : ''}
        ${pdfLink(hardware.doc, hardware.page, `来源：使用说明第 ${hardware.page} 页`)}
      </section>
    `;
  }

  function renderAssembly(key) {
    const set = DATA && DATA.assembly ? DATA.assembly[key] : null;
    if (!set || !Array.isArray(set.steps) || !set.steps.length) {
      return '<p class="guide-empty">该组装指南暂无内容。</p>';
    }
    const pages = Array.isArray(set.pages) && set.pages.length ? set.pages : set.steps.map((_, i) => i + 1);
    state.step = clamp(state.step, 0, set.steps.length - 1);
    const index = state.step;
    const page = pages[index] || index + 1;
    const pct = Math.round(((index + 1) / set.steps.length) * 100);
    const nav = set.steps.map((step, i) => `
      <li>
        <button type="button" class="guide-step-btn${i === index ? ' is-active' : ''}"
                data-guide-step="${i}"${i === index ? ' aria-current="step"' : ''}>
          <span>${pad2(i + 1)}</span>
          <b>${esc(step.title)}</b>
        </button>
      </li>
    `).join('');
    const hardware = DATA.assembly.drawer && DATA.assembly.sustainer
      ? [hardwareCard(DATA.assembly.drawer.hardware), hardwareCard(DATA.assembly.sustainer.hardware)].join('')
      : '';

    return `
      <div class="guide-assembly">
        <nav class="guide-step-nav" aria-label="${esc(set.name)}组装步骤">
          <header>
            <b>${esc(set.name)} · ${pad2(set.steps.length)} 步</b>
            <span>${esc(manualTitle(set.doc))}</span>
          </header>
          <div class="guide-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
            <i style="width:${pct}%"></i>
          </div>
          <ol>${nav}</ol>
        </nav>
        ${stepCard(set, set.doc, page, index)}
      </div>
      <div class="guide-hardware">${hardware}</div>
    `;
  }

  /* ---------------- mounts ---------------- */

  function mountCard(key, mount) {
    const active = key === state.mount ? ' is-active' : '';
    return `
      <button type="button" class="guide-mount-card${active}" data-guide-mount="${key}"
              aria-pressed="${key === state.mount}">
        <span class="guide-mount-thumb" data-figure>
          <img src="${imgPath(mount.doc, mount.image)}" alt="${esc(mount.name)}原版安装图"
               loading="lazy" decoding="async" data-guide-img>
          <span class="guide-figure-missing">图片未载入</span>
        </span>
        <b>${esc(mount.name)}</b>
        <small>${esc(mount.intro)}</small>
      </button>
    `;
  }

  function renderMounts() {
    const mounts = DATA && DATA.mounts ? DATA.mounts : null;
    const keys = mounts ? Object.keys(mounts) : [];
    if (!keys.length) return '<p class="guide-empty">暂无安装与改装内容。</p>';
    if (!mounts[state.mount]) state.mount = keys[0];
    const mount = mounts[state.mount];
    const steps = (mount.steps || []).map((text, i) => `
      <li><b>${pad2(i + 1)}</b><p>${esc(text)}</p></li>
    `).join('');
    return `
      <div class="guide-mount-grid">
        ${keys.map((key) => mountCard(key, mounts[key])).join('')}
      </div>
      <article class="guide-mount-detail">
        <header class="guide-mount-head">
          <div>
            <span class="guide-kicker">MOUNT &amp; MODIFY / ${esc(manualTitle(mount.doc))}</span>
            <h2>${esc(mount.name)}</h2>
          </div>
          ${pdfLink(mount.doc, mount.image, `手册第 ${mount.image} 页`)}
        </header>
        <p class="guide-mount-intro">${esc(mount.intro)}</p>
        <ol class="guide-install">${steps}</ol>
        <figure class="guide-figure" data-figure>
          <img src="${imgPath(mount.doc, mount.image)}" alt="${esc(mount.name)}原版说明"
               loading="lazy" decoding="async" data-guide-img>
          <span class="guide-figure-missing">该页图片未载入 · 请打开 PDF 第 ${mount.image} 页</span>
        </figure>
        ${pdfLink(mount.doc, mount.image, '在说明书中打开')}
      </article>
    `;
  }

  /* ---------------- small parts ---------------- */

  function spotsHTML(spots) {
    return (spots || []).map(([part, label, x, y]) => `
      <span class="guide-spot" style="left:${x}%;top:${y}%" title="${esc(part)}">${esc(label)}</span>
    `).join('');
  }

  function partCard(figure) {
    return `
      <article class="guide-part-card">
        <header class="guide-part-head">
          <h3>${esc(figure.title)}</h3>
          <span>P${pad2(figure.page)}</span>
        </header>
        <div class="guide-part-figure" data-figure>
          <img src="${imgPath(figure.doc, figure.page)}" alt="${esc(figure.title)}原版安装位置图"
               loading="lazy" decoding="async" data-guide-img>
          <span class="guide-figure-missing">图片未载入 · 见手册第 ${figure.page} 页</span>
          ${spotsHTML(figure.spots)}
        </div>
        <p class="guide-part-note">${esc(figure.note)}</p>
        ${pdfLink(figure.doc, figure.page, `手册第 ${figure.page} 页`)}
      </article>
    `;
  }

  function renderParts() {
    const parts = DATA && DATA.smallParts ? DATA.smallParts : null;
    const groups = parts && parts.groups ? parts.groups : null;
    const order = parts && Array.isArray(parts.order) ? parts.order : (groups ? Object.keys(groups) : []);
    if (!groups || !order.length) return '<p class="guide-empty">暂无小零件图鉴。</p>';
    const sections = order.map((key) => {
      const group = groups[key];
      if (!group || !Array.isArray(group.figures) || !group.figures.length) return '';
      return `
        <section class="guide-parts-group">
          <header class="guide-group-head">
            <h2>${esc(group.name)}</h2>
            <span>${group.figures.length} 组 · 对照原版手册</span>
          </header>
          <div class="guide-parts-grid">
            ${group.figures.map((figure) => partCard(figure)).join('')}
          </div>
        </section>
      `;
    }).join('');
    const roles = parts.roles || {};
    const roleNotes = ['jig', 'rails']
      .filter((key) => roles[key])
      .map((key) => `
        <div>
          <b>${esc(roles[key].name)}</b>
          <p>${esc(roles[key].text)}</p>
        </div>
      `).join('');
    return `
      ${sections}
      ${roleNotes ? `<section class="guide-roles"><header><span>工装与选配 / ROLE</span></header><div>${roleNotes}</div></section>` : ''}
    `;
  }

  /* ---------------- shell ---------------- */

  function render() {
    const root = document.getElementById('guide-root');
    if (!root) return;
    if (!DATA || !DATA.assembly) {
      root.innerHTML = '<p class="guide-empty">指南数据未载入，请检查 data/guide-content.js。</p>';
      return;
    }
    const tab = state.tab;
    const tabsHTML = TABS.map((item, i) => `
      <button type="button" class="guide-tab${tab === item.id ? ' is-active' : ''}"
              data-guide-tab="${item.id}" aria-pressed="${tab === item.id}">
        <span>${pad2(i + 1)}</span>
        <b>${item.label}</b>
        <i>${item.en}</i>
      </button>
    `).join('');
    let body = '';
    if (tab === 'mounts') body = renderMounts();
    else if (tab === 'parts') body = renderParts();
    else body = renderAssembly(tab);

    root.innerHTML = `
      <div class="guide-tabs">${tabsHTML}</div>
      <div class="guide-body">${body}</div>
    `;
    wireImages(root);
    root.onclick = handleClick;
  }

  function resetScroll() {
    const work = document.querySelector('.work');
    if (work) work.scrollTop = 0;
    const view = document.getElementById('view-guide');
    if (view) view.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function handleClick(ev) {
    const tabBtn = ev.target.closest('[data-guide-tab]');
    if (tabBtn) {
      const id = tabBtn.dataset.guideTab;
      if (!TABS.some((item) => item.id === id)) return;
      state.tab = id;
      if (id === 'drawer' || id === 'sustainer') state.step = 0;
      render();
      resetScroll();
      return;
    }

    const stepBtn = ev.target.closest('[data-guide-step]');
    if (stepBtn) {
      state.step = Number(stepBtn.dataset.guideStep) || 0;
      render();
      return;
    }

    if (ev.target.closest('[data-guide-prev]')) {
      state.step = Math.max(0, state.step - 1);
      render();
      return;
    }

    if (ev.target.closest('[data-guide-next]')) {
      const set = DATA.assembly[state.tab];
      const last = set && Array.isArray(set.steps) ? set.steps.length - 1 : 0;
      state.step = Math.min(last, state.step + 1);
      render();
      return;
    }

    const mountBtn = ev.target.closest('[data-guide-mount]');
    if (mountBtn) {
      state.mount = mountBtn.dataset.guideMount;
      render();
    }
  }

  window.VaultGuide = { render };
})();
