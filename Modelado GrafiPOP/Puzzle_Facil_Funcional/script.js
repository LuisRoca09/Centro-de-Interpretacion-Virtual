(() => {
  const FULL_W = 3000;
  const FULL_H = 2249;

  // Rectángulos de encaje en coordenadas de la imagen completa.
  const piecesData = [
    { id: '21', rect: [0, 0, 1192, 971] },
    { id: '20', rect: [990, 0, 1010, 964] },
    { id: '22', rect: [1802, 0, 1209, 970] },
    { id: '19', rect: [0, 778, 1184, 952] },
    { id: '24', rect: [989, 778, 1010, 952] },
    { id: '23', rect: [1809, 779, 1201, 951] },
    { id: '17', rect: [0, 1532, 1191, 716] },
    { id: '25', rect: [978, 1531, 1030, 717] },
    { id: '18', rect: [1808, 1544, 1201, 704] },
  ];

  const menu = document.getElementById('menu');
  const game = document.getElementById('game');
  const startEasy = document.getElementById('startEasy');
  const backBtn = document.getElementById('backBtn');
  const board = document.getElementById('board');
  const tray = document.getElementById('tray');
  const timerEl = document.getElementById('timer');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const resumeBtn = document.getElementById('resumeBtn');
  const winOverlay = document.getElementById('winOverlay');
  const finalTime = document.getElementById('finalTime');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const finishBtn = document.getElementById('finishBtn');

  let startedAt = 0;
  let accumulatedMs = 0;
  let timerHandle = null;
  let paused = false;
  let running = false;
  let placedCount = 0;

  function formatTime(ms) {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    return `${min}:${String(sec % 60).padStart(2, '0')}`;
  }

  function elapsedMs() {
    if (!running || paused) return accumulatedMs;
    return accumulatedMs + (performance.now() - startedAt);
  }

  function renderTimer() {
    timerEl.textContent = formatTime(elapsedMs());
  }

  function startTimer() {
    stopTimer();
    accumulatedMs = 0;
    startedAt = performance.now();
    running = true;
    paused = false;
    timerHandle = setInterval(renderTimer, 250);
    renderTimer();
  }

  function stopTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  function pauseGame() {
    if (!running || paused) return;
    accumulatedMs = elapsedMs();
    paused = true;
    stopTimer();
    pauseOverlay.classList.remove('hidden');
  }

  function resumeGame() {
    if (!running || !paused) return;
    paused = false;
    startedAt = performance.now();
    timerHandle = setInterval(renderTimer, 250);
    pauseOverlay.classList.add('hidden');
  }

  function stageRect() {
    return game.getBoundingClientRect();
  }

  function boardMetrics() {
    const s = stageRect();
    const b = board.getBoundingClientRect();
    return {
      left: b.left - s.left,
      top: b.top - s.top,
      width: b.width,
      height: b.height,
    };
  }

  function targetFor(data) {
    const b = boardMetrics();
    const [x, y, w, h] = data.rect;
    return {
      left: b.left + (x / FULL_W) * b.width,
      top: b.top + (y / FULL_H) * b.height,
      width: (w / FULL_W) * b.width,
      height: (h / FULL_H) * b.height,
    };
  }

  function getStartPositions() {
    const s = stageRect();
    const t = tray.getBoundingClientRect();
    const trayLeft = t.left - s.left;
    const trayTop = t.top - s.top;
    const tw = t.width;
    const th = t.height;

    return [
      [0.02, 0.02], [0.44, 0.03], [0.18, 0.17],
      [0.00, 0.33], [0.43, 0.31], [0.18, 0.46],
      [0.01, 0.60], [0.43, 0.61], [0.18, 0.74],
    ].map(([xp, yp]) => ({
      left: trayLeft + xp * tw,
      top: trayTop + yp * th,
    }));
  }

  function createPieces() {
    tray.innerHTML = '';
    document.querySelectorAll('.piece').forEach(el => el.remove());
    placedCount = 0;
    board.classList.remove('has-piece');

    const starts = getStartPositions();
    // Orden ligeramente mezclado para que no aparezcan ya en secuencia.
    const order = [4, 7, 2, 0, 5, 8, 1, 6, 3];

    piecesData.forEach((data, i) => {
      const img = document.createElement('img');
      img.className = 'piece';
      img.src = `assets/piece-${data.id}.png`;
      img.alt = `Pieza ${i + 1}`;
      img.draggable = false;
      img.dataset.id = data.id;
      img.dataset.placed = 'false';
      img.dataset.dataIndex = String(i);
      game.appendChild(img);

      const target = targetFor(data);
      img.style.width = `${target.width}px`;
      img.style.height = `${target.height}px`;
      const start = starts[order[i]];
      img.style.left = `${start.left}px`;
      img.style.top = `${start.top}px`;
      img.dataset.startLeft = String(start.left);
      img.dataset.startTop = String(start.top);

      attachDrag(img, data);
    });
  }

  function attachDrag(img, data) {
    let pointerId = null;
    let offsetX = 0;
    let offsetY = 0;

    img.addEventListener('pointerdown', (e) => {
      if (paused || img.dataset.placed === 'true') return;
      pointerId = e.pointerId;
      img.setPointerCapture(pointerId);
      const s = stageRect();
      const r = img.getBoundingClientRect();
      offsetX = e.clientX - r.left;
      offsetY = e.clientY - r.top;
      img.classList.add('dragging');
      img.style.left = `${e.clientX - s.left - offsetX}px`;
      img.style.top = `${e.clientY - s.top - offsetY}px`;
      e.preventDefault();
    });

    img.addEventListener('pointermove', (e) => {
      if (pointerId !== e.pointerId || !img.classList.contains('dragging')) return;
      const s = stageRect();
      img.style.left = `${e.clientX - s.left - offsetX}px`;
      img.style.top = `${e.clientY - s.top - offsetY}px`;
    });

    const endDrag = (e) => {
      if (pointerId !== e.pointerId || !img.classList.contains('dragging')) return;
      img.classList.remove('dragging');
      try { img.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;

      const target = targetFor(data);
      const currentLeft = parseFloat(img.style.left);
      const currentTop = parseFloat(img.style.top);
      const currentCenterX = currentLeft + target.width / 2;
      const currentCenterY = currentTop + target.height / 2;
      const targetCenterX = target.left + target.width / 2;
      const targetCenterY = target.top + target.height / 2;
      const distance = Math.hypot(currentCenterX - targetCenterX, currentCenterY - targetCenterY);

      // Tolerancia equivalente a aprox. 12 % del ancho del tablero.
      const tolerance = boardMetrics().width * 0.12;
      if (distance <= tolerance) {
        snapPiece(img, target);
      }
    };

    img.addEventListener('pointerup', endDrag);
    img.addEventListener('pointercancel', endDrag);
  }

  function snapPiece(img, target) {
    img.style.left = `${target.left}px`;
    img.style.top = `${target.top}px`;
    img.style.width = `${target.width}px`;
    img.style.height = `${target.height}px`;
    img.dataset.placed = 'true';
    img.classList.add('placed');
    board.classList.add('has-piece');
    placedCount += 1;

    if (placedCount === piecesData.length) {
      accumulatedMs = elapsedMs();
      running = false;
      stopTimer();
      renderTimer();
      finalTime.textContent = formatTime(accumulatedMs);
      setTimeout(() => winOverlay.classList.remove('hidden'), 350);
    }
  }

  function resetGame() {
    winOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    startTimer();
    requestAnimationFrame(createPieces);
  }

  function showGame() {
    menu.classList.add('hidden');
    game.classList.remove('hidden');
    requestAnimationFrame(() => {
      resetGame();
    });
  }

  function showMenu() {
    stopTimer();
    running = false;
    paused = false;
    pauseOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    document.querySelectorAll('.piece').forEach(el => el.remove());
    game.classList.add('hidden');
    menu.classList.remove('hidden');
  }

  startEasy.addEventListener('click', showGame);
  backBtn.addEventListener('click', showMenu);
  resetBtn.addEventListener('click', resetGame);
  pauseBtn.addEventListener('click', pauseGame);
  resumeBtn.addEventListener('click', resumeGame);
  playAgainBtn.addEventListener('click', resetGame);
  finishBtn.addEventListener('click', showMenu);

  window.addEventListener('resize', () => {
    if (game.classList.contains('hidden')) return;
    document.querySelectorAll('.piece').forEach(img => {
      const data = piecesData[Number(img.dataset.dataIndex)];
      const target = targetFor(data);
      img.style.width = `${target.width}px`;
      img.style.height = `${target.height}px`;
      if (img.dataset.placed === 'true') {
        img.style.left = `${target.left}px`;
        img.style.top = `${target.top}px`;
      }
    });
  });
})();
