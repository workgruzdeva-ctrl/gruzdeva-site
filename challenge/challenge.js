/* ============================================================
   challenge.js — общий стейт для всех страниц челленджа.
   Подключается на каждой day{N}/index.html
   ============================================================ */

const LS_KEY = 'gruzdeva_challenge_v1';

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
  requireRegistration(){
    const s = this.getState();
    if(!s || !s.name){
      window.location.href = '../index.html';
      return false;
    }
    return true;
  }
};
