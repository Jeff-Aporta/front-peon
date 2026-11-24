import{a as e,o as p,u as m}from"./chunk-6DGMDISI.mjs";function $(s,o,u,i){let a=m(s).pestanas.filter(t=>(p()||t.publica)&&(!i||i(t.id))),r=a.some(t=>t.id===o)?o:a[0]?.id??"",c=new Map,l=t=>{let n=c.get(t);!n||n.dataset.lleno||(n.dataset.lleno="1",n.append(u(t)))},g=e`
    <iswc-tab-group class="pestanas" active=${r} url-key=${s} oniswc-tab-show=${t=>{let n=t.detail;n?.name&&l(n.name)}}>
      ${a.map(t=>e`<iswc-tab slot="nav" panel=${t.id}><iswc-icon icon=${t.icono}></iswc-icon><span>${t.titulo}</span></iswc-tab>`)}
      ${a.map(t=>{let n=document.createElement("iswc-tab-panel");return n.setAttribute("name",t.id),c.set(t.id,n),n})}
    </iswc-tab-group>`;return l(r),g}export{$ as a};
