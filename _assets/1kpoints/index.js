function $(n,e){let t=document.createElement("template");if(t.innerHTML=n,e){let a=t.content,s=a.childNodes[0],r=s.childNodes,i=r.length;for(s.remove();i--;)a.appendChild(r[0])}return t}function I(n){return document.importNode(n.content,!0)}function M(n,e){let t=n,a=0,s=e.length,r,i;for(;a<s;a++)for(r=e[a],t=t.firstChild,i=0;i<r;i++)t=t.nextSibling;return t}function D(n,e,t){if(n.replaceWith(e),t){let a=n.childNodes,s=a.length;for(;s--;)e.appendChild(a[0])}}function C(n,e){n.append(e)}function he(n,e){n.after(e)}function pe(n,e){let t=n;if(e.nextSibling!==n)for(;t;){let a=t;if(t=t.nextSibling,a.remove(),a===e)break}}function me(n,e,t,a){n.addEventListener(e,t,a)}function Z(n,e,t){n.setAttribute(e,t)}var X=Object,Xe=Symbol,We=/\B([A-Z])/g;function Se(n){return n.replace(We,"-$1").toLowerCase()}var Te=X.is,Je=X.assign,j=n=>typeof n=="function";var c,y=1<<0,g=1<<1,H=1<<2,F=1<<3,W=1<<4,z=1<<5,d,f,L,U=0,de=0,Y=0;function Me(){U++}function Ce(){if(U>1){U--;return}let n,e=!1;for(;L;){let t=L.sort((a,s)=>a.h-s.h);L=c,de++;for(let a=0,s=t.length;a<s;a++){let r=t[a];r.c&=~H;try{r.s()}catch(i){e||(n=i,e=!0)}}}if(de=0,U--,e)throw n}function Ee(n){let e;if(f)if(e=n.k,!e||e.p!==f)e={d:0,c:0,m:c,g:n,e:f.b,i:c,p:f,j:c,n:c},f.b=e,n.k=e,f.c&W&&n.o(e);else if(e.c&g){e.c&=~g;let t=f.b,a=e.i,s=e.e;e!==t&&(a&&(a.e=s),s&&(s.i=a),t&&(t.i=e),e.i=c,e.e=t,f.b=e)}else e=c;try{return n.peek()}finally{e&&(e.d=n.d)}}function fe(n){if(n.c&=~y,n.c&F)throw n.a;return n.a}function Pe(n){for(let e=n.b;e;e=e.e){let t=e.g.k;t&&(e.m=t),e.g.k=e,e.c|=g}}function ke(n){let e=n.b,t;for(;e;){let a=e.e;e.c&g?(e.g.l(e),e.e=c):(t&&(t.i=e),e.i=c,e.e=t,t=e),e.g.k=e.m,e.m&&(e.m=c),e=a}n.b=t}function Ke(n){let e=this;ke(e),f=n,Ce(),e.c&=~y}var k=class{constructor(e){let t=this;t.d=0,t.a=e,t.k=c,t.f=c}o(e){let t=this;e.c&z||(e.c|=z,e.j=t.f,t.f&&(t.f.n=e),t.f=e)}l(e){let t=this,a=e.n,s=e.j;e.c&z&&(e.c&=~z,a&&(a.j=s,e.n=c),s&&(s.n=a,e.j=c),e===t.f&&(t.f=s))}subscribe(e){let t=this;return b(function(){let a=t.value,s=f;f=c;try{return e(a)}finally{f=s}})}set(e){return this.value=e}peek(){return this.a}get value(){return Ee(this)}set value(e){let t=this;if(e!==t.a){if(t.a=e,de>100)return;t.d++,Y++,Me();try{for(let a=t.f;a;a=a.j)a.p.q()}finally{Ce()}}}},J=class extends k{constructor(e){super(c),this.r=e,this.b=c,this.c=g,this.t=Y-1}o(e){let t=this;if(!t.f){t.c|=g|W;for(let a=t.b;a;a=a.e)a.g.o(a)}super.o(e)}l(e){let t=this;if(super.l(e),!t.f){t.c&=~W;for(let a=t.b;a;a=a.e)a.g.l(a)}}q(){let e=this;if(!(e.c&(H|y))){e.c|=g|H;for(let t=e.f;t;t=t.j)t.p.q()}}peek(){let e=this;if(e.c&=~H,e.c&y)return e.a;if(e.c|=y,!(e.c&g)&&e.f||e.t===Y)return fe(e);if(e.c&=~g,e.t=Y,e.d>0){let r=e.b;for(;r&&r.g.d===r.d;){try{r.g.peek()}catch{}if(r.g.d!==r.d)break;r=r.e}if(!r)return fe(e)}let t=e.a,a=e.c,s=f;try{f=e,Pe(e),e.a=e.r(),e.c&=~F,(a&F||e.a!==t||e.d===0)&&e.d++}catch(r){e.a=r,e.c|=F,e.d++}finally{ke(e),f=s}return fe(e)}get value(){let e=this;return e.c&y?e.a:Ee(e)}set value(e){super.value=e}},K=class{constructor(e){this.r=e,this.b=c,this.h=0,this.c=W}s(){let e=this;if(e.c&y)return;let t=e.u();try{e.r()}finally{t()}}u(){let e=this,t=f;return e.c|=y,Me(),f=e,Pe(e),Ke.bind(e,t)}q(){let e=this;e.c&(H|y)||(e.c|=H,L||(L=[]),L.push(e))}v(){let e=this;for(let t=e.b;t;t=t.e)t.g.l(t);e.c|=y,e.b=c}},O=class{constructor(e){let t=this;t.scopes=[],t.cleanups=[],t.parent=c,t.h=0,!e&&d&&(t.parent=d,t.h=d.h+1,d.scopes.push(t))}run(e){let t=d;try{return d=this,e()}finally{d=t}}clear(){let e=this,t=e.scopes,a=e.cleanups;for(let s of t)s.clear(),s.parent=c;for(let s of a)s();t.length=0,a.length=0}};function V(n){return new O(n)}function q(n){j(n)&&d&&d.cleanups.push(n)}function _(n){return new k(n)}function E(n){return new J(n)}function b(n){let e=new K(n),t=e.v.bind(e);try{e.s()}catch(a){throw t(),a}return d&&e.b&&(e.h=d.h,d.cleanups.push(t)),t}var Qe=!1,Ze=1;var R=null,ve=Xe(),Q=class extends HTMLElement{$m=!1;$c=V(!0);$p={};$h=[];constructor(){super();let e=this,t=e.$p,a=e.constructor.$d;for(let s in a){let r=a[s];t[r]=_(ve)}}connectedCallback(){let e=this;if(!e.$m){e.$m=!0;let t=e.constructor.$c,a=e.constructor.$s,s=e.$c,r=e.$h,i=e.shadowRoot,l=!1;i||(i=e.attachShadow({mode:"open"}),l=!0);let o=R;try{if(R=e,s.run(()=>t(i,e)),document.adoptedStyleSheets)l&&(i.adoptedStyleSheets=a);else for(let u of a)C(i,u.cloneNode(!0));for(let u of r){let v=u();j(v)&&s.cleanups.push(v)}r.length=0}finally{R=o}}}disconnectedCallback(){let e=this;e.$m&&(e.$c.clear(),e.shadowRoot.innerHTML="",e.$m=!1)}attributeChangedCallback(e,t,a){let s=this,r=s.constructor.$d;e in r&&(s.$p[r[e]].value=a===""?!0:a)}};function G(n,e,t,a){let s=[],r=X.create(null);class i extends Q{static observedAttributes=s;static $c=e;static $a=r;static $d=t;static $s=a}for(let l in t){let o=t[l],u=Se(l);r[u]=l,s.push(u),X.defineProperty(i.prototype,l,{get(){return this.$p[o].a},set(v){this.$p[o].value=v}})}return Qe&&(n="velvet-"+Ze++),n&&customElements.define(n,i),i}function be(n,e){let t=R.$p[n];return t.value===ve&&(t.value=j(e)?e():e),t}function ee(n){j(n)&&R.$h.push(n)}function He(n,e){let t=document.createTextNode("");n.nodeType===1?C(n,t):D(n,t,!1),b(()=>t.data=e())}function Le(n,e,t){let a=[],s=d.h+1;b(()=>{let r=t(),i=0,l=r.length,o=a.length;for(;i<l;i++)if(a[i]){let u=a[i][2];u.value=r[i]}else{let u=a[i-1],v=u?u[1]:n,w=_(r[i]),A=V(!0);A.h=s,a[i]=[A,A.run(()=>e(v,w,i)),w]}if(o>l){let u=a[i-1],v=u?u[1]:n,w=a[o-1][1];for(;i<o;i++)a[i][0].clear();rt(v,w),a.length=l}}),q(()=>{for(let r=0,i=a.length;r<i;r++)a[r][0].clear()})}function rt(n,e){pe(n.nextSibling,e)}function lt(n){for(var e=n.length/6|0,t=new Array(e),a=0;a<e;)t[a]="#"+n.slice(a*6,++a*6);return t}function ot(n){let e=n.length;return t=>n[Math.max(0,Math.min(e-1,Math.floor(t*e)))]}var Re=ot(lt("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));var ct=$("<svg class=demo> <!> </svg>"),ut=$("<svg><rect class=point></rect></svg>",!0),m={PHYLLOTAXIS:0,GRID:1,WAVE:2,SPIRAL:3},te=[m.PHYLLOTAXIS,m.SPIRAL,m.PHYLLOTAXIS,m.GRID,m.WAVE],ft=Math.PI*(3-Math.sqrt(5));function $e(n){switch(n){case m.PHYLLOTAXIS:return"px";case m.GRID:return"gx";case m.WAVE:return"wx";case m.SPIRAL:return"sx"}}function Ie(n){switch(n){case m.PHYLLOTAXIS:return"py";case m.GRID:return"gy";case m.WAVE:return"wy";case m.SPIRAL:return"sy"}}function Ne(n,e,t,a){let s=n[t];return s+(n[a]-s)*e}function dt(n){return e=>{let t=Math.sqrt(e/n),a=e*ft;return[t*Math.cos(a),t*Math.sin(a)]}}function ht(n){let e=Math.round(Math.sqrt(n));return t=>[-.8+1.6/e*(t%e),-.8+1.6/e*Math.floor(t/e)]}function pt(n){let e=2/(n-1);return t=>{let a=-1+t*e;return[a,Math.sin(a*Math.PI*3)*.3]}}function mt(n){return e=>{let t=Math.sqrt(e/(n-1)),a=t*Math.PI*10;return[t*Math.cos(a),t*Math.sin(a)]}}function vt(n,e){return e.map(t=>t*n)}function bt(n,e){return e.map((t,a)=>t+n[a])}function ne(n){let e=window.innerHeight/2,t=window.innerWidth/2;return bt([t,e],vt(Math.min(e,t),n))}function _t(n,e){let t=be(0,1e3),a=60*2,s=_(!1),r=_(0),i=_(0),l=E(()=>dt(t.value)),o=E(()=>mt(t.value)),u=E(()=>ht(t.value)),v=E(()=>pt(t.value)),w=E(()=>Ue(t.value));ee(()=>(requestAnimationFrame(A),()=>{s.value=!0}));function A(){if(s.value)return;let S=(r.value+1)%a,x=S===0?(i.value+1)%te.length:i.value;i.value=x,r.value=S;let p=Math.min(1,S/(a*.8)),T=te[x],B=te[(x+1)%te.length],re=$e(T),le=$e(B),oe=Ie(T),ce=Ie(B);w.value=w.value.map(ue=>{let P={...ue};return P.x=Ne(P,p,re,le),P.y=Ne(P,p,oe,ce),P}),requestAnimationFrame(A)}function Ue(S){let x=[];for(let p=0;p<S;p++){let[T,B]=ne(l.value(p)),[re,le]=ne(o.value(p)),[oe,ce]=ne(u.value(p)),[ue,P]=ne(v.value(p));x.push({x:0,y:0,color:Re(p/S),px:T,py:B,sx:re,sy:le,gx:oe,gy:ce,wx:ue,wy:P})}return x}let we=I(ct),Ye=M(we,[0,1]);Le(Ye,(S,x)=>{let p=I(ut),T=M(p,[0]);return b(()=>Z(T,"transform",`translate(${Math.floor(x.value.x)}, ${Math.floor(x.value.y)})`)),b(()=>Z(T,"fill",x.value.color)),he(S,p),T},()=>w.value),C(n,we)}var ae=G("x-viz-demo",_t,{count:0},[]);var xt=$("<div class=app-wrapper><x></x><div class=controls><span># Points</span><input type=range min=10 max=10000><span></span></div><span class=about> Velvet 1k Points demo, based on the <a href=https://dingoeatingfuzz.github.io/glimmer-1k/ target=_blank>Glimmer demo by Michael Lange</a> </span></div>");function yt(n,e){let t=_(1e3),a=I(xt),s=new ae,r=M(a,[0,0]),i=M(a,[0,1,1]),l=M(a,[0,1,2]);b(()=>s.count=t.value),D(r,s,!0),b(()=>i.value=t.value),me(i,"input",()=>t.value=i.value),He(l,()=>t.value),C(n,a)}var _e=G("x-app",yt,{},[]);var se=100,Oe=function(){function n(e,t,a,s){this.min=e,this.max=t,this.mean=a,this.last=s}return n}(),ye=function(){function n(e){this.samples=[],this.maxSamples=e,this._i=-1}return n.prototype.addSample=function(e){this._i=(this._i+1)%this.maxSamples,this.samples[this._i]=e},n.prototype.each=function(e){for(var t=this.samples,a=0;a<t.length;a++)e(t[(this._i+1+a)%t.length],a)},n.prototype.calc=function(){var e=this.samples;if(e.length===0)return new Oe(0,0,0,0);for(var t=e[(this._i+1)%e.length],a=t,s=0,r=0;r<e.length;r++){var i=e[(this._i+1+r)%e.length];i<t&&(t=i),i>a&&(a=i),s+=i}var l=e[this._i],o=s/e.length;return new Oe(t,a,o,l)},n}(),gt=function(){function n(){this.value=0,this.onChange=null}return n.prototype.inc=function(e){e>0&&(this.value+=e,this.onChange())},n}(),wt=function(){function n(e,t){this.value=t,this.next=null}return n}(),St=function(){function n(e){var t=this;this._dec=function(){for(var a=performance.now();t._firstTimestamp!==null;){var s=t._firstTimestamp;if(a>=s.value)t.value-=s.value,t._firstTimestamp=t._firstTimestamp.next;else{setTimeout(t._dec,Math.ceil(s.value-a));break}}t._firstTimestamp===null&&(t._lastTimestamp=null),t.onChange()},this.interval=e,this.value=0,this.onChange=null,this._firstTimestamp=null,this._lastTimestamp=null}return n.prototype.inc=function(e){if(e>0){var t=new wt(performance.now()+this.interval,e);this._firstTimestamp===null?(this._firstTimestamp=t,setTimeout(this._dec,this.interval)):this._lastTimestamp.next=t,this._lastTimestamp=t,this.value+=e,this.onChange()}},n}(),xe=[],De=-1;function Tt(n){xe.push(n),De===-1&&requestAnimationFrame(function(e){De=-1;var t=xe;xe=[];for(var a=0;a<t.length;a++)t[a]()})}var Ve=function(){var n=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var a in t)t.hasOwnProperty(a)&&(e[a]=t[a])};return function(e,t){n(e,t);function a(){this.constructor=e}e.prototype=t===null?Object.create(t):(a.prototype=t.prototype,new a)}}(),ie=30,je=se,qe=function(){function n(e){var t=this;this._sync=function(){t.sync(),t._dirty=!1},this.name=e,this.element=document.createElement("div"),this.element.style.cssText="padding: 2px;background-color: #020;font-family: monospace;font-size: 12px;color: #0f0",this._dirty=!1,this.invalidate()}return n.prototype.invalidate=function(){this._dirty||(this._dirty=!0,Tt(this._sync))},n.prototype.sync=function(){throw new Error("sync method not implemented")},n}(),h;(function(n){n[n.HideMin=1]="HideMin",n[n.HideMax=2]="HideMax",n[n.HideMean=4]="HideMean",n[n.HideLast=8]="HideLast",n[n.HideGraph=16]="HideGraph",n[n.RoundValues=32]="RoundValues"})(h||(h={}));var ge=function(n){Ve(e,n);function e(t,a,s,r){var i=n.call(this,t)||this;i.flags=a,i.unitName=s,i.samples=r;var l=document.createElement("div");l.style.cssText="text-align: center",l.textContent=i.name;var o=document.createElement("div");return(a&h.HideMin)===0?(i.minText=document.createElement("div"),o.appendChild(i.minText)):i.minText=null,(a&h.HideMax)===0?(i.maxText=document.createElement("div"),o.appendChild(i.maxText)):i.maxText=null,(a&h.HideMean)===0?(i.meanText=document.createElement("div"),o.appendChild(i.meanText)):i.meanText=null,(a&h.HideLast)===0?(i.lastText=document.createElement("div"),o.appendChild(i.lastText)):i.lastText=null,i.element.appendChild(l),i.element.appendChild(o),(a&h.HideGraph)===0?(i.canvas=document.createElement("canvas"),i.canvas.style.cssText="display: block; padding: 0; margin: 0",i.canvas.width=je,i.canvas.height=ie,i.ctx=i.canvas.getContext("2d"),i.element.appendChild(i.canvas)):(i.canvas=null,i.ctx=null),i}return e.prototype.sync=function(){var t=this,a=this.samples.calc(),s=ie/(a.max*1.2),r,i,l,o;(this.flags&h.RoundValues)===0?(r=a.min.toFixed(2),i=a.max.toFixed(2),l=a.mean.toFixed(2),o=a.last.toFixed(2)):(r=Math.round(a.min).toString(),i=Math.round(a.max).toString(),l=Math.round(a.mean).toString(),o=Math.round(a.last).toString()),this.minText!==null&&(this.minText.textContent="min: \xA0"+r+this.unitName),this.maxText!==null&&(this.maxText.textContent="max: \xA0"+i+this.unitName),this.meanText!==null&&(this.meanText.textContent="mean: "+l+this.unitName),this.lastText!==null&&(this.lastText.textContent="last: "+o+this.unitName),this.ctx!==null&&(this.ctx.fillStyle="#010",this.ctx.fillRect(0,0,je,ie),this.ctx.fillStyle="#0f0",this.samples.each(function(u,v){t.ctx.fillRect(v,ie,1,-(u*s))}))},e}(qe),Mt=function(n){Ve(e,n);function e(t,a){var s=n.call(this,t)||this;return s.counter=a,s.text=document.createElement("div"),s.element.appendChild(s.text),s}return e.prototype.sync=function(){this.text.textContent=this.name+": "+this.counter.value},e}(qe),N=null,Ct=!1;function Ge(){N||(N=document.createElement("div"),N.style.cssText="position: fixed;opacity: 0.9;right: 0;bottom: 0",document.body.appendChild(N)),Ct=!0}function Be(n){n===void 0&&(n=h.HideMin|h.HideMax|h.HideMean|h.RoundValues),Ge();var e=new ye(se),t=new ge("FPS",n,"",e);N.appendChild(t.element);var a=2/121,s=0,r=60;function i(l){s>0&&(r+=a*(1e3/(l-s)-r)),s=l,e.addSample(r),t.invalidate(),requestAnimationFrame(i)}requestAnimationFrame(i)}function ze(n){if(n===void 0&&(n=h.HideMin|h.HideMean),Ge(),performance.memory===void 0)return;var e=new ye(se),t=new ge("Memory",n,"MB",e);N.appendChild(t.element);function a(){e.addSample(Math.round(performance.memory.usedJSHeapSize/(1024*1024))),t.invalidate(),setTimeout(a,30)}a()}var nn=function(){function n(e,t,a){this.data=new ye(se),this.widget=new ge(e,a,t,this.data),this.startTime=-1}return n}();var an=function(){function n(e,t){var a=this;this.data=t===void 0?new gt:new St(t),this.widget=new Mt(e,this.data),this.data.onChange=function(){a.widget.invalidate()}}return n}();Fe(_e);Fe(ae);/[&?]perfmon=(false|off|0)\b/.test(location.search)||(Be(),ze());var Pt=new _e;document.body.appendChild(Pt);function Fe(n){n.prototype.attachShadow=function(){return this.shadowRoot||Object.defineProperty(this,"shadowRoot",{value:this}),this}}
//# sourceMappingURL=index.js.map
