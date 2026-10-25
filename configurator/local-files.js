'use strict';

// 本地 STL 库：仓库不包含 STL（体积过大），由使用者手动导入本地文件夹。
// 导入后下载、单件预览与组合预览都优先读取本地文件。
(() => {
  const files = new Map();
  const listeners = new Set();
  let known = new Set();
  let byName = new Map();

  const normalize = (value) => String(value || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();

  function setKnownPaths(list) {
    known = new Set((list || []).map(normalize));
    byName = new Map();
    known.forEach((path) => {
      const name = path.split('/').pop();
      if (!name) return;
      const hits = byName.get(name) || [];
      hits.push(path);
      byName.set(name, hits);
    });
  }

  // 选择文件夹时 webkitRelativePath 会带上根目录名，逐级剥离后再匹配清单路径；
  // 单选文件时退化为按唯一文件名匹配。
  function resolve(path) {
    const parts = normalize(path).split('/');
    for (let i = 0; i < parts.length; i++) {
      const hit = parts.slice(i).join('/');
      if (known.has(hit)) return hit;
    }
    const hits = byName.get(parts[parts.length - 1]) || [];
    return hits.length === 1 ? hits[0] : '';
  }

  function notify() {
    const detail = { total: files.size };
    listeners.forEach((fn) => {
      try { fn(detail); } catch (_) { /* ignore */ }
    });
  }

  function importFiles(fileList) {
    let matched = 0;
    const unmatched = [];
    Array.from(fileList || []).forEach((file) => {
      const relative = normalize(file.webkitRelativePath || file.name);
      if (!/\.stl$/i.test(relative)) return;
      const path = resolve(relative);
      if (!path) {
        unmatched.push(relative);
        return;
      }
      files.set(path, file);
      matched += 1;
    });
    notify();
    return { matched, total: files.size, unmatched };
  }

  function get(path) {
    return files.get(normalize(path)) || null;
  }

  function clear() {
    files.clear();
    notify();
  }

  window.VaultLocal = {
    setKnownPaths,
    importFiles,
    get,
    has: (path) => files.has(normalize(path)),
    count: () => files.size,
    clear,
    onChange(fn) {
      if (typeof fn === 'function') listeners.add(fn);
    },
  };
})();
