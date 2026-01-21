// frontend/overlay.js

let twitch = window.Twitch ? window.Twitch.ext : null;

function sendAction(action) {
  if (!twitch) return;

  twitch.onAuthorized((auth) => {
    fetch("http://localhost:3000/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": auth.token
      },
      body: JSON.stringify({
        userId: auth.userId,
        action
      })
    });
  });
}

document.querySelectorAll(".action-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    sendAction(action);
  });
});
