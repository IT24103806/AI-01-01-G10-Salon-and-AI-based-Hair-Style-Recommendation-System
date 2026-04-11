// Chart global variables
let incomeExpenseChart = null;
let trendChart = null;
let allTransactions = []; // Store transactions for easier editing

document.addEventListener('DOMContentLoaded', () => {
    fetchTransactions();
    fetchStats();
    initCharts();
    populateYearSelector();
});

function setTextIfExists(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

/* --- API CALLS --- */

async function fetchTransactions() {
    try {
        const response = await fetch('/api/accounting/transactions');
        allTransactions = await response.json();
        displayTransactions(allTransactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
}

async function createTransaction() {
    const description = document.getElementById("desc").value;
    const amount = document.getElementById("amount").value;
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value;
    const sourceModule = document.getElementById("sourceModule").value;
    const date = document.getElementById("date").value;
    const notes = document.getElementById("notes").value;

    if (!description || !amount || !date) {
        alert("Please fill all fields");
        return;
    }

    const transaction = {
        description: description,
        amount: parseFloat(amount),
        type: type,
        category: category,
        sourceModule: sourceModule,
        date: date,
        notes: notes
    };

    try {
        const response = await fetch('/api/accounting/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transaction)
        });

        if (response.ok) {
            clearForm();
            fetchTransactions();
            fetchStats(); // Update stats and charts
        } else {
            alert('Failed to add transaction');
        }
    } catch (error) {
        console.error('Error adding transaction:', error);
    }
}

async function deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
        const response = await fetch(`/api/accounting/transactions/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            fetchTransactions();
            fetchStats();
        } else {
            alert('Failed to delete transaction');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
    }
}

function openEditModal(id) {
    const t = allTransactions.find(item => item.id == id);
    if (!t) return;

    document.getElementById("edit-id").value = t.id;
    document.getElementById("edit-desc").value = t.description;
    document.getElementById("edit-amount").value = t.amount;
    document.getElementById("edit-type").value = t.type;
    document.getElementById("edit-category").value = t.category || "SERVICE_REVENUE";
    document.getElementById("edit-date").value = t.date;
    document.getElementById("edit-notes").value = t.notes || "";

    document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editModal").style.display = "none";
}

async function updateTransaction() {
    const id = document.getElementById("edit-id").value;
    const transaction = {
        description: document.getElementById("edit-desc").value,
        amount: parseFloat(document.getElementById("edit-amount").value),
        type: document.getElementById("edit-type").value,
        category: document.getElementById("edit-category").value,
        date: document.getElementById("edit-date").value,
        notes: document.getElementById("edit-notes").value,
        sourceModule: "MANUAL"
    };

    try {
        const response = await fetch(`/api/accounting/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });

        if (response.ok) {
            closeEditModal();
            fetchTransactions();
            fetchStats();
        } else {
            alert('Failed to update transaction');
        }
    } catch (error) {
        console.error('Error updating transaction:', error);
    }
}

async function fetchStats() {
    try {
        const [dailyRes, monthlyRes, yearlyRes] = await Promise.all([
            fetch('/api/accounting/stats/daily'),
            fetch('/api/accounting/stats/monthly'),
            fetch('/api/accounting/stats/yearly')
        ]);

        const daily = await dailyRes.json();
        const monthly = await monthlyRes.json();
        const yearly = await yearlyRes.json();

        // Update Text Stats
        setTextIfExists('dailyIncome', `Rs ${daily.income || 0}`);
        setTextIfExists('dailyExpense', `Rs ${daily.expense || 0}`);
        setTextIfExists('dailyProfit', `Rs ${daily.profit || 0}`);
        setTextIfExists('dailyProfitMirror', `Rs ${daily.profit || 0}`);

        setTextIfExists('monthlyIncome', `Rs ${monthly.income || 0}`);
        setTextIfExists('monthlyIncomeMirror', `Rs ${monthly.income || 0}`);
        setTextIfExists('monthlyExpense', `Rs ${monthly.expense || 0}`);
        setTextIfExists('monthlyExpenseMirror', `Rs ${monthly.expense || 0}`);
        setTextIfExists('monthlyProfit', `Rs ${monthly.profit || 0}`);

        setTextIfExists('yearlyIncome', `Rs ${yearly.income || 0}`);
        setTextIfExists('yearlyExpense', `Rs ${yearly.expense || 0}`);
        setTextIfExists('yearlyProfit', `Rs ${yearly.profit || 0}`);
        setTextIfExists('yearlyProfitMirror', `Rs ${yearly.profit || 0}`);

        // Update Charts
        updateCharts(monthly, yearly);

    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

async function populateYearSelector() {
    const selector = document.getElementById('trendYear');
    const currentYear = new Date().getFullYear();
    selector.innerHTML = "";
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        selector.appendChild(option);
    }
}

async function switchTrendView() {
    const view = document.getElementById('trendView').value;
    const yearSelector = document.getElementById('trendYear');

    if (view === 'monthly') {
        yearSelector.style.display = 'block';
        fetchMonthlyTrend();
    } else if (view === 'yearly') {
        yearSelector.style.display = 'none';
        fetchYearlyTrend();
    } else {
        yearSelector.style.display = 'none';
        fetchStats(); // This updates the snapshot
    }
}

async function fetchMonthlyTrend() {
    const year = document.getElementById('trendYear').value;
    try {
        const response = await fetch(`/api/accounting/stats/history/monthly?year=${year}`);
        const data = await response.json();
        updateTrendChartHistory(data, `Monthly Breakdown (${year})`, d => d.monthName);
    } catch (error) {
        console.error('Error fetching monthly history:', error);
    }
}

async function fetchYearlyTrend() {
    try {
        const response = await fetch('/api/accounting/stats/history/yearly');
        const data = await response.json();
        updateTrendChartHistory(data, 'Yearly Comparison', d => d.year);
    } catch (error) {
        console.error('Error fetching yearly history:', error);
    }
}

/* --- UI FUNCTIONS --- */

function displayTransactions(transactions) {
    const table = document.getElementById("transactionTable");
    table.innerHTML = "";

    // Sort by Date Descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    transactions.forEach(t => {
        const row = `
            <tr>
                <td>${t.id}</td>
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td>${t.category || 'UNCATEGORIZED'}</td>
                <td>${t.sourceModule || 'MANUAL'}</td>
                <td style="color: ${t.type === 'income' ? 'green' : 'red'}; font-weight: bold;">
                    ${t.type.toUpperCase()}
                </td>
                <td>${t.amount}</td>
                <td>${t.referenceType ? `${t.referenceType}${t.referenceId ? ' #' + t.referenceId : ''}` : '-'}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="edit-btn" onclick="openEditModal(${t.id})" style="background:#4b5563; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;"><i class="fas fa-edit"></i> Edit</button>
                        <button class="delete-btn" onclick="deleteTransaction(${t.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
        table.innerHTML += row;
    });
}

function clearForm() {
    document.getElementById("desc").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("type").value = "income";
    document.getElementById("category").value = "SERVICE_REVENUE";
    document.getElementById("sourceModule").value = "MANUAL";
    document.getElementById("date").value = "";
    document.getElementById("notes").value = "";
}

/* --- CHARTS --- */

function initCharts() {
    // 1. Income vs Expense Chart (Doughnut)
    const ctx1 = document.getElementById('incomeExpenseChart').getContext('2d');
    incomeExpenseChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#28a745', '#dc3545'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: false
                }
            }
        }
    });

    // 2. Trend Chart (Dynamic Bar)
    const ctx2 = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Daily', 'Monthly', 'Yearly'],
            datasets: [
                { label: 'Income', data: [0, 0, 0], backgroundColor: '#28a745' },
                { label: 'Expense', data: [0, 0, 0], backgroundColor: '#dc3545' },
                { label: 'Profit', data: [0, 0, 0], backgroundColor: '#007bff' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: { display: false } // We use card title now
            },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function updateCharts(monthlyData, yearlyData) {
    if (incomeExpenseChart) {
        incomeExpenseChart.data.datasets[0].data = [monthlyData.income, monthlyData.expense];
        incomeExpenseChart.update();
    }

    if (trendChart && document.getElementById('trendView').value === 'snapshot') {
        const dailyIncome = parseFloat(document.getElementById('dailyIncome').textContent.replace('Rs ', '')) || 0;
        const dailyExpense = parseFloat(document.getElementById('dailyExpense').textContent.replace('Rs ', '')) || 0;
        const dailyProfit = parseFloat(document.getElementById('dailyProfit').textContent.replace('Rs ', '')) || 0;

        trendChart.data.labels = ['Daily', 'Monthly', 'Yearly'];
        trendChart.data.datasets[0].data = [dailyIncome, monthlyData.income, yearlyData.income];
        trendChart.data.datasets[1].data = [dailyExpense, monthlyData.expense, yearlyData.expense];
        trendChart.data.datasets[2].data = [dailyProfit, monthlyData.profit, yearlyData.profit];
        trendChart.update();
    }
}

function updateTrendChartHistory(data, title, labelFunc) {
    if (trendChart) {
        trendChart.data.labels = data.map(labelFunc);
        trendChart.data.datasets[0].data = data.map(d => d.income);
        trendChart.data.datasets[1].data = data.map(d => d.expense);
        trendChart.data.datasets[2].data = data.map(d => d.profit);
        trendChart.update();
    }
}
