// ====== CONFIG ======
const TRAJECTORIES_TOTAL = 5000;     // Number of paths to simulate
const TRAJECTORIES_FAN   = 50;       // Number of paths to visualize
const HISTOGRAM_BINS     = 40;       // Resolution of the histogram

// ====== CHART REFS ======
let trajChart = null;
let histChart = null;

// ====== DOM ======
const tInput     = document.getElementById('tInput');
const stepsInput = document.getElementById('stepsInput');
const muInput    = document.getElementById('muInput');
const sigmaInput = document.getElementById('sigmaInput');

const generateBtn = document.getElementById('generateBtn');
const resetBtn    = document.getElementById('resetBtn');
const noteDiv     = document.getElementById('note');

// ====== HELPERS ======

function randomColor() {
  const r = Math.floor(Math.random()*200);
  const g = Math.floor(Math.random()*200);
  const b = Math.floor(Math.random()*200);
  return `rgba(${r},${g},${b},0.6)`;
}

// Box-Muller transform for standard normal distribution N(0,1)
function randn_bm() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// Normal Distribution PDF
function normalPDF(x, mean, stdDev) {
    if (stdDev === 0) return 0;
    const m = stdDev * Math.sqrt(2 * Math.PI);
    const e = Math.exp(-Math.pow(x - mean, 2) / (2 * stdDev * stdDev));
    return e / m;
}

// Simulate one path of Arithmetic Brownian Motion
// dX = mu*dt + sigma*dW
function simulateBrownianPath(T, N, mu, sigma) {
  const dt = T / N;
  const path = [0]; // Start at 0
  let currentVal = 0;
  
  // Pre-calculate volatility term
  const volTerm = sigma * Math.sqrt(dt);
  const driftTerm = mu * dt;

  for (let i = 0; i < N; i++) {
    const dW = randn_bm(); // Standard normal Z
    currentVal += driftTerm + (volTerm * dW);
    path.push(currentVal);
  }
  return { path, finalVal: currentVal };
}

// ====== CHARTS ======

function destroyCharts(){
  if (trajChart){ trajChart.destroy(); trajChart = null; }
  if (histChart){ histChart.destroy(); histChart = null; }
}

function ensureTrajChart(T, N){
  const ctx = document.getElementById('trajChart').getContext('2d');
  
  // Generate time labels [0, dt, 2dt ... T]
  const labels = [];
  const dt = T / N;
  for(let i=0; i<=N; i++){
    labels.push((i * dt).toFixed(1));
  }

  // Downsample labels if too many points for the x-axis display
  // (ChartJS can handle this, but explicit labels help)
  
  if (!trajChart){
    trajChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: []
      },
      options: {
        responsive: false,
        animation: false,
        elements: { point: { radius: 0 } }, // hide points for smooth lines
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            title: { display: true, text: 'Time (t)' },
            ticks: { maxTicksLimit: 10 }
          },
          y: { title: { display: true, text: 'Value X(t)' } }
        }
      }
    });
  } else {
    trajChart.data.labels = labels;
    trajChart.data.datasets = [];
    trajChart.update();
  }
}

function ensureHistChart(binCenters, counts, theoryCounts){
  const ctx = document.getElementById('histChart').getContext('2d');
  
  // Format labels
  const labels = binCenters.map(v => v.toFixed(2));

  if (!histChart){
    histChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Observed Frequency',
            data: counts,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            barPercentage: 1.0,
            categoryPercentage: 1.0
          },
          {
            type: 'line',
            label: 'Theoretical PDF (scaled)',
            data: theoryCounts,
            borderColor: 'red',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: true } },
        scales: {
          x: { 
            title: { display: true, text: 'Final Value X(T)' },
            ticks: { maxTicksLimit: 10 }
          },
          y: { title: { display: true, text: 'Count' }, beginAtZero: true }
        }
      }
    });
  } else {
    histChart.data.labels = labels;
    histChart.data.datasets[0].data = counts;
    histChart.data.datasets[1].data = theoryCounts;
    histChart.update();
  }
}

// ====== ACTIONS ======

function validateInputs(){
  const T = Math.abs(Number(tInput.value)) || 10;
  const N = Math.max(1, Math.floor(Number(stepsInput.value))) || 100;
  const mu = Number(muInput.value) || 0;
  const sigma = Math.abs(Number(sigmaInput.value)) || 1;

  // Update UI with sanitized values
  tInput.value = T;
  stepsInput.value = N;
  muInput.value = mu;
  sigmaInput.value = sigma;

  return { T, N, mu, sigma };
}

function runSimulation(){
  const { T, N, mu, sigma } = validateInputs();

  ensureTrajChart(T, N);

  const finalValues = [];

  // 1. Run Simulations
  for (let r = 0; r < TRAJECTORIES_TOTAL; r++) {
    const { path, finalVal } = simulateBrownianPath(T, N, mu, sigma);
    finalValues.push(finalVal);

    // Only draw a subset of trajectories to keep performance high
    if (r < TRAJECTORIES_FAN) {
      trajChart.data.datasets.push({
        data: path,
        borderColor: randomColor(),
        borderWidth: 1,
        fill: false,
      });
    }
  }
  trajChart.update();

  // 2. Build Histogram
  // Determine range
  let minVal = Math.min(...finalValues);
  let maxVal = Math.max(...finalValues);
  
  // Add a little padding to the range
  const range = maxVal - minVal;
  minVal -= range * 0.05;
  maxVal += range * 0.05;

  const binWidth = (maxVal - minVal) / HISTOGRAM_BINS;
  const bins = new Array(HISTOGRAM_BINS).fill(0);
  const binCenters = [];

  // Create bin centers
  for(let i=0; i<HISTOGRAM_BINS; i++) {
    binCenters.push(minVal + (i + 0.5) * binWidth);
  }

  // Fill bins
  for(let v of finalValues) {
    let binIdx = Math.floor((v - minVal) / binWidth);
    if(binIdx < 0) binIdx = 0;
    if(binIdx >= HISTOGRAM_BINS) binIdx = HISTOGRAM_BINS - 1;
    bins[binIdx]++;
  }

  // 3. Calculate Theoretical Normal Distribution
  // Theory: X(T) ~ N(mu*T, sigma^2 * T)
  const theoryMean = mu * T;
  const theoryStd = sigma * Math.sqrt(T);
  
  const theoryCurve = binCenters.map(x => {
    const probDensity = normalPDF(x, theoryMean, theoryStd);
    // Scale PDF to match histogram counts:
    // Count ~ PDF * TotalSamples * BinWidth
    return probDensity * TRAJECTORIES_TOTAL * binWidth;
  });

  ensureHistChart(binCenters, bins, theoryCurve);
}

function resetAll(){
  destroyCharts();
  noteDiv.textContent = '';
}

generateBtn.addEventListener('click', runSimulation);
resetBtn.addEventListener('click', resetAll);

// Init
resetAll();