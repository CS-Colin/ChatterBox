const api = window.chatterbox;
api.onStatus(text => {document.getElementById('status').textContent=text;});
document.getElementById('reload').onclick=() => api.action('reload');
document.getElementById('updates').onclick=() => api.action('updates');
document.getElementById('settings').onclick=() => api.action('open-settings');
