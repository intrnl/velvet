function R(n,e){let t=document.createElement("template");if(t.innerHTML=n,e){let a=t.content,s=a.childNodes[0],r=s.childNodes,i=r.length;for(s.remove();i--;)a.appendChild(r[0])}return t}function $(n){return document.importNode(n.content,!0)}function T(n,e){let t=n,a=0,s=e.length,r,i;for(;a<s;a++)for(r=e[a],t=t.firstChild,i=0;i<r;i++)t=t.nextSibling;return t}function V(n,e,t){if(n.replaceWith(e),t){let a=n.childNodes,s=a.length;for(;s--;)e.appendChild(a[0])}}function M(n,e){n.append(e)}function de(n,e){n.after(e)}function he(n,e){let t=n;if(e.nextSibling!==n)for(;t;){let a=t;if(t=t.nextSibling,a.remove(),a===e)break}}function pe(n,e,t,a){n.addEventListener(e,t,a)}function Z(n,e,t){n.setAttribute(e,t)}var W=Object,We=Symbol,Je=/\B([A-Z])/g;function Se(n){return n.replace(Je,"-$1").toLowerCase()}var Te=W.is,Ke=W.assign,G=n=>typeof n=="function";var u,_=1<<0,H=1<<1,N=1<<2,D=1<<3,O=1<<4,k=1<<5,d,f,U,X=0,fe=0,Y=0;function Me(){X++}function Ce(){if(X>1){X--;return}let n,e=!1;for(;U;){let t=U.sort((r,i)=>r.i-i.i),a=0,s=t.length;for(U=u,fe++;a<s;a++){let r=t[a];if(r.c&=~H,!(r.c&D)&&Ee(r))try{r.t()}catch(i){e||(n=i,e=!0)}}}if(fe=0,X--,e)throw n}function Pe(n){if(!f)return u;let e=n.k;return!e||e.q!==f?(e={d:0,n:e,g:n,h:u,e:f.b,q:f,l:u,j:u},f.b=e,n.k=e,f.c&k&&n.o(e),e):e.d===-1?(e.d=0,e.h&&(e.h.e=e.e,e.e&&(e.e.h=e.h),e.h=u,e.e=f.b,f.b.h=e,f.b=e),e):u}function Ee(n){for(let e=n.b;e;e=e.e)if(e.g.d!==e.d||!e.g.p()||e.g.d!==e.d)return!0;return!1}function Ae(n){for(let e=n.b;e;e=e.e){let t=e.g.k;t&&(e.n=t),e.g.k=e,e.d=-1}}function me(n){let e=u,t=n.b;for(;t;){let a=t.e;t.d===-1?(t.g.m(t),t.e=u):(e&&(e.h=t),t.h=u,t.e=e,e=t),t.g.k=t.n,t.n&&(t.n=u),t=a}n.b=e}function ke(n){for(let e=n.b;e;e=e.e)e.g.m(e);n.b=u}function Qe(n){let e=this;me(e),f=n,e.c&=~_,e.c&D&&ke(e),Ce()}var E=class{constructor(e){this.a=e,this.d=0,this.k=u,this.f=u}p(){return!0}o(e){let t=this;t.f!==e&&!e.l&&(e.j=t.f,t.f&&(t.f.l=e),t.f=e)}m(e){let t=this,a=e.l,s=e.j;a&&(a.j=s,e.l=u),s&&(s.l=a,e.j=u),e===t.f&&(t.f=s)}subscribe(e){let t=this;return m(()=>{let a=f,s=t.value;try{f=u,e(s)}finally{f=a}})}set(e){return this.value=e}peek(){return this.a}get value(){let e=this,t=Pe(e);return t&&(t.d=e.d),e.a}set value(e){let t=this;if(t.a!==e&&(t.a=e,t.d++,Y++,fe<100)){Me();try{for(let a=t.f;a;a=a.j)a.q.r()}finally{Ce()}}}},J=class extends E{constructor(e){super(),this.s=e,this.b=u,this.u=Y-1,this.c=N}p(){let e=this;if(e.c&=~H,e.c&_)return!1;if((e.c&(N|k))===k||(e.c&=~N,e.u===Y))return!0;if(e.c|=_,e.u=Y,e.d>0&&!Ee(e))return e.c&=~_,!0;let t=f;try{Ae(e),f=e;let a=e.s();(e.c&O||e.a!==a||e.a===0)&&(e.a=a,e.c&=~O,e.d++)}catch(a){e.a=a,e.c|=O,e.d++}return f=t,me(e),e.c&=~_,!0}o(e){let t=this;if(!t.f){t.c|=N|k;for(let a=t.b;a;a=a.e)a.g.o(a)}super.o(e)}m(e){let t=this;if(super.m(e),!t.f){t.c&=~k;for(let a=t.b;a;a=a.e)a.g.m(a)}}r(){let e=this;if(!(e.c&(H|_))){e.c|=N|H;for(let t=e.f;t;t=t.j)t.q.r()}}peek(){let e=this;if(e.p(),e.c&O)throw e.a;return e.a}get value(){let e=this;if(e.p(),!(e.c&_)){let t=Pe(e);t&&(t.d=e.d)}if(e.c&O)throw e.a;return e.a}set value(e){super.value=e}},K=class{constructor(e){this.s=e,this.b=u,this.c=k}t(){let e=this;if(e.c&(_|D))return;let t=e.v();try{e.s()}finally{t()}}v(){let e=this;e.c|=_,e.c&=~D,me(e),Ae(e),Me();let t=f;return f=e,Qe.bind(e,t)}r(){let e=this;e.c&(H|_)||(e.c|=H,(U||=[]).push(e))}w(){let e=this;e.c|=D,e.c&_||ke(e)}},j=class{constructor(e){let t=this;t.scopes=[],t.cleanups=[],t.parent=u,t.i=0,!e&&d&&(t.parent=d,t.i=d.i+1,d.scopes.push(t))}run(e){let t=d;try{return d=this,e()}finally{d=t}}clear(){let e=this,t=e.scopes,a=e.cleanups;for(let s of t)s.clear(),s.parent=u;for(let s of a)s();t.length=0,a.length=0}};function q(n){return new j(n)}function z(n){G(n)&&d&&d.cleanups.push(n)}function x(n){return new E(n)}function C(n){return new J(n)}function m(n){let e=new K(n),t=e.w.bind(e);try{e.t()}catch(a){throw t(),a}return d&&e.b&&(e.i=d.i,d.cleanups.push(t)),t}var Ze=!1,et=1;var L=null,ve=We(),Q=class extends HTMLElement{$m=!1;$c=q(!0);$p={};$h=[];constructor(){super();let e=this,t=e.$p,a=e.constructor.$d;for(let s in a){let r=a[s];t[r]=x(ve)}}connectedCallback(){let e=this;if(!e.$m){e.$m=!0;let t=e.constructor.$c,a=e.constructor.$s,s=e.$c,r=e.$h,i=e.shadowRoot,l=!1;i||(i=e.attachShadow({mode:"open"}),l=!0);let o=L;try{if(L=e,s.run(()=>t(i,e)),document.adoptedStyleSheets)l&&(i.adoptedStyleSheets=a);else for(let c of a)M(i,c.cloneNode(!0));for(let c of r){let b=c();G(b)&&s.cleanups.push(b)}r.length=0}finally{L=o}}}disconnectedCallback(){let e=this;e.$m&&(e.$c.clear(),e.shadowRoot.innerHTML="",e.$m=!1)}attributeChangedCallback(e,t,a){let s=this,r=s.constructor.$d;e in r&&(s.$p[r[e]].value=a===""?!0:a)}};function F(n,e,t,a){let s=[],r=W.create(null);class i extends Q{static observedAttributes=s;static $c=e;static $a=r;static $d=t;static $s=a}for(let l in t){let o=t[l],c=Se(l);r[c]=l,s.push(c),W.defineProperty(i.prototype,l,{get(){return this.$p[o].a},set(b){this.$p[o].value=b}})}return Ze&&(n="velvet-"+et++),n&&customElements.define(n,i),i}function be(n,e){let t=L.$p[n];return t.value===ve&&(t.value=G(e)?e():e),t}function ee(n){G(n)&&L.$h.push(n)}function Le(n,e){let t=document.createTextNode("");n.nodeType===1?M(n,t):V(n,t,!1),m(()=>t.data=e())}function Re(n,e,t){let a=[],s=d.i+1;m(()=>{let r=t(),i=0,l=r.length,o=a.length;for(;i<l;i++)if(a[i]){let c=a[i][2];c.value=r[i]}else{let c=a[i-1],b=c?c[1]:n,g=x(r[i]),A=q(!0);A.i=s,a[i]=[A,A.run(()=>e(b,g,i)),g]}if(o>l){let c=a[i-1],b=c?c[1]:n,g=a[o-1][1];for(;i<o;i++)a[i][0].clear();ot(b,g),a.length=l}}),z(()=>{for(let r=0,i=a.length;r<i;r++)a[r][0].clear()})}function ot(n,e){he(n.nextSibling,e)}function ct(n){for(var e=n.length/6|0,t=new Array(e),a=0;a<e;)t[a]="#"+n.slice(a*6,++a*6);return t}function ut(n){let e=n.length;return t=>n[Math.max(0,Math.min(e-1,Math.floor(t*e)))]}var $e=ut(ct("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));var ft=R("<svg class=demo><!></svg>"),dt=R("<svg><rect class=point /></svg>",!0),v={PHYLLOTAXIS:0,GRID:1,WAVE:2,SPIRAL:3},te=[v.PHYLLOTAXIS,v.SPIRAL,v.PHYLLOTAXIS,v.GRID,v.WAVE],ht=Math.PI*(3-Math.sqrt(5));function Ie(n){switch(n){case v.PHYLLOTAXIS:return"px";case v.GRID:return"gx";case v.WAVE:return"wx";case v.SPIRAL:return"sx"}}function Ne(n){switch(n){case v.PHYLLOTAXIS:return"py";case v.GRID:return"gy";case v.WAVE:return"wy";case v.SPIRAL:return"sy"}}function Oe(n,e,t,a){let s=n[t];return s+(n[a]-s)*e}function pt(n){return e=>{let t=Math.sqrt(e/n),a=e*ht;return[t*Math.cos(a),t*Math.sin(a)]}}function mt(n){let e=Math.round(Math.sqrt(n));return t=>[-.8+1.6/e*(t%e),-.8+1.6/e*Math.floor(t/e)]}function vt(n){let e=2/(n-1);return t=>{let a=-1+t*e;return[a,Math.sin(a*Math.PI*3)*.3]}}function bt(n){return e=>{let t=Math.sqrt(e/(n-1)),a=t*Math.PI*10;return[t*Math.cos(a),t*Math.sin(a)]}}function _t(n,e){return e.map(t=>t*n)}function xt(n,e){return e.map((t,a)=>t+n[a])}function ne(n){let e=window.innerHeight/2,t=window.innerWidth/2;return xt([t,e],_t(Math.min(e,t),n))}function yt(n,e){let t=be(0,1e3),a=60*2,s=x(!1),r=x(0),i=x(0),l=C(()=>pt(t.value)),o=C(()=>bt(t.value)),c=C(()=>mt(t.value)),b=C(()=>vt(t.value)),g=C(()=>Xe(t.value));ee(()=>(requestAnimationFrame(A),()=>{s.value=!0}));function A(){if(s.value)return;let w=(r.value+1)%a,y=w===0?(i.value+1)%te.length:i.value;i.value=y,r.value=w;let p=Math.min(1,w/(a*.8)),S=te[y],B=te[(y+1)%te.length],re=Ie(S),le=Ie(B),oe=Ne(S),ce=Ne(B);g.value=g.value.map(ue=>{let P={...ue};return P.x=Oe(P,p,re,le),P.y=Oe(P,p,oe,ce),P}),requestAnimationFrame(A)}function Xe(w){let y=[];for(let p=0;p<w;p++){let[S,B]=ne((0,l.value)(p)),[re,le]=ne((0,o.value)(p)),[oe,ce]=ne((0,c.value)(p)),[ue,P]=ne((0,b.value)(p));y.push({x:0,y:0,color:$e(p/w),px:S,py:B,sx:re,sy:le,gx:oe,gy:ce,wx:ue,wy:P})}return y}let we=$(ft),Ye=T(we,[0,0]);Re(Ye,(w,y)=>{let p=$(dt),S=T(p,[0]);return m(()=>Z(S,"transform",`translate(${Math.floor(y.value.x)}, ${Math.floor(y.value.y)})`)),m(()=>Z(S,"fill",y.value.color)),de(w,p),S},()=>g.value),M(n,we)}var ae=F("x-viz-demo",yt,{count:0},[]);var gt=R("<div class=app-wrapper><x></x><div class=controls><span># Points</span><input type=range min=10 max=10000><span></span></div><span class=about> Velvet 1k Points demo, based on the <a href=https://dingoeatingfuzz.github.io/glimmer-1k/ target=_blank>Glimmer demo by Michael Lange</a> </span></div>");function wt(n,e){let t=x(1e3);m(()=>{let o=new URLSearchParams(location.search);if(o.has("count")){let c=parseInt(o.get("count"));!Number.isNaN(c)&&c>=10&&c<=1e4&&(t.value=c)}});let a=$(gt),s=new ae,r=T(a,[0,0]),i=T(a,[0,1,1]),l=T(a,[0,1,2]);m(()=>s.count=t.value),V(r,s,!0),m(()=>i.value=t.value),pe(i,"input",()=>t.value=i.value),Le(l,()=>t.value),M(n,a)}var _e=F("x-app",wt,{},[]);var se=100,De=function(){function n(e,t,a,s){this.min=e,this.max=t,this.mean=a,this.last=s}return n}(),ye=function(){function n(e){this.samples=[],this.maxSamples=e,this._i=-1}return n.prototype.addSample=function(e){this._i=(this._i+1)%this.maxSamples,this.samples[this._i]=e},n.prototype.each=function(e){for(var t=this.samples,a=0;a<t.length;a++)e(t[(this._i+1+a)%t.length],a)},n.prototype.calc=function(){var e=this.samples;if(e.length===0)return new De(0,0,0,0);for(var t=e[(this._i+1)%e.length],a=t,s=0,r=0;r<e.length;r++){var i=e[(this._i+1+r)%e.length];i<t&&(t=i),i>a&&(a=i),s+=i}var l=e[this._i],o=s/e.length;return new De(t,a,o,l)},n}(),St=function(){function n(){this.value=0,this.onChange=null}return n.prototype.inc=function(e){e>0&&(this.value+=e,this.onChange())},n}(),Tt=function(){function n(e,t){this.value=t,this.next=null}return n}(),Mt=function(){function n(e){var t=this;this._dec=function(){for(var a=performance.now();t._firstTimestamp!==null;){var s=t._firstTimestamp;if(a>=s.value)t.value-=s.value,t._firstTimestamp=t._firstTimestamp.next;else{setTimeout(t._dec,Math.ceil(s.value-a));break}}t._firstTimestamp===null&&(t._lastTimestamp=null),t.onChange()},this.interval=e,this.value=0,this.onChange=null,this._firstTimestamp=null,this._lastTimestamp=null}return n.prototype.inc=function(e){if(e>0){var t=new Tt(performance.now()+this.interval,e);this._firstTimestamp===null?(this._firstTimestamp=t,setTimeout(this._dec,this.interval)):this._lastTimestamp.next=t,this._lastTimestamp=t,this.value+=e,this.onChange()}},n}(),xe=[],je=-1;function Ct(n){xe.push(n),je===-1&&requestAnimationFrame(function(e){je=-1;var t=xe;xe=[];for(var a=0;a<t.length;a++)t[a]()})}var Ge=function(){var n=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var a in t)t.hasOwnProperty(a)&&(e[a]=t[a])};return function(e,t){n(e,t);function a(){this.constructor=e}e.prototype=t===null?Object.create(t):(a.prototype=t.prototype,new a)}}(),ie=30,Ve=se,qe=function(){function n(e){var t=this;this._sync=function(){t.sync(),t._dirty=!1},this.name=e,this.element=document.createElement("div"),this.element.style.cssText="padding: 2px;background-color: #020;font-family: monospace;font-size: 12px;color: #0f0",this._dirty=!1,this.invalidate()}return n.prototype.invalidate=function(){this._dirty||(this._dirty=!0,Ct(this._sync))},n.prototype.sync=function(){throw new Error("sync method not implemented")},n}(),h;(function(n){n[n.HideMin=1]="HideMin",n[n.HideMax=2]="HideMax",n[n.HideMean=4]="HideMean",n[n.HideLast=8]="HideLast",n[n.HideGraph=16]="HideGraph",n[n.RoundValues=32]="RoundValues"})(h||(h={}));var ge=function(n){Ge(e,n);function e(t,a,s,r){var i=n.call(this,t)||this;i.flags=a,i.unitName=s,i.samples=r;var l=document.createElement("div");l.style.cssText="text-align: center",l.textContent=i.name;var o=document.createElement("div");return(a&h.HideMin)===0?(i.minText=document.createElement("div"),o.appendChild(i.minText)):i.minText=null,(a&h.HideMax)===0?(i.maxText=document.createElement("div"),o.appendChild(i.maxText)):i.maxText=null,(a&h.HideMean)===0?(i.meanText=document.createElement("div"),o.appendChild(i.meanText)):i.meanText=null,(a&h.HideLast)===0?(i.lastText=document.createElement("div"),o.appendChild(i.lastText)):i.lastText=null,i.element.appendChild(l),i.element.appendChild(o),(a&h.HideGraph)===0?(i.canvas=document.createElement("canvas"),i.canvas.style.cssText="display: block; padding: 0; margin: 0",i.canvas.width=Ve,i.canvas.height=ie,i.ctx=i.canvas.getContext("2d"),i.element.appendChild(i.canvas)):(i.canvas=null,i.ctx=null),i}return e.prototype.sync=function(){var t=this,a=this.samples.calc(),s=ie/(a.max*1.2),r,i,l,o;(this.flags&h.RoundValues)===0?(r=a.min.toFixed(2),i=a.max.toFixed(2),l=a.mean.toFixed(2),o=a.last.toFixed(2)):(r=Math.round(a.min).toString(),i=Math.round(a.max).toString(),l=Math.round(a.mean).toString(),o=Math.round(a.last).toString()),this.minText!==null&&(this.minText.textContent="min: \xA0"+r+this.unitName),this.maxText!==null&&(this.maxText.textContent="max: \xA0"+i+this.unitName),this.meanText!==null&&(this.meanText.textContent="mean: "+l+this.unitName),this.lastText!==null&&(this.lastText.textContent="last: "+o+this.unitName),this.ctx!==null&&(this.ctx.fillStyle="#010",this.ctx.fillRect(0,0,Ve,ie),this.ctx.fillStyle="#0f0",this.samples.each(function(c,b){t.ctx.fillRect(b,ie,1,-(c*s))}))},e}(qe),Pt=function(n){Ge(e,n);function e(t,a){var s=n.call(this,t)||this;return s.counter=a,s.text=document.createElement("div"),s.element.appendChild(s.text),s}return e.prototype.sync=function(){this.text.textContent=this.name+": "+this.counter.value},e}(qe),I=null,Et=!1;function ze(){I||(I=document.createElement("div"),I.style.cssText="position: fixed;opacity: 0.9;right: 0;bottom: 0",document.body.appendChild(I)),Et=!0}function Fe(n){n===void 0&&(n=h.HideMin|h.HideMax|h.HideMean|h.RoundValues),ze();var e=new ye(se),t=new ge("FPS",n,"",e);I.appendChild(t.element);var a=2/121,s=0,r=60;function i(l){s>0&&(r+=a*(1e3/(l-s)-r)),s=l,e.addSample(r),t.invalidate(),requestAnimationFrame(i)}requestAnimationFrame(i)}function Be(n){if(n===void 0&&(n=h.HideMin|h.HideMean),ze(),performance.memory===void 0)return;var e=new ye(se),t=new ge("Memory",n,"MB",e);I.appendChild(t.element);function a(){e.addSample(Math.round(performance.memory.usedJSHeapSize/(1024*1024))),t.invalidate(),setTimeout(a,30)}a()}var rn=function(){function n(e,t,a){this.data=new ye(se),this.widget=new ge(e,a,t,this.data),this.startTime=-1}return n}();var ln=function(){function n(e,t){var a=this;this.data=t===void 0?new St:new Mt(t),this.widget=new Pt(e,this.data),this.data.onChange=function(){a.widget.invalidate()}}return n}();Ue(_e);Ue(ae);/[&?]perfmon=(false|off|0)\b/.test(location.search)||(Fe(),Be());var kt=new _e;document.body.appendChild(kt);function Ue(n){n.prototype.attachShadow=function(){return this.shadowRoot||Object.defineProperty(this,"shadowRoot",{value:this}),this}}
//# sourceMappingURL=index.js.map
