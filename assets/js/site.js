(function () {
  "use strict";
  var body = document.body;

  /* ---------- safe storage (per-browser conveniences only) ---------- */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = document.getElementById("menu-btn");
  var scrim = document.getElementById("scrim");
  function setNav(open) {
    body.classList.toggle("nav-open", open);
    if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { setNav(!body.classList.contains("nav-open")); });
  if (scrim) scrim.addEventListener("click", function () { setNav(false); });
  document.querySelectorAll(".sidebar a").forEach(function (a) {
    a.addEventListener("click", function () { setNav(false); });
  });

  /* ---------- studied marks ---------- */
  var done = load("qt-done", {});
  function paintDone() {
    document.querySelectorAll("[data-done]").forEach(function (el) {
      el.classList.toggle("on", !!done[el.getAttribute("data-done")]);
    });
    document.querySelectorAll(".toggle-done").forEach(function (b) {
      var on = !!done[b.getAttribute("data-section")];
      b.classList.toggle("on", on);
      b.textContent = on ? "✓ Studied" : "Mark as studied";
    });
  }
  document.querySelectorAll(".toggle-done").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-section");
      done[k] = !done[k];
      save("qt-done", done);
      paintDone();
    });
  });
  paintDone();

  /* ---------- seasons: open / close, studied counts ---------- */
  var openSeasons = load("qt-season", {});
  var seasonItems = Array.prototype.slice.call(document.querySelectorAll(".seasons > li.season"));
  function setSeason(li, on, remember) {
    li.classList.toggle("open", on);
    var h = li.querySelector(".season-head");
    if (h) h.setAttribute("aria-expanded", on ? "true" : "false");
    if (remember) { openSeasons[li.getAttribute("data-season")] = on; save("qt-season", openSeasons); }
  }
  seasonItems.forEach(function (li) {
    var k = li.getAttribute("data-season");
    var hasActive = !!li.querySelector("li.active");
    if (!hasActive && k in openSeasons) setSeason(li, !!openSeasons[k], false);
    var h = li.querySelector(".season-head");
    if (h) h.addEventListener("click", function () { setSeason(li, !li.classList.contains("open"), true); });
  });
  function paintSeasonCounts() {
    document.querySelectorAll("[data-season-keys]").forEach(function (el) {
      var keys = el.getAttribute("data-season-keys").split(" ");
      el.textContent = keys.filter(function (k) { return !!done[k]; }).length;
    });
  }
  paintSeasonCounts();
  document.querySelectorAll(".toggle-done").forEach(function (b) { b.addEventListener("click", paintSeasonCounts); });

  /* ---------- expand / collapse sections in the sidebar ---------- */
  var openSecs = load("qt-open", {});
  function setOpen(li, on, remember) {
    li.classList.toggle("open", on);
    var b = li.querySelector(".sec-toggle");
    if (b) b.setAttribute("aria-expanded", on ? "true" : "false");
    if (remember) { openSecs[li.getAttribute("data-sec")] = on; save("qt-open", openSecs); }
  }
  var secItems = Array.prototype.slice.call(document.querySelectorAll(".secnav > li[data-sec]"));
  secItems.forEach(function (li) {
    var k = li.getAttribute("data-sec");
    if (!li.classList.contains("active") && openSecs[k]) setOpen(li, true, false);
    var b = li.querySelector(".sec-toggle");
    if (b) b.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      setOpen(li, !li.classList.contains("open"), true);
    });
  });
  var ea = document.getElementById("expand-all"), ca = document.getElementById("collapse-all");
  if (ea) ea.addEventListener("click", function () {
    seasonItems.forEach(function (li) { if (li.querySelector(".secnav")) setSeason(li, true, true); });
    secItems.forEach(function (li) { setOpen(li, true, true); });
  });
  if (ca) ca.addEventListener("click", function () { secItems.forEach(function (li) { setOpen(li, false, true); }); });

  /* ---------- highlight current part in the sidebar ---------- */
  var subLinks = Array.prototype.slice.call(document.querySelectorAll('.subnav a[href^="#"]'));
  if (subLinks.length && "IntersectionObserver" in window) {
    var map = {};
    subLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var targets = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          subLinks.forEach(function (a) { a.classList.remove("current"); });
          map[e.target.id].classList.add("current");
        }
      });
    }, { rootMargin: "0px 0px -70% 0px" });
    targets.forEach(function (t) { obs.observe(t); });
  }

  /* ---------- open a question if linked directly ---------- */
  function openFromHash() {
    var el = location.hash && document.getElementById(location.hash.slice(1));
    if (el && el.tagName === "DETAILS") el.open = true;
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();

  /* ---------- glossary filter ---------- */
  var gf = document.getElementById("glossary-filter");
  if (gf) {
    gf.addEventListener("input", function () {
      var q = gf.value.trim().toLowerCase();
      document.querySelectorAll("#glossary tbody tr").forEach(function (tr) {
        tr.classList.toggle("hide", q && tr.textContent.toLowerCase().indexOf(q) === -1);
      });
    });
  }

  /* ---------- printing ---------- */
  window.addEventListener("beforeprint", function () {
    document.querySelectorAll("details").forEach(function (d) { d.dataset.wasOpen = d.open ? "1" : ""; d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    document.querySelectorAll("details").forEach(function (d) { d.open = d.dataset.wasOpen === "1"; });
    body.classList.remove("print-one");
    document.querySelectorAll(".print-target").forEach(function (c) { c.classList.remove("print-target"); });
  });
  document.querySelectorAll(".print-one").forEach(function (b) {
    b.addEventListener("click", function () {
      var card = document.getElementById(b.getAttribute("data-card"));
      if (!card) return;
      card.classList.add("print-target");
      body.classList.add("print-one");
      window.print();
    });
  });
  var pa = document.getElementById("print-all");
  if (pa) pa.addEventListener("click", function () { window.print(); });

  /* ---------- search ---------- */
  var input = document.getElementById("search");
  var box = document.getElementById("search-results");
  var content = document.getElementById("content");
  var index = window.SEARCH_INDEX || [];
  var sel = -1;

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function highlight(text, terms) {
    var out = esc(text);
    terms.forEach(function (t) {
      if (!t) return;
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
      out = out.replace(re, "<mark>$1</mark>");
    });
    return out;
  }
  function snippet(text, term) {
    var i = text.toLowerCase().indexOf(term);
    if (i < 0) return text.slice(0, 160) + (text.length > 160 ? "…" : "");
    var s = Math.max(0, i - 60);
    return (s > 0 ? "…" : "") + text.slice(s, s + 180) + (s + 180 < text.length ? "…" : "");
  }
  var kindLabel = { part: "Teaching", big: "Big idea", remember: "Remember", question: "Question",
                    word: "Key word", principle: "Principle", practice: "Daily practice" };

  function run(q) {
    q = q.trim().toLowerCase();
    if (!q) { box.hidden = true; if (content) content.hidden = false; return; }
    var terms = q.split(/\s+/).filter(Boolean);
    var res = [];
    index.forEach(function (e) {
      var t = e.title.toLowerCase(), x = e.text.toLowerCase();
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var inT = t.indexOf(terms[i]) !== -1, inX = x.indexOf(terms[i]) !== -1;
        if (!inT && !inX) return;
        score += (inT ? 5 : 0) + (inX ? 1 : 0);
      }
      if (e.kind === "word" && t === q) score += 20;
      res.push({ e: e, score: score });
    });
    res.sort(function (a, b) { return b.score - a.score; });
    res = res.slice(0, 40);
    var html = "<h4>" + res.length + (res.length === 40 ? "+" : "") + " result" + (res.length === 1 ? "" : "s") +
               " for “" + esc(q) + "” · press Esc to close</h4>";
    if (!res.length) html += '<p class="sr-snip">Nothing found. Try a single word, like <em>gratitude</em> or <em>zero point</em>.</p>';
    res.forEach(function (r, i) {
      var e = r.e;
      var where = e.s ? (e.sl || ("Section " + e.s)) + " · " : "Toolkit · ";
      html += '<a class="sr-item" data-i="' + i + '" href="' + e.url + '"><div class="sr-meta">' + where + (kindLabel[e.kind] || "") +
              '</div><div class="sr-title">' + highlight(e.title, terms) + '</div><div class="sr-snip">' +
              highlight(snippet(e.text, terms[0]), terms) + "</div></a>";
    });
    box.innerHTML = html;
    box.hidden = false;
    if (content) content.hidden = true;
    sel = -1;
    window.scrollTo(0, 0);
  }
  function go(href) {
    clearSearch();
    var parts = href.split("#");
    var here = location.pathname.split("/").pop() || "index.html";
    if (parts[0] === here && parts[1]) {
      var el = document.getElementById(parts[1]);
      try { history.pushState(null, "", "#" + parts[1]); } catch (e) { location.hash = parts[1]; }
      if (el) { el.scrollIntoView(); if (el.tagName === "DETAILS") el.open = true; }
    } else {
      location.href = href;
    }
  }
  function clearSearch() {
    if (!input) return;
    input.value = "";
    run("");
  }
  if (input && box) {
    var tmr;
    input.addEventListener("input", function () { clearTimeout(tmr); tmr = setTimeout(function () { run(input.value); }, 120); });
    input.addEventListener("keydown", function (ev) {
      var items = box.querySelectorAll(".sr-item");
      if (ev.key === "Escape") { clearSearch(); input.blur(); }
      else if (ev.key === "ArrowDown" && items.length) { ev.preventDefault(); sel = Math.min(sel + 1, items.length - 1); }
      else if (ev.key === "ArrowUp" && items.length) { ev.preventDefault(); sel = Math.max(sel - 1, 0); }
      else if (ev.key === "Enter" && items.length) { ev.preventDefault(); go(items[Math.max(sel, 0)].getAttribute("href")); return; }
      else return;
      items.forEach(function (it, i) { it.classList.toggle("sel", i === sel); });
      if (items[sel]) items[sel].scrollIntoView({ block: "nearest" });
    });
    box.addEventListener("click", function (ev) {
      var a = ev.target.closest(".sr-item");
      if (a) { ev.preventDefault(); go(a.getAttribute("href")); }
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "/" && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        ev.preventDefault(); input.focus();
      }
    });
  }
  var sb = document.getElementById("search-btn");
  if (sb && input) sb.addEventListener("click", function () { setNav(true); setTimeout(function () { input.focus(); }, 220); });
})();
