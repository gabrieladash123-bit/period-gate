const {assert}=require('./transport.cjs');
const {demand,witness}=require('./demand.cjs');
const {config,plan}=require('./proof-checks.cjs');
const tasks=config.filter(c=>c.status==='BOUNDED'&&60%c.period_ms===0);
for(let mask=0;mask<1<<tasks.length;mask++){
 const subset=tasks.filter((_,i)=>mask&(1<<i)),curve=demand(subset);
 for(let t=1;t<=60;t++)assert(curve[t-1]===subset.reduce((n,x)=>n+Math.max(0,Math.floor((t-x.deadline_ms)/x.period_ms)+1)*x.execution_ms,0),'Enumerated releases agree with floor formula');
}
const pair=[{index:0,...config[0]},{index:1,...config[1]}],curve=demand(pair),failure=witness(pair,curve);
assert(curve[59]===36&&failure.horizon_ms===4&&failure.demand_ms===6,'Utilization is insufficient');
const full=demand([config[1],config[5]]);assert(full[59]===60&&full.every((v,i)=>v<=i+1),'Exact utilization boundary');
assert(plan.length===13&&plan.filter(x=>x.error).length===3,'Fourteen-transaction proof plan');
console.log('16 catalog subsets, demand witnesses and exact-capacity boundary verified');
