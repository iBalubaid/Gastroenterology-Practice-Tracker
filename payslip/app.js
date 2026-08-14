'use strict';
const HOSPITALS=['HMG Fayhaa','HMG Mohammadiya'];
const SERVICES=['Consultation','Sedation','EGD','Colonoscopy','Flex Sig','EUS','ERCP','PEG Tube','FibroScan','SIBO Breath Test','Polypectomy','Clipping','Sclerotherapy','Variceal Banding','Duodenal Stenting','Esophageal Stenting','Colonic Stenting','Metallic Biliary Stenting','Foreign Body Removal','pH Monitoring'];
// Confirmed HMG code families from the uploaded July 2026 payslips.
// Codes are canonicalized by removing leading zeros so both 05060108 and 5060108 match.
const DEFAULT_MAPPINGS={
 '1002003':{service:'Consultation',services:['Consultation'],mode:'consultation',label:'CONSULTATION FEE - 4'},
 '1002043':{service:'Inpatient Consultation',services:['Inpatient Consultation'],mode:'inpatient',label:'INPATIENT CONSULTATION'},
 '1002052':{service:'Inpatient Consultation',services:['Inpatient Consultation'],mode:'inpatient',label:'INPATIENT CONSULTATION REFERRAL'},
 '5060079':{service:'Sedation',services:['Sedation'],mode:'associated',label:'SEDATIONAL I.V.'},
 '5060108':{service:'Colonoscopy',services:['Colonoscopy'],mode:'base',label:'COLONOSCOPY W. OR W/O. SEDATION'},
 '5060012':{service:'Colonoscopy',services:['Colonoscopy'],mode:'base',label:'COLONOSCOPY W/ BIOPSY'},
 '5060021':{service:'EGD',services:['EGD'],mode:'base',label:'EGD WITH BIOPSY'},
 '5060039':{service:'EGD',services:['EGD'],mode:'base',label:'GASTROSCOPY W OR W/O BIOPSY'},
 '5060074':{service:'Polypectomy',services:['Polypectomy'],mode:'grouped',label:'POLYPECTOMY - REMOVAL OF COLONIC + GASTRIC POLYPS'},
 '5100068':{service:'Polypectomy',services:['Polypectomy'],mode:'grouped',label:'POLYPECTOMY'},
 '5060121':{service:'Clipping',services:['Clipping'],mode:'grouped',label:'ROTATABLE CLIP FIXING DEVICE'},
 '5060068':{service:'PEG Tube',services:['PEG Tube'],mode:'base',label:'PERCUTANEOUS ENDOSCOPIC GASTROSTOMY'},
 '7008850':{service:'Variceal Banding',services:['Variceal Banding'],mode:'grouped',label:'ESOPHAGEAL VARICEAL BANDING'},
 '50080136':{service:'FibroScan',services:['FibroScan'],mode:'base',label:'FIBROSCAN'},
 '50080043':{service:'ERCP',services:['ERCP'],mode:'base',label:'ERCP + SPHINCTEROTOMY'},
 '50080044':{service:'ERCP + Biliary Stent',services:['ERCP','Metallic Biliary Stenting'],mode:'bundle',label:'ERCP + SPHINCTEROTOMY + STENT'},
 '50080038':{service:'EUS',services:['EUS'],mode:'base',label:'ENDOSCOPIC ULTRASOUND THERAPEUTIC'},
 '3008085':{service:'EUS FNA',services:[],mode:'associated',label:'ULTRASOUND GUIDED FNA - MULTIPLE'},
 '30080139':{service:'Metallic Biliary Stenting',services:['Metallic Biliary Stenting'],mode:'grouped',label:'METALLIC BILIARY STENTING'}
};
const DEFAULT_FEES={Consultation:110,EGD:700,Colonoscopy:680,'Flex Sig':300,FibroScan:264,ERCP:2000,EUS:4800,Polypectomy:214,Clipping:56,Sclerotherapy:357,'Variceal Banding':611,'PEG Tube':1575,'Metallic Biliary Stenting':3200,'pH Monitoring':800};
function normalizeMappings(raw){const out={...DEFAULT_MAPPINGS};for(const [k,v0] of Object.entries(raw||{})){const k2=String(k).replace(/\D/g,'').replace(/^0+/,'')||'0';let v=v0;if(typeof v==='string')v={service:v,services:[v],mode:v==='Consultation'?'consultation':v==='Sedation'?'associated':'base'};else v={...v,services:Array.isArray(v.services)?v.services:(v.service?[v.service]:[])};if(v.mode==='sedation')v.mode='associated';out[k2]=v}return out}
const state={backup:null,clinic:[],procedures:[],fees:{...DEFAULT_FEES},mappings:normalizeMappings(loadJSON('desktopReconMappingsV1',{})),files:{},texts:{},rows:{},result:null,procFilter:'all',manualDecisions:JSON.parse(localStorage.getItem('desktopReconManualDecisionsV1')||'{}'),followups:JSON.parse(localStorage.getItem('desktopReconFollowupsV1')||'{}'),outstanding:JSON.parse(localStorage.getItem('desktopReconOutstandingV1')||'[]'),outstandingFilter:'open',itemMissingDecisions:JSON.parse(localStorage.getItem('desktopReconItemMissingDecisionsV1')||'{}'),quickBucket:'missingPayslip',quickIndex:0,trackerCorrections:JSON.parse(localStorage.getItem('desktopReconTrackerCorrectionsV1')||'{}'),codeDescriptions:JSON.parse(localStorage.getItem('desktopReconCodeDescriptionsV1')||'{}')};
const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function loadJSON(k,d){try{return {...d,...JSON.parse(localStorage.getItem(k)||'{}')}}catch{return {...d}}}
function monthNow(){return new Date().toISOString().slice(0,7)}
$('monthInput').value=monthNow();
function showView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(name+'View').classList.add('active');document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===name))}
document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>showView(n.dataset.view));
function setMsg(text,bad=false){$('setupMessage').textContent=text;$('setupMessage').style.color=bad?'#b42318':'#126b47'}
function normalizeHospital(v=''){const s=String(v).toLowerCase();return s.includes('moh')?'HMG Mohammadiya':'HMG Fayhaa'}
function canonicalCode(v=''){const d=String(v??'').replace(/\D/g,'').replace(/^0+/,'');return d||'0'}
function mappingForCode(v=''){return state.mappings[canonicalCode(v)]||null}
function mappingServices(m){if(!m)return[];if(Array.isArray(m.services))return m.services.filter(Boolean);return m.service?[m.service]:[]}
function normalizeServiceName(v=''){const s=String(v||'').trim().toLowerCase();if(!s)return'';if(/^(egd|gastroscopy|upper endoscopy)/.test(s))return'EGD';if(/colon/.test(s)&&!/colonic stent/.test(s))return'Colonoscopy';if(/flex.*sig|sigmoidos/.test(s))return'Flex Sig';if(/\beus\b|endoscopic ultrasound/.test(s))return'EUS';if(/\bercp\b/.test(s))return'ERCP';if(/fibro/.test(s))return'FibroScan';if(/sibo|breath test/.test(s))return'SIBO Breath Test';if(/peg|gastrostomy/.test(s))return'PEG Tube';if(/polypect/.test(s))return'Polypectomy';if(/clip/.test(s))return'Clipping';if(/scler/.test(s))return'Sclerotherapy';if(/band/.test(s))return'Variceal Banding';if(/duodenal.*stent/.test(s))return'Duodenal Stenting';if(/esoph.*stent/.test(s))return'Esophageal Stenting';if(/colonic.*stent/.test(s))return'Colonic Stenting';if(/biliary.*stent|metallic.*stent/.test(s))return'Metallic Biliary Stenting';if(/foreign body/.test(s))return'Foreign Body Removal';if(/ph monitor/.test(s))return'pH Monitoring';return String(v||'').trim()}

function monthMatch(date,month){return String(date||'').slice(0,7)===month}
function normalizeMrn(v){let s=String(v??'').trim();if($('ignoreSeparators').checked)s=s.replace(/[\s-]+/g,'');s=s.replace(/\D/g,'');if($('ignoreZeros').checked)s=s.replace(/^0+(?=\d)/,'');return s}
function trackerMrns(){return new Set(state.procedures.map(x=>normalizeMrn(x.mrn)).filter(Boolean))}
function candidateMrns(text){const min=+$('minMrn').value||5,max=+$('maxMrn').value||12,known=trackerMrns(),raw=String(text).match(/[0-9][0-9\s-]{2,24}[0-9]/g)||[],vals=[];for(const x of raw){const n=normalizeMrn(x);if(n.length>=min&&n.length<=max&&(known.has(n)||/^\d+$/.test(n)))vals.push(n)}return [...new Set(vals)]}
function serviceFromDescription(text){
  const t=String(text).toLowerCase(),out=[];
  const tests=[['Sedation',/sedat/],['EGD',/gastros|upper endosc|\begd\b/],['Colonoscopy',/colonosc/],['Flex Sig',/flex.*sig|sigmoidos/],['EUS',/\beus\b|endoscopic ultrasound/],['ERCP',/\bercp\b/],['PEG Tube',/\bpeg\b|gastrostomy/],['FibroScan',/fibro.?scan/],['SIBO Breath Test',/sibo|breath test/],['Polypectomy',/polypect|polyp.*remov/],['Clipping',/clip/],['Sclerotherapy',/sclerotherap/],['Variceal Banding',/banding|variceal band/],['Duodenal Stenting',/duodenal stent/],['Esophageal Stenting',/esophageal stent/],['Colonic Stenting',/colonic stent/],['Metallic Biliary Stenting',/biliary stent|metallic stent/],['Foreign Body Removal',/foreign body/],['pH Monitoring',/ph monitor/]];
  for(const [svc,r] of tests)if(r.test(t))out.push(svc);
  if(/consult/.test(t)&&!/inpatient/.test(t))out.push('Consultation');
  for(const token of String(text).match(/\d{6,10}/g)||[]){const m=mappingForCode(token);for(const svc of mappingServices(m))out.push(svc)}
  return [...new Set(out.map(normalizeServiceName).filter(Boolean))]
}
function moneyValues(text,exclude=[]){const e=new Set(exclude.map(String));return (String(text).match(/(?:SAR\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/gi)||[]).map(x=>Number(x.replace(/SAR|,/gi,''))).filter(n=>Number.isFinite(n)&&n>=0&&!e.has(String(n)))}

function decodeXmlEntities(s=''){return String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'")}
async function inflateBytes(bytes,format='deflate-raw'){
  if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot decompress the file offline.');
  const ds=new DecompressionStream(format);const ab=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();return new Uint8Array(ab)
}
function findZipEocd(u8){for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--){if(u8[i]===0x50&&u8[i+1]===0x4b&&u8[i+2]===0x05&&u8[i+3]===0x06)return i}return -1}
async function unzipEntries(arrayBuffer){
  const u8=new Uint8Array(arrayBuffer),dv=new DataView(arrayBuffer),eocd=findZipEocd(u8);if(eocd<0)throw new Error('Excel ZIP structure was not found.');
  const total=dv.getUint16(eocd+10,true),cdOffset=dv.getUint32(eocd+16,true),dec=new TextDecoder('utf-8'),out={};let pos=cdOffset;
  for(let n=0;n<total;n++){
    if(dv.getUint32(pos,true)!==0x02014b50)break;const method=dv.getUint16(pos+10,true),compSize=dv.getUint32(pos+20,true),nameLen=dv.getUint16(pos+28,true),extraLen=dv.getUint16(pos+30,true),commentLen=dv.getUint16(pos+32,true),localOffset=dv.getUint32(pos+42,true),name=dec.decode(u8.slice(pos+46,pos+46+nameLen));
    if(dv.getUint32(localOffset,true)!==0x04034b50){pos+=46+nameLen+extraLen+commentLen;continue}const ln=dv.getUint16(localOffset+26,true),le=dv.getUint16(localOffset+28,true),dataStart=localOffset+30+ln+le,compressed=u8.slice(dataStart,dataStart+compSize);let data;
    if(method===0)data=compressed;else if(method===8)data=await inflateBytes(compressed,'deflate-raw');else{pos+=46+nameLen+extraLen+commentLen;continue}out[name]=data;pos+=46+nameLen+extraLen+commentLen;
  }return out
}
function excelColIndex(ref='A1'){const m=String(ref).match(/^([A-Z]+)/i);if(!m)return 0;let n=0;for(const ch of m[1].toUpperCase())n=n*26+(ch.charCodeAt(0)-64);return n-1}
async function extractXlsxOffline(file){
  const entries=await unzipEntries(await file.arrayBuffer()),dec=new TextDecoder('utf-8'),shared=[];
  if(entries['xl/sharedStrings.xml']){const xml=dec.decode(entries['xl/sharedStrings.xml']);for(const m of xml.matchAll(/<si[\s>][\s\S]*?<\/si>/g)){const parts=[...m[0].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x=>decodeXmlEntities(x[1]));shared.push(parts.join(''))}}
  const sheets=Object.keys(entries).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(k)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));if(!sheets.length)throw new Error('No Excel worksheets were found.');const all=[];
  for(const name of sheets){const xml=dec.decode(entries[name]),rows=[];for(const rm of xml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)){const vals=[];for(const cm of rm[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)){const attrs=cm[1],body=cm[2],t=(attrs.match(/\bt="([^"]+)"/)||[])[1]||'',ref=(attrs.match(/\br="([^"]+)"/)||[])[1]||'',col=excelColIndex(ref),v=(body.match(/<v>([\s\S]*?)<\/v>/)||[])[1],inline=[...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x=>decodeXmlEntities(x[1])).join('');let value='';if(t==='s'&&v!=null)value=shared[Number(v)]??v;else if(t==='inlineStr')value=inline;else if(v!=null)value=decodeXmlEntities(v);else value=inline;while(vals.length<col)vals.push('');vals[col]=value}if(vals.some(v=>String(v).trim()))rows.push(vals.map(v=>String(v??'')).join(' | '))}all.push(`Sheet: ${name.split('/').pop()}\n${rows.join('\n')}`)}return all.join('\n')
}
function ascii85Decode(bytes){
  const text=new TextDecoder('latin1').decode(bytes).replace(/\s+/g,'').replace(/^<~/,'').replace(/~>$/,'');const out=[];let group=[];
  for(const ch of text){if(ch==='z'&&group.length===0){out.push(0,0,0,0);continue}const c=ch.charCodeAt(0);if(c<33||c>117)continue;group.push(c-33);if(group.length===5){let n=0;for(const v of group)n=n*85+v;out.push((n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255);group=[]}}
  if(group.length){const len=group.length;while(group.length<5)group.push(84);let n=0;for(const v of group)n=n*85+v;const tmp=[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];out.push(...tmp.slice(0,len-1))}return new Uint8Array(out)
}
function pdfUnescape(s=''){
  return s.replace(/\\([0-7]{1,3})/g,(_,o)=>String.fromCharCode(parseInt(o,8)))
    .replace(/\\n/g,'\n').replace(/\\r/g,'\r').replace(/\\t/g,'\t').replace(/\\b/g,'\b').replace(/\\f/g,'\f').replace(/\\([()\\])/g,'$1');
}
function hexPdfText(hex=''){
  hex=hex.replace(/\s+/g,'');if(hex.length%2)hex+='0';const bytes=[];for(let i=0;i<hex.length;i+=2)bytes.push(parseInt(hex.slice(i,i+2),16));
  if(bytes[0]===0xfe&&bytes[1]===0xff){let out='';for(let i=2;i+1<bytes.length;i+=2)out+=String.fromCharCode((bytes[i]<<8)|bytes[i+1]);return out}
  return String.fromCharCode(...bytes);
}
function extractPdfTextOperators(content=''){
  const out=[];
  for(const m of content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g))out.push(pdfUnescape(m[1]));
  for(const m of content.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g))out.push(hexPdfText(m[1]));
  for(const a of content.matchAll(/\[([\s\S]*?)\]\s*TJ/g)){
    const part=[];
    for(const m of a[1].matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g))part.push(m[1]!=null?pdfUnescape(m[1]):hexPdfText(m[2]));
    if(part.length)out.push(part.join(''));
  }
  return out.join(' ');
}
async function extractPdfOffline(file){
  const u8=new Uint8Array(await file.arrayBuffer()),latin=new TextDecoder('latin1').decode(u8),chunks=[];let pos=0;
  while(true){
    const si=latin.indexOf('stream',pos);if(si<0)break;let start=si+6;
    if(latin[start]==='\r'&&latin[start+1]==='\n')start+=2;else if(latin[start]==='\n'||latin[start]==='\r')start+=1;
    const ei=latin.indexOf('endstream',start);if(ei<0)break;
    const dict=latin.slice(Math.max(0,si-600),si),raw=u8.slice(start,ei-(latin[ei-1]==='\n'?1:0));
    try{let data=raw;if(/ASCII85Decode/.test(dict))data=ascii85Decode(data);if(/FlateDecode/.test(dict))data=await inflateBytes(data,'deflate');const txt=new TextDecoder('latin1').decode(data),ex=extractPdfTextOperators(txt);if(ex.trim())chunks.push(ex)}catch{}
    pos=ei+9;
  }
  const direct=extractPdfTextOperators(latin);if(direct.trim())chunks.push(direct);
  const result=chunks.join('\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ').replace(/\s{2,}/g,' ').trim();
  if(!result)throw new Error('No extractable text was found in this PDF. Use CSV/TXT or paste the payslip text.');return result;
}
async function extractPdf(file){if(window.pdfjsLib){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';try{const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise,pages=[];for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),c=await page.getTextContent();pages.push(c.items.map(i=>i.str).join(' '))}const text=pages.join('\n').trim();if(text)return text}catch(err){}}return extractPdfOffline(file)}
async function extractSheet(file){const ext=file.name.split('.').pop().toLowerCase();if(ext==='csv'||ext==='txt')return file.text();if(window.XLSX){try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array',raw:false});return wb.SheetNames.map(n=>`Sheet: ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n],{FS:' | ',blankrows:false})}`).join('\n')}catch(err){}}if(ext==='xlsx')return extractXlsxOffline(file);throw new Error('This Excel format could not be read offline. Save it as .xlsx or CSV, or paste the payslip text.')}
async function extractFile(file){if(!file)return '';const ext=file.name.split('.').pop().toLowerCase();return ext==='pdf'?extractPdf(file):extractSheet(file)}
function parseHmgRow(line){
  const c=String(line).split('|').map(x=>x.trim());
  if(c.length<8)return null;
  if(!/^\d+$/.test(c[0]||'')||!/\d/.test(c[5]||'')||!/\d/.test(c[6]||''))return null;
  const mrn=normalizeMrn(c[5]),code=canonicalCode(c[6]),name=c[7]||'',mapping=mappingForCode(code),amountRaw=c.length>=12?c[11]:c.at(-1),amount=Number(String(amountRaw||'').replace(/,/g,''));
  return {mrn,code,name,mapping,mode:mapping?.mode||'unknown',services:mappingServices(mapping).map(normalizeServiceName),amount:Number.isFinite(amount)?amount:0,line:String(line)}
}

function learnCodeDescription(code,description){
  const c=canonicalCode(code),d=String(description||'').replace(/\s+/g,' ').trim();
  if(!c||c==='0'||!d)return;
  const current=state.codeDescriptions[c];
  if(!current){
    state.codeDescriptions[c]={description:d,variants:[],firstSeen:new Date().toISOString(),lastSeen:new Date().toISOString()};
  }else{
    current.lastSeen=new Date().toISOString();
    if(current.description!==d&&!current.variants.includes(d))current.variants.push(d);
  }
  localStorage.setItem('desktopReconCodeDescriptionsV1',JSON.stringify(state.codeDescriptions));
}
function exactBillingDescription(code,mapping){
  const c=canonicalCode(code);
  return state.codeDescriptions?.[c]?.description||mapping?.label||'Description not mapped';
}

function parsePayslip(text,hospital){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean),byMrn=new Map(),consultLines=[],inpatientLines=[],excludedLines=[],structured=[];
  for(const line of lines){const row=parseHmgRow(line);if(!row)continue;structured.push(row);if(row.mode==='consultation'){consultLines.push(row);continue}if(row.mode==='inpatient'){inpatientLines.push(row);continue}if(row.mode==='exclude'){excludedLines.push(row);continue}if(!row.mrn)continue;if(!byMrn.has(row.mrn))byMrn.set(row.mrn,{mrn:row.mrn,hospital,lineItems:[],services:[],associated:[],unknown:[],codes:[],amounts:{},counts:{},lines:[]});const r=byMrn.get(row.mrn);r.lineItems.push(row);r.codes.push(row.code);r.lines.push(row.line);if(row.mode==='associated'){r.associated.push(row.name||row.mapping?.service||row.code);continue}if(row.mode==='unknown'){r.unknown.push(`${row.code} ${row.name}`);continue}for(const svc of row.services){r.services.push(svc);r.counts[svc]=(r.counts[svc]||0)+1;r.amounts[svc]=(r.amounts[svc]||0)+row.amount}}
  if(!structured.length){lines.forEach((line,i)=>{const context=[lines[i-1],line,lines[i+1]].filter(Boolean).join(' | '),services=serviceFromDescription(context),tokens=String(context).match(/\d{6,10}/g)||[],maps=tokens.map(mappingForCode).filter(Boolean);if((services.includes('Consultation')||maps.some(m=>m.mode==='consultation'))&&!/inpatient/i.test(context))consultLines.push({line:context,amount:moneyValues(context).at(-1)||0});if(/inpatient/i.test(context)||maps.some(m=>m.mode==='inpatient'))inpatientLines.push({line:context,amount:moneyValues(context).at(-1)||0,code:(tokens.find(t=>mappingForCode(t)?.mode==='inpatient')||'')});for(const mrn of candidateMrns(line)){if(!byMrn.has(mrn))byMrn.set(mrn,{mrn,hospital,lineItems:[],services:[],associated:[],unknown:[],codes:[],amounts:{},counts:{},lines:[]});const r=byMrn.get(mrn);r.lines.push(context);for(const svc of services.filter(s=>!['Consultation','Sedation'].includes(s))){r.services.push(svc);r.counts[svc]=(r.counts[svc]||0)+1}}})}
  for(const sr of structured){if(sr?.code)learnCodeDescription(sr.code,sr.name||sr.description||mappingForCode(sr.code)?.label||'')}
  return {patients:[...byMrn.values()].map(r=>({...r,lines:[...new Set(r.lines)],services:[...new Set(r.services)],associated:[...new Set(r.associated)],unknown:[...new Set(r.unknown)],codes:[...new Set(r.codes)]})),consultLines,inpatientLines,excludedLines,structuredRows:structured.length}
}
function procedureServices(e){
  const arr=[];if(Array.isArray(e.procedures))arr.push(...e.procedures);else if(e.procedure)arr.push(...String(e.procedure).split(/[,|+]/));
  const x=e.extras||{};const boolMap=[['sclerotherapy','Sclerotherapy'],['varicealBanding','Variceal Banding'],['duodenalStenting','Duodenal Stenting'],['esophagealStenting','Esophageal Stenting'],['colonicStenting','Colonic Stenting'],['metallicBiliaryStenting','Metallic Biliary Stenting'],['foreignBodyRemoval','Foreign Body Removal'],['phMonitoring','pH Monitoring']];
  for(const [k,svc] of boolMap)if(e[k]===true||x[k]===true||Number(e[k])>0||Number(x[k])>0)arr.push(svc);
  const poly=Number(e.polypectomyCount??x.polypectomy??x.polypectomyCount??0),clips=Number(e.clipCount??e.clips??x.clipping??x.clipCount??0);if(poly>0)arr.push('Polypectomy');if(clips>0)arr.push('Clipping');
  return [...new Set(arr.map(normalizeServiceName).filter(Boolean))]
}
function serviceCounts(entries){const c={};for(const e of entries){for(const svc of procedureServices(e)){let q=1;const x=e.extras||{};if(svc==='Polypectomy')q=Number(e.polypectomyCount??x.polypectomy??x.polypectomyCount??1);if(svc==='Clipping')q=Number(e.clipCount??e.clips??x.clipping??x.clipCount??1);c[svc]=(c[svc]||0)+Math.max(1,q)}}return c}
function groupedAssessment(service,count,pay){
  if(!['Polypectomy','Clipping','Sclerotherapy','Variceal Banding','Metallic Biliary Stenting'].includes(service))return null;
  const paidLineCount=Number(pay?.counts?.[service]||0),paid=Number(pay?.amounts?.[service]||0),unitFee=Number(state.fees?.[service]||DEFAULT_FEES[service]||0);
  let inferredUnits=null;
  if(paid>0&&unitFee>0){
    const raw=paid/unitFee,rounded=Math.round(raw);
    if(rounded>=1&&Math.abs(raw-rounded)<=0.03)inferredUnits=rounded;
  }
  const paidUnits=Math.max(paidLineCount,inferredUnits||0);
  const expectedAmount=Number(count||0)*unitFee;
  const missingQty=Math.max(0,Number(count||0)-paidUnits);
  const missingAmount=missingQty*unitFee;
  if(paidUnits>=count)return {service,count,paidCount:paidLineCount,paidUnits,inferredUnits,unitFee,paid,expectedAmount,missingQty:0,missingAmount:0,status:'matched',label:inferredUnits&&inferredUnits>paidLineCount?`Grouped payment amount covers ${inferredUnits} unit(s)`:'Expected code family found for recorded quantity'};
  if(paidLineCount>0||paid>0)return {service,count,paidCount:paidLineCount,paidUnits,inferredUnits,unitFee,paid,expectedAmount,missingQty,missingAmount,status:'review',label:inferredUnits!=null?`Payment amount corresponds to ${inferredUnits} unit(s); tracker recorded ${count}`:`Payment/code found but quantity cannot be inferred safely from the amount`};
  return {service,count,paidCount:0,paidUnits:0,inferredUnits:null,unitFee,paid:null,expectedAmount,missingQty:Number(count||0),missingAmount:expectedAmount,status:'missing',label:'No matching intervention code family found'};
}
function consultTracker(hospital,month){
  const rows=state.clinic.filter(x=>monthMatch(x.date,month)&&normalizeHospital(x.clinic||x.hospital)===hospital&&!/^inpatient consultation/i.test(String(x.clinic||'')));
  let newC=0,follow=0;
  for(const r of rows){newC+=Number(r.newConsultations||r.new||0);follow+=Number(r.followUps||r.followUp||0)}
  return {newC,follow,total:newC};
}
function inpatientTracker(hospital,month){
  const rows=state.clinic.filter(x=>monthMatch(x.date,month)&&/^inpatient consultation/i.test(String(x.clinic||''))&&normalizeHospital(x.clinic||x.hospital)===hospital);
  const total=rows.reduce((s,r)=>s+Number(r.totalPatients??r.newConsultations??0),0);
  return {total,entries:rows.length};
}
function consultPayslip(parsed){const lines=parsed.consultLines||[];let amount=0;for(const x of lines)amount+=Number(x.amount||0);if(lines.length)return {lines:lines.length,qty:lines.length,amount,source:'Counted from outpatient consultation code 01002003',derived:false};return {lines:0,qty:null,amount:0,source:'No outpatient consultation code detected',derived:false}}
function inpatientPayslip(parsed){
  const lines=parsed.inpatientLines||[];
  let amount=0;for(const x of lines)amount+=Number(x.amount||0);
  const byCode={};for(const x of lines){const c=canonicalCode(x.code||'');byCode[c]=(byCode[c]||0)+1}
  return {lines:lines.length,qty:lines.length,amount,byCode,source:lines.length?'Counted from inpatient consultation code family':'No inpatient consultation code detected'};
}
function reconcile(){
  const month=$('monthInput').value,tracker=state.procedures.filter(e=>monthMatch(e.date,month)),trackerMap=new Map(),payMap=new Map();
  for(const e of tracker){const hospital=normalizeHospital(e.hospital),mrn=normalizeMrn(e.mrn),key=hospital+'|'+mrn;if(!mrn)continue;if(!trackerMap.has(key))trackerMap.set(key,[]);trackerMap.get(key).push(e)}
  for(const hospital of HOSPITALS)for(const r of state.rows[hospital].patients)payMap.set(hospital+'|'+r.mrn,r);
  const items=[];
  trackerMap.forEach((entries,key)=>{const pay=payMap.get(key),hospital=normalizeHospital(entries[0].hospital),mrn=normalizeMrn(entries[0].mrn),counts=serviceCounts(entries),trackerServices=Object.keys(counts);if(!pay){items.push({type:'missingPayslip',hospital,mrn,date:entries[0].date,trackerServices,trackerCounts:counts,payServices:[],missing:trackerServices,extra:[],review:[],status:'Missing from payslip'});return}const payServices=pay.services.filter(s=>!['Consultation','Sedation'].includes(s)),missing=trackerServices.filter(s=>!payServices.includes(s)),extra=payServices.filter(s=>!trackerServices.includes(s)),assess=trackerServices.map(s=>groupedAssessment(s,counts[s],pay)).filter(Boolean),needs=assess.filter(a=>a.status!=='matched');let type=missing.length||extra.length?'mismatch':'matched';if(needs.length||pay.unknown.length)type='review';items.push({type,hospital,mrn,date:entries[0].date,trackerServices,trackerCounts:counts,payServices,missing,extra,review:assess,associated:pay.associated,unknown:pay.unknown,codes:pay.codes,lineItems:pay.lineItems,lines:pay.lines,status:type==='matched'?'Matched':type==='review'?'Needs review':'Procedure difference'});payMap.delete(key)});
  payMap.forEach(r=>items.push({type:'missingTracker',hospital:r.hospital,mrn:r.mrn,date:'',trackerServices:[],trackerCounts:{},payServices:r.services,missing:[],extra:r.services,review:[],associated:r.associated,unknown:r.unknown,codes:r.codes,lineItems:r.lineItems,lines:r.lines,status:'Missing from tracker'}));
  const consultations={},inpatientConsultations={};for(const hospital of HOSPITALS){const tr=consultTracker(hospital,month),ps=consultPayslip(state.rows[hospital]),expected=tr.newC*Number(state.fees.Consultation||0);consultations[hospital]={...tr,trackerQty:tr.newC,paidQty:ps.qty,paidQtySource:ps.source,paidQtyDerived:false,actual:ps.amount,expected,difference:ps.amount-expected,sourceLines:ps.lines,status:ps.qty==null?'review':ps.qty===tr.newC?'matched':'difference'};const itr=inpatientTracker(hospital,month),ips=inpatientPayslip(state.rows[hospital]);inpatientConsultations[hospital]={...itr,trackerQty:itr.total,paidQty:ips.qty,actual:ips.amount,source:ips.source,byCode:ips.byCode,status:ips.qty===itr.total?'matched':'difference'}}
  state.result={month,items,consultations,inpatientConsultations};checkOutstandingAgainstCurrentPayslip(month);renderAll();renderOutstanding();showView('overview')
}
async function run(){if(!state.backup)return setMsg('Import the iPhone tracker backup first.',true);const btn=$('reconcileBtn');btn.disabled=true;setMsg('Checking imported data and reconciling…');try{for(const [hospital,id,textId] of [['HMG Fayhaa','fayhaaFile','fayhaaText'],['HMG Mohammadiya','mohFile','mohText']]){let text=(state.texts[hospital]||$(textId).value||'').trim();const f=$(id).files[0];if(!text&&f){text=await extractFile(f)}if(!text)throw new Error(`${hospital.replace('HMG ','')} payslip has no readable data. Upload CSV/TXT, use a readable PDF/Excel file, or paste the payslip text.`);state.texts[hospital]=text;state.rows[hospital]=parsePayslip(text,hospital)}reconcile();setMsg('Reconciliation completed. Consultation counts and procedure MRNs are now correlated separately. Review any differences or uncertain items.')}catch(e){setMsg(e.message||'Unable to reconcile.',true)}finally{btn.disabled=false;updateReadyCheck()}}
function metric(label,value,cls=''){return `<div class="metric"><span>${esc(label)}</span><b class="${cls}">${esc(value)}</b></div>`}
function renderAll(){if(!state.result)return;const r=state.result,counts=t=>r.items.filter(x=>x.type===t).length;const missing=counts('missingPayslip'),extra=counts('missingTracker'),mismatch=counts('mismatch'),review=counts('review'),matched=counts('matched');$('overviewMonth').textContent=r.month;$('overviewKpis').innerHTML=[['Matched',matched,''],['Missing from payslip',missing,'bad'],['Missing from tracker',extra,'warn'],['Procedure differences',mismatch,'bad'],['Needs review',review,'warn']].map(x=>`<article class="kpi ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></article>`).join('');for(const [hospital,id] of [['HMG Fayhaa','fayhaaOverview'],['HMG Mohammadiya','mohOverview']]){const a=r.items.filter(x=>x.hospital===hospital),c=r.consultations[hospital];$(id).innerHTML=`<div class="metric-list">${metric('Tracker endoscopy cases',a.filter(x=>x.trackerServices?.length).length)}${metric('Matched procedure MRNs',a.filter(x=>x.type==='matched').length)}${metric('Procedure differences / review',a.filter(x=>x.type==='mismatch'||x.type==='review').length,'warn-text')}${metric('Missing from payslip',a.filter(x=>x.type==='missingPayslip').length,'bad-text')}${metric('New outpatient consults: tracker',c.trackerQty)}${metric('New outpatient consults: payslip',c.paidQty??'Needs review',c.paidQty==null?'warn-text':'')}${metric('Consultation payment',formatSAR(c.actual))}</div>`}const priorities=r.items.filter(x=>x.type!=='matched').slice(0,8);$('priorityFindings').innerHTML=priorities.length?priorities.map(itemCard).join(''):'<div class="item"><b class="ok-text">No priority discrepancies.</b></div>';renderConsultations();renderProcedures();renderReview();renderFinal();renderOutstanding();renderQuickWorkspace()}
function formatSAR(n){return `${Number(n||0).toLocaleString()} SAR`}
function consultationStreamCard(hospital,c,title){
  const difference=c.paidQty==null?null:Number(c.paidQty)-Number(c.trackerQty||0);
  const cls=c.paidQty==null?'warn':difference===0?'ok':'bad';
  return `<article class="card">
    <h3>${esc(hospital.replace('HMG ',''))}</h3>
    <div class="recon-pair">
      <div><span>Tracker</span><strong>${c.trackerQty??0}</strong></div>
      <div><span>Payslip</span><strong>${c.paidQty??'Review'}</strong></div>
    </div>
    <div class="metric-list">
      ${metric('Difference',difference==null?'Needs review':(difference>0?`+${difference}`:difference),difference===0?'ok-text':'bad-text')}
      ${c.actual!=null?metric('Payslip amount',formatSAR(c.actual)):''}
      ${c.entries!=null?metric('Tracker entries',c.entries):''}
    </div>
    <div class="status-line ${cls}">${difference===0?'Counts match':difference==null?'Payslip quantity needs review':difference<0?`${Math.abs(difference)} fewer on payslip`:`${difference} more on payslip`}</div>
  </article>`;
}
function renderConsultations(){
  if(!state.result)return;
  $('outpatientConsultationCards').innerHTML=HOSPITALS.map(h=>consultationStreamCard(h,state.result.consultations[h],'Outpatient')).join('');
  $('inpatientConsultationCards').innerHTML=HOSPITALS.map(h=>consultationStreamCard(h,state.result.inpatientConsultations[h],'Inpatient')).join('');
}
function badges(arr,cls=''){return (arr||[]).map(x=>`<span class="badge ${cls}">${esc(x)}</span>`).join('')||'—'}
function codeBadges(x){return (x.lineItems||[]).filter(r=>r.mode!=='associated'&&r.mode!=='exclude').map(r=>`<span class="code-line"><code>${esc(r.code)}</code> ${esc(r.name)}${r.amount?` · ${formatSAR(r.amount)}`:''}</span>`).join('')}
function renderProcedures(){if(!state.result)return;const items=state.result.items.filter(x=>state.procFilter==='all'||x.type===state.procFilter);$('procedureResults').innerHTML=`<div class="result-row header"><div>Status</div><div>Hospital / MRN</div><div>Tracker</div><div>Payslip code families</div><div>Date</div></div>`+items.map(x=>`<div class="result-row"><div><span class="badge ${x.type==='matched'?'ok':x.type==='review'?'warn':'bad'}">${esc(x.status)}</span></div><div><b>${esc(x.hospital.replace('HMG ',''))}</b><br>${esc(x.mrn)}</div><div>${badges(x.trackerServices)}${x.missing?.length?`<div class="bad-text">Missing: ${esc(x.missing.join(', '))}</div>`:''}</div><div>${badges(x.payServices)}${codeBadges(x)}${x.associated?.length?`<div class="muted-note">Associated: ${esc(x.associated.join('; '))}</div>`:''}${x.unknown?.length?`<div class="warn-text">Unmapped code: ${esc(x.unknown.join('; '))}</div>`:''}${x.extra?.length?`<div class="warn-text">Additional family: ${esc(x.extra.join(', '))}</div>`:''}</div><div>${esc(x.date||'—')}</div></div>`).join('')}
document.querySelectorAll('.seg').forEach(b=>b.onclick=()=>{state.procFilter=b.dataset.procFilter;document.querySelectorAll('.seg').forEach(x=>x.classList.toggle('active',x===b));renderProcedures()});
function itemCard(x){return `<div class="item"><div class="item-head"><div><b>${esc(x.hospital)} · MRN ${esc(x.mrn)}</b><div>${badges(x.trackerServices)}</div></div><span class="badge ${x.type==='review'?'warn':'bad'}">${esc(x.status)}</span></div>${x.missing?.length?`<p class="bad-text">Missing from payslip: ${esc(x.missing.join(', '))}</p>`:''}${x.extra?.length?`<p class="warn-text">Only in payslip: ${esc(x.extra.join(', '))}</p>`:''}${x.unknown?.length?`<p class="warn-text">Unmapped HMG code: ${esc(x.unknown.join('; '))}</p>`:''}</div>`}
function renderReview(){if(!state.result)return;const list=state.result.items.filter(x=>x.type==='review'||x.associated?.length||x.unknown?.length);$('reviewResults').innerHTML=list.length?list.map(x=>`<div class="item"><div class="item-head"><b>${esc(x.hospital)} · MRN ${esc(x.mrn)}</b><span class="badge warn">Needs review</span></div>${(x.review||[]).map(a=>`<p><b>${esc(a.service)} ×${a.count}</b><br>${esc(a.label)}${a.paidCount!=null?` · Payslip code lines ${a.paidCount}`:''}${a.paid!=null?` · Paid ${formatSAR(a.paid)}`:''}${a.expectedAmount!=null?` · Expected ${formatSAR(a.expectedAmount)}`:''}${a.missingAmount?` · Outstanding ${formatSAR(a.missingAmount)}`:''}</p>`).join('')}${x.associated?.length?`<p class="muted-note">Associated codes (not used as missing-item decisions): ${esc(x.associated.join('; '))}</p>`:''}${x.unknown?.length?`<p class="warn-text">Unmapped HMG codes: ${esc(x.unknown.join('; '))}</p>`:''}${codeBadges(x)}</div>`).join(''):'<div class="item"><b>No uncertain items.</b></div>'}
function simpleRuleLabel(mapping){if(!mapping)return'Unknown';if(mapping.mode==='grouped')return'May include multiple';if(mapping.mode==='bundle')return'May include several services';if(mapping.mode==='associated')return'Associated only';if(mapping.mode==='consultation')return'Outpatient consultation';if(mapping.mode==='inpatient')return'Inpatient consultation';if(mapping.mode==='exclude')return'Ignored';return'Single procedure'}
const REPEATABLE_SERVICES=new Set(['Polypectomy','Clipping','Sclerotherapy','Variceal Banding','Metallic Biliary Stenting']);
function simpleModeForService(service,multi){if(service==='Consultation')return'consultation';if(service==='Inpatient Consultation')return'inpatient';if(service==='Sedation')return'associated';if(service==='Ignore')return'exclude';if(multi||REPEATABLE_SERVICES.has(service))return'grouped';return'base'}
function unknownCodesFromCurrentPayslips(){const out=new Map();for(const hospital of HOSPITALS){for(const p of state.rows?.[hospital]?.patients||[]){for(const raw of p.unknown||[]){const m=String(raw).match(/(\d{5,10})\s*(.*)/);if(!m)continue;const code=canonicalCode(m[1]);if(state.mappings[code])continue;if(!out.has(code))out.set(code,{code,description:m[2]||'Unknown service',count:0});out.get(code).count++}}}return[...out.values()]}
function saveSimpleCode(code,service,multi){const c=canonicalCode(code);if(!c||c==='0')return;const mode=simpleModeForService(service,multi);state.mappings[c]={service,services:mode==='exclude'?[]:[service],mode,label:service};localStorage.setItem('desktopReconMappingsV1',JSON.stringify(state.mappings));renderMappings()}
function renderMappings(){const services=[...SERVICES,'Consultation','Inpatient Consultation','Sedation','Ignore'].filter((v,i,a)=>a.indexOf(v)===i),opts=services.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');if($('mapService'))$('mapService').innerHTML=opts;const unknown=unknownCodesFromCurrentPayslips();if($('unmappedCodeCount'))$('unmappedCodeCount').textContent=unknown.length;if($('unmappedCodeList')){$('unmappedCodeList').innerHTML=unknown.length?unknown.map(u=>`<div class="code-review-item"><div class="code-review-top"><div><code>${esc(u.code)}</code><div class="code-review-desc">${esc(u.description)} · seen ${u.count} time(s)</div></div><span class="badge warn">Needs review</span></div><div class="simple-code-form"><label>What is this code?<select data-simple-service="${esc(u.code)}">${opts}</select></label><label data-repeat-label="${esc(u.code)}">Payment style<span class="repeat-choice"><input type="checkbox" data-simple-repeat="${esc(u.code)}"> May include multiple</span></label><button class="primary" data-confirm-code="${esc(u.code)}">Confirm</button></div></div>`).join(''):'<div class="code-review-empty">No unknown billing codes in the currently loaded payslips.</div>';document.querySelectorAll('[data-simple-service]').forEach(sel=>{const code=sel.dataset.simpleService,repeat=document.querySelector(`[data-simple-repeat="${code}"]`),label=document.querySelector(`[data-repeat-label="${code}"]`);const sync=()=>{const show=REPEATABLE_SERVICES.has(sel.value);if(repeat)repeat.checked=show;if(label)label.style.display=show?'grid':'none'};sel.onchange=sync;sync()});document.querySelectorAll('[data-confirm-code]').forEach(btn=>btn.onclick=()=>{const code=btn.dataset.confirmCode,service=document.querySelector(`[data-simple-service="${code}"]`)?.value||'Ignore',multi=document.querySelector(`[data-simple-repeat="${code}"]`)?.checked||false;saveSimpleCode(code,service,multi)})}if($('knownCodeList')){$('knownCodeList').innerHTML=Object.entries(state.mappings).sort().map(([code,m])=>`<div class="known-code-item"><div class="known-code-row"><code>${esc(code)}</code><span>${esc(exactBillingDescription(code,m))}</span><span class="rule-text">${esc((m.services||[m.service]).filter(Boolean).join(' + ')||'Ignored')} · ${esc(simpleRuleLabel(m))}</span><button class="secondary" data-known-delete="${esc(code)}">Remove</button></div></div>`).join('');document.querySelectorAll('[data-known-delete]').forEach(b=>b.onclick=()=>{if(confirm(`Remove mapping for code ${b.dataset.knownDelete}?`)){delete state.mappings[b.dataset.knownDelete];localStorage.setItem('desktopReconMappingsV1',JSON.stringify(state.mappings));renderMappings()}})}}

$('backupFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(data.format!=='gastroenterology-practice-tracker-backup')throw new Error('This is not a valid tracker backup.');state.backup=data;state.clinic=data.clinicRecords||[];state.procedures=data.procedureRecords||[];state.fees={...DEFAULT_FEES,...(data.incomeSettings?.fees||data.incomeSettings||{})};if(data.payslipCodeMappings)state.mappings=normalizeMappings({...state.mappings,...data.payslipCodeMappings});$('backupFileNote').textContent=f.name;$('backupSummary').innerHTML=`<span class="mini">${state.clinic.length} clinic records</span><span class="mini">${state.procedures.length} procedure records</span><span class="mini">Backup ${new Date(data.createdAt||Date.now()).toLocaleDateString()}</span>`;$('workspaceStatus').textContent='Tracker backup imported';renderMappings();setMsg('Backup imported successfully.')}catch(err){setMsg(err.message,true)}};
[['fayhaaFile','fayhaaNote'],['mohFile','mohNote']].forEach(([a,b])=>$(a).onchange=e=>$(b).textContent=e.target.files[0]?.name||'No file selected');
$('reconcileBtn').onclick=run;$('clearBtn').onclick=()=>location.reload();
function csv(rows){const keys=[...new Set(rows.flatMap(Object.keys))];return [keys.join(','),...rows.map(r=>keys.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(','))].join('\n')}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportRows(filter){if(!state.result)return setMsg('Run reconciliation first.',true);return state.result.items.filter(filter).map(x=>({month:state.result.month,hospital:x.hospital,mrn:x.mrn,status:x.status,tracker_services:x.trackerServices?.join('; '),payslip_services:x.payServices?.join('; '),missing:x.missing?.join('; '),additional:x.extra?.join('; '),grouped_review:x.review?.map(a=>`${a.service}: ${a.label}; expected ${a.expected}; paid ${a.paid??'unknown'}`).join(' | ')}))}
$('exportFullBtn').onclick=()=>download(`reconciliation-${state.result?.month||'report'}.csv`,csv(exportRows(()=>true)));$('exportMissingBtn').onclick=()=>download(`missing-items-${state.result?.month||'report'}.csv`,csv(finalExportRows(true)));$('exportConsultBtn').onclick=()=>{if(!state.result)return;const rows=HOSPITALS.flatMap(h=>[{month:state.result.month,hospital:h,type:'New outpatient consultations',...state.result.consultations[h]},{month:state.result.month,hospital:h,type:'Inpatient consultations',...state.result.inpatientConsultations[h]}]);download(`consultations-${state.result.month}.csv`,csv(rows))};
renderMappings();

// Full desktop integration: load the current tracker data directly from shared localStorage.
(function(){
  const button=document.getElementById('useCurrentDataBtn');
  if(!button)return;
  button.addEventListener('click',()=>{
    try{
      const clinic=JSON.parse(localStorage.getItem('dailyClinicTrackerEntriesV1')||'[]');
      const procedures=JSON.parse(localStorage.getItem('hmgEndoscopyEntriesV1')||'[]');
      const pending=JSON.parse(localStorage.getItem('practicePendingEndoscopyV1')||'[]');
      const admissions=JSON.parse(localStorage.getItem('practiceAdmissionTrackerV1')||'[]');
      const incomeSettings=JSON.parse(localStorage.getItem('practiceIncomeSettingsV1')||'{}');
      const data={format:'gastroenterology-practice-tracker-backup',version:4,createdAt:new Date().toISOString(),clinicRecords:clinic,procedureRecords:procedures,pendingRecords:pending,admissionRecords:admissions,incomeSettings};
      state.backup=data;state.clinic=clinic;state.procedures=procedures;state.fees={...DEFAULT_FEES,...(incomeSettings?.fees||incomeSettings||{})};
      document.getElementById('backupFileNote').textContent='Current tracker data';
      document.getElementById('backupSummary').innerHTML=`<span class="mini">${clinic.length} clinic records</span><span class="mini">${procedures.length} procedure records</span><span class="mini">Loaded ${new Date().toLocaleString()}</span>`;
      document.getElementById('workspaceStatus').textContent='Current tracker data loaded';
      renderMappings();setMsg('Tracker data loaded directly from this browser.');
    }catch(err){setMsg(err.message||'Unable to load current tracker data.',true)}
  });
})();


// v2.3: visible import diagnostics and reliable pre-reading.
function setImportCheck(id,kind,title,detail){
  const el=$(id);if(!el)return;
  el.classList.remove('ok','warn','bad');if(kind)el.classList.add(kind);
  const strong=el.querySelector('strong'),small=el.querySelector('small');
  if(strong)strong.textContent=title;if(small)small.textContent=detail;
}
function textStats(text){
  const t=String(text||'').trim();if(!t)return {lines:0,mrns:0,codes:0};
  const lines=t.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),mrns=new Set();
  for(const line of lines)for(const m of candidateMrns(line))mrns.add(m);
  const codes=[...new Set((t.match(/\d{6,10}/g)||[]).map(canonicalCode).filter(c=>state.mappings[c]))];
  return {lines:lines.length,mrns:mrns.size,codes:codes.length};
}
function updateReadyCheck(){
  const b=!!state.backup;
  const f=!!String(state.texts['HMG Fayhaa']||$('fayhaaText')?.value||'').trim();
  const m=!!String(state.texts['HMG Mohammadiya']||$('mohText')?.value||'').trim();
  const el=$('readyStrip');if(!el)return;
  el.classList.toggle('ready',b&&f&&m);
  el.querySelector('span').textContent=b&&f&&m
    ?'Backup and both payslips contain readable data. Ready to reconcile.'
    :`Backup ${b?'OK':'—'} · Fayhaa ${f?'OK':'—'} · Mohammadiya ${m?'OK':'—'}`;
  $('reconcileBtn').disabled=!(b&&f&&m);
}
async function inspectPayslipFile(hospital,file,inputId,checkId,noteId){
  state.texts[hospital]='';
  $(noteId).textContent=file?file.name:'No file selected';
  if(!file){setImportCheck(checkId,'','Import check','Waiting for a payslip.');updateReadyCheck();return;}
  setImportCheck(checkId,'warn','Reading payslip…',`${file.name} · ${(file.size/1024).toFixed(0)} KB`);
  try{
    const text=await extractFile(file);state.texts[hospital]=String(text||'').trim();const st=textStats(state.texts[hospital]);
    if(!state.texts[hospital]) setImportCheck(checkId,'bad','No readable text','The file was opened but no text could be extracted. Use CSV/TXT or paste the text below.');
    else if(st.mrns===0) setImportCheck(checkId,'warn','Payslip text loaded',`${st.lines} lines read · no MRNs detected yet · ${st.codes} mapped billing codes detected. You can still reconcile, but review results carefully.`);
    else setImportCheck(checkId,'ok','Payslip loaded',`${st.lines} lines · ${st.mrns} MRNs detected · ${st.codes} mapped billing codes detected.`);
  }catch(err){
    setImportCheck(checkId,'bad','Payslip not readable',err.message||'Unable to read this file.');
    setMsg(err.message||'Unable to read payslip.',true);
  }
  updateReadyCheck();
}
function acceptBackupData(data,fileName='Tracker backup'){
  if(!data||typeof data!=='object')throw new Error('Backup JSON is empty or invalid.');
  const compatible=data.format==='gastroenterology-practice-tracker-backup'||Array.isArray(data.clinicRecords)||Array.isArray(data.procedureRecords);
  if(!compatible)throw new Error('This JSON does not contain tracker clinic/procedure records.');
  state.backup=data;state.clinic=Array.isArray(data.clinicRecords)?data.clinicRecords:[];state.procedures=Array.isArray(data.procedureRecords)?data.procedureRecords:[];
  state.fees={...DEFAULT_FEES,...(data.incomeSettings?.fees||data.incomeSettings||{})};
  if(data.payslipCodeMappings)state.mappings=normalizeMappings({...state.mappings,...data.payslipCodeMappings});
  $('backupFileNote').textContent=fileName;
  $('backupSummary').innerHTML=`<span class="mini">${state.clinic.length} clinic records</span><span class="mini">${state.procedures.length} procedure records</span><span class="mini">${(data.pendingRecords||[]).length} pending records</span>`;
  $('workspaceStatus').textContent='Tracker backup imported';
  setImportCheck('backupCheck','ok','Backup loaded',`${state.clinic.length} clinic records · ${state.procedures.length} endoscopy records.`);
  renderMappings();updateReadyCheck();
}
$('backupFile').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  setImportCheck('backupCheck','warn','Reading backup…',f.name);
  try{acceptBackupData(JSON.parse(await f.text()),f.name);setMsg('Backup imported successfully.');}
  catch(err){state.backup=null;setImportCheck('backupCheck','bad','Backup not loaded',err.message);setMsg(err.message,true);updateReadyCheck();}
};
$('fayhaaFile').onchange=e=>inspectPayslipFile('HMG Fayhaa',e.target.files[0],'fayhaaFile','fayhaaCheck','fayhaaNote');
$('mohFile').onchange=e=>inspectPayslipFile('HMG Mohammadiya',e.target.files[0],'mohFile','mohCheck','mohNote');
[['fayhaaText','HMG Fayhaa','fayhaaCheck'],['mohText','HMG Mohammadiya','mohCheck']].forEach(([id,h,check])=>{
  $(id).addEventListener('input',()=>{
    const text=$(id).value.trim();
    if(text){state.texts[h]=text;const st=textStats(text);setImportCheck(check,st.mrns?'ok':'warn','Manual text ready',`${st.lines} lines · ${st.mrns} MRNs · ${st.codes} mapped codes.`);}
    else if(!$(h==='HMG Fayhaa'?'fayhaaFile':'mohFile').files[0]){state.texts[h]='';setImportCheck(check,'','Import check','Waiting for a payslip.');}
    updateReadyCheck();
  });
});
updateReadyCheck();


// v2.6 final reconciliation, manual classification, and persistent follow-up
function reconItemKey(x){
  return [state.result?.month||'',normalizeHospital(x.hospital||''),normalizeMrn(x.mrn||''),x.date||'',(x.trackerServices||[]).join('+'),(x.payServices||[]).join('+')].join('|');
}
function effectiveType(x){
  const d=state.manualDecisions[reconItemKey(x)];
  return d?.type||x.type;
}
function effectiveLabel(type){
  return ({matched:'Matched',missingPayslip:'Missing from payslip',missingTracker:'Missing from tracker',mismatch:'Needs review',review:'Needs review'})[type]||'Needs review';
}
function normalizedBucketType(x){
  const t=effectiveType(x);
  if(t==='matched')return 'matched';
  if(t==='missingPayslip')return 'missingPayslip';
  if(t==='missingTracker')return 'missingTracker';
  return 'review';
}
function followupFor(x){
  const key=reconItemKey(x);
  return state.followups[key]||{status:'Open',note:'',updatedAt:''};
}
function saveManualDecision(key,type){
  if(type==='auto')delete state.manualDecisions[key];
  else state.manualDecisions[key]={type,updatedAt:new Date().toISOString()};
  localStorage.setItem('desktopReconManualDecisionsV1',JSON.stringify(state.manualDecisions));
  renderFinal();renderProcedures();
}
function saveFollowup(key,status,note){
  state.followups[key]={status:status||'Open',note:String(note||'').trim(),updatedAt:new Date().toISOString()};
  localStorage.setItem('desktopReconFollowupsV1',JSON.stringify(state.followups));
  renderFinal();
}

function candidateMissingComponents(x){
  return effectiveCandidateMissingComponents(x);
}
function selectedMissingComponents(x){
  const key=reconItemKey(x),candidates=candidateMissingComponents(x),saved=state.itemMissingDecisions[key];
  if(!saved)return candidates;
  return candidates.filter(c=>saved.some(s=>s.service===c.service&&Number(s.qty)>0)).map(c=>{
    const s=saved.find(v=>v.service===c.service);return {...c,qty:Math.min(c.qty,Number(s?.qty||c.qty))}
  });
}
function saveSelectedMissing(x,selected){
  const key=reconItemKey(x);
  state.itemMissingDecisions[key]=selected;
  localStorage.setItem('desktopReconItemMissingDecisionsV1',JSON.stringify(state.itemMissingDecisions));
  if(!selected.length)state.manualDecisions[key]={type:'matched',updatedAt:new Date().toISOString()};
  else state.manualDecisions[key]={type:'missingPayslip',updatedAt:new Date().toISOString()};
  localStorage.setItem('desktopReconManualDecisionsV1',JSON.stringify(state.manualDecisions));
  renderFinal();renderOutstanding();
}
function missingSelector(x){
  const candidates=candidateMissingComponents(x);
  if(candidates.length<=1)return '';
  const key=reconItemKey(x),saved=state.itemMissingDecisions[key];
  return `<div class="missing-select-box">
    <div class="missing-select-title">Which items are truly missing?</div>
    <div class="missing-checks">${candidates.map((c,i)=>{
      const checked=!saved||saved.some(s=>s.service===c.service);
      return `<label class="missing-check"><input type="checkbox" data-missing-choice="${esc(key)}" data-service="${esc(c.service)}" data-qty="${c.qty}" ${checked?'checked':''}> ${esc(c.service)} ×${c.qty}</label>`
    }).join('')}</div>
    <div class="missing-select-actions">
      <button class="secondary" data-missing-all="${esc(key)}">Select all</button>
      <button class="secondary" data-missing-clear="${esc(key)}">Clear all</button>
      <button class="primary" data-missing-confirm="${esc(key)}">Confirm selected only</button>
      ${saved?`<button class="secondary" data-missing-undo="${esc(key)}">Undo review</button>`:''}
    </div>
    ${saved?'<div class="reviewed-note">Manual item-level review saved. Only selected items will be carried forward.</div>':''}
  </div>`;
}

function finalItemDetails(x){
  const missing=(x.missing||[]).length?`<p class="bad-text"><b>Missing:</b> ${esc(x.missing.join(', '))}</p>`:'';
  const extra=(x.extra||[]).length?`<p class="warn-text"><b>Payslip only:</b> ${esc(x.extra.join(', '))}</p>`:'';
  const review=(x.review||[]).filter(a=>a.status!=='matched').map(a=>`<p class="warn-text"><b>${esc(a.service)}:</b> ${esc(a.label||'Quantity/payment needs review')}</p>`).join('');
  const unknown=(x.unknown||[]).length?`<p class="warn-text"><b>Unmapped code:</b> ${esc(x.unknown.join('; '))}</p>`:'';
  return missing+extra+review+unknown;
}
function finalCaseCard(x){
  const key=reconItemKey(x), bucket=normalizedBucketType(x), f=followupFor(x);
  const autoType=x.type;
  const tracker=(x.trackerServices||[]).length?badges(x.trackerServices):'<span class="muted-note">No tracker procedure found</span>';
  const payslip=(x.payServices||[]).length?badges(x.payServices):'<span class="muted-note">No payslip procedure found</span>';
  const codes=codeBadges(x)||'<span class="muted-note">No mapped payslip code lines</span>';
  return `<div class="final-case" data-final-key="${esc(key)}">
    <div class="final-case-head">
      <div><b>${esc(x.hospital.replace('HMG ',''))} · MRN ${esc(x.mrn||'—')}</b><small>${esc(x.date||'No tracker date')} · Automatic: ${esc(effectiveLabel(autoType))}</small></div>
      <span class="badge ${bucket==='matched'?'ok':bucket==='review'?'warn':'bad'}">${esc(effectiveLabel(bucket))}</span>
    </div>
    <div class="final-case-body">
      <div class="final-case-col"><h4>Tracker</h4>${tracker}${finalItemDetails(x)}${missingSelector(x)}${correctionSummaryHtml(x)}${trackerCorrectionPanel(x)}</div>
      <div class="final-case-col"><h4>Payslip</h4>${payslip}${codes}${x.associated?.length?`<p class="muted-note">Associated: ${esc(x.associated.join('; '))}</p>`:''}</div>
    </div>
    <div class="final-case-actions">
      <label>Final classification
        <select class="manual-classification" data-manual-key="${esc(key)}">
          <option value="auto"${!state.manualDecisions[key]?' selected':''}>Automatic</option>
          <option value="matched"${state.manualDecisions[key]?.type==='matched'?' selected':''}>Matched</option>
          <option value="missingPayslip"${state.manualDecisions[key]?.type==='missingPayslip'?' selected':''}>Missing from payslip</option>
          <option value="missingTracker"${state.manualDecisions[key]?.type==='missingTracker'?' selected':''}>Missing from tracker</option>
          <option value="review"${['review','mismatch'].includes(state.manualDecisions[key]?.type)?' selected':''}>Needs review</option>
        </select>
      </label>
      <label>Follow-up status
        <select class="followup-status" data-followup-key="${esc(key)}">
          ${['Open','Submitted','Under Review','Resolved / Paid','Rejected','Not Mine'].map(s=>`<option${f.status===s?' selected':''}>${esc(s)}</option>`).join('')}
        </select>
      </label>
      <label class="followup-note">Note
        <input class="followup-note-input" data-note-key="${esc(key)}" value="${esc(f.note||'')}" placeholder="e.g. Sent to billing 12 Aug">
      </label>
      ${(bucket==='missingPayslip'||bucket==='review')?`<button class="secondary carry-forward-btn" data-carry-key="${esc(key)}">Carry Forward</button>`:'' }<button class="secondary save-followup-btn" data-save-key="${esc(key)}">Save</button>
    </div>
  </div>`;
}
function consultationFinalRows(){
  if(!state.result)return '';
  const rows=[];
  for(const h of HOSPITALS){
    const out=state.result.consultations[h],inp=state.result.inpatientConsultations[h];
    for(const [stream,c] of [['New outpatient',out],['Inpatient',inp]]){
      const tracker=Number(c.trackerQty??0),paid=c.paidQty,diff=paid==null?'—':Number(paid)-tracker;
      const cls=paid==null?'warn-text':diff===0?'ok-text':'bad-text';
      rows.push(`<tr><td>${esc(h.replace('HMG ',''))}</td><td>${esc(stream)}</td><td>${tracker}</td><td>${paid??'Review'}</td><td class="${cls}">${diff==='—'?'—':(diff>0?`+${diff}`:diff)}</td></tr>`);
    }
  }
  return rows.join('');
}
function renderFinal(){
  if(!state.result)return;
  $('finalMonth').textContent=state.result.month;
  const buckets={matched:[],missingPayslip:[],missingTracker:[],review:[]};
  state.result.items.forEach(x=>buckets[normalizedBucketType(x)].push(x));
  $('missingPayslipCount').textContent=buckets.missingPayslip.length;
  $('missingTrackerCount').textContent=buckets.missingTracker.length;
  $('needsReviewCount').textContent=buckets.review.length;
  $('matchedCount').textContent=buckets.matched.length;
  $('finalKpis').innerHTML=[
    ['Matched',buckets.matched.length,''],
    ['Missing from payslip',buckets.missingPayslip.length,'bad'],
    ['Missing from tracker',buckets.missingTracker.length,'warn'],
    ['Needs review',buckets.review.length,'warn']
  ].map(x=>`<article class="kpi ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></article>`).join('');
  $('finalConsultations').innerHTML=`<table class="final-summary-table"><thead><tr><th>Hospital</th><th>Type</th><th>Tracker</th><th>Payslip</th><th>Difference</th></tr></thead><tbody>${consultationFinalRows()}</tbody></table>`;
  const statuses={};Object.values(state.followups).forEach(f=>statuses[f.status]=(statuses[f.status]||0)+1);
  $('followupSummary').innerHTML=`<div class="followup-chips">${['Open','Submitted','Under Review','Resolved / Paid','Rejected','Not Mine'].map(s=>`<span class="followup-chip">${esc(s)} <b>${statuses[s]||0}</b></span>`).join('')}</div>`;
  const render=(id,arr,empty)=>$(id).innerHTML=arr.length?arr.map(finalCaseCard).join(''):`<div class="final-empty">${esc(empty)}</div>`;
  render('finalMissingPayslip',buckets.missingPayslip,'Nothing currently classified as missing from the payslip.');
  render('finalMissingTracker',buckets.missingTracker,'Nothing currently classified as missing from the tracker.');
  render('finalNeedsReview',buckets.review,'No unresolved review items.');
  render('finalMatched',buckets.matched,'No fully matched items yet.');
  document.querySelectorAll('[data-manual-key]').forEach(el=>el.onchange=()=>saveManualDecision(el.dataset.manualKey,el.value));
  document.querySelectorAll('[data-missing-all]').forEach(b=>b.onclick=()=>document.querySelectorAll(`[data-missing-choice="${b.dataset.missingAll}"]`).forEach(x=>x.checked=true));
  document.querySelectorAll('[data-missing-clear]').forEach(b=>b.onclick=()=>document.querySelectorAll(`[data-missing-choice="${b.dataset.missingClear}"]`).forEach(x=>x.checked=false));
  document.querySelectorAll('[data-missing-confirm]').forEach(b=>b.onclick=()=>{
    const key=b.dataset.missingConfirm,item=state.result.items.find(x=>reconItemKey(x)===key);
    if(!item)return;
    const selected=[...document.querySelectorAll(`[data-missing-choice="${key}"]:checked`)].map(el=>({service:el.dataset.service,qty:Number(el.dataset.qty||1)}));
    saveSelectedMissing(item,selected);
  });
  document.querySelectorAll('[data-missing-undo]').forEach(b=>b.onclick=()=>{
    const key=b.dataset.missingUndo;delete state.itemMissingDecisions[key];delete state.manualDecisions[key];
    localStorage.setItem('desktopReconItemMissingDecisionsV1',JSON.stringify(state.itemMissingDecisions));
    localStorage.setItem('desktopReconManualDecisionsV1',JSON.stringify(state.manualDecisions));renderFinal();
  });
  bindTrackerCorrectionPanel($('finalView'));
  document.querySelectorAll('[data-carry-key]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.carryKey,item=state.result.items.find(x=>reconItemKey(x)===key);
    if(item)carryForwardItem(item);
  });
  document.querySelectorAll('[data-save-key]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.saveKey,card=btn.closest('.final-case');
    const status=card.querySelector('[data-followup-key]')?.value||'Open';
    const note=card.querySelector('[data-note-key]')?.value||'';
    saveFollowup(key,status,note);
  });
}
function finalExportRows(openOnly=false){
  if(!state.result)return [];
  return state.result.items.filter(x=>{
    const b=normalizedBucketType(x),f=followupFor(x);
    if(!openOnly)return true;
    return b!=='matched'&&!['Resolved / Paid','Rejected','Not Mine'].includes(f.status);
  }).map(x=>{
    const f=followupFor(x),b=normalizedBucketType(x);
    return {
      month:state.result.month,
      hospital:x.hospital,
      mrn:x.mrn,
      tracker_date:x.date||'',
      final_classification:effectiveLabel(b),
      automatic_classification:effectiveLabel(x.type),
      tracker_services:(x.trackerServices||[]).join('; '),
      payslip_services:(x.payServices||[]).join('; '),
      missing:(x.missing||[]).join('; '),
      payslip_only:(x.extra||[]).join('; '),
      codes:(x.lineItems||[]).map(r=>`${r.code} ${r.name}`).join(' | '),
      followup_status:f.status||'Open',
      followup_note:f.note||'',
      followup_updated:f.updatedAt||''
    };
  });
}
$('exportFinalMissingBtn')?.addEventListener('click',()=>{
  if(!state.result)return setMsg('Run reconciliation first.',true);
  download(`open-missing-items-${state.result.month}.csv`,csv(finalExportRows(true)));
});
$('exportFinalAllBtn')?.addEventListener('click',()=>{
  if(!state.result)return setMsg('Run reconciliation first.',true);
  download(`final-reconciliation-${state.result.month}.csv`,csv(finalExportRows(false)));
});


// v2.8 outstanding/carry-forward engine
function persistOutstanding(){
  localStorage.setItem('desktopReconOutstandingV1',JSON.stringify(state.outstanding));
}
function componentExpected(service,qty){
  const fee=Number(state.fees?.[service]||DEFAULT_FEES[service]||0);
  return {service,qty:Number(qty||0),unitFee:fee,amount:Number(qty||0)*fee};
}
function unpaidComponentsForItem(x){
  return selectedMissingComponents(x).map(c=>componentExpected(c.service,c.qty));
}
function outstandingKeyFor(x){
  return [state.result?.month||'',normalizeHospital(x.hospital),normalizeMrn(x.mrn),x.date||''].join('|');
}
function carryForwardItem(x){
  const components=unpaidComponentsForItem(x);
  if(!components.length){
    alert('No definite unpaid component can be calculated for this item. Keep it in Needs Review until the quantity/code is confirmed.');
    return;
  }
  const key=outstandingKeyFor(x),existing=state.outstanding.find(o=>o.key===key&&['open','laterPaid'].includes(o.state));
  const record={
    key,
    originalMonth:state.result.month,
    hospital:normalizeHospital(x.hospital),
    mrn:normalizeMrn(x.mrn),
    procedureDate:x.date||'',
    trackerServices:x.trackerServices||[],
    components,
    expectedOutstanding:components.reduce((s,c)=>s+Number(c.amount||0),0),
    state:'open',
    createdAt:existing?.createdAt||new Date().toISOString(),
    lastCheckedMonth:state.result.month,
    checkedMonths:[...new Set([...(existing?.checkedMonths||[]),state.result.month])],
    resolvedMonth:existing?.resolvedMonth||'',
    note:followupFor(x).note||existing?.note||'',
    history:[...(existing?.history||[]),{at:new Date().toISOString(),action:'Carried forward',month:state.result.month,amount:components.reduce((s,c)=>s+Number(c.amount||0),0)}]
  };
  if(existing)Object.assign(existing,record);else state.outstanding.push(record);
  persistOutstanding();
  saveFollowup(reconItemKey(x),'Submitted',record.note||'Carried forward for next payslip');
  renderOutstanding();
  alert(`Carried forward ${components.map(c=>`${c.service} ×${c.qty}`).join(', ')} · ${formatSAR(record.expectedOutstanding)}`);
}
function currentPayslipPatient(hospital,mrn){
  return (state.rows?.[hospital]?.patients||[]).find(p=>normalizeMrn(p.mrn)===normalizeMrn(mrn))||null;
}
function paidUnitsForOutstandingComponent(component,pay){
  if(!pay)return 0;
  const service=component.service,unitFee=Number(component.unitFee||state.fees?.[service]||0),lineCount=Number(pay.counts?.[service]||0),amount=Number(pay.amounts?.[service]||0);
  if(['Polypectomy','Clipping','Sclerotherapy','Variceal Banding','Metallic Biliary Stenting'].includes(service)){
    let amountUnits=0;
    if(unitFee>0&&amount>0){const raw=amount/unitFee,rounded=Math.round(raw);if(rounded>=1&&Math.abs(raw-rounded)<=0.03)amountUnits=rounded}
    return Math.max(lineCount,amountUnits);
  }
  return (pay.services||[]).includes(service)?1:0;
}
function checkOutstandingAgainstCurrentPayslip(month){
  if(!month||!Array.isArray(state.outstanding))return;
  for(const o of state.outstanding){
    if(o.state!=='open')continue;
    if(o.originalMonth===month){o.lastCheckedMonth=month;continue}
    const pay=currentPayslipPatient(o.hospital,o.mrn);
    o.lastCheckedMonth=month;o.checkedMonths=[...new Set([...(o.checkedMonths||[]),month])];
    if(!pay){o.history=[...(o.history||[]),{at:new Date().toISOString(),action:'Not found',month}];continue}
    let allPaid=true;
    const remaining=[];
    for(const c of o.components||[]){
      const covered=paidUnitsForOutstandingComponent(c,pay),missing=Math.max(0,Number(c.qty||0)-covered);
      if(missing>0){allPaid=false;remaining.push(componentExpected(c.service,missing))}
    }
    if(allPaid){
      o.state='laterPaid';o.resolvedMonth=month;o.expectedOutstanding=0;
      o.history=[...(o.history||[]),{at:new Date().toISOString(),action:'Found in later payslip',month}];
    }else{
      o.components=remaining;o.expectedOutstanding=remaining.reduce((s,c)=>s+c.amount,0);
      o.history=[...(o.history||[]),{at:new Date().toISOString(),action:'Partially found / still outstanding',month,amount:o.expectedOutstanding}];
    }
  }
  persistOutstanding();
}
function outstandingAgeDays(o){
  const start=new Date((o.procedureDate||`${o.originalMonth}-01`)+'T12:00:00'),now=new Date();
  return Number.isNaN(start.getTime())?null:Math.max(0,Math.floor((now-start)/86400000));
}
function outstandingCard(o){
  const age=outstandingAgeDays(o),amount=(o.components||[]).reduce((s,c)=>s+Number(c.amount||0),0);
  const status=o.state==='laterPaid'?'Found Later':o.state==='resolved'?'Resolved':'Outstanding';
  const comps=(o.components||[]).length?(o.components||[]).map(c=>`<div class="outstanding-component"><b>${esc(c.service)}</b><span>Qty ${c.qty}</span><span>${formatSAR(c.unitFee)} / unit</span><span class="money">${formatSAR(c.amount)}</span></div>`).join(''):'<div class="final-empty">No remaining unpaid components.</div>';
  const history=(o.history||[]).slice(-4).reverse().map(h=>`${new Date(h.at).toLocaleDateString()} · ${esc(h.action)}${h.month?` · ${esc(h.month)}`:''}`).join('<br>');
  return `<div class="outstanding-case">
    <div class="outstanding-head"><div><b>${esc(o.hospital.replace('HMG ',''))} · MRN ${esc(o.mrn)}</b><small>${esc(o.procedureDate||o.originalMonth)} · Original payslip month ${esc(o.originalMonth)}${age!=null?` · ${age} days`:''}</small></div><span class="badge ${o.state==='open'?'bad':'ok'}">${status}</span></div>
    <div class="outstanding-components">${comps}<div class="amount-note"><b>Outstanding:</b> ${formatSAR(amount)} · Checked payslips: ${(o.checkedMonths||[]).join(', ')||'—'}</div></div>
    <div class="outstanding-actions">
      ${o.state==='open'?`<button class="secondary" data-out-resolve="${esc(o.key)}">Mark Resolved</button>`:''}
      ${o.state==='laterPaid'?`<button class="secondary" data-out-reopen="${esc(o.key)}">Reopen</button>`:''}
      <button class="secondary" data-out-delete="${esc(o.key)}">Delete</button>
    </div>
    ${history?`<div class="outstanding-history"><b>Recent history</b><br>${history}</div>`:''}
  </div>`;
}
function renderOutstanding(){
  if(!$('outstandingList'))return;
  const open=state.outstanding.filter(o=>o.state==='open'),later=state.outstanding.filter(o=>o.state==='laterPaid'),resolved=state.outstanding.filter(o=>o.state==='resolved');
  const total=open.reduce((s,o)=>s+Number(o.expectedOutstanding??(o.components||[]).reduce((a,c)=>a+Number(c.amount||0),0)),0);
  $('outstandingTotalAmount').textContent=`${formatSAR(total)} outstanding`;
  $('outstandingKpis').innerHTML=[
    ['Open',open.length,'bad'],['Outstanding amount',formatSAR(total),'bad'],['Found later',later.length,''],['Resolved',resolved.length,'']
  ].map(x=>`<article class="kpi ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></article>`).join('');
  let list=state.outstanding;
  if(state.outstandingFilter==='open')list=open;
  else if(state.outstandingFilter==='laterPaid')list=later;
  else if(state.outstandingFilter==='resolved')list=resolved;
  $('outstandingList').innerHTML=list.length?list.slice().sort((a,b)=>String(b.originalMonth).localeCompare(String(a.originalMonth))).map(outstandingCard).join(''):'<div class="final-empty">No items in this view.</div>';
  document.querySelectorAll('[data-out-resolve]').forEach(b=>b.onclick=()=>{const o=state.outstanding.find(x=>x.key===b.dataset.outResolve);if(o){o.state='resolved';o.history=[...(o.history||[]),{at:new Date().toISOString(),action:'Manually resolved'}];persistOutstanding();renderOutstanding()}});
  document.querySelectorAll('[data-out-reopen]').forEach(b=>b.onclick=()=>{const o=state.outstanding.find(x=>x.key===b.dataset.outReopen);if(o){o.state='open';o.resolvedMonth='';o.history=[...(o.history||[]),{at:new Date().toISOString(),action:'Reopened'}];persistOutstanding();renderOutstanding()}});
  document.querySelectorAll('[data-out-delete]').forEach(b=>b.onclick=()=>{if(confirm('Delete this outstanding record?')){state.outstanding=state.outstanding.filter(x=>x.key!==b.dataset.outDelete);persistOutstanding();renderOutstanding()}});
}
document.querySelectorAll('[data-outstanding-filter]').forEach(b=>b.onclick=()=>{state.outstandingFilter=b.dataset.outstandingFilter;document.querySelectorAll('[data-outstanding-filter]').forEach(x=>x.classList.toggle('active',x===b));renderOutstanding()});
$('exportOutstandingBtn')?.addEventListener('click',()=>{
  const rows=state.outstanding.map(o=>({original_month:o.originalMonth,hospital:o.hospital,mrn:o.mrn,procedure_date:o.procedureDate,state:o.state,missing_items:(o.components||[]).map(c=>`${c.service} x${c.qty}`).join('; '),outstanding_amount:(o.components||[]).reduce((s,c)=>s+Number(c.amount||0),0),last_checked:o.lastCheckedMonth,checked_months:(o.checkedMonths||[]).join('; '),resolved_month:o.resolvedMonth||'',note:o.note||''}));
  download('outstanding-payments.csv',csv(rows));
});
function downloadJson(name,obj){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}
$('exportReconBackupBtn')?.addEventListener('click',()=>downloadJson(`hmg-reconciliation-backup-${new Date().toISOString().slice(0,10)}.json`,{
  format:'hmg-reconciliation-backup',version:1,createdAt:new Date().toISOString(),mappings:state.mappings,manualDecisions:state.manualDecisions,followups:state.followups,outstanding:state.outstanding,itemMissingDecisions:state.itemMissingDecisions,trackerCorrections:state.trackerCorrections,codeDescriptions:state.codeDescriptions
}));
$('importReconBackupFile')?.addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const data=JSON.parse(await f.text());if(data.format!=='hmg-reconciliation-backup')throw new Error('Not a reconciliation backup.');
    if(data.mappings){state.mappings=normalizeMappings(data.mappings);localStorage.setItem('desktopReconMappingsV1',JSON.stringify(state.mappings))}
    state.manualDecisions=data.manualDecisions||{};state.followups=data.followups||{};state.outstanding=Array.isArray(data.outstanding)?data.outstanding:[];state.itemMissingDecisions=data.itemMissingDecisions||{};state.trackerCorrections=data.trackerCorrections||{};state.codeDescriptions=data.codeDescriptions||{};
    localStorage.setItem('desktopReconManualDecisionsV1',JSON.stringify(state.manualDecisions));localStorage.setItem('desktopReconFollowupsV1',JSON.stringify(state.followups));localStorage.setItem('desktopReconItemMissingDecisionsV1',JSON.stringify(state.itemMissingDecisions));localStorage.setItem('desktopReconTrackerCorrectionsV1',JSON.stringify(state.trackerCorrections));localStorage.setItem('desktopReconCodeDescriptionsV1',JSON.stringify(state.codeDescriptions));persistOutstanding();renderMappings();renderOutstanding();if(state.result)renderFinal();alert('Reconciliation backup restored.');
  }catch(err){alert(err.message||'Unable to restore reconciliation backup.')}
});
renderOutstanding();

$('addMappingBtn')?.addEventListener('click',()=>{const c=canonicalCode($('mapCode')?.value||'');if(!c||c==='0')return;const service=$('mapService')?.value||'Ignore',mode=$('mapMode')?.value||simpleModeForService(service,false);state.mappings[c]={service,services:mode==='exclude'?[]:[service],mode,label:service};localStorage.setItem('desktopReconMappingsV1',JSON.stringify(state.mappings));if($('mapCode'))$('mapCode').value='';renderMappings()});



// v2.12 correction layer for forgotten/wrong tracker inputs
function correctionKey(x){return reconItemKey(x)}
function correctionFor(x){
  return state.trackerCorrections[correctionKey(x)]||{replace:{},additions:[],removed:[]};
}
function saveCorrection(x,corr){
  state.trackerCorrections[correctionKey(x)]=corr;
  localStorage.setItem('desktopReconTrackerCorrectionsV1',JSON.stringify(state.trackerCorrections));
  renderFinal();renderQuickWorkspace();
}
function effectiveTrackerCounts(x){
  const base={...(x.trackerCounts||Object.fromEntries((x.trackerServices||[]).map(s=>[s,1])))};
  const corr=correctionFor(x);
  for(const [service,qty] of Object.entries(corr.replace||{})){
    if(qty==null||Number(qty)<=0)delete base[service];
    else base[service]=Number(qty);
  }
  for(const s of corr.removed||[])delete base[s];
  for(const a of corr.additions||[]){
    base[a.service]=(base[a.service]||0)+Number(a.qty||1);
  }
  return base;
}
function effectiveTrackerServices(x){return Object.keys(effectiveTrackerCounts(x))}
function effectiveCandidateMissingComponents(x){
  const counts=effectiveTrackerCounts(x);
  const payServices=new Set(x.payServices||[]);
  const reviews=Object.fromEntries((x.review||[]).map(a=>[a.service,a]));
  const out=[];
  for(const [service,expected] of Object.entries(counts)){
    const a=reviews[service];
    if(a){
      const q=Math.max(0,Number(expected)-Number(a.paidUnits||a.paidCount||0));
      if(q>0)out.push({service,qty:q});
    }else if(!payServices.has(service)){
      out.push({service,qty:Number(expected||1)});
    }
  }
  return out;
}
function correctionSummaryHtml(x){
  const corr=correctionFor(x),parts=[];
  for(const [s,q] of Object.entries(corr.replace||{}))parts.push(`${s} → ×${q}`);
  for(const s of corr.removed||[])parts.push(`Removed ${s}`);
  for(const a of corr.additions||[])parts.push(`Added ${a.service} ×${a.qty||1}`);
  return parts.length?`<div class="correction-summary"><b>Tracker corrected</b><span class="correction-badge">Reconciliation only</span><br>${parts.map(esc).join(' · ')}</div>`:'';
}
function trackerCorrectionPanel(x){
  const key=correctionKey(x),counts=effectiveTrackerCounts(x),corr=correctionFor(x);
  const services=[...new Set([...SERVICES,'Clipping','Polypectomy','Consultation','Inpatient Consultation'])];
  const options=services.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
  const existing=Object.entries(counts).map(([s,q])=>`<div class="manual-entry-row">
    <div><b>${esc(s)}</b><div class="manual-kind">Current reconciliation quantity</div></div>
    <input type="number" min="0" step="1" value="${q}" data-correct-qty="${esc(key)}" data-service="${esc(s)}">
    <button class="secondary" data-remove-service="${esc(key)}" data-service="${esc(s)}">Remove</button>
  </div>`).join('');
  const additions=(corr.additions||[]).map((a,i)=>`<div class="manual-entry-row">
    <div><b>${esc(a.service)}</b><div class="manual-kind">Manual addition</div></div>
    <span>×${a.qty||1}</span>
    <button class="secondary" data-delete-addition="${esc(key)}" data-index="${i}">Delete</button>
  </div>`).join('');
  return `<div class="tracker-correction-panel" data-correction-panel="${esc(key)}">
    <h4>Correct tracker input / add forgotten item</h4>
    <div class="tracker-correction-grid">
      <label>Item
        <select data-add-service="${esc(key)}">${options}</select>
      </label>
      <label>Type
        <select data-add-type="${esc(key)}"><option value="main">Main procedure</option><option value="additional">Additional procedure</option></select>
      </label>
      <label>Qty
        <input type="number" min="1" step="1" value="1" data-add-qty="${esc(key)}">
      </label>
      <button class="primary" data-add-manual="${esc(key)}">Add item</button>
    </div>
    <div class="manual-entry-list">${existing}${additions}</div>
    <div class="quick-correct-actions">
      <button class="primary" data-save-correction="${esc(key)}">Save correction</button>
      <button class="secondary" data-reset-correction="${esc(key)}">Restore original tracker</button>
    </div>
    <div class="amount-note">Changes here affect reconciliation only. The original tracker record is preserved.</div>
  </div>`;
}
function bindTrackerCorrectionPanel(scope=document){
  scope.querySelectorAll('[data-add-manual]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.addManual,item=state.result.items.find(x=>correctionKey(x)===key);if(!item)return;
    const service=scope.querySelector(`[data-add-service="${key}"]`)?.value;
    const qty=Math.max(1,Number(scope.querySelector(`[data-add-qty="${key}"]`)?.value||1));
    const type=scope.querySelector(`[data-add-type="${key}"]`)?.value||'additional';
    const corr=correctionFor(item);corr.additions=[...(corr.additions||[]),{service,qty,type,at:new Date().toISOString()}];saveCorrection(item,corr);
  });
  scope.querySelectorAll('[data-delete-addition]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.deleteAddition,item=state.result.items.find(x=>correctionKey(x)===key);if(!item)return;
    const corr=correctionFor(item);corr.additions=(corr.additions||[]).filter((_,i)=>i!==Number(btn.dataset.index));saveCorrection(item,corr);
  });
  scope.querySelectorAll('[data-remove-service]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.removeService,item=state.result.items.find(x=>correctionKey(x)===key);if(!item)return;
    const corr=correctionFor(item);corr.removed=[...new Set([...(corr.removed||[]),btn.dataset.service])];saveCorrection(item,corr);
  });
  scope.querySelectorAll('[data-save-correction]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.saveCorrection,item=state.result.items.find(x=>correctionKey(x)===key);if(!item)return;
    const corr=correctionFor(item),replace={...(corr.replace||{})};
    scope.querySelectorAll(`[data-correct-qty="${key}"]`).forEach(inp=>replace[inp.dataset.service]=Math.max(0,Number(inp.value||0)));
    corr.replace=replace;saveCorrection(item,corr);
  });
  scope.querySelectorAll('[data-reset-correction]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.resetCorrection,item=state.result.items.find(x=>correctionKey(x)===key);if(!item)return;
    delete state.trackerCorrections[key];localStorage.setItem('desktopReconTrackerCorrectionsV1',JSON.stringify(state.trackerCorrections));renderFinal();renderQuickWorkspace();
  });
}

// v2.11 simplified review workspace
function quickBuckets(){
  const b={missingPayslip:[],missingTracker:[],review:[],matched:[]};
  if(!state.result)return b;
  state.result.items.forEach(x=>b[normalizedBucketType(x)].push(x));
  return b;
}
function quickServicesHtml(x){
  const counts=effectiveTrackerCounts(x),selected=selectedMissingComponents(x),missingMap=Object.fromEntries(selected.map(c=>[c.service,c.qty]));
  const services=[...new Set([...Object.keys(counts),...(x.payServices||[])])];
  if(!services.length)return '<div class="final-empty">No procedure family identified.</div>';
  return services.map(s=>{
    const q=Number(counts[s]||1),m=Number(missingMap[s]||0);
    return `<div class="quick-service"><span>${esc(s)}${q>1?` ×${q}`:''}</span><span class="${m?'missing':'paid'}">${m?`${m} MISSING`:'✓ Paid / found'}</span></div>`;
  }).join('');
}
function renderQuickWorkspace(){
  if(!$('quickCaseWorkspace')||!state.result)return;
  const b=quickBuckets();
  $('quickMissingPay').textContent=b.missingPayslip.length;$('quickMissingTracker').textContent=b.missingTracker.length;$('quickReview').textContent=b.review.length;$('quickMatched').textContent=b.matched.length;
  const unresolved=b.missingPayslip.length+b.missingTracker.length+b.review.length,total=state.result.items.length;
  $('reviewProgress').textContent=unresolved?`${unresolved} unresolved`:`Review complete · ${total} cases`;
  const arr=b[state.quickBucket]||[];
  if(state.quickIndex>=arr.length)state.quickIndex=Math.max(0,arr.length-1);
  document.querySelectorAll('[data-quick-bucket]').forEach(x=>x.classList.toggle('active',x.dataset.quickBucket===state.quickBucket));
  if(!arr.length){$('quickCaseWorkspace').innerHTML='<div class="final-empty">No cases in this category.</div>';return}
  const x=arr[state.quickIndex],key=reconItemKey(x),bucket=normalizedBucketType(x),components=selectedMissingComponents(x);
  const amount=components.reduce((s,c)=>s+Number(state.fees?.[c.service]||DEFAULT_FEES[c.service]||0)*Number(c.qty||0),0);
  $('quickCaseWorkspace').innerHTML=`<div class="quick-case">
    <div class="quick-case-top"><div><b>MRN ${esc(x.mrn||'—')} · ${esc(x.hospital.replace('HMG ',''))}</b><small>${esc(x.date||'No tracker date')}</small></div><span class="badge ${bucket==='matched'?'ok':bucket==='review'?'warn':'bad'}">${esc(effectiveLabel(bucket))}</span></div>
    <div class="quick-services">${quickServicesHtml(x)}${amount>0?`<div class="amount-note"><b>Estimated missing value: ${formatSAR(amount)}</b></div>`:''}</div>
    ${candidateMissingComponents(x).length>1?`<div class="quick-detail">${missingSelector(x)}</div>`:''}${correctionSummaryHtml(x)}${trackerCorrectionPanel(x)}
    <div class="quick-case-actions">
      ${bucket==='missingPayslip'?`<button class="primary" data-quick-confirm="${esc(key)}">Confirm Missing & Carry Forward</button><button class="secondary" data-quick-notmissing="${esc(key)}">Not Missing</button>`:''}
      ${bucket==='missingTracker'?`<button class="primary" data-quick-reviewed="${esc(key)}">Reviewed / Accept</button>`:''}
      ${bucket==='review'?`<button class="primary" data-quick-review="${esc(key)}">Open Detailed Review</button><button class="secondary" data-quick-notmissing="${esc(key)}">Not Missing</button>`:''}
      <button class="secondary" data-quick-details="${esc(key)}">Show Billing Details</button>
    </div>
  </div><div class="quick-nav"><button class="secondary" id="quickPrev">Previous</button><span>Case ${state.quickIndex+1} of ${arr.length}</span><button class="secondary" id="quickNext">Next</button></div>`;
  $('quickPrev').onclick=()=>{state.quickIndex=Math.max(0,state.quickIndex-1);renderQuickWorkspace()};
  $('quickNext').onclick=()=>{state.quickIndex=Math.min(arr.length-1,state.quickIndex+1);renderQuickWorkspace()};
  document.querySelectorAll('[data-quick-confirm]').forEach(btn=>btn.onclick=()=>{const item=state.result.items.find(v=>reconItemKey(v)===btn.dataset.quickConfirm);if(item){carryForwardItem(item);state.quickIndex=Math.min(state.quickIndex,(quickBuckets()[state.quickBucket]||[]).length-1);renderQuickWorkspace()}});
  document.querySelectorAll('[data-quick-notmissing]').forEach(btn=>btn.onclick=()=>{const k=btn.dataset.quickNotmissing;state.manualDecisions[k]={type:'matched',updatedAt:new Date().toISOString()};state.itemMissingDecisions[k]=[];localStorage.setItem('desktopReconManualDecisionsV1',JSON.stringify(state.manualDecisions));localStorage.setItem('desktopReconItemMissingDecisionsV1',JSON.stringify(state.itemMissingDecisions));renderFinal();renderQuickWorkspace()});
  document.querySelectorAll('[data-quick-reviewed]').forEach(btn=>btn.onclick=()=>{const k=btn.dataset.quickReviewed;state.manualDecisions[k]={type:'matched',updatedAt:new Date().toISOString()};localStorage.setItem('desktopReconManualDecisionsV1',JSON.stringify(state.manualDecisions));renderFinal();renderQuickWorkspace()});
  document.querySelectorAll('[data-quick-review]').forEach(btn=>btn.onclick=()=>{document.querySelector(`[data-final-key="${btn.dataset.quickReview}"]`)?.scrollIntoView({behavior:'smooth',block:'center'})});
  document.querySelectorAll('[data-quick-details]').forEach(btn=>btn.onclick=()=>{const item=state.result.items.find(v=>reconItemKey(v)===btn.dataset.quickDetails);if(item)alert((item.lineItems||[]).map(r=>`${r.code} · ${r.name} · ${formatSAR(r.amount||0)}`).join('\n')||'No billing code lines available.')});
  // bind selector controls inside quick card
  document.querySelectorAll('#quickCaseWorkspace [data-missing-all]').forEach(b=>b.onclick=()=>document.querySelectorAll(`#quickCaseWorkspace [data-missing-choice="${b.dataset.missingAll}"]`).forEach(x=>x.checked=true));
  document.querySelectorAll('#quickCaseWorkspace [data-missing-clear]').forEach(b=>b.onclick=()=>document.querySelectorAll(`#quickCaseWorkspace [data-missing-choice="${b.dataset.missingClear}"]`).forEach(x=>x.checked=false));
  document.querySelectorAll('#quickCaseWorkspace [data-missing-confirm]').forEach(b=>b.onclick=()=>{const k=b.dataset.missingConfirm,item=state.result.items.find(x=>reconItemKey(x)===k);if(!item)return;const selected=[...document.querySelectorAll(`#quickCaseWorkspace [data-missing-choice="${k}"]:checked`)].map(el=>({service:el.dataset.service,qty:Number(el.dataset.qty||1)}));saveSelectedMissing(item,selected);renderQuickWorkspace()});
  bindTrackerCorrectionPanel($('quickCaseWorkspace'));
}
document.querySelectorAll('[data-quick-bucket]').forEach(b=>b.onclick=()=>{state.quickBucket=b.dataset.quickBucket;state.quickIndex=0;renderQuickWorkspace()});


// v2.13 receptionist unpaid-procedure PDF
function billingCodesForService(service){
  const codes=[];
  for(const [code,m] of Object.entries(state.mappings||{})){
    const services=new Set([m.service,...(m.services||[])].filter(Boolean));
    if(services.has(service)&&!['exclude','associated','consultation','inpatient'].includes(m.mode)){
      codes.push({code,description:exactBillingDescription(code,m)});
    }
  }
  return codes;
}
function unpaidPdfRows(){
  const rows=[];
  for(const o of state.outstanding||[]){
    if(o.state!=='open')continue;
    for(const c of o.components||[]){
      const qty=Math.max(1,Number(c.qty||1)),codes=billingCodesForService(c.service);
      if(codes.length){
        for(const cm of codes)rows.push({mrn:o.mrn||'',date:o.procedureDate||o.originalMonth||'',procedure:cm.description||'Description not mapped',code:cm.code,quantity:qty,hospital:o.hospital||''});
      }else{
        rows.push({mrn:o.mrn||'',date:o.procedureDate||o.originalMonth||'',procedure:'Description not mapped',code:'Code not mapped',quantity:qty,hospital:o.hospital||''});
      }
    }
  }
  return rows.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.mrn).localeCompare(String(b.mrn))||String(a.procedure).localeCompare(String(b.procedure)));
}
function exportUnpaidPdf(){
  const rows=unpaidPdfRows();
  if(!rows.length){alert('There are no confirmed unpaid procedures to export.');return}
  const month=state.result?.month||'Current reconciliation';
  const hospitals=[...new Set(rows.map(r=>r.hospital.replace('HMG ','')))].join(' + ');
  const generated=new Date().toLocaleDateString();
  const body=rows.map(r=>`<tr><td>${esc(r.mrn)}</td><td>${esc(r.date)}</td><td>${esc(r.procedure)}</td><td>${esc(r.code)}</td><td class="qty">${r.quantity}</td></tr>`).join('');
  const w=window.open('','_blank');
  if(!w){alert('Please allow pop-ups for this page, then try Export Unpaid PDF again.');return}
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Unpaid Procedures for Review - ${esc(month)}</title>
  <style>
    @page{size:A4;margin:14mm}
    *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:11px}
    h1{font-size:18px;margin:0 0 5px}.meta{font-size:10px;color:#555;margin-bottom:14px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:7px 6px;text-align:left;vertical-align:top}
    th{background:#f0f0f0;font-size:10px}.qty{text-align:center;width:60px}
    .footer{margin-top:10px;font-size:10px;color:#555}
    .no-print{margin-bottom:12px;padding:9px 12px;border:0;background:#111;color:white;border-radius:6px;cursor:pointer}
    @media print{.no-print{display:none}}
  </style></head><body>
  <button class="no-print" onclick="window.print()">Save / Print PDF</button>
  <h1>Unpaid Procedures for Review</h1>
  <div class="meta"><b>Hospital:</b> ${esc(hospitals||'—')} &nbsp;&nbsp; <b>Reconciliation month:</b> ${esc(month)} &nbsp;&nbsp; <b>Generated:</b> ${esc(generated)}</div>
  <table><thead><tr><th>MRN</th><th>Date</th><th>Exact Procedure Name</th><th>Billing Code</th><th>Quantity</th></tr></thead><tbody>${body}</tbody></table>
  <div class="footer">Confirmed unpaid procedures/additional procedures only. Total rows: ${rows.length}</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script>
  </body></html>`);
  w.document.close();
}
$('exportUnpaidPdfBtn')?.addEventListener('click',exportUnpaidPdf);


// v3.0 encrypted reconciliation backup
function encMsg(text,bad=false){
  const el=$('encryptedReconMessage');if(!el)return;
  el.textContent=text;el.style.color=bad?'#b42318':'#126b47';
}
function reconciliationBackupPayload(){
  return {
    format:'hmg-reconciliation-secure-backup',
    version:1,
    createdAt:new Date().toISOString(),
    mappings:state.mappings||{},
    codeDescriptions:state.codeDescriptions||{},
    manualDecisions:state.manualDecisions||{},
    itemMissingDecisions:state.itemMissingDecisions||{},
    trackerCorrections:state.trackerCorrections||{},
    followups:state.followups||{},
    outstanding:state.outstanding||[]
  };
}
async function deriveBackupKey(password,salt){
  const enc=new TextEncoder();
  const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptBackupObject(obj,password){
  const enc=new TextEncoder(),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await deriveBackupKey(password,salt);
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(obj))));
  const magic=enc.encode('HMGREC1');
  const out=new Uint8Array(magic.length+salt.length+iv.length+ciphertext.length);
  out.set(magic,0);out.set(salt,magic.length);out.set(iv,magic.length+salt.length);out.set(ciphertext,magic.length+salt.length+iv.length);
  return out;
}
async function decryptBackupBytes(bytes,password){
  const dec=new TextDecoder(),magic=dec.decode(bytes.slice(0,7));
  if(magic!=='HMGREC1')throw new Error('This is not an HMG encrypted reconciliation backup.');
  const salt=bytes.slice(7,23),iv=bytes.slice(23,35),cipher=bytes.slice(35),key=await deriveBackupKey(password,salt);
  let plain;
  try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher)}
  catch{throw new Error('Unable to decrypt backup. Check the password.')}
  const data=JSON.parse(dec.decode(plain));
  if(data.format!=='hmg-reconciliation-secure-backup')throw new Error('Encrypted file does not contain a valid reconciliation backup.');
  return data;
}
function applySecureBackup(data){
  if(data.mappings){state.mappings=normalizeMappings(data.mappings);localStorage.setItem('desktopReconMappingsV1',JSON.stringify(state.mappings))}
  if('codeDescriptions' in state){state.codeDescriptions=data.codeDescriptions||{};localStorage.setItem('desktopReconCodeDescriptionsV1',JSON.stringify(state.codeDescriptions))}
  state.manualDecisions=data.manualDecisions||{};
  state.itemMissingDecisions=data.itemMissingDecisions||{};
  state.trackerCorrections=data.trackerCorrections||{};
  state.followups=data.followups||{};
  state.outstanding=Array.isArray(data.outstanding)?data.outstanding:[];
  localStorage.setItem('desktopReconManualDecisionsV1',JSON.stringify(state.manualDecisions));
  localStorage.setItem('desktopReconItemMissingDecisionsV1',JSON.stringify(state.itemMissingDecisions));
  localStorage.setItem('desktopReconTrackerCorrectionsV1',JSON.stringify(state.trackerCorrections));
  localStorage.setItem('desktopReconFollowupsV1',JSON.stringify(state.followups));
  localStorage.setItem('desktopReconOutstandingV1',JSON.stringify(state.outstanding));
  renderMappings();renderOutstanding();if(state.result){renderFinal();if(typeof renderQuickWorkspace==='function')renderQuickWorkspace()}
}
$('exportEncryptedReconBtn')?.addEventListener('click',async()=>{
  const password=$('encryptedReconPassword')?.value||'';
  if(password.length<6)return encMsg('Use a password of at least 6 characters.',true);
  if(!window.crypto?.subtle)return encMsg('This browser does not support secure Web Crypto.',true);
  try{
    encMsg('Encrypting backup…');
    const bytes=await encryptBackupObject(reconciliationBackupPayload(),password);
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));
    a.download=`hmg-reconciliation-${new Date().toISOString().slice(0,10)}.hmgenc`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    encMsg('Encrypted reconciliation backup exported.');
  }catch(err){encMsg(err.message||'Unable to create encrypted backup.',true)}
});
$('importEncryptedReconFile')?.addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  const password=$('encryptedReconPassword')?.value||'';
  if(password.length<6){e.target.value='';return encMsg('Enter the backup password first.',true)}
  try{
    encMsg('Decrypting backup…');
    const data=await decryptBackupBytes(new Uint8Array(await f.arrayBuffer()),password);
    applySecureBackup(data);encMsg('Encrypted reconciliation backup restored successfully.');
  }catch(err){encMsg(err.message||'Unable to restore encrypted backup.',true)}
  finally{e.target.value=''}
});

// Improved month selector
function monthLabelV32(v){if(!/^\d{4}-\d{2}$/.test(v||''))return 'Choose month';const [y,m]=v.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString(undefined,{month:'long',year:'numeric'})}
function syncMonthV32(){if($('monthDisplayLabel')&&$('monthInput'))$('monthDisplayLabel').textContent=monthLabelV32($('monthInput').value)}
function shiftMonthV32(delta){const i=$('monthInput');if(!i)return;const v=/^\d{4}-\d{2}$/.test(i.value)?i.value:monthNow();let [y,m]=v.split('-').map(Number);const d=new Date(y,m-1+delta,1);i.value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;i.dispatchEvent(new Event('change',{bubbles:true}));syncMonthV32()}
$('prevMonthBtn')?.addEventListener('click',()=>shiftMonthV32(-1));
$('nextMonthBtn')?.addEventListener('click',()=>shiftMonthV32(1));
$('currentMonthBtn')?.addEventListener('click',()=>{if($('monthInput')){$('monthInput').value=monthNow();$('monthInput').dispatchEvent(new Event('change',{bubbles:true}));syncMonthV32()}});
$('monthDisplayBtn')?.addEventListener('click',()=>{const i=$('monthInput');if(!i)return;if(typeof i.showPicker==='function'){try{i.showPicker()}catch{i.focus()}}else i.focus()});
$('monthInput')?.addEventListener('change',syncMonthV32);syncMonthV32();
