const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");

Auth.loadUsersAsync();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm));
  const users = await Auth.loadUsersAsync();
  const user = users.find(
    (item) => item.username === data.username.trim() && item.password === data.password
  );

  if (!user) {
    loginMessage.textContent = "Username atau password belum cocok.";
    return;
  }

  Auth.setSession(user);
  window.location.href =
    user.role === "admin"
      ? "./index.html"
      : user.role === "ustadz"
        ? "./ustadz.html"
        : "./wali.html";
});
