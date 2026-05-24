// Google Places Serviceのセットアップ
let placesService = null;
let map = null;

let currentMode = 'driving'; // 'driving' or 'walking'
let currentLat = 35.6762;
let currentLng = 139.6503;
let currentHeading = 0; // 方向（度数法）
let currentFilteredSpots = [];
let announcedSpots = new Set(); // 既に読み上げたスポット
let approachedSpots = new Set(); // 接近時に読み上げたスポット

// 検索カテゴリ
const PLACE_TYPES = [
    'cafe',
    'restaurant',
    'park',
    'temple',
    'museum',
    'train_station',
    'library',
    'shopping_mall'
];

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
    // Google Maps APIの読み込み待機
    if (typeof google !== 'undefined' && google.maps) {
        const mapDiv = document.createElement('div');
        mapDiv.style.display = 'none';
        document.body.appendChild(mapDiv);
        map = new google.maps.Map(mapDiv, {
            center: { lat: currentLat, lng: currentLng },
            zoom: 15
        });
        placesService = new google.maps.places.PlacesService(map);
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
                searchNearbyPlaces();
            },
            (error) => {
                console.error('位置情報取得エラー:', error);
                locationText.textContent = 'デフォルト位置を使用しています（東京駅付近）';
                searchNearbyPlaces();
            }
        );
    } else {
        locationText.textContent = '位置情報機能がサポートされていません';
    }
}

// 周辺スポットを検索
function searchNearbyPlaces() {
    if (!placesService) {
        console.error('Places Service not initialized');
        return;
    }

    searchStatus.style.display = 'block';
    searchStatusText.textContent = '📡 周辺スポットを検索中...';
    attractionsList.innerHTML = '<p class="loading">検索中...</p>';

    const allPlaces = [];
    let completedRequests = 0;

    // 各カテゴリで検索
    PLACE_TYPES.forEach(type => {
        const request = {
            location: { lat: currentLat, lng: currentLng },
            radius: currentMode === 'driving' ? 10000 : 2000, // メートル単位
            type: type,
            language: 'ja'
        };

        placesService.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                allPlaces.push(...results);
            }

            completedRequests++;
            if (completedRequests === PLACE_TYPES.length) {
                // 重複を削除
                const uniquePlaces = [];
                const seenIds = new Set();
                allPlaces.forEach(place => {
                    if (!seenIds.has(place.place_id)) {
                        seenIds.add(place.place_id);
                        uniquePlaces.push(place);
                    }
                });

                currentFilteredSpots = uniquePlaces;
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
            currentHeading = event.alpha; // 0-360度
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

// 角度を計算（現在地からスポットへの方向）
function calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    return bearing;
}

// 前方にあるか判定（±90度範囲）
function isInFrontDirection(bearing) {
    const headingRange = 90; // ±90度
    let diff = Math.abs(currentHeading - bearing);
    if (diff > 180) {
        diff = 360 - diff;
    }
    return diff <= headingRange;
}

// 音声で読み上げ
function speak(text) {
    if ('speechSynthesis' in window) {
        // 前の読み上げをキャンセル
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        speechSynthesis.speak(utterance);
    }
}

// 観光名所をフィルタリングして表示
function filterAndDisplayAttractions() {
    const maxDistance = currentMode === 'driving' ? 10 : 2; // kmで指定
    
    // 距離を計算してソート
    let filteredSpots = currentFilteredSpots
        .map(spot => {
            const distance = calculateDistance(
                currentLat, currentLng,
                spot.geometry.location.lat(),
                spot.geometry.location.lng()
            );
            const bearing = calculateBearing(
                currentLat, currentLng,
                spot.geometry.location.lat(),
                spot.geometry.location.lng()
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

    // 走行モード時は前方にあるものだけ
    if (currentMode === 'driving') {
        filteredSpots = filteredSpots.filter(spot => spot.inFront);
    }

    // 距離順にソート
    filteredSpots.sort((a, b) => a.actualDistance - b.actualDistance);

    // 音声お知らせ処理
    if (currentMode === 'driving') {
        handleVoiceAnnouncements(filteredSpots);
    }

    // TOP3のみ表示
    const top3Spots = filteredSpots.slice(0, 3);
    displayAttractions(top3Spots);
}

// 音声お知らせ処理
function handleVoiceAnnouncements(spots) {
    spots.forEach(spot => {
        const spotKey = spot.place_id;
        const distanceInMeters = spot.actualDistance * 1000;

        // ① 観光スポット発見時（初回のみ）
        if (!announcedSpots.has(spotKey) && spot.actualDistance <= 5) { // 5km以内
            const distanceText = distanceInMeters < 1000 
                ? `${Math.round(distanceInMeters)}メートル`
                : `${spot.actualDistance.toFixed(1)}キロメートル`;
            const message = `${spot.name}が${distanceText}先にあります`;
            speak(message);
            announcedSpots.add(spotKey);
        }

        // ③ 接近時（500m以内で1回）
        if (!approachedSpots.has(spotKey) && spot.actualDistance <= 0.5) {
            const message = `${spot.name}に接近しました`;
            speak(message);
            approachedSpots.add(spotKey);
        }

        // 遠ざかったらリセット
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
        
        const rating = spot.rating ? spot.rating.toFixed(1) : 'N/A';
        const reviews = spot.user_ratings_total ? `(${spot.user_ratings_total}件)` : '';
        
        card.innerHTML = `
            <div class="attraction-name">${spot.name}</div>
            <div class="attraction-distance">📍 ${distanceText}</div>
            <div class="attraction-rating">⭐ ${rating} ${reviews}</div>
            <div class="attraction-category">${spot.types ? spot.types[0] : 'その他'}</div>
        `;
        card.addEventListener('click', () => showDetail(spot));
        attractionsList.appendChild(card);
    });
}

// 詳細情報を表示
function showDetail(spot) {
    const starsHtml = spot.rating ? '⭐'.repeat(Math.floor(spot.rating)) : 'N/A';
    const isOpen = spot.opening_hours ? (spot.opening_hours.open_now ? '営業中 ✅' : '営業時間外 ❌') : '営業時間未取得';
    const address = spot.vicinity || '住所未取得';
    const rating = spot.rating ? spot.rating.toFixed(1) : 'N/A';
    const reviews = spot.user_ratings_total ? `(${spot.user_ratings_total}件)` : '';
    
    detailContent.innerHTML = `
        <h3>${spot.name}</h3>
        <div class="detail-item">
            <div class="detail-label">営業状態</div>
            <div class="detail-value">${isOpen}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">評価</div>
            <div class="detail-value">${starsHtml} ${rating} ${reviews}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">距離</div>
            <div class="detail-value">${spot.actualDistance.toFixed(2)}km</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">住所</div>
            <div class="detail-value">${address}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">電話番号</div>
            <div class="detail-value">${spot.formatted_phone_number || '電話番号未取得'}</div>
        </div>
        <div class="modal-buttons">
            <button class="btn-maps" onclick="openGoogleMaps(${spot.geometry.location.lat()}, ${spot.geometry.location.lng()}, '${spot.name.replace(/'/g, "\\'")}')">
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

// アプリを初期化（APIロード後）
window.addEventListener('load', () => {
    init();
});
