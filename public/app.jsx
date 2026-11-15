const requestEl = document.getElementById("request");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

function formatBody(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

async function callApi(method, path) {
  requestEl.textContent = `${method} ${path}`;
  statusEl.textContent = "Loading...";
  outputEl.textContent = "";

  try {
    const response = await fetch(path, { method });
    const text = await response.text();
    statusEl.textContent = `${response.status} ${response.statusText}`;
    outputEl.textContent = formatBody(text);
  } catch (error) {
    statusEl.textContent = "Request failed";
    outputEl.textContent = error.message;
  }
}

document.querySelectorAll("button[data-path]").forEach((button) => {
  button.addEventListener("click", () => {
    callApi(button.dataset.method, button.dataset.path);
  });
});
