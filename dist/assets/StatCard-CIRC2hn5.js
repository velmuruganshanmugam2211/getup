import{c as i,j as e,C as d,S as c}from"./index-D_kzgxlt.js";import{T as u}from"./trending-up-D6QYznXg.js";/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=i("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=i("Receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-react v0.446.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=i("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]),f=({title:r,value:x,subtitle:a,trend:s,icon:n,progress:t,className:m,onClick:l})=>e.jsxs(d,{onClick:l,hoverable:!!l,className:c("p-5 flex flex-col justify-between transition-all duration-150",l&&"cursor-pointer",m),children:[e.jsxs("div",{className:"flex items-start justify-between",children:[e.jsx("p",{className:"text-xs font-semibold text-text-muted uppercase tracking-wider",children:r}),n&&e.jsx("div",{className:"p-2 rounded-control bg-primary-50 text-primary-700 shrink-0",children:n})]}),e.jsxs("div",{className:"mt-3",children:[e.jsx("div",{className:"text-2xl font-bold text-text tabular-nums tracking-tight",children:x}),(s||a)&&e.jsxs("div",{className:"flex items-center gap-2 mt-1",children:[s&&e.jsxs("span",{className:c("inline-flex items-center text-xs font-semibold tabular-nums",s.value>0&&(s.isPositive!==!1?"text-semantic-success":"text-semantic-danger"),s.value<0&&(s.isPositive!==!1?"text-semantic-danger":"text-semantic-success"),s.value===0&&"text-text-muted"),children:[s.value>0?e.jsx(u,{className:"w-3.5 h-3.5 mr-0.5"}):s.value<0?e.jsx(o,{className:"w-3.5 h-3.5 mr-0.5"}):e.jsx(h,{className:"w-3.5 h-3.5 mr-0.5"}),Math.abs(s.value),"%"]}),a&&e.jsx("span",{className:"text-xs text-text-muted",children:a})]}),t&&e.jsxs("div",{className:"mt-3",children:[e.jsxs("div",{className:"flex justify-between text-xs text-text-muted mb-1 tabular-nums",children:[e.jsx("span",{children:t.label||"Progress"}),e.jsxs("span",{children:[t.current," / ",t.total]})]}),e.jsx("div",{className:"w-full bg-slate-100 rounded-pill h-1.5 overflow-hidden",children:e.jsx("div",{className:"bg-primary-600 h-full rounded-pill transition-all duration-300",style:{width:`${Math.min(100,Math.round(t.current/(t.total||1)*100))}%`}})})]})]})]});export{v as R,f as S};
