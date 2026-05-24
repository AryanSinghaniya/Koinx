const API_BASE_URL = 'https://koinx-90cx.onrender.com';

document.getElementById('reconcile-btn').addEventListener('click', async () => {
    const userFile = document.getElementById('user_file').files[0];
    const exchangeFile = document.getElementById('exchange_file').files[0];
    const reconcileBtn = document.getElementById('reconcile-btn');
    const summaryDiv = document.getElementById('summary');
    const reportDiv = document.getElementById('report');

    if (!userFile || !exchangeFile) {
        summaryDiv.innerHTML = `<p style="color: red;">Please select both transaction files.</p>`;
        return;
    }

    reconcileBtn.disabled = true;
    reconcileBtn.textContent = 'Uploading and Reconciling...';
    summaryDiv.innerHTML = '';
    reportDiv.innerHTML = '';

    const formData = new FormData();
    formData.append('user_file', userFile);
    formData.append('exchange_file', exchangeFile);

    try {
        const response = await fetch(`${API_BASE_URL}/api/reconcile`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();

        if (response.ok) {
            const runId = data.runId;
            reconcileBtn.textContent = 'Fetching Report...';
            await fetchAndDisplayReport(runId);
        } else {
            throw new Error(data.error || data.message || 'Failed to start reconciliation');
        }
    } catch (error) {
        summaryDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    } finally {
        reconcileBtn.disabled = false;
        reconcileBtn.textContent = 'Start Reconciliation';
    }
});

async function fetchAndDisplayReport(runId) {
    try {
        // Fetch summary
        const summaryRes = await fetch(`${API_BASE_URL}/api/report/${runId}/summary`);
        const summaryData = await summaryRes.json();
        displaySummary(summaryData);

        // Fetch full report
        const reportRes = await fetch(`${API_BASE_URL}/api/report/${runId}`);
        const reportData = await reportRes.json();
        displayReport(reportData);

    } catch (error) {
        document.getElementById('summary').innerHTML = `<p style="color: red;">Error fetching report: ${error.message}</p>`;
    }
}

function displaySummary(summary) {
    const summaryDiv = document.getElementById('summary');
    summaryDiv.innerHTML = `
        <h2>Reconciliation Summary</h2>
        <p>Matched: ${summary.matched || 0}</p>
        <p>Conflicting: ${summary.conflicting || 0}</p>
        <p>Unmatched (User): ${summary.unmatchedUser || 0}</p>
        <p>Unmatched (Exchange): ${summary.unmatchedExchange || 0}</p>
        <p style="color:red; font-size: 0.9em">Invalid Rows Skipped - User: ${summary.invalidUserRows || 0}, Exchange: ${summary.invalidExchangeRows || 0}</p>
    `;
}

function displayReport(report) {
    const reportDiv = document.getElementById('report');
    let html = '<h2>Full Report</h2>';

    if (report.matched && report.matched.length > 0) {
        html += '<h3>Matched Transactions</h3>';
        html += createTable(report.matched);
    }
    if (report.conflicting && report.conflicting.length > 0) {
        html += '<h3>Conflicting Transactions</h3>';
        html += createConflictingTable(report.conflicting);
    }
    if (report.unmatchedUser && report.unmatchedUser.length > 0) {
        html += '<h3>Unmatched (User)</h3>';
        html += createTable(report.unmatchedUser);
    }
    if (report.unmatchedExchange && report.unmatchedExchange.length > 0) {
        html += '<h3>Unmatched (Exchange)</h3>';
        html += createTable(report.unmatchedExchange);
    }

    reportDiv.innerHTML = html;
}

function createTable(transactions) {
    let table = '<table><tr><th>Time</th><th>Operation</th><th>Asset</th><th>Amount</th><th>Price</th><th>Source</th></tr>';
    for (const tx of transactions) {
        table += `
            <tr>
                <td>${tx.utcTime ? new Date(tx.utcTime).toLocaleString() : 'N/A'}</td>
                <td>${tx.operation || 'N/A'}</td>
                <td>${tx.baseAsset || 'N/A'}</td>
                <td>${tx.amount || 'N/A'}</td>
                <td>${tx.price || 'N/A'}</td>
                <td>${tx.source}</td>
            </tr>
        `;
    }
    table += '</table>';
    return table;
}

function createConflictingTable(conflicts) {
    let table = '<table><tr><th>Time</th><th>Operation</th><th>Asset</th><th>Amount</th><th>Source</th><th>Errors/Conflicts</th></tr>';
    for (const conflict of conflicts) {
        table += `
            <tr>
                <td>${conflict.utcTime ? new Date(conflict.utcTime).toLocaleString() : 'N/A'}</td>
                <td>${conflict.operation}</td>
                <td>${conflict.baseAsset}</td>
                <td>${conflict.amount}</td>
                <td>${conflict.source}</td>
                <td style="color:red">${conflict.ingestionErrors ? conflict.ingestionErrors.join(', ') : 'Quantity Conflict'}</td>
            </tr>
        `;
    }
    table += '</table>';
    return table;
}

function formatTx(tx) {
    return `Time: ${new Date(tx.utc_time).toLocaleString()}, Op: ${tx.operation}, Asset: ${tx.base_coin}, Amt: ${tx.amount}, Price: ${tx.price}`;
}
