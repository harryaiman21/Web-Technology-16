import { login } from "../auth.js";

const form = document.getElementById("loginForm");
const errorEl = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    await login(username, password);
    window.location.href = "viewer.html";
  } catch (err) {
    errorEl.textContent = err.message;
  }
});
