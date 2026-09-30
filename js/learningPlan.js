// 两端共享短复习题单；这里只练网页题，不向机器人发送唤醒或控制命令。
const LearningPlan = {
  version: 0,
  questions: [],
  t(key) { return I18n.t('plan.' + key); },
  async refresh() {
    const owner = AppStorage.owner, version = ++this.version;
    const panel = document.getElementById('plan-panel');
    panel.hidden = owner === 'guest';
    if (panel.hidden) { this.questions=[]; return; }
    try {
      await LearningHistory.writes;
      const result = await LearningAccount.request('/api/tutor/plan?expected_account_id=' + encodeURIComponent(owner));
      if (version !== this.version || AppStorage.owner !== owner || result.account_id !== owner) return;
      this.questions = result.questions;
      document.getElementById('plan-status').textContent = this.t(result.robot_linked && result.robot_status === 'ready' ? 'linked' : result.robot_linked ? 'waiting' : 'unlinked');
      const list = document.getElementById('plan-list'); list.replaceChildren();
      for (const question of this.questions) {
        const item = document.createElement('li'), button = document.createElement('button');
        const text = document.createElement('span'); text.textContent = question.question;
        button.className='btn-refresh'; button.textContent=this.t('practice');
        button.onclick = () => { if (owner === AppStorage.owner) this.practice(question); };
        item.append(text,button); list.append(item);
      }
      document.getElementById('plan-empty').hidden = !!this.questions.length;
    } catch {
      if (version === this.version && owner === AppStorage.owner) document.getElementById('plan-status').textContent = this.t('offline');
    }
  },
  practice(question) {
    if (AppStorage.blocked) return;
    // 客户端也重算，避免把云端的任意文字/答案执行成题目。
    const match = /^math_(\d{1,2})_([+-])_(\d{1,2})$/.exec(question.question_id || '');
    if (!match) return;
    const left=Number(match[1]), op=match[2], right=Number(match[3]);
    const answer=op==='+' ? left+right : left-right;
    if (Math.max(left,right)>30 || answer<0 || answer>30) return;
    navigateTo('math');
    mathAnswer=answer;
    currentMathQuestion={questionId:question.question_id,question:`${left} ${op} ${right} = ?`,num1:left,num2:right,operator:op,correctAnswer:String(answer)};
    document.getElementById('num1').textContent=left;
    document.getElementById('num2').textContent=right;
    document.getElementById('operator').textContent=op;
    generateMathOptions(answer);
  },
  init() {
    document.getElementById('plan-refresh').onclick=()=>this.refresh();
    window.addEventListener('languageChanged',()=>this.refresh());
    window.addEventListener('online',()=>this.refresh());
    window.addEventListener('learningSynced',()=>this.refresh());
    setInterval(()=>{ if(document.visibilityState==='visible') this.refresh(); },30000);
    this.refresh();
  }
};
document.addEventListener('learningReady',()=>LearningPlan.init());
