let token = null;
let userId = null;

const API_BASE = 'https://fleshless-sallie-unideating.ngrok-free.dev';
const twitch = window.Twitch.ext;

// Optionnel, juste pour debug
twitch.onContext((context) => {
  console.log('Context:', context);
});

function enableButtons() {
  document.querySelectorAll('button')
    .forEach(b => b.disabled = false);
}

// Twitch fournit le JWT ici
twitch.onAuthorized((auth) => {
  token = auth.token;
  userId = auth.userId;

  console.log('Authorized:', auth);

  // On active les boutons SEULEMENT ici
  enableButtons();
});

function sendAction(action) {
  if (!token) {
    console.warn('Token pas encore prêt');
    return;
  }

  fetch(`${API_BASE}/extension/action`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action })
  })
  .then(res => res.json())
  .then(() => {
    showToast(action);
  })
  .catch(err => console.error('Erreur action:', err));
}

// Bind des boutons une fois le DOM prêt
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('attack').onclick = () => sendAction('attack');
  document.getElementById('heal').onclick   = () => sendAction('heal');
  document.getElementById('bomb').onclick   = () => sendAction('bomb');
});


function showToast(message = 'Action envoyée ✔') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  let messageFr = "";

  switch(message) {
    case "attack":
      messageFr = "Attaque validée";
      break;
    case "heal":
      messageFr = "Soin validé";
      break;
    case "bomb":
      messageFr = "Bombe validée";
      break;
  }

  toast.textContent = messageFr;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 1500);
}
