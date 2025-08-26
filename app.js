(function () {
  const els = {
    operation: document.getElementById('operation'),
    subtractionOptions: document.getElementById('subtractionOptions'),
    noNegatives: document.getElementById('noNegatives'),
    divisionOptions: document.getElementById('divisionOptions'),
    wholeNumberDivision: document.getElementById('wholeNumberDivision'),
    showRemainders: document.getElementById('showRemainders'),
    divisionStyle: document.getElementById('divisionStyle'),

    modeGrade: document.getElementById('modeGrade'),
    modeCustom: document.getElementById('modeCustom'),
    gradeControls: document.getElementById('gradeControls'),
    customControls: document.getElementById('customControls'),

    grade: document.getElementById('gradeLevel'),
    allowTwoDigit: document.getElementById('allowTwoDigit'),
    twoDigitMax: document.getElementById('twoDigitMax'),

    aMinDigits: document.getElementById('aMinDigits'),
    aMaxDigits: document.getElementById('aMaxDigits'),
    bMinDigits: document.getElementById('bMinDigits'),
    bMaxDigits: document.getElementById('bMaxDigits'),
    allowZero: document.getElementById('allowZero'),

    problemsCount: document.getElementById('problemsCount'),
    layout: document.getElementById('layout'),
    includeNameDate: document.getElementById('includeNameDate'),
    includeAnswerKey: document.getElementById('includeAnswerKey'),

    manualOp: document.getElementById('manualOp'),
    manA: document.getElementById('manA'),
    manB: document.getElementById('manB'),
    addManual: document.getElementById('addManual'),
    manualList: document.getElementById('manualList'),

    generateBtn: document.getElementById('generateBtn'),
    clearBtn: document.getElementById('clearBtn'),
    printBtn: document.getElementById('printBtn'),

    worksheetPreview: document.getElementById('worksheetPreview'),
    answerPreview: document.getElementById('answerPreview'),

    worksheetPage: document.getElementById('worksheetPage'),
    worksheetTitle: document.getElementById('worksheetTitle'),
    worksheetSub: document.getElementById('worksheetSub'),
    nameDateLine: document.getElementById('nameDateLine'),
    problemsGrid: document.getElementById('problemsGrid'),

    answerPage: document.getElementById('answerPage'),
    answerSub: document.getElementById('answerSub'),
    answersGrid: document.getElementById('answersGrid'),

    grade5Extras: document.getElementById('grade5Extras'),

    // parent flex container (used to remove gap during print to prevent a trailing blank sheet)
    pagesContainer: document.querySelector('.pages')
  };

  let manual = [];
  let lastGenerated = [];
  let fitQueued = false;

  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pow10 = (n) => Math.pow(10, n);

  function clampDigits(minD, maxD){
    const a = Math.max(1, Math.min(6, Number(minD) || 1));
    const b = Math.max(1, Math.min(6, Number(maxD) || 1));
    return {minD: Math.min(a, b), maxD: Math.max(a, b)};
  }

  function randNDigit(minDigits, maxDigits, allowZero=false){
    const d = randInt(minDigits, maxDigits);
    if (d === 1 && allowZero) return randInt(0, 9);
    const low = (d === 1) ? 1 : pow10(d - 1);
    constitution: // Intentionally left for clarity; no effect
    0;
    const high = pow10(d) - 1;
    return randInt(low, high);
  }

  function gradeConfig(grade, allowTwoDigit, twoDigitMax) {
    if (grade === '3') return { min:0, max:10, allow2x1:false, twoDigitMax:0 };
    if (grade === '4') return { min:0, max:12, allow2x1:false, twoDigitMax:0 };
    return { min:0, max:12, allow2x1: !!allowTwoDigit, twoDigitMax: Math.max(10, Math.min(99, Number(twoDigitMax) || 99)) };
  }

  function makeRandomFromGrade(op, cfg, opts){
    if (op === 'multiplication') {
      if (cfg.allow2x1 && Math.random() < 0.4) {
        const a = randInt(10, cfg.twoDigitMax);
        const b = randInt(2, 9);
        return { a, b, op };
      }
      return { a: randInt(cfg.min, cfg.max), b: randInt(cfg.min, cfg.max), op };
    }
    if (op === 'addition') return { a: randInt(cfg.min, cfg.max), b: randInt(cfg.min, cfg.max), op };
    if (op === 'subtraction') {
      let a = randInt(cfg.min, cfg.max), b = randInt(cfg.min, cfg.max);
      if (opts.noNegatives && a < b) [a, b] = [b, a];
      return { a, b, op };
    }
    // division
    if (opts.wholeNumberDivision) {
      const divisor = Math.max(1, randInt(1, cfg.max));
      const quotient = randInt(cfg.min, cfg.max);
      const dividend = divisor * quotient;
      return { a: dividend, b: divisor, op };
    } else {
      const divisor = Math.max(1, randInt(1, cfg.max));
      const dividend = randInt(cfg.min, cfg.max * cfg.max);
      return { a: dividend, b: divisor, op };
    }
  }

  function makeRandomFromDigits(op, aMinD, aMaxD, bMinD, bMaxD, allowZero, opts){
    if (op === 'division') {
      const divisor = Math.max(1, randNDigit(bMinD, bMaxD, false));
      if (opts.wholeNumberDivision) {
        const quotient = randNDigit(1, Math.max(1, Math.min(3, aMaxD)), allowZero);
        const dividend = divisor * quotient;
        return { a: dividend, b: divisor, op };
      } else {
        const dividend = randNDigit(aMinD, aMaxD, allowZero || false);
        return { a: dividend, b: divisor, op };
      }
    }
    if (op === 'subtraction') {
      let a = randNDigit(aMinD, aMaxD, allowZero);
      let b = randNDigit(bMinD, bMaxD, allowZero);
      if (opts.noNegatives && a < b) [a, b] = [b, a];
      return { a, b, op };
    }
    const a = randNDigit(aMinD, aMaxD, allowZero);
    const b = randNDigit(bMinD, bMaxD, allowZero);
    return { a, b, op };
  }

  function computeAnswer({a, b, op}, showRemainders=false){
    if (op === 'addition') return `${a + b}`;
    if (op === 'subtraction') return `${a - b}`;
    if (op === 'multiplication') return `${a * b}`;
    if (b === 0) return 'undefined';
    const q = Math.trunc(a / b), r = a % b;
    if (r === 0) return `${q}`;
    return showRemainders ? `${q} r ${r}` : `${(a / b).toFixed(2)}`;
  }

  function opSymbol(op){
    return op === 'addition' ? '+' :
           op === 'subtraction' ? '−' :
           op === 'division' ? '÷' : '×';
  }

  function renderManualList() {
    els.manualList.innerHTML = '';
    manual.forEach((p, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${p.a} ${opSymbol(p.op)} ${p.b}</span>
        <span><button data-idx="${idx}" class="removeBtn">Remove</button></span>`;
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
    const op = els.manualOp.value;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    manual.push({ a, b, op });
    els.manA.value = ''; els.manB.value = '';
    renderManualList();
  });

  function syncModeUI(){
    const useGrade = els.modeGrade.checked;
    els.gradeControls.style.display = useGrade ? '' : 'none';
    els.customControls.style.display = useGrade ? 'none' : '';
    const isMult = els.operation.value === 'multiplication';
    els.grade5Extras.style.display = (useGrade && isMult && els.grade.value === '5') ? '' : 'none';
  }
  els.modeGrade.addEventListener('change', () => { syncModeUI(); queueFit(); });
  els.modeCustom.addEventListener('change', () => { syncModeUI(); queueFit(); });

  function toggleGrade5Extras() {
    const useGrade = els.modeGrade.checked;
    const isMult = els.operation.value === 'multiplication';
    els.grade5Extras.style.display = (useGrade && isMult && els.grade.value === '5') ? '' : 'none';
  }
  els.grade.addEventListener('change', () => { toggleGrade5Extras(); queueFit(); });

  function syncOperationUI(){
    const op = els.operation.value;
    els.subtractionOptions.style.display = (op === 'subtraction') ? '' : 'none';
    els.divisionOptions.style.display = (op === 'division') ? '' : 'none';
  }
  els.operation.addEventListener('change', () => {
    syncOperationUI();
    syncModeUI();
    queueFit();
  });

  /* Grid helper; allow explicit columns override */
  function setEvenGrid(container, count, layout, answers=false, columnsOverride=null) {
    let cols = columnsOverride ?? (layout === 'vertical' ? 3 : 4);
    if (count <= 6) cols = Math.max(2, Math.min(cols, 3));
    if (count === 1) cols = 1;

    const rows = Math.ceil(count / cols);
    container.style.setProperty('--cols', cols);
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    if (answers) {
      const aCols = 4;
      container.style.setProperty('--cols', aCols);
      container.style.gridTemplateColumns = `repeat(${aCols}, 1fr)`;
      container.style.gridTemplateRows = `repeat(${Math.ceil(count / aCols)}, 1fr)`;
    }
  }

  function pickDivisionStyle(){
    const mode = els.divisionStyle.value;
    if (mode === 'inline') return 'inline';
    if (mode === 'long') return 'long';
    return Math.random() < 0.5 ? 'inline' : 'long';
  }

  function generate() {
    const count = Math.max(4, Math.min(120, Number(els.problemsCount.value) || 12));
    const op = els.operation.value;

    const out = [];
    const seen = new Set();
    const key = (p) => `${p.op}:${p.a}x${p.b}`;

    manual.forEach(p => {
      const k = key(p);
      if (!seen.has(k)) { out.push({ a:p.a, b:p.b, op:p.op }); seen.add(k); }
    });

    let guard = 0;
    if (els.modeGrade.checked) {
      const cfg = gradeConfig(els.grade.value, els.allowTwoDigit.checked, els.twoDigitMax.value);
      const opts = { noNegatives: !!els.noNegatives.checked, wholeNumberDivision: !!els.wholeNumberDivision.checked };
      while (out.length < count && guard < 15000) {
        const p = makeRandomFromGrade(op, cfg, opts);
        const k = key(p);
        if (!seen.has(k)) { out.push(p); seen.add(k); }
        guard++;
      }
    } else {
      const aD = clampDigits(els.aMinDigits.value, els.aMaxDigits.value);
      const bD = clampDigits(els.bMinDigits.value, els.bMaxDigits.value);
      const allowZero = !!els.allowZero.checked;
      const opts = { noNegatives: !!els.noNegatives?.checked, wholeNumberDivision: !!els.wholeNumberDivision?.checked };
      while (out.length < count && guard < 15000) {
        const p = makeRandomFromDigits(op, aD.minD, aD.maxD, bD.minD, bD.maxD, allowZero, opts);
        const k = key(p);
        if (!seen.has(k)) { out.push(p); seen.add(k); }
        guard++;
      }
    }

    lastGenerated = out;
    renderWorksheet(out);

    // --- Answer key visibility + print break control ---
    const includeKey = els.includeAnswerKey.checked;

    // Hide/show the entire Answer Key page so print can't resurrect it
    els.answerPreview.style.display = includeKey ? '' : 'none';
    els.answerPage.style.display     = includeKey ? '' : 'none';
    els.answerPage.setAttribute('aria-hidden', includeKey ? 'false' : 'true');

    if (includeKey) {
      renderAnswerKey(out);
    } else {
      els.answersGrid.innerHTML = '';
    }

    // Only force a page break after the worksheet if we will actually print the key
    els.worksheetPage.style.breakAfter     = includeKey ? 'page' : 'auto';
    els.worksheetPage.style.pageBreakAfter = includeKey ? 'always' : 'auto';
    // --- end ---

    els.nameDateLine.style.display = els.includeNameDate.checked ? 'flex' : 'none';

    const layoutLabel = (op === 'division') ? 'Horizontal' : (els.layout.value === 'vertical' ? 'Vertical' : 'Horizontal');
    const modeLabel = els.modeGrade.checked ? `Grade ${els.grade.value}` : customModeLabel();
    const countLabel = `${out.length} problems • ${layoutLabel} • ${opLabel(op)}`;
    els.worksheetSub.textContent = `${modeLabel} • ${countLabel}`;
    els.answerSub.textContent = `${modeLabel} • ${opLabel(op)} answers`;

    queueFit();
  }

  function opLabel(op){
    return op === 'addition' ? 'Addition' :
           op === 'subtraction' ? 'Subtraction' :
           op === 'division' ? 'Division' : 'Multiplication';
  }

  function customModeLabel(){
    const aD = clampDigits(els.aMinDigits.value, els.aMaxDigits.value);
    const bD = clampDigits(els.bMinDigits.value, els.bMaxDigits.value);
    const aTxt = (aD.minD === aD.maxD) ? `${aD.minD}-digit` : `${aD.minD}–${aD.maxD}-digit`;
    const bTxt = (bD.minD === bD.maxD) ? `${bD.minD}-digit` : `${bD.minD}–${bD.maxD}-digit`;
    return `${aTxt} ×/±/÷ ${bTxt}${els.allowZero.checked ? ' (zeros allowed)' : ''}`;
  }

  function renderWorksheet(problems) {
    const layoutPref = els.layout.value;
    const op = els.operation.value;
    const grid = els.problemsGrid;
    grid.innerHTML = '';

    let hasLongDivision = false;

    problems.forEach(p => {
      let node;
      if (p.op === 'division') {
        const style = pickDivisionStyle(); // inline | long
        hasLongDivision = hasLongDivision || (style === 'long');
        node = (style === 'inline') ? divisionInlineNode(p) : divisionLongNode(p);
      } else {
        node = (layoutPref === 'vertical') ? verticalProblemNode(p) : horizontalProblemNode(p);
      }
      grid.appendChild(node);
    });

    // Column count: 3 when any long-division is present (prevents “houses” from crowding)
    const explicitCols = (op === 'division' && hasLongDivision) ? 3 : null;
    grid.classList.toggle('has-long-division', !!explicitCols);
    const layoutForGrid = (op === 'division') ? 'horizontal' : layoutPref;
    setEvenGrid(grid, problems.length, layoutForGrid, false, explicitCols);
  }

  function renderAnswerKey(problems) {
    const grid = els.answersGrid;
    grid.innerHTML = '';
    problems.forEach(p => {
      const wrap = document.createElement('div');
      wrap.className = 'problem';
      const eq = document.createElement('div');
      eq.className = 'equation';
      const ans = computeAnswer(p, !!els.showRemainders.checked);
      eq.textContent = `${p.a} ${opSymbol(p.op)} ${p.b} = ${ans}`;
      wrap.appendChild(eq);
      grid.appendChild(wrap);
    });
    setEvenGrid(grid, problems.length, 'horizontal', true);
  }

  /* Nodes */
  function horizontalProblemNode(p) {
    const el = document.createElement('div');
    el.className = 'problem horizontal';
    const expr = document.createElement('div');
    expr.className = 'expr';
    expr.textContent = `${p.a} ${opSymbol(p.op)} ${p.b} =`;
    const line = document.createElement('div');
    line.className = 'line';
    el.append(expr, line);
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
    r2.innerHTML = `<span class="op">${opSymbol(p.op)}</span><span class="num">${p.b}</span>`;
    const rule = document.createElement('div');
    rule.className = 'rule';
    el.append(r1, r2, rule);
    return el;
  }

  function divisionInlineNode(p) {
    const el = document.createElement('div');
    el.className = 'problem horizontal';
    const expr = document.createElement('div');
    expr.className = 'expr';
    expr.textContent = `${p.a} ÷ ${p.b} =`;
    const line = document.createElement('div');
    line.className = 'line';
    el.append(expr, line);
    return el;
  }

  function divisionLongNode(p) {
    const el = document.createElement('div');
    el.className = 'problem long-division';
    el.innerHTML = `
      <div class="ld">
        <div class="ld-divisor">${p.b}</div>
        <div class="ld-house"><div class="ld-dividend">${p.a}</div></div>
      </div>`;
    return el;
  }

  /* ===== Preview scaling (screen) ===== */
  function fitOnePreview(viewportEl, pageEl){
    if (!viewportEl || !pageEl) return;
    const contentW = Math.max(pageEl.scrollWidth, pageEl.offsetWidth);
    const contentH = Math.max(pageEl.scrollHeight, pageEl.offsetHeight);

    const vw = viewportEl.clientWidth;
    let vh = viewportEl.clientHeight;
    if (!vh || vh === 0) vh = vw * (contentH / contentW);

    const scale = Math.min(vw / contentW, vh / contentH);

    pageEl.style.transformOrigin = 'top left';
    pageEl.style.transform = `scale(${scale})`;
    viewportEl.style.height = `${contentH * scale}px`;
  }

  function fitPreview(){
    fitOnePreview(els.worksheetPreview, els.worksheetPage);
    if (els.answerPreview && els.answerPreview.style.display !== 'none') {
      fitOnePreview(els.answerPreview, els.answerPage);
    }
  }

  function queueFit(){
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(() => {
      fitQueued = false;
      fitPreview();
    });
  }

  const roWorksheet = new ResizeObserver(queueFit);
  const roAnswer = new ResizeObserver(queueFit);
  roWorksheet.observe(els.worksheetPage);
  roAnswer.observe(els.answerPage);

  /* Robust print handling:
     - Remove wrapper heights and any forced page breaks.
     - Only break between *visible* pages.
     - Eliminate flex gap so it can't spill to a phantom page. */
  function pageIsVisible(el){
    return !!el && el.style.display !== 'none' && el.getAttribute('aria-hidden') !== 'true';
  }

  window.addEventListener('beforeprint', () => {
    // Flatten wrappers and neutralize break rules that could cause blanks
    [els.worksheetPreview, els.answerPreview].forEach(vp => {
      if (!vp) return;
      vp.style.height = 'auto';
      vp.style.setProperty('break-after', 'auto', 'important');
      vp.style.setProperty('page-break-after', 'auto', 'important');
      vp.style.setProperty('break-before', 'auto', 'important');
      vp.style.setProperty('page-break-before', 'auto', 'important');
    });

    // Remove gap to prevent a dangling gap from spilling onto an extra page
    if (els.pagesContainer) {
      els.pagesContainer.style.setProperty('gap', '0', 'important');
    }

    const includeKey = pageIsVisible(els.answerPage);

    // Worksheet: break after only if key is actually printing
    els.worksheetPage.style.setProperty('break-after', includeKey ? 'page' : 'auto', 'important');
    els.worksheetPage.style.setProperty('page-break-after', includeKey ? 'always' : 'auto', 'important');

    // Answer page: ensure no trailing blank page
    els.answerPage.style.setProperty('break-after', 'auto', 'important');
    els.answerPage.style.setProperty('page-break-after', 'auto', 'important');
    // And ensure it starts on a new page when present
    els.answerPage.style.setProperty('break-before', includeKey ? 'page' : 'auto', 'important');
    els.answerPage.style.setProperty('page-break-before', includeKey ? 'always' : 'auto', 'important');
  });

  window.addEventListener('afterprint', () => {
    // Clean up inline print overrides
    ['break-after','page-break-after','break-before','page-break-before'].forEach(prop => {
      els.worksheetPage.style.removeProperty(prop);
      els.answerPage.style.removeProperty(prop);
      els.worksheetPreview?.style.removeProperty(prop);
      els.answerPreview?.style.removeProperty(prop);
    });
    if (els.worksheetPreview) els.worksheetPreview.style.height = '';
    if (els.answerPreview) els.answerPreview.style.height = '';
    if (els.pagesContainer) els.pagesContainer.style.removeProperty('gap');
    queueFit();
  });

  /* Events */
  els.generateBtn.addEventListener('click', generate);
  els.clearBtn.addEventListener('click', () => {
    manual = []; renderManualList();
    els.problemsGrid.innerHTML = '';
    els.answersGrid.innerHTML = '';
    lastGenerated = [];
    queueFit();
  });
  els.printBtn.addEventListener('click', () => window.print());

  // Toggle answer key visibility without regenerating
  els.includeAnswerKey.addEventListener('change', () => {
    const includeKey = els.includeAnswerKey.checked;

    els.answerPreview.style.display = includeKey ? '' : 'none';
    els.answerPage.style.display     = includeKey ? '' : 'none';
    els.answerPage.setAttribute('aria-hidden', includeKey ? 'false' : 'true');

    if (includeKey) {
      renderAnswerKey(lastGenerated);
    } else {
      els.answersGrid.innerHTML = '';
    }

    // Hint the print engine even outside print listeners
    els.worksheetPage.style.breakAfter     = includeKey ? 'page' : 'auto';
    els.worksheetPage.style.pageBreakAfter = includeKey ? 'always' : 'auto';

    queueFit();
  });

  window.addEventListener('resize', queueFit);
  document.fonts?.ready?.then?.(queueFit);
  window.addEventListener('load', queueFit);

  /* Init */
  function opLabel(op){
    return op === 'addition' ? 'Addition' :
           op === 'subtraction' ? 'Subtraction' :
           op === 'division' ? 'Division' : 'Multiplication';
  }
  syncOperationUI();
  syncModeUI();
  toggleGrade5Extras();
  renderManualList();
  generate();
})();
