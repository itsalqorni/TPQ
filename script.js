const session = Auth.requireRole("admin");
const logoutBtn = document.querySelector("#logoutBtn");
const accountList = document.querySelector("#accountList");
const accountSearch = document.querySelector("#accountSearch");
const statUsers = document.querySelector("#statUsers");
const statStudents = document.querySelector("#statStudents");
const statParents = document.querySelector("#statParents");

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

async function renderAccounts() {
  const users = await Auth.loadUsersAsync();
  const keyword = accountSearch.value.trim().toLowerCase();
  const visibleUsers = users.filter((user) => {
    const text = `${user.name} ${user.username} ${Auth.roleLabel(user.role)} ${user.studentName || ""}`.toLowerCase();
    return !keyword || text.includes(keyword);
  });

  statUsers.textContent = users.length;
  statStudents.textContent = users.filter((user) => user.role === "santri").length;
  statParents.textContent = users.filter((user) => user.role === "wali").length;

  accountList.innerHTML = visibleUsers.length
    ? visibleUsers
        .map((user) => `
          <article class="account-item account-static">
            <span class="avatar">${getInitials(user.name)}</span>
            <div>
              <strong>${user.name}</strong>
              <p>${user.username} - ${Auth.roleLabel(user.role)}${user.studentName ? ` - Santri: ${user.studentName}` : ""}</p>
            </div>
          </article>
        `)
        .join("")
    : `<article class="account-empty">Akun tidak ditemukan.</article>`;
}

logoutBtn.addEventListener("click", Auth.logout);
accountSearch.addEventListener("input", renderAccounts);

renderAccounts();
Cloud.watchUsers(renderAccounts);
