function N(n,e){let t=document.createElement("template");if(t.innerHTML=n,e){let a=t.content,s=a.firstChild,l;for(s.remove();l=s.firstChild;)a.appendChild(l)}return t}function D(n){return document.importNode(n.content,!0)}function C(n,e){let t=n,a=0,s=e.length,l,i;for(;a<s;a++)for(l=e[a],t=t.firstChild,i=0;i<l;i++)t=t.nextSibling;return t}function K(n,e,t){if(n.replaceWith(e),t){let a;for(;a=n.firstChild;)e.appendChild(a)}}function A(n,e){n.append(e)}function pe(n,e){n.after(e)}function Me(n,e){let t=n;if(e.nextSibling!==n)for(;t;){let a=t;if(t=t.nextSibling,a.remove(),a===e)break}}function me(n,e,t,a){n.addEventListener(e,t,a)}function Q(n,e,t){n.setAttribute(e,t)}var X=Object,Ye=Symbol,We=/\B([A-Z])/g;function Ce(n){return n.replace(We,"-$1").toLowerCase()}var Je=X.is,Ke=X.assign,q=n=>typeof n=="function";var w,g=1<<0,$=1<<1,H=1<<2,de=1<<3,j=1<<4,L=1<<5,d,u,h,f=0,B,U=0,he=0,R=0;function Pe(){U++}function Ee(){if(U>1){U--;return}let n,e=!1;for(;B;){let t=B.sort((l,i)=>l.c-i.c),a=0,s=t.length;for(B=w,he++;a<s;a++){let l=t[a];if(l.d&=~$,!(l.d&de)&&Ae(l))try{l.m()}catch(i){e||(n=i,e=!0)}}}if(he=0,U--,e)throw n}function Ae(n){let e=n.b,t=e.length,a=0,s;for(;a<t;a++)if(s=e[a],s.e>n.e||s.h())return!0;return!1}function ke(){let n=u.b;if(h){if(Se(),f>0){let a=h.length,s=0;for(n.length=f+a;s<a;s++)n[f+s]=h[s]}else n=u.b=h;let e=n.length,t=f;for(;t<e;t++){let a=n[t];a.i=w,u.d&L&&a.j(u)}}else f<u.b.length&&(Se(),n.length=f);for(;f--;){let e=n[f];e.i=w}}function Se(){let n=u.b,e=n.length,t=f;for(;t<e;t++)n[t].g(u)}function Te(n){let e=n.b,t=e.length,a=0;for(;a<t;a++)e[a].g(n);e.length=0}var O=class{constructor(e){let t=this;t.a=e,t.e=-1,t.f=[],t.i=w}h(){return!1}j(e){this.f.push(e)}g(e){let a=this.f,s=a.indexOf(e);a.splice(s,1)}subscribe(e){let t=this;return _(()=>{let a=u,s=t.value;try{u=w,e(s)}finally{u=a}})}set(e){return this.value=e}peek(){return this.a}get value(){let e=this;return u&&e.i!==u&&(e.i=u,!h&&u.b[f]===e?f++:h?h.push(e):h=[e]),e.a}set value(e){let t=this;if(t.a!==e&&(t.a=e,t.e=++R,he<100)){let a=t.f,s=a.length,l=0;Pe();try{for(;l<s;l++)a[l].k()}finally{Ee()}}}},Y=class extends O{constructor(e){super();let t=this;t.l=e,t.b=[],t.d=H,t.n=-1}h(){let e=this;if(e.d&=~$,e.d&g||(e.d&(H|L))===L||(e.d&=~H,e.n===R))return!1;if(e.n=R,e.d|=g,e.e>-1&&!Ae(e))return e.d&=~g,!1;let t=!1,a=u,s=h,l=f;try{u=e,h=w,f=0;let i=e.l();(e.d&j||e.a!==i||e.a===0)&&(t=!0,e.a=i,e.d&=~j,e.e=++R)}catch(i){t=!0,e.a=i,e.d|=j,e.e=++R}return ke(),u=a,h=s,f=l,e.d&=~g,t}j(e){let t=this;if(t.f.length<1){let a=t.b,s=a.length,l=0;for(t.d|=L;l<s;l++)a[l].j(t)}super.j(e)}g(e){let t=this;if(super.g(e),t.f.length<1){let a=t.b,s=a.length,l=0;for(t.d&=~L;l<s;l++)a[l].g(t)}}k(){let e=this;if(!(e.d&($|g))){let t=e.f,a=t.length,s=0;for(e.d|=H|$;s<a;s++)t[s].k()}}peek(){let e=this;if(e.h(),e.d&j)throw e.a;return e.a}get value(){let e=this;if(e.h(),e.d&j)throw super.value;return super.value}set value(e){super.value=e}},W=class{constructor(e){let t=this;t.l=e,t.e=0,t.b=[],t.d=L,t.c=0}m(){let e=this;if(e.d&g)return;e.e=R,e.d|=g,e.d&=~H;let t=u,a=h,s=f;try{Pe(),u=e,h=w,f=0,e.l()}finally{ke(),u=t,h=a,f=s,e.d&=~g,e.d&de&&Te(e),Ee()}}k(){let e=this;e.d&($|g)||(e.d|=H|$,(B||=[]).push(e))}o(){let e=this;e.d|=de,e.d&g||Te(e)}},G=class{constructor(e){let t=this;t.scopes=[],t.cleanups=[],t.parent=w,t.c=0,!e&&d&&(t.parent=d,t.c=d.c+1,d.scopes.push(t))}run(e){let t=d;try{return d=this,e()}finally{d=t}}clear(){let e=this,t=e.scopes,a=e.cleanups;for(let s of t)s.clear(),s.parent=w;for(let s of a)s();t.length=0,a.length=0}};function Z(n){return new G(n)}function ee(n){q(n)&&d&&d.cleanups.push(n)}function y(n){return new O(n)}function P(n){return new Y(n)}function _(n){let e=new W(n),t=e.o.bind(e);try{e.m()}catch(a){throw t(),a}return d&&e.b.length>0&&(e.c=d.c,d.cleanups.push(t)),t}var Qe=!1,Ze=1;var I=null,ve=Ye(),J=class extends HTMLElement{$m=!1;$c=Z(!0);$p={};$h=[];constructor(){super();let e=this,t=e.$p,a=e.constructor.$d;for(let s in a){let l=a[s];t[l]=y(ve)}}connectedCallback(){let e=this;if(!e.$m){e.$m=!0;let t=e.constructor.$c,a=e.constructor.$s,s=e.$c,l=e.$h,i=e.shadowRoot,r=!1;i||(i=e.attachShadow({mode:"open"}),r=!0);let o=I;try{if(I=e,s.run(()=>t(i,e)),document.adoptedStyleSheets)r&&(i.adoptedStyleSheets=a);else for(let c of a)A(i,c.cloneNode(!0));for(let c of l){let x=c();q(x)&&s.cleanups.push(x)}l.length=0}finally{I=o}}}disconnectedCallback(){let e=this;e.$m&&(e.$c.clear(),e.shadowRoot.innerHTML="",e.$m=!1)}attributeChangedCallback(e,t,a){let s=this,l=s.constructor.$d;e in l&&(s.$p[l[e]].value=a===""?!0:a)}};function z(n,e,t,a){let s=[],l=X.create(null);class i extends J{static observedAttributes=s;static $c=e;static $a=l;static $d=t;static $s=a}for(let r in t){let o=t[r],c=Ce(r);l[c]=r,s.push(c),X.defineProperty(i.prototype,r,{get(){return this.$p[o].a},set(x){this.$p[o].value=x}})}return Qe&&(n="velvet-"+Ze++),n&&customElements.define(n,i),i}function xe(n,e){let t=I.$p[n];return t.value===ve&&(t.value=q(e)?e():e),t}function te(n){q(n)&&I.$h.push(n)}function He(n,e){let t=document.createTextNode("");n.nodeType===1?A(n,t):K(n,t,!1),_(()=>t.data=e())}function Le(n,e,t){let a=[],s=d.c+1;_(()=>{let l=t(),i=0,r=l.length,o=a.length;for(;i<r;i++)if(a[i]){let c=a[i][2];c.value=l[i]}else{let c=a[i-1],x=c?c[1]:n,S=y(l[i]),k=Z(!0);k.c=s,a[i]=[k,k.run(()=>e(x,S,i)),S]}if(o>r){let c=a[i-1],x=c?c[1]:n,S=a[o-1][1];for(;i<o;i++)a[i][0].clear();ot(x,S),a.length=r}}),ee(()=>{for(let l=0,i=a.length;l<i;l++)a[l][0].clear()})}function ot(n,e){Me(n.nextSibling,e)}function ct(n){for(var e=n.length/6|0,t=new Array(e),a=0;a<e;)t[a]="#"+n.slice(a*6,++a*6);return t}function ut(n){let e=n.length;return t=>n[Math.max(0,Math.min(e-1,Math.floor(t*e)))]}var Re=ut(ct("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));var ft=N("<svg class=demo><!></svg>"),dt=N("<svg><rect class=point /></svg>",!0),v={PHYLLOTAXIS:0,GRID:1,WAVE:2,SPIRAL:3},ne=[v.PHYLLOTAXIS,v.SPIRAL,v.PHYLLOTAXIS,v.GRID,v.WAVE],ht=Math.PI*(3-Math.sqrt(5));function $e(n){switch(n){case v.PHYLLOTAXIS:return"px";case v.GRID:return"gx";case v.WAVE:return"wx";case v.SPIRAL:return"sx"}}function Ie(n){switch(n){case v.PHYLLOTAXIS:return"py";case v.GRID:return"gy";case v.WAVE:return"wy";case v.SPIRAL:return"sy"}}function Oe(n,e,t,a){let s=n[t];return s+(n[a]-s)*e}function pt(n){return e=>{let t=Math.sqrt(e/n),a=e*ht;return[t*Math.cos(a),t*Math.sin(a)]}}function mt(n){let e=Math.round(Math.sqrt(n));return t=>[-.8+1.6/e*(t%e),-.8+1.6/e*Math.floor(t/e)]}function vt(n){let e=2/(n-1);return t=>{let a=-1+t*e;return[a,Math.sin(a*Math.PI*3)*.3]}}function xt(n){return e=>{let t=Math.sqrt(e/(n-1)),a=t*Math.PI*10;return[t*Math.cos(a),t*Math.sin(a)]}}function _t(n,e){return e.map(t=>t*n)}function bt(n,e){return e.map((t,a)=>t+n[a])}function ae(n){let e=window.innerHeight/2,t=window.innerWidth/2;return bt([t,e],_t(Math.min(e,t),n))}function gt(n,e){let t=xe(0,1e3),a=60*2,s=y(!1),l=y(0),i=y(0),r=P(()=>pt(t.value)),o=P(()=>xt(t.value)),c=P(()=>mt(t.value)),x=P(()=>vt(t.value)),S=P(()=>Ue(t.value));te(()=>(requestAnimationFrame(k),()=>{s.value=!0}));function k(){if(s.value)return;let T=(l.value+1)%a,b=T===0?(i.value+1)%ne.length:i.value;i.value=b,l.value=T;let m=Math.min(1,T/(a*.8)),M=ne[b],F=ne[(b+1)%ne.length],re=$e(M),oe=$e(F),ce=Ie(M),ue=Ie(F);S.value=S.value.map(fe=>{let E={...fe};return E.x=Oe(E,m,re,oe),E.y=Oe(E,m,ce,ue),E}),requestAnimationFrame(k)}function Ue(T){let b=[];for(let m=0;m<T;m++){let[M,F]=ae((0,r.value)(m)),[re,oe]=ae((0,o.value)(m)),[ce,ue]=ae((0,c.value)(m)),[fe,E]=ae((0,x.value)(m));b.push({x:0,y:0,color:Re(m/T),px:M,py:F,sx:re,sy:oe,gx:ce,gy:ue,wx:fe,wy:E})}return b}let we=D(ft),Xe=C(we,[0,0]);Le(Xe,(T,b)=>{let m=D(dt),M=C(m,[0]);return _(()=>Q(M,"transform",`translate(${Math.floor(b.value.x)}, ${Math.floor(b.value.y)})`)),_(()=>Q(M,"fill",b.value.color)),pe(T,m),M},()=>S.value),A(n,we)}var ie=z("x-viz-demo",gt,{count:0},[]);var yt=N("<div class=app-wrapper><x></x><div class=controls><span># Points</span><input type=range min=10 max=10000><span></span></div><span class=about> Velvet 1k Points demo, based on the <a href=https://dingoeatingfuzz.github.io/glimmer-1k/ target=_blank>Glimmer demo by Michael Lange</a> </span></div>");function wt(n,e){let t=y(1e3);_(()=>{let o=new URLSearchParams(location.search);if(o.has("count")){let c=parseInt(o.get("count"));!Number.isNaN(c)&&c>=10&&c<=1e4&&(t.value=c)}});let a=D(yt),s=new ie,l=C(a,[0,0]),i=C(a,[0,1,1]),r=C(a,[0,1,2]);_(()=>s.count=t.value),K(l,s,!0),_(()=>i.value=t.value),me(i,"input",()=>t.value=i.value),He(r,()=>t.value),A(n,a)}var _e=z("x-app",wt,{},[]);var le=100,Ne=function(){function n(e,t,a,s){this.min=e,this.max=t,this.mean=a,this.last=s}return n}(),ge=function(){function n(e){this.samples=[],this.maxSamples=e,this._i=-1}return n.prototype.addSample=function(e){this._i=(this._i+1)%this.maxSamples,this.samples[this._i]=e},n.prototype.each=function(e){for(var t=this.samples,a=0;a<t.length;a++)e(t[(this._i+1+a)%t.length],a)},n.prototype.calc=function(){var e=this.samples;if(e.length===0)return new Ne(0,0,0,0);for(var t=e[(this._i+1)%e.length],a=t,s=0,l=0;l<e.length;l++){var i=e[(this._i+1+l)%e.length];i<t&&(t=i),i>a&&(a=i),s+=i}var r=e[this._i],o=s/e.length;return new Ne(t,a,o,r)},n}(),St=function(){function n(){this.value=0,this.onChange=null}return n.prototype.inc=function(e){e>0&&(this.value+=e,this.onChange())},n}(),Tt=function(){function n(e,t){this.value=t,this.next=null}return n}(),Mt=function(){function n(e){var t=this;this._dec=function(){for(var a=performance.now();t._firstTimestamp!==null;){var s=t._firstTimestamp;if(a>=s.value)t.value-=s.value,t._firstTimestamp=t._firstTimestamp.next;else{setTimeout(t._dec,Math.ceil(s.value-a));break}}t._firstTimestamp===null&&(t._lastTimestamp=null),t.onChange()},this.interval=e,this.value=0,this.onChange=null,this._firstTimestamp=null,this._lastTimestamp=null}return n.prototype.inc=function(e){if(e>0){var t=new Tt(performance.now()+this.interval,e);this._firstTimestamp===null?(this._firstTimestamp=t,setTimeout(this._dec,this.interval)):this._lastTimestamp.next=t,this._lastTimestamp=t,this.value+=e,this.onChange()}},n}(),be=[],De=-1;function Ct(n){be.push(n),De===-1&&requestAnimationFrame(function(e){De=-1;var t=be;be=[];for(var a=0;a<t.length;a++)t[a]()})}var je=function(){var n=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var a in t)t.hasOwnProperty(a)&&(e[a]=t[a])};return function(e,t){n(e,t);function a(){this.constructor=e}e.prototype=t===null?Object.create(t):(a.prototype=t.prototype,new a)}}(),se=30,Ve=le,Ge=function(){function n(e){var t=this;this._sync=function(){t.sync(),t._dirty=!1},this.name=e,this.element=document.createElement("div"),this.element.style.cssText="padding: 2px;background-color: #020;font-family: monospace;font-size: 12px;color: #0f0",this._dirty=!1,this.invalidate()}return n.prototype.invalidate=function(){this._dirty||(this._dirty=!0,Ct(this._sync))},n.prototype.sync=function(){throw new Error("sync method not implemented")},n}(),p;(function(n){n[n.HideMin=1]="HideMin",n[n.HideMax=2]="HideMax",n[n.HideMean=4]="HideMean",n[n.HideLast=8]="HideLast",n[n.HideGraph=16]="HideGraph",n[n.RoundValues=32]="RoundValues"})(p||(p={}));var ye=function(n){je(e,n);function e(t,a,s,l){var i=n.call(this,t)||this;i.flags=a,i.unitName=s,i.samples=l;var r=document.createElement("div");r.style.cssText="text-align: center",r.textContent=i.name;var o=document.createElement("div");return a&p.HideMin?i.minText=null:(i.minText=document.createElement("div"),o.appendChild(i.minText)),a&p.HideMax?i.maxText=null:(i.maxText=document.createElement("div"),o.appendChild(i.maxText)),a&p.HideMean?i.meanText=null:(i.meanText=document.createElement("div"),o.appendChild(i.meanText)),a&p.HideLast?i.lastText=null:(i.lastText=document.createElement("div"),o.appendChild(i.lastText)),i.element.appendChild(r),i.element.appendChild(o),a&p.HideGraph?(i.canvas=null,i.ctx=null):(i.canvas=document.createElement("canvas"),i.canvas.style.cssText="display: block; padding: 0; margin: 0",i.canvas.width=Ve,i.canvas.height=se,i.ctx=i.canvas.getContext("2d"),i.element.appendChild(i.canvas)),i}return e.prototype.sync=function(){var t=this,a=this.samples.calc(),s=se/(a.max*1.2),l,i,r,o;this.flags&p.RoundValues?(l=Math.round(a.min).toString(),i=Math.round(a.max).toString(),r=Math.round(a.mean).toString(),o=Math.round(a.last).toString()):(l=a.min.toFixed(2),i=a.max.toFixed(2),r=a.mean.toFixed(2),o=a.last.toFixed(2)),this.minText!==null&&(this.minText.textContent="min: \xA0"+l+this.unitName),this.maxText!==null&&(this.maxText.textContent="max: \xA0"+i+this.unitName),this.meanText!==null&&(this.meanText.textContent="mean: "+r+this.unitName),this.lastText!==null&&(this.lastText.textContent="last: "+o+this.unitName),this.ctx!==null&&(this.ctx.fillStyle="#010",this.ctx.fillRect(0,0,Ve,se),this.ctx.fillStyle="#0f0",this.samples.each(function(c,x){t.ctx.fillRect(x,se,1,-(c*s))}))},e}(Ge),Pt=function(n){je(e,n);function e(t,a){var s=n.call(this,t)||this;return s.counter=a,s.text=document.createElement("div"),s.element.appendChild(s.text),s}return e.prototype.sync=function(){this.text.textContent=this.name+": "+this.counter.value},e}(Ge),V=null,Et=!1;function qe(){V||(V=document.createElement("div"),V.style.cssText="position: fixed;opacity: 0.9;right: 0;bottom: 0",document.body.appendChild(V)),Et=!0}function ze(n){n===void 0&&(n=p.HideMin|p.HideMax|p.HideMean|p.RoundValues),qe();var e=new ge(le),t=new ye("FPS",n,"",e);V.appendChild(t.element);var a=2/121,s=0,l=60;function i(r){s>0&&(l+=a*(1e3/(r-s)-l)),s=r,e.addSample(l),t.invalidate(),requestAnimationFrame(i)}requestAnimationFrame(i)}function Fe(n){if(n===void 0&&(n=p.HideMin|p.HideMean),qe(),performance.memory===void 0)return;var e=new ge(le),t=new ye("Memory",n,"MB",e);V.appendChild(t.element);function a(){e.addSample(Math.round(performance.memory.usedJSHeapSize/(1024*1024))),t.invalidate(),setTimeout(a,30)}a()}var ln=function(){function n(e,t,a){this.data=new ge(le),this.widget=new ye(e,a,t,this.data),this.startTime=-1}return n}();var rn=function(){function n(e,t){var a=this;this.data=t===void 0?new St:new Mt(t),this.widget=new Pt(e,this.data),this.data.onChange=function(){a.widget.invalidate()}}return n}();Be(_e);Be(ie);/[&?]perfmon=(false|off|0)\b/.test(location.search)||(ze(),Fe());var kt=new _e;document.body.appendChild(kt);function Be(n){n.prototype.attachShadow=function(){return this.shadowRoot||Object.defineProperty(this,"shadowRoot",{value:this}),this}}
//# sourceMappingURL=index.js.map