const STORAGE_KEY = "tpq_hafalan_deposits";

const session = Auth.requireLogin();
const childAuthPanel = document.querySelector("#childAuthPanel");
const childAuthForm = document.querySelector("#childAuthForm");
const childAuthMessage = document.querySelector("#childAuthMessage");
const openChildAuth = document.querySelector("#openChildAuth");
const cancelChildAuth = document.querySelector("#cancelChildAuth");
const childList = document.querySelector("#childList");
const parentMainCard = document.querySelector("#parentMainCard");
const parentHistoryPanel = document.querySelector("#parentHistoryPanel");
const parentInitials = document.querySelector("#parentInitials");
const parentName = document.querySelector("#parentName");
const parentSubtitle = document.querySelector("#parentSubtitle");
const parentTotal = document.querySelector("#parentTotal");
const parentProgressBar = document.querySelector("#parentProgressBar");
const parentLastMaterial = document.querySelector("#parentLastMaterial");
const parentLastTime = document.querySelector("#parentLastTime");
const parentLastStatus = document.querySelector("#parentLastStatus");
const parentLastListener = document.querySelector("#parentLastListener");
const parentHistory = document.querySelector("#parentHistory");
const logoutBtn = document.querySelector("#logoutBtn");

async function loadDeposits() {
  return Cloud.loadDeposits();
}

function formatDate(dateText) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(`${dateText}T12:00:00`));
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getCurrentSession() {
  return Auth.getSession() || session;
}

function getAuthorizedStudents() {
  const currentSession = getCurrentSession();
  if (currentSession.role === "santri") return currentSession.studentName ? [currentSession.studentName] : [];
  return currentSession.authorizedStudents || [];
}

function getActiveStudent() {
  const currentSession = getCurrentSession();
  if (currentSession.role === "santri") return currentSession.studentName;
  const students = getAuthorizedStudents();
  return currentSession.authorizedStudentName || students[0] || "";
}

function renderChildAccess() {
  const currentSession = getCurrentSession();
  const students = getAuthorizedStudents();
  const activeStudent = getActiveStudent();
  const isSantri = currentSession.role === "santri";

  childAuthPanel.hidden = isSantri;
  openChildAuth.hidden = isSantri;

  if (isSantri) return;

  childList.innerHTML = students.length
    ? students
        .map((student) => `
          <button class="child-chip${student === activeStudent ? " active" : ""}" type="button" data-child-name="${student}">
            <span class="avatar">${getInitials(student)}</span>
            <span>${student}</span>
          </button>
        `)
        .join("")
    : `<article class="account-empty">Belum ada akun anak yang terhubung. Tekan Login Akun Anak dulu.</article>`;
}

function setParentContentVisible(isVisible) {
  parentMainCard.hidden = !isVisible;
  parentHistoryPanel.hidden = !isVisible;
}

function renderEmpty(studentName) {
  const displayName = studentName || "Belum ada data";
  parentInitials.textContent = displayName ? getInitials(displayName) : "-";
  parentName.textContent = displayName;
  parentSubtitle.textContent = "Belum ada setoran untuk akun ini";
  parentTotal.textContent = "0";
  parentProgressBar.style.width = "0%";
  parentLastMaterial.textContent = "Belum ada";
  parentLastTime.textContent = "Menunggu input admin";
  parentLastStatus.textContent = "-";
  parentLastListener.textContent = "-";
  parentHistory.innerHTML = `
    <article class="feed-item">
      <span class="feed-dot"></span>
      <div>
        <strong>Belum ada riwayat setoran</strong>
        <p>Setelah admin menambahkan setoran untuk ${displayName}, riwayat akan tampil otomatis di sini.</p>
      </div>
    </article>
  `;
}

async function renderParentPage() {
  renderChildAccess();

  const activeStudent = getActiveStudent();
  if (!activeStudent) {
    setParentContentVisible(false);
    return;
  }

  setParentContentVisible(true);
  const deposits = await loadDeposits();
  const visibleRows = deposits.filter((item) => item.student === activeStudent);

  if (!visibleRows.length) {
    renderEmpty(activeStudent);
    return;
  }

  const latest = visibleRows[0];
  const progress = Math.min(100, visibleRows.reduce((sum, item) => sum + (item.to - item.from + 1), 0) * 3);

  parentInitials.textContent = latest.initials || getInitials(latest.student);
  parentName.textContent = latest.student;
  parentSubtitle.textContent = "Perkembangan terbaru dari admin TPQ";
  parentTotal.textContent = visibleRows.length;
  parentProgressBar.style.width = `${progress}%`;
  parentLastMaterial.textContent = `${latest.surah.replace("QS. ", "")} ${latest.from}-${latest.to}`;
  parentLastTime.textContent = `${formatDate(latest.date)}, ${latest.start}`;
  parentLastStatus.textContent = `${latest.status} ${latest.grade}`;
  parentLastListener.textContent = `Disimak ${latest.listener}`;

  parentHistory.innerHTML = visibleRows
    .map((item) => `
      <article class="feed-item">
        <span class="feed-dot"></span>
        <div>
          <strong>${item.surah} ayat ${item.from}-${item.to}</strong>
          <p>${formatDate(item.date)} pukul ${item.start}, disimak ${item.listener}. Status ${item.status} ${item.grade}. Catatan: ${item.note}</p>
        </div>
      </article>
    `)
    .join("");
}

openChildAuth.addEventListener("click", () => {
  childAuthForm.hidden = false;
  childAuthMessage.textContent = "";
  childAuthForm.elements.username.focus();
});

cancelChildAuth.addEventListener("click", () => {
  childAuthForm.hidden = true;
  childAuthForm.reset();
  childAuthMessage.textContent = "";
});

childList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-child-name]");
  if (!button) return;
  Auth.setActiveStudent(button.dataset.childName);
  await renderParentPage();
});

childAuthForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(childAuthForm));
  const users = await Auth.loadUsersAsync();
  const student = users.find(
    (user) =>
      user.role === "santri" &&
      user.username === data.username.trim() &&
      user.password === data.password
  );

  if (!student) {
    childAuthMessage.textContent = "Akun santri belum cocok.";
    return;
  }

  Auth.setAuthorizedStudent(Auth.getStudentNameForUser(student));
  childAuthForm.hidden = true;
  childAuthForm.reset();
  childAuthMessage.textContent = "";
  await renderParentPage();
});

window.addEventListener("storage", async (event) => {
  if (event.key === STORAGE_KEY) await renderParentPage();
});

logoutBtn.addEventListener("click", Auth.logout);

renderParentPage();
Cloud.watchDeposits(renderParentPage);
Cloud.watchUsers(renderParentPage);
