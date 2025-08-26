(function () {
  const els = {
    grade: document.getElementById('gradeLevel'),
    allowTwoDigit: document.getElementById('allowTwoDigit'),
    twoDigitMax: document.getElementById('twoDigitMax'),
    problemsCount: document.getElementById('problemsCount'),
    layout: document.getElementById('layout'),
    includeNameDate: document.getElementById('includeNameDate'),
    includeAnswerKey: document.getElementById('includeAnswerKey'),

    grade5Extras: document.getElementById('grade5Extras'),

    manA: document.getElementById('manA'),
    manB: document.getElementById('manB'),
    addManual: document.getElementById('addManual'),
    manualList: document.getElementById('manualList'),

    generateBtn: document.getElementById('generateBtn'),
    clearBtn: document.getElementById('clearBtn'),
    printBtn: document.getElementById('printBtn'),

    worksheetTitle: document.getElementById('worksheetTitle'),
    worksheetSub: document.getElementById('worksheetSub'),
    nameDateLine: document.getElementById('nameDateLine'),
    problemsGrid: document.getElementById('problemsGrid'),

    answerPage: document.getElementById('answerPage'),
    answerSub: document.getElementById('answerSub'),
    answersGrid: document.getElementById('answersGrid')
  };

  /** State */
  let manual = []; // [{a,b}]
  let lastGenerated = [];

  /** Utils */
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function gradeConfig(grade, allowTwoDigit, twoDigitMax) {
    if (grade === '3') {
      return { aMin: 0, aMax: 10, bMin: 0, bMax: 10, allow2x1: false, twoDigitMax: 0 };
    }
    if (grade === '4') {
      return { aMin: 0, aMax: 12, bMin: 0, bMax: 12, allow2x1: false, twoDigitMax: 0 };
    }
    // grade 5
    return { aMin: 0, aMax: 12, bMin: 0, bMax: 12, allow2x1: !!allowTwoDigit, twoDigitMax: Math.max(10, Math.min(99, Number(twoDigitMax) || 99)) };
  }

  function makeRandomProblem(cfg) {
    if (cfg.allow2x1 && Math.random() < 0.4) {
      const a = randInt(10, cfg.twoDigitMax);
      const b = randInt(2, 9);
      return { a, b };
    }
    const a = randInt(cfg.aMin, cfg.aMax);
    const b = randInt(cfg.bMin, cfg.bMax);
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

  /** Grade 5 extra controls visibility */
  function toggleGrade5Extras() {
    els.grade5Extras.style.display = els.grade.value === '5' ? '' : 'none';
  }
  toggleGrade5Extras();
  els.grade.addEventListener('change', toggleGrade5Extras);

  /** Helpers to evenly fill the page with a grid */
  function setEvenGrid(container, count, layout, answers=false) {
    // Choose base columns by layout; allow small auto-adjusts for very small counts
    let cols = layout === 'vertical' ? 3 : 4;

    // If very few problems, reduce columns so spacing looks natural
    if (count <= 6) cols = Math.max(2, layout === 'vertical' ? 2 : 2);
    if (count === 1) cols = 1;

    // Compute rows to fit everything
    const rows = Math.ceil(count / cols);

    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    // Answers page: often denser works; keep 4 columns where possible
    if (answers) {
      container.style.gridTemplateColumns = `repeat(4, 1fr)`;
      container.style.gridTemplateRows = `repeat(${Math.ceil(count / 4)}, 1fr)`;
    }
  }

  /** Generate problems */
  function generate() {
    const count = Math.max(4, Math.min(120, Number(els.problemsCount.value) || 36));
    const cfg = gradeConfig(els.grade.value, els.allowTwoDigit.checked, els.twoDigitMax.value);

    // Start with manual (dedupe exact duplicates)
    const out = [];
    const seen = new Set();
    const key = (p) => `${p.a}x${p.b}`;

    manual.forEach(p => {
      const k = key(p);
      if (!seen.has(k)) { out.push({ a:p.a, b:p.b }); seen.add(k); }
    });

    // Fill the rest with randoms
    let guard = 0;
    while (out.length < count && guard < 5000) {
      const p = makeRandomProblem(cfg);
      const k = key(p);
      if (!seen.has(k)) {
        out.push(p);
        seen.add(k);
      }
      guard++;
    }

    lastGenerated = out;

    // Render worksheet (with even distribution)
    renderWorksheet(out);

    // Render answer key (optional)
    const includeKey = els.includeAnswerKey.checked;
    els.answerPage.setAttribute('aria-hidden', includeKey ? 'false' : 'true');
    els.answerPage.style.display = includeKey ? '' : 'none';
    if (includeKey) renderAnswerKey(out);

    // Header lines & subtitles
    document.getElementById('nameDateLine').style.visibility = els.includeNameDate.checked ? 'visible' : 'hidden';

    const layoutLabel = els.layout.value === 'vertical' ? 'Vertical' : 'Horizontal';
    const gradeLabel = `Grade ${els.grade.value}`;
    const countLabel = `${out.length} problems • ${layoutLabel}`;
    els.worksheetSub.textContent = `${gradeLabel} • ${countLabel}`;
    els.answerSub.textContent = `${gradeLabel} • Matching the worksheet`;
  }

  function renderWorksheet(problems) {
    const layout = els.layout.value; // "horizontal" | "vertical"
    const grid = els.problemsGrid;
    grid.innerHTML = '';

    // Build nodes
    problems.forEach(p => {
      const node = (layout === 'vertical') ? verticalProblemNode(p) : horizontalProblemNode(p);
      grid.appendChild(node);
    });

    // Evenly distribute across the page area
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

    // Even grid for answers too (denser)
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

  // Initial render
  generate();
})();
