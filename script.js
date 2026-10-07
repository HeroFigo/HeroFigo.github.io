document.getElementById('year').textContent = new Date().getFullYear();
// ==========================================
// CONFIGURATION - EDIT THESE VALUES EASILY
// ==========================================
const CONFIG = {
    placeIds: [14605532524, 92020772139138, 72622337452184],
    labels: {
        gamesPublished: "Games Published",
        totalVisits: "Total Visits",
        livePlayers: "Live Players (CCU)",
        active: "Active",
        visits: "Visits"
    }
};
// ==========================================

let gamesData = [];

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

// Apply custom labels from config
document.getElementById('lblTotalGames').textContent = CONFIG.labels.gamesPublished;
document.getElementById('lblTotalVisits').textContent = CONFIG.labels.totalVisits;
document.getElementById('lblLivePlayers').textContent = CONFIG.labels.livePlayers;

async function fetchGameData() {
    try {
        const universePromises = CONFIG.placeIds.map(id => 
            fetch(`https://apis.roproxy.com/universes/v1/places/${id}/universe`).then(res => {
                if (!res.ok) throw new Error(`Failed to get universe for ${id}`);
                return res.json();
            })
        );
        
        const universeData = await Promise.all(universePromises);
        const universeIds = universeData.map(data => data.universeId);
        
        const detailsResponse = await fetch(`https://games.roproxy.com/v1/games?universeIds=${universeIds.join(',')}`);
        if (!detailsResponse.ok) throw new Error('Failed to fetch game details');
        
        const detailsJson = await detailsResponse.json();
        gamesData = detailsJson.data; 
        
        const thumbResponse = await fetch(`https://thumbnails.roproxy.com/v1/games/icons?universeIds=${universeIds.join(',')}&size=256x256&format=Png&isCircular=false`);
        const thumbJson = await thumbResponse.json();
        
        const thumbMap = {};
        if (thumbJson.data) {
            thumbJson.data.forEach(item => {
                if (item.state === "Completed") {
                    thumbMap[item.targetId] = item.imageUrl;
                }
            });
        }

        gamesData.forEach(game => {
            game.imageUrl = thumbMap[game.id] || null;
        });
        
        renderStats();
        renderGames('ccu-desc');
        
    } catch (error) {
        console.error('Error fetching Roblox data via RoProxy:', error);
        document.getElementById('gamesGrid').innerHTML = '<div class="loader" style="color: red;">Failed to load data. Please check console.</div>';
    }
}

function renderStats() {
    const totalGames = gamesData.length;
    const totalVisits = gamesData.reduce((sum, game) => sum + (game.visits || 0), 0);
    const totalCCU = gamesData.reduce((sum, game) => sum + (game.playing || 0), 0);

    document.getElementById('totalGames').textContent = totalGames;
    document.getElementById('totalVisits').textContent = formatNumber(totalVisits);
    document.getElementById('totalCCU').textContent = formatNumber(totalCCU);
}

function renderGames(filter) {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '';

    let sortedGames = [...gamesData];

    switch(filter) {
        case 'ccu-desc': sortedGames.sort((a, b) => (b.playing || 0) - (a.playing || 0)); break;
        case 'ccu-asc': sortedGames.sort((a, b) => (a.playing || 0) - (b.playing || 0)); break;
        case 'visits-desc': sortedGames.sort((a, b) => (b.visits || 0) - (a.visits || 0)); break;
        case 'visits-asc': sortedGames.sort((a, b) => (a.visits || 0) - (b.visits || 0)); break;
    }

    sortedGames.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        card.addEventListener('click', () => {
            window.open(`https://www.roblox.com/games/${game.rootPlaceId}`, '_blank');
        });

        const imgSrc = game.imageUrl || 'https://placehold.co/420x420/141418/8a8a93?text=No+Thumbnail';
        
        card.innerHTML = `
            <img src="${imgSrc}" alt="${game.name}" class="game-thumbnail" onerror="this.src='https://placehold.co/420x420/141418/8a8a93?text=Error';">
            <div class="game-info">
                <div class="game-name">${game.name}</div>
                <div class="game-stats">
                    <div class="stat-chip active-chip">
                        <div class="chip-value">
                            <span class="live-dot"></span>
                            ${formatNumber(game.playing || 0)}
                        </div>
                        <div class="chip-label">${CONFIG.labels.active}</div>
                    </div>
                    <div class="stat-chip visits-chip">
                        <div class="chip-value">${formatNumber(game.visits || 0)}</div>
                        <div class="chip-label">${CONFIG.labels.visits}</div>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderGames(btn.dataset.filter);
    });
});

// Initialize
fetchGameData();
setInterval(fetchGameData, 60000);
