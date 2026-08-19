import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const modules = [
  ["tasks", "Tasks", "✓", "Track things that need to get done."],
  ["logbook", "Daily Logbook", "☰", "Keep day-to-day business notes."],
  ["equipment", "Equipment", "⚙", "Track tools, assets and equipment."],
  ["employees", "Employees", "♙", "Keep lightweight employee records."],
  ["vehicles", "Vehicles", "⌁", "Track company vehicles and notes."],
  ["maintenance", "Maintenance", "⌂", "Record service and maintenance due dates."],
  ["renewals", "Renewals", "↻", "Track licenses, insurance and expiration dates."],
  ["incidents", "Incidents", "!", "Document accidents, damage and issues."],
  ["photo-proof", "Photo Proof", "▣", "Organize before/after and proof records."],
  ["vendors", "Vendors", "◇", "Keep supplier and vendor notes together."],
  ["subscriptions", "Subscriptions", "$", "Track business subscriptions and renewals."],
  ["checklists", "Checklists", "☑", "Opening, closing and recurring checklists."],
  ["documents", "Documents", "▤", "Track important documents and due dates."],
  ["training", "Training", "◎", "Track training and certification items."],
  ["website-monitor", "Website Monitor", "◉", "Keep website checks and outage notes."],
  ["qr-assets", "QR Assets", "⌗", "Prepare records for QR-tagged assets."],
  ["shift-handoff", "Shift Handoff", "⇄", "Leave important notes for the next shift."],
  ["asset-checkout", "Asset Checkout", "↗", "Track who currently has company property."],
  ["supplies", "Supply Alerts", "△", "Record low-stock and restock needs."],
  ["warranties", "Warranties", "W", "Keep warranty and purchase-date records."],
  ["complaints", "Complaints", "!", "Record and resolve customer complaints."],
  ["suggestions", "Suggestions", "+", "Capture employee and business improvement ideas."],
  ["visitor-log", "Visitor Log", "V", "Record visitors and contractors."],
  ["package-log", "Package Log", "□", "Track packages received by the business."]
];

const defaultEnabledModules = [
  "tasks", "logbook", "equipment", "maintenance", "renewals", "incidents", "photo-proof", "vendors"
];

let currentUser = null;
let userProfile = null;
let business = null;
let records = [];
let currentView = "dashboard";

const $ = (id) => document.getElementById(id);
const publicSite = $("publicSite");
const publicFooter = $("publicFooter");
const appShell = $("appShell");
const authModal = $("authModal");
const recordModal = $("recordModal");

$("year").textContent = new Date().getFullYear();

function safeText(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function moduleById(id) {
  return modules.find((item) => item[0] === id) || [id, id, "•", ""];
}

function renderPublicFeatures() {
  $("publicFeatureGrid").innerHTML = modules.slice(0, 12).map(([id, name, icon, desc]) => `
    <article class="feature-card">
      <span class="feature-icon">${safeText(icon)}</span>
      <h3>${safeText(name)}</h3>
      <p>${safeText(desc)}</p>
    </article>
  `).join("");
}
renderPublicFeatures();

$("navToggle").addEventListener("click", () => {
  const open = $("navLinks").classList.toggle("open");
  $("navToggle").setAttribute("aria-expanded", String(open));
});

function switchAuthTab(tab) {
  document.querySelectorAll("[data-auth-tab]").forEach((b) => b.classList.toggle("active", b.dataset.authTab === tab));
  $("loginForm").classList.toggle("hidden", tab !== "login");
  $("signupForm").classList.toggle("hidden", tab !== "signup");
  $("authMessage").textContent = "";
}

document.querySelectorAll("[data-open-auth]").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchAuthTab(btn.dataset.openAuth);
    authModal.classList.remove("hidden");
  });
});
document.querySelectorAll("[data-auth-tab]").forEach((btn) => btn.addEventListener("click", () => switchAuthTab(btn.dataset.authTab)));
document.querySelectorAll("[data-close-modal]").forEach((btn) => btn.addEventListener("click", () => authModal.classList.add("hidden")));
authModal.addEventListener("click", (e) => { if (e.target === authModal) authModal.classList.add("hidden"); });

$("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const businessName = $("signupBusinessName").value.trim();
  const ownerName = $("signupOwnerName").value.trim();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  const message = $("authMessage");
  message.className = "form-message";
  message.textContent = "Creating account...";

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;
    const businessId = crypto.randomUUID();
    await updateProfile(credential.user, { displayName: ownerName });

    await setDoc(doc(db, "users", uid), {
      displayName: ownerName,
      email,
      businessId,
      role: "owner",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await setDoc(doc(db, "businesses", businessId), {
      name: businessName,
      ownerUid: uid,
      ownerName,
      phone: "",
      website: "",
      enabledModules: defaultEnabledModules,
      plan: "starter",
      subscriptionStatus: "setup_required",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    message.className = "form-message success";
    message.textContent = "Account created.";
    authModal.classList.add("hidden");
  } catch (error) {
    console.error(error);
    message.textContent = friendlyAuthError(error.code);
  }
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = $("authMessage");
  message.className = "form-message";
  message.textContent = "Logging in...";
  try {
    await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPassword").value);
    authModal.classList.add("hidden");
  } catch (error) {
    console.error(error);
    message.textContent = friendlyAuthError(error.code);
  }
});

function friendlyAuthError(code = "") {
  const map = {
    "auth/email-already-in-use": "That email already has an account.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a stronger password with at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Try again later."
  };
  return map[code] || "Something went wrong. Check Firebase setup and try again.";
}

$("logoutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    userProfile = null;
    business = null;
    records = [];
    showPublic();
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (!userSnap.exists()) throw new Error("User profile not found.");
    userProfile = { id: userSnap.id, ...userSnap.data() };

    const businessSnap = await getDoc(doc(db, "businesses", userProfile.businessId));
    if (!businessSnap.exists()) throw new Error("Business record not found.");
    business = { id: businessSnap.id, ...businessSnap.data() };

    await loadRecords();
    showApp();
  } catch (error) {
    console.error(error);
    alert("Your business account could not be loaded. Check Firestore rules and setup.");
    await signOut(auth);
  }
});

function showPublic() {
  publicSite.classList.remove("hidden");
  publicFooter.classList.remove("hidden");
  appShell.classList.add("hidden");
  document.querySelector(".site-header").classList.remove("hidden");
}

function showApp() {
  publicSite.classList.add("hidden");
  publicFooter.classList.add("hidden");
  document.querySelector(".site-header").classList.add("hidden");
  appShell.classList.remove("hidden");
  $("sidebarBusinessName").textContent = business.name;
  $("sidebarUserEmail").textContent = currentUser.email || "";
  $("settingsBusinessName").value = business.name || "";
  $("settingsOwnerName").value = business.ownerName || userProfile.displayName || "";
  $("settingsPhone").value = business.phone || "";
  $("settingsWebsite").value = business.website || "";
  renderModuleOptions();
  renderEverything();
  switchView("dashboard");
}

async function loadRecords() {
  const ref = collection(db, "businesses", userProfile.businessId, "records");
  const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
  records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function enabledModules() {
  return Array.isArray(business.enabledModules) ? business.enabledModules : defaultEnabledModules;
}

function renderEverything() {
  renderStats();
  renderDashboardTools();
  renderModuleSettings();
  renderRecords();
  renderRecentRecords();
}

function renderStats() {
  const now = new Date();
  const soon = new Date();
  soon.setDate(now.getDate() + 7);
  const open = records.filter((r) => !["Complete", "Archived"].includes(r.status)).length;
  const due = records.filter((r) => {
    if (!r.dueDate || r.status === "Complete" || r.status === "Archived") return false;
    const d = new Date(`${r.dueDate}T23:59:59`);
    return d >= now && d <= soon;
  }).length;
  $("statOpen").textContent = open;
  $("statDue").textContent = due;
  $("statTools").textContent = enabledModules().length;
  $("statTotal").textContent = records.length;
}

function renderDashboardTools() {
  const enabled = new Set(enabledModules());
  $("dashboardToolGrid").innerHTML = modules
    .filter(([id]) => enabled.has(id))
    .slice(0, 12)
    .map(([id, name, icon]) => `<button class="tool-card" data-tool-open="${id}"><span>${safeText(icon)}</span><strong>${safeText(name)}</strong></button>`)
    .join("") || '<div class="empty-state">Enable at least one tool.</div>';

  document.querySelectorAll("[data-tool-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchView("records");
      $("recordModuleFilter").value = btn.dataset.toolOpen;
      renderRecords();
    });
  });
}

function renderModuleOptions() {
  const opts = modules.map(([id, name]) => `<option value="${id}">${safeText(name)}</option>`).join("");
  $("recordModule").innerHTML = opts;
  $("recordModuleFilter").innerHTML = `<option value="all">All tools</option>${opts}`;
}

function renderModuleSettings() {
  const enabled = new Set(enabledModules());
  $("moduleSettingsGrid").innerHTML = modules.map(([id, name, icon]) => `
    <div class="module-setting">
      <div><strong>${safeText(icon)} ${safeText(name)}</strong><small>${enabled.has(id) ? "Enabled" : "Disabled"}</small></div>
      <button class="toggle ${enabled.has(id) ? "on" : ""}" data-module-toggle="${id}" aria-label="Toggle ${safeText(name)}"></button>
    </div>
  `).join("");

  document.querySelectorAll("[data-module-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.moduleToggle;
      const next = new Set(enabledModules());
      next.has(id) ? next.delete(id) : next.add(id);
      business.enabledModules = [...next];
      await updateDoc(doc(db, "businesses", business.id), {
        enabledModules: business.enabledModules,
        updatedAt: serverTimestamp()
      });
      renderEverything();
    });
  });
}

function recordHtml(r) {
  const [, moduleName] = moduleById(r.module);
  return `
    <div class="record-item">
      <div class="record-main">
        <strong>${safeText(r.title)}</strong>
        <p>${safeText(r.details || "No details")}</p>
        <div class="record-meta">
          <span class="tag">${safeText(moduleName)}</span>
          <span class="tag">${safeText(r.status || "Open")}</span>
          ${r.dueDate ? `<span class="tag">Due ${safeText(r.dueDate)}</span>` : ""}
        </div>
      </div>
      <div class="record-actions">
        <button class="mini-btn" data-edit-record="${r.id}">Edit</button>
        <button class="mini-btn danger" data-delete-record="${r.id}">Delete</button>
      </div>
    </div>`;
}

function renderRecords() {
  const search = $("recordSearch").value.trim().toLowerCase();
  const filter = $("recordModuleFilter").value;
  const filtered = records.filter((r) => {
    const textMatch = !search || `${r.title || ""} ${r.details || ""} ${r.status || ""}`.toLowerCase().includes(search);
    const moduleMatch = filter === "all" || r.module === filter;
    return textMatch && moduleMatch;
  });
  $("allRecords").innerHTML = filtered.length ? filtered.map(recordHtml).join("") : '<div class="empty-state">No records found.</div>';
  bindRecordActions();
}

function renderRecentRecords() {
  const recent = records.slice(0, 5);
  $("recentRecords").innerHTML = recent.length ? recent.map(recordHtml).join("") : '<div class="empty-state">No records yet.</div>';
  bindRecordActions();
}

function bindRecordActions() {
  document.querySelectorAll("[data-edit-record]").forEach((btn) => {
    btn.onclick = () => openRecordModal(records.find((r) => r.id === btn.dataset.editRecord));
  });
  document.querySelectorAll("[data-delete-record]").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("Delete this record?")) return;
      await deleteDoc(doc(db, "businesses", business.id, "records", btn.dataset.deleteRecord));
      records = records.filter((r) => r.id !== btn.dataset.deleteRecord);
      renderEverything();
    };
  });
}

$("recordSearch").addEventListener("input", renderRecords);
$("recordModuleFilter").addEventListener("change", renderRecords);

function openRecordModal(record = null) {
  $("recordForm").reset();
  $("recordMessage").textContent = "";
  $("recordId").value = record?.id || "";
  $("recordModalTitle").textContent = record ? "Edit Record" : "Add Record";
  if (record) {
    $("recordModule").value = record.module || modules[0][0];
    $("recordTitle").value = record.title || "";
    $("recordStatus").value = record.status || "Open";
    $("recordDueDate").value = record.dueDate || "";
    $("recordDetails").value = record.details || "";
  } else if ($("recordModuleFilter").value !== "all") {
    $("recordModule").value = $("recordModuleFilter").value;
  }
  recordModal.classList.remove("hidden");
}

$("addRecordBtn").addEventListener("click", () => openRecordModal());
$("quickAddBtn").addEventListener("click", () => openRecordModal());
document.querySelectorAll("[data-close-record]").forEach((btn) => btn.addEventListener("click", () => recordModal.classList.add("hidden")));
recordModal.addEventListener("click", (e) => { if (e.target === recordModal) recordModal.classList.add("hidden"); });

$("recordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("recordId").value;
  const payload = {
    module: $("recordModule").value,
    title: $("recordTitle").value.trim(),
    status: $("recordStatus").value,
    dueDate: $("recordDueDate").value || "",
    details: $("recordDetails").value.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid
  };

  try {
    if (id) {
      await updateDoc(doc(db, "businesses", business.id, "records", id), payload);
    } else {
      await addDoc(collection(db, "businesses", business.id, "records"), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
    }
    await loadRecords();
    renderEverything();
    recordModal.classList.add("hidden");
  } catch (error) {
    console.error(error);
    $("recordMessage").textContent = "Could not save record. Check Firestore rules.";
  }
});

$("businessSettingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const updates = {
    name: $("settingsBusinessName").value.trim(),
    ownerName: $("settingsOwnerName").value.trim(),
    phone: $("settingsPhone").value.trim(),
    website: $("settingsWebsite").value.trim(),
    updatedAt: serverTimestamp()
  };
  await updateDoc(doc(db, "businesses", business.id), updates);
  Object.assign(business, updates);
  $("sidebarBusinessName").textContent = business.name;
  alert("Business settings saved.");
});

const views = {
  dashboard: [$("dashboardView"), "OVERVIEW", "Dashboard"],
  tools: [$("toolsView"), "MODULES", "Tools"],
  records: [$("recordsView"), "BUSINESS DATA", "All Records"],
  settings: [$("settingsView"), "ACCOUNT", "Settings"]
};

function switchView(name) {
  currentView = name;
  Object.entries(views).forEach(([key, [el]]) => el.classList.toggle("hidden", key !== name));
  document.querySelectorAll("[data-view]").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === name));
  $("viewEyebrow").textContent = views[name][1];
  $("viewTitle").textContent = views[name][2];
  if (window.innerWidth <= 780) $("sidebar").classList.remove("open");
}

document.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));
document.querySelectorAll("[data-go-tools]").forEach((btn) => btn.addEventListener("click", () => switchView("tools")));
$("sidebarToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
