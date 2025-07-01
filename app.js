import { showLoginForm, showProfile, showError } from "./ui.js";
import { fetchProfileData } from "./graphql.js";
import { login, initializeAuth, logout } from "./auth.js";


async function handleLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  showError("");

  if (!username || !password) {
    showError("Please enter both username and password");
    return;
  }

  try {
    await login(username, password);
    const userData = await fetchProfileData();
    showProfile(userData);
  } catch (err) {
    showError(err.message);
  }
}

function initApp() {
  if (initializeAuth()) {
    fetchProfileData()
      .then((userData) => {
        showProfile(userData);
      })
      .catch((err) => {
        console.error("Failed to fetch profile data:", err);
        logout();
      });
  } else {
    showLoginForm();
  }
}

window.handleLogin = handleLogin;
window.addEventListener("load", initApp);
