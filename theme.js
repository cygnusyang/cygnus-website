/* Theme: dark by default, light is opt-in.
   Runs synchronously in <head> so the first paint already has the right
   colour scheme (no white flash), then wires up the nav button on DOM ready. */
(function () {
  var root = document.documentElement;
  var KEY = 'cygnus-theme';
  var LIGHT = 'light';

  function readSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  // Apply before paint. ?theme=light / ?theme=dark 可强制指定并记住。
  var forced = null;
  try { forced = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  if (forced === LIGHT || forced === 'dark') {
    save(forced);
  }
  if (readSaved() === LIGHT) root.setAttribute('data-theme', LIGHT);

  function sync(btn) {
    var isLight = root.getAttribute('data-theme') === LIGHT;
    btn.textContent = isLight ? '\u263E' : '\u2600';          // ☾ / ☀
    var label = isLight ? '切换到暗色' : '切换到亮色';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isLight ? '#ffffff' : '#0e1420');
  }

  function init() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    sync(btn);
    btn.addEventListener('click', function () {
      var isLight = root.getAttribute('data-theme') === LIGHT;
      if (isLight) {
        root.removeAttribute('data-theme');
        save('dark');
      } else {
        root.setAttribute('data-theme', LIGHT);
        save(LIGHT);
      }
      sync(btn);
    });
    // 用户若在别的标签页切换过，这里跟随一次
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY) return;
      if (readSaved() === LIGHT) root.setAttribute('data-theme', LIGHT);
      else root.removeAttribute('data-theme');
      sync(btn);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
