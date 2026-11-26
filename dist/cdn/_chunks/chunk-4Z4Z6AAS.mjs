import{a as L,b as V}from"./chunk-GUSFXB64.mjs";import{a as h,f as Q}from"./chunk-2PSWECBP.mjs";import{a as I,b as G,c as x,e as p,f as F,l as q}from"./chunk-2ME7CFBC.mjs";import{a as k}from"./chunk-FWBWSRYW.mjs";function A(a){return(a??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}function J(a){return[a.nombre,a.direccion,a.municipio].map(r=>(r??"").trim()).filter(Boolean).join(" \xB7 ")}function K(a,r){let o=k.array(k.unknown()).safeParse(a);if(!o.success)return[];let i=[];for(let n of o.data){let c=r.safeParse(n);c.success&&i.push(c.data)}return i}async function W(){let a=await q("GET","puestos/municipios");return K(a,G)}async function O(a,r="",o=20){let i=new URLSearchParams,n=(a??"").trim();n&&i.set("q",n);let c=(r??"").trim();c&&i.set("municipio",c),i.set("limite",String(Math.max(1,Math.min(200,o))));let l=await q("GET",`puestos?${i}`);return K(l,I)}var X=.75;function Y(a,r){let o=A(a),i=A(r);if(!o||!i)return 0;if(o===i)return 1;if(o.includes(i)||i.includes(o))return .85*(Math.min(o.length,i.length)/Math.max(o.length,i.length));let n=new Set(o.split(" ").filter(Boolean)),c=new Set(i.split(" ").filter(Boolean));if(!n.size||!c.size)return 0;let l=0;for(let m of n)c.has(m)&&l++;return l/(n.size+c.size-l)}function Z(a,r){let o=(a.nombre??"").trim();if(!o||!r?.length)return null;let i=A(a.municipio??""),n=i?r.filter(g=>{let u=A(g.municipio??"");return!!u&&(u===i||u.includes(i)||i.includes(u))}):r;if(!n.length)return null;let c=null,l=0,m=!1;for(let g of n){let u=Y(g.nombre,o);u>l?(c=g,l=u,m=!1):u===l&&u>0&&(m=!0)}return!c||l<X||m?null:c}function ee(a,r){if(!r)return!1;let o=(a.nombre??"").trim();if(!o||Y(r.nombre,o)<X)return!1;let i=A(a.municipio??"");if(!i)return!0;let n=A(r.municipio??"");return!n||n===i||n.includes(i)||i.includes(n)}var ue="https://consultacenso.registraduria.gov.co/",me=[["departamento",/^departamento$/],["municipio",/^(municipio|ciudad)$/],["direccion",/^direcci[oó]n( del)?( puesto)?$/],["nombre",/^(nombre del )?(puesto|lugar)( de votaci[oó]n)?$/],["mesa",/^(n[uú]mero de )?mesa$/]],z=a=>{let r=a.toLowerCase().replace(/[:.]/g,"").replace(/\s+/g," ").trim();return me.find(([,o])=>o.test(r))?.[0]??null},te=a=>a.trim().toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu,(r,o,i)=>o+i.toUpperCase());function de(a){let r={},o=a.split(/\r?\n/).map(n=>n.trim()).filter(Boolean),i=(n,c)=>{let l=c.trim();l&&!r[n]&&(r[n]=n==="mesa"?l.replace(/\D/g,"")||l:te(l))};for(let n=0;n<o.length;n++){let c=o[n],l=c.match(/^([^:]{3,40}):\s*(.+)$/);if(l){let w=z(l[1]);if(w){i(w,l[2]);continue}}let m=c.split(/\t|\s{2,}/).map(w=>w.trim()).filter(Boolean),g=m.map(z);if(m.length>=2&&g.filter(Boolean).length>=2&&o[n+1]){let w=o[n+1].split(/\t|\s{2,}/).map(E=>E.trim()).filter(Boolean);if(w.length===m.length){g.forEach((E,M)=>E&&i(E,w[M])),n++;continue}}let u=z(c);u&&o[n+1]&&!z(o[n+1])&&(i(u,o[n+1]),n++)}return Object.keys(r).length<2&&Object.assign(r,{...fe(a),...r}),r}var pe={uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecis\u00E9is:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintidos:22,veintid\u00F3s:22,veintitres:23,veintitr\u00E9s:23,veinticuatro:24,veinticinco:25,treinta:30,cuarenta:40,cincuenta:50};function ge(a){let r=a.match(/\d+/);if(r)return r[0];let o=0;for(let i of a.toLowerCase().split(/\s+|\by\b/))o+=pe[i]??0;return o?String(o):a.trim()}function fe(a){let r=a.replace(/\s+/g," ").trim(),o=/\b(departamento|municipio|ciudad|direcci[oó]n(?: del puesto)?|(?:nombre del )?puesto(?: de votaci[oó]n)?|lugar de votaci[oó]n|mesa(?: n[uú]mero)?)\b\s*(?:es|:|-)?\s*/gi,i=[...r.matchAll(o)],n={};return i.forEach((c,l)=>{let m=z(c[1].replace(/ n[uú]mero$/i,"").replace(/^lugar de votaci[oó]n$/i,"puesto")),g=i[l+1]?.index??r.length,u=r.slice(c.index+c[0].length,g).replace(/[,.;]+$/,"").trim();!m||!u||n[m]||(n[m]=m==="mesa"?ge(u):te(u))}),n}async function be(a){let o=await import("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js"),i=o.recognize??o.default?.recognize;if(!i)throw new Error("No se pudo cargar el lector de im\xE1genes");return(await i(a,"spa")).data.text}function Ae(a,r={}){let o=document.createElement("section");o.className="manual";let i=r.codigo??"",n=new Map,c=null,l=!1,m=null,g=null,u=!1,w=(e,t)=>{if(m=e,g=t,b.hidden=!0,b.replaceChildren(),!e)return;let s={nombre:h(o,"pm-nombre"),municipio:h(o,"pm-municipio")};if(s.nombre.trim()){if(ee(s,e)){p("Los datos escritos coinciden con la ubicaci\xF3n oficial.","success");return}b.hidden=!1,b.replaceChildren(x`
      <iswc-icon icon="mdi:alert-outline"></iswc-icon>
      <span>
        These are not the official data. The Registraduría says: <strong>${e.nombre}</strong>
        ${e.direccion?x`
            — ${e.direccion}
          `:null}${e.municipio?x`
            · ${e.municipio}
          `:null}${t?x`
            · Mesa ${t}
          `:null}.
      </span>
      <iswc-button size="small" color="brand" data-reemplazar onclick=${()=>E(e,t)}>
        <iswc-icon slot="start" icon="mdi:swap-horizontal"></iswc-icon>Reemplazar
      </iswc-button>
    `)}},E=(e,t)=>{M({nombre:e.nombre,direccion:e.direccion??"",municipio:e.municipio,departamento:e.departamento??"",mesa:t??""}),i=e.codigo,d.value=e.municipio,b.hidden=!0,b.replaceChildren(),p(`Puesto oficial: ${e.nombre}.`,"success")},M=e=>{u=!0;for(let[t,s]of Object.entries(e)){let v=o.querySelector(`[data-campo="pm-${t}"]`);v&&s&&(v.value=s)}u=!1},N=(e,t)=>{let s=document.createElement("iswc-option");return s.setAttribute("value",e),s.textContent=t,s},d=document.createElement("iswc-combobox");d.setAttribute("data-campo","pm-mun"),d.setAttribute("label","Municipio"),d.setAttribute("placeholder","Escribe el municipio"),d.setAttribute("no-results","Sin municipios"),d.setAttribute("clearable","");let f=document.createElement("iswc-combobox");f.setAttribute("data-campo","pm-puesto"),f.setAttribute("label","Puesto de votaci\xF3n"),f.setAttribute("placeholder","Nombre, direcci\xF3n o barrio del puesto"),f.setAttribute("no-results","Sin puestos"),f.setAttribute("clearable","");let $=document.createElement("small");$.className="nota",$.setAttribute("data-conteo",""),$.textContent="Elige el municipio y luego busca el puesto por nombre o direcci\xF3n.";let R=async()=>{if(!(c||l)){l=!0;try{c=await W(),d.replaceChildren(...c.map(e=>N(e.municipio,[e.municipio,e.departamento].filter(Boolean).join(" \xB7 "))))}catch{p("No se pudo cargar el cat\xE1logo de municipios: revisa la conexi\xF3n.","warning")}finally{l=!1}}},D=async e=>{try{let t=await O(e,String(d.value??"").trim(),20);n=new Map(t.map(s=>[s.codigo,s])),f.replaceChildren(...t.map(s=>N(s.codigo,J(s)))),$.textContent=t.length?`${t.length} puesto(s) del cat\xE1logo oficial.`:"Sin puestos en el cat\xE1logo oficial con esa b\xFAsqueda."}catch{$.textContent="No se pudo consultar el cat\xE1logo oficial."}},B=e=>{M({nombre:e.nombre,direccion:e.direccion??"",municipio:e.municipio,departamento:e.departamento??""}),i=e.codigo,j(),p(`Puesto del cat\xE1logo oficial: ${e.nombre}.`,"success")},b=document.createElement("div");b.className="propuesta aviso",b.setAttribute("data-aviso-oficial",""),b.hidden=!0;let P=document.createElement("div");P.className="propuesta",P.setAttribute("data-propuesta",""),P.hidden=!0;let j=()=>{P.hidden=!0,P.replaceChildren()},oe=e=>{P.hidden=!1,P.replaceChildren(x`
      <iswc-icon icon="mdi:magnify"></iswc-icon>
      <span>¿Quisiste decir <strong>${e.nombre}</strong>${e.direccion?` (${e.direccion})`:""}?</span>
      <iswc-button size="small" color="brand" data-tomar
        onclick=${()=>B(e)}><iswc-icon slot="start" icon="mdi:check"></iswc-icon>Tomar este puesto</iswc-button>
      <iswc-button size="small" variant="text" data-ignorar
        onclick=${()=>j()}>No</iswc-button>
    `)},ie=async e=>{let t=(e.nombre??"").trim();if(!t)return;let s=(e.municipio??"").trim();try{let v=await O(t,s,10),C=Z({nombre:t,municipio:s},v);if(!C){p("Ese puesto no aparece en el cat\xE1logo oficial: revisa los datos o escr\xEDbelos a mano.","warning");return}oe(C)}catch{}},ne=async()=>{let e=a().replace(/\D/g,"");e.length>=5&&await Q(e)&&p("C\xE9dula copiada: p\xE9gala en la p\xE1gina de la Registradur\xEDa.","brand"),window.open(ue,"_blank","noopener")},T=async(e,t)=>{let s=o.querySelector('[data-campo="pm-texto"]');s&&t!=="recuadro"&&(s.value=e);let v=de(e),C=Object.keys(v).length;if(!C){t!=="recuadro"&&p(`No encontr\xE9 datos del puesto en ${t}. Escr\xEDbelos a mano.`,"warning");return}M(v),p(`Le\xED ${C} dato(s) ${t==="recuadro"?"del resultado":`de ${t}`}. Rev\xEDsalos antes de guardar.`,"success"),await ie(v)},ae=e=>{let t=e.detail?.value??e.currentTarget.value??"";T(String(t),"recuadro")},re=async()=>{try{await T(await navigator.clipboard.readText(),"lo copiado")}catch{p("El navegador no dej\xF3 leer el portapapeles: pega con Ctrl+V en el recuadro.","warning")}},y=document.createElement("input");y.type="file",y.accept="image/*",y.hidden=!0,y.addEventListener("change",async()=>{let e=y.files?.[0];if(y.value="",!e)return;let t=o.querySelector("[data-leer-imagen]");t?.setAttribute("loading","");try{p("Leyendo la imagen\u2026 (la primera vez tarda unos segundos)","brand"),await T(await be(e),"la imagen")}catch(s){p(s instanceof Error?s.message:"No se pudo leer la imagen","danger")}finally{t?.removeAttribute("loading")}});let S=null,se=()=>{let e=o.querySelector("[data-dictar]");if(S)return S.stop();if(!L)return p("Este navegador no permite dictado. Prueba con Chrome o Edge.","warning");let t=new L;t.lang="es-CO",t.interimResults=!1,t.continuous=!0;let s="";t.onresult=v=>{s=Array.from(v.results).map(C=>C[0]?.transcript??"").join(" ")},t.onerror=v=>p(`Dictado: ${V(v.error)}`,"warning"),t.onend=()=>{S=null,e?.removeAttribute("data-oyendo"),s&&T(s,"lo dictado")},S=t,e?.setAttribute("data-oyendo",""),p("Te escucho: di \xABpuesto\u2026, direcci\xF3n\u2026, municipio\u2026, mesa\u2026\xBB y toca de nuevo para terminar.","brand"),t.start()};o.append(x`
    <header class="manual-cabeza">
      <iswc-icon icon="mdi:card-search-outline"></iswc-icon>
      <div><strong>Consulta asistida del puesto</strong><small>Elige el puesto del catálogo oficial o trae el resultado de la Registraduría.</small></div>
    </header>
    <div class="caminos">
      <iswc-button size="small" color="brand" variant="filled"
        data-camino="catalogo"
        aria-pressed="true"><iswc-icon slot="start" icon="mdi:magnify"></iswc-icon>Buscar en el catálogo oficial</iswc-button>
      <iswc-button size="small" variant="outlined" data-camino="manual"
        aria-pressed="false"><iswc-icon slot="start" icon="mdi:clipboard-text-outline"></iswc-icon>Traer el resultado a mano</iswc-button>
    </div>
    <section class="camino" data-panel="catalogo">
      <ol class="pasos">
        <li>${d}</li>
        <li>${f}${$}</li>
      </ol>
    </section>
    <section class="camino" data-panel="manual" hidden>
      <ol class="pasos">
        <li>
          <iswc-button size="small" variant="outlined" data-abrir-registraduria
            onclick=${()=>{ne()}}><iswc-icon slot="start" icon="mdi:open-in-new"></iswc-icon>Copiar cédula y abrir Registraduría</iswc-button>
        </li>
        <li class="extraer">
          <div class="acciones">
            <iswc-button size="small" variant="outlined" data-pegar onclick=${()=>{re()}}><iswc-icon slot="start" icon="mdi:clipboard-text-outline"></iswc-icon>Pegar texto</iswc-button>
            <iswc-button size="small" variant="outlined" data-leer-imagen onclick=${()=>y.click()}><iswc-icon slot="start" icon="mdi:image-search-outline"></iswc-icon>Leer de una imagen</iswc-button>
            <iswc-button size="small" variant="outlined" data-dictar ?disabled=${!L} title=${L?"Narra el puesto, la direcci\xF3n, el municipio y la mesa":"Este navegador no permite dictado"} onclick=${se}><iswc-icon slot="start" icon="mdi:microphone-outline"></iswc-icon>Dictar</iswc-button>
            ${y}
          </div>
          <iswc-textarea data-campo="pm-texto" rows="2"
            placeholder="…o pega aquí lo que muestra la Registraduría: los campos se llenan solos."
            oniswc-input=${ae}></iswc-textarea>
        </li>
      </ol>
    </section>
    ${P}
    ${b}
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
    <p
      class="nota">¿No quieres copiar nada? Usa la <a class="enlace" href=${F} target="_blank" rel="noopener noreferrer">captura asistida</a>: traes el resultado de la Registraduría con un marcador, sin copiar y pegar.</p>
  `);let{codigo:ve,...ce}=r;M(ce),d.value=h(o,"pm-municipio");let le=e=>{for(let t of o.querySelectorAll("[data-panel]"))t.hidden=t.getAttribute("data-panel")!==e;for(let t of o.querySelectorAll("[data-camino]"))t.setAttribute("aria-pressed",String(t.getAttribute("data-camino")===e));e==="catalogo"&&R()};for(let e of o.querySelectorAll("[data-camino]"))e.addEventListener("click",()=>le(e.getAttribute("data-camino")??"catalogo"));let H=0;d.addEventListener("iswc-show",()=>{R()}),d.addEventListener("iswc-input",e=>{String(e.detail?.value??"")!==d.value&&(clearTimeout(H),H=setTimeout(()=>{R()},200))}),d.addEventListener("iswc-change",e=>{let t=String(e.detail?.value??"").trim();t&&(M({municipio:t}),D(""))});let U=0;f.addEventListener("iswc-input",e=>{let t=String(e.detail?.value??"").trim();t!==f.value&&(clearTimeout(U),U=setTimeout(()=>{D(t)},250))}),f.addEventListener("iswc-change",e=>{let t=String(e.detail?.value??"").trim();if(!t){i="";return}let s=n.get(t);s&&B(s)});let _=()=>{u||!m||w(m,g)};for(let e of["nombre","direccion","municipio","mesa"]){let t=o.querySelector(`[data-campo="pm-${e}"]`);t?.addEventListener("iswc-input",_),t?.addEventListener("iswc-change",_)}return{nodo:o,leer(){let e={nombre:h(o,"pm-nombre"),direccion:h(o,"pm-direccion"),municipio:h(o,"pm-municipio"),departamento:h(o,"pm-departamento"),mesa:h(o,"pm-mesa")};return e.nombre?e:null},leerCodigo(){return i||null},compararConOficial:w,reemplazarPorOficial:E,limpiar(){for(let e of["texto","nombre","direccion","mesa"]){let t=o.querySelector(`[data-campo="pm-${e}"]`);t&&(t.value="")}d.value="",f.value="",f.replaceChildren(),n=new Map,i="",j(),b.hidden=!0,b.replaceChildren()}}}export{ee as a,ue as b,Ae as c};
