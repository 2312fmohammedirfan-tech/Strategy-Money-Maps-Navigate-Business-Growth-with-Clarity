/**
 * Mini Accounting Software
 * Core Logic: IndexedDB, Auth, Accounting Modules
 */

// --- 1. Database & State Management ---

const DB_NAME = 'MiniAccountingDB';
const DB_VERSION = 2; // Version bumped

let db;
let currentUser = null;
let currentCurrency = 'USD'; // Default currency

// Currency Formatter
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currentCurrency }).format(amount);
};

// Initial Default Accounts
const defaultAccounts = [
    // Assets
    { name: 'Cash', type: 'Asset' },
    { name: 'Bank', type: 'Asset' },
    { name: 'Furniture', type: 'Asset' },
    { name: 'Equipment', type: 'Asset' },
    { name: 'Computer', type: 'Asset' },
    { name: 'Inventory', type: 'Asset' },
    { name: 'Accounts Receivable', type: 'Asset' },

    // Liabilities
    { name: 'Accounts Payable', type: 'Liability' },
    { name: 'Bank Loan', type: 'Liability' },

    // Capital
    { name: 'Owner Capital', type: 'Capital' },
    { name: 'Drawings', type: 'Capital' }, // Contra-capital, treated as capital type for now

    // Income
    { name: 'Sales', type: 'Income' },
    { name: 'Service Revenue', type: 'Income' },
    { name: 'Other Income', type: 'Income' },

    // Expenses
    { name: 'Purchase', type: 'Expense' },
    { name: 'Rent', type: 'Expense' },
    { name: 'Salary', type: 'Expense' },
    { name: 'Electricity', type: 'Expense' },
    { name: 'Advertising', type: 'Expense' },
    { name: 'Office Supplies', type: 'Expense' }
];

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(event.target.error);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 1. Users Store
            if (!db.objectStoreNames.contains('users')) {
                const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                userStore.createIndex('username', 'username', { unique: true });
            }

            // 2. Accounts Store
            if (!db.objectStoreNames.contains('accounts')) {
                const accountStore = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
                accountStore.createIndex('name', 'name', { unique: true });

                // Seed default accounts
                accountStore.transaction.oncomplete = () => {
                    const customerObjectStore = db.transaction("accounts", "readwrite").objectStore("accounts");
                    defaultAccounts.forEach(acc => customerObjectStore.add(acc));
                }
            }

            // 3. Journal Entries Store
            if (!db.objectStoreNames.contains('journalEntries')) {
                const journalStore = db.createObjectStore('journalEntries', { keyPath: 'id', autoIncrement: true });
                journalStore.createIndex('date', 'date', { unique: false });
                journalStore.createIndex('account', 'account', { unique: false });
            }
        };

        request.onsuccess = async (event) => {
            db = event.target.result;
            console.log("Database initialized successfully");
            await checkAndSeedAccounts();
            resolve(db);
        };
    });
}

async function checkAndSeedAccounts() {
    try {
        if (!db) return;
        const transaction = db.transaction(['accounts'], 'readonly');
        const store = transaction.objectStore('accounts');
        const countRequest = store.count();

        return new Promise((resolve) => {
            countRequest.onsuccess = () => {
                if (countRequest.result === 0) {
                    console.log("Seeding default accounts...");
                    const seedTx = db.transaction(['accounts'], 'readwrite');
                    const seedStore = seedTx.objectStore('accounts');
                    defaultAccounts.forEach(acc => seedStore.add(acc));
                    seedTx.oncomplete = () => {
                        console.log("Seeding complete.");
                        resolve();
                    };
                } else {
                    resolve();
                }
            };
            countRequest.onerror = () => resolve();
        });
    } catch (e) {
        console.error("Error seeding accounts:", e);
    }
}

// Generic DB Helpers
function addItem(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getAllItems(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- 2. Authentication Logic ---

async function registerUser(username, password) {
    try {
        // Check if user exists (rough check via getAll, logic could be optimized with index get)
        const users = await getAllItems('users');
        if (users.some(u => u.username === username)) {
            alert('Username already exists!');
            return;
        }

        await addItem('users', { username, password, createdAt: new Date() });
        alert('Registration successful! Please login.');
        toggleAuthForms(); // Switch back to login
    } catch (error) {
        console.error("Registration failed:", error);
        alert('Registration failed.');
    }
}

async function loginUser(username, password) {
    try {
        const users = await getAllItems('users');
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            currentUser = user;
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            showApp();
        } else {
            alert('Invalid credentials!');
        }
    } catch (error) {
        console.error("Login failed:", error);
    }
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('loggedInUser');
    location.reload(); // Simple reload to clear state and show auth
}

// --- 3. UI & DOM Events ---

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DB
    await initDB();

    // Check Session
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
    }

    // Auth Event Listeners
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        loginUser(u, p);
    });

    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('reg-username').value;
        const p = document.getElementById('reg-password').value;
        registerUser(u, p);
    });

    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms();
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForms();
    });

    document.getElementById('logout-btn').addEventListener('click', logoutUser);

    // Sidebar Navigation
    document.querySelectorAll('.sidebar nav li').forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class
            document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));

            // Add active class
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
        });
    });

    // Dark Mode
    document.querySelector('.theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark');
        // Icon change logic if needed
    });
});

function toggleAuthForms() {
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('register-form').classList.toggle('hidden');
}

function showApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('display-username').textContent = currentUser.username;

    // Load initial data
    loadAccountDropdowns();
    refreshAllData();
}

// --- 4. Core Accounting Logic ---

async function loadAccountDropdowns() {
    try {
        if (!db) {
            console.warn("DB not ready for dropdowns, retrying...");
            setTimeout(loadAccountDropdowns, 500);
            return;
        }
        const accounts = await getAllItems('accounts');
        const select = document.getElementById('entry-account');
        const ledgerSelect = document.getElementById('ledger-account-select');

        if (!select || !ledgerSelect) return;

        // Keep default option
        select.innerHTML = '<option value="">Select Account</option>';
        ledgerSelect.innerHTML = '<option value="">Select Account</option>';

        if (accounts.length === 0) {
            const option = `<option value="" disabled>No accounts found (Reloading...)</option>`;
            select.insertAdjacentHTML('beforeend', option);
            return;
        }

        accounts.forEach(acc => {
            const option = `<option value="${acc.name}">${acc.name} (${acc.type})</option>`;
            select.insertAdjacentHTML('beforeend', option);
            ledgerSelect.insertAdjacentHTML('beforeend', option);
        });
    } catch (e) {
        console.error("Error loading accounts:", e);
    }
}

// Add Entry
async function addJournalEntry(entry) {
    try {
        await addItem('journalEntries', entry);
        // Clear form
        document.getElementById('journal-form').reset();
        // Auto Refresh
        refreshAllData();
        alert('Entry Added Successfully!');
    } catch (e) {
        console.error("Error adding entry:", e);
        alert('Failed to add entry: ' + (e.message || e));
    }
}

document.getElementById('journal-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const date = document.getElementById('entry-date').value;
    const account = document.getElementById('entry-account').value;
    const debit = parseFloat(document.getElementById('entry-debit').value) || 0;
    const credit = parseFloat(document.getElementById('entry-credit').value) || 0;
    const narration = document.getElementById('entry-narration').value;

    if (!account) {
        alert("Please select an Account.");
        return;
    }

    if (debit === 0 && credit === 0) {
        alert("Please enter either Debit or Credit amount.");
        return;
    }

    if (debit > 0 && credit > 0) {
        alert("Enter only Debit OR Credit, not both for a single line item.");
        return;
    }

    const entry = {
        date,
        account,
        debit,
        credit,
        narration,
        username: currentUser.username // Add username to entry
    };

    await addJournalEntry(entry);
});

// Helper: Get User Specific Entries
async function getUserEntries() {
    const allEntries = await getAllItems('journalEntries');
    if (!currentUser) return [];
    return allEntries.filter(e => e.username === currentUser.username);
}

// Calculate Ledger
async function getLedger(accountName) {
    const entries = await getUserEntries();
    return entries.filter(e => e.account === accountName).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Render Recent Entries
async function renderRecentEntries() {
    const entries = await getUserEntries();
    const sorted = entries.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    const tbody = document.querySelector('#journal-table tbody');
    tbody.innerHTML = '';

    sorted.forEach(e => {
        const row = `<tr>
            <td>${e.date}</td>
            <td>${e.account}</td>
            <td>${e.narration}</td>
            <td>${e.debit > 0 ? formatCurrency(e.debit) : '-'}</td>
            <td>${e.credit > 0 ? formatCurrency(e.credit) : '-'}</td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

// Refresh All Data
async function refreshAllData() {
    await renderRecentEntries();
    await generateLedgerView();
    await generateTrialBalance();
    const financialData = await generateFinancialStatements();
    updateDashboard(financialData);
}

// --- 5. Report Generators ---

// 5.1 Ledger View
document.getElementById('ledger-account-select').addEventListener('change', generateLedgerView);

async function generateLedgerView() {
    const accountName = document.getElementById('ledger-account-select').value;
    const tbody = document.querySelector('#ledger-table tbody');
    tbody.innerHTML = '';
    document.getElementById('ledger-total-debit').textContent = '0.00';
    document.getElementById('ledger-total-credit').textContent = '0.00';

    if (!accountName) return;

    const entries = await getLedger(accountName); // getLedger already calls getUserEntries
    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(e => {
        totalDebit += e.debit || 0;
        totalCredit += e.credit || 0;

        const row = `<tr>
            <td>${e.date}</td>
            <td>${e.narration}</td>
            <td>${e.debit > 0 ? formatCurrency(e.debit) : ''}</td>
            <td>${e.credit > 0 ? formatCurrency(e.credit) : ''}</td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    document.getElementById('ledger-total-debit').textContent = formatCurrency(totalDebit);
    document.getElementById('ledger-total-credit').textContent = formatCurrency(totalCredit);
}

// 5.2 Trial Balance
async function generateTrialBalance() {
    const accounts = await getAllItems('accounts');
    const entries = await getUserEntries(); // Check only user entries
    const tbody = document.querySelector('#trial-balance-table tbody');
    tbody.innerHTML = '';

    let grandTotalDebit = 0;
    let grandTotalCredit = 0;

    // Calculate balance for each account
    const accountBalances = accounts.map(acc => {
        const accEntries = entries.filter(e => e.account === acc.name);
        const totalDebit = accEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
        const totalCredit = accEntries.reduce((sum, e) => sum + (e.credit || 0), 0);

        let debitBal = 0;
        let creditBal = 0;

        // Simple logic: if Debit > Credit, it's a Debit balance, else Credit balance
        // For Trial Balance, we just show the net balance
        if (totalDebit > totalCredit) {
            debitBal = totalDebit - totalCredit;
        } else {
            creditBal = totalCredit - totalDebit;
        }

        return { name: acc.name, debit: debitBal, credit: creditBal, type: acc.type };
    });

    accountBalances.forEach(acc => {
        if (acc.debit === 0 && acc.credit === 0) return; // Skip empty accounts

        grandTotalDebit += acc.debit;
        grandTotalCredit += acc.credit;

        const row = `<tr>
            <td>${acc.name}</td>
            <td>${acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</td>
            <td>${acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    document.getElementById('tb-total-debit').textContent = formatCurrency(grandTotalDebit);
    document.getElementById('tb-total-credit').textContent = formatCurrency(grandTotalCredit);

    return accountBalances;
}

// 5.3 Financial Statements (Trading, P&L, Balance Sheet)
async function generateFinancialStatements() {
    // Re-calculate balances to ensure fresh data
    const accounts = await getAllItems('accounts');
    const entries = await getUserEntries(); // Check only user entries

    const balances = accounts.map(acc => {
        const accEntries = entries.filter(e => e.account === acc.name);
        const totalDebit = accEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
        const totalCredit = accEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
        return {
            name: acc.name,
            type: acc.type,
            netDebit: Math.max(0, totalDebit - totalCredit),
            netCredit: Math.max(0, totalCredit - totalDebit)
        };
    });

    // --- Trading Account ---
    // Direct Expenses (e.g., Purchase) & Direct Income (Sales)
    // Note: In this simplified model, we'll treat 'Purchase' and 'Sales' specially, or check usage.
    // For simplicity: Type 'Income' -> Credit side, Type 'Expense' -> Debit Side.
    // To separate Trading vs P&L, we need to know Direct vs Indirect.
    // Dictionary check for simplicity based on default accounts:
    const directExpenses = ['Purchase'];
    const directIncomes = ['Sales', 'Service Revenue'];

    let tradingDebit = 0;
    let tradingCredit = 0;
    const tradingTbody = document.querySelector('#trading-table tbody');
    tradingTbody.innerHTML = '';

    // Opening Stock (Manual or from DB? - simplified: ignore or treat as Expense for now if not tracked)
    // Add Purchases
    balances.filter(b => directExpenses.includes(b.name)).forEach(b => {
        const amt = b.netDebit;
        if (amt > 0) {
            tradingDebit += amt;
            tradingTbody.insertAdjacentHTML('beforeend', `<tr><td>${b.name}</td><td>${amt.toFixed(2)}</td></tr>`);
        }
    });

    // Add Sales
    balances.filter(b => directIncomes.includes(b.name)).forEach(b => {
        const amt = b.netCredit;
        if (amt > 0) {
            tradingCredit += amt;
            tradingTbody.insertAdjacentHTML('beforeend', `<tr><td>${b.name}</td><td>${amt.toFixed(2)}</td></tr>`);
        }
    });

    // Closing Stock - typically an adjustment. For this mini-app, we might skip or auto-calculate if Inventory track exists.
    // Let's look for 'Inventory' asset. If it exists, it's usually Closing Stock in BS, but for Trading...
    // Let's simplify: Gross Profit = Sales - Purchases

    const grossProfit = tradingCredit - tradingDebit;
    const grossProfitElement = document.getElementById('gross-profit');
    grossProfitElement.textContent = grossProfit.toFixed(2);
    grossProfitElement.style.color = grossProfit >= 0 ? 'var(--success)' : 'var(--danger)';


    // --- P&L Account ---
    let plDebit = 0;
    let plCredit = 0;
    const plTbody = document.querySelector('#pl-table tbody');
    plTbody.innerHTML = '';

    // Indirect Expenses (All expenses except Direct)
    balances.filter(b => b.type === 'Expense' && !directExpenses.includes(b.name)).forEach(b => {
        const amt = b.netDebit;
        if (amt > 0) {
            plDebit += amt;
            plTbody.insertAdjacentHTML('beforeend', `<tr><td>${b.name}</td><td>${amt.toFixed(2)}</td></tr>`);
        }
    });

    // Gross Profit b/d (if profit -> Credit side, loss -> Debit side)
    if (grossProfit >= 0) {
        plCredit += grossProfit;
        plTbody.insertAdjacentHTML('beforeend', `<tr><td>Gross Profit b/d</td><td>${grossProfit.toFixed(2)}</td></tr>`);
    } else {
        plDebit += Math.abs(grossProfit);
        plTbody.insertAdjacentHTML('beforeend', `<tr><td>Gross Loss b/d</td><td>${Math.abs(grossProfit).toFixed(2)}</td></tr>`);
    }

    // Other Incomes
    balances.filter(b => b.type === 'Income' && !directIncomes.includes(b.name)).forEach(b => {
        const amt = b.netCredit;
        if (amt > 0) {
            plCredit += amt;
            plTbody.insertAdjacentHTML('beforeend', `<tr><td>${b.name}</td><td>${amt.toFixed(2)}</td></tr>`);
        }
    });

    const netProfit = plCredit - plDebit;
    const netProfitElement = document.getElementById('net-profit');
    netProfitElement.textContent = netProfit.toFixed(2);
    netProfitElement.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';


    // --- Balance Sheet ---
    let totalAssets = 0;
    let totalLiabilities = 0; // Includes Capital

    const bsAssetsTbody = document.querySelector('#bs-assets-table tbody');
    const bsLiabTbody = document.querySelector('#bs-liabilities-table tbody');
    bsAssetsTbody.innerHTML = '';
    bsLiabTbody.innerHTML = '';

    // Assets
    balances.filter(b => b.type === 'Asset').forEach(b => {
        const amt = b.netDebit; // Assets are Debit balance
        if (amt > 0) {
            totalAssets += amt;
            bsAssetsTbody.insertAdjacentHTML('beforeend', `<tr><td>${b.name}</td><td>${amt.toFixed(2)}</td></tr>`);
        }
    });

    // Liabilities
    balances.filter(b => b.type === 'Liability').forEach(b => {
        const amt = b.netCredit;
        if (amt > 0) {
            totalLiabilities += amt;
            bsLiabTbody.insertAdjacentHTML('beforeend', `<tr><td>${b.name}</td><td>${amt.toFixed(2)}</td></tr>`);
        }
    });

    // Capital (adjust with Net Profit)
    balances.filter(b => b.type === 'Capital').forEach(b => {
        let amt = b.netCredit;
        // If Drawings (Debit balance usually), subtract from Capital logic or show as deduction.
        // If it has netDebit, it's likely Drawings.
        if (b.netDebit > 0) {
            // For display, we can show it as negative liability or asset? 
            // Convention: Show as deduction from Capital. 
            // Simplification: Net everything into "Owner's Equity" line or list separately using negative.
            // Let's specific check: if name is 'Drawings' and has Debit...
            // For this generic loop:
            // We'll treat Net Debit Capital accounts as negative Liabilities for the sum.
            // But for UI, better to show "Less: Drawings"
        }
    });

    // Calculate Capital owner equity final
    const capitalAccounts = balances.filter(b => b.type === 'Capital');
    let ownerEquity = 0;

    capitalAccounts.forEach(c => {
        if (c.netCredit > 0) ownerEquity += c.netCredit;
        if (c.netDebit > 0) ownerEquity -= c.netDebit;
    });

    // Add Net Profit to Equity
    ownerEquity += netProfit;

    totalLiabilities += ownerEquity;

    bsLiabTbody.insertAdjacentHTML('beforeend', `<tr><td><strong>Owner's Equity</strong> (inc. Net Profit)</td><td>${ownerEquity.toFixed(2)}</td></tr>`);

    document.getElementById('bs-total-assets').textContent = totalAssets.toFixed(2);
    document.getElementById('bs-total-liabilities').textContent = totalLiabilities.toFixed(2);

    return { totalAssets, totalLiabilities, netProfit, income: plCredit, expense: plDebit };
}

// --- 6. Charts & PDF ---

let chartAssetsVyLiab = null;
let chartIncomeVsExpense = null;

function updateDashboard(data) {
    if (!data) return;

    document.getElementById('dash-assets').textContent = formatCurrency(data.totalAssets);
    document.getElementById('dash-liabilities').textContent = formatCurrency(data.totalLiabilities);
    document.getElementById('dash-net-profit').textContent = formatCurrency(data.netProfit);

    // Assets vs Liabilities Pie
    const ctx1 = document.getElementById('chart-assets-liabilities').getContext('2d');
    if (chartAssetsVyLiab) chartAssetsVyLiab.destroy();

    chartAssetsVyLiab = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Assets', 'Liabilities'],
            datasets: [{
                data: [data.totalAssets, data.totalLiabilities],
                backgroundColor: ['#10b981', '#ef4444']
            }]
        }
    });

    // Income vs Expense Bar
    const ctx2 = document.getElementById('chart-income-expense').getContext('2d');
    if (chartIncomeVsExpense) chartIncomeVsExpense.destroy();

    chartIncomeVsExpense = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                label: 'Amount',
                data: [data.income, data.expense],
                backgroundColor: ['#4f46e5', '#f59e0b']
            }]
        }
    });
}

function exportPDF(sectionId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let tableId = '';
    let title = '';

    switch (sectionId) {
        case 'ledger':
            tableId = '#ledger-table';
            title = 'General Ledger: ' + document.getElementById('ledger-account-select').value;
            break;
        case 'trial-balance':
            tableId = '#trial-balance-table';
            title = 'Trial Balance';
            break;
        case 'trading-pl':
            // Gets tricky with two tables, let's export P&L for now
            tableId = '#pl-table';
            title = 'Profit & Loss Account';
            break;
        case 'balance-sheet':
            tableId = '#bs-assets-table'; // Just assets for demo?
            // Real impl needs custom layout for BS
            title = 'Balance Sheet (Incomplete Export)';
            break;
    }

    if (tableId) {
        doc.text(title, 14, 10);
        doc.autoTable({ html: tableId, startY: 20 });
        doc.save(`${sectionId}.pdf`);
    } else {
        alert('PDF Export for this section coming soon!');
    }
}
