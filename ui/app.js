const api = window.chatterbox;
api.onStatus(text => {document.getElementById('status').textContent=text;});
document.getElementById('reload').onclick=() => api.action('reload');
document.getElementById('updates').onclick=() => api.action('updates');
document.getElementById('settings').onclick=() => api.action('open-settings');
let state,mode='add',busy=false;
function render(next) {
  state=next;
  const list=document.getElementById('accounts');list.replaceChildren();
  for(const account of state.accounts) {
    const button=document.createElement('button');button.type='button';button.className='account';
    button.textContent=account.name;button.title=account.name;
    button.setAttribute('aria-pressed',String(account.id===state.activeAccount));
    button.onclick=async()=>{try{render(await api.action('account-switch',account.id));}catch{document.getElementById('account-error').textContent='Could not switch accounts. Try again.';}};
    list.append(button);
  }
}
api.onAccounts(render);
api.action('accounts').then(render);
const form=document.getElementById('account-form'),input=document.getElementById('account-name');
function edit(nextMode) {
  mode=nextMode;form.hidden=false;document.getElementById('account-error').textContent='';
  input.value=mode==='rename' ? state.accounts.find(a=>a.id===state.activeAccount).name : '';
  document.getElementById('account-save').textContent=mode==='rename'?'Save':'Add';input.focus();input.select();
}
document.getElementById('add-account').onclick=()=>edit('add');
document.getElementById('rename-account').onclick=()=>{if(state) edit('rename');};
document.getElementById('account-cancel').onclick=()=>{form.hidden=true;};
form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;busy=true;
  try{render(await api.action(mode==='rename'?'account-rename':'account-add',input.value));form.hidden=true;}
  catch{document.getElementById('account-error').textContent='Enter an account name of 1–40 characters.';}
  finally{busy=false;}
};
