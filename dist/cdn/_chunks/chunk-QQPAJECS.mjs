import{l as u}from"./chunk-FXRIE6UB.mjs";import{c as n}from"./chunk-2ME7CFBC.mjs";function m(t){if(!t)return"";let s=new Date(t).getTime();if(Number.isNaN(s))return"";let a=Math.max(0,(Date.now()-s)/1e3),e=(o,c,l)=>`hace ${o} ${o===1?c:l}`;return a<60?"ahora":a<3600?e(Math.floor(a/60),"minuto","minutos"):a<86400?e(Math.floor(a/3600),"hora","horas"):a<7*86400?e(Math.floor(a/86400),"d\xEDa","d\xEDas"):new Date(s).toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}function p(t){t.tipo==="enlace"&&t.enlace_original?window.open(t.enlace_original,"_blank","noopener,noreferrer"):u(t.id)}function r(t){return t.tipo&&t.tipo!=="propia"&&t.fuente?t.fuente:"La Fuerza del Pe\xF3n"}function $(t,s=!1){let a=t.publicada??t.creado,e=t.imagen?t.imagen.replace(/"/g,""):"",o=t.tipo==="enlace";return n`
    <button type="button" class="nt" data-noticia=${String(t.id)} data-estado=${t.estado} data-tipo=${t.tipo??"propia"} ?data-adelanto=${s} title=${o?`Abre la noticia en ${r(t)}`:""} onclick=${()=>p(t)}>
      <span class="nt-texto">
        <span class="nt-fuente">${t.tipo&&t.tipo!=="propia"?n`<iswc-icon icon="mdi:web"></iswc-icon>`:n`<img src="./assets/logo-160.webp" alt="" width="18" height="18">`}${r(t)}${o?n`<iswc-icon class="nt-externa" icon="mdi:open-in-new"></iswc-icon>`:null}${t.estado==="borrador"?n`<span class="nt-borrador">Borrador</span>`:null}</span>
        <strong class="nt-titulo">${t.titulo}</strong>
        ${s?n`<span class="nt-adelanto">${t.adelanto}</span>`:null}
        <time class="nt-tiempo" datetime=${a} title=${new Date(a).toLocaleString("es-CO")}>${t.destacada?n`<span class="nt-destacada">Destacada</span>`:null}${m(a)}</time>
      </span>
      <span class="nt-imagen" style=${e?`background-image:url("${e}")`:""} aria-hidden="true">${e?null:n`<img src="./assets/logo-160.webp" alt="" width="56" height="56">`}</span>
    </button>`}var d=t=>t.imagen?`background-image:url("${t.imagen.replace(/"/g,"")}")`:"";function b(t){let s=[...t].sort((i,g)=>Number(g.destacada)-Number(i.destacada)),[a,...e]=s,o=e.slice(0,4),c=e.slice(4);if(!a)return n``;let l=i=>m(i.publicada??i.creado);return n`
    <article class="np">
      <button type="button" class="np-principal" data-noticia=${String(a.id)} onclick=${()=>p(a)}>
        <span class="np-imagen" style=${d(a)}>${a.imagen?null:n`<img src="./assets/logo-512.webp" alt="" width="160" height="160">`}</span>
        <span class="np-texto">
          <span class="nt-fuente">${r(a)}${a.tipo==="enlace"?n`<iswc-icon class="nt-externa" icon="mdi:open-in-new"></iswc-icon>`:null}</span>
          <strong class="np-titulo">${a.titulo}</strong>
          <span class="np-adelanto">${a.adelanto}</span>
          <time class="nt-tiempo">${a.destacada?n`<span class="nt-destacada">Destacada</span>`:null}${l(a)}</time>
        </span>
      </button>
      ${o.length?n`<div class="np-secundarias">${o.map(i=>n`
          <button type="button" class="np-sec" data-noticia=${String(i.id)} onclick=${()=>p(i)}>
            <span class="np-imagen" style=${d(i)}>${i.imagen?null:n`<img src="./assets/logo-160.webp" alt="" width="64" height="64">`}</span>
            <span class="nt-fuente">${r(i)}${i.tipo==="enlace"?n`<iswc-icon class="nt-externa" icon="mdi:open-in-new"></iswc-icon>`:null}</span>
            <strong class="nt-titulo">${i.titulo}</strong>
            <time class="nt-tiempo">${l(i)}</time>
          </button>`)}</div>`:null}
    </article>
    ${c.length?n`<h3 class="np-mas">Más noticias</h3><div class="nt-rejilla">${c.map(i=>$(i,!0))}</div>`:null}`}export{m as a,r as b,$ as c,b as d};
