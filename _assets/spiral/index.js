function S(l){let e=document.createElement("template");return e.innerHTML=l,e}function $(l){return document.importNode(l.content,!0)}function _(l,e){let t=l,n=0,s=e.length,r,a;for(;n<s;n++)for(r=e[n],t=t.firstChild,a=0;a<r;a++)t=t.nextSibling;return t}function N(l,e,t){if(l.replaceWith(e),t){let n=l.childNodes,s=n.length;for(;s--;)e.appendChild(n[0])}}function x(l,e){l.append(e)}function P(l,e){l.after(e)}function le(l,e){let t=l;if(e.nextSibling!==l)for(;t;){let n=t;if(t=t.nextSibling,n.remove(),n===e)break}}function ne(l,e,t){l.setAttribute(e,t)}function Y(l,e,t){l.classList.toggle(e,t)}function Z(l,e,t){l.style.setProperty(e,t)}var J=Object,ye=Symbol,xe=/\B([A-Z])/g;function ue(l){return l.replace(xe,"-$1").toLowerCase()}var fe=J.is,we=J.assign,I=l=>typeof l=="function";var u,R=1<<0,K=1<<1,ee=1<<2,Ge=1<<3,pe=1<<4,z=1<<5,p,d,O,M=0,te=0,Se=0;function se(){M++}function ae(){if(M>1){M--;return}let l,e=!1;for(;O;){let t=O.sort((n,s)=>n.h-s.h);O=u,te++;for(let n=0,s=t.length;n<s;n++){let r=t[n];r.c&=~ee;try{r.s()}catch(a){e||(l=a,e=!0)}}}if(te=0,M--,e)throw l}function $e(l){let e;if(d)if(e=l.k,!e||e.p!==d)e={d:0,c:0,m:u,g:l,e:d.b,i:u,p:d,j:u,n:u},d.b=e,l.k=e,d.c&pe&&l.o(e);else if(e.c&K){e.c&=~K;let t=d.b,n=e.i,s=e.e;e!==t&&(n&&(n.e=s),s&&(s.i=n),t&&(t.i=e),e.i=u,e.e=t,d.b=e)}else e=u;try{return l.peek()}finally{e&&(e.d=l.d)}}function ke(l){for(let e=l.b;e;e=e.e){let t=e.g.k;t&&(e.m=t),e.g.k=e,e.c|=K}}function Ee(l){let e=l.b,t;for(;e;){let n=e.e;e.c&K?(e.g.l(e),e.e=u):(t&&(t.i=e),e.i=u,e.e=t,t=e),e.g.k=e.m,e.m&&(e.m=u),e=n}l.b=t}function Ce(l){let e=this;Ee(e),d=l,ae(),e.c&=~R}var A=class{constructor(e){let t=this;t.d=0,t.a=e,t.k=u,t.f=u}o(e){let t=this;e.c&z||(e.c|=z,e.j=t.f,t.f&&(t.f.n=e),t.f=e)}l(e){let t=this,n=e.n,s=e.j;e.c&z&&(e.c&=~z,n&&(n.j=s,e.n=u),s&&(s.n=n,e.j=u),e===t.f&&(t.f=s))}subscribe(e){let t=this;return c(function(){let n=t.value,s=d;d=u;try{return e(n)}finally{d=s}})}set(e){return this.value=e}peek(){return this.a}get value(){return $e(this)}set value(e){let t=this;if(e!==t.a){if(t.a=e,te>100)return;t.d++,Se++,se();try{for(let n=t.f;n;n=n.j)n.p.q()}finally{ae()}}}};var Q=class{constructor(e){this.r=e,this.b=u,this.h=0,this.c=pe}s(){let e=this;if(e.c&R)return;let t=e.u();try{e.r()}finally{t()}}u(){let e=this,t=d;return e.c|=R,se(),d=e,ke(e),Ce.bind(e,t)}q(){let e=this;e.c&(ee|R)||(e.c|=ee,O||(O=[]),O.push(e))}v(){let e=this;for(let t=e.b;t;t=t.e)t.g.l(t);e.c|=R,e.b=u}},T=class{constructor(e){let t=this;t.scopes=[],t.cleanups=[],t.parent=u,t.h=0,!e&&p&&(t.parent=p,t.h=p.h+1,p.scopes.push(t))}run(e){let t=p;try{return p=this,e()}finally{p=t}}clear(){let e=this,t=e.scopes,n=e.cleanups;for(let s of t)s.clear(),s.parent=u;for(let s of n)s();t.length=0,n.length=0}};function j(l){return new T(l)}function q(l){I(l)&&p&&p.cleanups.push(l)}function D(l){if(M>0)return l();se();try{return l()}finally{ae()}}function v(l){return new A(l)}function c(l){let e=new Q(l),t=e.v.bind(e);try{e.s()}catch(n){throw t(),n}return p&&e.b&&(e.h=p.h,p.cleanups.push(t)),t}var Oe=!1,Le=1;var L=null,re=ye(),W=class extends HTMLElement{$m=!1;$c=j(!0);$p={};$h=[];constructor(){super();let e=this,t=e.$p,n=e.constructor.$d;for(let s in n){let r=n[s];t[r]=v(re)}}connectedCallback(){let e=this;if(!e.$m){e.$m=!0;let t=e.constructor.$c,n=e.constructor.$s,s=e.$c,r=e.$h,a=e.shadowRoot,o=!1;a||(a=e.attachShadow({mode:"open"}),o=!0);let h=L;try{if(L=e,s.run(()=>t(a,e)),document.adoptedStyleSheets)o&&(a.adoptedStyleSheets=n);else for(let i of n)x(a,i.cloneNode(!0));for(let i of r){let f=i();I(f)&&s.cleanups.push(f)}r.length=0}finally{L=h}}}disconnectedCallback(){let e=this;e.$m&&(e.$c.clear(),e.shadowRoot.innerHTML="",e.$m=!1)}attributeChangedCallback(e,t,n){let s=this,r=s.constructor.$d;e in r&&(s.$p[r[e]].value=n===""?!0:n)}};function U(l,e,t,n){let s=[],r=J.create(null);class a extends W{static observedAttributes=s;static $c=e;static $a=r;static $d=t;static $s=n}for(let o in t){let h=t[o],i=ue(o);r[i]=o,s.push(i),J.defineProperty(a.prototype,o,{get(){return this.$p[h].a},set(f){this.$p[h].value=f}})}return Oe&&(l="velvet-"+Le++),l&&customElements.define(l,a),a}function k(l,e){let t=L.$p[l];return t.value===re&&(t.value=I(e)?e():e),t}function X(l){I(l)&&L.$h.push(l)}function ie(l,e){let t=document.createTextNode("");l.nodeType===1?x(l,t):N(l,t,!1),c(()=>t.data=e())}function he(l,e){let t=j(),n,s;c(()=>{let r=e();r!==n&&(s&&(t.clear(),ve(l,s),s=null),n=r,r&&(s=t.run(()=>r(l))))})}function de(l,e,t){let n=[],s=p.h+1;c(()=>{let r=t(),a=0,o=r.length,h=n.length;for(;a<o;a++)if(n[a]){let i=n[a][2];i.value=r[a]}else{let i=n[a-1],f=i?i[1]:l,b=v(r[a]),m=j(!0);m.h=s,n[a]=[m,m.run(()=>e(f,b,a)),b]}if(h>o){let i=n[a-1],f=i?i[1]:l,b=n[h-1][1];for(;a<h;a++)n[a][0].clear();ve(f,b),n.length=o}}),q(()=>{for(let r=0,a=n.length;r<a;r++)n[r][0].clear()})}function ve(l,e){le(l.nextSibling,e)}var Ie=S("<div><!></div>"),qe=S("<span class=label> <!>, <!> </span>");function De(l,e){let t=k(0,!1),n=k(1,0),s=k(2,0),r=k(3,!1),a=k(4,()=>{}),o=$(Ie),h=_(o,[0,0]),i=_(o,[0]),f=b=>{let m=$(qe),B=_(m,[0,1]),F=_(m,[0,3]),G=_(m,[0]);return ie(B,()=>n.value),ie(F,()=>s.value),P(b,m),G};he(h,()=>t.value?f:null),ne(i,"class","cursor"),c(()=>Y(i,"big",r.value)),c(()=>Y(i,"label",t.value)),c(()=>Z(i,"border-color",a.value)),c(()=>Z(i,"transform",`translate(${n.value}px, ${s.value}px) scale(${r.value?2:1})`)),x(l,o)}var H=U("x-cursor",De,{label:0,x:1,y:2,big:3,color:4},[]);var Ue=S("<div class=main><x></x></div>"),He=S("<x></x>");function Be(l,e){let s=v(0),r=v(0),a=v(!1),o=v(0),h=v(!1),i=v([]);c(()=>{let y=500+Math.round(Math.sin(o.value/90*2*Math.PI)*500*.5),C=[];for(let w=y;w--;){let g=w/y*6,V=g*2*Math.PI,ce=20+w*2,ge=(g*255+o.value*10)%255;C[w]={color:`hsl(${ge}, 100%, 50%)`,x:s.value+Math.sin(V)*ce|0,y:r.value+Math.cos(V)*ce|0}}i.value=C});let f={timeout:!1,x:0,y:0};function b(y){f.x=y.x,f.y=y.y,f.timeout||(f.timeout=!0,requestAnimationFrame(()=>D(()=>{f.timeout=!1,s.value=f.x,r.value=f.y})))}function m(){a.value=!0}function B(y){a.value=!1}function F(){h.value||(o.value++,requestAnimationFrame(F))}X(()=>(window.addEventListener("pointermove",b),window.addEventListener("pointerdown",m),window.addEventListener("pointerup",B),requestAnimationFrame(F),()=>{window.removeEventListener("pointermove",b),window.removeEventListener("pointerdown",m),window.removeEventListener("pointerup",B),h.value=!0}));let G=$(Ue),E=new H,_e=_(G,[0,0]),be=(y,C)=>{let w=$(He),g=new H,V=_(w,[0]);return c(()=>g.color=C.value.color),c(()=>g.x=C.value.x),c(()=>g.y=C.value.y),c(()=>g.big=a.value),N(V,g,!0),P(y,w),g};e:E.label=!0;c(()=>E.x=s.value),c(()=>E.y=r.value),c(()=>E.big=a.value),N(_e,E,!0),de(E,be,()=>i.value),x(l,G)}var oe=U("x-spiral",Be,{},[]);me(oe);me(H);var Fe=new oe;document.body.appendChild(Fe);function me(l){l.prototype.attachShadow=function(){return this.shadowRoot||Object.defineProperty(this,"shadowRoot",{value:this}),this}}
//# sourceMappingURL=index.js.map
