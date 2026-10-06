/**
 * Лоуполи-кит «Русской хтони» — движок (вынесен из index.html, версия live-артефакта).
 * Строит window.LPK: PAL, TEX, part()/facetGroup()/paintMaterial(), buildHuman/buildHut/
 * buildSpruce/buildLanternPost/buildWoodpile/buildTerrain и мелочь окружения (rock/tuft/fern/…).
 * Ничего не рендерит и не создаёт сцену/камеру — это чистая библиотека геометрии и материалов.
 * Требует: THREE (r128) уже загружен как глобальный THREE, до подключения этого файла.
 */
(() => {
  const T = THREE;
  const D2R = Math.PI / 180;

  // ---------- детерминированный шум ----------
  let seed = 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hash3 = (x, y, z) => {
    const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return h - Math.floor(h);
  };
  const lin = (hex) => new T.Color(hex).convertSRGBToLinear();

  // палитра базы знаний + производные тона
  // v4-флаги: новые текстуры, карты рельефа, ели из веток, фонарь v4, детальные валуны (можно отключать по одному)
  const FEAT = Object.assign({ tex2: 1, maps: 1, bump: 1, blades: 1, lantern: 1, rock1: 1 }, window.LPK_FEAT || {});
  const PAL = {
    wood: '#6e5139', woodDark: '#43321f', woodLight: '#8f6d4b', log: '#5a4330',
    roof: '#5a5541', moss: '#86893f', mossLight: '#a3a65a', stone: '#85857b', stoneDark: '#66675f',
    red: '#793838', iron: '#2d2c2a', needle: '#2e4a36', needleMid: '#3d5b3e', needleLight: '#62804c',
    bark: '#5e4230', grass: '#4e6934', grassLight: '#7a8e45', dirt: '#6a5439', soil: '#3a2f26',
    mud: '#433f39', cloth: '#5d6a5b', skin: '#b89a80', rock: '#77776d', bone: '#cdc3aa', fern: '#5b7a3a',
    // природные тона сверены с референсами «хвойная группа» и «берёзовая куртина» (2026-09-24)
  };

  // ---------- процедурные «рисованные» текстуры ----------
  function makeTex(draw, size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    seed = 424242 + size;
    draw(g, size);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }
  /** Рисует фигуру 9 раз со сдвигом на размер — текстура бесшовная. */
  function wrapDraw(g, s, fn) {
    for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { g.save(); g.translate(dx, dy); fn(); g.restore(); }
  }
  const shade = (v, a) => `rgba(${v},${v},${v},${a})`;
  function streaks(g, s, n, len, width, dark, light, wobble = 1.5) {
    for (let i = 0; i < n; i++) {
      const x = rand() * s, y = rand() * s, l = len[0] + rand() * (len[1] - len[0]), w = width[0] + rand() * (width[1] - width[0]);
      const col = rand() < 0.65 ? shade(dark, 0.18 + rand() * 0.22) : shade(light, 0.12 + rand() * 0.15);
      wrapDraw(g, s, () => {
        g.strokeStyle = col;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + l * 0.33, y + (rand() - 0.5) * wobble * 2, x + l * 0.66, y + (rand() - 0.5) * wobble * 2, x + l, y + (rand() - 0.5) * wobble);
        g.stroke();
      });
    }
  }
  function blotches(g, s, n, r, dark, light, alpha = 0.16) {
    for (let i = 0; i < n; i++) {
      const x = rand() * s, y = rand() * s, rr = r[0] + rand() * (r[1] - r[0]);
      const col = rand() < 0.6 ? shade(dark, alpha * (0.6 + rand())) : shade(light, alpha * (0.5 + rand()));
      wrapDraw(g, s, () => {
        g.fillStyle = col;
        g.beginPath();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2, q = rr * (0.7 + rand() * 0.5);
          k ? g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
        }
        g.closePath();
        g.fill();
      });
    }
  }
  function cracks(g, s, n, len, alpha) {
    for (let i = 0; i < n; i++) {
      let x = rand() * s, y = rand() * s;
      const segs = 3 + Math.floor(rand() * 4);
      const pts = [[x, y]];
      let a = rand() * Math.PI * 2;
      for (let k = 0; k < segs; k++) {
        a += (rand() - 0.5) * 1.2;
        x += Math.cos(a) * len / segs;
        y += Math.sin(a) * len / segs;
        pts.push([x, y]);
      }
      wrapDraw(g, s, () => {
        g.strokeStyle = shade(40, alpha);
        g.lineWidth = 1.2;
        g.beginPath();
        pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
        g.stroke();
      });
    }
  }
  const TEX = {
    wood: makeTex((g, s) => {
      g.fillStyle = shade(236, 1); g.fillRect(0, 0, s, s);
      streaks(g, s, 90, [40, 220], [1, 3.5], 70, 255, 1.2);
      for (let i = 0; i < 3; i++) {
        const x = rand() * s, y = rand() * s;
        wrapDraw(g, s, () => { g.fillStyle = shade(60, 0.45); g.beginPath(); g.ellipse(x, y, 7 + rand() * 5, 3 + rand() * 2, 0, 0, Math.PI * 2); g.fill(); });
      }
      cracks(g, s, 4, 60, 0.3);
    }),
    rings: makeTex((g, s) => {
      g.fillStyle = 'rgb(236,214,178)'; g.fillRect(0, 0, s, s);
      const c = s / 2;
      for (let r = 6; r < c; r += 6 + rand() * 4) {
        g.strokeStyle = `rgba(110,78,50,${0.25 + rand() * 0.25})`;
        g.lineWidth = 1.5 + rand() * 1.5;
        g.beginPath(); g.ellipse(c, c, r, r * (0.95 + rand() * 0.1), rand(), 0, Math.PI * 2); g.stroke();
      }
      g.strokeStyle = 'rgba(70,50,35,0.55)'; g.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const a = rand() * 6.28; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * 0.9, c + Math.sin(a) * c * 0.9); g.stroke(); }
      g.strokeStyle = 'rgba(60,45,35,0.9)'; g.lineWidth = s * 0.07; g.beginPath(); g.arc(c, c, c * 0.95, 0, Math.PI * 2); g.stroke();
    }),
    stone: makeTex((g, s) => {
      g.fillStyle = shade(230, 1); g.fillRect(0, 0, s, s);
      blotches(g, s, 70, [8, 30], 80, 255, 0.14);
      cracks(g, s, 9, 70, 0.45);
      blotches(g, s, 40, [1, 3], 50, 255, 0.35);
    }),
    roof: makeTex((g, s) => {
      g.fillStyle = shade(232, 1); g.fillRect(0, 0, s, s);
      streaks(g, s, 110, [60, 260], [1, 4], 60, 255, 2);
      cracks(g, s, 6, 80, 0.35);
      blotches(g, s, 14, [4, 12], 70, 200, 0.2);
    }, 256),
    bark: makeTex((g, s) => {
      g.fillStyle = shade(225, 1); g.fillRect(0, 0, s, s);
      streaks(g, s, 70, [30, 120], [2, 6], 45, 230, 4);
      blotches(g, s, 30, [3, 9], 50, 255, 0.2);
    }),
    needles: makeTex((g, s) => {
      g.fillStyle = shade(225, 1); g.fillRect(0, 0, s, s);
      for (let i = 0; i < 900; i++) {
        const x = rand() * s, y = rand() * s, a = (rand() < 0.5 ? 1 : -1) * (0.35 + rand() * 0.35), l = 6 + rand() * 10;
        const col = rand() < 0.6 ? shade(40, 0.35) : shade(255, 0.25);
        wrapDraw(g, s, () => { g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
      }
    }),
    grass: makeTex((g, s) => {
      g.fillStyle = shade(228, 1); g.fillRect(0, 0, s, s);
      blotches(g, s, 40, [10, 30], 90, 255, 0.12);
      for (let i = 0; i < 1400; i++) {
        const x = rand() * s, y = rand() * s, a = -Math.PI / 2 + (rand() - 0.5) * 1.4, l = 4 + rand() * 9;
        const r = rand();
        const col = r < 0.5 ? shade(55, 0.35) : r < 0.85 ? shade(255, 0.25) : 'rgba(255,230,150,0.3)';
        wrapDraw(g, s, () => { g.strokeStyle = col; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
      }
      blotches(g, s, 50, [1, 2.5], 40, 40, 0.4);
    }),
    dirt: makeTex((g, s) => {
      g.fillStyle = shade(228, 1); g.fillRect(0, 0, s, s);
      blotches(g, s, 80, [5, 22], 70, 255, 0.15);
      blotches(g, s, 90, [1.5, 4], 60, 255, 0.4);
    }),
    cliff: makeTex((g, s) => {
      g.fillStyle = shade(226, 1); g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 8 + rand() * 18) {
        const v = 120 + rand() * 135, h = 3 + rand() * 10;
        g.fillStyle = shade(Math.round(v), 0.22);
        g.fillRect(0, y, s, h);
      }
      streaks(g, s, 40, [40, 180], [1, 2.5], 50, 255, 3);
      cracks(g, s, 14, 60, 0.5);
    }),
  };
  /**
   * Природные текстуры — простые, крупнопятнистые, как на референсах: мягкие пятна тона и несколько
   * угловатых «мазков-граней», почти без мелкого шума. Мох рисует цвет граней, а не текстура.
   */
  function softBlobs(g, s, n, r, dark, light, alpha) {
    for (let i = 0; i < n; i++) {
      const x = rand() * s, y = rand() * s, rr = r[0] + rand() * (r[1] - r[0]), v = rand() < 0.55 ? dark : light, a = alpha * (0.6 + rand() * 0.8);
      wrapDraw(g, s, () => {
        const gr = g.createRadialGradient(x, y, 0, x, y, rr);
        gr.addColorStop(0, `rgba(${v},${v},${v},${a})`);
        gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
        g.fillStyle = gr;
        g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      });
    }
  }
  function facets(g, s, n, r, dark, light, alpha) {
    for (let i = 0; i < n; i++) {
      const x = rand() * s, y = rand() * s, rr = r[0] + rand() * (r[1] - r[0]), k = 4 + Math.floor(rand() * 3), a0 = rand() * 6.28;
      const v = rand() < 0.5 ? dark : light, a = alpha * (0.6 + rand() * 0.8);
      const pts = [];
      for (let j = 0; j < k; j++) { const a = a0 + (j / k) * 6.28 + (rand() - 0.5) * 0.5, q = rr * (0.6 + rand() * 0.5); pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
      wrapDraw(g, s, () => { g.fillStyle = `rgba(${v},${v},${v},${a})`; g.beginPath(); pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fill(); });
    }
  }
  const SIMPLE = {

    stone: makeTex((g, s) => { g.fillStyle = shade(226, 1); g.fillRect(0, 0, s, s); softBlobs(g, s, 14, [30, 70], 150, 255, 0.16); facets(g, s, 16, [14, 34], 170, 255, 0.12); cracks(g, s, 3, 50, 0.16); }),
    cliff: makeTex((g, s) => { g.fillStyle = shade(222, 1); g.fillRect(0, 0, s, s); softBlobs(g, s, 12, [30, 70], 150, 255, 0.15); facets(g, s, 18, [16, 40], 165, 255, 0.12); cracks(g, s, 4, 60, 0.18); }),
    grass: makeTex((g, s) => { g.fillStyle = shade(226, 1); g.fillRect(0, 0, s, s); softBlobs(g, s, 16, [26, 64], 160, 255, 0.18); facets(g, s, 22, [8, 18], 175, 255, 0.1); }),
    dirt: makeTex((g, s) => { g.fillStyle = shade(226, 1); g.fillRect(0, 0, s, s); softBlobs(g, s, 14, [28, 64], 155, 255, 0.16); facets(g, s, 10, [5, 11], 150, 255, 0.16); }),
    needles: makeTex((g, s) => { g.fillStyle = shade(228, 1); g.fillRect(0, 0, s, s); softBlobs(g, s, 12, [26, 60], 160, 255, 0.16); facets(g, s, 14, [18, 40], 180, 255, 0.1); }),
    bark: makeTex((g, s) => { g.fillStyle = shade(224, 1); g.fillRect(0, 0, s, s); softBlobs(g, s, 10, [24, 56], 150, 255, 0.14); streaks(g, s, 14, [60, 180], [3, 7], 120, 255, 4); }),
  };
  Object.assign(TEX, SIMPLE);
  const TEX_SCALE = { wood: 1.1, stone: 0.9, roof: 0.75, bark: 0.8, needles: 0.9, grass: 0.35, dirt: 0.45, cliff: 0.35 };
  // рисованные текстуры из ChatGPT: сколько повторов на метр
  const GPT_SCALE = { wood: 0.55, stone: 0.5, roof: 0.43, bark: 0.8, needles: 0.9, grass: 0.33, dirt: 0.35, cliff: 0.42 };
  const GPT = {};
  const loader = new T.TextureLoader();
  Object.entries(window.CHATGPT_TEX || {}).forEach(([k, url]) => {
    const t = loader.load(url);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    GPT[k] = t;
  });
  // природу рисуют простые текстуры выше; рисованные ChatGPT остаются для дерева и тёса
  for (const k of Object.keys(SIMPLE)) delete GPT[k];
  // v4: текстуры ChatGPT второго поколения с картами материала (textures2.js):
  // c — основная текстура, m — карта материала (R высота, G шероховатость, B затенение впадин)
  const MATMAP = {};
  const GPT2_SCALE = { grass: 0.42, dirt: 0.62, cliff: 0.34, needles: 0.85, stone: 0.55, bark: 0.75, wood: 0.6, roof: 0.45, cloth: 1.4, leaves: 1.1, birch: 0.9 };
  const BUMP = { grass: 0.035, dirt: 0.03, cliff: 0.06, needles: 0.03, stone: 0.05, bark: 0.04, wood: 0.025, roof: 0.035, cloth: 0.012, leaves: 0.02, birch: 0.02 };
  Object.entries(FEAT.tex2 ? (window.CHATGPT_TEX2 || {}) : {}).forEach(([k, e]) => {
    const t = loader.load(e.c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    GPT[k] = t;
    if (FEAT.mapsSame) MATMAP[k] = t;
    else if (FEAT.maps) { const m = loader.load(e.m); m.wrapS = m.wrapT = T.RepeatWrapping; m.anisotropy = 4; MATMAP[k] = m; }
    GPT_SCALE[k] = GPT2_SCALE[k] ?? GPT_SCALE[k] ?? 0.5;
  });
  const gptU = { value: Object.keys(GPT).length ? 1 : 0 };
  const matU = { value: 1 };   // карты материала вкл./выкл. (переключатель «Рельеф и блики»)

  // ---------- детали: примитив → грани → атрибуты росписи ----------
  const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) =>
    new T.Matrix4().compose(
      new T.Vector3(x, y, z),
      new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)),
      s instanceof T.Vector3 ? s : new T.Vector3(s, s, s),
    );

  /**
   * Атрибуты для росписи и подсветки рёбер: барицентрики, маска внутренних
   * рёбер (между копланарными треугольниками — диагонали квадов) и ось волокон.
   */
  function finalize(g, axis) {
    const pos = g.attributes.position, n = pos.count;
    const bary = new Float32Array(n * 3), mask = new Float32Array(n * 3), ax = new Float32Array(n * 3);
    const nor = g.attributes.normal;
    const key = (i) => `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    const edges = new Map();
    for (let t = 0; t < n; t += 3) {
      for (let k = 0; k < 3; k++) {
        bary[(t + k) * 3 + k] = 1;
        const a = key(t + (k + 1) % 3), b = key(t + (k + 2) % 3);
        const e = a < b ? a + '|' + b : b + '|' + a;
        if (!edges.has(e)) edges.set(e, []);
        edges.get(e).push([t, k]);
      }
      if (axis) for (let k = 0; k < 3; k++) ax.set([axis.x, axis.y, axis.z], (t + k) * 3);
    }
    edges.forEach((list) => {
      if (list.length !== 2) return;
      const [[t1, k1], [t2, k2]] = list;
      const d = nor.getX(t1) * nor.getX(t2) + nor.getY(t1) * nor.getY(t2) + nor.getZ(t1) * nor.getZ(t2);
      if (d > 0.995) {
        for (let v = 0; v < 3; v++) { mask[(t1 + v) * 3 + k1] = 1; mask[(t2 + v) * 3 + k2] = 1; }
      }
    });
    g.setAttribute('aBary', new T.BufferAttribute(bary, 3));
    g.setAttribute('aMask', new T.BufferAttribute(mask, 3));
    g.setAttribute('aAxis', new T.BufferAttribute(ax, 3));
    if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(n * 2), 2));
    g.setAttribute('aUv', g.attributes.uv.clone());
    g.deleteAttribute('uv');
    return g;
  }

  /**
   * Деталь модели: примитив → трансформ → сдвиг вершин (одинаковый для
   * совпадающих вершин, поэтому без щелей) → плоские грани → цвет по граням.
   * `tex` — какая роспись, `axis` — направление волокон в локальных осях детали.
   */
  const VARY_K = 0.5;
  function part(geo, hex, opt = {}) {
    const { m, jitter = 0.022, moss = 0, vary = 0.1, ao = true, side = null, mossHex = PAL.moss, tex = 'plain', axis = null } = opt;
    if (m) geo.applyMatrix4(m);
    const p = geo.attributes.position;
    if (jitter) {
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        p.setXYZ(i,
          x + (hash3(x + 1.3, y, z) - 0.5) * 2 * jitter,
          y + (hash3(x, y + 2.9, z) - 0.5) * 2 * jitter,
          z + (hash3(x, y, z + 4.7) - 0.5) * 2 * jitter);
      }
    }
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.computeVertexNormals();
    const base = lin(hex), mossC = lin(mossHex), sideC = side ? lin(side) : null;
    const n = g.attributes.normal, pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new T.Color();
    for (let t = 0; t < pos.count; t += 3) {
      const ny = n.getY(t);
      // спокойная роспись (референсы 2026-09-24): разброс тона граней вдвое меньше,
      // мох — не случайные грани, а цельные пятна по мягкому полю в пространстве
      const vv = vary * VARY_K;
      c.copy(sideC && ny < 0.5 ? sideC : base).multiplyScalar(1 - vv + rand() * vv * 2);
      if (moss && ny > 0.45) {
        const r1 = rand(), r2 = rand();
        const cx = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3, cy = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3, cz = (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3;
        const f = 0.5 + 0.5 * Math.sin(cx * 3.4 + Math.sin(cz * 2.9 + cy * 1.3) * 1.4) * Math.sin(cz * 3.1 + cy * 2.2 + Math.sin(cx * 1.9) * 1.2);
        if (f * 0.8 + r1 * 0.2 < moss * 1.1 && r2 >= 0) c.lerp(mossC, 0.62 + ny * 0.2);
      }
      for (let k = 0; k < 3; k++) {
        const f = ao ? 0.72 + 0.28 * Math.min(1, Math.max(0, (pos.getY(t + k) - (opt.base ?? 0)) / 1.2)) : 1;
        col[(t + k) * 3] = c.r * f;
        col[(t + k) * 3 + 1] = c.g * f;
        col[(t + k) * 3 + 2] = c.b * f;
      }
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    let wAxis = null;
    if (axis) {
      wAxis = new T.Vector3(...axis);
      if (m) wAxis.transformDirection(m);
    }
    finalize(g, wAxis);
    g.userData.tex = tex;
    return g;
  }

  /** Плавный переход цвета по вершинам: f(x, y, z) → 0…1 доля цвета hex. Кончики лап, светлые края листвы. */
  function tint(g, f, hex) {
    const c = lin(hex), p = g.attributes.position, col = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const k = Math.max(0, Math.min(1, f(p.getX(i), p.getY(i), p.getZ(i))));
      col.setXYZ(i, col.getX(i) + (c.r - col.getX(i)) * k, col.getY(i) + (c.g - col.getY(i)) * k, col.getZ(i) + (c.b - col.getZ(i)) * k);
    }
    col.needsUpdate = true;
    return g;
  }

  const ATTRS = [['position', 3], ['normal', 3], ['color', 3], ['aBary', 3], ['aMask', 3], ['aAxis', 3], ['aUv', 2]];
  function merge(geos) {
    let n = 0;
    geos.forEach((g) => (n += g.attributes.position.count));
    const out = new T.BufferGeometry();
    for (const [name, size] of ATTRS) {
      const arr = new Float32Array(n * size);
      let o = 0;
      geos.forEach((g) => { arr.set(g.attributes[name].array, o * size); o += g.attributes[name].count; });
      out.setAttribute(name, new T.BufferAttribute(arr, size));
    }
    return out;
  }

  // ---------- материалы: роспись, рёбра, ветер ----------
  const timeU = { value: 0 };
  const windU = { value: 1 };
  const paintU = { value: 1 };
  const edgeU = { value: 0.22 };
  const glowMats = [];
  const nightLights = [];
  const whiteTex = makeTex((g, s) => { g.fillStyle = '#fff'; g.fillRect(0, 0, s, s); }, 4);

  /** Разные материалы по-разному отвечают на свет: камень и тёс — с влажным бликом, трава и хвоя — матовые. */
  const ROUGH = { stone: 0.72, cliff: 0.78, wood: 0.86, roof: 0.8, bark: 0.9, needles: 0.93, grass: 0.95, dirt: 0.88, plain: 0.84, birch: 0.8, cloth: 0.95, leaves: 0.8 };
  const ENVI = { stone: 0.55, cliff: 0.5, wood: 0.35, roof: 0.45, bark: 0.3, needles: 0.25, grass: 0.25, dirt: 0.4, plain: 0.45, birch: 0.45, cloth: 0.2, leaves: 0.35 };
  function paintMaterial(tex, opts = {}) {
    const m = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: ROUGH[tex] ?? 0.9, metalness: 0, envMapIntensity: ENVI[tex] ?? 0.35, ...opts.mat });
    const map = TEX[tex] || whiteTex;
    const scale = TEX_SCALE[tex] || 1;
    const gpt = GPT[tex];
    const mmap = MATMAP[tex];
    const baseLum = { value: 0.1 };
    m.userData.baseLum = baseLum;
    m.userData.tex = tex;
    const wind = opts.wind;
    if (wind) m.userData.wind = 1;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uTex: { value: map }, uRings: { value: TEX.rings }, uScale: { value: scale }, uEdge: edgeU, uPaint: paintU, uTime: timeU, uWind: windU,
        uGpt: { value: gpt || whiteTex }, uGptScale: { value: GPT_SCALE[tex] || 1 }, uGptOn: gpt ? gptU : { value: 0 }, uBaseLum: baseLum,
        uMat: { value: mmap || whiteTex }, uMatOn: mmap ? matU : { value: 0 }, uBump: { value: BUMP[tex] || 0.03 },
        uPhase: { value: wind ? wind.phase : 0 }, uH: { value: wind ? wind.h : 1 } });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute vec3 aAxis; attribute vec3 aBary; attribute vec3 aMask; attribute vec2 aUv;
          uniform float uTime; uniform float uWind; uniform float uPhase; uniform float uH;
          varying vec3 vObjPos; varying vec3 vObjN; varying vec3 vAxis; varying vec3 vBary; varying vec3 vMask; varying vec2 vUv0;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vObjPos = position; vObjN = normal; vAxis = aAxis; vBary = aBary; vMask = aMask; vUv0 = aUv;
          ${wind ? `float hh = clamp(transformed.y / uH, 0.0, 1.0); float w = hh * hh * uWind;
          transformed.x += (sin(uTime * 1.3 + uPhase) * 0.3 + sin(uTime * 3.1 + uPhase * 1.7 + transformed.y) * 0.07) * w;
          transformed.z += cos(uTime * 1.1 + uPhase) * 0.2 * w;` : ''}`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uTex; uniform sampler2D uRings; uniform float uScale; uniform float uEdge; uniform float uPaint;
          uniform sampler2D uGpt; uniform float uGptScale; uniform float uGptOn; uniform float uBaseLum;
          uniform sampler2D uMat; uniform float uMatOn; uniform float uBump;
          vec2 gPuv = vec2(0.0); float gMatK = 0.0;
          varying vec3 vObjPos; varying vec3 vObjN; varying vec3 vAxis; varying vec3 vBary; varying vec3 vMask; varying vec2 vUv0;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          {
            vec3 n = normalize(vObjN);
            vec2 puv = vec2(0.0);
            bool cap = false;
            if (dot(vAxis, vAxis) > 0.5) {
              vec3 a = normalize(vAxis);
              if (abs(dot(n, a)) > 0.9) cap = true;
              else { vec3 b = normalize(cross(n, a)); puv = vec2(dot(vObjPos, a), dot(vObjPos, b)); }
            } else {
              vec3 an = abs(n);
              puv = an.y > max(an.x, an.z) ? vObjPos.xz : (an.x > an.z ? vObjPos.zy : vObjPos.xy);
            }
            gPuv = puv;
            gMatK = (uMatOn > 0.5 && uPaint > 0.5 && uGptOn > 0.5 && !cap) ? 1.0 : 0.0;
            vec3 t = cap ? texture2D(uRings, vUv0).rgb : texture2D(uTex, puv * uScale).rgb;
            t = pow(t, vec3(2.2)) * 1.3;
            vec3 painted = diffuseColor.rgb * mix(vec3(1.0), t, uPaint);
            if (uGptOn > 0.5 && uPaint > 0.5 && !cap) {
              // цвет берём из рисованной текстуры, яркость и часть оттенка — из цвета грани
              vec3 g = pow(texture2D(uGpt, puv * uGptScale).rgb, vec3(2.2));
              float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
              vec3 hue = diffuseColor.rgb / max(l, 1e-3);
              painted = g * clamp(l / uBaseLum, 0.45, 1.8) * mix(vec3(1.0), hue, 0.3);
            }
            diffuseColor.rgb = painted;
            vec3 fw = fwidth(vBary) * 1.5;
            vec3 s = max(smoothstep(vec3(0.0), fw, vBary), vMask);
            float edge = 1.0 - min(min(s.x, s.y), s.z);
            diffuseColor.rgb *= 1.0 + edge * uEdge * uPaint;
          }`)
        // карта отражения: шероховатость из канала G — выступы камня и хвоя дают блик, мох и впадины матовые
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          vec3 lpkM = texture2D(uMat, gPuv * uGptScale).rgb; // B = шероховатость
          roughnessFactor = mix(roughnessFactor, clamp(lpkM.b * (0.55 + roughness * 0.5), 0.3, 1.0), gMatK);`)
        ;
        // рельеф по нормали отключён: на части видеокарт (Windows/ANGLE) шейдер с возмущением нормали вешал вкладку.
        // Объём даёт рисованная текстура с запечённым затенением впадин (AO) и карта шероховатости.
    };
    return m;
  }
  /** Средняя яркость цвета граней по материалу — нормировка для цветных текстур. */
  const lumAcc = new Map();
  function trackLum(mat, geo) {
    if (!mat.userData.baseLum) return;
    const c = geo.attributes.color.array;
    let s = 0;
    for (let i = 0; i < c.length; i += 3) s += 0.2126 * c[i] + 0.7152 * c[i + 1] + 0.0722 * c[i + 2];
    const acc = lumAcc.get(mat) || { s: 0, n: 0 };
    acc.s += s;
    acc.n += c.length / 3;
    lumAcc.set(mat, acc);
    mat.userData.baseLum.value = acc.s / acc.n;
  }
  const MATS = {};
  const matFor = (tex) => (MATS[tex] ||= paintMaterial(tex));

  function glassMat() {
    const m = new T.MeshStandardMaterial({ color: lin('#1b2024'), emissive: lin('#ffb257'), emissiveIntensity: 0, roughness: 0.2, metalness: 0.1, envMapIntensity: 1.2, flatShading: true });
    glowMats.push(m);
    return m;
  }

  /** Группа мешей по видам росписи. */
  function facetGroup(geos, opts = {}) {
    const g = new T.Group();
    const buckets = {};
    geos.forEach((geo) => (buckets[geo.userData.tex] ||= []).push(geo));
    Object.entries(buckets).forEach(([tex, list]) => {
      const mat = opts.wind ? paintMaterial(tex, { wind: opts.wind }) : matFor(tex);
      const mesh = new T.Mesh(merge(list), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      trackLum(mat, mesh.geometry);
      if (opts.wind) {
        const dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
        dm.onBeforeCompile = (sh) => {
          Object.assign(sh.uniforms, { uTime: timeU, uWind: windU, uPhase: { value: opts.wind.phase }, uH: { value: opts.wind.h } });
          sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform float uPhase; uniform float uH;\n' +
            sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            float hh = clamp(transformed.y / uH, 0.0, 1.0); float w = hh * hh * uWind;
            transformed.x += (sin(uTime * 1.3 + uPhase) * 0.3 + sin(uTime * 3.1 + uPhase * 1.7 + transformed.y) * 0.07) * w;
            transformed.z += cos(uTime * 1.1 + uPhase) * 0.2 * w;`);
        };
        mesh.customDepthMaterial = dm;
      }
      g.add(mesh);
    });
    return g;
  }
  function glassMesh(geos) {
    const mesh = new T.Mesh(merge(geos), glassMat());
    mesh.receiveShadow = true;
    return mesh;
  }
  /**
   * Ночной огонь: в модели остаётся только метка-якорь, а светят 8 постоянных
   * PointLight кита. Число источников в сцене не меняется при смене вида, поэтому
   * шейдеры не пересобираются (пересборка всех материалов подвешивала слабые видеокарты).
   */
  const LIGHT_POOL = 8;
  function addGlowLight(group, x, y, z, intensity, distance) {
    const a = new T.Object3D();
    a.position.set(x, y, z);
    group.add(a);
    const e = { anchor: a, base: intensity, distance, phase: rand() * 10, color: 0xffb05a, dyn: null };
    nightLights.push(e);
    return e; // модель может задать e.color и e.dyn(glow, t) — своя яркость (например, красное свечение)
  }

  // ---------- мелкие детали окружения ----------
  function rock(L, x, y, z, s, hex = PAL.stone) {
    const sc = new T.Vector3(s * (0.8 + rand() * 0.5), s * (0.55 + rand() * 0.3), s * (0.8 + rand() * 0.5));
    L.push(part(new T.IcosahedronGeometry(1, FEAT.rock1 ? 1 : 0), hex, { // v4: 80 граней вместо 20 — валун «дороже», но гранёный
      m: M(x, y + sc.y * 0.45, z, rand() * 3, rand() * 3, rand() * 3, sc), jitter: 0.09 * s, moss: 0.5, mossHex: PAL.moss, ao: false, vary: 0.14, tex: 'stone',
    }));
  }
  function tuft(L, x, y, z, n = 4, h = 0.4) {
    for (let b = 0; b < n; b++) {
      L.push(part(new T.ConeGeometry(0.045, h * (0.8 + rand() * 0.6), 3), rand() < 0.5 ? PAL.grassLight : PAL.grass, {
        m: M(x + (rand() - 0.5) * 0.25, y + h * 0.4, z + (rand() - 0.5) * 0.25, (rand() - 0.5) * 0.7, rand() * 3, (rand() - 0.5) * 0.7), jitter: 0, ao: false, vary: 0.18,
      }));
    }
  }
  function fern(L, x, y, z, s = 1) {
    const n = 6 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.4, len = (0.7 + rand() * 0.35) * s;
      const d = new T.Vector3(Math.cos(a), 0.9 - rand() * 0.3, Math.sin(a)).normalize();
      const up = new T.Vector3(0, 1, 0);
      const xA = new T.Vector3().crossVectors(d, up).normalize(), zA = new T.Vector3().crossVectors(xA, d);
      const geo = new T.ConeGeometry(0.13 * s, len, 4);
      geo.applyMatrix4(new T.Matrix4().makeScale(1, 1, 0.22));
      const m = new T.Matrix4().makeBasis(xA, d, zA).setPosition(x + d.x * len * 0.45, y + d.y * len * 0.45, z + d.z * len * 0.45);
      L.push(part(geo, rand() < 0.5 ? PAL.fern : PAL.grassLight, { m, jitter: 0.01, ao: false, vary: 0.14, tex: 'needles', axis: [0, 1, 0] }));
    }
  }
  function mushrooms(L, x, y, z) {
    for (let i = 0; i < 3; i++) {
      const px = x + (rand() - 0.5) * 0.4, pz = z + (rand() - 0.5) * 0.4, h = 0.12 + rand() * 0.12;
      L.push(part(new T.CylinderGeometry(0.025, 0.035, h, 5), PAL.bone, { m: M(px, y + h / 2, pz), jitter: 0, ao: false }));
      L.push(part(new T.ConeGeometry(0.09 + rand() * 0.04, 0.07, 7), '#8f2f25', { m: M(px, y + h + 0.02, pz), jitter: 0.005, ao: false, vary: 0.08 }));
      for (let k = 0; k < 3; k++) {
        const a = rand() * 6.28;
        L.push(part(new T.IcosahedronGeometry(0.014, 0), PAL.bone, { m: M(px + Math.cos(a) * 0.045, y + h + 0.035, pz + Math.sin(a) * 0.045), jitter: 0, ao: false }));
      }
    }
  }
  function logWithRings(L, x, y, z, len, r, ry, hex = PAL.log) {
    L.push(part(new T.CylinderGeometry(r, r, len, 8), hex, { m: M(x, y, z, Math.PI / 2, ry, 0), tex: 'bark', axis: [0, 1, 0], moss: 0.3 }));
  }

  function buildHuman() {
    const L = [];
    L.push(part(new T.BoxGeometry(0.2, 0.8, 0.22), PAL.woodDark, { m: M(-0.12, 0.4, 0), jitter: 0.01 }));
    L.push(part(new T.BoxGeometry(0.2, 0.8, 0.22), PAL.woodDark, { m: M(0.12, 0.4, 0), jitter: 0.01 }));
    L.push(part(new T.BoxGeometry(0.52, 0.66, 0.3), PAL.cloth, { m: M(0, 1.12, 0), jitter: 0.02 }));
    L.push(part(new T.BoxGeometry(0.14, 0.62, 0.16), PAL.cloth, { m: M(-0.34, 1.1, 0, 0, 0, 0.08), jitter: 0.01 }));
    L.push(part(new T.BoxGeometry(0.14, 0.62, 0.16), PAL.cloth, { m: M(0.34, 1.1, 0, 0, 0, -0.08), jitter: 0.01 }));
    L.push(part(new T.IcosahedronGeometry(0.15, 0), PAL.skin, { m: M(0, 1.6, 0), jitter: 0.01, ao: false }));
    L.push(part(new T.ConeGeometry(0.19, 0.16, 6), PAL.red, { m: M(0, 1.74, 0), jitter: 0.01, ao: false }));
    return facetGroup(L);
  }

  // ---------- изба (6 × 6 м) ----------
  function buildHut() {
    seed = 11;
    const g = new T.Group();
    const L = [], G = [];
    const x0 = 0.35, x1 = 5.65, z0 = 0.35, z1 = 4.85, zc = (z0 + z1) / 2, r = 0.15, row = 0.27, base = 0.3, rows = 10;
    const wallTop = base + rows * row + 0.15;
    const rise = 2.5, ridge = wallTop + rise;

    // фундамент из валунов
    const runs = [['x', x0, x1, z0], ['x', x0, x1, z1], ['z', z0, z1, x0], ['z', z0, z1, x1]];
    for (const [ax, a0, a1, fixed] of runs) {
      for (let t = a0 - 0.25; t < a1 + 0.25; t += 0.42) {
        const cx = ax === 'x' ? t + 0.2 : fixed, cz = ax === 'x' ? fixed : t + 0.2;
        L.push(part(new T.IcosahedronGeometry(0.26, 0), rand() < 0.3 ? PAL.stoneDark : PAL.stone, {
          m: M(cx, 0.17, cz, rand() * 3, rand() * 3, rand() * 3, new T.Vector3(1, 0.75, 1)), jitter: 0.05, moss: 0.4, vary: 0.16, tex: 'stone', ao: false,
        }));
      }
    }
    // сруб: брёвна по 8 граней, выпуски «в обло» со спилами
    for (let k = 0; k < rows; k++) {
      const yx = base + r + k * row, yz = yx + row / 2;
      for (const z of [z0, z1]) {
        const len = x1 - x0 + 0.6 + (rand() - 0.5) * 0.12;
        L.push(part(new T.CylinderGeometry(r, r * 1.04, len, 8), k % 3 ? PAL.log : PAL.woodDark, { m: M((x0 + x1) / 2, yx, z, 0, 0, Math.PI / 2), tex: 'wood', axis: [0, 1, 0], jitter: 0.015 }));
      }
      for (const x of [x0, x1]) {
        const len = z1 - z0 + 0.6 + (rand() - 0.5) * 0.12;
        L.push(part(new T.CylinderGeometry(r, r * 1.04, len, 8), k % 2 ? PAL.log : PAL.wood, { m: M(x, yz, zc, Math.PI / 2, 0, 0), tex: 'wood', axis: [0, 1, 0], jitter: 0.015 }));
      }
    }
    // фронтоны
    for (let k = rows; ; k++) {
      const y = base + r + k * row + row / 2;
      const half = (zc - z0 + 0.1) * (1 - (y - wallTop) / rise);
      if (half < 0.25) break;
      for (const x of [x0, x1]) {
        L.push(part(new T.CylinderGeometry(r, r, half * 2, 8), k % 2 ? PAL.log : PAL.wood, { m: M(x, y, zc, Math.PI / 2, 0, 0), tex: 'wood', axis: [0, 1, 0], jitter: 0.015 }));
      }
    }
    // кровля: два слоя тёса, рваный свес, кочки мха
    const eave = 0.45, run = z1 + eave - zc, drop = run * rise / (zc - z0), slope = Math.hypot(run, drop), th = Math.atan2(drop, run);
    for (const s of [1, -1]) {
      for (let layer = 0; layer < 2; layer++) {
        const off = layer * 0.24, w = layer ? 0.28 : 0.46, lift = layer * 0.06;
        for (let x = x0 - 0.55 + off; x < x1 + 0.55; x += 0.48) {
          const len = slope * (layer ? 0.9 + rand() * 0.1 : 0.95 + rand() * 0.08);
          const along = (slope - len) / 2;
          L.push(part(new T.BoxGeometry(w, 0.07, len), PAL.roof, {
            m: M(x + 0.24, ridge + 0.12 + lift - drop / 2 + along * Math.sin(th), zc + s * (run / 2 - along * Math.cos(th)), s * th + (rand() - 0.5) * 0.035, (rand() - 0.5) * 0.03, 0),
            jitter: 0.015, moss: 0.4, vary: 0.16, tex: 'roof', axis: [0, 0, 1],
          }));
        }
      }
      for (let i = 0; i < 12; i++) {
        const f = 0.2 + rand() * 0.75, x = x0 - 0.3 + rand() * (x1 - x0 + 0.6);
        L.push(part(new T.IcosahedronGeometry(1, 0), rand() < 0.6 ? '#4b5a30' : '#5d6b38', {
          m: M(x, ridge + 0.2 - drop * f, zc + s * run * f, s * th, rand() * 3, 0, new T.Vector3(0.22 + rand() * 0.2, 0.06, 0.16 + rand() * 0.16)), jitter: 0.02, ao: false, vary: 0.15, tex: 'grass',
        }));
      }
      // причелины с зубцами на обоих фронтонах
      for (const px of [x0 - 0.62, x1 + 0.62]) {
        L.push(part(new T.BoxGeometry(0.07, 0.32, slope), PAL.red, { m: M(px, ridge - drop / 2 - 0.05, zc + s * run / 2, s * th, 0, 0), jitter: 0.01, tex: 'wood', axis: [0, 0, 1] }));
        for (let i = 1; i < 10; i++) {
          const f = i / 10;
          L.push(part(new T.ConeGeometry(0.06, 0.18, 4), PAL.red, { m: M(px, ridge - drop * f - 0.27, zc + s * run * f, Math.PI, 0, 0), jitter: 0.004 }));
        }
      }
    }
    // «полотенце» под коньком и конёк с «конём»
    for (const px of [x0 - 0.63, x1 + 0.63]) {
      L.push(part(new T.BoxGeometry(0.06, 0.9, 0.26), PAL.red, { m: M(px, ridge - 0.55, zc), jitter: 0.01, tex: 'wood', axis: [0, 1, 0] }));
      L.push(part(new T.ConeGeometry(0.13, 0.22, 4), PAL.red, { m: M(px, ridge - 1.1, zc, Math.PI, Math.PI / 4, 0), jitter: 0.004 }));
    }
    L.push(part(new T.CylinderGeometry(0.17, 0.17, x1 - x0 + 1.3, 8), PAL.woodDark, { m: M((x0 + x1) / 2, ridge + 0.22, zc, 0, 0, Math.PI / 2), tex: 'wood', axis: [0, 1, 0] }));
    L.push(part(new T.BoxGeometry(0.55, 0.2, 0.18), PAL.woodDark, { m: M(x1 + 0.8, ridge + 0.42, zc, 0, 0, 0.7), tex: 'wood', axis: [1, 0, 0] }));
    L.push(part(new T.BoxGeometry(0.34, 0.2, 0.17), PAL.woodDark, { m: M(x1 + 1.02, ridge + 0.62, zc, 0, 0, -0.25), tex: 'wood', axis: [1, 0, 0] }));
    L.push(part(new T.ConeGeometry(0.05, 0.14, 4), PAL.woodDark, { m: M(x1 + 0.94, ridge + 0.78, zc + 0.05) }));

    // окна: рама, резной наличник с кокошником, ставни, стекло (светится ночью)
    function windowAt(cx, cy, cz, ry, w = 0.7, h = 0.8) {
      const W = (lx, ly, lz, geo, hex, o = {}) => {
        const m = new T.Matrix4().makeRotationY(ry).setPosition(cx, cy, cz).multiply(M(lx, ly, lz, o.rx || 0, o.ry || 0, o.rz || 0));
        return part(geo, hex, { jitter: 0.006, ...o, m, base: -cy });
      };
      G.push(W(0, 0, 0, new T.BoxGeometry(w - 0.1, h - 0.1, 0.05), '#1b2024'));
      L.push(W(0, -h / 2, 0.06, new T.BoxGeometry(w + 0.2, 0.07, 0.16), PAL.woodLight, { tex: 'wood', axis: [1, 0, 0] }));
      L.push(W(-w / 2, 0, 0.04, new T.BoxGeometry(0.09, h, 0.08), PAL.woodLight, { tex: 'wood', axis: [0, 1, 0] }));
      L.push(W(w / 2, 0, 0.04, new T.BoxGeometry(0.09, h, 0.08), PAL.woodLight, { tex: 'wood', axis: [0, 1, 0] }));
      L.push(W(0, 0, 0.04, new T.BoxGeometry(0.045, h, 0.045), PAL.woodLight));
      L.push(W(0, 0.05, 0.04, new T.BoxGeometry(w, 0.045, 0.045), PAL.woodLight));
      L.push(W(0, h / 2 + 0.1, 0.06, new T.BoxGeometry(w + 0.3, 0.14, 0.08), PAL.woodLight, { tex: 'wood', axis: [1, 0, 0] }));
      L.push(W(0, h / 2 + 0.17, 0.06, new T.CylinderGeometry((w + 0.3) / 2, (w + 0.3) / 2, 0.07, 9, 1, false, -Math.PI / 2, Math.PI), PAL.woodLight, { rx: Math.PI / 2, rz: Math.PI / 2 }));
      L.push(W(0, h / 2 + 0.17, 0.1, new T.CylinderGeometry(w / 2 - 0.02, w / 2 - 0.02, 0.04, 9, 1, false, -Math.PI / 2, Math.PI), PAL.red, { rx: Math.PI / 2, rz: Math.PI / 2 }));
      for (let i = 0; i < 6; i++) {
        L.push(W(-w / 2 - 0.1 + (i + 0.5) * (w + 0.2) / 6, h / 2 + 0.01, 0.08, new T.ConeGeometry(0.035, 0.09, 4), PAL.woodLight, { rx: Math.PI }));
      }
      L.push(W(-(w / 2 + 0.24), 0, 0.12, new T.BoxGeometry(0.34, h + 0.06, 0.05), PAL.red, { ry: 0.35, tex: 'wood', axis: [0, 1, 0] }));
      L.push(W(w / 2 + 0.24, 0, 0.12, new T.BoxGeometry(0.34, h + 0.06, 0.05), PAL.red, { ry: -0.35, tex: 'wood', axis: [0, 1, 0] }));
      L.push(W(-(w / 2 + 0.24), 0, 0.15, new T.BoxGeometry(0.18, 0.18, 0.02), PAL.woodLight, { ry: 0.35, rz: Math.PI / 4 }));
      L.push(W(w / 2 + 0.24, 0, 0.15, new T.BoxGeometry(0.18, 0.18, 0.02), PAL.woodLight, { ry: -0.35, rz: Math.PI / 4 }));
    }
    const faceZ = z1 + r + 0.02, faceX = x1 + r + 0.02;
    windowAt(1.3, 1.75, faceZ, 0);
    windowAt(2.75, 1.75, faceZ, 0);
    windowAt(faceX, 1.75, zc, Math.PI / 2);
    windowAt(faceX, 4.05, zc, Math.PI / 2, 0.45, 0.5);
    windowAt(3, 1.75, z0 - r - 0.02, Math.PI);
    windowAt(x0 - r - 0.02, 1.75, zc, -Math.PI / 2);

    // крыльцо: площадка, ступени, столбы, балясины, навес
    const pz0 = z1 + r, pz1 = 5.45, px0 = 3.5, px1 = 5.6, floor = 0.7;
    for (let x = px0; x < px1 - 0.05; x += 0.3) {
      L.push(part(new T.BoxGeometry(0.29, 0.09, pz1 - pz0), PAL.woodLight, { m: M(x + 0.15, floor - 0.05, (pz0 + pz1) / 2), moss: 0.12, tex: 'wood', axis: [0, 0, 1], jitter: 0.008 }));
    }
    for (const [sx, sz] of [[px0 + 0.1, pz1 - 0.08], [px1 - 0.1, pz1 - 0.08]]) {
      L.push(part(new T.CylinderGeometry(0.08, 0.09, floor, 6), PAL.woodDark, { m: M(sx, floor / 2, sz), tex: 'wood', axis: [0, 1, 0] }));
      L.push(part(new T.CylinderGeometry(0.07, 0.08, 2.1, 8), PAL.wood, { m: M(sx, floor + 1.05, sz), tex: 'wood', axis: [0, 1, 0] }));
    }
    for (const sx of [px0 + 0.1, px1 - 0.1]) {
      for (let i = 0; i < 3; i++) {
        L.push(part(new T.CylinderGeometry(0.025, 0.035, 0.55, 6), PAL.woodLight, { m: M(sx, floor + 0.3, pz0 + 0.1 + i * 0.13), jitter: 0.004 }));
      }
      L.push(part(new T.BoxGeometry(0.07, 0.06, pz1 - pz0), PAL.wood, { m: M(sx, floor + 0.6, (pz0 + pz1) / 2), tex: 'wood', axis: [0, 0, 1] }));
    }
    L.push(part(new T.BoxGeometry(1.1, 0.24, 0.28), PAL.woodLight, { m: M(4.55, 0.35, pz1 + 0.14), tex: 'wood', axis: [1, 0, 0] }));
    L.push(part(new T.BoxGeometry(1.1, 0.24, 0.28), PAL.woodLight, { m: M(4.55, 0.12, pz1 + 0.42), tex: 'wood', axis: [1, 0, 0] }));
    for (let x = px0 - 0.1; x < px1 + 0.1; x += 0.44) {
      L.push(part(new T.BoxGeometry(0.42, 0.06, 1.0), PAL.roof, { m: M(x + 0.22, floor + 2.25, pz0 + 0.35, 0.35, 0, 0), moss: 0.35, vary: 0.15, tex: 'roof', axis: [0, 0, 1] }));
    }
    // дверной проём и дверь (отдельно — открывается)
    L.push(part(new T.BoxGeometry(0.96, 1.95, 0.04), '#0d0c0b', { m: M(4.55, floor + 0.97, faceZ - 0.01), jitter: 0, vary: 0.02, ao: false }));
    L.push(part(new T.BoxGeometry(1.2, 0.14, 0.1), PAL.woodLight, { m: M(4.55, floor + 2.02, faceZ + 0.03), tex: 'wood', axis: [1, 0, 0] }));
    const door = new T.Group();
    door.position.set(4.07, floor, faceZ + 0.03);
    const D = [];
    for (let i = 0; i < 4; i++) D.push(part(new T.BoxGeometry(0.23, 1.9, 0.06), i % 2 ? PAL.wood : PAL.woodLight, { m: M(0.12 + i * 0.24, 0.95, 0), jitter: 0.006, tex: 'wood', axis: [0, 1, 0] }));
    for (const y of [0.4, 1.5]) {
      D.push(part(new T.BoxGeometry(0.9, 0.12, 0.05), PAL.woodDark, { m: M(0.48, y, 0.05), jitter: 0.004, tex: 'wood', axis: [1, 0, 0] }));
      D.push(part(new T.BoxGeometry(0.34, 0.06, 0.02), PAL.iron, { m: M(0.12, y, 0.085), jitter: 0 }));
    }
    D.push(part(new T.BoxGeometry(0.1, 1.1, 0.04), PAL.woodDark, { m: M(0.48, 0.95, 0.05, 0, 0, -0.95), jitter: 0.004, tex: 'wood', axis: [0, 1, 0] }));
    D.push(part(new T.TorusGeometry(0.07, 0.018, 4, 6), PAL.iron, { m: M(0.8, 1.0, 0.08), jitter: 0 }));
    door.add(facetGroup(D));
    g.add(door);

    // печная труба: кладка вперевязку
    const chX = 1.45, chZ = zc - 0.55;
    let rowI = 0;
    for (let y = ridge - 1.4; y < ridge + 1.0; y += 0.26, rowI++) {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const o = rowI % 2 ? 0.05 : -0.05;
        L.push(part(new T.BoxGeometry(0.36, 0.25, 0.36), rand() < 0.3 ? PAL.stoneDark : PAL.stone, {
          m: M(chX - 0.18 + i * 0.36 + o, y, chZ - 0.18 + j * 0.36 - o, 0, (rand() - 0.5) * 0.15, 0), jitter: 0.03, vary: 0.18, moss: 0.12, tex: 'stone',
        }));
      }
    }
    L.push(part(new T.BoxGeometry(0.9, 0.1, 0.9), PAL.stoneDark, { m: M(chX, ridge + 1.05, chZ), jitter: 0.03, tex: 'stone' }));

    // ведро, лавка у стены и фонарь у двери
    L.push(part(new T.CylinderGeometry(0.18, 0.15, 0.32, 8), PAL.woodLight, { m: M(0.9, 0.16, 5.3), tex: 'wood', axis: [0, 1, 0] }));
    L.push(part(new T.CylinderGeometry(0.185, 0.185, 0.04, 8), PAL.iron, { m: M(0.9, 0.24, 5.3), jitter: 0 }));
    L.push(part(new T.BoxGeometry(1.5, 0.08, 0.34), PAL.woodLight, { m: M(2.0, 0.5, 5.25), tex: 'wood', axis: [1, 0, 0] }));
    for (const lx of [1.4, 2.6]) L.push(part(new T.BoxGeometry(0.1, 0.46, 0.28), PAL.wood, { m: M(lx, 0.23, 5.25), tex: 'wood', axis: [0, 1, 0] }));
    L.push(part(new T.BoxGeometry(0.34, 0.05, 0.05), PAL.iron, { m: M(3.36, 2.55, faceZ + 0.12), jitter: 0 }));
    G.push(part(new T.BoxGeometry(0.16, 0.22, 0.16), '#1b2024', { m: M(3.22, 2.36, faceZ + 0.12), jitter: 0 }));
    L.push(part(new T.ConeGeometry(0.14, 0.12, 4), PAL.iron, { m: M(3.22, 2.53, faceZ + 0.12, 0, Math.PI / 4, 0), jitter: 0 }));
    L.push(part(new T.BoxGeometry(0.2, 0.04, 0.2), PAL.iron, { m: M(3.22, 2.24, faceZ + 0.12), jitter: 0 }));
    // трава у фундамента
    for (let i = 0; i < 14; i++) {
      const edge = rand() < 0.5;
      tuft(L, edge ? x0 - 0.35 + rand() * (x1 - x0 + 0.7) : x1 + 0.35, 0, edge ? z1 + 0.3 : z0 + rand() * (z1 - z0), 3, 0.35);
    }

    g.add(facetGroup(L));
    g.add(glassMesh(G));
    addGlowLight(g, 3.22, 2.36, faceZ + 0.5, 1.4, 7);
    addGlowLight(g, 2.0, 1.8, faceZ + 0.9, 1.0, 5);
    addGlowLight(g, faceX + 0.9, 1.8, zc, 0.9, 5);
    return { group: g, door, smoke: new T.Vector3(chX, ridge + 1.2, chZ) };
  }

  // ---------- ель: ярусы свисающих лап ----------
  /** Острая ветка-лезвие ели: сплющенный 4-гранный конус с ребром, тёмная у основания, светлая к кончику. */
  function spruceBlade(L, o, d, len, w, col, tipK = 0.6) {
    const up = new T.Vector3(0, 1, 0);
    const xA = new T.Vector3().crossVectors(d, up);
    if (xA.lengthSq() < 1e-6) xA.set(1, 0, 0);
    xA.normalize();
    const zA = new T.Vector3().crossVectors(xA, d);
    const g = new T.ConeGeometry(w, len, 4, 1, true); // 4 треугольника: основание спрятано в кроне
    g.applyMatrix4(new T.Matrix4().makeScale(1, 1, 0.28));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { // лезвие шире у основания, кончик тонкий и чуть опущен
      const py = p.getY(i), tt = 0.5 - py / len;
      if (tt > 0.3) p.setX(i, p.getX(i) * 0.8);
      p.setZ(i, p.getZ(i) - tt * tt * len * 0.08);
    }
    g.applyMatrix4(new T.Matrix4().makeRotationZ(Math.PI));
    const m = new T.Matrix4().makeBasis(xA, d.clone().negate(), zA).setPosition(o.x + d.x * len * 0.5, o.y + d.y * len * 0.5, o.z + d.z * len * 0.5);
    const ox = o.x, oy = o.y, oz = o.z;
    L.push(tint(part(g, col, { m, jitter: 0.012, tex: 'needles', axis: [0, 1, 0], vary: 0.14, ao: false }),
      (x, y, z) => Math.pow(Math.min(1, Math.max(0, ((x - ox) * d.x + (y - oy) * d.y + (z - oz) * d.z) / len)), 1.6) * tipK, PAL.needleLight));
  }
  function buildSpruce(h = 12, s = 1) {
    seed = 97 * s + 5;
    const L = [];
    const k = h / 12;
    L.push(part(new T.CylinderGeometry(0.08, 0.3 * k, h * 0.92, 7, 4), PAL.bark, { m: M(0, h * 0.46, 0), jitter: 0.03, tex: 'bark', axis: [0, 1, 0] }));
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + rand();
      L.push(part(new T.BoxGeometry(0.75, 0.2, 0.2), PAL.bark, { m: M(Math.cos(a) * 0.38, 0.06, Math.sin(a) * 0.38, 0, -a, -0.28), jitter: 0.03, tex: 'bark', axis: [1, 0, 0] }));
    }
    // сухие нижние сучья
    for (let i = 0; i < 6; i++) {
      const a = rand() * 6.28, y = 0.8 + rand() * 1.4;
      L.push(part(new T.CylinderGeometry(0.012, 0.03, 0.8, 4), PAL.woodDark, { m: M(Math.cos(a) * 0.4, y, Math.sin(a) * 0.4, 0, -a, Math.PI / 2 - 0.3), jitter: 0 }));
    }
    const tiers = Math.round(11 * k + 1);
    const up = new T.Vector3(0, 1, 0);
    const greens = [PAL.needle, PAL.needleMid, '#28462f'];
    for (let t = 0; t < tiers; t++) {
      const f = t / (tiers - 1);
      const y = h * (0.2 + 0.74 * f);
      const R = ((1 - f) * 2.5 + 0.35) * k;
      L.push(part(new T.ConeGeometry(R * 0.45, (0.9 + (1 - f) * 0.7) * k, 6), '#1a3228', { m: M(0, y + 0.15, 0, 0, rand() * 6, 0), jitter: 0.05, tex: 'needles', ao: false }));
      const n = Math.max(4, Math.round(5 + (1 - f) * 5));
      for (let b = 0; b < n; b++) {
        const a = (b / n) * Math.PI * 2 + t * 0.7 + rand() * 0.35;
        const len = R * (0.85 + rand() * 0.3);
        const d = new T.Vector3(Math.cos(a), -0.3 - rand() * 0.25 - (1 - f) * 0.15, Math.sin(a)).normalize();
        if (!FEAT.blades) { // лапа v3: одна сплющенная пирамида
          const up2 = new T.Vector3(0, 1, 0), xA = new T.Vector3().crossVectors(d, up2).normalize(), zA = new T.Vector3().crossVectors(xA, d);
          const paw = new T.ConeGeometry((0.32 + (1 - f) * 0.35) * k, len, 4, 1);
          paw.applyMatrix4(new T.Matrix4().makeScale(1, 1, 0.32));
          const pp = paw.attributes.position;
          for (let i = 0; i < pp.count; i++) if (pp.getY(i) > len * 0.2) pp.setX(i, pp.getX(i) * 0.7);
          paw.applyMatrix4(new T.Matrix4().makeRotationZ(Math.PI));
          const m = new T.Matrix4().makeBasis(xA, d.clone().negate(), zA).setPosition(d.x * len * 0.5, y + d.y * len * 0.5, d.z * len * 0.5);
          L.push(tint(part(paw, greens[Math.floor(rand() * 3)], { m, jitter: 0.03, tex: 'needles', axis: [0, 1, 0], vary: 0.16, ao: false }),
            (x, yy, z) => Math.pow(Math.min(1, Math.hypot(x, z) / len), 2) * 0.6, PAL.needleLight));
          continue;
        }
        const w = (0.3 + (1 - f) * 0.3) * k;
        // лапа — веер острых веток разной длины: центральная, 2–4 боковых и мелкие иглы на концах
        const col = greens[Math.floor(rand() * 3)];
        const o = new T.Vector3(0, y, 0);
        spruceBlade(L, o, d, len, w, col, 0.6);
        const nz = new T.Vector3().crossVectors(new T.Vector3().crossVectors(d, up).normalize(), d); // нормаль плоскости лапы
        const sides = 2 + Math.floor(rand() * 3);
        for (let sI = 0; sI < sides; sI++) {
          const sgn = sI % 2 ? 1 : -1, at = 0.22 + (sI >> 1) * 0.25 + rand() * 0.12;
          const sd = d.clone().applyAxisAngle(nz, sgn * (0.5 + rand() * 0.3)).add(new T.Vector3(0, -0.12 - rand() * 0.1, 0)).normalize();
          const so = o.clone().add(d.clone().multiplyScalar(len * at));
          spruceBlade(L, so, sd, len * (0.5 - at * 0.35 + rand() * 0.1), w * 0.62, col, 0.6);
        }
        if (len > 0.9) { // короткие иглы-зубцы у кончика
          const to = o.clone().add(d.clone().multiplyScalar(len * 0.7));
          for (const sgn of [-1, 1]) spruceBlade(L, to, d.clone().applyAxisAngle(nz, sgn * 0.75).normalize(), len * 0.24, w * 0.4, col, 0.75);
        }
      }
    }
    L.push(part(new T.ConeGeometry(0.13 * k, 1.1 * k, 5), PAL.needleLight, { m: M(0, h * 0.975, 0), jitter: 0.03, tex: 'needles' }));
    return facetGroup(L, { wind: { phase: s * 1.7, h } });
  }

  /** Брус с фасками: квадрат w×d со срезанными углами c, высота h по оси Y, центр в начале координат. */
  function chamferBar(w, d, h, c) {
    const sh = new T.Shape();
    const x = w / 2, z = d / 2;
    sh.moveTo(-x + c, -z); sh.lineTo(x - c, -z); sh.lineTo(x, -z + c); sh.lineTo(x, z - c);
    sh.lineTo(x - c, z); sh.lineTo(-x + c, z); sh.lineTo(-x, z - c); sh.lineTo(-x, -z + c); sh.lineTo(-x + c, -z);
    const g = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, steps: Math.max(1, Math.round(h / 0.35)) });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -h / 2, 0);
    return g;
  }
  /** Железная накладка с пирамидками-заклёпками. */
  function ironPlate(L, x, y, z, w, h, ry = 0, nx = 0, nz = 1, rivets = 2) {
    L.push(part(new T.BoxGeometry(w, h, 0.03), PAL.iron, { m: M(x, y, z, 0, ry, 0), jitter: 0.004, vary: 0.08 }));
    for (let i = 0; i < rivets; i++) {
      const t = rivets === 1 ? 0 : (i / (rivets - 1) - 0.5) * (h * 0.6);
      L.push(part(new T.ConeGeometry(0.035, 0.035, 4), PAL.iron, { m: M(x + nx * 0.025, y + t, z + nz * 0.025, nz ? Math.PI / 2 * nz : 0, 0, nx ? -Math.PI / 2 * nx : 0), jitter: 0, ao: false }));
    }
  }

  function buildLanternPostV1() {
    seed = 31;
    const g = new T.Group();
    const L = [], G = [];
    L.push(part(new T.CylinderGeometry(0.12, 0.15, 3.0, 7), PAL.wood, { m: M(0, 1.5, 0), moss: 0.25, tex: 'wood', axis: [0, 1, 0] }));
    L.push(part(new T.ConeGeometry(0.13, 0.32, 7), PAL.wood, { m: M(0, 3.15, 0) }));
    L.push(part(new T.BoxGeometry(1.15, 0.14, 0.14), PAL.wood, { m: M(0.5, 2.68, 0), moss: 0.3, tex: 'wood', axis: [1, 0, 0] }));
    L.push(part(new T.BoxGeometry(0.08, 0.68, 0.08), PAL.woodDark, { m: M(0.3, 2.38, 0, 0, 0, -0.72), tex: 'wood', axis: [0, 1, 0] }));
    for (const y of [2.68, 0.55, 1.6]) L.push(part(new T.CylinderGeometry(0.16, 0.16, 0.08, 7), PAL.iron, { m: M(0, y, 0), jitter: 0.004 }));
    for (let i = 0; i < 3; i++) L.push(part(new T.TorusGeometry(0.05, 0.016, 4, 6), PAL.iron, { m: M(1.0, 2.55 - i * 0.08, 0, 0, i % 2 ? Math.PI / 2 : 0, 0), jitter: 0 }));
    const ly = 2.12;
    L.push(part(new T.BoxGeometry(0.32, 0.05, 0.32), PAL.iron, { m: M(1.0, ly - 0.19, 0), jitter: 0 }));
    G.push(part(new T.BoxGeometry(0.24, 0.32, 0.24), '#1b2024', { m: M(1.0, ly, 0), jitter: 0 }));
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) L.push(part(new T.BoxGeometry(0.035, 0.36, 0.035), PAL.iron, { m: M(1.0 + dx * 0.125, ly, dz * 0.125), jitter: 0 }));
    L.push(part(new T.ConeGeometry(0.25, 0.2, 4), PAL.iron, { m: M(1.0, ly + 0.27, 0, 0, Math.PI / 4, 0), jitter: 0 }));
    rock(L, -0.25, 0, 0.2, 0.28);
    rock(L, 0.2, 0, -0.25, 0.22);
    tuft(L, -0.3, 0, -0.2, 4, 0.4);
    g.add(facetGroup(L));
    g.add(glassMesh(G));
    addGlowLight(g, 1.0, ly, 0.05, 2.0, 9);
    return g;
  }

  // ---------- фонарный столб (≈3 м), v4 по референсу: брус с фасками, накладки, кронштейн, цепь, фонарь ----------
  function buildLanternPost() {
    if (!FEAT.lantern) return buildLanternPostV1();
    seed = 31;
    const g = new T.Group();
    const L = [], G = [];
    const H = 3.0, pw = 0.26;
    L.push(part(chamferBar(pw, pw, H, 0.045), PAL.wood, { m: M(0, H / 2, 0), moss: 0.3, tex: 'wood', axis: [0, 1, 0], jitter: 0.01 }));
    L.push(part(chamferBar(pw + 0.05, pw + 0.05, 0.45, 0.05), PAL.woodDark, { m: M(0, 0.22, 0), moss: 0.35, tex: 'wood', axis: [0, 1, 0], jitter: 0.012 })); // комель
    L.push(part(new T.ConeGeometry(pw * 0.72, 0.34, 4), PAL.wood, { m: M(0, H + 0.17, 0, 0, Math.PI / 4, 0), jitter: 0.01, tex: 'wood', axis: [0, 1, 0] }));
    L.push(part(new T.BoxGeometry(0.02, 0.26, pw * 0.5), PAL.woodDark, { m: M(pw * 0.2, H + 0.1, 0.02, 0, 0, 0.12), jitter: 0 })); // трещина на макушке
    L.push(part(new T.BoxGeometry(0.03, 0.34, 0.04), PAL.woodDark, { m: M(0.02, 0.95, pw / 2 + 0.005, 0, 0, 0.35), jitter: 0 }));  // зарубки
    L.push(part(new T.BoxGeometry(0.03, 0.3, 0.04), PAL.woodDark, { m: M(-0.04, 0.95, pw / 2 + 0.005, 0, 0, -0.35), jitter: 0 }));
    // кронштейн: брус с фасками, торцевой кубик с пирамидкой, подкос
    const ay = 2.55, ax = 1.05;
    L.push(part(chamferBar(0.17, 0.17, ax, 0.03), PAL.wood, { m: M(ax / 2 + 0.05, ay, 0, 0, 0, -Math.PI / 2), moss: 0.35, tex: 'wood', axis: [1, 0, 0], jitter: 0.008 }));
    L.push(part(new T.BoxGeometry(0.24, 0.22, 0.24), PAL.woodDark, { m: M(ax + 0.08, ay, 0), jitter: 0.01, tex: 'wood', axis: [1, 0, 0] }));
    L.push(part(new T.ConeGeometry(0.17, 0.12, 4), PAL.woodDark, { m: M(ax + 0.08, ay + 0.17, 0, 0, Math.PI / 4, 0), jitter: 0 }));
    L.push(part(chamferBar(0.11, 0.1, 0.72, 0.02), PAL.woodDark, { m: M(0.3, ay - 0.3, 0, 0, 0, -0.78), tex: 'wood', axis: [0, 1, 0], jitter: 0.006 }));
    // железные накладки с заклёпками на стыке
    ironPlate(L, 0, ay + 0.02, pw / 2 + 0.018, 0.2, 0.34, 0, 0, 1, 2);
    ironPlate(L, 0, ay + 0.02, -pw / 2 - 0.018, 0.2, 0.34, 0, 0, -1, 2);
    ironPlate(L, -pw / 2 - 0.018, ay + 0.02, 0, 0.2, 0.34, Math.PI / 2, -1, 0, 2);
    ironPlate(L, 0.2, ay, 0.1, 0.2, 0.2, 0, 0, 1, 1);
    // цепь: звенья попеременно
    for (let i = 0; i < 3; i++) L.push(part(new T.TorusGeometry(0.045, 0.014, 4, 8), PAL.iron, { m: M(ax + 0.08, ay - 0.17 - i * 0.075, 0, 0, i % 2 ? Math.PI / 2 : 0, 0, new T.Vector3(1, 1.35, 1)), jitter: 0 }));
    // фонарь: основание, 4 стойки, стекло, косые перекладины, двухъярусная крыша, свеча
    const lx = ax + 0.08, ly = 2.0, hw = 0.13;
    L.push(part(new T.BoxGeometry(0.36, 0.05, 0.36), PAL.woodDark, { m: M(lx, ly - 0.22, 0), jitter: 0.004, tex: 'wood', axis: [1, 0, 0] }));
    L.push(part(new T.BoxGeometry(0.3, 0.04, 0.3), PAL.iron, { m: M(lx, ly - 0.18, 0), jitter: 0 }));
    G.push(part(new T.BoxGeometry(hw * 2 - 0.01, 0.34, hw * 2 - 0.01), '#1b2024', { m: M(lx, ly, 0), jitter: 0 }));
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) L.push(part(new T.BoxGeometry(0.04, 0.38, 0.04), PAL.woodDark, { m: M(lx + dx * hw, ly, dz * hw), jitter: 0 }));
    for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) for (const sgn of [-1, 1]) {
      L.push(part(new T.BoxGeometry(0.018, 0.38, 0.018), PAL.iron, { m: M(lx + nx * (hw + 0.005), ly, nz * (hw + 0.005), 0, nx ? Math.PI / 2 : 0, sgn * 0.62), jitter: 0 }));
    }
    L.push(part(new T.BoxGeometry(0.34, 0.05, 0.34), PAL.woodDark, { m: M(lx, ly + 0.2, 0), jitter: 0.004 }));
    L.push(part(new T.ConeGeometry(0.28, 0.14, 4), PAL.iron, { m: M(lx, ly + 0.29, 0, 0, Math.PI / 4, 0), jitter: 0 }));
    L.push(part(new T.BoxGeometry(0.1, 0.07, 0.1), PAL.iron, { m: M(lx, ly + 0.38, 0), jitter: 0 }));
    L.push(part(new T.CylinderGeometry(0.03, 0.035, 0.12, 6), PAL.bone, { m: M(lx, ly - 0.1, 0), jitter: 0, ao: false }));
    G.push(part(new T.ConeGeometry(0.022, 0.07, 5), '#1b2024', { m: M(lx, ly - 0.005, 0), jitter: 0 }));
    // красные ленты-обереги, камни, трава
    L.push(part(new T.BoxGeometry(0.06, 0.4, 0.02), PAL.red, { m: M(0.05, 1.35, pw / 2 + 0.02, 0.05, 0, 0.1), jitter: 0.005 }));
    L.push(part(new T.BoxGeometry(0.05, 0.32, 0.02), PAL.red, { m: M(-0.05, 1.38, pw / 2 + 0.02, -0.05, 0, -0.15), jitter: 0.005 }));
    rock(L, -0.3, 0, 0.25, 0.26);
    rock(L, 0.25, 0, -0.3, 0.2);
    rock(L, 0.3, 0, 0.32, 0.16, PAL.stoneDark);
    tuft(L, -0.32, 0, -0.22, 4, 0.4);
    tuft(L, 0.38, 0, 0.05, 3, 0.35);
    g.add(facetGroup(L));
    g.add(glassMesh(G));
    addGlowLight(g, lx, ly, 0.05, 2.0, 9);
    return g;
  }

  // ---------- поленница ----------
  function buildWoodpile() {
    seed = 57;
    const L = [];
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 6 - (row === 3 ? 2 : 0); i++) {
        const r = 0.11 + rand() * 0.03;
        logWithRings(L, 0.15 + i * 0.25 + (row % 2) * 0.12, 0.12 + row * 0.22, 0.4 + (rand() - 0.5) * 0.08, 0.8, r, (rand() - 0.5) * 0.08, rand() < 0.5 ? PAL.woodLight : PAL.wood);
      }
    }
    for (const x of [-0.05, 1.6]) for (const z of [0.05, 0.75]) {
      L.push(part(new T.CylinderGeometry(0.05, 0.06, 1.1, 6), PAL.woodDark, { m: M(x, 0.55, z), tex: 'wood', axis: [0, 1, 0] }));
    }
    return facetGroup(L);
  }

  // ---------- рельеф: подклетки 1 м, ступень 2,5 м ----------
  function buildTerrain() {
    seed = 7;
    const N = 16, LEVEL = 2.5, EDGE = -3.2;
    const up = new Set(['8,9', '8,10', '9,10']);
    const down = new Set(['7,0', '7,1', '6,0', '7,15']);
    const path = new Set(['11,8', '12,8', '12,9', '13,9', '13,10', '13,3', '14,3', '14,4', '15,4']);
    const key = (i, j) => i + ',' + j;
    const isRamp = (i, j) => i >= 8 && i <= 12 && j >= 2 && j <= 3;
    const isRiver = (i, j) => i >= 8 && j >= 11 && j <= 12;
    const levelOf = (i, j) => {
      if (isRiver(i, j)) return -0.8;
      if (up.has(key(i, j))) return LEVEL;
      if (down.has(key(i, j))) return 0;
      return i < 8 ? LEVEL : 0;
    };
    const inside = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
    const cornerY = (i, j, cx, cz) => {
      if (!inside(i, j)) return EDGE;
      const h = isRamp(i, j) ? LEVEL - (cx - 8) * 0.5 : levelOf(i, j);
      return h + (hash3(cx * 1.7, Math.round(h * 4), cz * 2.3) - 0.5) * 0.12;
    };

    const buckets = { grass: [[], []], dirt: [[], []], cliff: [[], []] };
    const tri = (bucket, a, b, c, color, outward) => {
      const ab = new T.Vector3().subVectors(b, a), ac = new T.Vector3().subVectors(c, a);
      if (new T.Vector3().crossVectors(ab, ac).dot(outward) < 0) [b, c] = [c, b];
      const [pos, col] = buckets[bucket];
      for (const v of [a, b, c]) pos.push(v.x, v.y, v.z);
      for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b);
    };
    const tone = (hex, vary = 0.12) => lin(hex).multiplyScalar(1 - vary + rand() * vary * 2);
    const UP = new T.Vector3(0, 1, 0);
    const D = [];

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const P = (cx, cz) => new T.Vector3(cx, cornerY(i, j, cx, cz), cz);
        const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
        const river = isRiver(i, j), dirt = isRamp(i, j) || path.has(key(i, j));
        const bucket = river || dirt ? 'dirt' : 'grass';
        const hex = river ? PAL.mud : dirt ? PAL.dirt : rand() < 0.3 ? PAL.grassLight : PAL.grass;
        tri(bucket, a, b, c, tone(hex), UP);
        tri(bucket, a, c, d, tone(hex), UP);

        const dirs = [
          [1, 0, [i + 1, j], [i + 1, j + 1]],
          [-1, 0, [i, j + 1], [i, j]],
          [0, 1, [i + 1, j + 1], [i, j + 1]],
          [0, -1, [i, j], [i + 1, j]],
        ];
        for (const [dx, dz, e0, e1] of dirs) {
          const ni = i + dx, nj = j + dz;
          const top0 = cornerY(i, j, e0[0], e0[1]), top1 = cornerY(i, j, e1[0], e1[1]);
          const bot0 = cornerY(ni, nj, e0[0], e0[1]), bot1 = cornerY(ni, nj, e1[0], e1[1]);
          if (top0 - bot0 < 0.05 && top1 - bot1 < 0.05) continue;
          const out = new T.Vector3(dx, 0, dz);
          const drop = Math.max(top0 - bot0, top1 - bot1);
          const rowsN = Math.max(1, Math.ceil(drop / 0.55));
          const colsN = 3;
          const grid = [];
          for (let s = 0; s <= rowsN; s++) {
            grid.push([]);
            for (let t = 0; t <= colsN; t++) {
              const u = t / colsN, v = s / rowsN;
              const x = e0[0] + (e1[0] - e0[0]) * u, z = e0[1] + (e1[1] - e0[1]) * u;
              const yb = bot0 + (bot1 - bot0) * u, yt = top0 + (top1 - top0) * u;
              const y = yb + (yt - yb) * v;
              const inner = s > 0 && s < rowsN && t > 0 && t < colsN;
              const push = inner ? (hash3(x * 3.1, y * 2.3, z * 1.7) - 0.3) * 0.36 : 0;
              grid[s].push(new T.Vector3(x + dx * push, y, z + dz * push));
            }
          }
          for (let s = 0; s < rowsN; s++) {
            for (let t = 0; t < colsN; t++) {
              const p00 = grid[s][t], p01 = grid[s][t + 1], p10 = grid[s + 1][t], p11 = grid[s + 1][t + 1];
              const midY = (p00.y + p11.y) / 2;
              let hex = midY < -0.9 ? (rand() < 0.2 ? PAL.stoneDark : PAL.soil) : rand() < 0.3 ? PAL.stoneDark : PAL.rock;
              if (s === rowsN - 1 && midY > -0.9 && rand() < 0.5) hex = PAL.moss;
              tri('cliff', p00, p01, p11, tone(hex, 0.16), out);
              tri('cliff', p00, p11, p10, tone(hex, 0.16), out);
            }
          }
          // кромка обрыва: корни и трава, у подножия — галька
          if (drop > 1 && top0 > -0.5) {
            for (let q = 0; q < 2; q++) {
              if (rand() < 0.45) {
                const u = 0.15 + rand() * 0.7;
                const x = e0[0] + (e1[0] - e0[0]) * u, z = e0[1] + (e1[1] - e0[1]) * u, y = top0 + (top1 - top0) * u;
                const len = 0.5 + rand() * 0.8;
                D.push(part(new T.CylinderGeometry(0.02, 0.045, len, 4), PAL.bark, { m: M(x + dx * 0.08, y - len / 2 + 0.05, z + dz * 0.08, dz * 0.25, 0, -dx * 0.25), jitter: 0.01, ao: false, tex: 'bark', axis: [0, 1, 0] }));
              }
            }
            for (let q = 0; q < 3; q++) {
              const u = rand();
              const x = e0[0] + (e1[0] - e0[0]) * u, z = e0[1] + (e1[1] - e0[1]) * u, y = top0 + (top1 - top0) * u;
              D.push(part(new T.ConeGeometry(0.05, 0.35 + rand() * 0.2, 3), rand() < 0.5 ? PAL.grassLight : PAL.moss, { m: M(x + dx * 0.05, y + 0.1, z + dz * 0.05, dz * 0.6, rand() * 3, -dx * 0.6), jitter: 0, ao: false, vary: 0.18 }));
            }
            if (inside(ni, nj) && rand() < 0.6) {
              const u = rand();
              const x = e0[0] + (e1[0] - e0[0]) * u, z = e0[1] + (e1[1] - e0[1]) * u;
              const by = bot0 + (bot1 - bot0) * u;
              const pr = 0.08 + rand() * 0.1;
              D.push(part(new T.IcosahedronGeometry(pr, 0), PAL.stone, { m: M(x + dx * (pr + 0.1), by + pr * 0.4, z + dz * (pr + 0.1), rand() * 3, rand() * 3, 0), jitter: pr * 0.2, ao: false, tex: 'stone' }));
            }
          }
        }
      }
    }

    const group = new T.Group();
    Object.entries(buckets).forEach(([tex, [pos, col]]) => {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      geo.computeVertexNormals();
      finalize(geo, null);
      const mesh = new T.Mesh(geo, matFor(tex));
      trackLum(mesh.material, geo);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      group.add(mesh);
    });

    // растительность и мелочь
    for (let n = 0; n < 220; n++) {
      const i = Math.floor(rand() * N), j = Math.floor(rand() * N);
      if (isRamp(i, j) || isRiver(i, j) || path.has(key(i, j))) continue;
      const x = i + 0.15 + rand() * 0.7, z = j + 0.15 + rand() * 0.7;
      tuft(D, x, cornerY(i, j, i, j), z, 3 + Math.floor(rand() * 3), 0.3 + rand() * 0.2);
    }
    for (const [x, z] of [[9.3, 6.2], [14.6, 6.8], [10.2, 14.3], [15.2, 13.9], [2.5, 11.2], [5.8, 13.2], [0.8, 8.8], [12.2, 5.2], [6.6, 2.2]]) {
      const i = Math.floor(x), j = Math.floor(z);
      fern(D, x, cornerY(i, j, i, j), z, 0.8 + rand() * 0.4);
    }
    mushrooms(D, 9.6, 0, 14.6);
    mushrooms(D, 3.6, LEVEL, 12.0);
    logWithRings(D, 14.6, 0.14, 6.0, 2.2, 0.16, 0.6);
    group.add(facetGroup(D));

    // вода: лоуполи-волны и водопад со среза карты
    const waterMat = new T.MeshStandardMaterial({ color: lin('#1f4a4c'), roughness: 0.2, metalness: 0, envMapIntensity: 1.0, transparent: true, opacity: 0.88, flatShading: true });
    const water = new T.Mesh(new T.PlaneGeometry(8, 2, 16, 4), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(12, -0.38, 12);
    water.receiveShadow = true;
    const fallMat = new T.MeshStandardMaterial({ color: lin('#78a8a4'), roughness: 0.3, transparent: true, opacity: 0.8, flatShading: true, side: T.DoubleSide });
    const fall = new T.Mesh(new T.PlaneGeometry(2, 2.85, 4, 10), fallMat);
    fall.rotation.y = Math.PI / 2;
    fall.position.set(16.04, -1.8, 12);
    group.add(water, fall);

    // лестница с обрыва, мост через реку, камни
    const S = [];
    const steps = 7, stepRise = LEVEL / (steps + 1), stepRun = 0.4;
    for (let k = 0; k < steps; k++) {
      const top = LEVEL - (k + 1) * stepRise;
      S.push(part(new T.BoxGeometry(0.42, 0.08, 1.0), PAL.woodLight, { m: M(8 + (k + 0.5) * stepRun, top - 0.04, 7.5), jitter: 0.008, moss: 0.2, base: top - 1, tex: 'wood', axis: [0, 0, 1] }));
    }
    const runL = (steps + 1) * stepRun, strL = Math.hypot(runL, LEVEL), strA = Math.atan2(LEVEL, runL);
    for (const z of [7.02, 7.98]) {
      S.push(part(new T.BoxGeometry(strL, 0.24, 0.08), PAL.woodDark, { m: M(8 + runL / 2, LEVEL / 2 - 0.05, z, 0, 0, -strA), jitter: 0.008, tex: 'wood', axis: [1, 0, 0] }));
    }
    S.push(part(new T.CylinderGeometry(0.06, 0.06, 1.1, 6), PAL.wood, { m: M(8.05, LEVEL + 0.55, 7.98), tex: 'wood', axis: [0, 1, 0] }));
    S.push(part(new T.CylinderGeometry(0.06, 0.06, 1.1, 6), PAL.wood, { m: M(8 + runL, 0.55, 7.98), tex: 'wood', axis: [0, 1, 0] }));
    S.push(part(new T.BoxGeometry(strL, 0.06, 0.06), PAL.wood, { m: M(8 + runL / 2, LEVEL / 2 + 1.0, 7.98, 0, 0, -strA), tex: 'wood', axis: [1, 0, 0] }));

    for (const x of [13.05, 14.35]) S.push(part(new T.BoxGeometry(0.14, 0.16, 3.3), PAL.woodDark, { m: M(x, 0.1, 12), tex: 'wood', axis: [0, 0, 1] }));
    for (let z = 10.45; z < 13.55; z += 0.29) {
      S.push(part(new T.BoxGeometry(1.55, 0.06, 0.26), PAL.woodLight, { m: M(13.7, 0.22, z, 0, (rand() - 0.5) * 0.05, 0), jitter: 0.01, moss: 0.2, tex: 'wood', axis: [1, 0, 0] }));
    }
    for (const x of [13.0, 14.4]) {
      for (const z of [10.5, 13.5]) S.push(part(new T.CylinderGeometry(0.07, 0.07, 1.0, 6), PAL.wood, { m: M(x, 0.6, z), tex: 'wood', axis: [0, 1, 0] }));
      S.push(part(new T.BoxGeometry(0.07, 0.07, 3.1), PAL.wood, { m: M(x, 1.05, 12), tex: 'wood', axis: [0, 0, 1] }));
    }
    for (const [x, y, z, s] of [[8.5, 0, 5.3, 0.45], [9.3, 0, 1.2, 0.35], [12.2, 0, 14.3, 0.5], [3.1, LEVEL, 11.6, 0.4], [6.9, LEVEL, 12.6, 0.3], [15.2, 0, 1.0, 0.4], [8.4, 0, 13.6, 0.3], [0.6, LEVEL, 14.8, 0.5]]) {
      rock(S, x, y, z, s);
    }
    group.add(facetGroup(S));
    return { group, water, fall, LEVEL };
  }

  // ---------- подставка для одиночного показа ----------
  function plate(w, d) {
    seed = 3;
    const L = [];
    // дёрн: мягкие крупные пятна тона вместо случайных граней (правило «спокойная роспись»)
    const pf = (x, z) => Math.sin(x * 0.55 + Math.sin(z * 0.4) * 1.3) * 0.55 + Math.sin(z * 0.62 - x * 0.31 + 1.7) * 0.45;
    L.push(tint(tint(part(new T.BoxGeometry(w, 0.12, d, Math.ceil(w * 2), 1, Math.ceil(d * 2)), PAL.grass, { m: M(w / 2, -0.06, d / 2), jitter: 0.03, ao: false, vary: 0.06, tex: 'grass' }),
      (x, y, z) => 0.3 + pf(x, z) * 0.4, PAL.grassLight), (x, y, z) => Math.max(0, pf(z * 1.7 + 11, x * 1.7 - 5) - 0.55) * 1.5, PAL.moss));
    L.push(part(new T.BoxGeometry(w, 0.5, d, Math.ceil(w), 2, Math.ceil(d)), PAL.soil, { m: M(w / 2, -0.37, d / 2), jitter: 0.04, ao: false, vary: 0.14, tex: 'cliff' }));
    for (let i = 0; i < w * d * 1.5; i++) tuft(L, 0.2 + rand() * (w - 0.4), 0, 0.2 + rand() * (d - 0.4), 3, 0.3 + rand() * 0.15);
    return facetGroup(L);
  }

  // ---------- кит для новых моделей: те же функции и параметры, что у стенда ----------
  window.LPK = {
    T, PAL, TEX, TEX_SCALE, GPT_SCALE, hash3, lin, M, part, tint, merge, facetGroup, glassMesh, addGlowLight,
    rand: () => rand(), setSeed: (v) => { seed = v; },
    rock, tuft, fern, mushrooms, logWithRings, plate, paintMaterial, finalize, trackLum, glassMat,
    timeU, windU, paintU, edgeU,
    buildHuman, buildHut, buildSpruce, buildLanternPost, buildWoodpile, buildTerrain,
  };
})();
