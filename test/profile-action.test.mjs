import { it } from 'node:test';
import assert from 'node:assert/strict';
import action from '../auth0/complete-profile.cjs';

it('collects missing profiles only for interactive portal login and persists them', async () => {
  const event = {client: {client_id: 'gdA3yw9bYC9DvHVdNYvtqJZgaC3omrTm'}, user: {name:'a@example.com', email:'a@example.com'}, request: {query:{}}};
  const calls = [];
  const api = {prompt:{render:id=>calls.push(['render',id])},user:{setUserMetadata:(...args)=>calls.push(['metadata',...args])},idToken:{setCustomClaim:(...args)=>calls.push(['claim',...args])},access:{deny:()=>calls.push(['deny'])}};
  await action.onExecutePostLogin({...event,client:{client_id:'other'}},api);
  await action.onExecutePostLogin({...event,request:{query:{prompt:'none'}}},api);
  assert.equal(calls.length,0);
  await action.onExecutePostLogin(event,api);
  assert.equal(calls[0][0],'render');
  const formId=calls[0][1];
  calls.length=0;
  await action.onContinuePostLogin({...event,prompt:{id:formId,fields:{full_name:' Ana Pérez ',picture_url:''}}},api);
  assert.deepEqual(calls[0],['metadata','portal_profile',{name:'Ana Pérez',picture:''}]);
  assert.equal(calls[1][0],'claim');
  calls.length=0;
  await action.onExecutePostLogin({...event,user:{...event.user,user_metadata:{portal_profile:{name:'Ana Pérez'}}}},api);
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],'claim');
  calls.length=0;
  await action.onContinuePostLogin({...event,prompt:{id:formId,fields:{full_name:'Ana',picture_url:'javascript:alert(1)'}}},api);
  assert.deepEqual(calls,[['deny']]);
});
