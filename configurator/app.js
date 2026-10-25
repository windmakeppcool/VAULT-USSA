'use strict';

(() => {
  const DATA = window.VAULT_DATA;
  const app = document.getElementById('app');
  if (!DATA || !Array.isArray(DATA.files)) {
    document.body.innerHTML = '<div style="padding:40px;font-family:monospace">VAULT 数据未加载：请确认 configurator/data/vault-manifest.js 存在。</div>';
    return;
  }

  const FILES = DATA.files;
  const byPath = new Map(FILES.map((f) => [f.p, f]));
  const LOCAL = window.VaultLocal || null;
  const LOCAL_STL_TOTAL = FILES.filter((f) => /\.stl$/i.test(f.p)).length;
  if (LOCAL) LOCAL.setKnownPaths(FILES.map((f) => f.p));
  const STORAGE_KEY = 'vault-ussat-config-v1';
  const SCHEME_KEY = 'vault-ussat-schemes-v1';
  const COLOR_SCHEME_KEY = 'vault-ussat-color-schemes-v1';
  const COLOR_STUDIO_KEY = 'vault-ussat-color-studio-open';
  const PALETTES = window.VAULT_PALETTES || { swatches: [], presets: {}, defaultPreset: 'classic_industrial' };
  const VAULT_3D = window.VAULT_3D || {};
  const DEFAULT_PRESET = PALETTES.presets[PALETTES.defaultPreset] ? PALETTES.defaultPreset : Object.keys(PALETTES.presets)[0] || '';

  const HW = {
    M4x10: 'M4 × 10 mm',
    M4x14: 'M4 × 14 mm',
    M4x20: 'M4 × 20 mm',
  };

  const STATUS = {
    pending: '待打印',
    printed: '已打印',
    assembled: '已组装',
  };

  const KEY_LABELS = {
    standard: '标准锁匙',
    hidden: '隐藏式锁匙',
    none: '不配钥匙',
  };

  const GROUP = { drawer: 'drawers', sustainer: 'sustainers', mod: 'mods' };
  const DRAWER_FAMS = ['S', 'M', 'L', 'XL', 'L2', 'XL2'];
  const SUSTAINER_FAMS = ['S', 'M', 'L', 'XL'];
  const MOD_FAMS = ['S', 'M', 'L', 'XL'];

  const FAMILIES = {
    S: { label: 'S', sub: 'SHALLOW' },
    M: { label: 'M', sub: 'MEDIUM' },
    L: { label: 'L', sub: 'LONG' },
    XL: { label: 'XL', sub: 'X-LONG' },
    L2: { label: 'L²', sub: '2× WIDTH' },
    XL2: { label: 'XL²', sub: '2× X-LONG' },
    U: { label: 'U', sub: 'UNIVERSAL' },
  };

  const CAT_LABELS = {
    box: '盒体 BOX',
    module: '模块 MODULE',
    roof: '顶盖 ROOF',
    baseplate: '底板 BASEPLATE',
    facade: '前脸 FACADE',
    backpanel: '背板 BACK PANEL',
    rail: '齿条 RAIL',
    divider: '分隔 DIVIDER',
    runner: '滑轨 RUNNER',
    accessory: '配件 ACCESSORY',
    support: '支撑 SUPPORT',
    hardware: '五金 HARDWARE',
    hinge: '铰链 HINGE',
    lock: '锁 LOCK',
    rod: '连杆 ROD',
    backbone: '骨架 BACKBONE',
    base: '底座 BASE',
    feet: '脚垫 FEET',
    wallmount: '挂墙 WALL MOUNT',
    wheel: '轮组 WHEEL',
    handle: '提手 HANDLE',
    pegboard: '洞洞板 PEGBOARD',
    other: '其他 OTHER',
  };

  const MOD_CATS = ['backbone', 'base', 'feet', 'wallmount', 'wheel', 'handle', 'pegboard'];
  const ROOF_ORDER = ['Bowl Roof', 'Grid Roof', 'Table Roof', 'Under Table Mount Roof', 'Heawyweight Roof'];
  const PLATE_ORDER = [
    'Baseplate',
    'Baseplate_With 1 Handle',
    'Baseplate_With 2 Handles',
    'Gridfinity Baseplate 2_Handles',
    'Gridfinity Baseplate No_Handles',
  ];

  const VARIANT_LABELS = {
    'Bowl Roof': '碗形顶盖',
    'Grid Roof': '网格顶盖',
    'Table Roof': '台面顶盖',
    'Under Table Mount Roof': '桌下安装顶盖',
    'Heawyweight Roof': '加重顶盖',
    Baseplate: '标准底板',
    'Baseplate_With 1 Handle': '单提手底板',
    'Baseplate_With 2 Handles': '双提手底板',
    'Gridfinity Baseplate 2_Handles': '双提手底板',
    'Gridfinity Baseplate No_Handles': '无提手底板',
    'Baseplate Part 1': '分体底板 Part 1',
    'Baseplate Part 2': '分体底板 Part 2',
    'Part 1 Gridfinity Baseplate': '分体底板 Part 1',
    'Part 2 Gridfinity Baseplate': '分体底板 Part 2',
    'Module 1F': '1 层模块',
    'Module 2F': '2 层模块',
    'Module 4F': '4 层模块',
    '1F Module': '1F 模块',
    '2F Module': '2F 模块',
    '4F Module': '4F 模块',
    '1F Flat Module': '1F 平板模块',
    '2F Flat Module': '2F 平板模块',
    '4F Flat Module': '4F 平板模块',
    '1F Dividers Module': '1F 分隔模块',
    '2F Dividers Module': '2F 分隔模块',
    '4F Dividers Module': '4F 分隔模块',
    '1F Sealed Module': '1F 密封模块',
    '2F Sealed Module': '2F 密封模块',
    '4F Sealed Module': '4F 密封模块',
    Roof: '顶盖',
    'Roof Whole': '整体顶盖',
    'Roof Part 1': '顶盖 Part 1',
    'Roof Part 2': '顶盖 Part 2',
    'Connector For Split Roof': '分体顶盖连接件',
    Facade: '前脸',
    'Back Panel': '背板',
    'S1F (Turn On Supports)': '前脸',
    'S-M 1F Hinge': 'S/M 1F 铰链',
    'S-M 2-4F Hinge': 'S/M 2-4F 铰链',
    'L-XL 1F Hinge': 'L/XL 1F 铰链',
    'L 2-4F Hinge': 'L 2-4F 铰链',
  };

  // ---------------------------------------------------------------- colors

  const COLOR_KEY_BY_CAT = {
    box: 'box',
    module: 'module',
    roof: 'roof',
    baseplate: 'baseplate',
    facade: 'facade',
    backpanel: 'facade',
    rail: 'rails',
    runner: 'rails',
    accessory: 'rails',
    support: 'rails',
    divider: 'divider',
    hinge: 'hinge',
    lock: 'lock',
    rod: 'rods',
    handle: 'handle',
    backbone: 'backbone',
    pegboard: 'backbone',
    base: 'base',
    feet: 'base',
    wallmount: 'wall',
    wheel: 'wheels',
    hardware: 'accent',
    other: 'accent',
  };

  const COLOR_NAME_RULES = [
    [/runner stopper/i, 'stopper'],
    [/runner guides?/i, 'guides'],
    [/runner slides?/i, 'slides'],
    [/springs?/i, 'springs'],
    [/latch/i, 'latch'],
    [/lock holder/i, 'lockholder'],
    [/lock inner/i, 'lockinner'],
    [/lock outer/i, 'lockouter'],
    [/pins? for 1 lock/i, 'pins'],
    [/heavyweight roof insert|heawyweight roof insert/i, 'roof'],
    [/handle lock|handle lock knob/i, 'lock'],
    [/top handle|roof handle|pull-out handle|stationary handle/i, 'handle'],
    [/rods?/i, 'rods'],
    [/rails?/i, 'rails'],
    [/tyre/i, 'tyre'],
    [/key(?! ?hole)/i, 'lock'],
    [/facade ?cap|label/i, 'facade'],
  ];

  const COLOR_LABELS = {
    module: ['模块', 'MODULE'],
    box: ['盒体', 'BOX'],
    roof: ['顶盖', 'ROOF'],
    baseplate: ['底板', 'BASEPLATE'],
    facade: ['面板', 'FACADE'],
    rails: ['齿条', 'RAILS'],
    guides: ['导向件', 'GUIDES'],
    slides: ['滑块', 'SLIDES'],
    stopper: ['限位件', 'STOPPER'],
    springs: ['弹簧', 'SPRINGS'],
    latch: ['搭扣', 'LATCH'],
    lock: ['锁具', 'LOCK'],
    lockholder: ['锁座', 'LOCK HOLDER'],
    lockinner: ['内锁件', 'LOCK INNER'],
    lockouter: ['外锁件', 'LOCK OUTER'],
    pins: ['插销', 'PINS'],
    handle: ['提手', 'HANDLE'],
    hinge: ['铰链', 'HINGE'],
    rods: ['连杆', 'RODS'],
    divider: ['分隔', 'DIVIDER'],
    backbone: ['骨架', 'BACKBONE'],
    base: ['底座', 'BASE'],
    feet: ['脚垫', 'FEET'],
    wall: ['挂墙件', 'WALL'],
    wheels: ['轮组', 'WHEELS'],
    tyre: ['轮胎', 'TYRE'],
    accent: ['其他', 'ACCENT'],
  };

  const COLOR_ORDER = Object.keys(COLOR_LABELS);

  const ICONS = {
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v14"/><path d="m6 12 6 6 6-6"/><path d="M5 21h14"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></svg>',
    plus: '+',
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (v) =>
    String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const uniq = (arr) => Array.from(new Set(arr));
  const byOrder = (arr, order) => {
    const set = new Set(arr);
    const head = order.filter((v) => set.has(v));
    const tail = arr.filter((v) => !order.includes(v)).sort((a, b) => a.localeCompare(b));
    return [...head, ...tail];
  };

  const fmtSize = (bytes) => {
    if (!bytes) return '0 MB';
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${Math.max(1, Math.round(bytes / 1e6))} MB`;
  };

  const sumSize = (parts) => parts.reduce((acc, e) => acc + (e.s || 0), 0);
  const variantLabel = (v) => VARIANT_LABELS[v] || v;
  const isInBom = (p) => state.bom.some((i) => i.p === p);

  // ---- color helpers ---------------------------------------------------

  function presetColors(id) {
    const preset = PALETTES.presets[id] || PALETTES.presets[DEFAULT_PRESET];
    return preset && preset.colors ? { ...preset.colors } : {};
  }

  function normalizeHex(value, fallback) {
    const raw = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
      return `#${raw.slice(1).split('').map((c) => c + c).join('')}`.toLowerCase();
    }
    return fallback;
  }

  function mergeColors(saved, baseId) {
    const merged = presetColors(baseId || DEFAULT_PRESET);
    Object.keys(saved || {}).forEach((key) => {
      const hex = normalizeHex(saved[key], '');
      if (hex) merged[key] = hex;
    });
    return merged;
  }

  function colorKeyFor(e) {
    const name = String(e.n || e.p || '');
    for (const [pattern, key] of COLOR_NAME_RULES) {
      if (pattern.test(name)) return key;
    }
    return COLOR_KEY_BY_CAT[e.c] || 'accent';
  }

  function colorFor(e) {
    const key = colorKeyFor(e);
    const value = state.colors[key] || state.colors[e.c] || state.colors.accent || '#444744';
    return normalizeHex(value, '#444744');
  }

  function colorLabel(key) {
    const item = COLOR_LABELS[key];
    return item ? item[0] : key;
  }

  function colorLabelEn(key) {
    const item = COLOR_LABELS[key];
    return item ? item[1] : String(key).toUpperCase();
  }

  // ---------------------------------------------------------------- state

  function defaultState() {
    return {
      tab: 'build',
      mode: 'drawer',
      drawer: {
        f: 'S', z: '3', h: '1F',
        box: true, module: true, roof: 'Bowl Roof',
        baseplate: 'Baseplate', facade: true, backpanel: false,
        key: 'standard', mechanism: true,
      },
      sustainer: {
        f: 'S', z: '3', h: '1F',
        module: '1F Module', roof: 'Roof', baseplate: 'Baseplate', facade: true,
        divider: '', hardware: true, lock: true,
      },
      mods: { f: 'S', z: '3', h: '1F', cat: 'all' },
      catalog: { q: '', group: 'all', family: 'all', cat: 'all', limit: 90 },
      bom: [],
      hardware: [],
      status: 'pending',
      schemeName: '',
      colors: presetColors(DEFAULT_PRESET),
      activeSchemeId: DEFAULT_PRESET,
      activeBrushColor: '#ff6b00',
      isDyeing: false,
      selectedKey: '',
    };
  }

  const clampQty = (value) => Math.min(999, Math.max(1, Math.round(Number(value)) || 1));

  function loadState() {
    const fresh = defaultState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return fresh;
      for (const key of ['drawer', 'sustainer', 'mods', 'catalog']) {
        if (saved[key] && typeof saved[key] === 'object') Object.assign(fresh[key], saved[key]);
      }
      if (['build', 'catalog', 'templates', 'guide'].includes(saved.tab)) fresh.tab = saved.tab;
      if (['drawer', 'sustainer', 'mod'].includes(saved.mode)) fresh.mode = saved.mode;
      if (Array.isArray(saved.bom)) {
        fresh.bom = saved.bom
          .filter((i) => i && typeof i.p === 'string' && byPath.has(i.p))
          .map((i) => ({ p: i.p, q: clampQty(i.q), g: i.g || '清单', done: Boolean(i.done) }));
      }
      if (Array.isArray(saved.hardware)) fresh.hardware = cleanHardware(saved.hardware);
      if (STATUS[saved.status]) fresh.status = saved.status;
      if (typeof saved.schemeName === 'string') fresh.schemeName = saved.schemeName.slice(0, 40);
      if (typeof saved.activeSchemeId === 'string'
        && (saved.activeSchemeId === 'custom'
          || saved.activeSchemeId.startsWith('saved:')
          || PALETTES.presets[saved.activeSchemeId])) {
        fresh.activeSchemeId = saved.activeSchemeId;
      }
      if (fresh.activeSchemeId.startsWith('saved:')
        && !loadColorSchemes().some((scheme) => `saved:${scheme.id}` === fresh.activeSchemeId)) {
        fresh.activeSchemeId = 'custom';
      }
      fresh.colors = saved.colors
        ? mergeColors(saved.colors, fresh.activeSchemeId)
        : presetColors(fresh.activeSchemeId);
      fresh.activeBrushColor = normalizeHex(saved.activeBrushColor, '#ff6b00');
      if (!['standard', 'hidden', 'none'].includes(fresh.drawer.key)) fresh.drawer.key = 'standard';
      if (typeof fresh.drawer.mechanism !== 'boolean') fresh.drawer.mechanism = true;
      if (typeof fresh.sustainer.lock !== 'boolean') fresh.sustainer.lock = true;
      if (typeof fresh.sustainer.hardware !== 'boolean') fresh.sustainer.hardware = true;
    } catch (err) {
      /* localStorage may be unavailable on file:// */
    }
    return fresh;
  }

  function cleanHardware(list) {
    return list
      .filter((h) => h && typeof h.name === 'string' && h.name.trim())
      .map((h) => ({ name: h.name.trim().slice(0, 60), qty: clampQty(h.qty) }));
  }

  const state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tab: state.tab,
        mode: state.mode,
        drawer: state.drawer,
        sustainer: state.sustainer,
        mods: state.mods,
        catalog: state.catalog,
        bom: state.bom,
        hardware: state.hardware,
        status: state.status,
        schemeName: state.schemeName,
        colors: state.colors,
        activeSchemeId: state.activeSchemeId,
        activeBrushColor: state.activeBrushColor,
      }));
    } catch (err) {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------- data helpers

  const pool = (mode) => FILES.filter((f) => f.g === GROUP[mode]);

  function familiesFor(mode) {
    const order = mode === 'drawer' ? DRAWER_FAMS : mode === 'sustainer' ? SUSTAINER_FAMS : MOD_FAMS;
    const present = new Set(pool(mode).map((f) => f.f));
    return order.filter((f) => present.has(f));
  }

  function sizesFor(mode, fam) {
    const sizes = uniq(pool(mode).filter((f) => f.f === fam && f.z).map((f) => f.z));
    return sizes.sort((a, b) => Number(a) - Number(b));
  }

  function heightsFor(mode, fam, size) {
    const present = new Set(
      pool(mode).filter((f) => f.f === fam && f.z === size && f.h).map((f) => f.h)
    );
    return ['1F', '2F', '4F'].filter((h) => present.has(h));
  }

  function drawerOptions(d) {
    const base = FILES.filter((e) => e.g === 'drawers' && e.f === d.f && e.z === d.z);
    const roofsRaw = base.filter((e) => e.c === 'roof');
    const platesRaw = base.filter((e) => e.c === 'baseplate');
    const facades = FILES.filter((e) => e.g === 'drawers' && e.c === 'facade' && e.f === d.f && e.h === d.h);
    return {
      boxes: base.filter((e) => e.c === 'box' && e.h === d.h),
      modules: base.filter((e) => e.c === 'module' && e.h === d.h),
      roofs: byOrder(uniq(roofsRaw.map((e) => e.v)), ROOF_ORDER),
      platesRaw,
      plates: platesRaw.some((e) => e.k) ? ['__split__'] : byOrder(uniq(platesRaw.map((e) => e.v)), PLATE_ORDER),
      facades,
      back: base.filter((e) => e.c === 'backpanel'),
      allModules: base.filter((e) => e.c === 'module'),
    };
  }

  function sustainerOptions(s) {
    const base = FILES.filter((e) => e.g === 'sustainers' && e.f === s.f && e.z === s.z);
    const modules = base.filter((e) => e.c === 'module' && e.h === s.h);
    const roofsRaw = base.filter((e) => e.c === 'roof');
    const isSplitRoof = roofsRaw.some((e) => e.v === 'Roof Whole');
    const platesRaw = base.filter((e) => e.c === 'baseplate');
    const facades = FILES.filter(
      (e) => e.g === 'sustainers' && e.c === 'facade' && e.f === s.f && e.h === s.h
    );
    const dividers = FILES.filter(
      (e) =>
        e.g === 'sustainers' &&
        e.c === 'divider' &&
        e.f === s.f &&
        e.h === s.h &&
        (!e.z || e.z === s.z)
    );
    return {
      base,
      modules,
      moduleVariants: uniq(modules.map((e) => e.v)),
      roofsRaw,
      isSplitRoof,
      roofValues: isSplitRoof ? ['__whole__', '__split__'] : uniq(roofsRaw.map((e) => e.v)),
      platesRaw,
      plates: platesRaw.some((e) => e.k) ? ['__split__'] : uniq(platesRaw.map((e) => e.v)),
      facades,
      dividers,
    };
  }

  // ---------------------------------------------------------------- selection

  function ensureDrawer() {
    const d = state.drawer;
    const fams = familiesFor('drawer');
    if (!fams.includes(d.f)) d.f = fams[0];
    let sizes = sizesFor('drawer', d.f);
    if (!sizes.includes(d.z)) d.z = sizes[0];
    let hs = heightsFor('drawer', d.f, d.z);
    if (!hs.length) {
      const alt = sizes.find((z) => heightsFor('drawer', d.f, z).length);
      if (alt) {
        d.z = alt;
        hs = heightsFor('drawer', d.f, d.z);
      }
    }
    if (!hs.includes(d.h)) d.h = hs[0] || '1F';
    const o = drawerOptions(d);
    if (!o.roofs.includes(d.roof)) d.roof = o.roofs[0] || '';
    if (!o.plates.includes(d.baseplate)) d.baseplate = o.plates[0] || '';
    if (!['standard', 'hidden', 'none'].includes(d.key)) d.key = 'standard';
    if (typeof d.mechanism !== 'boolean') d.mechanism = true;
  }

  function ensureSustainer() {
    const s = state.sustainer;
    const fams = familiesFor('sustainer');
    if (!fams.includes(s.f)) s.f = fams[0];
    const sizes = sizesFor('sustainer', s.f);
    if (!sizes.includes(s.z)) s.z = sizes[0];
    const hs = heightsFor('sustainer', s.f, s.z);
    if (!hs.includes(s.h)) s.h = hs[0] || '1F';
    const o = sustainerOptions(s);
    if (s.module && !o.moduleVariants.includes(s.module)) s.module = o.moduleVariants[0] || '';
    if (s.roof && !o.roofValues.includes(s.roof)) s.roof = o.roofValues[0] || '';
    if (s.baseplate && !o.plates.includes(s.baseplate)) s.baseplate = o.plates[0] || '';
    if (s.divider && !o.dividers.some((e) => e.p === s.divider)) s.divider = '';
    if (typeof s.lock !== 'boolean') s.lock = true;
    if (typeof s.hardware !== 'boolean') s.hardware = true;
  }

  function ensureMods() {
    const m = state.mods;
    const fams = familiesFor('mod');
    if (!fams.includes(m.f)) m.f = fams[0];
    const sizes = sizesFor('mod', m.f);
    if (!sizes.includes(m.z)) m.z = sizes[0];
    const hs = heightsFor('mod', m.f, m.z);
    if (!hs.includes(m.h)) m.h = hs[0] || '1F';
  }

  // ---------------------------------------------------------------- assembly

  const asPart = (e, qty = 1) => (e ? { e, q: clampQty(qty) } : null);
  const namedPart = (name, qty = 1) => asPart(FILES.find((f) => f.n === name), qty);

  function mergeParts(parts) {
    const merged = new Map();
    for (const part of parts) {
      if (!part || !part.e) continue;
      const hit = merged.get(part.e.p);
      if (hit) hit.q = clampQty(hit.q + part.q);
      else merged.set(part.e.p, { e: part.e, q: clampQty(part.q) });
    }
    return Array.from(merged.values());
  }

  function drawerFamilyCode(f) {
    return f === 'L2' ? 'L' : f === 'XL2' ? 'XL' : f;
  }

  function keyParts(d) {
    const names = d.key === 'standard'
      ? ['Key (Turn On Supports)']
      : d.key === 'hidden'
        ? ['Hidden Key (Turn On Supports)', 'Hidden Key Part 2 (Turn on Supports)']
        : [];
    return names.map((n) => namedPart(n, 1)).filter(Boolean);
  }

  function mechanismParts(d) {
    const fam = drawerFamilyCode(d.f);
    const runner = (fam === 'XL' ? 'XL' : 'x') + d.z;
    return [
      namedPart(`${fam} Rails`, 2),
      namedPart(`${runner} Runner Guides`, 2),
      namedPart(`${runner} Runner Slides`, 2),
      namedPart('Runner Stopper', 2),
      namedPart('Latch', 1),
      namedPart('Springs', 2),
      namedPart('Key Cap', 1),
      namedPart('Facade Cap', 1),
      namedPart('Label', 1),
    ].filter(Boolean);
  }

  function assembleDrawer() {
    const d = state.drawer;
    const o = drawerOptions(d);
    const parts = [];
    const add = (files, qty = 1) => {
      for (const e of files) parts.push(asPart(e, qty));
    };
    if (d.box) add(o.boxes);
    if (d.module) add(o.modules);
    if (d.roof) {
      add(FILES.filter(
        (e) => e.g === 'drawers' && e.f === d.f && e.z === d.z && e.c === 'roof' && e.v === d.roof
      ));
    }
    if (d.baseplate === '__split__') add(o.platesRaw);
    else if (d.baseplate) add(o.platesRaw.filter((e) => e.v === d.baseplate));
    if (d.facade) add(o.facades.slice(0, 1));
    if (d.backpanel) add(o.back);
    parts.push(...keyParts(d));
    if (d.mechanism) parts.push(...mechanismParts(d));
    return mergeParts(parts);
  }

  function pickFacade(s) {
    const o = sustainerOptions(s);
    return o.facades.find((e) => !e.p.includes('05. Universal')) || o.facades[0] || null;
  }

  function hingeParts(s) {
    const wide = s.f === 'L' || s.f === 'XL';
    const top = wide ? 'L-XL Hinge Top' : `${s.f} Hinge Top`;
    const bottom = wide
      ? (s.h === '1F' ? 'L-XL 1F Hinge' : 'L 2-4F Hinge')
      : (s.h === '1F' ? 'S-M 1F Hinge' : 'S-M 2-4F Hinge');
    const rods = wide ? 'L-XL Rods' : 'S-M Rods';
    return [namedPart(top, 1), namedPart(bottom, 1), namedPart(rods, 1)].filter(Boolean);
  }

  function lockParts(s) {
    const outer = `LOCK OUTER PART ${s.h === '1F' ? '1F' : '2-4F'}`;
    return [
      ['LOCK HOLDER', 2],
      ['LOCK INNER PART', 2],
      [outer, 2],
      ['1 SET OF PINS FOR 1 LOCK', 2],
    ].map(([name, qty]) => namedPart(name, qty)).filter(Boolean);
  }

  function assembleSustainer() {
    const s = state.sustainer;
    const o = sustainerOptions(s);
    const parts = [];
    const add = (files, qty = 1) => {
      for (const e of files) parts.push(asPart(e, qty));
    };
    if (s.module) add(o.modules.filter((e) => e.v === s.module));
    if (s.roof === '__whole__') {
      add(o.roofsRaw.filter((e) => e.v === 'Roof Whole'));
    } else if (s.roof === '__split__') {
      add(o.roofsRaw.filter((e) => ['Roof Part 1', 'Roof Part 2', 'Connector For Split Roof'].includes(e.v)));
    } else if (s.roof) {
      add(o.roofsRaw.filter((e) => e.v === s.roof));
    }
    if (s.facade) {
      const f = pickFacade(s);
      if (f) parts.push(asPart(f, 1));
    }
    if (s.baseplate === '__split__') add(o.platesRaw);
    else if (s.baseplate) add(o.platesRaw.filter((e) => e.v === s.baseplate));
    if (s.divider) {
      const d = byPath.get(s.divider);
      if (d) parts.push(asPart(d, 1));
    }
    if (s.lock) parts.push(...lockParts(s));
    if (s.hardware) parts.push(...hingeParts(s));
    return mergeParts(parts);
  }

  function assemblyLabel() {
    const cfg = state.mode === 'drawer' ? state.drawer : state.sustainer;
    return `${state.mode === 'drawer' ? '抽屉' : '收纳箱'} ${FAMILIES[cfg.f].label}${cfg.z} · ${cfg.h}`;
  }

  function assemblyHardware() {
    if (state.mode === 'drawer') {
      return [{ name: HW.M4x14, qty: state.drawer.h === '1F' ? 4 : 6 }];
    }
    return [
      { name: HW.M4x10, qty: 8 },
      { name: HW.M4x14, qty: 16 },
      { name: HW.M4x20, qty: 7 },
    ];
  }

  function mergeHardware(additions) {
    for (const item of additions || []) {
      const hit = state.hardware.find((h) => h.name === item.name);
      if (hit) hit.qty = clampQty(hit.qty + item.qty);
      else state.hardware.push({ name: item.name, qty: clampQty(item.qty) });
    }
  }

  function currentParts() {
    return state.mode === 'drawer' ? assembleDrawer() : state.mode === 'sustainer' ? assembleSustainer() : [];
  }

  function updateAssemblyPreview() {
    const viewer = window.VaultAssembly;
    if (!viewer) return;
    const parts = currentParts().map(({ e, q }) => ({
      path: e.p,
      name: e.n,
      category: e.c,
      size: e.s,
      split: e.k || 0,
      qty: q,
      colorKey: colorKeyFor(e),
      color: colorFor(e),
      label: colorLabel(colorKeyFor(e)),
    }));
    viewer.update(parts, {
      label: assemblyLabel(),
      emptyMessage: '当前组合没有可渲染的结构件。',
      colors: state.colors,
    });
  }

  function modEntries(ignoreCat = false) {
    const m = state.mods;
    return FILES.filter((e) => {
      if (e.g !== 'mods') return false;
      if (e.f && e.f !== 'U' && e.f !== m.f) return false;
      if (e.z && e.z !== m.z) return false;
      if (e.h && e.h !== m.h) return false;
      if (!ignoreCat && m.cat !== 'all' && e.c !== m.cat) return false;
      return true;
    });
  }

  // ---------------------------------------------------------------- BOM

  function addParts(parts, group, hardware = []) {
    const list = mergeParts(parts);
    if (!list.length) {
      toast('该组合没有可用 STL，请调整规格或组件', 'warn');
      return;
    }
    for (const { e, q } of list) {
      const hit = state.bom.find((i) => i.p === e.p);
      if (hit) hit.q = clampQty(hit.q + q);
      else state.bom.push({ p: e.p, q, g: group, done: false });
    }
    mergeHardware(hardware);
    state.status = 'pending';
    saveState();
    renderBOM();
    if (state.mode === 'mod') renderBuild();
    toast(`已加入 ${list.length} 个文件${hardware.length ? '与五金' : ''}`);
  }

  function bomFiles() {
    return state.bom.map((i) => byPath.get(i.p)).filter(Boolean);
  }

  function previewBtn(path, name, extra = '') {
    return `<button type="button" class="preview-btn ${extra}" data-preview-path="${esc(path)}" data-preview-name="${esc(name)}" title="3D 预览" aria-label="3D 预览">◎</button>`;
  }

  function bomColorStats() {
    const map = new Map();
    state.bom.forEach((item) => {
      const e = byPath.get(item.p);
      if (!e) return;
      const hex = colorFor(e);
      const hit = map.get(hex) || { hex, files: 0, qty: 0, keys: new Set() };
      hit.files += 1;
      hit.qty += item.q;
      hit.keys.add(colorKeyFor(e));
      map.set(hex, hit);
    });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty || a.hex.localeCompare(b.hex));
  }

  function renderBOM() {
    const list = $('#bom-list');
    const items = state.bom;
    const hardware = state.hardware;
    let html = '';

    if (!items.length) {
      html += `
        <div class="bom-empty">
          <b>0</b>
          <span>NO PARTS SELECTED</span>
          <p>从「构型」或「部件库」加入 STL。</p>
        </div>`;
    } else {
      html += items.map((item, idx) => {
        const e = byPath.get(item.p);
        if (!e) return '';
        const colorKey = colorKeyFor(e);
        const itemColor = colorFor(e);
        const flags = [
          e.u ? '<span class="flag flag--accent">SUPPORT</span>' : '',
          e.k ? `<span class="flag">PART ${e.k}</span>` : '',
          e.q > 1 ? `<span class="flag">STL ×${e.q}</span>` : '',
        ].filter(Boolean).join('');
        return `
          <div class="bom-item ${item.done ? 'is-done' : ''}" data-path="${esc(e.p)}" style="animation-delay:${Math.min(idx * 20, 160)}ms">
            <label class="bom-check" title="标记为已完成">
              <input type="checkbox" data-act="done" data-i="${idx}" ${item.done ? 'checked' : ''}>
              <i></i>
            </label>
            <div class="bom-main">
              <div class="bom-name" title="${esc(e.n)}"><i class="bom-color" style="background:${itemColor}" title="配色 ${esc(colorLabel(colorKey))} · ${itemColor.toUpperCase()}"></i>${esc(e.n)}</div>
              <div class="bom-path" title="${esc(e.p)}">${esc(e.p)}</div>
              <div class="bom-meta">
                <b>${esc(item.g)}</b><span>·</span><span>${fmtSize(e.s)}</span>
                <span class="bom-color-label">${esc(colorLabel(colorKey))} · ${itemColor.toUpperCase()}</span>
                ${flags}
              </div>
            </div>
            <div class="bom-side">
              <div class="bom-qty">
                <button data-act="qty" data-i="${idx}" data-d="-1" aria-label="减少数量">−</button>
                <b>${item.q}</b>
                <button data-act="qty" data-i="${idx}" data-d="1" aria-label="增加数量">+</button>
              </div>
              <div class="bom-tools">
                ${previewBtn(e.p, e.n)}
                <button class="bom-dl" data-act="dl" data-i="${idx}" aria-label="下载">${ICONS.download}</button>
                <button class="bom-rm" data-act="rm" data-i="${idx}" aria-label="移除">×</button>
              </div>
            </div>
          </div>`;
      }).join('');
    }

    const colorStats = bomColorStats();
    if (colorStats.length) {
      html += `
        <div class="bom-colors-head"><b>耗材颜色 COLORS</b><span>${colorStats.length} COLORS</span></div>
        <div class="bom-colors">
          ${colorStats.map((stat) => `
            <span class="bom-color-pill" title="${esc(Array.from(stat.keys).map(colorLabel).join(' / '))}">
              <i style="background:${stat.hex}"></i>
              <b>${stat.hex.toUpperCase()}</b>
              <em>${stat.files} 文件 / ${stat.qty} 件</em>
            </span>`).join('')}
        </div>`;
    }

    if (hardware.length) {
      html += `
        <div class="bom-hw-head"><b>五金 HARDWARE</b><span>${hardware.length} TYPES</span></div>
        ${hardware.map((hw, idx) => `
          <div class="bom-hw">
            <span class="bom-hw-name">${esc(hw.name)}</span>
            <div class="bom-qty">
              <button data-act="hwqty" data-i="${idx}" data-d="-1" aria-label="减少数量">−</button>
              <b>${hw.qty}</b>
              <button data-act="hwqty" data-i="${idx}" data-d="1" aria-label="增加数量">+</button>
            </div>
          </div>`).join('')}`;
    }

    list.innerHTML = html;

    const files = bomFiles();
    const qty = items.reduce((acc, i) => acc + i.q, 0);
    const size = sumSize(files);
    $('#bom-count').textContent = items.length;
    $('#bom-fab-count').textContent = items.length;
    $('#bom-files').textContent = files.length;
    $('#bom-qty').textContent = qty;
    $('#bom-size').textContent = fmtSize(size);

    const empty = items.length === 0;
    $('#btn-download').disabled = empty;
    $('#btn-copy').disabled = empty;
    $('#btn-csv').disabled = empty && hardware.length === 0;
    $('#btn-clear').disabled = empty && hardware.length === 0;

    updateProgress();
    renderSchemeList();
    const nameInput = $('#scheme-name');
    if (nameInput && document.activeElement !== nameInput) nameInput.value = state.schemeName;
  }

  function updateProgress() {
    const total = state.bom.length;
    const done = state.bom.filter((i) => i.done).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const fill = $('#progress-fill');
    if (fill) fill.style.width = `${pct}%`;
    const pctEl = $('#batch-pct');
    if (pctEl) pctEl.textContent = `${pct}%`;
    const note = $('#progress-note');
    if (note) note.textContent = `${done} / ${total} 已完成`;
    const select = $('#batch-status');
    if (select) select.value = state.status;
  }

  // ---------------------------------------------------------------- render build

  function chipRow(values, current, act, suffix = '') {
    return values.map((v) => `
      <button type="button" class="chip ${v === current ? 'is-active' : ''}" data-act="${act}" data-val="${esc(v)}">
        ${esc(v)}${suffix}
      </button>`).join('');
  }

  function familyChips(values, current, act) {
    return values.map((v) => `
      <button type="button" class="family-btn ${v === current ? 'is-active' : ''}" data-act="${act}" data-val="${v}">
        <b>${esc(FAMILIES[v].label)}</b>
        <i>${esc(FAMILIES[v].sub)}</i>
      </button>`).join('');
  }

  function field(num, label, en, content) {
    return `
      <div class="field">
        <div class="field-label"><span>${num}</span><b>${label}</b><i>${en}</i></div>
        ${content}
      </div>`;
  }

  function selectHtml(key, options, current, disabled) {
    return `
      <select data-select="${key}" ${disabled ? 'disabled' : ''}>
        ${options.map((opt) => {
          const value = Array.isArray(opt) ? opt[0] : opt;
          const label = Array.isArray(opt) ? opt[1] : opt;
          return `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`;
        }).join('')}
      </select>`;
  }

  function compRow(key, name, en, checked, detail, select, disabled) {
    return `
      <div class="comp ${checked ? '' : 'is-off'}">
        <span class="comp-check">
          <input type="checkbox" data-toggle="${key}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
          <i></i>
        </span>
        <span class="comp-name"><b>${name}</b><em>${en}</em></span>
        <span class="comp-detail">${detail}</span>
        ${select || '<span></span>'}
      </div>`;
  }

  function compSelectRow(name, en, detail, select) {
    return `
      <div class="comp comp--select">
        <span class="comp-blank" aria-hidden="true"></span>
        <span class="comp-name"><b>${name}</b><em>${en}</em></span>
        <span class="comp-detail">${detail}</span>
        ${select}
      </div>`;
  }

  function renderAssemblyBody() {
    const isDrawer = state.mode === 'drawer';
    const cfg = isDrawer ? state.drawer : state.sustainer;
    const fams = familiesFor(state.mode);
    const sizes = sizesFor(state.mode, cfg.f);
    const heights = heightsFor(state.mode, cfg.f, cfg.z);
    const o = isDrawer ? drawerOptions(cfg) : sustainerOptions(cfg);

    const familyField = field('01', '规格族', 'FAMILY', `<div class="family-grid">${familyChips(fams, cfg.f, 'family')}</div>`);
    const sizeField = field('02', '规格档', 'SIZE', `<div class="chip-row">${chipRow(sizes, cfg.z, 'size')}</div>`);
    const heightField = field('03', '高度', 'HEIGHT', `<div class="chip-row">${chipRow(heights, cfg.h, 'height')}</div>`);

    let comps = '';
    if (isDrawer) {
      const boxDetail = !o.boxes.length ? '此规格不可用' : o.boxes.some((e) => e.k) ? `${o.boxes.length} 件分体` : '1 件';
      comps += compRow('box', '盒体', 'BOX', cfg.box && o.boxes.length > 0, boxDetail, '', !o.boxes.length);
      const modDetail = o.modules.length ? '1 件' : '此规格不可用';
      comps += compRow('module', '内部模块', 'MODULE', cfg.module && o.modules.length > 0, modDetail, '', !o.modules.length);
      const roofOpts = [['', '不用顶盖'], ...o.roofs.map((v) => [v, variantLabel(v)])];
      comps += compRow('roof', '顶盖', 'ROOF', Boolean(cfg.roof), o.roofs.length ? `${o.roofs.length} 款` : '无',
        selectHtml('roof', roofOpts, cfg.roof, !o.roofs.length), !o.roofs.length);
      const plateOpts = [['', '不用底板'], ...o.plates.map((v) => [v, v === '__split__' ? '分体底板（2 件）' : variantLabel(v)])];
      comps += compRow('baseplate', 'Gridfinity 底板', 'BASEPLATE', Boolean(cfg.baseplate),
        o.platesRaw.some((e) => e.k) ? '分体 2 件' : '1 件',
        selectHtml('baseplate', plateOpts, cfg.baseplate, !o.plates.length), !o.plates.length);
      comps += compRow('facade', '前面板', 'FACADE', cfg.facade && o.facades.length > 0, o.facades.length ? '带支撑打印' : '无', '', !o.facades.length);
      if (o.back.length) comps += compRow('backpanel', '背板', 'BACK PANEL', cfg.backpanel && o.back.length > 0, '1 件', '', false);
      const keyOpts = [['standard', '标准锁匙'], ['hidden', '隐藏式锁匙'], ['none', '不配钥匙']];
      const keyDetail = cfg.key === 'hidden' ? '2 件' : cfg.key === 'standard' ? '1 件' : '不配钥匙';
      comps += compSelectRow('锁匙', 'KEY', keyDetail, selectHtml('key', keyOpts, cfg.key, false));
      comps += compRow('mechanism', '机构件', 'MECHANISM', cfg.mechanism, '滑轨 / 锁舌 / 弹簧', '', false);
    } else {
      const modOpts = [['', '不用模块'], ...o.moduleVariants.map((v) => [v, variantLabel(v)])];
      comps += compRow('module', '内部模块', 'MODULE', cfg.module && o.moduleVariants.length > 0,
        o.moduleVariants.length ? `${o.moduleVariants.length} 款` : '无',
        selectHtml('module', modOpts, cfg.module, !o.moduleVariants.length), !o.moduleVariants.length);

      const roofOpts = [['', '不用顶盖']];
      if (o.isSplitRoof) {
        roofOpts.push(['__whole__', '整体顶盖'], ['__split__', '分体顶盖（3 件）']);
      } else {
        o.roofValues.forEach((v) => roofOpts.push([v, variantLabel(v)]));
      }
      comps += compRow('roof', '顶盖', 'ROOF', Boolean(cfg.roof) && o.roofValues.length > 0,
        o.isSplitRoof ? '整体 / 分体' : o.roofValues.length ? '1 件' : '无',
        selectHtml('roof', roofOpts, cfg.roof, !o.roofValues.length), !o.roofValues.length);

      const plateOpts = [['', '不用底板'], ...o.plates.map((v) => [v, v === '__split__' ? '分体底板（2 件）' : variantLabel(v)])];
      comps += compRow('baseplate', 'Gridfinity 底板', 'BASEPLATE', Boolean(cfg.baseplate) && o.plates.length > 0,
        o.platesRaw.some((e) => e.k) ? '分体 2 件' : '1 件',
        selectHtml('baseplate', plateOpts, cfg.baseplate, !o.plates.length), !o.plates.length);

      comps += compRow('facade', '箱体前脸', 'FACADE', cfg.facade && o.facades.length > 0, '1 件', '', !o.facades.length);

      const divOpts = [['', '不加分隔'], ...o.dividers.map((e) => [e.p, variantLabel(e.v)])];
      comps += compRow('divider', '分隔件', 'DIVIDER', Boolean(cfg.divider),
        o.dividers.length ? `${o.dividers.length} 款` : '无',
        selectHtml('divider', divOpts, cfg.divider, !o.dividers.length), !o.dividers.length);

      const lockOpts = [['standard', '标准锁扣'], ['none', '不配锁扣']];
      comps += compSelectRow('锁扣', 'LOCK', cfg.lock ? '4 种 × 2' : '不配锁扣',
        selectHtml('lock', lockOpts, cfg.lock ? 'standard' : 'none', false));
      comps += compRow('hardware', '铰链 + 连杆', 'HARDWARE', cfg.hardware, '3 件', '', false);
    }

    const compField = field('04', '组件', 'COMPONENTS', `<div class="comp-list">${comps}</div>`);

    $('#build-body').innerHTML = `
      ${familyField}
      <div class="field-row">${sizeField}${heightField}</div>
      ${compField}`;
  }

  function renderModBody() {
    const m = state.mods;
    const fams = familiesFor('mod');
    const sizes = sizesFor('mod', m.f);
    const heights = heightsFor('mod', m.f, m.z);
    const entries = modEntries().sort((a, b) => {
      const ca = MOD_CATS.indexOf(a.c);
      const cb = MOD_CATS.indexOf(b.c);
      return ca === cb ? a.p.localeCompare(b.p) : ca - cb;
    });

    const catCounts = {};
    modEntries(true).forEach((e) => { catCounts[e.c] = (catCounts[e.c] || 0) + 1; });
    const catChips = [['all', '全部'], ...MOD_CATS.map((c) => [c, CAT_LABELS[c].split(' ')[0]])]
      .map(([value, label]) => `
        <button type="button" class="filter-chip ${m.cat === value ? 'is-active' : ''}" data-act="modcat" data-val="${value}">
          ${esc(label)}${catCounts[value] ? ` <span>${catCounts[value]}</span>` : ''}
        </button>`).join('');

    let rows = '';
    let lastCat = null;
    for (const e of entries) {
      if (m.cat === 'all' && e.c !== lastCat) {
        rows += `<div class="mod-group">${CAT_LABELS[e.c] || e.c.toUpperCase()}</div>`;
        lastCat = e.c;
      }
      const flags = [
        e.u ? '<span class="flag flag--accent">SUPPORT</span>' : '',
        e.k ? `<span class="flag">PART ${e.k}</span>` : '',
        e.f ? `<span class="flag">${esc(FAMILIES[e.f] ? FAMILIES[e.f].label : e.f)}</span>` : '',
        e.h ? `<span class="flag">${e.h}</span>` : '',
      ].filter(Boolean).join('');
      const added = isInBom(e.p);
      rows += `
        <div class="mod-item">
          <div class="mod-info">
            <b>${esc(e.n)}</b>
            <span title="${esc(e.p)}">${esc(e.p)}</span>
          </div>
          <div class="mod-flags">${flags}</div>
          <div class="row-actions">
            ${previewBtn(e.p, e.n)}
            <button class="add-icon ${added ? 'is-added' : ''}" data-act="add-one" data-path="${esc(e.p)}" title="加入清单">${added ? '✓' : '+'}</button>
          </div>
        </div>`;
    }

    $('#build-body').innerHTML = `
      ${field('01', '规格族', 'FAMILY', `<div class="family-grid">${familyChips(fams, m.f, 'family')}</div>`)}
      <div class="field-row">
        ${field('02', '规格档', 'SIZE', `<div class="chip-row">${chipRow(sizes, m.z, 'size')}</div>`)}
        ${field('03', '高度', 'HEIGHT', `<div class="chip-row">${chipRow(heights, m.h, 'height')}</div>`)}
      </div>
      ${field('04', '改装类别', 'CATEGORY', `<div class="mod-toolbar">${catChips}</div>`)}
      <div class="mod-list">${rows || '<div class="mod-empty">此规格没有匹配的改装件</div>'}</div>`;

    $('#mod-entries')?.remove();
  }

  function renderFoot() {
    const foot = $('#build-foot');
    if (state.mode === 'mod') {
      const entries = modEntries();
      const bytes = sumSize(entries);
      foot.innerHTML = `
        <div class="build-summary"><b>${entries.length}</b> 个匹配部件<i>${fmtSize(bytes)}</i></div>
        <button class="btn-primary" data-act="add-mods" ${entries.length ? '' : 'disabled'}>
          加入筛选结果 ${ICONS.arrow}
        </button>`;
      return;
    }

    const parts = currentParts();
    foot.innerHTML = `
      <div class="build-summary"><b>${parts.length}</b> 个文件<i>≈ ${fmtSize(sumSize(parts.map((p) => p.e)))}</i></div>
      <button class="btn-primary" data-act="add-assembly" ${parts.length ? '' : 'disabled'}>
        加入清单 ${ICONS.arrow}
      </button>`;
  }

  function renderBuild() {
    const titles = {
      drawer: ['SHEET 01 — DRAWER', '抽屉'],
      sustainer: ['SHEET 02 — SUSTAINER', '收纳箱'],
      mod: ['SHEET 03 — MODIFICATION', '改装件'],
    };
    $('#sheet-title').textContent = titles[state.mode][0];
    const cfg = state.mode === 'mod' ? state.mods : state.mode === 'drawer' ? state.drawer : state.sustainer;
    $('#sheet-code').textContent = state.mode === 'mod'
      ? `${cfg.f} / ${cfg.z} / ${cfg.h}`
      : `${FAMILIES[cfg.f]?.label || cfg.f} / ${cfg.z} / ${cfg.h}`;

    $$('.mode-tab').forEach((b) => b.classList.toggle('is-active', b.dataset.mode === state.mode));

    if (state.mode === 'mod') renderModBody();
    else renderAssemblyBody();
    renderFoot();

    if (state.mode === 'mod') {
      if (window.VaultAssembly) window.VaultAssembly.idle('改装件是独立部件，不参与组合装配预览。');
    } else {
      updateAssemblyPreview();
    }
    renderColorPanel();
    if (window.VaultAssembly && typeof window.VaultAssembly.setDyeing === 'function') {
      window.VaultAssembly.setDyeing(state.isDyeing);
    }
  }

  // ---------------------------------------------------------------- catalog

  function catalogFiles() {
    const c = state.catalog;
    const q = c.q.trim().toLowerCase();
    return FILES.filter((e) => {
      if (c.group !== 'all' && e.g !== c.group) return false;
      if (c.family !== 'all' && e.f !== c.family) return false;
      if (c.cat !== 'all' && e.c !== c.cat) return false;
      if (q && !`${e.n} ${e.p} ${e.v} ${e.c}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderCatalogFilters() {
    const c = state.catalog;
    const groups = [['all', '全部'], ['drawers', '抽屉'], ['sustainers', '收纳箱'], ['mods', '改装']];
    $('#cat-groups').innerHTML = groups.map(([value, label]) => `
      <button class="filter-chip ${c.group === value ? 'is-active' : ''}" data-act="cat-group" data-val="${value}">${label}</button>
    `).join('');

    const fams = uniq(FILES.map((e) => e.f).filter(Boolean)).sort((a, b) => {
      const order = ['S', 'M', 'L', 'XL', 'L2', 'XL2', 'U'];
      return order.indexOf(a) - order.indexOf(b);
    });
    const famSel = $('#cat-family');
    famSel.innerHTML = `<option value="all">全部族</option>` + fams.map((f) => `
      <option value="${f}" ${c.family === f ? 'selected' : ''}>${FAMILIES[f]?.label || f}</option>
    `).join('');

    const cats = uniq(FILES.map((e) => e.c)).sort((a, b) => Object.keys(CAT_LABELS).indexOf(a) - Object.keys(CAT_LABELS).indexOf(b));
    const catSel = $('#cat-category');
    catSel.innerHTML = `<option value="all">全部类别</option>` + cats.map((cat) => `
      <option value="${cat}" ${c.cat === cat ? 'selected' : ''}>${CAT_LABELS[cat] || cat}</option>
    `).join('');
  }

  function renderCatalogList() {
    const arr = catalogFiles();
    const shown = arr.slice(0, state.catalog.limit);
    $('#cat-count').textContent = `${arr.length} / ${FILES.length} 个部件`;
    $('#cat-sub').textContent = `显示 ${shown.length} 个 · 按路径排序`;

    $('#cat-list').innerHTML = shown.length ? shown.map((e, idx) => {
      const num = String(idx + 1).padStart(3, '0');
      const ref = VAULT_3D[e.p];
      const thumb = ref
        ? `<img class="cat-thumb" src="assets/previews/${esc(ref)}.webp" alt="" loading="lazy" decoding="async" data-cat-thumb data-idx="${num}">`
        : `<span class="cat-idx">${num}</span>`;
      const tags = [
        e.f ? `<span class="flag">${esc(FAMILIES[e.f]?.label || e.f)}</span>` : '',
        e.z ? `<span class="flag">${e.z}</span>` : '',
        e.h ? `<span class="flag">${e.h}</span>` : '',
        e.u ? '<span class="flag flag--accent">SUP</span>' : '',
        e.k ? `<span class="flag">P${e.k}</span>` : '',
      ].filter(Boolean).join('');
      const added = isInBom(e.p);
      return `
        <div class="cat-row">
          <span class="cat-thumb-wrap">${thumb}</span>
          <div class="cat-main">
            <div class="cat-name">${esc(e.n)}</div>
            <div class="cat-path" title="${esc(e.p)}">${esc(e.p)}</div>
          </div>
          <span class="cat-size">${fmtSize(e.s)}</span>
          <div class="cat-tags">${tags}</div>
          <div class="row-actions">
            ${previewBtn(e.p, e.n)}
            <button class="add-icon ${added ? 'is-added' : ''}" data-act="add-one" data-path="${esc(e.p)}" title="加入清单">${added ? '✓' : '+'}</button>
          </div>
        </div>`;
    }).join('') : `
      <div class="cat-empty"><b>∅</b><span>NO MATCHING PARTS</span></div>`;

    $('#cat-more').hidden = shown.length >= arr.length;
  }

  function renderCatalog() {
    renderCatalogFilters();
    renderCatalogList();
  }

  // ---------------------------------------------------------------- templates

  function renderTemplates() {
    const grid = $('#template-grid');
    if (!grid) return;
    const data = window.VAULT_SCENE_TEMPLATES;
    const groups = data && Array.isArray(data.groups) ? data.groups : [];
    if (!groups.length) {
      grid.innerHTML = '<div class="cat-empty"><b>∅</b><span>NO SCENE TEMPLATES</span></div>';
      return;
    }
    grid.innerHTML = groups.map((group) => {
      const counts = group.counts || {};
      const width = group.width || '—';
      const depth = group.depth || '—';
      return `
        <article class="template-card">
          <div class="template-head">
            <span class="template-id">${esc(group.id)}</span>
            <span class="template-dims">W ${esc(width)} × D ${esc(depth)}</span>
          </div>
          <h3>${esc(group.name)}</h3>
          <div class="template-counts">
            <span><b>${Number(counts.drawers) || 0}</b> 抽屉</span>
            <span><b>${Number(counts.modules) || 0}</b> 模块</span>
            <span><b>${Number(counts.cases) || 0}</b> 箱体</span>
          </div>
          <p class="template-why" title="${esc(group.why || '')}">${esc(group.why || '')}</p>
          <button type="button" class="template-apply" data-template-id="${esc(group.id)}">套用此模板</button>
        </article>`;
    }).join('');
  }

  function applySceneTemplate(id) {
    const data = window.VAULT_SCENE_TEMPLATES;
    const group = data && Array.isArray(data.groups) ? data.groups.find((item) => item.id === id) : null;
    if (!group) {
      toast('场景模板不存在', 'warn');
      return;
    }
    const items = (Array.isArray(group.items) ? group.items : []).filter((item) => item && byPath.has(item.p));
    if (!items.length) {
      toast('该模板没有可用的 STL 文件', 'warn');
      return;
    }

    state.bom = items.map((item) => ({
      p: item.p,
      q: clampQty(item.q),
      g: `${group.id} · ${item.partName || item.part}`,
      done: false,
    }));
    state.hardware = [];
    state.status = 'pending';
    state.schemeName = group.name;

    const colors = presetColors(DEFAULT_PRESET);
    const templateColors = { 1: '#d8dad8', 2: '#444744', 3: '#ff6b00' };
    items.forEach((item) => {
      const e = byPath.get(item.p);
      const hex = templateColors[item.color];
      if (e && hex) colors[colorKeyFor(e)] = hex;
    });
    state.colors = mergeColors(colors);
    state.activeSchemeId = 'custom';
    state.selectedKey = '';

    saveState();
    syncAssemblyColors();
    renderColorPanel();
    renderBOM();
    if (state.mode === 'mod') renderBuild();
    if (window.matchMedia('(max-width: 1100px)').matches) setBomOpen(true);

    const qty = items.reduce((acc, item) => acc + clampQty(item.q), 0);
    toast(`已套用模板「${group.name}」：${items.length} 个文件 / ${qty} 件`);
  }

  // ---------------------------------------------------------------- export

  function fileUrl(path) {
    return new URL(`../${path.split('/').map(encodeURIComponent).join('/')}`, location.href).href;
  }

  function localFile(path) {
    return LOCAL ? LOCAL.get(path) : null;
  }

  function updateLocalStatus() {
    const el = $('#stl-import-status');
    if (!el) return;
    const count = LOCAL ? LOCAL.count() : 0;
    el.textContent = count
      ? `已导入 ${count} 个 STL · 下载与预览优先读取本地文件`
      : `未导入 · 下载与预览需要本地 STL（共 ${LOCAL_STL_TOTAL} 个）`;
    el.classList.toggle('is-ready', count > 0);
  }

  function importStlFolder(fileList) {
    if (!LOCAL) {
      toast('本地导入模块未加载，请刷新页面后重试', 'warn');
      return;
    }
    if (!fileList || !fileList.length) return;
    const result = LOCAL.importFiles(fileList);
    updateLocalStatus();
    if (!result.matched) {
      toast('没有匹配到清单中的 STL，请选择包含 01. DRAWERS、02. SUSTAINERS 等目录的项目根文件夹', 'warn');
      return;
    }
    const extra = result.unmatched.length ? `，${result.unmatched.length} 个未匹配` : '';
    toast(`已导入 ${result.matched} 个 STL${extra}`);
  }

  function triggerDownload(e) {
    const local = localFile(e.p);
    const a = document.createElement('a');
    if (local) {
      const url = URL.createObjectURL(local);
      a.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } else {
      a.href = fileUrl(e.p);
    }
    a.download = `${e.n}.stl`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function zipStamp(date) {
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
      date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    };
  }

  // 生成 ZIP（store 模式，不压缩），STL 已接近熵上限，压缩收益极低
  function buildZip(files) {
    const encoder = new TextEncoder();
    const stamp = zipStamp(new Date());
    const chunks = [];
    const central = [];
    let offset = 0;
    files.forEach(({ name, data }) => {
      const nameBytes = encoder.encode(name);
      const crc = crc32(data);

      const local = new Uint8Array(30 + nameBytes.length);
      const lh = new DataView(local.buffer);
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, stamp.time, true);
      lh.setUint16(12, stamp.date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, nameBytes.length, true);
      lh.setUint16(28, 0, true);
      local.set(nameBytes, 30);

      const cd = new Uint8Array(46 + nameBytes.length);
      const ch = new DataView(cd.buffer);
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, stamp.time, true);
      ch.setUint16(14, stamp.date, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, nameBytes.length, true);
      ch.setUint16(30, 0, true);
      ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true);
      ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true);
      ch.setUint32(42, offset, true);
      cd.set(nameBytes, 46);

      chunks.push(local, data);
      central.push(cd);
      offset += local.length + data.length;
    });

    const cdSize = central.reduce((acc, c) => acc + c.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...chunks, ...central, end], { type: 'application/zip' });
  }

  let packing = false;

  async function downloadAll() {
    const items = state.bom.map((i) => byPath.get(i.p)).filter(Boolean);
    if (!items.length || packing) return;
    packing = true;
    const btn = $('#btn-download');
    const label = btn ? btn.querySelector('span') : null;
    const original = label ? label.textContent : '';
    if (btn) btn.disabled = true;
    try {
      const files = [];
      let bytes = 0;
      for (let i = 0; i < items.length; i++) {
        const e = items[i];
        if (label) label.textContent = `打包中 ${i + 1}/${items.length}`;
        let buf = null;
        const local = localFile(e.p);
        if (local) {
          buf = await local.arrayBuffer();
        } else {
          let res = null;
          try {
            res = await fetch(fileUrl(e.p));
          } catch (_) {
            res = null;
          }
          if (!res || !res.ok) throw new Error(`缺少 ${e.n}.stl，请先用「导入 STL 文件夹」选择本地模型库`);
          buf = await res.arrayBuffer();
        }
        files.push({ name: e.p, data: new Uint8Array(buf) });
        bytes += buf.byteLength;
      }
      if (label) label.textContent = '生成 ZIP…';
      const blob = buildZip(files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VAULT_USSA_STL_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast(`已打包 ${files.length} 个 STL（${fmtSize(bytes)}）`);
    } catch (err) {
      toast(`打包失败：${err.message || err}`, 'warn');
    } finally {
      packing = false;
      if (label) label.textContent = original;
      if (btn) btn.disabled = state.bom.length === 0;
    }
  }

  function copyPaths() {
    const text = state.bom.map((i) => i.p).join('\n');
    const done = () => toast(`已复制 ${state.bom.length} 条相对路径`);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (err) { toast('复制失败，请手动选择路径', 'warn'); }
    ta.remove();
  }

  function csvCell(value) {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    if (!state.bom.length && !state.hardware.length) return;
    const scheme = state.schemeName || '未命名方案';
    const statusLabel = STATUS[state.status] || STATUS.pending;
    const rows = [[
      'Type', 'No', 'Scheme', 'BatchStatus', 'Name', 'Qty', 'Unit',
      'ColorKey', 'Color', 'PerSTL', 'Group', 'Path', 'SizeMB', 'Supports', 'Part', 'Done',
    ]];
    state.bom.forEach((item, idx) => {
      const e = byPath.get(item.p);
      if (!e) return;
      rows.push([
        'STL', idx + 1, scheme, statusLabel, e.n, item.q, '件',
        colorKeyFor(e), colorFor(e).toUpperCase(),
        e.q, item.g, e.p, (e.s / 1e6).toFixed(1),
        e.u ? 'YES' : 'NO', e.k || '', item.done ? 'YES' : 'NO',
      ]);
    });
    state.hardware.forEach((hw, idx) => {
      rows.push([
        'HARDWARE', idx + 1, scheme, statusLabel, hw.name, hw.qty, '件',
        '', '', '', '五金', '', '', '', '', '',
      ]);
    });
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const name = `VAULT_USSA_BOM_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('CSV 清单已导出');
  }

  // ---------------------------------------------------------------- schemes

  function loadSchemes() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SCHEME_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((s) => s && typeof s.name === 'string' && Array.isArray(s.bom));
    } catch (err) {
      return [];
    }
  }

  function saveSchemes(list) {
    try {
      localStorage.setItem(SCHEME_KEY, JSON.stringify(list));
    } catch (err) {
      toast('浏览器存储不可用，方案未保存', 'warn');
    }
  }

  function renderSchemeList() {
    const datalist = $('#scheme-names');
    if (!datalist) return;
    datalist.innerHTML = loadSchemes()
      .map((s) => `<option value="${esc(s.name)}"></option>`)
      .join('');
  }

  function currentSchemeName() {
    const input = $('#scheme-name');
    return (input ? input.value : state.schemeName).trim().slice(0, 40);
  }

  function applyScheme(scheme) {
    state.bom = scheme.bom
      .filter((i) => i && typeof i.p === 'string' && byPath.has(i.p))
      .map((i) => ({ p: i.p, q: clampQty(i.q), g: i.g || '清单', done: Boolean(i.done) }));
    state.hardware = Array.isArray(scheme.hardware) ? cleanHardware(scheme.hardware) : [];
    state.status = STATUS[scheme.status] ? scheme.status : 'pending';
    state.schemeName = scheme.name.slice(0, 40);
    if (scheme.colors && typeof scheme.colors === 'object') {
      const rawId = typeof scheme.activeSchemeId === 'string' ? scheme.activeSchemeId : 'custom';
      const savedIds = new Set(loadColorSchemes().map((item) => `saved:${item.id}`));
      const valid = rawId === 'custom' || savedIds.has(rawId) || Boolean(PALETTES.presets[rawId]);
      state.colors = mergeColors(scheme.colors, PALETTES.presets[rawId] ? rawId : DEFAULT_PRESET);
      state.activeSchemeId = valid ? rawId : 'custom';
      state.selectedKey = '';
    }
    saveState();
    syncAssemblyColors();
    renderColorPanel();
    renderBOM();
    if (state.mode === 'mod') renderBuild();
    if (state.tab === 'catalog') renderCatalogList();
    toast(`已读取方案「${scheme.name}」`);
  }

  function saveCurrentScheme() {
    const name = currentSchemeName();
    if (!name) {
      toast('请先输入方案名称', 'warn');
      const input = $('#scheme-name');
      if (input) input.focus();
      return;
    }
    const list = loadSchemes();
    const hit = list.find((s) => s.name.toLowerCase() === name.toLowerCase());
    const snapshot = {
      id: hit ? hit.id : `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      savedAt: new Date().toISOString(),
      bom: state.bom.map((i) => ({ ...i })),
      hardware: state.hardware.map((h) => ({ ...h })),
      status: state.status,
      colors: { ...state.colors },
      activeSchemeId: state.activeSchemeId,
    };
    if (hit) list[list.indexOf(hit)] = snapshot;
    else list.push(snapshot);
    saveSchemes(list);
    state.schemeName = name;
    saveState();
    renderBOM();
    toast(hit ? `已更新方案「${name}」` : `已保存方案「${name}」`);
  }

  function loadCurrentScheme() {
    const name = currentSchemeName();
    const list = loadSchemes();
    const scheme = name
      ? list.find((s) => s.name.toLowerCase() === name.toLowerCase())
      : list[list.length - 1];
    if (!scheme) {
      toast(name ? `没有找到方案「${name}」` : '还没有保存的方案', 'warn');
      return;
    }
    applyScheme(scheme);
  }

  function deleteCurrentScheme() {
    const name = currentSchemeName();
    const list = loadSchemes();
    const scheme = name
      ? list.find((s) => s.name.toLowerCase() === name.toLowerCase())
      : list[list.length - 1];
    if (!scheme) {
      toast(name ? `没有找到方案「${name}」` : '还没有保存的方案', 'warn');
      return;
    }
    if (!window.confirm(`删除方案「${scheme.name}」？`)) return;
    saveSchemes(list.filter((s) => s !== scheme));
    if (state.schemeName === scheme.name) state.schemeName = '';
    saveState();
    renderBOM();
    toast(`已删除方案「${scheme.name}」`);
  }

  // ---------------------------------------------------------------- color studio

  function loadColorSchemes() {
    try {
      const parsed = JSON.parse(localStorage.getItem(COLOR_SCHEME_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((s) => s
        && typeof s.id === 'string'
        && typeof s.name === 'string'
        && s.colors
        && typeof s.colors === 'object');
    } catch (err) {
      return [];
    }
  }

  function saveColorSchemes(list) {
    try {
      localStorage.setItem(COLOR_SCHEME_KEY, JSON.stringify(list));
    } catch (err) {
      toast('浏览器存储不可用，配色方案未保存', 'warn');
    }
  }

  function colorPartGroups() {
    const source = [];
    if (state.mode === 'mod') {
      modEntries().forEach((e) => source.push({ e, q: 1 }));
    } else {
      currentParts().forEach((part) => source.push(part));
    }

    const map = new Map();
    source.forEach(({ e, q }) => {
      if (!e) return;
      const key = colorKeyFor(e);
      const hit = map.get(key) || { key, entry: e, count: 0 };
      hit.count += q || 1;
      if (!VAULT_3D[hit.entry.p] && VAULT_3D[e.p]) hit.entry = e;
      map.set(key, hit);
    });

    return Array.from(map.values()).sort((a, b) => {
      const ai = COLOR_ORDER.indexOf(a.key);
      const bi = COLOR_ORDER.indexOf(b.key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }

  function renderColorPanel() {
    const partsHost = $('#cs-parts');
    if (!partsHost) return;

    const groups = colorPartGroups();
    const customSchemes = loadColorSchemes();
    const active = state.activeSchemeId;
    const savedIds = new Set(customSchemes.map((scheme) => `saved:${scheme.id}`));
    const activeValid = active === 'custom'
      || savedIds.has(active)
      || Boolean(PALETTES.presets[active]);
    const customSelected = !activeValid || active === 'custom';

    const presetOptions = Object.entries(PALETTES.presets)
      .map(([id, preset]) => `<option value="${esc(id)}" ${active === id ? 'selected' : ''}>${esc(preset.name || id)}</option>`)
      .join('');
    const savedOptions = customSchemes
      .map((scheme) => `<option value="saved:${esc(scheme.id)}" ${active === `saved:${scheme.id}` ? 'selected' : ''}>★ ${esc(scheme.name)}</option>`)
      .join('');
    $('#cs-scheme').innerHTML = [
      `<optgroup label="预设方案">${presetOptions || '<option value="">无预设</option>'}</optgroup>`,
      savedOptions ? `<optgroup label="我的方案">${savedOptions}</optgroup>` : '',
      `<option value="custom" ${customSelected ? 'selected' : ''}>自定义调整</option>`,
    ].join('');

    $('#cs-swatches').innerHTML = (PALETTES.swatches || []).map((swatch) => `
      <button type="button" class="cs-swatch ${state.activeBrushColor.toLowerCase() === swatch.hex.toLowerCase() ? 'is-active' : ''}"
        data-brush="${esc(swatch.hex)}" style="background:${esc(swatch.hex)}"
        title="${esc(swatch.name)} · ${esc(swatch.hex)}" aria-label="画笔颜色 ${esc(swatch.name)}"></button>`).join('');

    $('#cs-brush').value = state.activeBrushColor;
    $('#cs-dye').setAttribute('aria-pressed', String(state.isDyeing));
    $('#cs-dye').textContent = state.isDyeing ? '完成染色' : '开始染色';
    $('#cs-dye-note').textContent = state.mode === 'mod'
      ? '改装件不参与组合预览；颜色仅作用于清单。'
      : '开启后点击 3D 部件或部位列表即可上色';
    $('#cs-part-count').textContent = `${groups.length} 类`;

    partsHost.innerHTML = groups.length ? groups.map((group) => {
      const color = normalizeHex(state.colors[group.key], colorFor(group.entry));
      const refId = VAULT_3D[group.entry.p];
      const thumb = refId
        ? `<img class="cs-thumb" src="assets/previews/${esc(refId)}.webp" alt="" loading="lazy" data-color-thumb>`
        : '<span class="cs-thumb cs-thumb--blank" aria-hidden="true">◇</span>';
      return `
        <div class="cs-part ${state.selectedKey === group.key ? 'is-active' : ''}" data-color-key="${esc(group.key)}">
          <button type="button" class="cs-part-main" data-pick-key="${esc(group.key)}" aria-label="选择部位 ${esc(colorLabel(group.key))}">
            ${thumb}
            <span class="cs-part-name">${esc(colorLabel(group.key))}<em>${esc(colorLabelEn(group.key))} · ${group.count} 件</em></span>
          </button>
          <input class="cs-part-input" type="color" value="${color}" data-paint-key="${esc(group.key)}" aria-label="设置${esc(colorLabel(group.key))}颜色">
        </div>`;
    }).join('') : '<p class="cs-empty">当前组合没有可配色部件</p>';
  }

  function setBrushColor(value) {
    state.activeBrushColor = normalizeHex(value, state.activeBrushColor);
    saveState();
    $$('#cs-swatches .cs-swatch').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.brush.toLowerCase() === state.activeBrushColor.toLowerCase());
    });
    const input = $('#cs-brush');
    if (input) input.value = state.activeBrushColor;
  }

  function syncAssemblyColors() {
    const viewer = window.VaultAssembly;
    if (!viewer) return;
    if (typeof viewer.setColors === 'function') viewer.setColors(state.colors);
    if (typeof viewer.setDyeing === 'function') viewer.setDyeing(state.isDyeing);
    if (typeof viewer.highlight === 'function') viewer.highlight(state.selectedKey || '');
  }

  function selectColorKey(key) {
    state.selectedKey = key;
    $$('#cs-parts .cs-part').forEach((row) => {
      row.classList.toggle('is-active', row.dataset.colorKey === key);
    });
    const target = $$('#cs-parts .cs-part').find((row) => row.dataset.colorKey === key);
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if (window.VaultAssembly && typeof window.VaultAssembly.highlight === 'function') {
      window.VaultAssembly.highlight(key);
    }
  }

  function locatePart(part) {
    if (!part) return;
    const path = part.path || '';
    const inBom = state.bom.some((item) => item.p === path);

    if (inBom) {
      if (window.matchMedia('(max-width: 1100px)').matches) setBomOpen(true);
      const row = $$('#bom-list .bom-item').find((el) => el.dataset.path === path);
      if (!row) return;
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      row.classList.remove('is-flash');
      void row.offsetWidth;
      row.classList.add('is-flash');
      setTimeout(() => row.classList.remove('is-flash'), 1600);
      return;
    }

    const name = String(part.name || path.split('/').pop() || '').replace(/\.stl$/i, '');
    if (!name) return;
    state.catalog.q = name;
    state.catalog.limit = 90;
    saveState();
    const search = $('#cat-search');
    if (search) search.value = name;
    setTab('catalog');
    toast(`已在部件库定位：${name}`);
  }

  function paintColor(key, value, commit = true) {
    const color = normalizeHex(value, state.activeBrushColor);
    if (!color) return;
    state.colors = { ...state.colors, [key]: color };
    state.activeSchemeId = 'custom';
    state.selectedKey = key;
    state.activeBrushColor = color;
    syncAssemblyColors();
    if (window.VaultAssembly && typeof window.VaultAssembly.paintPart === 'function') {
      window.VaultAssembly.paintPart(key, color);
    }
    if (window.VaultAssembly && typeof window.VaultAssembly.highlight === 'function') {
      window.VaultAssembly.highlight(key);
    }

    $$('#cs-parts .cs-part').forEach((row) => {
      const isTarget = row.dataset.colorKey === key;
      row.classList.toggle('is-active', isTarget);
      if (!isTarget) return;
      const input = row.querySelector('[data-paint-key]');
      if (input) input.value = color;
    });
    $$('#cs-swatches .cs-swatch').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.brush.toLowerCase() === color.toLowerCase());
    });
    const brush = $('#cs-brush');
    if (brush) brush.value = color;
    const scheme = $('#cs-scheme');
    if (scheme) scheme.value = 'custom';
    if (commit) {
      saveState();
      renderBOM();
    }
  }

  function applyColorPreset(value) {
    if (value === 'custom') {
      state.activeSchemeId = 'custom';
      saveState();
      renderColorPanel();
      return;
    }

    if (value.startsWith('saved:')) {
      const id = value.slice(6);
      const scheme = loadColorSchemes().find((item) => item.id === id);
      if (!scheme) {
        toast('配色方案不存在', 'warn');
        renderColorPanel();
        return;
      }
      state.colors = mergeColors(scheme.colors, DEFAULT_PRESET);
      state.activeSchemeId = value;
      state.selectedKey = '';
      saveState();
      syncAssemblyColors();
      renderColorPanel();
      renderBOM();
      toast(`已切换配色方案「${scheme.name}」`);
      return;
    }

    const preset = PALETTES.presets[value];
    if (!preset) return;
    state.colors = { ...preset.colors };
    state.activeSchemeId = value;
    state.selectedKey = '';
    saveState();
    syncAssemblyColors();
    renderColorPanel();
    renderBOM();
    toast(`已切换配色方案「${preset.name || value}」`);
  }

  function setDyeing(enabled) {
    if (enabled && state.mode === 'mod') {
      toast('改装件不参与组合预览，请直接使用部位颜色选择器', 'warn');
      return;
    }
    state.isDyeing = Boolean(enabled);
    if (window.VaultAssembly && typeof window.VaultAssembly.setDyeing === 'function') {
      window.VaultAssembly.setDyeing(state.isDyeing);
    }
    renderColorPanel();
    toast(state.isDyeing ? '染色模式已开启：点击 3D 部件或部位列表上色' : '染色模式已关闭');
  }

  function saveColorScheme() {
    const suggested = `配色 ${new Date().toLocaleDateString('zh-CN')}`;
    const name = String(window.prompt('为当前配色方案命名：', suggested) || '').trim().slice(0, 40);
    if (!name) return;

    const list = loadColorSchemes();
    const hit = list.find((scheme) => scheme.name.toLowerCase() === name.toLowerCase());
    const snapshot = {
      id: hit ? hit.id : `pc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name,
      colors: { ...state.colors },
      savedAt: new Date().toISOString(),
    };
    if (hit) list[list.indexOf(hit)] = snapshot;
    else list.push(snapshot);
    saveColorSchemes(list);
    state.activeSchemeId = `saved:${snapshot.id}`;
    saveState();
    renderColorPanel();
    toast(hit ? `已更新配色方案「${name}」` : `已保存配色方案「${name}」`);
  }

  function deleteColorScheme() {
    const select = $('#cs-scheme');
    const value = select ? select.value : '';
    if (!value || !value.startsWith('saved:')) {
      toast('请先选择一个已保存的配色方案', 'warn');
      return;
    }
    const id = value.slice(6);
    const list = loadColorSchemes();
    const scheme = list.find((item) => item.id === id);
    if (!scheme) {
      toast('配色方案不存在', 'warn');
      renderColorPanel();
      return;
    }
    if (!window.confirm(`删除配色方案「${scheme.name}」？`)) return;
    saveColorSchemes(list.filter((item) => item.id !== id));
    if (state.activeSchemeId === value) {
      state.colors = presetColors(DEFAULT_PRESET);
      state.activeSchemeId = DEFAULT_PRESET;
      state.selectedKey = '';
      saveState();
      syncAssemblyColors();
    }
    renderColorPanel();
    renderBOM();
    toast(`已删除配色方案「${scheme.name}」`);
  }

  function exportColorScheme() {
    const activeId = String(state.activeSchemeId || '');
    let name = '自定义配色';
    if (activeId.startsWith('saved:')) {
      const scheme = loadColorSchemes().find((item) => `saved:${item.id}` === activeId);
      name = scheme ? scheme.name : '自定义配色';
    } else if (PALETTES.presets[activeId]) {
      name = (PALETTES.presets[activeId] || {}).name || '配色';
    }
    const payload = {
      type: 'vault-color-scheme',
      version: 1,
      exportedAt: new Date().toISOString(),
      name,
      colors: state.colors,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VAULT_COLOR_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('配色方案已导出');
  }

  async function importColorScheme(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape');
      if (parsed.type !== undefined && parsed.type !== 'vault-color-scheme') throw new Error('type');
      const source = parsed.colors;
      if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('empty');

      let skipped = 0;
      const valid = [];
      Object.entries(source).forEach(([key, value]) => {
        if (valid.length >= 64
          || !Object.prototype.hasOwnProperty.call(COLOR_LABELS, key)
          || !normalizeHex(value, '')) {
          skipped += 1;
          return;
        }
        valid.push([key, normalizeHex(value, '')]);
      });
      if (!valid.length) {
        toast('配色文件中没有可用的部位颜色', 'warn');
        return;
      }
      const baseId = PALETTES.presets[state.activeSchemeId] ? state.activeSchemeId : DEFAULT_PRESET;
      state.colors = mergeColors(Object.fromEntries(valid), baseId);
      state.activeSchemeId = 'custom';
      state.selectedKey = '';
      saveState();
      syncAssemblyColors();
      renderColorPanel();
      renderBOM();
      toast(`已导入 ${valid.length} 个部位颜色${skipped ? `，忽略 ${skipped} 条无效条目` : ''}`);
    } catch (err) {
      toast('配色文件无法识别，请检查 JSON 格式', 'warn');
    }
  }

  function copyColorList() {
    const stats = bomColorStats();
    if (!stats.length) {
      toast('清单为空，没有可复制的颜色', 'warn');
      return;
    }
    const lines = ['VAULT / USSA 耗材配色清单'];
    stats.forEach((stat) => {
      lines.push(`${stat.hex.toUpperCase()}  ${stat.files} 文件 / ${stat.qty} 件  ${Array.from(stat.keys).map(colorLabel).join('、')}`);
    });
    const text = lines.join('\n');
    const done = () => toast('配色清单已复制');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  // ---------------------------------------------------------------- toast

  let toastTimer = null;
  function toast(message, tone = 'ok') {
    const el = $('#toast');
    el.textContent = message;
    el.classList.toggle('is-warn', tone === 'warn');
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2600);
  }

  // ---------------------------------------------------------------- events

  function setBomOpen(open) {
    app.classList.toggle('bom-open', open);
    document.body.classList.toggle('bom-locked', open);
    const fab = $('#bom-fab');
    if (fab) fab.setAttribute('aria-expanded', String(open));
  }

  function colorStudioOpen() {
    try {
      return localStorage.getItem(COLOR_STUDIO_KEY) === '1';
    } catch (err) {
      return false;
    }
  }

  function setColorStudioOpen(open) {
    const studio = $('#color-studio');
    const toggle = $('#cs-toggle');
    if (studio) studio.classList.toggle('is-collapsed', !open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '收起' : '展开';
    }
    try {
      localStorage.setItem(COLOR_STUDIO_KEY, open ? '1' : '0');
    } catch (err) {
      /* ignore */
    }
  }

  function setTab(tab) {
    if (tab === 'bom') {
      if (window.matchMedia('(max-width: 1100px)').matches) {
        setBomOpen(true);
      } else {
        $('#bom').animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(0)' }],
          { duration: 260, easing: 'ease-out' }
        );
      }
      return;
    }
    state.tab = tab;
    saveState();
    $$('.rail-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
    $('#view-build').hidden = tab !== 'build';
    $('#view-catalog').hidden = tab !== 'catalog';
    const templatesView = $('#view-templates');
    if (templatesView) templatesView.hidden = tab !== 'templates';
    const guideView = $('#view-guide');
    if (guideView) guideView.hidden = tab !== 'guide';
    if (tab === 'catalog') renderCatalog();
    else if (tab === 'templates') renderTemplates();
    else if (tab === 'guide' && window.VaultGuide && typeof window.VaultGuide.render === 'function') {
      window.VaultGuide.render();
    }
    const work = $('.work');
    if (work) work.scrollTop = 0;
    const target = document.getElementById(`view-${tab}`);
    if (target) target.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function bindEvents() {
    $('.rail').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-tab]');
      if (btn) setTab(btn.dataset.tab);
    });

    const templateGrid = $('#template-grid');
    if (templateGrid) {
      templateGrid.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-template-id]');
        if (btn) applySceneTemplate(btn.dataset.templateId);
      });
    }

    $('#mode-tabs').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-mode]');
      if (!btn) return;
      state.mode = btn.dataset.mode;
      state.selectedKey = '';
      ensureDrawer(); ensureSustainer(); ensureMods();
      saveState();
      renderBuild();
    });

    const schemeSelect = $('#cs-scheme');
    if (schemeSelect) {
      schemeSelect.addEventListener('change', (ev) => applyColorPreset(ev.target.value));
    }

    const swatchRow = $('#cs-swatches');
    if (swatchRow) {
      swatchRow.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-brush]');
        if (btn) setBrushColor(btn.dataset.brush);
      });
    }

    const brushInput = $('#cs-brush');
    if (brushInput) brushInput.addEventListener('input', (ev) => setBrushColor(ev.target.value));

    const dyeBtn = $('#cs-dye');
    if (dyeBtn) dyeBtn.addEventListener('click', () => setDyeing(!state.isDyeing));

    const partsHost = $('#cs-parts');
    if (partsHost) {
      partsHost.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-pick-key]');
        if (!btn) return;
        const key = btn.dataset.pickKey;
        if (state.isDyeing) paintColor(key, state.activeBrushColor);
        else selectColorKey(key);
      });
      partsHost.addEventListener('input', (ev) => {
        const input = ev.target.closest('[data-paint-key]');
        if (input) paintColor(input.dataset.paintKey, input.value, false);
      });
      partsHost.addEventListener('change', (ev) => {
        const input = ev.target.closest('[data-paint-key]');
        if (input) paintColor(input.dataset.paintKey, input.value, true);
      });
    }

    const saveColors = $('#cs-save');
    if (saveColors) saveColors.addEventListener('click', saveColorScheme);
    const delColors = $('#cs-delete');
    if (delColors) delColors.addEventListener('click', deleteColorScheme);
    const resetColors = $('#cs-reset');
    if (resetColors) resetColors.addEventListener('click', () => applyColorPreset(DEFAULT_PRESET));
    const studioToggle = $('#cs-toggle');
    if (studioToggle) {
      studioToggle.addEventListener('click', () => {
        const studio = $('#color-studio');
        setColorStudioOpen(Boolean(studio && studio.classList.contains('is-collapsed')));
      });
    }
    setColorStudioOpen(colorStudioOpen());
    const exportColors = $('#cs-export');
    if (exportColors) exportColors.addEventListener('click', exportColorScheme);
    const importBtn = $('#cs-import-btn');
    const importInput = $('#cs-import');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', () => {
        const file = importInput.files && importInput.files[0];
        importInput.value = '';
        importColorScheme(file);
      });
    }
    const copyColors = $('#cs-copy');
    if (copyColors) copyColors.addEventListener('click', copyColorList);

    if (window.VaultAssembly && typeof window.VaultAssembly.onPick === 'function') {
      window.VaultAssembly.onPick((part) => {
        if (!part) return;
        if (part.source === 'label') {
          locatePart(part);
          return;
        }
        if (!part.colorKey) return;
        if (state.isDyeing) paintColor(part.colorKey, state.activeBrushColor);
        else selectColorKey(part.colorKey);
      });
    }

    document.addEventListener('error', (ev) => {
      const img = ev.target;
      if (!img || img.tagName !== 'IMG') return;
      if (img.hasAttribute('data-color-thumb')) {
        const blank = document.createElement('span');
        blank.className = 'cs-thumb cs-thumb--blank';
        blank.setAttribute('aria-hidden', 'true');
        blank.textContent = '◇';
        img.replaceWith(blank);
        return;
      }
      if (img.hasAttribute('data-cat-thumb')) {
        const blank = document.createElement('span');
        blank.className = 'cat-idx';
        blank.textContent = img.dataset.idx || '';
        img.replaceWith(blank);
      }
    }, true);

    $('#build-body').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      const val = btn.dataset.val;
      if (act === 'family' || act === 'size' || act === 'height') {
        const cfg = state.mode === 'mod' ? state.mods : state.mode === 'drawer' ? state.drawer : state.sustainer;
        cfg[act === 'family' ? 'f' : act === 'size' ? 'z' : 'h'] = val;
        ensureDrawer(); ensureSustainer(); ensureMods();
        saveState();
        renderBuild();
      } else if (act === 'modcat') {
        state.mods.cat = val;
        saveState();
        renderModBody();
        renderFoot();
      } else if (act === 'add-one') {
        const e = byPath.get(btn.dataset.path);
        if (e) addParts([asPart(e, 1)], state.mode === 'mod' ? '改装件' : '部件库');
        if (state.tab === 'catalog') renderCatalogList();
      } else if (act === 'add-assembly') {
        addParts(currentParts(), assemblyLabel(), assemblyHardware());
      } else if (act === 'add-mods') {
        addParts(modEntries().map((e) => asPart(e, 1)), `改装 ${FAMILIES[state.mods.f].label}${state.mods.z}`);
      }
    });

    $('#build-body').addEventListener('change', (ev) => {
      const el = ev.target;
      if (el.matches('[data-select]')) {
        const key = el.dataset.select;
        const cfg = state.mode === 'drawer' ? state.drawer : state.sustainer;
        if (key === 'lock') cfg.lock = el.value === 'standard';
        else cfg[key] = el.value;
        saveState();
        renderBuild();
      } else if (el.matches('[data-toggle]')) {
        const key = el.dataset.toggle;
        if (state.mode === 'mod') return;
        const cfg = state.mode === 'drawer' ? state.drawer : state.sustainer;
        if (state.mode === 'sustainer' && key === 'module') {
          const s = state.sustainer;
          const o = sustainerOptions(s);
          s.module = el.checked ? (o.moduleVariants[0] || '') : '';
        } else if (state.mode === 'sustainer' && key === 'roof') {
          const s = state.sustainer;
          const o = sustainerOptions(s);
          s.roof = el.checked ? (o.roofValues[0] || '') : '';
        } else if (state.mode === 'sustainer' && key === 'baseplate') {
          const s = state.sustainer;
          const o = sustainerOptions(s);
          s.baseplate = el.checked ? (o.plates[0] || '') : '';
        } else {
          cfg[key] = el.checked;
        }
        saveState();
        renderBuild();
      }
    });

    $('#build-foot').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      if (btn.dataset.act === 'add-assembly') {
        addParts(currentParts(), assemblyLabel(), assemblyHardware());
      } else if (btn.dataset.act === 'add-mods') {
        addParts(modEntries().map((e) => asPart(e, 1)), `改装 ${FAMILIES[state.mods.f].label}${state.mods.z}`);
      }
    });

    $('#cat-groups').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act="cat-group"]');
      if (!btn) return;
      state.catalog.group = btn.dataset.val;
      state.catalog.limit = 90;
      saveState();
      renderCatalogFilters();
      renderCatalogList();
    });

    $('#cat-family').addEventListener('change', (ev) => {
      state.catalog.family = ev.target.value;
      state.catalog.limit = 90;
      saveState();
      renderCatalogList();
    });

    $('#cat-category').addEventListener('change', (ev) => {
      state.catalog.cat = ev.target.value;
      state.catalog.limit = 90;
      saveState();
      renderCatalogList();
    });

    let searchTimer = null;
    $('#cat-search').addEventListener('input', (ev) => {
      clearTimeout(searchTimer);
      const value = ev.target.value;
      searchTimer = setTimeout(() => {
        state.catalog.q = value;
        state.catalog.limit = 90;
        saveState();
        renderCatalogList();
      }, 120);
    });

    $('#cat-list').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act="add-one"]');
      if (!btn) return;
      const e = byPath.get(btn.dataset.path);
      if (e) addParts([asPart(e, 1)], '部件库');
      renderCatalogList();
    });

    $('#cat-more').addEventListener('click', () => {
      state.catalog.limit += 90;
      saveState();
      renderCatalogList();
    });

    $('#bom-list').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      const idx = Number(btn.dataset.i);
      if (act === 'hwqty') {
        const hw = state.hardware[idx];
        if (!hw) return;
        hw.qty = clampQty(hw.qty + Number(btn.dataset.d));
        saveState();
        renderBOM();
        return;
      }
      const item = state.bom[idx];
      if (!item) return;
      if (act === 'qty') {
        item.q = clampQty(item.q + Number(btn.dataset.d));
        item.done = false;
        state.status = 'pending';
        saveState();
        renderBOM();
      } else if (act === 'rm') {
        state.bom.splice(idx, 1);
        if (!state.bom.length) {
          state.hardware = [];
          state.status = 'pending';
        }
        saveState();
        renderBOM();
        if (state.mode === 'mod') renderBuild();
        if (state.tab === 'catalog') renderCatalogList();
      } else if (act === 'dl') {
        const e = byPath.get(item.p);
        if (e) triggerDownload(e);
      }
    });

    $('#bom-list').addEventListener('change', (ev) => {
      const box = ev.target.closest('[data-act="done"]');
      if (!box) return;
      const item = state.bom[Number(box.dataset.i)];
      if (!item) return;
      item.done = box.checked;
      saveState();
      renderBOM();
    });

    $('#btn-download').addEventListener('click', downloadAll);
    const stlImportBtn = $('#btn-import-stl');
    const stlImportInput = $('#stl-import');
    if (stlImportBtn && stlImportInput) {
      stlImportBtn.addEventListener('click', () => stlImportInput.click());
      stlImportInput.addEventListener('change', (ev) => {
        importStlFolder(ev.target.files);
        ev.target.value = '';
      });
    }
    $('#btn-copy').addEventListener('click', copyPaths);
    $('#btn-csv').addEventListener('click', exportCsv);
    $('#btn-clear').addEventListener('click', () => {
      if (!state.bom.length && !state.hardware.length) return;
      if (!window.confirm('清空当前打印清单？')) return;
      state.bom = [];
      state.hardware = [];
      state.status = 'pending';
      saveState();
      renderBOM();
      if (state.mode === 'mod') renderBuild();
      if (state.tab === 'catalog') renderCatalogList();
      toast('清单已清空');
    });

    $('#scheme-name').addEventListener('input', (ev) => {
      state.schemeName = ev.target.value.slice(0, 40);
      saveState();
    });
    $('#btn-scheme-save').addEventListener('click', saveCurrentScheme);
    $('#btn-scheme-load').addEventListener('click', loadCurrentScheme);
    $('#btn-scheme-delete').addEventListener('click', deleteCurrentScheme);
    $('#batch-status').addEventListener('change', (ev) => {
      state.status = STATUS[ev.target.value] ? ev.target.value : 'pending';
      saveState();
      updateProgress();
    });

    $('#bom-fab').addEventListener('click', () => setBomOpen(!app.classList.contains('bom-open')));
    $('#bom-close').addEventListener('click', () => setBomOpen(false));
    $('#scrim').addEventListener('click', () => setBomOpen(false));

    document.addEventListener('keydown', (ev) => {
      if (ev.key === '/' && document.activeElement !== $('#cat-search') && state.tab === 'catalog') {
        ev.preventDefault();
        $('#cat-search').focus();
      }
      if (ev.key === 'Escape') {
        setBomOpen(false);
        if (document.activeElement === $('#cat-search')) $('#cat-search').blur();
      }
    });
  }

  // ---------------------------------------------------------------- init

  function init() {
    $('#stat-files').textContent = FILES.length;
    $('#stat-size').textContent = (sumSize(FILES) / 1e9).toFixed(1);
    $('#stat-fams').textContent = new Set(FILES.map((e) => e.f).filter((f) => f && f !== 'U')).size;

    ensureDrawer();
    ensureSustainer();
    ensureMods();

    bindEvents();
    if (LOCAL) LOCAL.onChange(updateLocalStatus);
    updateLocalStatus();

    setBomOpen(window.matchMedia('(min-width: 1280px)').matches);

    const initialTab = ['catalog', 'templates', 'guide'].includes(state.tab) ? state.tab : 'build';
    setTab(initialTab);

    renderBuild();
    renderCatalog();
    renderBOM();
    if ($('#template-grid')) renderTemplates();

    $('#cat-search').value = state.catalog.q;
  }

  init();
})();
