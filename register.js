const session = Auth.requireRole(["admin", "ustadz"]);
const registerForm = document.querySelector("#registerForm");
const registerMessage = document.querySelector("#registerMessage");
const logoutBtn = document.querySelector("#logoutBtn");

logoutBtn.addEventListener("click", Auth.logout);

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(registerForm));
  const users = await Auth.loadUsersAsync();
  const username = data.username.trim();

  if (users.some((user) => user.username === username)) {
    registerMessage.textContent = "Username sudah dipakai. Pilih username lain.";
    return;
  }

  if (session.role === "ustadz" && !["santri", "wali"].includes(data.role)) {
    registerMessage.textContent = "Ustadz/Ustadzah hanya bisa menambah akun santri dan wali murid.";
    return;
  }

  const studentName = data.role === "santri" ? data.name.trim() : data.studentName.trim();
  if ((data.role === "santri" || data.role === "wali") && !studentName) {
    registerMessage.textContent = "Nama santri terkait wajib diisi.";
    return;
  }

  users.push({
    id: `user-${Date.now()}`,
    name: data.name.trim(),
    username,
    password: data.password,
    role: data.role,
    studentName
  });

  await Auth.saveUsersAsync(users);
  registerForm.reset();
  applyRoleAccess();
  registerMessage.textContent = "Akun berhasil disimpan.";
});

function applyRoleAccess() {
  if (session.role !== "ustadz") return;
  const adminLink = document.querySelector('a[href="./index.html"]');
  if (adminLink) adminLink.hidden = true;
  registerForm.elements.role.querySelectorAll("option").forEach((option) => {
    option.hidden = !["santri", "wali"].includes(option.value);
  });
  if (!["santri", "wali"].includes(registerForm.elements.role.value)) {
    registerForm.elements.role.value = "santri";
  }
}

applyRoleAccess();
