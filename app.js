// Data Motor
const motorData = [
    { nopol: "B5502TSB", kategori: "MATIC", tipe: "STYLO CBS", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5048TYK", kategori: "MATIC", tipe: "BEAT STREET", peminjam: "TRIMUL", status: "DIPINJAM" },
    { nopol: "B5639TGX", kategori: "SPORT", tipe: "CBR 250G", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5486TDF", kategori: "MATIC", tipe: "GENIO", peminjam: "IBOY", status: "DIPINJAM" },
    { nopol: "B5476TDG", kategori: "MATIC", tipe: "ADV 150", peminjam: "MARIO", status: "DIPINJAM" },
    { nopol: "B5367TIB", kategori: "MATIC", tipe: "PCX 160", peminjam: "RAFI", status: "DIPINJAM" },
    { nopol: "B5082TMR", kategori: "MATIC", tipe: "VARIO 125", peminjam: "SURIP ROMLI", status: "DIPINJAM" },
    { nopol: "B4667TNW", kategori: "BOX HMS", tipe: "BRANDING SUPRA GTR 150", peminjam: "ABC", status: "DIPINJAM" },
    { nopol: "B3469UPK", kategori: "SPORT", tipe: "CBR 250 RR", peminjam: "ABC", status: "DIPINJAM" },
    { nopol: "H2197OH", kategori: "BIGBIKE", tipe: "REBEL (MUTASI FR SEMARANG)", peminjam: "ABC", status: "DIPINJAM" },
    { nopol: "B5950TWI", kategori: "EV", tipe: "EM1 (JHC)", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5386TWN", kategori: "EV", tipe: "CUV", peminjam: "ABC", status: "DIPINJAM" },
    { nopol: "B4258TWA", kategori: "SPORT", tipe: "CRF 150", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B3167UVU", kategori: "BIGBIKE", tipe: "ADV 750", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5236TFY", kategori: "BOX HMS", tipe: "BRANDING PCX 150", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B4319TPV", kategori: "SPORT", tipe: "CRF 250", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B3858PJE", kategori: "BIGBIKE", tipe: "GOLDWING", peminjam: "ABC", status: "DIPINJAM" },
    { nopol: "B5724TII", kategori: "BIGBIKE", tipe: "CB 500", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5319TJU", kategori: "SPORT OK", tipe: "CB150X STD", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5422TIB", kategori: "SPORT", tipe: "CBR 150", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5290TKF", kategori: "MATIC", tipe: "VARIO 160", peminjam: "ABC", status: "DIPINJAM" },
    { nopol: "B5038TLF", kategori: "MATIC", tipe: "ADV 160", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5536TRL", kategori: "BIGBIKE", tipe: "CB 650R", peminjam: "AFIT/BEKASI EVENT HOC", status: "DIPINJAM" },
    { nopol: "B5833TWH", kategori: "EV", tipe: "EM1", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5832TWH", kategori: "EV", tipe: "EM1", peminjam: "ABC", status: "DIPINJAM" },
    { nopol: "B5585TUU", kategori: "MATIC", tipe: "SCOOPY ENERGETIC", peminjam: "RAIMON", status: "DIPINJAM" },
    { nopol: "B5868TUY", kategori: "MATIC", tipe: "PCX ROADSYNC", peminjam: "ABC", status: "DIPINJAM" },
    { nopol: "B5423TWN", kategori: "EV", tipe: "CUV", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B6302RAB", kategori: "MATIC", tipe: "ADV 160 Roadsync", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B5584TUU", kategori: "MATIC", tipe: "PCX ROADSYNC", peminjam: "AFIT/BEKASI EVENT HOC", status: "DIPINJAM" },
    { nopol: "B6296RAT", kategori: "MATIC", tipe: "CB150 R", peminjam: "", status: "TERSEDIA" },
    { nopol: "B6919RBM", kategori: "MATIC", tipe: "NEW VARIO 125", peminjam: "JHC", status: "DIPINJAM" },
    { nopol: "B6497RCC", kategori: "MATIC", tipe: "STYLO BURGUNDY", peminjam: "", status: "TERSEDIA" }
];

// State
let motors = [...motorData];
let pendingApprovals = [];
let logs = [];
let approvalCounter = 0;

// DOM Elements
const motorListEl = document.getElementById('motorList');
const formSection = document.getElementById('formSection');
const logSection = document.getElementById('logSection');
const filterKategori = document.getElementById('filterKategori');
const filterStatus = document.getElementById('filterStatus');
const searchMotor = document.getElementById('searchMotor');
const nopolSelect = document.getElementById('nopol');
const pinjamForm = document.getElementById('pinjamForm');

// Render Motor List
function renderMotors() {
    const kategori = filterKategori.value;
    const status = filterStatus.value;
    const search = searchMotor.value.toLowerCase();

    let filtered = motors.filter(m => {
        const matchKategori = kategori === 'all' || m.kategori === kategori;
        const matchStatus = status === 'all' || m.status === status;
        const matchSearch = m.nopol.toLowerCase().includes(search) || 
                           m.tipe.toLowerCase().includes(search);
        return matchKategori && matchStatus && matchSearch;
    });

    if (filtered.length === 0) {
        motorListEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">Tidak ada motor yang sesuai</div>`;
        return;
    }

    motorListEl.innerHTML = filtered.map(m => `
        <div class="motor-card ${m.status === 'DIPINJAM' ? 'dipinjam' : ''}">
            <div class="nopol">${m.nopol}</div>
            <div class="tipe">${m.tipe}</div>
            <span class="kategori">${m.kategori}</span>
            <br>
            <span class="status ${m.status === 'TERSEDIA' ? 'tersedia' : 'dipinjam'}">
                ${m.status === 'TERSEDIA' ? '✅ Tersedia' : '🔴 Dipinjam'}
            </span>
            ${m.peminjam ? `<div class="peminjam">👤 ${m.peminjam}</div>` : ''}
            <button class="btn-pinjam" 
                    onclick="openForm('${m.nopol}')" 
                    ${m.status === 'DIPINJAM' ? 'disabled' : ''}>
                ${m.status === 'TERSEDIA' ? '📝 Pinjam Motor' : 'Tidak Tersedia'}
            </button>
        </div>
    `).join('');
}

// Update Nopol dropdown
function updateNopolDropdown() {
    const available = motors.filter(m => m.status === 'TERSEDIA');
    nopolSelect.innerHTML = `<option value="">Pilih Motor</option>` +
        available.map(m => `<option value="${m.nopol}">${m.nopol} - ${m.tipe}</option>`).join('');
}

// Open form with selected nopol
function openForm(nopol) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="form"]').classList.add('active');
    formSection.classList.add('active');
    logSection.classList.remove('active');
    document.getElementById('filterSection').style.display = 'none';
    
    if (nopol) {
        document.getElementById('nopol').value = nopol;
    }
    formSection.scrollIntoView({ behavior: 'smooth' });
}

// Show notification
function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.4s';
        setTimeout(() => notif.remove(), 400);
    }, 5000);
}

// Add log
function addLog(message) {
    const time = new Date().toLocaleString('id-ID');
    logs.unshift({ time, message });
    renderLogs();
}

// Render logs
function renderLogs() {
    const el = document.getElementById('logEntries');
    el.innerHTML = logs.slice(0, 50).map(l => 
        `<div class="log-entry"><span class="time">${l.time}</span> - ${l.message}</div>`
    ).join('');
}

// Process approval
function processApproval(requestId, approved) {
    const request = pendingApprovals.find(r => r.id === requestId);
    if (!request) return;

    const motor = motors.find(m => m.nopol === request.nopol);
    if (!motor) return;

    if (approved) {
        motor.status = 'DIPINJAM';
        motor.peminjam = request.nama;
        addLog(`✅ Peminjaman DISETUJUI: ${request.nama} meminjam ${request.nopol} (${motor.tipe})`);
        showNotification(`✅ Peminjaman ${request.nopol} telah DISETUJUI!`, 'success');
        showNotification(`📧 Email notifikasi dikirim ke ${request.email}`, 'info');
        showNotification(`👥 Notifikasi ke penyetuju: ${request.nama} meminjam ${request.nopol}`, 'info');
    } else {
        addLog(`❌ Peminjaman DITOLAK: ${request.nama} - ${request.nopol}`);
        showNotification(`❌ Peminjaman ${request.nopol} ditolak.`, 'error');
        showNotification(`📧 Email penolakan dikirim ke ${request.email}`, 'info');
    }

    pendingApprovals = pendingApprovals.filter(r => r.id !== requestId);
    renderMotors();
    updateNopolDropdown();
    updateFormAvailability();
}

// Update form availability
function updateFormAvailability() {
    const available = motors.filter(m => m.status === 'TERSEDIA').length;
    const submitBtn = document.getElementById('submitPinjam');
    if (available === 0) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Tidak ada motor tersedia';
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ajukan Peminjaman';
    }
}

// Handle form submit
pinjamForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const nama = document.getElementById('nama').value.trim();
    const email = document.getElementById('email').value.trim();
    const dept = document.getElementById('dept').value.trim();
    const tujuan = document.getElementById('tujuan').value.trim();
    const tanggal = document.getElementById('tanggal').value;
    const nopol = document.getElementById('nopol').value;

    if (!nama || !email || !dept || !tujuan || !tanggal || !nopol) {
        showNotification('⚠️ Semua field harus diisi!', 'warning');
        return;
    }

    const motor = motors.find(m => m.nopol === nopol);
    if (!motor || motor.status !== 'TERSEDIA') {
        showNotification('⚠️ Motor tidak tersedia!', 'error');
        return;
    }

    const requestId = ++approvalCounter;
    const request = {
        id: requestId,
        nama,
        email,
        dept,
        tujuan,
        tanggal,
        nopol,
        motorTipe: motor.tipe,
        status: 'pending'
    };
    pendingApprovals.push(request);

    addLog(`📝 Pengajuan peminjaman: ${nama} - ${nopol} (${motor.tipe})`);
    showNotification(`📨 Pengajuan untuk ${nopol} sedang diproses...`, 'info');
    showNotification(`👥 Notifikasi ke penyetuju: ${nama} mengajukan ${nopol}`, 'info');
    showNotification(`📧 Email notifikasi ke penyetuju dikirim`, 'info');

    // Simulasi persetujuan 2 tahap
    setTimeout(() => {
        if (pendingApprovals.some(r => r.id === requestId)) {
            showNotification(`✅ Penyetuju 1 menyetujui peminjaman ${nopol}`, 'success');
        }
    }, 2000);

    setTimeout(() => {
        if (pendingApprovals.some(r => r.id === requestId)) {
            processApproval(requestId, true);
            pinjamForm.reset();
            updateNopolDropdown();
            updateFormAvailability();
            document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
        }
    }, 4000);
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const tab = this.dataset.tab;
        const filterSection = document.getElementById('filterSection');
        
        if (tab === 'daftar') {
            formSection.classList.remove('active');
            logSection.classList.remove('active');
            filterSection.style.display = 'flex';
            renderMotors();
        } else if (tab === 'form') {
            formSection.classList.add('active');
            logSection.classList.remove('active');
            filterSection.style.display = 'none';
            updateNopolDropdown();
            updateFormAvailability();
        } else if (tab === 'log') {
            formSection.classList.remove('active');
            logSection.classList.add('active');
            filterSection.style.display = 'none';
            renderLogs();
        }
    });
});

// Filter events
filterKategori.addEventListener('change', renderMotors);
filterStatus.addEventListener('change', renderMotors);
searchMotor.addEventListener('input', renderMotors);

// Initial render
renderMotors();
updateNopolDropdown();
updateFormAvailability();

// Set default date
document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];

// Initial log
addLog('🚀 Sistem manajemen peminjaman motor dimulai');

// Welcome notification
setTimeout(() => {
    showNotification('🏍️ Selamat datang di Peminjaman Motor!', 'info');
}, 500);
