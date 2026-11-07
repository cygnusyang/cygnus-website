/**
 * analytics.js — 落地页漏斗埋点。
 *
 * 只有一件事要回答：**哪条渠道带来了多少次下载点击。**
 * 所以这里刻意不做用户识别：没有 Cookie、没有 localStorage 长期标识、
 * 不采集 UA、不采集屏幕尺寸、不做会话拼接。来源标识只放 sessionStorage
 * （关掉标签页就没了），它连「同一个人的第二次访问」都串不起来。
 *
 * 事件名必须与 Worker 侧 src/ops.ts 的 ALLOWED_EVENTS 一致，否则会被静默丢弃。
 *
 * 用法：
 *   kTrack("download_click", { p: "hero" })
 * 页面加载会自动上报一次 view；data-track 属性会自动绑定点击事件：
 *   <a href="..." data-track="download_click" data-track-page="hero">
 */
(function () {
  var ENDPOINT = "https://kaido-license-service.cygnusyang.workers.dev/t";
  var SITE = document.documentElement.getAttribute("data-site") || "kaidoplan";
  var REF_KEY = SITE === "kaidoplan" ? "k_ref" : "k_ref_" + SITE;
  var LANG = (/^zh/i.test(document.documentElement.lang || "") ? "zh" : "en");

  // 来源标识：优先 utm_source，其次 ref，最后 referrer 的主机名。
  // 三者都只保留安全字符，避免把任意字符串写进数据库。
  function sourceTag() {
    try {
      var q = new URLSearchParams(location.search);
      var raw = q.get("utm_source") || q.get("ref") || "";
      if (!raw && document.referrer) {
        try {
          var host = new URL(document.referrer).hostname.replace(/^www\./, "");
          if (host && host !== location.hostname) raw = host;
        } catch (e) {}
      }
      return (raw || "").replace(/[^A-Za-z0-9_\-.]/g, "").slice(0, 60);
    } catch (e) {
      return "";
    }
  }

  var ref = "";
  try {
    // 同一次会话内记住来源：用户在页内跳转（pricing → hero）时不该丢掉归因。
    ref = sessionStorage.getItem(REF_KEY) || "";
    if (!ref) {
      ref = sourceTag();
      if (ref) sessionStorage.setItem(REF_KEY, ref);
    }
  } catch (e) {
    ref = sourceTag();
  }

  function kTrack(name, opts) {
    opts = opts || {};
    var payload = JSON.stringify({
      n: name,
      s: SITE,
      r: ref,
      l: LANG,
      p: (opts.p || "").replace(/[^A-Za-z0-9_\-.]/g, "").slice(0, 40)
    });
    try {
      // keepalive：点下载会跳去 GitHub，普通 fetch 可能在导航时被取消。
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
        credentials: "omit"
      }).catch(function () {});
    } catch (e) {}
  }

  window.kTrack = kTrack;
  window.kRef = function () { return ref; };

  function bindClicks() {
    var nodes = document.querySelectorAll("[data-track]");
    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        el.addEventListener("click", function () {
          kTrack(el.getAttribute("data-track"), {
            p: el.getAttribute("data-track-page") || ""
          });
        });
      })(nodes[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      kTrack("view", { p: document.documentElement.getAttribute("data-page") || location.pathname.split("/").pop() || "home" });
      bindClicks();
    });
  } else {
    kTrack("view", { p: document.documentElement.getAttribute("data-page") || location.pathname.split("/").pop() || "home" });
    bindClicks();
  }
})();
