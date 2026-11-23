import{a as f,c as g,t as p,y as w}from"./chunk-COE25RJ5.mjs";var v="https://wsp.registraduria.gov.co/censo/consultar/",P=[["departamento",/^departamento$/],["municipio",/^(municipio|ciudad)$/],["direccion",/^direcci[oó]n( del)?( puesto)?$/],["nombre",/^(nombre del )?(puesto|lugar)( de votaci[oó]n)?$/],["mesa",/^(n[uú]mero de )?mesa$/]],d=l=>{let n=l.toLowerCase().replace(/[:.]/g,"").replace(/\s+/g," ").trim();return P.find(([,a])=>a.test(n))?.[0]??null},M=l=>l.trim().toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu,(n,a,i)=>a+i.toUpperCase());function h(l){let n={},a=l.split(/\r?\n/).map(t=>t.trim()).filter(Boolean),i=(t,c)=>{let e=c.trim();e&&!n[t]&&(n[t]=t==="mesa"?e.replace(/\D/g,"")||e:M(e))};for(let t=0;t<a.length;t++){let c=a[t],e=c.match(/^([^:]{3,40}):\s*(.+)$/);if(e){let u=d(e[1]);if(u){i(u,e[2]);continue}}let o=c.split(/\t|\s{2,}/).map(u=>u.trim()).filter(Boolean),s=o.map(d);if(o.length>=2&&s.filter(Boolean).length>=2&&a[t+1]){let u=a[t+1].split(/\t|\s{2,}/).map(m=>m.trim()).filter(Boolean);if(u.length===o.length){s.forEach((m,b)=>m&&i(m,u[b])),t++;continue}}let r=d(c);r&&a[t+1]&&!d(a[t+1])&&(i(r,a[t+1]),t++)}return n}function $(l,n={}){let a=document.createElement("section");a.className="manual";let i=e=>{for(let[o,s]of Object.entries(e)){let r=a.querySelector(`[data-campo="pm-${o}"]`);r&&s&&(r.value=s)}},t=async()=>{let e=l().replace(/\D/g,"");e.length>=5&&await w(e)&&g("C\xE9dula copiada: p\xE9gala en la p\xE1gina de la Registradur\xEDa.","brand"),window.open(v,"_blank","noopener")},c=e=>{let o=String(e.currentTarget.value??""),s=h(o),r=Object.keys(s).length;r&&(i(s),g(`Le\xED ${r} dato(s) del resultado. Rev\xEDsalos antes de guardar.`,"success"))};return a.append(f`
    <header class="manual-cabeza">
      <iswc-icon icon="mdi:card-search-outline"></iswc-icon>
      <div><strong>Consulta asistida del puesto</strong><small>La Registraduría no permite consultas automáticas: consúltala tú y trae el resultado.</small></div>
    </header>
    <ol class="pasos">
      <li><iswc-button size="small" variant="outlined" data-abrir-registraduria onclick=${()=>{t()}}><iswc-icon slot="start" icon="mdi:open-in-new"></iswc-icon>Copiar cédula y abrir Registraduría</iswc-button></li>
      <li><iswc-textarea data-campo="pm-texto" rows="2" placeholder="Pega aquí lo que muestra la Registraduría (selecciona el resultado y cópialo): los campos se llenan solos." oniswc-input=${c}></iswc-textarea></li>
      <li class="campos-puesto">
        <iswc-input data-campo="pm-nombre" label="Puesto de votación"></iswc-input>
        <iswc-input data-campo="pm-direccion" label="Dirección del puesto"></iswc-input>
        <iswc-input data-campo="pm-municipio" label="Municipio" value="Armenia"></iswc-input>
        <iswc-input data-campo="pm-departamento" label="Departamento" value="Quindío"></iswc-input>
        <iswc-input data-campo="pm-mesa" label="Mesa" inputmode="numeric"></iswc-input>
      </li>
    </ol>
  `),i(n),{nodo:a,leer(){let e={nombre:p(a,"pm-nombre"),direccion:p(a,"pm-direccion"),municipio:p(a,"pm-municipio"),departamento:p(a,"pm-departamento"),mesa:p(a,"pm-mesa")};return e.nombre?e:null},limpiar(){for(let e of["texto","nombre","direccion","mesa"]){let o=a.querySelector(`[data-campo="pm-${e}"]`);o&&(o.value="")}}}}export{v as a,$ as b};
