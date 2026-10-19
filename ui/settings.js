const api=window.chatterbox;
api.action('settings').then(s=>{document.getElementById('feed').value=s.githubRepo;document.getElementById('startup').checked=s.startup;document.getElementById('version').textContent=`Chatterbox ${s.version}`;});
document.querySelector('form').onsubmit=async e=>{e.preventDefault();try{await api.action('save',{githubRepo:document.getElementById('feed').value,startup:document.getElementById('startup').checked});document.getElementById('result').textContent='Settings saved.';}catch{document.getElementById('result').textContent='Enter a GitHub repository as owner/repository.';}};

