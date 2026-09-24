export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
export function variance(xs){if(xs.length<2)return 0;const m=mean(xs);return xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1)}
export const sd=xs=>Math.sqrt(variance(xs));
export function weightedMean(pairs){let n=0,d=0;for(const [v,w] of pairs)if(Number.isFinite(v)&&Number.isFinite(w)&&w>0){n+=v*w;d+=w}return d?n/d:0}
export const betaMean=(s,t,m,k)=>(s+m*k)/(t+k);
export const poissonAtLeastOne=l=>1-Math.exp(-Math.max(0,l));
function erf(x){const s=x<0?-1:1,a=Math.abs(x),t=1/(1+.3275911*a),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-a*a);return s*y}
export const normalCdf=x=>.5*(1+erf(x/Math.SQRT2));
export const normalOver=(line,mu,sigma)=>clamp(1-normalCdf((line+.0001-mu)/Math.max(.001,sigma)),.01,.99);
export function confidence({sample=0,inputs=0,maxInputs=1,stability=.5}){return Math.round(100*clamp(.48*(1-Math.exp(-Math.max(0,sample)/12))+.34*clamp(inputs/Math.max(1,maxInputs),0,1)+.18*clamp(stability,0,1),0,1))}
export function mlbHitterModel({season={},batterSC=null,pitcherSC=null,expectedPA=4.2}){
 const pa=+season.plateAppearances||0,ab=+season.atBats||0,hr=+season.homeRuns||0,h=+season.hits||0,rbi=+season.rbi||0,bb=+season.baseOnBalls||0,so=+season.strikeOuts||0;
 const hard=(+batterSC?.ev95percent||38)/100,brl=(+batterSC?.brl_pa||3)/100,ev=+batterSC?.avg_hit_speed||88,maxEV=+batterSC?.max_hit_speed||105,la=+batterSC?.avg_hit_angle||12;
 const pHard=(+pitcherSC?.ev95percent||38)/100,pBrl=(+pitcherSC?.brl_pa||3)/100,pEV=+pitcherSC?.avg_hit_speed||88,L={hr:.031,hit:.225,bb:.083,k:.225,rbi:.105};
 const hrPA=betaMean(hr,pa,L.hr,85),hitPA=betaMean(h,pa,L.hit,70),bbPA=betaMean(bb,pa,L.bb,80),kPA=betaMean(so,pa,L.k,75),rbiPA=betaMean(rbi,pa,L.rbi,90);
 const quality=clamp((brl-.03)*1.9+(hard-.38)*.22+(ev-88)*.006+(maxEV-105)*.002+(la>=10&&la<=30?.025:0),-.12,.18),opp=clamp((pBrl-.03)*.75+(pHard-.38)*.08+(pEV-88)*.003,-.07,.10);
 const hrRate=clamp(hrPA*(1+quality+opp),.005,.14),hitRate=clamp(hitPA*(1+(hard-.38)*.18+(ev-88)*.004),.08,.42),rbiRate=clamp(rbiPA*(1+quality*.55+opp*.35),.025,.28);
 return {hrProb:poissonAtLeastOne(hrRate*expectedPA)*100,hitProb:poissonAtLeastOne(hitRate*expectedPA)*100,rbiProb:poissonAtLeastOne(rbiRate*expectedPA)*100,walkProb:poissonAtLeastOne(bbPA*expectedPA)*100,strikeoutProb:poissonAtLeastOne(kPA*expectedPA)*100,confidence:confidence({sample:pa/4.2,inputs:[pa>0,!!batterSC,!!pitcherSC,ab>0].filter(Boolean).length,maxInputs:4,stability:pa>=250?.9:.55}),components:{hrPA,hitPA,rbiPA,quality,opponentContact:opp,expectedPA}};
}
export function nflPropModel({values=[],opportunities=[],line=null,opponentFactor=1,roleFactor=1}){
 const clean=values.map(Number).filter(Number.isFinite),recent=clean.slice(-6);if(!clean.length)return null;
 const season=mean(clean),r3=mean(clean.slice(-3)),r6=mean(recent),opp=opportunities.map(Number).filter(Number.isFinite),oppSeason=mean(opp),oppRecent=mean(opp.slice(-4)),usageTrend=oppSeason>0?clamp(oppRecent/oppSeason,.65,1.4):1;
 const projection=weightedMean([[r3,.34],[r6,.36],[season,.30]])*clamp(opponentFactor,.78,1.22)*clamp(roleFactor,.75,1.25)*clamp(.65+.35*usageTrend,.82,1.16),sigma=Math.max(sd(recent),Math.abs(projection)*.16,.55),probability=line==null?null:normalOver(+line,projection,sigma)*100,hitRate=line==null?null:recent.filter(x=>x>+line).length/Math.max(1,recent.length)*100,stability=1-clamp(sigma/Math.max(1,Math.abs(projection)*1.25),0,1);
 return {projection,probability,hitRate,recentAvg:r6,seasonAvg:season,sigma,usageTrend,confidence:confidence({sample:clean.length,inputs:2+(opportunities.length>0)+(opponentFactor!==1)+(roleFactor!==1),maxInputs:5,stability})};
}
export function fairAmerican(probPct){const p=clamp(+probPct/100,.001,.999);return p>=.5?Math.round(-100*p/(1-p)):Math.round(100*(1-p)/p)}
