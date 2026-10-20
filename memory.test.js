const {test}=require('node:test');
const assert=require('node:assert/strict');
const {reclaimView,memoryMegabytes}=require('./memory');
function view({busy=false,attached=false,fail=false}={}) {
  const calls=[];
  const wc={isDestroyed:()=>false,isLoadingMainFrame:()=>false,isCurrentlyAudible:()=>busy,debugger:{isAttached:()=>attached,attach:()=>{attached=true;calls.push('attach');},sendCommand:async command=>{calls.push(command);if(fail)throw Error('test');},detach:()=>{attached=false;calls.push('detach');}}};
  return {webContents:wc,calls};
}
test('cleanup collects garbage and detaches without closing or reloading the account',async()=>{
  const v=view();assert.equal(await reclaimView(v),true);assert.deepEqual(v.calls,['attach','HeapProfiler.collectGarbage','detach']);
});
test('audible accounts and existing debugger sessions are left alone',async()=>{
  for(const options of [{busy:true},{attached:true}]){const v=view(options);assert.equal(await reclaimView(v),false);assert.deepEqual(v.calls,[]);}
});
test('failed cleanup releases its debugger connection',async()=>{
  const v=view({fail:true});assert.equal(await reclaimView(v),false);assert.equal(v.calls.at(-1),'detach');
});
test('Windows process memory is reported from KiB as MiB',()=>{
  assert.equal(memoryMegabytes([{memory:{privateBytes:2048}},{memory:{privateBytes:3072}}]),5);
});
