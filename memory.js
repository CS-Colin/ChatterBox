// Reclaim unreachable JavaScript objects without unloading pages, cookies,
// service workers or network connections used for desktop notifications.
async function reclaimView(view) {
  const wc=view.webContents;
  if(wc.isDestroyed() || wc.isLoadingMainFrame() || wc.isCurrentlyAudible() || wc.debugger.isAttached()) return false;
  let attached=false,timer;
  try {
    wc.debugger.attach('1.3');attached=true;
    await Promise.race([
      wc.debugger.sendCommand('HeapProfiler.collectGarbage'),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Memory cleanup timed out')),5000);})
    ]);
    return true;
  } catch {return false;}
  finally {
    clearTimeout(timer);
    if(attached && !wc.isDestroyed() && wc.debugger.isAttached()) {
      try {wc.debugger.detach();} catch {}
    }
  }
}
function memoryMegabytes(metrics) {
  return Math.round(metrics.reduce((total,p)=>total+(p.memory?.privateBytes || 0),0)/1024);
}
module.exports={reclaimView,memoryMegabytes};
