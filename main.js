// JavaScript for TV-Programm - Deutsche Sender
// XMLTV integration: fetch and parse XMLTV data for German TV channels

// Fetch and parse XMLTV data
async function fetchXMLTV(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Fehler beim Laden der XMLTV-Daten');
    const xmlText = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(xmlText, 'text/xml');
}

// Helper: Map channel id to epgId
const epgpwChannelMap = Object.fromEntries(germanChannels.map(ch => [ch.id, ch.epgId]));

// Fetch and parse EPG.pw API for a single channel
async function fetchEPGPWChannel(channelId) {
    const epgId = epgpwChannelMap[channelId];
    if (!epgId) return [];
    const url = `https://epg.pw/api/epg.xml?channel_id=${epgId}`;
    const xmlDoc = await fetchXMLTV(url);
    const programmes = xmlDoc.querySelectorAll('programme');
    const progs = [];
    programmes.forEach(prog => {
        const start = prog.getAttribute('start');
        const title = prog.querySelector('title')?.textContent || '';
        const desc = prog.querySelector('desc')?.textContent || '';
        const time = start ? `${start.substring(8,10)}:${start.substring(10,12)}` : '';
        progs.push({ time, title, description: desc });
    });
    return progs;
}

// Fetch all selected channels in parallel
async function loadTVProgram() {
    const loading = document.getElementById('loading');
    const tablesContainer = document.getElementById('tablesContainer');
    loading.style.display = 'block';
    loading.innerHTML = 'Lade aktuelle TV-Programmdaten (epg.pw API)...';
    tablesContainer.style.display = 'none';
    try {
        // Only fetch for selected channels, not all
        const channelIds = Array.from(selectedChannels);
        if (channelIds.length === 0) {
            loading.innerHTML = 'Bitte wähle mindestens einen Sender aus.';
            return;
        }
        const results = await Promise.all(channelIds.map(id => fetchEPGPWChannel(id)));
        const programsByChannel = new Map();
        channelIds.forEach((id, idx) => programsByChannel.set(id, results[idx]));
        allPrograms = programsByChannel;
        loading.style.display = 'none';
        updateTables();
    } catch (error) {
        loading.innerHTML = `<div class="error">❌ Fehler beim Laden der epg.pw-Daten: ${error.message}</div>`;
    }
}
