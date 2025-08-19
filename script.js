// Game state variables
let money = 120;
let moneyPerSecond = 0;
let nextCharacterId = 0;
let lastUpdate = Date.now();
const baseCharacterSpeed = 50; // pixels per second (base speed = 1x)
let isHardMode = false;
const characterSpacing = 200; // pixels between characters
const characterPassPoint = 1.0; // 100% of track width - disappear at right edge
const spawnPosition = -120; // Spawn position at left edge of screen
let selectedCardId = null; // ID của nhân vật đang được chọn để tùy chỉnh
let lastCharacterPosition = -200; // Track last spawned character position
let lastSpawnTime = 0; // Track last spawn time to prevent spam
const minSpawnInterval = 500; // Minimum 500ms between spawns

// Artifact management variables
let artifactSortMode = 'rarity'; // 'rarity', 'name', 'tier'

// Dynamic limits based on upgrades
function getEquippedLimit() {
    return upgradeConfigs.characterSlots.baseValue + (upgrades.characterSlots.level * upgradeConfigs.characterSlots.valueIncrease);
}

function getMaxOwnedCharacters() {
    return upgradeConfigs.characterStorage.baseValue + (upgrades.characterStorage.level * upgradeConfigs.characterStorage.valueIncrease);
}

function getEquippedArtifactsLimit() {
    return upgradeConfigs.artifactSlots.baseValue + (upgrades.artifactSlots.level * upgradeConfigs.artifactSlots.valueIncrease);
}

function getMaxOwnedArtifacts() {
    return upgradeConfigs.artifactStorage.baseValue + (upgrades.artifactStorage.level * upgradeConfigs.artifactStorage.valueIncrease);
}

function getTrackSpeedMultiplier() {
    // Base speed is 1x (100%)
    let speedMultiplier = 1.0;

    // Add speed from upgrades (convert percentage to multiplier)
    const upgradeSpeedBonus = (upgrades.trackSpeed.level * upgradeConfigs.trackSpeed.valueIncrease) / 100;
    speedMultiplier += upgradeSpeedBonus;

    // Add movement speed from artifacts
    equippedArtifacts.forEach(index => {
        const artifact = ownedArtifacts[index];
        if (artifact) {
            // Check if it's a movement speed artifact
            if (artifact.name === 'Swift Boots' || artifact.name === 'Runner Shoes' ||
                artifact.name === 'Wind Walker' || artifact.name === 'Lightning Step' ||
                artifact.name === 'Time Warp') {
                speedMultiplier += artifact.value;
            }
            // Special omnipotent artifact
            else if (artifact.name === 'Omnipotent Orb') {
                speedMultiplier += artifact.value;
            }
        }
    });

    return speedMultiplier;
}

// Upgrade functions
function getUpgradePrice(upgradeType) {
    const config = upgradeConfigs[upgradeType];
    const level = upgrades[upgradeType].level;
    if (upgradeType === 'artifactSlots') {
        return Math.floor(config.basePrice * Math.pow(config.priceMultiplier, level));
    } else {
        return Math.floor(config.basePrice * Math.pow(config.priceMultiplier, level));
    }
}

function getCurrentUpgradeValue(upgradeType) {
    const config = upgradeConfigs[upgradeType];
    return config.baseValue + (upgrades[upgradeType].level * config.valueIncrease);
}

function getNextUpgradeValue(upgradeType) {
    const config = upgradeConfigs[upgradeType];
    return config.baseValue + ((upgrades[upgradeType].level + 1) * config.valueIncrease);
}

function getCurrentTrackSpeedDisplay() {
    const baseSpeed = 100; // 100% = 1x speed
    const upgradeBonus = upgrades.trackSpeed.level * upgradeConfigs.trackSpeed.valueIncrease;
    return baseSpeed + upgradeBonus;
}

function getNextTrackSpeedDisplay() {
    const baseSpeed = 100; // 100% = 1x speed
    const upgradeBonus = (upgrades.trackSpeed.level + 1) * upgradeConfigs.trackSpeed.valueIncrease;
    return baseSpeed + upgradeBonus;
}

function canBuyUpgrade(upgradeType) {
    const upgrade = upgrades[upgradeType];
    return upgrade.level < upgrade.maxLevel && money >= getUpgradePrice(upgradeType);
}

function buyUpgrade(upgradeType) {
    if (!canBuyUpgrade(upgradeType)) {
        const config = upgradeConfigs[upgradeType];
        if (upgrades[upgradeType].level >= upgrades[upgradeType].maxLevel) {
            showMessage(`${config.name} đã đạt cấp tối đa!`);
        } else {
            showMessage(`Không đủ tiền để mua ${config.name}!`);
        }
        return false;
    }

    const price = getUpgradePrice(upgradeType);
    money -= price;
    upgrades[upgradeType].level++;

    const config = upgradeConfigs[upgradeType];
    showMessage(`Đã nâng cấp ${config.name} lên cấp ${upgrades[upgradeType].level}!`);

    updateUpgradesUI();
    updateMainUI();
    saveGame();
    return true;
}

// Game data
let charactersOnTrack = [];
let purchasedCharacters = [];
let currentSort = 'mps'; // Mặc định sắp xếp theo MPS

// New Dungeon state variables
let dungeonFloor = 1;
let dungeonHighestFloor = 1; // Highest floor reached (for restart point)
let dragonTokens = 0;
let potions = 0;
let isDungeonActive = false;
let dungeonTimeLeft = 10; // seconds
let dungeonBossHP = 0;
let dungeonBossMaxHP = 0;
let dungeonTimer = null;
const dungeonBossHPBase = 50;
const dungeonBossHPScale = 1.25;
const dungeonRewardMoneyBase = 500;
const dungeonRewardDragonTokenBase = 2;
const dungeonPotionDropBase = 1;
let dungeonCooldown = 0; // Thêm biến cooldown
const dungeonCooldownTime = 150; // 150 giây cooldown

// New Artifacts and Gacha Variables
let ownedArtifacts = [];
let equippedArtifacts = [];
const artifactPrice = 50;

// Upgrades Variables
let upgrades = {
    characterSlots: { level: 0, maxLevel: 5 },
    artifactSlots: { level: 0, maxLevel: 3 },
    characterStorage: { level: 0, maxLevel: 5 },
    artifactStorage: { level: 0, maxLevel: 5 },
    trackSpeed: { level: 0, maxLevel: 5 }
};

// Upgrade configurations
const upgradeConfigs = {
    characterSlots: {
        basePrice: 5000,
        priceMultiplier: 10,
        baseValue: 10,
        valueIncrease: 1,
        name: "Slot Trang Bị Nhân Vật"
    },
    artifactSlots: {
        basePrice: 100000,
        priceMultiplier: 1.25,
        baseValue: 3,
        valueIncrease: 1,
        name: "Slot Trang Bị Di Vật"
    },
    characterStorage: {
        basePrice: 10000,
        priceMultiplier: 1.5,
        baseValue: 30,
        valueIncrease: 5,
        name: "Slot Kho Nhân Vật"
    },
    artifactStorage: {
        basePrice: 10000,
        priceMultiplier: 1.5,
        baseValue: 15,
        valueIncrease: 5,
        name: "Slot Kho Di Vật"
    },
    trackSpeed: {
        basePrice: 100,
        priceMultiplier: 2,
        baseValue: 0,
        valueIncrease: 10,
        name: "Tốc Độ Đường Chạy"
    }
};

// UI elements - will be initialized in window.onload
let moneyDisplay, mpsDisplay, mainDragonTokensDisplay, characterTrack;
let manageButton, settingsButton, manageModal, modalCloseButton;
let purchasedCharactersGrid, equippedCountDisplay, messageBox;
let settingsModal, settingsModalCloseButton, darkModeToggle;
let saveGameButton, loadGameButton, resetGameButton;
let codeInput, redeemCodeButton;
let dungeonButton, dungeonModal, dungeonModalCloseButton;
let currentFloorDisplay, dragonTokensDisplay, potionsDisplay;
let bossImage, bossName, bossHpBar, bossHpText, dungeonTimerDisplay;
let startDungeonButton, dungeonEndButton;
let gachaButton, artifactsButton, gachaModal, gachaModalCloseButton;
let rollArtifactButton, gachaResultContainer, gachaAnimation;
let artifactModal, artifactModalCloseButton, ownedArtifactsGrid;
let upgradesButton, upgradesModal, upgradesModalCloseButton;

// Music state
const tracks = Array.from({length:14}, (_,i)=>({
    src: `music/music-play/track-${i+1}.mp3`,
    icon: `music/icon/track-${i+1}.png`,
    title: `Track ${i+1}`
}));
let currentTrackIndex = 0;
let audio = new Audio();
audio.preload = 'auto';
audio.loop = false; // we will chain to next
let musicVolume = 0.7; // default 70%

// Hàm rút gọn số lớn (ví dụ: 1000 -> 1K, 1000000 -> 1M)
function formatNumber(num) {
    if (num === null || num === undefined) {
        return '0';
    }
    num = Math.floor(num);
    if (num >= 1000000000000) {
        return (num / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
    }
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toLocaleString();
}

// Code redeem logic
let redeemedCodes = JSON.parse(localStorage.getItem('redeemedCodes') || '[]');

function redeemCode(code) {
    code = code.trim().toLowerCase();
    if (!code) {
        showMessage('Vui lòng nhập mã code!');
        return;
    }
    if (redeemedCodes.includes(code)) {
        showMessage('Mã này đã được sử dụng!');
        return;
    }
    if (code === 'phophuc') {
        money += 5000;
        updateMainUI();
        redeemedCodes.push(code);
        localStorage.setItem('redeemedCodes', JSON.stringify(redeemedCodes));
        showMessage('Nhận thành công 5000 tiền!');
    } else {
        showMessage('Mã không hợp lệ!');
    }
}

// Character rarity data from CSV
const allCharacters = [
    { name: 'Naruto', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNaOLM9f4e-OUmxgDB-RlglSW7JVO_9yYbPA&s', rarity: 'Common', mps: 2, probability: 19.25, price: 120 },
    { name: 'Luffy', image: 'https://wallpapers.com/images/hd/luffy-1920-x-1920-picture-ee9gghzfh6x5rq4k.jpg', rarity: 'Common', mps: 4, probability: 19.25, price: 240 },
    { name: 'Deku', image: 'https://i.pinimg.com/736x/d3/48/c3/d348c3e711d8fe006b25391c757a553e.jpg', rarity: 'Common', mps: 8, probability: 19.25, price: 480 },
    { name: 'Tanjiro', image: 'https://4kwallpapers.com/images/wallpapers/tanjiro-kamado-2048x2048-17622.jpg', rarity: 'Common', mps: 12, probability: 19.25, price: 720 },
    { name: 'Sasuke', image: 'https://www.narusakuwiki.com/images/9/97/Sasuke_Uchiha_Fanon_Profile.png', rarity: 'Rare', mps: 25, probability: 3.5, price: 15000 },
    { name: 'Zoro', image: 'https://sketchok.com/images/articles/06-anime/002-one-piece/31/18m.jpg', rarity: 'Rare', mps: 35, probability: 3.5, price: 21000 },
    { name: 'Asta', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_J3KdWg4MX0kLTtPgqaiVCScOz_e3ZHy41Q&s', rarity: 'Rare', mps: 50, probability: 3.5, price: 30000 },
    { name: 'Inosuke', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHLzdRlP4b-11YYgiwd4KS_xI6C8mUYvEeJw&s', rarity: 'Rare', mps: 80, probability: 3.5, price: 48000 },
    { name: 'Kakashi', image: 'https://shop.viz.com/cdn/shop/files/NS-KAST_1_1445x.jpg?v=1745337616', rarity: 'Epic', mps: 120, probability: 1.625, price: 432000 },
    { name: 'Law', image: 'https://i.pinimg.com/736x/f0/4c/2f/f04c2f13060139d113ab798b50b1f9c1.jpg', rarity: 'Epic', mps: 170, probability: 1.625, price: 612000 },
    { name: 'Gojo', image: 'https://i.scdn.co/image/ab67616d00001e02469cb4f2e0a31eb0c2b5a320', rarity: 'Epic', mps: 230, probability: 1.625, price: 828000 },
    { name: 'Yuta', image: 'https://images.steamusercontent.com/ugc/2316601738462923790/493E4DC850321CE066CBB994AEF573B6C110F4FD/?imw=512&&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false', rarity: 'Epic', mps: 300, probability: 1.625, price: 1080000 },
    { name: 'Madara', image: 'https://static.wikia.nocookie.net/naruto-shippuden-ultimate-ninja-blazing/images/1/1b/Portrait-2098.png/revision/latest?cb=20200616085941', rarity: 'Legend', mps: 600, probability: 0.6, price: 10800000 },
    { name: 'Shanks', image: 'https://preview.redd.it/jfzt9e6cxqq91.jpg?width=640&crop=smart&auto=webp&s=c44a568b5dcc554e8f4dcbc46d4a5cb1cba26689', rarity: 'Legend', mps: 900, probability: 0.6, price: 16200000 },
    { name: 'Denji', image: 'https://img.artpal.com/577431/9-21-3-8-23-43-33m.jpg', rarity: 'Legend', mps: 1300, probability: 0.6, price: 23400000 },
    { name: 'Rengoku', image: 'https://i1.sndcdn.com/artworks-xBU7EmBX72N16AKy-2E19mw-t500x500.jpg', rarity: 'Legend', mps: 1900, probability: 0.6, price: 34200000 },
    { name: 'Itadori', image: 'https://4kwallpapers.com/images/wallpapers/yuji-itadori-fan-2048x2048-16498.jpg', rarity: 'Mythic', mps: 7000, probability: 0.0225, price: 604800000 },
    { name: 'Sukuna', image: 'https://www.animedep.com/wp-content/uploads/2025/04/anh-anime-sukuna-36.webp', rarity: 'Mythic', mps: 11000, probability: 0.0225, price: 950400000 },
    { name: 'Genos', image: 'https://i.scdn.co/image/ab67616d00001e0250965347d7c3403272641545', rarity: 'Mythic', mps: 17000, probability: 0.0225, price: 1468800000 },
    { name: 'Megumi', image: 'https://www.galeriemichael.com/wp-content/uploads/2024/03/anh-megumi-fushiguro_27.jpeg', rarity: 'Mythic', mps: 28000, probability: 0.0225, price: 2419200000 },
    { name: 'Gabimaru', image: 'https://i1.sndcdn.com/artworks-5j7MESPbpk59J3Qq-X5zq4Q-t500x500.jpg', rarity: 'Secret', mps: 150000, probability: 0.00225, price: 90720000000 },
    { name: 'Aizen', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnerstWMk0FgQD2NoTDz92VHR3sgGopitmxQ&s', rarity: 'Secret', mps: 220000, probability: 0.00225, price: 133056000000 },
    { name: 'Super Bakugo', image: 'https://www.lemon8-app.com/seo/image?item_id=7458863315797148206&index=8&sign=c43e951551631dfce03fa18676155b86', rarity: 'Secret', mps: 320000, probability: 0.00225, price: 193536000000 },
    { name: 'Eren', image: 'https://images.genius.com/bd3eb45ee36f64c40df06cc89b1dc6be.1000x1000x1.png', rarity: 'Secret', mps: 450000, probability: 0.00225, price: 272160000000 },
    { name: 'Levi', image: 'https://www.animedep.com/wp-content/uploads/2025/05/anh-levi-3.webp', rarity: 'Super God', mps: 5000000, probability: 0.00025, price: 12960000000000 },
    { name: 'Zenitsu', image: 'https://4kwallpapers.com/images/wallpapers/zenitsu-agatsuma-2048x2048-17046.jpg', rarity: 'Super God', mps: 8000000, probability: 0.00025, price: 20736000000000 },
    { name: 'Saitama', image: 'https://wallpapers-clan.com/wp-content/uploads/2023/01/one-punch-man-saitama-pfp-1.jpg', rarity: 'Super God', mps: 12000000, probability: 0.00025, price: 31104000000000 },
    { name: 'Goku Ultra Instinct', image: 'https://i.redd.it/eqdnchgddl8c1.jpeg', rarity: 'Super God', mps: 20000000, probability: 0.00025, price: 51840000000000 },
];

const dungeonBosses = [
    { name: 'Geto', image: 'https://wibu.com.vn/wp-content/uploads/2025/02/Geto-Suguru.png' },
    { name: 'Muzan', image: 'https://wibu.com.vn/wp-content/uploads/2024/04/Kibutsuji-Muzan.png' },
    { name: 'Titan', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR18VlRZjB2CSv1fc2SYtcCNn_udfcNn4dNNQ&s' },
    { name: 'Orochimaru', image: 'https://wibu.com.vn/wp-content/uploads/2024/04/Orochimaru-Naruto.png' },
];

// Artifacts data (5 categories with variants - Total: 100%)
const allArtifacts = [
    // 1. Income Boost Artifacts (19.8% total)
    { name: 'Coin Pouch', image: 'https://enka.network/ui/UI_RelicIcon_14001_1.png', tier: 'Sơ cấp', effect: 'Tăng 25% thu nhập', value: 0.25, dropRate: 8 },
    { name: 'Lucky Charm', image: 'https://enka.network/ui/UI_RelicIcon_14002_2.png', tier: 'Sơ cấp', effect: 'Tăng 30% thu nhập', value: 0.30, dropRate: 6 },
    { name: 'Gold Multiplier', image: 'https://enka.network/ui/UI_RelicIcon_15021_2.png', tier: 'Bậc thầy', effect: 'Tăng 75% thu nhập', value: 0.75, dropRate: 3 },
    { name: 'Prosperity Ring', image: 'https://enka.network/ui/UI_RelicIcon_15022_3.png', tier: 'Bậc thầy', effect: 'Tăng 90% thu nhập', value: 0.90, dropRate: 2.6 },
    { name: 'Wealth Crown', image: 'https://enka.network/ui/UI_RelicIcon_15032_4.png', tier: 'Tối thượng', effect: 'Tăng 150% thu nhập', value: 1.5, dropRate: 0.2 },

    // 2. Dungeon Gold Artifacts (19.8% total)
    { name: 'Treasure Map', image: 'https://enka.network/ui/UI_RelicIcon_15003_2.png', tier: 'Sơ cấp', effect: 'Tăng 50% tiền từ dungeon', value: 0.5, dropRate: 8 },
    { name: 'Gold Detector', image: 'https://enka.network/ui/UI_RelicIcon_15023_2.png', tier: 'Sơ cấp', effect: 'Tăng 60% tiền từ dungeon', value: 0.6, dropRate: 6 },
    { name: 'Golden Compass', image: 'https://enka.network/ui/UI_RelicIcon_15004_3.png', tier: 'Bậc thầy', effect: 'Tăng 100% tiền từ dungeon', value: 1.0, dropRate: 3 },
    { name: 'Midas Touch', image: 'https://enka.network/ui/UI_RelicIcon_15024_3.png', tier: 'Bậc thầy', effect: 'Tăng 120% tiền từ dungeon', value: 1.2, dropRate: 2.6 },
    { name: 'Dragon Hoard', image: 'https://enka.network/ui/UI_RelicIcon_15005_4.png', tier: 'Tối thượng', effect: 'Tăng 200% tiền từ dungeon', value: 2.0, dropRate: 0.2 },

    // 3. Dragon Token Artifacts (19.8% total)
    { name: 'Token Charm', image: 'https://enka.network/ui/UI_RelicIcon_15006_2.png', tier: 'Sơ cấp', effect: 'Tăng 2 Dragon Token từ dungeon', value: 2, dropRate: 8 },
    { name: 'Dragon Whistle', image: 'https://enka.network/ui/UI_RelicIcon_15025_2.png', tier: 'Sơ cấp', effect: 'Tăng 3 Dragon Token từ dungeon', value: 3, dropRate: 6 },
    { name: 'Dragon Scale', image: 'https://enka.network/ui/UI_RelicIcon_15005_5.png', tier: 'Bậc thầy', effect: 'Tăng 5 Dragon Token từ dungeon', value: 5, dropRate: 3 },
    { name: 'Dragon Heart', image: 'https://enka.network/ui/UI_RelicIcon_15026_3.png', tier: 'Bậc thầy', effect: 'Tăng 6 Dragon Token từ dungeon', value: 6, dropRate: 2.6 },
    { name: 'Ancient Relic', image: 'https://enka.network/ui/UI_RelicIcon_15007_4.png', tier: 'Tối thượng', effect: 'Tăng 10 Dragon Token từ dungeon', value: 10, dropRate: 0.2 },

    // 4. Dungeon Damage Artifacts (19.8% total)
    { name: 'Sharp Blade', image: 'https://honkailab.com/wp-content/uploads/2023/04/Hunter-of-Glacial-Forest-weapon.webp', tier: 'Sơ cấp', effect: 'Tăng 50% sát thương dungeon', value: 0.5, dropRate: 8 },
    { name: 'Battle Axe', image: 'https://honkailab.com/wp-content/uploads/2023/03/Band-of-Sizzling-Thunder-weapon.webp', tier: 'Sơ cấp', effect: 'Tăng 60% sát thương dungeon', value: 0.6, dropRate: 6 },
    { name: 'War Banner', image: 'https://honkailab.com/wp-content/uploads/2023/11/Grand-Dukes-Ceremonial-weapon.webp', tier: 'Bậc thầy', effect: 'Tăng 125% sát thương dungeon', value: 1.25, dropRate: 3 },
    { name: 'Demon Slayer', image: 'https://honkailab.com/wp-content/uploads/2023/03/Genius-of-Brilliant-Stars-weapon.webp', tier: 'Bậc thầy', effect: 'Tăng 150% sát thương dungeon', value: 1.5, dropRate: 2.6 },
    { name: 'Godslayer', image: 'https://honkailab.com/wp-content/uploads/2024/01/Pioneer-Diver-of-Dead-Waters.webp', tier: 'Tối thượng', effect: 'Tăng 250% sát thương dungeon', value: 2.5, dropRate: 0.2 },

    // 5. Movement Speed Artifacts (19.8% total)
    { name: 'Swift Boots', image: 'https://enka.network/ui/UI_RelicIcon_15002_2.png', tier: 'Sơ cấp', effect: 'Tăng 15% tốc độ đường chạy', value: 0.15, dropRate: 8 },
    { name: 'Runner Shoes', image: 'https://enka.network/ui/UI_RelicIcon_15031_3.png', tier: 'Sơ cấp', effect: 'Tăng 18% tốc độ đường chạy', value: 0.18, dropRate: 6 },
    { name: 'Wind Walker', image: 'https://honkailab.com/wp-content/uploads/2023/04/Hunter-of-Glacial-Forest-boots.webp', tier: 'Bậc thầy', effect: 'Tăng 30% tốc độ đường chạy', value: 0.30, dropRate: 3 },
    { name: 'Lightning Step', image: 'https://honkailab.com/wp-content/uploads/2023/03/Band-of-Sizzling-Thunder-boots.webp', tier: 'Bậc thầy', effect: 'Tăng 35% tốc độ đường chạy', value: 0.35, dropRate: 2.6 },
    { name: 'Time Warp', image: 'https://honkailab.com/wp-content/uploads/2023/03/Genius-of-Brilliant-Stars-boots.webp', tier: 'Tối thượng', effect: 'Tăng 50% tốc độ đường chạy', value: 0.50, dropRate: 0.2 },

    // Special Artifact (1% total)
    { name: 'Omnipotent Orb', image: 'https://enka.network/ui/UI_RelicIcon_15008_5.png', tier: 'Huyền thoại', effect: 'Tăng 100% tất cả hiệu ứng', value: 1.0, dropRate: 1.0 }
];

const artifactTiers = {
    'Sơ cấp': { color: 'bg-gray-400', textColor: 'text-white' },
    'Bậc thầy': { color: 'bg-indigo-500', textColor: 'text-white' },
    'Tối thượng': { color: 'bg-yellow-500', textColor: 'text-black' },
    'Huyền thoại': { color: 'bg-gradient-to-r from-purple-500 to-pink-500', textColor: 'text-white' },
};
const totalArtifactDropRate = allArtifacts.reduce((sum, artifact) => sum + artifact.dropRate, 0);

// Character rarity data for styling and tier sorting
const rarityTiers = {
    'Common': { color: 'character-common', cardColor: 'character-card-common', tier: 1 },
    'Rare': { color: 'character-rare', cardColor: 'character-card-rare', tier: 2 },
    'Epic': { color: 'character-epic', cardColor: 'character-card-epic', tier: 3 },
    'Legend': { color: 'character-legend', cardColor: 'character-card-legend', tier: 4 },
    'Mythic': { color: 'character-mythic', cardColor: 'character-card-mythic', tier: 5 },
    'Secret': { color: 'character-secret', cardColor: 'character-card-secret', tier: 6 },
    'Super God': { color: 'character-super-god', cardColor: 'character-card-super-god', tier: 7 },
};
const totalRarityWeight = allCharacters.reduce((sum, char) => sum + char.probability, 0);

// New data structure for fuse tiers
const fuseTiers = {
    'Normal': { name: 'Golden', mpsMultiplier: 1.5, priceMultiplier: 3 },
    'Golden': { name: 'Rainbow', mpsMultiplier: 2, priceMultiplier: 3 },
    'Rainbow': { name: 'Ultra', mpsMultiplier: 3, priceMultiplier: 3 },
};

// Define initial game state
const initialGameState = {
    money: 120,
    moneyPerSecond: 0,
    nextCharacterId: 0,
    lastUpdate: Date.now(),
    purchasedCharacters: [],
    currentSort: 'mps',
    isDarkMode: false,
    dungeonFloor: 1,
    dungeonHighestFloor: 1,
    dragonTokens: 0,
    potions: 0,
    dungeonCooldown: 0,
    ownedArtifacts: [],
    equippedArtifacts: [],
    upgrades: {
        characterSlots: { level: 0, maxLevel: 5 },
        artifactSlots: { level: 0, maxLevel: 3 },
        characterStorage: { level: 0, maxLevel: 5 },
        artifactStorage: { level: 0, maxLevel: 5 },
        trackSpeed: { level: 0, maxLevel: 5 }
    },
};

// Function to save game state to localStorage
function saveGame() {
    const gameState = {
        money,
        moneyPerSecond,
        nextCharacterId,
        lastUpdate: Date.now(), // Update lastUpdate right before saving
        purchasedCharacters,
        currentSort,
        isDarkMode: document.body.classList.contains('dark-mode'),
        dungeonFloor,
        dungeonHighestFloor,
        dragonTokens,
        potions,
        dungeonCooldown,
        ownedArtifacts: ownedArtifacts.map(artifact => ({
            name: String(artifact.name),
            image: String(artifact.image),
            tier: String(artifact.tier),
            effect: String(artifact.effect),
            value: Number(artifact.value),
            dropRate: Number(artifact.dropRate),
            isLocked: Boolean(artifact.isLocked || false),
            id: artifact.id
        })),
        equippedArtifacts,
        upgrades,
        musicVolume,
        currentTrackIndex,
        isHardMode,
    };
    try {
        localStorage.setItem('animeTycoonSave', JSON.stringify(gameState));
        showMessage('Đã lưu game!');
    } catch (e) {
        console.error("Error saving game:", e);
        showMessage('Lỗi khi lưu game.');
    }
}

// Function to load game state from localStorage
function loadGame() {
    try {
        const savedState = localStorage.getItem('animeTycoonSave');
        if (savedState) {
            const gameState = JSON.parse(savedState);

            // Apply loaded state, with fallbacks for new properties
            money = gameState.money !== undefined ? gameState.money : initialGameState.money;
            moneyPerSecond = gameState.moneyPerSecond !== undefined ? gameState.moneyPerSecond : initialGameState.moneyPerSecond;
            nextCharacterId = gameState.nextCharacterId !== undefined ? gameState.nextCharacterId : initialGameState.nextCharacterId;
            purchasedCharacters = gameState.purchasedCharacters || initialGameState.purchasedCharacters;
            currentSort = gameState.currentSort || initialGameState.currentSort;
            dungeonFloor = gameState.dungeonFloor !== undefined ? gameState.dungeonFloor : initialGameState.dungeonFloor;
            dungeonHighestFloor = gameState.dungeonHighestFloor !== undefined ? gameState.dungeonHighestFloor : initialGameState.dungeonHighestFloor;
            dragonTokens = gameState.dragonTokens !== undefined ? gameState.dragonTokens : initialGameState.dragonTokens;
            potions = gameState.potions !== undefined ? gameState.potions : initialGameState.potions;
            dungeonCooldown = gameState.dungeonCooldown !== undefined ? gameState.dungeonCooldown : 0;
            // Load artifacts with deep copy to prevent reference issues
            ownedArtifacts = (gameState.ownedArtifacts || initialGameState.ownedArtifacts).map(artifact => ({
                name: String(artifact.name),
                image: String(artifact.image),
                tier: String(artifact.tier),
                effect: String(artifact.effect),
                value: Number(artifact.value),
                dropRate: Number(artifact.dropRate),
                isLocked: Boolean(artifact.isLocked || false),
                id: artifact.id
            }));
            equippedArtifacts = gameState.equippedArtifacts || initialGameState.equippedArtifacts;

            // Ensure all artifacts are completely independent
            ensureArtifactIndependence();

            // Load upgrades with fallback to default values
            if (gameState.upgrades) {
                Object.keys(upgrades).forEach(key => {
                    if (gameState.upgrades[key]) {
                        upgrades[key] = { ...upgrades[key], ...gameState.upgrades[key] };
                    }
                });
            }

            // Update dark mode
            const isDarkMode = gameState.isDarkMode !== undefined ? gameState.isDarkMode : initialGameState.isDarkMode;
            toggleDarkMode(isDarkMode);

            // Load Hard Mode
            isHardMode = gameState.isHardMode === true;
            const hardModeToggle = document.getElementById('hard-mode-toggle');
            if (hardModeToggle) hardModeToggle.checked = isHardMode;
            darkModeToggle.checked = isDarkMode;

            // Calculate offline earnings
            const now = Date.now();
            const offlineTimeSeconds = (now - (gameState.lastUpdate || now)) / 1000;
            const offlineMoney = offlineTimeSeconds * moneyPerSecond;
            money += offlineMoney;

            // Cập nhật cooldown sau khi offline
            dungeonCooldown = Math.max(0, dungeonCooldown - offlineTimeSeconds);

            lastUpdate = now; // Set lastUpdate to current time after loading

            updateStats(); // Recalculate stats based on loaded artifacts
            // Load music settings
            if (typeof gameState.musicVolume === 'number') {
                musicVolume = gameState.musicVolume;
                audio.volume = musicVolume;
                const slider = document.getElementById('music-volume');
                const label = document.getElementById('music-volume-value');
                if (slider) slider.value = String(Math.round(musicVolume*100));
                if (label) label.textContent = `${Math.round(musicVolume*100)}%`;
            }
            if (typeof gameState.currentTrackIndex === 'number') {
                currentTrackIndex = gameState.currentTrackIndex;
            }

            updateMainUI();
            updateDungeonUI();
            renderPurchasedCharacters();
            renderOwnedArtifacts();
            showMessage(`Đã tải game! Bạn đã kiếm được ${formatNumber(offlineMoney)} tiền khi offline.`);
        } else {
            // If no saved state, initialize with default values
            Object.assign(window, initialGameState); // Assign initial state to global variables
            updateStats();
            updateMainUI();
            updateDungeonUI();
            renderPurchasedCharacters();
            renderOwnedArtifacts();
            showMessage('Không tìm thấy dữ liệu game đã lưu. Bắt đầu game mới!');
        }
    } catch (e) {
        console.error("Error loading game:", e);
        showMessage('Lỗi khi tải game. Bắt đầu game mới!');
        // If loading fails, reset to initial state
        Object.assign(window, initialGameState);
        updateStats();
        updateMainUI();
        updateDungeonUI();
        renderPurchasedCharacters();
        renderOwnedArtifacts();
    }
}

// Function to reset game
function resetGame() {
    // Custom modal instead of confirm()
    const customConfirm = document.createElement('div');
    customConfirm.className = "modal-overlay";
    customConfirm.style.display = 'flex';
    customConfirm.innerHTML = `
        <div class="settings-modal-content text-center">
            <h2 class="text-xl font-bold mb-4">Reset Game</h2>
            <p class="mb-6">Bạn có chắc chắn muốn reset game? Toàn bộ tiến độ sẽ bị mất và không thể khôi phục.</p>
            <div class="flex justify-center gap-4">
                <button id="confirm-reset" class="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-700 transition-colors">Xác nhận</button>
                <button id="cancel-reset" class="px-6 py-2 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition-colors">Hủy</button>
            </div>
        </div>
    `;
    document.body.appendChild(customConfirm);

    document.getElementById('confirm-reset').addEventListener('click', () => {
        localStorage.clear(); // Clear all local storage data
        Object.assign(window, initialGameState); // Reset all game state variables
        charactersOnTrack = [];
        selectedCardId = null;
        toggleDarkMode(initialGameState.isDarkMode);
        darkModeToggle.checked = initialGameState.isDarkMode;
        updateStats(); // Recalculate stats after reset
        updateMainUI();
        updateDungeonUI();
        renderPurchasedCharacters();
        renderOwnedArtifacts();
        showMessage('Game đã được reset hoàn toàn!');
        customConfirm.remove();
        window.location.reload(); // Reload the page to ensure a clean state
    });

    document.getElementById('cancel-reset').addEventListener('click', () => {
        customConfirm.remove();
    });
}

// Function to select a character based on weight/probability
function getRandomCharacterByWeight() {
    let random = Math.random() * totalRarityWeight;
    let currentWeight = 0;

    for (const character of allCharacters) {
        currentWeight += character.probability;
        if (random < currentWeight) {
            return character;
        }
    }
    return allCharacters[allCharacters.length - 1]; // Fallback in case of rounding errors
}

// Function to show a temporary message
function showMessage(text) {
    messageBox.textContent = text;
    messageBox.classList.add('show');
    setTimeout(() => {
        messageBox.classList.remove('show');
    }, 2000);
}

// Updates money display with a quick "pop" effect
function updateMoneyDisplay() {
    moneyDisplay.textContent = formatNumber(money);
    moneyDisplay.classList.add('pop');
    setTimeout(() => {
        moneyDisplay.classList.remove('pop');
    }, 100);
}

// Function to create a new character element on the track
function createCharacterElement(character) {
    const charDiv = document.createElement('div');
    charDiv.id = `char-${character.id}`;
    charDiv.className = `character ${rarityTiers[character.rarity].color}`;
    charDiv.style.left = '-100px';

    // New HTML structure for character on track
    charDiv.innerHTML = `
        <img src="${character.image}" alt="${character.name}" class="character-image">
        <span class="character-name">${character.name}</span>
        <span class="character-rarity text-${character.rarity.toLowerCase().replace(' ', '-')}">${character.rarity}</span>
        <div class="buy-price">
            ${formatNumber(character.price)}
        </div>
    `;

    return charDiv;
}

// Spawns a new character on the track at specific position
function spawnCharacter(position = spawnPosition) {
    const randomCharacter = getRandomCharacterByWeight();

    const newCharacter = {
        id: nextCharacterId++,
        name: randomCharacter.name,
        image: randomCharacter.image,
        rarity: randomCharacter.rarity,
        price: randomCharacter.price,
        mps: randomCharacter.mps,
        baseMps: randomCharacter.mps, // New property for base mps
        basePrice: randomCharacter.price, // New property for base price
        fusedTier: 'Normal', // New property for fuse tier
        isEquipped: false, // New property for equipped status
        isLocked: false // New property for locked status
    };

    const charElement = createCharacterElement(newCharacter);
    charElement.style.left = `${position}px`;
    characterTrack.appendChild(charElement);
    charactersOnTrack.push({ element: charElement, data: newCharacter });

    // Update last character position
    lastCharacterPosition = position;
}

// Check if we need to spawn a new character
function checkSpawnNewCharacter() {
    const currentTime = Date.now();

    // Prevent spam spawning - minimum interval between spawns
    if (currentTime - lastSpawnTime < minSpawnInterval) {
        return;
    }

    // If no characters on track, spawn the first one
    if (charactersOnTrack.length === 0) {
        spawnCharacter(spawnPosition);
        lastCharacterPosition = spawnPosition;
        lastSpawnTime = currentTime;
        return;
    }

    // Find the leftmost character position (most recently spawned)
    let leftmostPosition = 1000;
    charactersOnTrack.forEach(({ element }) => {
        if (element) {
            const currentLeft = parseFloat(element.style.left);
            if (currentLeft < leftmostPosition) {
                leftmostPosition = currentLeft;
            }
        }
    });

    // Only spawn new character if the leftmost character has moved far enough from spawn point
    if (leftmostPosition >= spawnPosition + characterSpacing) {
        spawnCharacter(spawnPosition);
        lastCharacterPosition = spawnPosition;
        lastSpawnTime = currentTime;
    }
}

// Moves characters across the track
function moveCharacters(deltaTime) { // Accept deltaTime as argument
    const trackWidth = characterTrack.offsetWidth;

    for (let i = charactersOnTrack.length - 1; i >= 0; i--) {
        const { element } = charactersOnTrack[i];
        if (!element) continue;

        // Base speed is 1x, modified by hard mode and speed multiplier
        const baseSpeed = baseCharacterSpeed; // 50 pixels per second = 1x speed
        const hardModeMultiplier = isHardMode ? 2 : 1;
        const speedMultiplier = getTrackSpeedMultiplier();
        const finalSpeed = baseSpeed * hardModeMultiplier * speedMultiplier;

        const newLeft = parseFloat(element.style.left) + (finalSpeed * deltaTime / 1000);
        element.style.left = `${newLeft}px`;

        // Remove character if it passes the right edge of the screen
        if (newLeft > trackWidth + 120) { // Add 120px buffer to ensure complete disappearance
            element.remove();
            charactersOnTrack.splice(i, 1);
        }
    }
}

// Buys a character
function buyCharacter(characterId) {
    const characterIndex = charactersOnTrack.findIndex(c => c.data.id === characterId);
    if (characterIndex === -1) {
        return; // Character not found (already bought or passed)
    }
    const { element, data } = charactersOnTrack[characterIndex];

    if (money >= data.price) {
        const maxCharacters = getMaxOwnedCharacters();
        if (purchasedCharacters.length >= maxCharacters) {
            showMessage(`Đã đạt giới hạn nhân vật (${maxCharacters} nhân vật). Vui lòng bán một số nhân vật để mua thêm.`);
            return;
        }

        money -= data.price;

        // Remove from track
        element.remove();
        charactersOnTrack.splice(characterIndex, 1);

        // Add to purchased characters list
        const newChar = {
            id: nextCharacterId++,
            name: data.name,
            image: data.image,
            rarity: data.rarity,
            price: data.price,
            mps: data.mps,
            baseMps: data.mps, // New property for base mps
            basePrice: data.price, // New property for base price
            fusedTier: 'Normal', // New property for fuse tier
            isEquipped: false, // New property for equipped status
            isLocked: false // New property for locked status
        }; // Create a copy and initialize new properties

        const equippedCount = purchasedCharacters.filter(c => c.isEquipped).length;
        const maxEquipped = getEquippedLimit();
        if (equippedCount < maxEquipped) {
            newChar.isEquipped = true;
        } else {
            // find lowest mps equipped character to replace
            const equippedChars = purchasedCharacters.filter(c => c.isEquipped).sort((a,b) => a.mps - b.mps);
            if (equippedChars.length > 0 && newChar.mps > equippedChars[0].mps) {
                equippedChars[0].isEquipped = false;
                newChar.isEquipped = true;
            }
        }
        purchasedCharacters.push(newChar);

        updateStats();
        updateMainUI(); // Cập nhật UI chính sau khi mua
        showMessage(`Bạn đã mua ${data.name}!`);
    } else {
        showMessage("Không đủ tiền để mua nhân vật này!");
    }
}

// Toggles equip status
function toggleEquip(characterId) {
    const character = purchasedCharacters.find(c => c.id === characterId);
    if (!character) return;

    if (character.isEquipped) {
        character.isEquipped = false;
        showMessage(`Đã tháo trang bị cho ${character.name}.`);
    } else {
        const maxEquipped = getEquippedLimit();
        if (purchasedCharacters.filter(c => c.isEquipped).length < maxEquipped) {
            character.isEquipped = true;
            showMessage(`Đã trang bị cho ${character.name}!`);
        } else {
            showMessage(`Đã đạt giới hạn trang bị (${maxEquipped} nhân vật). Vui lòng tháo trang bị cho một nhân vật khác trước.`);
        }
    }
    updateStats();
    updateMainUI(); // Cập nhật UI sau khi thay đổi trạng thái
    renderPurchasedCharacters();
}

// Toggles locked status
function toggleLock(characterId) {
    const character = purchasedCharacters.find(c => c.id === characterId);
    if (!character) return;

    character.isLocked = !character.isLocked;
    showMessage(character.isLocked ? `Đã khóa ${character.name}.` : `Đã mở khóa ${character.name}.`);
    renderPurchasedCharacters();
}

// Sells a character
function sellCharacter(characterId) {
    const characterIndex = purchasedCharacters.findIndex(c => c.id === characterId);
    if (characterIndex === -1) return;

    const character = purchasedCharacters[characterIndex];
    if (character.isLocked) {
        showMessage("Không thể bán nhân vật đã bị khóa!");
        return;
    }

    const sellPrice = Math.floor(character.price * 0.25);
    money += sellPrice;

    // Remove from purchased characters list
    purchasedCharacters.splice(characterIndex, 1);

    updateStats();
    updateMainUI(); // Cập nhật UI sau khi bán
    renderPurchasedCharacters();
    showMessage(`Đã bán ${character.name} và nhận được ${formatNumber(sellPrice)} tiền.`);
}

// Sells all characters that are not equipped and not locked
function sellAllUnequipped() {
    let totalSold = 0;
    let totalMoney = 0;
    const toSell = purchasedCharacters.filter(c => !c.isEquipped && !c.isLocked);

    toSell.forEach(char => {
        totalMoney += Math.floor(char.price * 0.25);
        totalSold++;
    });

    // Remove sold characters from the list
    purchasedCharacters = purchasedCharacters.filter(c => c.isEquipped || c.isLocked);
    money += totalMoney;

    updateStats();
    updateMainUI(); // Cập nhật UI sau khi bán nhanh
    renderPurchasedCharacters();
    showMessage(`Đã bán ${totalSold} nhân vật và nhận được ${formatNumber(totalMoney)} tiền.`);
}

// Automatically equips the best characters
function autoEquip() {
    // Unequip all characters first
    purchasedCharacters.forEach(c => c.isEquipped = false);

    // Sort by mps in descending order
    const sortedCharacters = purchasedCharacters.sort((a, b) => b.mps - a.mps);

    // Equip the top N characters up to the limit
    const maxEquipped = getEquippedLimit();
    for (let i = 0; i < maxEquipped && i < sortedCharacters.length; i++) {
        sortedCharacters[i].isEquipped = true;
    }

    updateStats();
    updateMainUI(); // Cập nhật UI sau khi trang bị nhanh
    renderPurchasedCharacters();
    showMessage(`Đã tự động trang bị các nhân vật tốt nhất!`);
}

// Automatically fuses characters
function quickFuseCharacters() {
    let totalFusions = 0;
    let canFuseMore = true;

    while (canFuseMore) {
        canFuseMore = false;
        const fuseCandidates = {}; // Group characters by name and fusedTier

        purchasedCharacters.forEach(char => {
            if (!char.isLocked && char.fusedTier !== 'Ultra') {
                const key = `${char.name}-${char.fusedTier}`;
                if (!fuseCandidates[key]) {
                    fuseCandidates[key] = [];
                }
                fuseCandidates[key].push(char);
            }
        });

        for (const key in fuseCandidates) {
            const chars = fuseCandidates[key];
            while (chars.length >= 3) {
                const baseCharacter = chars.shift(); // Take the first character as base
                const char1 = chars.shift();
                const char2 = chars.shift();

                const charactersToRemove = [baseCharacter, char1, char2];

                const nextTier = fuseTiers[baseCharacter.fusedTier];
                const newMps = baseCharacter.baseMps * nextTier.mpsMultiplier;
                const newPrice = baseCharacter.basePrice * nextTier.priceMultiplier;

                const newCharacter = {
                    id: nextCharacterId++,
                    name: baseCharacter.name,
                    image: baseCharacter.image,
                    rarity: baseCharacter.rarity,
                    price: newPrice,
                    mps: newMps,
                    baseMps: baseCharacter.baseMps,
                    basePrice: baseCharacter.basePrice,
                    fusedTier: nextTier.name,
                    isEquipped: false,
                    isLocked: false
                };

                // Remove old characters from the purchased list
                charactersToRemove.forEach(char => {
                    const index = purchasedCharacters.findIndex(c => c.id === char.id);
                    if (index > -1) {
                        purchasedCharacters.splice(index, 1);
                    }
                });

                // Add the new fused character to the list
                purchasedCharacters.push(newCharacter);
                totalFusions++;
                canFuseMore = true; // Indicate that a fusion occurred
            }
        }
    }

    if (totalFusions > 0) {
        updateStats();
        updateMainUI();
        renderPurchasedCharacters();
        showMessage(`Đã hợp nhất thành công ${totalFusions} lần!`);
    } else {
        showMessage('Không có nhân vật nào có thể hợp nhất.');
    }
}

// Fuses three characters of the same type to upgrade them
function fuseCharacter(characterId) {
    const baseCharacter = purchasedCharacters.find(c => c.id === characterId);
    if (!baseCharacter) return;

    if (baseCharacter.isLocked) {
        showMessage("Không thể hợp nhất nhân vật đã bị khóa!");
        return;
    }
    if (baseCharacter.fusedTier === 'Ultra') {
        showMessage("Nhân vật này đã đạt cấp độ cao nhất và không thể hợp nhất nữa!");
        return;
    }

    // Find all characters of the same name and current fused tier
    const charactersToFuse = purchasedCharacters.filter(c => c.name === baseCharacter.name && c.fusedTier === baseCharacter.fusedTier && c.id !== characterId && !c.isLocked);
    if (charactersToFuse.length < 2) {
        showMessage(`Bạn cần 2 nhân vật cùng loại không bị khóa để hợp nhất!`);
        return;
    }

    // Get the three characters to be fused (the selected one + 2 others)
    const charactersToRemove = [baseCharacter, charactersToFuse[0], charactersToFuse[1]];

    // Get the next fused tier info
    const nextTier = fuseTiers[baseCharacter.fusedTier];

    // Calculate new stats based on the base mps from the original character data
    const newMps = baseCharacter.baseMps * nextTier.mpsMultiplier;
    const newPrice = baseCharacter.basePrice * nextTier.priceMultiplier;

    // Create the new character object
    const newCharacter = {
        id: nextCharacterId++,
        name: baseCharacter.name,
        image: baseCharacter.image,
        rarity: baseCharacter.rarity,
        price: newPrice,
        mps: newMps,
        baseMps: baseCharacter.baseMps,
        basePrice: baseCharacter.basePrice,
        fusedTier: nextTier.name,
        isEquipped: false,
        isLocked: false
    };

    // Remove the old characters from the purchased list
    charactersToRemove.forEach(char => {
        const index = purchasedCharacters.findIndex(c => c.id === char.id);
        if (index > -1) {
            purchasedCharacters.splice(index, 1);
        }
    });

    // Add the new fused character to the list
    purchasedCharacters.push(newCharacter);

    // Update stats and UI
    updateStats();
    updateMainUI();
    renderPurchasedCharacters();
    showMessage(`Chúc mừng! Đã hợp nhất ${baseCharacter.name} lên cấp độ ${nextTier.name}!`);
}

// Sorting functions
function sortCharacters(criteria) {
    switch(criteria) {
        case 'mps':
            purchasedCharacters.sort((a, b) => b.mps - a.mps);
            break;
        case 'rarity':
            // Map rarity names to tiers for sorting
            const rarityTierMap = Object.keys(rarityTiers).reduce((map, key, index) => {
                map[key] = index + 1;
                return map;
            }, {});
            purchasedCharacters.sort((a, b) => rarityTierMap[b.rarity] - rarityTierMap[a.rarity]);
            break;
        case 'price':
            purchasedCharacters.sort((a, b) => b.price - a.price);
            break;
    }
    renderPurchasedCharacters();
}

// Renders purchased characters in the modal
function renderPurchasedCharacters() {
    purchasedCharactersGrid.innerHTML = ''; // Clear previous content

    const charactersToRender = [...purchasedCharacters];
    switch(currentSort) {
        case 'mps':
            charactersToRender.sort((a, b) => b.mps - a.mps);
            break;
        case 'rarity':
            const rarityTierMap = Object.keys(rarityTiers).reduce((map, key, index) => {
                map[key] = index + 1;
                return map;
            }, {});
            charactersToRender.sort((a, b) => rarityTierMap[b.rarity] - rarityTierMap[a.rarity]);
            break;
        case 'price':
            charactersToRender.sort((a, b) => b.price - a.price);
            break;
    }

    charactersToRender.forEach(char => {
        const charCard = document.createElement('div');
        const isSelected = char.id === selectedCardId;
        const isLocked = char.isLocked;
        const sameCharacters = purchasedCharacters.filter(c => c.name === char.name && c.fusedTier === char.fusedTier).length;
        const canFuse = sameCharacters >= 3 && char.fusedTier !== 'Ultra';

        charCard.className = `purchased-character-card ${rarityTiers[char.rarity].cardColor} ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`;
        charCard.setAttribute('data-id', char.id);

        const equipButton = `<button class="equip-button" data-id="${char.id}">${char.isEquipped ? 'Tháo' : 'Trang bị'}</button>`;
        const lockButton = `<button class="lock-button" data-id="${char.id}">${isLocked ? 'Mở khóa' : 'Khóa'}</button>`;
        const sellButton = `<button class="sell-button" data-id="${char.id}">Bán</button>`;
        const fuseButton = canFuse ? `<button class="fuse-button" data-id="${char.id}">Hợp nhất</button>` : '';

        charCard.innerHTML = `
            <span class="fused-tier-badge fused-tier-${char.fusedTier}">${char.fusedTier}</span>
            ${char.isEquipped ? '<div class="equipped-icon">⚡</div>' : ''}
            ${isLocked ? '<div class="locked-icon">🔒</div>' : ''}
            <img src="${char.image}" alt="${char.name}" class="character-image">
            <span class="card-rarity">${char.rarity}</span>
            <span class="card-name">${char.name}</span>
            <div class="card-stats">
                <p class="card-price-display">💸 <b>${formatNumber(Math.floor(char.price))}</b></p>
                <p class="card-mps-display">⚡ <b>${formatNumber(char.mps)}</b></p>
            </div>
            <div class="manage-buttons">
                ${equipButton}
                ${lockButton}
                ${sellButton}
                ${fuseButton}
            </div>
        `;
        purchasedCharactersGrid.appendChild(charCard);
    });
    const maxEquipped = getEquippedLimit();
    const maxCharacters = getMaxOwnedCharacters();
    equippedCountDisplay.textContent = `Đã trang bị: ${purchasedCharacters.filter(c => c.isEquipped).length}/${maxEquipped} | Trong kho: ${purchasedCharacters.length}/${maxCharacters}`;
}

// Get sorted artifacts based on current sort mode
function getSortedArtifacts() {
    const tierOrder = { 'Huyền thoại': 4, 'Tối thượng': 3, 'Bậc thầy': 2, 'Sơ cấp': 1 };

    return ownedArtifacts
        .map((artifact, index) => ({ artifact, originalIndex: index }))
        .sort((a, b) => {
            if (artifactSortMode === 'rarity') {
                // Sort by tier (rarity) descending
                const tierA = tierOrder[a.artifact.tier] || 0;
                const tierB = tierOrder[b.artifact.tier] || 0;
                if (tierA !== tierB) return tierB - tierA;
                // If same tier, sort by name
                return a.artifact.name.localeCompare(b.artifact.name);
            } else if (artifactSortMode === 'name') {
                return a.artifact.name.localeCompare(b.artifact.name);
            }
            return 0;
        });
}

// Renders owned artifacts in the modal
function renderOwnedArtifacts() {
    ownedArtifactsGrid.innerHTML = '';

    // Sort artifacts based on current sort mode
    const sortedArtifacts = getSortedArtifacts();

    sortedArtifacts.forEach(({ artifact, originalIndex }) => {
        const artifactCard = document.createElement('div');
        artifactCard.className = `artifact-card ${artifactTiers[artifact.tier].color} ${artifactTiers[artifact.tier].textColor}`;
        artifactCard.setAttribute('data-index', originalIndex);

        // Check if equipped
        const isEquipped = equippedArtifacts.includes(originalIndex);
        const equippedIcon = isEquipped ? '<div class="equipped-icon-artifact">⚡</div>' : '';
        const lockedIcon = artifact.isLocked ? '<div class="locked-icon-artifact">🔒</div>' : '';

        artifactCard.innerHTML = `
            ${equippedIcon}
            ${lockedIcon}
            <img src="${artifact.image}" alt="${artifact.name}" class="artifact-image">
            <div class="artifact-info">
                <p class="artifact-name font-bold">${artifact.name}</p>
                <p class="artifact-tier text-sm">${artifact.tier}</p>
                <p class="artifact-effect text-xs">${artifact.effect}</p>
            </div>
            <div class="artifact-actions mt-2 flex flex-col gap-1">
                <button class="equip-artifact-button bg-green-500 text-white px-2 py-1 rounded-full text-xs">${isEquipped ? 'Tháo' : 'Trang bị'}</button>
                <button class="lock-artifact-button bg-blue-500 text-white px-2 py-1 rounded-full text-xs">${artifact.isLocked ? 'Mở khóa' : 'Khóa'}</button>
                <button class="sell-artifact-button bg-red-500 text-white px-2 py-1 rounded-full text-xs ${artifact.isLocked ? 'opacity-50 cursor-not-allowed' : ''}">Bán</button>
            </div>
        `;
        ownedArtifactsGrid.appendChild(artifactCard);
    });

    // Update equipped artifacts count display
    const equippedArtifactsCountDisplay = document.getElementById('equipped-artifacts-count');
    const maxEquippedArtifacts = getEquippedArtifactsLimit();
    const maxArtifacts = getMaxOwnedArtifacts();
    if (equippedArtifactsCountDisplay) {
        equippedArtifactsCountDisplay.textContent = `Đã trang bị: ${equippedArtifacts.length}/${maxEquippedArtifacts} | Trong kho: ${ownedArtifacts.length}/${maxArtifacts}`;
    }
}

// Toggle artifact sort mode
function toggleArtifactSort() {
    if (artifactSortMode === 'rarity') {
        artifactSortMode = 'name';
    } else {
        artifactSortMode = 'rarity';
    }

    // Update button text
    const sortButton = document.getElementById('artifact-sort-button');
    if (sortButton) {
        sortButton.textContent = artifactSortMode === 'rarity' ? 'Sắp xếp: Độ hiếm' : 'Sắp xếp: Tên';
    }

    renderOwnedArtifacts();
}

// Unequip all artifacts
function unequipAllArtifacts() {
    if (equippedArtifacts.length === 0) {
        showMessage('Không có di vật nào được trang bị!');
        return;
    }

    const count = equippedArtifacts.length;
    equippedArtifacts.length = 0; // Clear array
    renderOwnedArtifacts();
    showMessage(`Đã tháo ${count} di vật!`);
}

// Sell all unlocked artifacts
function sellUnlockedArtifacts() {
    const unlockedArtifacts = ownedArtifacts.filter((artifact, index) =>
        !artifact.isLocked && !equippedArtifacts.includes(index)
    );

    if (unlockedArtifacts.length === 0) {
        showMessage('Không có di vật nào có thể bán!');
        return;
    }

    if (!confirm(`Bạn có chắc muốn bán ${unlockedArtifacts.length} di vật không khóa?`)) {
        return;
    }

    let totalValue = 0;
    const indicesToRemove = [];

    ownedArtifacts.forEach((artifact, index) => {
        if (!artifact.isLocked && !equippedArtifacts.includes(index)) {
            totalValue += Math.floor(artifact.value * 100); // Sell for 100 coins per value point
            indicesToRemove.push(index);
        }
    });

    // Remove artifacts in reverse order to maintain indices
    indicesToRemove.reverse().forEach(index => {
        ownedArtifacts.splice(index, 1);
        // Update equipped artifacts indices
        equippedArtifacts = equippedArtifacts.map(equippedIndex => {
            if (equippedIndex > index) return equippedIndex - 1;
            return equippedIndex;
        }).filter(equippedIndex => equippedIndex !== index);
    });

    money += totalValue;
    renderOwnedArtifacts();
    showMessage(`Đã bán ${unlockedArtifacts.length} di vật và nhận ${totalValue} coins!`);
}

// Toggle artifact lock status
function toggleArtifactLock(index) {
    if (index >= 0 && index < ownedArtifacts.length) {
        ownedArtifacts[index].isLocked = !ownedArtifacts[index].isLocked;
        renderOwnedArtifacts();
        const status = ownedArtifacts[index].isLocked ? 'khóa' : 'mở khóa';
        showMessage(`Đã ${status} di vật ${ownedArtifacts[index].name}!`);
    }
}

function equipArtifact(index) {
    if (equippedArtifacts.includes(index)) {
        equippedArtifacts = equippedArtifacts.filter(i => i !== index);
        showMessage(`Đã tháo trang bị di vật.`);
    } else {
        const maxEquippedArtifacts = getEquippedArtifactsLimit();
        if (equippedArtifacts.length < maxEquippedArtifacts) {
            equippedArtifacts.push(index);
            showMessage(`Đã trang bị di vật!`);
        } else {
            showMessage(`Đã đạt giới hạn trang bị (${maxEquippedArtifacts} di vật).`);
        }
    }
    updateStats();
    updateMainUI();
    renderOwnedArtifacts();
}

function sellArtifact(index) {
    const artifact = ownedArtifacts[index];

    if (artifact.isLocked) {
        showMessage('Không thể bán di vật đã khóa. Hãy mở khóa trước!');
        return;
    }

    if (equippedArtifacts.includes(index)) {
        showMessage('Không thể bán di vật đang trang bị.');
        return;
    }

    const sellPrice = artifactPrice / 2; // Bán với nửa giá
    dragonTokens += sellPrice;

    ownedArtifacts.splice(index, 1);

    // Update equipped artifacts indices after removal
    equippedArtifacts = equippedArtifacts.map(equippedIndex => {
        if (equippedIndex > index) return equippedIndex - 1;
        return equippedIndex;
    }).filter(equippedIndex => equippedIndex !== index);

    updateStats();
    updateMainUI();
    renderOwnedArtifacts();
    showMessage(`Đã bán ${artifact.name} và nhận được ${sellPrice} Dragon Token.`);
}

// Updates moneyPerSecond based on equipped characters and artifacts
function updateStats() {
    let baseMps = purchasedCharacters
        .filter(char => char.isEquipped)
        .reduce((total, char) => total + char.mps, 0);

    let incomeBoost = 0;

    equippedArtifacts.forEach(index => {
        const artifact = ownedArtifacts[index];
        if (artifact) {
            // Income boost artifacts
            if (artifact.name === 'Coin Pouch' || artifact.name === 'Lucky Charm' ||
                artifact.name === 'Gold Multiplier' || artifact.name === 'Prosperity Ring' ||
                artifact.name === 'Wealth Crown') {
                incomeBoost += artifact.value;
            }

            // Special omnipotent artifact (separate check, not else if)
            if (artifact.name === 'Omnipotent Orb') {
                incomeBoost += artifact.value;
            }
        }
    });

    moneyPerSecond = baseMps * (1 + incomeBoost);

    // Debug: Show income boost effect
    if (incomeBoost > 0) {
        console.log(`Income boost active: +${(incomeBoost * 100).toFixed(1)}% | Base MPS: ${baseMps} | Final MPS: ${moneyPerSecond}`);
    }
}

// This function now only updates the money and mps display, and does NOT render the character cards
function updateMainUI() {
    updateMoneyDisplay();
    mpsDisplay.textContent = formatNumber(moneyPerSecond);
    if (mainDragonTokensDisplay) {
        mainDragonTokensDisplay.textContent = dragonTokens.toLocaleString();
    }
}

// Updates dungeon UI
function updateDungeonUI() {
    currentFloorDisplay.textContent = `Tầng ${dungeonFloor} (Cao nhất: ${dungeonHighestFloor})`;
    dragonTokensDisplay.textContent = dragonTokens.toLocaleString();
    potionsDisplay.textContent = potions.toLocaleString();

    // Hiển thị trạng thái cooldown
    if (dungeonCooldown > 0) {
        startDungeonButton.disabled = true;
        startDungeonButton.textContent = `Cooldown: ${dungeonCooldown}s`;
    } else {
        startDungeonButton.disabled = false;
        startDungeonButton.textContent = `Bắt đầu Leo Hầm ngục`;
    }
}

// Dungeon Logic
function startDungeon() {
    if (dungeonCooldown > 0) {
        showMessage(`Hầm ngục đang cooldown, còn ${dungeonCooldown}s.`);
        return;
    }
    if (purchasedCharacters.filter(c => c.isEquipped).length === 0) {
        showMessage('Vui lòng trang bị ít nhất một nhân vật để vào hầm ngục!');
        return;
    }

    // Hide main game elements and show dungeon modal
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('game-dock').style.display = 'none';
    dungeonModal.style.display = 'flex';
    isDungeonActive = true;

    // Disable main game loop temporarily
    cancelAnimationFrame(window.gameLoopRequest);

    // Bắt đầu từ tầng cao nhất đã đạt được
    dungeonFloor = dungeonHighestFloor;
    startNextDungeonFloor();

    // Ẩn nút "Bắt đầu" và hiện nút "Thoát"
    startDungeonButton.style.display = 'none';
    dungeonEndButton.style.display = 'block';
}

function startNextDungeonFloor() {
    dungeonTimeLeft = 10;

    // Lấy boss từ mảng và luân phiên
    const bossIndex = (dungeonFloor - 1) % dungeonBosses.length;
    const boss = dungeonBosses[bossIndex];

    dungeonBossMaxHP = Math.floor(dungeonBossHPBase * Math.pow(dungeonBossHPScale, dungeonFloor - 1));
    dungeonBossHP = dungeonBossMaxHP;

    bossImage.src = boss.image;
    bossName.textContent = `Boss: ${boss.name}`;

    updateDungeonUI();
    updateBossUI();

    // Reset và bắt đầu timer mới cho tầng tiếp theo
    if (dungeonTimer) clearInterval(dungeonTimer);
    dungeonTimer = setInterval(dungeonLoop, 1000);
}

function dungeonLoop() {
    if (dungeonTimeLeft > 0) {
        let dungeonDamage = moneyPerSecond;
        let damageMultiplier = 0;

        equippedArtifacts.forEach(index => {
            const artifact = ownedArtifacts[index];
            if (artifact) {
                // Dungeon damage artifacts
                if (artifact.name === 'Sharp Blade' || artifact.name === 'Battle Axe' ||
                    artifact.name === 'War Banner' || artifact.name === 'Demon Slayer' ||
                    artifact.name === 'Godslayer') {
                    damageMultiplier += artifact.value;
                }
                // Special omnipotent artifact
                else if (artifact.name === 'Omnipotent Orb') {
                    damageMultiplier += artifact.value;
                }
            }
        });

        dungeonDamage = dungeonDamage * (1 + damageMultiplier);
        dungeonBossHP -= dungeonDamage;
        dungeonTimeLeft--;
        updateBossUI();

        if (dungeonBossHP <= 0) {
            // Đánh bại boss, leo lên tầng tiếp theo ngay lập tức
            dungeonFloor++;
            // Update highest floor reached
            if (dungeonFloor > dungeonHighestFloor) {
                dungeonHighestFloor = dungeonFloor;
            }
            startNextDungeonFloor();
        }
    } else {
        // Hết giờ, người chơi thua
        clearInterval(dungeonTimer);
        handleDungeonLoss();
    }
}

function updateBossUI() {
    const hpPercentage = Math.max(0, (dungeonBossHP / dungeonBossMaxHP) * 100);
    bossHpBar.style.width = `${hpPercentage}%`;
    bossHpText.textContent = `${formatNumber(dungeonBossHP)}/${formatNumber(dungeonBossMaxHP)} HP`;
    dungeonTimerDisplay.textContent = `${dungeonTimeLeft}s`;
}

function handleDungeonLoss() {
    let finalDungeonFloor = dungeonFloor > 1 ? dungeonFloor - 1 : 0;

    // Calculate rewards
    let moneyReward = dungeonRewardMoneyBase * finalDungeonFloor;
    let dragonTokenReward = dungeonRewardDragonTokenBase * finalDungeonFloor;
    let goldBonus = 0;
    let tokenBonus = 0;

    equippedArtifacts.forEach(index => {
        const artifact = ownedArtifacts[index];
        if (artifact) {
            // Dungeon gold artifacts
            if (artifact.name === 'Treasure Map' || artifact.name === 'Gold Detector' ||
                artifact.name === 'Golden Compass' || artifact.name === 'Midas Touch' ||
                artifact.name === 'Dragon Hoard') {
                goldBonus += artifact.value;
            }
            // Dragon token artifacts
            else if (artifact.name === 'Token Charm' || artifact.name === 'Dragon Whistle' ||
                     artifact.name === 'Dragon Scale' || artifact.name === 'Dragon Heart' ||
                     artifact.name === 'Ancient Relic') {
                tokenBonus += artifact.value;
            }
            // Special omnipotent artifact
            else if (artifact.name === 'Omnipotent Orb') {
                goldBonus += artifact.value;
                tokenBonus += artifact.value;
            }
        }
    });

    moneyReward += moneyReward * goldBonus;
    dragonTokenReward += tokenBonus;

    if (finalDungeonFloor > 0) {
        money += moneyReward;
        dragonTokens += dragonTokenReward;
        showMessage(`Bạn đã thua ở tầng ${dungeonFloor} nhưng nhận được phần thưởng của tầng ${finalDungeonFloor}: ${formatNumber(moneyReward)} tiền và ${dragonTokenReward} Dragon Token.`);
    } else {
        showMessage('Hết thời gian! Bạn đã thua ở tầng 1 và không nhận được phần thưởng.');
    }

    // Potion drop chance
    const potionDropChance = dungeonPotionDropBase + Math.floor((finalDungeonFloor - 1) / 20);
    const maxPotionChance = 6;
    const actualPotionDropChance = Math.min(potionDropChance, maxPotionChance);

    if (Math.random() * 100 < actualPotionDropChance) {
        potions++;
        showMessage(`Bạn nhận thêm một Bình máu từ tầng ${finalDungeonFloor}!`);
    }

    // Keep current floor as starting point for next run
    // dungeonFloor remains at the failed floor
    dungeonCooldown = dungeonCooldownTime; // Set cooldown

    endDungeon();
}

function endDungeon() {
    isDungeonActive = false;
    document.getElementById('game-container').style.display = 'flex';
    document.getElementById('game-dock').style.display = 'flex';
    dungeonModal.style.display = 'none';
    startDungeonButton.style.display = 'block';
    dungeonEndButton.style.display = 'none';
    updateMainUI();
    updateDungeonUI();

    // Restart main game loop
    window.gameLoopRequest = requestAnimationFrame(gameLoop);
}

// Helper function to create deep copy of artifact
function createArtifactCopy(artifact, customId = null) {
    return {
        name: String(artifact.name),
        image: String(artifact.image),
        tier: String(artifact.tier),
        effect: String(artifact.effect),
        value: Number(artifact.value),
        dropRate: Number(artifact.dropRate),
        isLocked: Boolean(artifact.isLocked || false),
        id: customId !== null ? customId : ownedArtifacts.length // Assign unique ID
    };
}

// Function to ensure all owned artifacts are independent copies
function ensureArtifactIndependence() {
    ownedArtifacts = ownedArtifacts.map((artifact, index) => {
        const independentCopy = {
            name: String(artifact.name),
            image: String(artifact.image),
            tier: String(artifact.tier),
            effect: String(artifact.effect),
            value: Number(artifact.value),
            dropRate: Number(artifact.dropRate),
            isLocked: Boolean(artifact.isLocked || false),
            id: artifact.id !== undefined ? artifact.id : index
        };

        // Debug: Check if this artifact exists in allArtifacts
        const templateArtifact = allArtifacts.find(a => a.name === artifact.name);
        if (templateArtifact) {
            console.log(`Ensuring independence for ${artifact.name}:`, {
                owned: independentCopy,
                template: templateArtifact,
                same_reference: independentCopy === templateArtifact
            });
        }

        return independentCopy;
    });
}

// Gacha functions
function drawArtifact() {
    if (dragonTokens < artifactPrice) {
        showMessage(`Bạn không đủ ${artifactPrice} Dragon Token để quay.`);
        return;
    }
    const maxArtifacts = getMaxOwnedArtifacts();
    if (ownedArtifacts.length >= maxArtifacts) {
        showMessage(`Kho di vật đã đầy! Bán bớt để quay tiếp.`);
        return;
    }

    dragonTokens -= artifactPrice;

    // Gacha animation
    gachaAnimation.style.display = 'flex';
    gachaResultContainer.style.display = 'none';
    rollArtifactButton.disabled = true;

    setTimeout(() => {
        gachaAnimation.style.display = 'none';
        gachaResultContainer.style.display = 'flex';
        rollArtifactButton.disabled = false;

        let random = Math.random() * totalArtifactDropRate;
        let currentDropRate = 0;
        let foundArtifact = null;

        for (const artifact of allArtifacts) {
            currentDropRate += artifact.dropRate;
            if (random < currentDropRate) {
                foundArtifact = artifact;
                break;
            }
        }

        const newArtifact = createArtifactCopy(foundArtifact);
        ownedArtifacts.push(newArtifact);

        renderGachaResult(newArtifact);
        updateMainUI();
        updateDungeonUI();

    }, 2000); // Animation duration
}

function renderGachaResult(artifact) {
    const resultDiv = document.getElementById('gacha-result');
    const artifactTierInfo = artifactTiers[artifact.tier] || { color: 'bg-gray-400', textColor: 'text-white' };

    resultDiv.innerHTML = `
        <img src="${artifact.image}" alt="${artifact.name}" class="w-24 h-24 object-cover rounded-lg mx-auto mb-2">
        <p class="font-bold text-lg">${artifact.name}</p>
        <p class="text-sm ${artifactTierInfo.textColor} ${artifactTierInfo.color} rounded-full px-2 py-1">${artifact.tier}</p>
        <p class="mt-2">${artifact.effect}</p>
    `;
}

// Music helpers
function loadTrack(index){
    currentTrackIndex = (index + tracks.length) % tracks.length;
    const t = tracks[currentTrackIndex];
    console.log('Loading track:', t.src);
    audio.src = t.src;
    updateMusicUI();
}

function playTrack(){
    audio.volume = musicVolume;
    audio.play().catch((err)=>{
        console.log('Autoplay blocked, will start on user interaction:', err);
        // Try to start music on any user click
        document.addEventListener('click', function startMusicOnClick() {
            audio.play().catch(()=>{});
            document.removeEventListener('click', startMusicOnClick);
        }, { once: true });
    });
    updatePlayPauseButton();
}

function playNext(){
    loadTrack(currentTrackIndex + 1);
    playTrack();
}

function playPrev(){
    loadTrack(currentTrackIndex - 1);
    playTrack();
}

function togglePlayPause(){
    if (audio.paused) {
        playTrack();
    } else {
        audio.pause();
        updatePlayPauseButton();
    }
}

function updateMusicUI(){
    const t = tracks[currentTrackIndex];
    const icon = document.getElementById('current-track-icon');
    const title = document.getElementById('current-track-title');
    const status = document.getElementById('current-track-status');
    if (icon) icon.src = t.icon;
    if (title) title.textContent = t.title;
    if (status) status.textContent = audio.paused ? 'Tạm dừng' : 'Đang phát';
}

function updatePlayPauseButton(){
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    if (audio.paused) {
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';
    } else {
        if (playIcon) playIcon.style.display = 'none';
        if (pauseIcon) pauseIcon.style.display = 'block';
    }
    updateMusicUI();
}

function initializeEventListeners() {
    // Music event listeners
    audio.addEventListener('ended', playNext);
    audio.addEventListener('play', updatePlayPauseButton);
    audio.addEventListener('pause', updatePlayPauseButton);

    // Music UI wiring
    const musicVolumeSlider = document.getElementById('music-volume');
    const musicVolumeValue = document.getElementById('music-volume-value');
    if (musicVolumeSlider){
        musicVolumeSlider.addEventListener('input', (e)=>{
            const val = parseInt(e.target.value, 10);
            musicVolume = Math.max(0, Math.min(1, val/100));
            audio.volume = musicVolume;
            if (musicVolumeValue) musicVolumeValue.textContent = `${val}%`;
            // persist
            const saved = JSON.parse(localStorage.getItem('animeTycoonSave') || '{}');
            saved.musicVolume = musicVolume;
            localStorage.setItem('animeTycoonSave', JSON.stringify(saved));
        });
    }

    // Music control event listeners
    const prevTrackBtn = document.getElementById('prev-track');
    const playPauseBtn = document.getElementById('play-pause');
    const nextTrackBtn = document.getElementById('next-track');

    if (prevTrackBtn) prevTrackBtn.addEventListener('click', playPrev);
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (nextTrackBtn) nextTrackBtn.addEventListener('click', playNext);

    // Main UI Event Listeners
    manageButton.addEventListener('click', () => {
        renderPurchasedCharacters();
        manageModal.style.display = 'flex';
    });

    modalCloseButton.addEventListener('click', () => {
        manageModal.style.display = 'none';
    });

    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });

    settingsModalCloseButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    darkModeToggle.addEventListener('change', (event) => {
        toggleDarkMode(event.target.checked);
    });

    // Hard mode toggle
    const hardModeToggle = document.getElementById('hard-mode-toggle');
    if (hardModeToggle) {
        hardModeToggle.addEventListener('change', (e) => {
            isHardMode = e.target.checked;
            saveGame(); // Save immediately to persist choice
            showMessage(isHardMode ? 'Hard Mode: Tốc độ đường chạy x2' : 'Hard Mode tắt');
        });
    }

    saveGameButton.addEventListener('click', saveGame);
    loadGameButton.addEventListener('click', loadGame);
    resetGameButton.addEventListener('click', resetGame);

    // Dungeon Event Listeners
    dungeonButton.addEventListener('click', () => {
        dungeonModal.style.display = 'flex';
        // Update UI on open
        updateDungeonUI();
        // Reset boss info for new challenge
        const bossIndex = (dungeonFloor - 1) % dungeonBosses.length;
        const boss = dungeonBosses[bossIndex];
        bossImage.src = boss.image;
        bossName.textContent = `Boss: ${boss.name}`;
        bossHpBar.style.width = '100%';
        bossHpText.textContent = '???';
        dungeonTimerDisplay.textContent = '10s';
        startDungeonButton.style.display = 'block';
        dungeonEndButton.style.display = 'none';
    });

    dungeonModalCloseButton.addEventListener('click', () => {
        dungeonModal.style.display = 'none';
    });

    startDungeonButton.addEventListener('click', startDungeon);
    dungeonEndButton.addEventListener('click', () => {
        // Stop the timer and end the dungeon
        clearInterval(dungeonTimer);
        handleDungeonLoss();
    });

    // Gacha Event Listeners
    gachaButton.addEventListener('click', () => {
        gachaModal.style.display = 'flex';
    });

    gachaModalCloseButton.addEventListener('click', () => {
        gachaModal.style.display = 'none';
    });

    rollArtifactButton.addEventListener('click', drawArtifact);

    artifactsButton.addEventListener('click', () => {
        renderOwnedArtifacts();
        artifactModal.style.display = 'flex';
    });

    artifactModalCloseButton.addEventListener('click', () => {
        artifactModal.style.display = 'none';
    });

    // Artifact management buttons
    document.getElementById('artifact-sort-button').addEventListener('click', toggleArtifactSort);
    document.getElementById('artifact-unequip-all').addEventListener('click', unequipAllArtifacts);
    document.getElementById('artifact-sell-unlocked').addEventListener('click', sellUnlockedArtifacts);

    // Artifact grid event listener
    ownedArtifactsGrid.addEventListener('click', (event) => {
        const target = event.target;
        const card = target.closest('.artifact-card');
        if (!card) return;
        const index = parseInt(card.dataset.index);

        if (target.classList.contains('equip-artifact-button')) {
            equipArtifact(index);
        } else if (target.classList.contains('sell-artifact-button')) {
            sellArtifact(index);
        } else if (target.classList.contains('lock-artifact-button')) {
            toggleArtifactLock(index);
        }
    });

    // Upgrades Event Listeners
    upgradesButton.addEventListener('click', () => {
        updateUpgradesUI();
        upgradesModal.style.display = 'flex';
    });

    upgradesModalCloseButton.addEventListener('click', () => {
        upgradesModal.style.display = 'none';
    });

    // Upgrade purchase buttons
    document.getElementById('buy-character-slots').addEventListener('click', () => {
        buyUpgrade('characterSlots');
    });

    document.getElementById('buy-artifact-slots').addEventListener('click', () => {
        buyUpgrade('artifactSlots');
    });

    document.getElementById('buy-character-storage').addEventListener('click', () => {
        buyUpgrade('characterStorage');
    });

    document.getElementById('buy-artifact-storage').addEventListener('click', () => {
        buyUpgrade('artifactStorage');
    });

    document.getElementById('buy-track-speed').addEventListener('click', () => {
        buyUpgrade('trackSpeed');
    });

    // Code redeem event listeners
    if (redeemCodeButton && codeInput) {
        redeemCodeButton.addEventListener('click', function() {
            redeemCode(codeInput.value);
            codeInput.value = '';
        });
        codeInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                redeemCode(codeInput.value);
                codeInput.value = '';
            }
        });
    }

    // Event delegation for character track to handle buy click
    characterTrack.addEventListener('click', (event) => {
        const charElement = event.target.closest('.character');
        if (charElement) {
            const characterId = parseInt(charElement.id.split('-')[1]);
            buyCharacter(characterId);
        }
    });

    // Event delegation for buttons in the modal
    manageModal.addEventListener('click', (event) => {
        const target = event.target;

        // Handle sort button
        if (target.classList.contains('sort-button')) {
            switch (currentSort) {
                case 'mps':
                    currentSort = 'rarity';
                    target.textContent = 'Sắp xếp: Độ hiếm';
                    break;
                case 'rarity':
                    currentSort = 'price';
                    target.textContent = 'Sắp xếp: Giá mua';
                    break;
                case 'price':
                    currentSort = 'mps';
                    target.textContent = 'Sắp xếp: Tiền/s';
                    break;
            }
            sortCharacters(currentSort);
        } else if (target.classList.contains('auto-equip')) {
            autoEquip();
        } else if (target.classList.contains('sell-unequipped')) {
            sellAllUnequipped();
        } else if (target.classList.contains('quick-fuse')) {
            quickFuseCharacters();
        }

        // Handle actions on individual characters via the menu
        const button = event.target.closest('button');
        if (button) {
            const characterId = parseInt(button.dataset.id);
            if (button.classList.contains('equip-button') || button.classList.contains('unequip-button')) {
                toggleEquip(characterId);
                selectedCardId = null; // Close menu after action
            } else if (button.classList.contains('sell-button')) {
                sellCharacter(characterId);
                selectedCardId = null;
            } else if (button.classList.contains('lock-button') || button.classList.contains('unlock-button')) {
                toggleLock(characterId);
                selectedCardId = null;
            } else if (button.classList.contains('fuse-button')) {
                fuseCharacter(characterId);
                selectedCardId = null;
            }
        }

        // Handle card selection
        const card = target.closest('.purchased-character-card');
        if (card && !target.closest('button')) {
            const characterId = parseInt(card.dataset.id);
            selectedCardId = selectedCardId === characterId ? null : characterId;
            renderPurchasedCharacters();
        }
    });
}

// Toggles dark mode
function toggleDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
}






// Game loop for earning money and spawning characters
let lastGameLoopTime = Date.now();
let lastCooldownTick = Date.now();

function gameLoop() {
    const now = Date.now();
    const deltaTime = now - lastGameLoopTime; // Milliseconds
    lastGameLoopTime = now;

    // Cập nhật cooldown
    const cooldownDelta = now - lastCooldownTick;
    if (cooldownDelta >= 1000) {
        if (dungeonCooldown > 0) {
            dungeonCooldown = Math.max(0, dungeonCooldown - 1);
            updateDungeonUI();
        }
        lastCooldownTick = now;
    }

    // Only update money if dungeon is not active
    if (!isDungeonActive) {
        // Update money
        money += (moneyPerSecond * deltaTime / 1000); // moneyPerSecond is per second, deltaTime is ms
        updateMainUI();

        // Handle character spawning based on distance
        checkSpawnNewCharacter();

        // Move characters
        moveCharacters(deltaTime);
    }

    window.gameLoopRequest = requestAnimationFrame(gameLoop);
}

// Update upgrades UI
function updateUpgradesUI() {
    // Character Slots
    const characterSlotsLevel = document.getElementById('character-slots-level');
    const currentCharacterSlots = document.getElementById('current-character-slots');
    const nextCharacterSlots = document.getElementById('next-character-slots');
    const characterSlotsPrice = document.getElementById('character-slots-price');
    const buyCharacterSlotsBtn = document.getElementById('buy-character-slots');

    if (characterSlotsLevel) {
        characterSlotsLevel.textContent = `Cấp ${upgrades.characterSlots.level}/${upgrades.characterSlots.maxLevel}`;
        currentCharacterSlots.textContent = getCurrentUpgradeValue('characterSlots');

        if (upgrades.characterSlots.level < upgrades.characterSlots.maxLevel) {
            nextCharacterSlots.textContent = getNextUpgradeValue('characterSlots');
            characterSlotsPrice.textContent = formatNumber(getUpgradePrice('characterSlots'));
            buyCharacterSlotsBtn.disabled = !canBuyUpgrade('characterSlots');
        } else {
            nextCharacterSlots.textContent = 'MAX';
            buyCharacterSlotsBtn.textContent = 'ĐÃ TỐI ĐA';
            buyCharacterSlotsBtn.disabled = true;
        }
    }

    // Artifact Slots
    const artifactSlotsLevel = document.getElementById('artifact-slots-level');
    const currentArtifactSlots = document.getElementById('current-artifact-slots');
    const nextArtifactSlots = document.getElementById('next-artifact-slots');
    const artifactSlotsPrice = document.getElementById('artifact-slots-price');
    const buyArtifactSlotsBtn = document.getElementById('buy-artifact-slots');

    if (artifactSlotsLevel) {
        artifactSlotsLevel.textContent = `Cấp ${upgrades.artifactSlots.level}/${upgrades.artifactSlots.maxLevel}`;
        currentArtifactSlots.textContent = getCurrentUpgradeValue('artifactSlots');

        if (upgrades.artifactSlots.level < upgrades.artifactSlots.maxLevel) {
            nextArtifactSlots.textContent = getNextUpgradeValue('artifactSlots');
            artifactSlotsPrice.textContent = formatNumber(getUpgradePrice('artifactSlots'));
            buyArtifactSlotsBtn.disabled = !canBuyUpgrade('artifactSlots');
        } else {
            nextArtifactSlots.textContent = 'MAX';
            buyArtifactSlotsBtn.textContent = 'ĐÃ TỐI ĐA';
            buyArtifactSlotsBtn.disabled = true;
        }
    }

    // Character Storage
    const characterStorageLevel = document.getElementById('character-storage-level');
    const currentCharacterStorage = document.getElementById('current-character-storage');
    const nextCharacterStorage = document.getElementById('next-character-storage');
    const characterStoragePrice = document.getElementById('character-storage-price');
    const buyCharacterStorageBtn = document.getElementById('buy-character-storage');

    if (characterStorageLevel) {
        characterStorageLevel.textContent = `Cấp ${upgrades.characterStorage.level}/${upgrades.characterStorage.maxLevel}`;
        currentCharacterStorage.textContent = getCurrentUpgradeValue('characterStorage');

        if (upgrades.characterStorage.level < upgrades.characterStorage.maxLevel) {
            nextCharacterStorage.textContent = getNextUpgradeValue('characterStorage');
            characterStoragePrice.textContent = formatNumber(getUpgradePrice('characterStorage'));
            buyCharacterStorageBtn.disabled = !canBuyUpgrade('characterStorage');
        } else {
            nextCharacterStorage.textContent = 'MAX';
            buyCharacterStorageBtn.textContent = 'ĐÃ TỐI ĐA';
            buyCharacterStorageBtn.disabled = true;
        }
    }

    // Artifact Storage
    const artifactStorageLevel = document.getElementById('artifact-storage-level');
    const currentArtifactStorage = document.getElementById('current-artifact-storage');
    const nextArtifactStorage = document.getElementById('next-artifact-storage');
    const artifactStoragePrice = document.getElementById('artifact-storage-price');
    const buyArtifactStorageBtn = document.getElementById('buy-artifact-storage');

    if (artifactStorageLevel) {
        artifactStorageLevel.textContent = `Cấp ${upgrades.artifactStorage.level}/${upgrades.artifactStorage.maxLevel}`;
        currentArtifactStorage.textContent = getCurrentUpgradeValue('artifactStorage');

        if (upgrades.artifactStorage.level < upgrades.artifactStorage.maxLevel) {
            nextArtifactStorage.textContent = getNextUpgradeValue('artifactStorage');
            artifactStoragePrice.textContent = formatNumber(getUpgradePrice('artifactStorage'));
            buyArtifactStorageBtn.disabled = !canBuyUpgrade('artifactStorage');
        } else {
            nextArtifactStorage.textContent = 'MAX';
            buyArtifactStorageBtn.textContent = 'ĐÃ TỐI ĐA';
            buyArtifactStorageBtn.disabled = true;
        }
    }

    // Track Speed
    const trackSpeedLevel = document.getElementById('track-speed-level');
    const currentTrackSpeed = document.getElementById('current-track-speed');
    const nextTrackSpeed = document.getElementById('next-track-speed');
    const trackSpeedPrice = document.getElementById('track-speed-price');
    const buyTrackSpeedBtn = document.getElementById('buy-track-speed');

    if (trackSpeedLevel) {
        trackSpeedLevel.textContent = `Cấp ${upgrades.trackSpeed.level}/${upgrades.trackSpeed.maxLevel}`;
        currentTrackSpeed.textContent = getCurrentTrackSpeedDisplay();

        if (upgrades.trackSpeed.level < upgrades.trackSpeed.maxLevel) {
            nextTrackSpeed.textContent = getNextTrackSpeedDisplay();
            trackSpeedPrice.textContent = formatNumber(getUpgradePrice('trackSpeed'));
            buyTrackSpeedBtn.disabled = !canBuyUpgrade('trackSpeed');
        } else {
            nextTrackSpeed.textContent = 'MAX';
            buyTrackSpeedBtn.textContent = 'ĐÃ TỐI ĐA';
            buyTrackSpeedBtn.disabled = true;
        }
    }
}

window.onload = function() {
    // Initialize DOM elements
    moneyDisplay = document.getElementById('money-display');
    mpsDisplay = document.getElementById('mps-display');
    mainDragonTokensDisplay = document.getElementById('main-dragon-tokens-display');
    characterTrack = document.getElementById('character-track-container');
    manageButton = document.getElementById('manage-button');
    settingsButton = document.getElementById('settings-button');
    manageModal = document.getElementById('manage-modal');
    modalCloseButton = manageModal.querySelector('.modal-close-button');
    purchasedCharactersGrid = document.getElementById('purchased-characters-grid');
    equippedCountDisplay = document.getElementById('equipped-count');
    messageBox = document.getElementById('message-box');
    settingsModal = document.getElementById('settings-modal');
    settingsModalCloseButton = settingsModal.querySelector('.modal-close-button');
    darkModeToggle = document.getElementById('dark-mode-toggle');
    saveGameButton = document.getElementById('save-game-button');
    loadGameButton = document.getElementById('load-game-button');
    resetGameButton = document.getElementById('reset-game-button');
    codeInput = document.getElementById('code-input');
    redeemCodeButton = document.getElementById('redeem-code-button');
    dungeonButton = document.getElementById('dungeon-button');
    dungeonModal = document.getElementById('dungeon-modal');
    dungeonModalCloseButton = dungeonModal.querySelector('.modal-close-button');
    currentFloorDisplay = document.getElementById('current-floor');
    dragonTokensDisplay = document.getElementById('dragon-tokens-display');
    potionsDisplay = document.getElementById('potions-display');
    bossImage = document.getElementById('boss-image');
    bossName = document.getElementById('boss-name');
    bossHpBar = document.getElementById('boss-hp-bar');
    bossHpText = document.getElementById('boss-hp-text');
    dungeonTimerDisplay = document.getElementById('dungeon-timer');
    startDungeonButton = document.getElementById('start-dungeon-button');
    dungeonEndButton = document.getElementById('dungeon-end-button');
    gachaButton = document.getElementById('gacha-button');
    artifactsButton = document.getElementById('artifacts-button');
    gachaModal = document.getElementById('gacha-modal');
    gachaModalCloseButton = gachaModal.querySelector('.modal-close-button');
    rollArtifactButton = document.getElementById('roll-artifact-button');
    gachaResultContainer = document.getElementById('gacha-result-container');
    gachaAnimation = document.getElementById('gacha-animation');
    artifactModal = document.getElementById('artifact-modal');
    artifactModalCloseButton = artifactModal.querySelector('.modal-close-button');
    ownedArtifactsGrid = document.getElementById('owned-artifacts-grid');
    upgradesButton = document.getElementById('upgrades-button');
    upgradesModal = document.getElementById('upgrades-modal');
    upgradesModalCloseButton = upgradesModal.querySelector('.modal-close-button');

    // Initialize event listeners
    initializeEventListeners();

    // Thêm cấp độ vào thuộc tính hiếm để sắp xếp
    const rarityTierMap = Object.keys(rarityTiers).reduce((map, key, index) => {
        map[key] = index + 1;
        return map;
    }, {});
    allCharacters.forEach(char => char.tier = rarityTierMap[char.rarity]);

    // Tải game đã lưu khi trang được tải
    loadGame();
    // Nhạc: tải bài đầu tiên và phát (autoplay có thể bị chặn cho đến khi có tương tác)
    console.log('Initializing music, currentTrackIndex:', currentTrackIndex);
    loadTrack(currentTrackIndex);
    playTrack();

    // Bắt đầu game loop
    window.gameLoopRequest = requestAnimationFrame(gameLoop);
};

window.addEventListener('beforeunload', () => {
    // Tự động lưu game trước khi người chơi rời khỏi trang
    saveGame();
});
