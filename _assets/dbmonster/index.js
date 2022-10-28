var N=100,re=function(){function n(e,t,i,s){this.min=e,this.max=t,this.mean=i,this.last=s}return n}(),Q=function(){function n(e){this.samples=[],this.maxSamples=e,this._i=-1}return n.prototype.addSample=function(e){this._i=(this._i+1)%this.maxSamples,this.samples[this._i]=e},n.prototype.each=function(e){for(var t=this.samples,i=0;i<t.length;i++)e(t[(this._i+1+i)%t.length],i)},n.prototype.calc=function(){var e=this.samples;if(e.length===0)return new re(0,0,0,0);for(var t=e[(this._i+1)%e.length],i=t,s=0,l=0;l<e.length;l++){var a=e[(this._i+1+l)%e.length];a<t&&(t=a),a>i&&(i=a),s+=a}var r=e[this._i],o=s/e.length;return new re(t,i,o,r)},n}(),Ee=function(){function n(){this.value=0,this.onChange=null}return n.prototype.inc=function(e){e>0&&(this.value+=e,this.onChange())},n}(),Me=function(){function n(e,t){this.value=t,this.next=null}return n}(),$e=function(){function n(e){var t=this;this._dec=function(){for(var i=performance.now();t._firstTimestamp!==null;){var s=t._firstTimestamp;if(i>=s.value)t.value-=s.value,t._firstTimestamp=t._firstTimestamp.next;else{setTimeout(t._dec,Math.ceil(s.value-i));break}}t._firstTimestamp===null&&(t._lastTimestamp=null),t.onChange()},this.interval=e,this.value=0,this.onChange=null,this._firstTimestamp=null,this._lastTimestamp=null}return n.prototype.inc=function(e){if(e>0){var t=new Me(performance.now()+this.interval,e);this._firstTimestamp===null?(this._firstTimestamp=t,setTimeout(this._dec,this.interval)):this._lastTimestamp.next=t,this._lastTimestamp=t,this.value+=e,this.onChange()}},n}(),F=[],oe=-1;function He(n){F.push(n),oe===-1&&requestAnimationFrame(function(e){oe=-1;var t=F;F=[];for(var i=0;i<t.length;i++)t[i]()})}var ue=function(){var n=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i])};return function(e,t){n(e,t);function i(){this.constructor=e}e.prototype=t===null?Object.create(t):(i.prototype=t.prototype,new i)}}(),$=30,ce=N,fe=function(){function n(e){var t=this;this._sync=function(){t.sync(),t._dirty=!1},this.name=e,this.element=document.createElement("div"),this.element.style.cssText="padding: 2px;background-color: #020;font-family: monospace;font-size: 12px;color: #0f0",this._dirty=!1,this.invalidate()}return n.prototype.invalidate=function(){this._dirty||(this._dirty=!0,He(this._sync))},n.prototype.sync=function(){throw new Error("sync method not implemented")},n}(),h;(function(n){n[n.HideMin=1]="HideMin",n[n.HideMax=2]="HideMax",n[n.HideMean=4]="HideMean",n[n.HideLast=8]="HideLast",n[n.HideGraph=16]="HideGraph",n[n.RoundValues=32]="RoundValues"})(h||(h={}));var J=function(n){ue(e,n);function e(t,i,s,l){var a=n.call(this,t)||this;a.flags=i,a.unitName=s,a.samples=l;var r=document.createElement("div");r.style.cssText="text-align: center",r.textContent=a.name;var o=document.createElement("div");return(i&h.HideMin)===0?(a.minText=document.createElement("div"),o.appendChild(a.minText)):a.minText=null,(i&h.HideMax)===0?(a.maxText=document.createElement("div"),o.appendChild(a.maxText)):a.maxText=null,(i&h.HideMean)===0?(a.meanText=document.createElement("div"),o.appendChild(a.meanText)):a.meanText=null,(i&h.HideLast)===0?(a.lastText=document.createElement("div"),o.appendChild(a.lastText)):a.lastText=null,a.element.appendChild(r),a.element.appendChild(o),(i&h.HideGraph)===0?(a.canvas=document.createElement("canvas"),a.canvas.style.cssText="display: block; padding: 0; margin: 0",a.canvas.width=ce,a.canvas.height=$,a.ctx=a.canvas.getContext("2d"),a.element.appendChild(a.canvas)):(a.canvas=null,a.ctx=null),a}return e.prototype.sync=function(){var t=this,i=this.samples.calc(),s=$/(i.max*1.2),l,a,r,o;(this.flags&h.RoundValues)===0?(l=i.min.toFixed(2),a=i.max.toFixed(2),r=i.mean.toFixed(2),o=i.last.toFixed(2)):(l=Math.round(i.min).toString(),a=Math.round(i.max).toString(),r=Math.round(i.mean).toString(),o=Math.round(i.last).toString()),this.minText!==null&&(this.minText.textContent="min: \xA0"+l+this.unitName),this.maxText!==null&&(this.maxText.textContent="max: \xA0"+a+this.unitName),this.meanText!==null&&(this.meanText.textContent="mean: "+r+this.unitName),this.lastText!==null&&(this.lastText.textContent="last: "+o+this.unitName),this.ctx!==null&&(this.ctx.fillStyle="#010",this.ctx.fillRect(0,0,ce,$),this.ctx.fillStyle="#0f0",this.samples.each(function(u,d){t.ctx.fillRect(d,$,1,-(u*s))}))},e}(fe),Ne=function(n){ue(e,n);function e(t,i){var s=n.call(this,t)||this;return s.counter=i,s.text=document.createElement("div"),s.element.appendChild(s.text),s}return e.prototype.sync=function(){this.text.textContent=this.name+": "+this.counter.value},e}(fe),_=null,Ae=!1;function K(){_||(_=document.createElement("div"),_.style.cssText="position: fixed;opacity: 0.9;right: 0;bottom: 0",document.body.appendChild(_)),Ae=!0}function he(n){n===void 0&&(n=h.HideMin|h.HideMax|h.HideMean|h.RoundValues),K();var e=new Q(N),t=new J("FPS",n,"",e);_.appendChild(t.element);var i=2/121,s=0,l=60;function a(r){s>0&&(l+=i*(1e3/(r-s)-l)),s=r,e.addSample(l),t.invalidate(),requestAnimationFrame(a)}requestAnimationFrame(a)}function pe(n){if(n===void 0&&(n=h.HideMin|h.HideMean),K(),performance.memory===void 0)return;var e=new Q(N),t=new J("Memory",n,"MB",e);_.appendChild(t.element);function i(){e.addSample(Math.round(performance.memory.usedJSHeapSize/(1024*1024))),t.invalidate(),setTimeout(i,30)}i()}var Pe=function(){function n(e,t,i){this.data=new Q(N),this.widget=new J(e,i,t,this.data),this.startTime=-1}return n}(),H={},Ye=function(){function n(e,t){var i=this;this.data=t===void 0?new Ee:new $e(t),this.widget=new Ne(e,this.data),this.data.onChange=function(){i.widget.invalidate()}}return n}();function de(n,e){e===void 0&&(e=0),K();var t=H[n];t===void 0&&(H[n]=t=new Pe(n,"ms",e),_.appendChild(t.widget.element))}function me(n){var e=H[n];e!==void 0&&(e.startTime=performance.now())}function ve(n){var e=performance.now(),t=H[n];t!==void 0&&t.startTime!==-1&&(t.data.addSample(e-t.startTime),t.widget.invalidate())}function C(n,e){let t=document.createElement("template");if(t.innerHTML=n,e){let i=t.content,s=i.childNodes[0],l=s.childNodes,a=l.length;for(s.remove();a--;)i.appendChild(l[0])}return t}function k(n){return document.importNode(n.content,!0)}function m(n,e){let t=n,i=0,s=e.length,l,a;for(;i<s;i++)for(l=e[i],t=t.firstChild,a=0;a<l;a++)t=t.nextSibling;return t}function Z(n,e,t){if(n.replaceWith(e),t){let i=n.childNodes,s=i.length;for(;s--;)e.appendChild(i[0])}}function b(n,e){n.append(e)}function V(n,e){n.after(e)}function W(n,e){let t=n;if(e.nextSibling!==n)for(;t;){let i=t;if(t=t.nextSibling,i.remove(),i===e)break}}function I(n,e,t){n.setAttribute(e,t)}var R=Object,je=Symbol,Oe=/\B([A-Z])/g;function _e(n){return n.replace(Oe,"-$1").toLowerCase()}var xe=R.is,De=R.assign,B=n=>typeof n=="function";var c,w=1<<0,j=1<<1,X=1<<2,Ze=1<<3,ye=1<<4,A=1<<5,f,p,y,P=0,Y=0,Le=0;function be(){P++}function ge(){if(P>1){P--;return}let n,e=!1;for(;y;){let t=y.sort((i,s)=>i.h-s.h);y=c,Y++;for(let i=0,s=t.length;i<s;i++){let l=t[i];l.c&=~X;try{l.s()}catch(a){e||(n=a,e=!0)}}}if(Y=0,P--,e)throw n}function Ve(n){let e;if(p)if(e=n.k,!e||e.p!==p)e={d:0,c:0,m:c,g:n,e:p.b,i:c,p,j:c,n:c},p.b=e,n.k=e,p.c&ye&&n.o(e);else if(e.c&j){e.c&=~j;let t=p.b,i=e.i,s=e.e;e!==t&&(i&&(i.e=s),s&&(s.i=i),t&&(t.i=e),e.i=c,e.e=t,p.b=e)}else e=c;try{return n.peek()}finally{e&&(e.d=n.d)}}function Ie(n){for(let e=n.b;e;e=e.e){let t=e.g.k;t&&(e.m=t),e.g.k=e,e.c|=j}}function Be(n){let e=n.b,t;for(;e;){let i=e.e;e.c&j?(e.g.l(e),e.e=c):(t&&(t.i=e),e.i=c,e.e=t,t=e),e.g.k=e.m,e.m&&(e.m=c),e=i}n.b=t}function qe(n){let e=this;Be(e),p=n,ge(),e.c&=~w}var S=class{constructor(e){let t=this;t.d=0,t.a=e,t.k=c,t.f=c}o(e){let t=this;e.c&A||(e.c|=A,e.j=t.f,t.f&&(t.f.n=e),t.f=e)}l(e){let t=this,i=e.n,s=e.j;e.c&A&&(e.c&=~A,i&&(i.j=s,e.n=c),s&&(s.n=i,e.j=c),e===t.f&&(t.f=s))}subscribe(e){let t=this;return v(function(){let i=t.value,s=p;p=c;try{return e(i)}finally{p=s}})}set(e){return this.value=e}peek(){return this.a}get value(){return Ve(this)}set value(e){let t=this;if(e!==t.a){if(t.a=e,Y>100)return;t.d++,Le++,be();try{for(let i=t.f;i;i=i.j)i.p.q()}finally{ge()}}}};var O=class{constructor(e){this.r=e,this.b=c,this.h=0,this.c=ye}s(){let e=this;if(e.c&w)return;let t=e.u();try{e.r()}finally{t()}}u(){let e=this,t=p;return e.c|=w,be(),p=e,Ie(e),qe.bind(e,t)}q(){let e=this;e.c&(X|w)||(e.c|=X,y||(y=[]),y.push(e))}v(){let e=this;for(let t=e.b;t;t=t.e)t.g.l(t);e.c|=w,e.b=c}},D=class{constructor(e){let t=this;t.scopes=[],t.cleanups=[],t.parent=c,t.h=0,!e&&f&&(t.parent=f,t.h=f.h+1,f.scopes.push(t))}run(e){let t=f;try{return f=this,e()}finally{f=t}}clear(){let e=this,t=e.scopes,i=e.cleanups;for(let s of t)s.clear(),s.parent=c;for(let s of i)s();t.length=0,i.length=0}};function q(n){return new D(n)}function ee(n){B(n)&&f&&f.cleanups.push(n)}function G(n){return new S(n)}function v(n){let e=new O(n),t=e.v.bind(e);try{e.s()}catch(i){throw t(),i}return f&&e.b&&(e.h=f.h,f.cleanups.push(t)),t}var Ge=!1,Ue=1;var T=null,te=je(),L=class extends HTMLElement{$m=!1;$c=q(!0);$p={};$h=[];constructor(){super();let e=this,t=e.$p,i=e.constructor.$d;for(let s in i){let l=i[s];t[l]=G(te)}}connectedCallback(){let e=this;if(!e.$m){e.$m=!0;let t=e.constructor.$c,i=e.constructor.$s,s=e.$c,l=e.$h,a=e.shadowRoot,r=!1;a||(a=e.attachShadow({mode:"open"}),r=!0);let o=T;try{if(T=e,s.run(()=>t(a,e)),document.adoptedStyleSheets)r&&(a.adoptedStyleSheets=i);else for(let u of i)b(a,u.cloneNode(!0));for(let u of l){let d=u();B(d)&&s.cleanups.push(d)}l.length=0}finally{T=o}}}disconnectedCallback(){let e=this;e.$m&&(e.$c.clear(),e.shadowRoot.innerHTML="",e.$m=!1)}attributeChangedCallback(e,t,i){let s=this,l=s.constructor.$d;e in l&&(s.$p[l[e]].value=i===""?!0:i)}};function ne(n,e,t,i){let s=[],l=R.create(null);class a extends L{static observedAttributes=s;static $c=e;static $a=l;static $d=t;static $s=i}for(let r in t){let o=t[r],u=_e(r);l[u]=r,s.push(u),R.defineProperty(a.prototype,r,{get(){return this.$p[o].a},set(d){this.$p[o].value=d}})}return Ge&&(n="velvet-"+Ue++),n&&customElements.define(n,a),a}function ie(n,e){let t=T.$p[n];return t.value===te&&(t.value=B(e)?e():e),t}function E(n,e){let t=document.createTextNode("");n.nodeType===1?b(n,t):Z(n,t,!1),v(()=>t.data=e())}function ae(n,e,t){let i=[],s=f.h+1;v(()=>{let l=t(),a=0,r=l.length,o=i.length;for(;a<r;a++)if(i[a]){let u=i[a][2];u.value=l[a]}else{let u=i[a-1],d=u?u[1]:n,x=G(l[a]),g=q(!0);g.h=s,i[a]=[g,g.run(()=>e(d,x,a)),x]}if(o>r){let u=i[a-1],d=u?u[1]:n,x=i[o-1][1];for(;a<o;a++)i[a][0].clear();Fe(d,x),i.length=r}}),ee(()=>{for(let l=0,a=i.length;l<a;l++)i[l][0].clear()})}function Fe(n,e){W(n.nextSibling,e)}var Qe=C("<table class='table table-striped latest-data'><tbody><!></tbody></table>"),Je=C("<tr><td class=dbname><!></td><td class=query-count><span> <!> </span></td></tr>"),Ke=C("<td><!> <div class='popover left'><div class=popover-content></div><div class=arrow></div></div></td>");function Xe(n,e){let t=ie(0,()=>[]),i=k(Qe),s=m(i,[0,0,0]);ae(s,(a,r)=>{let o=k(Je),u=m(o,[0,0,0]),d=m(o,[0,1,0,1]),x=m(o,[0,1,0]),g=m(o,[0,1]),we=m(o,[0]),Te=(Se,z)=>{let M=k(Ke),Ce=m(M,[0,0]),ke=m(M,[0,2,0]),le=m(M,[0]);return E(Ce,()=>z.value.formatElapsed),E(ke,()=>z.value.query),v(()=>I(le,"class",`Query ${z.value.elapsedClassName}`)),V(Se,M),le};return E(u,()=>r.value.dbname),E(d,()=>r.value.lastSample.nbQueries),v(()=>I(x,"class",r.value.lastSample.countClassName)),ae(g,Te,()=>r.value.lastSample.topFiveQueries),V(a,o),we},()=>t.value),b(n,i)}var se=ne("x-app",Xe,{dbs:0},[]);se.prototype.attachShadow=function(){return this};var U=new se;U.dbs=ENV.generateData().toArray();document.body.appendChild(U);if(/[&?]perfmon=(false|off|0)\b/.test(location.search)){let n=function(){let e=ENV.generateData().toArray();U.dbs=e,setTimeout(n,ENV.timeout)};n()}else{let n=function(){let e=ENV.generateData().toArray();me("view update"),U.dbs=e,ve("view update"),setTimeout(n,ENV.timeout)};he(),pe(),de("view update"),n()}
//# sourceMappingURL=index.js.map
