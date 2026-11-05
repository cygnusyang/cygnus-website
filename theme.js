/* Theme: follows local time by default (light 07:00-18:59, dark otherwise).
   A manual click on the nav toggle pins the choice in localStorage.
   Runs synchronously in <head> so the first paint already has the right
   colour scheme (no flash), then wires up the nav button on DOM ready.

   ?theme=light | dark  — force and remember
   ?theme=auto          — forget the manual choice, follow the clock again
*/
(function () {
  var root = document.documentElement;
  var KEY = 'cygnus-theme';
  var LIGHT = 'light';
  var DARK = 'dark';

  // 白天窗口（本地时间，左闭右开）。改这两个数字就能调早晚边界。
  var DAY_START = 7;
  var DAY_END = 19;

  function readSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  function forget() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  function byClock() {
    var h = new Date().getHours();
    return (h >= DAY_START && h < DAY_END) ? LIGHT : DARK;
  }

  // 手动选择优先；没有手动记录时才看时间。
  function resolve() {
    var saved = readSaved();
    if (saved === LIGHT || saved === DARK) return saved;
    return byClock();
  }

  var forced = null;
  try { forced = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  if (forced === LIGHT || forced === DARK) save(forced);
  else if (forced === 'auto' || forced === 'time') forget();

  function apply(mode) {
    if (mode === LIGHT) root.setAttribute('data-theme', LIGHT);
    else root.removeAttribute('data-theme');
  }

  apply(resolve());

  // 内联 SVG 图标：不依赖字体里的 ☀/☾ 字形（缺字体会渲染成方块）
  var ICON_SUN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
  var ICON_MOON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/></svg>';

  function sync(btn) {
    var isLight = root.getAttribute('data-theme') === LIGHT;
    btn.innerHTML = isLight ? ICON_MOON : ICON_SUN;          // 亮色时显示「切回暗色」的月亮
    var label = isLight ? '切换到暗色' : '切换到亮色';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isLight ? '#ffffff' : '#14161c');
  }

  function init() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    sync(btn);

    btn.addEventListener('click', function () {
      var isLight = root.getAttribute('data-theme') === LIGHT;
      var next = isLight ? DARK : LIGHT;
      apply(next);
      save(next);                 // 手动选择固定下来，不再随时间变化
      sync(btn);
    });

    // 用户若在别的标签页切换过，这里跟随一次
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY) return;
      apply(resolve());
      sync(btn);
    });

    // 页面长时间开着跨过白天/夜晚边界时自动跟上（仅在用户没手动固定时）
    setInterval(function () {
      var saved = readSaved();
      if (saved === LIGHT || saved === DARK) return;
      var mode = byClock();
      if ((root.getAttribute('data-theme') === LIGHT) !== (mode === LIGHT)) {
        apply(mode);
        sync(btn);
      }
    }, 10 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
