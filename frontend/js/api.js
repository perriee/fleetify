const API_BASE = "/api";

let currentUser = null;

function getHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (currentUser) {
        headers["X-User-ID"] = currentUser.id;
    }
    return headers;
}

// --- USER ---
async function fetchUsers() {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error("Gagal mengambil data user");
    return res.json();
}

// --- VEHICLES ---
async function fetchVehicles() {
    const res = await fetch(`${API_BASE}/vehicles`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Gagal mengambil data kendaraan");
    return res.json();
}

// --- MASTER ITEMS ---
async function fetchMasterItems() {
    const res = await fetch(`${API_BASE}/master-items`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Gagal mengambil data item");
    return res.json();
}

// --- REPORTS ---
async function fetchReports() {
    const res = await fetch(`${API_BASE}/reports`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Gagal mengambil riwayat laporan");
    return res.json();
}

async function fetchReportById(id) {
    const res = await fetch(`${API_BASE}/reports/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Laporan tidak ditemukan");
    return res.json();
}

async function createReport(payload) {
    const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal membuat laporan");
    return data;
}

async function approveReport(id) {
    const res = await fetch(`${API_BASE}/reports/${id}/approve`, {
        method: "PATCH",
        headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menyetujui laporan");
    return data;
}

async function completeReport(id, proofPhoto) {
    const res = await fetch(`${API_BASE}/reports/${id}/complete`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ proof_photo: proofPhoto }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menyelesaikan laporan");
    return data;
}
