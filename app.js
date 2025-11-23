// UPG Calculator - Vanilla JS
// Data model:
// Subject { id, name, components: Component[], conversion: Threshold[] }
// Component { id, name, weight, entries: Entry[] }
// Entry { id, label, score, max }
// Threshold { id, percentFrom, grade }

(function () {
  const STORAGE_KEY = 'upg-calculator:v1';

  const el = {
    subjectList: document.getElementById('subject-list'),
    subjectDetail: document.getElementById('subject-detail'),
    addSubject: document.getElementById('add-subject'),
    exportData: document.getElementById('export-data'),
    importFile: document.getElementById('import-file'),
    resetData: document.getElementById('reset-data'),
    themeToggle: document.getElementById('theme-toggle'),
    openAbout: document.getElementById('open-about'),
    gwaValue: document.getElementById('gwa-value'),
    gwaAvgLabel: document.getElementById('gwa-avg-label'),
    gwaChart: document.getElementById('gwa-chart'),
    gwaLowest: document.getElementById('gwa-lowest'),
    gwaHighest: document.getElementById('gwa-highest'),
    tplSubject: document.getElementById('subject-template'),
    tplComponent: document.getElementById('component-template'),
    tplEntryRow: document.getElementById('entry-row-template'),
    tplThresholdRow: document.getElementById('threshold-row-template'),
  };

  const uid = () => Math.random().toString(36).slice(2, 9);

  const defaultThresholds = [
    { id: uid(), percentFrom: 95, grade: 1.0 },
    { id: uid(), percentFrom: 90, grade: 1.25 },
    { id: uid(), percentFrom: 85, grade: 1.5 },
    { id: uid(), percentFrom: 80, grade: 1.75 },
    { id: uid(), percentFrom: 75, grade: 2.0 },
    { id: uid(), percentFrom: 70, grade: 2.25 },
    { id: uid(), percentFrom: 65, grade: 2.5 },
    { id: uid(), percentFrom: 60, grade: 2.75 },
    { id: uid(), percentFrom: 55, grade: 3.0 },
    { id: uid(), percentFrom: 50, grade: 3.5 },
    { id: uid(), percentFrom: 45, grade: 4.0 },
    { id: uid(), percentFrom: 0, grade: 5.0 },
  ];

  let state = loadState() || seedState();

  function seedState() {
    const subj = {
      id: uid(),
      name: 'Sample Subject',
      components: [
        { id: uid(), name: 'Quizzes', weight: 30, entries: [] },
        { id: uid(), name: 'Assignments', weight: 40, entries: [] },
        { id: uid(), name: 'Final Exam', weight: 30, entries: [] },
      ],
      conversion: defaultThresholds.map((t) => ({ ...t })),
    };
    return { subjects: [subj], selectedSubjectId: subj.id, theme: 'dark', view: 'subjects' };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.subjects)) return null;
      if (!obj.selectedSubjectId && obj.subjects[0]) obj.selectedSubjectId = obj.subjects[0].id;
      if (!obj.theme) obj.theme = 'dark';
      if (!obj.view) obj.view = 'subjects';
      return obj;
    } catch (e) {
      console.warn('Failed to load state', e);
      return null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function renderUI() {
    renderSidebar();
    if (state.view === 'about') {
      renderAbout();
    } else {
      renderSubjectDetail();
    }
  }

  function renderSidebar() {
    el.subjectList.innerHTML = '';
    state.subjects.forEach((subject) => {
      const item = document.createElement('div');
      const isActive = state.view === 'subjects' && state.selectedSubjectId === subject.id;
      item.className = 'subject-item' + (isActive ? ' active' : '');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'name';
      nameSpan.textContent = subject.name || 'Untitled';
      const summarySpan = document.createElement('span');
      summarySpan.className = 'summary';
      const percent = calcSubjectPercent(subject);
      const grade = convertPercentToGrade(subject.conversion, percent);
      summarySpan.textContent = `${percent.toFixed(1)}% → ${grade.toFixed(2)}`;
      item.appendChild(nameSpan);
      item.appendChild(summarySpan);
      item.addEventListener('click', () => {
        state.view = 'subjects';
        state.selectedSubjectId = subject.id;
        saveState();
        renderUI();
      });
      el.subjectList.appendChild(item);
    });

    // Toggle About active state
    if (el.openAbout) {
      el.openAbout.classList.toggle('active', state.view === 'about');
    }

    // Update GWA card
    updateGwaCard();
  }

  function updateGwaCard() {
    if (!el.gwaValue || !el.gwaChart) return;

    const items = (state.subjects || [])
      .map((s) => {
        const percent = calcSubjectPercent(s);
        const grade = convertPercentToGrade(s.conversion, percent);
        const name = (s.name || 'Untitled').trim();
        return { name, grade };
      })
      .filter((i) => !isNaN(i.grade));

    if (items.length === 0) {
      el.gwaValue.textContent = '–';
      if (el.gwaAvgLabel) el.gwaAvgLabel.textContent = 'LH';
      el.gwaChart.innerHTML = '';
      if (el.gwaLowest) el.gwaLowest.textContent = '–';
      if (el.gwaHighest) el.gwaHighest.textContent = '–';
      return;
    }

    const gwa = items.reduce((sum, i) => sum + i.grade, 0) / items.length;
    el.gwaValue.textContent = gwa.toFixed(2);
    if (el.gwaAvgLabel) {
      const honors = gwa <= 1.25 ? 'SCL' : (gwa <= 1.45 ? 'MCL' : (gwa <= 1.75 ? 'CL' : '—'));
      el.gwaAvgLabel.textContent = honors;
    }

    const maxH = 80;
    const minH = 20;
    const toHeight = (grade) => {
      const g = Math.max(1, Math.min(5, grade));
      const t = (5 - g) / 4; // 0..1, taller for better grade
      return Math.round(minH + t * (maxH - minH));
    };

    el.gwaChart.innerHTML = items
      .map((i) => {
        const h = toHeight(i.grade);
        const label = i.name ? i.name[0].toUpperCase() : '?';
        return `
          <div class="bar-wrapper" title="${i.name}: ${i.grade.toFixed(2)}">
            <div class="bar-container">
              <div class="bar" style="height:${h}px;">
                <span class="dot dot-top"></span>
                <span class="dot dot-bottom"></span>
              </div>
            </div>
            <div class="day-label">${label}</div>
          </div>`;
      })
      .join('');

    let lowest = items[0];
    let highest = items[0];
    for (const i of items) {
      if (i.grade < lowest.grade) lowest = i;
      if (i.grade > highest.grade) highest = i;
    }
    if (el.gwaLowest) el.gwaLowest.textContent = `${lowest.name} ${lowest.grade.toFixed(2)}`;
    if (el.gwaHighest) el.gwaHighest.textContent = `${highest.name} ${highest.grade.toFixed(2)}`;
  }

  function renderAbout() {
    el.subjectDetail.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'about-content';
    wrap.innerHTML = `
      <h2>About UPG Calculator</h2>
      <p>Plan and compute your UPG per subject by defining components, adding scored entries, and mapping percent to grades.</p>
      <h3>Usage Guide</h3>
      <ul>
        <li>Use <strong>+ Subject</strong> to add subjects on the sidebar.</li>
        <li>Inside a subject, <strong>Add Component</strong> and set its <em>Weight %</em>.</li>
        <li>Add entries (tasks) with <em>Score</em> and <em>Max</em>; the component percent is computed automatically.</li>
        <li>Weights are normalized against their total to compute the subject percent.</li>
        <li>Edit <strong>Conversion</strong> thresholds to map percent ranges to grades 1.0–5.0 and are <strong>customizable according to your syllabus</strong>.</li>
        <li>Data auto-saves in your browser. Use <strong>Import</strong>/<strong>Export</strong> in the sidebar to move data.</li>
      </ul>
      <p>by <strong>@artemiui</strong></p>
    `;
    el.subjectDetail.appendChild(wrap);
  }

  function renderSubjectDetail() {
    el.subjectDetail.innerHTML = '';
    const subject = state.subjects.find((s) => s.id === state.selectedSubjectId);
    if (!subject) {
      const p = document.createElement('p');
      p.textContent = 'No subject selected. Add one on the sidebar.';
      el.subjectDetail.appendChild(p);
      return;
    }
    const subjectNode = subjectView(subject);
    el.subjectDetail.appendChild(subjectNode);
  }

  function render() {
    renderUI();
  }

  function subjectView(subject) {
    const frag = el.tplSubject.content.cloneNode(true);
    const card = frag.querySelector('.subject-card');
    const nameInput = card.querySelector('.subject-name');
    const delBtn = card.querySelector('.delete-subject');
    const addComponentBtn = card.querySelector('.add-component');
    const weightsStatus = card.querySelector('.weights-status');
    const componentsEl = card.querySelector('.components');
    const subjectPercentEl = card.querySelector('.subject-percent');
    const subjectGradeEl = card.querySelector('.subject-grade');
    const summaryEl = card.querySelector('.subject-summary');
    const convDetails = card.querySelector('.conversion');
    const convRows = card.querySelector('.conversion-rows');
    const addThresholdBtn = card.querySelector('.add-threshold');

    nameInput.value = subject.name;
    nameInput.addEventListener('input', (e) => {
      subject.name = e.target.value;
      saveState();
      // avoid full re-render while typing to preserve caret
    });

    delBtn.addEventListener('click', () => {
      if (!confirm(`Delete subject "${subject.name}"?`)) return;
      const idx = state.subjects.findIndex((s) => s.id === subject.id);
      state.subjects = state.subjects.filter((s) => s.id !== subject.id);
      if (state.selectedSubjectId === subject.id) {
        const next = state.subjects[Math.max(0, idx - 1)]?.id;
        state.selectedSubjectId = next || state.subjects[0]?.id || null;
      }
      saveState();
      renderUI();
    });

    addComponentBtn.addEventListener('click', () => {
      subject.components.push({ id: uid(), name: 'New Component', weight: 0, entries: [] });
      saveState();
      renderSubjectDetail();
    });

    // Components
    componentsEl.innerHTML = '';
    subject.components.forEach((comp) => {
      const compNode = componentView(subject, comp);
      componentsEl.appendChild(compNode);
    });

    // Weights status
    const totalWeight = subject.components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
    const normalizedNote = totalWeight !== 0 ? `Normalized by total weight ${totalWeight.toFixed(2)}%` : 'Set weights to compute subject percent';
    weightsStatus.textContent = `Weights sum: ${totalWeight.toFixed(2)}%. ${normalizedNote}.`;

    // Conversion rows
    convRows.innerHTML = '';
    subject.conversion
      .slice()
      .sort((a, b) => b.percentFrom - a.percentFrom)
      .forEach((thr) => convRows.appendChild(thresholdRowView(subject, thr)));

    addThresholdBtn.addEventListener('click', () => {
      subject.conversion.push({ id: uid(), percentFrom: 0, grade: 5.0 });
      saveState();
      renderSubjectDetail();
    });

    // Subject calc
    const subjectPercent = calcSubjectPercent(subject);
    const subjectGrade = convertPercentToGrade(subject.conversion, subjectPercent);
    subjectPercentEl.textContent = `${subjectPercent.toFixed(2)}%`;
    subjectGradeEl.textContent = `${subjectGrade.toFixed(2)}`;
    if (summaryEl) {
      summaryEl.textContent = `${subjectPercent.toFixed(2)}% → ${subjectGrade.toFixed(2)}`;
    }

    return frag;
  }

  function componentView(subject, comp) {
    const frag = el.tplComponent.content.cloneNode(true);
    const card = frag.querySelector('.component-card');
    const nameInput = card.querySelector('.component-name');
    const weightInput = card.querySelector('.component-weight');
    const delBtn = card.querySelector('.delete-component');
    const tbody = card.querySelector('tbody');
    const addEntryBtn = card.querySelector('.add-entry');
    const compBarFill = card.querySelector('.component-percent-bar .bar-fill');
    const compBarText = card.querySelector('.component-percent-bar .bar-text');
    const compTotalEl = card.querySelector('.component-total');

    nameInput.value = comp.name;
    nameInput.addEventListener('input', (e) => {
      comp.name = e.target.value;
      saveState();
      // avoid full re-render while typing to preserve caret
    });

    weightInput.value = Number(comp.weight) || 0;
    weightInput.addEventListener('change', (e) => {
      comp.weight = clampNumber(e.target.value, 0, 100);
      saveState();
      renderSubjectDetail();
    });

    delBtn.addEventListener('click', () => {
      if (!confirm(`Delete component "${comp.name}"?`)) return;
      subject.components = subject.components.filter((c) => c.id !== comp.id);
      saveState();
      renderSubjectDetail();
    });

    tbody.innerHTML = '';
    comp.entries.forEach((entry) => tbody.appendChild(entryRowView(subject, comp, entry)));

    addEntryBtn.addEventListener('click', () => {
      comp.entries.push({ id: uid(), label: 'New Task', score: 0, max: 0 });
      saveState();
      renderSubjectDetail();
    });

    const { scoreSum, maxSum } = totals(comp.entries);
    const percent = maxSum > 0 ? (scoreSum / maxSum) * 100 : 0;
    if (compBarFill) compBarFill.style.width = `${percent}%`;
    if (compBarText) compBarText.textContent = `${percent.toFixed(2)}%`;
    compTotalEl.textContent = `${scoreSum.toFixed(2)} / ${maxSum.toFixed(2)}`;

    return frag;
  }

  function entryRowView(subject, comp, entry) {
    const frag = el.tplEntryRow.content.cloneNode(true);
    const row = frag.querySelector('tr');
    const label = row.querySelector('.entry-label');
    const score = row.querySelector('.entry-score');
    const max = row.querySelector('.entry-max');
    const del = row.querySelector('.delete-entry');

    label.value = entry.label || '';
    score.value = entry.score ?? '';
    max.value = entry.max ?? '';

    label.addEventListener('input', (e) => {
      entry.label = e.target.value;
      saveState();
    });
    score.addEventListener('change', (e) => {
      entry.score = clampNumber(e.target.value, 0, Infinity);
      saveState();
      renderSubjectDetail();
    });
    max.addEventListener('change', (e) => {
      entry.max = clampNumber(e.target.value, 0, Infinity);
      saveState();
      renderSubjectDetail();
    });
    del.addEventListener('click', () => {
      comp.entries = comp.entries.filter((en) => en.id !== entry.id);
      saveState();
      renderSubjectDetail();
    });

    return frag;
  }

  function thresholdRowView(subject, thr) {
    const frag = el.tplThresholdRow.content.cloneNode(true);
    const row = frag.querySelector('.threshold-row');
    const percentInput = row.querySelector('.threshold-percent');
    const gradeInput = row.querySelector('.threshold-grade');
    const delBtn = row.querySelector('.delete-threshold');

    percentInput.value = Number(thr.percentFrom) || 0;
    gradeInput.value = Number(thr.grade) || 5.0;

    percentInput.addEventListener('change', (e) => {
      thr.percentFrom = clampNumber(e.target.value, 0, 100);
      saveState();
      renderSubjectDetail();
    });

    gradeInput.addEventListener('change', (e) => {
      thr.grade = clampNumber(e.target.value, 1.0, 5.0);
      saveState();
      renderSubjectDetail();
    });

    delBtn.addEventListener('click', () => {
      subject.conversion = subject.conversion.filter((t) => t.id !== thr.id);
      if (subject.conversion.length === 0) {
        subject.conversion = defaultThresholds.map((t) => ({ ...t, id: uid() }));
      }
      saveState();
      renderSubjectDetail();
    });

    return frag;
  }

  function totals(entries) {
    let scoreSum = 0;
    let maxSum = 0;
    for (const e of entries) {
      scoreSum += Number(e.score) || 0;
      maxSum += Number(e.max) || 0;
    }
    return { scoreSum, maxSum };
  }

  function calcSubjectPercent(subject) {
    const totalWeight = subject.components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
    if (totalWeight <= 0) return 0;
    let weightedSum = 0;
    for (const comp of subject.components) {
      const { scoreSum, maxSum } = totals(comp.entries);
      const compPercent = maxSum > 0 ? (scoreSum / maxSum) * 100 : 0;
      const normalizedWeight = (Number(comp.weight) || 0) / totalWeight;
      weightedSum += compPercent * normalizedWeight;
    }
    return weightedSum;
  }

  function convertPercentToGrade(thresholds, percent) {
    const sorted = thresholds.slice().sort((a, b) => b.percentFrom - a.percentFrom);
    for (const t of sorted) {
      if (percent >= t.percentFrom) return Number(t.grade);
    }
    return 5.0;
  }

  function clampNumber(val, min, max) {
    let num = Number(val);
    if (!Number.isFinite(num)) num = 0;
    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;
    return Number(num.toFixed(2));
  }

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
  }

  // Export / Import / Reset
  el.exportData.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upg-data.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  el.importFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (!obj || !Array.isArray(obj.subjects)) throw new Error('Invalid JSON format.');
      state = obj;
      if (!state.selectedSubjectId && state.subjects[0]) state.selectedSubjectId = state.subjects[0].id;
      if (!state.theme) state.theme = 'dark';
      saveState();
      applyTheme(state.theme);
      renderUI();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  });

  el.addSubject.addEventListener('click', () => {
    const id = uid();
    state.subjects.push({
      id,
      name: 'New Subject',
      components: [],
      conversion: defaultThresholds.map((t) => ({ ...t, id: uid() })),
    });
    state.selectedSubjectId = id;
    state.view = 'subjects';
    saveState();
    renderUI();
  });

  el.resetData.addEventListener('click', () => {
    if (!confirm('Reset all data? This clears your local storage.')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = seedState();
    saveState();
    applyTheme(state.theme);
    renderUI();
  });

  // Theme toggle
  applyTheme(state.theme);
  if (el.themeToggle) {
    // initialize toggle position: checked = dark
    try { el.themeToggle.checked = state.theme === 'dark'; } catch {}
    el.themeToggle.addEventListener('change', (e) => {
      const isDark = e.target.checked;
      state.theme = isDark ? 'dark' : 'light';
      saveState();
      applyTheme(state.theme);
    });
  }

  // Open About
  el.openAbout && el.openAbout.addEventListener('click', () => {
    state.view = 'about';
    saveState();
    renderUI();
  });

  // Initial render
  renderUI();
})();
