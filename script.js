// サンプル観光名所データ
const touristSpots = [
    {
        id: 1,
        name: 'スカイツリー',
        lat: 35.7101,
        lng: 139.8107,
        distance: 2.5,
        rating: 4.5,
        reviews: 3452,
        category: 'タワー・展望台',
        description: '高さ634mの電波塔。展望台からは東京全体を見渡せます。',
        hours: '08:00 - 22:00',
        phone: '03-xxxx-xxxx'
    },
    {
        id: 2,
        name: '浅草寺',
        lat: 35.7148,
        lng: 139.7967,
        distance: 3.1,
        rating: 4.4,
        reviews: 5821,
        category: '寺院',
        description: '東京で最古の寺院。雷門が有名です。',
        hours: '06:00 - 17:00',
        phone: '03-xxxx-xxxx'
    },
    {
        id: 3,
        name: '国立科学博物館',
        lat: 35.7188,
        lng: 139.7694,
        distance: 4.2,
        rating: 4.3,
        reviews: 2134,
        category: '博物館',
        description: '日本最大級の科学博物館。恐竜の骨格標本が見どころ。',
        hours: '09:00 - 17:00',
        phone: '03-xxxx-xxxx'
    },
    {
        id: 4,
        name: '皇居',
        lat: 35.6754,
        lng: 139.7529,
        distance: 5.8,
        rating: 4.2,
        reviews: 4567,
        category: '宮殿',
        description: '日本の象徴。緑豊かな皇居東御苑は無料で入苑できます。',
        hours: '09:00 - 16:00（月休）',
        phone: '03-xxxx-xxxx'
    },
    {
        id: 5,
        name: '六本木ヒルズ',
        lat: 35.6660,
        lng: 139.7294,
        distance: 6.3,
        rating: 4.1,
        reviews: 3210,
        category: 'ショッピング',
        description: 'ショッピング、グルメ、美術館が集まる複合施設。',
        hours: '10:00 - 23:00',
        phone: '03-xxxx-xxxx'
    },
    {
        id: 6,
        name: '日本科学未来館',
        lat: 35.6295,
        lng: 139.7564,
        distance: 7.1,
        rating: 4.3,
        reviews: 1876,
        category: '博物館',
        description: 'ロボット技術と最先端科学を体験できます。',
        hours: '10:00 - 17:00',
        phone: '03-xxxx-xxxx'
    },
    {
        id: 7,
        name: 'スクランブル交差点',
        lat: 35.6595,
        lng: 139.7004,
        distance: 8.5,
        rating: 4.4,
        reviews: 6543,
        category: '街並み',
        description: '世界で最も有名な交差点。毎日数万人が利用します。',
        hours: '24時間',
        phone: '03-xxxx-xxxx'
    },
    {
        id: 8,
        name: '森美術館',
        lat: 35.6660,
        lng: 139.7294,
        distance: 9.2,
        rating: 4.2,
        reviews: 987,
        category: '美術館',
        description: '現代アートを中心とした美術館。',
        hours: '10:00 - 22:00',
        phone: '03-xxxx-xxxx'
    }
];

let currentMode = 'driving'; // 'driving' or 'walking'
let currentLat = 35.6762;
let currentLng = 139.6503;
let currentFilteredSpots = [];

// DOM要素
const modeToggle = document.getElementById('modeToggle');
const modeText = document.getElementById('modeText');
const locationText = document.getElementById('locationText');
const refreshBtn = document.getElementById('refreshBtn');
const attractionsList = document.getElementById('attractionsList');
const detailModal = document.getElementById('detailModal');
const detailContent = document.getElementById('detailContent');
const closeBtn = document.querySelector('.close');

// イベントリスナー
modeToggle.addEventListener('change', () => {
    currentMode = modeToggle.checked ? 'walking' : 'driving';
    updateModeText();
    filterAndDisplayAttractions();
});

refreshBtn.addEventListener('click', () => {
    getLocation();
});

closeBtn.addEventListener('click', () => {
    detailModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === detailModal) {
        detailModal.style.display = 'none';
    }
});

// 初期化
function init() {
    getLocation();
}

// 位置情報を取得
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;
                updateLocationDisplay();
                filterAndDisplayAttractions();
            },
            (error) => {
                console.error('位置情報取得エラー:', error);
                // デフォルト位置を使用（東京駅付近）
                locationText.textContent = 'デフォルト位置を使用しています（東京駅付近）';
                filterAndDisplayAttractions();
            }
        );
    } else {
        locationText.textContent = '位置情報機能がサポートされていません';
    }
}

// 位置情報表示を更新
function updateLocationDisplay() {
    locationText.textContent = `緯度: ${currentLat.toFixed(4)}\n経度: ${currentLng.toFixed(4)}`;
}

// モードテキストを更新
function updateModeText() {
    modeText.textContent = currentMode === 'driving' ? '🚗 走行中' : '🚶 歩行中';
}

// 距離を計算（Haversine公式）
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 観光名所をフィルタリングして表示
function filterAndDisplayAttractions() {
    const maxDistance = currentMode === 'driving' ? 15 : 2; // kmで指定
    
    // 距離を計算してソート
    currentFilteredSpots = touristSpots
        .map(spot => {
            const distance = calculateDistance(
                currentLat, currentLng,
                spot.lat, spot.lng
            );
            return { ...spot, actualDistance: distance };
        })
        .filter(spot => spot.actualDistance <= maxDistance)
        .sort((a, b) => a.actualDistance - b.actualDistance);

    displayAttractions();
}

// 観光名所を表示
function displayAttractions() {
    attractionsList.innerHTML = '';

    if (currentFilteredSpots.length === 0) {
        attractionsList.innerHTML = '<p class="loading">近くに観光名所がありません</p>';
        return;
    }

    currentFilteredSpots.forEach(spot => {
        const card = document.createElement('div');
        card.className = 'attraction-card';
        card.innerHTML = `
            <div class="attraction-name">${spot.name}</div>
            <div class="attraction-distance">📍 ${spot.actualDistance.toFixed(1)}km</div>
            <div class="attraction-rating">⭐ ${spot.rating} (${spot.reviews}件)</div>
            <div class="attraction-category">${spot.category}</div>
        `;
        card.addEventListener('click', () => showDetail(spot));
        attractionsList.appendChild(card);
    });
}

// 詳細情報を表示
function showDetail(spot) {
    const starsHtml = '⭐'.repeat(Math.floor(spot.rating));
    
    detailContent.innerHTML = `
        <h3>${spot.name}</h3>
        <div class="detail-item">
            <div class="detail-label">説明</div>
            <div class="detail-value">${spot.description}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">評価</div>
            <div class="detail-value">${starsHtml} ${spot.rating} (${spot.reviews}件のレビュー)</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">距離</div>
            <div class="detail-value">${spot.actualDistance.toFixed(2)}km</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">カテゴリ</div>
            <div class="detail-value">${spot.category}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">営業時間</div>
            <div class="detail-value">${spot.hours}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">住所</div>
            <div class="detail-value">緯度: ${spot.lat}, 経度: ${spot.lng}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">電話番号</div>
            <div class="detail-value">${spot.phone}</div>
        </div>
        <div class="modal-buttons">
            <button class="btn-maps" onclick="openGoogleMaps(${spot.lat}, ${spot.lng}, '${spot.name}')">
                🗺️ Google Mapsで開く
            </button>
        </div>
    `;
    detailModal.style.display = 'block';
}

// Google Mapsを開く
function openGoogleMaps(lat, lng, name) {
    const mapsUrl = `https://www.google.com/maps/search/${name}/@${lat},${lng},15z`;
    window.open(mapsUrl, '_blank');
}

// アプリを初期化
init();