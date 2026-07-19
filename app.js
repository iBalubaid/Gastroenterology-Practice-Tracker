const CLINIC_KEY="dailyClinicTrackerEntriesV1", ENDO_KEY="hmgEndoscopyEntriesV1", THEME_KEY="dailyClinicTrackerTheme", INCOME_SETTINGS_KEY="practiceIncomeSettingsV1", INCOME_PASSWORD_KEY="practiceIncomePasswordHashV1";
const LOCAL_BACKUPS_KEY="practiceAutomaticBackupsV1", GOOGLE_BACKUP_SETTINGS_KEY="practiceGoogleBackupSettingsV1", GOOGLE_DRIVE_FILE_ID_KEY="practiceGoogleDriveBackupFileIdV1";
const SUPABASE_URL="https://xfjybwpyhnlcshhdruba.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_Qg1b19jHxunP69uvlYGBmQ_RgtKh6u-";
const SUPABASE_SYNC_META_KEY="practiceSupabaseSyncMetaV1";
const clinicState={entries:load(CLINIC_KEY),search:"",filter:""};
const endoState={entries:load(ENDO_KEY),search:"",filter:""};
const statsState={period:'all',hospital:'all',from:'',to:''};
const $=id=>document.getElementById(id);

function activateModule(moduleId,tab=null){
  document.querySelectorAll('.module-tab,.module-panel').forEach(x=>x.classList.remove('active'));
  const targetTab=tab||document.querySelector(`.module-tab[data-module="${moduleId}"]`);
  if(targetTab&&!targetTab.classList.contains('hidden'))targetTab.classList.add('active');
  $(moduleId)?.classList.add('active');
}
document.querySelectorAll('.module-tab').forEach(btn=>btn.addEventListener('click',()=>activateModule(btn.dataset.module,btn)));
applyTheme();$('themeToggle').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem(THEME_KEY,document.body.classList.contains('dark')?'dark':'light');updateThemeButton();queueCloudSettingsSync()};

function initStatsFilters(){
  if(!$('statsPeriod')||!$('statsHospital'))return;
  $('statsPeriod').onchange=e=>{statsState.period=e.target.value;toggleCustomStatsDates();renderClinic();renderEndo()};
  $('statsHospital').onchange=e=>{statsState.hospital=e.target.value;renderClinic();renderEndo()};
  $('statsFrom').onchange=e=>{statsState.from=e.target.value;renderClinic();renderEndo()};
  $('statsTo').onchange=e=>{statsState.to=e.target.value;renderClinic();renderEndo()};
  toggleCustomStatsDates();
}
function toggleCustomStatsDates(){const show=statsState.period==='custom';$('statsFromGroup')?.classList.toggle('hidden',!show);$('statsToGroup')?.classList.toggle('hidden',!show)}
function inStatsPeriod(date){
  if(!date)return false;
  const now=new Date(),d=new Date(date+'T00:00:00');
  if(statsState.period==='year')return d.getFullYear()===now.getFullYear();
  if(statsState.period==='month')return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
  if(statsState.period==='custom'){
    if(statsState.from&&date<statsState.from)return false;
    if(statsState.to&&date>statsState.to)return false;
  }
  return true;
}
function clinicHospital(entry){return entry.clinic.includes('Mohammadiya')?'HMG Mohammadiya':entry.clinic.includes('Fayhaa')?'HMG Fayhaa':''}
function filteredClinicStats(){return clinicState.entries.filter(e=>inStatsPeriod(e.date)&&(statsState.hospital==='all'||clinicHospital(e)===statsState.hospital))}
function filteredEndoStats(){return endoState.entries.filter(e=>inStatsPeriod(e.date)&&(statsState.hospital==='all'||e.hospital===statsState.hospital))}

// Clinic module
const clinicForm=$('trackerForm');
function initClinic(){ $('date').value=today(); updateDay('date','day'); updateClinicVisibility(); renderClinic(); }
$('date').onchange=()=>updateDay('date','day'); $('clinic').onchange=updateClinicVisibility; $('newConsultations').oninput=updatePatientTotal; $('followUps').oninput=updatePatientTotal; clinicForm.onsubmit=saveClinic; $('resetFormBtn').onclick=resetClinic; $('exportBtn').onclick=exportClinic; $('clearAllBtn').onclick=clearClinic;
$('searchInput').oninput=e=>{clinicState.search=e.target.value.toLowerCase();renderClinicRows()}; $('clinicFilter').onchange=e=>{clinicState.filter=e.target.value;renderClinicRows()};
function isInpatient(v=$('clinic').value){return v.startsWith('Inpatient Consultation')}
function updatePatientTotal(){if(isInpatient()){ $('totalPatients').value=''; return }const n=Math.max(0,Number($('newConsultations').value||0)),f=Math.max(0,Number($('followUps').value||0));$('totalPatients').value=n+f}
function updateClinicVisibility(){const x=isInpatient();$('duration').disabled=x;$('totalPatients').disabled=x;if(x){$('duration').value='';$('totalPatients').value=''}else{updatePatientTotal()}$('duration').required=!x;$('durationGroup').classList.toggle('disabled-field',x);$('totalPatientsGroup').classList.toggle('disabled-field',x)}
function saveClinic(e){e.preventDefault();$('formMessage').textContent='';const inpatient=isInpatient(),duration=inpatient?null:Number($('duration').value),n=Number($('newConsultations').value||0),f=Number($('followUps').value||0);if(!$('date').value||!$('clinic').value)return msg('formMessage','Please select a date and clinic/service.');if(!Number.isInteger(n)||n<0||!Number.isInteger(f)||f<0)return msg('formMessage','New consultations and follow-up patients must be whole numbers of zero or more.');if(!inpatient&&(!duration||duration<=0))return msg('formMessage','Please enter the clinic duration.');const total=inpatient?null:n+f;if(!inpatient)$('totalPatients').value=total;const item={id:$('editingId').value||uid(),date:$('date').value,day:getDay($('date').value),clinic:$('clinic').value,duration,totalPatients:total,newConsultations:n,followUps:f,updatedAt:new Date().toISOString()};upsert(clinicState.entries,item);persist(CLINIC_KEY,clinicState.entries);cloudUpsertRecord('clinic_records',item);resetClinic();renderClinic()}
function resetClinic(){clinicForm.reset();$('editingId').value='';$('date').value=today();updateDay('date','day');$('newConsultations').value=0;$('followUps').value=0;$('submitLabel').textContent='Save entry';$('formMessage').textContent='';updateClinicVisibility();updatePatientTotal()}
function editClinic(id){const x=clinicState.entries.find(e=>e.id===id);if(!x)return;$('editingId').value=x.id;$('date').value=x.date;updateDay('date','day');$('clinic').value=x.clinic;$('newConsultations').value=x.newConsultations;$('followUps').value=x.followUps;updateClinicVisibility();$('duration').value=x.duration??'';updatePatientTotal();$('submitLabel').textContent='Update entry';scrollTo(0,0)}
function renderClinic(){renderClinicRows();if(incomeUnlocked)renderIncomeDashboard();const statsEntries=filteredClinicStats();const t=statsEntries.reduce((a,e)=>({entries:a.entries+1,patients:a.patients+(e.totalPatients??e.newConsultations+e.followUps),new:a.new+e.newConsultations,follow:a.follow+e.followUps,hours:a.hours+(e.duration??0)}),{entries:0,patients:0,new:0,follow:0,hours:0});$('statEntries').textContent=t.entries;$('statPatients').textContent=t.patients;$('statNew').textContent=t.new;$('statFollowUps').textContent=t.follow;$('statHours').textContent=formatNum(t.hours);renderHospitalClinicStats(statsEntries);renderMonthlyClinicChart(statsEntries);if(incomeUnlocked)renderPerformanceDashboard()}
function renderHospitalClinicStats(source=filteredClinicStats()){
  const configs=[
    {hospital:'HMG Fayhaa',prefix:'clinicFayhaa'},
    {hospital:'HMG Mohammadiya',prefix:'clinicMohammadiya'}
  ];
  configs.forEach(({hospital,prefix})=>{
    const outpatient=source.filter(e=>e.clinic===hospital);
    const inpatientName=`Inpatient Consultation ${hospital}`;
    const inpatient=source.filter(e=>e.clinic===inpatientName);
    const outTotals=outpatient.reduce((a,e)=>({
      patients:a.patients+(e.totalPatients??((e.newConsultations||0)+(e.followUps||0))),
      newConsultations:a.newConsultations+(e.newConsultations||0),
      followUps:a.followUps+(e.followUps||0),
      hours:a.hours+(e.duration||0)
    }),{patients:0,newConsultations:0,followUps:0,hours:0});
    const inpatientConsultations=inpatient.reduce((sum,e)=>sum+(e.newConsultations||0)+(e.followUps||0),0);
    $(prefix+'Patients').textContent=outTotals.patients;
    $(prefix+'Inpatient').textContent=inpatientConsultations;
    $(prefix+'Entries').textContent=outpatient.length;
    $(prefix+'Hours').textContent=formatNum(outTotals.hours);
    $(prefix+'New').textContent=outTotals.newConsultations;
    $(prefix+'FollowUps').textContent=outTotals.followUps;
    $(prefix+'InpatientEntries').textContent=inpatient.length;
  });
}
function renderClinicRows(){const list=[...clinicState.entries].filter(e=>(!clinicState.filter||e.clinic===clinicState.filter)&&(!clinicState.search||`${e.date} ${e.clinic}`.toLowerCase().includes(clinicState.search))).sort(sortDesc);$('recordsBody').innerHTML='';$('emptyState').classList.toggle('hidden',list.length>0);list.forEach(e=>{$('recordsBody').insertAdjacentHTML('beforeend',`<tr><td data-label="Date">${fmtDate(e.date)}</td><td data-label="Day">${e.day||getDay(e.date)}</td><td data-label="Clinic / Service"><span class="service-badge ${isInpatient(e.clinic)?'inpatient-badge':''}">${esc(e.clinic)}</span></td><td data-label="Duration">${e.duration==null?'—':e.duration+' hr'}</td><td data-label="Total patients">${e.totalPatients??'—'}</td><td data-label="New">${e.newConsultations}</td><td data-label="Follow-up">${e.followUps}</td><td data-label="Actions" class="actions-cell"><button class="icon-btn" onclick="editClinic('${e.id}')">Edit</button><button class="icon-btn delete" onclick="deleteClinic('${e.id}')">Delete</button></td></tr>`)})}
window.editClinic=editClinic;window.deleteClinic=id=>{const x=clinicState.entries.find(e=>e.id===id);if(x&&confirm(`Delete the entry for ${x.clinic} on ${fmtDate(x.date)}?`)){clinicState.entries=clinicState.entries.filter(e=>e.id!==id);persist(CLINIC_KEY,clinicState.entries);cloudDeleteRecord('clinic_records',id);renderClinic()}};
function clearClinic(){if(clinicState.entries.length&&confirm('Delete all clinic entries?')){clinicState.entries=[];persist(CLINIC_KEY,[]);cloudClearTable('clinic_records');renderClinic()}}
function exportClinic(){downloadCsv('clinic-activity', ['Date','Day','Clinic / Service','Duration (hours)','Total patients','New consultations','Follow-ups'],clinicState.entries.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.day||getDay(e.date),e.clinic,e.duration??'',e.totalPatients??'',e.newConsultations,e.followUps]))}

// Endoscopy module
const endoForm=$('endoscopyForm');
function initEndo(){$('endoscopyDate').value=today();updateDay('endoscopyDate','endoscopyDay');renderEndo()}
$('endoscopyDate').onchange=()=>updateDay('endoscopyDate','endoscopyDay'); endoForm.onsubmit=saveEndo; $('resetEndoscopyBtn').onclick=resetEndo;$('exportEndoscopyBtn').onclick=exportEndo;$('clearEndoscopyBtn').onclick=clearEndo;$('endoscopySearch').oninput=e=>{endoState.search=e.target.value.toLowerCase();renderEndoRows()};$('hospitalFilter').onchange=e=>{endoState.filter=e.target.value;renderEndoRows()};
function validProcedures(entry){return (Array.isArray(entry?.procedures)?entry.procedures:[]).filter(value=>value&&value!=='on')}
function selectedProcedures(){return [...document.querySelectorAll('#procedureChoices input:checked, #additionalProcedureChoices input[type="checkbox"][value]:checked')].map(x=>x.value)}
function extrasFromForm(){return{polypectomy:Number($('polypectomy').value||0),clipping:Number($('clipping').value||0),sclerotherapy:$('sclerotherapy').checked,varicealBanding:$('varicealBanding').checked,duodenalStenting:$('duodenalStenting').checked,esophagealStenting:$('esophagealStenting').checked,colonicStenting:$('colonicStenting').checked,metallicBiliaryStenting:$('metallicBiliaryStenting').checked}}
function saveEndo(e){e.preventDefault();$('endoscopyMessage').textContent='';const procedures=selectedProcedures();if(!$('endoscopyDate').value||!$('mrn').value.trim()||!$('hospital').value)return msg('endoscopyMessage','Please complete date, MRN, and hospital.');if(!procedures.length)return msg('endoscopyMessage','Select at least one procedure.');const item={id:$('endoscopyEditingId').value||uid(),date:$('endoscopyDate').value,day:getDay($('endoscopyDate').value),mrn:$('mrn').value.trim(),hospital:$('hospital').value,procedures,extras:extrasFromForm(),note:$('endoscopyNote').value.trim(),updatedAt:new Date().toISOString()};upsert(endoState.entries,item);persist(ENDO_KEY,endoState.entries);cloudUpsertRecord('procedure_records',item);resetEndo();renderEndo()}
function resetEndo(){endoForm.reset();$('endoscopyEditingId').value='';$('endoscopyDate').value=today();updateDay('endoscopyDate','endoscopyDay');$('polypectomy').value=0;$('clipping').value=0;$('endoscopyNote').value='';$('endoscopySubmitLabel').textContent='Save procedure';$('endoscopyMessage').textContent=''}
function editEndo(id){const e=endoState.entries.find(x=>x.id===id);if(!e)return;$('endoscopyEditingId').value=e.id;$('endoscopyDate').value=e.date;updateDay('endoscopyDate','endoscopyDay');$('mrn').value=e.mrn;$('hospital').value=e.hospital;$('endoscopyNote').value=e.note||'';document.querySelectorAll('#procedureChoices input, #additionalProcedureChoices input[type="checkbox"]').forEach(x=>x.checked=validProcedures(e).includes(x.value));Object.entries(e.extras||{}).forEach(([k,v])=>{if($(k))$(k).type==='checkbox'?$(k).checked=!!v:$(k).value=v});$('endoscopySubmitLabel').textContent='Update procedure';document.querySelector('[data-module="endoscopyModule"]').click();scrollTo(0,0)}
function extrasText(e){const x=e.extras||{},arr=[];if(x.polypectomy)arr.push(`Polypectomy ×${x.polypectomy}`);if(x.clipping)arr.push(`Clipping ×${x.clipping}`);if(x.sclerotherapy)arr.push('Sclerotherapy');if(x.varicealBanding)arr.push('Variceal banding');if(x.duodenalStenting)arr.push('Duodenal stenting');if(x.esophagealStenting)arr.push('Esophageal stenting');if(x.colonicStenting)arr.push('Colonic stenting');if(x.metallicBiliaryStenting)arr.push('Metallic biliary stenting');return arr}
function renderEndo(){
  renderEndoRows();
  const statsEntries=filteredEndoStats();
  const procedureCounts={'EGD':0,'Colonoscopy':0,'Flex Sig':0,'EUS':0,'ERCP':0,'PEG Tube Insertion':0,'PEG Tube Replacement':0,'pH Monitoring':0,'Foreign Body Removal':0,'Fibroscan':0};
  const t=statsEntries.reduce((a,e)=>{
    const x=e.extras||{};
    validProcedures(e).forEach(p=>{const normalized=p==='PEG Tube'?'PEG Tube Insertion':p;if(Object.prototype.hasOwnProperty.call(procedureCounts,normalized))procedureCounts[normalized]++});
    return{
      records:a.records+1,
      procedures:a.procedures+validProcedures(e).length,
      poly:a.poly+(x.polypectomy||0),
      clips:a.clips+(x.clipping||0),
      stents:a.stents+['duodenalStenting','esophagealStenting','colonicStenting','metallicBiliaryStenting'].filter(k=>x[k]).length
    }
  },{records:0,procedures:0,poly:0,clips:0,stents:0});
  $('statEndoscopyRecords').textContent=t.records;
  $('statProcedures').textContent=t.procedures;
  $('statEGD').textContent=procedureCounts['EGD'];
  $('statColonoscopy').textContent=procedureCounts['Colonoscopy'];
  $('statFlexSig').textContent=procedureCounts['Flex Sig'];
  $('statEUS').textContent=procedureCounts['EUS'];
  $('statERCP').textContent=procedureCounts['ERCP'];
  $('statPEGTubeInsertion').textContent=procedureCounts['PEG Tube Insertion'];
  $('statPEGTubeReplacement').textContent=procedureCounts['PEG Tube Replacement'];
  $('statPHMonitoring').textContent=procedureCounts['pH Monitoring'];
  $('statForeignBodyRemoval').textContent=procedureCounts['Foreign Body Removal'];
  $('statFibroscan').textContent=procedureCounts['Fibroscan'];
  $('statPolypectomy').textContent=t.poly;
  $('statClips').textContent=t.clips;
  $('statStents').textContent=t.stents;
  renderHospitalEndoscopyStats(statsEntries);
  renderMonthlyEndoscopyChart(statsEntries);
  if(incomeUnlocked)renderPerformanceDashboard();
}
function renderHospitalEndoscopyStats(source=filteredEndoStats()){
  const configs=[
    {hospital:'HMG Fayhaa',prefix:'fayhaa'},
    {hospital:'HMG Mohammadiya',prefix:'mohammadiya'}
  ];
  configs.forEach(({hospital,prefix})=>{
    const rows=source.filter(e=>e.hospital===hospital);
    const counts={'EGD':0,'Colonoscopy':0,'Flex Sig':0,'EUS':0,'ERCP':0,'PEG Tube Insertion':0,'PEG Tube Replacement':0,'pH Monitoring':0,'Foreign Body Removal':0,'Fibroscan':0};
    let procedures=0,poly=0,clips=0,stents=0;
    rows.forEach(e=>{
      const x=e.extras||{};
      validProcedures(e).forEach(proc=>{procedures++;const normalized=proc==='PEG Tube'?'PEG Tube Insertion':proc;if(Object.prototype.hasOwnProperty.call(counts,normalized))counts[normalized]++});
      poly+=x.polypectomy||0;
      clips+=x.clipping||0;
      stents+=['duodenalStenting','esophagealStenting','colonicStenting','metallicBiliaryStenting'].filter(k=>x[k]).length;
    });
    $(prefix+'Records').textContent=rows.length;
    $(prefix+'Procedures').textContent=procedures;
    $(prefix+'EGD').textContent=counts['EGD'];
    $(prefix+'Colonoscopy').textContent=counts['Colonoscopy'];
    $(prefix+'FlexSig').textContent=counts['Flex Sig'];
    $(prefix+'EUS').textContent=counts['EUS'];
    $(prefix+'ERCP').textContent=counts['ERCP'];
    $(prefix+'PEGTubeInsertion').textContent=counts['PEG Tube Insertion'];
    $(prefix+'PEGTubeReplacement').textContent=counts['PEG Tube Replacement'];
    $(prefix+'PHMonitoring').textContent=counts['pH Monitoring'];
    $(prefix+'ForeignBodyRemoval').textContent=counts['Foreign Body Removal'];
    $(prefix+'Fibroscan').textContent=counts['Fibroscan'];
    $(prefix+'Polypectomy').textContent=poly;
    $(prefix+'Clips').textContent=clips;
    $(prefix+'Stents').textContent=stents;
  });
}
function renderEndoRows(){const list=[...endoState.entries].filter(e=>(!endoState.filter||e.hospital===endoState.filter)&&(!endoState.search||`${e.date} ${e.mrn} ${e.hospital} ${validProcedures(e).join(' ')} ${extrasText(e).join(' ')} ${e.note||''}`.toLowerCase().includes(endoState.search))).sort(sortDesc);$('endoscopyBody').innerHTML='';$('endoscopyEmptyState').classList.toggle('hidden',list.length>0);list.forEach(e=>{$('endoscopyBody').insertAdjacentHTML('beforeend',`<tr><td data-label="Date">${fmtDate(e.date)}</td><td data-label="Day">${e.day||getDay(e.date)}</td><td data-label="MRN"><strong class="endo-mrn">${esc(e.mrn)}</strong></td><td data-label="Hospital"><span class="service-badge">${esc(e.hospital)}</span></td><td data-label="Procedures"><div class="endo-chip-list">${validProcedures(e).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></td><td data-label="Additional procedures"><div class="endo-chip-list">${extrasText(e).map(x=>`<span class="tag">${esc(x)}</span>`).join('')||'<span class="endo-empty">—</span>'}</div></td><td data-label="Note">${e.note?`<span class="note-text">${esc(e.note)}</span>`:'—'}</td><td data-label="Actions" class="actions-cell"><button class="icon-btn" onclick="editEndo('${e.id}')">Edit</button><button class="icon-btn delete" onclick="deleteEndo('${e.id}')">Delete</button></td></tr>`)})}
window.editEndo=editEndo;window.deleteEndo=id=>{const e=endoState.entries.find(x=>x.id===id);if(e&&confirm(`Delete endoscopy record for MRN ${e.mrn}?`)){endoState.entries=endoState.entries.filter(x=>x.id!==id);persist(ENDO_KEY,endoState.entries);cloudDeleteRecord('procedure_records',id);renderEndo()}};
function clearEndo(){if(endoState.entries.length&&confirm('Delete all endoscopy records?')){endoState.entries=[];persist(ENDO_KEY,[]);cloudClearTable('procedure_records');renderEndo()}}
function exportEndo(){downloadCsv('endoscopy-procedure-log',['Date','Day','MRN','Hospital','Procedures','Polypectomy count','Clipping count','Sclerotherapy','Variceal banding','Duodenal stenting','Esophageal stenting','Colonic stenting','Metallic biliary stenting','Note'],endoState.entries.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>{const x=e.extras||{};return[e.date,e.day||getDay(e.date),e.mrn,e.hospital,validProcedures(e).join('; '),x.polypectomy||0,x.clipping||0,yes(x.sclerotherapy),yes(x.varicealBanding),yes(x.duodenalStenting),yes(x.esophagealStenting),yes(x.colonicStenting),yes(x.metallicBiliaryStenting),e.note||'']}))}


function recentMonthKeys(count=12){
  const keys=[];const d=new Date();d.setDate(1);
  for(let i=count-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);keys.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`)}
  return keys
}
function monthLabel(key){const [y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{month:'short',year:'2-digit'}).format(new Date(y,m-1,1))}
function renderGroupedMonthlyChart(targetId,rows,metric){
  const target=$(targetId);if(!target)return;
  const months=recentMonthKeys(12), hospitals=['HMG Fayhaa','HMG Mohammadiya'];
  const data=months.map(month=>({month,label:monthLabel(month),values:hospitals.map(h=>rows.filter(r=>r.date&&r.date.slice(0,7)===month&&metric.hospital(r)===h).reduce((sum,r)=>sum+metric.value(r),0))}));
  const max=Math.max(0,...data.flatMap(d=>d.values));
  if(max===0){target.innerHTML='<div class="chart-empty"><div><strong>No monthly data yet</strong><span>The graph will appear automatically after records are added.</span></div></div>';return}
  const width=960,height=320,left=48,right=16,top=18,bottom=62,plotW=width-left-right,plotH=height-top-bottom;
  const gridMax=Math.max(5,Math.ceil(max/5)*5),ticks=5,groupW=plotW/data.length,barW=Math.min(22,groupW*.28),gap=4;
  let svg=`<div class="chart-shell"><div class="chart-legend"><span><i class="legend-swatch legend-fayhaa"></i>HMG Fayhaa</span><span><i class="legend-swatch legend-mohammadiya"></i>HMG Mohammadiya</span></div><svg class="chart-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">`;
  for(let i=0;i<=ticks;i++){const value=gridMax-(gridMax/ticks*i),y=top+(plotH/ticks*i);svg+=`<line class="chart-grid-line" x1="${left}" y1="${y}" x2="${width-right}" y2="${y}"></line><text class="chart-axis-text" x="${left-8}" y="${y+4}" text-anchor="end">${formatNum(value)}</text>`}
  data.forEach((d,i)=>{const center=left+groupW*i+groupW/2;d.values.forEach((v,j)=>{const h=(v/gridMax)*plotH,x=center+(j===0?-(barW+gap/2):gap/2),y=top+plotH-h,cls=j===0?'chart-bar-fayhaa':'chart-bar-mohammadiya';svg+=`<rect class="${cls}" x="${x}" y="${y}" width="${barW}" height="${h}" rx="5"><title>${hospitals[j]} · ${d.label}: ${formatNum(v)}</title></rect>`;if(v>0)svg+=`<text class="chart-value-text" x="${x+barW/2}" y="${Math.max(top+10,y-5)}" text-anchor="middle">${formatNum(v)}</text>`});svg+=`<text class="chart-axis-text" x="${center}" y="${height-24}" text-anchor="middle">${d.label}</text>`});
  svg+='</svg></div>';target.innerHTML=svg
}
let clinicTrendView='overall';
function renderClinicVisitMonthlyChart(targetId,rows,view='overall'){
  const target=$(targetId);if(!target)return;
  const months=recentMonthKeys(12);
  const eligible=rows.filter(r=>r.clinic==='HMG Fayhaa'||r.clinic==='HMG Mohammadiya');
  const scoped=view==='overall'?eligible:eligible.filter(r=>r.clinic===view);
  const data=months.map(month=>{
    const monthRows=scoped.filter(r=>r.date&&r.date.slice(0,7)===month);
    return {month,label:monthLabel(month),newCount:monthRows.reduce((sum,r)=>sum+(Number(r.newConsultations)||0),0),followCount:monthRows.reduce((sum,r)=>sum+(Number(r.followUps)||0),0)}
  });
  const max=Math.max(0,...data.flatMap(d=>[d.newCount,d.followCount]));
  if(max===0){target.innerHTML='<div class="chart-empty"><div><strong>No monthly data yet</strong><span>The graph will appear automatically after clinic records are added.</span></div></div>';return}
  const width=960,height=320,left=48,right=16,top=18,bottom=62,plotW=width-left-right,plotH=height-top-bottom;
  const gridMax=Math.max(5,Math.ceil(max/5)*5),ticks=5,groupW=plotW/data.length,barW=Math.min(22,groupW*.28),gap=4;
  const viewLabel=view==='overall'?'Overall practice':view.replace('HMG ','');
  let svg=`<div class="chart-shell"><div class="chart-legend"><span class="trend-view-label">${esc(viewLabel)}</span><span><i class="legend-swatch legend-new"></i>New consultations</span><span><i class="legend-swatch legend-follow"></i>Follow-ups</span></div><svg class="chart-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">`;
  for(let i=0;i<=ticks;i++){const value=gridMax-(gridMax/ticks*i),y=top+(plotH/ticks*i);svg+=`<line class="chart-grid-line" x1="${left}" y1="${y}" x2="${width-right}" y2="${y}"></line><text class="chart-axis-text" x="${left-8}" y="${y+4}" text-anchor="end">${formatNum(value)}</text>`}
  data.forEach((d,i)=>{
    const center=left+groupW*i+groupW/2;
    [[d.newCount,'chart-bar-new','New consultations',-(barW+gap/2)],[d.followCount,'chart-bar-follow','Follow-ups',gap/2]].forEach(([v,cls,label,offset])=>{
      const h=(v/gridMax)*plotH,x=center+offset,y=top+plotH-h;
      svg+=`<rect class="${cls}" x="${x}" y="${y}" width="${barW}" height="${h}" rx="5"><title>${viewLabel} · ${label} · ${d.label}: ${formatNum(v)}</title></rect>`;
      if(v>0)svg+=`<text class="chart-value-text" x="${x+barW/2}" y="${Math.max(top+10,y-5)}" text-anchor="middle">${formatNum(v)}</text>`
    });
    svg+=`<text class="chart-axis-text" x="${center}" y="${height-24}" text-anchor="middle">${d.label}</text>`
  });
  svg+='</svg></div>';target.innerHTML=svg
}
function setClinicTrendView(view){
  clinicTrendView=view;
  document.querySelectorAll('[data-clinic-trend]').forEach(btn=>{const active=btn.dataset.clinicTrend===view;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active))});
  renderMonthlyClinicChart();
}
function renderMonthlyClinicChart(rows=filteredClinicStats()){renderClinicVisitMonthlyChart('clinicMonthlyChart',rows,clinicTrendView)}
function renderMonthlyEndoscopyChart(rows=filteredEndoStats()){renderGroupedMonthlyChart('endoscopyMonthlyChart',rows,{hospital:r=>r.hospital,value:r=>validProcedures(r).length})}



// Password-protected estimated income dashboard
// Read-only private performance dashboard. This section never writes to localStorage.
function performanceNumber(value,decimals=1){const n=Number(value||0);return Number.isFinite(n)?(Number.isInteger(n)?String(n):n.toFixed(decimals)):'0'}
function performanceForHospital(hospital){const clinics=clinicState.entries.filter(e=>e.clinic===hospital&&inStatsPeriod(e.date));const endoscopyRows=endoState.entries.filter(e=>e.hospital===hospital&&inStatsPeriod(e.date));const sessions=clinics.length;const patients=clinics.reduce((sum,e)=>sum+Number(e.totalPatients??(Number(e.newConsultations||0)+Number(e.followUps||0))),0);const newConsultations=clinics.reduce((sum,e)=>sum+Number(e.newConsultations||0),0);const hours=clinics.reduce((sum,e)=>sum+Number(e.duration||0),0);const procedureCount=endoscopyRows.reduce((sum,e)=>sum+validProcedures(e).length,0);return {sessions,patients,newConsultations,hours,procedureCount}}
function setPerformanceText(id,value){const el=$(id);if(el)el.textContent=value}
function renderPerformanceHospital(prefix,data){setPerformanceText(`perf${prefix}Sessions`,data.sessions);setPerformanceText(`perf${prefix}Patients`,data.patients);setPerformanceText(`perf${prefix}PatientsPerSession`,performanceNumber(data.sessions?data.patients/data.sessions:0));setPerformanceText(`perf${prefix}NewPerSession`,performanceNumber(data.sessions?data.newConsultations/data.sessions:0));setPerformanceText(`perf${prefix}Hours`,performanceNumber(data.hours));setPerformanceText(`perf${prefix}Procedures`,data.procedureCount);setPerformanceText(`perf${prefix}ProceduresPerSession`,performanceNumber(data.sessions?data.procedureCount/data.sessions:0))}
function renderPerformanceDashboard(){if(!incomeUnlocked||!$('perfSessions'))return;const fayhaa=performanceForHospital('HMG Fayhaa');const mohammadiya=performanceForHospital('HMG Mohammadiya');renderPerformanceHospital('Fayhaa',fayhaa);renderPerformanceHospital('Mohammadiya',mohammadiya);const selected=statsState.hospital==='HMG Fayhaa'?fayhaa:statsState.hospital==='HMG Mohammadiya'?mohammadiya:{sessions:fayhaa.sessions+mohammadiya.sessions,patients:fayhaa.patients+mohammadiya.patients,newConsultations:fayhaa.newConsultations+mohammadiya.newConsultations,hours:fayhaa.hours+mohammadiya.hours,procedureCount:fayhaa.procedureCount+mohammadiya.procedureCount};setPerformanceText('perfSessions',selected.sessions);setPerformanceText('perfPatientsPerSession',performanceNumber(selected.sessions?selected.patients/selected.sessions:0));setPerformanceText('perfNewPerSession',performanceNumber(selected.sessions?selected.newConsultations/selected.sessions:0));setPerformanceText('perfProceduresPerSession',performanceNumber(selected.sessions?selected.procedureCount/selected.sessions:0));setPerformanceText('perfHours',performanceNumber(selected.hours));setPerformanceText('perfPatientsPerHour',performanceNumber(selected.hours?selected.patients/selected.hours:0))}

const DEFAULT_FEES={
  'New Consultation':110,'EGD':700,'Colonoscopy':680,'Flex Sig':300,'Fibroscan':264,'ERCP':2000,'EUS':4800,
  'Polypectomy':214,'Clip':56,'pH Monitoring':800,'Sclerotherapy':357,'Variceal Banding':611,
  'PEG Tube Insertion':1575,'PEG Tube Replacement':1680,'Foreign Body Removal':0,'Metallic Biliary Stenting':3200,
  'Duodenal Stenting':0,'Esophageal Stenting':0,'Colonic Stenting':0
};
let incomeUnlocked=false;
function loadIncomeSettings(){
  try{const saved=JSON.parse(localStorage.getItem(INCOME_SETTINGS_KEY)||'{}');return {target:Number(saved.target??100000),fees:{...DEFAULT_FEES,...(saved.fees||{})}}}catch{return {target:100000,fees:{...DEFAULT_FEES}}}
}
let incomeSettings=loadIncomeSettings();
function money(v){return new Intl.NumberFormat('en-SA',{style:'currency',currency:'SAR',maximumFractionDigits:0}).format(Number(v)||0)}
function currentMonthKey(){return today().slice(0,7)}
async function hashPassword(value){
  if(window.crypto?.subtle){const data=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  return btoa(unescape(encodeURIComponent(value)))
}
function hasIncomePassword(){return Boolean(localStorage.getItem(INCOME_PASSWORD_KEY))}
function configureIncomeLock(){
  const setup=!hasIncomePassword();
  $('incomeLockTitle').textContent=setup?'Create Income Dashboard Password':'Unlock Income Dashboard';
  $('incomeLockHelp').textContent=setup?'Create a password for this private financial section.':'Enter your password to view estimated income and fee settings.';
  $('incomePasswordLabel').textContent=setup?'Create password':'Password';
  $('incomePasswordButton').textContent=setup?'Create password':'Unlock';
  $('confirmPasswordGroup').classList.toggle('hidden',!setup);
  $('incomePasswordConfirm').required=setup;
  $('incomePassword').autocomplete=setup?'new-password':'current-password';
  $('incomePassword').value='';$('incomePasswordConfirm').value='';$('incomePasswordMessage').textContent='';
}
async function submitIncomePassword(e){
  e.preventDefault();const pass=$('incomePassword').value;
  if(pass.length<4)return msg('incomePasswordMessage','Password must contain at least 4 characters.');
  if(!hasIncomePassword()){
    if(pass!==$('incomePasswordConfirm').value)return msg('incomePasswordMessage','Passwords do not match.');
    localStorage.setItem(INCOME_PASSWORD_KEY,await hashPassword(pass));createAutomaticLocalBackup('Password saved');queueCloudSettingsSync();unlockIncome();return;
  }
  if(await hashPassword(pass)!==localStorage.getItem(INCOME_PASSWORD_KEY))return msg('incomePasswordMessage','Incorrect password.');
  unlockIncome();
}
function unlockIncome(){incomeUnlocked=true;$('incomeTab').classList.remove('hidden');$('privateAccessBtn')?.classList.add('hidden');$('incomeLockScreen').classList.add('hidden');$('incomeDashboard').classList.remove('hidden');$('incomePasswordForm').reset();activateModule('incomeModule',$('incomeTab'));setPrivateView('overview');renderIncomeDashboard();renderPerformanceDashboard();renderPrivateOverview();renderPrivateHospitalCards()}
function lockIncome(){incomeUnlocked=false;$('incomeDashboard').classList.add('hidden');$('incomeLockScreen').classList.remove('hidden');$('incomeTab').classList.add('hidden');$('privateAccessBtn')?.classList.remove('hidden');configureIncomeLock();activateModule('clinicModule')}
function initIncome(){
  $('incomeMonth').value=currentMonthKey();configureIncomeLock();renderFeeSettings();
  $('incomeTab').classList.add('hidden');
  $('incomePasswordForm').onsubmit=submitIncomePassword;$('lockIncomeBtn').onclick=lockIncome;
  $('incomeMonth').onchange=()=>{renderIncomeDashboard();renderPrivateOverview();renderPrivateHospitalCards()};$('saveIncomeTargetBtn').onclick=saveIncomeTarget;$('saveFeeSettingsBtn').onclick=saveFeeSettings;

  // Private access: a discreet lock-only button opens the password screen.
  const privateAccessBtn=$('privateAccessBtn');
  if(privateAccessBtn){
    privateAccessBtn.onclick=()=>{
      configureIncomeLock();
      activateModule('incomeModule');
      setTimeout(()=>$('incomePassword')?.focus(),50);
    };
  }
  document.querySelectorAll('.private-nav-btn').forEach(btn=>btn.onclick=()=>setPrivateView(btn.dataset.privateView));
  $('privateDashboardLockBtn')?.addEventListener('click',lockIncome);
}
function renderFeeSettings(){
  $('feeSettingsGrid').innerHTML=Object.keys(DEFAULT_FEES).map((name,i)=>`<label><span>${esc(name)}</span><input class="fee-input" data-fee="${esc(name)}" type="number" min="0" step="1" value="${Number(incomeSettings.fees[name]||0)}" /></label>`).join('');
}
function saveIncomeTarget(){incomeSettings.target=Math.max(0,Number($('incomeTargetInput').value||0));saveIncomeSettings();msg('incomeTargetMessage','Target saved.');renderIncomeDashboard()}
function saveFeeSettings(){document.querySelectorAll('.fee-input').forEach(input=>incomeSettings.fees[input.dataset.fee]=Math.max(0,Number(input.value||0)));saveIncomeSettings();msg('feeSettingsMessage','Approximate fees saved.');renderIncomeDashboard()}
function saveIncomeSettings(){localStorage.setItem(INCOME_SETTINGS_KEY,JSON.stringify(incomeSettings));createAutomaticLocalBackup('Income settings saved');queueCloudSettingsSync()}
function incomeItemsForMonth(month,hospital='all'){
  const fees=incomeSettings.fees, items=[];
  const clinicRows=clinicState.entries.filter(e=>e.date?.slice(0,7)===month&&(hospital==='all'||clinicHospital(e)===hospital));
  const newCount=clinicRows.reduce((s,e)=>s+Number(e.newConsultations||0),0);
  items.push({name:'New Consultation',category:'clinic',count:newCount,fee:fees['New Consultation']||0});
  const endoRows=endoState.entries.filter(e=>e.date?.slice(0,7)===month&&(hospital==='all'||e.hospital===hospital));
  const procNames=['EGD','Colonoscopy','Flex Sig','Fibroscan','ERCP','EUS','PEG Tube Insertion','PEG Tube Replacement','Foreign Body Removal','pH Monitoring'];
  const counts=Object.fromEntries(procNames.map(n=>[n,0]));
  let polypectomy=0,clips=0,sclerotherapy=0,banding=0,metallic=0,duodenal=0,esophageal=0,colonic=0;
  endoRows.forEach(e=>{
    validProcedures(e).forEach(raw=>{const n=raw==='PEG Tube'?'PEG Tube Insertion':raw;if(n in counts)counts[n]++});
    const x=e.extras||{};polypectomy+=Number(x.polypectomy||0);clips+=Number(x.clipping||0);sclerotherapy+=x.sclerotherapy?1:0;banding+=x.varicealBanding?1:0;metallic+=x.metallicBiliaryStenting?1:0;duodenal+=x.duodenalStenting?1:0;esophageal+=x.esophagealStenting?1:0;colonic+=x.colonicStenting?1:0;
  });
  procNames.forEach(name=>items.push({name,category:'procedure',count:counts[name],fee:fees[name]||0}));
  [['Polypectomy',polypectomy],['Clip',clips],['Sclerotherapy',sclerotherapy],['Variceal Banding',banding],['Metallic Biliary Stenting',metallic],['Duodenal Stenting',duodenal],['Esophageal Stenting',esophageal],['Colonic Stenting',colonic]].forEach(([name,count])=>items.push({name,category:'procedure',count,fee:fees[name]||0}));
  return items.map(x=>({...x,total:x.count*x.fee}));
}
function incomeSummaryForHospital(month,hospital){
  const items=incomeItemsForMonth(month,hospital);
  return {
    hospital,
    clinic:items.filter(x=>x.category==='clinic').reduce((s,x)=>s+x.total,0),
    procedures:items.filter(x=>x.category==='procedure').reduce((s,x)=>s+x.total,0),
    total:items.reduce((s,x)=>s+x.total,0)
  };
}
function renderIncomeHospitalComparison(month,overallTotal){
  const hospitals=['HMG Fayhaa','HMG Mohammadiya'];
  const summaries=hospitals.map(h=>incomeSummaryForHospital(month,h));
  $('incomeHospitalComparison').innerHTML=summaries.map(x=>{
    const share=overallTotal>0?(x.total/overallTotal*100):0;
    return `<article class="income-hospital-panel"><div class="hospital-panel-heading"><span class="hospital-dot"></span><div><h3>${esc(x.hospital)}</h3><small>${share.toFixed(1)}% of estimated monthly income</small></div></div><div class="income-hospital-total"><span>Total estimated income</span><strong>${money(x.total)}</strong></div><div class="income-hospital-breakdown"><div><span>Clinic income</span><strong>${money(x.clinic)}</strong></div><div><span>Procedure income</span><strong>${money(x.procedures)}</strong></div></div><div class="income-share-track"><div style="width:${Math.min(100,share)}%"></div></div></article>`;
  }).join('');
}

function renderIncomeDashboard(){
  if(!incomeUnlocked)return;const month=$('incomeMonth').value||currentMonthKey(),items=incomeItemsForMonth(month),expected=items.reduce((s,x)=>s+x.total,0),target=Number(incomeSettings.target||0),remaining=Math.max(0,target-expected),achievement=target>0?(expected/target*100):0;
  $('incomeTargetInput').value=target;$('incomeTargetDisplay').textContent=money(target);$('incomeExpectedDisplay').textContent=money(expected);$('incomeRemainingDisplay').textContent=money(remaining);$('incomeAchievementDisplay').textContent=`${achievement.toFixed(1)}%`;$('incomeProgressBar').style.width=`${Math.min(100,achievement)}%`;
  const visible=items.filter(x=>x.count>0);
  $('incomeBreakdown').innerHTML=visible.length?visible.map(x=>`<div class="income-line"><div><strong>${esc(x.name)}</strong><span>${x.count} × ${money(x.fee)}</span></div><strong>${money(x.total)}</strong></div>`).join('')+`<div class="income-line income-total"><div><strong>Total estimated income</strong></div><strong>${money(expected)}</strong></div>`:'<div class="chart-empty"><div><strong>No income activity for this month</strong><span>Add clinic or endoscopy records to calculate an estimate.</span></div></div>';
  renderIncomeHospitalComparison(month,expected);renderPrivateOverview();renderPrivateHospitalCards();
}


function monthKeyOffset(offset=0){
  const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function monthlyPracticeCounts(month){
  const hospital=statsState.hospital;
  const clinics=clinicState.entries.filter(e=>e.date?.slice(0,7)===month&&!isInpatient(e.clinic)&&(hospital==='all'||clinicHospital(e)===hospital));
  const procedures=endoState.entries.filter(e=>e.date?.slice(0,7)===month&&(hospital==='all'||e.hospital===hospital));
  return {
    newConsultations:clinics.reduce((s,e)=>s+Number(e.newConsultations||0),0),
    followUps:clinics.reduce((s,e)=>s+Number(e.followUps||0),0),
    procedures:procedures.reduce((s,e)=>s+validProcedures(e).length,0)
  };
}
function setPrivateView(view='overview'){
  document.querySelectorAll('[data-private-section]').forEach(section=>section.classList.toggle('hidden',section.dataset.privateSection!==view));
  document.querySelectorAll('.private-nav-btn').forEach(btn=>{const active=btn.dataset.privateView===view;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active))});
  if(view==='overview')renderPrivateOverview();
  if(view==='hospitals')renderPrivateHospitalCards();
  if(view==='performance')renderPerformanceDashboard();
  if(view==='income')renderIncomeDashboard();
}
function privateMonthClinicRows(month,hospital='all'){
  return clinicState.entries.filter(e=>e.date?.slice(0,7)===month&&!isInpatient(e.clinic)&&(hospital==='all'||clinicHospital(e)===hospital));
}
function privateMonthProcedureRows(month,hospital='all'){
  return endoState.entries.filter(e=>e.date?.slice(0,7)===month&&(hospital==='all'||e.hospital===hospital));
}
function privateMonthMetrics(month,hospital='all'){
  const clinics=privateMonthClinicRows(month,hospital),procedures=privateMonthProcedureRows(month,hospital),income=incomeItemsForMonth(month,hospital).reduce((s,x)=>s+x.total,0);
  return {
    patients:clinics.reduce((s,e)=>s+Number(e.totalPatients??(Number(e.newConsultations||0)+Number(e.followUps||0))),0),
    newConsultations:clinics.reduce((s,e)=>s+Number(e.newConsultations||0),0),
    followUps:clinics.reduce((s,e)=>s+Number(e.followUps||0),0),
    procedures:procedures.reduce((s,e)=>s+validProcedures(e).length,0),
    income
  };
}
function renderPrivateOverview(){
  if(!incomeUnlocked||!$('privateOverviewTarget'))return;
  const month=$('incomeMonth')?.value||currentMonthKey(),m=privateMonthMetrics(month),target=Number(incomeSettings.target||0),pct=target?m.income/target*100:0;
  $('privateOverviewTarget').textContent=money(target);$('privateOverviewIncome').textContent=money(m.income);$('privateOverviewPatients').textContent=m.patients;$('privateOverviewProcedures').textContent=m.procedures;
  $('privateOverviewProgress').style.width=`${Math.min(100,pct)}%`;
  $('privateOverviewStatus').textContent=target?`${pct.toFixed(1)}% of the monthly target achieved. ${money(Math.max(0,target-m.income))} remaining.`:'Set a monthly income target in the Fees section.';
}
function renderPrivateHospitalCards(){
  if(!incomeUnlocked||!$('privateHospitalCards'))return;
  const month=$('incomeMonth')?.value||currentMonthKey();
  const data=['HMG Fayhaa','HMG Mohammadiya'].map(h=>({hospital:h,...privateMonthMetrics(month,h)}));
  const maxIncome=Math.max(1,...data.map(x=>x.income));
  $('privateHospitalCards').innerHTML=data.map(x=>`<article class="private-hospital-card"><div class="hospital-panel-heading"><span class="hospital-dot"></span><div><h3>${esc(x.hospital)}</h3><small>${month}</small></div></div><div class="private-hospital-income"><span>Estimated income</span><strong>${money(x.income)}</strong></div><div class="private-hospital-metrics"><div><span>Patients</span><strong>${x.patients}</strong></div><div><span>New</span><strong>${x.newConsultations}</strong></div><div><span>Follow-up</span><strong>${x.followUps}</strong></div><div><span>Procedures</span><strong>${x.procedures}</strong></div></div><div class="private-hospital-bar"><div style="width:${x.income/maxIncome*100}%"></div></div></article>`).join('');
}

function load(k){try{return JSON.parse(localStorage.getItem(k))||[]}catch{return[]}}function persist(k,v){localStorage.setItem(k,JSON.stringify(v));if(k===CLINIC_KEY||k===ENDO_KEY)createAutomaticLocalBackup(k===CLINIC_KEY?'Clinic records saved':'Procedure records saved')}function upsert(arr,item){const i=arr.findIndex(x=>x.id===item.id);i>=0?arr[i]=item:arr.push(item)}function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()}function today(){const d=new Date();return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}function getDay(s){return s?new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(new Date(s+'T00:00:00')):''}function updateDay(a,b){$(b).value=getDay($(a).value)}function fmtDate(s){return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(s+'T00:00:00'))}function sortDesc(a,b){return b.date.localeCompare(a.date)||(b.updatedAt||'').localeCompare(a.updatedAt||'')}function formatNum(v){return Number.isInteger(v)?v:v.toFixed(1)}function msg(id,t){$(id).textContent=t}function esc(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function yes(v){return v?'Yes':'No'}function downloadCsv(name,headers,rows){if(!rows.length)return alert('There are no records to export.');const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const u=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download=`${name}-${today()}.csv`;a.click();URL.revokeObjectURL(u)}function applyTheme(){if(localStorage.getItem(THEME_KEY)==='dark')document.body.classList.add('dark');updateThemeButton()}function updateThemeButton(){$('themeToggle').textContent=document.body.classList.contains('dark')?'Light mode':'Dark mode'}

// Supabase synchronization. Existing localStorage keys remain unchanged and continue as the offline cache.
let supabaseClient=null, supabaseUser=null, supabaseChannel=null, syncInProgress=false, settingsSyncTimer=null;
function loadSyncMeta(){try{return JSON.parse(localStorage.getItem(SUPABASE_SYNC_META_KEY)||'{}')}catch{return{}}}
function saveSyncMeta(patch){const next={...loadSyncMeta(),...patch};localStorage.setItem(SUPABASE_SYNC_META_KEY,JSON.stringify(next));return next}
function setSyncStatus(state,text){const btn=$('syncStatusBtn'),label=$('syncStatusText');if(label)label.textContent=text;if(btn){btn.classList.remove('sync-online','sync-working','sync-offline','sync-error');btn.classList.add(`sync-${state}`)}if($('privateSyncStatus'))$('privateSyncStatus').textContent=text}
function updateSyncCounts(cloudClinic=null,cloudProcedures=null){if($('syncLocalClinicCount'))$('syncLocalClinicCount').textContent=clinicState.entries.length;if($('syncLocalProcedureCount'))$('syncLocalProcedureCount').textContent=endoState.entries.length;const meta=loadSyncMeta();if($('syncCloudClinicCount'))$('syncCloudClinicCount').textContent=cloudClinic??meta.cloudClinicCount??'—';if($('syncCloudProcedureCount'))$('syncCloudProcedureCount').textContent=cloudProcedures??meta.cloudProcedureCount??'—';if($('lastSupabaseSync'))$('lastSupabaseSync').textContent=meta.lastSyncAt?formatBackupTime(meta.lastSyncAt):'Never';if($('syncUserEmail'))$('syncUserEmail').textContent=supabaseUser?.email||'—'}
function showCloudAuth(message=''){$('cloudAuthOverlay')?.classList.remove('hidden');if($('cloudAuthMessage'))$('cloudAuthMessage').textContent=message}
function hideCloudAuth(){$('cloudAuthOverlay')?.classList.add('hidden')}
async function initSupabaseSync(){if(!window.supabase?.createClient){setSyncStatus('error','Cloud library unavailable');return}supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session}}=await supabaseClient.auth.getSession();if(session?.user)await handleSignedIn(session.user);else{setSyncStatus('offline','Cloud not connected');showCloudAuth()}supabaseClient.auth.onAuthStateChange((_event,session)=>{if(session?.user)handleSignedIn(session.user);else handleSignedOut()});$('cloudAuthForm').onsubmit=signInToCloud;$('cloudCreateAccountBtn').onclick=createCloudAccount;$('cloudOfflineBtn').onclick=()=>{hideCloudAuth();setSyncStatus('offline','Device-only mode')};$('syncStatusBtn').onclick=()=>supabaseUser?syncAllFromCloud(true):showCloudAuth();$('syncNowBtn').onclick=()=>syncAllFromCloud(true);$('uploadLocalDataBtn').onclick=()=>uploadAllLocalData(true);$('downloadCloudDataBtn').onclick=()=>syncAllFromCloud(true);$('signOutBtn').onclick=safeSignOut;$('headerSignOutBtn').onclick=safeSignOut;window.addEventListener('online',()=>{if(supabaseUser)syncAllFromCloud(false)});window.addEventListener('focus',()=>{if(supabaseUser)syncAllFromCloud(false)});updateSyncCounts()}
async function signInToCloud(e){e.preventDefault();const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;msg('cloudAuthMessage','Signing in…');const {error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)msg('cloudAuthMessage',error.message);else $('cloudAuthForm').reset()}
async function createCloudAccount(){const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;if(!email||password.length<6)return msg('cloudAuthMessage','Enter an email and password of at least 6 characters.');msg('cloudAuthMessage','Creating account…');const {data,error}=await supabaseClient.auth.signUp({email,password});if(error)return msg('cloudAuthMessage',error.message);msg('cloudAuthMessage',data.session?'Account created and signed in.':'Account created. Check your email if confirmation is required.')}
async function handleSignedIn(user){supabaseUser=user;hideCloudAuth();$('headerSignOutBtn')?.classList.remove('hidden');setSyncStatus('working','Connecting…');updateSyncCounts();await syncAllFromCloud(false);subscribeToCloud()}
function handleSignedOut(){supabaseUser=null;$('headerSignOutBtn')?.classList.add('hidden');if(supabaseChannel&&supabaseClient)supabaseClient.removeChannel(supabaseChannel);supabaseChannel=null;setSyncStatus('offline','Cloud not connected');updateSyncCounts();showCloudAuth()}
async function safeSignOut(){if(!supabaseClient||!supabaseUser)return showCloudAuth();const email=supabaseUser.email||'this account';if(!confirm(`Sign out of ${email}?\n\nYour cloud data will remain safe. This device's local cache will be cleared so another account cannot see or upload your records.`))return;try{if(navigator.onLine)await syncAllFromCloud(false);createAutomaticLocalBackup('Before sign out');localStorage.removeItem(CLINIC_KEY);localStorage.removeItem(ENDO_KEY);localStorage.removeItem(INCOME_SETTINGS_KEY);localStorage.removeItem(INCOME_PASSWORD_KEY);localStorage.removeItem(SUPABASE_SYNC_META_KEY);clinicState.entries=[];endoState.entries=[];incomeSettings=loadIncomeSettings();incomeUnlocked=false;renderClinic();renderEndo();renderFeeSettings();renderIncomeDashboard();renderPrivateOverview();renderPrivateHospitalCards();renderPerformanceDashboard();const {error}=await supabaseClient.auth.signOut();if(error)throw error;}catch(error){console.error(error);alert(error.message||'Unable to sign out. Please try again.')}}
function cloudRowFromRecord(record){return {id:String(record.id),user_id:supabaseUser.id,record_data:record,updated_at:record.updatedAt||new Date().toISOString()}}
async function cloudUpsertRecord(table,record){if(!supabaseClient||!supabaseUser||!navigator.onLine)return;setSyncStatus('working','Syncing…');const {error}=await supabaseClient.from(table).upsert(cloudRowFromRecord(record),{onConflict:'id'});if(error){console.error(error);setSyncStatus('error','Sync failed');return}markSyncComplete()}
async function cloudDeleteRecord(table,id){if(!supabaseClient||!supabaseUser||!navigator.onLine)return;setSyncStatus('working','Syncing…');const {error}=await supabaseClient.from(table).delete().eq('id',String(id)).eq('user_id',supabaseUser.id);if(error){console.error(error);setSyncStatus('error','Sync failed');return}markSyncComplete()}
async function cloudClearTable(table){if(!supabaseClient||!supabaseUser||!navigator.onLine)return;setSyncStatus('working','Syncing…');const {error}=await supabaseClient.from(table).delete().eq('user_id',supabaseUser.id);if(error){console.error(error);setSyncStatus('error','Sync failed');return}markSyncComplete()}
function cloudSettingsPayload(){return {incomeSettings:JSON.parse(localStorage.getItem(INCOME_SETTINGS_KEY)||'{}'),passwordHash:localStorage.getItem(INCOME_PASSWORD_KEY)||'',theme:localStorage.getItem(THEME_KEY)||'light',updatedAt:new Date().toISOString()}}
function queueCloudSettingsSync(){if(settingsSyncTimer)clearTimeout(settingsSyncTimer);settingsSyncTimer=setTimeout(syncSettingsToCloud,500)}
async function syncSettingsToCloud(){if(!supabaseClient||!supabaseUser||!navigator.onLine)return {error:null};const {error}=await supabaseClient.from('app_settings').upsert({user_id:supabaseUser.id,settings_data:cloudSettingsPayload(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error){console.error(error);setSyncStatus('error','Settings sync failed');return {error}}markSyncComplete();return {error:null}}
function recordTimestamp(record){const t=Date.parse(record?.updatedAt||record?.updated_at||0);return Number.isFinite(t)?t:0}
function mergeRecordSets(localRows,cloudRows){const map=new Map();[...localRows,...cloudRows].forEach(row=>{if(!row?.id)return;const old=map.get(String(row.id));if(!old||recordTimestamp(row)>=recordTimestamp(old))map.set(String(row.id),row)});return [...map.values()]}
async function fetchCloudData(){const [clinicResult,procedureResult,settingsResult]=await Promise.all([supabaseClient.from('clinic_records').select('id,record_data,updated_at').eq('user_id',supabaseUser.id),supabaseClient.from('procedure_records').select('id,record_data,updated_at').eq('user_id',supabaseUser.id),supabaseClient.from('app_settings').select('settings_data,updated_at').eq('user_id',supabaseUser.id).maybeSingle()]);const error=clinicResult.error||procedureResult.error||settingsResult.error;if(error)throw error;return {clinic:(clinicResult.data||[]).map(r=>({...r.record_data,id:r.record_data?.id||r.id,updatedAt:r.record_data?.updatedAt||r.updated_at})),procedures:(procedureResult.data||[]).map(r=>({...r.record_data,id:r.record_data?.id||r.id,updatedAt:r.record_data?.updatedAt||r.updated_at})),settings:settingsResult.data?.settings_data||null}}
async function syncAllFromCloud(showMessage=false){if(syncInProgress||!supabaseClient||!supabaseUser||!navigator.onLine)return;syncInProgress=true;setSyncStatus('working','Syncing…');if(showMessage)msg('syncMessage','Synchronizing…');try{const cloud=await fetchCloudData();const mergedClinic=mergeRecordSets(clinicState.entries,cloud.clinic),mergedProcedures=mergeRecordSets(endoState.entries,cloud.procedures);clinicState.entries=mergedClinic;endoState.entries=mergedProcedures;localStorage.setItem(CLINIC_KEY,JSON.stringify(mergedClinic));localStorage.setItem(ENDO_KEY,JSON.stringify(mergedProcedures));if(cloud.settings){if(cloud.settings.incomeSettings)localStorage.setItem(INCOME_SETTINGS_KEY,JSON.stringify(cloud.settings.incomeSettings));if(cloud.settings.passwordHash)localStorage.setItem(INCOME_PASSWORD_KEY,cloud.settings.passwordHash);if(cloud.settings.theme){localStorage.setItem(THEME_KEY,cloud.settings.theme);document.body.classList.toggle('dark',cloud.settings.theme==='dark');updateThemeButton()}incomeSettings=loadIncomeSettings();renderFeeSettings()}const uploadResults=await Promise.all([mergedClinic.length?supabaseClient.from('clinic_records').upsert(mergedClinic.map(cloudRowFromRecord),{onConflict:'id'}):Promise.resolve({error:null}),mergedProcedures.length?supabaseClient.from('procedure_records').upsert(mergedProcedures.map(cloudRowFromRecord),{onConflict:'id'}):Promise.resolve({error:null})]);const uploadError=uploadResults.find(r=>r?.error)?.error;if(uploadError)throw uploadError;renderClinic();renderEndo();if(incomeUnlocked){renderIncomeDashboard();renderPrivateOverview();renderPrivateHospitalCards();renderPerformanceDashboard()}saveSyncMeta({lastSyncAt:new Date().toISOString(),cloudClinicCount:mergedClinic.length,cloudProcedureCount:mergedProcedures.length});setSyncStatus('online','Cloud synchronized');updateSyncCounts(mergedClinic.length,mergedProcedures.length);if(showMessage)msg('syncMessage','Synchronization completed.')}catch(err){console.error(err);setSyncStatus('error','Sync failed');if(showMessage)msg('syncMessage',err.message||'Synchronization failed. Check the Supabase tables and RLS policies.')}finally{syncInProgress=false}}
async function uploadAllLocalData(confirmFirst=false){if(!supabaseUser)return showCloudAuth();if(confirmFirst&&!confirm(`Upload ${clinicState.entries.length} clinic records and ${endoState.entries.length} procedure records to your cloud account? Local copies will remain unchanged.`))return;createAutomaticLocalBackup('Before Supabase upload');setSyncStatus('working','Uploading…');msg('syncMessage','Uploading existing device data…');try{const results=await Promise.all([clinicState.entries.length?supabaseClient.from('clinic_records').upsert(clinicState.entries.map(cloudRowFromRecord),{onConflict:'id'}):Promise.resolve({error:null}),endoState.entries.length?supabaseClient.from('procedure_records').upsert(endoState.entries.map(cloudRowFromRecord),{onConflict:'id'}):Promise.resolve({error:null}),syncSettingsToCloud()]);const error=results.find(r=>r?.error)?.error;if(error)throw error;await syncAllFromCloud(false);msg('syncMessage','Local data uploaded and verified.')}catch(err){console.error(err);setSyncStatus('error','Upload failed');msg('syncMessage',err.message||'Upload failed.')}}
function markSyncComplete(){saveSyncMeta({lastSyncAt:new Date().toISOString()});setSyncStatus('online','Cloud synchronized');updateSyncCounts()}
function subscribeToCloud(){if(!supabaseClient||!supabaseUser)return;if(supabaseChannel)supabaseClient.removeChannel(supabaseChannel);supabaseChannel=supabaseClient.channel(`tracker-${supabaseUser.id}`).on('postgres_changes',{event:'*',schema:'public',table:'clinic_records',filter:`user_id=eq.${supabaseUser.id}`},()=>syncAllFromCloud(false)).on('postgres_changes',{event:'*',schema:'public',table:'procedure_records',filter:`user_id=eq.${supabaseUser.id}`},()=>syncAllFromCloud(false)).on('postgres_changes',{event:'*',schema:'public',table:'app_settings',filter:`user_id=eq.${supabaseUser.id}`},()=>syncAllFromCloud(false)).subscribe()}

initStatsFilters();initClinic();initEndo();initIncome();
initSupabaseSync();


// Automatic local and Google Drive backups
let googleTokenClient=null, googleAccessToken='', cloudBackupTimer=null;
function backupPayload(){
  return {format:'gastroenterology-practice-tracker-backup',version:1,createdAt:new Date().toISOString(),clinicRecords:load(CLINIC_KEY),procedureRecords:load(ENDO_KEY),incomeSettings:JSON.parse(localStorage.getItem(INCOME_SETTINGS_KEY)||'{}'),passwordHash:localStorage.getItem(INCOME_PASSWORD_KEY)||'',theme:localStorage.getItem(THEME_KEY)||'light'};
}
function loadLocalBackups(){try{return JSON.parse(localStorage.getItem(LOCAL_BACKUPS_KEY)||'[]')}catch{return[]}}
function createAutomaticLocalBackup(reason='Data saved'){
  try{
    const backups=loadLocalBackups(), snapshot=backupPayload();snapshot.reason=reason;
    backups.unshift(snapshot);localStorage.setItem(LOCAL_BACKUPS_KEY,JSON.stringify(backups.slice(0,20)));renderBackupStatus();
  }catch(err){console.warn('Local backup failed',err)}
}
function formatBackupTime(value){if(!value)return'Never';try{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return value}}
function renderBackupStatus(){
  const backups=loadLocalBackups(), settings=loadGoogleBackupSettings();
  if($('lastLocalBackup'))$('lastLocalBackup').textContent=backups.length?formatBackupTime(backups[0].createdAt):'Never';
  if($('localBackupCount'))$('localBackupCount').textContent=backups.length;
  if($('lastCloudBackup'))$('lastCloudBackup').textContent=settings.lastCloudBackupAt?formatBackupTime(settings.lastCloudBackupAt):'Never';
  if($('googleClientId'))$('googleClientId').value=settings.clientId||'';
  if($('dailyCloudBackupEnabled'))$('dailyCloudBackupEnabled').checked=!!settings.enabled;
  if($('localBackupHistory'))$('localBackupHistory').innerHTML=backups.slice(0,5).map(b=>`<div class="backup-history-item"><div><strong>${esc(b.reason||'Automatic backup')}</strong><br><small>${formatBackupTime(b.createdAt)}</small></div><small>${(b.clinicRecords||[]).length} clinic · ${(b.procedureRecords||[]).length} procedures</small></div>`).join('')||'<small>No local backups yet.</small>';
}
function downloadBackup(){
  const data=JSON.stringify(backupPayload(),null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`gastroenterology-practice-backup-${today()}.json`;a.click();URL.revokeObjectURL(url);
}
function restoreBackupFile(file){
  const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(data.format!=='gastroenterology-practice-tracker-backup')throw new Error('Not a valid tracker backup.');if(!confirm('Restore this backup? Current tracker data will be replaced.'))return;localStorage.setItem(CLINIC_KEY,JSON.stringify(data.clinicRecords||[]));localStorage.setItem(ENDO_KEY,JSON.stringify(data.procedureRecords||[]));localStorage.setItem(INCOME_SETTINGS_KEY,JSON.stringify(data.incomeSettings||{}));if(data.passwordHash)localStorage.setItem(INCOME_PASSWORD_KEY,data.passwordHash);else localStorage.removeItem(INCOME_PASSWORD_KEY);if(data.theme)localStorage.setItem(THEME_KEY,data.theme);createAutomaticLocalBackup('Before restore');location.reload()}catch(err){alert(err.message||'Unable to restore this file.')}};reader.readAsText(file);
}
function loadGoogleBackupSettings(){try{return {...JSON.parse(localStorage.getItem(GOOGLE_BACKUP_SETTINGS_KEY)||'{}')}}catch{return{}}}
function saveGoogleBackupSettings(patch){const next={...loadGoogleBackupSettings(),...patch};localStorage.setItem(GOOGLE_BACKUP_SETTINGS_KEY,JSON.stringify(next));renderBackupStatus();return next}
function loadGoogleIdentityScript(){return new Promise((resolve,reject)=>{if(window.google?.accounts?.oauth2)return resolve();const existing=document.querySelector('script[data-google-identity]');if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;script.dataset.googleIdentity='true';script.onload=resolve;script.onerror=reject;document.head.appendChild(script)})}
async function configureGoogleTokenClient(){
  const settings=loadGoogleBackupSettings();if(!settings.clientId)throw new Error('Add your Google OAuth Client ID first.');await loadGoogleIdentityScript();
  googleTokenClient=google.accounts.oauth2.initTokenClient({client_id:settings.clientId,scope:'https://www.googleapis.com/auth/drive.file',callback:()=>{}});
}
async function requestGoogleToken(interactive=true){
  await configureGoogleTokenClient();return new Promise((resolve,reject)=>{googleTokenClient.callback=resp=>{if(resp.error)return reject(new Error(resp.error));googleAccessToken=resp.access_token;$('googleDriveStatus').textContent='Connected';resolve(googleAccessToken)};googleTokenClient.requestAccessToken({prompt:interactive?'consent':''})});
}
async function uploadBackupToGoogleDrive(interactive=false){
  const settings=loadGoogleBackupSettings();if(!settings.enabled&&!interactive)return;
  try{
    msg('backupMessage','Preparing Google Drive backup…');if(!googleAccessToken)await requestGoogleToken(interactive);
    const content=JSON.stringify(backupPayload(),null,2),fileId=localStorage.getItem(GOOGLE_DRIVE_FILE_ID_KEY);let response;
    if(fileId){
      response=await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,{method:'PATCH',headers:{Authorization:`Bearer ${googleAccessToken}`,'Content-Type':'application/json'},body:content});
      if(response.status===404)localStorage.removeItem(GOOGLE_DRIVE_FILE_ID_KEY);
    }
    if(!fileId||response?.status===404){
      const boundary='backup_'+Math.random().toString(36).slice(2),metadata={name:'Gastroenterology Practice Tracker Backup.json',mimeType:'application/json'};
      const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
      response=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{Authorization:`Bearer ${googleAccessToken}`,'Content-Type':`multipart/related; boundary=${boundary}`},body});
    }
    if(!response.ok){if(response.status===401){googleAccessToken='';throw new Error('Google authorization expired. Click Connect Google Drive again.')}throw new Error(`Google Drive backup failed (${response.status}).`)}
    const result=await response.json().catch(()=>({}));if(result.id)localStorage.setItem(GOOGLE_DRIVE_FILE_ID_KEY,result.id);
    const now=new Date().toISOString();saveGoogleBackupSettings({lastCloudBackupAt:now,lastCloudBackupDate:saudiDateKey()});msg('backupMessage','Google Drive backup completed.');$('googleDriveStatus').textContent='Connected';scheduleNextCloudBackup();
  }catch(err){msg('backupMessage',err.message||'Google Drive backup failed.');$('googleDriveStatus').textContent='Needs connection';if(!interactive)console.warn(err)}
}
function saudiDateKey(date=new Date()){const shifted=new Date(date.getTime()+3*3600000);return shifted.toISOString().slice(0,10)}
function millisecondsToNextSaudiMidnight(){const now=new Date(),shifted=new Date(now.getTime()+3*3600000);const nextShifted=Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate()+1,0,0,5);return Math.max(1000,nextShifted-3*3600000-now.getTime())}
function scheduleNextCloudBackup(){if(cloudBackupTimer)clearTimeout(cloudBackupTimer);const settings=loadGoogleBackupSettings();if(!settings.enabled)return;cloudBackupTimer=setTimeout(()=>uploadBackupToGoogleDrive(false),millisecondsToNextSaudiMidnight())}
function checkMissedDailyCloudBackup(){const settings=loadGoogleBackupSettings();if(settings.enabled&&settings.clientId&&settings.lastCloudBackupDate!==saudiDateKey())setTimeout(()=>uploadBackupToGoogleDrive(false),1500);scheduleNextCloudBackup()}
function initBackups(){
  if(!loadLocalBackups().length)createAutomaticLocalBackup('Initial backup');else renderBackupStatus();
  $('downloadBackupBtn').onclick=downloadBackup;$('restoreBackupBtn').onclick=()=>$('restoreBackupFile').click();$('restoreBackupFile').onchange=e=>{if(e.target.files[0])restoreBackupFile(e.target.files[0]);e.target.value=''};
  $('googleClientId').onchange=e=>{saveGoogleBackupSettings({clientId:e.target.value.trim()});googleTokenClient=null;googleAccessToken='';$('googleDriveStatus').textContent='Not connected'};
  $('dailyCloudBackupEnabled').onchange=e=>{saveGoogleBackupSettings({enabled:e.target.checked});if(e.target.checked)checkMissedDailyCloudBackup();else scheduleNextCloudBackup()};
  $('connectGoogleDriveBtn').onclick=async()=>{try{await requestGoogleToken(true);msg('backupMessage','Google Drive connected.');if($('dailyCloudBackupEnabled').checked)await uploadBackupToGoogleDrive(false)}catch(err){msg('backupMessage',err.message||'Unable to connect Google Drive.')}};
  $('cloudBackupNowBtn').onclick=()=>uploadBackupToGoogleDrive(true);checkMissedDailyCloudBackup();
}

initBackups();

// Monthly clinic trend tabs
document.querySelectorAll('[data-clinic-trend]').forEach(btn=>btn.addEventListener('click',()=>setClinicTrendView(btn.dataset.clinicTrend)));
