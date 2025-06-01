let allEntries = [];
let senderSelect = document.getElementById('senderSelect');
let isDarkMode = false;

function fetchTVData() {
  fetch('https://api.tvmaze.com/schedule?country=DE')
    .then(response => response.json())
    .then(data => {
      allEntries = data;
      const uniqueSenders = Array.from(new Set(
        data.map(entry => entry.show.network?.name).filter(Boolean)
      )).sort();

      initSelect(uniqueSenders);
    })
    .catch(err => console.error("Fehler beim Laden der TV-Daten:", err));
}

function initSelect(senders) {
  senderSelect.innerHTML = senders.map(s => `<option value="${s}">${s}</option>`).join('');

  senderSelect.addEventListener('change', updateTables);

  const initial = getInitialSendersFromURL().filter(s => senders.includes(s));
  for (let option of senderSelect.options) {
    option.selected = initial.includes(option.value);
  }
  updateTables();
}

function getInitialSendersFromURL() {
  const params = new URLSearchParams(window.location.search);
  const list = params.get("senders");
  return list ? list.split(',') : [];
}

function updateTables() {
  const selectedSenders = Array.from(senderSelect.selectedOptions).map(option => option.value);
  const now = new Date();
  const primeStart = new Date();
  primeStart.setHours(20, 15, 0, 0);

  const nowTable = document.querySelector("#nowTable tbody");
  const primeTable = document.querySelector("#primeTable tbody");
  nowTable.innerHTML = "";
  primeTable.innerHTML = "";

  const nowEntries = [];
  const primeEntries = [];

  allEntries.forEach(entry => {
    const channel = entry.show.network?.name;
    if (!selectedSenders.includes(channel)) return;

    const showTime = new Date(entry.airstamp);
    const diff = Math.abs(now - showTime);
    const primeDiff = Math.abs(primeStart - showTime);

    const row = {
      channel,
      name: entry.show.name,
      time: showTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (diff < 30 * 60 * 1000) nowEntries.push(row);
    if (primeDiff < 15 * 60 * 1000) primeEntries.push(row);
  });

  nowEntries.forEach(item => {
    nowTable.innerHTML += `<tr><td>${item.channel}</td><td>${item.name}</td><td>${item.time}</td></tr>`;
  });

  primeEntries.forEach(item => {
    primeTable.innerHTML += `<tr><td>${item.channel}</td><td>${item.name}</td><td>${item.time}</td></tr>`;
  });
}

document.getElementById('shareBtn').addEventListener('click', () => {
  const selected = Array.from(senderSelect.selectedOptions).map(option => option.value);
  const url = new URL(window.location.href);
  url.searchParams.set('senders', selected.join(','));

  navigator.clipboard.writeText(url.toString()).then(() => {
    const status = document.getElementById('shareStatus');
    status.textContent = '🔗 Link kopiert!';
    setTimeout(() => { status.textContent = ''; }, 3000);
  });
});

document.getElementById('toggleDarkMode').addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('bg-light', !isDarkMode);
  document.body.classList.toggle('bg-dark', isDarkMode);
  document.body.classList.toggle('text-dark', !isDarkMode);
  document.body.classList.toggle('text-light', isDarkMode);
});

fetchTVData();