(() => {
  "use strict";

  const config = window.MOTOR_DESK_CONFIG || {};
  const state = {
    client: null,
    session: null,
    profile: null,
    authMode: "login",
    motors: [],
    requests: [],
    approvalRequests: [],
    users: [],
    currentView: "dashboard",
    toastTimer: null
  };

  const roleLabels = Object.freeze({
    borrower: "Peminjam",
    approver_ray: "Penyetuju 2 · Ray",
    approver_harifah: "Penyetuju 1 · Harifah",
    admin: "Admin Pengelola"
  });

  const statusLabels = Object.freeze({
    TERSEDIA: "Tersedia",
    DIAJUKAN: "Diajukan",
    DIPINJAM: "Dipinjam",
    PENDING_RAY: "Menunggu Ray",
    PENDING_HARIFAH: "Menunggu Harifah",
    APPROVED: "Disetujui",
    REJECTED: "Ditolak"
  });

  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    collectElements();
    bindEvents();
    setAuthMode("login");
    setDefaultDate();

    if (!hasValidConfig()) {
      el.setupWarning.hidden = false;
      el.authSubmit.disabled = true;
      showAuthError("Isi SUPABASE_URL dan SUPABASE_ANON_KEY pada config.js terlebih dahulu.");
      return;
    }

    if (!window.supabase?.createClient) {
      showAuthError("Pustaka Supabase gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.");
      return;
    }

    state.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    state.client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        void syncSession(null);
      }
      if (event === "SIGNED_IN" && session?.user?.id !== state.session?.user?.id) {
        window.setTimeout(() => void syncSession(session), 0);
      }
    });

    const { data, error } = await state.client.auth.getSession();
    if (error) {
      showAuthError(readableError(error));
      return;
    }
    await syncSession(data.session);
  }

  function collectElements() {
    [
      "toast", "authScreen", "appScreen", "authTitle", "authSubtitle", "loginTab", "registerTab",
      "authForm", "fullNameField", "authFullName", "accountTypeField", "authAccountType",
      "approverIdentityField", "authApproverIdentity", "authEmail", "authPassword", "togglePassword",
      "authError", "authSubmit", "setupWarning", "mainNav", "approvalNav", "approvalBadge", "adminNav",
      "userAvatar", "userName", "userRole", "logoutButton", "dashboardView", "myRequestsView",
      "approvalsView", "adminView", "availableStat", "borrowedStat", "motorCount", "motorSearch",
      "categoryFilter", "refreshMotors", "motorGrid", "loanFormSurface", "loanForm", "loanName",
      "loanEmail", "loanDept", "loanPurpose", "loanDate", "loanPlate", "refreshRequests",
      "myRequestList", "approvalTitle", "approvalDescription", "approvalStep", "approvalRoleLabel",
      "approvalList", "refreshUsers", "userTable", "adminMotorTable"
    ].forEach((id) => {
      el[id] = document.getElementById(id);
    });
    el.myRequestsNav = document.querySelector('[data-view-target="myRequests"]');
    el.dashboardGrid = document.querySelector(".dashboard-grid");
  }

  function bindEvents() {
    document.querySelectorAll("[data-auth-mode]").forEach((button) => {
      button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
    });

    document.querySelectorAll("[data-view-target]").forEach((button) => {
      button.addEventListener("click", () => void navigate(button.dataset.viewTarget));
    });

    el.authForm.addEventListener("submit", handleAuthSubmit);
    el.authAccountType.addEventListener("change", updateRegistrationFields);
    el.togglePassword.addEventListener("click", togglePassword);
    el.logoutButton.addEventListener("click", handleLogout);
    el.motorSearch.addEventListener("input", renderMotors);
    el.categoryFilter.addEventListener("change", renderMotors);
    el.refreshMotors.addEventListener("click", () => void loadMotors(true));
    el.loanForm.addEventListener("submit", handleLoanSubmit);
    el.refreshRequests.addEventListener("click", () => void loadMyRequests(true));
    el.approvalList.addEventListener("click", handleApprovalAction);
    el.refreshUsers.addEventListener("click", () => void loadAdminData(true));
    el.userTable.addEventListener("click", handleUserRoleSave);
    el.adminMotorTable.addEventListener("click", handleMotorSave);
  }

  function hasValidConfig() {
    return Boolean(
      config.supabaseUrl &&
      config.supabaseAnonKey &&
      !String(config.supabaseUrl).startsWith("GANTI_") &&
      !String(config.supabaseAnonKey).startsWith("GANTI_")
    );
  }

  function setAuthMode(mode) {
    state.authMode = mode === "register" ? "register" : "login";
    const registering = state.authMode === "register";
    el.loginTab.classList.toggle("active", !registering);
    el.registerTab.classList.toggle("active", registering);
    el.fullNameField.hidden = !registering;
    el.accountTypeField.hidden = !registering;
    el.authFullName.required = registering;
    updateRegistrationFields();
    el.authPassword.autocomplete = registering ? "new-password" : "current-password";
    el.authTitle.textContent = registering ? "Buat akun baru" : "Masuk ke Motor Desk";
    el.authSubtitle.textContent = registering
      ? "Daftar mandiri untuk mengajukan peminjaman."
      : "Gunakan akun yang sudah terdaftar.";
    el.authSubmit.textContent = registering ? "Daftar akun" : "Masuk";
    el.authError.hidden = true;
  }

  function updateRegistrationFields() {
    const showApprover = state.authMode === "register" && el.authAccountType.value === "approver";
    el.approverIdentityField.hidden = !showApprover;
    el.authApproverIdentity.required = showApprover;
  }

  function togglePassword() {
    const revealing = el.authPassword.type === "password";
    el.authPassword.type = revealing ? "text" : "password";
    el.togglePassword.textContent = revealing ? "Tutup" : "Lihat";
    el.togglePassword.setAttribute("aria-label", revealing ? "Sembunyikan password" : "Tampilkan password");
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!state.client) return;

    setButtonLoading(el.authSubmit, true, state.authMode === "register" ? "Mendaftarkan..." : "Memeriksa...");
    el.authError.hidden = true;
    const email = el.authEmail.value.trim().toLowerCase();
    const password = el.authPassword.value;

    try {
      if (state.authMode === "register") {
        const fullName = el.authFullName.value.trim();
        const accountType = el.authAccountType.value;
        const approverIdentity = el.authApproverIdentity.value;
        if (accountType === "approver") {
          const expectedEmail = String(config.staffEmails?.[approverIdentity] || "").toLowerCase();
          if (!expectedEmail || email !== expectedEmail) {
            const person = approverIdentity === "ray" ? "Ray" : "Harifah";
            throw new Error(`Email tidak cocok dengan email Penyetuju ${person} yang terdaftar.`);
          }
        }
        const { data, error } = await state.client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              account_type: accountType,
              requested_approver: accountType === "approver" ? approverIdentity : null
            }
          }
        });
        if (error) throw error;
        if (data.session) {
          await syncSession(data.session);
          showToast("Akun berhasil dibuat.", "success");
        } else {
          setAuthMode("login");
          el.authEmail.value = email;
          showToast("Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.", "success", 7000);
        }
      } else {
        const { data, error } = await state.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await syncSession(data.session);
      }
    } catch (error) {
      showAuthError(readableError(error));
    } finally {
      setButtonLoading(el.authSubmit, false);
      el.authSubmit.textContent = state.authMode === "register" ? "Daftar akun" : "Masuk";
    }
  }

  async function handleLogout() {
    if (!state.client) return;
    el.logoutButton.disabled = true;
    const { error } = await state.client.auth.signOut();
    el.logoutButton.disabled = false;
    if (error) {
      showToast(readableError(error), "error");
      return;
    }
    await syncSession(null);
  }

  async function syncSession(session) {
    state.session = session;
    if (!session) {
      state.profile = null;
      state.motors = [];
      el.authScreen.hidden = false;
      el.appScreen.hidden = true;
      el.authForm.reset();
      setAuthMode("login");
      return;
    }

    const { data: profile, error } = await state.client
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("id", session.user.id)
      .single();

    if (error || !profile) {
      showToast("Profil akun belum tersedia. Jalankan schema.sql lalu coba lagi.", "error", 7000);
      await state.client.auth.signOut();
      return;
    }

    state.profile = profile;
    applyRoleAccess();
    el.authScreen.hidden = true;
    el.appScreen.hidden = false;
    await loadMotors();
    if (profile.role === "borrower") await loadMyRequests();
    if (isApprover()) await loadApprovals();
    navigate("dashboard");
  }

  function applyRoleAccess() {
    const role = state.profile.role || "borrower";
    const displayName = state.profile.full_name || state.profile.email.split("@")[0];
    el.userName.textContent = displayName;
    el.userRole.textContent = roleLabels[role] || role;
    el.userAvatar.textContent = initials(displayName);
    el.loanName.value = displayName;
    el.loanEmail.value = state.profile.email;

    const borrower = role === "borrower";
    const approver = isApprover();
    const admin = role === "admin";
    el.loanFormSurface.hidden = !borrower;
    el.myRequestsNav.hidden = !borrower;
    el.approvalNav.hidden = !approver;
    el.adminNav.hidden = !admin;
    el.dashboardGrid.classList.toggle("dashboard-grid--single", !borrower);

    if (role === "approver_ray") {
      el.approvalTitle.innerHTML = "Persetujuan <em>Ray.</em>";
      el.approvalDescription.textContent = "Tahap kedua: hanya pengajuan yang sudah disetujui Harifah yang tampil di sini.";
      el.approvalStep.textContent = "2";
      el.approvalRoleLabel.textContent = "Persetujuan Ray";
    }
    if (role === "approver_harifah") {
      el.approvalTitle.innerHTML = "Persetujuan <em>Harifah.</em>";
      el.approvalDescription.textContent = "Tahap pertama: tinjau pengajuan sebelum diteruskan ke Ray.";
      el.approvalStep.textContent = "1";
      el.approvalRoleLabel.textContent = "Persetujuan Harifah";
    }
  }

  async function navigate(viewName) {
    const allowed = {
      dashboard: true,
      myRequests: state.profile?.role === "borrower",
      approvals: isApprover(),
      admin: state.profile?.role === "admin"
    };
    const target = allowed[viewName] ? viewName : "dashboard";
    state.currentView = target;

    document.querySelectorAll(".view").forEach((view) => { view.hidden = true; });
    document.querySelectorAll("[data-view-target]").forEach((button) => {
      button.classList.toggle("active", button.dataset.viewTarget === target);
    });

    const viewMap = {
      dashboard: el.dashboardView,
      myRequests: el.myRequestsView,
      approvals: el.approvalsView,
      admin: el.adminView
    };
    viewMap[target].hidden = false;

    if (target === "myRequests") await loadMyRequests();
    if (target === "approvals") await loadApprovals();
    if (target === "admin") await loadAdminData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadMotors(withToast = false) {
    el.motorGrid.innerHTML = '<div class="loading-state">Memuat data armada...</div>';
    const { data, error } = await state.client
      .from("motors")
      .select("id, nopol, kategori, tipe, peminjam, status, updated_at")
      .order("id", { ascending: true });

    if (error) {
      el.motorGrid.innerHTML = `<div class="empty-state">${escapeHtml(readableError(error))}</div>`;
      if (withToast) showToast(readableError(error), "error");
      return;
    }

    state.motors = data || [];
    populateCategoryFilter();
    populateAvailableMotors();
    updateStats();
    renderMotors();
    if (state.profile?.role === "admin") renderAdminMotors();
    if (withToast) showToast("Data motor diperbarui.", "success");
  }

  function populateCategoryFilter() {
    const current = el.categoryFilter.value;
    const categories = [...new Set(state.motors.map((motor) => motor.kategori).filter(Boolean))].sort();
    el.categoryFilter.innerHTML = '<option value="ALL">Semua kategori</option>' + categories
      .map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`)
      .join("");
    el.categoryFilter.value = categories.includes(current) ? current : "ALL";
  }

  function populateAvailableMotors() {
    const current = el.loanPlate.value;
    const available = state.motors.filter((motor) => motor.status === "TERSEDIA");
    el.loanPlate.innerHTML = '<option value="">Pilih motor</option>' + available
      .map((motor) => `<option value="${escapeAttr(motor.nopol)}">${escapeHtml(motor.nopol)} · ${escapeHtml(motor.tipe)}</option>`)
      .join("");
    if (available.some((motor) => motor.nopol === current)) el.loanPlate.value = current;
  }

  function updateStats() {
    const available = state.motors.filter((motor) => motor.status === "TERSEDIA").length;
    const borrowed = state.motors.filter((motor) => motor.status === "DIPINJAM").length;
    el.availableStat.textContent = String(available);
    el.borrowedStat.textContent = String(borrowed);
    el.motorCount.textContent = `${state.motors.length} unit`;
  }

  function renderMotors() {
    const query = el.motorSearch.value.trim().toLowerCase();
    const category = el.categoryFilter.value;
    const filtered = state.motors.filter((motor) => {
      const haystack = [motor.nopol, motor.tipe, motor.kategori, motor.peminjam].filter(Boolean).join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (category === "ALL" || motor.kategori === category);
    });

    if (!filtered.length) {
      el.motorGrid.innerHTML = '<div class="empty-state">Tidak ada motor yang cocok dengan pencarian.</div>';
      return;
    }

    el.motorGrid.innerHTML = filtered.map((motor) => `
      <article class="motor-card" data-status="${escapeAttr(motor.status)}">
        <div class="motor-card__top">
          <span class="motor-id">${escapeHtml(motor.id)}</span>
          <span class="status-pill" data-status="${escapeAttr(motor.status)}">${escapeHtml(statusLabel(motor.status))}</span>
        </div>
        <div class="motor-card__body">
          <h3>${escapeHtml(motor.tipe)}</h3>
          <p>${escapeHtml(motor.kategori)}</p>
        </div>
        <div class="motor-card__footer">
          <strong>${escapeHtml(motor.nopol)}</strong>
          <span>${escapeHtml(motor.peminjam || "Belum ada peminjam")}</span>
        </div>
      </article>
    `).join("");
  }

  async function handleLoanSubmit(event) {
    event.preventDefault();
    if (state.profile?.role !== "borrower") return;
    const submitButton = el.loanForm.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, "Mengirim pengajuan...");

    const payload = {
      user_id: state.session.user.id,
      name: el.loanName.value.trim(),
      email: el.loanEmail.value.trim().toLowerCase(),
      dept: el.loanDept.value.trim(),
      tujuan: el.loanPurpose.value.trim(),
      tanggal: el.loanDate.value,
      nopol: el.loanPlate.value
    };

    try {
      const { data, error } = await state.client
        .from("loan_requests")
        .insert(payload)
        .select("id, status")
        .single();
      if (error) throw error;

      const emailSent = await sendNotification(data.id, "submitted");
      el.loanDept.value = "";
      el.loanPurpose.value = "";
      el.loanPlate.value = "";
      setDefaultDate();
      await Promise.all([loadMotors(), loadMyRequests()]);
      showToast(
        emailSent
          ? "Pengajuan dikirim ke Harifah dan notifikasi email diproses."
          : "Pengajuan tersimpan, tetapi notifikasi email belum terkirim.",
        emailSent ? "success" : "error",
        6500
      );
    } catch (error) {
      showToast(readableError(error), "error", 6500);
    } finally {
      setButtonLoading(submitButton, false);
      submitButton.textContent = "Ajukan peminjaman →";
    }
  }

  async function loadMyRequests(withToast = false) {
    if (state.profile?.role !== "borrower") return;
    el.myRequestList.innerHTML = '<div class="loading-state">Memuat riwayat pengajuan...</div>';
    const { data, error } = await state.client
      .from("loan_requests")
      .select("*, approvals(*)")
      .eq("user_id", state.session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      el.myRequestList.innerHTML = `<div class="empty-state">${escapeHtml(readableError(error))}</div>`;
      if (withToast) showToast(readableError(error), "error");
      return;
    }
    state.requests = data || [];
    renderRequestList(el.myRequestList, state.requests, false);
    if (withToast) showToast("Riwayat pengajuan diperbarui.", "success");
  }

  async function loadApprovals(withToast = false) {
    if (!isApprover()) return;
    el.approvalList.innerHTML = '<div class="loading-state">Memuat antrean persetujuan...</div>';
    const waitingStatus = state.profile.role === "approver_harifah" ? "PENDING_HARIFAH" : "PENDING_RAY";
    const { data, error } = await state.client
      .from("loan_requests")
      .select("*, approvals(*)")
      .eq("status", waitingStatus)
      .order("created_at", { ascending: true });

    if (error) {
      el.approvalList.innerHTML = `<div class="empty-state">${escapeHtml(readableError(error))}</div>`;
      if (withToast) showToast(readableError(error), "error");
      return;
    }
    state.approvalRequests = data || [];
    renderRequestList(el.approvalList, state.approvalRequests, true);
    el.approvalBadge.textContent = String(state.approvalRequests.length);
    el.approvalBadge.hidden = state.approvalRequests.length === 0;
    if (withToast) showToast("Antrean persetujuan diperbarui.", "success");
  }

  function renderRequestList(container, requests, withActions) {
    if (!requests.length) {
      container.innerHTML = `<div class="empty-state">${withActions ? "Tidak ada pengajuan yang menunggu keputusan Anda." : "Belum ada pengajuan peminjaman."}</div>`;
      return;
    }

    container.innerHTML = requests.map((request) => {
      const approvals = request.approvals || [];
      const ray = approvals.find((item) => item.approver_role === "ray");
      const harifah = approvals.find((item) => item.approver_role === "harifah");
      return `
        <article class="request-card" data-status="${escapeAttr(request.status)}">
          <div class="request-primary">
            <span class="status-pill" data-status="${escapeAttr(request.status)}">${escapeHtml(statusLabel(request.status))}</span>
            <h3>${escapeHtml(request.nopol)}</h3>
            <p>${escapeHtml(request.name)} · ${escapeHtml(request.dept)}</p>
          </div>
          <div>
            <div class="request-meta">
              <span><strong>Tanggal</strong>${escapeHtml(formatDate(request.tanggal))}</span>
              <span><strong>Email</strong>${escapeHtml(request.email)}</span>
              <span><strong>Tujuan</strong>${escapeHtml(request.tujuan)}</span>
              <span><strong>Diajukan</strong>${escapeHtml(formatDateTime(request.created_at))}</span>
            </div>
            ${renderApprovalProgress(ray, harifah)}
          </div>
          ${withActions ? `
            <div class="request-actions">
              <button class="button button--success" type="button" data-approval="APPROVED" data-request-id="${escapeAttr(request.id)}">Setujui</button>
              <button class="button button--danger" type="button" data-approval="REJECTED" data-request-id="${escapeAttr(request.id)}">Tolak</button>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");
  }

  function renderApprovalProgress(ray, harifah) {
    const rayDecision = ray?.decision || "WAITING";
    const harifahDecision = harifah?.decision || "WAITING";
    return `
      <div class="approval-progress">
        <div class="approval-step" data-decision="${escapeAttr(harifahDecision)}">
          <b>1</b><span><strong>Harifah</strong>${escapeHtml(decisionLabel(harifahDecision))}</span>
        </div>
        <i></i>
        <div class="approval-step" data-decision="${escapeAttr(rayDecision)}">
          <b>2</b><span><strong>Ray</strong>${escapeHtml(decisionLabel(rayDecision))}</span>
        </div>
      </div>
    `;
  }

  async function handleApprovalAction(event) {
    const button = event.target.closest("[data-approval]");
    if (!button || !isApprover()) return;
    const decision = button.dataset.approval;
    const requestId = button.dataset.requestId;
    let note = "";
    if (decision === "REJECTED") {
      const answer = window.prompt("Tuliskan alasan penolakan:");
      if (answer === null) return;
      note = answer.trim();
      if (!note) {
        showToast("Alasan penolakan wajib diisi.", "error");
        return;
      }
    }

    const role = state.profile.role === "approver_ray" ? "ray" : "harifah";
    const card = button.closest(".request-card");
    card.querySelectorAll("button").forEach((item) => { item.disabled = true; });

    const { error } = await state.client.from("approvals").upsert({
      request_id: requestId,
      approver_id: state.session.user.id,
      approver_role: role,
      decision,
      note: note || null,
      decided_at: new Date().toISOString()
    }, { onConflict: "request_id,approver_role" });

    if (error) {
      card.querySelectorAll("button").forEach((item) => { item.disabled = false; });
      showToast(readableError(error), "error", 6500);
      return;
    }

    const { data: updated, error: statusError } = await state.client
      .from("loan_requests")
      .select("status")
      .eq("id", requestId)
      .single();
    if (statusError) showToast(readableError(statusError), "error");

    let emailSent = true;
    if (["APPROVED", "REJECTED"].includes(updated?.status)) {
      emailSent = await sendNotification(requestId, "decision");
    }
    await Promise.all([loadApprovals(), loadMotors()]);
    showToast(
      emailSent ? "Keputusan berhasil disimpan." : "Keputusan tersimpan, tetapi email belum terkirim.",
      emailSent ? "success" : "error",
      6000
    );
  }

  async function sendNotification(requestId, event) {
    try {
      const { error } = await state.client.functions.invoke("send-notification", {
        body: { requestId, event }
      });
      return !error;
    } catch (_error) {
      return false;
    }
  }

  async function loadAdminData(withToast = false) {
    if (state.profile?.role !== "admin") return;
    el.userTable.innerHTML = '<div class="loading-state">Memuat akun pengguna...</div>';
    const [{ data: users, error: userError }, { data: motors, error: motorError }] = await Promise.all([
      state.client.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: true }),
      state.client.from("motors").select("id, nopol, kategori, tipe, peminjam, status, updated_at").order("id", { ascending: true })
    ]);

    if (userError) {
      el.userTable.innerHTML = `<div class="empty-state">${escapeHtml(readableError(userError))}</div>`;
    } else {
      state.users = users || [];
      renderUsers();
    }

    if (motorError) {
      el.adminMotorTable.innerHTML = `<div class="empty-state">${escapeHtml(readableError(motorError))}</div>`;
    } else {
      state.motors = motors || [];
      renderAdminMotors();
      updateStats();
      renderMotors();
    }
    if (withToast && !userError && !motorError) showToast("Data admin diperbarui.", "success");
  }

  function renderUsers() {
    if (!state.users.length) {
      el.userTable.innerHTML = '<div class="empty-state">Belum ada akun terdaftar.</div>';
      return;
    }
    el.userTable.innerHTML = `
      <table>
        <thead><tr><th>Pengguna</th><th>Terdaftar</th><th>Peran</th><th>Aksi</th></tr></thead>
        <tbody>
          ${state.users.map((user) => `
            <tr data-user-email="${escapeAttr(user.email)}">
              <td><strong>${escapeHtml(user.full_name || "Tanpa nama")}</strong><small>${escapeHtml(user.email)}</small></td>
              <td>${escapeHtml(formatDateTime(user.created_at))}</td>
              <td>
                <select class="role-select" aria-label="Peran ${escapeAttr(user.email)}">
                  ${roleOption("borrower", user.role)}
                  ${roleOption("approver_ray", user.role)}
                  ${roleOption("approver_harifah", user.role)}
                  ${roleOption("admin", user.role)}
                </select>
              </td>
              <td><button class="table-action" type="button" data-save-role>Simpan</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function roleOption(value, current) {
    return `<option value="${value}"${value === current ? " selected" : ""}>${escapeHtml(roleLabels[value])}</option>`;
  }

  async function handleUserRoleSave(event) {
    const button = event.target.closest("[data-save-role]");
    if (!button || state.profile?.role !== "admin") return;
    const row = button.closest("tr");
    const targetEmail = row.dataset.userEmail;
    const newRole = row.querySelector(".role-select").value;
    setButtonLoading(button, true, "Menyimpan...");
    const { error } = await state.client.rpc("admin_set_user_role", {
      target_email: targetEmail,
      new_role: newRole
    });
    if (error) {
      showToast(readableError(error), "error", 6500);
      setButtonLoading(button, false);
      button.textContent = "Simpan";
      return;
    }
    showToast("Peran akun diperbarui. Setiap peran staf hanya dapat dimiliki satu akun.", "success", 6000);
    await loadAdminData();
    if (targetEmail === state.profile.email || newRole === "admin") {
      const { data } = await state.client.from("profiles").select("*").eq("id", state.session.user.id).single();
      if (data) {
        state.profile = data;
        applyRoleAccess();
        if (data.role !== "admin") navigate("dashboard");
      }
    }
  }

  function renderAdminMotors() {
    if (!state.motors.length) {
      el.adminMotorTable.innerHTML = '<div class="empty-state">Belum ada data motor.</div>';
      return;
    }
    el.adminMotorTable.innerHTML = `
      <table>
        <thead><tr><th>ID / Nopol</th><th>Motor</th><th>Peminjam</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          ${state.motors.map((motor) => `
            <tr data-motor-id="${escapeAttr(motor.id)}">
              <td><strong>${escapeHtml(motor.nopol)}</strong><small>${escapeHtml(motor.id)}</small></td>
              <td><strong>${escapeHtml(motor.tipe)}</strong><small>${escapeHtml(motor.kategori)}</small></td>
              <td><input class="motor-borrower" value="${escapeAttr(motor.peminjam || "")}" placeholder="Kosong jika tersedia"></td>
              <td>
                <select class="motor-status">
                  ${motorStatusOption("TERSEDIA", motor.status)}
                  ${motorStatusOption("DIAJUKAN", motor.status)}
                  ${motorStatusOption("DIPINJAM", motor.status)}
                </select>
              </td>
              <td><button class="table-action" type="button" data-save-motor>Simpan</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function motorStatusOption(value, current) {
    return `<option value="${value}"${value === current ? " selected" : ""}>${escapeHtml(statusLabel(value))}</option>`;
  }

  async function handleMotorSave(event) {
    const button = event.target.closest("[data-save-motor]");
    if (!button || state.profile?.role !== "admin") return;
    const row = button.closest("tr");
    const motorId = row.dataset.motorId;
    const status = row.querySelector(".motor-status").value;
    const borrower = row.querySelector(".motor-borrower").value.trim();
    setButtonLoading(button, true, "Menyimpan...");
    const { error } = await state.client
      .from("motors")
      .update({ status, peminjam: borrower || null })
      .eq("id", motorId);
    if (error) {
      showToast(readableError(error), "error");
      setButtonLoading(button, false);
      button.textContent = "Simpan";
      return;
    }
    showToast(`Data ${motorId} diperbarui.`, "success");
    await loadMotors();
    renderAdminMotors();
  }

  function isApprover() {
    return ["approver_ray", "approver_harifah"].includes(state.profile?.role);
  }

  function setDefaultDate() {
    if (!el.loanDate) return;
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    el.loanDate.min = local;
    if (!el.loanDate.value) el.loanDate.value = local;
  }

  function setButtonLoading(button, loading, loadingText = "Memproses...") {
    button.disabled = loading;
    if (loading) button.textContent = loadingText;
  }

  function showAuthError(message) {
    el.authError.textContent = message;
    el.authError.hidden = false;
  }

  function showToast(message, type = "success", duration = 4200) {
    window.clearTimeout(state.toastTimer);
    el.toast.textContent = message;
    el.toast.dataset.type = type;
    el.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => { el.toast.hidden = true; }, duration);
  }

  function readableError(error) {
    const message = error?.message || String(error || "Terjadi kesalahan.");
    const lower = message.toLowerCase();
    if (lower.includes("invalid login credentials")) return "Email atau password salah.";
    if (lower.includes("email not confirmed")) return "Email belum dikonfirmasi. Periksa kotak masuk Anda.";
    if (lower.includes("user already registered")) return "Email sudah terdaftar. Silakan masuk.";
    if (lower.includes("motor tidak tersedia")) return "Motor baru saja diajukan atau dipinjam pengguna lain. Pilih motor lain.";
    if (lower.includes("ray hanya dapat")) return "Ray hanya dapat memutuskan setelah Harifah menyetujui.";
    if (lower.includes("row-level security")) return "Akun ini tidak memiliki izin untuk tindakan tersebut.";
    return message;
  }

  function statusLabel(status) {
    return statusLabels[status] || status || "-";
  }

  function decisionLabel(decision) {
    if (decision === "APPROVED") return "Disetujui";
    if (decision === "REJECTED") return "Ditolak";
    return "Menunggu";
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" })
      .format(new Date(`${value}T00:00:00`));
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }
})();
