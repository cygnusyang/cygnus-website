#!/usr/bin/env python3
"""给站点 HTML 补 og 标签、hreflang、canonical 与 JSON-LD（结构化数据）。

用法：
    python3 scripts/seo-inject.py            # 就地打补丁（可重复执行，已存在的跳过）
    python3 scripts/seo-inject.py --check    # 只报告缺什么，不写文件

设计约束（改之前先读）：
1. **幂等**。脚本跑第二遍不能再插一遍，否则页面里会出现两份 og:title。
2. **只写页面上真实存在的内容**。JSON-LD 里的价格、系统要求、工具数量都是硬事实，
   改这些字段前先去对应页面核对，不要照着记忆写。
3. **URL 一律无扩展名**（`/zh` 而非 `/zh.html`）。Cloudflare Pages 的 Pretty URLs 默认开启，
   带 .html 的地址会被 308 跳一次；canonical 与 sitemap 必须写最终形态，别写跳转前的。
4. **不写 FAQPage**。全站当前没有独立 FAQ 区块，凭空造 FAQ 结构化数据等于对搜索引擎说谎；
   等 FAQ 区块上线（见 06-运营/01-市场与增长/02 文档 §5.2）再补。
"""

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://ai.cygnusyang.top"
CHECK_ONLY = "--check" in sys.argv

PERSON = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": f"{BASE}/#person",
    "name": "cygnus",
    "url": f"{BASE}/",
    "sameAs": ["https://github.com/cygnusyang"],
}
WEBSITE = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": f"{BASE}/#website",
    "url": f"{BASE}/",
    "name": "ai.cygnusyang.top",
    "publisher": {"@id": f"{BASE}/#person"},
    "inLanguage": ["en", "zh-Hans"],
}


def kaidoplan(lang: str) -> dict:
    en = lang == "en"
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "@id": f"{BASE}/kaidoplan/#app",
        "name": "KaidoPlan",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Project planning",
        "operatingSystem": "macOS 14 or later",
        "url": f"{BASE}/kaidoplan/" if en else f"{BASE}/kaidoplan/zh",
        "description": (
            "A local project planning workbench for AI-assisted projects: WBS, dependencies, "
            "Gantt, critical path and date-conflict checks on a plain-JSON .kaido file, with an "
            "MCP server and CLI so agents can read and update the plan."
            if en
            else "面向 AI 协作项目的本地计划工作台：WBS、依赖、甘特、关键路径与日期冲突校验，"
            "计划保存在明文 JSON 的 .kaido 文件里，并通过 MCP server 与 CLI 让智能体读写。"
        ),
        "inLanguage": "en" if en else "zh-Hans",
        "author": {"@id": f"{BASE}/#person"},
        "publisher": {"@id": f"{BASE}/#person"},
        "isPartOf": {"@id": f"{BASE}/#website"},
        "sameAs": ["https://github.com/cygnusyang/KaidoPlan"],
        "offers": [
            {
                "@type": "Offer",
                "name": "Free",
                "price": "0",
                "priceCurrency": "USD",
                "description": "Full GUI planning with 3 delivery-report exports per month."
                if en
                else "完整 GUI 规划能力，每月 3 次交付报告导出。",
            },
            {
                "@type": "Offer",
                "name": "KaidoPlan Pro",
                "price": "9.99",
                "priceCurrency": "USD",
                "description": "Unlimited report exports plus CLI and MCP access for AI agents, billed yearly."
                if en
                else "不限次数导出，并通过 CLI 与 MCP 接入 AI 智能体；按年计费。",
            },
        ],
    }


def bitcoffer(lang: str) -> dict:
    en = lang == "en"
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "@id": f"{BASE}/bitcoffer/#app",
        "name": "Bitcoffer",
        "applicationCategory": "SecurityApplication",
        "applicationSubCategory": "Password manager",
        "operatingSystem": "macOS",
        "url": f"{BASE}/bitcoffer/" if en else f"{BASE}/bitcoffer/zh",
        "description": (
            "A local-first password and credential manager: encrypted on-device vault, Touch ID "
            "unlock, and an MCP server that hands secrets to agents without revealing the values."
            if en
            else "本地优先的密码与凭据管理器：设备端加密保险库、Touch ID 解锁，"
            "并通过 MCP server 在不暴露明文的前提下把凭据交给智能体。"
        ),
        "inLanguage": "en" if en else "zh-Hans",
        "author": {"@id": f"{BASE}/#person"},
        "publisher": {"@id": f"{BASE}/#person"},
        "offers": [
            {
                "@type": "Offer",
                "price": "9.99",
                "priceCurrency": "USD",
                "description": "Billed annually." if en else "按年计费。",
            }
        ],
    }


# 每页：url / og:locale / 分享图（相对路径）/ JSON-LD
PAGES = {
    "index.html": dict(url=f"{BASE}/", locale="en", image="/kaidoplan/assets/workbench-en.webp",
                       ld=[PERSON, WEBSITE], alt=("zh_Hans", "/zh")),
    "zh.html": dict(url=f"{BASE}/zh", locale="zh_Hans", image="/kaidoplan/assets/workbench-en.webp",
                    ld=[PERSON, WEBSITE], alt=("en", "/")),
    "pricing.html": dict(url=f"{BASE}/pricing", locale="en", image="/kaidoplan/assets/workbench-en.webp"),
    "about.html": dict(url=f"{BASE}/about", locale="en", image="/kaidoplan/assets/workbench-en.webp"),
    "kaidoplan/index.html": dict(url=f"{BASE}/kaidoplan/", locale="en", image="/kaidoplan/assets/workbench-en.webp",
                                 ld=[kaidoplan("en")], alt=("zh_Hans", "/kaidoplan/zh")),
    "kaidoplan/zh.html": dict(url=f"{BASE}/kaidoplan/zh", locale="zh_Hans", image="/kaidoplan/assets/workbench-en.webp",
                              ld=[kaidoplan("zh")], alt=("en", "/kaidoplan/")),
    "kaidoplan/privacy.html": dict(url=f"{BASE}/kaidoplan/privacy", locale="zh_Hans", canonical_only=True),
    "kaidoplan/terms.html": dict(url=f"{BASE}/kaidoplan/terms", locale="zh_Hans", canonical_only=True),
    "kaidoplan/refund.html": dict(url=f"{BASE}/kaidoplan/refund", locale="zh_Hans", canonical_only=True),
    "bitcoffer/index.html": dict(url=f"{BASE}/bitcoffer/", locale="en", image="/bitcoffer/assets/lock.png",
                                 ld=[bitcoffer("en")], alt=("zh_Hans", "/bitcoffer/zh")),
    "bitcoffer/zh.html": dict(url=f"{BASE}/bitcoffer/zh", locale="zh_Hans", image="/bitcoffer/assets/lock.png",
                              ld=[bitcoffer("zh")], alt=("en", "/bitcoffer/")),
    "bitcoffer/en.html": dict(url=f"{BASE}/bitcoffer/", locale="en", canonical_only=True),
}


def title_desc(src: str):
    t = re.search(r"<title>([^<]*)</title>", src)
    d = re.search(r'<meta name="description" content="([^"]*)"', src)
    return (html.unescape(t.group(1)) if t else "", html.unescape(d.group(1)) if d else "")


def patch(path: Path, cfg: dict) -> list[str]:
    src = path.read_text()
    title, desc = title_desc(src)
    add: list[str] = []

    if "rel=\"canonical\"" not in src:
        add.append(f'<link rel="canonical" href="{cfg["url"]}">')

    if "hreflang" not in src and cfg.get("alt"):
        other, rel = cfg["alt"]
        add.append(f'<link rel="alternate" hreflang="{other}" href="{BASE}{rel}">')
        add.append(f'<link rel="alternate" hreflang="x-default" href="{cfg["url"]}">')
    elif "hreflang" in src and "x-default" not in src:
        add.append(f'<link rel="alternate" hreflang="x-default" href="{cfg["url"]}">')

    if 'property="og:title"' not in src and cfg.get("image"):
        esc = lambda v: html.escape(v, quote=True)  # noqa: E731
        for k, v in [
            ("og:type", "website"),
            ("og:site_name", "ai.cygnusyang.top"),
            ("og:title", title),
            ("og:description", desc),
            ("og:url", cfg["url"]),
            ("og:image", BASE + cfg["image"]),
            ("og:locale", cfg["locale"]),
        ]:
            add.append(f'<meta property="{k}" content="{esc(v)}">')
        add.append('<meta name="twitter:card" content="summary_large_image">')
        add.append(f'<meta name="twitter:title" content="{esc(title)}">')

    if cfg.get("ld") and "application/ld+json" not in src:
        add.append(
            "\n".join(
                '<script type="application/ld+json">\n'
                + json.dumps(block, ensure_ascii=False, indent=2)
                + "\n</script>"
                for block in cfg["ld"]
            )
        )

    if add and not CHECK_ONLY:
        path.write_text(src.replace("</head>", "\n".join(add) + "\n</head>", 1))
    return add


def main() -> int:
    total = 0
    for rel, cfg in PAGES.items():
        p = ROOT / rel
        if not p.exists():
            print(f"缺失 {rel}")
            continue
        added = patch(p, cfg)
        total += len(added)
        flag = "待补" if added else "已完整"
        print(f"{rel:26} {flag} ({len(added)} 项)" if added else f"{rel:26} {flag}")
    print(f"\n共 {total} 项待补" + ("（--check 模式，未写入）" if CHECK_ONLY else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
