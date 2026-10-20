const api=window.chatterbox;
function describeMemory(memory) {
  const last=memory.lastCleanup;
  return `About ${memory.megabytes} MB in use. One account runs at a time; ${memory.total} sign-ins saved. Only the selected account receives notifications.`+(last ? ` Last cleanup: ${last.beforeMB} MB → ${last.afterMB} MB.` : ' Inactive accounts are unloaded to save memory.');
}
api.action('settings').then(s=>{
  if(!s.memory)return;
  const section=document.createElement('section'),title=document.createElement('strong'),text=document.createElement('p'),button=document.createElement('button');
  title.textContent='Memory and notifications';text.textContent=describeMemory(s.memory);
  button.type='button';button.textContent='Reclaim unused memory';
  button.onclick=async()=>{
    button.disabled=true;
    try {
      const result=await api.action('memory-reclaim');
      const fresh=await api.action('settings');
      text.textContent=result?.deferred ? 'Cleanup is waiting for playback, calls or downloads to finish.' : describeMemory(fresh.memory);
    } catch {text.textContent='Cleanup could not finish. All account pages remain open.';}
    finally {button.disabled=false;}
  };
  section.append(title,text,button);document.querySelector('main').append(section);
});
api.action('settings').then(s=>{document.getElementById('feed').value=s.githubRepo;document.getElementById('startup').checked=s.startup;document.getElementById('version').textContent=`Chatterbox ${s.version}`;const activation=document.createElement('section');const label=document.createElement('strong');label.textContent=s.activation ? 'Activated' : 'Invitation required';const name=document.createElement('p');name.textContent=s.activation ? `Licensed to ${s.activation.name}` : 'Install with your invitation code.';const id=document.createElement('small');id.textContent=s.activation ? `Invitation ${s.activation.id}` : '';activation.append(label,name,id);document.querySelector('main').append(activation);});
document.querySelector('form').onsubmit=async e=>{e.preventDefault();try{await api.action('save',{githubRepo:document.getElementById('feed').value,startup:document.getElementById('startup').checked});document.getElementById('result').textContent='Settings saved.';}catch{document.getElementById('result').textContent='Enter a GitHub repository as owner/repository.';}};

