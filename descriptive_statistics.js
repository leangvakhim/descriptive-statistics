// Data Processing and Math Generation
function processData() {
    const inputStr = document.getElementById('dataInput').value;
    const errorMsg = document.getElementById('errorMsg');

    // Parse input
    const rawParts = inputStr.split(',');
    const data = [];
    for (let part of rawParts) {
        const num = parseFloat(part.trim());
        if (!isNaN(num)) data.push(num);
    }

    if (data.length === 0) {
        errorMsg.classList.remove('hidden');
        return;
    }
    errorMsg.classList.add('hidden');

    const stats = calculateStats(data);
    drawChart(data, stats);
    renderStatsCards(data, stats);
}

// --- Core Statistical Calculations ---
function calculateStats(arr) {
    const n = arr.length;
    const sorted = [...arr].sort((a, b) => a - b);

    // 1. Mean
    const sum = arr.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;

    // 2. Median
    const mid = Math.floor(n / 2);
    const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // 3. Mode
    const counts = {};
    let maxCount = 0;
    arr.forEach(val => {
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > maxCount) maxCount = counts[val];
    });
    const modes = [];
    for (const val in counts) {
        if (counts[val] === maxCount) modes.push(Number(val));
    }

    // 4. Range
    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;

    // 5. Variance & Std Dev (Population)
    const sumSqDiff = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    const variance = sumSqDiff / n;
    const stdDev = Math.sqrt(variance);

    // 6. Interquartile Range (IQR)
    let lowerHalf, upperHalf;
    if (n % 2 !== 0) {
        lowerHalf = sorted.slice(0, mid);
        upperHalf = sorted.slice(mid + 1);
    } else {
        lowerHalf = sorted.slice(0, mid);
        upperHalf = sorted.slice(mid);
    }

    const getMedian = (subArr) => {
        if (subArr.length === 0) return 0;
        const m = Math.floor(subArr.length / 2);
        return subArr.length % 2 !== 0 ? subArr[m] : (subArr[m - 1] + subArr[m]) / 2;
    };

    const q1 = getMedian(lowerHalf);
    const q3 = getMedian(upperHalf);
    const iqr = q3 - q1;

    return { n, sorted, sum, mean, median, modes, maxCount, min, max, range, sumSqDiff, variance, stdDev, q1, q3, iqr };
}

// --- Visualization Render Logic ---
function drawChart(data, stats) {
    const canvas = document.getElementById('statCanvas');
    const ctx = canvas.getContext('2d');

    // Setup dynamic canvas size based on container
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 320;

    const width = canvas.width;
    const height = canvas.height;
    const paddingX = 50;

    // Determine X-axis boundaries
    const minVal = stats.min;
    const maxVal = stats.max;
    let range = maxVal - minVal;
    if (range === 0) range = 10; // Prevent divide by zero if all numbers are same

    // Buffer to keep dots and whiskers away from absolute edge
    const graphMin = minVal - (range * 0.1);
    const graphMax = maxVal + (range * 0.1);
    const graphRange = graphMax - graphMin;

    // Helper to map data value to X coordinate
    const scaleX = (val) => paddingX + ((val - graphMin) / graphRange) * (width - paddingX * 2);

    ctx.clearRect(0, 0, width, height);

    // 1. Draw X-Axis Line
    const axisY = 270;
    ctx.beginPath();
    ctx.moveTo(paddingX, axisY);
    ctx.lineTo(width - paddingX, axisY);
    ctx.strokeStyle = '#9ca3af'; // slate-400
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Ticks & Labels
    ctx.fillStyle = '#475569'; // slate-600
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';

    const tickCount = 10;
    for (let i = 0; i <= tickCount; i++) {
        const val = graphMin + (graphRange * (i / tickCount));
        const x = scaleX(val);
        ctx.beginPath();
        ctx.moveTo(x, axisY - 5);
        ctx.lineTo(x, axisY + 5);
        ctx.stroke();
        ctx.fillText(Number.isInteger(val) ? val : val.toFixed(1), x, axisY + 22);
    }

    // 2. Draw Box Plot
    const boxY = 100;
    const boxHeight = 50;
    const q1X = scaleX(stats.q1);
    const q3X = scaleX(stats.q3);
    const medX = scaleX(stats.median);
    const minX = scaleX(stats.min);
    const maxX = scaleX(stats.max);

    // Whiskers (lines to min/max)
    ctx.beginPath();
    ctx.moveTo(minX, boxY);
    ctx.lineTo(q1X, boxY);
    ctx.moveTo(q3X, boxY);
    ctx.lineTo(maxX, boxY);
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 2;
    ctx.stroke();

    // Whisker end caps
    ctx.beginPath();
    ctx.moveTo(minX, boxY - 12);
    ctx.lineTo(minX, boxY + 12);
    ctx.moveTo(maxX, boxY - 12);
    ctx.lineTo(maxX, boxY + 12);
    ctx.stroke();

    // The Box (IQR)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; // light blue transparent
    ctx.fillRect(q1X, boxY - boxHeight / 2, q3X - q1X, boxHeight);
    ctx.strokeStyle = '#3b82f6';
    ctx.strokeRect(q1X, boxY - boxHeight / 2, q3X - q1X, boxHeight);

    // Median Line (Inside Box)
    ctx.beginPath();
    ctx.moveTo(medX, boxY - boxHeight / 2);
    ctx.lineTo(medX, boxY + boxHeight / 2);
    ctx.strokeStyle = '#ef4444'; // red-500
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Draw Mean Marker
    const meanX = scaleX(stats.mean);
    ctx.beginPath();
    ctx.arc(meanX, boxY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981'; // emerald-500
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Draw Dot Plot (Data Distribution)
    const dotRadius = 6;
    const dotYBase = 245;
    const dotSpacing = 16;

    const counts = {};
    data.forEach(v => counts[v] = (counts[v] || 0) + 1);

    ctx.fillStyle = '#6366f1'; // indigo-500
    for (const [valStr, count] of Object.entries(counts)) {
        const val = parseFloat(valStr);
        const x = scaleX(val);
        for (let i = 0; i < count; i++) {
            ctx.beginPath();
            ctx.arc(x, dotYBase - (i * dotSpacing), dotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// --- Educational Content & Math Rendering ---
function renderStatsCards(data, s) {
    const container = document.getElementById('statsGrid');
    container.innerHTML = ''; // Clear previous

    // Helper to format large array strings for math rendering
    const formatDataSubset = (arr) => {
        if (arr.length <= 8) return arr.join(' + ');
        return `${arr[0]} + ${arr[1]} + \\dots + ${arr[arr.length - 1]}`;
    };
    const sortedStr = s.sorted.length <= 10 ? s.sorted.join(', ') : `${s.sorted.slice(0, 3).join(', ')}, \\dots, ${s.sorted.slice(-3).join(', ')}`;

    // Definitions and LaTeX formulas
    const cards = [
        {
            title: "Mean (Average)",
            desc: "The sum of all values divided by the total number of values. It represents the central value.",
            math: `
                \\mu = \\frac{\\sum_{i=1}^{n} x_i}{n} \\\\[10pt]
                \\mu = \\frac{${formatDataSubset(data)}}{${s.n}} \\\\[10pt]
                \\mu = \\frac{${s.sum}}{${s.n}} = \\mathbf{${s.mean.toFixed(2)}}
            `
        },
        {
            title: "Median",
            desc: "The middle value when the data is ordered from least to greatest. If even, it's the average of the two middle numbers.",
            math: `
                \\text{Sorted: } \\{ ${sortedStr} \\} \\\\[10pt]
                n = ${s.n} \\text{ (${s.n % 2 === 0 ? 'Even' : 'Odd'})} \\\\[10pt]
                \\text{Median} = \\mathbf{${s.median}}
            `
        },
        {
            title: "Mode",
            desc: "The value(s) that appear most frequently in the dataset. A dataset can have one, multiple, or no mode.",
            math: `
                \\text{Frequencies mapping done.} \\\\[10pt]
                \\text{Highest frequency} = ${s.maxCount} \\\\[10pt]
                \\text{Mode(s)} = \\mathbf{\\{ ${s.modes.join(', ')} \\}}
            `
        },
        {
            title: "Range",
            desc: "The difference between the highest and lowest values in the dataset. It measures absolute spread.",
            math: `
                \\text{Range} = \\text{Max} - \\text{Min} \\\\[10pt]
                \\text{Range} = ${s.max} - ${s.min} \\\\[10pt]
                \\text{Range} = \\mathbf{${s.range}}
            `
        },
        {
            title: "Variance ($\\sigma^2$)",
            desc: "The average of the squared differences from the Mean. Measures how spread out the data points are.",
            math: `
                \\sigma^2 = \\frac{\\sum (x_i - \\mu)^2}{n} \\\\[10pt]
                \\sigma^2 = \\frac{${s.sumSqDiff.toFixed(2)}}{${s.n}} \\\\[10pt]
                \\sigma^2 = \\mathbf{${s.variance.toFixed(2)}}
            `
        },
        {
            title: "Standard Deviation ($\\sigma$)",
            desc: "The square root of the variance. It represents the typical distance of a data point from the mean.",
            math: `
                \\sigma = \\sqrt{\\sigma^2} \\\\[10pt]
                \\sigma = \\sqrt{${s.variance.toFixed(2)}} \\\\[10pt]
                \\sigma = \\mathbf{${s.stdDev.toFixed(2)}}
            `
        },
        {
            title: "Interquartile Range (IQR)",
            desc: "The difference between the 75th percentile (Q3) and the 25th percentile (Q1). It measures the spread of the middle 50%.",
            math: `
                Q_1 = ${s.q1}, \\quad Q_3 = ${s.q3} \\\\[10pt]
                \\text{IQR} = Q_3 - Q_1 \\\\[10pt]
                \\text{IQR} = ${s.q3} - ${s.q1} = \\mathbf{${s.iqr}}
            `
        }
    ];

    // Render cards to DOM
    cards.forEach(card => {
        const div = document.createElement('div');
        div.className = "bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col";
        div.innerHTML = `
            <h3 class="text-lg font-bold text-slate-800 mb-2">${card.title}</h3>
            <p class="text-sm text-slate-500 mb-4 flex-grow">${card.desc}</p>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 math-container">
                <div id="math-${card.title.replace(/\s+/g, '-').replace(/[^a-zA-Z-]/g, '')}"></div>
            </div>
        `;
        container.appendChild(div);

        // Render KaTeX safely into the specific element
        const mathElement = div.querySelector('div[id^="math-"]');
        try {
            katex.render(card.math, mathElement, {
                throwOnError: false,
                displayMode: true,
                strict: false
            });
        } catch (e) {
            console.error("KaTeX Error", e);
        }
    });
}

// Initialize on load and setup resize handler
window.onload = () => {
    processData();

    // Redraw chart when window resizes to maintain responsiveness
    window.addEventListener('resize', () => {
        const inputStr = document.getElementById('dataInput').value;
        const data = inputStr.split(',').map(n => parseFloat(n)).filter(n => !isNaN(n));
        if (data.length > 0) {
            drawChart(data, calculateStats(data));
        }
    });
};