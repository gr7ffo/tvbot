let allEntries = [];
let tomSelect = null;

function fetchTVData() {
  fetch('https://api.tvmaze.com/schedule?country=DE')
    .then(res => res.json())
    .then(data => {
      if (!data || data.length === 0) {
        console.error("Keine Daten von der API erhalten.");
        return;
      }
      
      allEntries = data;
      const senders = [...new Set(data.map(e => e.show.network?.name).filter(Boolean))].sort();
      
      if (senders.length === 0) {
        console.error("Keine Senderdaten verfügbar.");
        return;
      }
      
      initTomSelect(senders);
    })
    .catch(err => console.error("Fehler beim Abrufen der Daten:", err));
}

function initTomSelect(senders) {
  const senderSelect = document.getElementById('senderSelect');
  senderSelect.innerHTML = senders.map(s => `<option value="${s}">${s}</option>`).join('');

  if (tomSelect) tomSelect.destroy();
  tomSelect = new TomSelect('#senderSelect', {
    plugins: ['remove_button'],
    persist: false,
    create: false,
    maxOptions: 50, // Maximale Anzahl der angezeigten Optionen
    filter: true, // Filter für Autovervollständigung aktivieren
    onChange: updateTables,
  });

  const initial = getInitialSendersFromURL();
  tomSelect.setValue(initial);
  updateTables();
}

function getInitialSendersFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('senders')?.split(',') || [];
}

function updateTables() {
  const selected = tomSelect.getValue();
  const now = new Date();
  const primeTime = new Date();
  primeTime.setHours(20, 15, 0, 0);

  const nowTable = document.querySelector('#nowTable tbody');
  const primeTable = document.querySelector('#primeTable tbody');
  nowTable.innerHTML = '';
  primeTable.innerHTML = '';

  allEntries.forEach(entry => {
    const sender = entry.show.network?.name;
    if (!selected.includes(sender)) return;

    const time = new Date(entry.airstamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const row = `<tr><td>${sender}</td><td>${entry.show.name}</td><td>${timeStr}</td></tr>`;

    if (Math.abs(now - time) < 30 * 60 * 1000) nowTable.innerHTML += row;
    if (Math.abs(primeTime - time) < 15 * 60 * 1000) primeTable.innerHTML += row;
  });
}

document.getElementById('shareBtn').addEventListener('click', () => {
  const selected = tomSelect.getValue();
  const url = new URL(location.href);
  url.searchParams.set('senders', selected.join(','));

  navigator.clipboard.writeText(url.toString()).then(() => {
    const status = document.getElementById('shareStatus');
    status.textContent = '🔗 Link kopiert!';
    setTimeout(() => (status.textContent = ''), 3000);
  });
});

document.getElementById('toggleDarkMode').addEventListener('click', () => {
  const body = document.body;
  const dark = body.classList.toggle('bg-dark');
  body.classList.toggle('bg-light', !dark);
  body.classList.toggle('text-light', dark);
  body.classList.toggle('text-dark', !dark);
});

fetchTVData();