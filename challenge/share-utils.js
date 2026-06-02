/* ============================================================
   share-utils.js — единая отрисовка PNG для сторис
   Гарантирует: цифры влезают в карточки + везде корона-птичка
   ============================================================ */

window.ShareUtils = (function(){

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

  /* Рисует «королеву стаи» (упрощённый силуэт под лого).
     cx, cy — центр, r — радиус тела */
  function drawCrownedBird(ctx, cx, cy, r){
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

  /* Главная функция: рисует единый «бинго-постер» для дня */
  function buildShareCanvas({ dayLabel, title, subtitle, stats, userName }){
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
      // переносим лейбл если он длинный
      const labelMaxW = cellW - 30;
      drawFitText(ctx, (s.l || '').toUpperCase(), cx, cy + 88, labelMaxW,
        '700 24px "Manrope", sans-serif', '#8C8A77', 'center');
    });

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

  return {
    drawFitText, drawCrownedBird, roundRect,
    buildShareCanvas, downloadCanvas,
  };
})();
