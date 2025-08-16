// Pixel Solitaire Game CORE
class PixelSolitaire {
    constructor() {
        // Basic state
        this.gameState = "menu";
        this.currentCardBack = 'classic';
        this.score = 0;
        this.moves = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.history = [];

        // Sound
        this.bgMusic = document.getElementById('bg-music');
        this.cardSound = document.getElementById('card-sound');
        this.buttonSound = document.getElementById('button-sound');

        // Game data
        this.deck = [];
        this.tableau = [[],[],[],[],[],[],[]];
        this.foundations = { hearts:[], diamonds:[], clubs:[], spades:[] };
        this.stock = [];
        this.waste = [];

        // Setup
        this.setupEventListeners();
        this.setupAudio();

        // Show main menu on load
        this.showMenu();

    }

    // --- SETUP & UI ---

    initializeGame() {
        this.createDeck();
        this.updateDisplay();
    }

    setupEventListeners() {
        const safe = id => document.getElementById(id);

        // Main navigation
        safe('play-btn') && safe('play-btn').addEventListener('click', ()=> this.startNewGame());
        safe('settings-btn') && safe('settings-btn').addEventListener('click', ()=> this.showSettings());
        safe('rules-btn') && safe('rules-btn').addEventListener('click', ()=> this.showRules());
        safe('back-to-menu') && safe('back-to-menu').addEventListener('click', ()=> this.showMenu());
        safe('rules-back') && safe('rules-back').addEventListener('click', ()=> this.showMenu());

        // Win/Game
        safe('new-game-btn') && safe('new-game-btn').addEventListener('click', ()=> this.startNewGame());
        safe('restart-btn') && safe('restart-btn').addEventListener('click', ()=> this.restartGame());
        safe('menu-btn') && safe('menu-btn').addEventListener('click', ()=> this.showMenu());
        safe('play-again-btn') && safe('play-again-btn').addEventListener('click', ()=> this.startNewGame());
        safe('win-menu-btn') && safe('win-menu-btn').addEventListener('click', ()=> this.showMenu());

        // Deck draw
        safe('stock') && safe('stock').addEventListener('click', ()=>{
            this.saveHistory();
            this.drawFromStock();
        });

    
        safe('undo-btn') && safe('undo-btn').addEventListener('click', ()=> this.undoMove());
        safe('hint-btn') && safe('hint-btn').addEventListener('click', ()=> this.showHint());

        // Audio
        const musicSlider = safe('music-volume');
        const sfxSlider = safe('sfx-volume');

        // 💡 Initializes with current values & keep in sync
        if (musicSlider) {
            musicSlider.value = this.bgMusic.volume = musicSlider.value || 0.7;
            musicSlider.addEventListener('input', e => {
                const v = parseFloat(e.target.value);
                this.bgMusic.volume = v;
                safe('music-value').textContent = Math.round(v*100) + '%';
                this.playButtonSound();
            });
            // Keep display in sync
            safe('music-value').textContent = Math.round(musicSlider.value*100)+'%';
        }
        if (sfxSlider) {
            sfxSlider.value = this.cardSound.volume = this.buttonSound.volume = sfxSlider.value || 0.8;
            sfxSlider.addEventListener('input', e => {
                const v = parseFloat(e.target.value);
                this.cardSound.volume = v;
                this.buttonSound.volume = v;
                safe('sfx-value').textContent = Math.round(v*100) + '%';
                this.playButtonSound();
            });
            safe('sfx-value').textContent = Math.round(sfxSlider.value*100)+'%';
        }

        // Card back selection
        document.querySelectorAll('.card-back-option').forEach(option => {
            option.addEventListener('click', e => {
                document.querySelectorAll('.card-back-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.currentCardBack = option.dataset.style;
                this.updateCardBacks();
                this.playButtonSound();
            });
        });

        // Button press SFX
        document.querySelectorAll('.pixel-btn').forEach(btn => {
            btn.addEventListener('mousedown', ()=> this.playButtonSound());
        });
    }

    setupAudio() {
        let tried = false;
        const tryPlay = () => {
            if (tried) return;
            tried = true;
            // Try playing, or wait for click if policy blocks
            this.bgMusic.volume = parseFloat(document.getElementById('music-volume')?.value || 0.7);
            this.bgMusic.play().catch(()=>{
                document.body.addEventListener('pointerdown', () => {
                    this.bgMusic.play().catch(()=>{});
                }, {once:true});
            });
        };
        tryPlay();
    }

    // --- GAME LOGIC ---

    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        this.deck = [];
        for (let suit of suits) for (let rank of ranks) this.deck.push({
            suit, rank,
            value: this.getCardValue(rank),
            color: (suit==='hearts'||suit==='diamonds')?'red':'black',
            faceUp: false
        });
    }
    getCardValue(rank){ return rank==='A' ? 1 : rank==='J'?11 : rank==='Q'?12 : rank==='K'?13 : parseInt(rank); }

    startNewGame() {
        this.score=0; this.moves=0; this.timer=0; this.history=[];
        this.tableau=[[],[],[],[],[],[],[]];
        this.foundations={hearts:[], diamonds:[], clubs:[], spades:[]};
        this.stock=[]; this.waste=[];
        this.createDeck(); this.shuffleDeck(); this.dealCards();
        this.showGame(); this.updateGameDisplay();
        this.startTimer();
    }
    restartGame(){ this.startNewGame(); }

    shuffleDeck() {
        for(let i=this.deck.length-1;i>0;i--){
            const j = Math.floor(Math.random()*(i+1));
            [this.deck[i],this.deck[j]]=[this.deck[j],this.deck[i]];
        }
    }
    dealCards() {
        let c=0;
        for(let col=0; col<7; col++){
            for(let r=0; r<=col; r++){
                let card = this.deck[c++];
                card.faceUp = (r===col);
                this.tableau[col].push(card);
            }
        }
        this.stock = this.deck.slice(c).map(card=>({...card, faceUp:false}));
    }

    drawFromStock() {
        if (this.stock.length === 0) {
            this.stock = this.waste.reverse().map(card=>({...card, faceUp:false}));
            this.waste=[];
        } else {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
        }
        this.moves++;
        this.playCardSound();
        this.updateGameDisplay();
    }

    // HINT/UNDO
    saveHistory() {
        // Deep clone (no refs)
        this.history.push(JSON.parse(JSON.stringify({
            tableau: this.tableau,
            foundations: this.foundations,
            stock: this.stock,
            waste: this.waste,
            score: this.score,
            moves: this.moves,
            timer: this.timer
        })));
        if (this.history.length > 50) this.history.shift();
    }
    undoMove() {
        if (!this.history.length) return;
        const prev = this.history.pop();
        Object.assign(this, prev);
        this.updateGameDisplay();
    }
    showHint() {
        for (let col=0; col<this.tableau.length; col++) {
            const column = this.tableau[col];
            const topCard = column[column.length-1];
            if (topCard && this.canMoveToFoundation(topCard)) {
                // Find DOM card to highlight
                document.querySelectorAll('.card.flipped').forEach(cardEl => {
                    if (
                        cardEl.querySelector('.card-top')?.textContent === topCard.rank &&
                        cardEl.querySelector('.card-center')?.textContent === this.getSuitSymbol(topCard.suit)
                    ) {
                        cardEl.style.outline = '3px dashed yellow';
                        setTimeout(()=> cardEl.style.outline='', 1600);
                    }
                });
                break;
            }
        }
    }

    // --- UI STATE ---
    updateDisplay() {
      
        ['main-menu','settings-screen','rules-screen','game-screen','win-screen'].forEach(id=>{
            const el = document.getElementById(id);
            if(!el) return;
            el.classList.add('hidden');
        });
        let curr = (
            this.gameState==="menu" ? 'main-menu' :
            this.gameState==="settings" ? 'settings-screen' :
            this.gameState==="rules" ? 'rules-screen' :
            this.gameState==="game" ? 'game-screen' : 'win-screen'
        );
        document.getElementById(curr).classList.remove('hidden');
        // Animate win screen
        if (curr === 'win-screen') document.querySelector('.win-content')?.classList.add('animated');
        else document.querySelector('.win-content')?.classList.remove('animated');
    }
    showMenu(){ this.gameState='menu'; this.updateDisplay(); this.stopTimer(); }
    showSettings(){ this.gameState='settings'; this.updateDisplay(); }
    showRules(){ this.gameState='rules'; this.updateDisplay(); }
    showGame(){ this.gameState='game'; this.updateDisplay(); this.startTimer(); }
    showWin() {
        this.gameState='win'; this.updateDisplay(); this.stopTimer();
        document.getElementById('final-score').textContent=this.score;
        document.getElementById('final-time').textContent=this.formatTime(this.timer);
        document.getElementById('final-moves').textContent=this.moves;
    }

    // --- RENDER CARDS ---
    updateGameDisplay() {
        this.updateStats();
        this.renderCards();
        this.saveToLocalStorage();
    }
    updateStats() {
        document.getElementById('score').textContent=this.score;
        document.getElementById('timer').textContent=this.formatTime(this.timer);
        document.getElementById('moves').textContent=this.moves;
    }
    renderCards() {
        // Remove old .card DOMs
        document.querySelectorAll('.card').forEach(card=>card.remove());
        // Tableau
        this.tableau.forEach((column, colIndex)=>{
            const colEl = document.querySelector(`.tableau-column[data-column="${colIndex}"]`);
            if (!colEl) return;
            column.forEach((card, idx)=>{
                const cardEl = this.createCardElement(card, idx*25);
                colEl.appendChild(cardEl);
            });
        });
        // Foundation
        Object.keys(this.foundations).forEach(suit=>{
            const foundEl = document.getElementById(`foundation-${suit}`);
            if (!foundEl) return; foundEl.innerHTML = '';
            const cards = this.foundations[suit];
            if (cards.length) {
                foundEl.appendChild(this.createCardElement(cards[cards.length-1], 0));
            }
        });
        // Stock
        let stockEl = document.getElementById('stock');
        if (stockEl) { stockEl.innerHTML = '';
            if (this.stock.length) stockEl.appendChild(this.createCardElement(this.stock[this.stock.length-1],0));
        }
        let wasteEl = document.getElementById('waste');
        if (wasteEl) { wasteEl.innerHTML = '';
            if (this.waste.length) wasteEl.appendChild(this.createCardElement(this.waste[this.waste.length-1],0));
        }
    }
    createCardElement(card, offsetY=0) {
        const el = document.createElement('div');
        el.className = 'card' + (card.faceUp ? ' flipped':'');
        el.style.top = offsetY+'px';

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        // Back/front
        const back = document.createElement('div');
        back.className = `card-back ${this.currentCardBack}`;
        const face = document.createElement('div');
        face.className = `card-face ${card.color}`;

        // Face cards styling
        if (['J','Q','K'].includes(card.rank))
            face.classList.add('face-card', card.rank.toLowerCase(), card.suit);

        // Card Structure
        let t=document.createElement('div'); t.className='card-top'; t.textContent=card.rank;
        let c=document.createElement('div'); c.className='card-center'; c.textContent=this.getSuitSymbol(card.suit);
        let b=document.createElement('div'); b.className='card-bottom'; b.textContent=card.rank;
        face.appendChild(t); face.appendChild(c); face.appendChild(b);
        inner.appendChild(back); inner.appendChild(face);
        el.appendChild(inner);

        // Interaction
        el.addEventListener('click', ()=>this.handleCardClick(card));
        return el;
    }
    getSuitSymbol(suit){
        return suit==='hearts'?'♥':
               suit==='diamonds'?'♦':
               suit==='clubs'?'♣':'♠';
    }

    // --- GAMEPLAY ---

    handleCardClick(card) {
        // Auto-move to foundation if possible
        if (this.canMoveToFoundation(card)) {
            this.saveHistory();
            this.moveToFoundation(card);
            this.playCardSound();
            this.moves++; this.score+=10;
            this.updateGameDisplay();
            this.checkWin();
        }
    }
    canMoveToFoundation(card){
        if(!card.faceUp)return false;
        let f=this.foundations[card.suit];
        if(!f.length) return card.rank==='A';
        return card.value === f[f.length-1].value+1;
    }
    moveToFoundation(card){
        this.removeCardFromLocation(card);
        this.foundations[card.suit].push(card);
        this.flipNextTableauCard();
    }
    removeCardFromLocation(card) {
        for (let col=0; col<this.tableau.length; col++) {
            let idx = this.tableau[col].indexOf(card);
            if (idx!==-1){ this.tableau[col].splice(idx,1); return; }
        }
        let idx = this.waste.indexOf(card);
        if(idx!==-1) this.waste.splice(idx,1);
    }
    flipNextTableauCard() {
        for (let col=0; col<this.tableau.length; col++) {
            const column = this.tableau[col];
            if (column.length && !column[column.length-1].faceUp) {
                column[column.length-1].faceUp=true;
                this.score += 5;
                break;
            }
        }
    }
    updateCardBacks() {
        document.querySelectorAll('.card-back').forEach(back=>{
            back.className='card-back '+this.currentCardBack;
        });
    }
    checkWin() {
        let n = Object.values(this.foundations).reduce((sum,found)=>sum+found.length,0);
        if(n===52){
            this.score+=100;
            setTimeout(()=>this.showWin(), 700);
        }
    }

    // --- TIMER/STATS ---

    startTimer(){
        this.stopTimer();
        this.timerInterval = setInterval(()=>{
            this.timer++; this.updateStats();
        },1000);
    }
    stopTimer(){
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval=null;
    }
    formatTime(sec) {
        let m = Math.floor(sec/60), s = sec%60;
        return (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
    }

    playButtonSound(){
        if(this.buttonSound.volume>0){
            this.buttonSound.currentTime=0; this.buttonSound.play().catch(()=>{});
        }
    }
    playCardSound(){
        if(this.cardSound.volume>0){
            this.cardSound.currentTime=0; this.cardSound.play().catch(()=>{});
        }
    }

    // --- SAVE/LOAD ---

    saveToLocalStorage(){
        localStorage.setItem('pixelSolitaireSave', JSON.stringify({
            tableau: this.tableau,
            foundations: this.foundations,
            stock: this.stock,
            waste: this.waste,
            score: this.score,
            moves: this.moves,
            timer: this.timer,
            currentCardBack: this.currentCardBack
        }));
    }
    loadFromLocalStorage(){
        // Load only if valid
        let state;
        try{ state = JSON.parse(localStorage.getItem('pixelSolitaireSave')); }
        catch{ state=null; }
        if (!state || !Array.isArray(state.tableau) || !state.foundations) return;
        this.tableau=state.tableau;
        this.foundations=state.foundations;
        this.stock=state.stock;
        this.waste=state.waste;
        this.score=state.score;
        this.moves=state.moves;
        this.timer=state.timer;
        this.currentCardBack=state.currentCardBack||'classic';
        this.updateCardBacks();
        this.showGame();
        this.updateGameDisplay();
        this.startTimer();
    }
}

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', ()=>{
    window.solitaireGame = new PixelSolitaire();
});
