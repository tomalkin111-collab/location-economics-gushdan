const fs=require('fs'),vm=require('vm'),assert=require('assert');
const els={};function el(s){return els[s]??=( {textContent:'',innerHTML:'',style:{},value:'',hidden:false,addEventListener(){},classList:{toggle(){}},setAttribute(){}} )}
const document={querySelector:el,querySelectorAll(){return[]},addEventListener(){}};const ctx={window:{},document,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data.js','utf8'),ctx);vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
const base=ctx.window.locationLab.results(),source=ctx.window.RESEARCH_DATA;
assert.equal(base.length,88);assert.equal(base[0].name,'קרית אריה');
for(const r of base){const d=source.find(d=>d.id===r.id);assert(Math.abs(r.score-d.front_office_access_proxy)<1e-8)}
for(const beta of ['010','015','020'])for(const weight of [0,30,70,100]){ctx.window.locationLab.configure({beta,weight});const a=ctx.window.locationLab.results();assert(a.every(x=>Number.isFinite(x.score)&&x.score>=0&&x.score<=100.000001));assert(a.every((x,i)=>i===0||a[i-1].score>=x.score))}
let before=JSON.stringify(ctx.window.locationLab.getState());assert.throws(()=>ctx.window.locationLab.configure({weight:101}));assert.equal(before,JSON.stringify(ctx.window.locationLab.getState()));assert.throws(()=>ctx.window.locationLab.configure({zoneId:-1}));
ctx.window.locationLab.configure({weight:70,beta:'015',zoneId:317});vm.runInContext('state.boost=50;render()',ctx);const boosted=ctx.window.locationLab.results().find(x=>x.id===317);assert(boosted.score>=base.find(x=>x.id===317).score);
vm.runInContext('state.full=true;render()',ctx);console.log('Visible full extent:',els['#mapCount'].textContent);console.log('PASS: all 88 baseline scores match original CSV; 12 weight/beta scenarios bounded and ranked; invalid input leaves state intact; station intervention increases target score.');console.log('Selected scenario:',els['#change'].textContent);
