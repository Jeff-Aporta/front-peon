import{l as r}from"./chunk-4GVFWB5Y.mjs";import{a as s}from"./chunk-F7CCGLAN.mjs";function c(t){if(!t)return"";let n=new Date(t).getTime();if(Number.isNaN(n))return"";let a=Math.max(0,(Date.now()-n)/1e3),e=(o,i,l)=>`hace ${o} ${o===1?i:l}`;return a<60?"ahora":a<3600?e(Math.floor(a/60),"minuto","minutos"):a<86400?e(Math.floor(a/3600),"hora","horas"):a<7*86400?e(Math.floor(a/86400),"d\xEDa","d\xEDas"):new Date(n).toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}function m(t,n=!1){let a=t.publicada??t.creado,e=t.imagen?t.imagen.replace(/"/g,""):"";return s`
    <button type="button" class="nt" data-noticia=${String(t.id)} data-estado=${t.estado} ?data-adelanto=${n} onclick=${()=>r(t.id)}>
      <span class="nt-texto">
        <span class="nt-fuente"><img src="./assets/logo-160.webp" alt="" width="18" height="18">La Fuerza del Peón${t.estado==="borrador"?s`<span class="nt-borrador">Borrador</span>`:null}</span>
        <strong class="nt-titulo">${t.titulo}</strong>
        ${n?s`<span class="nt-adelanto">${t.adelanto}</span>`:null}
        <time class="nt-tiempo" datetime=${a} title=${new Date(a).toLocaleString("es-CO")}>${t.destacada?s`<span class="nt-destacada">Destacada</span>`:null}${c(a)}</time>
      </span>
      <span class="nt-imagen" style=${e?`background-image:url("${e}")`:""} aria-hidden="true">${e?null:s`<img src="./assets/logo-160.webp" alt="" width="56" height="56">`}</span>
    </button>`}export{m as a};
