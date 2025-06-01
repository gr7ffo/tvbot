// TVBot - TV Programm Guide
// Main JavaScript Application

// Global App State
const AppState = {
    selectedChannels: [],
    currentTime: 'now',
    theme: 'light',
    networks: [],
    programs: {}
};

// Theme Manager
class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('tvbot-theme') || (prefersDark ? 'dark' : 'light');
        this.setTheme(savedTheme);
        
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    setTheme(theme) {
        AppState.theme = theme;
        document.documentElement.setAttribute('data-bs-theme', theme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        
        localStorage.setItem('tvbot-theme', theme);
        this.updateURL();
    }

    toggleTheme() {
        const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    updateURL() {
        URLManager.updateURL();
    }
}

// URL Manager
class URLManager {
    static updateURL() {
        const params = new URLSearchParams();
        
        if (AppState.selectedChannels.length > 0) {
            params.set('channels', AppState.selectedChannels.join(','));
        }
        if (AppState.currentTime !== 'now') {
            params.set('time', AppState.currentTime);
        }
        if (AppState.theme !== 'light') {
            params.set('theme', AppState.theme);
        }
        
        const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newURL);
    }

    static loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('channels')) {
            AppState.selectedChannels = params.get('channels').split(',').filter(Boolean);
        }
        if (params.has('time')) {
            AppState.currentTime = params.get('time');
        }
        if (params.has('theme')) {
            AppState.theme = params.get('theme');
        }
    }

    static getCurrentURL() {
        return window.location.href;
    }
}

// API Manager
class APIManager {
    static async fetchNetworks() {
        try {
            const response = await fetch('https://api.tvmaze.com/networks');
            const networks = await response.json();
            
            // Add some popular web channels
            const webResponse = await fetch('https://api.tvmaze.com/webchannels');
            const webChannels = await webResponse.json();
            
            return [...networks, ...webChannels].sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('Fehler beim Laden der Netzwerke:', error);
            return [];
        }
    }

    static async fetchShowsForNetwork(networkId, isWebChannel = false) {
        try {
            const endpoint = isWebChannel ? 'webchannels' : 'networks';
            const response = await fetch(`https://api.tvmaze.com/${endpoint}/${networkId}/shows`);
            return await response.json();
        } catch (error) {
            console.error(`Fehler beim Laden der Shows für Netzwerk ${networkId}:`, error);
            return [];
        }
    }
}

// Sender Search Manager
class SenderSearchManager {
    constructor() {
        this.searchInput = document.getElementById('senderSearch');
        this.dropdown = document.getElementById('searchDropdown');
        this.tagsContainer = document.getElementById('senderTags');
        this.debounceTimeout = null;
        
        this.init();
    }

    init() {
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 300);
        });

        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value) {
                this.handleSearch(this.searchInput.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }

    async handleSearch(query) {
        if (query.length < 2) {
            this.hideDropdown();
            return;
        }

        const filtered = AppState.networks.filter(network => 
            network.name.toLowerCase().includes(query.toLowerCase()) &&
            !AppState.selectedChannels.includes(network.id.toString())
        );

        this.showDropdown(filtered.slice(0, 10));
    }

    showDropdown(networks) {
        this.dropdown.innerHTML = '';
        
        if (networks.length === 0) {
            this.dropdown.innerHTML = '<div class="dropdown-item-text text-muted">Keine Ergebnisse</div>';
        } else {
            networks.forEach(network => {
                const item = document.createElement('button');
                item.className = 'dropdown-item';
                item.textContent = network.name;
                if (network.country) {
                    item.innerHTML += ` <small class="text-muted">(${network.country.name})</small>`;
                }
                
                item.addEventListener('click', () => {
                    this.selectChannel(network);
                });
                
                this.dropdown.appendChild(item);
            });
        }
        
        this.dropdown.classList.add('show');
    }

    hideDropdown() {
        this.dropdown.classList.remove('show');
    }

    selectChannel(network) {
        if (!AppState.selectedChannels.includes(network.id.toString())) {
            AppState.selectedChannels.push(network.id.toString());
            this.renderTags();
            this.searchInput.value = '';
            this.hideDropdown();
            URLManager.updateURL();
            ProgramManager.loadPrograms();
        }
    }

    removeChannel(channelId) {
        AppState.selectedChannels = AppState.selectedChannels.filter(id => id !== channelId);
        this.renderTags();
        URLManager.updateURL();
        ProgramManager.loadPrograms();
    }

    renderTags() {
        this.tagsContainer.innerHTML = '';
        
        AppState.selectedChannels.forEach(channelId => {
            const network = AppState.networks.find(n => n.id.toString() === channelId);
            if (network) {
                const tag = document.createElement('span');
                tag.className = 'badge bg-primary sender-tag';
                tag.innerHTML = `
                    ${network.name}
                    <button type="button" class="btn-close btn-close-white ms-1" 
                            style="font-size: 0.7em;" onclick="senderSearch.removeChannel('${channelId}')">
                    </button>
                `;
                this.tagsContainer.appendChild(tag);
            }
        });
    }
}

// Program Manager
class ProgramManager {
    static async loadPrograms() {
        if (AppState.selectedChannels.length === 0) {
            document.getElementById('programTableBody').innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-info-circle"></i> 
                        Wählen Sie Sender aus, um das Programm anzuzeigen
                    </td>
                </tr>
            `;
            return;
        }

        this.showLoading(true);
        
        try {
            const programs = [];
            
            for (const channelId of AppState.selectedChannels) {
                const network = AppState.networks.find(n => n.id.toString() === channelId);
                if (network) {
                    const shows = await APIManager.fetchShowsForNetwork(network.id, network.webChannel);
                    
                    // Simulate current programming (TVMaze doesn't have real-time schedules)
                    shows.slice(0, 3).forEach((show, index) => {
                        const currentTime = new Date();
                        let showTime;
                        
                        if (AppState.currentTime === '2015') {
                            // Set to 20:15 today
                            showTime = new Date();
                            showTime.setHours(20, 15 + (index * 30), 0, 0);
                        } else {
                            // Current time + index hours
                            showTime = new Date(currentTime.getTime() + (index * 60 * 60 * 1000));
                        }
                        
                        programs.push({
                            network: network.name,
                            show: show.name,
                            time: showTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                            genre: show.genres ? show.genres.join(', ') : 'Unbekannt',
                            summary: show.summary
                        });
                    });
                }
            }
            
            this.renderPrograms(programs);
            this.updateLastUpdate();
            
        } catch (error) {
            console.error('Fehler beim Laden der Programme:', error);
            this.showError();
        } finally {
            this.showLoading(false);
        }
    }

    static renderPrograms(programs) {
        const tbody = document.getElementById('programTableBody');
        
        if (programs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-exclamation-triangle"></i> 
                        Keine Programmdaten verfügbar
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = programs.map(program => `
            <tr>
                <td><strong>${program.network}</strong></td>
                <td>${program.show}</td>
                <td><span class="badge bg-info">${program.time}</span></td>
                <td><small class="text-muted">${program.genre}</small></td>
            </tr>
        `).join('');
    }

    static showError() {
        const tbody = document.getElementById('programTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Fehler beim Laden der Programmdaten. Bitte versuchen Sie es später erneut.
                </td>
            </tr>
        `;
    }

    static showLoading(show) {
        document.body.classList.toggle('loading', show);
    }

    static updateLastUpdate() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = 
            `Zuletzt aktualisiert: ${now.toLocaleTimeString('de-DE')}`;
    }
}

// Share Manager
class ShareManager {
    constructor() {
        document.getElementById('shareButton').addEventListener('click', () => {
            this.shareCurrentState();
        });
    }

    async shareCurrentState() {
        const url = URLManager.getCurrentURL();
        
        try {
            await navigator.clipboard.writeText(url);
            this.showSuccessToast();
        } catch (error) {
            console.error('Fehler beim Kopieren:', error);
            // Fallback für ältere Browser
            this.fallbackCopyToClipboard(url);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showSuccessToast();
        } catch (error) {
            console.error('Fallback copy failed:', error);
            alert('Link konnte nicht kopiert werden: ' + text);
        }
        
        document.body.removeChild(textArea);
    }

    showSuccessToast() {
        const toast = new bootstrap.Toast(document.getElementById('shareToast'));
        toast.show();
    }
}

// Time Navigation
class TimeNavigation {
    constructor() {
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleTimeChange(e.target.dataset.time);
            });
        });
    }

    handleTimeChange(time) {
        // Update active button
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-time="${time}"]`).classList.add('active');
        
        AppState.currentTime = time;
        
        // Update program title
        let title = 'TV Programm';
        if (time === 'now') {
            title += ' - Jetzt';
        } else if (time === '2015') {
            title += ' - 20:15 Uhr';
        } else if (time === 'custom') {
            title += ' - Benutzerdefiniert';
        }
        
        document.getElementById('programTitle').innerHTML = `<i class="bi bi-tv"></i> ${title}`;
        
        URLManager.updateURL();
        ProgramManager.loadPrograms();
    }
}

// App Initialization
class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // Load state from URL
            URLManager.loadFromURL();
            
            // Initialize managers
            this.themeManager = new ThemeManager();
            this.shareManager = new ShareManager();
            this.timeNavigation = new TimeNavigation();
            
            // Load networks
            ProgramManager.showLoading(true);
            AppState.networks = await APIManager.fetchNetworks();
            
            // Initialize sender search
            window.senderSearch = new SenderSearchManager();
            
            // Restore selected channels from URL
            if (AppState.selectedChannels.length > 0) {
                senderSearch.renderTags();
                ProgramManager.loadPrograms();
            }
            
            // Set initial time button state
            const timeBtn = document.querySelector(`[data-time="${AppState.currentTime}"]`);
            if (timeBtn) {
                timeBtn.classList.add('active');
                // Trigger initial program title update
                this.timeNavigation.handleTimeChange(AppState.currentTime);
            }
            
            // Auto-refresh every 5 minutes
            setInterval(() => {
                if (AppState.selectedChannels.length > 0) {
                    ProgramManager.loadPrograms();
                }
            }, 5 * 60 * 1000);
            
        } catch (error) {
            console.error('Fehler bei der App-Initialisierung:', error);
        } finally {
            ProgramManager.showLoading(false);
        }
    }
}

// Utility Functions
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

// Handle page visibility changes for auto-refresh
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && AppState.selectedChannels.length > 0) {
        // Refresh data when page becomes visible again
        setTimeout(() => {
            ProgramManager.loadPrograms();
        }, 1000);
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('Verbindung wiederhergestellt');
    if (AppState.selectedChannels.length > 0) {
        ProgramManager.loadPrograms();
    }
});

window.addEventListener('offline', () => {
    console.log('Keine Internetverbindung');
});