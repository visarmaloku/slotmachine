// script.js - Slot Machine with 10-spin limit
(() => {
    const SYMBOLS = ['🍒','🍋','🍊','🍇','🔔','💎','7️⃣','⭐','🍉','🍀'];

    const KEY_NAME = 'slot_username';
    const KEY_SCORE = 'slot_score';
    const KEY_SPINS = 'slot_spins';

    const MAX_SPINS = 10;

    const reelEls = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];
    const spinBtn = document.getElementById('spinButton');
    const autoBtn = document.getElementById('autoButton');
    const msgEl = document.getElementById('message');
    const nameEl = document.getElementById('playerName');
    const scoreEl = document.getElementById('playerScore');
    const logoutBtn = document.getElementById('logoutButton');

    const sounds = {
        spin: new Audio('sounds/spin.mp3'),
        stop: new Audio('sounds/stop.mp3'),
        win: new Audio('sounds/win.mp3')
    };

    const username = localStorage.getItem(KEY_NAME);
    if (!username) {
        window.location.href = 'register.html';
        return;
    }

    if (localStorage.getItem(KEY_SCORE) === null) localStorage.setItem(KEY_SCORE, '0');
    if (localStorage.getItem(KEY_SPINS) === null) localStorage.setItem(KEY_SPINS, '0');

    function displayPlayer() {
        nameEl.innerText = `Player: ${localStorage.getItem(KEY_NAME) || '—'}`;
        scoreEl.innerText = `Score: ${localStorage.getItem(KEY_SCORE)}`;
    }
    displayPlayer();

    logoutBtn.addEventListener('click', () => {
        if (confirm('Log out and remove saved username & score?')) {
            localStorage.removeItem(KEY_NAME);
            localStorage.removeItem(KEY_SCORE);
            localStorage.removeItem(KEY_SPINS);
            window.location.href = 'register.html';
        }
    });

    function randChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

    async function updateLeaderboard() {
        try {
            const res = await fetch('/SlotMachineGame_war/leaderboard');
            if (!res.ok) return;
            const data = await res.json();
            const list = document.getElementById('leaderboardList');
            list.innerHTML = '';
            data.forEach((entry, i) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${i+1}. ${escapeHtml(entry.username)}</span><span>${entry.score}</span>`;
                list.appendChild(li);
            });
        } catch (e) { console.warn('Leaderboard fetch failed', e); }
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function(m) {
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);
        });
    }

    async function spin() {
        // Check spin limit
        let spins = parseInt(localStorage.getItem(KEY_SPINS), 10);
        if (spins >= MAX_SPINS) {
            msgEl.innerText = "🎰 Game Over! Maximum spins reached.";
            msgEl.style.color = '#ff4d4d';
            spinBtn.disabled = true;
            autoBtn.disabled = true;

            // Reset game after 4 seconds
            setTimeout(() => {
                localStorage.setItem(KEY_SCORE, '0');
                localStorage.setItem(KEY_SPINS, '0');
                displayPlayer();
                msgEl.innerText = 'Game restarted! You can spin again.';
                msgEl.style.color = 'white';
                spinBtn.disabled = false;
                autoBtn.disabled = false;
            }, 4000);
            return;
        }

        spinBtn.disabled = true;
        autoBtn.disabled = true;
        msgEl.style.color = 'white';
        msgEl.innerText = 'Spinning... Good luck!';

        try { sounds.spin.currentTime = 0; sounds.spin.play().catch(()=>{}); } catch(e){}

        reelEls.forEach(r => r.classList.add('spinning'));

        const intervals = reelEls.map((r, i) =>
            setInterval(() => { r.innerText = randChoice(SYMBOLS); }, 60 + i*15)
        );

        let finalSymbols;
        let won;
        let message;

        // Get server spin result
        try {
            const res = await fetch('/SlotMachineGame_war/spin');
            if (res.ok) {
                const data = await res.json();
                finalSymbols = data.reels.slice(0,3);
                won = !!data.won;
                message = data.message || (won ? 'You won!' : 'Try again!');
            } else {
                finalSymbols = [randChoice(SYMBOLS), randChoice(SYMBOLS), randChoice(SYMBOLS)];
                won = false;
                message = 'Server error, spinning randomly.';
            }
        } catch {
            finalSymbols = [randChoice(SYMBOLS), randChoice(SYMBOLS), randChoice(SYMBOLS)];
            if (Math.random() < 0.03) {
                finalSymbols = [finalSymbols[0], finalSymbols[0], finalSymbols[0]];
                won = true;
            } else {
                won = finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2];
            }
            message = won ? 'You hit the jackpot!' : 'No match. Try again!';
        }

        const stopDelays = [600, 1100, 1600];
        for (let i = 0; i < reelEls.length; i++) {
            ((index) => {
                setTimeout(() => {
                    clearInterval(intervals[index]);
                    const reel = reelEls[index];
                    reel.classList.remove('spinning');
                    reel.style.transform = 'translateY(-10px) scale(1.03)';
                    reel.innerText = finalSymbols[index];
                    try { sounds.stop.currentTime = 0; sounds.stop.play().catch(()=>{}); } catch(e){}
                    setTimeout(() => reel.style.transform = '', 220);
                }, stopDelays[i]);
            })(i);
        }

        await wait(stopDelays[2] + 260);

        msgEl.innerText = message;
        msgEl.style.color = won ? '#a6ffb0' : '#ff9a9a';

        // calculate score
        const scoreBefore = parseInt(localStorage.getItem(KEY_SCORE), 10);
        let delta;
        if (finalSymbols[0] === finalSymbols[1] && finalSymbols[1] === finalSymbols[2]) delta = 50;
        else if (finalSymbols[0] === finalSymbols[1] || finalSymbols[1] === finalSymbols[2] || finalSymbols[0] === finalSymbols[2]) delta = 10;
        else delta = -1;

        const newScore = Math.max(0, scoreBefore + delta);
        localStorage.setItem(KEY_SCORE, String(newScore));
        displayPlayer();

        // increment spins
        spins += 1;
        localStorage.setItem(KEY_SPINS, String(spins));

        if (delta > 0) { flashReels(); try { sounds.win.currentTime=0; sounds.win.play().catch(()=>{}); } catch(e){} }

        // Send score to leaderboard
        try {
            const body = new URLSearchParams();
            body.append('username', username);
            body.append('score', String(newScore));
            await fetch('/SlotMachineGame_war/leaderboard', { method: 'POST', body });
        } catch {}

        await updateLeaderboard();

        spinBtn.disabled = false;
        autoBtn.disabled = false;
    }

    function flashReels() {
        reelEls.forEach(r => {
            r.animate([
                { boxShadow: '0 6px 18px rgba(255,255,255,0.04)' },
                { boxShadow: '0 18px 40px rgba(255,230,120,0.6)' },
                { boxShadow: '0 6px 18px rgba(255,255,255,0.04)' }
            ], { duration: 800, iterations: 1 });
        });
    }

    async function autoPlay(times = 5) {
        spinBtn.disabled = true; autoBtn.disabled = true;
        for (let i=0;i<times;i++) { await spin(); await wait(420); }
        spinBtn.disabled = false; autoBtn.disabled = false;
    }

    spinBtn.addEventListener('click', () => spin());
    autoBtn.addEventListener('click', () => autoPlay(5));
    updateLeaderboard();

})();
