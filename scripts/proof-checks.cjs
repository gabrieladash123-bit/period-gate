const fs=require('node:fs'),path=require('node:path');
const {root,assert,equal,digest}=require('./transport.cjs');
const {demand,witness}=require('./demand.cjs');
const config=JSON.parse(fs.readFileSync(path.join(root,'config/tasks.json')));
const fields=['status','execution_ms','deadline_ms','period_ms'];
function reports(revision){return config.map(c=>{const text=fs.readFileSync(path.join(root,'tasks',c.task+'.md'),'utf8');return {task:c.task,url:`https://raw.githubusercontent.com/gabrieladash123-bit/period-gate/${revision}/tasks/${c.task}.md`,sha256:digest(Buffer.from(text)),text};});}
function initial(d){return {catalog:d.reports.map((r,i)=>({task:r.task,url:r.url,sha256:r.sha256,owner:d.callers[config[i].owner],status:'UNSEEN',attempts:0,last_attempt_revision:-1,compiled:null})),revision:0,attempts:0,demand:Array(60).fill(0),occupied_60:0,active:[],history:[]};}
function compiled(value,index,d){
 const r=d.reports[index],c=config[index],paragraphs=r.text.replace(/\r\n/g,'\n').split('\n\n').map(x=>x.trim()).filter(Boolean);
 assert(value&&equal(Object.keys(value).sort(),['decision','specification']),'Compiled schema');
 assert(equal(value.specification,{url:r.url,sha256:r.sha256,text:r.text,paragraphs}),'Exact fetched specification');
 const v=value.decision;assert(v&&equal(Object.keys(v).sort(),[...fields,'anchors'].sort())&&fields.every(f=>v[f]===c[f]),'Exact independently expected parameters');
 const names=v.status==='BOUNDED'?['execution','deadline','period','model']:['uncertainty'];
 assert(Array.isArray(v.anchors)&&v.anchors.length===names.length,'Complete source criteria');
 v.anchors.forEach((a,i)=>{
  assert(a&&equal(Object.keys(a).sort(),['field','paragraph','quote'])&&a.field===names[i]&&Number.isInteger(a.paragraph)&&typeof a.quote==='string','Typed ordered anchor');
  if(a.paragraph===-1)assert(v.status==='UNRESOLVED'&&a.quote==='','Only unresolved absence');
  else assert(a.paragraph>=0&&a.paragraph<paragraphs.length&&a.quote.length>=15&&a.quote.length<=500&&paragraphs[a.paragraph].includes(a.quote),'Literal criterion quotation');
 });
}
const active=s=>s.catalog.flatMap((row,index)=>row.status==='ACTIVE'?[{index,...row.compiled.decision}]:[]);
function replay(before,item,after,d){
 const s=structuredClone(before),[index,revision]=item.args,row=s.catalog[index],caller=d.callers[item.caller];
 assert(row&&row.owner===caller&&s.revision===revision,'Authorized expected configuration');
 if(item.method==='activate'){
  assert(row.attempts<3&&!['ACTIVE','UNRESOLVED','UNSUPPORTED'].includes(row.status),'Activation eligibility');
  assert(row.status!=='WAITING'||row.last_attempt_revision!==revision,'No repeated unchanged rejection');
  const fresh=row.compiled===null;
  if(fresh){compiled(after.catalog[index].compiled,index,d);row.compiled=after.catalog[index].compiled;}
  const v=row.compiled.decision;let outcome,offered=null,failure=null;
  if(v.status==='UNRESOLVED')outcome='UNRESOLVED';
  else if(!(1<=v.execution_ms&&v.execution_ms<=v.deadline_ms&&v.deadline_ms<=v.period_ms&&v.period_ms<=60&&60%v.period_ms===0))outcome='UNSUPPORTED';
  else{const tasks=active(s).concat([{index,...v}]);offered=demand(tasks);failure=witness(tasks,offered);outcome=failure?'WAITING':'ACTIVE';}
  row.status=outcome;row.attempts++;row.last_attempt_revision=revision;s.attempts++;
  if(outcome==='ACTIVE'){s.demand=offered;s.revision++;}
  s.history.push({operation:'ACTIVATE',index,caller,revision_before:revision,revision_after:s.revision,fresh_interpretation:fresh,outcome,offered_demand:offered,witness:failure});
 }else if(item.method==='release'){
  assert(row.status==='ACTIVE','Only active release');row.status='AVAILABLE';s.demand=demand(active(s));s.revision++;
  s.history.push({operation:'RELEASE',index,caller,revision_before:revision,revision_after:s.revision});
 }else throw Error('Unexpected method');
 s.active=s.catalog.flatMap((r,i)=>r.status==='ACTIVE'?[i]:[]);s.occupied_60=s.demand[59];
 assert(equal(s,after),'Full source-bound demand-ledger replay: '+item.label);
 assert(s.demand.every((n,i)=>n<=i+1)&&s.attempts<=18&&s.history.length<=36,'Configuration invariant');
}
const plan=[
 {label:'unknown-bound',method:'activate',args:[3,0],caller:0},
 {label:'pulse-admit',method:'activate',args:[0,0],caller:0},
 {label:'scan-deadline-reject',method:'activate',args:[1,1],caller:1},
 {label:'bulk-admit',method:'activate',args:[2,1],caller:1},
 {label:'odd-period',method:'activate',args:[4,2],caller:0},
 {label:'wrong-owner-release',method:'release',args:[0,2],caller:1,error:'[EXPECTED] Caller does not own reservation'},
 {label:'pulse-release',method:'release',args:[0,2],caller:0},
 {label:'scan-cached-retry',method:'activate',args:[1,3],caller:1},
 {label:'stale-activation',method:'activate',args:[0,3],caller:0,error:'[EXPECTED] Configuration revision does not match'},
 {label:'pulse-cached-reject',method:'activate',args:[0,4],caller:0},
 {label:'bulk-release',method:'release',args:[2,4],caller:1},
 {label:'duplicate-scan',method:'activate',args:[1,5],caller:1,error:'[EXPECTED] Reservation cannot be activated'},
 {label:'fill-exact-capacity',method:'activate',args:[5,5],caller:0}
];
function final(state){
 assert(equal(state.active,[1,5])&&state.revision===6&&state.attempts===8&&state.occupied_60===60&&state.history.length===10,'Final exact-capacity plan');
 const rejected=state.history.find(h=>h.operation==='ACTIVATE'&&h.index===1&&h.outcome==='WAITING');
 assert(rejected.witness.horizon_ms===4&&rejected.witness.demand_ms===6&&rejected.offered_demand[59]===36,'Low-utilization short-deadline failure');
 assert(state.history[6].fresh_interpretation===false&&state.history[6].outcome==='ACTIVE','Released capacity enables cached retry');
 assert(state.catalog[3].status==='UNRESOLVED'&&state.catalog[4].status==='UNSUPPORTED','Ineligible sources cannot reserve');
}
module.exports={config,reports,initial,compiled,active,replay,plan,final};
