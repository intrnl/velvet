function x(s,e){let t=document.createElement("template");if(t.innerHTML=s,e){let l=t.content,a=l.childNodes[0],i=a.childNodes,n=i.length;for(a.remove();n--;)l.appendChild(i[0])}return t}function S(s){return document.importNode(s.content,!0)}function u(s,e){let t=s,l=0,a=e.length,i,n;for(;l<a;l++)for(i=e[l],t=t.firstChild,n=0;n<i;n++)t=t.nextSibling;return t}function te(s,e,t){if(s.replaceWith(e),t){let l=s.childNodes,a=l.length;for(;a--;)e.appendChild(l[0])}}function T(s,e){s.append(e)}function R(s,e){s.after(e)}function le(s,e){let t=s;if(e.nextSibling!==s)for(;t;){let l=t;if(t=t.nextSibling,l.remove(),l===e)break}}function k(s,e,t,l){s.addEventListener(e,t,l)}function se(s,e,t){s.setAttribute(e,t)}function $(s,e,t){s.classList.toggle(e,t)}var Y=Object,ze=Symbol,Qe=/\B([A-Z])/g;function pe(s){return s.replace(Qe,"-$1").toLowerCase()}var ve=Y.is,Ve=Y.assign,ne=s=>typeof s=="function";var o,g=1<<0,N=1<<1,D=1<<2,L=1<<3,I=1<<4,A=1<<5,_,h,H,M=0,ee=0,q=0;function _e(){M++}function me(){if(M>1){M--;return}let s,e=!1;for(;H;){let t=H.sort((i,n)=>i.i-n.i),l=0,a=t.length;for(H=o,ee++;l<a;l++){let i=t[l];if(i.c&=~N,!(i.c&L)&&be(i))try{i.t()}catch(n){e||(s=n,e=!0)}}}if(ee=0,M--,e)throw s}function ge(s){if(!h)return o;let e=s.k;return!e||e.q!==h?(e={d:0,n:e,g:s,h:o,e:h.b,q:h,l:o,j:o},h.b=e,s.k=e,h.c&A&&s.o(e),e):e.d===-1?(e.d=0,e.h&&(e.h.e=e.e,e.e&&(e.e.h=e.h),e.h=o,e.e=h.b,h.b.h=e,h.b=e),e):o}function be(s){for(let e=s.b;e;e=e.e)if(e.g.d!==e.d||!e.g.p()||e.g.d!==e.d)return!0;return!1}function ye(s){for(let e=s.b;e;e=e.e){let t=e.g.k;t&&(e.n=t),e.g.k=e,e.d=-1}}function ae(s){let e=o,t=s.b;for(;t;){let l=t.e;t.d===-1?(t.g.m(t),t.e=o):(e&&(e.h=t),t.h=o,t.e=e,e=t),t.g.k=t.n,t.n&&(t.n=o),t=l}s.b=e}function ke(s){for(let e=s.b;e;e=e.e)e.g.m(e);s.b=o}function Xe(s){let e=this;ae(e),h=s,e.c&=~g,e.c&L&&ke(e),me()}var C=class{constructor(e){this.a=e,this.d=0,this.k=o,this.f=o}p(){return!0}o(e){let t=this;t.f!==e&&!e.l&&(e.j=t.f,t.f&&(t.f.l=e),t.f=e)}m(e){let t=this,l=e.l,a=e.j;l&&(l.j=a,e.l=o),a&&(a.l=l,e.j=o),e===t.f&&(t.f=a)}subscribe(e){let t=this;return p(()=>{let l=h,a=t.value;try{h=o,e(a)}finally{h=l}})}set(e){return this.value=e}peek(){return this.a}get value(){let e=this,t=ge(e);return t&&(t.d=e.d),e.a}set value(e){let t=this;if(t.a!==e&&(t.a=e,t.d++,q++,ee<100)){_e();try{for(let l=t.f;l;l=l.j)l.q.r()}finally{me()}}}},B=class extends C{constructor(e){super(),this.s=e,this.b=o,this.u=q-1,this.c=D}p(){let e=this;if(e.c&=~N,e.c&g)return!1;if((e.c&(D|A))===A||(e.c&=~D,e.u===q))return!0;if(e.c|=g,e.u=q,e.d>0&&!be(e))return e.c&=~g,!0;let t=h;try{ye(e),h=e;let l=e.s();(e.c&I||e.a!==l||e.a===0)&&(e.a=l,e.c&=~I,e.d++)}catch(l){e.a=l,e.c|=I,e.d++}return h=t,ae(e),e.c&=~g,!0}o(e){let t=this;if(!t.f){t.c|=D|A;for(let l=t.b;l;l=l.e)l.g.o(l)}super.o(e)}m(e){let t=this;if(super.m(e),!t.f){t.c&=~A;for(let l=t.b;l;l=l.e)l.g.m(l)}}r(){let e=this;if(!(e.c&(N|g))){e.c|=D|N;for(let t=e.f;t;t=t.j)t.q.r()}}peek(){let e=this;if(e.p(),e.c&I)throw e.a;return e.a}get value(){let e=this;if(e.p(),!(e.c&g)){let t=ge(e);t&&(t.d=e.d)}if(e.c&I)throw e.a;return e.a}set value(e){super.value=e}},J=class{constructor(e){this.s=e,this.b=o,this.c=A}t(){let e=this;if(e.c&(g|L))return;let t=e.v();try{e.s()}finally{t()}}v(){let e=this;e.c|=g,e.c&=~L,ae(e),ye(e),_e();let t=h;return h=e,Xe.bind(e,t)}r(){let e=this;e.c&(N|g)||(e.c|=N,(H||=[]).push(e))}w(){let e=this;e.c|=L,e.c&g||ke(e)}},U=class{constructor(e){let t=this;t.scopes=[],t.cleanups=[],t.parent=o,t.i=0,!e&&_&&(t.parent=_,t.i=_.i+1,_.scopes.push(t))}run(e){let t=_;try{return _=this,e()}finally{_=t}}clear(){let e=this,t=e.scopes,l=e.cleanups;for(let a of t)a.clear(),a.parent=o;for(let a of l)a();t.length=0,l.length=0}};function P(s){return new U(s)}function ie(s){ne(s)&&_&&_.cleanups.push(s)}function E(s){return new C(s)}function F(s){return new B(s)}function p(s){let e=new J(s),t=e.w.bind(e);try{e.t()}catch(l){throw t(),l}return _&&e.b&&(e.i=_.i,_.cleanups.push(t)),t}var Ze=!1,et=1;var G=null,we=ze(),W=class extends HTMLElement{$m=!1;$c=P(!0);$p={};$h=[];constructor(){super();let e=this,t=e.$p,l=e.constructor.$d;for(let a in l){let i=l[a];t[i]=E(we)}}connectedCallback(){let e=this;if(!e.$m){e.$m=!0;let t=e.constructor.$c,l=e.constructor.$s,a=e.$c,i=e.$h,n=e.shadowRoot,d=!1;n||(n=e.attachShadow({mode:"open"}),d=!0);let v=G;try{if(G=e,a.run(()=>t(n,e)),document.adoptedStyleSheets)d&&(n.adoptedStyleSheets=l);else for(let f of l)T(n,f.cloneNode(!0));for(let f of i){let b=f();ne(b)&&a.cleanups.push(b)}i.length=0}finally{G=v}}}disconnectedCallback(){let e=this;e.$m&&(e.$c.clear(),e.shadowRoot.innerHTML="",e.$m=!1)}attributeChangedCallback(e,t,l){let a=this,i=a.constructor.$d;e in i&&(a.$p[i[e]].value=l===""?!0:l)}};function re(s,e,t,l){let a=[],i=Y.create(null);class n extends W{static observedAttributes=a;static $c=e;static $a=i;static $d=t;static $s=l}for(let d in t){let v=t[d],f=pe(d);i[f]=d,a.push(f),Y.defineProperty(n.prototype,d,{get(){return this.$p[v].a},set(b){this.$p[v].value=b}})}return Ze&&(s="velvet-"+et++),s&&customElements.define(s,n),n}function z(s,e){let t=document.createTextNode("");s.nodeType===1?T(s,t):te(s,t,!1),p(()=>t.data=e())}function Q(s,e){let t=P(),l,a;p(()=>{let i=e();i!==l&&(a&&(t.clear(),xe(s,a),a=null),l=i,i&&(a=t.run(()=>i(s))))})}function Ee(s,e,t){let l=[],a=_.i+1;p(()=>{let i=t(),n=0,d=i.length,v=l.length;for(;n<d;n++)if(l[n]){let f=l[n][2];f.value=i[n]}else{let f=l[n-1],b=f?f[1]:s,w=E(i[n]),j=P(!0);j.i=a,l[n]=[j,j.run(()=>e(b,w,n)),w]}if(v>d){let f=l[n-1],b=f?f[1]:s,w=l[v-1][1];for(;n<v;n++)l[n][0].clear();xe(b,w),l.length=d}}),ie(()=>{for(let i=0,n=l.length;i<n;i++)l[i][0].clear()})}function xe(s,e){le(s.nextSibling,e)}var lt=x("<header class=header><h1>todos</h1><input class=new-todo placeholder='What needs to be done?'autofocus></header>"),st=x("<section class=main><input id=toggle-all class=toggle-all type=checkbox><label for=toggle-all>Mark all as complete</label><ul class=todo-list><!></ul><footer class=footer><span class=todo-count> <strong></strong> <!> left </span><ul class=filters><li><a href=#/>All</a></li><li><a href=#/active>Active</a></li><li><a href=#/completed>Completed</a></li></ul></footer></section>"),nt=x("<li><div class=view><input class=toggle type=checkbox><label><!></label><button class=destroy></button></div> <!></li>"),at=x("<input class=edit>"),it=x("<button class=clear-completed>Clear completed</button>");function rt(s,e){let a="todos",i={all:r=>r,active:r=>r.filter(c=>!c.completed),completed:r=>r.filter(c=>c.completed)},n=E(JSON.parse(localStorage.getItem(a)||"[]")),d=E("all"),v=E(null),f=E(null),b=F(()=>i[d.value](n.value)),w=F(()=>i.active(n.value).length),j=r=>{n.value=n.value.map(c=>({...c,completed:r.target.checked}))},Se=()=>{n.value=n.value.filter(r=>!r.completed)},$e=r=>{r.which===13&&(n.value=n.value.concat({id:Date.now(),title:r.target.value,completed:!1}),r.target.value="")},Ae=r=>{n.value=n.value.filter(c=>c.id!==r)},oe=r=>{n.value=n.value.map(c=>c.id!==r.id?c:{...c,...r})},Ne=(r,c)=>{oe({id:r,completed:c.target.checked})},Ce=r=>{r.which===13?r.target.blur():r.which===27&&(v.value=null,f.value=null)},Te=r=>{oe({id:v.value,title:r.target.value}),v.value=null,f.value=null},ue=()=>{let r=window.location.hash.replace(/#\/?/,"");i[r]||(r="all"),d.value=r};window.addEventListener("hashchange",ue),ue(),p(()=>localStorage.setItem(a,JSON.stringify(n.value))),p(()=>{f.value&&setTimeout(()=>f.value.focus())});let V=S(lt),Re=u(V,[0,1]),je=u(V,[0]),Oe=r=>{let c=S(st),fe=u(c,[0,0]),De=u(c,[0,2,0]),Ie=u(c,[0,3,0,1]),Le=u(c,[0,3,0,3]),Pe=u(c,[0,3,1,0,0]),Ke=u(c,[0,3,1,1,0]),He=u(c,[0,3,1,2,0]),Me=u(c,[0,3,1]),qe=u(c,[0]),Ge=(X,m)=>{let y=S(nt),de=u(y,[0,0,0]),Be=u(y,[0,0,1,0]),Je=u(y,[0,0,1]),Ue=u(y,[0,0,2]),We=u(y,[0,2]),K=u(y,[0]),Fe=Z=>{let he=S(at),O=u(he,[0]);return f.value=O,p(()=>O.value=m.value.title),k(O,"keydown",Ce),k(O,"blur",Te),R(Z,he),O};return p(()=>de.checked=m.value.completed),k(de,"change",Z=>Ne(m.value.id,Z)),z(Be,()=>m.value.title),k(Je,"dblclick",()=>v.value=m.value.id),k(Ue,"click",()=>Ae(m.value.id)),Q(We,()=>v.value===m.value.id?Fe:null),se(K,"class","todo"),p(()=>$(K,"completed",m.value.completed)),p(()=>$(K,"editing",v.value===m.value.id)),R(X,y),K},Ye=X=>{let m=S(it),y=u(m,[0]);return k(y,"click",Se),R(X,m),y};return p(()=>fe.checked=w.value===0),k(fe,"change",j),Ee(De,Ge,()=>b.value),z(Ie,()=>w.value),z(Le,()=>w.value===1?"item":"items"),p(()=>$(Pe,"selected",d.value==="all")),p(()=>$(Ke,"selected",d.value==="active")),p(()=>$(He,"selected",d.value==="completed")),Q(Me,()=>n.value.length>w.value?Ye:null),R(r,c),qe};k(Re,"keydown",$e),Q(je,()=>n.value.length>0?Oe:null),T(s,V)}var ce=re("x-app",rt,{},[]);ce.prototype.attachShadow=function(){return this};var ct=new ce;document.body.append(ct);
//# sourceMappingURL=index.js.map
