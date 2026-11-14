/* Lumi Keys site: a real-time 3D keyboard driven by scroll, plus the small motion pieces in each section. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- scroll progress ---------- */
  var progress = 0;          // 0..1 over the whole page
  var stageF = 0;            // 0..6, which section is centred (fractional)
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var bar = document.getElementById("progress");
  function readScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    progress = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    bar.style.transform = "scaleX(" + progress + ")";
    // Fractional stage from the panels' real positions, so sections of any height line up with the 3D keyframes.
    var mid = scrollY + innerHeight / 2, f = 0;
    for (var i = 0; i < panels.length; i++) {
      var top = panels[i].offsetTop, c = top + panels[i].offsetHeight / 2;
      var next = panels[i + 1];
      if (!next) { f = i; break; }
      var nc = next.offsetTop + next.offsetHeight / 2;
      if (mid <= c) { f = i; break; }
      if (mid < nc) { f = i + (mid - c) / (nc - c); break; }
      f = i + 1;
    }
    stageF = f;
  }
  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", readScroll);
  readScroll();

  /* ---------- reveal on scroll, counters ---------- */
  function countUp(el) {
    var to = +el.dataset.count, t0 = performance.now(), dur = 1400;
    function tick(now) {
      var k = smooth((now - t0) / dur);
      el.textContent = Math.round(to * k).toLocaleString("en-US");
      if (k < 1) requestAnimationFrame(tick);
    }
    if (reduce) el.textContent = to.toLocaleString("en-US"); else requestAnimationFrame(tick);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.querySelectorAll("[data-count]").forEach(countUp);
      if (e.target.matches("[data-count]")) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  /* ---------- Singlish typewriter ---------- */
  var pairs = [
    ["kohomadha", ["කො", "හො", "ම", "ද"]],
    ["mama gedhara", ["ම", "ම", " ", "ගෙ", "ද", "ර"]],
    ["sthuthiyi", ["ස්", "තු", "ති", "යි"]],
    ["oyaata", ["ඔ", "යා", "ට"]],
    ["paasala", ["පා", "ස", "ල"]]
  ];
  var latinEl = document.getElementById("latin"), siEl = document.getElementById("sinhalaOut");
  function typeLoop(n) {
    var p = pairs[n % pairs.length], word = p[0], out = p[1], i = 0;
    latinEl.textContent = ""; siEl.innerHTML = "";
    function step() {
      if (i < word.length) {
        latinEl.textContent = word.slice(0, ++i);
        // Sinhala syllables appear as their sounds are finished.
        var want = Math.round(out.length * i / word.length);
        while (siEl.children.length < want) {
          var s = document.createElement("span"); s.textContent = out[siEl.children.length] === " " ? " " : out[siEl.children.length];
          siEl.appendChild(s);
        }
        setTimeout(step, 120 + Math.random() * 90);
      } else setTimeout(function () { typeLoop(n + 1); }, 1900);
    }
    step();
  }
  if (reduce) { latinEl.textContent = "kohomadha"; siEl.textContent = "කොහොමද"; } else typeLoop(0);

  /* ---------- AI before / after ---------- */
  var demos = [
    ["i didnt knew she comming tomorow", "I didn't know she was coming tomorrow."],
    ["send me the file now", "Could you please send me the file when you get a moment?"],
    ["කොහොමද? හෙට එනවද?", "How are you? Are you coming tomorrow?"],
    ["Are you free this weekend?", "I am! Saturday afternoon works best for me. What did you have in mind?"]
  ];
  var tabs = Array.prototype.slice.call(document.querySelectorAll("#aiTabs button"));
  var beforeEl = document.getElementById("aiBefore"), afterEl = document.getElementById("aiAfter"), aiTimer = 0, aiIdx = 0;
  function showDemo(i) {
    aiIdx = i;
    tabs.forEach(function (b, k) { b.classList.toggle("on", k === i); });
    beforeEl.classList.remove("done"); beforeEl.textContent = demos[i][0]; afterEl.innerHTML = "";
    clearTimeout(aiTimer);
    aiTimer = setTimeout(function () {
      beforeEl.classList.add("done");
      demos[i][1].split(" ").forEach(function (w, k) {
        var s = document.createElement("span"); s.className = "w"; s.textContent = w + " ";
        s.style.animationDelay = (reduce ? 0 : k * 70) + "ms"; afterEl.appendChild(s);
      });
      aiTimer = setTimeout(function () { showDemo((aiIdx + 1) % demos.length); }, 4600);
    }, reduce ? 0 : 1100);
  }
  tabs.forEach(function (b) { b.addEventListener("click", function () { showDemo(+b.dataset.i); }); });
  showDemo(0);


  /* ---------- scroll-driven motion (follows the scrollbar both ways) ---------- */
  // Headline words are wrapped so each can rise out of its own mask.
  document.querySelectorAll("main h1, main h2").forEach(function (h) {
    (function split(node, grad) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var wrap = document.createElement("span"); wrap.className = "wd-wrap";
            var w = document.createElement("span"); w.className = "wd" + (grad ? " grad" : ""); w.textContent = part;
            wrap.appendChild(w); frag.appendChild(wrap);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          var g = grad || n.classList.contains("grad");
          if (n.classList.contains("grad")) n.classList.remove("grad");   // the shimmer moves onto each word
          split(n, g);
        }
      });
    })(h, false);
  });

  var dotsNav = document.getElementById("dots");
  var dots = panels.map(function (p, i) {
    var b = document.createElement("button"); b.type = "button";
    b.setAttribute("aria-label", "Go to section " + (i + 1));
    b.addEventListener("click", function () { scrollTo({ top: p.offsetTop + (p.classList.contains("hscroll") ? innerHeight * 0.6 : 0), behavior: reduce ? "auto" : "smooth" }); });
    dotsNav.appendChild(b); return b;
  });

  var parts = panels.map(function (p) {
    return { p: p, copy: p.querySelector(".copy"), ghost: p.querySelector(".bignum"), h: p.classList.contains("hscroll"),
      words: Array.prototype.slice.call(p.querySelectorAll(".wd")) };
  });
  var htrack = document.getElementById("htrack"), hbar = document.getElementById("hbar");
  var hcards = Array.prototype.slice.call(document.querySelectorAll(".hcard"));
  var strip = document.querySelector(".track");
  var lastY = scrollY, vel = 0, stripX = 0, dirty = true, lastDot = -1;
  window.__scrollVel = 0;
  addEventListener("scroll", function () { dirty = true; }, { passive: true });
  addEventListener("resize", function () { dirty = true; });

  function scrub() {
    var vh = innerHeight, vw = innerWidth, desk = vw > 860;
    parts.forEach(function (c) {
      var rect = c.p.getBoundingClientRect();
      if (rect.bottom < -vh * 0.5 || rect.top > vh * 1.5) return;
      var r = (rect.top + rect.height / 2 - vh / 2) / vh;          // 0 when the section is centred
      // How far the section has come in: 0 as its top reaches 85% down the screen, 1 by 30%.
      var enter = clamp(1 - (rect.top - vh * 0.3) / (vh * 0.55), 0, 1);
      c.words.forEach(function (w, i) {
        var k = smooth(clamp(enter * (1 + c.words.length * 0.16) - i * 0.16, 0, 1));
        w.style.transform = "translate3d(0," + ((1 - k) * 105).toFixed(1) + "%,0) rotate(" + ((1 - k) * 5).toFixed(2) + "deg)";
      });
      if (c.h) {
        // Pinned gallery: vertical scroll becomes sideways travel.
        var span = rect.height - vh, p = span > 0 ? clamp(-rect.top / span, 0, 1) : 0;
        var travel = Math.max(0, htrack.scrollWidth - vw);
        htrack.style.transform = "translate3d(" + (-p * travel).toFixed(1) + "px,0,0)";
        hbar.style.transform = "scaleX(" + p.toFixed(4) + ")";
        hcards.forEach(function (card) {
          var b = card.getBoundingClientRect(), off = (b.left + b.width / 2 - vw / 2) / vw;   // 0 at screen centre
          card.classList.toggle("hot", Math.abs(off) < 0.2);
          card.style.transform = "translate3d(0," + (Math.abs(off) * 46).toFixed(1) + "px,0) rotate(" + (off * 5).toFixed(2) + "deg) scale(" + (1 - Math.min(Math.abs(off), 1) * 0.08).toFixed(3) + ")";
        });
        return;
      }
      if (c.ghost) c.ghost.style.transform = "translate3d(0," + (r * -260).toFixed(1) + "px,0)";
      // Copy drifts and fades as it passes the middle. On phones sections are taller than the screen, so it only drifts.
      if (c.copy && desk) {
        c.copy.style.opacity = clamp(1.35 - Math.abs(r) * 1.7, 0, 1).toFixed(3);
        c.copy.style.transform = "translate3d(0," + (r * 90).toFixed(1) + "px,0) scale(" + (1 - Math.min(Math.abs(r), 1) * 0.05).toFixed(3) + ")";
      } else if (c.copy) { c.copy.style.opacity = ""; c.copy.style.transform = ""; }
    });
    var now = Math.round(stageF);
    if (now !== lastDot) { dots.forEach(function (d, i) { d.classList.toggle("on", i === now); }); lastDot = now; }
  }

  function domLoop() {
    var y = scrollY, d = y - lastY; lastY = y;
    vel = lerp(vel, d, 0.2); window.__scrollVel = vel;
    // The feature strip drifts slowly and is pushed along by scrolling, leaning with the speed.
    if (strip && !reduce) {
      stripX -= 0.6 + d * 0.9;
      var half = strip.scrollWidth / 2;
      if (half > 0) { stripX = ((stripX % half) - half) % half; }
      strip.style.transform = "translate3d(" + stripX.toFixed(1) + "px,0,0) skewX(" + clamp(-vel * 0.5, -14, 14).toFixed(2) + "deg)";
    }
    if (dirty && !reduce) { dirty = false; scrub(); }
    else if (dirty) { dirty = false; var n = Math.round(stageF); dots.forEach(function (dd, i) { dd.classList.toggle("on", i === n); }); }
    requestAnimationFrame(domLoop);
  }
  requestAnimationFrame(domLoop);

  /* ---------- 3D keyboard ---------- */
  var canvas = document.getElementById("stage");
  if (!window.THREE) return;
  var T = THREE, renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { canvas.style.display = "none"; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  scene.add(new T.AmbientLight(0xffffff, 0.16));
  var keyLight = new T.DirectionalLight(0xffffff, 0.34); keyLight.position.set(-4, 8, 9); scene.add(keyLight);
  var tealLight = new T.PointLight(0x91c9c4, 0.55, 30); tealLight.position.set(6, 3, 6); scene.add(tealLight);
  var purpleLight = new T.PointLight(0x8b7ff0, 0.6, 30); purpleLight.position.set(-7, -2, 5); scene.add(purpleLight);

  /* A keycap: rounded rectangle extruded upward with a soft bevel. */
  function capGeometry(w, d, h) {
    var r = 0.16, x = -w / 2, y = -d / 2, s = new T.Shape();
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    var g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 3, curveSegments: 6 });
    g.rotateX(-Math.PI / 2); g.center();
    return g;
  }
  function labelTexture(text, color, sinhala) {
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var x = c.getContext("2d");
    x.fillStyle = color; x.strokeStyle = color; x.lineWidth = 8; x.lineJoin = "round"; x.lineCap = "round";
    x.textAlign = "center"; x.textBaseline = "middle";
    if (text === "\u21e7") {                       // Shift: an upward arrow
      x.beginPath(); x.moveTo(64, 26); x.lineTo(100, 66); x.lineTo(80, 66); x.lineTo(80, 100); x.lineTo(48, 100); x.lineTo(48, 66); x.lineTo(28, 66); x.closePath(); x.stroke();
    } else if (text === "\u232b") {                // Delete: a tag pointing left with a cross
      x.beginPath(); x.moveTo(20, 64); x.lineTo(46, 34); x.lineTo(108, 34); x.lineTo(108, 94); x.lineTo(46, 94); x.closePath(); x.stroke();
      x.lineWidth = 7; x.beginPath(); x.moveTo(62, 52); x.lineTo(88, 76); x.moveTo(88, 52); x.lineTo(62, 76); x.stroke();
    } else if (text === "\u21b5") {                // Enter: down then left
      x.beginPath(); x.moveTo(96, 36); x.lineTo(96, 70); x.lineTo(34, 70); x.stroke();
      x.beginPath(); x.moveTo(52, 50); x.lineTo(32, 70); x.lineTo(52, 90); x.stroke();
    } else if (text === "\u263a") {                // Emoji: a smiling face
      x.lineWidth = 7; x.beginPath(); x.arc(64, 64, 34, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.arc(64, 66, 18, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
      x.beginPath(); x.arc(52, 54, 4.5, 0, Math.PI * 2); x.arc(76, 54, 4.5, 0, Math.PI * 2); x.fill();
    } else {
      var size = text.length > 2 ? 34 : sinhala ? 62 : 70;
      x.font = (sinhala ? "600 " : "500 ") + size + 'px "' + (sinhala ? "Noto Sans Sinhala" : "Space Grotesk") + '", "Nirmala UI", "Iskoola Pota", sans-serif';
      x.fillText(text, 64, sinhala ? 62 : 68);
    }
    var t = new T.CanvasTexture(c); t.anisotropy = 4; t.encoding = T.sRGBEncoding;
    return t;
  }

  var SI = { q: "ද", w: "ව", e: "එ", r: "ර", t: "ට", y: "ය", u: "උ", i: "ඉ", o: "ඔ", p: "ප", a: "අ", s: "ස", d: "ඩ", f: "ෆ", g: "ග", h: "හ", j: "ජ", k: "ක", l: "ල", z: "ශ", x: "ං", c: "ච", v: "ව", b: "බ", n: "න", m: "ම" };
  var rows = [
    "qwertyuiop".split("").map(function (c) { return { c: c, w: 1 }; }),
    "asdfghjkl".split("").map(function (c) { return { c: c, w: 1 }; }),
    [{ c: "⇧", w: 1.5, fn: 1 }].concat("zxcvbnm".split("").map(function (c) { return { c: c, w: 1 }; }), [{ c: "⌫", w: 1.5, fn: 1 }]),
    [{ c: "?123", w: 1.5, fn: 1 }, { c: ",", w: 1, fn: 1 }, { c: "☺", w: 1, fn: 1 }, { c: "", w: 4.5, space: 1 }, { c: ".", w: 1, fn: 1 }, { c: "↵", w: 1.5, enter: 1 }]
  ];
  var GAP = 0.14, H = 0.42, PITCH = 1 + GAP;
  var board = new T.Group(); scene.add(board);
  var keys = [], byChar = {};
  var matKey = function (hex) { return new T.MeshStandardMaterial({ color: hex, roughness: 0.48, metalness: 0.12, emissive: 0x91c9c4, emissiveIntensity: 0 }); };

  function build() {
    rows.forEach(function (row, r) {
      var total = row.reduce(function (s, k) { return s + k.w * PITCH; }, 0) - GAP;
      var x = -total / 2;
      row.forEach(function (k) {
        var w = k.w * PITCH - GAP;
        var g = new T.Group();
        var mesh = new T.Mesh(capGeometry(w, 1, H), matKey(k.enter ? 0x91c9c4 : k.fn ? 0x161616 : 0x2e2e2e));
        g.add(mesh);
        var item = { g: g, mesh: mesh, char: k.c, press: 0, phase: Math.random() * 6.28,
          lift: 0.7 + Math.random() * 2.3,
          tilt: new T.Vector3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.7) };
        if (k.c) {
          var size = k.w > 1.2 ? 0.9 : 0.78;
          var plane = new T.PlaneGeometry(size, size); plane.rotateX(-Math.PI / 2);
          var lm = new T.MeshBasicMaterial({ map: labelTexture(k.c, k.enter ? "#0b1f1d" : "#ffffff", false), transparent: true, depthWrite: false });
          var label = new T.Mesh(plane, lm); label.position.y = H / 2 + 0.085; g.add(label); item.label = label;
          if (SI[k.c]) {
            var sm = new T.MeshBasicMaterial({ map: labelTexture(SI[k.c], "#91c9c4", true), transparent: true, opacity: 0, depthWrite: false });
            var sl = new T.Mesh(plane, sm); sl.position.y = H / 2 + 0.09; g.add(sl); item.si = sl;
          }
        }
        item.home = new T.Vector3(x + w / 2, 0, (r - 1.5) * PITCH);
        g.position.copy(item.home);
        board.add(g); keys.push(item); if (k.c) byChar[k.c] = item;
        x += k.w * PITCH;
      });
    });
    // The black body under the keys.
    var body = new T.Mesh(capGeometry(10 * PITCH + 0.5, 4 * PITCH + 0.5, 0.3), new T.MeshStandardMaterial({ color: 0x050505, roughness: 0.7, metalness: 0.2 }));
    body.position.y = -H / 2 - 0.22; board.add(body); board.userData.body = body;
  }

  /* Stars drifting behind the keyboard. */
  var stars = (function () {
    var n = 700, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    var a = new T.Color(0x91c9c4), b = new T.Color(0x8b7ff0), w = new T.Color(0xffffff), c = new T.Color();
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 46; pos[i * 3 + 1] = (Math.random() - 0.5) * 30; pos[i * 3 + 2] = -4 - Math.random() * 26;
      c.copy(Math.random() < 0.5 ? a : b).lerp(w, Math.random() * 0.7);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(col, 3));
    var p = new T.Points(g, new T.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
    scene.add(p); return p;
  })();

  /* Where the keyboard sits for each section: desktop puts it beside the copy, phones above it. */
  var wide = true;
  function frames() {
    return wide ? [
      { x: 4.3, y: -0.2, rx: 0.95, ry: -0.42, rz: 0.10, s: 0.62, wave: 0.10, type: 0, si: 0, ex: 0 },   // hero
      { x: -4.3, y: 0.0, rx: 1.12, ry: 0.46, rz: -0.08, s: 0.66, wave: 0.02, type: 1, si: 0, ex: 0 },   // feel
      { x: 4.2, y: 0.1, rx: 1.30, ry: -0.22, rz: 0.05, s: 0.68, wave: 0.03, type: 0.6, si: 1, ex: 0 },  // sinhala
      { x: -4.2, y: 0.3, rx: 0.80, ry: 0.62, rz: -0.14, s: 0.60, wave: 0.05, type: 0, si: 0, ex: 0.55 },// clipboard
      { x: 4.4, y: 0.0, rx: 0.62, ry: -0.85, rz: 0.18, s: 0.60, wave: 0.05, type: 0, si: 0, ex: 1 },    // ai
      { x: 0.0, y: 2.9, rx: 1.02, ry: 0.0, rz: 0.0, s: 0.36, wave: 0.10, type: 0.8, si: 0, ex: 0 },     // gallery
      { x: 0.0, y: 2.5, rx: 1.05, ry: 0.0, rz: 0.0, s: 0.46, wave: 0.14, type: 0, si: 0, ex: 0.18 },    // numbers
      { x: 0.0, y: 1.9, rx: 0.98, ry: 0.0, rz: 0.0, s: 0.78, wave: 0.16, type: 0, si: 0, ex: 0 }        // download
    ] : [
      { x: 0, y: 2.6, rx: 0.98, ry: -0.25, rz: 0.06, s: 0.36, wave: 0.10, type: 0, si: 0, ex: 0 },
      { x: 0, y: 2.7, rx: 1.12, ry: 0.28, rz: -0.05, s: 0.38, wave: 0.02, type: 1, si: 0, ex: 0 },
      { x: 0, y: 2.7, rx: 1.30, ry: -0.12, rz: 0.03, s: 0.39, wave: 0.03, type: 0.6, si: 1, ex: 0 },
      { x: 0, y: 2.45, rx: 0.85, ry: 0.40, rz: -0.10, s: 0.34, wave: 0.05, type: 0, si: 0, ex: 0.5 },
      { x: 0, y: 2.25, rx: 0.68, ry: -0.60, rz: 0.12, s: 0.33, wave: 0.05, type: 0, si: 0, ex: 0.9 },
      { x: 0, y: 3.2, rx: 1.02, ry: 0.0, rz: 0.0, s: 0.30, wave: 0.10, type: 0.8, si: 0, ex: 0 },
      { x: 0, y: 3.0, rx: 1.05, ry: 0.0, rz: 0.0, s: 0.34, wave: 0.14, type: 0, si: 0, ex: 0.15 },
      { x: 0, y: 2.6, rx: 0.98, ry: 0.0, rz: 0.0, s: 0.40, wave: 0.16, type: 0, si: 0, ex: 0 }
    ];
  }
  // Whole turns the keyboard has made by each section: it spins once on the way between some of them.
  var TURNS = [0, 1, 1, 2, 2, 3, 3, 4];
  function withTurns(list) { list.forEach(function (f, i) { f.turn = TURNS[i] || 0; }); return list; }
  var F = withTurns(frames());
  function sample(f) {
    var i = clamp(Math.floor(f), 0, F.length - 1), j = Math.min(i + 1, F.length - 1), t = smooth(f - i), o = {};
    for (var k in F[i]) o[k] = lerp(F[i][k], F[j][k], t);
    // Fit the window: beside the copy the keyboard takes the middle of its half; on phones, most of the width.
    var half = 16 * Math.tan(17.5 * Math.PI / 180) * camera.aspect;
    var span = 11.6 * (1 + o.ex * 0.32);
    if (wide) { o.x = o.x / 4.3 * half * (0.5 - o.ex * 0.05); o.s = Math.min(o.s, half * (0.9 - o.ex * 0.14) / span * (Math.abs(o.x) < 0.5 ? 1.5 : 1)); }
    else o.s = Math.min(o.s, half * 2 * 0.9 / span);
    return o;
  }

  function resize() {
    var w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    wide = w > 860; F = withTurns(frames());
  }
  addEventListener("resize", resize);

  var mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener("pointermove", function (e) { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  var WORD = "lumikeys", cur = null, clock = new T.Clock(), running = true;
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) { clock.getDelta(); requestAnimationFrame(frame); } });

  function frame() {
    if (!running) return;
    var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    var want = sample(stageF);
    if (!cur) { cur = want; if (!reduce) { cur.ex = 1.5; cur.s *= 0.7; cur.turn -= 0.35; } }
    // Ease toward the scroll position, so fast scrolling still glides.
    var ease = reduce ? 1 : 1 - Math.pow(0.0015, dt);
    for (var k in want) cur[k] = lerp(cur[k], want[k], ease);
    mouse.sx = lerp(mouse.sx, mouse.x, 0.06); mouse.sy = lerp(mouse.sy, mouse.y, 0.06);

    var bob = reduce ? 0 : Math.sin(t * 0.8) * 0.12;
    board.position.set(cur.x, cur.y + bob, 0);
    // A gentle sway that grows while the keys float; it eases back to zero as they land.
    var sway = reduce ? 0 : Math.sin(t * 0.4) * (0.05 + cur.ex * 0.22);
    // Scrolling fast leans the keyboard back or forward a little.
    var lean = reduce ? 0 : clamp((window.__scrollVel || 0) * 0.006, -0.3, 0.3);
    board.rotation.set(cur.rx + mouse.sy * 0.18 + lean, cur.ry + mouse.sx * 0.3 + sway + cur.turn * Math.PI * 2, cur.rz);
    board.scale.setScalar(cur.s);
    board.userData.body.visible = true;

    // Which letter of the word is being typed right now.
    var beat = t * 4.2, len = WORD.length + 3;
    for (var n = 0; n < keys.length; n++) {
      var key = keys[n], press = 0;
      if (cur.type > 0.02 && key.char && key.char.length === 1) {
        for (var w = 0; w < WORD.length; w++) {
          if (WORD[w] !== key.char) continue;
          var d = ((beat - w) % len + len) % len;          // time since this letter's turn
          if (d < 1) press = Math.max(press, Math.sin(d * Math.PI));
        }
        press *= cur.type;
      }
      key.press = lerp(key.press, press, 0.35);
      var wave = reduce ? 0 : Math.sin(t * 2 + key.home.x * 0.55 + key.home.z * 0.9 + key.phase * 0.15) * cur.wave;
      // The download section sends a bright ripple across the keys.
      var ripple = stageF > 6.4 && !reduce ? Math.max(0, Math.sin(t * 2.4 - key.home.x * 0.5 - key.home.z * 0.3)) : 0;
      var ex = cur.ex;
      var floaty = ex > 0.01 && !reduce ? Math.sin(t * 1.1 + key.phase) * 0.16 * ex : 0;
      key.g.position.set(
        key.home.x * (1 + ex * 0.32),
        key.home.y + wave - key.press * 0.2 + key.lift * ex + floaty,
        key.home.z * (1 + ex * 0.55));
      key.g.rotation.set(key.tilt.x * ex + floaty * 0.5, key.tilt.y * ex, key.tilt.z * ex);
      var s = 1 - key.press * 0.07; key.g.scale.set(s, 1, s);
      key.mesh.material.emissiveIntensity = key.press * 0.9 + ripple * 0.35 * smooth(stageF - 6.4);
      if (key.si) { key.si.material.opacity = cur.si; key.label.material.opacity = 1 - cur.si; }
    }
    tealLight.intensity = 0.55 + Math.sin(t * 1.1) * 0.12; purpleLight.intensity = 0.6 + Math.cos(t * 0.9) * 0.12;
    stars.rotation.y = t * 0.012 + progress * 1.4; stars.rotation.x = progress * 0.5; stars.position.y = progress * 9;
    stars.scale.y = 1 + Math.min(Math.abs(window.__scrollVel || 0) * 0.02, 1.2);   // stars stretch with scroll speed
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  var started = false;
  function start() { if (started) return; started = true; build(); resize(); readScroll(); requestAnimationFrame(frame); }
  // Draw the key labels once the fonts are in, so the Sinhala letters use the right typeface.
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('500 70px "Space Grotesk"'), document.fonts.load('600 62px "Noto Sans Sinhala"', "ද")])
      .then(start, start);
    setTimeout(function () { if (!keys.length) start(); }, 2500);
  } else start();
})();
