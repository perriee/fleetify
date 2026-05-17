const els = {
    globalAlert: () => document.getElementById("globalAlert"),
    reportTableBody: () => document.getElementById("reportTableBody"),
    noReportMsg: () => document.getElementById("noReportMsg"),
    vehicleSelect: () => document.getElementById("vehicleSelect"),
    itemList: () => document.getElementById("itemList"),
    totalEstimation: () => document.getElementById("totalEstimation"),
};

// ALERT
function showAlert(message, type = "danger") {
    const el = els.globalAlert();
    el.className = `alert alert-${type} alert-dismissible fade show`;

    const icon = document.createElement("i");
    icon.className =
        type === "success" ? "bi bi-check-circle me-2" : "bi bi-exclamation-triangle me-2";

    const text = document.createTextNode(message);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn-close";
    closeBtn.setAttribute("data-bs-dismiss", "alert");

    el.replaceChildren(icon, text, closeBtn);
    el.classList.remove("d-none");

    setTimeout(() => el.classList.add("d-none"), 5000);
}

// STATUS BADGE
function createStatusBadge(status) {
    const badge = document.createElement("span");
    badge.className = "badge";

    const map = {
        PENDING_APPROVAL: ["badge-pending", "Menunggu Persetujuan"],
        APPROVED: ["badge-approved", "Disetujui"],
        COMPLETED: ["badge-completed", "Selesai"],
    };

    const [cls, label] = map[status] || ["bg-secondary", status];
    badge.classList.add(cls);
    badge.textContent = label;
    return badge;
}

// REPORT TABLE (F-04)
let allReports = [];
let currentFilter = "";

function renderReportTable(reports) {
    allReports = reports;
    applyFilter(currentFilter);
}

function applyFilter(status) {
    currentFilter = status;
    const filtered = status ? allReports.filter((r) => r.status === status) : allReports;

    const tbody = els.reportTableBody();
    const noMsg = els.noReportMsg();

    tbody.replaceChildren();

    if (filtered.length === 0) {
        noMsg.classList.remove("d-none");
        return;
    }
    noMsg.classList.add("d-none");

    const fragment = document.createDocumentFragment();

    filtered.forEach((report) => {
        const tr = document.createElement("tr");
        tr.addEventListener("click", () => openReportDetail(report.id));

        const td = (text) => {
            const el = document.createElement("td");
            el.textContent = text;
            return el;
        };

        tr.appendChild(td(`#${report.id}`));

        const date = new Date(report.created_at);
        tr.appendChild(
            td(
                date.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                }),
            ),
        );

        tr.appendChild(td(report.creator?.username || "-"));

        tr.appendChild(td(report.vehicle?.license_plate || "-"));

        const tdKeluhan = document.createElement("td");
        tdKeluhan.textContent =
            report.complaint.length > 50
                ? report.complaint.substring(0, 50) + "..."
                : report.complaint;
        tr.appendChild(tdKeluhan);

        const tdStatus = document.createElement("td");
        tdStatus.appendChild(createStatusBadge(report.status));
        tr.appendChild(tdStatus);

        const tdAksi = document.createElement("td");
        const btn = document.createElement("button");
        btn.className = "btn btn-outline-info btn-sm";
        btn.textContent = "Detail";
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            openReportDetail(report.id);
        });
        tdAksi.appendChild(btn);
        tr.appendChild(tdAksi);

        fragment.appendChild(tr);
    });

    tbody.appendChild(fragment);
}

// REPORT DETAIL MODAL
async function openReportDetail(id) {
    try {
        const report = await fetchReportById(id);
        renderDetailModal(report);
        new bootstrap.Modal(document.getElementById("reportDetailModal")).show();
    } catch (e) {
        showAlert(e.message);
    }
}

function renderDetailModal(report) {
    const body = document.getElementById("reportDetailBody");
    const footer = document.getElementById("reportDetailFooter");

    body.replaceChildren();
    footer.replaceChildren();

    const infoGrid = document.createElement("div");
    infoGrid.className = "row mb-3";

    const infoItems = [
        ["ID Laporan", `#${report.id}`],
        ["Kendaraan", report.vehicle?.license_plate + " - " + report.vehicle?.model],
        ["Service Advisor", report.creator?.username],
        ["Odometer", `${report.odometer.toLocaleString("id-ID")} km`],
        ["Status", null],
        ["Tanggal", new Date(report.created_at).toLocaleString("id-ID")],
    ];

    infoItems.forEach(([label, value]) => {
        const col = document.createElement("div");
        col.className = "col-md-6 mb-2";

        const lbl = document.createElement("small");
        lbl.className = "text-muted d-block";
        lbl.textContent = label;

        const val = document.createElement("strong");
        if (value === null) {
            val.appendChild(createStatusBadge(report.status));
        } else {
            val.textContent = value;
        }

        col.appendChild(lbl);
        col.appendChild(val);
        infoGrid.appendChild(col);
    });
    body.appendChild(infoGrid);

    // KELUHAN
    const hrKeluhan = document.createElement("hr");
    body.appendChild(hrKeluhan);

    const keluhanLabel = document.createElement("p");
    keluhanLabel.className = "fw-semibold mb-1";
    keluhanLabel.textContent = "Keluhan:";
    body.appendChild(keluhanLabel);

    const keluhanText = document.createElement("p");
    keluhanText.textContent = report.complaint;
    body.appendChild(keluhanText);

    // FOTO
    if (report.initial_photo) {
        const p = document.createElement("p");
        p.className = "mb-1";
        const lbl = document.createElement("small");
        lbl.className = "text-muted";
        lbl.textContent = "📷 Foto Awal: ";
        const val = document.createElement("span");
        val.textContent = report.initial_photo;
        p.appendChild(lbl);
        p.appendChild(val);
        body.appendChild(p);
    }
    if (report.proof_photo) {
        const p = document.createElement("p");
        p.className = "mb-1";
        const lbl = document.createElement("small");
        lbl.className = "text-muted";
        lbl.textContent = "📷 Foto Bukti: ";
        const val = document.createElement("span");
        val.textContent = report.proof_photo;
        p.appendChild(lbl);
        p.appendChild(val);
        body.appendChild(p);
    }

    // ITEMS TABLE
    if (report.items && report.items.length > 0) {
        const hr = document.createElement("hr");
        body.appendChild(hr);

        const title = document.createElement("p");
        title.className = "fw-semibold mb-2";
        title.textContent = "Estimasi Part / Jasa:";
        body.appendChild(title);

        const table = document.createElement("table");
        table.className = "table table-sm table-bordered";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Item", "Tipe", "Qty", "Harga Snapshot", "Subtotal"].forEach((h) => {
            const th = document.createElement("th");
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        let grandTotal = 0;

        report.items.forEach((item) => {
            const subtotal = item.quantity * item.price_snapshot;
            grandTotal += subtotal;

            const row = document.createElement("tr");
            [
                item.item?.item_name || "-",
                item.item?.type || "-",
                item.quantity,
                "Rp " + item.price_snapshot.toLocaleString("id-ID"),
                "Rp " + subtotal.toLocaleString("id-ID"),
            ].forEach((val) => {
                const td = document.createElement("td");
                td.textContent = val;
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        const tfoot = document.createElement("tfoot");
        const totalRow = document.createElement("tr");
        const tdEmpty = document.createElement("td");
        tdEmpty.colSpan = 4;
        tdEmpty.className = "text-end fw-bold";
        tdEmpty.textContent = "Total Estimasi:";
        const tdTotal = document.createElement("td");
        tdTotal.className = "fw-bold text-success";
        tdTotal.textContent = "Rp " + grandTotal.toLocaleString("id-ID");
        totalRow.appendChild(tdEmpty);
        totalRow.appendChild(tdTotal);
        tfoot.appendChild(totalRow);
        table.appendChild(tfoot);

        body.appendChild(table);
    }

    // FOOTER ACTIONS
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn btn-secondary";
    closeBtn.setAttribute("data-bs-dismiss", "modal");
    closeBtn.textContent = "Tutup";
    footer.appendChild(closeBtn);

    if (currentUser?.role === "APPROVAL" && report.status === "PENDING_APPROVAL") {
        const approveBtn = document.createElement("button");
        approveBtn.className = "btn btn-primary";
        approveBtn.textContent = "Setujui Laporan";
        approveBtn.addEventListener("click", async () => {
            try {
                await approveReport(report.id);
                showAlert("Laporan berhasil disetujui!", "success");
                bootstrap.Modal.getInstance(document.getElementById("reportDetailModal")).hide();
                loadReports();
            } catch (e) {
                showAlert(e.message);
            }
        });
        footer.appendChild(approveBtn);
    }

    if (
        currentUser?.role === "SA" &&
        currentUser?.id === report.created_by &&
        report.status === "APPROVED"
    ) {
        const completeBtn = document.createElement("button");
        completeBtn.className = "btn btn-success";
        completeBtn.textContent = "Selesaikan";
        completeBtn.addEventListener("click", () => {
            bootstrap.Modal.getInstance(document.getElementById("reportDetailModal")).hide();
            openCompleteModal(report.id);
        });
        footer.appendChild(completeBtn);
    }
}

function openCompleteModal(reportId) {
    const modal = new bootstrap.Modal(document.getElementById("completeModal"));
    document.getElementById("proofPhotoInput").value = "";

    document.getElementById("btnConfirmComplete").onclick = async () => {
        const proof = document.getElementById("proofPhotoInput").value.trim();
        if (!proof) {
            showAlert("Foto bukti wajib diisi");
            return;
        }
        try {
            await completeReport(reportId, proof);
            showAlert("Laporan berhasil diselesaikan!", "success");
            modal.hide();
            loadReports();
        } catch (e) {
            showAlert(e.message);
        }
    };

    modal.show();
}

// VEHICLE SELECT (untuk form create report)
function populateVehicleSelect(vehicles) {
    const sel = els.vehicleSelect();
    sel.replaceChildren();

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Pilih Kendaraan --";
    sel.appendChild(defaultOpt);

    vehicles.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = `${v.license_plate} - ${v.model}`;
        sel.appendChild(opt);
    });
}

// ITEM ROWS
let masterItems = []; 

function setMasterItems(items) {
    masterItems = items;
}

function addItemRow() {
    const container = els.itemList();
    const row = document.createElement("div");
    row.className = "item-row d-flex gap-2 align-items-center";

    const sel = document.createElement("select");
    sel.className = "form-select form-select-sm item-select";

    const defOpt = document.createElement("option");
    defOpt.value = "";
    defOpt.textContent = "-- Pilih Item --";
    sel.appendChild(defOpt);

    masterItems.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.dataset.price = item.price;
        opt.textContent = `[${item.type}] ${item.item_name} - Rp ${item.price.toLocaleString("id-ID")}`;
        sel.appendChild(opt);
    });

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.value = "1";
    qtyInput.className = "form-control form-control-sm item-qty";
    qtyInput.style.width = "70px";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-outline-danger btn-sm";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
        row.remove();
        recalcTotal();
    });

    sel.addEventListener("change", recalcTotal);
    qtyInput.addEventListener("input", recalcTotal);

    row.appendChild(sel);
    row.appendChild(qtyInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
}

function recalcTotal() {
    let total = 0;
    document.querySelectorAll(".item-row").forEach((row) => {
        const sel = row.querySelector(".item-select");
        const qty = parseInt(row.querySelector(".item-qty").value) || 1;
        const selectedOpt = sel.options[sel.selectedIndex];
        const price = parseFloat(selectedOpt?.dataset?.price || 0);
        total += price * qty;
    });
    els.totalEstimation().textContent = "Rp " + total.toLocaleString("id-ID");
}

function getItemRowsData() {
    const items = [];
    document.querySelectorAll(".item-row").forEach((row) => {
        const sel = row.querySelector(".item-select");
        const qty = parseInt(row.querySelector(".item-qty").value) || 1;
        if (sel.value) {
            items.push({ item_id: parseInt(sel.value), quantity: qty });
        }
    });
    return items;
}

function clearItemRows() {
    els.itemList().replaceChildren();
    recalcTotal();
}
