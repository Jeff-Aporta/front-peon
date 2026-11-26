import{a as d,o as V}from"./chunk-ILFZNI4F.mjs";import{a as k,b as B,d as J,e as f,g as v,h as Q,p as E,x as K}from"./chunk-MZ3FI2PL.mjs";import{a as C,e as F}from"./chunk-L3D3X7LB.mjs";import{a as q}from"./chunk-DHV462BF.mjs";function h(a){return(a??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}function N(a){return[a.nombre,a.direccion,a.municipio].map(c=>(c??"").trim()).filter(Boolean).join(" \xB7 ")}function D(a,c){let i=C.array(C.unknown()).safeParse(a);if(!i.success)return[];let t=[];for(let n of i.data){let u=c.safeParse(n);u.success&&t.push(u.data)}return t}async function H(){let a=await E("GET","puestos/municipios");return D(a,B)}async function R(a,c="",i=20){let t=new URLSearchParams,n=(a??"").trim();n&&t.set("q",n);let u=(c??"").trim();u&&t.set("municipio",u),t.set("limite",String(Math.max(1,Math.min(200,i))));let p=await E("GET",`puestos?${t}`);return D(p,k)}function X(a,c){let i=h(a),t=h(c);if(!i||!t)return 0;if(i===t)return 1;if(i.includes(t)||t.includes(i))return .85*(Math.min(i.length,t.length)/Math.max(i.length,t.length));let n=new Set(i.split(" ").filter(Boolean)),u=new Set(t.split(" ").filter(Boolean));if(!n.size||!u.size)return 0;let p=0;for(let b of n)u.has(b)&&p++;return p/(n.size+u.size-p)}function G(a,c){if(!c)return!1;let i=(a.nombre??"").trim();if(!i||X(c.nombre,i)<W)return!1;let t=h(a.municipio??"");if(!t)return!0;let n=h(c.municipio??"");return!n||n===t||n.includes(t)||t.includes(n)}var W,I=q(()=>{"use strict";F();K();J();W=.75});function re(a={},c={}){let i=c.catalogo!==!1,t=document.createElement("section");t.className="manual";let n=a.codigo??"",u=new Map,p=null,b=!1,w=null,x=null,M=!1,y=(e,o)=>{if(w=e,x=o,m.hidden=!0,m.replaceChildren(),!e)return;let s={nombre:d(t,"pm-nombre"),municipio:d(t,"pm-municipio")};if(s.nombre.trim()){if(G(s,e)){v("Los datos escritos coinciden con la ubicaci\xF3n oficial.","success");return}m.hidden=!1,m.replaceChildren(f`
      <iswc-icon icon="mdi:alert-outline"></iswc-icon>
      <span>
        These are not the official data. The Registraduría says: <strong>${e.nombre}</strong>
        ${e.direccion?f`
            — ${e.direccion}
          `:null}${e.municipio?f`
            · ${e.municipio}
          `:null}${o?f`
            · Mesa ${o}
          `:null}.
      </span>
      <iswc-button size="small" color="brand" data-reemplazar onclick=${()=>$(e,o)}>
        <iswc-icon slot="start" icon="mdi:swap-horizontal"></iswc-icon>Reemplazar
      </iswc-button>
    `)}},$=(e,o)=>{P({nombre:e.nombre,direccion:e.direccion??"",municipio:e.municipio,departamento:e.departamento??"",mesa:o??""}),n=e.codigo,i&&(r.value=e.municipio),m.hidden=!0,m.replaceChildren(),v(`Puesto oficial: ${e.nombre}.`,"success")},P=e=>{M=!0;for(let[o,s]of Object.entries(e)){let j=t.querySelector(`[data-campo="pm-${o}"]`);j&&s&&(j.value=s)}M=!1},A=(e,o)=>{let s=document.createElement("iswc-option");return s.setAttribute("value",e),s.textContent=o,s},r=document.createElement("iswc-combobox");r.setAttribute("data-campo","pm-mun"),r.setAttribute("label","Municipio"),r.setAttribute("placeholder","Escribe el municipio"),r.setAttribute("no-results","Sin municipios"),r.setAttribute("clearable","");let l=document.createElement("iswc-combobox");l.setAttribute("data-campo","pm-puesto"),l.setAttribute("label","Puesto de votaci\xF3n"),l.setAttribute("placeholder","Nombre, direcci\xF3n o barrio del puesto"),l.setAttribute("no-results","Sin puestos"),l.setAttribute("clearable","");let g=document.createElement("small");g.className="nota",g.setAttribute("data-conteo",""),g.textContent="Elige el municipio y luego busca el puesto por nombre o direcci\xF3n.";let S=async()=>{if(!(p||b)){b=!0;try{p=await H(),r.replaceChildren(...p.map(e=>A(e.municipio,[e.municipio,e.departamento].filter(Boolean).join(" \xB7 "))))}catch{v("No se pudo cargar el cat\xE1logo de municipios: revisa la conexi\xF3n.","warning")}finally{b=!1}}},T=async e=>{try{let o=await R(e,String(r.value??"").trim(),20);u=new Map(o.map(s=>[s.codigo,s])),l.replaceChildren(...o.map(s=>A(s.codigo,N(s)))),g.textContent=o.length?`${o.length} puesto(s) del cat\xE1logo oficial.`:"Sin puestos en el cat\xE1logo oficial con esa b\xFAsqueda."}catch{g.textContent="No se pudo consultar el cat\xE1logo oficial."}},U=e=>{P({nombre:e.nombre,direccion:e.direccion??"",municipio:e.municipio,departamento:e.departamento??""}),n=e.codigo,v(`Puesto del cat\xE1logo oficial: ${e.nombre}.`,"success")},m=document.createElement("div");m.className="propuesta aviso",m.setAttribute("data-aviso-oficial",""),m.hidden=!0,t.append(f`
    ${i?f`
        <header class="manual-cabeza">
          <iswc-icon icon="mdi:card-search-outline"></iswc-icon>
          <div><strong>Puesto de votación</strong><small>Elige el puesto del catálogo oficial.</small></div>
        </header>
        <section class="camino" data-panel="catalogo">
          <ol class="pasos">
            <li>${r}</li>
            <li>${l}${g}</li>
          </ol>
        </section>`:null}
    ${m}
    <div class="campos-puesto">
      <iswc-input data-campo="pm-nombre" label="Puesto de votación"></iswc-input>
      <iswc-input data-campo="pm-direccion"
        label="Dirección del puesto"></iswc-input>
      <iswc-input data-campo="pm-municipio" label="Municipio"
        value="Armenia"></iswc-input>
      <iswc-input data-campo="pm-departamento" label="Departamento"
        value="Quindío"></iswc-input>
      <iswc-input data-campo="pm-mesa" label="Mesa"
        inputmode="numeric"></iswc-input>
    </div>
  `);let{codigo:Z,..._}=a;P(_),i&&(r.value=d(t,"pm-municipio"));let L=0;r.addEventListener("iswc-show",()=>{S()}),r.addEventListener("iswc-input",e=>{String(e.detail?.value??"")!==r.value&&(clearTimeout(L),L=setTimeout(()=>{S()},200))}),r.addEventListener("iswc-change",e=>{let o=String(e.detail?.value??"").trim();o&&(P({municipio:o}),T(""))});let O=0;l.addEventListener("iswc-input",e=>{let o=String(e.detail?.value??"").trim();o!==l.value&&(clearTimeout(O),O=setTimeout(()=>{T(o)},250))}),l.addEventListener("iswc-change",e=>{let o=String(e.detail?.value??"").trim();if(!o){n="";return}let s=u.get(o);s&&U(s)});let z=()=>{M||!w||y(w,x)};for(let e of["nombre","direccion","municipio","mesa"]){let o=t.querySelector(`[data-campo="pm-${e}"]`);o?.addEventListener("iswc-input",z),o?.addEventListener("iswc-change",z)}return{nodo:t,leer(){let e={nombre:d(t,"pm-nombre"),direccion:d(t,"pm-direccion"),municipio:d(t,"pm-municipio"),departamento:d(t,"pm-departamento"),mesa:d(t,"pm-mesa")};return e.nombre?e:null},leerCodigo(){return n||null},compararConOficial:y,reemplazarPorOficial:$,limpiar(){for(let e of["nombre","direccion","mesa"]){let o=t.querySelector(`[data-campo="pm-${e}"]`);o&&(o.value="")}i&&(r.value="",l.value="",l.replaceChildren()),u=new Map,n="",m.hidden=!0,m.replaceChildren()}}}var Y=q(()=>{"use strict";Q();I();V()});export{G as a,I as b,re as c,Y as d};
