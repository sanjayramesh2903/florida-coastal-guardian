const tabs = [...document.querySelectorAll('.tab')];
const views = [...document.querySelectorAll('.view')];
const sliders = ['shoreline', 'stormwater', 'elevation', 'shade', 'septic'];
const list = document.getElementById('idea-list');

const state = {
  shoreline: 20,
  stormwater: 25,
  elevation: 15,
  shade: 10,
  septic: 28,
  ideas: [
    { title: 'Canal Buffer Labs', detail: 'Pilot student-led mangrove buffers along neighborhood canals.', votes: 14 },
    { title: 'Cool Block Grants', detail: 'Micro-grants for reflective roofs + shade trees in heat hotspots.', votes: 9 }
  ]
};

function setView(id) {
  views.forEach(v => v.classList.toggle('active', v.id === id));
  tabs.forEach(t => t.classList.toggle('active', t.dataset.view === id));
}

function budgetUsed() {
  return sliders.reduce((sum, key) => sum + Number(state[key]), 0);
}

function computeScenario() {
  const used = budgetUsed();
  const overPenalty = Math.max(0, used - 100) * 1.4;

  const flood = Math.max(2, Math.round(45 - state.shoreline * 0.18 - state.stormwater * 0.24 - state.elevation * 0.11 + overPenalty));
  const loss = Math.max(900, Math.round(6400 - state.elevation * 34 - state.stormwater * 17 - state.shade * 7 + overPenalty * 55));
  const water = Math.min(100, Math.max(22, Math.round(36 + state.septic * 0.5 + state.shoreline * 0.22 - state.stormwater * 0.08)));
  const score = Math.max(1, Math.min(100, Math.round(100 - flood * 0.82 - loss / 300 + water * 0.42 - overPenalty * 1.2)));
  const stress = Math.min(100, Math.round((flood * 1.1 + loss / 120 + (100 - water) * 0.7) / 2.6));

  return { used, flood, loss, water, score, stress, overPenalty };
}

function narrativeText(s) {
  if (s.overPenalty > 0) return 'Plan is over-allocated. Trim lower-impact categories to avoid execution risk.';
  if (s.score >= 78) return 'Strong, balanced plan. This scenario cuts exposure and improves water outcomes for vulnerable blocks.';
  if (s.score >= 58) return 'Moderate resilience gain. Consider boosting stormwater and elevation grants for faster risk reduction.';
  return 'High residual risk. Reweight spending toward hardening neighborhoods and reducing contamination pathways.';
}

function paintSpark(stress) {
  const c = document.getElementById('spark');
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = '#253754';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const y = (h / 5) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const base = stress;
  const points = [...Array(10)].map((_, i) => {
    const val = Math.max(5, Math.min(95, base - i * (base / 20) + (Math.sin(i * 1.2) * 4)));
    return { x: (w / 9) * i, y: h - (val / 100) * h };
  });

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#71dbff';
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.stroke();

  ctx.fillStyle = 'rgba(113,219,255,.15)';
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
}

function renderMetrics() {
  const s = computeScenario();
  document.getElementById('budget-pill').textContent = `Budget left: $${Math.max(0, 120 - Math.round(s.used * 1.2))}M`;
  document.getElementById('flood').textContent = `${s.flood} days/yr`;
  document.getElementById('loss').textContent = `$${s.loss.toLocaleString()}`;
  document.getElementById('water').textContent = `${s.water}/100`;
  document.getElementById('score').textContent = `${s.score}/100`;
  document.getElementById('stress-bar').style.width = `${s.stress}%`;
  document.getElementById('narrative').textContent = narrativeText(s);

  document.getElementById('headline-metrics').innerHTML = `
    <div class="metric"><p>Livability score</p><strong>${s.score}</strong></div>
    <div class="metric"><p>Flooded road days</p><strong>${s.flood}</strong></div>
    <div class="metric"><p>Water quality index</p><strong>${s.water}</strong></div>
  `;

  paintSpark(s.stress);
}

function bindSliders() {
  sliders.forEach((id) => {
    const el = document.getElementById(id);
    const label = document.getElementById(`${id}-v`);
    label.textContent = el.value;
    el.addEventListener('input', () => {
      state[id] = Number(el.value);
      label.textContent = el.value;
      renderMetrics();
    });
  });
}

function renderIdeas() {
  list.innerHTML = '';
  state.ideas
    .sort((a, b) => b.votes - a.votes)
    .forEach((idea, idx) => {
      const row = document.createElement('article');
      row.className = 'idea';
      row.innerHTML = `<div><strong>${idea.title}</strong><p>${idea.detail}</p></div>`;
      const vote = document.createElement('button');
      vote.className = 'vote';
      vote.textContent = `▲ ${idea.votes}`;
      vote.addEventListener('click', () => { state.ideas[idx].votes += 1; renderIdeas(); });
      row.appendChild(vote);
      list.appendChild(row);
    });
}

document.getElementById('idea-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('idea-title').value.trim();
  const detail = document.getElementById('idea-detail').value.trim();
  if (!title || !detail) return;
  state.ideas.push({ title, detail, votes: 1 });
  e.target.reset();
  renderIdeas();
});

document.getElementById('optimize').addEventListener('click', () => {
  Object.assign(state, { shoreline: 24, stormwater: 31, elevation: 20, shade: 9, septic: 16 });
  sliders.forEach((id) => {
    const el = document.getElementById(id);
    el.value = state[id];
    document.getElementById(`${id}-v`).textContent = state[id];
  });
  renderMetrics();
});

document.getElementById('randomize').addEventListener('click', () => {
  sliders.forEach((id) => {
    state[id] = Math.floor(Math.random() * 45);
    const el = document.getElementById(id);
    el.value = state[id];
    document.getElementById(`${id}-v`).textContent = state[id];
  });
  setView('studio');
  renderMetrics();
});

document.getElementById('jump-studio').addEventListener('click', () => setView('studio'));

tabs.forEach(t => t.addEventListener('click', () => setView(t.dataset.view)));

bindSliders();
renderIdeas();
renderMetrics();
