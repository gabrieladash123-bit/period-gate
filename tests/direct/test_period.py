import ast
import hashlib
import itertools
import json
import random
import re
import subprocess
from pathlib import Path
import pytest

ROOT=Path(__file__).resolve().parents[2]
CONFIG=json.loads((ROOT/'config/tasks.json').read_text())
FIELDS=('status','execution_ms','deadline_ms','period_ms')
BASE='https://raw.githubusercontent.com/gabrieladash123-bit/period-gate/'+'a'*40+'/tasks/'

def body(i): return (ROOT/'tasks'/(CONFIG[i]['task']+'.md')).read_bytes()
def decision(i):
    row=CONFIG[i]; fields=['execution','deadline','period','model'] if row['status']=='BOUNDED' else ['uncertainty']
    return {**{k:row[k] for k in FIELDS},'anchors':[{'field':f,'paragraph':2 if f=='model' else 1,'quote':q} for f,q in zip(fields,row['quotes'])]}
def mock(vm,i,raw=None,valid=True):
    vm.clear_mocks(); vm.mock_web(re.escape(BASE+CONFIG[i]['task']+'.md'),{'status':200,'body':body(i)})
    vm.mock_llm(r'PERIOD-INTERPRET',json.dumps(decision(i) if raw is None else raw))
    vm.mock_llm(r'PERIOD-AUDIT',json.dumps({'valid':valid}))

@pytest.fixture
def deploy(direct_deploy,direct_alice,direct_bob):
    def make(**overrides):
        args={'task_names':[c['task'] for c in CONFIG], 'specification_urls':[BASE+c['task']+'.md' for c in CONFIG],
              'specification_hashes':[hashlib.sha256(body(i)).hexdigest() for i in range(6)],
              'reservation_owners':[[direct_alice,direct_bob][c['owner']] for c in CONFIG]}
        args.update(overrides)
        return direct_deploy(str(ROOT/'contracts/period_gate.py'),**args)
    return make

def call(c,vm,players,i):
    vm.sender=players[CONFIG[i]['owner']]; mock(vm,i); c.activate(i,c.get_state()['revision'])

def test_full_reservation_proof(deploy,direct_vm,direct_alice,direct_bob):
    c=deploy(); players=[direct_alice,direct_bob]
    for i in (0,1,2,3,4):
        call(c,direct_vm,players,i); assert direct_vm.run_validator() is True
    s=c.get_state(); assert s['revision']==2 and s['active']==[0,2] and s['occupied_60']==30
    witness=s['history'][1]['witness']; assert witness['horizon_ms']==4 and witness['demand_ms']==6
    assert [row['status'] for row in s['catalog'][:5]]==['ACTIVE','WAITING','ACTIVE','UNRESOLVED','UNSUPPORTED']
    direct_vm.sender=direct_alice; c.release(0,2)
    direct_vm.clear_mocks(); direct_vm.sender=direct_bob; c.activate(1,3)
    assert c.get_state()['history'][-1]['fresh_interpretation'] is False
    direct_vm.sender=direct_alice; c.activate(0,4)
    assert c.get_state()['catalog'][0]['status']=='WAITING'
    direct_vm.sender=direct_bob; c.release(2,4)
    call(c,direct_vm,players,5); assert direct_vm.run_validator() is True
    s=c.get_state(); assert s['revision']==6 and s['active']==[1,5] and s['occupied_60']==60 and s['attempts']==8
    assert len(s['history'])==10 and all(work<=t for t,work in enumerate(s['demand'],1))

@pytest.mark.parametrize('field,value',[('execution_ms',1),('deadline_ms',10),('period_ms',20),('status','UNRESOLVED')])
def test_validator_checks_each_consequential_field(deploy,direct_vm,direct_alice,field,value):
    c=deploy(); direct_vm.sender=direct_alice; mock(direct_vm,0); c.activate(0,0)
    changed=decision(0); changed[field]=value
    if field=='status': changed={**{k:None for k in ('execution_ms','deadline_ms','period_ms')},'status':'UNRESOLVED','anchors':[{'field':'uncertainty','paragraph':-1,'quote':''}]}
    mock(direct_vm,0,changed)
    assert direct_vm.run_validator() is False

@pytest.mark.parametrize('change',['audit','source'])
def test_validator_audits_and_refetches(deploy,direct_vm,direct_alice,change):
    c=deploy(); direct_vm.sender=direct_alice; mock(direct_vm,0); c.activate(0,0)
    mock(direct_vm,0,valid=change!='audit')
    if change=='source':
        direct_vm.clear_mocks(); direct_vm.mock_web(r'.*',{'status':200,'body':b'Changed source. '*20})
    assert direct_vm.run_validator() is False

@pytest.mark.parametrize('bad',[
 {'execution_ms':True}, {'execution_ms':3.0}, {'execution_ms':'3'}, {'execution_ms':0},
 {'execution_ms':60001}, {'period_ms':None}, {'status':'APPROVED'}, {'anchors':[]},
 {'anchors':[{'field':'execution','paragraph':True,'quote':'fabricated source text'}]*4},
 {'anchors':[{'field':'execution','paragraph':1,'quote':'fabricated source text'}]*4},
 {'confidence':0.99},
])
def test_malformed_model_does_not_consume_capacity(deploy,direct_vm,direct_alice,bad):
    c=deploy(); direct_vm.sender=direct_alice; before=c.get_state(); mock(direct_vm,0,{**decision(0),**bad})
    with direct_vm.expect_revert('LLM_ERROR'): c.activate(0,0)
    assert c.get_state()==before

@pytest.mark.parametrize('status,text',[(404,b'x'*100),(503,b'x'*100),(200,b'tiny'),(200,b'x'*10001),(200,b'changed source'*10)])
def test_external_failure_is_retryable(deploy,direct_vm,direct_alice,status,text):
    c=deploy(); direct_vm.sender=direct_alice; before=c.get_state(); direct_vm.mock_web(r'.*',{'status':status,'body':text})
    with direct_vm.expect_revert(): c.activate(0,0)
    assert c.get_state()==before

def test_owner_and_stale_guards(deploy,direct_vm,direct_alice,direct_bob):
    c=deploy(); direct_vm.sender=direct_bob
    with direct_vm.expect_revert('does not own'): c.activate(0,0)
    direct_vm.sender=direct_alice; mock(direct_vm,0); c.activate(0,0)
    before=c.get_state()
    with direct_vm.expect_revert('revision does not match'): c.release(0,0)
    with direct_vm.expect_revert('cannot be activated'): c.activate(0,1)
    direct_vm.sender=direct_bob
    with direct_vm.expect_revert('does not own'): c.release(0,1)
    assert c.get_state()==before

def test_release_after_activation_budget(deploy,direct_vm,direct_alice,direct_bob):
    c=deploy(); direct_vm.sender=direct_alice; mock(direct_vm,0)
    for i in range(3):
        c.activate(0,2*i)
        if i==0: direct_vm.clear_mocks()
        c.release(0,2*i+1)
    s=c.get_state(); assert s['attempts']==3 and len(s['history'])==6 and s['active']==[] and s['demand']==[0]*60
    with direct_vm.expect_revert('budget is exhausted'): c.activate(0,6)
    direct_vm.sender=direct_bob; mock(direct_vm,1); c.activate(1,6)
    assert c.get_state()['active']==[1]

def test_rejected_retry_requires_configuration_change(deploy,direct_vm,direct_alice,direct_bob):
    c=deploy(); call(c,direct_vm,[direct_alice,direct_bob],0); call(c,direct_vm,[direct_alice,direct_bob],1)
    before=c.get_state()
    with direct_vm.expect_revert('unchanged since rejection'): c.activate(1,1)
    assert c.get_state()==before

@pytest.mark.parametrize('index',[3,4])
def test_unusable_models_cannot_retry_or_release(deploy,direct_vm,direct_alice,index):
    c=deploy(); direct_vm.sender=direct_alice; mock(direct_vm,index); c.activate(index,0)
    with direct_vm.expect_revert('cannot be activated'): c.activate(index,0)
    with direct_vm.expect_revert('not active'): c.release(index,0)
    assert c.get_state()['demand']==[0]*60

@pytest.mark.parametrize('overrides',[
 {'task_names':['pulse']}, {'task_names':['pulse']*6}, {'specification_urls':['https://example.org']*6},
 {'specification_hashes':['F'*64]*6}, {'reservation_owners':[]},
])
def test_invalid_catalog(deploy,direct_vm,overrides):
    with direct_vm.expect_revert(): deploy(**overrides)

@pytest.fixture
def arithmetic():
    tree=ast.parse((ROOT/'contracts/period_gate.py').read_text())
    tree.body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('envelope','supported')]
    namespace={};exec(compile(tree,'contract-arithmetic','exec'),namespace);return namespace

def edf(tasks,horizon=600):
    jobs=[]
    for time in range(horizon+1):
        if any(deadline<=time and remaining>0 for deadline,remaining in jobs):return False
        if time==horizon:break
        for task in tasks:
            if time%task['period_ms']==0:jobs.append([time+task['deadline_ms'],task['execution_ms']])
        pending=[j for j in jobs if j[1]>0]
        if pending:min(pending,key=lambda j:j[0])[1]-=1
    return True

def test_exhaustive_subsets_and_long_horizon(arithmetic):
    tasks=[{k:c[k] for k in FIELDS[1:]} for c in CONFIG if c['status']=='BOUNDED' and 60%c['period_ms']==0]
    for flags in itertools.product((0,1),repeat=len(tasks)):
        selected=[t for t,flag in zip(tasks,flags) if flag]; curve=arithmetic['envelope'](selected)
        accepted=all(d<=t for t,d in enumerate(curve,1))
        assert accepted==edf(selected)
        if accepted:
            for horizon in range(1,601):
                work=sum(sum(task['execution_ms'] for release in range(0,horizon+1,task['period_ms']) if release+task['deadline_ms']<=horizon) for task in selected)
                assert work<=horizon

def test_seeded_edf_crosscheck(arithmetic):
    rng=random.Random(713); vectors=[]
    for _ in range(500):
        tasks=[]
        for _ in range(rng.randrange(1,5)):
            period=rng.choice([2,3,4,5,6,10,12,15,20,30,60]); deadline=rng.randrange(1,period+1); execution=rng.randrange(1,deadline+1)
            tasks.append({'execution_ms':execution,'deadline_ms':deadline,'period_ms':period})
        curve=arithmetic['envelope'](tasks); assert all(d<=t for t,d in enumerate(curve,1))==edf(tasks,120)
        vectors.append({'tasks':tasks,'demand':curve})
    script="const fs=require('node:fs'),{demand}=require('./scripts/demand.cjs');const a=JSON.parse(fs.readFileSync(0,'utf8'));if(a.some(x=>JSON.stringify(demand(x.tasks))!==JSON.stringify(x.demand)))throw Error('Cross-language demand mismatch');"
    subprocess.run(['node','-e',script],input=json.dumps(vectors),text=True,cwd=ROOT,check=True)
