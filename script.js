// Google Places Serviceの初期化
let service;
let placesData = [];

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
        phone: '03-xxxx-xxxx',
        source: 'manual'
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
        phone: '03-xxxx-xxxx',
        source: 'manual'
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
        phone: '03-xxxx-xxxx',
        source: 'manual'
    }
];

let currentMode = 'driving'; // 'driving' or 'walking'
let currentLat = 35.6762;
let currentLng = 139.6503;
let currentHeading = 0;
let currentFilteredSpots = [];
let announcedSpots = new Set();
let approachedSpots = new Set();

// DOM要素
const modeToggle = document.getElementById('modeToggle');
const modeText = document.getElementById('modeText');
const locationText = document.getElementById('locationText');
const refreshBtn = document.getElementById('refreshBtn');
const attractionsList = document.getElementById('attractionsList');
const detailModal = document.getElementById('detailModal');
const detailContent = document.getElementById('detailContent');
const closeBtn = document.querySelector('.close');
const searchStatus = document.getElementById('searchStatus');
const searchStatusText = document.getElementById('searchStatusText');

// イベントリスナー
modeToggle.addEventListener('change', () => {
    currentMode = modeToggle.checked ? 'walking' : 'driving';
    updateModeText();
    announcedSpots.clear();
    approachedSpots.clear();
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
    // Google Places Serviceの初期化
    if (window.google && window.google.maps) {
        service = new google.maps.places.PlacesService(document.createElement('div'));
    }
    getLocation();
    startHeadingTracking();
}

// 位置情報を取得
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;
                updateLocationDisplay();
                searchNearbyPlaces(); // Google Places APIで検索
                filterAndDisplayAttractions();
            },
            (error) => {
                console.error('位置情報取得エラー:', error);
                locationText.textContent = 'デフォルト位置���使用しています（東京駅付近）';
                searchNearbyPlaces();
                filterAndDisplayAttractions();
            }
        );
    } else {
        locationText.textContent = '位置情報機能がサポートされていません';
    }
}

// 周辺スポットをGoogle Places APIで検索
function searchNearbyPlaces() {
    if (!service) return;

    searchStatus.style.display = 'block';
    searchStatusText.textContent = '📡 周辺スポットを検索中...';

    const maxDistance = currentMode === 'driving' ? 10000 : 2000; // メートル

    // 複数の検索リクエスト
    const searchTypes = [
        { type: 'cafe', name: 'カフェ' },
        { type: 'restaurant', name: 'レストラン' },
        { type: 'park', name: '公園' },
        { type: 'temple', name: '寺院' },
        { type: 'museum', name: '博物館' },
        { type: 'train_station', name: '駅' },
        { type: 'library', name: '図書館' },
        { type: 'shopping_mall', name: 'ショッピングモール' }
    ];

    let completedRequests = 0;

    searchTypes.forEach(typeObj => {
        const request = {
            location: new google.maps.LatLng(currentLat, currentLng),
            radius: maxDistance,
            type: typeObj.type
        };

        service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                results.forEach(place => {
                    if (place.geometry && place.geometry.location) {
                        const distance = calculateDistance(
                            currentLat, currentLng,
                            place.geometry.location.lat(),
                            place.geometry.location.lng()
                        );

                        // 既に存在するかチェック
                        const exists = placesData.some(p => p.place_id === place.place_id);
                        if (!exists) {
                            placesData.push({
                                place_id: place.place_id,
                                name: place.name,
                                lat: place.geometry.location.lat(),
                                lng: place.geometry.location.lng(),
                                rating: place.rating || 3.5,
                                reviews: place.user_ratings_total || 0,
                                category: typeObj.name,
                                description: `${typeObj.name}のスポット。`,
                                hours: place.opening_hours ? (place.opening_hours.open_now ? '営業中' : '営業終了') : '営業時間不明',
                                phone: place.formatted_phone_number || '電話番号不明',
                                source: 'google_places'
                            });
                        }
                    }
                });
            }

            completedRequests++;
            if (completedRequests === searchTypes.length) {
                searchStatus.style.display = 'none';
                filterAndDisplayAttractions();
            }
        });
    });
}

// 方向追跡を開始
function startHeadingTracking() {
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientationabsolute', (event) => {
            currentHeading = event.alpha;
            filterAndDisplayAttractions();
        }, true);
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
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// 角度を計算
function calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    return bearing;
}

// 前方にあるか判定
function isInFrontDirection(bearing) {
    const headingRange = 90;
    let diff = Math.abs(currentHeading - bearing);
    if (diff > 180) {
        diff = 360 - diff;
    }
    return diff <= headingRange;
}

// 音声で読み上げ
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        speechSynthesis.speak(utterance);
    }
}

// 観光名所をフィルタリングして表示
function filterAndDisplayAttractions() {
    const maxDistance = currentMode === 'driving' ? 10 : 2;
    
    // 全データ（マニュアル + Google Places）を統合
    const allSpots = [...touristSpots, ...placesData];
    
    let filteredSpots = allSpots
        .map(spot => {
            const distance = calculateDistance(
                currentLat, currentLng,
                spot.lat, spot.lng
            );
            const bearing = calculateBearing(
                currentLat, currentLng,
                spot.lat, spot.lng
            );
            const inFront = isInFrontDirection(bearing);
            return { 
                ...spot, 
                actualDistance: distance,
                bearing: bearing,
                inFront: inFront
            };
        })
        .filter(spot => spot.actualDistance <= maxDistance);

    if (currentMode === 'driving') {
        filteredSpots = filteredSpots.filter(spot => spot.inFront);
    }

    filteredSpots.sort((a, b) => a.actualDistance - b.actualDistance);

    currentFilteredSpots = filteredSpots;

    if (currentMode === 'driving') {
        handleVoiceAnnouncements();
    }

    const top3Spots = filteredSpots.slice(0, 3);
    displayAttractions(top3Spots);
}

// 音声お知らせ処理
function handleVoiceAnnouncements() {
    currentFilteredSpots.forEach(spot => {
        const spotKey = spot.place_id || spot.id;
        const distanceInMeters = spot.actualDistance * 1000;

        if (!announcedSpots.has(spotKey) && spot.actualDistance <= 5) {
            const distanceText = distanceInMeters < 1000 
                ? `${Math.round(distanceInMeters)}メートル`
                : `${spot.actualDistance.toFixed(1)}キロメートル`;
            const message = `${spot.name}が${distanceText}先にあります`;
            speak(message);
            announcedSpots.add(spotKey);
        }

        if (!approachedSpots.has(spotKey) && spot.actualDistance <= 0.5) {
            const message = `${spot.name}に接近しました`;
            speak(message);
            approachedSpots.add(spotKey);
        }

        if (spot.actualDistance > 5) {
            announcedSpots.delete(spotKey);
            approachedSpots.delete(spotKey);
        }
    });
}

// 観光名所を表示
function displayAttractions(spots) {
    attractionsList.innerHTML = '';

    if (spots.length === 0) {
        attractionsList.innerHTML = '<p class="loading">近くに観光名所がありません</p>';
        return;
    }

    spots.forEach(spot => {
        const card = document.createElement('div');
        card.className = 'attraction-card';
        const distanceText = spot.actualDistance < 1 
            ? `${Math.round(spot.actualDistance * 1000)}m`
            : `${spot.actualDistance.toFixed(1)}km`;
        
        card.innerHTML = `
            <div class="attraction-name">${spot.name}</div>
            <div class="attraction-distance">📍 ${distanceText}</div>
            <div class="attraction-rating">⭐ ${spot.rating.toFixed(1)} (${spot.reviews}件)</div>
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
            <div class="detail-value">${starsHtml} ${spot.rating.toFixed(1)} (${spot.reviews}件のレビュー)</div>
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
            <div class="detail-label">営業状態</div>
            <div class="detail-value">${spot.hours}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">電話番号</div>
            <div class="detail-value">${spot.phone}</div>
        </div>
        <div class="modal-buttons">
            <button class="btn-maps" onclick="openGoogleMaps(${spot.lat}, ${spot.lng}, '${spot.name.replace(/'/g, "\\'")}')">
                🗺️ Google Mapsで開く
            </button>
        </div>
    `;
    detailModal.style.display = 'block';
}

// Google Mapsを開く
function openGoogleMaps(lat, lng, name) {
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lng},15z`;
    window.open(mapsUrl, '_blank');
}

// アプリを初期化
init();