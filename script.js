let allEntries = [];
let senderSelect;

const senderLogos = {
  "ZDF": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/ZDF_2021_logo.svg/120px-ZDF_2021_logo.svg.png",
  "Das Erste": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Das_Erste_2019.svg/120px-Das_Erste_2019.svg.png",
  "ProSieben": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/ProSieben_2015.svg/120px-ProSieben_2015.svg.png",
  "RTL": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/RTL_logo_2021.svg/120px-RTL_logo_2021.svg.png",
  "VOX": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Vox_logo_2015.svg/120px-Vox_logo_2015.svg.png",
  "SAT.1": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Sat1_2011_logo.svg/120px-Sat1_2011_logo.svg.png",
  "kabel eins": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Kabel_eins_logo_2015.svg/120px-Kabel_eins_logo_2015.svg.png",
  "ZDFneo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/ZDFneo_2017_logo.svg/120px-ZDFneo_2017_logo.svg.png",
  "ZDFinfo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/ZDFinfo_2011_logo.svg/120px-ZDFinfo_2011_logo.svg.png",
  "arte": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Arte_Logo_2017.svg/120px-Arte_Logo_2017.svg.png",
  "Comedy Central": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Comedy_Central_2018_Logo.svg/120px-Comedy_Central_2018_Logo.svg.png",
  "Welt": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Welt_logo_2018.svg/120px-Welt_logo_2018.svg.png"
};

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
  const selectEl = document.getElementById('senderSelect');
  selectEl.innerHTML = senders.map(s => `<option value="${s}">${s}</option>`).join('');

  senderSelect = new TomSelect(selectEl, {
    plugins: ['remove_button'],
    onChange: updateTables
  });

  const initial = getInitialSendersFromURL().filter(s => senders.includes(s));
  senderSelect.setValue(initial.length > 0 ? initial : ["Das Erste", "ZDF", "ProSieben"]);
  updateTables();
}

function getInitialSendersFromURL() {
  const params = new URLSearchParams(window.location.search);
  const list = params.get("senders");
  return list ? list.split(',') : [];
}

function updateTables() {
  const selectedSenders = senderSelect.getValue();
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
      time: showTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      logo: senderLogos[channel] || null
    };

    if (diff < 30 * 60 * 1000) nowEntries.push(row);
    if (primeDiff < 15 * 60 * 1000) primeEntries.push(row);
  });

  nowEntries.forEach(item => {
    const logo = item.logo ? `<img src="${item.logo}" alt="${item.channel}" height="24" class="me-2">` : '';
    nowTable.innerHTML += `<tr><td>${logo}${item.channel}</td><td>${item.name}</td><td>${item.time}</td></tr>`;
  });

  primeEntries.forEach(item => {
    const logo = item.logo ? `<img src="${item.logo}" alt="${item.channel}" height="24" class="me-2">` : '';
    primeTable.innerHTML += `<tr><td>${logo}${item.channel}</td><td>${item.name}</td><td>${item.time}</td></tr>`;
  });
}

document.getElementById('shareBtn').addEventListener('click', () => {
  const selected = senderSelect.getValue();
  const url = new URL(window.location.href);
  url.searchParams.set('senders', selected.join(','));

  navigator.clipboard.writeText(url.toString()).then(() => {
    const status = document.getElementById('shareStatus');
    status.textContent = '🔗 Link kopiert!';
    setTimeout(() => { status.textContent = ''; }, 3000);
  });
});

document.getElementById('toggleDarkMode').addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  setDarkMode(!isDark);
});

function setDarkMode(enabled) {
  document.body.classList.toggle('dark-mode', enabled);
  localStorage.setItem('darkMode', enabled ? 'true' : 'false');
}

(function applyInitialDarkMode() {
  const saved = localStorage.getItem('darkMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setDarkMode(saved === 'true' || (saved === null && prefersDark));
})();

fetchTVData();