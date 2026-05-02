const STORAGE_KEY = "tpq_hafalan_deposits";

const session = Auth.requireRole("ustadz");
let deposits = [];

const statusClass = {
  Lancar: "ok",
  Cukup: "good",
  Mengulang: "repeat"
};

const depositRows = document.querySelector("#depositRows");
const nextList = document.querySelector("#nextList");
const searchInput = document.querySelector("#searchInput");
const filterButtons = document.querySelectorAll(".segmented button");
const statTotal = document.querySelector("#statTotal");
const statStatus = document.querySelector("#statStatus");
const statAverage = document.querySelector("#statAverage");
const statAverageNote = document.querySelector("#statAverageNote");
const statWa = document.querySelector("#statWa");
const statWaNote = document.querySelector("#statWaNote");
const downloadReport = document.querySelector("#downloadReport");
const modalBackdrop = document.querySelector("#modalBackdrop");
const openModal = document.querySelector("#openModal");
const closeModal = document.querySelector("#closeModal");
const depositForm = document.querySelector("#depositForm");
const sendWa = document.querySelector("#sendWa");
const logoutBtn = document.querySelector("#logoutBtn");
const accountList = document.querySelector("#accountList");
const studentUserList = document.querySelector("#studentUserList");
const studentPercentList = document.querySelector("#studentPercentList");
const studentSelect = document.querySelector("#studentSelect");
const saveDepositBtn = document.querySelector("#saveDepositBtn");
const studentAccessForm = document.querySelector("#studentAccessForm");
const studentAccessMessage = document.querySelector("#studentAccessMessage");
const activeStudentBox = document.querySelector("#activeStudentBox");

let activeFilter = "today";
let selectedDepositKey = "";
let selectedStudentKey = "";
let activeStudent = null;
const today = new Date("2026-05-01T12:00:00");

async function loadDeposits() {
  return Cloud.loadDeposits();
}

async function saveDeposits() {
  await Cloud.saveDeposits(deposits);
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

function getPeriodBounds() {
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const weekStart = new Date(startOfToday);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date("2026-05-01T00:00:00");
  return { weekStart, monthStart };
}

function countPresence(rows, fromDate) {
  return new Set(
    rows
      .filter((item) => new Date(`${item.date}T12:00:00`) >= fromDate)
      .map((item) => item.date)
  ).size;
}

function setActiveStudent(student) {
  activeStudent = student;
  selectedDepositKey = student ? student.name : "";
  openModal.disabled = !student;
  activeStudentBox.hidden = !student;
  activeStudentBox.innerHTML = student
    ? `
      <article class="account-item account-static">
        <span class="avatar">${getInitials(student.name)}</span>
        <div>
          <strong>${student.name}</strong>
          <p>Username: ${student.username}</p>
        </div>
      </article>
    `
    : "";
}

function getFilteredDeposits() {
  const keyword = searchInput.value.trim().toLowerCase();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const weekStart = new Date(startOfToday);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date("2026-05-01T00:00:00");

  return deposits.filter((item) => {
    if (activeStudent && item.student !== activeStudent.name) return false;
    const date = new Date(`${item.date}T12:00:00`);
    const inRange =
      activeFilter === "today"
        ? item.date === "2026-05-01"
        : activeFilter === "week"
          ? date >= weekStart && date <= today
          : date >= monthStart && date <= today;
    const text = `${item.student} ${item.surah} ${item.listener} ${item.status} ${item.note}`.toLowerCase();
    return inRange && (!keyword || text.includes(keyword));
  });
}

function renderRows(list, registeredStudents = []) {
  if (!activeStudent) {
    depositRows.innerHTML = `<tr><td class="empty-row">Login akun santri dulu untuk melihat detail dan menambah setoran.</td></tr>`;
    return;
  }

  const keyword = searchInput.value.trim().toLowerCase();
  const studentNames = [activeStudent.name]
    .filter((name) => name && (!keyword || name.toLowerCase().includes(keyword) || list.some((item) => item.student === name)))
    .filter((name, index, array) => array.indexOf(name) === index);

  if (!studentNames.length) {
    depositRows.innerHTML = `<tr><td class="empty-row">Belum ada santri yang cocok.</td></tr>`;
    return;
  }

  const grouped = list.reduce((map, item) => {
    if (!map[item.student]) map[item.student] = [];
    map[item.student].push(item);
    return map;
  }, {});

  depositRows.innerHTML = studentNames
    .map((student) => {
      const rows = grouped[student] || [];
      const account = registeredStudents.find((item) => item.name === student) || activeStudent;
      const { weekStart, monthStart } = getPeriodBounds();
      const weekPresence = countPresence(deposits.filter((item) => item.student === student), weekStart);
      const monthPresence = countPresence(deposits.filter((item) => item.student === student), monthStart);
      const key = student;
      const latest = rows[0];
      const isOpen = selectedDepositKey === key;
      return `
      <tr>
        <td>
          <button class="name-toggle" type="button" data-deposit-key="${key}" aria-expanded="${isOpen}">
            <span class="avatar">${getInitials(student)}</span>
            <span>${student}</span>
          </button>
          <div class="detail-panel${isOpen ? " open" : ""}">
            ${rows.length
              ? `
                <dl class="detail-grid">
                  <div><dt>Akun Santri</dt><dd>${account.username}</dd></div>
                  <div><dt>Total Setoran</dt><dd>${rows.length} setoran</dd></div>
                  <div><dt>Presensi Pekan</dt><dd>${weekPresence} hari</dd></div>
                  <div><dt>Presensi Bulan</dt><dd>${monthPresence} hari</dd></div>
                  <div><dt>Terakhir</dt><dd>${formatDate(latest.date)}, ${latest.start}-${latest.end}</dd></div>
                  <div><dt>Materi Terakhir</dt><dd>${latest.surah}, ayat ${latest.from}-${latest.to}</dd></div>
                  <div><dt>Status</dt><dd><span class="badge ${statusClass[latest.status]}">${latest.status} ${latest.grade}</span></dd></div>
                  <div class="full-detail">
                    <dt>Riwayat Setoran</dt>
                    <dd class="deposit-history">
                      ${rows
                        .map((item) => `
                          <article>
                            <strong>${item.surah} ayat ${item.from}-${item.to}</strong>
                            <span>${formatDate(item.date)} - ${item.listener} - ${item.status} ${item.grade}</span>
                            <p>${item.note}</p>
                          </article>
                        `)
                        .join("")}
                    </dd>
                  </div>
                </dl>
              `
              : `
                <dl class="detail-grid">
                  <div><dt>Akun Santri</dt><dd>${account.username}</dd></div>
                  <div><dt>Presensi Pekan</dt><dd>${weekPresence} hari</dd></div>
                  <div><dt>Presensi Bulan</dt><dd>${monthPresence} hari</dd></div>
                  <div><dt>Setoran</dt><dd>Belum ada pada filter ini.</dd></div>
                </dl>
              `}
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderStats(list) {
  const total = list.length;
  const lancar = list.filter((item) => item.status === "Lancar").length;
  const cukup = list.filter((item) => item.status === "Cukup").length;
  const ulang = list.filter((item) => item.status === "Mengulang").length;
  const gradeScore = { A: 100, B: 82, C: 68, D: 50 };
  const average = total ? Math.round(list.reduce((sum, item) => sum + gradeScore[item.grade], 0) / total) : 0;

  statTotal.textContent = total;
  statStatus.textContent = `${lancar} lancar, ${cukup} cukup, ${ulang} mengulang`;
  statAverage.textContent = `${average}%`;
  statAverageNote.textContent = total ? "Dari nilai setoran" : "Belum ada data";
  statWa.textContent = activeStudent ? countPresence(deposits.filter((item) => item.student === activeStudent.name), getPeriodBounds().monthStart) : 0;
  statWaNote.textContent = activeStudent ? "Hari setoran bulan ini" : "Login santri dulu";
}

function renderNext(list) {
  if (!list.length) {
    nextList.innerHTML = `<article class="next-item"><span class="next-step">0</span><div><strong>Belum ada saran</strong><p>Ubah filter atau kata pencarian.</p></div></article>`;
    return;
  }

  nextList.innerHTML = list
    .slice(0, 2)
    .map((item) => {
      const nextFrom = item.to + 1;
      return `
        <article class="next-item">
          <span class="next-step">${nextFrom}</span>
          <div>
            <strong>${item.student}</strong>
            <p>${item.surah} ayat ${nextFrom}-${nextFrom + 4}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderStudentPercentages(list) {
  const gradeScore = { A: 100, B: 82, C: 68, D: 50 };

  if (activeFilter === "today") {
    studentPercentList.innerHTML = `
      <article class="percent-empty">
        Pilih filter Pekan atau Bulan untuk melihat persentase tiap santri.
      </article>
    `;
    return;
  }

  if (!list.length) {
    studentPercentList.innerHTML = `<article class="percent-empty">Belum ada data pada filter ini.</article>`;
    return;
  }

  const grouped = list.reduce((map, item) => {
    if (!map[item.student]) map[item.student] = [];
    map[item.student].push(item);
    return map;
  }, {});

  studentPercentList.innerHTML = Object.entries(grouped)
    .map(([student, rows]) => {
      const percent = Math.round(rows.reduce((sum, item) => sum + gradeScore[item.grade], 0) / rows.length);
      return `
        <article class="percent-item">
          <div>
            <strong>${student}</strong>
            <span>${rows.length} setoran</span>
          </div>
          <b>${percent}%</b>
          <div class="mini-progress"><span style="width:${percent}%"></span></div>
        </article>
      `;
    })
    .join("");
}

function getFilterLabel() {
  return {
    today: "Hari ini",
    week: "Pekan ini",
    month: "Bulan ini"
  }[activeFilter] || "Data terpilih";
}

function cleanPdfText(value) {
  return String(value ?? "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, (char) => {
      const replacements = {
        "–": "-",
        "—": "-",
        "’": "'",
        "“": "\"",
        "”": "\"",
        "•": "-"
      };
      return replacements[char] || "";
    });
}

function escapePdfText(value) {
  return cleanPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfText(value, maxLength) {
  const words = cleanPdfText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function makePdfObject(id, body) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

function createReportPdf(rows) {
  const width = 595;
  const height = 842;
  const margin = 42;
  const lineHeight = 15;
  const rowGap = 8;
  const bottomLimit = 58;
  const columns = [
    { title: "Tanggal", x: 42, width: 78, max: 13 },
    { title: "Santri", x: 126, width: 96, max: 17 },
    { title: "Materi", x: 228, width: 92, max: 16 },
    { title: "Jam", x: 326, width: 62, max: 10 },
    { title: "Nilai", x: 394, width: 42, max: 6 },
    { title: "Status", x: 442, width: 72, max: 11 }
  ];
  const gradeScore = { A: 100, B: 82, C: 68, D: 50 };
  const total = rows.length;
  const lancar = rows.filter((item) => item.status === "Lancar").length;
  const cukup = rows.filter((item) => item.status === "Cukup").length;
  const ulang = rows.filter((item) => item.status === "Mengulang").length;
  const average = total ? Math.round(rows.reduce((sum, item) => sum + gradeScore[item.grade], 0) / total) : 0;
  const pages = [];
  let commands = [];
  let y = height - margin;

  function text(x, textY, value, size = 10, style = "F1", color = "0.09 0.20 0.17") {
    commands.push(`${color} rg BT /${style} ${size} Tf ${x} ${textY} Td (${escapePdfText(value)}) Tj ET`);
  }

  function rect(x, rectY, rectWidth, rectHeight, color = "0.95 0.98 0.96") {
    commands.push(`${color} rg ${x} ${rectY} ${rectWidth} ${rectHeight} re f`);
  }

  function line(x1, y1, x2, y2, color = "0.86 0.91 0.88") {
    commands.push(`${color} RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  function finishPage() {
    text(width - 96, 26, `Halaman ${pages.length + 1}`, 8);
    pages.push(commands.join("\n"));
    commands = [];
    y = height - margin;
  }

  function addHeader() {
    rect(0, height - 104, width, 104, "0.06 0.44 0.36");
    text(margin, height - 52, "Rekap Hafalan TPQ", 21, "F2", "1 1 1");
    text(margin, height - 74, `${getFilterLabel()} - ${formatDate("2026-05-01")}`, 10, "F1", "1 1 1");
    text(margin, height - 91, `Dicetak oleh Admin TPQ`, 9, "F1", "0.88 1 0.95");
    y = height - 132;

    const statTop = y - 48;
    [
      ["Total Setoran", total],
      ["Rata-rata Nilai", `${average}%`],
      ["Status", `${lancar} lancar, ${cukup} cukup, ${ulang} ulang`]
    ].forEach(([label, value], index) => {
      const x = margin + index * 170;
      rect(x, statTop, 158, 44, "0.97 0.99 0.98");
      text(x + 10, statTop + 27, label, 8);
      text(x + 10, statTop + 10, value, 13, "F2");
    });

    y = statTop - 26;
    rect(margin, y - 21, width - margin * 2, 24, "0.93 0.97 0.95");
    columns.forEach((column) => text(column.x, y - 13, column.title, 8, "F2"));
    y -= 33;
  }

  function ensureSpace(requiredHeight) {
    if (y - requiredHeight < bottomLimit) {
      finishPage();
      addHeader();
    }
  }

  addHeader();

  if (!rows.length) {
    text(margin, y, "Belum ada data setoran pada filter ini.", 11);
  }

  rows.forEach((item, index) => {
    const values = [
      formatDate(item.date),
      item.student,
      `${item.surah} ${item.from}-${item.to}`,
      `${item.start}-${item.end}`,
      item.grade,
      item.status
    ];
    const wrapped = values.map((value, valueIndex) => wrapPdfText(value, columns[valueIndex].max));
    const rowHeight = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + 8;
    ensureSpace(rowHeight + rowGap);

    if (index % 2 === 0) rect(margin, y - rowHeight + 7, width - margin * 2, rowHeight, "0.99 0.99 0.98");
    columns.forEach((column, columnIndex) => {
      wrapped[columnIndex].forEach((lineText, lineIndex) => {
        text(column.x, y - lineIndex * lineHeight, lineText, 8.5);
      });
    });
    line(margin, y - rowHeight + 3, width - margin, y - rowHeight + 3);
    y -= rowHeight + rowGap;
  });

  finishPage();

  const objects = [
    makePdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    makePdfObject(2, `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`)
  ];

  pages.forEach((content, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects.push(makePdfObject(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 100 0 R /F2 101 0 R >> >> /Contents ${contentId} 0 R >>`));
    objects.push(makePdfObject(contentId, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  });

  objects.push(makePdfObject(100, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  objects.push(makePdfObject(101, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

async function refreshDashboard() {
  const registeredStudents = await populateStudentSelect();
  const list = getFilteredDeposits();
  renderRows(list, registeredStudents);
  renderStats(list);
  renderNext(list);
  renderStudentPercentages(list);
  await renderAccountData();
}

async function getRegisteredStudents() {
  const users = await Auth.loadUsersAsync();
  const students = users
    .filter((user) => user.role === "santri")
    .map((user) => ({
      name: Auth.getStudentNameForUser(user),
      username: user.username
    }))
    .filter((student) => student.name);

  return students.filter(
    (student, index, array) => array.findIndex((item) => item.name === student.name) === index
  );
}

async function populateStudentSelect() {
  if (!activeStudent) {
    studentSelect.innerHTML = `<option value="">Login akun santri dulu</option>`;
    studentSelect.disabled = true;
    saveDepositBtn.disabled = true;
    return [];
  }

  studentSelect.disabled = false;
  saveDepositBtn.disabled = false;
  studentSelect.innerHTML = `<option value="${activeStudent.name}">${activeStudent.name} (${activeStudent.username})</option>`;
  studentSelect.value = activeStudent.name;
  return [activeStudent];
}

async function renderAccountData() {
  accountList.innerHTML = activeStudent
    ? `
      <article class="account-item account-static">
        <span class="avatar">${getInitials(activeStudent.name)}</span>
        <div>
          <strong>${activeStudent.name}</strong>
          <p>${activeStudent.username} - Santri aktif</p>
        </div>
      </article>
    `
    : `<article class="account-empty">Login akun santri untuk melihat detail akun.</article>`;

  studentUserList.innerHTML = accountList.innerHTML;
}

async function openEntryModal() {
  if (!activeStudent) {
    alert("Login akun santri dulu sebelum menambah setoran.");
    return;
  }
  await populateStudentSelect();
  modalBackdrop.hidden = false;
  depositForm.elements.student.focus();
}

function closeEntryModal() {
  modalBackdrop.hidden = true;
}

openModal.addEventListener("click", openEntryModal);
closeModal.addEventListener("click", closeEntryModal);
logoutBtn.addEventListener("click", Auth.logout);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeEntryModal();
});

sendWa.addEventListener("click", () => {
  const data = Object.fromEntries(new FormData(depositForm));
  if (!data.student) {
    alert("Buat akun santri dulu di halaman Register.");
    return;
  }
  alert(`Preview WA:\nAnanda ${data.student} setor ${data.surah} ayat ${data.from}-${data.to} pada ${formatDate(data.date)} jam ${data.start}. Disimak oleh ${data.listener}.`);
});

depositForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(depositForm));
  const registeredStudents = (await getRegisteredStudents()).map((student) => student.name);
  if (!registeredStudents.includes(data.student)) {
    alert("Nama santri belum punya akun. Buat akun santri dulu di halaman Register.");
    return;
  }

  deposits.unshift({
    id: `deposit-${Date.now()}`,
    student: data.student,
    initials: getInitials(data.student),
    surah: data.surah,
    date: data.date,
    from: Number(data.from),
    to: Number(data.to),
    start: data.start,
    end: data.end,
    listener: data.listener,
    grade: data.grade,
    status: data.status,
    note: data.note
  });
  await saveDeposits();

  activeFilter = data.date === "2026-05-01" ? "today" : "month";
  filterButtons.forEach((button) => button.classList.toggle("selected", button.dataset.filter === activeFilter));
  await refreshDashboard();
  closeEntryModal();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("selected", item === button));
    refreshDashboard();
  });
});

searchInput.addEventListener("input", refreshDashboard);

depositRows.addEventListener("click", (event) => {
  const button = event.target.closest("[data-deposit-key]");
  if (!button) return;
  selectedDepositKey = selectedDepositKey === button.dataset.depositKey ? "" : button.dataset.depositKey;
  refreshDashboard();
});

studentUserList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-student-key]");
  if (!button) return;
  selectedStudentKey = selectedStudentKey === button.dataset.studentKey ? "" : button.dataset.studentKey;
  refreshDashboard();
});

studentAccessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(studentAccessForm));
  const users = await Auth.loadUsersAsync();
  const student = users.find(
    (user) =>
      user.role === "santri" &&
      user.username === data.username.trim() &&
      user.password === data.password
  );

  if (!student) {
    studentAccessMessage.textContent = "Akun santri belum cocok.";
    return;
  }

  setActiveStudent({
    name: Auth.getStudentNameForUser(student),
    username: student.username
  });
  studentAccessForm.reset();
  studentAccessMessage.textContent = "";
  await refreshDashboard();
});

window.addEventListener("storage", async (event) => {
  if (event.key === STORAGE_KEY) deposits = await loadDeposits();
  await refreshDashboard();
});

downloadReport.addEventListener("click", () => {
  const rows = getFilteredDeposits();
  const pdf = createReportPdf(rows);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(pdf);
  link.download = `rekap-hafalan-${activeFilter}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
});

async function initDashboard() {
  deposits = await loadDeposits();
  setActiveStudent(null);
  await refreshDashboard();
  Cloud.watchDeposits(async (rows) => {
    deposits = rows;
    await refreshDashboard();
  });
  Cloud.watchUsers(refreshDashboard);
}

initDashboard();
