const STORAGE_KEY = 'gastos-del-mes-data-v1';

const state = {
  categories: loadState(),
};

const el = {
  categoriesList: document.getElementById('categoriesList'),
  emptyState: document.getElementById('emptyState'),
  voiceFeedback: document.getElementById('voiceFeedback'),

  categoryModal: document.getElementById('categoryModal'),
  categoryForm: document.getElementById('categoryForm'),
  categoryName: document.getElementById('categoryName'),
  categoryBudget: document.getElementById('categoryBudget'),
  categoryError: document.getElementById('categoryError'),

  expenseModal: document.getElementById('expenseModal'),
  expenseForm: document.getElementById('expenseForm'),
  expenseAmount: document.getElementById('expenseAmount'),
  expenseCategory: document.getElementById('expenseCategory'),
  expenseError: document.getElementById('expenseError'),

  openCategoryModalBtn: document.getElementById('openCategoryModalBtn'),
  openExpenseModalBtn: document.getElementById('openExpenseModalBtn'),
  voiceBtn: document.getElementById('voiceBtn'),
};

boot();

function boot() {
  setupEvents();
  render();
}

function setupEvents() {
  el.openCategoryModalBtn.addEventListener('click', () => {
    resetCategoryForm();
    el.categoryModal.showModal();
  });

  el.openExpenseModalBtn.addEventListener('click', () => {
    if (state.categories.length === 0) {
      setExpenseError('Primero debes crear al menos una categoría.');
      return;
    }
    resetExpenseForm();
    el.expenseModal.showModal();
  });

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.close)?.close();
    });
  });

  el.categoryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    createCategory();
  });

  el.expenseForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addExpense();
  });

  el.voiceBtn.addEventListener('click', handleVoiceInput);
}

function createCategory() {
  const name = el.categoryName.value.trim();
  const budget = Number(el.categoryBudget.value);

  if (!name) return setCategoryError('El nombre es obligatorio.');
  if (!Number.isFinite(budget) || budget <= 0) return setCategoryError('El gasto máximo debe ser mayor a 0.');

  const normalized = normalizeText(name);
  const alreadyExists = state.categories.some((c) => normalizeText(c.name) === normalized);
  if (alreadyExists) return setCategoryError('Ya existe una categoría con ese nombre.');

  state.categories.push({
    id: crypto.randomUUID(),
    name,
    budget: round2(budget),
    spent: 0,
    expenses: [],
  });

  persist();
  render();
  el.categoryModal.close();
}

function addExpense(payload = null) {
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

function render() {
  renderEmptyState();
  renderExpenseCategorySelect();
  renderCategories();
}

function renderEmptyState() {
  el.emptyState.style.display = state.categories.length ? 'none' : 'block';
}

function renderExpenseCategorySelect() {
  el.expenseCategory.innerHTML =
    '<option value="">Selecciona una categoría</option>' +
    state.categories
      .map((category) => `<option value="${category.id}">${escapeHTML(category.name)}</option>`)
      .join('');
}

function renderCategories() {
  if (state.categories.length === 0) {
    el.categoriesList.innerHTML = '';
    return;
  }

  el.categoriesList.innerHTML = state.categories
    .map((category) => {
      const spent = category.spent;
      const budget = category.budget;
      const remaining = round2(budget - spent);
      const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      const progress = Math.min(Math.max(percentage, 0), 100);

      const progressClass = percentage >= 100 ? 'danger' : percentage >= 75 ? 'warn' : '';

      return `
        <article class="card">
          <h3 class="card__title">${escapeHTML(category.name)}</h3>
          <div class="metrics">
            <div>Presupuesto: <strong>${formatSoles(budget)}</strong></div>
            <div>Gastado: <strong>${formatSoles(spent)}</strong></div>
            <div>Restante: <strong>${formatSoles(remaining)}</strong></div>
            <div>Porcentaje: <strong>${percentage}%</strong></div>
          </div>
          <div class="progress" aria-label="Progreso de gasto ${escapeHTML(category.name)}">
            <span class="${progressClass}" style="width:${progress}%"></span>
          </div>
        </article>
      `;
    })
    .join('');
}

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

    const category = findCategoryByName(parsed.categoryName);

    if (!category) {
      setVoiceFeedback(`No existe la categoría "${parsed.categoryName}".`);
      return;
    }

    addExpense({
      amount: parsed.amount,
      categoryId: category.id,
      source: 'voice',
    });

    setVoiceFeedback(`✅ Registrado ${formatSoles(parsed.amount)} en ${category.name}.`);
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

  // Ejemplos: "gastar 20 en comida", "registrar 15 soles en transporte"
  const match = clean.match(/(?:gastar|registrar)\s+(\d+(?:[\.,]\d+)?)\s*(?:soles?)?\s+en\s+(.+)/i);
  if (!match) return null;

  const amount = Number(match[1].replace(',', '.'));
  const categoryName = match[2].trim();

  if (!Number.isFinite(amount) || amount <= 0 || !categoryName) return null;

  return { amount: round2(amount), categoryName };
}

function findCategoryByName(name) {
  const normalized = normalizeText(name);
  return state.categories.find((c) => normalizeText(c.name) === normalized);
}

function resetCategoryForm() {
  el.categoryForm.reset();
  setCategoryError('');
}

function resetExpenseForm() {
  el.expenseForm.reset();
  setExpenseError('');
}

function setCategoryError(message) {
  el.categoryError.textContent = message;
}

function setExpenseError(message) {
  el.expenseError.textContent = message;
  if (message) {
    setTimeout(() => {
      if (el.expenseError.textContent === message) {
        el.expenseError.textContent = '';
      }
    }, 3200);
  }
}

function setVoiceFeedback(message, listening = false) {
  el.voiceFeedback.textContent = message;
  el.voiceFeedback.classList.toggle('listening', listening);
}

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

    return parsed.map((c) => ({
      id: c.id || crypto.randomUUID(),
      name: String(c.name || ''),
      budget: round2(Number(c.budget) || 0),
      spent: round2(Number(c.spent) || 0),
      expenses: Array.isArray(c.expenses) ? c.expenses : [],
    }));
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
