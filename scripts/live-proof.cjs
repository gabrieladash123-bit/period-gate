const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,sourceHash,save,invoke,read,rpc,receipt}=require('./transport.cjs');
const {config,reports,initial,replay,plan,final}=require('./proof-checks.cjs');
async function main(){
 assert(await rpc('eth_chainId',[])==='0xf22f','Gasless StudioNet only');
 const accounts=JSON.parse(process.env.PERIOD_ACCOUNTS||'null');assert(accounts?.length===2,'Two owner accounts');
 const revision=fs.readFileSync(path.join(root,'config/fixture-revision.txt'),'utf8').trim();assert(/^[a-f0-9]{40}$/.test(revision),'Pinned fixtures');
 const rows=reports(revision);
 for(const r of rows){const response=await fetch(r.url,{signal:AbortSignal.timeout(45000)});assert(response.ok&&Buffer.from(await response.arrayBuffer()).equals(Buffer.from(r.text)),'Exact public fixture bytes');}
 process.env.PERIOD_ACCOUNT=accounts[0].name;
 const args=[rows.map(r=>r.task),rows.map(r=>r.url),rows.map(r=>r.sha256),config.map(c=>accounts[c.owner].address)];
 const hash=await invoke('deployment',['deploy','--contract','contracts/period_gate.py','--args',...args.map(JSON.stringify)]);
 const r=await receipt('deployment',hash,true),contract=r.to_address||r.recipient;
 assert(/^0x[a-f0-9]{40}$/i.test(contract),'Contract address');
 assert(fs.readFileSync(path.join(root,'contracts/period_gate.py')).equals(Buffer.from(await rpc('gen_getContractCode',[contract]),'base64')),'Exact deployed source');
 const d={contract,transaction:hash,reports:rows,fixture_revision:revision,source_sha256:sourceHash,network:'studionet',chain_id:61999,callers:accounts.map(a=>a.address)};save('deployment',d);
 let state=await read('initial',['call',contract,'get_state']);assert(equal(state,initial(d)),'Fresh configuration');save('initial-state',state);
 const trace=[];
 for(const item of plan){
  process.env.PERIOD_ACCOUNT=accounts[item.caller].name;
  const before=state,tx=await invoke(item.label,['write',contract,item.method,'--args',...item.args.map(String)]),rr=await receipt(item.label,tx,!item.error);
  state=await read(item.label+'-state',['call',contract,'get_state']);assert((rr.from_address||rr.sender).toLowerCase()===d.callers[item.caller],'Actual owner signer');
  if(!item.error)replay(before,item,state,d);
  else{assert(equal(before,state),'Rejected operation changed state');const decoded=await read(item.label+'-decoded',['receipt',tx,'--status','FINALIZED','--retries','2']);assert(JSON.stringify(decoded).includes(item.error),'Exact rejection');save(item.label+'-decoded-receipt',decoded);}
  const p={...item,contract,transaction:tx,sender:d.callers[item.caller],state_before:before,state};trace.push(p);save(item.label,p);save('trace',trace);
  console.log('VERIFIED',item.label,state.revision,state.occupied_60);
 }
 final(state);save('final-state',state);
}
main().catch(e=>{console.error(e.stack,e.cause?.message||'');process.exitCode=1;});
