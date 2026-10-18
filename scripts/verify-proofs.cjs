const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,digest,rpc,read,receiptSummary,save}=require('./transport.cjs');
const {decodeReceipt}=require('./receipt-calldata.cjs');
const {config,reports,initial,replay,plan,final}=require('./proof-checks.cjs');
const load=n=>JSON.parse(fs.readFileSync(path.join(root,'proofs',n+'.json')));
async function main(){
 const offline=process.argv.includes('--offline'),d=load('deployment'),code=fs.readFileSync(path.join(root,'contracts/period_gate.py')),journal=load('transactions');
 assert(d.network==='studionet'&&d.chain_id===61999&&d.source_sha256===digest(code)&&journal.source_sha256===digest(code),'Deployment source and chain');
 assert(d.fixture_revision===fs.readFileSync(path.join(root,'config/fixture-revision.txt'),'utf8').trim()&&equal(d.reports,reports(d.fixture_revision)),'Pinned source specifications');
 assert(d.callers.length===2&&new Set(d.callers).size===2,'Distinct owners');
 if(!offline)assert(await rpc('eth_chainId',[])==='0xf22f','StudioNet chain');
 const hashes=new Set(),summary={mode:offline?'offline-artifact':'fresh-rpc-and-state',contract:d.contract,source_sha256:digest(code),transactions:[]};
 async function verify(label,hash,success,caller,expected){
  assert(!hashes.has(hash)&&journal.hashes[label]===hash,'Unique journal-bound receipt');hashes.add(hash);
  const saved=load(label+'-receipt'),r=offline?saved:await rpc('eth_getTransactionByHash',[hash]),s=receiptSummary(r);
  assert(s.hash===hash&&s.status==='FINALIZED'&&s.result==='MAJORITY_AGREE'&&s.agree>(s.agree+s.disagree+s.idle)/2,'Finalized strict majority');
  assert((r.to_address||r.recipient).toLowerCase()===d.contract.toLowerCase()&&(r.from_address||r.sender).toLowerCase()===d.callers[caller],'Actual target and signer');
  assert(equal(saved.consensus_data.votes,r.consensus_data.votes)&&equal(saved.data,r.data)&&equal(await decodeReceipt(r),expected),'Actual calldata and raw votes');
  assert(success?['SUCCESS','FINISHED_WITH_RETURN'].includes(s.execution):s.execution==='ERROR','Execution result');
  if(label==='deployment')assert(code.equals(Buffer.from(r.data.contract_code,'base64')),'Deployment receipt source bytes');
  summary.transactions.push({label,...s});
 }
 await verify('deployment',d.transaction,true,0,{args:[d.reports.map(r=>r.task),d.reports.map(r=>r.url),d.reports.map(r=>r.sha256),config.map(c=>d.callers[c.owner])]});
 let previous=load('initial-state');assert(equal(previous,initial(d)),'Exact initial catalog');
 const trace=load('trace');assert(trace.length===plan.length,'Complete proof sequence');
 for(let i=0;i<plan.length;i++){
  const item=plan[i],p=trace[i];assert(equal(p,load(item.label))&&Object.keys(item).every(k=>equal(p[k],item[k]))&&p.contract===d.contract&&p.sender===d.callers[item.caller]&&equal(p.state_before,previous),'Call and snapshot chain');
  await verify(item.label,p.transaction,!item.error,item.caller,{method:item.method,args:item.args});
  if(!item.error)replay(previous,item,p.state,d);
  else assert(equal(previous,p.state)&&JSON.stringify(load(item.label+'-decoded-receipt')).includes(item.error),'Rejected state and exact error');
  previous=p.state;
 }
 final(previous);assert(equal(previous,load('final-state'))&&hashes.size===14&&Object.keys(journal.hashes).length===14,'Complete final proof');
 if(!offline){assert(code.equals(Buffer.from(await rpc('gen_getContractCode',[d.contract]),'base64')),'Live source bytes');assert(equal(previous,await read('fresh-final',['call',d.contract,'get_state'])),'Fresh final configuration');}
 summary.active=previous.active;summary.revision=previous.revision;summary.occupied_60=previous.occupied_60;summary.transaction_calldata_checked=true;
 if(!offline){summary.live_state_match=true;save('verification',summary);}
 console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
