/* ============================================================
   Cleanly — shared runtime
   Call Cleanly.init({ dict, tabSelector?, sectionIds?, onLocaleChange? })
   once per page after DOMContentLoaded.
   ============================================================ */
(function () {
  "use strict";

  const STORAGE_KEY = "cleanly.locale";

  function resolveInitialLocale() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ar" || stored === "en") return stored;
      if ((navigator.language || "").toLowerCase().startsWith("ar")) return "ar";
    } catch (_) { /* localStorage blocked */ }
    return "en";
  }

  function applyLocale(locale, dict, onChange) {
    const table = dict[locale] || dict.en || {};
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.locale = locale;

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const val = table[key];
      if (val == null) return;
      if (el.tagName === "META") el.setAttribute("content", val);
      else if (el.tagName === "TITLE") { el.textContent = val; document.title = val; }
      else el.textContent = val;
    });

    document.querySelectorAll(".lang-toggle__opt").forEach(btn => {
      btn.setAttribute("aria-pressed", btn.dataset.lang === locale ? "true" : "false");
    });

    try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}

    if (typeof onChange === "function") onChange(locale);
  }

  function wireLanguageToggle(dict, onChange) {
    document.querySelectorAll(".lang-toggle__opt").forEach(btn => {
      btn.addEventListener("click", () => applyLocale(btn.dataset.lang, dict, onChange));
    });
  }

  function wireNavScroll() {
    // Pages that want a permanently solid nav set <body data-nav="solid">.
    if (document.body.dataset.nav === "solid") {
      document.querySelectorAll(".nav").forEach(n => n.classList.add("is-scrolled"));
      return;
    }
    const navs = document.querySelectorAll(".nav");
    if (!navs.length) return;
    const onScroll = () => {
      const on = window.scrollY > 24;
      navs.forEach(n => n.classList.toggle("is-scrolled", on));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function wireFadeUp() {
    const els = document.querySelectorAll(".fade-up");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
  }

  function wireTabs(tabSelector, sectionIds) {
    const tabs = Array.from(document.querySelectorAll(tabSelector));
    if (!tabs.length) return;
    const ids = sectionIds && sectionIds.length ? sectionIds : tabs.map(t => t.dataset.target);

    function setActive(id, scroll) {
      tabs.forEach(tab => tab.setAttribute("aria-current", tab.dataset.target === id ? "true" : "false"));
      if (scroll) {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (history.replaceState) history.replaceState(null, "", "#" + id);
      }
    }

    tabs.forEach(tab => {
      tab.addEventListener("click", () => setActive(tab.dataset.target, true));
      tab.addEventListener("keydown", e => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const i = tabs.indexOf(tab);
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const rtlFlip = document.documentElement.dir === "rtl" ? -1 : 1;
        const next = (i + dir * rtlFlip + tabs.length) % tabs.length;
        tabs[next].focus();
        setActive(tabs[next].dataset.target, true);
      });
    });

    const initialHash = (location.hash || "").replace("#", "");
    if (ids.includes(initialHash)) {
      setActive(initialHash, false);
      requestAnimationFrame(() => {
        const el = document.getElementById(initialHash);
        if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
      });
    }

    // Sync active tab with scroll position
    if ("IntersectionObserver" in window) {
      const sectionEls = ids.map(id => document.getElementById(id)).filter(Boolean);
      const obs = new IntersectionObserver(entries => {
        let top = null;
        entries.forEach(e => {
          if (e.isIntersecting && (!top || e.boundingClientRect.top < top.boundingClientRect.top)) top = e;
        });
        if (top && top.target.id) {
          tabs.forEach(tab => tab.setAttribute("aria-current", tab.dataset.target === top.target.id ? "true" : "false"));
        }
      }, { rootMargin: "-132px 0px -60% 0px", threshold: 0 });
      sectionEls.forEach(el => obs.observe(el));
    }
  }

  const Cleanly = {
    init(config) {
      const dict = (config && config.dict) || { en: {} };
      const onChange = config && config.onLocaleChange;

      wireLanguageToggle(dict, onChange);
      wireNavScroll();
      wireFadeUp();

      if (config && config.tabSelector) {
        wireTabs(config.tabSelector, config.sectionIds);
      }

      applyLocale(resolveInitialLocale(), dict, onChange);
    },
    applyLocale: function (locale, dict) { applyLocale(locale, dict); }
  };

  window.Cleanly = Cleanly;
})();
