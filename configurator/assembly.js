/* VAULT / USSA — live assembly preview (no build step).
 *
 * STLs are exported from a print layout: every part sits at an arbitrary
 * position and rotation. This viewer therefore normalises each part to an
 * assembled orientation (width X / depth Y / height Z) and stacks it by
 * category. It is an approximation, not a mechanical assembly.
 */
(function () {
  'use strict';

  if (window.VaultAssembly && window.VaultAssembly.__installed) return;

  var SELF = document.currentScript;
  var BASE = SELF && SELF.src ? SELF.src : new URL('assembly.js', location.href).href;
  var VENDOR = new URL('vendor/vault-stl.min.js', BASE).href;

  var RENDER_CATS = {
    box: 1,
    module: 1,
    roof: 1,
    baseplate: 1,
    facade: 1,
    backpanel: 1,
    rail: 1,
    runner: 1,
    accessory: 1,
    support: 1,
    divider: 1,
    hinge: 1,
    lock: 1,
    rod: 1,
    handle: 1,
    backbone: 1,
    pegboard: 1,
    base: 1,
    feet: 1,
    wallmount: 1,
    wheel: 1,
    hardware: 1,
    other: 1,
  };
  var CORE_CATS = { box: 1, module: 1, roof: 1, baseplate: 1, facade: 1, backpanel: 1 };
  var LABEL_CATS = { box: 1, module: 1, roof: 1, baseplate: 1, facade: 1 };
  var LAYOUT_GAP = 18;
  var MAX_SCENE_TRIANGLES = 5000000;
  var MAX_SCENE_PARTS = 80;
  var MAX_PART_BYTES = 72 * 1048576;
  var MAX_CACHE_BYTES = 180 * 1048576;
  var CONCURRENCY = 2;

  var DEFAULT_COLORS = {
    box: 0x444744,
    module: 0xd8dad8,
    roof: 0xffffff,
    baseplate: 0x33373b,
    facade: 0x2b2d42,
    handle: 0xff6b00,
    lock: 0xff6b00,
    rails: 0x444744,
    guides: 0x444744,
    slides: 0x444744,
    springs: 0xff6b00,
    stopper: 0xff6b00,
    latch: 0xff6b00,
    hinge: 0x444744,
    hingetop: 0x444744,
    rods: 0xff6b00,
    lockholder: 0x444744,
    lockinner: 0xff6b00,
    lockouter: 0x444744,
    pins: 0xff6b00,
    divider: 0x444744,
    base: 0xd8dad8,
    feet: 0xd8dad8,
    tyre: 0x1f2022,
    wheels: 0x444744,
    pullhandle: 0xff6b00,
    backbone: 0x444744,
    wall: 0x444744,
    accent: 0xff6b00,
  };

  var paint = {
    colors: {},
    dyeing: false,
    highlightKey: '',
    onPick: null,
  };

  var ui = null;
  var enginePromise = null;
  var T = null;
  var view = null;
  var token = 0;
  var cache = new Map();
  var cacheBytes = 0;
  var pending = new Map();
  var updateTimer = null;
  var queued = null;
  var explode = 0;

  // Explode direction per category, in layout space (X width / Y depth / Z up).
  var EXPLODE_DIRS = {
    roof: [0, 0, 0.95],
    module: [0, 0, 0.45],
    baseplate: [0, 0, -0.55],
    facade: [0, -0.85, 0],
    box: [0, 0, 0],
  };

  // ---------------------------------------------------------------- engine

  function ensureEngine() {
    if (window.VaultSTL) return Promise.resolve(window.VaultSTL);
    if (!enginePromise) {
      enginePromise = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = VENDOR;
        script.onload = function () {
          if (window.VaultSTL) resolve(window.VaultSTL);
          else { script.remove(); reject(new Error('library')); }
        };
        script.onerror = function () { script.remove(); reject(new Error('library')); };
        document.head.append(script);
      }).catch(function (error) {
        enginePromise = null;
        throw error;
      });
    }
    return enginePromise;
  }

  function ensureView() {
    if (view) return view;
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!renderer.capabilities || !renderer.capabilities.isWebGL2) {
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (_) { /* ignore */ }
      throw new Error('webgl');
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', '组合预览：拖动旋转，滚轮缩放，右键拖动平移。');
    ui.host.replaceChildren(renderer.domElement);

    var scene = new T.Scene();
    scene.background = new T.Color(0x171713);
    var camera = new T.PerspectiveCamera(38, 1, 0.1, 20000);
    camera.position.set(180, 160, 220);
    scene.add(new T.HemisphereLight(0xffffff, 0x4a463b, 1.15));
    var key = new T.DirectionalLight(0xfff3e4, 2.2);
    key.position.set(2, 4, 3);
    scene.add(key);
    var fill = new T.DirectionalLight(0xcfd9ff, 0.7);
    fill.position.set(-3, 1, -2);
    scene.add(fill);

    var controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.listenToKeyEvents(renderer.domElement);

    var render = function () {
      if (!view || view.renderer !== renderer) return;
      renderer.render(scene, camera);
      positionLabels();
    };
    controls.addEventListener('change', render);

    var stage = ui.root.querySelector('.ap-stage') || ui.host.parentElement;
    var labels = document.createElement('div');
    labels.className = 'ap-labels';
    var tooltip = document.createElement('div');
    tooltip.className = 'ap-tooltip';
    tooltip.hidden = true;
    stage.append(labels, tooltip);

    var resize = function () {
      if (!view || view.renderer !== renderer) return;
      var rect = ui.host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height, false);
      render();
    };

    var observer = new ResizeObserver(resize);
    view = {
      renderer: renderer,
      scene: scene,
      camera: camera,
      controls: controls,
      observer: observer,
      render: render,
      stage: stage,
      labels: labels,
      tooltip: tooltip,
      model: null,
      radius: 1,
      colors: paint.colors,
      dyeing: paint.dyeing,
      highlightKey: paint.highlightKey,
      onPick: paint.onPick,
    };
    observer.observe(ui.host);
    renderer.domElement.addEventListener('webglcontextlost', function (event) {
      if (!view || view.renderer !== renderer) return;
      event.preventDefault();
      idle('WebGL 上下文丢失，请刷新页面重试。');
    });
    bindPointer(renderer.domElement);
    resize();
    return view;
  }

  function bindPointer(canvas) {
    var down = null;
    canvas.addEventListener('pointerdown', function (event) {
      if (typeof event.button === 'number' && event.button !== 0) {
        down = null;
        return;
      }
      down = [event.clientX, event.clientY];
    });
    canvas.addEventListener('pointerup', function (event) {
      if (!down) return;
      var moved = Math.hypot(event.clientX - down[0], event.clientY - down[1]);
      down = null;
      if (moved > 5) return;
      var part = pickPart(event);
      if (!part || !view || typeof view.onPick !== 'function') return;
      view.onPick({
        colorKey: part.colorKey,
        name: part.name,
        path: part.path,
        category: part.category,
        source: 'canvas',
      });
    });
    canvas.addEventListener('pointermove', function (event) {
      if (!view) return;
      if (down) {
        hideTooltip();
        return;
      }
      var part = pickPart(event);
      if (!part) {
        hideTooltip();
        canvas.style.cursor = paint.dyeing ? 'crosshair' : 'grab';
        return;
      }
      canvas.style.cursor = paint.dyeing ? 'crosshair' : 'pointer';
      showTooltip(part, event);
    });
    canvas.addEventListener('pointerleave', function () {
      down = null;
      hideTooltip();
      canvas.style.cursor = paint.dyeing ? 'crosshair' : 'grab';
    });
    canvas.style.cursor = paint.dyeing ? 'crosshair' : 'grab';
  }

  function showTooltip(part, event) {
    if (!view || !view.tooltip || !view.stage) return;
    var tip = view.tooltip;
    var rect = view.stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    tip.textContent = part.name;
    tip.hidden = false;
    var x = event.clientX - rect.left + 14;
    var y = event.clientY - rect.top + 12;
    var maxX = rect.width - tip.offsetWidth - 8;
    var maxY = rect.height - tip.offsetHeight - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    if (x > maxX) x = Math.max(8, maxX);
    if (y > maxY) y = Math.max(8, maxY);
    tip.style.left = x.toFixed(1) + 'px';
    tip.style.top = y.toFixed(1) + 'px';
  }

  function hideTooltip() {
    if (view && view.tooltip) view.tooltip.hidden = true;
  }

  function pickPart(event) {
    if (!view || !view.camera || !view.model) return null;
    var canvas = view.renderer.domElement;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    var ndcX = (event.clientX - rect.left) / rect.width * 2 - 1;
    var ndcY = -(event.clientY - rect.top) / rect.height * 2 + 1;
    var camera = view.camera;
    camera.updateMatrixWorld();
    view.scene.updateMatrixWorld(true);

    var origin = camera.position.clone();
    var target = new T.Vector3(ndcX, ndcY, 0.5).unproject(camera);
    var direction = target.sub(origin).normalize();
    var best = null;

    (view.parts || []).forEach(function (part) {
      var localOrigin = part.group.worldToLocal(origin.clone());
      var localAhead = part.group.worldToLocal(origin.clone().add(direction));
      var localDirection = localAhead.sub(localOrigin);
      if (localDirection.lengthSq() < 1e-10) return;
      localDirection.normalize();
      var distance = rayBox(localOrigin, localDirection, part.half);
      if (distance !== null && (!best || distance < best.distance)) {
        best = { part: part, distance: distance };
      }
    });

    return best ? best.part : null;
  }

  function rayBox(origin, direction, half) {
    var tmin = -Infinity;
    var tmax = Infinity;
    for (var axis = 0; axis < 3; axis++) {
      var o = origin[axis];
      var d = direction[axis];
      var h = half[axis];
      if (Math.abs(d) < 1e-8) {
        if (o < -h || o > h) return null;
        continue;
      }
      var t1 = (-h - o) / d;
      var t2 = (h - o) / d;
      if (t1 > t2) {
        var swap = t1;
        t1 = t2;
        t2 = swap;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
    if (tmax < 0) return null;
    return Math.max(tmin, 0);
  }

  function hexToInt(value, fallback) {
    if (typeof value === 'number' && isFinite(value)) return value;
    var raw = String(value || '').replace('#', '').trim();
    if (raw.length === 3) raw = raw.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-f]{6}$/i.test(raw)) return fallback;
    return parseInt(raw, 16);
  }

  function colorForPart(part) {
    var colors = (view && view.colors) || paint.colors || {};
    var key = part.colorKey || part.category || 'accent';
    var hex = colors[key] || colors[part.category] || colors.accent;
    var fallback = DEFAULT_COLORS[key] || DEFAULT_COLORS[part.category] || DEFAULT_COLORS.accent;
    return hexToInt(hex, fallback);
  }

  function applyPartColor(part) {
    part.baseColor = colorForPart(part);
    part.material.color.setHex(part.baseColor);
    part.material.needsUpdate = true;
  }

  function applyHighlight() {
    if (!view) return;
    var key = paint.highlightKey;
    (view.parts || []).forEach(function (part) {
      var active = Boolean(key) && part.colorKey === key;
      part.material.emissive.setHex(active ? 0x8a2f12 : 0x000000);
      part.material.emissiveIntensity = active ? 0.4 : 0;
      part.material.needsUpdate = true;
      if (part.labelEl) {
        if (active) part.labelEl.classList.add('is-active');
        else part.labelEl.classList.remove('is-active');
      }
    });
  }

  function disposeModel() {
    if (!view) return;
    if (view.labels) view.labels.textContent = '';
    hideTooltip();
    if (view.grid) {
      view.scene.remove(view.grid);
      view.grid.geometry.dispose();
      if (view.grid.material && view.grid.material.dispose) view.grid.material.dispose();
      view.grid = null;
    }
    view.parts = [];
    if (!view.model) return;
    view.scene.remove(view.model);
    view.model.traverse(function (object) {
      if (object.geometry) object.geometry.dispose();
      var material = object.material;
      if (!material || !material.userData || !material.userData.ownMaterial) return;
      material.userData.ownMaterial = false;
      material.dispose();
    });
    view.model = null;
    view.parts = [];
  }

  // ---------------------------------------------------------------- loading

  function pathUrl(path) {
    return new URL('../' + path.split('/').map(encodeURIComponent).join('/'), location.href);
  }

  function fileFor(blob, name) {
    var fileName = String(name || 'part').replace(/\.stl$/i, '') + '.stl';
    try {
      return new File([blob], fileName, { type: 'model/stl' });
    } catch (_) {
      var fallback = new Blob([blob], { type: 'model/stl' });
      try { fallback.name = fileName; } catch (__) { /* ignore */ }
      return fallback;
    }
  }

  function parseBlob(blob, name) {
    return new Promise(function (resolve, reject) {
      var worker;
      try {
        worker = T.createWorker();
      } catch (_) {
        reject(new Error('library'));
        return;
      }
      var settled = false;
      var finish = function (fn, value) {
        if (settled) return;
        settled = true;
        try { worker.terminate(); } catch (_) { /* ignore */ }
        fn(value);
      };
      worker.onmessage = function (event) {
        var data = event.data;
        if (!data) return;
        if (data.type === 'ready') finish(resolve, data);
        else if (data.type === 'error') finish(reject, new Error(data.code || 'invalid'));
      };
      worker.onerror = function () { finish(reject, new Error('invalid')); };
      worker.postMessage({ file: fileFor(blob, name) });
    });
  }

  function loadPart(part) {
    var path = part.path;
    if (cache.has(path)) return Promise.resolve(cache.get(path));
    if (pending.has(path)) return pending.get(path);
    if ((part.size || 0) > MAX_PART_BYTES) return Promise.reject(new Error('oversized'));

    var local = window.VaultLocal ? window.VaultLocal.get(path) : null;
    var request = (local ? Promise.resolve(local) : fetch(pathUrl(path).href)
      .then(function (response) {
        if (!response.ok) throw new Error('http-' + response.status);
        return response.blob();
      }))
      .then(function (blob) { return parseBlob(blob, part.name); })
      .then(function (data) {
        var entry = {
          positions: new Uint16Array(data.positions),
          minimum: data.minimum,
          maximum: data.maximum,
          triangles: data.triangles,
          bytes: data.positions.byteLength,
        };
        entry.canonical = canonicalize(entry, part.category, path);
        cache.set(path, entry);
        cacheBytes += entry.bytes;
        trimCache();
        return entry;
      })
      .finally(function () { pending.delete(path); });

    pending.set(path, request);
    return request;
  }

  function trimCache() {
    if (cacheBytes <= MAX_CACHE_BYTES) return;
    var keys = Array.from(cache.keys());
    for (var i = 0; i < keys.length && cacheBytes > MAX_CACHE_BYTES; i++) {
      if (pending.has(keys[i])) continue;
      var entry = cache.get(keys[i]);
      if (!entry) continue;
      cacheBytes -= entry.bytes;
      cache.delete(keys[i]);
    }
  }

  function loadAll(list, jobToken) {
    return new Promise(function (resolve) {
      var results = new Array(list.length);
      var index = 0;
      var active = 0;
      var done = 0;

      function pump() {
        while (active < CONCURRENCY && index < list.length) {
          (function (i) {
            var part = list[i];
            active++;
            loadPart(part)
              .then(function (data) {
                results[i] = { part: part, data: data };
              }, function (error) {
                results[i] = { part: part, error: error };
              })
              .then(function () {
                active--;
                done++;
                if (jobToken === token) {
                  setProgress(done / list.length * 100, '正在读取组合 ' + done + ' / ' + list.length);
                }
                pump();
              });
          })(index++);
        }
        if (active === 0 && index >= list.length) resolve(results);
      }

      pump();
    });
  }

  // ---------------------------------------------------------------- orientation

  function dequantize(entry, i, out) {
    var size = [entry.maximum[0] - entry.minimum[0], entry.maximum[1] - entry.minimum[1], entry.maximum[2] - entry.minimum[2]];
    for (var a = 0; a < 3; a++) {
      out[a] = entry.minimum[a] + entry.positions[i * 3 + a] / 65535 * size[a];
    }
    return out;
  }

  function flatOrientation(entry, category) {
    var positions = entry.positions;
    var count = positions.length / 3;
    var step = Math.max(1, Math.floor(count / 18000));
    var pts = [];
    var p = [0, 0, 0];
    var mean = [0, 0, 0];
    var i;
    for (i = 0; i < count; i += step) {
      dequantize(entry, i, p);
      pts.push([p[0], p[1], p[2]]);
      mean[0] += p[0]; mean[1] += p[1]; mean[2] += p[2];
    }
    var n = pts.length || 1;
    mean = [mean[0] / n, mean[1] / n, mean[2] / n];

    var cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0] - mean[0];
      var y = pts[i][1] - mean[1];
      var z = pts[i][2] - mean[2];
      cov[0][0] += x * x; cov[0][1] += x * y; cov[0][2] += x * z;
      cov[1][0] += x * y; cov[1][1] += y * y; cov[1][2] += y * z;
      cov[2][0] += x * z; cov[2][1] += y * z; cov[2][2] += z * z;
    }
    for (i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) cov[i][j] /= pts.length;
    }

    // Thin axis = eigenvector of the smallest covariance eigenvalue. Power
    // iteration on (trace·I − C) converges to that vector.
    var tr = cov[0][0] + cov[1][1] + cov[2][2];
    var b = [
      [tr - cov[0][0], -cov[0][1], -cov[0][2]],
      [-cov[1][0], tr - cov[1][1], -cov[1][2]],
      [-cov[2][0], -cov[2][1], tr - cov[2][2]],
    ];
    var v = [1, 1, 1];
    for (i = 0; i < 40; i++) {
      var nx = b[0][0] * v[0] + b[0][1] * v[1] + b[0][2] * v[2];
      var ny = b[1][0] * v[0] + b[1][1] * v[1] + b[1][2] * v[2];
      var nz = b[2][0] * v[0] + b[2][1] * v[1] + b[2][2] * v[2];
      var norm = Math.hypot(nx, ny, nz) || 1;
      v = [nx / norm, ny / norm, nz / norm];
    }
    var thin = v;

    // Plane basis, then a minimum-area rectangle search so that the two
    // in-plane axes follow the part's real width / depth.
    var helper = Math.abs(thin[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    var u = cross(thin, helper);
    u = normalize(u);
    var w = normalize(cross(thin, u));
    var plane = pts.map(function (q) {
      return [dot(q, u) - dot(mean, u), dot(q, w) - dot(mean, w)];
    });
    var best = null;
    for (var deg = 0; deg < 90; deg += 0.5) {
      var t = deg * Math.PI / 180;
      var c = Math.cos(t), s = Math.sin(t);
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (i = 0; i < plane.length; i++) {
        var px = plane[i][0] * c + plane[i][1] * s;
        var py = -plane[i][0] * s + plane[i][1] * c;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      var area = (maxX - minX) * (maxY - minY);
      if (!best || area < best.area) {
        best = { area: area, t: t, ex: maxX - minX, ey: maxY - minY };
      }
    }
    var ct = Math.cos(best.t), st = Math.sin(best.t);
    var axisU = normalize(add(scale(u, ct), scale(w, st)));
    var axisV = normalize(add(scale(u, -st), scale(w, ct)));
    var bx;
    var by;
    if (best.ex >= best.ey) {
      by = axisU;
      bx = axisV;
    } else {
      bx = axisU;
      by = axisV;
    }
    var bz = thin;
    if (dot(bx, cross(by, bz)) < 0) bz = scale(bz, -1);

    // Decide which side faces up. The closed / flat face is the one with the
    // largest area perpendicular to the thin axis. Roofs keep it up, plates
    // keep it down.
    var balance = faceBalance(entry, bz);
    var wantUp = category !== 'baseplate';
    if ((wantUp && balance < 0) || (!wantUp && balance > 0)) {
      by = scale(by, -1);
      bz = scale(bz, -1);
    }

    var ext = fitExtents(entry, bx, by, bz);
    return { quat: quatFromBasis(bx, by, bz), size: ext };
  }

  function faceBalance(entry, bz) {
    var positions = entry.positions;
    var count = positions.length / 9;
    var a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
    var up = 0;
    var down = 0;
    for (var i = 0; i < count; i++) {
      dequantize(entry, i * 3, a);
      dequantize(entry, i * 3 + 1, b);
      dequantize(entry, i * 3 + 2, c);
      var normal = cross(sub(b, a), sub(c, a));
      var area = Math.hypot(normal[0], normal[1], normal[2]) / 2;
      if (area <= 0) continue;
      var alignment = dot(normal, bz) / (area * 2);
      if (alignment > 0.85) up += area * alignment;
      else if (alignment < -0.85) down += -area * alignment;
    }
    return up - down;
  }

  function fitExtents(entry, bx, by, bz) {
    var positions = entry.positions;
    var count = positions.length / 3;
    var p = [0, 0, 0];
    var lo = [Infinity, Infinity, Infinity];
    var hi = [-Infinity, -Infinity, -Infinity];
    for (var i = 0; i < count; i++) {
      dequantize(entry, i, p);
      var values = [dot(p, bx), dot(p, by), dot(p, bz)];
      for (var a = 0; a < 3; a++) {
        if (values[a] < lo[a]) lo[a] = values[a];
        if (values[a] > hi[a]) hi[a] = values[a];
      }
    }
    return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  }

  function quatFromBasis(bx, by, bz) {
    var m00 = bx[0], m01 = bx[1], m02 = bx[2];
    var m10 = by[0], m11 = by[1], m12 = by[2];
    var m20 = bz[0], m21 = bz[1], m22 = bz[2];
    var trace = m00 + m11 + m22;
    var s;
    if (trace > 0) {
      s = Math.sqrt(trace + 1) * 2;
      return [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
    }
    if (m00 > m11 && m00 > m22) {
      s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
    }
    if (m11 > m22) {
      s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
    }
    s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }

  // Rotation matrices exported from the reference project's
  // assets/orientations.json (see tools/import_orientations.py), keyed by STL
  // path as a row-major 3x3 array.
  function orientationFor(path) {
    var table = window.VAULT_ORIENTATIONS;
    if (!table || typeof table !== 'object' || !path) return null;
    var matrix = table[path];
    if (!matrix || matrix.length !== 9) return null;
    for (var i = 0; i < 9; i++) {
      if (typeof matrix[i] !== 'number' || !isFinite(matrix[i])) return null;
    }
    return matrix;
  }

  function quatFromMatrix3(m) {
    var m00 = m[0], m01 = m[1], m02 = m[2];
    var m10 = m[3], m11 = m[4], m12 = m[5];
    var m20 = m[6], m21 = m[7], m22 = m[8];
    var trace = m00 + m11 + m22;
    var s;
    var q;
    if (trace > 0) {
      s = Math.sqrt(trace + 1) * 2;
      q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
    } else if (m00 > m11 && m00 > m22) {
      s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
    } else if (m11 > m22) {
      s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
    } else {
      s = Math.sqrt(1 + m22 - m00 - m11) * 2;
      q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
    }
    var length = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
  }

  // Rotate the 8 corners of the raw local box around its centre and return the
  // axis-aligned bounding size of the rotated box.
  function rotatedBoxSize(local, m) {
    var half = [local[0] / 2, local[1] / 2, local[2] / 2];
    var lo = [Infinity, Infinity, Infinity];
    var hi = [-Infinity, -Infinity, -Infinity];
    for (var sx = -1; sx <= 1; sx += 2) {
      for (var sy = -1; sy <= 1; sy += 2) {
        for (var sz = -1; sz <= 1; sz += 2) {
          var x = sx * half[0];
          var y = sy * half[1];
          var z = sz * half[2];
          var values = [
            m[0] * x + m[1] * y + m[2] * z,
            m[3] * x + m[4] * y + m[5] * z,
            m[6] * x + m[7] * y + m[8] * z,
          ];
          for (var a = 0; a < 3; a++) {
            if (values[a] < lo[a]) lo[a] = values[a];
            if (values[a] > hi[a]) hi[a] = values[a];
          }
        }
      }
    }
    return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  }

  function canonicalize(entry, category, path) {
    var local = [
      entry.maximum[0] - entry.minimum[0],
      entry.maximum[1] - entry.minimum[1],
      entry.maximum[2] - entry.minimum[2],
    ];
    var matrix = orientationFor(path);
    if (matrix) {
      return {
        quat: quatFromMatrix3(matrix),
        size: rotatedBoxSize(local, matrix),
        local: local,
      };
    }
    if (category === 'box') {
      return { quat: [0, 0, 0, 1], size: local, local: local };
    }
    if (category === 'module') {
      // Printed upright: local Y = height for the small sizes, while the large
      // L / XL modules are already exported with Z as height.
      if (local[1] <= local[0] && local[1] <= local[2]) {
        return {
          quat: [Math.SQRT1_2, 0, 0, Math.SQRT1_2],
          size: [local[0], local[2], local[1]],
          local: local,
        };
      }
      return { quat: [0, 0, 0, 1], size: local, local: local };
    }
    if (category === 'facade') {
      // Local Y = height, local Z = depth (printed upright).
      return {
        quat: [Math.SQRT1_2, 0, 0, Math.SQRT1_2],
        size: [local[0], local[2], local[1]],
        local: local,
      };
    }
    var flat = flatOrientation(entry, category);
    return { quat: flat.quat, size: flat.size, local: local };
  }

  // ---------------------------------------------------------------- layout

  // Reference-project style layout: body (module / box) at the origin, roof
  // and baseplate as layers, facade in front, back panels behind, handles above
  // and every remaining small part in a 3-column grid to the right.
  function layout(entries) {
    var byCategory = {};
    entries.forEach(function (entry) {
      (byCategory[entry.part.category] || (byCategory[entry.part.category] = [])).push(entry);
    });

    // Split files (Part 1 / Part 2) replace their category siblings.
    Object.keys(byCategory).forEach(function (category) {
      var list = byCategory[category];
      var split = list.filter(function (entry) { return entry.part.split > 0; });
      if (split.length) {
        split.sort(function (a, b) { return a.part.split - b.part.split; });
        byCategory[category] = split;
      }
    });

    var body = null;
    if (byCategory.box && byCategory.box.length) body = byCategory.box[0];
    else if (byCategory.module && byCategory.module.length) body = byCategory.module[0];
    else {
      entries.forEach(function (entry) {
        var volume = entry.size[0] * entry.size[1] * entry.size[2];
        if (!body || volume > body.volume) body = { entry: entry, volume: volume };
      });
      body = body ? body.entry : null;
    }
    if (!body) return null;

    var gap = LAYOUT_GAP;
    var bodyW = body.size[0];
    var bodyD = body.size[1];
    var bodyH = body.size[2];
    var boxList = byCategory.box || [];
    var boxH = boxList.length ? boxList[0].size[2] : bodyH;
    var topZ = Math.max(bodyH, boxH);
    var roofTop = topZ;
    var placed = [];

    function push(entry, center) {
      placed.push({ entry: entry, center: center });
    }

    function centered(i, count) {
      return i - (count - 1) / 2;
    }

    var modules = byCategory.module || [];
    modules.forEach(function (entry, i) {
      push(entry, [centered(i, modules.length) * (bodyW + gap), 0, entry.size[2] / 2]);
    });

    boxList.forEach(function (entry, i) {
      push(entry, [
        centered(i, boxList.length) * (entry.size[0] + gap),
        -bodyD * 0.8 - gap * 0.45,
        entry.size[2] / 2,
      ]);
    });

    var roofs = byCategory.roof || [];
    roofs.forEach(function (entry, i) {
      var z = topZ + gap + entry.size[2] / 2;
      push(entry, [centered(i, roofs.length) * (bodyW * 0.6 + gap), 0, z]);
      roofTop = Math.max(roofTop, topZ + gap + entry.size[2]);
    });

    var plates = byCategory.baseplate || [];
    plates.forEach(function (entry, i) {
      push(entry, [
        centered(i, plates.length) * (entry.size[0] + gap),
        -bodyD * 0.8 - gap * 0.45,
        (boxH || bodyH) + gap * 0.6 + entry.size[2] / 2,
      ]);
    });

    var facades = byCategory.facade || [];
    facades.forEach(function (entry, i) {
      push(entry, [
        centered(i, facades.length) * (entry.size[0] + gap),
        -bodyD * 1.35 - gap,
        entry.size[2] / 2,
      ]);
    });

    // Back-stacked large panels: category order keeps each layer separate.
    var backY = bodyD * 0.8 + gap;
    ['backpanel', 'backbone', 'pegboard', 'wallmount'].forEach(function (category) {
      (byCategory[category] || []).forEach(function (entry) {
        push(entry, [0, backY + entry.size[1] / 2, entry.size[2] / 2]);
        backY += entry.size[1] + gap;
      });
    });

    var handles = byCategory.handle || [];
    handles.forEach(function (entry, i) {
      push(entry, [
        centered(i, handles.length) * (entry.size[0] + gap),
        0,
        roofTop + gap + entry.size[2] / 2,
      ]);
    });

    // Remaining small parts: fixed 3-column grid in the "small parts" area.
    var anchored = {
      box: 1,
      module: 1,
      roof: 1,
      baseplate: 1,
      facade: 1,
      backpanel: 1,
      backbone: 1,
      pegboard: 1,
      wallmount: 1,
      handle: 1,
    };
    var smallIndex = 0;
    Object.keys(RENDER_CATS).forEach(function (category) {
      if (anchored[category]) return;
      (byCategory[category] || []).forEach(function (entry) {
        var col = smallIndex % 3;
        var row = Math.floor(smallIndex / 3);
        push(entry, [
          bodyW * 0.72 + col * 65 + gap * 0.5,
          bodyD * 0.35 - row * 75,
          Math.max(0, entry.size[2] / 2),
        ]);
        smallIndex++;
      });
    });

    return placed;
  }

  // ---------------------------------------------------------------- scene

  function buildScene(results, list) {
    if (!view) return;
    disposeModel();
    var core = [];
    var rest = [];
    var oversized = [];
    var failed = 0;
    results.forEach(function (result) {
      if (!result) return;
      if (result.error) {
        if (result.error.message === 'oversized') oversized.push(result.part);
        else failed++;
        return;
      }
      var canonical = result.data.canonical;
      var entry = {
        part: result.part,
        data: result.data,
        quat: canonical.quat,
        size: canonical.size,
        local: canonical.local,
      };
      if (CORE_CATS[result.part.category]) core.push(entry);
      else rest.push(entry);
    });

    // Core structure is always kept; small parts are added in order until the
    // triangle / part budget is exhausted.
    var entries = core.slice();
    var trianglesUsed = 0;
    entries.forEach(function (entry) { trianglesUsed += entry.data.triangles || 0; });
    var skipped = 0;
    rest.forEach(function (entry) {
      var next = entry.data.triangles || 0;
      if (entries.length >= MAX_SCENE_PARTS || trianglesUsed + next > MAX_SCENE_TRIANGLES) {
        skipped++;
        return;
      }
      entries.push(entry);
      trianglesUsed += next;
    });

    if (!entries.length) {
      idle(oversized.length
        ? '该组合的 STL 面数过高（' + oversized.length + ' 件），已省略实时预览。可单件预览查看。'
        : '无法读取组合模型。请通过本地服务器打开页面，或在打印清单中「导入 STL 文件夹」。');
      return;
    }

    var placed = layout(entries);
    if (!placed) {
      idle('该组合没有可装配的结构件。');
      return;
    }

    var model = new T.Group();
    var parts = [];
    var min = [Infinity, Infinity, Infinity];
    var max = [-Infinity, -Infinity, -Infinity];
    var triangles = 0;

    placed.forEach(function (item) {
      var entry = item.entry;
      var colorKey = entry.part.colorKey || entry.part.category;
      var geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(entry.data.positions, 3, true));
      geometry.boundingBox = new T.Box3(new T.Vector3(0, 0, 0), new T.Vector3(1, 1, 1));
      geometry.boundingSphere = new T.Sphere(new T.Vector3(0.5, 0.5, 0.5), Math.sqrt(3) / 2);
      var material = new T.MeshStandardMaterial({
        color: colorForPart({ colorKey: colorKey, category: entry.part.category }),
        roughness: 0.8,
        metalness: 0.03,
        side: T.DoubleSide,
        flatShading: true,
      });
      material.userData.ownMaterial = true;
      var mesh = new T.Mesh(geometry, material);
      mesh.scale.set(entry.local[0], entry.local[1], entry.local[2]);
      mesh.position.set(-entry.local[0] / 2, -entry.local[1] / 2, -entry.local[2] / 2);
      var group = new T.Group();
      group.add(mesh);
      group.quaternion.set(entry.quat[0], entry.quat[1], entry.quat[2], entry.quat[3]);
      group.position.set(item.center[0], item.center[1], item.center[2]);
      model.add(group);
      parts.push({
        group: group,
        base: [item.center[0], item.center[1], item.center[2]],
        category: entry.part.category,
        colorKey: colorKey,
        name: entry.part.name,
        label: entry.part.label || '',
        path: entry.part.path,
        mesh: mesh,
        material: material,
        local: entry.local,
        half: [entry.local[0] / 2, entry.local[1] / 2, entry.local[2] / 2],
        baseColor: material.color.getHex(),
      });
      triangles += entry.data.triangles || 0;
      for (var a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], item.center[a] - entry.size[a] / 2);
        max[a] = Math.max(max[a], item.center[a] + entry.size[a] / 2);
      }
    });

    var smallNo = 0;
    parts.forEach(function (part) {
      if (!view.labels) return;
      var core = Boolean(LABEL_CATS[part.category]);
      var label = document.createElement('button');
      label.type = 'button';
      label.className = 'ap-label' + (core ? '' : ' is-compact');
      if (core) {
        label.textContent = part.label || part.name;
      } else {
        smallNo++;
        label.textContent = ('0' + smallNo).slice(-2);
      }
      label.title = part.name;
      label.setAttribute('aria-label', part.name);
      label.setAttribute('data-color-key', part.colorKey);
      label.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (!view || typeof view.onPick !== 'function') return;
        view.onPick({
          colorKey: part.colorKey,
          name: part.name,
          path: part.path,
          category: part.category,
          source: 'label',
        });
      });
      view.labels.append(label);
      part.labelEl = label;
    });

    // Oversized STLs (mostly XL / L² modules) are left out of the GPU scene so
    // the preview stays responsive; the stats line reports how many.
    var overall = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
    var center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    model.position.set(-center[0], -center[1], -center[2]);

    // Parts are laid out Z-up; the viewer (like every three.js scene) is Y-up.
    var root = new T.Group();
    root.rotation.x = -Math.PI / 2;
    root.add(model);
    view.scene.add(root);
    view.model = root;
    view.radius = Math.hypot(overall[0], overall[1], overall[2]) / 2;
    view.parts = parts;
    view.explodeDistance = Math.max(overall[0], overall[1], overall[2]) * 0.55;
    applyHighlight();

    var span = Math.max(overall[0], overall[1], overall[2]);
    var grid = new T.GridHelper(span * 2.4, 20, 0x8c3a22, 0x35342c);
    grid.position.y = min[2] - center[2] - 0.5;
    view.scene.add(grid);
    view.grid = grid;

    ui.overlay.hidden = true;
    ui.progress.removeAttribute('value');
    viewButtons(false);
    applyExplode();
    if (ui.explode) ui.explode.disabled = false;
    ui.stats.textContent = parts.length + ' 件 · ' + Math.round(triangles / 10000) + ' 万面';
    var omitted = oversized.length + skipped;
    ui.note.textContent = '参考姿态展开 · 小件区'
      + (omitted ? ' · ' + omitted + ' 件省略' : '')
      + (failed ? ' · ' + failed + ' 件读取失败' : '');
    setView('reset');
  }

  function applyExplode() {
    if (!view) return;
    var distance = (view.explodeDistance || 0) * explode;
    (view.parts || []).forEach(function (part) {
      var dir = EXPLODE_DIRS[part.category] || [0, 0, 0];
      part.group.position.set(
        part.base[0] + dir[0] * distance,
        part.base[1] + dir[1] * distance,
        part.base[2] + dir[2] * distance
      );
    });
    view.render();
  }

  function positionLabels() {
    if (!view || !view.labels || !view.stage || !T) return;
    var parts = view.parts || [];
    if (!parts.length) return;
    var rect = view.stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var camera = view.camera;
    camera.updateMatrixWorld();
    view.scene.updateMatrixWorld(true);
    var point = new T.Vector3();
    var entries = [];
    parts.forEach(function (part) {
      var el = part.labelEl;
      if (!el) return;
      point.set(0, 0, part.local[2] / 2);
      part.group.localToWorld(point);
      point.project(camera);
      if (point.z > 1 || point.x < -1.05 || point.x > 1.05 || point.y < -1.05 || point.y > 1.05) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      entries.push({
        part: part,
        el: el,
        x: (point.x * 0.5 + 0.5) * rect.width,
        y: (-point.y * 0.5 + 0.5) * rect.height,
      });
    });

    // Core labels get the best position; compact labels are nudged vertically
    // until they no longer cover an already placed label.
    entries.sort(function (a, b) {
      return (LABEL_CATS[b.part.category] ? 1 : 0) - (LABEL_CATS[a.part.category] ? 1 : 0);
    });
    var occupied = [];
    entries.forEach(function (item) {
      var el = item.el;
      var w = el.offsetWidth || (el.classList.contains('is-compact') ? 20 : 46);
      var h = el.offsetHeight || 15;
      var x = item.x;
      var y = item.y;
      for (var attempt = 0; attempt < 14; attempt++) {
        var step = Math.ceil(attempt / 2) * (h + 4);
        var candidate = y + (attempt % 2 === 1 ? -step : step);
        var box = { left: x - w / 2, right: x + w / 2, top: candidate - h, bottom: candidate };
        var clash = occupied.some(function (other) {
          return box.left < other.right && box.right > other.left
            && box.top < other.bottom && box.bottom > other.top;
        });
        if (!clash) {
          y = candidate;
          occupied.push(box);
          break;
        }
      }
      el.style.left = x.toFixed(1) + 'px';
      el.style.top = y.toFixed(1) + 'px';
    });
  }

  function frameExplode() {
    if (!view || !view.parts.length) return;
    var camera = view.camera;
    var controls = view.controls;
    var radius = (view.radius || 1) * (1 + explode * 0.55);
    var verticalFov = camera.fov * Math.PI / 180;
    var horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    var distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.2;
    var offset = camera.position.clone().sub(controls.target);
    if (offset.length() < 1e-6) return;
    offset.setLength(distance);
    camera.position.copy(controls.target).add(offset);
    camera.near = Math.max(0.1, radius / 1000);
    camera.far = Math.max(1000, distance * 40);
    camera.updateProjectionMatrix();
    controls.maxDistance = distance * 8;
    controls.update();
    view.render();
  }

  function setView(name) {
    if (!view || !view.model) return;
    var camera = view.camera;
    var controls = view.controls;
    var radius = view.radius || 1;
    var verticalFov = camera.fov * Math.PI / 180;
    var horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    var distance = radius * (1 + explode * 0.55) / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.2;
    var direction = name === 'top' ? [0, 1, 0.0001] : name === 'front' ? [0, 0.0001, 1] : [1, 0.8, 1.1];
    camera.position.set(direction[0], direction[1], direction[2]).normalize().multiplyScalar(distance);
    camera.near = Math.max(0.1, radius / 1000);
    camera.far = Math.max(1000, distance * 40);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = radius * 0.2;
    controls.maxDistance = distance * 8;
    controls.update();
    view.render();
  }

  // ---------------------------------------------------------------- ui state

  function viewButtons(disabled) {
    if (!ui) return;
    Array.prototype.forEach.call(ui.views, function (button) { button.disabled = disabled; });
  }

  function setProgress(value, text) {
    if (!ui) return;
    if (text) ui.status.textContent = text;
    if (value === null || value === undefined) ui.progress.removeAttribute('value');
    else ui.progress.value = Math.max(0, Math.min(100, value));
  }

  function idle(message) {
    token++;
    disposeModel();
    if (view) view.render();
    if (!ui) return;
    showOverlay(message || '调整左侧选项以预览组合');
    ui.progress.hidden = true;
    viewButtons(true);
    if (ui.explode) ui.explode.disabled = true;
    ui.stats.textContent = '—';
    ui.note.textContent = '参考姿态展开 · 小件区';
  }

  function showOverlay(message) {
    if (view) {
      if (view.labels) view.labels.textContent = '';
      hideTooltip();
    }
    ui.overlay.hidden = false;
    setProgress(null, message);
  }

  // ---------------------------------------------------------------- update

  function normalizeParts(parts) {
    var seen = {};
    var list = [];
    (parts || []).forEach(function (part) {
      if (!part || !part.path || seen[part.path]) return;
      if (!RENDER_CATS[part.category]) return;
      seen[part.path] = true;
      list.push({
        path: part.path,
        name: part.name || part.path.split('/').pop(),
        label: part.label || '',
        category: part.category,
        colorKey: part.colorKey || part.category,
        size: part.size || 0,
        split: part.split || 0,
      });
    });
    return list;
  }

  function runUpdate() {
    var request = queued;
    queued = null;
    if (!request || !ui) return;
    var list = normalizeParts(request.parts);
    ui.title.textContent = request.label ? '组合预览 · ' + request.label : '组合预览';

    if (!list.length) {
      idle(request.emptyMessage || '当前没有可预览的结构件。');
      return;
    }

    var jobToken = ++token;
    ui.progress.hidden = false;
    showOverlay('正在准备组合预览…');
    setProgress(0, '正在准备组合预览…');
    viewButtons(true);

    ensureEngine()
      .then(function (engine) {
        T = engine;
        if (jobToken !== token) return null;
        try {
          ensureView();
          view.colors = paint.colors;
          view.dyeing = paint.dyeing;
          view.onPick = paint.onPick;
          view.renderer.domElement.style.cursor = paint.dyeing ? 'crosshair' : 'grab';
        } catch (error) {
          idle('当前浏览器未启用 WebGL 2，无法显示组合预览。');
          return null;
        }
        return loadAll(list, jobToken);
      })
      .then(function (results) {
        if (!results || jobToken !== token) return;
        try {
          buildScene(results, list);
        } catch (error) {
          idle('组合渲染失败：' + (error && error.message ? error.message : '未知错误'));
        }
      })
      .catch(function (error) {
        if (jobToken !== token) return;
        idle(error && error.message === 'library'
          ? '预览组件加载失败，请确认 vendor 文件夹与页面一起部署。'
          : '无法读取组合模型，请通过本地服务器打开页面，或在打印清单中「导入 STL 文件夹」后重试。');
      });
  }

  function update(parts, options) {
    if (!ui) return;
    if (options && options.colors) {
      paint.colors = options.colors;
      if (view) view.colors = paint.colors;
    }
    queued = {
      parts: parts,
      label: (options && options.label) || '',
      emptyMessage: options && options.emptyMessage,
    };
    clearTimeout(updateTimer);
    updateTimer = setTimeout(runUpdate, 140);
  }

  // ---------------------------------------------------------------- public color api

  function defaultHexColors() {
    var colors = {};
    Object.keys(DEFAULT_COLORS).forEach(function (key) {
      colors[key] = '#' + ('000000' + DEFAULT_COLORS[key].toString(16)).slice(-6);
    });
    return colors;
  }

  function resetColors() {
    setColors(defaultHexColors());
  }

  function setColors(colors) {
    paint.colors = colors && typeof colors === 'object' ? colors : {};
    if (!view) return;
    view.colors = paint.colors;
    (view.parts || []).forEach(applyPartColor);
    applyHighlight();
    view.render();
  }

  function paintPart(colorKey, hex) {
    if (!colorKey) return;
    paint.colors = Object.assign({}, paint.colors, { [colorKey]: hex });
    if (!view) return;
    view.colors = paint.colors;
    (view.parts || []).forEach(function (part) {
      if (part.colorKey === colorKey) applyPartColor(part);
    });
    applyHighlight();
    view.render();
  }

  function highlight(colorKey) {
    paint.highlightKey = colorKey || '';
    if (!view) return;
    view.highlightKey = paint.highlightKey;
    applyHighlight();
    view.render();
  }

  function setDyeing(enabled) {
    paint.dyeing = Boolean(enabled);
    if (!view) return;
    view.dyeing = paint.dyeing;
    view.renderer.domElement.style.cursor = paint.dyeing ? 'crosshair' : 'grab';
  }

  function onPick(handler) {
    paint.onPick = typeof handler === 'function' ? handler : null;
    if (view) view.onPick = paint.onPick;
  }

  // ---------------------------------------------------------------- boot

  function boot() {
    var root = document.getElementById('assembly-preview');
    if (!root) return;
    ui = {
      root: root,
      title: document.getElementById('ap-title'),
      stats: document.getElementById('ap-stats'),
      host: document.getElementById('ap-host'),
      overlay: document.getElementById('ap-overlay'),
      status: document.getElementById('ap-status'),
      progress: document.getElementById('ap-progress'),
      note: document.getElementById('ap-note'),
      explode: document.getElementById('ap-explode'),
      explodeVal: document.getElementById('ap-explode-val'),
      views: root.querySelectorAll('[data-ap-view]'),
    };
    ui.overlay.hidden = false;
    ui.progress.removeAttribute('value');
    ui.note.textContent = '参考姿态展开 · 小件区';

    if (ui.explode) {
      ui.explode.disabled = true;
      ui.explode.addEventListener('input', function () {
        explode = Math.max(0, Math.min(100, Number(ui.explode.value) || 0)) / 100;
        ui.explodeVal.textContent = Math.round(explode * 100) + '%';
        applyExplode();
        frameExplode();
      });
    }

    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ap-view]');
      if (!button || button.disabled) return;
      setView(button.getAttribute('data-ap-view'));
    });

    ui.progress.hidden = true;
    window.VaultAssembly = {
      update: update,
      idle: idle,
      setColors: setColors,
      paintPart: paintPart,
      resetColors: resetColors,
      highlight: highlight,
      setDyeing: setDyeing,
      onPick: onPick,
      __installed: true,
    };
  }

  if (document.getElementById('assembly-preview')) {
    boot();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // ---------------------------------------------------------------- helpers

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function normalize(a) {
    var length = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / length, a[1] / length, a[2] / length];
  }
})();
