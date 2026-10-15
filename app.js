/* ============================================================
   Infaq Dar Al-Najah — logik laman
   Jumlah kutipan dibaca dari data/progress.json
   ============================================================ */

(function () {
  'use strict';

  var $  = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var TARGET = 3000;
  var REFRESH_MS = 15000;
  var DEFAULT_URL = 'https://infaq.drsuhailsatri.com/';
  var DUR_FIRST = 1700;    // ms — kiraan pertama, dari kosong
  var DUR_NEXT  = 900;     // ms — bila jumlah berubah kemudian
  var REVEAL_FALLBACK = 8000;  // ms — jaring keselamatan kalau tak pernah kelihatan

  var prefersReduced = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var lastTotal = null;
  var pendingTotal = null;     // jumlah yang menunggu seksyen kelihatan
  var revealed = false;
  var revealTimer = null;
  var busy = false;
  var rafId = null;
  var settleId = null;

  /* ----------------------------------------------------------------
     JARING KESELAMATAN DATA
     Kalau data/progress.json gagal dibaca — JSON rosak akibat edit
     tersilap, atau GitHub Pages sedang membina semula — jangan sekali
     papar RM0. Laman akan guna nilai sah terakhir yang diketahui.
     Nilai di bawah dikemas kini setiap kali jumlah berubah.
     ---------------------------------------------------------------- */
  var FALLBACK = {
    total: 860,
    target: 3000,
    donors: 11,
    updatedAt: '2026-10-15T05:50:00+08:00',
    history: [
      { at: '2026-10-14T13:09:00+08:00', total: 230 },
      { at: '2026-10-14T14:28:46+08:00', total: 330 },
      { at: '2026-10-14T16:15:51+08:00', total: 630 },
      { at: '2026-10-14T16:37:02+08:00', total: 680 },
      { at: '2026-10-14T17:30:31+08:00', total: 700 },
      { at: '2026-10-14T17:50:00+08:00', total: 750 },
      { at: '2026-10-14T18:37:00+08:00', total: 760 },
      { at: '2026-10-15T05:50:00+08:00', total: 860 }
    ]
  };
  var lastGood = null;

  function money(v) {
    return 'RM' + Number(v).toLocaleString('en-MY', { maximumFractionDigits: 2 });
  }
  function pct(v) { return Math.min(100, (Number(v) / TARGET) * 100); }
  function setText(sel, txt) { var el = $(sel); if (el) el.textContent = txt; }

  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.add('hidden'); }, 3400);
  }

  /* ---------- lukis SEMUA angka dari satu nilai ---------- */
  function paint(v) {
    var reached = v >= TARGET;
    setText('#total', money(v));
    setText('#mobile-total', money(v));
    setText('#foot-progress', money(v) + ' daripada ' + money(TARGET));
    setText('#remaining', reached ? 'Sasaran dicapai'
      : 'Baki ' + money(Math.max(0, TARGET - v)));
    setText('#percent', pct(v).toFixed(1) + '% tercapai');

    var w = pct(v) + '%';
    var bar = $('#bar');   if (bar)  bar.style.width = w;
    var rail = $('#rail'); if (rail) rail.style.width = w;
  }

  function bars() { return $$('.bar > span, .progress-rail span'); }

  /* ---------- rekod semakan ---------- */
  function renderLog(history) {
    var el = $('#log'), sec = $('#rekod');
    if (!el || !sec) return;
    if (!Array.isArray(history) || !history.length) { sec.classList.add('hidden'); return; }

    var fmt = new Intl.DateTimeFormat('ms-MY', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur'
    });
    var items = history.slice().sort(function (a, b) {
      return new Date(b.at) - new Date(a.at);
    });

    el.innerHTML = '';
    items.forEach(function (h, i) {
      var li = document.createElement('li');

      var t = document.createElement('time');
      var dt = new Date(h.at);
      t.textContent = isNaN(dt) ? h.at : fmt.format(dt);
      t.setAttribute('datetime', h.at);

      var b = document.createElement('b');
      b.textContent = money(h.total);

      var s = document.createElement('small');
      if (i === items.length - 1) {
        s.textContent = 'Semakan pertama';
      } else if (i === 0) {
        s.textContent = 'Naik ' + money(h.total - items[1].total) + ' · terakhir disahkan';
      } else {
        s.textContent = 'Naik ' + money(h.total - items[i + 1].total);
      }

      li.appendChild(t); li.appendChild(b); li.appendChild(s);
      el.appendChild(li);
    });
    sec.classList.remove('hidden');
  }

  /* ---------- kiraan naik ---------- */
  function countTo(from, to, duration) {
    if (rafId)    { cancelAnimationFrame(rafId); rafId = null; }
    if (settleId) { clearTimeout(settleId); settleId = null; }

    var done = function () {
      bars().forEach(function (b) { b.classList.remove('instant'); });
      paint(to);
    };

    if (prefersReduced || duration <= 0 || from === to) { done(); return; }

    bars().forEach(function (b) { b.classList.add('instant'); });

    var t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / duration);
      var eased = 1 - Math.pow(1 - p, 3);       // laju dahulu, perlahan di hujung
      paint(from + (to - from) * eased);
      if (p < 1) { rafId = requestAnimationFrame(frame); }
      else { rafId = null; done(); }
    }
    rafId = requestAnimationFrame(frame);

    // jaring keselamatan: kalau rAF tersekat (tab latar), angka tetap mendarat
    settleId = setTimeout(function () {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      done();
    }, duration + 700);
  }

  /* ---------- bila kiraan bermula ---------- */
  function sectionVisible() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    function rect(el) {
      if (!el) return null;
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;   // display:none
      return r;
    }
    // desktop: nombor besar dalam seksyen jumlah, kena berada dalam 90% atas skrin
    var big = rect($('#total'));
    if (big && big.top < vh * 0.9 && big.bottom > 0) return true;
    // telefon: bar bawah melekat di pinggir skrin — cukup kalau ia dirender
    var bar = rect($('#mobile-total'));
    if (bar && bar.bottom > 0 && bar.top < vh) return true;
    return false;
  }

  function tryReveal() {
    if (revealed || pendingTotal === null) return;
    if (!sectionVisible()) return;
    revealed = true;
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
    countTo(0, pendingTotal, DUR_FIRST);
  }

  function armReveal() {
    // pemicu: IntersectionObserver + mana-mana interaksi/scrol (jaring luas)
    if ('IntersectionObserver' in window) {
      var host = $('#total');
      if (host) {
        try {
          var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) tryReveal(); });
          }, { threshold: 0.2 });
          io.observe(host.closest('section') || host);
        } catch (e) { /* abaikan */ }
      }
    }
    ['scroll', 'resize', 'click', 'touchstart', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, tryReveal, { passive: true });
    });
    // kalau seksyen langsung tak pernah kelihatan, papar nilai betul juga
    revealTimer = setTimeout(function () {
      if (revealed || pendingTotal === null) return;
      revealed = true;
      paint(pendingTotal);
    }, REVEAL_FALLBACK);
  }

  /* ---------- paparan ---------- */
  function render(d, animate) {
    var total = Number(d.total) || 0;

    if (d.updatedAt) {
      var dt = new Date(d.updatedAt);
      if (!isNaN(dt)) {
        setText('#updated', 'Terakhir disahkan: ' + new Intl.DateTimeFormat('ms-MY', {
          dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur'
        }).format(dt));
      }
    }

    var reached = total >= TARGET;
    var pay = $('#pay-block');
    var goal = $('#goal-message');
    if (pay)  pay.classList.toggle('hidden', reached);
    if (goal) goal.classList.toggle('hidden', !reached);

    if (typeof d.donors === 'number' && d.donors > 0) {
      setText('#donors-line', d.donors === 1
        ? '1 penderma setakat ini'
        : d.donors + ' penderma setakat ini');
    } else {
      setText('#donors-line', '');
    }
    renderLog(d.history);

    $$('.donate-action').forEach(function (a) {
      a.textContent = reached ? 'Kutipan selesai'
        : (a.classList.contains('btn-small') ? 'Berinfaq ↗' : 'Saya nak berinfaq ↗');
    });

    if (lastTotal !== null && total !== lastTotal) {
      setText('#update-announcement', 'Jumlah terkini ' + money(total));
    }

    if (lastTotal === null) {
      // muatan pertama — kira naik dari kosong, hanya apabila kelihatan
      pendingTotal = total;
      revealed = false;
      lastTotal = total;
      tryReveal();
    } else if (animate && total !== lastTotal) {
      countTo(lastTotal, total, DUR_NEXT);
      lastTotal = total;
    } else {
      paint(total);
      lastTotal = total;
    }
  }

  /* ---------- ambil data ---------- */
  function refresh() {
    if (busy) return;
    busy = true;
    var btn = $('#refresh');
    if (btn) btn.disabled = true;

    fetch('data/progress.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (d === null || typeof d !== 'object' || isNaN(Number(d.total))) {
          throw new Error('data tidak sah');
        }
        lastGood = d;
        setText('#connection', 'Kemas kini berkala · sekitar setiap 6 jam');
        render(d, true);
      })
      .catch(function () {
        /* JSON rosak (edit tersilap dari telefon) atau laman sedang dibina.
           Jangan papar RM0 — papar nilai sah terakhir. */
        setText('#connection', 'Jumlah terakhir disahkan · laman sedang menyemak semula');
        render(lastGood || FALLBACK, false);
      })
      .then(function () {
        busy = false;
        if (btn) btn.disabled = false;
      });
  }

  /* ---------- tab pembayaran ---------- */
  function initTabs() {
    var t = $$('.tab');
    if (!t.length) return;

    function select(tab) {
      t.forEach(function (x) {
        var on = (x === tab);
        x.classList.toggle('is-active', on);
        x.setAttribute('aria-selected', String(on));
        var panel = document.getElementById(x.getAttribute('aria-controls'));
        if (panel) panel.classList.toggle('hidden', !on);
      });
    }

    t.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = t[(i + 1) % t.length];
        if (k === 'ArrowLeft'  || k === 'ArrowUp')   n = t[(i - 1 + t.length) % t.length];
        if (k === 'Home') n = t[0];
        if (k === 'End')  n = t[t.length - 1];
        if (n) { e.preventDefault(); n.focus(); select(n); }
      });
    });
  }

  /* ---------- salin ---------- */
  function copy(text, okMsg, failMsg) {
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast(okMsg);
      } catch (e) { toast(failMsg); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else { fallback(); }
  }

  function shareWhatsApp() {
    var url = location.protocol.indexOf('http') === 0 ? location.href.split('#')[0] : DEFAULT_URL;
    var msg = 'Jom sama-sama bantu kutipan RM3,000 untuk naik taraf dua tandas duduk '
      + 'di Maahad Tahfiz Dar Al-Najah, bagi keselesaan pelajar yang cedera dan pelawat yang uzur. '
      + 'Dana diuruskan oleh Dr Suhail. Rujukan pindahan: Infaq Tandas.\n\n' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
  }

  /* ---------- mula ---------- */
  function init() {
    var rb = $('#refresh');
    if (rb) rb.addEventListener('click', refresh);

    var ca = $('#copy-account');
    if (ca) ca.addEventListener('click', function () {
      copy('9988618348808', 'Nombor akaun disalin.', 'Nombor akaun: 9988 61834 8808');
    });

    var cr = $('#copy-ref');
    if (cr) cr.addEventListener('click', function () {
      copy('Infaq Tandas', 'Rujukan “Infaq Tandas” disalin.', 'Rujukan pindahan: Infaq Tandas');
    });

    var cl = $('#copy-link');
    if (cl) cl.addEventListener('click', function () {
      var url = location.protocol.indexOf('http') === 0 ? location.href.split('#')[0] : DEFAULT_URL;
      copy(url, 'Pautan disalin.', url);
    });

    $$('.share').forEach(function (b) { b.addEventListener('click', shareWhatsApp); });

    initTabs();
    armReveal();
    refresh();
    setInterval(function () { if (!document.hidden) refresh(); }, REFRESH_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
