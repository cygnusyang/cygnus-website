(function () {
  var tries = 0;
  function start() {
    if (!window.Paddle || !window.Paddle.Initialize) {
      if (tries++ < 50) { setTimeout(start, 100); }
      return;
    }
    Paddle.Initialize({ token: "live_4a29a303f49f7dc47c33854986c" });

    var q = new URLSearchParams(location.search);

    // Paddle 生成的结账链接会带 ?_ptxn=txn_...，直接打开该笔交易
    var ptxn = q.get("_ptxn") || "";
    if (/^txn_[A-Za-z0-9]+$/.test(ptxn)) {
      Paddle.Checkout.open({ transactionId: ptxn });
      return;
    }

    // 定向分发直链：?dsc=dsc_xxx（折扣 ID）或 ?code=CODE（折扣码），?ref=来源标识
    var dsc = q.get("dsc") || "";
    var code = q.get("code") || "";
    var ref = (q.get("ref") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
    var hasOffer = /^dsc_[A-Za-z0-9]+$/.test(dsc) || code.length > 0;

    var btn = document.getElementById("buy-kaido-pro");
    if (!btn) { return; }

    function openCheckout(priceId) {
      var opts = {
        items: [{ priceId: priceId, quantity: 1 }],
        // 默认不收折扣：访客看不到「有优惠码吗」的输入框，减少犹豫
        settings: { showAddDiscounts: false }
      };
      if (/^dsc_[A-Za-z0-9]+$/.test(dsc)) {
        opts.discountId = dsc;
        opts.settings.allowDiscountRemoval = false;
      } else if (code) {
        opts.discountCode = code;
        opts.settings.allowDiscountRemoval = false;
      }
      if (ref) { opts.customData = { ref: ref }; }
      Paddle.Checkout.open(opts);
    }

    if (hasOffer) {
      var isZh = (document.documentElement.lang || "").toLowerCase().indexOf("zh") === 0;
      var note = document.createElement("p");
      note.className = "micro";
      note.textContent = isZh
        ? "专属优惠已应用，结账时自动生效"
        : "Your discount is applied automatically at checkout.";
      btn.parentNode.insertBefore(note, btn.nextSibling);
    }

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      // 只记「点了购买」。真正付款成功由 Paddle webhook 记账，前端不该上报钱的事。
      if (window.kTrack) { window.kTrack("buy_click", { p: "pricing" }); }
      openCheckout(btn.getAttribute("data-price"));
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
