/*
          PocketTrack - Lightweight monthly expense tracker (vanilla JS)
          Storage key: 'pockettrack_entries'
          Data model:
            [{id: 'uuid', date: 'YYYY-MM-DD', balance: number, note: ''}, ...]
        */

const STORAGE_KEY = 'pockettrack_entries_v1';

// ---------- utilities ----------
function uid() { return Math.random().toString(36).slice(2, 9); }
function loadEntries() {
    try {
        const j = localStorage.getItem(STORAGE_KEY);
        return j ? JSON.parse(j) : [];
    } catch (e) { return []; }
}
function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
function fmtDate(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function yyyyMm(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function daysBetween(a, b) {
    const A = new Date(a + 'T00:00:00'), B = new Date(b + 'T00:00:00');
    return Math.round((B - A) / (1000 * 60 * 60 * 24));
}

// ---------- core logic ----------
function groupByMonth(entries) {
    // entries: array of {date, balance, id, note}
    const groups = {};
    entries.forEach(e => {
        const key = yyyyMm(e.date);
        if (!groups[key]) groups[key] = [];
        groups[key].push(e);
    });
    // sort each group by date asc
    for (const k in groups) {
        groups[k].sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    // return sorted keys newest-first
    const sortedKeys = Object.keys(groups).sort((a, b) => {
        return new Date(b + '-01') - new Date(a + '-01');
    });
    return { groups, sortedKeys };
}

function computeMonthStats(entriesSortedAsc) {
    // returns object:
    // {startBalance, endBalance, totalSpent, totalGain, perEntry: [{date,balance,spent}], daysCovered}
    if (entriesSortedAsc.length === 0) return null;
    const perEntry = [];
    let totalSpent = 0, totalGain = 0;
    for (let i = 0; i < entriesSortedAsc.length; i++) {
        const cur = entriesSortedAsc[i];
        if (i === 0) {
            perEntry.push({ ...cur, spent: null });
            continue;
        }
        const prev = entriesSortedAsc[i - 1];
        const delta = Number(prev.balance) - Number(cur.balance);
        const spent = delta > 0 ? delta : 0;
        const gain = delta < 0 ? -delta : 0;
        totalSpent += spent;
        totalGain += gain;
        perEntry.push({ ...cur, spent: parseFloat(spent.toFixed(2)), gain: parseFloat(gain.toFixed(2)), delta: parseFloat(delta.toFixed(2)) });
    }
    const startBalance = Number(entriesSortedAsc[0].balance);
    const endBalance = Number(entriesSortedAsc[entriesSortedAsc.length - 1].balance);
    const firstDate = entriesSortedAsc[0].date;
    const lastDate = entriesSortedAsc[entriesSortedAsc.length - 1].date;
    const daysCovered = daysBetween(firstDate, lastDate) + 1;
    const avgSpentPerDay = daysCovered > 0 ? totalSpent / daysCovered : 0;
    return {
        startBalance: parseFloat(startBalance.toFixed(2)),
        endBalance: parseFloat(endBalance.toFixed(2)),
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        totalGain: parseFloat(totalGain.toFixed(2)),
        perEntry,
        daysCovered,
        avgSpentPerDay: parseFloat(avgSpentPerDay.toFixed(2)),
        firstDate, lastDate
    };
}

// ---------- UI/rendering ----------
const monthsContainer = document.getElementById('monthsContainer');
const dateInput = document.getElementById('dateInput');
const amountInput = document.getElementById('amountInput');
const addBtn = document.getElementById('addBtn');
const newMonthBtn = document.getElementById('newMonthBtn');
const demoBtn = document.getElementById('demoBtn');
const exportCsv = document.getElementById('exportCsv');
const clearAll = document.getElementById('clearAll');

let editingId = null;

function render() {
    const raw = loadEntries();
    const { groups, sortedKeys } = groupByMonth(raw);
    monthsContainer.innerHTML = '';
    if (sortedKeys.length === 0) {
        monthsContainer.innerHTML = '<div class="card"><p class="muted">No entries yet. Add a date + remaining balance to start tracking. Try "Load demo" for sample data.</p></div>';
        return;
    }
    sortedKeys.forEach(key => {
        const entries = groups[key];
        const stats = computeMonthStats(entries);
        const monthCard = document.createElement('div');
        monthCard.className = 'card';
        const dateTitle = new Date(key + '-01');
        const monthTitle = dateTitle.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        monthCard.innerHTML = `
      <div class="month-row">
        <div>
          <strong>${monthTitle}</strong>
          <div class="small">From ${fmtDate(stats.firstDate)} to ${fmtDate(stats.lastDate)} • ${stats.daysCovered} day(s) tracked</div>
        </div>
        <div class="stats">
          <div class="stat"><div class="small">Start</div><div><strong>৳ ${stats.startBalance.toLocaleString()}</strong></div></div>
          <div class="stat"><div class="small">Current</div><div><strong>৳ ${stats.endBalance.toLocaleString()}</strong></div></div>
          <div class="stat"><div class="small">Total spent</div><div><strong>৳ ${stats.totalSpent.toLocaleString()}</strong></div></div>
          <div class="stat"><div class="small">Avg / day</div><div><strong>৳ ${stats.avgSpentPerDay.toLocaleString()}</strong></div></div>
        </div>
      </div>
      <div class="entries" id="entries-${key}"></div>
    `;
        monthsContainer.appendChild(monthCard);

        const list = monthCard.querySelector('#entries-' + key);
        // add header row
        const header = document.createElement('div');
        header.className = 'entry';
        header.innerHTML = `<div class="date small">Date</div><div class="small">Remaining (৳)</div><div class="small">Spent since prev</div><div class="small">Actions</div>`;
        list.appendChild(header);

        // per-entry rows (sorted asc)
        [...stats.perEntry].slice().reverse().forEach((e, idx) => {
            const row = document.createElement('div');
            row.className = 'entry';
            const dateCell = document.createElement('div'); dateCell.innerHTML = `<div class="date">${fmtDate(e.date)}</div><div class="small">${e.date}</div>`;
            const balCell = document.createElement('div'); balCell.innerHTML = `<div>৳ ${Number(e.balance).toLocaleString()}</div>`;
            const spentCell = document.createElement('div');
            let spentHtml = '';
            if (e.spent === null) spentHtml = '<div class="small">— first snapshot</div>';
            else if (e.spent > 0) spentHtml = `<div class="spent">৳ ${Number(e.spent).toLocaleString()}</div><div class="small">(${e.delta.toLocaleString()} decrease)</div>`;
            else if (e.spent === 0 && e.gain > 0) spentHtml = `<div class="small">+৳ ${Number(e.gain).toLocaleString()} (gain)</div>`;
            else spentHtml = '<div class="small">No change</div>';
            spentCell.innerHTML = spentHtml;
            const actionsCell = document.createElement('div');
            actionsCell.className = 'controls';
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-ghost'; editBtn.textContent = 'Edit';
            editBtn.onclick = () => startEdit(e.id);
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-ghost danger'; delBtn.textContent = 'X';
            delBtn.onclick = () => deleteEntry(e.id);
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(delBtn);

            row.appendChild(dateCell);
            row.appendChild(balCell);
            row.appendChild(spentCell);
            row.appendChild(actionsCell);
            list.appendChild(row);
        });
    });
}

function addOrUpdateEntry() {
    const date = dateInput.value;
    const rawAmount = amountInput.value;
    if (!date || rawAmount === '') { alert('Pick a date and enter an amount'); return; }
    const amount = parseFloat(parseFloat(rawAmount).toFixed(2));
    if (isNaN(amount) || amount < 0) { alert('Enter a valid non-negative number'); return; }
    const entries = loadEntries();

    if (editingId) {
        // update existing
        const idx = entries.findIndex(e => e.id === editingId);
        if (idx === -1) { editingId = null; return; }
        entries[idx].date = date;
        entries[idx].balance = amount;
        saveEntries(entries);
        editingId = null;
        addBtn.textContent = 'Add / Update';
        dateInput.disabled = false;
    } else {
        // if same date exists, replace it (user likely wants update)
        const same = entries.findIndex(e => e.date === date);
        if (same !== -1) {
            if (!confirm('An entry already exists for this date. Replace it?')) return;
            entries[same].balance = amount;
        } else {
            entries.push({ id: uid(), date, balance: amount, note: '' });
        }
        saveEntries(entries);
    }
    dateInput.value = ''; amountInput.value = '';
    render();
}

function startEdit(id) {
    const entries = loadEntries();
    const e = entries.find(x => x.id === id);
    if (!e) return;
    editingId = id;
    dateInput.value = e.date;
    amountInput.value = e.balance;
    addBtn.textContent = 'Save';
    dateInput.disabled = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;
    const entries = loadEntries().filter(e => e.id !== id);
    saveEntries(entries);
    render();
}

function clearAllData() {
    if (!confirm('This will delete all saved data on this device. Continue?')) return;
    localStorage.removeItem(STORAGE_KEY);
    render();
}

function startNewMonthNow() {
    // optional helper: prompt user to add a starting snapshot for next month
    // we'll prefill the date input with first day of next month and clear amount
    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const iso = next.toISOString().slice(0, 10);
    dateInput.value = iso;
    amountInput.value = '';
    amountInput.focus();
    alert('Prefilled date with the first day of next month. Enter your starting balance for that month and click Add.');
}

function loadDemo() {
    // creates a few entries across two months to show behavior
    if (!confirm('Load demo sample entries? This will append demo entries to your data.')) return;
    const demo = [
        { id: uid(), date: '2025-10-01', balance: 30000 },
        { id: uid(), date: '2025-10-05', balance: 28500 },
        { id: uid(), date: '2025-10-10', balance: 27000 },
        { id: uid(), date: '2025-10-20', balance: 24000 },
        { id: uid(), date: '2025-10-28', balance: 22000 },
        { id: uid(), date: '2025-11-02', balance: 25000 },
        { id: uid(), date: '2025-11-09', balance: 23000 },
        { id: uid(), date: '2025-11-16', balance: 21500 },
    ];
    const entries = loadEntries().concat(demo);
    saveEntries(entries);
    render();
}

// ---------- export CSV (improved) ----------
// ---------- export CSV (with cumulative average) ----------
function exportCsvFile() {
    // load entries sorted by ascending date (oldest -> newest)
    const entries = loadEntries().slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    if (entries.length === 0) {
        alert('No data to export');
        return;
    }

    // CSV header
    let csv = '"date","balance","spent_since_prev","cumulative_avg_spent"\n';

    // running sum & count for cumulative average
    let runningSum = 0;
    let runningCount = 0;

    for (let i = 0; i < entries.length; i++) {
        const cur = entries[i];
        const dateStr = String(cur.date); // expected YYYY-MM-DD
        const balance = Number(cur.balance).toFixed(2);

        if (i === 0) {
            // first snapshot: no previous to compare => no spent value
            csv += `"${dateStr}","${balance}","",""\n`;
            continue;
        }

        // compute spent since previous snapshot
        const prev = entries[i - 1];
        const delta = Number(prev.balance) - Number(cur.balance);
        const spent = delta > 0 ? Number(delta) : 0;   // treat negative delta as 0 (gain)
        // include zero as a valid numeric spent (counts toward cumulative average)

        // update running sum/count
        runningSum += spent;
        runningCount += 1;

        const cumulativeAvg = runningCount > 0 ? (runningSum / runningCount) : 0;

        csv += `"${dateStr}","${balance}","${spent.toFixed(2)}","${cumulativeAvg.toFixed(2)}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pockettrack_export.csv';
    a.click();
    URL.revokeObjectURL(url);
}



// ---------- events ----------
addBtn.addEventListener('click', addOrUpdateEntry);
newMonthBtn.addEventListener('click', startNewMonthNow);
demoBtn.addEventListener('click', loadDemo);
exportCsv.addEventListener('click', exportCsvFile);
clearAll.addEventListener('click', clearAllData);


// allow hitting Enter in amount input to add
amountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { addOrUpdateEntry(); } });

// initial render
render();