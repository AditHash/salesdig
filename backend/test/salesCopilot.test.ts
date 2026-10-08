import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createHash,randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { readFile } from 'node:fs/promises';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('TEST_DATABASE_URL must point to an isolated database ending in _test');
process.env.DATABASE_URL=url;
process.env.JWT_SECRET='copilot-fixture-secret';
const {postgres,initializePostgres}=await import('../src/config/postgres.js');
const {DEFAULT_WORKSPACE_SETTINGS}=await import('../src/config/workspaceDefaults.js');
const {processNextAccountResearch}=await import('../src/services/research/researchJobs.service.js');
const {validateResearchClaims}=await import('../src/services/research/evidenceExtraction.service.js');
const {processNextOpportunityMatching}=await import('../src/services/opportunityMatching.service.js');
const {createSendMessage}=await import('../src/controllers/chat.controller.js');
const {loadAccountContext}=await import('../src/services/accountContext.service.js');
const {buildSalesDraft,DRAFT_KINDS}=await import('../src/services/salesPreparation.service.js');
const {default:isAuth}=await import('../src/middlewares/isAuth.js');
const {default:app}=await import('../src/app.js');
const workspaces=[randomUUID(),randomUUID()];
const users=[randomUUID(),randomUUID(),randomUUID()];
let server: Server; let base=''; let accountId=''; let opportunityId=''; let draftId=''; let runId=''; let claimId='';
let providerCalls=0; let providerContext:any;
app.post('/api/fixture-chat',isAuth,createSendMessage(async (instructions,data) => {
  providerCalls++; providerContext=JSON.parse(data);
  assert.match(instructions,/untrusted data/);
  return `Evidence-backed reply [claim:${claimId}]`;
}));
let globalRetrievalQuery='';
app.post('/api/fixture-global-chat',isAuth,createSendMessage(async (instructions,data) => {
  if(instructions.startsWith('Rewrite')) return 'Fixture Account revenue';
  assert.equal(JSON.parse(data).reports[0],'Legacy report digest');
  return 'Global report reply';
},async(query,userId,workspaceId)=>{
  globalRetrievalQuery=query;
  assert.equal(userId,users[0]); assert.equal(workspaceId,workspaces[0]);
  return [{reportId:'legacy-fixture',customerName:'Fixture Account',companyDomain:'copilot.example',digestText:'Legacy report digest'}];
}));
app.post('/api/fixture-invalid-citation',isAuth,createSendMessage(async()=>`Unsupported citation [claim:${randomUUID()}]`));
const request=async(path:string,user=users[0],method='GET',body?:unknown) => {
  const r=await fetch(`${base}${path}`,{method,headers:{Authorization:`Bearer ${jwt.sign({id:user,workspaceId:workspaces[0]},process.env.JWT_SECRET!)}`,...(body ? {'Content-Type':'application/json'}:{})},...(body ? {body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
};
before(async()=>{
  await initializePostgres();
  for(const id of workspaces) await postgres.query('INSERT INTO workspaces (id,slug,settings) VALUES ($1,$2,$3::jsonb)',[id,`copilot-${id}`,JSON.stringify({...DEFAULT_WORKSPACE_SETTINGS,companyName:'Fixture Seller'})]);
  for(const [i,id] of users.entries()) await postgres.query(`INSERT INTO users (id,name,email,role,workspace_id) VALUES ($1,'Fixture Rep',$2,'user',$3)`,[id,`${id}@example.test`,workspaces[i===1?1:0]]);
  server=app.listen(0); await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address(); if(!address || typeof address==='string') throw new Error('No server'); base=`http://127.0.0.1:${address.port}/api`;
  accountId=(await request('/targets',users[0],'POST',{name:'Fixture Account',website:'copilot.example'})).data.id;
  runId=(await request(`/targets/${accountId}/research`,users[0],'POST')).data.runId;
  const content='Fixture Account builds cloud applications for retail customers.';
  const usage={promptTokens:0,outputTokens:0,totalTokens:0};
  await processNextAccountResearch({discover:async()=>({urls:[],usage}),fetch:async(url)=>({url,title:'Fixture source',content,contentHash:createHash('sha256').update(content).digest('hex'),retrievedAt:new Date(),publishedAt:null,sourceType:'company'}),
    extract:async(_name,_domain,sources)=>({claims:validateResearchClaims({claims:[{statement:content,classification:'fact',certainty:'confirmed',eventDate:null,evidence:[{sourceId:sources[0].id,excerpt:content}]}]},sources),usage}),
    analyze:async()=>({intelligence:{technologies:[],people:[],signals:[],gaps:[]},usage})});
  claimId=(await request(`/targets/${accountId}/research/latest/evidence`)).data.claims[0].id;
  const offering=randomUUID();
  await postgres.query(`INSERT INTO seller_offerings(id,workspace_id,name,offering_type,description,capabilities,review_status) VALUES($1,$2,'Cloud consulting','consulting','Cloud application consulting',ARRAY['cloud applications'],'approved')`,[offering,workspaces[0]]);
  await postgres.query('INSERT INTO seller_offering_versions(workspace_id,offering_id,version,snapshot) VALUES($1,$2,1,$3::jsonb)',[workspaces[0],offering,JSON.stringify({name:'Cloud consulting',description:'Cloud application consulting'})]);
  await request(`/targets/${accountId}/opportunities`,users[0],'POST'); await processNextOpportunityMatching();
  opportunityId=(await request(`/targets/${accountId}/opportunities`)).data.opportunities[0].id;
});
after(async()=>{
  if(server) await new Promise<void>(resolve=>server.close(()=>resolve()));
  await postgres.query('DELETE FROM workspaces WHERE id=ANY($1::uuid[])',[workspaces]); await postgres.end();
});

test('seven draft types retain evidence, stay private, support revisions and reject stale saves',async()=>{
  for(const kind of DRAFT_KINDS){
    const result=await request(`/targets/${accountId}/drafts`,users[0],'POST',{opportunityId,kind});
    assert.equal(result.status,201); assert.equal(result.data.sourceSnapshot.runId,runId); assert.equal(result.data.sourceSnapshot.evidence[0].id,claimId);
    assert.ok(result.data.content.length); draftId=result.data.id;
  }
  assert.equal((await request(`/targets/${accountId}/drafts`,users[1])).status,404);
  assert.deepEqual((await request(`/targets/${accountId}/drafts`,users[2])).data.drafts,[]);
  assert.equal((await request(`/targets/${accountId}/drafts/${draftId}`,users[2],'PATCH',{version:1,content:'Forged edit'})).status,404);
  assert.equal((await request(`/targets/${accountId}/drafts/${draftId}`,users[0],'PATCH',{version:1,content:'Reviewed draft'})).data.version,2);
  assert.equal((await request(`/targets/${accountId}/drafts/${draftId}`,users[0],'PATCH',{version:1,content:'Stale edit'})).status,409);
  assert.equal((await postgres.query('SELECT count(*)::int AS n FROM sales_draft_revisions WHERE draft_id=$1',[draftId])).rows[0].n,2);
  assert.equal((await request(`/targets/${accountId}/drafts`,users[0],'POST',{opportunityId,kind:'send_email'})).status,400);
  const exported=await request(`/targets/${accountId}/export`);
  assert.equal(exported.status,200); assert.equal(exported.data.drafts.length,7); assert.equal(exported.data.evidence.claims[0].id,claimId);
  assert.equal((await request(`/targets/${accountId}/export`,users[1])).status,404);
});

test('account chat uses scoped latest evidence, preserves global history, and denies foreign selectors before model calls',async()=>{
  const sessionId=randomUUID();
  await postgres.query('INSERT INTO chat_sessions(id,user_id,workspace_id) VALUES($1,$2,$3)',[sessionId,users[0],workspaces[0]]);
  await postgres.query(`INSERT INTO chat_messages(session_id,role,content) VALUES($1,'user','Legacy global question')`,[sessionId]);
  let result=await request('/fixture-chat',users[1],'POST',{message:'Tell me findings',accountId});
  assert.equal(result.status,404); assert.equal(providerCalls,0);
  assert.equal((await request('/chat/history?accountId=not-a-uuid')).status,400);
  assert.equal((await request('/chat/history',users[0],'DELETE',undefined)).status,200);
  await postgres.query(`INSERT INTO chat_messages(session_id,role,content) VALUES($1,'user','Legacy global question')`,[sessionId]);
  result=await request('/fixture-chat',users[0],'POST',{message:'Tell me findings',accountId});
  assert.equal(result.status,200); assert.equal(providerCalls,1);
  assert.equal(result.data.contextReferences[0].claimId,claimId);
  assert.equal(providerContext.accountContext.researchRun.id,runId);
  assert.deepEqual(providerContext.reports,[]); assert.deepEqual(providerContext.history,[]);
  assert.equal((await request(`/chat/history?accountId=${accountId}`)).data.messages.length,2);
  assert.equal((await request('/chat/history')).data.messages[0].content,'Legacy global question');
  assert.equal((await request(`/chat/history?accountId=${accountId}`,users[1],'DELETE')).status,404);
  assert.equal((await request(`/chat/history?accountId=${accountId}`,users[0],'DELETE')).status,200);
  assert.equal((await request('/chat/history')).data.messages.length,1);
  const global=await request('/fixture-global-chat',users[0],'POST',{message:'What is its revenue?'});
  assert.equal(global.status,200); assert.equal(globalRetrievalQuery,'Fixture Account revenue');
  assert.equal(global.data.usedReports[0].id,'legacy-fixture');
  assert.equal((await request('/chat/history')).data.messages.length,3);
  const context=await loadAccountContext(workspaces[0],accountId); assert.ok(context); assert.ok(context.text.length<100000);
  assert.equal(await loadAccountContext(workspaces[1],accountId),null);
  assert.equal((await request('/fixture-invalid-citation',users[0],'POST',{message:'Find evidence',accountId})).status,500);
  assert.equal((await request(`/chat/history?accountId=${accountId}`)).data.messages.length,0);
  await postgres.query(`INSERT INTO chat_messages(session_id,role,content) SELECT $1,'user','Older V1 message' FROM generate_series(1,105)`,[sessionId]);
  assert.equal((await request('/chat/history')).data.messages.length,108);
});

test('refresh replaces chat evidence and excludes obsolete offering matches; empty evidence avoids provider',async()=>{
  const empty=(await request('/targets',users[0],'POST',{name:'Empty Account',website:'empty-copilot.example'})).data;
  const beforeCalls=providerCalls;
  const emptyReply=await request('/fixture-chat',users[0],'POST',{accountId:empty.id,message:'What do we know?'});
  assert.equal(emptyReply.status,200); assert.match(emptyReply.data.reply,/No cited research/); assert.equal(providerCalls,beforeCalls);
  const latestId=(await request(`/targets/${accountId}/research`,users[0],'POST')).data.runId;
  const usage={promptTokens:0,outputTokens:0,totalTokens:0},content='Fixture Account publishes a new retail engineering update.';
  await processNextAccountResearch({discover:async()=>({urls:[],usage}),fetch:async(url)=>({url,title:'Refreshed source',content,contentHash:createHash('sha256').update(content).digest('hex'),retrievedAt:new Date(),publishedAt:null,sourceType:'company'}),
    extract:async(_name,_domain,sources)=>({claims:validateResearchClaims({claims:[{statement:content,classification:'fact',certainty:'confirmed',eventDate:null,evidence:[{sourceId:sources[0].id,excerpt:content}]}]},sources),usage}),
    analyze:async()=>({intelligence:{technologies:[],people:[],signals:[],gaps:[]},usage})});
  const context=await loadAccountContext(workspaces[0],accountId); assert.ok(context);
  assert.equal(context.runId,latestId); assert.ok(context.references.every(r=>r.runId===latestId));
  assert.equal(JSON.parse(context.text).claims.some((c:any)=>c.id===claimId),false);
  assert.deepEqual(JSON.parse(context.text).opportunities,[]);
  const saved=(await request(`/targets/${accountId}/drafts`)).data.drafts.find((d:any)=>d.id===draftId);
  assert.equal(saved.sourceSnapshot.runId,runId); assert.equal(saved.content,'Reviewed draft');
  const offeringId=(await postgres.query('SELECT offering_id FROM opportunities WHERE id=$1',[opportunityId])).rows[0].offering_id;
  await postgres.query("UPDATE seller_offerings SET review_status='draft' WHERE id=$1",[offeringId]);
  assert.equal((await request(`/targets/${accountId}/drafts`,users[0],'POST',{opportunityId,kind:'pitch_short'})).status,404);
  assert.deepEqual(JSON.parse((await loadAccountContext(workspaces[0],accountId))!.text).approvedOfferings,[]);
});

test('dashboard scopes totals and database rejects cross-tenant draft/session relationships',async()=>{
  assert.equal((await request('/targets/dashboard')).data.myDrafts,7);
  assert.equal((await request('/targets/dashboard',users[1])).data.accounts,0);
  await assert.rejects(postgres.query('INSERT INTO chat_sessions(id,user_id,workspace_id,account_id) VALUES($1,$2,$3,$4)',[randomUUID(),users[1],workspaces[1],accountId]),{code:'23503'});
  await assert.rejects(postgres.query(`INSERT INTO sales_drafts(id,workspace_id,account_id,run_id,opportunity_id,created_by,kind,content,source_snapshot,generator_version) VALUES($1,$2,$3,$4,$5,$6,'discovery','test','{}','test')`,[randomUUID(),workspaces[1],accountId,runId,opportunityId,users[1]]),{code:'23503'});
  const source={sellerName:'Seller',accountName:'Target',offering:{name:'Service',description:'Reviewed capability'},claims:[{classification:'inference',statement:'Possible need'}],whyNow:'Unknown',uncertainties:['Confirm need.']};
  assert.match(buildSalesDraft('discovery',source),/Research hypothesis/);
  assert.match(buildSalesDraft('pitch_short',source),/current priority/);
});

test('account chat migration preserves pre-existing V1 session and message on PostgreSQL',async()=>{
  const client=await postgres.connect();
  const schema=`copilot_migration_${randomUUID().replaceAll('-','')}`;
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema},public`);
    await client.query(`CREATE TABLE users(id text PRIMARY KEY,workspace_id uuid NOT NULL,UNIQUE(workspace_id,id));
      CREATE TABLE target_accounts(id uuid PRIMARY KEY,workspace_id uuid NOT NULL,UNIQUE(workspace_id,id));
      CREATE TABLE chat_sessions(id text PRIMARY KEY,user_id text UNIQUE REFERENCES users(id),workspace_id uuid NOT NULL,updated_at timestamptz DEFAULT now());
      CREATE TABLE chat_messages(id bigserial PRIMARY KEY,session_id text REFERENCES chat_sessions(id),content text)`);
    await client.query('INSERT INTO users(id,workspace_id) VALUES($1,$2)',[users[0],workspaces[0]]);
    await client.query('INSERT INTO chat_sessions(id,user_id,workspace_id) VALUES($1,$2,$3)',['legacy-session',users[0],workspaces[0]]);
    await client.query(`INSERT INTO chat_messages(session_id,content) VALUES('legacy-session','Existing V1 history')`);
    await client.query(await readFile(new URL('../migrations/008_account_chat.sql',import.meta.url),'utf8'));
    const preserved=await client.query('SELECT s.account_id,m.content,m.context_references FROM chat_sessions s JOIN chat_messages m ON m.session_id=s.id');
    assert.equal(preserved.rows[0].account_id,null); assert.equal(preserved.rows[0].content,'Existing V1 history'); assert.deepEqual(preserved.rows[0].context_references,[]);
    await client.query('SAVEPOINT duplicate_global');
    await assert.rejects(client.query('INSERT INTO chat_sessions(id,user_id,workspace_id) VALUES($1,$2,$3)',['second-global',users[0],workspaces[0]]),{code:'23505'});
    await client.query('ROLLBACK TO SAVEPOINT duplicate_global');
  } finally { await client.query('ROLLBACK'); client.release(); }
});
