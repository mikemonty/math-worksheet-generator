(function () {
  const els = {
    // mode
    modeGrade: document.getElementById('modeGrade'),
    modeCustom: document.getElementById('modeCustom'),
    gradeControls: document.getElementById('gradeControls'),
    customControls: document.getElementById('customControls'),

    // grade fields
    grade: document.getElementById('gradeLevel'),
    allowTwoDigit: document.getElementById('allowTwoDigit'),
    twoDigitMax: document.getElementById('twoDigitMax'),

    // custom digit fields
    aMinDigits: document.getElementById('aMinDigits'),
    aMaxDigits: document.getElementById('aMaxDigits'),
    bMinDigits: document.getElementById('bMinDigits'),
    bMaxDigits: document.getElementById('bMaxDigits'),
    allowZero: document.getElementById('allowZero'),

    // common controls
    problemsCount: document.getElementById('problemsCount'),
    layout: document.getElementById('layout'),
    includeNameDate: document.getElementById('includeNameDate'),
    includeAnswerKey: document.getElementById('includeAnswerKey'),

    // manual
    manA: document.getElementById('manA'),
    manB: document.getElementById('manB'),
    addManual: document.getElementById('addManual'),
    manualList: document.getElementById('manualList'),

    // actions
    generateBtn: document.getElementById('generateBtn'),
    clearBtn: document.getElementById('clearBtn'),
    printBtn: document.getElementById('printBtn'),

    // pages
    worksheetTitle: document.getElementById('worksheetTitle'),
    worksheetSub: document.getElementById('worksheetSub'),
    nameDateLine: document.getElementById('nameDateLine'),
    problemsGrid: document.getElementById('problemsGrid'),

    answerPage: document.getElementById('answerPage'),
    answerSub: document.getElementById('answerSub'),
    answersGrid: document.getElementById('answersGrid'),

    // misc
    grade5Extras: document.getElementById('grade5Extras')
  };

  /** State */
  let manual = []; // [{a,b}]
  let lastGenerated = [];

  /** Utils */
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  function pow10(n){ return Math.pow(10, n); }
  function clampDigits(minD, maxD){
    const a = Math.max(1, Math.min(6, Number(minD) || 1));
    const b = Math.max(1, Math.min(6, Number(maxD) || 1));
    return {minD: Math.min(a, b), maxD: Math.max(a, b)};
  }
  function randNDigit(minDigits, maxDigits, allowZero=false){
    const d = randInt(minDigits, maxDigits);
    if (d === 1 && allowZero) {
      // 0–9 inclusive
      return randInt(0, 9);
    }
    const low = (d === 1) ? 1 : pow10(d - 1); // avoid leading zeros
    const high = pow10(d) - 1;
    return randInt(low, high);
  }

  /** Grade preset config */
  function gradeConfig(grade, allowTwoDigit, twoDigitMax) {
    if (grade === '3') {
      return { aMin: 0, aMax: 10, bMin: 0, bMax: 10, allow2x1: false, twoDigitMax: 0 };
    }
    if (grade === '4') {
      return { aMin: 0, aMax: 12, bMin: 0, bMax: 12, allow2x1: false, twoDigitMax: 0 };
    }
    // grade 5
    return {
      aMin: 0, aMax: 12, bMin: 0, bMax: 12,
      allow2x1: !!allowTwoDigit,
      twoDigitMax: Math.max(10, Math.min(99, Number(twoDigitMax) || 99))
    };
  }
  function makeRandomProblemFromGrade(cfg) {
    if (cfg.allow2x1 && Math.random() < 0.4) {
      const a = randInt(10, cfg.twoDigitMax);
      const b = randInt(2, 9);
      return { a, b };
    }
    const a = randInt(cfg.aMin, cfg.aMax);
    const b = randInt(cfg.bMin, cfg.bMax);
    return { a, b };
  }

  /** Custom digits generator */
  function makeRandomProblemFromDigits(aMinD, aMaxD, bMinD, bMaxD, allowZero){
    const a = randNDigit(aMinD, aMaxD, allowZero);
    const b = randNDigit(bMinD, bMaxD, allowZero);
    return { a, b };
  }

  function computeProduct(p) { return p.a * p.b; }

  /** Manual problems UI */
  function renderManualList() {
    els.manualList.innerHTML = '';
    manual.forEach((p, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${p.a} × ${p.b}</span>
        <span>
          <button data-idx="${idx}" class="removeBtn">Remove</button>
        </span>
      `;
      els.manualList.appendChild(li);
    });

    els.manualList.querySelectorAll('.removeBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.currentTarget.getAttribute('data-idx'));
        manual.splice(i, 1);
        renderManualList();
      });
    });
  }

  els.addManual.addEventListener('click', () => {
    const a = Number(els.manA.value);
    const b = Number(els.manB.value);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    manual.push({ a, b });
    els.manA.value = ''; els.manB.value = '';
    renderManualList();
  });

  /** Mode toggle UI */
  function syncModeUI(){
    const useGrade = els.modeGrade.checked;
    els.gradeControls.style.display = useGrade ? '' : 'none';
    els.customControls.style.display = useGrade ? 'none' : '';
    // keep grade5 extras visibility tied to grade selection
    els.grade5Extras.style.display = (useGrade && els.grade.value === '5') ? '' : 'none';
  }
  els.modeGrade.addEventListener('change', syncModeUI);
  els.modeCustom.addEventListener('change', syncModeUI);

  function toggleGrade5Extras() {
    els.grade5Extras.style.display = (els.modeGrade.checked && els.grade.value === '5') ? '' : 'none';
  }
  els.grade.addEventListener('change', toggleGrade5Extras);

  /** Even grid helpers */
  function setEvenGrid(container, count, layout, answers=false) {
    let cols = layout === 'vertical' ? 3 : 4;
    if (count <= 6) cols = Math.max(2, 2);
    if (count === 1) cols = 1;

    const rows = Math.ceil(count / cols);
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    if (answers) {
      container.style.gridTemplateColumns = `repeat(4, 1fr)`;
      container.style.gridTemplateRows = `repeat(${Math.ceil(count / 4)}, 1fr)`;
    }
  }

  /** Generate */
  function generate() {
    const count = Math.max(4, Math.min(120, Number(els.problemsCount.value) || 36));

    const out = [];
    const seen = new Set();
    const key = (p) => `${p.a}x${p.b}`;

    // Manual first (dedupe)
    manual.forEach(p => {
      const k = key(p);
      if (!seen.has(k)) { out.push({ a:p.a, b:p.b }); seen.add(k); }
    });

    // Mode-dependent random fill
    let guard = 0;
    if (els.modeGrade.checked) {
      const cfg = gradeConfig(els.grade.value, els.allowTwoDigit.checked, els.twoDigitMax.value);
      while (out.length < count && guard < 10000) {
        const p = makeRandomProblemFromGrade(cfg);
        const k = key(p);
        if (!seen.has(k)) { out.push(p); seen.add(k); }
        guard++;
      }
    } else {
      const aD = clampDigits(els.aMinDigits.value, els.aMaxDigits.value);
      const bD = clampDigits(els.bMinDigits.value, els.bMaxDigits.value);
      const allowZero = !!els.allowZero.checked;

      while (out.length < count && guard < 10000) {
        const p = makeRandomProblemFromDigits(aD.minD, aD.maxD, bD.minD, bD.maxD, allowZero);
        const k = key(p);
        if (!seen.has(k)) { out.push(p); seen.add(k); }
        guard++;
      }
    }

    lastGenerated = out;

    // Render worksheet
    renderWorksheet(out);

    // Answer key
    const includeKey = els.includeAnswerKey.checked;
    els.answerPage.setAttribute('aria-hidden', includeKey ? 'false' : 'true');
    els.answerPage.style.display = includeKey ? '' : 'none';
    if (includeKey) renderAnswerKey(out);

    // Headers (and Name/Date visibility, worksheet only)
    els.nameDateLine.style.display = els.includeNameDate.checked ? 'flex' : 'none';

    const layoutLabel = els.layout.value === 'vertical' ? 'Vertical' : 'Horizontal';
    const modeLabel = els.modeGrade.checked ? `Grade ${els.grade.value}` : customModeLabel();
    const countLabel = `${out.length} problems • ${layoutLabel}`;
    els.worksheetSub.textContent = `${modeLabel} • ${countLabel}`;
    els.answerSub.textContent = `${modeLabel} • Matching the worksheet`;
  }

  function customModeLabel(){
    const aD = clampDigits(els.aMinDigits.value, els.aMaxDigits.value);
    const bD = clampDigits(els.bMinDigits.value, els.bMaxDigits.value);
    const aTxt = (aD.minD === aD.maxD) ? `${aD.minD}-digit` : `${aD.minD}–${aD.maxD}-digit`;
    const bTxt = (bD.minD === bD.maxD) ? `${bD.minD}-digit` : `${bD.minD}–${bD.maxD}-digit`;
    return `${aTxt} × ${bTxt}${els.allowZero.checked ? ' (zeros allowed)' : ''}`;
  }

  function renderWorksheet(problems) {
    const layout = els.layout.value;
    const grid = els.problemsGrid;
    grid.innerHTML = '';

    problems.forEach(p => {
      const node = (layout === 'vertical') ? verticalProblemNode(p) : horizontalProblemNode(p);
      grid.appendChild(node);
    });

    setEvenGrid(grid, problems.length, layout, false);
  }

  function renderAnswerKey(problems) {
    const grid = els.answersGrid;
    grid.innerHTML = '';

    problems.forEach(p => {
      const wrap = document.createElement('div');
      wrap.className = 'problem';
      const eq = document.createElement('div');
      eq.className = 'equation';
      eq.textContent = `${p.a} × ${p.b} = ${computeProduct(p)}`;
      wrap.appendChild(eq);
      grid.appendChild(wrap);
    });

    setEvenGrid(grid, problems.length, 'horizontal', true);
  }

  /** Nodes */
  function horizontalProblemNode(p) {
    const el = document.createElement('div');
    el.className = 'problem horizontal';
    const left = document.createElement('div');
    left.textContent = `${p.a} × ${p.b} =`;
    const line = document.createElement('div');
    line.className = 'line';
    el.append(left, line);
    return el;
  }

  function verticalProblemNode(p) {
    const el = document.createElement('div');
    el.className = 'problem vertical';
    const r1 = document.createElement('div');
    r1.className = 'row';
    r1.innerHTML = `<span class="op">&nbsp;</span><span class="num">${p.a}</span>`;

    const r2 = document.createElement('div');
    r2.className = 'row';
    r2.innerHTML = `<span class="op">×</span><span class="num">${p.b}</span>`;

    const rule = document.createElement('div');
    rule.className = 'rule';

    el.append(r1, r2, rule);
    return el;
  }

  /** Events */
  els.generateBtn.addEventListener('click', generate);
  els.clearBtn.addEventListener('click', () => {
    manual = []; renderManualList();
    els.problemsGrid.innerHTML = '';
    els.answersGrid.innerHTML = '';
    lastGenerated = [];
  });
  els.printBtn.addEventListener('click', () => window.print());

  // Init
  syncModeUI();
  toggleGrade5Extras();
  renderManualList();
  generate();
})();
