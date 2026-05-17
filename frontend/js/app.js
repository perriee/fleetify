// INISIALISASI SAAT DOM SIAP
document.addEventListener('DOMContentLoaded', async () => {
  await initUserSelect();
  setupTabNavigation();
  setupFilterButtons();
  setupExportButton();

  await loadReports();
});

// USER SELECT (simulasi login)
async function initUserSelect() {
  try {
    const users = await fetchUsers();
    const sel = document.getElementById('userSelect');

    const fragment = document.createDocumentFragment();
    users.forEach(user => {
      const opt = document.createElement('option');
      opt.value = user.id;
      opt.dataset.role = user.role;
      opt.textContent = `${user.username} (${user.role})`;
      fragment.appendChild(opt);
    });
    sel.appendChild(fragment);

    sel.addEventListener('change', () => onUserChange(users, sel));
  } catch (e) {
    showAlert('Gagal memuat data user: ' + e.message);
  }
}

function onUserChange(users, sel) {
  const selectedId = parseInt(sel.value);
  currentUser = users.find(u => u.id === selectedId) || null;

  const badge = document.getElementById('userBadge');
  const tabCreateBtn = document.getElementById('tabCreateBtn');

  if (!currentUser) {
    badge.classList.add('d-none');
    tabCreateBtn.classList.add('d-none');
    return;
  }

  badge.textContent = currentUser.role;
  badge.className = `badge ${currentUser.role === 'SA' ? 'bg-info' : 'bg-warning text-dark'}`;
  badge.classList.remove('d-none');

  if (currentUser.role === 'SA') {
    tabCreateBtn.classList.remove('d-none');
    loadFormData(); 
  } else {
    tabCreateBtn.classList.add('d-none');
    switchTab('history');
  }

  loadReports();
}

// TAB NAVIGATION
function setupTabNavigation() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tabName) {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.getElementById('tabHistory').classList.toggle('d-none', tabName !== 'history');
  document.getElementById('tabCreate').classList.toggle('d-none', tabName !== 'create');
}

// LOAD DATA
async function loadReports() {
  if (!currentUser) return;
  try {
    const reports = await fetchReports();
    renderReportTable(reports);
  } catch (e) {
    showAlert('Gagal memuat laporan: ' + e.message);
  }
}

async function loadFormData() {
  try {
    const [vehicles, items] = await Promise.all([
      fetchVehicles(),
      fetchMasterItems(),
    ]);
    populateVehicleSelect(vehicles);
    setMasterItems(items);
  } catch (e) {
    showAlert('Gagal memuat data form: ' + e.message);
  }
}

// FILTER BUTTONS
function setupFilterButtons() {
  document.querySelectorAll('#statusFilter button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#statusFilter button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.status);
    });
  });
}

// CREATE REPORT FORM
document.getElementById('btnAddItem').addEventListener('click', () => {
  if (!currentUser) {
    showAlert('Pilih user terlebih dahulu.');
    return;
  }
  addItemRow();
});

document.getElementById('btnSubmitReport').addEventListener('click', async () => {
  if (!currentUser || currentUser.role !== 'SA') {
    showAlert('Hanya SA yang bisa membuat laporan.');
    return;
  }

  const vehicleId = parseInt(document.getElementById('vehicleSelect').value);
  const odometer  = parseInt(document.getElementById('odometerInput').value);
  const complaint = document.getElementById('complaintInput').value.trim();
  const initialPhoto = document.getElementById('initialPhotoInput').value.trim();
  const items = getItemRowsData();

  if (!vehicleId || !odometer || !complaint) {
    showAlert('Kendaraan, odometer, dan keluhan wajib diisi.');
    return;
  }
  if (items.length === 0) {
    showAlert('Tambahkan minimal satu item estimasi.');
    return;
  }

  const payload = { vehicle_id: vehicleId, odometer, complaint, initial_photo: initialPhoto, items };

  try {
    document.getElementById('btnSubmitReport').disabled = true;
    await createReport(payload);
    showAlert('Laporan berhasil dibuat! Status: PENDING_APPROVAL', 'success');

    document.getElementById('vehicleSelect').value = '';
    document.getElementById('odometerInput').value = '';
    document.getElementById('complaintInput').value = '';
    document.getElementById('initialPhotoInput').value = '';
    clearItemRows();

    switchTab('history');
    await loadReports();
  } catch (e) {
    showAlert(e.message);
  } finally {
    document.getElementById('btnSubmitReport').disabled = false;
  }
});

// EXPORT CSV
function setupExportButton() {
  document.getElementById('btnExportCSV').addEventListener('click', exportToCSV);
}
