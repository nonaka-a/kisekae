// 各パーツの重ね順（depth）を定義
const DEPTH = {
    BACKGROUND: 0,
    ACC_B: 5, // アクセB (背景のすぐ上)
    HAIR_BACK: 10,
    BODY: 20,
    BOTTOM: 30,
    SHOES: 35,
    INNER: 40,
    OUTER: 45,
    HEAD: 50,
    HAIR_FRONT: 60,
    ACC_A: 70 // アクセA (最前面)
};
// ★変更点：backgroundのアイテム数を1に変更（background_01.pngを想定）
const ITEM_COUNTS = { hair: 6, outer: 4, inner: 8, bottom: 9, shoes: 8, accA: 3, accB: 2, background: 7 };
let ITEMS = {};
const FAVORITES_KEY = 'myDressUpFavorites';

const config = {
    type: Phaser.AUTO, width: 600, height: 850, parent: 'game-container', transparent: true,
    backgroundColor: '#ffffff',
    render: { preserveDrawingBuffer: true },
    scene: { preload: preload, create: create }
};

function generateItemData() {
    const categoryNames = { hair: 'かみ', outer: 'うわぎ', inner: 'シャツ', bottom: 'ズボン', shoes: 'くつ', accA: 'アクセA', accB: 'アクセB', background: 'はいけい' };
    for (const category in ITEM_COUNTS) {
        ITEMS[category] = [];
        if (category !== 'background') {
            ITEMS[category].push({ id: 'none', name: 'なし', parts: [] });
        }
        const count = ITEM_COUNTS[category];
        for (let i = 1; i <= count; i++) {
            const num = i.toString().padStart(2, '0');
            const item = { id: `${category}_${num}`, name: `${categoryNames[category]} ${i}`, parts: [] };
            if (category === 'hair') {
                item.parts.push(`hair_back_${num}`);
                item.parts.push(`hair_front_${num}`);
            } else {
                item.parts.push(`${category}_${num}`);
            }

            if (category === 'accA') {
                item.previewImage = `accA_${num}_preview`;
            }

            ITEMS[category].push(item);
        }
    }
}

const game = new Phaser.Game(config);

let currentCharId = 1;
let bodySprite;
let headSprite;
let partSprites = {};
let currentParts = { hair: 'none', outer: 'none', inner: 'none', bottom: 'none', shoes: 'none', accA: 'none', accB: 'none', background: 'background_01' };
let mask;

function preload() {
    generateItemData();

    // ★BGMの読み込みを setPath の前に移動
    this.load.audio('show_bgm', 'audio/show_bgm.mp3');

    this.load.setPath('images/');
    this.load.image('background', 'background.png');
    this.load.image('body_base_01', 'body_base_01.png');
    this.load.image('head_base_01', 'head_base_01.png');
    this.load.image('body_base_02', 'body_base_02.png');
    this.load.image('head_base_02', 'head_base_02.png');
    for (const category in ITEMS) {
        ITEMS[category].forEach(item => {
            item.parts.forEach(partName => {
                const extension = (category === 'background') ? '.jpg' : '.png';
                this.load.image(partName, `${partName}${extension}`);
            });
            if (item.previewImage) {
                this.load.image(item.previewImage, `${item.previewImage}.png`);
            }
        });
    }
}

function create() {
    const characterX = this.sys.game.config.width / 2;
    const centerY = this.sys.game.config.height / 2;
    
    const bg = this.add.image(characterX, centerY, 'background_01').setDepth(DEPTH.BACKGROUND);
    partSprites[currentParts.background] = [bg];
    
    bodySprite = this.add.image(characterX, centerY, 'body_base_01').setDepth(DEPTH.BODY);
    headSprite = this.add.image(characterX, centerY, 'head_base_01').setDepth(DEPTH.HEAD);

    const maskGraphics = this.make.graphics();
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRoundedRect(0, 0, config.width, config.height, 24);
    
    mask = maskGraphics.createGeometryMask();
    
    bg.setMask(mask);
    bodySprite.setMask(mask);
    headSprite.setMask(mask);

    setupUI(this, characterX, centerY);
}

function wearItem(scene, x, y, category, item) {
    const oldItemId = currentParts[category];
    if (oldItemId && partSprites[oldItemId]) {
        partSprites[oldItemId].forEach(sprite => sprite.destroy());
        delete partSprites[oldItemId];
    }
    currentParts[category] = item.id;
    if (item.id === 'none') return;
    partSprites[item.id] = [];
    item.parts.forEach(partName => {
        const key = partName.replace(/_\d+/g, '').toUpperCase();
        let depth = 0;
        if (category === 'accA') {
            depth = DEPTH.ACC_A;
        } else if (category === 'accB') {
            depth = DEPTH.ACC_B;
        } else if (category === 'background') {
            depth = DEPTH.BACKGROUND;
        } else {
            depth = DEPTH[key] || 0;
        }
        
        const sprite = scene.add.image(x, y, partName).setDepth(depth).setMask(mask);
        partSprites[item.id].push(sprite);
    });
}

function setupUI(scene, x, y) {
    // DOM要素の取得
    const mainScreen = document.getElementById('main-screen');
    const favoritesScreen = document.getElementById('favorites-screen');
    const favoritesModal = document.getElementById('favorites-modal');
    const categoryTabs = document.querySelectorAll('.category-button');
    const itemListContainer = document.getElementById('item-list');
    const resetAllBtn = document.getElementById('reset-all');
    const downloadBtn = document.getElementById('download-btn');
    const switchCharBtn = document.getElementById('switch-char-btn');
    const closeFavoritesModalBtn = document.getElementById('close-favorites-modal-btn');
    const backToMainBtn = document.getElementById('back-to-main-btn');
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const alertOkBtn = document.getElementById('alert-ok-btn');
    const alertConfirmBtn = document.getElementById('alert-confirm-btn');
    const alertCancelBtn = document.getElementById('alert-cancel-btn');
    const favoriteDetailScreen = document.getElementById('favorite-detail-screen');
    const favoriteDetailPreview = document.getElementById('favorite-detail-preview');
    const favoriteNameDisplay = document.getElementById('favorite-name-display');
    const favoriteNameInput = document.getElementById('favorite-name-input');
    const saveFavoriteNameBtn = document.getElementById('save-favorite-name-btn');
    const downloadFavoriteBtn = document.getElementById('download-favorite-btn');
    const applyFavoriteBtn = document.getElementById('apply-favorite-btn');
    const backToFavoritesBtn = document.getElementById('back-to-favorites-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const startShowSetupBtn = document.getElementById('start-show-setup-btn');
    const showSetupModal = document.getElementById('show-setup-modal');
    const closeShowSetupBtn = document.getElementById('close-show-setup-btn');
    const showTitleInput = document.getElementById('show-title-input');
    const showFavoritesGrid = document.getElementById('show-favorites-grid');
    const showSelectedCount = document.getElementById('show-selected-count');
    const startShowBtn = document.getElementById('start-show-btn');
    const fashionShowScreen = document.getElementById('fashion-show-screen');
    const showCharacterArea = document.getElementById('show-character-area');
    const showCaptionText = document.getElementById('show-caption-text');

    let selectedFavorite = null;
    let selectedFavoriteIndex = -1;
    let draggedItem = null;
    let currentScale = 1.0;
    let selectedShowCoords = [];
    let showBGM;

    // BGMの準備
    scene.sound.pauseOnBlur = false;
    showBGM = scene.sound.add('show_bgm', { loop: true });

    // --- 汎用モーダル関数 ---
    function showAlert(message, callback) {
        alertMessage.innerHTML = message.replace(/\n/g, '<br>');
        alertOkBtn.style.display = 'inline-block';
        alertConfirmBtn.style.display = 'none';
        alertCancelBtn.style.display = 'none';
        alertModal.classList.remove('hidden');
        const okHandler = () => {
            alertModal.classList.add('hidden');
            alertOkBtn.removeEventListener('click', okHandler);
            if (callback) callback();
        };
        alertOkBtn.addEventListener('click', okHandler);
    }
    function showConfirm(message, onConfirm) {
        alertMessage.innerHTML = message.replace(/\n/g, '<br>');
        alertOkBtn.style.display = 'none';
        alertConfirmBtn.style.display = 'inline-block';
        alertCancelBtn.style.display = 'inline-block';
        alertModal.classList.remove('hidden');
        const confirmHandler = () => {
            alertModal.classList.add('hidden');
            cleanup();
            if (onConfirm) onConfirm();
        };
        const cancelHandler = () => {
            alertModal.classList.add('hidden');
            cleanup();
        };
        const cleanup = () => {
            alertConfirmBtn.removeEventListener('click', confirmHandler);
            alertCancelBtn.removeEventListener('click', cancelHandler);
        };
        alertConfirmBtn.addEventListener('click', confirmHandler);
        alertCancelBtn.addEventListener('click', cancelHandler);
    }

    // --- お気に入りデータ操作 ---
    const loadFavorites = () => JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    const saveFavorites = (favorites) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

    // キャラクター切り替え処理を関数化
    function switchCharacter(newCharId) {
        if (bodySprite) bodySprite.destroy();
        if (headSprite) headSprite.destroy();
        
        currentCharId = newCharId;
        const bodyKey = `body_base_0${currentCharId}`;
        const headKey = `head_base_0${currentCharId}`;
        bodySprite = scene.add.image(x, y, bodyKey).setDepth(DEPTH.BODY).setMask(mask);
        headSprite = scene.add.image(x, y, headKey).setDepth(DEPTH.HEAD).setMask(mask);
        
        for (const category in currentParts) {
            const itemId = currentParts[category];
            const item = ITEMS[category].find(i => i.id === itemId);
            if (item) {
                wearItem(scene, x, y, category, item);
            }
        }
        
        const activeCategoryTab = document.querySelector('.category-button.active');
        if (activeCategoryTab) updateItemList(activeCategoryTab.dataset.category);
    }

    function updateItemList(category) {
        itemListContainer.innerHTML = '';
        ITEMS[category].forEach(item => {
            const itemButton = document.createElement('button');
            itemButton.className = 'item-button';
            itemButton.classList.add(`item-button-${category}`);
            if (item.id === 'none') itemButton.classList.add('none-button');
            const previewContainer = document.createElement('div');
            previewContainer.className = 'item-preview-container';
            if (category === 'hair' && item.id !== 'none') {
                const headImg = document.createElement('img');
                headImg.src = `images/head_base_0${currentCharId}.png`;
                headImg.alt = 'head base';
                headImg.className = 'preview-head';
                previewContainer.appendChild(headImg);
            }

            if (item.previewImage) {
                const img = document.createElement('img');
                img.src = `images/${item.previewImage}.png`;
                img.alt = item.name;
                previewContainer.appendChild(img);
            } 
            else {
                item.parts.forEach(partName => {
                    const extension = (category === 'background') ? '.jpg' : '.png';
                    const img = document.createElement('img');
                    img.src = `images/${partName}${extension}`;
                    img.alt = item.name;
                    if (partName.includes('hair_back')) img.className = 'preview-hair-back';
                    else if (partName.includes('hair_front')) img.className = 'preview-hair-front';
                    previewContainer.appendChild(img);
                });
            }

            itemButton.appendChild(previewContainer);
            itemButton.addEventListener('click', () => wearItem(scene, x, y, category, item));
            itemListContainer.appendChild(itemButton);
        });
    }

    function displayFavorites() {
        mainScreen.classList.add('hidden');
        favoritesScreen.classList.remove('hidden');
        const favorites = loadFavorites();
        const listContainer = document.getElementById('favorites-list');
        listContainer.innerHTML = '';

        const handleDragStart = function(e) {
            draggedItem = this;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', null);
            e.dataTransfer.setDragImage(this, e.offsetX, e.offsetY);
            setTimeout(() => this.classList.add('dragging'), 0);
        };

        const handleDragOver = function(e) {
            e.preventDefault();
            const target = this;
            if (target !== draggedItem) {
                const rect = target.getBoundingClientRect();
                const isAfter = e.clientY > rect.top + rect.height / 2;
                if (isAfter) {
                    target.parentNode.insertBefore(draggedItem, target.nextSibling);
                } else {
                    target.parentNode.insertBefore(draggedItem, target);
                }
            }
        };

        const handleDragEnd = function() {
            if (!draggedItem) return;
            this.classList.remove('dragging');
            const favoritesData = loadFavorites();
            const newOrder = Array.from(listContainer.children)
                .map(card => favoritesData[parseInt(card.dataset.originalIndex, 10)]);
            saveFavorites(newOrder);
            draggedItem = null;
            displayFavorites();
        };

        favorites.forEach((coord, index) => {
            const card = document.createElement('div');
            card.className = 'favorite-card';
            card.dataset.originalIndex = index;
            card.draggable = true;

            card.addEventListener('click', () => {
                if (draggedItem) return;
                showFavoriteDetail(coord, index);
            });

            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('dragend', handleDragEnd);

            const preview = document.createElement('div');
            preview.className = 'favorite-preview';
            preview.innerHTML += `<img src="images/body_base_0${coord.charId}.png" style="z-index: ${DEPTH.BODY}">`;
            preview.innerHTML += `<img src="images/head_base_0${coord.charId}.png" style="z-index: ${DEPTH.HEAD}">`;
            for (const category in coord.parts) {
                const itemId = coord.parts[category];
                if (itemId !== 'none') {
                    const itemData = ITEMS[category].find(i => i.id === itemId);
                    if (itemData) {
                        itemData.parts.forEach(partName => {
                            const extension = (category === 'background') ? '.jpg' : '.png';
                            const key = partName.replace(/_\d+/g, '').toUpperCase();
                            let depth = 0;
                            if (category === 'accA') {
                                depth = DEPTH.ACC_A;
                            } else if (category === 'accB') {
                                depth = DEPTH.ACC_B;
                            } else if (category === 'background') {
                                depth = DEPTH.BACKGROUND;
                            } else {
                                depth = DEPTH[key] || 0;
                            }
                            preview.innerHTML += `<img src="images/${partName}${extension}" style="z-index: ${depth}">`;
                        });
                    }
                }
            }
            card.appendChild(preview);

            const nameElement = document.createElement('div');
            nameElement.className = 'favorite-card-name';
            nameElement.textContent = coord.name || `コーデ ${index + 1}`;
            card.appendChild(nameElement);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-favorite-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                showConfirm('このコーデを<br>さくじょしますか？', () => {
                    const favoritesData = loadFavorites();
                    favoritesData.splice(index, 1);
                    saveFavorites(favoritesData);
                    displayFavorites();
                });
            };
            card.appendChild(deleteBtn);
            listContainer.appendChild(card);
        });
    }

    function showFavoriteDetail(coord, index) {
        favoritesScreen.classList.add('hidden');
        favoriteDetailScreen.classList.remove('hidden');
        selectedFavorite = coord;
        selectedFavoriteIndex = index;
        favoriteNameDisplay.textContent = coord.name || `コーデ ${index + 1}`;
        favoriteNameInput.value = coord.name || `コーデ ${index + 1}`;
        favoriteNameDisplay.classList.remove('hidden');
        favoriteNameInput.classList.add('hidden');
        saveFavoriteNameBtn.classList.add('hidden');
        let previewHTML = ``;
        previewHTML += `<img src="images/body_base_0${coord.charId}.png" style="z-index: ${DEPTH.BODY}">`;
        previewHTML += `<img src="images/head_base_0${coord.charId}.png" style="z-index: ${DEPTH.HEAD}">`;
        for (const category in coord.parts) {
            const itemId = coord.parts[category];
            if (itemId !== 'none') {
                const itemData = ITEMS[category].find(i => i.id === itemId);
                if (itemData) {
                    itemData.parts.forEach(partName => {
                        const extension = (category === 'background') ? '.jpg' : '.png';
                        const key = partName.replace(/_\d+/g, '').toUpperCase();
                        let depth = 0;
                        if (category === 'accA') {
                            depth = DEPTH.ACC_A;
                        } else if (category === 'accB') {
                            depth = DEPTH.ACC_B;
                        } else if (category === 'background') {
                            depth = DEPTH.BACKGROUND;
                        } else {
                            depth = DEPTH[key] || 0;
                        }
                        previewHTML += `<img src="images/${partName}${extension}" style="z-index: ${depth}">`;
                    });
                }
            }
        }
        favoriteDetailPreview.innerHTML = previewHTML;
    }

    async function downloadElementAsImage(element, filename, includeBackground = true, returnDataUrl = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 850;
        const context = canvas.getContext('2d');
        let images = Array.from(element.getElementsByTagName('img'));

        if (!includeBackground) {
            images = images.filter(img => (parseInt(img.style.zIndex) || 0) !== DEPTH.BACKGROUND);
        }
        
        images.sort((a, b) => (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0));
        const promises = images.map(imgElem => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve({ img, zIndex: imgElem.style.zIndex });
                img.onerror = reject;
                img.src = imgElem.src;
            });
        });
        try {
            const loadedImages = await Promise.all(promises);
            loadedImages.forEach(({ img }) => {
                const hRatio = canvas.width / img.width;
                const vRatio = canvas.height / img.height;
                const ratio = Math.min(hRatio, vRatio);
                const centerShift_x = (canvas.width - img.width * ratio) / 2;
                const centerShift_y = (canvas.height - img.height * ratio) / 2;
                context.drawImage(img, 0, 0, img.width, img.height,
                                  centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
            });
            const dataURL = canvas.toDataURL('image/png');

            if (returnDataUrl) {
                return dataURL; // データURLを返す
            }

            // returnDataUrlがfalseの場合のみ、直接ダウンロードを実行（このロジックは現状使われないが念のため残す）
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Error creating image from favorite:', error);
            showAlert('画像の作成に失敗しました。');
            return null;
        }
    }

    // --- ファッションショー準備モーダル関連 ---
    function openShowSetupModal() {
        const favorites = loadFavorites();
        if (favorites.length < 3) {
            showAlert('ファッションショーには、お気に入りコーデが3つ以上ひつようです。');
            return;
        }

        selectedShowCoords = [];
        showFavoritesGrid.innerHTML = '';
        showTitleInput.value = '';

        favorites.forEach((coord, index) => {
            const card = document.createElement('div');
            card.className = 'favorite-card';
            card.dataset.index = index;

            const preview = document.createElement('div');
            preview.className = 'favorite-preview';
            preview.innerHTML += `<img src="images/body_base_0${coord.charId}.png" style="z-index: ${DEPTH.BODY}">`;
            preview.innerHTML += `<img src="images/head_base_0${coord.charId}.png" style="z-index: ${DEPTH.HEAD}">`;
            for (const category in coord.parts) {
                const itemId = coord.parts[category];
                if (itemId !== 'none') {
                    const itemData = ITEMS[category].find(i => i.id === itemId);
                    if (itemData) {
                        itemData.parts.forEach(partName => {
                            const extension = (category === 'background') ? '.jpg' : '.png';
                            const key = partName.replace(/_\d+/g, '').toUpperCase();
                            let depth = 0;
                            if (category === 'accA') depth = DEPTH.ACC_A;
                            else if (category === 'accB') depth = DEPTH.ACC_B;
                            else if (category === 'background') depth = DEPTH.BACKGROUND;
                            else depth = DEPTH[key] || 0;
                            preview.innerHTML += `<img src="images/${partName}${extension}" style="z-index: ${depth}">`;
                        });
                    }
                }
            }
            card.appendChild(preview);

            const nameElement = document.createElement('div');
            nameElement.className = 'favorite-card-name';
            nameElement.textContent = coord.name || `コーデ ${index + 1}`;
            card.appendChild(nameElement);

            card.addEventListener('click', () => {
                const cardIndex = selectedShowCoords.indexOf(index);
                if (cardIndex > -1) {
                    selectedShowCoords.splice(cardIndex, 1);
                    card.classList.remove('selected');
                } else if (selectedShowCoords.length < 3) {
                    selectedShowCoords.push(index);
                    card.classList.add('selected');
                }
                updateShowSetupUI();
            });

            showFavoritesGrid.appendChild(card);
        });

        updateShowSetupUI();
        showSetupModal.classList.remove('hidden');
    }

    function updateShowSetupUI() {
        showSelectedCount.textContent = selectedShowCoords.length;
        startShowBtn.disabled = selectedShowCoords.length !== 3;
    }

    // --- ファッションショー進行ロジック ---
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const showCaption = (text, element) => {
        element.innerHTML = text;
    };

    const startFashionShow = async (title, coords) => {
        // コーデのコメントリスト
        const coordComments = [
            "色あいがとってもステキな組み合わせです！",
            "元気いっぱいのスタイルですね！",
            "みんなのあこがれまちがいなし！",
            "みんなの しせん をひとりじめしちゃいそう！",
            "お出かけしたくなるようなコーデですね！",
            "色の組み合わせがとっても上手です！",
            "まるで物語の主人公みたい！",
            "かっこよさとかわいさのバランスが ぜつみょう！",
            "今日の天気にぴったりのスタイルかも！",
            "新しい きせつ が待ち遠しくなりますね。",
            "細部へのこだわりが感じられますね！",
            "思わずマネしたくなっちゃうコーデです！",
            "細かいところまでこだわりを感じますね。",
            "パーティーにも行けちゃいそうな はなやかさ！",
            "このままファッションざっしにのりそう！",
            "とっても こせい が出ていてステキです！",
            "どんな場所でも主役になれちゃいそう！",
            "全体のシルエットがとってもきれいですね！",
            "見ているだけでハッピーな気分になりますね！",
            "リラックスした休日にぴったりの ふんいき！"
        ];
        
        // コメントリストをシャッフルして、重複しないようにする
        const shuffledComments = [...coordComments];
        for (let i = shuffledComments.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledComments[i], shuffledComments[j]] = [shuffledComments[j], shuffledComments[i]];
        }

        // --- ★ここからが大きな変更点 ---
        
        // 1. ショーが始まる前に、3つのコーデのHTML要素をすべて生成してDOMに追加
        showCharacterArea.innerHTML = ''; // まずは中身を空にする
        coords.forEach(coord => {
            showCharacterArea.innerHTML += createCoordHTML(coord);
        });
        const coordElements = showCharacterArea.children; // 生成した3つのコーデ要素を取得

        // 2. その他の準備
        showCaptionText.innerHTML = '';
        const sparkleContainer = document.getElementById('sparkle-container');
        sparkleContainer.innerHTML = ''; 
        for (let i = 0; i < 20; i++) { 
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.style.left = `${Math.random() * 100}%`;
            sparkle.style.top = `${Math.random() * 100}%`;
            sparkle.style.animationDelay = `${Math.random() * 3}s`;
            sparkle.style.animationDuration = `${2 + Math.random() * 2}s`;
            sparkleContainer.appendChild(sparkle);
        }

        fashionShowScreen.classList.remove('hidden');
        await wait(100);
        fashionShowScreen.classList.add('visible');
        
        if (showBGM && !showBGM.isPlaying) {
            showBGM.play();
        }

        await wait(1000);

        // 導入
        showCaption(`さあ、はじまりました！「${title}」！！<br>今日もとってもステキなコーデ3つをみなさんにご紹介します！`, showCaptionText);
        await wait(6000);

        // 3. innerHTMLの書き換えをせず、クラスの付け替えで表示を制御
        
        // コーデ1
        coordElements[0].classList.add('active');
        showCaption(`エントリーナンバー1！「${coords[0].name || 'すてきなコーデ'}」<br>${shuffledComments[0]}`, showCaptionText);
        await wait(7000);
        coordElements[0].classList.remove('active');
        await wait(1000);

        // コーデ2
        coordElements[1].classList.add('active');
        showCaption(`つづいては、「${coords[1].name || 'かわいいコーデ'}」！<br>${shuffledComments[1]}`, showCaptionText);
        await wait(7000);
        coordElements[1].classList.remove('active');
        await wait(1000);

        // コーデ3
        coordElements[2].classList.add('active');
        showCaption(`さいごは、「${coords[2].name || 'おしゃれなコーデ'}」！<br>${shuffledComments[2]}`, showCaptionText);
        await wait(7000);
        coordElements[2].classList.remove('active');
        await wait(1000);

        // 締め
        showCaption(`みなさん、「${title}」いかがでしたか？<br>また、次のファッションショーでお会いしましょう！さようなら〜！`, showCaptionText);
        await wait(6000);
        
        fashionShowScreen.classList.remove('visible');
        await wait(500);
        fashionShowScreen.classList.add('hidden');
        
        sparkleContainer.innerHTML = '';

        if (showBGM && showBGM.isPlaying) {
            showBGM.stop();
        }
    };

    const createCoordHTML = (coord) => {
        let html = '<div class="show-coord">';
        const partsToRender = [];

        for (const category in coord.parts) {
            if (category === 'background') continue;
            
            const itemId = coord.parts[category];
            if (itemId !== 'none') {
                const itemData = ITEMS[category].find(i => i.id === itemId);
                if (itemData) {
                    itemData.parts.forEach(partName => {
                        const extension = (category === 'background') ? '.jpg' : '.png';
                        const key = partName.replace(/_\d+/g, '').toUpperCase();
                        let depth = 0;
                        if (category === 'accA') depth = DEPTH.ACC_A;
                        else if (category === 'accB') depth = DEPTH.ACC_B;
                        else depth = DEPTH[key] || 0;
                        partsToRender.push({ src: `images/${partName}${extension}`, zIndex: depth });
                    });
                }
            }
        }

        partsToRender.push({ src: `images/body_base_0${coord.charId}.png`, zIndex: DEPTH.BODY });
        partsToRender.push({ src: `images/head_base_0${coord.charId}.png`, zIndex: DEPTH.HEAD });
        
        partsToRender.sort((a, b) => a.zIndex - b.zIndex);
        
        partsToRender.forEach(part => {
            html += `<img src="${part.src}" style="z-index: ${part.zIndex};">`;
        });

        html += '</div>';
        return html;
    };

    // --- イベントリスナー設定 ---
    categoryTabs.forEach(tab => tab.addEventListener('click', () => {
        categoryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        updateItemList(tab.dataset.category);
    }));

    closeFavoritesModalBtn.addEventListener('click', () => favoritesModal.classList.add('hidden'));
    
    const registerBtnMain = document.getElementById('register-btn-main');
    registerBtnMain.addEventListener('click', () => {
        const favorites = loadFavorites();
        if (favorites.length >= 50) {
            showAlert('おきにいりがいっぱいです。\nこれいじょう とうろくできません。');
            return;
        }
        favorites.push({ 
            name: `コーデ ${favorites.length + 1}`, 
            charId: currentCharId, 
            parts: { ...currentParts } 
        });
        saveFavorites(favorites);
        showAlert('おきにいりに とうろくしました！');
    });
    
    const viewFavoritesBtnMain = document.getElementById('view-favorites-btn-main');
    viewFavoritesBtnMain.addEventListener('click', () => {
        displayFavorites();
        applyZoom();
    });

    startShowSetupBtn.addEventListener('click', openShowSetupModal);
    closeShowSetupBtn.addEventListener('click', () => {
        showSetupModal.classList.add('hidden');
    });

    startShowBtn.addEventListener('click', () => {
        const title = showTitleInput.value.trim() || 'すてきなファッションショー';
        const favorites = loadFavorites();
        const selectedCoords = selectedShowCoords.map(index => favorites[index]);
        
        showSetupModal.classList.add('hidden');
        startFashionShow(title, selectedCoords);
    });

    backToMainBtn.addEventListener('click', () => {
        favoritesScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        applyZoom();
    });

    backToFavoritesBtn.addEventListener('click', () => {
        favoriteDetailScreen.classList.add('hidden');
        selectedFavorite = null;
        selectedFavoriteIndex = -1;
        displayFavorites();
    });

    applyFavoriteBtn.addEventListener('click', () => {
        if (!selectedFavorite) return;
        if (currentCharId !== selectedFavorite.charId) {
            switchCharacter(selectedFavorite.charId);
        } else {
            for (const category in currentParts) {
                if (category !== 'background') {
                    wearItem(scene, x, y, category, { id: 'none', parts: [] });
                }
            }
        }
        currentParts = { ...selectedFavorite.parts };
        for (const category in currentParts) {
            const itemId = currentParts[category];
            const item = ITEMS[category].find(i => i.id === itemId) || { id: 'none', parts: [] };
            wearItem(scene, x, y, category, item);
        }
        favoriteDetailScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        selectedFavorite = null;
        selectedFavoriteIndex = -1;
        applyZoom();
    });

    favoriteNameDisplay.addEventListener('click', () => {
        favoriteNameDisplay.classList.add('hidden');
        favoriteNameInput.classList.remove('hidden');
        saveFavoriteNameBtn.classList.remove('hidden');
        favoriteNameInput.focus();
        favoriteNameInput.select();
    });

    const saveFavoriteName = () => {
        const newName = favoriteNameInput.value.trim();
        if (newName && selectedFavoriteIndex !== -1) {
            const favorites = loadFavorites();
            favorites[selectedFavoriteIndex].name = newName;
            saveFavorites(favorites);
            selectedFavorite.name = newName;
            favoriteNameDisplay.textContent = newName;
        }
        favoriteNameDisplay.classList.remove('hidden');
        favoriteNameInput.classList.add('hidden');
        saveFavoriteNameBtn.classList.add('hidden');
    };

    saveFavoriteNameBtn.addEventListener('click', saveFavoriteName);

    resetAllBtn.addEventListener('click', () => {
        for (const category in currentParts) {
            if (category !== 'background') {
                wearItem(scene, x, y, category, { id: 'none', parts: [] });
            }
        }
    });

    // --- ダウンロード処理 ---
    const downloadModal = document.getElementById('download-modal');
    const downloadWithBgBtn = document.getElementById('download-with-bg-btn');
    const downloadWithoutBgBtn = document.getElementById('download-without-bg-btn');
    const downloadCancelBtn = document.getElementById('download-cancel-btn');
    let downloadTarget = null; // 'main' or 'favorite'

    const handleDownload = (withBackground, downloadModal) => {
        downloadModal.classList.add('hidden');

        // ユーザーエージェントでモバイル端末（特にiOS）かどうかを簡易的に判定
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // 画像データを取得する処理を関数化
        const getImageData = (callback) => {
            if (downloadTarget === 'main') {
                if (withBackground) {
                    const dataURL = game.canvas.toDataURL('image/png');
                    callback(dataURL);
                } else {
                    const bgSprite = partSprites[currentParts.background] ? partSprites[currentParts.background][0] : null;
                    const mainCamera = game.scene.scenes[0].cameras.main;
                    const originalBgColor = mainCamera.backgroundColor.rgba;
                    
                    if (bgSprite) bgSprite.setVisible(false);
                    mainCamera.setBackgroundColor('transparent');
                    
                    game.renderer.snapshot(image => {
                        callback(image.src);
                        if (bgSprite) bgSprite.setVisible(true);
                        mainCamera.setBackgroundColor(originalBgColor);
                    });
                }
            } else if (downloadTarget === 'favorite') {
                // downloadElementAsImage を改造して DataURL を返すようにする
                (async () => {
                    const dataURL = await downloadElementAsImage(favoriteDetailPreview, null, withBackground, true);
                    if (dataURL) {
                        callback(dataURL);
                    }
                })();
            }
        };

        // 画像データを取得した後の処理
        getImageData(dataURL => {
            if (!dataURL) return; // データ取得に失敗した場合は何もしない

            if (isMobile) {
                // モバイルの場合：新しいタブで画像を開く
                const newTab = window.open();
                if (newTab) {
                    newTab.document.body.innerHTML = `<img src="${dataURL}" style="max-width:100%; height:auto;">`;
                    showAlert('あたらしいタブでがぞうをひらきました。\nがぞうを長押しして保存してください。');
                } else {
                    // ポップアップがブロックされた場合
                    showAlert('ポップアップがブロックされました。\nブラウザの設定でポップアップを許可してください。');
                }
            } else {
                // PCの場合：従来通りダウンロード
                const filename = `${downloadTarget}-coordinate-${withBackground ? 'with' : 'no'}-bg.png`;
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    };
    
    // メイン画面のダウンロードボタン
    downloadBtn.addEventListener('click', () => {
        downloadTarget = 'main';
        downloadModal.classList.remove('hidden');
    });

    // お気に入り詳細画面のダウンロードボタン
    downloadFavoriteBtn.addEventListener('click', () => {
        downloadTarget = 'favorite';
        downloadModal.classList.remove('hidden');
    });

    // モーダル内のボタン
    downloadWithBgBtn.addEventListener('click', () => handleDownload(true, downloadModal));
    downloadWithoutBgBtn.addEventListener('click', () => handleDownload(false, downloadModal));
    downloadCancelBtn.addEventListener('click', () => {
        downloadModal.classList.add('hidden');
    });


    switchCharBtn.addEventListener('click', () => {
        const newCharId = (currentCharId === 1) ? 2 : 1;
        switchCharacter(newCharId);
    });

  const applyZoom = () => {
        const scaleValue = `scale(${currentScale})`;
        mainScreen.style.transform = scaleValue;
        favoritesScreen.style.transform = scaleValue;
        favoriteDetailScreen.style.transform = scaleValue;
    };

    zoomInBtn.addEventListener('click', () => {
        currentScale = Math.min(2.0, currentScale + 0.1);
        applyZoom();
    });

    zoomOutBtn.addEventListener('click', () => {
        currentScale = Math.max(0.5, currentScale - 0.1);
        applyZoom();
    });

    fullscreenBtn.addEventListener('click', () => {
        const docEl = document.documentElement;
        const requestFullscreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
        const exitFullscreen = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
        const isFullscreen = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
        if (!isFullscreen) {
            if (requestFullscreen) {
                requestFullscreen.call(docEl).catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }
        } else {
            if (exitFullscreen) {
                exitFullscreen.call(document);
            }
        }
    });
    
    applyZoom();
    updateItemList('hair');
}