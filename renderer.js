let chartTraj = null;
let histChart = null;

// dati per l'istogramma (ogni colonna = run)
let histData = [];

let currentN = null;
let currentP = null;

// ======== COLORI TRAIETTORIE RANDOM BRILLANTI ========
function randomColor() {
    const r = Math.floor(100 + Math.random() * 155);
    const g = Math.floor(100 + Math.random() * 155);
    const b = Math.floor(100 + Math.random() * 155);
    return `rgba(${r},${g},${b},0.7)`;
}

// ======== TRAJECTORY CHART ========
function resetChart() {
    if (chartTraj) { chartTraj.destroy(); chartTraj = null; }
}

function ensureTrajChart(n) {
    if (!chartTraj) {
        const ctx = document.getElementById('chartTraj').getContext('2d');
        chartTraj = new Chart(ctx, {
            type: 'line',
            data: { labels: Array.from({length: n+1}, (_, i) => i), datasets: [] },
            options: {
                responsive: false,
                animation: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: 'Trial number' } },
                    y: { title: { display: true, text: 'Cumulative successes' } }
                }
            }
        });
    } else {
        // Aggiorna labels se n è cambiato
        chartTraj.data.labels = Array.from({length: n+1}, (_, i) => i);
    }
}

// singola traiettoria cumulata
function simulateSingle(n, p) {
    let successes = 0;
    const arr = [0];
    for (let i = 1; i <= n; i++) {
        if (Math.random() < p) successes++;
        arr.push(successes);
    }
    return arr;
}

// tutte le 2^n traiettorie (n <= 20)
function allTrajectories(n) {
    const total = 2 ** n;
    const trajs = [];
    for (let i = 0; i < total; i++) {
        const arr = [];
        for (let j = n-1; j >= 0; j--) arr.push((i >> j) & 1);
        let cum = [0], s = 0;
        for (let v of arr) { s += v; cum.push(s); }
        trajs.push(cum);
    }
    return trajs;
}

function plotSingle(n, p) {
    ensureTrajChart(n);
    const data = simulateSingle(n, p);
    chartTraj.data.datasets.push({
        data,
        borderColor: randomColor(),
        borderWidth: 2,
        fill: false,
        pointRadius: 0
    });
    chartTraj.update();
}

function plotAll(n, p) {
    if (n > 20) { alert("n too large for trajectory chart (max 20)."); return; }
    resetChart();
    ensureTrajChart(n);

    const allTraj = allTrajectories(n);

    const MAX_PLOT = 5000;
    let toPlot = allTraj;
    if (allTraj.length > MAX_PLOT) {
        const proceed = confirm(`There are ${allTraj.length} trajectories. Plot a sample of ${MAX_PLOT}?`);
        if (!proceed) return;
        toPlot = [];
        const indices = new Set();
        while (indices.size < MAX_PLOT) indices.add(Math.floor(Math.random() * allTraj.length));
        indices.forEach(idx => toPlot.push(allTraj[idx]));
    }

    toPlot.forEach((traj) => {
        chartTraj.data.datasets.push({
            data: traj,
            borderColor: randomColor(),
            borderWidth: 1,
            fill: false,
            pointRadius: 0
        });
    });

    // linea media
    const meanLine = Array.from({length: n+1}, (_, i) => i*p);
    chartTraj.data.datasets.push({
        data: meanLine,
        borderColor: 'red',
        borderWidth: 3,
        fill: false,
        pointRadius: 0
    });

    chartTraj.update();
}

// ======== HISTOGRAM CHART ========
function addHistogramColumn(n, p) {
    let successes = 0;
    for (let i = 0; i < n; i++) if (Math.random() < p) successes++;

    const freq = successes / n;
    histData.push({ n, freq });

    histData.sort((a,b) => a.n - b.n);

    const meanFreq = histData.reduce((sum, d) => sum + d.freq, 0) / histData.length;

    if (!histChart) {
        const ctx = document.getElementById('chartHist').getContext('2d');
        histChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: histData.map(d => d.n),
                datasets: [
                    {
                        type: 'bar',
                        label: 'Frequency (successes/n)',
                        data: histData.map(d => d.freq),
                        backgroundColor: 'rgba(0,128,0,0.5)',
                        borderColor: 'green',
                        borderWidth: 1
                    },
                    {
                        type: 'line',
                        label: 'Mean frequency',
                        data: histData.map(() => meanFreq),
                        borderColor: 'red',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: false,
                scales: {
                    x: { title: { display: true, text: 'Number of trials' } },
                    y: { title: { display: true, text: 'Frequency' }, max: 1 }
                },
                plugins: { legend: { display: true } }
            }
        });
    } else {
        histChart.data.labels = histData.map(d => d.n);
        histChart.data.datasets[0].data = histData.map(d => d.freq);
        histChart.data.datasets[1].data = histData.map(() => meanFreq);
        histChart.update();
    }
}

// ======== EVENT LISTENERS ========
const nInput = document.getElementById('nInput');
const pInput = document.getElementById('pInput');

// Mantieni input modificabile da tastiera
nInput.addEventListener('input', () => {
    const n = parseInt(nInput.value);
    if (!isNaN(n)) currentN = n;
});

pInput.addEventListener('input', () => {
    const p = parseFloat(pInput.value);
    if (!isNaN(p)) currentP = p;
});

document.getElementById('plotSingleBtn').addEventListener('click', () => {
    const n = parseInt(nInput.value);
    const p = parseFloat(pInput.value);

    if (p !== currentP) {
        resetChart();
        histData = [];
        if (histChart) { histChart.destroy(); histChart = null; }
        currentP = p;
        currentN = null;
    }

    if (n !== currentN) {
        resetChart();
        currentN = n;
    }

    plotSingle(n, p);
    addHistogramColumn(n, p);
});

document.getElementById('plotAllBtn').addEventListener('click', () => {
    const n = parseInt(nInput.value);
    const p = parseFloat(pInput.value);

    if (p !== currentP) {
        resetChart();
        histData = [];
        if (histChart) { histChart.destroy(); histChart = null; }
        currentP = p;
        currentN = null;
    }

    if (n !== currentN) {
        resetChart();
        currentN = n;
    }

    plotAll(n, p);
    addHistogramColumn(n, p);
});

document.getElementById('clearBtn').addEventListener('click', () => {
    resetChart();
    histData = [];
    if (histChart) { histChart.destroy(); histChart = null; }
    currentN = null;
    currentP = null;
});