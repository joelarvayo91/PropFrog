import {NextResponse} from 'next/server';

const API='https://api.nfldata.org/v1';
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function normalCdf(x){const t=1/(1+.2316419*Math.abs(x)),d=.3989423*Math.exp(-x*x/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p}
function overProb(line,mean,sd){if(sd<=0)return 50;return clamp((1-normalCdf((line+.5-mean)/sd))*100,3,97)}
async function get(path){const r=await fetch(`${API}${path}`,{next:{revalidate:1800}});if(!r.ok)throw new Error(`NFL API ${r.status}`);return r.json()}
function arr(x){if(Array.isArray(x))return x;for(const k of ['data','results','games','players','stats'])if(Array.isArray(x?.[k]))return x[k];return[]}
function avg(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function sd(a){if(a.length<2)return Math.max(1,avg(a)*.28);const m=avg(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))}
function stat(row,keys){for(const k of keys)if(row?.[k]!=null)return n(row[k]);return 0}
const MARKETS=[
 {market:'passing_yards',label:'Passing yards',positions:['QB'],keys:['passing_yards','pass_yards'],step:25,min:125,unit:'yd'},
 {market:'passing_tds',label:'Passing TDs',positions:['QB'],keys:['passing_tds','pass_tds'],step:1,min:.5,unit:'TD'},
 {market:'rushing_yards',label:'Rushing yards',positions:['QB','RB'],keys:['rushing_yards','rush_yards'],step:10,min:15,unit:'yd'},
 {market:'receiving_yards',label:'Receiving yards',positions:['WR','TE','RB'],keys:['receiving_yards','rec_yards'],step:10,min:15,unit:'yd'},
 {market:'receptions',label:'Receptions',positions:['WR','TE','RB'],keys:['receptions'],step:1,min:1.5,unit:'rec'},
 {market:'anytime_td',label:'Anytime TD',positions:['RB','WR','TE'],keys:['rushing_tds','receiving_tds'],step:1,min:.5,unit:'TD'}
];
function lineFor(mean,m){if(m.market==='anytime_td'||m.market==='passing_tds')return Math.max(m.min,Math.floor(mean)+.5);return Math.max(m.min,Math.round(mean/m.step)*m.step-.5)}
export async function GET(req){try{
 const now=new Date(),year=now.getUTCFullYear(),url=new URL(req.url),days=Math.max(1,Math.min(14,n(url.searchParams.get('days'),7)));
 let games=arr(await get(`/games?season=${year}&game_type=REG&limit=100`)).filter(g=>{const t=new Date(g.gameday||g.game_date||g.start_time||g.game_time||g.date);return Number.isFinite(t.getTime())&&t>=new Date(now.getTime()-4*3600e3)&&t<=new Date(now.getTime()+days*86400e3)});
 if(!games.length)games=arr(await get(`/games?season=${year}&limit=100`)).filter(g=>{const t=new Date(g.gameday||g.game_date||g.start_time||g.game_time||g.date);return Number.isFinite(t.getTime())&&t>=new Date(now.getTime()-4*3600e3)}).slice(0,16);
 const teams=[...new Set(games.flatMap(g=>[g.away_team||g.away,g.home_team||g.home]).filter(Boolean))],props=[];
 for(const team of teams){
   let players=[];try{players=arr(await get(`/players?team=${encodeURIComponent(team)}&season=${year}&limit=100`))}catch{}
   players=players.filter(p=>['QB','RB','WR','TE'].includes(p.position)).slice(0,18);
   for(const p of players){try{
     const id=p.gsis_id||p.player_id||p.id;if(!id)continue;
     const stats=arr(await get(`/players/${encodeURIComponent(id)}/stats?season=${year}&season_type=REG&limit=30`));
     if(!stats.length)continue;
     const game=games.find(g=>(g.away_team||g.away)===team||(g.home_team||g.home)===team);if(!game)continue;
     const opp=(game.away_team||game.away)===team?(game.home_team||game.home):(game.away_team||game.away);
     for(const m of MARKETS.filter(x=>x.positions.includes(p.position))){
       const vals=stats.map(s=>m.market==='anytime_td'?stat(s,['rushing_tds'])+stat(s,['receiving_tds']):stat(s,m.keys)).filter(v=>Number.isFinite(v));
       if(!vals.length)continue;const recent=vals.slice(-5),seasonAvg=avg(vals),recentAvg=avg(recent),projection=.62*recentAvg+.38*seasonAvg,line=lineFor(projection,m),sigma=Math.max(m.market.includes('td')?.7:m.market==='receptions'?1.7:12,sd(recent)),prob=overProb(line,projection,sigma),hitRate=recent.length?recent.filter(v=>v>line).length/recent.length*100:50;
       const usageKeys=p.position==='QB'?['attempts','passing_attempts']:p.position==='RB'?['carries','rushing_attempts','targets']:['targets'];const usageRaw=avg(stats.slice(-5).map(s=>usageKeys.reduce((z,k)=>z+stat(s,[k]),0))),usage=clamp(usageRaw*(p.position==='QB'?2.3:4),0,99);
       props.push({id:`${id}-${m.market}`,playerId:id,name:p.display_name||p.player_display_name||p.full_name||p.name,position:p.position,team,opponent:opp,gameId:String(game.game_id||game.id),gameTime:game.start_time||game.game_time||game.gameday||game.game_date,market:m.market,marketLabel:m.label,line,projection:Number(projection.toFixed(1)),prob:Number(prob.toFixed(1)),edge:Number((projection-line).toFixed(1)),unit:m.unit,recentAvg:Number(recentAvg.toFixed(1)),seasonAvg:Number(seasonAvg.toFixed(1)),hitRate:Number(hitRate.toFixed(0)),usage:Number(usage.toFixed(0)),sample:vals.length,opponentRank:null});
     }
   }catch{}}
 }
 const summaries=games.map(g=>({gameId:String(g.game_id||g.id),away:g.away_team||g.away,home:g.home_team||g.home,gameTime:g.start_time||g.game_time||g.gameday||g.game_date,week:g.week?`Week ${g.week}`:'NFL'}));
 return NextResponse.json({generatedAt:new Date().toISOString(),weekLabel:summaries[0]?.week||`${year} season`,games:summaries,props:props.sort((a,b)=>b.prob-a.prob).slice(0,260),model:'NFL Props v1 · recent/season blend',note:'Reference lines are model-generated thresholds, not sportsbook lines. Probabilities use a simple recent/season production blend and distribution approximation.'});
 }catch(e){return NextResponse.json({generatedAt:new Date().toISOString(),games:[],props:[],error:'Live NFL data is temporarily unavailable.',detail:String(e?.message||e)},{status:200})}
}
