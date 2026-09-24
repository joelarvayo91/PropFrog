import { NextResponse } from 'next/server';
const MLB='https://statsapi.mlb.com/api/v1';
const SAVANT='https://baseballsavant.mlb.com';
const YEAR=new Date().getUTCFullYear();

async function json(url){const r=await fetch(url,{next:{revalidate:900}});if(!r.ok) throw new Error(`HTTP ${r.status}`);return r.json();}
async function text(url){const r=await fetch(url,{next:{revalidate:3600}});if(!r.ok) throw new Error(`HTTP ${r.status}`);return r.text();}
function csvLine(line){let a=[],s='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){s+='"';i++;}else q=!q;}else if(c===','&&!q){a.push(s);s='';}else s+=c;}a.push(s);return a;}
function csv(raw){const lines=raw.trim().split(/\r?\n/);if(lines.length<2)return[];const h=csvLine(lines[0]);return lines.slice(1).map(l=>{const v=csvLine(l),o={};h.forEach((k,i)=>o[k.trim()]=v[i]);return o;});}
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d;}
function fair(p){if(p<=0)return null;return p>=50?Math.round(-100*p/(100-p)):Math.round(100*(100-p)/p);}
function fmtOdds(x){return x==null?'—':x>0?`+${x}`:`${x}`;}

async function statcast(type){
 try{const rows=csv(await text(`${SAVANT}/leaderboard/statcast?type=${type}&year=${YEAR}&min=1&csv=true`));const m=new Map();for(const r of rows){const id=String(r.player_id||r.batter||r.pitcher||'');if(id)m.set(id,r);}return m;}catch{return new Map();}
}
function model(h,bs,ps){
 const pa=n(h.plateAppearances), hr=n(h.homeRuns), hrpa=pa?hr/pa:0.03;
 const brl=n(bs?.brl_pa)/100, hard=n(bs?.ev95percent)/100, ev=n(bs?.avg_hit_speed,88), maxev=n(bs?.max_hit_speed,105), la=n(bs?.avg_hit_angle,12);
 const pbrl=n(ps?.brl_pa,3)/100, phard=n(ps?.ev95percent,38)/100, pev=n(ps?.avg_hit_speed,88);
 // Transparent research heuristic. Inputs are pregame season aggregates; output is capped until calibrated historically.
 const contact=(brl*0.46)+(hard*0.08)+Math.max(0,ev-86)*0.003+Math.max(0,maxev-105)*0.0015;
 const pitcher=(pbrl*0.18)+(phard*0.025)+Math.max(0,pev-87)*0.002;
 const angle=(la>=10&&la<=30)?0.012:0;
 const p=Math.max(2,Math.min(35,(0.018+hrpa*0.38+contact+pitcher+angle)*100));
 return Number(p.toFixed(1));
}
export async function GET(){
 try{
  const d=new Date().toISOString().slice(0,10);
  const [sched,batSC,pitSC]=await Promise.all([json(`${MLB}/schedule?sportId=1&date=${d}&hydrate=probablePitcher,team`),statcast('batter'),statcast('pitcher')]);
  const games=(sched.dates?.[0]?.games||[]).slice(0,15); let cards=[];
  for(const g of games){for(const side of ['away','home']){const team=g.teams?.[side]?.team;if(!team)continue;const oppSide=side==='home'?'away':'home', opp=g.teams?.[oppSide]?.team, pitcher=g.teams?.[oppSide]?.probablePitcher;
   try{const roster=await json(`${MLB}/teams/${team.id}/roster?rosterType=active`);const hitters=(roster.roster||[]).filter(x=>x.position?.type!=='Pitcher').slice(0,10);
    for(const h of hitters){let s={};try{const st=await json(`${MLB}/people/${h.person.id}/stats?stats=season&group=hitting&season=${YEAR}`);s=st.stats?.[0]?.splits?.[0]?.stat||{};}catch{}
     const bs=batSC.get(String(h.person.id)), ps=pitcher?pitSC.get(String(pitcher.id)):null, prob=model(s,bs,ps);
     cards.push({id:h.person.id,name:h.person.fullName,team:team.abbreviation||team.name,opponent:opp?.abbreviation||'',gamePk:g.gamePk,gameTime:g.gameDate,probablePitcher:pitcher?.fullName||'TBD',hr:n(s.homeRuns),pa:n(s.plateAppearances),avg:s.avg||'—',slg:s.sluggingPercentage||'—',prob,fair:fmtOdds(fair(prob)),statcast:bs?{avgEV:n(bs.avg_hit_speed).toFixed(1),maxEV:n(bs.max_hit_speed).toFixed(1),launchAngle:n(bs.avg_hit_angle).toFixed(1),hardHit:n(bs.ev95percent).toFixed(1),barrelBBE:n(bs.brl_percent).toFixed(1),barrelPA:n(bs.brl_pa).toFixed(1),bbe:n(bs.attempts)}:null,pitcherStatcast:ps?{avgEV:n(ps.avg_hit_speed).toFixed(1),hardHit:n(ps.ev95percent).toFixed(1),barrelPA:n(ps.brl_pa).toFixed(1)}:null});
    }}catch{}
  }}
  cards.sort((a,b)=>b.prob-a.prob);
  return NextResponse.json({date:d,games:games.length,players:cards.slice(0,80),statcastAvailable:batSC.size>0,model:'Statcast Research v2',note:'Experimental pregame research estimate using season MLB production plus Statcast contact quality and probable-pitcher contact allowed. It is not a validated betting model or sportsbook price.'});
 }catch{return NextResponse.json({date:new Date().toISOString().slice(0,10),games:0,players:[],error:'Live MLB data is temporarily unavailable.'},{status:200});}
}
