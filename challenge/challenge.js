/* ============================================================
   challenge.js — общий стейт для всех страниц челленджа.
   Подключается на каждой day{N}/index.html
   ============================================================ */

const LS_KEY = 'gruzdeva_challenge_v1';

/* ---------- групповой замок ----------
   Челлендж «идём стаей» — участники не обгоняют лидера.
   День с visN=N становится доступен на N-й день от старта.
   Догонять можно (пропустил — сегодня закроешь оба), обгонять — нельзя.
   При ?dev=1 замок игнорируется.
*/
const CHALLENGE_START_Y = 2026;
const CHALLENGE_START_M = 6;  // июль (0-indexed)
const CHALLENGE_START_D = 1;

// маппинг URL day{N} → visN
const DAY_VISN = { 1:1, 2:2, 3:3, 4:4, 5:5, 6:5, 7:6, 8:7 };

function _daysSinceStart(){
  const start = new Date(CHALLENGE_START_Y, CHALLENGE_START_M, CHALLENGE_START_D);
  start.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.floor((today - start) / 86400000);
}
function _maxVisN(){
  return Math.max(1, Math.min(7, _daysSinceStart() + 1));
}

window.Challenge = {
  getState(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  },
  saveState(s){
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  },
  getName(){
    const s = this.getState();
    return s && s.name ? s.name : 'друг';
  },
  markDone(dayN, result){
    const s = this.getState() || { name:'аноним', startedAt:Date.now(), days:{} };
    s.days = s.days || {};
    s.days[dayN] = {
      done: true,
      result: result || null,
      at: Date.now()
    };
    this.saveState(s);
  },
  getDayResult(dayN){
    const s = this.getState();
    if(!s || !s.days || !s.days[dayN]) return null;
    return s.days[dayN].result;
  },
  isDone(dayN){
    const s = this.getState();
    return !!(s && s.days && s.days[dayN] && s.days[dayN].done);
  },
  doneCount(){
    const s = this.getState();
    if(!s || !s.days) return 0;
    return Object.values(s.days).filter(d=>d && d.done).length;
  },
  goHome(){
    window.location.href = '../index.html';
  },
  // If user lands on a day without registering — send them to landing.
  // Exception: ?dev=1 в URL отключает редирект и подставляет dev-имя.
  requireRegistration(){
    const params = new URLSearchParams(window.location.search);
    if(params.get('dev') === '1'){
      const s = this.getState();
      if(!s || !s.name){
        this.saveState({ name: 'Тест', startedAt: Date.now(), days: {} });
      }
      return true;
    }
    const s = this.getState();
    if(!s || !s.name){
      window.location.href = '../index.html';
      return false;
    }
    return true;
  },
  // Групповой замок: возвращает true, если день доступен по календарю.
  isDayUnlocked(dayN){
    const visN = DAY_VISN[dayN];
    if(!visN) return true;
    return visN <= _maxVisN();
  },
  // Guard для конкретного дня — вызывается на day{N}/index.html.
  // Если день ещё не наступил — редиректит на landing.
  guardDayLock(dayN){
    const params = new URLSearchParams(window.location.search);
    if(params.get('dev') === '1') return true;
    if(!this.isDayUnlocked(dayN)){
      window.location.href = '../index.html';
      return false;
    }
    return true;
  }
};
