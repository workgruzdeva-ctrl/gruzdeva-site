/* ============================================================
   share-utils.js — единая отрисовка PNG для сторис
   Гарантирует: цифры влезают в карточки + везде корона-птичка
   ============================================================ */

window.ShareUtils = (function(){

  /* ====== Прелоад «Королевы стаи» (готовая PNG из m/grp/birds/) ======
     Путь вычисляем относительно share-utils.js: он лежит в /challenge/,
     значит до /m/grp/birds/ — на один уровень вверх.
     PNG ~320 КБ грузится за <1 сек, поэтому к моменту первого share-клика
     она будет готова. Если по какой-то причине не загрузилась —
     drawCrownedBird сделает fallback на canvas-арт. */
  const _birdImg = new Image();
  try {
    const _self = document.currentScript || document.querySelector('script[src*="share-utils.js"]');
    const _baseUrl = _self ? new URL(_self.src) : new URL(location.href);
    _birdImg.src = new URL('../m/grp/birds/09_koroleva_stai.png', _baseUrl).href;
  } catch(e) {
    _birdImg.src = '../m/grp/birds/09_koroleva_stai.png';
  }

  /* ====== Персональные птицы для share-картинок ======
     На каждый уровень — массив объектов {file, name, phrase}.
     Уровень («low»/«mid»/«high») вычисляется в day-файле по результату теста,
     внутри уровня выбирается случайный персонаж.
     Префикс «сегодня ты —» отрисовывается отдельно в buildShareCanvas. */
  const _CHARS = {
    low: [
      { file: 'levels/low-zhuk.png',       name: 'Жук-невывожук',          phrase: 'Сегодня ты сделала, что смогла. Чмок тебя в нос.' },
      { file: 'levels/low-elezhevika.png', name: 'Ележевика',              phrase: 'Еле-еле, но ягодка.' },
      { file: 'levels/low-myata.png',      name: 'Мята, немного помята',   phrase: 'Не сломалась, а примялась.' },
    ],
    mid: [
      { file: 'levels/mid-utka.png',    name: 'Утка-Незабудка',  phrase: 'Летишь не идеально, но вполне уверенно.' },
      { file: 'levels/mid-korolek.png', name: 'Королёк-нормалёк', phrase: 'Иногда путаешься, но в целом находишь дорогу к хлебушку.' },
      { file: 'levels/mid-ptenets.png', name: 'Птенец-молодец',  phrase: 'Справилась не без приключений, но справилась.' },
    ],
    high: [
      { file: 'levels/high-gus.png',   name: 'Гусь-всемогусь', phrase: 'Тебе сегодня всё по плечу.' },
      // позже добавятся:
      // { file: 'levels/high-rock.png', name: 'Гусь-за-попу-кусь', phrase: 'Быстро, цепко, уверенно.' },
      // { file: 'levels/high-zhar.png', name: 'Жар-птица',         phrase: 'Ты огонь, детка.' },
    ],
  };

  // Подключаем Caveat (рукописный шрифт для весёлых имён персонажей)
  if (!document.querySelector('link[href*="Caveat"]')) {
    const _caveatLink = document.createElement('link');
    _caveatLink.rel = 'stylesheet';
    _caveatLink.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap';
    document.head.appendChild(_caveatLink);
  }

  // Прелоадим все доступные PNG персонажей (URL вычисляем от share-utils.js)
  const _charImages = {};
  const _charReady = {};
  try {
    const _selfC = document.currentScript || document.querySelector('script[src*="share-utils.js"]');
    const _baseUrlC = _selfC ? new URL(_selfC.src) : new URL(location.href);
    for (const lvl of ['low','mid','high']) {
      for (const c of _CHARS[lvl]) {
        const img = new Image();
        img.src = new URL(c.file, _baseUrlC).href;
        _charImages[c.file] = img;
        _charReady[c.file] = new Promise(function(res){
          if (img.complete && img.naturalWidth > 0) return res();
          img.onload = res; img.onerror = res;
        });
      }
    }
  } catch(e) {}

  // Случайный выбор персонажа по уровню. seed — опционально, для воспроизводимости.
  function pickCharacter(level, seed){
    const arr = _CHARS[level] || _CHARS.mid;
    let idx;
    if (typeof seed === 'number') {
      idx = Math.abs(seed) % arr.length;
    } else {
      idx = Math.floor(Math.random() * arr.length);
    }
    return arr[idx];
  }

  // Простой word-wrap по ширине canvas-текста (для фразы под персонажем).
  function wrap(ctx, text, maxW){
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* Рисует текст с автоматическим уменьшением шрифта если не влезает в maxW.
     baseFont: например "600 120px 'Fraunces', 'Georgia', serif"
  */
  function drawFitText(ctx, text, x, y, maxW, baseFont, color, align){
    ctx.fillStyle = color;
    ctx.textAlign = align || 'center';
    ctx.font = baseFont;
    let size = parseInt((baseFont.match(/(\d+)px/) || ['',0])[1], 10) || 60;
    const minSize = 28;
    while(ctx.measureText(text).width > maxW && size > minSize){
      size -= 4;
      ctx.font = baseFont.replace(/\d+px/, size + 'px');
    }
    ctx.fillText(text, x, y);
  }

  /* Рисует «королеву стаи».
     cx, cy — центр, r — радиус (примерно половина высоты птички).
     Если готовая PNG (m/grp/birds/09_koroleva_stai.png) уже загружена — рисуем её.
     Иначе fallback на canvas-арт (нестрашно: первый клик в дне обычно
     случается через несколько секунд после загрузки страницы). */
  function drawCrownedBird(ctx, cx, cy, r){
    if (_birdImg && _birdImg.complete && _birdImg.naturalWidth > 0) {
      // PNG-1200×1200 с прозрачным фоном; центрируем по (cx, cy), размер = 2.4r
      const SIZE = r * 2.4;
      ctx.drawImage(_birdImg, cx - SIZE / 2, cy - SIZE / 2, SIZE, SIZE);
      return;
    }

    // ===== Fallback на canvas-арт (если PNG не успела загрузиться) =====
    // тень
    ctx.fillStyle = 'rgba(94,107,74,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r + 12, r*0.7, 10, 0, 0, Math.PI*2);
    ctx.fill();

    // плащ (зелёный) — справа от тела
    ctx.fillStyle = '#7E8C66';
    ctx.strokeStyle = '#5E6B4A';
    ctx.lineWidth = Math.max(2, r*0.04);
    ctx.beginPath();
    ctx.moveTo(cx + r*0.6, cy + r*0.1);
    ctx.bezierCurveTo(cx + r*1.6, cy + r*0.3, cx + r*1.9, cy + r*1.2, cx + r*1.6, cy + r*1.9);
    ctx.bezierCurveTo(cx + r*1.3, cy + r*2.2, cx + r*0.8, cy + r*2.1, cx + r*0.6, cy + r*1.7);
    ctx.bezierCurveTo(cx + r*1.1, cy + r*1.2, cx + r*1.0, cy + r*0.6, cx + r*0.4, cy + r*0.3);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // тело (овал-яйцо)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2A2620';
    ctx.lineWidth = Math.max(2.5, r*0.045);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r*1.05, 0, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    // лапки
    ctx.strokeStyle = '#F5C400';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3, r*0.06);
    ctx.beginPath(); ctx.moveTo(cx - r*0.3, cy + r*1.0); ctx.lineTo(cx - r*0.3, cy + r*1.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r*0.3, cy + r*1.0); ctx.lineTo(cx + r*0.3, cy + r*1.25); ctx.stroke();

    // глазки (закрытые щёчки = две дуги)
    ctx.strokeStyle = '#2A2620';
    ctx.lineWidth = Math.max(2, r*0.035);
    ctx.beginPath();
    ctx.arc(cx - r*0.32, cy - r*0.05, r*0.12, 0.1*Math.PI, 0.9*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + r*0.32, cy - r*0.05, r*0.12, 0.1*Math.PI, 0.9*Math.PI);
    ctx.stroke();

    // щёчки
    ctx.fillStyle = '#F6C6B4';
    ctx.beginPath(); ctx.ellipse(cx - r*0.55, cy + r*0.18, r*0.13, r*0.08, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r*0.55, cy + r*0.18, r*0.13, r*0.08, 0, 0, Math.PI*2); ctx.fill();

    // клюв
    ctx.fillStyle = '#F5C400';
    ctx.strokeStyle = '#2A2620';
    ctx.lineWidth = Math.max(2, r*0.03);
    ctx.beginPath();
    ctx.moveTo(cx - r*0.12, cy + r*0.10);
    ctx.lineTo(cx + r*0.12, cy + r*0.10);
    ctx.lineTo(cx, cy + r*0.28);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // корона — 3 зубчика + ободок
    ctx.fillStyle = '#F5C400';
    ctx.strokeStyle = '#2A2620';
    ctx.lineWidth = Math.max(2.5, r*0.04);
    const cw = r*1.2;       // ширина короны
    const ch = r*0.45;      // высота зубцов
    const cby = cy - r*1.05; // нижний край короны (база)
    const cbx = cx - cw/2;
    ctx.beginPath();
    ctx.moveTo(cbx, cby);
    ctx.lineTo(cbx + cw*0.15, cby - ch*0.8);
    ctx.lineTo(cbx + cw*0.30, cby - ch*0.2);
    ctx.lineTo(cbx + cw*0.5,  cby - ch*1.0);
    ctx.lineTo(cbx + cw*0.70, cby - ch*0.2);
    ctx.lineTo(cbx + cw*0.85, cby - ch*0.8);
    ctx.lineTo(cbx + cw, cby);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // ободок
    ctx.beginPath();
    ctx.moveTo(cbx, cby);
    ctx.lineTo(cbx + cw, cby);
    ctx.stroke();
    // камень в центре короны
    ctx.fillStyle = '#D9694A';
    ctx.beginPath();
    ctx.arc(cx, cby - ch*0.3, r*0.06, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();

    // палочка-волшебная (слева, в крыле)
    ctx.strokeStyle = '#F5C400';
    ctx.lineWidth = Math.max(3, r*0.05);
    ctx.beginPath();
    ctx.moveTo(cx - r*0.55, cy + r*0.4);
    ctx.lineTo(cx - r*1.2, cy - r*0.5);
    ctx.stroke();
    // звезда
    ctx.fillStyle = '#F5C400';
    ctx.strokeStyle = '#2A2620';
    ctx.lineWidth = Math.max(2, r*0.03);
    drawStar(ctx, cx - r*1.25, cy - r*0.55, r*0.22, 5);
    ctx.fill(); ctx.stroke();

    // блёстки
    ctx.fillStyle = '#F5C400';
    drawSpark(ctx, cx + r*1.6, cy - r*0.4, r*0.14);
    drawSpark(ctx, cx + r*1.8, cy + r*0.4, r*0.10);
  }

  function drawStar(ctx, cx, cy, r, spikes){
    let rot = -Math.PI/2;
    const step = Math.PI / spikes;
    const inner = r*0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    for(let i = 0; i < spikes; i++){
      ctx.lineTo(cx + Math.cos(rot)*r, cy + Math.sin(rot)*r);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot)*inner, cy + Math.sin(rot)*inner);
      rot += step;
    }
    ctx.lineTo(cx, cy - r);
    ctx.closePath();
  }

  function drawSpark(ctx, cx, cy, r){
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r*0.3, cy - r*0.3);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx + r*0.3, cy + r*0.3);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r*0.3, cy + r*0.3);
    ctx.lineTo(cx - r, cy);
    ctx.lineTo(cx - r*0.3, cy - r*0.3);
    ctx.closePath();
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  /* Главная функция: рисует единый «бинго-постер» для дня.
     async — потому что ждёт прелоад PNG персонажа (если level передан)
     и загрузку шрифта Caveat (если ещё не приехал). */
  async function buildShareCanvas({ dayLabel, title, subtitle, stats, userName, level }){
    // Гарантируем, что Caveat и прочие веб-шрифты успели загрузиться
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch(e){}
    }
    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#F4EEE2');
    grad.addColorStop(1, '#FBF7EE');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // top dark band
    ctx.fillStyle = '#2A2620';
    ctx.fillRect(0, 0, W, 200);
    ctx.beginPath(); ctx.arc(60, 100, 16, 0, Math.PI*2);
    ctx.fillStyle = '#F5C400'; ctx.fill();
    ctx.fillStyle = '#FBF7EE';
    ctx.font = '700 30px "Manrope", sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Валя Груздева', 90, 112);

    if (level && _CHARS[level] && _CHARS[level].length > 0) {
      // ====== НОВЫЙ ЛЕЙАУТ С ПЕРСОНАЖЕМ ======
      const char = pickCharacter(level);
      await (_charReady[char.file] || Promise.resolve());
      const charImg = _charImages[char.file];

      // dayLabel
      ctx.fillStyle = '#5E6B4A';
      ctx.font = '700 26px "Manrope", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`• ${dayLabel.toUpperCase()}`, W/2, 250);

      // "Сегодня ты —" (мелкий префикс над картинкой)
      ctx.fillStyle = '#5A5042';
      ctx.font = '500 28px "Manrope", sans-serif';
      ctx.fillText('сегодня ты —', W/2, 320);

      // ПЕРСОНАЖ
      if (charImg && charImg.naturalWidth > 0) {
        const SIZE = 360;
        ctx.drawImage(charImg, (W - SIZE)/2, 350, SIZE, SIZE);
      }

      // ИМЯ персонажа — крупным Caveat (весёлый рукописный)
      drawFitText(ctx, char.name, W/2, 780, W - 100,
        '700 80px "Caveat", cursive', '#D9694A', 'center');

      // ФРАЗА (с word-wrap)
      ctx.font = 'italic 500 28px "Fraunces", "Georgia", serif';
      ctx.fillStyle = '#5A5042';
      ctx.textAlign = 'center';
      const phraseLines = wrap(ctx, char.phrase, W - 160);
      let py = 850;
      for (const line of phraseLines) {
        ctx.fillText(line, W/2, py);
        py += 36;
      }

      // title теста (мелким — не дублирует имя)
      drawFitText(ctx, title, W/2, py + 40, W - 120,
        '600 36px "Fraunces", "Georgia", serif', '#2A2620', 'center');

      // stats — переместить с учётом высоты phrase
      const cardY = py + 100;
      const cardH = 540;
      if (stats && stats.length > 0) {
        ctx.fillStyle = '#FBF7EE';
        roundRect(ctx, 80, cardY, W - 160, cardH, 40); ctx.fill();
        ctx.strokeStyle = '#E6DECE'; ctx.lineWidth = 3;
        roundRect(ctx, 80, cardY, W - 160, cardH, 40); ctx.stroke();
        const cellW = (W - 160) / 2;
        const cellH = cardH / 2;
        const valueMaxW = cellW - 40;
        stats.forEach((s, i) => {
          const cx = 80 + cellW * (i % 2) + cellW/2;
          const cy = cardY + cellH * Math.floor(i / 2) + cellH/2;
          drawFitText(ctx, String(s.v ?? '—'), cx, cy + 14, valueMaxW,
            '600 90px "Fraunces", "Georgia", serif', '#D9694A', 'center');
          const labelMaxW = cellW - 30;
          drawFitText(ctx, (s.l || '').toUpperCase(), cx, cy + 76, labelMaxW,
            '700 22px "Manrope", sans-serif', '#8C8A77', 'center');
        });
      }
    } else {
      // ====== СТАРЫЙ ЛЕЙАУТ (back-compat, для финала и где нет уровня) ======
      // crowned bird
      drawCrownedBird(ctx, W/2, 360, 110);

      // day label
      ctx.fillStyle = '#5E6B4A';
      ctx.font = '700 26px "Manrope", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`• ${dayLabel.toUpperCase()}`, W/2, 580);

      // title
      drawFitText(ctx, title, W/2, 670, W - 120,
        '600 78px "Fraunces", "Georgia", serif', '#2A2620', 'center');

      // subtitle (имя + контекст)
      if(subtitle){
        drawFitText(ctx, subtitle, W/2, 745, W - 140,
          'italic 500 42px "Fraunces", "Georgia", serif', '#D9694A', 'center');
      }

      // stats card
      if (stats && stats.length > 0) {
        const cardY = 830, cardH = 700;
        ctx.fillStyle = '#FBF7EE';
        roundRect(ctx, 80, cardY, W - 160, cardH, 40); ctx.fill();
        ctx.strokeStyle = '#E6DECE'; ctx.lineWidth = 3;
        roundRect(ctx, 80, cardY, W - 160, cardH, 40); ctx.stroke();

        const cellW = (W - 160) / 2;
        const cellH = cardH / 2;
        const valueMaxW = cellW - 40;
        stats.forEach((s, i) => {
          const cx = 80 + cellW * (i % 2) + cellW/2;
          const cy = cardY + cellH * Math.floor(i / 2) + cellH/2;

          // value
          drawFitText(ctx, String(s.v ?? '—'), cx, cy + 18, valueMaxW,
            '600 110px "Fraunces", "Georgia", serif', '#D9694A', 'center');

          // label
          ctx.fillStyle = '#8C8A77';
          ctx.font = '700 24px "Manrope", sans-serif';
          ctx.textAlign = 'center';
          const labelMaxW = cellW - 30;
          drawFitText(ctx, (s.l || '').toUpperCase(), cx, cy + 88, labelMaxW,
            '700 24px "Manrope", sans-serif', '#8C8A77', 'center');
        });
      }
    }

    // bottom slogan
    ctx.fillStyle = '#2A2620';
    ctx.font = '600 56px "Fraunces", "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Стаей идти веселее', W/2, 1700);
    ctx.fillStyle = '#8C8A77';
    ctx.font = '500 30px "Manrope", sans-serif';
    ctx.fillText('challenge · @dr_gruzdeva', W/2, 1750);

    return canvas;
  }

  function downloadCanvas(canvas, filename){
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  /* === Web Audio beep — единый для всех мини-игр === */
  let audioCtx = null;
  function ensureAudio(){
    if(!audioCtx){
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e){ audioCtx = null; }
    }
    return audioCtx;
  }
  function tone(freq, dur, type, delay, vol){
    const ac = ensureAudio();
    if(!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    o.connect(g); g.connect(ac.destination);
    const t0 = ac.currentTime + (delay || 0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.20, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.04);
  }
  function beep(correct){
    if(correct){
      tone(660, 0.10, 'sine', 0,    0.20);
      tone(880, 0.14, 'sine', 0.05, 0.18);
    } else {
      tone(180, 0.22, 'sawtooth', 0, 0.18);
    }
  }
  function beepLapse(){
    // нейтральный «тик» — для PVT-лапса (длинный RT)
    tone(440, 0.08, 'square', 0, 0.10);
  }

  return {
    drawFitText, drawCrownedBird, roundRect,
    buildShareCanvas, downloadCanvas,
    pickCharacter,
    beep, beepLapse, ensureAudio,
  };
})();
