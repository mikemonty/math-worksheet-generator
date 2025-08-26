(function () {
  const els = {
    // operation + options
    operation: document.getElementById('operation'),
    subtractionOptions: document.getElementById('subtractionOptions'),
    noNegatives: document.getElementById('noNegatives'),
    divisionOptions: document.getElementById('divisionOptions'),
    wholeNumberDivision: document.getElementById('wholeNumberDivision'),
    showRemainders: document.getElementById('showRemainders'),
    divisionStyle: document.getElementById('divisionStyle'),

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

    // generic controls
    problemsCount: document.getElementById('problemsCount'),
    layout: document.getElementById('layout'),
    includeNameDate: document.getElementById('includeNameDate'),
    includeAnswerKey: document.getElementById('includeAnswerKey'),

    // manual problems
    manualOp: document.getElementById('manualOp'),
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
  let manual = []; // [{a,b,op}]
  let lastGenerated = []; // [{a,b,op}]

  /** Utils */
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pow10 = (n) => Math.pow(10, n);

  function clampDigits(minD, maxD){
    const a = Math.max(1, Math.min(6, Number(minD) || 1));
    const b = Math.max(1, Math.min(6, Number(maxD) || 1));
    return {minD: Math.min(a, b), maxD: Math.max(a, b)};
  }

  function randNDigit(minDigits, maxDigits, allowZero=false){
    const d = randInt(minDigits, maxDigits);
    if (d === 1 && allowZero) return randInt(0, 9); // 0–9
    const low = (d === 1) ? 1 : pow10(d - 1);
    const high = pow10(d) - 1;
    return randInt(low, high);
  }

  /** Grade preset config (ranges reused for +/−/×/÷) */
  function gradeConfig(grade, allowTwoDigit, twoDigitMax) {
    if (grade === '3') return { min:0, max:10, allow2x1:false, twoDigitMax:0 };
    if (grade === '4') return { min:0, max:12, allow2x1:false, twoDigitMax:0 };
    return { // grade 5
      min:0, max:12,
      allow2x1: !!allowTwoDigit,
      twoDigitMax: Math.max(10, Math.min(99, Number(twoDigitMax) || 99))
    };
  }

  /** Random problem creators */
  function makeRandomFromGrade(op, cfg, opts){
    if (op === 'multiplication') {
      if (cfg.allow2x1 && Math.random() < 0.4) {
        const a = randInt(10, cfg.twoDigitMax);
        const b = randInt(2, 9);
        return { a, b, op };
      }
      return { a: randInt(cfg.min, cfg.max), b: randInt(cfg.min, cfg.max), op };
    }

    if (op === 'addition') {
      return { a: randInt(cfg.min, cfg.max), b: randInt(cfg.min, cfg.max), op };
    }

    if (op === 'subtraction') {
      let a = randInt(cfg.min, cfg.max);
      let b = randInt(cfg.min, cfg.max);
      if (opts.noNegatives && a < b) [a, b] = [b, a];
      return { a, b, op };
    }

    // division
    if (opts.wholeNumberDivision) {
      const divisor = Math.max(1, randInt(1, cfg.max)); // avoid ÷0
      const quotient = randInt(cfg.min, cfg.max);
      const dividend = divisor * quotient;
      return { a: dividend, b: divisor, op };
    } else {
      const divisor = Math.max(1, randInt(1, cfg.max));
      const dividend = randInt(cfg.min, cfg.max * cfg.max); // give some variety
      return { a: dividend, b: divisor, op };
    }
  }

  function makeRandomFromDigits(op, aMinD, aMaxD, bMinD, bMaxD, allowZero, opts){
    if (op === 'division') {
      const divisor = Math.max(1, randNDigit(bMinD, bMaxD, false)); // no 0 divisor
      if (opts.wholeNumberDivision) {
        const quotient = randNDigit(1, Math.max(1, Math.min(3, aMaxD)), allowZero); // keep dividends reasonable
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

    // addition / multiplication
    const a = randNDigit(aMinD, aMaxD, allowZero);
    const b = randNDigit(bMinD, bMaxD, allowZero);
    return { a, b, op };
  }

  /** Answer computation (supports remainder display) */
  function computeAnswer({a, b, op}, showRemainders=false){
    if (op === 'addition') return `${a + b}`;
    if (op === 'subtraction') return `${a - b}`;
    if (op === 'multiplication') return `${a * b}`;
    // division
    if (b === 0) return 'undefined';
    const q = Math.trunc(a / b);
    const r = a % b;
    if (r === 0) return `${q}`;
    return showRemainders ? `${q} r ${r}` : `${(a / b).toFixed(2)}`;
  }

  /** Operator symbol */
  function opSymbol(op){
    return op === 'addition' ? '+' :
           op === 'subtraction' ? '−' :
           op === 'division' ? '÷' : '×';
  }

  /** Manual problems UI */
  function renderManualList() {
    els.manualList.innerHTML = '';
    manual.forEach((p, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${p.a} ${opSymbol(p.op)} ${p.b}</span>
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
    const op = els.manualOp.value;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    manual.push({ a, b, op });
    els.manA.value = ''; els.manB.value = '';
    renderManualList();
  });

  /** Mode & operation UI sync */
  function syncModeUI(){
    const useGrade = els.modeGrade.checked;
    els.gradeControls.style.display = useGrade ? '' : 'none';
    els.customControls.style.display = useGrade ? 'none' : '';
    // multiplication-specific grade 5 extras
    const isMult = els.operation.value === 'multiplication';
    els.grade5Extras.style.display = (useGrade && isMult && els.grade.value === '5') ? '' : 'none';
  }
  els.modeGrade.addEventListener('change', syncModeUI);
  els.modeCustom.addEventListener('change', syncModeUI);

  function toggleGrade5Extras() {
    const useGrade = els.modeGrade.checked;
    const isMult = els.operation.value === 'multiplication';
    els.grade5Extras.style.display = (useGrade && isMult && els.grade.value === '5') ? '' : 'none';
  }
  els.grade.addEventListener('change', toggleGrade5Extras);

  function syncOperationUI(){
    const op = els.operation.value;
    els.subtractionOptions.style.display = (op === 'subtraction') ? '' : 'none';
    els.divisionOptions.style.display = (op === 'division') ? '' : 'none';
  }
  els.operation.addEventListener('change', () => {
    syncOperationUI();
    syncModeUI();
  });

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

  /** Division style selection */
  function pickDivisionStyle(){
    // returns 'inline' | 'long'
    const mode = els.divisionStyle.value;
    if (mode === 'inline') return 'inline';
    if (mode === 'long') return 'long';
    // mixed
    return Math.random() < 0.5 ? 'inline' : 'long';
  }

  /** Generate */
  function generate() {
    // DEFAULT FALLBACK NOW 12 (not 36)
    const count = Math.max(4, Math.min(120, Number(els.problemsCount.value) || 12));
    const op = els.operation.value;

    const out = [];
    const seen = new Set();
    const key = (p) => `${p.op}:${p.a}x${p.b}`;

    // Manual first (dedupe)
    manual.forEach(p => {
      const k = key(p);
      if (!seen.has(k)) { out.push({ a:p.a, b:p.b, op:p.op }); seen.add(k); }
    });

    // Mode-dependent random fill
    let guard = 0;
    if (els.modeGrade.checked) {
      const cfg = gradeConfig(els.grade.value, els.allowTwoDigit.checked, els.twoDigitMax.value);
      const opts = {
        noNegatives: !!els.noNegatives.checked,
        wholeNumberDivision: !!els.wholeNumberDivision.checked
      };
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
      const opts = {
        noNegatives: !!els.noNegatives?.checked,
        wholeNumberDivision: !!els.wholeNumberDivision?.checked
      };
      while (out.length < count && guard < 15000) {
        const p = makeRandomFromDigits(op, aD.minD, aD.maxD, bD.minD, bD.maxD, allowZero, opts);
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

    // Headers + Name/Date visibility
    els.nameDateLine.style.display = els.includeNameDate.checked ? 'flex' : 'none';

    const layoutLabel = (op === 'division') ? 'Horizontal' : (els.layout.value === 'vertical' ? 'Vertical' : 'Horizontal');
    const modeLabel = els.modeGrade.checked ? `Grade ${els.grade.value}` : customModeLabel();
    const countLabel = `${out.length} problems • ${layoutLabel} • ${opLabel(op)}`;
    els.worksheetSub.textContent = `${modeLabel} • ${countLabel}`;
    els.answerSub.textContent = `${modeLabel} • ${opLabel(op)} answers`;
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
    const layoutPref = els.layout.value; // may be overridden for division
    const op = els.operation.value;
    const grid = els.problemsGrid;
    grid.innerHTML = '';

    problems.forEach(p => {
      let node;
      if (p.op === 'division') {
        const style = pickDivisionStyle(); // inline | long (respects "mixed")
        node = (style === 'inline') ? divisionInlineNode(p) : divisionLongNode(p);
      } else {
        node = (layoutPref === 'vertical')
          ? verticalProblemNode(p)
          : horizontalProblemNode(p);
      }
      grid.appendChild(node);
    });

    // Force horizontal grid for division (vertical long-division not implemented)
    const layoutForGrid = (op === 'division') ? 'horizontal' : layoutPref;
    setEvenGrid(grid, problems.length, layoutForGrid, false);
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

  /** Nodes */
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
    // For +, −, × only
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

  // Division variants
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
    // “House” with visible top + left borders and aligned numbers
    const el = document.createElement('div');
    el.className = 'problem long-division';
    el.innerHTML = `
      <div class="ld">
        <div class="ld-divisor">${p.b}</div>
        <div class="ld-house">
          <div class="ld-dividend">${p.a}</div>
        </div>
      </div>
    `;
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

  // Initial UI sync and render
  syncOperationUI();
  syncModeUI();
  toggleGrade5Extras();
  renderManualList();
  generate();
})();
