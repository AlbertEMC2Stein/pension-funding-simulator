const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
// Preserve the literal LaTeX as a readable fallback if the CDN is unavailable.
const mathStatus = document.querySelector('#math-status');
if (window.katex) {
  let mathErrors = 0;
  document.querySelectorAll('[data-math]').forEach(formula => {
    const source = formula.textContent;
    try {
      window.katex.render(source, formula, { displayMode: true, throwOnError: true });
    } catch (error) {
      formula.textContent = source;
      mathErrors += 1;
    }
  });
  mathStatus.textContent = mathErrors
    ? 'Some equations could not be rendered; their LaTeX source is shown instead.'
    : 'Equations are rendered in the technical details of selected entries.';
} else {
  mathStatus.textContent = 'Equation renderer unavailable; LaTeX source is shown instead. An internet connection is required for this draft.';
}
// Preview only: production theme and language preferences need a shared
// settings model, accessible translations, and persistence.
const themeToggle = document.querySelector('#theme-toggle');
themeToggle.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  themeToggle.innerHTML = dark ? '☀ <span>Light mode</span>' : '☾ <span>Dark mode</span>';
});
function showView(name) {
  views.forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
  navItems.forEach(button => {
    const selected = button.dataset.view === name;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#breadcrumb-current').textContent = ({ evaluation: 'EVALUATION', setup: 'MARKET & INVESTOR', data: 'DATA & TABLES', help: 'DICTIONARY & HELP' })[name];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
navItems.forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showView(button.dataset.go)));

const grid = document.querySelector('#workspace-grid');
const settings = document.querySelector('#settings-panel');
function toggleSettings(force) {
  const closed = force ?? !settings.classList.contains('hidden');
  settings.classList.toggle('hidden', closed);
  grid.classList.toggle('settings-closed', closed);
  document.querySelector('#toggle-settings').setAttribute('aria-expanded', String(!closed));
}
document.querySelector('#toggle-settings').addEventListener('click', () => toggleSettings());
document.querySelector('#toggle-settings').setAttribute('aria-expanded', 'true');
document.querySelector('#close-settings').addEventListener('click', () => toggleSettings(true));

document.querySelector('#visual-options').addEventListener('click', () => {
  const panel = document.querySelector('#visual-options-panel');
  panel.classList.toggle('hidden');
  document.querySelector('#visual-options').setAttribute('aria-expanded', String(!panel.classList.contains('hidden')));
});
document.querySelectorAll('[data-chart]').forEach(input => input.addEventListener('change', () => {
  document.getElementById(input.dataset.chart).classList.toggle('hidden', !input.checked);
  const riskViews = ['impoverishment-card', 'borrowing-card'];
  const anyRiskViewVisible = riskViews.some(id => !document.getElementById(id).classList.contains('hidden'));
  document.querySelector('#risk-section').classList.toggle('hidden', !anyRiskViewVisible);
}));
document.querySelector('#projection-check').addEventListener('change', event => {
  document.querySelector('#projection-risk-result').classList.toggle('hidden', !event.target.checked);
});

// These controls demonstrate the chart's interaction; they do not calculate risk.
const timingAge = document.querySelector('#timing-age');
const timingAgeLine = document.querySelector('#timing-age-line');
const timingTail = document.querySelector('#timing-tail-rect');
function updateTimingAge() {
  const fraction = (Number(timingAge.value) - Number(timingAge.min)) / (Number(timingAge.max) - Number(timingAge.min));
  const x = 48 + fraction * 687;
  timingAgeLine.setAttribute('x1', x);
  timingAgeLine.setAttribute('x2', x);
  timingTail.setAttribute('x', x);
  timingTail.setAttribute('width', 735 - x);
  document.querySelector('#timing-age-value').textContent = `${timingAge.value} years`;
}
timingAge.addEventListener('input', updateTimingAge);

function selectTimingButton(button, selector) {
  document.querySelectorAll(selector).forEach(item => {
    const selected = item === button;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
}
function updateTimingDescription() {
  const conditional = document.querySelector('[data-timing-perspective="conditional"]').classList.contains('selected');
  const cumulative = document.querySelector('[data-timing-chart="cumulative"]').classList.contains('selected');
  document.querySelector('#timing-explanation').textContent = conditional
    ? 'Conditional update: risk after the selected age, given survival without impoverishment to that age. The actual conditional curve requires calculation.'
    : cumulative
      ? 'Forecast: the curve would show the cumulative probability of impoverishment before death by each age, assessed at retirement.'
      : 'Forecast: the shaded tail represents impoverishment after the selected age and before death, assessed at retirement.';
}
document.querySelectorAll('[data-timing-perspective]').forEach(button => button.addEventListener('click', () => {
  selectTimingButton(button, '[data-timing-perspective]');
  updateTimingDescription();
}));
document.querySelectorAll('[data-timing-chart]').forEach(button => button.addEventListener('click', () => {
  selectTimingButton(button, '[data-timing-chart]');
  const cumulative = button.dataset.timingChart === 'cumulative';
  document.querySelector('#timing-density').classList.toggle('hidden', cumulative);
  document.querySelector('#timing-cumulative').classList.toggle('hidden', !cumulative);
  document.querySelector('#timing-y-label').textContent = cumulative ? 'CUMULATIVE PROBABILITY' : 'DENSITY';
  document.querySelector('#timing-svg-title').textContent = `Illustrative ${cumulative ? 'cumulative probability' : 'density'} of impoverishment before death by attained age`;
  updateTimingDescription();
}));

const slider = document.querySelector('#risk-slider');
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('selected', item === button));
  const custom = button.dataset.mode === 'custom';
  document.querySelector('#slider-label').firstChild.textContent = custom ? 'Annual withdrawal ' : 'Target lifetime risk ';
  document.querySelector('#withdrawal-range-low').textContent = custom ? 'Lower withdrawal' : 'Lower risk';
  document.querySelector('#withdrawal-range-high').textContent = custom ? 'Higher withdrawal' : 'Higher risk';
  document.querySelector('#withdrawal-output-title').textContent = custom ? 'Model-implied risk' : 'Model-derived withdrawal';
  document.querySelector('#withdrawal-output-unit').textContent = custom ? '%' : '/ year';
  slider.min = custom ? '5000' : '1'; slider.max = custom ? '60000' : '20';
  slider.step = custom ? '500' : '0.5'; slider.value = custom ? '25000' : '5';
  updateSlider();
}));
function updateSlider() {
  const custom = document.querySelector('[data-mode="custom"]').classList.contains('selected');
  document.querySelector('#slider-value').textContent = custom ? `€${Number(slider.value).toLocaleString('en-US')}` : `${Number(slider.value).toFixed(1)}%`;
}
slider.addEventListener('input', updateSlider);

const mortalityMixType = document.querySelector('#mortality-mix-type');
const mortalityMix = document.querySelector('#mortality-mix');
mortalityMixType.addEventListener('change', () => {
  document.querySelector('#mortality-mixture').classList.toggle('hidden', mortalityMixType.value !== 'custom');
});
mortalityMix.addEventListener('input', () => {
  document.querySelector('#mortality-mix-value').textContent = Number(mortalityMix.value).toFixed(2);
});
document.querySelector('#stress-preview-toggle').addEventListener('change', event => {
  document.querySelector('#stress-preview').classList.toggle('hidden', !event.target.checked);
});

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(item => { const selected = item === tab; item.classList.toggle('active', selected); item.setAttribute('aria-selected', String(selected)); });
  document.querySelectorAll('.setup-tab').forEach(panel => panel.classList.toggle('active', panel.id === `tab-${tab.dataset.tab}`));
}));
document.querySelectorAll('.method').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.method').forEach(item => item.classList.toggle('active', item === button));
  if (!button.textContent.includes('Preset')) showToast('This input method is shown for layout only.');
}));

let rowNumber = 2;
document.querySelector('#add-row').addEventListener('click', () => {
  rowNumber += 1;
  const row = document.createElement('tr');
  row.innerHTML = `<td><b>Scenario ${String(rowNumber).padStart(2, '0')}</b></td><td><select aria-label="Input type"><option>Target risk</option><option>Withdrawal</option></select></td><td><input aria-label="Input value" value="5.0%"></td><td>—</td><td>—</td><td><span class="table-status">○ &nbsp; Not calculated</span></td><td><button class="row-remove" aria-label="Remove row">×</button></td>`;
  document.querySelector('#scenario-rows').append(row);
});
document.querySelector('#scenario-rows').addEventListener('click', event => { if (event.target.closest('.row-remove')) event.target.closest('tr').remove(); });
document.querySelector('#table-type').addEventListener('change', () => showToast('Table types are illustrative; columns are not connected yet.'));
let toastTimer;
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500); }
document.querySelector('#language-preview').addEventListener('change', event => {
  if (event.target.value === 'de') {
    showToast('German selected for preview. The interface is still in English; translations are not implemented yet.');
  } else {
    showToast('English selected. Language switching is a preview.');
  }
});
document.querySelectorAll('[data-demo-action]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.demoAction)));
const dictionarySearch = document.querySelector('#dictionary-search');
const dictionaryEntries = [...document.querySelectorAll('.dictionary-entry')];
function filterDictionary() {
  const query = dictionarySearch.value.trim().toLocaleLowerCase();
  let count = 0;
  dictionaryEntries.forEach(entry => {
    const matches = `${entry.dataset.search} ${entry.textContent}`.toLocaleLowerCase().includes(query);
    entry.classList.toggle('hidden', !matches);
    if (matches) count += 1;
  });
  document.querySelector('#dictionary-count').textContent = `Showing ${count} example ${count === 1 ? 'term' : 'terms'}`;
  document.querySelector('#dictionary-empty').classList.toggle('hidden', count !== 0);
}
dictionarySearch.addEventListener('input', filterDictionary);
const helpDialog = document.querySelector('#gm-help-dialog');
document.querySelector('#gm-help-open').addEventListener('click', () => helpDialog.showModal());
document.querySelector('#gm-help-close').addEventListener('click', () => helpDialog.close());
document.querySelectorAll('[data-term]').forEach(button => button.addEventListener('click', () => {
  if (helpDialog.open) helpDialog.close();
  dictionarySearch.value = '';
  filterDictionary();
  showView('help');
  const entry = document.getElementById(`term-${button.dataset.term}`);
  entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
  entry.focus({ preventScroll: true });
}));
