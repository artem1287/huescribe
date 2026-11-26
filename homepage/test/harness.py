"""Render a .dc.html page in a plain browser with a tiny stand-in for the canvas runtime
(holes, sc-if, sc-for, onClick/value bindings, setState re-render). For local checks only."""
import re, sys
src = open(sys.argv[1]).read()
blobs = dict(a.split('=') for a in sys.argv[3:])
for k, v in blobs.items(): src = src.replace('/_blob/' + k, v)
logic = re.search(r'<script type="text/x-dc" data-dc-script[^>]*>(.*?)</script>', src, re.S).group(1)
src = re.sub(r'<script type="text/x-dc".*?</script>', '', src, flags=re.S)
src = src.replace('<helmet>', '').replace('</helmet>', '').replace('<script src="./support.js"></script>', '')
harness = r'''<script>
class DCLogic { constructor(p){ this.props=p||{}; this.state={}; } setState(u){ this.state=Object.assign({},this.state,typeof u==='function'?u(this.state):u); render(); } }
''' + logic + r'''
const root = document.querySelector('x-dc'); const TPL = root.innerHTML; const C = new Component({});
const get = (scope, path) => { path=path.trim(); if (path==='true') return true; if (path==='false') return false; return path.split('.').reduce((o,k)=>o==null?undefined:o[k], scope); };
function fill(node, scope){
  if (node.nodeType===3){ node.textContent = node.textContent.replace(/\{\{([^}]+)\}\}/g,(m,p)=>{const v=get(scope,p);return v==null?'':v;}); return; }
  if (node.nodeType!==1) return;
  if (node.tagName==='SC-FOR'){ const list=get(scope,node.getAttribute('list').replace(/[{}]/g,''))||[]; const as=node.getAttribute('as'); const frag=document.createDocumentFragment();
    list.forEach((it,i)=>{ const wrap=node.cloneNode(true); const sc=Object.assign({},scope,{[as]:it,$index:i}); [...wrap.childNodes].forEach(c=>{fill(c,sc); frag.appendChild(c);}); }); node.replaceWith(frag); return; }
  if (node.tagName==='SC-IF'){ const v=get(scope,node.getAttribute('value').replace(/[{}]/g,'')); if(!v){node.remove();return;} const kids=[...node.childNodes]; kids.forEach(c=>fill(c,scope)); node.replaceWith(...kids); return; }
  for (const a of [...node.attributes]){ const m=/^\{\{([^}]+)\}\}$/.exec(a.value.trim());
    if (m){ const v=get(scope,m[1]); if (a.name==='onclick'){ node.removeAttribute('onclick'); node.addEventListener('click',v); } else if (a.name==='ref'){ node.removeAttribute('ref'); if (typeof v==='function') v(node); } else if (a.name==='value'){ node.value=v; node.setAttribute('value',v); } else node.setAttribute(a.name, v==null?'':v); }
    else if (a.value.includes('{{')) node.setAttribute(a.name, a.value.replace(/\{\{([^}]+)\}\}/g,(mm,p)=>{const v=get(scope,p);return v==null?'':v;})); }
  [...node.childNodes].forEach(c=>fill(c,scope));
}
function render(){ const y=scrollY; root.innerHTML=TPL; const v=C.renderVals(); [...root.childNodes].forEach(c=>fill(c,v)); scrollTo(0,y); }
render(); if (C.componentDidMount) C.componentDidMount();
</script>'''
src = src.replace('</body>', harness + '</body>')
open(sys.argv[2], 'w').write(src)
