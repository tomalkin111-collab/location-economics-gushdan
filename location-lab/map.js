/* Real basemap integration. Project geometry stays in EPSG:2039 in data.js. */
'use strict';
(async function(){
 const status=document.getElementById('mapStatus');
 function loadScript(url){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.crossOrigin='anonymous';const timer=setTimeout(()=>reject(new Error('Loading timed out')),15000);s.onload=()=>{clearTimeout(timer);resolve()};s.onerror=()=>{clearTimeout(timer);reject(new Error('Library unavailable'))};document.head.append(s)})}
 function loadCSS(url){return new Promise((resolve,reject)=>{const s=document.createElement('link');s.rel='stylesheet';s.href=url;const timer=setTimeout(()=>reject(new Error('Styles timed out')),15000);s.onload=()=>{clearTimeout(timer);resolve()};s.onerror=()=>{clearTimeout(timer);reject(new Error('Styles unavailable'))};document.head.append(s)})}
 try{
  await Promise.all([loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'),loadScript('https://unpkg.com/proj4@2.11.0/dist/proj4.js')]);
  const CRS='+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=23.772,17.49,17.859,-0.3132,-1.85274,1.67299,-5.4262 +units=m +no_defs';
  const convert=p=>{const [lon,lat]=proj4(CRS,'EPSG:4326',p);if(!Number.isFinite(lat)||lat<29||lat>34||lon<33||lon>37)throw new Error('Invalid geographic coordinate');return [lat,lon]};
  const data=window.RESEARCH_DATA.map(d=>({...d,latlng:convert([d.centroid_x,d.centroid_y]),geoRings:d.rings.map(r=>r.map(convert))}));
  const host=document.getElementById('streetMap');host.hidden=false;
  const map=L.map(host,{zoomControl:false,scrollWheelZoom:false,minZoom:7,maxZoom:19}).setView([32.073,34.88],11);
  L.control.zoom({position:'topright',zoomInTitle:'התקרבות',zoomOutTitle:'התרחקות'}).addTo(map);
  L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',updateWhenIdle:true}).addTo(map);
  let failures=0,successes=0;
  tiles.on('tileerror',()=>{failures++;if(failures>=3){status.hidden=false;status.textContent='חלק ממפת הרקע לא נטען. בדקו חיבור לאינטרנט; נתוני המחקר ממשיכים לפעול.'}});
  tiles.on('tileload',()=>{successes++;if(failures===0||successes>failures*3)status.hidden=true});
  const zones=new Map();const group=L.featureGroup().addTo(map);
  const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  data.forEach(d=>{
   const poly=L.polygon(d.geoRings,{color:'#147d71',weight:1,fillOpacity:.25,bubblingMouseEvents:false}).addTo(group);
   const marker=L.circleMarker(d.latlng,{radius:6,color:'#fff',weight:1.5,fillOpacity:.95,fillColor:'#147d71',bubblingMouseEvents:false}).addTo(group);
   const choose=()=>window.locationLab.configure({zoneId:d.id});
   poly.on('click',choose);marker.on('click',choose);
   marker.bindTooltip(escapeText(d.name),{direction:'top',className:'zone-tooltip'});
   // CircleMarker is an SVG path, so explicitly supply keyboard activation.
   const node=marker.getElement();if(node){node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label','בחירת '+d.name);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}})}
   zones.set(d.id,{poly,marker,d});
  });
  let selected=null;
  function count(){document.getElementById('mapCount').textContent=data.filter(d=>map.getBounds().contains(d.latlng)).length+' מתוך 88 אזורים בתצוגה'}
  map.on('moveend',count);
  function focus(id){const z=zones.get(id);if(z)map.fitBounds(z.poly.getBounds().pad(.7),{maxZoom:15,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches})}
  window.LocationMap={ready:true,resize(){map.invalidateSize()},focus,extent(full){if(full)map.fitBounds(group.getBounds(),{padding:[28,28]});else map.setView([32.073,34.88],11)},update(rows,state){
   for(const r of rows){const z=zones.get(r.id),active=r.id===state.selected;const t=r.score/100,color=`hsl(${190-30*t},${45+25*t}%,${52-25*t}%)`;z.poly.setStyle({color:active?'#bf7016':color,weight:active?3:1.2,fillColor:color,fillOpacity:active?.48:.26});z.marker.setStyle({fillColor:active?'#dc931e':color,color:active?'#fff':'#ffffffcc',weight:active?2.5:1.3});z.marker.setRadius(active?9:5+r.score/35);z.marker.setTooltipContent(`${escapeText(r.name)} · ${r.score.toFixed(1)}`);if(active){z.poly.bringToFront();z.marker.bringToFront()}}
   if(selected!==state.selected){if(selected!==null)focus(state.selected);selected=state.selected}
   document.getElementById('mapExtent').textContent=state.full?'התמקדות בגוש דן':'הצגת כל האזורים';count();
  }};
  document.getElementById('mapSvg').hidden=true;
  document.querySelector('.north').hidden=true;document.querySelector('.map-caption').hidden=true;
  document.querySelector('.map-legend').classList.add('street-legend');
  status.hidden=true;
  new ResizeObserver(()=>map.invalidateSize()).observe(host);
  document.dispatchEvent(new Event('location-map-ready'));
 }catch(error){status.hidden=false;status.textContent='מפת הרחובות לא נטענה. אפשר להמשיך עם מפת הנתונים והטבלה; מפת הרקע דורשת חיבור לאינטרנט.';document.getElementById('streetMap').hidden=true;console.warn('Basemap unavailable:',error.message)}
})();
