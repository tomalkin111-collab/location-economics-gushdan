'use strict';
const DATA=window.RESEARCH_DATA;
const state={weight:70,beta:'015',radius:500,boost:0,selected:318,full:false,all:false,query:''};
const $=s=>document.querySelector(s), fmt=(n,d=1)=>Number(n).toLocaleString('he-IL',{maximumFractionDigits:d,minimumFractionDigits:d});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function compute(boost=state.boost){
 const accessKey='potential_access_beta'+state.beta,stopKey='stops_within_'+state.radius+'m';
 const maxA=Math.max(...DATA.map(d=>d[accessKey])),maxS=Math.max(...DATA.map(d=>d[stopKey]+(d.id===state.selected?boost:0)));
 return DATA.map(d=>{const a=d[accessKey]/maxA*100,s=d[stopKey]+(d.id===state.selected?boost:0),si=maxS?s/maxS*100:0;return {...d,a,s,si,pop:a*state.weight/100,trans:si*(100-state.weight)/100,score:a*state.weight/100+si*(100-state.weight)/100};}).sort((a,b)=>b.score-a.score||a.id-b.id).map((d,i)=>({...d,rank:i+1}));
}
function selectZone(id){if(id===state.selected)return;if(!DATA.some(d=>d.id===id))throw new Error('Unknown zone');state.selected=id;state.boost=0;$('#boost').value=0;render();}
function render(){
 const rows=compute(),base=compute(0),d=rows.find(x=>x.id===state.selected),b=base.find(x=>x.id===state.selected);
 $('#weightValue').textContent=state.weight+'%';$('#weightHint').textContent=`${state.weight}% נגישות לאוכלוסייה + ${100-state.weight}% זמינות תחנות בסביבה.`;$('#boostValue').textContent='+'+state.boost;
 $('#selectedName').textContent=d.name;$('#selectedAuthority').textContent=d.authority+' · אזור תעסוקה מתוכנן';$('#scenarioName').textContent=d.name;
 $('#selectedScore').textContent=fmt(d.score);$('#rank').textContent='#'+d.rank+' / 88';$('#access').textContent=fmt(d.a)+' / 100';$('#stops').textContent=fmt(d.s,0);$('#area').textContent=fmt(d.area_km2,2)+' קמ״ר';
 const delta=d.score-b.score,rankDelta=b.rank-d.rank;
 $('#change').textContent=state.boost?`${delta>=0?'+':''}${fmt(delta)} נקודות במדד · ${rankDelta>0?'עלייה של '+rankDelta+' מקומות':rankDelta<0?'ירידה של '+(-rankDelta)+' מקומות':'ללא שינוי בדירוג'}`:'מצב בסיס · ללא תוספת תחנות';
 $('#popPart').style.width=d.pop+'%';$('#stopPart').style.width=d.trans+'%';$('#popLabel').textContent='אוכלוסייה · '+fmt(d.pop)+' נק׳';$('#stopLabel').textContent='תחנות · '+fmt(d.trans)+' נק׳';
 $('#explanation').textContent=d.a>=d.si?'הקרבה היחסית לאוכלוסייה חזקה כאן יותר מזמינות התחנות המנורמלת. הגדלת משקל האוכלוסייה מעלה את הציון של האזור, אך הדירוג תלוי גם בשאר החלופות.':'זמינות התחנות המנורמלת חזקה כאן יותר ממדד הקרבה לאוכלוסייה. הגדלת משקל התחבורה מעלה את הציון של האזור, אך הדירוג תלוי גם בשאר החלופות.';
 $('#leading').textContent='מוביל בתרחיש: '+rows[0].name+' · '+fmt(rows[0].score);renderMap(rows);
 const filtered=rows.filter(x=>(x.name+' '+x.authority).includes(state.query));const display=state.all?filtered:filtered.slice(0,10);
 $('#rankRows').innerHTML=display.length?display.map(x=>{const change=base.find(y=>y.id===x.id).rank-x.rank;return `<tr class="${x.id===d.id?'selected':''}"><td>${x.rank}</td><td><button data-zone="${x.id}">${esc(x.name)}</button></td><td>${esc(x.authority)}</td><td>${fmt(x.a)}</td><td>${fmt(x.s,0)}</td><td><div class="bar-cell">${fmt(x.score)}<i style="--score:${x.score}"></i></div></td><td>${change>0?'↑ '+change:change<0?'↓ '+(-change):'—'}</td></tr>`;}).join(''):'<tr><td colspan="7" class="empty">לא נמצאו אזורים התואמים לחיפוש.</td></tr>';
 $('#showAll').hidden=filtered.length<=10;$('#showAll').textContent=state.all?'הצגת עשרת המובילים':`הצגת כל ${filtered.length} האזורים`;
 document.querySelectorAll('[data-zone]').forEach(el=>el.addEventListener('click',()=>selectZone(+el.dataset.zone)));
}
function renderMap(rows){
 if(window.LocationMap?.ready){window.LocationMap.update(rows,state);return;}
 const chosen=rows.find(d=>d.id===state.selected);
 let bounds=state.full?[169000,217000,629000,696000]:[175000,196000,651000,684000];
 if(!state.full&&(chosen.centroid_x<bounds[0]||chosen.centroid_x>bounds[1]||chosen.centroid_y<bounds[2]||chosen.centroid_y>bounds[3]))bounds=[chosen.centroid_x-10500,chosen.centroid_x+10500,chosen.centroid_y-16500,chosen.centroid_y+16500];
 const [xmin,xmax,ymin,ymax]=bounds,scale=Math.min(660/(xmax-xmin),590/(ymax-ymin)),ox=(760-(xmax-xmin)*scale)/2,oy=(660-(ymax-ymin)*scale)/2;
 const X=x=>ox+(x-xmin)*scale,Y=y=>660-oy-(y-ymin)*scale;
 let s='<defs><filter id="glow"><feGaussianBlur stdDeviation="5"/></filter></defs>';
 for(let x=Math.ceil(xmin/5000)*5000;x<=xmax;x+=5000)s+=`<path d="M${X(x)} 20V640" stroke="#ffffff08"/><text x="${X(x)+3}" y="650" fill="#75909c" font-size="10">${x/1000}</text>`;
 for(let y=Math.ceil(ymin/5000)*5000;y<=ymax;y+=5000)s+=`<path d="M20 ${Y(y)}H740" stroke="#ffffff08"/>`;
 const visible=rows.filter(d=>d.centroid_x>=xmin&&d.centroid_x<=xmax&&d.centroid_y>=ymin&&d.centroid_y<=ymax);
 // Render low scores first, selected last. Coordinates and polygon shapes are from the project.
 const ordered=[...visible].sort((a,b)=>a.score-b.score).filter(d=>d.id!==chosen.id);if(visible.some(d=>d.id===chosen.id))ordered.push(chosen);
 for(const d of ordered){const x=X(d.centroid_x),y=Y(d.centroid_y),sel=d.id===chosen.id,t=d.score/100,color=`rgb(${Math.round(44+74*t)},${Math.round(79+148*t)},${Math.round(100+89*t)})`;
 const path=d.rings.map(r=>'M'+r.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join('L')+'Z').join('');
 s+=`<g class="zone" tabindex="0" role="button" aria-label="${esc(d.name)}, מדד ${fmt(d.score)}" data-map-zone="${d.id}"><title>${esc(d.name)} · ${esc(d.authority)} · ${fmt(d.score)}</title><path d="${path}" fill="${color}" fill-opacity="${sel?.65:.24}" stroke="${color}" stroke-opacity=".8" stroke-width="${sel?1.8:.6}"/>${sel?`<circle cx="${x}" cy="${y}" r="19" fill="#77e0c1" opacity=".2" filter="url(#glow)"/><circle cx="${x}" cy="${y}" r="13" fill="none" stroke="#b8ffe2" stroke-width="1.3"/>`:''}<circle class="marker" cx="${x}" cy="${y}" r="${sel?6:3+3*t}" fill="${sel?'#e9fff7':color}"/><circle cx="${x}" cy="${y}" r="10" fill="transparent"/></g>`;
 }
 // Limited labels remain legible; the full list offers every zone by keyboard.
 const labels=visible.filter(x=>[318,342,304,chosen.id].includes(x.id));const used=[];
 for(const d of labels){const x=X(d.centroid_x),y=Y(d.centroid_y);if(d.id!==chosen.id&&Math.hypot(x-X(chosen.centroid_x),y-Y(chosen.centroid_y))<50)continue;const label=d.name.length>22?d.name.slice(0,21)+'…':d.name;const width=label.length*8+22,lx=Math.max(30,Math.min(730-width,x+16)),ly=Math.min(615,Math.max(38,y-26));s+=`<g pointer-events="none"><rect x="${lx}" y="${ly}" width="${width}" height="27" rx="5" fill="#102430" stroke="#77e0c144"/><text x="${lx+width-9}" y="${ly+18}" text-anchor="start" direction="rtl" fill="#def5ed" font-size="13">${esc(label)}</text></g>`;}
 const km=state.full?10:5;s+=`<path d="M620 615h${-km*1000*scale}m0-4v8m${km*1000*scale}-8v8" stroke="#bad0d8" fill="none"/><text x="620" y="605" text-anchor="end" fill="#bad0d8" font-size="12">${km} km</text>`;
 $('#mapSvg').innerHTML=s;$('#mapCount').textContent=visible.length+' מתוך 88 אזורים בתצוגה';$('#mapExtent').textContent=state.full?'התמקדות בגוש דן':'הצגת כל האזורים';
 document.querySelectorAll('[data-map-zone]').forEach(el=>{el.addEventListener('click',()=>selectZone(+el.dataset.mapZone));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectZone(+el.dataset.mapZone)}})});
}
function setTab(name){if(name==='lab')setTimeout(()=>window.LocationMap?.resize(),0);document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===name));document.querySelectorAll('.tab').forEach(t=>{t.classList.toggle('active',t.dataset.tab===name);t.setAttribute('aria-current',t.dataset.tab===name?'page':'false')});}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));document.querySelectorAll('.go-lab').forEach(b=>b.addEventListener('click',()=>{setTab('lab');window.scrollTo({top:0,behavior:'smooth'})}));
$('#weight').addEventListener('input',e=>{state.weight=+e.target.value;render()});$('#beta').addEventListener('change',e=>{state.beta=e.target.value;render()});$('#boost').addEventListener('input',e=>{state.boost=+e.target.value;render()});
document.querySelectorAll('[data-radius]').forEach(b=>b.addEventListener('click',()=>{state.radius=+b.dataset.radius;document.querySelectorAll('[data-radius]').forEach(x=>x.classList.toggle('active',x===b));render()}));
$('#reset').addEventListener('click',()=>{Object.assign(state,{weight:70,beta:'015',radius:500,boost:0,selected:318,full:false,all:false,query:''});$('#weight').value=70;$('#beta').value='015';$('#boost').value=0;$('#search').value='';window.LocationMap?.extent(false);document.querySelectorAll('[data-radius]').forEach(x=>x.classList.toggle('active',x.dataset.radius==='500'));render()});
$('#mapExtent').addEventListener('click',()=>{state.full=!state.full;if(window.LocationMap?.ready)window.LocationMap.extent(state.full);render()});
$('#focusZone').addEventListener('click',()=>{if(window.LocationMap?.ready)window.LocationMap.focus(state.selected);else {state.full=false;render()}});$('#showAll').addEventListener('click',()=>{state.all=!state.all;render()});$('#search').addEventListener('input',e=>{state.query=e.target.value.trim();render()});
document.addEventListener('location-map-ready',()=>render());
render();
window.locationLab={getState:()=>({...state}),results:()=>compute().map(({id,name,score,rank})=>({id,name,score,rank})),configure(input){if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Expected object');if(Object.keys(input).some(k=>!['weight','beta','zoneId'].includes(k)))throw new Error('Unknown scenario parameter');if('weight'in input&&(!Number.isFinite(input.weight)||input.weight<0||input.weight>100))throw new Error('weight must be 0–100');if('beta'in input&&!['010','015','020'].includes(input.beta))throw new Error('Unknown beta');if('zoneId'in input&&!DATA.some(d=>d.id===input.zoneId))throw new Error('Unknown zone');if('zoneId'in input)selectZone(input.zoneId);if('weight'in input){state.weight=input.weight;$('#weight').value=input.weight}if('beta'in input){state.beta=input.beta;$('#beta').value=input.beta}render();return this.results().slice(0,5)}};
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'configure_location_scenario',title:'Configure location scenario',description:'Change population weight, distance sensitivity, or selected employment zone and return the top five accessibility scores. These are illustrative indices, not estimated firm-choice probabilities.',inputSchema:{type:'object',properties:{weight:{type:'number',minimum:0,maximum:100},beta:{type:'string',enum:['010','015','020']},zoneId:{type:'integer'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>window.locationLab.configure(input)})).catch(()=>{})}catch{}}
