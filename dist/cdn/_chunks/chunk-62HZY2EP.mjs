import{c as o,q as p,w as m}from"./chunk-72JF7XYO.mjs";function $(i,r,u,c){let e=m(i).pestanas.filter(t=>(p()||t.publica)&&(!c||c(t.id))),l=e.some(t=>t.id===r)?r:e[0]?.id??"",a=new Map,s=t=>{let n=a.get(t);!n||n.dataset.lleno||(n.dataset.lleno="1",n.append(u(t)))},d=o`
    <iswc-tab-group class="pestanas" active=${l} url-key=${i} oniswc-tab-show=${t=>{let n=t.detail;n?.name&&s(n.name)}}>
      ${e.map(t=>o`<iswc-tab slot="nav" panel=${t.id}><iswc-icon icon=${t.icono}></iswc-icon><span>${t.titulo}</span></iswc-tab>`)}
      ${e.map(t=>{let n=document.createElement("iswc-tab-panel");return n.setAttribute("name",t.id),a.set(t.id,n),n})}
    </iswc-tab-group>`;return s(l),setTimeout(()=>{for(let[t,n]of a)if(!n.hasAttribute("hidden")){s(t);break}},0),d}export{$ as a};
