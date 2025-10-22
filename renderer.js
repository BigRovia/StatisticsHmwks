let trajChart = null;
let histChart = null;

// ====== STATE ======
let currentN = null;
let currentP = null;
let experimentLocked = false; // after Plot All

// Histogram (final successes X_n): bins for x = 0..n
let histCounts = [];   // green base = accumulated counts per x
let lastDelta  = [];   // blue overlay = last run +1 (only at one x)

// ====== DOM ======
const nInput = document.getElementById('nInput');
const pInput = document.getElementById('pInput');
const plotSingleBtn = document.getElementById('plotSingleBtn');
const plotAllBtn = document.getElementById('plotAllBtn');
const resetBtn = document.getElementById('resetBtn');
const noteDiv = document.getElementById('note');

// ====== COLORS ======
const GREEN = 'rgba(40,160,40,0.9)';    // accumulated
const BLUE  = 'rgba(30,120,255,0.95)';  // last delta
function randomColor() {
  // RGB casuali (R2)
  const r = Math.floor(Math.random()*256);
  const g = Math.floor(Math.random()*256);
  const b = Math.floor(Math.random()*256);
  return `rgba(${r},${g},${b},0.8)`;
}

// ====== HELPERS ======
function setPlotButtonsEnabled(enabled){
  plotSingleBtn.disabled = !enabled;
  plotAllBtn.disabled = !enabled;
}
function simulateBits(n,p){
  const arr = [];
  for(let i=0;i<n;i++) arr.push(Math.random()<p ? 1 : 0);
  return arr;
}
function binom(n,k){
  if (k<0 || k>n) return 0;
  if (k===0 || k===n) return 1;
  k = Math.min(k, n-k);
  let res = 1;
  for (let i=1;i<=k;i++){
    res = res * (n - k + i) / i;
  }
  return res;
}

// ====== TRAJECTORY CHART ======
function ensureTrajChart(n) {
  const ctx = document.getElementById('trajChart').getContext('2d');
  if (!trajChart) {
    trajChart = new Chart(ctx, {
      type: 'line',
      data: { labels: Array.from({length:n+1}, (_,i)=>i), datasets: [] },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display:false } },
        scales: {
          x: { title:{ display:true, text:'Trial (k)'} },
          y: { title:{ display:true, text:'Cumulative successes'}, beginAtZero:true }
        }
      }
    });
  } else {
    trajChart.data.labels = Array.from({length:n+1}, (_,i)=>i);
    trajChart.update();
  }
}
function destroyTrajChart(){ if (trajChart){ trajChart.destroy(); trajChart=null; } }

// ====== HISTOGRAM X_n (STACKED: GREEN=ACCUM, BLUE=LAST DELTA) ======
function ensureHistChart(n){
  const ctx = document.getElementById('histChart').getContext('2d');
  const labels = Array.from({length:n+1}, (_,i)=>i.toString());
  const greenData = histCounts.map((v,i)=> v - (lastDelta[i]||0));
  const blueData  = lastDelta.slice();

  if (!histChart){
    histChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { data: greenData, backgroundColor: GREEN, stack:'s' },
          { data: blueData,  backgroundColor: BLUE,  stack:'s' }
        ]
      },
      options: {
        responsive:false, animation:false, plugins:{ legend:{ display:false }},
        scales:{
          x:{ title:{ display:true, text:'Final successes Xₙ' }, stacked:true },
          y:{ title:{ display:true, text:'Count of trajectories' }, beginAtZero:true, stacked:true }
        }
      }
    });
  } else {
    histChart.data.labels = labels;
    histChart.data.datasets[0].data = greenData;
    histChart.data.datasets[1].data = blueData;
    histChart.update();
  }
}
function destroyHistChart(){ if (histChart){ histChart.destroy(); histChart=null; } }

// ====== GLOBAL RESETS ======
function resetAll(){
  destroyTrajChart();
  destroyHistChart();
  const n = Number(nInput.value);
  histCounts = Array(n+1).fill(0);
  lastDelta  = Array(n+1).fill(0);
  experimentLocked = false;
  setPlotButtonsEnabled(true);
  noteDiv.textContent = '';
}

// ====== ACTIONS ======
function handlePlotSingle(){
  if (experimentLocked) return;

  const n = Number(nInput.value);
  const p = Number(pInput.value);

  // structural changes => full reset
  if (currentP===null || currentN===null || p!==currentP || n!==currentN){
    currentP = p; currentN = n; resetAll();
  }

  ensureTrajChart(n);
  ensureHistChart(n);

  // simulate one trajectory and plot it
  const bits = simulateBits(n, p);
  const cum = [0]; let s=0; for (let i=0;i<n;i++){ s += bits[i]; cum.push(s); }
  trajChart.data.datasets.push({
    data: cum,
    borderColor: randomColor(),
    borderWidth: 2,
    fill: false,
    pointRadius: 0
  });
  trajChart.update();

  // last delta: clear previous, add +1 at x = final successes
  lastDelta.fill(0);
  const xFinal = cum[n];       // X_n
  histCounts[xFinal] += 1;
  lastDelta[xFinal] = 1;

  ensureHistChart(n);
}

function handlePlotAll(){
  const n = Number(nInput.value);
  const p = Number(pInput.value);

  // structural changes => full reset
  if (currentP===null || currentN===null || p!==currentP || n!==currentN){
    currentP = p; currentN = n; resetAll();
  }

  // Rebuild histogram base
  histCounts = Array(n+1).fill(0);
  lastDelta  = Array(n+1).fill(0); // no blue after Plot all

  // --- Branch per n ---
  if (n <= 12){
    // 1) Disegna TUTTE le traiettorie (2^n) a sinistra
    destroyTrajChart(); ensureTrajChart(n);
    const total = 1 << n; // 2^n
    for (let m=0; m<total; m++){
      let cum=[0], s=0;
      for (let j=n-1; j>=0; j--){
        const bit = (m>>j) & 1; // 0/1
        s += bit;
        cum.push(s);
      }
      trajChart.data.datasets.push({
        data: cum,
        borderColor: randomColor(),
        borderWidth: 1,
        fill: false,
        pointRadius: 0
      });
    }
    trajChart.update();

    // 2) Istogramma a destra: usa la binomiale con p e scala su 2^n
    for (let x=0; x<=n; x++){
      const pmf = binom(n,x) * Math.pow(p, x) * Math.pow(1-p, n-x);
      histCounts[x] = Math.round((1 << n) * pmf);
    }
    ensureHistChart(n);
    noteDiv.textContent = `"Plot all" (n ≤ 12): all trajectories drawn; histogram weighted by p.`;
  }
  else if (n <= 20){
    // 13..20: sample 5000 trajectories using p; disegna un ventaglio
    destroyTrajChart(); ensureTrajChart(n);
    const RUNS = 5000;
    const FAN  = Math.min(1000, RUNS);
    for (let r=0; r<RUNS; r++){
      const bits = simulateBits(n, p);
      let cum=[0], s=0;
      for (const v of bits){ s+=v; cum.push(s); }
      if (r < FAN){
        trajChart.data.datasets.push({
          data: cum,
          borderColor: randomColor(),
          borderWidth: 1,
          fill: false,
          pointRadius: 0
        });
      }
      histCounts[s] += 1;
    }
    trajChart.update();
    ensureHistChart(n);
    noteDiv.textContent = `"Plot all" (13 ≤ n ≤ 20): histogram estimated with 5000 runs; fan of 1000 trajectories displayed.`;
  }
  else {
    // n > 20: NON disegniamo le traiettorie (sinistra), ma calcoliamo COMUNQUE l'istogramma (destra)
    destroyTrajChart(); // lasciamo vuoto il pannello sinistro
    const RUNS = Math.min(20000, 1000 * Math.ceil(n/10)); // 10k..20k circa, bilanciato
    for (let r=0; r<RUNS; r++){
      const bits = simulateBits(n, p);
      let s = 0;
      for (let i=0;i<n;i++) s += bits[i];
      histCounts[s] += 1;
    }
    ensureHistChart(n);
    noteDiv.textContent = `"Plot all" (n > 20): estimated histogram only (${Math.min(20000, 1000 * Math.ceil(n/10))} runs); trajectory graph not rendered.`;
  }

  // lock plotting until reset
  experimentLocked = true;
  setPlotButtonsEnabled(false);
}

function handleReset(){
  currentN = Number(nInput.value);
  currentP = Number(pInput.value);
  resetAll();
}

// ====== INPUT LISTENERS ======
nInput.addEventListener('input', () => {
  const n = Number(nInput.value)||1;
  if (currentN===null || n!==currentN){
    currentN = n;
    currentP = Number(pInput.value);
    handleReset();
  }
});
pInput.addEventListener('input', () => {
  const p = Number(pInput.value);
  if (currentP===null || p!==currentP){
    currentP = p;
    currentN = Number(nInput.value);
    handleReset();
  }
});

// ====== BUTTON HANDLERS ======
plotSingleBtn.addEventListener('click', handlePlotSingle);
plotAllBtn.addEventListener('click', handlePlotAll);
resetBtn.addEventListener('click', handleReset);

// ====== INIT ======
currentN = Number(nInput.value);
currentP = Number(pInput.value);
resetAll(); // clean start
