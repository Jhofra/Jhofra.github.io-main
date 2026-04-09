const STORAGE_KEY = 'gastos-del-mes-data-v1';

const state = {
  categories: loadState(),
};

/* ─── DOM refs ─── */
const el = {
  categoriesList: document.getElementById('categoriesList'),
  emptyState: document.getElementById('emptyState'),
  voiceFeedback: document.getElementById('voiceFeedback'),

  openCategoryModalBtn: document.getElementById('openCategoryModalBtn'),
  openExpenseModalBtn: document.getElementById('openExpenseModalBtn'),
  voiceBtn: document.getElementById('voiceBtn'),

  /* Add type chooser */
  addTypeModal: document.getElementById('addTypeModal'),
  addGeneralBtn: document.getElementById('addGeneralBtn'),
  addSpecificBtn: document.getElementById('addSpecificBtn'),

  /* Add general (wizard) */
  addGeneralModal: document.getElementById('addGeneralModal'),
  addGenStep1: document.getElementById('addGenStep1'),
  addGenStep2: document.getElementById('addGenStep2'),
  generalName: document.getElementById('generalName'),
  generalBudget: document.getElementById('generalBudget'),
  generalError: document.getElementById('generalError'),
  genNextBtn: document.getElementById('genNextBtn'),
  genBackBtn: document.getElementById('genBackBtn'),
  genSaveBtn: document.getElementById('genSaveBtn'),
  subcategoryInputs: document.getElementById('subcategoryInputs'),
  addSubBtn: document.getElementById('addSubBtn'),
  subcategoryError: document.getElementById('subcategoryError'),

  /* Add specific (existing) */
  categoryModal: document.getElementById('categoryModal'),
  categoryForm: document.getElementById('categoryForm'),
  categoryName: document.getElementById('categoryName'),
  categoryBudget: document.getElementById('categoryBudget'),
  categoryError: document.getElementById('categoryError'),

  /* Expense type chooser */
  expenseTypeModal: document.getElementById('expenseTypeModal'),
  expenseGeneralBtn: document.getElementById('expenseGeneralBtn'),
  expenseSpecificBtn: document.getElementById('expenseSpecificBtn'),

  /* Expense general (wizard) */
  expenseGeneralModal: document.getElementById('expenseGeneralModal'),
  expGenStep1: document.getElementById('expGenStep1'),
  expGenStep2: document.getElementById('expGenStep2'),
  expGenSelect: document.getElementById('expGenSelect'),
  expGenError1: document.getElementById('expGenError1'),
  expGenNextBtn: document.getElementById('expGenNextBtn'),
  expGenBackBtn: document.getElementById('expGenBackBtn'),
  expGenSaveBtn: document.getElementById('expGenSaveBtn'),
  expenseSubFields: document.getElementById('expenseSubFields'),
  expGenError2: document.getElementById('expGenError2'),

  /* Expense specific (existing) */
  expenseModal: document.getElementById('expenseModal'),
  expenseForm: document.getElementById('expenseForm'),
  expenseAmount: document.getElementById('expenseAmount'),
  expenseCategory: document.getElementById('expenseCategory'),
  expenseError: document.getElementById('expenseError'),
};

boot();

/* ═══════════════════════════════════════
   BOOT
   ═══════════════════════════════════════ */
function boot() {
  setupEvents();
  render();
}

/* ═══════════════════════════════════════
   EVENTS
   ═══════════════════════════════════════ */
function setupEvents() {
  /* ── AGREGAR → type chooser ── */
  el.openCategoryModalBtn.addEventListener('click', () => {
    el.addTypeModal.showModal();
  });

  el.addGeneralBtn.addEventListener('click', () => {
    el.addTypeModal.close();
    resetAddGeneralForm();
    el.addGeneralModal.showModal();
  });

  el.addSpecificBtn.addEventListener('click', () => {
    el.addTypeModal.close();
    resetCategoryForm();
    el.categoryModal.showModal();
  });

  /* ── Add general wizard ── */
  el.genNextBtn.addEventListener('click', () => {
    const name = el.generalName.value.trim();
    const budget = Number(el.generalBudget.value);

    if (!name) { el.generalError.textContent = 'El nombre es obligatorio.'; return; }
    if (!Number.isFinite(budget) || budget <= 0) { el.generalError.textContent = 'El gasto máximo debe ser mayor a 0.'; return; }

    const normalized = normalizeText(name);
    if (state.categories.some((c) => normalizeText(c.name) === normalized)) {
      el.generalError.textContent = 'Ya existe una categoría con ese nombre.';
      return;
    }

    el.generalError.textContent = '';
    el.addGenStep1.style.display = 'none';
    el.addGenStep2.style.display = '';

    if (el.subcategoryInputs.children.length === 0) {
      addSubcategoryInput();
    }
  });

  el.genBackBtn.addEventListener('click', () => {
    el.addGenStep2.style.display = 'none';
    el.addGenStep1.style.display = '';
  });

  el.addSubBtn.addEventListener('click', addSubcategoryInput);
  el.genSaveBtn.addEventListener('click', createGeneralCategory);

  /* ── Add specific (existing) ── */
  el.categoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    createSpecificCategory();
  });

  /* ── GASTO → type chooser ── */
  el.openExpenseModalBtn.addEventListener('click', () => {
    const hasGeneral = state.categories.some((c) => c.type === 'general');
    const hasSpecific = state.categories.some((c) => c.type === 'specific');

    el.expenseGeneralBtn.disabled = !hasGeneral;
    el.expenseSpecificBtn.disabled = !hasSpecific;

    if (!hasGeneral && !hasSpecific) {
      setExpenseError('Primero debes crear al menos una categoría.');
      return;
    }

    el.expenseTypeModal.showModal();
  });

  el.expenseGeneralBtn.addEventListener('click', () => {
    el.expenseTypeModal.close();
    resetExpenseGeneralForm();
    el.expenseGeneralModal.showModal();
  });

  el.expenseSpecificBtn.addEventListener('click', () => {
    el.expenseTypeModal.close();
    resetExpenseForm();
    el.expenseModal.showModal();
  });

  /* ── Expense general wizard ── */
  el.expGenNextBtn.addEventListener('click', () => {
    const catId = el.expGenSelect.value;
    if (!catId) { el.expGenError1.textContent = 'Debes seleccionar una categoría.'; return; }

    const cat = state.categories.find((c) => c.id === catId);
    if (!cat) return;

    el.expGenError1.textContent = '';

    el.expenseSubFields.innerHTML = cat.subcategories
      .map(
        (sub) => `
      <div class="expense-sub-field">
        <label>${escapeHTML(sub.name)}</label>
        <input type="number" min="0.01" step="0.01" placeholder="Monto (S/)" data-sub-id="${sub.id}" />
      </div>`
      )
      .join('');

    el.expGenStep1.style.display = 'none';
    el.expGenStep2.style.display = '';
  });

  el.expGenBackBtn.addEventListener('click', () => {
    el.expGenStep2.style.display = 'none';
    el.expGenStep1.style.display = '';
  });

  el.expGenSaveBtn.addEventListener('click', addGeneralExpense);

  /* ── Expense specific (existing) ── */
  el.expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addSpecificExpense();
  });

  /* ── Close buttons ── */
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close)?.close();
    });
  });

  /* ── Voice ── */
  el.voiceBtn.addEventListener('click', handleVoiceInput);

  /* ── Delete (event delegation) ── */
  el.categoriesList.addEventListener('click', (event) => {
    const delCat = event.target.closest('[data-delete-id]');
    if (delCat) {
      deleteCategory(delCat.dataset.deleteId);
      return;
    }

    const delSub = event.target.closest('[data-delete-sub]');
    if (delSub) {
      deleteSubcategory(delSub.dataset.parentId, delSub.dataset.deleteSub);
    }
  });
}

/* ═══════════════════════════════════════
   CREATE — General category
   ═══════════════════════════════════════ */
function addSubcategoryInput() {
  const row = document.createElement('div');
  row.className = 'subcategory-input-row';
  row.innerHTML = `
    <input type="text" maxlength="35" placeholder="Nombre de categoría" class="sub-name-input" />
    <button type="button" class="btn btn--remove-sub" aria-label="Quitar">&times;</button>
  `;
  row.querySelector('.btn--remove-sub').addEventListener('click', () => row.remove());
  el.subcategoryInputs.appendChild(row);
  row.querySelector('input').focus();
}

function createGeneralCategory() {
  const name = el.generalName.value.trim();
  const budget = Number(el.generalBudget.value);

  const inputs = el.subcategoryInputs.querySelectorAll('.sub-name-input');
  const subNames = [];
  inputs.forEach((inp) => {
    const v = inp.value.trim();
    if (v) subNames.push(v);
  });

  if (subNames.length === 0) {
    el.subcategoryError.textContent = 'Debes agregar al menos una categoría específica.';
    return;
  }

  const normalizedSubs = subNames.map(normalizeText);
  if (new Set(normalizedSubs).size !== normalizedSubs.length) {
    el.subcategoryError.textContent = 'No puede haber categorías específicas con el mismo nombre.';
    return;
  }

  el.subcategoryError.textContent = '';

  state.categories.push({
    id: crypto.randomUUID(),
    type: 'general',
    name,
    budget: round2(budget),
    spent: 0,
    subcategories: subNames.map((sn) => ({
      id: crypto.randomUUID(),
      name: sn,
      spent: 0,
      expenses: [],
    })),
  });

  persist();
  render();
  el.addGeneralModal.close();
}

/* ═══════════════════════════════════════
   CREATE — Specific category
   ═══════════════════════════════════════ */
function createSpecificCategory() {
  const name = el.categoryName.value.trim();
  const budget = Number(el.categoryBudget.value);

  if (!name) return setCategoryError('El nombre es obligatorio.');
  if (!Number.isFinite(budget) || budget <= 0) return setCategoryError('El gasto máximo debe ser mayor a 0.');

  const normalized = normalizeText(name);
  if (state.categories.some((c) => normalizeText(c.name) === normalized)) {
    return setCategoryError('Ya existe una categoría con ese nombre.');
  }

  state.categories.push({
    id: crypto.randomUUID(),
    type: 'specific',
    name,
    budget: round2(budget),
    spent: 0,
    expenses: [],
  });

  persist();
  render();
  el.categoryModal.close();
}

/* ═══════════════════════════════════════
   EXPENSE — General category
   ═══════════════════════════════════════ */
function addGeneralExpense() {
  const catId = el.expGenSelect.value;
  const cat = state.categories.find((c) => c.id === catId);
  if (!cat) return;

  const inputs = el.expenseSubFields.querySelectorAll('input[data-sub-id]');
  const entries = [];

  inputs.forEach((inp) => {
    const amount = Number(inp.value);
    if (inp.value.trim() && Number.isFinite(amount) && amount > 0) {
      entries.push({ subId: inp.dataset.subId, amount: round2(amount) });
    }
  });

  if (entries.length === 0) {
    el.expGenError2.textContent = 'Debes ingresar al menos un monto.';
    return;
  }

  entries.forEach(({ subId, amount }) => {
    const sub = cat.subcategories.find((s) => s.id === subId);
    if (!sub) return;
    sub.expenses.push({
      id: crypto.randomUUID(),
      amount,
      createdAt: new Date().toISOString(),
      source: 'manual',
    });
    sub.spent = round2(sub.spent + amount);
  });

  cat.spent = round2(cat.subcategories.reduce((sum, s) => sum + s.spent, 0));

  persist();
  render();
  el.expenseGeneralModal.close();
}

/* ═══════════════════════════════════════
   EXPENSE — Specific category
   ═══════════════════════════════════════ */
function addSpecificExpense(payload = null) {
  const amount = payload?.amount ?? Number(el.expenseAmount.value);
  const categoryId = payload?.categoryId ?? el.expenseCategory.value;

  if (!Number.isFinite(amount) || amount <= 0) return setExpenseError('El monto debe ser mayor a 0.');
  if (!categoryId) return setExpenseError('Debes seleccionar una categoría.');

  const category = state.categories.find((c) => c.id === categoryId);
  if (!category) return setExpenseError('Categoría inválida.');

  const finalAmount = round2(amount);
  category.expenses.push({
    id: crypto.randomUUID(),
    amount: finalAmount,
    createdAt: new Date().toISOString(),
    source: payload?.source ?? 'manual',
  });
  category.spent = round2(category.spent + finalAmount);

  persist();
  render();

  if (!payload) {
    el.expenseModal.close();
  }
}

/* ═══════════════════════════════════════
   DELETE
   ═══════════════════════════════════════ */
function deleteCategory(id) {
  state.categories = state.categories.filter((c) => c.id !== id);
  persist();
  render();
}

function deleteSubcategory(parentId, subId) {
  const parent = state.categories.find((c) => c.id === parentId);
  if (!parent || parent.type !== 'general') return;

  parent.subcategories = parent.subcategories.filter((s) => s.id !== subId);
  parent.spent = round2(parent.subcategories.reduce((sum, s) => sum + s.spent, 0));

  if (parent.subcategories.length === 0) {
    state.categories = state.categories.filter((c) => c.id !== parentId);
  }

  persist();
  render();
}

/* ═══════════════════════════════════════
   RENDER
   ═══════════════════════════════════════ */
function render() {
  renderEmptyState();
  renderExpenseCategorySelect();
  renderExpenseGeneralSelect();
  renderCategories();
}

function renderEmptyState() {
  el.emptyState.style.display = state.categories.length ? 'none' : 'block';
}

function renderExpenseCategorySelect() {
  const specifics = state.categories.filter((c) => c.type === 'specific');
  el.expenseCategory.innerHTML =
    '<option value="">Selecciona una categoría</option>' +
    specifics.map((c) => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
}

function renderExpenseGeneralSelect() {
  const generals = state.categories.filter((c) => c.type === 'general');
  el.expGenSelect.innerHTML =
    '<option value="">Selecciona una categoría general</option>' +
    generals.map((c) => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
}

function renderCategories() {
  if (state.categories.length === 0) {
    el.categoriesList.innerHTML = '';
    return;
  }

  el.categoriesList.innerHTML = state.categories
    .map((cat) => (cat.type === 'general' ? renderGeneralCard(cat) : renderSpecificCard(cat)))
    .join('');
}

function renderGeneralCard(cat) {
  const { budget, spent } = cat;
  const remaining = round2(budget - spent);
  const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const progress = clamp(percentage, 0, 100);
  const progressClass = percentage >= 100 ? 'danger' : percentage >= 75 ? 'warn' : '';

  const maxSubSpent = Math.max(...cat.subcategories.map((s) => s.spent), 0);

  const subsHTML = cat.subcategories
    .map((sub) => {
      const subProgress = maxSubSpent > 0 ? Math.min(Math.round((sub.spent / maxSubSpent) * 100), 100) : 0;
      return `
      <div class="subcard">
        <div class="subcard__header">
          <span class="subcard__name">${escapeHTML(sub.name)}</span>
          <button class="btn btn--delete btn--delete-sm" data-parent-id="${cat.id}" data-delete-sub="${sub.id}" aria-label="Eliminar ${escapeHTML(sub.name)}">✕</button>
        </div>
        <div class="subcard__spent">Gastado: <strong>${formatSoles(sub.spent)}</strong></div>
        <div class="progress progress--sm">
          <span style="width:${subProgress}%"></span>
        </div>
      </div>`;
    })
    .join('');

  return `
    <article class="card card--general">
      <div class="card__header">
        <h3 class="card__title">${escapeHTML(cat.name)}</h3>
        <button class="btn btn--delete" data-delete-id="${cat.id}" aria-label="Eliminar ${escapeHTML(cat.name)}">✕</button>
      </div>
      <div class="metrics">
        <div>Presupuesto: <strong>${formatSoles(budget)}</strong></div>
        <div>Gastado: <strong>${formatSoles(spent)}</strong></div>
        <div>Restante: <strong>${formatSoles(remaining)}</strong></div>
        <div>Porcentaje: <strong>${percentage}%</strong></div>
      </div>
      <div class="progress" aria-label="Progreso de gasto ${escapeHTML(cat.name)}">
        <span class="${progressClass}" style="width:${progress}%"></span>
      </div>
      <div class="subcards">${subsHTML}</div>
    </article>`;
}

function renderSpecificCard(cat) {
  const { budget, spent } = cat;
  const remaining = round2(budget - spent);
  const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const progress = clamp(percentage, 0, 100);
  const progressClass = percentage >= 100 ? 'danger' : percentage >= 75 ? 'warn' : '';

  return `
    <article class="card">
      <div class="card__header">
        <h3 class="card__title">${escapeHTML(cat.name)}</h3>
        <button class="btn btn--delete" data-delete-id="${cat.id}" aria-label="Eliminar ${escapeHTML(cat.name)}">✕</button>
      </div>
      <div class="metrics">
        <div>Presupuesto: <strong>${formatSoles(budget)}</strong></div>
        <div>Gastado: <strong>${formatSoles(spent)}</strong></div>
        <div>Restante: <strong>${formatSoles(remaining)}</strong></div>
        <div>Porcentaje: <strong>${percentage}%</strong></div>
      </div>
      <div class="progress" aria-label="Progreso de gasto ${escapeHTML(cat.name)}">
        <span class="${progressClass}" style="width:${progress}%"></span>
      </div>
    </article>`;
}

/* ═══════════════════════════════════════
   VOICE
   ═══════════════════════════════════════ */
function handleVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setVoiceFeedback('Tu navegador no soporta reconocimiento de voz. Usa Chrome/Edge recientes.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-PE';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  setVoiceFeedback('Escuchando... di: "Gastar 20 en comida"', true);

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
    const parsed = parseVoiceExpense(transcript);

    if (!parsed) {
      setVoiceFeedback(`No pude interpretar: "${transcript}"`);
      return;
    }

    const category = findSpecificCategoryByName(parsed.categoryName);

    if (!category) {
      setVoiceFeedback(`No existe la categoría específica "${parsed.categoryName}".`);
      return;
    }

    addSpecificExpense({
      amount: parsed.amount,
      categoryId: category.id,
      source: 'voice',
    });

    setVoiceFeedback(`Registrado ${formatSoles(parsed.amount)} en ${category.name}.`);
  };

  recognition.onerror = () => {
    setVoiceFeedback('No se pudo capturar audio. Intenta nuevamente.');
  };

  recognition.onend = () => {
    el.voiceFeedback.classList.remove('listening');
  };

  recognition.start();
}

function parseVoiceExpense(rawText) {
  const clean = normalizeText(rawText);
  const match = clean.match(/(?:gastar|registrar)\s+(\d+(?:[\.,]\d+)?)\s*(?:soles?)?\s+en\s+(.+)/i);
  if (!match) return null;

  const amount = Number(match[1].replace(',', '.'));
  const categoryName = match[2].trim();

  if (!Number.isFinite(amount) || amount <= 0 || !categoryName) return null;
  return { amount: round2(amount), categoryName };
}

function findSpecificCategoryByName(name) {
  const normalized = normalizeText(name);
  return state.categories.find((c) => c.type === 'specific' && normalizeText(c.name) === normalized);
}

/* ═══════════════════════════════════════
   FORM RESETS
   ═══════════════════════════════════════ */
function resetAddGeneralForm() {
  el.generalName.value = '';
  el.generalBudget.value = '';
  el.generalError.textContent = '';
  el.subcategoryInputs.innerHTML = '';
  el.subcategoryError.textContent = '';
  el.addGenStep1.style.display = '';
  el.addGenStep2.style.display = 'none';
}

function resetExpenseGeneralForm() {
  el.expGenSelect.value = '';
  el.expGenError1.textContent = '';
  el.expenseSubFields.innerHTML = '';
  el.expGenError2.textContent = '';
  el.expGenStep1.style.display = '';
  el.expGenStep2.style.display = 'none';
}

function resetCategoryForm() {
  el.categoryForm.reset();
  setCategoryError('');
}

function resetExpenseForm() {
  el.expenseForm.reset();
  setExpenseError('');
}

function setCategoryError(msg) {
  el.categoryError.textContent = msg;
}

function setExpenseError(msg) {
  el.expenseError.textContent = msg;
  if (msg) {
    setTimeout(() => {
      if (el.expenseError.textContent === msg) el.expenseError.textContent = '';
    }, 3200);
  }
}

function setVoiceFeedback(msg, listening = false) {
  el.voiceFeedback.textContent = msg;
  el.voiceFeedback.classList.toggle('listening', listening);
}

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */
function formatSoles(value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((c) => {
      if (c.type === 'general') {
        return {
          id: c.id || crypto.randomUUID(),
          type: 'general',
          name: String(c.name || ''),
          budget: round2(Number(c.budget) || 0),
          spent: round2(Number(c.spent) || 0),
          subcategories: Array.isArray(c.subcategories)
            ? c.subcategories.map((s) => ({
                id: s.id || crypto.randomUUID(),
                name: String(s.name || ''),
                spent: round2(Number(s.spent) || 0),
                expenses: Array.isArray(s.expenses) ? s.expenses : [],
              }))
            : [],
        };
      }

      /* Existing v1 data (no type) → treat as specific */
      return {
        id: c.id || crypto.randomUUID(),
        type: 'specific',
        name: String(c.name || ''),
        budget: round2(Number(c.budget) || 0),
        spent: round2(Number(c.spent) || 0),
        expenses: Array.isArray(c.expenses) ? c.expenses : [],
      };
    });
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.categories));
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHTML(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
