(function () {
  'use strict';

  // Guard against the script being included twice (defensive: some pages inject assets dynamically).
  if (window.VaultPreview && window.VaultPreview.__installed) return;
  if (document.documentElement.getAttribute('data-vault-preview') === 'loading' ||
      document.documentElement.getAttribute('data-vault-preview') === 'ready') return;
  document.documentElement.setAttribute('data-vault-preview', 'loading');

  var SELF = document.currentScript;
  var BASE = SELF && SELF.src ? SELF.src : new URL('preview.js', location.href).href;
  var VENDOR = new URL('vendor/vault-stl.min.js', BASE).href;
  var MAX_TRIANGLES = 12000000;

  var COPY = {
    loading: '正在读取模型…',
    parsing: '正在准备 3D 模型…',
    ready: '已加载',
    readError: '无法从服务器读取该模型：仓库不包含 STL，或页面以 file:// 方式打开而受到跨域限制。可在打印清单中「导入 STL 文件夹」，或选择本地 STL 文件继续预览（文件仅在本机读取，不会上传）。',
    invalid: '文件中没有有效的 STL 模型，请重新选择该组件文件。',
    tooLarge: '模型超过 1,200 万三角面的预览上限，可保存副本后使用切片软件打开。',
    webgl: '当前浏览器未启用 WebGL 2',
    libraryError: '预览组件加载失败，请确认 vendor 文件夹与页面一起部署，然后重试。'
  };

  function boot() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
      return;
    }

    // ---- styles -------------------------------------------------------
    if (!document.querySelector('link[data-vault-preview-css], link[href*="preview.css"]')) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = new URL('preview.css', BASE).href;
      css.setAttribute('data-vault-preview-css', '');
      document.head.append(css);
    }

    // ---- markup -------------------------------------------------------
    var dialog = document.createElement('dialog');
    dialog.id = 'vault-preview';
    dialog.className = 'vp-dialog';
    dialog.setAttribute('aria-labelledby', 'vp-filename');
    dialog.innerHTML = [
      '<header class="vp-head">',
      '  <div class="vp-head-main">',
      '    <p class="vp-eyebrow">3D PREVIEW / STL</p>',
      '    <h2 id="vp-filename">—</h2>',
      '  </div>',
      '  <button type="button" class="vp-close" id="vp-close" aria-label="关闭预览" title="关闭预览">×</button>',
      '</header>',
      '<div class="vp-tools">',
      '  <div class="vp-views" role="group" aria-label="视角">',
      '    <button type="button" id="vp-reset" disabled>重置视角</button>',
      '    <button type="button" id="vp-front" disabled>正视图</button>',
      '    <button type="button" id="vp-top" disabled>俯视图</button>',
      '  </div>',
      '  <span class="vp-size" id="vp-size"></span>',
      '</div>',
      '<div class="vp-stage" id="vp-stage">',
      '  <div class="vp-host" id="vp-host"></div>',
      '  <div class="vp-overlay" id="vp-overlay">',
      '    <span class="vp-cube" aria-hidden="true">◇</span>',
      '    <p class="vp-status" id="vp-status" role="status" aria-live="polite"></p>',
      '    <progress class="vp-progress" id="vp-progress" max="100" aria-label="模型读取进度"></progress>',
      '    <div class="vp-pickers" id="vp-pickers" hidden>',
      '      <label class="vp-pick">选择本地 STL 文件<input id="vp-file" type="file" accept=".stl,model/stl,application/sla"></label>',
      '      <button type="button" id="vp-retry" hidden>重新加载</button>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="vp-meta">',
      '  <span id="vp-dims">尺寸 —</span>',
      '  <span id="vp-tris">三角面 —</span>',
      '</div>',
      '<footer class="vp-foot">',
      '  <div>',
      '    <p class="vp-hint">拖动旋转 · 滚轮/双指缩放 · 右键拖动平移</p>',
      '    <p class="vp-units">STL 未记录长度单位，上方尺寸按毫米解释。</p>',
      '  </div>',
      '  <a class="vp-save" id="vp-save" download>保存副本</a>',
      '</footer>'
    ].join('');
    document.body.append(dialog);

    var $ = function (id) { return dialog.querySelector('#' + id); };
    var filenameEl = $('vp-filename');
    var closeBtn = $('vp-close');
    var sizeEl = $('vp-size');
    var stage = $('vp-stage');
    var host = $('vp-host');
    var overlay = $('vp-overlay');
    var statusEl = $('vp-status');
    var progressEl = $('vp-progress');
    var pickers = $('vp-pickers');
    var fileInput = $('vp-file');
    var retryBtn = $('vp-retry');
    var dimsEl = $('vp-dims');
    var trisEl = $('vp-tris');
    var saveEl = $('vp-save');
    var viewButtons = [$('vp-reset'), $('vp-front'), $('vp-top')];

    // ---- state --------------------------------------------------------
    var current = null;
    var state = 'loading';
    var jobId = 0;
    var worker = null;
    var enginePromise = null;
    var sceneState = null;
    var opener = null;
    var previousOverflow = '';
    var progressValue = null;
    var fileSize = 0;
    var modelInfo = null;
    var canvas = null;
    var gl = null;
    var fetchController = null;
    var saveBlobUrl = '';

    function fileName(name) {
      name = String(name || 'model').replace(/\.stl$/i, '').trim();
      return (name || 'model') + '.stl';
    }

    function pathUrl(path) {
      return new URL('../' + path.split('/').map(encodeURIComponent).join('/'), location.href);
    }

    function formatBytes(bytes) {
      if (!bytes) return '';
      if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
      return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    }

    function updateMeta() {
      sizeEl.textContent = fileSize
        ? '文件大小 ' + formatBytes(fileSize) + (fileSize > 64 * 1048576 && state !== 'ready' ? ' · 大模型 · 正在分块加载' : '')
        : '';
      dimsEl.textContent = modelInfo
        ? '尺寸 ' + modelInfo.size.map(function (value) { return value.toFixed(2); }).join(' × ') + ' mm'
        : '尺寸 —';
      trisEl.textContent = modelInfo
        ? '三角面 ' + modelInfo.triangles.toLocaleString('zh-CN')
        : '三角面 —';
    }

    function setProgress(value) {
      progressValue = value;
      if (value === null || value === undefined) progressEl.removeAttribute('value');
      else progressEl.value = Math.max(0, Math.min(100, value));
    }

    function setState(next) {
      state = next;
      dialog.dataset.state = next;
      var busy = next === 'loading' || next === 'parsing';
      stage.setAttribute('aria-busy', String(busy));
      overlay.hidden = next === 'ready';
      progressEl.hidden = !busy;
      if (busy && progressValue !== null) progressEl.value = progressValue;
      else progressEl.removeAttribute('value');
      var offerFile = next === 'readError' || next === 'invalid';
      pickers.hidden = !offerFile;
      retryBtn.hidden = !(next === 'readError' || next === 'invalid' || next === 'tooLarge' || next === 'libraryError');
      statusEl.textContent = COPY[next] || COPY.readError;
      viewButtons.forEach(function (button) { button.disabled = next !== 'ready'; });
      updateMeta();
    }

    // ---- save-a-copy link ---------------------------------------------
    function revokeSaveUrl() {
      if (saveBlobUrl) {
        URL.revokeObjectURL(saveBlobUrl);
        saveBlobUrl = '';
      }
    }

    function setSaveObject(file) {
      revokeSaveUrl();
      saveBlobUrl = URL.createObjectURL(file);
      saveEl.href = saveBlobUrl;
    }

    // ---- engine -------------------------------------------------------
    function ensureEngine() {
      if (window.VaultSTL) return Promise.resolve(window.VaultSTL);
      if (!enginePromise) {
        enginePromise = new Promise(function (resolve, reject) {
          var script = document.createElement('script');
          script.src = VENDOR;
          script.onload = function () {
            if (window.VaultSTL) resolve(window.VaultSTL);
            else { script.remove(); reject(new Error('libraryError')); }
          };
          script.onerror = function () { script.remove(); reject(new Error('libraryError')); };
          document.head.append(script);
        }).catch(function (error) {
          enginePromise = null;
          throw error;
        });
      }
      return enginePromise;
    }

    function ensureContext() {
      if (gl) return gl;
      if (!canvas) canvas = document.createElement('canvas');
      var attributes = {
        alpha: false,
        antialias: true,
        depth: true,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      };
      try {
        gl = canvas.getContext('webgl2', attributes);
      } catch (_) {
        gl = null;
      }
      if (!gl) {
        canvas = null;
        return null;
      }
      return gl;
    }

    function loseContext() {
      if (!gl) return;
      try {
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (_) { /* ignore */ }
      canvas = null;
      gl = null;
    }

    function makeRenderer(T) {
      var renderer = null;
      try {
        renderer = new T.WebGLRenderer({
          canvas: canvas,
          context: gl,
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        });
      } catch (_) {
        renderer = null;
      }
      if (renderer && renderer.capabilities && renderer.capabilities.isWebGL2) {
        canvas = renderer.domElement;
        gl = renderer.getContext();
        return renderer;
      }
      if (renderer) {
        try { renderer.dispose(); } catch (_) { /* ignore */ }
        try { renderer.forceContextLoss(); } catch (_) { /* ignore */ }
      }
      // Bundle without `context` support: let Three.js create its own canvas and
      // verify that it really got a WebGL 2 context.
      canvas = null;
      gl = null;
      renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      if (!renderer.capabilities || !renderer.capabilities.isWebGL2) {
        try { renderer.dispose(); } catch (_) { /* ignore */ }
        try { renderer.forceContextLoss(); } catch (_) { /* ignore */ }
        throw new Error('webgl');
      }
      canvas = renderer.domElement;
      gl = renderer.getContext();
      return renderer;
    }

    function createScene(T) {
      var renderer = makeRenderer(T);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute('aria-label', '3D 预览画布：拖动旋转，滚轮缩放，右键拖动平移。');
      host.replaceChildren(renderer.domElement);

      var scene = new T.Scene();
      scene.background = new T.Color(0x171713);
      var camera = new T.PerspectiveCamera(40, 1, 0.01, 10000);
      camera.position.set(150, 130, 170);
      scene.add(new T.HemisphereLight(0xffffff, 0x4a463b, 1.15));
      var key = new T.DirectionalLight(0xfff3e4, 2.2);
      key.position.set(2, 4, 3);
      scene.add(key);
      var fill = new T.DirectionalLight(0xcfd9ff, 0.75);
      fill.position.set(-3, 1, -2);
      scene.add(fill);

      var controls = new T.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.listenToKeyEvents(renderer.domElement);

      var render = function () {
        if (dialog.open && sceneState && sceneState.renderer === renderer) renderer.render(scene, camera);
      };
      controls.addEventListener('change', render);

      var resize = function () {
        var rect = host.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height, false);
        render();
      };

      var observer = new ResizeObserver(resize);
      sceneState = {
        T: T,
        scene: scene,
        camera: camera,
        controls: controls,
        renderer: renderer,
        observer: observer,
        render: render,
        radius: 1
      };
      observer.observe(host);
      renderer.domElement.addEventListener('webglcontextlost', function (event) {
        if (!sceneState || sceneState.renderer !== renderer) return;
        event.preventDefault();
        cancelJob();
        setState('webgl');
      });
      resize();
    }

    function clearScene() {
      var snapshot = sceneState;
      sceneState = null;
      if (snapshot) {
        snapshot.controls.dispose();
        snapshot.observer.disconnect();
        snapshot.scene.traverse(function (object) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            var materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(function (material) { material.dispose(); });
          }
        });
        snapshot.renderer.dispose();
        try { snapshot.renderer.forceContextLoss(); } catch (_) { /* ignore */ }
        snapshot.renderer.domElement.remove();
        canvas = null;
        gl = null;
      } else {
        loseContext();
      }
    }

    // ---- camera views -------------------------------------------------
    function setView(view) {
      if (!sceneState || !modelInfo) return;
      var camera = sceneState.camera;
      var controls = sceneState.controls;
      var radius = sceneState.radius;
      var T = sceneState.T;
      var verticalFov = camera.fov * Math.PI / 180;
      var horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      var distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.15;
      var direction = view === 'top' ? [0, 1, 0.0001] : view === 'front' ? [0, 0.0001, 1] : [1, 0.85, 1.2];
      camera.position.copy(new T.Vector3(direction[0], direction[1], direction[2]).normalize().multiplyScalar(distance));
      camera.near = Math.max(0.001, radius / 1000);
      camera.far = Math.max(100, distance * 100);
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.minDistance = radius * 0.1;
      controls.maxDistance = distance * 8;
      controls.update();
      sceneState.render();
    }

    function displayModel(data) {
      var T = sceneState.T;
      var scene = sceneState.scene;
      var size = data.maximum.map(function (max, axis) { return max - data.minimum[axis]; });
      var geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(new Uint16Array(data.positions), 3, true));
      geometry.boundingBox = new T.Box3(new T.Vector3(0, 0, 0), new T.Vector3(1, 1, 1));
      geometry.boundingSphere = new T.Sphere(new T.Vector3(0.5, 0.5, 0.5), Math.sqrt(3) / 2);
      var material = new T.MeshStandardMaterial({
        color: 0xd3ccba,
        roughness: 0.78,
        metalness: 0.03,
        side: T.DoubleSide,
        flatShading: true
      });
      var mesh = new T.Mesh(geometry, material);
      mesh.scale.set(size[0] || 0.000001, size[1] || 0.000001, size[2] || 0.000001);
      mesh.position.set(-size[0] / 2, -size[1] / 2, -size[2] / 2);
      var group = new T.Group();
      group.rotation.x = -Math.PI / 2;
      group.add(mesh);
      scene.add(group);

      var maxSize = Math.max(size[0], size[1], size[2]);
      var grid = new T.GridHelper(maxSize * 2.6, 20, 0x8c3a22, 0x35342c);
      grid.position.y = -size[2] / 2 - maxSize * 0.015;
      scene.add(grid);

      sceneState.radius = Math.hypot(size[0], size[1], size[2]) / 2;
      modelInfo = { size: size, triangles: data.triangles };
      setState('ready');
      setView('reset');
    }

    // ---- loading ------------------------------------------------------
    function cancelJob() {
      jobId++;
      if (fetchController) {
        try { fetchController.abort(); } catch (_) { /* ignore */ }
        fetchController = null;
      }
      if (worker) {
        try { worker.terminate(); } catch (_) { /* ignore */ }
        worker = null;
      }
    }

    function resetMeta() {
      fileSize = 0;
      modelInfo = null;
      setProgress(null);
      updateMeta();
    }

    function makeFile(blob, name) {
      try {
        return new File([blob], fileName(name), { type: 'model/stl' });
      } catch (_) {
        var fallback = new Blob([blob], { type: 'model/stl' });
        try { fallback.name = fileName(name); } catch (__) { /* ignore */ }
        return fallback;
      }
    }

    async function readBlob(response, token) {
      var total = Number(response.headers.get('content-length')) || 0;
      if (!response.body || !response.body.getReader) return response.blob();
      var reader = response.body.getReader();
      var chunks = [];
      var received = 0;
      for (;;) {
        var step = await reader.read();
        if (step.done) break;
        if (token !== jobId) {
          try { await reader.cancel(); } catch (_) { /* ignore */ }
          throw new DOMException('aborted', 'AbortError');
        }
        if (step.value) {
          chunks.push(step.value);
          received += step.value.byteLength;
          setProgress(total > 0 ? 25 * received / total : null);
        }
      }
      if (token !== jobId) throw new DOMException('aborted', 'AbortError');
      return new Blob(chunks, { type: 'model/stl' });
    }

    async function parseFile(file, token) {
      fileSize = file.size;
      updateMeta();

      var T;
      try {
        T = await ensureEngine();
      } catch (_) {
        if (token === jobId && dialog.open) setState('libraryError');
        return;
      }
      if (token !== jobId || !dialog.open) return;

      if (!gl && !ensureContext()) {
        setState('webgl');
        return;
      }
      try {
        createScene(T);
      } catch (_) {
        clearScene();
        setState('webgl');
        return;
      }

      setProgress(null);
      setState('parsing');

      try {
        worker = T.createWorker();
      } catch (_) {
        worker = null;
        clearScene();
        setState('libraryError');
        return;
      }

      worker.onmessage = function (event) {
        if (token !== jobId || !dialog.open) return;
        var data = event.data;
        if (!data) return;
        if (data.type === 'progress') {
          setProgress(25 + Math.max(0, Math.min(100, data.value)) * 0.75);
        } else if (data.type === 'ready') {
          var done = worker;
          worker = null;
          if (done) done.terminate();
          try {
            displayModel(data);
          } catch (_) {
            clearScene();
            setState('webgl');
          }
        } else if (data.type === 'error') {
          var failed = worker;
          worker = null;
          if (failed) failed.terminate();
          clearScene();
          setState(data.code === 'tooLarge' ? 'tooLarge' : 'invalid');
        }
      };

      worker.onerror = function () {
        if (token !== jobId || !dialog.open) return;
        var failed = worker;
        worker = null;
        if (failed) failed.terminate();
        clearScene();
        setState('invalid');
      };

      worker.postMessage({ file: file });
    }

    async function startLoad() {
      cancelJob();
      clearScene();
      var token = jobId;
      resetMeta();
      setState('loading');

      if (!ensureContext()) {
        setState('webgl');
        return;
      }
      if (!current) return;

      var url = pathUrl(current.path);
      var local = window.VaultLocal ? window.VaultLocal.get(current.path) : null;
      saveEl.download = fileName(current.name);
      var blob = null;

      if (local) {
        saveEl.removeAttribute('href');
        blob = local;
      } else {
        saveEl.href = url.href;
        fetchController = new AbortController();
        try {
          var response = await fetch(url.href, { signal: fetchController.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('http-' + response.status);
          blob = await readBlob(response, token);
        } catch (error) {
          if (token !== jobId || error.name === 'AbortError') return;
          fetchController = null;
          saveEl.removeAttribute('href');
          setState('readError');
          return;
        }
        fetchController = null;
      }
      if (token !== jobId || !dialog.open) return;

      var file = makeFile(blob, current.name);
      setSaveObject(file);
      await parseFile(file, token);
    }

    // ---- open / close -------------------------------------------------
    function open(path, displayName, trigger) {
      if (!path || typeof path !== 'string') return;
      var name = fileName(displayName || path.split('/').pop());
      current = { path: path, name: name };
      opener = trigger || document.activeElement;
      filenameEl.textContent = name;
      filenameEl.title = path;
      saveEl.download = name;
      if (window.VaultLocal && window.VaultLocal.get(path)) saveEl.removeAttribute('href');
      else saveEl.href = pathUrl(path).href;
      if (!dialog.open) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.showModal();
      }
      closeBtn.focus();
      startLoad();
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    // ---- dialog events ------------------------------------------------
    closeBtn.addEventListener('click', close);
    $('vp-reset').addEventListener('click', function () { setView('reset'); });
    $('vp-front').addEventListener('click', function () { setView('front'); });
    $('vp-top').addEventListener('click', function () { setView('top'); });
    retryBtn.addEventListener('click', function () { startLoad(); });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      if (window.VaultLocal) window.VaultLocal.importFiles([file]);
      cancelJob();
      clearScene();
      var token = jobId;
      resetMeta();
      setState('loading');
      if (!ensureContext()) {
        setState('webgl');
        return;
      }
      setSaveObject(file);
      parseFile(file, token);
    });

    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    });

    dialog.addEventListener('close', function () {
      // Reopened before this queued close event fired: keep the new session intact.
      if (dialog.open) return;
      cancelJob();
      clearScene();
      revokeSaveUrl();
      saveEl.removeAttribute('href');
      modelInfo = null;
      fileSize = 0;
      current = null;
      document.body.style.overflow = previousOverflow;
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
      opener = null;
    });

    window.VaultPreview = {
      open: open,
      close: close,
      __installed: true,
      maxTriangles: MAX_TRIANGLES
    };

    document.documentElement.setAttribute('data-vault-preview', 'ready');

    // Delegated listener: buttons anywhere in the app only need
    // data-preview-path (and optional data-preview-name).
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      var trigger = target.closest('[data-preview-path]');
      if (!trigger) return;
      var path = trigger.getAttribute('data-preview-path');
      if (!path) return;
      if (trigger.tagName === 'A') event.preventDefault();
      open(path, trigger.getAttribute('data-preview-name') || '', trigger);
    });
  }

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
