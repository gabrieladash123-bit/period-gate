// Independent integer job-count oracle: enumerate releases instead of using the contract's floor formula.
function demand(tasks){
 return Array.from({length:60},(_,i)=>tasks.reduce((sum,t)=>{
  if(!Number.isInteger(t.execution_ms)||!Number.isInteger(t.deadline_ms)||!Number.isInteger(t.period_ms)||t.execution_ms<1||t.deadline_ms<t.execution_ms||t.period_ms<t.deadline_ms||t.period_ms>60||60%t.period_ms)throw Error('Unsupported task');
  for(let release=0;release+t.deadline_ms<=i+1;release+=t.period_ms)sum+=t.execution_ms;return sum;
 },0));
}
function witness(tasks,curve){const at=curve.findIndex((work,i)=>work>i+1);if(at<0)return null;return {horizon_ms:at+1,demand_ms:curve[at],capacity_ms:at+1,contributions:tasks.map(t=>({index:t.index,demand_ms:demand([t])[at]}))};}
module.exports={demand,witness};
