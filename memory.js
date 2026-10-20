// Reclaim unreachable JavaScript objects without unloading pages, cookies,
// service workers or network connections used for desktop notifications.
async function runMemoryCommand(wc,command,params={}) {
  if(wc.isDestroyed() || wc.isLoadingMainFrame() || wc.isCurrentlyAudible() || wc.debugger.isAttached()) return false;
  let attached=false,timer;
  try {
    wc.debugger.attach('1.3');attached=true;
    await Promise.race([
      wc.debugger.sendCommand(command,params),
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
async function reclaimView(view) {return runMemoryCommand(view.webContents,'HeapProfiler.collectGarbage');}
async function reclaimBrowserMemory(wc) {
  // Chromium's pressure handler also purges discardable native/image caches;
  // collecting the JavaScript heap alone cannot release those allocations.
  return runMemoryCommand(wc,'Memory.simulatePressureNotification',{level:'critical'});
}
function shouldReclaim({megabytes,idleMilliseconds,audible,downloading,editing}) {
  return megabytes>=384 && idleMilliseconds>=30000 && !audible && !downloading && !editing;
}
function memoryMegabytes(metrics) {
  return Math.round(metrics.reduce((total,p)=>total+(p.memory?.privateBytes || 0),0)/1024);
}
module.exports={reclaimView,reclaimBrowserMemory,memoryMegabytes,shouldReclaim};
