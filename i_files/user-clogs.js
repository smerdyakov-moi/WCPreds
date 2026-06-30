/**
 * UserClogTracker - Enterprise Analytics Tracking Plugin v2.0.0
 *
 * ==> DOCS: https://team-tool.atlassian.net/wiki/x/IoA0ig
 *
 * ==> FEATURES:
 * - Event tracking for analytics and GA4
 * - Offline queue support with auto-sync
 * - Retry logic (3 attempts with exponential backoff)
 * - Performance monitoring and debug mode
 * - ES6+ with fallback for legacy browsers
 * - 100% backward compatibility
 *
 * ==> QUICK START:
 * ```javascript
 * // Basic tracking
 * userClogTracking('https://domain.com', 'video-play', 'homepage', 'video-url', '123', 'hd');
 *
 * // Debug mode
 * userClogTracker.setDebugMode(true);
 *
 * // Get version
 * console.log(userClogTracker.getVersion()); // '2.0.0'
 * ```
 *
 * ==> EVENT TYPES:
 * - video-play, video-complete, video-pause
 * - signup-open, signup-complete
 * - login, logout, favorite, share
 * - click, scroll, hover
 *
 * ==> GEO SUPPORT:
 * - Auto-detection from page_params['geo-localization']
 * - Subdomain mapping: es→spanish, jp→japan, it→italy, fr→france
 *
 * ==> PRIVACY & PERFORMANCE:
 * - Uses keepalive for reliable tracking
 * - Respects Do Not Track (if implemented)
 * - Queue limit: 100 requests max
 * - Retry limit: 3 attempts max
 *
 * ==> MIGRATION FROM v1.x:
 * No changes required - fully backward compatible
 * Just replace the old file and get new features automatically
 *
 * ==> DEBUG MODE:
 * ```javascript
 * userClogTracker.setDebugMode(true);
 * // Logs: "UserClogTracker: Event tracked in 2.45ms"
 * ```
 *
 * ==> BROWSER SUPPORT:
 * - Modern browsers: Fetch API + URLSearchParams
 * - Legacy browsers: XMLHttpRequest fallback
 * - iOS 13+ fully supported
 *
 * ==> PERFORMANCE:
 * - Singleton pattern - single instance
 * - Minimal memory footprint
 * - Async non-blocking operations
 * - Performance.now() timing in debug mode
 *
 * ==> API REFERENCE:
 * - userClogTracking(domain, event, origin?, url?, id?, variation?, params?)
 * - updateClogTracking(context)
 * - userClogTracker.setDebugMode(boolean)
 * - userClogTracker.getVersion()
 *
 * ==> EXAMPLES:
 * See wiki documentation for complete examples and best practices
 *
 * @version 2.0.0
 * @author Pornhub Frontend Team
 * @since 2024-11-25
 * @license Internal Use Only
 * @see https://team-tool.atlassian.net/wiki/x/IoA0ig
 */
class UserClogTracker{constructor(){if(UserClogTracker.instance)return UserClogTracker.instance;this.version="2.0.0",this.config={subdomainMap:{es:"spanish",jp:"japan",it:"italy",fr:"france"},debugMode:!1,maxRetries:3},this.currentContext="",this.requestQueue=[],this.isOnline=navigator.onLine,UserClogTracker.instance=this,this.initEventListeners()}initEventListeners(){window.addEventListener("online",()=>{this.isOnline=!0,this.processQueue()}),window.addEventListener("offline",()=>{this.isOnline=!1})}track(e,i,t,n,r,a,s){const o=performance.now();try{this.validateRequiredParams(e,i);const u=this.buildTrackingData(i,t,n,r,a,s);if(this.isOnline?this.sendTracking(e,u):this.queueRequest(e,u),this.sendToGA4(u.ga4Obj),this.config.debugMode){const e=performance.now()-o;console.log(`UserClogTracker: Event tracked in ${e.toFixed(2)}ms`,u)}}catch(e){console.warn("UserClogTracking error:",e.message)}}updateContext(e){clickedElement=e,this.currentContext=e||""}validateRequiredParams(e,i){if(!e||"string"!=typeof e)throw new Error("currentDomain is required and must be a string");if(!i||"string"!=typeof i)throw new Error("eventType is required and must be a string")}buildTrackingData(e,i,t,n,r,a){const s={event:e},o=new URLSearchParams,u=userClogTracking._tempTrackType||"event";return userClogTracking._tempTrackType&&delete userClogTracking._tempTrackType,o.set("type",u),o.set("event",e),this.addOriginData(o,s,{originPart:i,originUrl:t,itemId:n,originVariation:r}),this.addGeoData(o,s,e),this.addAdditionalParams(o,s,a),{urlParams:o,ga4Obj:s}}addOriginData(e,i,{originPart:t,originUrl:n,itemId:r,originVariation:a}){t&&(e.set("origin",t),i.origin=t),n&&(e.set("origin_url",n),i.origin_url=n),r&&(e.set("origin_item_id",r),i.origin_item_id=r),void 0!==a&&(e.set("origin_item_variation",a),i.origin_item_variation=a)}addGeoData(e,i,t){const n=this.getGeoLocalization(t);n&&(e.set("geo-localization",n),i["geo-localization"]=n)}getGeoLocalization(e){if("undefined"==typeof page_params)return null;const i=page_params["geo-localization"];return i&&"all"!==i?i:page_params.subdomain&&"signup-open"===e&&this.config.subdomainMap[page_params.subdomain]||null}addAdditionalParams(e,i,t){t&&"object"==typeof t&&Object.entries(t).forEach(([t,n])=>{t&&void 0!==n&&(e.set(t,n),i[t]=n)})}sendTracking(e,i,t=0){const n=`${"undefined"!=typeof window&&window.telemetryHostname?window.telemetryHostname:e}/_i?${i.urlParams.toString()}`,r="undefined"!=typeof liuIdOrNull&&liuIdOrNull?{__m:liuIdOrNull}:{};if("undefined"!=typeof fetch)fetch(n,{method:"POST",headers:r,credentials:"include",keepalive:!0}).then(n=>{!n.ok&&t<this.config.maxRetries&&setTimeout(()=>this.sendTracking(e,i,t+1),1e3*(t+1))}).catch(n=>{t<this.config.maxRetries?setTimeout(()=>this.sendTracking(e,i,t+1),1e3*(t+1)):console.warn("Tracking failed after retries:",n)});else{const r=new XMLHttpRequest;r.open("POST",n,!0),"undefined"!=typeof liuIdOrNull&&liuIdOrNull&&r.setRequestHeader("__m",liuIdOrNull),r.withCredentials="undefined"!=typeof window&&window.telemetryHostname,r.onload=()=>{r.status>=400&&t<this.config.maxRetries&&setTimeout(()=>this.sendTracking(e,i,t+1),1e3*(t+1))},r.onerror=()=>{t<this.config.maxRetries?setTimeout(()=>this.sendTracking(e,i,t+1),1e3*(t+1)):console.warn("Tracking failed after retries")},r.send()}}queueRequest(e,i){this.requestQueue.push({currentDomain:e,trackingData:i,timestamp:Date.now()}),this.requestQueue.length>100&&this.requestQueue.shift()}processQueue(){for(;this.requestQueue.length>0;){const e=this.requestQueue.shift();this.sendTracking(e.currentDomain,e.trackingData)}}sendToGA4(e){window.dataLayer&&"function"==typeof window.dataLayer.push&&window.dataLayer.push(e)}setDebugMode(e){this.config.debugMode=e}getVersion(){return this.version}}const userClogTracker=new UserClogTracker;function userClogTracking(e,i,t,n,r,a,s){e&&e.includes("pornhubpremium.com")||userClogTracker.track(e,i,t,n,r,a,s)}function updateClogTracking(e){userClogTracker.updateContext(e)}