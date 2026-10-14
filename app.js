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

  var lastTotal = null;
  var busy = false;

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

  /* ---------------- paparan jumlah ---------------- */
  function render(d) {
    var total = Number(d.total) || 0;
    var reached = total >= TARGET;
    var p = pct(total);

    setText('#total', money(total));
    setText('#mobile-total', money(total));
    setText('#foot-progress', money(total) + ' daripada ' + money(TARGET));
    setText('#remaining', reached ? 'Sasaran dicapai' : 'Baki ' + money(Math.max(0, TARGET - total)));
    setText('#percent', p.toFixed(1) + '% tercapai');

    var bar = $('#bar');   if (bar)  bar.style.width = p + '%';
    var rail = $('#rail'); if (rail) rail.style.width = p + '%';

    if (d.updatedAt) {
      var dt = new Date(d.updatedAt);
      if (!isNaN(dt)) {
        setText('#updated', 'Terakhir disahkan: ' + new Intl.DateTimeFormat('ms-MY', {
          dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur'
        }).format(dt));
      }
    }

    var pay = $('#pay-block');
    var goal = $('#goal-message');
    if (pay)  pay.classList.toggle('hidden', reached);
    if (goal) goal.classList.toggle('hidden', !reached);

    $$('.donate-action').forEach(function (a) {
      a.textContent = reached ? 'Kutipan selesai' : (a.classList.contains('btn-small') ? 'Berinfaq ↗' : 'Saya nak berinfaq ↗');
    });

    if (lastTotal !== null && total !== lastTotal) {
      setText('#update-announcement', 'Jumlah terkini ' + money(total));
    }
    lastTotal = total;
  }

  function refresh() {
    if (busy) return;
    busy = true;
    var btn = $('#refresh');
    if (btn) btn.disabled = true;

    fetch('data/progress.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        render(d);
        setText('#connection', 'Kemas kini berkala · sekitar setiap 6 jam');
      })
      .catch(function () {
        setText('#connection', 'Sambungan terganggu · jumlah terakhir dipaparkan');
      })
      .then(function () {
        busy = false;
        if (btn) btn.disabled = false;
      });
  }

  /* ---------------- tab pembayaran ---------------- */
  function initTabs() {
    var tabs = $$('.tab');
    if (!tabs.length) return;

    function select(tab) {
      tabs.forEach(function (t) {
        var on = (t === tab);
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.classList.toggle('hidden', !on);
      });
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        if (k === 'ArrowLeft'  || k === 'ArrowUp')   n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (k === 'Home') n = tabs[0];
        if (k === 'End')  n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); n.focus(); select(n); }
      });
    });
  }

  /* ---------------- salin ---------------- */
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
      + 'Dana diuruskan oleh Dr Suhail. Rujukan pindahan: Infaq Toilet.\n\n' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
  }

  /* ---------------- mula ---------------- */
  function init() {
    var rb = $('#refresh');
    if (rb) rb.addEventListener('click', refresh);

    var ca = $('#copy-account');
    if (ca) ca.addEventListener('click', function () {
      copy('9988618348808', 'Nombor akaun disalin.', 'Nombor akaun: 9988 61834 8808');
    });

    var cr = $('#copy-ref');
    if (cr) cr.addEventListener('click', function () {
      copy('Infaq Toilet', 'Rujukan “Infaq Toilet” disalin.', 'Rujukan pindahan: Infaq Toilet');
    });

    var cl = $('#copy-link');
    if (cl) cl.addEventListener('click', function () {
      var url = location.protocol.indexOf('http') === 0 ? location.href.split('#')[0] : DEFAULT_URL;
      copy(url, 'Pautan disalin.', url);
    });

    $$('.share').forEach(function (b) { b.addEventListener('click', shareWhatsApp); });

    initTabs();
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
