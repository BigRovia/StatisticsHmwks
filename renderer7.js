// ====== CONFIG ======
const TRAJECTORIES_TOTAL = 5000;     // fixed
const TRAJECTORIES_FAN   = 100;      // how many trajectories to display

// ====== CHART REFS ======
let trajChart = null;
let histChart = null;

// ====== DOM ======
const nInput = document.getElementById('nInput');
const pInput = document.getElementById('pInput');
const mInput = document.getElementById('mInput');

const generateBtn = document.getElementById('generateBtn');
const resetBtn    = document.getElementById('resetBtn');
const noteDiv     = document.getElementById('note');

// ====== STATE ======
let currentN = Number(nInput.value);
let currentP = Number(pInput.value);
let currentM = Number(mInput.value);

// ====== HELPERS ======
function clamp01(x){ return Math.min(1, Math.max(0, x)); }
function randomColor() {
  const r = Math.floor(Math.random()*200);
  const g = Math.floor(Math.random()*200);
  const b = Math.floor(Math.random()*200);
  return `rgba(${r},${g},${b},0.85)`;
}
function weeklySecureProb(p, m){
  return Math.pow(1 - p, m); // q = (1-p)^m
}

function simulateTrajectory(n, q) {
  const cum = [0];
  let s = 0;
  for (let i = 0; i < n; i++) {
    const step = (Math.random() < q) ? +1 : -1;
    s += step;
    cum.push(s);
  }
  return { cum, finalS: s };
}

function scoreLabels(n){
  const labels = [];
  for (let s = -n; s <= n; s += 2) labels.push(s);
  return labels;
}

function scoreIndexFromS(S, n){
  return (S + n) / 2; // 0..n
}

// === added ===
// Binomial PMF helper
function binomPMF(n, k, q) {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = c * (n - (k - i)) / i;
  }
  return c * Math.pow(q, k) * Math.pow(1 - q, n - k);
}
// === end added ===

// ====== CHARTS ======
function destroyCharts(){
  if (trajChart){ trajChart.destroy(); trajChart = null; }
  if (histChart){ histChart.destroy(); histChart = null; }
}

function ensureTrajChart(n){
  const ctx = document.getElementById('trajChart').getContext('2d');
  if (!trajChart){
    trajChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({length:n+1}, (_,i)=>i),
        datasets: []
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Week (k)' } },
          y: { title: { display: true, text: 'Cumulative score S_k' } }
        }
      }
    });
  } else {
    trajChart.data.labels = Array.from({length:n+1}, (_,i)=>i);
    trajChart.data.datasets = [];
    trajChart.update();
  }
}

function ensureHistChart(n, counts, theoryCounts){
  const ctx = document.getElementById('histChart').getContext('2d');
  const labels = scoreLabels(n);

  if (!histChart){
    histChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Empirical counts',
            data: counts.slice(),
            backgroundColor: 'rgba(40,160,40,0.9)'
          },
          // === added === theoretical overlay
          {
            type: 'line',
            label: 'Theoretical binomial (expected)',
            data: theoryCounts.slice(),
            borderColor: 'red',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.15
          }
        ]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: 'Final score S' } },
          y: { title: { display: true, text: '# trajectories' }, beginAtZero: true }
        }
      }
    });
  } else {
    histChart.data.labels = labels;
    histChart.data.datasets[0].data = counts.slice();
    histChart.data.datasets[1].data = theoryCounts.slice();
    histChart.update();
  }
}

// ====== ACTIONS ======
function validateInputs(){
  const n = Math.max(1, Math.floor(Number(nInput.value)));
  let p = Number(pInput.value);
  p = clamp01(isFinite(p) ? p : 0);
  const m = Math.max(1, Math.floor(Number(mInput.value)));

  nInput.value = n;
  pInput.value = p.toFixed(2);
  mInput.value = m;

  return { n, p, m };
}

function runSimulation(){
  const { n, p, m } = validateInputs();
  currentN = n; currentP = p; currentM = m;

  const q = weeklySecureProb(p, m);
  const bins = Array(n + 1).fill(0);

  ensureTrajChart(n);

  for (let r = 0; r < TRAJECTORIES_TOTAL; r++) {
    const { cum, finalS } = simulateTrajectory(n, q);

    if (r < TRAJECTORIES_FAN) {
      trajChart.data.datasets.push({
        data: cum,
        borderColor: randomColor(),
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0
      });
    }

    const idx = scoreIndexFromS(finalS, n);
    if (Number.isInteger(idx) && idx >= 0 && idx <= n) {
      bins[idx] += 1;
    }
  }
  trajChart.update();

  // === added: compute theoretical distribution ===
  const theory = Array(n + 1).fill(0);
  for (let k = 0; k <= n; k++){
    const s = 2*k - n;
    const idx = scoreIndexFromS(s, n);
    const pK = binomPMF(n, k, q);
    theory[idx] = pK * TRAJECTORIES_TOTAL;
  }
  // === end added ===

  ensureHistChart(n, bins, theory);

  noteDiv.innerHTML = `
    Simulated max <b>${TRAJECTORIES_TOTAL}</b> trajectories of the total 2^n (and displayed 100) with
    n=${n}, p=${p.toFixed(2)}, m=${m}.<br>
    Weekly secure prob: <code>q = (1 - p)^m = ${(q*100).toFixed(2)}%</code>.<br>
    Theoretical curve = Binom(n, q) mapped to S, scaled to expected counts.
  `;
}

function resetAll(){
  destroyCharts();
  noteDiv.textContent = '';
}

generateBtn.addEventListener('click', runSimulation);
resetBtn.addEventListener('click', resetAll);

resetAll();