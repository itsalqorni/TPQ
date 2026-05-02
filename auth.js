const AUTH_USERS_KEY = "tpq_auth_users";
const AUTH_SESSION_KEY = "tpq_auth_session";

const DEFAULT_ADMIN = {
  id: "admin-1",
  name: "Ustadz Hanafi",
  username: "admintpq",
  password: "admintpq123",
  role: "admin",
  studentName: ""
};

function loadUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY));
    if (Array.isArray(users) && users.length) return normalizeUsers(users);
  } catch {
    // Use default below when storage is unreadable.
  }
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify([DEFAULT_ADMIN]));
  return [DEFAULT_ADMIN];
}

async function loadUsersAsync() {
  const users = await Cloud.loadUsers([DEFAULT_ADMIN]);
  return normalizeUsers(users);
}

function normalizeUsers(users) {
  const normalized = users.map((user) => ({
    ...user,
    id: user.id || `user-${Date.now()}`
  }));

  if (!normalized.some((user) => user.username === DEFAULT_ADMIN.username)) normalized.unshift(DEFAULT_ADMIN);
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(normalized));
  return normalized;
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

async function saveUsersAsync(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  await Cloud.saveUsers(users);
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));
  } catch {
    return null;
  }
}

function setSession(user) {
  const studentName = getStudentNameForUser(user);
  localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      studentName,
      authorizedStudentName: user.role === "santri" ? studentName : "",
      authorizedStudents: user.role === "santri" && studentName ? [studentName] : []
    })
  );
}

function setAuthorizedStudent(studentName) {
  const session = getSession();
  if (!session) return;
  const authorizedStudents = session.authorizedStudents || [];
  const nextStudents = authorizedStudents.includes(studentName)
    ? authorizedStudents
    : [...authorizedStudents, studentName];

  localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      ...session,
      authorizedStudentName: studentName,
      authorizedStudents: nextStudents
    })
  );
}

function setActiveStudent(studentName) {
  const session = getSession();
  if (!session) return;
  localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      ...session,
      authorizedStudentName: studentName
    })
  );
}

function getStudentNameForUser(user) {
  if (!user || user.role === "admin") return "";
  if (user.role === "santri") return user.studentName || user.name;
  return user.studentName || "";
}

function logout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  window.location.href = "./login.html";
}

function requireLogin() {
  const session = getSession();
  if (!session) {
    window.location.href = "./login.html";
    throw new Error("Login required");
  }
  return session;
}

function requireRole(role) {
  const session = requireLogin();
  const roles = Array.isArray(role) ? role : [role];
  if (session && !roles.includes(session.role)) {
    window.location.href =
      session.role === "admin"
        ? "./index.html"
        : session.role === "ustadz"
          ? "./ustadz.html"
          : "./wali.html";
    throw new Error("Role not allowed");
  }
  return session;
}

function roleLabel(role) {
  return {
    admin: "Admin",
    ustadz: "Ustadz/Ustadzah",
    wali: "Wali Murid",
    santri: "Santri"
  }[role] || role;
}

window.Auth = {
  loadUsers,
  loadUsersAsync,
  saveUsers,
  saveUsersAsync,
  getSession,
  setSession,
  setAuthorizedStudent,
  setActiveStudent,
  logout,
  requireLogin,
  requireRole,
  roleLabel,
  getStudentNameForUser,
  usersKey: AUTH_USERS_KEY
};
