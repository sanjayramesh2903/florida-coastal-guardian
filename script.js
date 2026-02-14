const tabs = [...document.querySelectorAll('.tab')];
const views = [...document.querySelectorAll('.view')];
const sliders = ['shoreline', 'stormwater', 'elevation', 'shade', 'septic'];
const list = document.getElementById('idea-list');

const state = {
  county: null,
  shoreline: 20,
  stormwater: 25,
  elevation: 15,
  shade: 10,
  septic: 28,
  live: {
    alerts: 0,
    severity: 'Unknown',
    waveM: 0,
    seaTempC: 0
  },
  ideas: [
    { title: 'Canal Buffer Labs', detail: 'Pilot student-led mangrove buffers along neighborhood canals.', votes: 14 },
    { title: 'Cool Block Grants', detail: 'Micro-grants for reflective roofs + shade trees in heat hotspots.', votes: 9 }
  ],
  counties: []
};

const severityRank = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };

function setView(id) {
  views.forEach((v) => v.classList.toggle('active', v.id === id));
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === id));
}

function budgetUsed() {
  return sliders.reduce((sum, key) => sum + Number(state[key]), 0);
}

function computeScenario() {
  const used = budgetUsed();
  const overPenalty = Math.max(0, used - 100) * 1.4;
  const livePenalty = Math.min(24, state.live.alerts * 0.8 + state.live.waveM * 4 + Math.max(0, state.live.seaTempC - 28.5) * 1.8);
  const countyFlood = state.county ? state.county.flood_risk_index * 0.16 : 0;
  const countyWater = state.county ? (100 - state.county.water_quality_index) * 0.06 : 0;

  const flood = Math.max(2, Math.round(42 + countyFlood + livePenalty - state.shoreline * 0.18 - state.stormwater * 0.24 - state.elevation * 0.11 + overPenalty));
  const loss = Math.max(700, Math.round(6200 + countyFlood * 34 + livePenalty * 58 - state.elevation * 32 - state.stormwater * 17 - state.shade * 8 + overPenalty * 55));
  const water = Math.min(100, Math.max(20, Math.round(38 - countyWater + state.septic * 0.47 + state.shoreline * 0.2 - state.stormwater * 0.08)));
  const score = Math.max(1, Math.min(100, Math.round(102 - flood * 0.84 - loss / 300 + water * 0.42 - overPenalty * 1.2)));
  const stress = Math.min(100, Math.round((flood * 1.1 + loss / 120 + (100 - water) * 0.7) / 2.6));

  return { used, flood, loss, water, score, stress, overPenalty };
}

function narrativeText(s) {
  if (s.overPenalty > 0) return 'Plan is over-allocated. Trim lower-impact categories to avoid execution risk.';
  if (s.score >= 78) return 'Strong, balanced plan. This scenario cuts exposure and improves water outcomes for vulnerable blocks.';
  if (s.score >= 58) return 'Moderate resilience gain. Consider boosting stormwater and elevation grants for faster risk reduction.';
  return 'High residual risk under current live conditions. Shift spending toward hardening infrastructure and contamination reduction.';
}

function paintAreaChart(canvasId, values, color = '#71dbff') {
  const c = document.getElementById(canvasId);
  const ctx = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = '#253754';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const y = (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = (v) => (max === min ? 0.5 : (v - min) / (max - min));
  const points = values.map((v, i) => ({ x: (w / (values.length - 1)) * i, y: h - norm(v) * (h - 14) - 7 }));

  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();

  ctx.fillStyle = `${color}30`;
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
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
    <div class="metric"><p>Live FL Alerts</p><strong>${state.live.alerts}</strong></div>
    <div class="metric"><p>Wave Height (avg)</p><strong>${state.live.waveM.toFixed(1)} m</strong></div>
    <div class="metric"><p>Scenario Livability</p><strong>${s.score}/100</strong></div>
  `;

  const stressTrend = [...Array(10)].map((_, i) => Math.max(6, s.stress - i * (s.stress / 12) + Math.sin(i * 1.2) * 2.4));
  paintAreaChart('spark', stressTrend);
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
      vote.addEventListener('click', () => {
        state.ideas[idx].votes += 1;
        renderIdeas();
      });
      row.appendChild(vote);
      list.appendChild(row);
    });
}

function renderCountySelect() {
  const select = document.getElementById('county-select');
  select.innerHTML = state.counties.map((c) => `<option value="${c.id}">${c.county}</option>`).join('');
  if (state.counties[0]) {
    state.county = state.counties[0];
    renderCountyFacts();
  }
}

function renderCountyFacts() {
  if (!state.county) return;
  document.getElementById('county-facts').innerHTML = `
    <strong>${state.county.county}</strong>
    <p>Population: ${state.county.population.toLocaleString()}</p>
    <p>Flood risk index: ${state.county.flood_risk_index}/100</p>
    <p>Water quality baseline: ${state.county.water_quality_index}/100</p>
    <p>Impervious area: ${state.county.impervious_surface_pct}%</p>
  `;
  paintAreaChart('baseline-chart', [
    state.county.flood_risk_index,
    state.county.water_quality_index,
    state.county.impervious_surface_pct,
    state.county.low_elevation_pop_pct,
    state.county.septic_dependence_pct
  ], '#7af0b2');
}

function applyCountyProfile() {
  if (!state.county) return;
  state.shoreline = Math.round(Math.min(45, 12 + state.county.flood_risk_index * 0.24));
  state.stormwater = Math.round(Math.min(45, 10 + state.county.impervious_surface_pct * 0.82));
  state.elevation = Math.round(Math.min(35, 8 + state.county.low_elevation_pop_pct * 0.7));
  state.shade = Math.round(Math.min(24, 6 + (100 - state.county.tree_canopy_index) * 0.18));
  state.septic = Math.round(Math.min(36, 8 + state.county.septic_dependence_pct * 0.6));

  sliders.forEach((id) => {
    document.getElementById(id).value = state[id];
    document.getElementById(`${id}-v`).textContent = state[id];
  });
  setView('studio');
  renderMetrics();
}

async function fetchFloridaAlerts() {
  const res = await fetch('https://api.weather.gov/alerts/active?area=FL', { headers: { Accept: 'application/geo+json' } });
  if (!res.ok) {
    document.getElementById('kpi-alerts').textContent = 'N/A';
    document.getElementById('kpi-severity').textContent = 'N/A';
    throw new Error('Unable to load NWS alerts');
  }
  const payload = await res.json();
  const items = payload.features || [];
  const maxSeverity = items.reduce((top, item) => {
    const sev = item.properties.severity || 'Unknown';
    return severityRank[sev] > severityRank[top] ? sev : top;
  }, 'Unknown');

  document.getElementById('kpi-alerts').textContent = String(items.length);
  document.getElementById('kpi-severity').textContent = maxSeverity;

  const listEl = document.getElementById('alert-list');
  listEl.innerHTML = items.slice(0, 6).map((a) => `<li><strong>${a.properties.event}</strong><br>${a.properties.areaDesc}</li>`).join('');
  state.live.alerts = items.length;
  state.live.severity = maxSeverity;
}

async function fetchMarine() {
  const pts = [
    { name: 'Miami', lat: 25.7617, lon: -80.1918 },
    { name: 'Tampa', lat: 27.9506, lon: -82.4572 },
    { name: 'Jacksonville', lat: 30.3322, lon: -81.6557 }
  ];

  const reads = await Promise.all(pts.map(async (p) => {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${p.lat}&longitude=${p.lon}&hourly=wave_height,sea_surface_temperature&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Marine fetch failed for ${p.name}`);
    const json = await res.json();
    const waves = json.hourly.wave_height.filter((v) => typeof v === 'number');
    const temps = json.hourly.sea_surface_temperature.filter((v) => typeof v === 'number');
    return {
      wave: waves.length ? waves.reduce((a, b) => a + b, 0) / waves.length : 0,
      temp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0
    };
  }));

  const waveM = reads.reduce((a, b) => a + b.wave, 0) / reads.length;
  const seaTempC = reads.reduce((a, b) => a + b.temp, 0) / reads.length;

  document.getElementById('kpi-wave').textContent = `${waveM.toFixed(1)} m`;
  document.getElementById('kpi-temp').textContent = `${seaTempC.toFixed(1)}°C`;

  state.live.waveM = waveM;
  state.live.seaTempC = seaTempC;
}

async function loadCountyDataset() {
  const res = await fetch('data/florida_county_baseline.json');
  if (!res.ok) throw new Error('County dataset unavailable');
  state.counties = await res.json();
  renderCountySelect();
}

async function initLiveData() {
  const results = await Promise.allSettled([fetchFloridaAlerts(), fetchMarine(), loadCountyDataset()]);
  const failed = results.filter((r) => r.status === 'rejected');

  if (failed.some((r) => String(r.reason || '').includes('NWS'))) {
    document.getElementById('kpi-alerts').textContent = 'N/A';
    document.getElementById('kpi-severity').textContent = 'N/A';
  }
  if (failed.some((r) => String(r.reason || '').includes('Marine'))) {
    document.getElementById('kpi-wave').textContent = 'N/A';
    document.getElementById('kpi-temp').textContent = 'N/A';
  }

  if (failed.length === 0) {
    document.getElementById('live-message').textContent = 'Live feeds online. Scenario risk now adjusts using current Florida alerts + marine conditions.';
  } else {
    document.getElementById('live-message').textContent = 'Some live feeds are unavailable in this environment. County baseline data remains active.';
  }

  if (!state.counties.length) {
    document.getElementById('county-facts').textContent = 'County baseline unavailable.';
  }

  document.getElementById('updated-pill').textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  renderMetrics();
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

document.getElementById('apply-county').addEventListener('click', applyCountyProfile);
document.getElementById('county-select').addEventListener('change', (e) => {
  state.county = state.counties.find((c) => c.id === e.target.value);
  renderCountyFacts();
  renderMetrics();
});

document.getElementById('jump-studio').addEventListener('click', () => setView('studio'));
document.getElementById('jump-live').addEventListener('click', () => setView('live-data'));

tabs.forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));

bindSliders();
renderIdeas();
renderMetrics();
initLiveData();
