import {eventDate, filterPRs, sortPRs, summarize, byRepo, monthlyEvents, contributionDays, isValidSnapshot} from './model.mjs';
import {contributionCases} from './cases.mjs';
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const strings = {
  zh: {
    sourceLink:'源码', live:'GITHUB · OPEN SOURCE SIGNAL',lead:'把真实的开源贡献，变成可以探索的数据故事。',sublead:'PR 状态、贡献日历、项目关联与时间线，均由公开 GitHub 数据生成。',explore:'探索贡献数据 ↘',labelEdition:'OPEN SOURCE / 2026',prTitle:'开源贡献总览',prDesc:'追踪所有提交至上游的 PR，而不只统计个人仓库。',viewAll:'在 GitHub 查看全部 ↗',all:'PR 总计',merged:'已合并',open:'进行中',closed:'关闭未合并',filter:'FILTER / EXPLORE',reset:'清除筛选 ↺',repository:'仓库',status:'状态',range:'时间范围',projects:'各仓库 PR 分布',projectsDesc:'选择条形可筛选仓库',activity:'最近 8 个月事件',activityDesc:'按 PR 当前状态对应的事件日期统计',prList:'PR 明细',moreOnGithub:'完整搜索 ↗',showMore:'显示更多 ↓',heatTitle:'贡献热力日历',heatDesc:'GitHub Contributions Calendar，悬停或聚焦日期查看当日贡献数。',heatTotalLabel:'所选区间贡献数',heatTip:'将鼠标移至日期格查看详情',heatLess:'少',heatMore:'多',graphTitle:'开源项目关系星图',graphDesc:'节点代表参与的上游仓库，大小由 PR 数决定。点击节点联动筛选。',graphReset:'查看所有节点 ↗',timeTitle:'贡献事件时间线',timeDesc:'点击事件直接查看原始 PR；与上方筛选条件同步。',latest:'LATEST ACTIVITY',disclaimer:'统计受 GitHub 可见性与定时刷新影响；不代表技能熟练度。',pipeline:'查看更新工作流 ↗',dataMissing:'公开数据尚未生成。请在仓库 Actions 中运行 Deploy interactive dashboard，并在 Pages 中启用 GitHub Actions 部署。页面不会显示虚构数字。',dataError:'无法加载 GitHub 数据，请检查最近的 Actions 工作流及 Pages 配置。',update:'数据更新',never:'尚未生成',showing:'显示 {shown} / {total} 条 PR',noData:'该筛选下暂无数据',count:'条 PR',dayCount:'次贡献',graphIntro:'选择一个节点查看仓库数据',reposAll:'全部仓库',created:'提交',mergedEvent:'合并',closedEvent:'关闭',openEvent:'开放',graphDetail:'{repo} · {all} 条 PR · {merged} 条合并',lastRefresh:'快照生成时间',noGraph:'暂无项目节点'
  },
  en: {
    sourceLink:'Source',live:'GITHUB · OPEN SOURCE SIGNAL',lead:'Real open-source work, made explorable.',sublead:'PR states, contribution calendar, project network and timeline powered by public GitHub data.',explore:'Explore contributions ↘',labelEdition:'OPEN SOURCE / 2026',prTitle:'Open-source overview',prDesc:'Tracking upstream PRs across repositories, not just owned projects.',viewAll:'View on GitHub ↗',all:'All PRs',merged:'Merged',open:'Open',closed:'Closed unmerged',filter:'FILTER / EXPLORE',reset:'Reset filters ↺',repository:'Repository',status:'Status',range:'Time range',projects:'PRs by repository',projectsDesc:'Select a bar to filter by repository',activity:'Events · last 8 months',activityDesc:'Based on each PR’s current state event date',prList:'PR details',moreOnGithub:'Full search ↗',showMore:'Show more ↓',heatTitle:'Contribution calendar',heatDesc:'GitHub contribution days. Hover or focus a day to inspect its count.',heatTotalLabel:'Selected period contributions',heatTip:'Hover or focus a day for details',heatLess:'LESS',heatMore:'MORE',graphTitle:'Project constellation',graphDesc:'Each node is an upstream repository; size reflects PR count. Select a node to filter.',graphReset:'Show all nodes ↗',timeTitle:'Contribution timeline',timeDesc:'Open the original PR for each event. Filters apply here, too.',latest:'LATEST ACTIVITY',disclaimer:'Statistics depend on GitHub visibility and refresh timing; they do not measure skill.',pipeline:'View refresh workflow ↗',dataMissing:'Public data has not been generated yet. Run Deploy interactive dashboard in Actions and enable GitHub Actions as the Pages source. No mock numbers are displayed.',dataError:'Could not load GitHub data. Check the latest Actions workflow and Pages setup.',update:'Updated',never:'Not generated',showing:'Showing {shown} of {total} PRs',noData:'No results for this filter',count:'PRs',dayCount:'contributions',graphIntro:'Select a node to inspect a repository',reposAll:'All repositories',created:'Opened',mergedEvent:'Merged',closedEvent:'Closed',openEvent:'Open',graphDetail:'{repo} · {all} PRs · {merged} merged',lastRefresh:'Snapshot generated',noGraph:'No project nodes yet'
  }
};
Object.assign(strings.zh, {
 role:'AI AGENT / AI APPLICATION FULL STACK',heroProof:'从真实问题到可验证的修复 · 每个案例均可追溯至上游 PR',navCases:'贡献案例',navData:'数据探索',navCalendar:'贡献日历',navGraph:'项目星图',casesTitle:'修复背后的工程问题',casesDesc:'精选贡献记录：问题、改动与验证证据。案例分类独立于下方仓库筛选，不代表技能评级。',topicAll:'全部方向',topicFullstack:'AI 全栈',topicOther:'其他',topicLabel:'项目方向',searchLabel:'搜索标题、仓库或 PR 编号',sortLabel:'排列方式',sortRecent:'最近事件优先',sortOldest:'最早事件优先',sortRepo:'按仓库名称',problemLabel:'问题',changeLabel:'修改',validationLabel:'验证记录',viewEvidence:'查看原始 PR ↗',exploreRepo:'探索该仓库 PR →',motionOn:'动效开',motionOff:'动效关',motionReduced:'减少动态',removeFilter:'移除筛选',filteredSummary:'当前筛选：{count} 条 PR；统计、明细和时间线同步。',allSummary:'全部公开上游 PR · 数据来自 GitHub 定时快照',dayFilter:'PR 事件日',monthFilter:'PR 事件月',emptyDate:'此日期没有匹配的 PR 当前状态事件。日历统计包含提交、审阅等全部 GitHub 贡献，两者口径不同。',queryFilter:'搜索',rangeFilter:'最近 {days} 天',activityDesc:'点击月份筛选；月图保留其他月份供比较，按 PR 当前状态事件日期统计。',projectsDesc:'选择仓库条形筛选；保留其他仓库供比较。',heatDesc:'日历统计全部 GitHub 贡献。点击日期筛选该日的 PR 当前状态事件，可再次点击取消。',heatTip:'点击日期联动 PR 数据；日历贡献数包含其他活动。',noCases:'该方向暂无精选案例',caseStatus:'快照状态',snapshotPending:'查看实时状态',graphDesc:'节点代表上游仓库，大小为其他筛选条件下的 PR 数；点击节点选择仓库。'
});
Object.assign(strings.en, {
 role:'AI AGENT / AI APPLICATION FULL STACK',heroProof:'From real issues to verifiable fixes · every case links to upstream evidence',navCases:'Selected work',navData:'Explore data',navCalendar:'Daily activity',navGraph:'Project map',casesTitle:'The engineering behind the fix',casesDesc:'Selected records: problem, change and validation evidence. Case topics are separate from repository filters below, not a skill rating.',topicAll:'All topics',topicFullstack:'AI full stack',topicOther:'Other',topicLabel:'Project focus',searchLabel:'Search title, repository or PR number',sortLabel:'Sort by',sortRecent:'Most recent event',sortOldest:'Oldest event',sortRepo:'Repository name',problemLabel:'Problem',changeLabel:'Change',validationLabel:'Validation record',viewEvidence:'View original PR ↗',exploreRepo:'Explore repository PRs →',motionOn:'Motion on',motionOff:'Motion off',motionReduced:'Reduced motion',removeFilter:'Remove filter',filteredSummary:'Filtered: {count} PRs. Metrics, details and timeline stay in sync.',allSummary:'All public upstream PRs · a scheduled GitHub snapshot',dayFilter:'PR event day',monthFilter:'PR event month',emptyDate:'No matching current-state PR events on this date. The calendar includes commits, reviews and other GitHub contributions, so its totals differ.',queryFilter:'Search',rangeFilter:'Last {days} days',activityDesc:'Select a month to filter. Other months stay visible for comparison; counts use current-state PR event dates.',projectsDesc:'Select a repository bar to filter; other repositories stay visible for comparison.',heatDesc:'All GitHub contributions. Select a day to filter current-state PR events; select it again to clear.',heatTip:'Select a day to filter PR data. Calendar counts include other activity.',noCases:'No selected cases for this topic yet',caseStatus:'Snapshot state',snapshotPending:'View live state',graphDesc:'Nodes are upstream repositories, sized by PR count under the other filters. Select a node to choose a repository.'
});
const state = {lang: (localStorage.getItem('jun516-lang') === 'en' ? 'en' : 'zh'),theme: (localStorage.getItem('jun516-theme') === 'light' ? 'light' : 'dark'), motion:localStorage.getItem('jun516-motion')!=='off', repo:'all',status:'all',window:'all',topic:'all',caseTopic:'all',query:'',sort:'recent',day:'',month:'',heatDays:365,shown:10,data:null};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const text = (key, v={}) => (strings[state.lang][key] || key).replace(/\{(\w+)\}/g,(_,k)=>v[k] ?? '');
const el = (tag, cls, content) => {const node = document.createElement(tag);if(cls)node.className=cls;if(content!==undefined)node.textContent=content;return node;};
function dateLabel(s) {const t=Date.parse(s);return Number.isFinite(t)?new Intl.DateTimeFormat(state.lang==='zh'?'zh-CN':'en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(t):'—';}
function compact(n) {return new Intl.NumberFormat(state.lang==='zh'?'zh-CN':'en-US').format(n);}
function setLanguage() {
 document.documentElement.lang=state.lang==='zh'?'zh-CN':'en';
 document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=text(n.dataset.i18n));
 $('langBtn').textContent=state.lang==='zh'?'EN':'中文';
 document.title=state.lang==='zh'?'Jun516 · 开源贡献观测站':'Jun516 · Open Source Observatory';
 $('repoSelect').options[0].textContent=text('reposAll');
 $('queryInput').placeholder=state.lang==='zh'?'例如 MCP、DeerFlow、#6959':'Try MCP, DeerFlow, #6959';
 updateMotion();
}
function updateMotion(){const on=state.motion&&!reducedMotion.matches;document.documentElement.dataset.motion=on?'on':'off';$('motionBtn').textContent=text(reducedMotion.matches?'motionReduced':on?'motionOn':'motionOff');$('motionBtn').setAttribute('aria-pressed',String(on));}
function filtered(overrides={}){return filterPRs(state.data?.prs||[],{state:state.status,repo:state.repo,window:state.window,topic:state.topic,query:state.query,day:state.day,month:state.month,...overrides});}
function refresh(){state.shown=10;renderAll();}
function restoreFocus(id,attr,value){const active=document.activeElement;const within=$(id).contains(active);refresh();if(within){const node=[...$(id).querySelectorAll(`[${attr}]`)].find(n=>n.getAttribute(attr)===value);node?.focus({preventScroll:true});}}
function renderCases(){
 const grid=$('caseGrid');grid.replaceChildren();
 const cases=contributionCases.filter(c=>state.caseTopic==='all'||c.topic===state.caseTopic);
 if(!cases.length)grid.append(el('p','viz-empty',text('noCases')));
 for(const c of cases){const card=el('article','panel case-card');const meta=el('div','case-meta');meta.append(el('span','case-tags',`${c.topic.toUpperCase()} / #${c.pr}`));
   const current=state.data?.prs.find(p=>p.url===c.url);const status=el('span',`case-status ${current?.state||''}`,current?text(current.state):text('snapshotPending'));status.title=text('caseStatus');meta.append(status);card.append(meta,el('p','case-repo',c.repo),el('h3','case-heading',c.title[state.lang]));
   for(const [key,label] of [['problem','problemLabel'],['change','changeLabel'],['validation','validationLabel']]){const block=el('div','case-block');block.append(el('h4','case-label',text(label)),el('p','',c[key][state.lang]));card.append(block);}
   const links=el('div','case-links');for(const evidence of c.evidence){const a=el('a','case-link',evidence.label[state.lang]);a.href=evidence.url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
   const explore=el('button','btn-quiet case-link',text('exploreRepo'));explore.type='button';explore.addEventListener('click',()=>{resetFilters();state.repo=c.repo;$('repoSelect').value=c.repo;refresh();$('pr-center').scrollIntoView({behavior:reducedMotion.matches||!state.motion?'instant':'smooth'});$('queryInput').focus({preventScroll:true});});links.append(explore);card.append(links);grid.append(card);
 }
 setButtons($('caseTopicBtns'),'topic',state.caseTopic);
}
function renderActiveFilters(prs){
 const holder=$('activeFilters');holder.replaceChildren();
 const labels=[['repo',state.repo!=='all'?state.repo:''],['status',state.status!=='all'?text(state.status):''],['topic',state.topic!=='all'?({agent:'Agent',mcp:'MCP',fullstack:text('topicFullstack'),other:text('topicOther')})[state.topic]:''],['window',state.window!=='all'?text('rangeFilter',{days:state.window}):''],['query',state.query?`${text('queryFilter')}: ${state.query}`:''],['day',state.day?`${text('dayFilter')}: ${state.day}`:''],['month',state.month?`${text('monthFilter')}: ${state.month}`:'']];
 for(const [key,label] of labels){if(!label)continue;const b=el('button','filter-token',`${label} ×`);b.type='button';b.setAttribute('aria-label',`${text('removeFilter')}: ${label}`);b.addEventListener('click',()=>{state[key]=['repo','status','topic','window'].includes(key)?'all':'';$('repoSelect').value=state.repo;$('queryInput').value=state.query;refresh();$('resetBtn').focus({preventScroll:true});});holder.append(b);}
 $('filterSummary').textContent=labels.some(([,v])=>v)?text('filteredSummary',{count:compact(prs.length)}):text('allSummary');
}
function setButtons(container, attr, active) {container.querySelectorAll('button').forEach(b=>{const on=b.dataset[attr]===String(active);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function alertMessage(message) {const e=$('dataAlert');e.hidden=!message;e.textContent=message;}
function statsAndBars(prs,comparisonPRs) {
 const sums=summarize(prs);
 for(const [key,id] of [['all','totalCount'],['merged','mergedCount'],['open','openCount'],['closed','closedCount']]) $(id).textContent=compact(sums[key]);
 const holder=$('repoBars');holder.replaceChildren();const repos=byRepo(comparisonPRs).slice(0,7);
 if(!repos.length){holder.append(el('p','empty',text('noData')));return;}
 const max=Math.max(...repos.map(r=>r.all),1);
 for(const r of repos) {
   const b=el('button','bar-row');b.type='button';b.title=`${r.name}: ${r.all} ${text('count')}`;
   b.dataset.repo=r.name;b.setAttribute('aria-pressed',String(state.repo===r.name));
   const meta=el('div','bar-meta');meta.append(el('span','',r.name),el('span','count',String(r.all)));
   const track=el('div','bar-track');track.style.width=`${Math.max(1,(r.all/max)*100)}%`;
   for(const k of ['merged','open','closed']) {const seg=el('span',`bar-seg ${k}`);seg.style.width=`${r.all ? r[k]/r.all*100 : 0}%`;track.append(seg);}
   b.append(meta,track);b.addEventListener('click',()=>chooseRepo(r.name,'repoBars'));holder.append(b);
 }
}
function renderTrend(prs){
 const trend=$('trend');trend.replaceChildren();const rows=monthlyEvents(prs,8);const max=Math.max(1,...rows.map(r=>r.merged+r.open+r.closed));
 for(const r of rows){const col=el('button','trend-col month-bar');col.type='button';col.dataset.month=r.month;col.setAttribute('aria-pressed',String(state.month===r.month));const stack=el('div','trend-stack');
   for(const k of ['open','merged','closed']){const seg=el('span',`trend-seg ${k}`);seg.style.height=`${r[k]/max*100}%`;seg.title=`${r.month}: ${k} ${r[k]}`;stack.append(seg);}
   col.append(stack,el('span','trend-month',r.month.slice(5)));col.title=`${r.month} · ${r.open+r.merged+r.closed} ${text('count')}`;col.setAttribute('aria-label',col.title);col.addEventListener('click',()=>{state.month=state.month===r.month?'':r.month;state.day='';restoreFocus('trend','data-month',r.month);});trend.append(col);
 }
}
function renderPRs(prs){
 const sorted=sortPRs(prs,state.sort);
 $('prShowing').textContent=text('showing',{shown:Math.min(state.shown,sorted.length),total:sorted.length});
 const list=$('prList');list.replaceChildren();
 if(!sorted.length)list.append(el('p','empty',text(state.day||state.month?'emptyDate':'noData')));
 sorted.slice(0,state.shown).forEach(p=>{const item=el('div','pr-item');const dot=el('span',`state-dot ${p.state}`);dot.setAttribute('aria-label',p.state);
   const a=el('a');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';a.append(el('strong','',`#${p.number} · ${p.title}`),el('span','pr-meta',`${p.repo} · ${text(p.state)} · ${dateLabel(eventDate(p))}`));
   item.append(dot,a,el('time','',dateLabel(eventDate(p))));list.append(item);
 });
 $('showMoreBtn').hidden=state.shown>=sorted.length;
}
function renderHeatmap(){
 const data=state.data;if(!data||!data.generatedAt)return;
 const days=contributionDays(data.calendar,state.heatDays);const grid=$('heatGrid');grid.replaceChildren();
 $('heatTotal').textContent=compact(days.reduce((n,d)=>n+d.count,0));
 if(!days.length){grid.append(el('p','empty',text('noData')));return;}
 const startDay=(new Date(`${days[0].date}T00:00:00Z`).getUTCDay()+6)%7;
 for(let i=0;i<startDay;i++){const spacer=el('span','');spacer.setAttribute('aria-hidden','true');grid.append(spacer);}
 const counts=days.map(d=>d.count).sort((a,b)=>a-b);const cap=counts[Math.floor(counts.length*.90)]||1;
 for(const day of days){const level=day.count===0?0:Math.min(4,Math.max(1,Math.ceil(day.count/cap*4)));
   const cell=el('button',`heat-day intensity-${level}`);cell.type='button';cell.setAttribute('aria-label',`${day.date}: ${day.count} ${text('dayCount')}`);
   cell.dataset.day=day.date;cell.setAttribute('aria-pressed',String(state.day===day.date));
   cell.title=`${day.date} · ${day.count} ${text('dayCount')}`;
   cell.addEventListener('focus',()=>{$('heatTooltip').textContent=cell.title;});
   cell.addEventListener('mouseenter',()=>{$('heatTooltip').textContent=cell.title;});
   cell.addEventListener('click',()=>{state.day=state.day===day.date?'':day.date;state.month='';restoreFocus('heatGrid','data-day',day.date);$('heatTooltip').textContent=cell.title;});grid.append(cell);
 }
}
function svg(tag,attrs={}){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;}
function chooseRepo(repo,source='graph'){state.repo=state.repo===repo?'all':repo;$('repoSelect').value=state.repo;restoreFocus(source,'data-repo',repo);}
function renderGraph(prsWithoutRepoFilter){
 const group=byRepo(prsWithoutRepoFilter);const graph=$('graph');graph.replaceChildren();const detail=$('nodeDetail');detail.textContent=text('graphIntro');
 let mobile=$('graphList');if(!mobile){mobile=el('div','graph-mobile-list');mobile.id='graphList';graph.after(mobile);}mobile.replaceChildren();
 if(!group.length){detail.textContent=text('noGraph');return;}
 const cx=460,cy=199;
 const rings=group.map((r,i)=>{const angle=(i*2.399963229728653)-Math.PI/2;const radius=80+Math.sqrt(i/Math.max(1,group.length-1))*155;return {r,x:cx+Math.cos(angle)*radius*1.55,y:cy+Math.sin(angle)*radius*.65};});
 const defs=svg('defs');const glow=svg('radialGradient',{id:'nodeHalo'});glow.append(svg('stop',{offset:'0%','stop-color':'#7ddae2','stop-opacity':'.16'}),svg('stop',{offset:'100%','stop-color':'#7ddae2','stop-opacity':'0'}));defs.append(glow);graph.append(defs);
 const center=svg('g');center.append(svg('circle',{cx,cy,r:71,fill:'url(#nodeHalo)'}),svg('circle',{cx,cy,r:25,fill:'var(--panel2)',stroke:'var(--cyan)','stroke-width':1.5}));const ct=svg('text',{x:cx,y:cy+5,'text-anchor':'middle',class:'graph-label'});ct.textContent='JUN';center.append(ct);graph.append(center);
 for(const {x,y} of rings)graph.append(svg('line',{x1:cx,y1:cy,x2:x,y2:y,class:'edge'}));
 for(const {r,x,y} of rings){const radius=Math.min(25,8+Math.sqrt(r.all)*3.5);const selected=state.repo===r.name;const node=svg('g',{class:`graph-node${selected?' selected':''}`,role:'button',tabindex:0,'data-repo':r.name,'aria-pressed':String(selected),'aria-label':`${r.name}, ${r.all} pull requests`});
   const mobileButton=el('button','chip',`${r.name} · ${r.all}`);mobileButton.type='button';mobileButton.dataset.repo=r.name;mobileButton.setAttribute('aria-pressed',String(selected));mobileButton.addEventListener('click',()=>chooseRepo(r.name,'graphList'));mobile.append(mobileButton);
   node.append(svg('circle',{cx:x,cy:y,r:radius+7,fill:'var(--cyan)',opacity:'.06'}),svg('circle',{cx:x,cy:y,r:radius,fill:'var(--panel2)',stroke:selected?'var(--amber)':'var(--cyan)'}));
   const nr=svg('text',{x,y:y+4,'text-anchor':'middle',class:'graph-label'});nr.textContent=String(r.all);node.append(nr);
   const ty=y+radius+16;const label=svg('text',{x,y:ty,'text-anchor':'middle',class:'graph-name'});const short=r.name.split('/')[1]||r.name;label.textContent=short.length>19?short.slice(0,17)+'…':short;node.append(label);
   const setInfo=()=>{detail.textContent=text('graphDetail',{repo:r.name,all:r.all,merged:r.merged});};
   node.addEventListener('mouseenter',setInfo);node.addEventListener('focus',setInfo);node.addEventListener('click',()=>chooseRepo(r.name));node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseRepo(r.name);}});graph.append(node);
 }
}
function renderTimeline(prs){const list=$('timelineList');list.replaceChildren();const sorted=[...prs].sort((a,b)=>(eventDate(b)||'').localeCompare(eventDate(a)||'')).slice(0,14);
 if(!sorted.length){const li=el('li','',text('noData'));list.append(li);return;}
 for(const p of sorted){const li=el('li',p.state);const time=el('time','',dateLabel(eventDate(p)));const a=el('a','timeline-title',`#${p.number} ${p.title}`);a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';
 const small=el('small','',`${p.repo} · ${text(p.state==='merged'?'mergedEvent':p.state==='closed'?'closedEvent':'openEvent')}`);li.append(time,a,small);list.append(li);}
}
function renderAll(){renderCases();if(!state.data?.generatedAt)return;
 const prs=filtered();const comparison=filtered({repo:'all'});
 statsAndBars(prs,comparison);renderTrend(filtered({day:'',month:''}));renderPRs(prs);renderGraph(comparison);renderTimeline(prs);renderHeatmap();renderActiveFilters(prs);
 setButtons($('stateBtns'),'state',state.status);setButtons($('rangeBtns'),'range',state.window);setButtons($('heatRanges'),'days',state.heatDays);
 setButtons($('topicBtns'),'topic',state.topic);
}
function resetFilters(){Object.assign(state,{repo:'all',status:'all',window:'all',topic:'all',query:'',day:'',month:'',sort:'recent'});$('repoSelect').value='all';$('queryInput').value='';$('sortSelect').value='recent';}
function initControls(){
 const heatScroll=$('heatGrid').parentElement;let pinnedToEnd=true;
 heatScroll.addEventListener('scroll',()=>{pinnedToEnd=heatScroll.scrollWidth-heatScroll.clientWidth-heatScroll.scrollLeft<8;},{passive:true});
 new ResizeObserver(()=>{if(pinnedToEnd)heatScroll.scrollLeft=heatScroll.scrollWidth;}).observe(heatScroll);
 $('langBtn').addEventListener('click',()=>{state.lang=state.lang==='zh'?'en':'zh';localStorage.setItem('jun516-lang',state.lang);setLanguage();if(state.data?.generatedAt)$('updatedAt').textContent=`${text('update')} ${dateLabel(state.data.generatedAt)}`;renderAll();});
 $('themeBtn').addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark';localStorage.setItem('jun516-theme',state.theme);document.documentElement.dataset.theme=state.theme;});
 $('motionBtn').addEventListener('click',()=>{state.motion=!state.motion;localStorage.setItem('jun516-motion',state.motion?'on':'off');updateMotion();window.dispatchEvent(new Event('motionchange'));});
 reducedMotion.addEventListener('change',()=>{updateMotion();window.dispatchEvent(new Event('motionchange'));});
 $('queryInput').addEventListener('input',e=>{state.query=e.target.value;refresh();});
 $('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;refresh();});
 $('topicBtns').addEventListener('click',e=>{const topic=e.target.closest('[data-topic]')?.dataset.topic;if(topic){state.topic=topic;refresh();}});
 $('caseTopicBtns').addEventListener('click',e=>{const topic=e.target.closest('[data-topic]')?.dataset.topic;if(topic){state.caseTopic=topic;renderCases();}});
 $('repoSelect').addEventListener('change',e=>{state.repo=e.target.value;state.shown=10;renderAll();});
 $('stateBtns').addEventListener('click',e=>{const s=e.target.closest('[data-state]')?.dataset.state;if(!s)return;state.status=s;state.shown=10;renderAll();});
 $('rangeBtns').addEventListener('click',e=>{const v=e.target.closest('[data-range]')?.dataset.range;if(!v)return;state.window=v;state.shown=10;renderAll();});
 $('heatRanges').addEventListener('click',e=>{const d=e.target.closest('[data-days]')?.dataset.days;if(!d)return;state.heatDays=Number(d);setButtons($('heatRanges'),'days',d);renderHeatmap();});
 $('resetBtn').addEventListener('click',()=>{resetFilters();refresh();});
 $('graphReset').addEventListener('click',()=>{state.repo='all';$('repoSelect').value='all';state.shown=10;renderAll();});
 $('showMoreBtn').addEventListener('click',()=>{const prior=state.shown;state.shown+=10;renderPRs(filtered());$('prList').querySelectorAll('a')[prior]?.focus({preventScroll:true});});
}
function initParticles(){
 const canvas=$('particles');const host=canvas.parentElement;const ctx=canvas.getContext('2d');if(!ctx)return;
 const small=window.matchMedia('(max-width: 600px)').matches;
 const dots=Array.from({length:small?15:29},(_,i)=>({x:(i*73%101)/101,y:(i*31%97)/97,vx:(i%3-1)*.00002,vy:(i%5-2)*.000025,size:i%7===0?1.7:1}));
 let width=1,height=1,last=0,raf=0,visible=true;const cursor={x:-1000,y:-1000};
 const enabled=()=>state.motion&&!reducedMotion.matches&&!document.hidden&&visible;
 const resize=()=>{const r=host.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
 const draw=(t)=>{if(!enabled()){raf=0;return;}raf=requestAnimationFrame(draw);if(t-last<33)return;const delta=Math.min(80,t-last||33);last=t;ctx.clearRect(0,0,width,height);const light=state.theme==='light';
   for(const p of dots){p.x=(p.x+p.vx*delta+1)%1;p.y=(p.y+p.vy*delta+1)%1;const px=p.x*width,py=p.y*height;const dist=Math.hypot(px-cursor.x,py-cursor.y);const scale=dist<115?1.75:1;ctx.beginPath();ctx.fillStyle=light?'rgba(24,108,121,.38)':'rgba(130,218,229,.50)';ctx.arc(px,py,p.size*scale,0,Math.PI*2);ctx.fill();}
   ctx.strokeStyle=light?'rgba(24,108,121,.12)':'rgba(140,206,232,.10)';ctx.lineWidth=.7;for(let i=0;i<dots.length;i++)for(let j=i+1;j<dots.length;j++){const a=dots[i],b=dots[j],ax=a.x*width,ay=a.y*height,bx=b.x*width,by=b.y*height;if(Math.hypot(ax-bx,ay-by)<93){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();}}
 };
 const sync=()=>{cancelAnimationFrame(raf);raf=0;last=0;if(enabled())raf=requestAnimationFrame(draw);else ctx.clearRect(0,0,width,height);};
 resize();const obs=new ResizeObserver(resize);obs.observe(host);
 host.addEventListener('pointermove',e=>{if(!enabled())return;const r=host.getBoundingClientRect();cursor.x=e.clientX-r.left;cursor.y=e.clientY-r.top;host.style.setProperty('--pointer-x',`${cursor.x}px`);host.style.setProperty('--pointer-y',`${cursor.y}px`);},{passive:true});
 host.addEventListener('pointerleave',()=>{cursor.x=-1000;cursor.y=-1000;host.style.removeProperty('--pointer-x');host.style.removeProperty('--pointer-y');});
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});intersection.observe(host);
 document.addEventListener('visibilitychange',sync);window.addEventListener('motionchange',sync);window.addEventListener('pageshow',sync);sync();
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;});
}
async function init(){
 $('year').textContent=String(new Date().getFullYear());document.documentElement.dataset.theme=state.theme;setLanguage();initControls();initParticles();renderCases();
 try{const resp=await fetch('./data/github.json',{cache:'no-store'});if(!resp.ok)throw new Error(`HTTP ${resp.status}`);const data=await resp.json();if(!isValidSnapshot(data))throw new Error('Invalid dataset');
   if(!data.generatedAt){alertMessage(text('dataMissing'));return;}
   state.data=data;alertMessage('');$('updatedAt').textContent=`${text('update')} ${dateLabel(data.generatedAt)}`;
   const sel=$('repoSelect');for(const r of [...data.repos].sort((a,b)=>a.name.localeCompare(b.name))){const opt=document.createElement('option');opt.value=r.name;opt.textContent=r.name;sel.append(opt);}renderAll();
 }catch(e){console.error('Dashboard snapshot unavailable:',e);alertMessage(text('dataError'));}
}
init();
