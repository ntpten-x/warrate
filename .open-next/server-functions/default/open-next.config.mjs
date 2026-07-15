"use strict";var l=Symbol.for("__cloudflare-context__");function h(e={async:!1}){return e.async?p():C()}function s(){return globalThis[l]}function i(){return globalThis.__NEXT_DATA__?.nextExport===!0}function C(){const e=s();if(e)return e;throw i()?new Error("\n\nERROR: `getCloudflareContext` has been called in sync mode in either a static route or at the top level of a non-static one, both cases are not allowed but can be solved by either:\n  - make sure that the call is not at the top level and that the route is not static\n  - call `getCloudflareContext({async: true})` to use the `async` mode\n  - avoid calling `getCloudflareContext` in the route\n"):new Error(c)}async function p(){const e=s();if(e)return e;if(process.env.NEXT_RUNTIME==="nodejs"||i()){const t=await y();return x(t),t}throw new Error(c)}function x(e){const o=globalThis;o[l]=e}async function y(e){const{getPlatformProxy:o}=await import(`${"__wrangler".replaceAll("_","")}`),t=e?.environment??process.env.NEXT_DEV_WRANGLER_ENV,{env:n,cf:a,ctx:r}=await o({...e,envFiles:[],environment:t});return{env:n,cf:a,ctx:r}}var c=`

ERROR: \`getCloudflareContext\` has been called without having called \`initOpenNextCloudflareForDev\` from the Next.js config file.
You should update your Next.js config file as shown below:

   \`\`\`
   // next.config.mjs

   import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

   initOpenNextCloudflareForDev();

   const nextConfig = { ... };
   export default nextConfig;
   \`\`\`

`,m={name:"cloudflare-asset-resolver",async maybeGetAssetResult(e){const{ASSETS:o}=h().env;if(!o||!_(globalThis.__ASSETS_RUN_WORKER_FIRST__,e.rawPath))return;const{method:t,headers:n}=e;if(t!=="GET"&&t!="HEAD")return;const a=new URL(e.rawPath,"https://assets.local"),r=await o.fetch(a,{headers:n,method:t});if(r.status===404){await r.body?.cancel();return}return{type:"core",statusCode:r.status,headers:Object.fromEntries(r.headers.entries()),body:b(t,r),isBase64Encoded:!1}}};function b(e,o){return e==="HEAD"?null:o.body||new ReadableStream}function _(e,o){if(!Array.isArray(e))return e??!1;let t=!1;for(let n of e){let a=!0;if(n.startsWith("!"))n=n.slice(1),a=!1;else if(t)continue;if(new RegExp(`^${n.replace(/([[\]().*+?^$|{}\\])/g,"\\$1").replace("\\*",".*")}$`).test(o))if(a)t=!0;else return!1}return t}var E=m;function w(e={}){const{incrementalCache:o,tagCache:t,queue:n,cachePurge:a,enableCacheInterception:r=!1,routePreloadingBehavior:g="none"}=e;return{default:{override:{wrapper:"cloudflare-node",converter:"edge",proxyExternalRequest:"fetch",incrementalCache:f(o),tagCache:u(t),queue:d(n),cdnInvalidation:R(a)},routePreloadingBehavior:g},edgeExternals:["node:crypto"],cloudflare:{useWorkerdCondition:!0},dangerous:{enableCacheInterception:r},middleware:{external:!0,override:{wrapper:"cloudflare-edge",converter:"edge",proxyExternalRequest:"fetch",incrementalCache:f(o),tagCache:u(t),queue:d(n)},assetResolver:()=>E}}}function f(e="dummy"){return typeof e=="string"||typeof e=="function"?e:()=>e}function u(e="dummy"){return typeof e=="string"||typeof e=="function"?e:()=>e}function d(e="dummy"){return typeof e=="string"||typeof e=="function"?e:()=>e}function R(e="dummy"){return typeof e=="string"||typeof e=="function"?e:()=>e}var v=w({dangerous:{buildConfig:{external:["pg-cloudflare","expo-sqlite","fs","path","os","pg"],minify:!0}}});export{v as default};
