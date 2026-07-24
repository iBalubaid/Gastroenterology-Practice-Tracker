const CLINIC_KEY="dailyClinicTrackerEntriesV1", ENDO_KEY="hmgEndoscopyEntriesV1", PENDING_KEY="practicePendingEndoscopyV1", ADMISSION_KEY="practiceAdmissionTrackerV1", THEME_KEY="dailyClinicTrackerTheme", INCOME_SETTINGS_KEY="practiceIncomeSettingsV1", INCOME_PASSWORD_KEY="practiceIncomePasswordHashV1";
const LOCAL_BACKUPS_KEY="practiceAutomaticBackupsV1";
const GOOGLE_CLIENT_ID_KEY="practiceGoogleDriveClientIdV1";
const GOOGLE_DRIVE_LAST_BACKUP_KEY="practiceGoogleDriveLastBackupV1";
const GOOGLE_DRIVE_AUTO_KEY="practiceGoogleDriveAutoBackupV1";
const GOOGLE_DRIVE_FILE_NAME="gastroenterology-practice-tracker-latest.json";
const FACE_ID_CREDENTIAL_KEY="practiceFaceIdCredentialV1";
const FACE_ID_ENABLED_KEY="practiceFaceIdEnabledV1";
const GOOGLE_DRIVE_SCOPE="https://www.googleapis.com/auth/drive.appdata";
const clinicState={entries:load(CLINIC_KEY),search:"",filter:"",expandedId:""};
const endoState={entries:load(ENDO_KEY),search:"",filter:"",expandedId:""};
const pendingState={entries:load(PENDING_KEY),hospital:"HMG Fayhaa",search:"",view:"queue",expandedId:""};
const admissionState={entries:load(ADMISSION_KEY),search:"",status:"active",expandedId:""};
let activePendingId="";
const statsState={period:'all',hospital:'all',from:'',to:''};
const $=id=>document.getElementById(id);
const LAST_CLINIC_KEY='practiceLastClinicV1', LAST_ENDO_HOSPITAL_KEY='practiceLastEndoscopyHospitalV1';
let toastTimer=null;
function haptic(kind='success'){
  try{if(!navigator.vibrate)return;const pattern=kind==='error'?[35,45,35]:kind==='delete'?[25,35,25]:[18];navigator.vibrate(pattern)}catch{}
}
function showToast(text,kind='success'){
  const el=$('appToast');if(!el)return;el.textContent=text;el.className=`app-toast show ${kind}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.className='app-toast'},1500);haptic(kind);
}
function setSaveStatus(state,text){const el=$('saveStatus');if(!el)return;el.className=`save-status ${state}`;el.title=text;const b=el.querySelector('b');if(b)b.textContent=text}
function beginSave(button,label){setSaveStatus('saving','Saving');if(button){button.disabled=true;button.dataset.originalLabel=label.textContent;label.textContent='Saving…'}}
function finishSave(button,label,message){setSaveStatus('saved','Saved');if(button){label.textContent='✓ Saved';setTimeout(()=>{button.disabled=false;label.textContent=button.dataset.originalLabel||'Save'},700)}showToast(message,'success')}
function failSave(button,label,message,id){setSaveStatus('error','Save failed');if(button){button.disabled=false;label.textContent=button.dataset.originalLabel||'Save'}if(id)msg(id,message);showToast(message,'error')}
function validationMessage(id,text){msg(id,text);setSaveStatus('error','Check entry');showToast(text,'error')}
function applyQuickProcedure(values){
  const selected=String(values||'').split('|').filter(Boolean);
  document.querySelectorAll('#procedureChoices input').forEach(input=>input.checked=selected.includes(input.value));
  document.querySelectorAll('.quick-procedure-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.procedures===values));
  haptic('success');
}


function activateModule(moduleId,tab=null){
  document.querySelectorAll('.module-tab,.module-panel').forEach(x=>x.classList.remove('active'));
  const targetTab=tab||document.querySelector(`.module-tab[data-module="${moduleId}"]`);
  if(targetTab&&!targetTab.classList.contains('hidden'))targetTab.classList.add('active');
  $(moduleId)?.classList.add('active');
}
document.querySelectorAll('.module-tab').forEach(btn=>btn.addEventListener('click',()=>activateModule(btn.dataset.module,btn)));
applyTheme();$('themeToggle').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem(THEME_KEY,document.body.classList.contains('dark')?'dark':'light');updateThemeButton();haptic('success')};

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
function initClinic(){ $('date').value=today(); updateDay('date','day'); const last=localStorage.getItem(LAST_CLINIC_KEY)||'HMG Fayhaa';selectClinicType(isInpatient(last)?'inpatient':'outpatient',false);selectClinicHospital(clinicHospital({clinic:last})||'HMG Fayhaa');updatePatientTotal();renderClinic(); }
$('date').onchange=()=>updateDay('date','day');document.querySelectorAll('[data-clinic-hospital]').forEach(btn=>btn.onclick=()=>selectClinicHospital(btn.dataset.clinicHospital));document.querySelectorAll('[data-duration]').forEach(btn=>btn.onclick=()=>selectClinicDuration(btn.dataset.duration));document.querySelectorAll('[data-consultation-type]').forEach(btn=>btn.onclick=()=>selectClinicType(btn.dataset.consultationType));$('newConsultations').oninput=updatePatientTotal;$('followUps').oninput=updatePatientTotal;$('inpatientConsultations').oninput=updatePatientTotal;clinicForm.onsubmit=saveClinic;$('resetFormBtn').onclick=resetClinic;$('exportBtn').onclick=exportClinic;$('clearAllBtn').onclick=clearClinic;
$('searchInput').oninput=e=>{clinicState.search=e.target.value.toLowerCase();renderClinicRows()}; $('clinicFilter').onchange=e=>{clinicState.filter=e.target.value;renderClinicRows()};
function isInpatient(v=$('clinic').value){return String(v||'').startsWith('Inpatient Consultation')}
function selectedClinicHospital(){return document.querySelector('[data-clinic-hospital].active')?.dataset.clinicHospital||clinicHospital({clinic:$('clinic').value})||''}
function updateClinicValue(){const hospital=selectedClinicHospital(),type=$('consultationType').value;$('clinic').value=hospital?(type==='inpatient'?`Inpatient Consultation ${hospital}`:hospital):''}
function selectClinicType(type,refresh=true){$('consultationType').value=type;document.querySelectorAll('[data-consultation-type]').forEach(btn=>btn.classList.toggle('active',btn.dataset.consultationType===type));$('outpatientClinicFields').classList.toggle('hidden',type!=='outpatient');$('inpatientClinicFields').classList.toggle('hidden',type!=='inpatient');$('clinicDurationField')?.classList.toggle('hidden',type!=='outpatient');$('clinicTotalLabel').textContent=type==='inpatient'?'Inpatient consultations':'Total patients';updateClinicValue();if(refresh)updatePatientTotal()}
function updatePatientTotal(){const inpatient=$('consultationType').value==='inpatient';const n=inpatient?Math.max(0,Number($('inpatientConsultations').value||0)):Math.max(0,Number($('newConsultations').value||0));const f=inpatient?0:Math.max(0,Number($('followUps').value||0));const total=n+f;$('totalPatients').value=total;if($('clinicTotalPreview'))$('clinicTotalPreview').textContent=total}
function updateClinicVisibility(){updatePatientTotal()}
function selectClinicHospital(value){const base=String(value||'').replace(/^Inpatient Consultation /,'');document.querySelectorAll('[data-clinic-hospital]').forEach(btn=>btn.classList.toggle('active',btn.dataset.clinicHospital===base));updateClinicValue()}
function selectClinicDuration(value){$('duration').value=value;document.querySelectorAll('[data-duration]').forEach(btn=>btn.classList.toggle('active',String(btn.dataset.duration)===String(value)))}
function saveClinic(e){
  e.preventDefault();$('formMessage').textContent='';
  const button=e.submitter||clinicForm.querySelector('button[type="submit"]'),label=$('submitLabel');
  const inpatient=$('consultationType').value==='inpatient';
  const n=inpatient?Number($('inpatientConsultations').value||0):Number($('newConsultations').value||0),f=inpatient?0:Number($('followUps').value||0);
  if(!$('date').value||!$('clinic').value)return validationMessage('formMessage','Please select a date and hospital.');
  if(!Number.isInteger(n)||n<0||!Number.isInteger(f)||f<0)return validationMessage('formMessage','Enter whole numbers of zero or more.');
  beginSave(button,label);
  try{
    const total=n+f;const duration=inpatient?null:($('duration').value===''?null:Number($('duration').value));const item={id:$('editingId').value||uid(),date:$('date').value,day:getDay($('date').value),clinic:$('clinic').value,duration,totalPatients:total,newConsultations:n,followUps:f,updatedAt:new Date().toISOString()};
    upsert(clinicState.entries,item);persist(CLINIC_KEY,clinicState.entries);localStorage.setItem(LAST_CLINIC_KEY,item.clinic);
    resetClinic();renderClinic();finishSave(button,label,inpatient?`Inpatient consultations saved · ${n}`:`Clinic saved · New ${n} · Follow-up ${f}`);
  }catch(err){console.error(err);failSave(button,label,'Unable to save clinic. Your entry is still on screen.','formMessage')}
}
function resetClinic(){clinicForm.reset();$('editingId').value='';$('date').value=today();updateDay('date','day');$('newConsultations').value=0;$('followUps').value=0;$('inpatientConsultations').value=0;$('submitLabel').textContent='Save clinic';$('formMessage').textContent='';const last=localStorage.getItem(LAST_CLINIC_KEY)||'HMG Fayhaa';selectClinicType(isInpatient(last)?'inpatient':'outpatient',false);selectClinicHospital(clinicHospital({clinic:last})||'HMG Fayhaa');selectClinicDuration('4');updatePatientTotal()}
function editClinic(id){const x=clinicState.entries.find(e=>String(e.id)===String(id));if(!x)return;$('editingId').value=x.id;$('date').value=x.date;updateDay('date','day');selectClinicType(isInpatient(x.clinic)?'inpatient':'outpatient',false);selectClinicHospital(clinicHospital(x));selectClinicDuration(x.duration==null?'':String(x.duration));if(isInpatient(x.clinic)){$('inpatientConsultations').value=x.totalPatients??((x.newConsultations||0)+(x.followUps||0));$('newConsultations').value=0;$('followUps').value=0}else{$('newConsultations').value=x.newConsultations||0;$('followUps').value=x.followUps||0;$('inpatientConsultations').value=0}updatePatientTotal();$('submitLabel').textContent='Update clinic';scrollTo(0,0)}
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
function toggleClinicDetails(id){clinicState.expandedId=String(clinicState.expandedId)===String(id)?'':String(id);renderClinicRows()}
function renderClinicRows(){const list=[...clinicState.entries].filter(e=>(!clinicState.filter||e.clinic===clinicState.filter)&&(!clinicState.search||`${e.date} ${e.clinic}`.toLowerCase().includes(clinicState.search))).sort(sortDesc);if($('clinicActivityLogCount'))$('clinicActivityLogCount').textContent=list.length;$('recordsBody').innerHTML='';$('emptyState').classList.toggle('hidden',list.length>0);list.forEach(e=>{const expanded=String(clinicState.expandedId)===String(e.id);$('recordsBody').insertAdjacentHTML('beforeend',`<tr class="clinic-log-row ${expanded?'expanded':''}" onclick="toggleClinicDetails('${e.id}')" aria-expanded="${expanded}"><td data-label="Date" class="clinic-log-date"><strong>${fmtDate(e.date)}</strong><span class="clinic-log-day">${e.day||getDay(e.date)}</span></td><td data-label="Day" class="clinic-log-day-cell">${e.day||getDay(e.date)}</td><td data-label="Clinic / Service" class="clinic-log-service"><span class="service-badge ${isInpatient(e.clinic)?'inpatient-badge':''}">${esc(e.clinic)}</span></td><td data-label="Duration" class="clinic-log-detail">${e.duration==null?'—':e.duration+' hr'}</td><td data-label="Total patients" class="clinic-log-total"><strong>${e.totalPatients??'—'}</strong><span class="clinic-log-total-label"> patients</span></td><td data-label="New" class="clinic-log-detail">${e.newConsultations}</td><td data-label="Follow-up" class="clinic-log-detail">${e.followUps}</td><td data-label="Actions" class="actions-cell clinic-log-actions"><button class="icon-btn" onclick="event.stopPropagation();editClinic('${e.id}')">Edit</button><button class="icon-btn delete" onclick="event.stopPropagation();deleteClinic('${e.id}')">Delete</button></td></tr>`)})}
window.toggleClinicDetails=toggleClinicDetails;window.editClinic=editClinic;window.deleteClinic=id=>{const key=String(id),x=clinicState.entries.find(e=>String(e.id)===key);if(x&&confirm(`Delete the entry for ${x.clinic} on ${fmtDate(x.date)}?`)){createAutomaticLocalBackup('Before deleting clinic entry');clinicState.entries=clinicState.entries.filter(e=>String(e.id)!==key);persist(CLINIC_KEY,clinicState.entries);renderClinic();showToast('Clinic entry deleted','delete')}};
function clearClinic(){if(!clinicState.entries.length)return alert('There are no clinic entries to clear.');if(confirm(`Delete all ${clinicState.entries.length} clinic entries? This cannot be undone.`)){createAutomaticLocalBackup('Before clearing clinic log');clinicState.entries=[];persist(CLINIC_KEY,[]);renderClinic();alert('Clinic log cleared.')}}
function exportClinic(){downloadCsv('clinic-activity', ['Date','Day','Clinic / Service','Duration (hours)','Total patients','New consultations','Follow-ups'],clinicState.entries.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.day||getDay(e.date),e.clinic,e.duration??'',e.totalPatients??'',e.newConsultations,e.followUps]))}

// Optional admission tracker
function admissionDayCount(entry,asOf=today()){
  const end=entry.dischargeDate||asOf;if(!entry.startDate||end<entry.startDate)return 0;
  const startDate=new Date(entry.startDate+'T12:00:00'),endDate=new Date(end+'T12:00:00');
  return Math.floor((endDate-startDate)/86400000)+1;
}
function admissionFees(entry){const days=admissionDayCount(entry),initial=Number(incomeSettings?.fees?.['Inpatient Initial Consultation']??110),follow=Number(incomeSettings?.fees?.['Inpatient Follow-up']??110);return days?initial+Math.max(0,days-1)*follow:0}
function initAdmissions(){
  if(!$('admissionForm'))return;
  $('admissionStartDate').value=today();$('admissionForm').onsubmit=saveAdmission;$('resetAdmissionBtn').onclick=resetAdmission;
  $('admissionStatusFilter').onchange=e=>{admissionState.status=e.target.value;renderAdmissions()};$('admissionSearch').oninput=e=>{admissionState.search=e.target.value.trim().toLowerCase();renderAdmissions()};renderAdmissions();
}
function saveAdmission(ev){ev.preventDefault();const id=$('admissionEditingId').value,mrn=$('admissionMrn').value.trim(),hospital=$('admissionHospital').value,startDate=$('admissionStartDate').value,dischargeDate=$('admissionDischargeDate').value,note=$('admissionNote').value.trim();
  if(!mrn||!hospital||!startDate)return validationMessage('admissionMessage','Enter MRN, hospital, and initial consultation date.');
  if(dischargeDate&&dischargeDate<startDate)return validationMessage('admissionMessage','Discharge date cannot be before the initial consultation date.');
  const duplicate=admissionState.entries.find(x=>String(x.id)!==String(id)&&x.mrn===mrn&&!x.dischargeDate);if(duplicate&&!confirm(`MRN ${mrn} is already being tracked at ${duplicate.hospital} since ${fmtDate(duplicate.startDate)}. Add another admission?`))return;
  const entry={id:id||uid(),mrn,hospital,startDate,dischargeDate,note,createdAt:new Date().toISOString()};
  if(id)admissionState.entries=admissionState.entries.map(x=>String(x.id)===String(id)?{...x,...entry}:x);else admissionState.entries.push(entry);
  persist(ADMISSION_KEY,admissionState.entries);createAutomaticLocalBackup(id?'Admission updated':'Admission added');resetAdmission();renderAdmissions();renderBackupStatus();showToast(id?'Admission updated':'Admission tracking started');
}
function resetAdmission(){$('admissionForm').reset();$('admissionEditingId').value='';$('admissionStartDate').value=today();$('admissionHospital').value='HMG Fayhaa';$('admissionSubmitLabel').textContent='Start tracking';msg('admissionMessage','')}
function renderAdmissions(){if(!$('admissionList'))return;const q=admissionState.search;let list=[...admissionState.entries].filter(x=>(!q||`${x.mrn} ${x.hospital} ${x.note||''}`.toLowerCase().includes(q))&&(admissionState.status==='all'||(admissionState.status==='active'?!x.dischargeDate:!!x.dischargeDate))).sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||''));
  const active=admissionState.entries.filter(x=>!x.dischargeDate),activeDays=active.reduce((n,x)=>n+admissionDayCount(x),0),allFees=admissionState.entries.reduce((n,x)=>n+admissionFees(x),0);
  $('admissionActiveCount').textContent=active.length;$('admissionConsultationDays').textContent=activeDays;$('admissionInitialCount').textContent=admissionState.entries.length;$('admissionEstimatedFees').textContent=money(allFees);
  $('admissionEmpty').classList.toggle('hidden',list.length>0);$('admissionList').innerHTML=list.map(x=>{const days=admissionDayCount(x),follow=Math.max(0,days-1),expanded=String(admissionState.expandedId)===String(x.id);return `<article class="admission-row ${expanded?'expanded':''}" onclick="toggleAdmission('${x.id}')"><div class="admission-row-main"><div><strong>MRN ${esc(x.mrn)}</strong><small>${esc(x.hospital)} · ${x.dischargeDate?'Discharged':'Active'}</small></div><div class="admission-day-badge">Day ${days}</div></div><div class="admission-row-details"><div><span>Initial consultation</span><strong>${fmtDate(x.startDate)}</strong></div><div><span>Follow-up days</span><strong>${follow}</strong></div><div><span>Total billable days</span><strong>${days}</strong></div><div><span>Estimated fee</span><strong>${money(admissionFees(x))}</strong></div>${x.dischargeDate?`<div><span>Discharge</span><strong>${fmtDate(x.dischargeDate)}</strong></div>`:''}${x.note?`<p>${esc(x.note)}</p>`:''}<div class="admission-actions"><button class="secondary-btn" onclick="event.stopPropagation();editAdmission('${x.id}')">Edit</button>${!x.dischargeDate?`<button class="primary-btn" onclick="event.stopPropagation();dischargeAdmission('${x.id}')">Discharge today</button>`:''}<button class="danger-btn" onclick="event.stopPropagation();deleteAdmission('${x.id}')">Delete</button></div></div></article>`}).join('');
}
function toggleAdmission(id){admissionState.expandedId=String(admissionState.expandedId)===String(id)?'':String(id);renderAdmissions()}
function editAdmission(id){const x=admissionState.entries.find(x=>String(x.id)===String(id));if(!x)return;$('admissionEditingId').value=x.id;$('admissionMrn').value=x.mrn;$('admissionHospital').value=x.hospital;$('admissionStartDate').value=x.startDate;$('admissionDischargeDate').value=x.dischargeDate||'';$('admissionNote').value=x.note||'';$('admissionSubmitLabel').textContent='Update admission';$('admissionComposer').open=true;$('admissionComposer').scrollIntoView({behavior:'smooth',block:'start'})}
function dischargeAdmission(id){const x=admissionState.entries.find(x=>String(x.id)===String(id));if(!x)return;const date=prompt('Discharge date (YYYY-MM-DD):',today());if(!date)return;if(date<x.startDate)return alert('Discharge date cannot be before the initial consultation date.');createAutomaticLocalBackup('Before discharge');x.dischargeDate=date;persist(ADMISSION_KEY,admissionState.entries);renderAdmissions();showToast('Admission marked discharged')}
function deleteAdmission(id){const x=admissionState.entries.find(x=>String(x.id)===String(id));if(x&&confirm(`Delete admission tracking for MRN ${x.mrn}?`)){createAutomaticLocalBackup('Before deleting admission');admissionState.entries=admissionState.entries.filter(x=>String(x.id)!==String(id));persist(ADMISSION_KEY,admissionState.entries);renderAdmissions();showToast('Admission deleted','delete')}}
window.toggleAdmission=toggleAdmission;window.editAdmission=editAdmission;window.dischargeAdmission=dischargeAdmission;window.deleteAdmission=deleteAdmission;

// Pending endoscopy module
const pendingForm=$('pendingForm');
function initPending(){$('pendingDate').value=today();pendingForm.addEventListener('submit',savePending);$('resetPendingBtn').onclick=()=>resetPending();$('clearPendingBtn').onclick=clearPending;$('openPendingComposerBtn').onclick=()=>togglePendingComposer(true);$('addPendingInlineBtn').onclick=()=>togglePendingComposer(true);$('closePendingComposerBtn').onclick=()=>togglePendingComposer(false);$('pendingSearch').oninput=e=>{pendingState.search=e.target.value.toLowerCase();renderPending()};document.querySelectorAll('[data-pending-hospital]').forEach(btn=>btn.onclick=()=>setPendingHospital(btn.dataset.pendingHospital));document.querySelectorAll('[data-pending-view]').forEach(btn=>btn.onclick=()=>setPendingView(btn.dataset.pendingView));renderPending()}

function togglePendingComposer(open){const composer=$('pendingComposer');if(!composer)return;const shouldOpen=Boolean(open);composer.classList.toggle('open',shouldOpen);composer.hidden=false;composer.setAttribute('aria-hidden',String(!shouldOpen));document.body.classList.toggle('pending-composer-open',shouldOpen);if(shouldOpen){composer.scrollTop=0;setTimeout(()=>{const mrn=$('pendingMrn');if(mrn){mrn.focus({preventScroll:true});mrn.scrollIntoView({block:'center'})}},80)}else resetPending()}
function togglePendingDetails(id){pendingState.expandedId=String(pendingState.expandedId)===String(id)?'':String(id);renderPending()}
function pendingDateLabel(date){if(date===today())return'Today';const d=new Date(`${date}T00:00:00`);if(Number.isNaN(d.getTime()))return fmtDate(date);return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}
function pendingProcedures(){return [...document.querySelectorAll('#pendingProcedureChoices input:checked')].map(x=>x.value)}
function pendingWeekRange(){const now=new Date(`${today()}T00:00:00`),day=now.getDay(),start=new Date(now);start.setDate(now.getDate()-day);const end=new Date(start);end.setDate(start.getDate()+6);const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return{start:iso(start),end:iso(end)}}
function setPendingView(view){pendingState.view=['queue','today','week'].includes(view)?view:'queue';document.querySelectorAll('[data-pending-view]').forEach(btn=>{const selected=btn.dataset.pendingView===pendingState.view;btn.classList.toggle('active',selected);btn.setAttribute('aria-selected',String(selected))});renderPending()}
function pendingMatchesView(entry){if(pendingState.view==='today')return entry.date===today();if(pendingState.view==='week'){const range=pendingWeekRange();return entry.date>=range.start&&entry.date<=range.end}return true}

function setPendingHospital(hospital){pendingState.hospital=hospital;$('pendingHospital').value=hospital;document.querySelectorAll('[data-pending-hospital]').forEach(btn=>{const selected=btn.dataset.pendingHospital===hospital;btn.classList.toggle('active',selected);btn.setAttribute('aria-selected',String(selected))});const short=hospital==='HMG Fayhaa'?'Fayhaa':'Mohammadiya';$('pendingFormTitle').textContent=`Pending – ${short}`;$('pendingQueueTitle').textContent=`Pending – ${short}`;resetPending(false);renderPending()}
function savePending(e){
  e.preventDefault();$('pendingMessage').textContent='';const procedures=pendingProcedures();
  if(!$('pendingDate').value||!$('pendingMrn').value.trim())return validationMessage('pendingMessage','Please enter a date and MRN.');
  if(!procedures.length)return validationMessage('pendingMessage','Select at least one planned procedure.');
  const enteredMrn=$('pendingMrn').value.trim();
  const editingId=String($('pendingEditingId').value||'');
  const duplicateEntries=pendingState.entries.filter(item=>String(item.id)!==editingId&&String(item.mrn||'').trim().toLowerCase()===enteredMrn.toLowerCase());
  if(duplicateEntries.length){
    const details=duplicateEntries.map((item,index)=>{
      const proceduresText=(item.procedures||[]).join(', ')||'No procedure';
      const noteText=item.note?`\nNotes: ${item.note}`:'';
      return `${index+1}. ${item.hospital||'Hospital not specified'} · ${fmtDate(item.date)}\nProcedures: ${proceduresText}${noteText}`;
    }).join('\n\n');
    const continueAdding=confirm(`MRN ${enteredMrn} is already in the Pending list:\n\n${details}\n\nDo you want to add another pending entry for this MRN?`);
    if(!continueAdding)return validationMessage('pendingMessage','This MRN is already in Pending. The new entry was not added.');
  }
  const button=e.submitter||pendingForm.querySelector('button[type="submit"]'),label=$('pendingSubmitLabel');beginSave(button,label);
  try{const item={id:$('pendingEditingId').value||uid(),date:$('pendingDate').value,mrn:$('pendingMrn').value.trim(),hospital:pendingState.hospital,procedures,note:$('pendingNote').value.trim(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};upsert(pendingState.entries,item);persist(PENDING_KEY,pendingState.entries);createAutomaticLocalBackup('Pending patient saved');togglePendingComposer(false);renderPending();finishSave(button,label,'Pending patient saved')}
  catch(err){console.error(err);failSave(button,label,'Unable to save pending patient. Your entry is still on screen.','pendingMessage')}
}
function resetPending(resetDate=true){pendingForm.reset();$('pendingEditingId').value='';$('pendingHospital').value=pendingState.hospital;if(resetDate)$('pendingDate').value=today();$('pendingSubmitLabel').textContent='Add to pending';$('pendingMessage').textContent=''}
function editPending(id){const item=pendingState.entries.find(x=>String(x.id)===String(id));if(!item)return;togglePendingComposer(true);if(item.hospital!==pendingState.hospital)setPendingHospital(item.hospital);$('pendingEditingId').value=item.id;$('pendingDate').value=item.date;$('pendingMrn').value=item.mrn;$('pendingNote').value=item.note||'';document.querySelectorAll('#pendingProcedureChoices input').forEach(x=>x.checked=(item.procedures||[]).includes(x.value));$('pendingSubmitLabel').textContent='Update pending';scrollTo(0,0)}
function deletePending(id){const key=String(id),item=pendingState.entries.find(x=>String(x.id)===key);if(item&&confirm(`Remove MRN ${item.mrn} from pending?`)){createAutomaticLocalBackup('Before deleting pending patient');pendingState.entries=pendingState.entries.filter(x=>String(x.id)!==key);persist(PENDING_KEY,pendingState.entries);renderPending()}}
function clearPending(){const count=pendingState.entries.filter(x=>x.hospital===pendingState.hospital).length;if(!count)return alert('This pending queue is empty.');if(confirm(`Clear all ${count} pending patients for ${pendingState.hospital}?`)){createAutomaticLocalBackup('Before clearing pending queue');pendingState.entries=pendingState.entries.filter(x=>x.hospital!==pendingState.hospital);persist(PENDING_KEY,pendingState.entries);renderPending()}}
function startPending(id){const item=pendingState.entries.find(x=>String(x.id)===String(id));if(!item)return;resetEndo();activePendingId=String(item.id);$('endoscopyDate').value=item.date||today();updateDay('endoscopyDate','endoscopyDay');$('mrn').value=item.mrn;selectEndoscopyHospital(item.hospital);$('endoscopyNote').value=item.note||'';document.querySelectorAll('#procedureChoices input, #additionalProcedureChoices input[type="checkbox"][value]').forEach(x=>x.checked=(item.procedures||[]).includes(x.value));$('endoscopySubmitLabel').textContent='Complete procedure';activateModule('endoscopyModule');scrollTo(0,0)}
function chooseFromPending(){activateModule('pendingModule')}
function renderPending(){
  const hospitalEntries=pendingState.entries.filter(x=>x.hospital===pendingState.hospital),todayDate=today(),week=pendingWeekRange();
  const f=pendingState.entries.filter(x=>x.hospital==='HMG Fayhaa').length,m=pendingState.entries.filter(x=>x.hospital==='HMG Mohammadiya').length;
  $('pendingFayhaaCount').textContent=f;$('pendingMohammadiyaCount').textContent=m;
  $('pendingQueueCount').textContent=hospitalEntries.length;
  $('pendingTodayCount').textContent=hospitalEntries.filter(x=>x.date===todayDate).length;
  $('pendingWeekCount').textContent=hospitalEntries.filter(x=>x.date>=week.start&&x.date<=week.end).length;
  const viewLabels={queue:'Full queue',today:`Today · ${fmtDate(todayDate)}`,week:`This week · ${fmtDate(week.start)}–${fmtDate(week.end)}`};
  $('pendingViewSummary').textContent=viewLabels[pendingState.view];
  const emptyLabels={queue:'Add a planned patient above.',today:'No patients are scheduled for today.',week:'No patients are scheduled for this week.'};
  $('pendingEmptyText').textContent=emptyLabels[pendingState.view];
  const q=pendingState.search,list=hospitalEntries.filter(x=>pendingMatchesView(x)&&(!q||`${x.mrn} ${(x.procedures||[]).join(' ')} ${x.note||''}`.toLowerCase().includes(q))).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||'').localeCompare(b.createdAt||''));
  $('pendingList').innerHTML='';$('pendingEmptyState').classList.toggle('hidden',list.length>0);
  list.forEach((x,i)=>{const expanded=String(pendingState.expandedId)===String(x.id),procedures=(x.procedures||[]),isOverdue=Boolean(x.date&&x.date<today());$('pendingList').insertAdjacentHTML('beforeend',`<article class="pending-item compact ${expanded?'expanded':''} ${isOverdue?'overdue':''}" data-pending-id="${esc(x.id)}"><button class="pending-row" type="button" onclick="togglePendingDetails('${x.id}')" aria-expanded="${expanded}"><span class="pending-order">${i+1}</span><span class="pending-row-main"><span class="pending-row-top"><strong>MRN ${esc(x.mrn)}</strong><span class="pending-date-badge ${x.date===today()?'today':''} ${isOverdue?'overdue':''}">${isOverdue?'Overdue · ':''}${esc(pendingDateLabel(x.date))}</span></span><span class="pending-row-procedures">${procedures.map(esc).join(' · ')||'No procedure'}</span></span><span class="pending-chevron">${expanded?'⌃':'⌄'}</span></button><div class="pending-details" ${expanded?'':'hidden'}><div class="pending-tags">${procedures.map(p=>`<span class="tag">${esc(p)}</span>`).join('')}</div>${x.note?`<p class="pending-note">${esc(x.note)}</p>`:''}<div class="pending-actions"><button class="primary-btn compact-btn" type="button" onclick="event.stopPropagation();startPending('${x.id}')">Start</button><button class="icon-btn" type="button" onclick="event.stopPropagation();editPending('${x.id}')">Edit</button><button class="icon-btn delete" type="button" onclick="event.stopPropagation();deletePending('${x.id}')">Delete</button></div></div></article>`)})
}
window.editPending=editPending;window.deletePending=deletePending;window.startPending=startPending;window.togglePendingDetails=togglePendingDetails;

// Endoscopy module
const endoForm=$('endoscopyForm');
function selectEndoscopyHospital(value){$('hospital').value=value||'';document.querySelectorAll('[data-endoscopy-hospital]').forEach(btn=>btn.classList.toggle('active',btn.dataset.endoscopyHospital===value))}
function initEndo(){$('endoscopyDate').value=today();updateDay('endoscopyDate','endoscopyDay');const last=localStorage.getItem(LAST_ENDO_HOSPITAL_KEY)||'HMG Fayhaa';selectEndoscopyHospital(last);document.querySelectorAll('[data-endoscopy-hospital]').forEach(btn=>btn.onclick=()=>selectEndoscopyHospital(btn.dataset.endoscopyHospital));document.querySelectorAll('.quick-procedure-btn').forEach(btn=>btn.onclick=()=>applyQuickProcedure(btn.dataset.procedures));document.querySelectorAll('.quick-count-group').forEach(group=>group.querySelectorAll('button').forEach(btn=>btn.onclick=()=>setQuickInterventionCount(group.dataset.target,Number(btn.dataset.count||0))));renderEndo();renderQuickInterventionCounts()}
$('endoscopyDate').onchange=()=>updateDay('endoscopyDate','endoscopyDay'); endoForm.onsubmit=saveEndo; $('fromPendingBtn').onclick=chooseFromPending; $('resetEndoscopyBtn').onclick=resetEndo;$('exportEndoscopyBtn').onclick=exportEndo;$('clearEndoscopyBtn').onclick=clearEndo;$('endoscopySearch').oninput=e=>{endoState.search=e.target.value.toLowerCase();renderEndoRows()};$('hospitalFilter').onchange=e=>{endoState.filter=e.target.value;renderEndoRows()};
function validProcedures(entry){return (Array.isArray(entry?.procedures)?entry.procedures:[]).filter(value=>value&&value!=='on')}
function selectedProcedures(){return [...document.querySelectorAll('#procedureChoices input:checked, #additionalProcedureChoices input[type="checkbox"][value]:checked')].map(x=>x.value)}
function extrasFromForm(){return{polypectomy:Number($('polypectomy').value||0),clipping:Number($('clipping').value||0),sclerotherapy:$('sclerotherapy').checked,varicealBanding:$('varicealBanding').checked,duodenalStenting:$('duodenalStenting').checked,esophagealStenting:$('esophagealStenting').checked,colonicStenting:$('colonicStenting').checked,metallicBiliaryStenting:$('metallicBiliaryStenting').checked}}
function setQuickInterventionCount(target,count){const input=$(target);if(!input)return;input.value=count;renderQuickInterventionCounts();if(navigator.vibrate)navigator.vibrate(15)}
function renderQuickInterventionCounts(){document.querySelectorAll('.quick-count-group').forEach(group=>{const value=Math.max(0,Number($(group.dataset.target)?.value||0));group.querySelectorAll('button').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.count)===Math.min(value,4)))})}
function saveEndo(e){
  e.preventDefault();$('endoscopyMessage').textContent='';const procedures=selectedProcedures();
  if(!$('endoscopyDate').value||!$('mrn').value.trim()||!$('hospital').value)return validationMessage('endoscopyMessage','Please complete date, MRN, and hospital.');
  if(!procedures.length)return validationMessage('endoscopyMessage','Select at least one procedure.');
  const button=e.submitter||endoForm.querySelector('button[type="submit"]'),label=$('endoscopySubmitLabel');beginSave(button,label);
  try{const item={id:$('endoscopyEditingId').value||uid(),date:$('endoscopyDate').value,day:getDay($('endoscopyDate').value),mrn:$('mrn').value.trim(),hospital:$('hospital').value,procedures,extras:extrasFromForm(),note:$('endoscopyNote').value.trim(),updatedAt:new Date().toISOString()};upsert(endoState.entries,item);persist(ENDO_KEY,endoState.entries);localStorage.setItem(LAST_ENDO_HOSPITAL_KEY,item.hospital);const completedPending=Boolean(activePendingId);if(activePendingId){pendingState.entries=pendingState.entries.filter(x=>String(x.id)!==String(activePendingId));persist(PENDING_KEY,pendingState.entries);activePendingId='';renderPending()}resetEndo();renderEndo();finishSave(button,label,completedPending?'Pending procedure completed':'Procedure saved');if(completedPending)setTimeout(()=>activateModule('pendingModule'),250)}
  catch(err){console.error(err);failSave(button,label,'Unable to save procedure. Your entry is still on screen.','endoscopyMessage')}
}
function resetEndo(){activePendingId='';endoForm.reset();$('endoscopyEditingId').value='';$('endoscopyDate').value=today();updateDay('endoscopyDate','endoscopyDay');const last=localStorage.getItem(LAST_ENDO_HOSPITAL_KEY);selectEndoscopyHospital(last||'HMG Fayhaa');$('polypectomy').value=0;$('clipping').value=0;$('endoscopyNote').value='';$('endoscopySubmitLabel').textContent='Save procedure';$('endoscopyMessage').textContent='';$('endoscopyMoreDetails')?.removeAttribute('open');document.querySelectorAll('.quick-procedure-btn').forEach(x=>x.classList.remove('active'));renderQuickInterventionCounts()}
function editEndo(id){const e=endoState.entries.find(x=>x.id===id);if(!e)return;$('endoscopyEditingId').value=e.id;$('endoscopyDate').value=e.date;updateDay('endoscopyDate','endoscopyDay');$('mrn').value=e.mrn;selectEndoscopyHospital(e.hospital);$('endoscopyNote').value=e.note||'';document.querySelectorAll('#procedureChoices input, #additionalProcedureChoices input[type="checkbox"]').forEach(x=>x.checked=validProcedures(e).includes(x.value));Object.entries(e.extras||{}).forEach(([k,v])=>{if($(k))$(k).type==='checkbox'?$(k).checked=!!v:$(k).value=v});$('endoscopySubmitLabel').textContent='Update procedure';if((e.note||'')||extrasText(e).length)$('endoscopyMoreDetails')?.setAttribute('open','');document.querySelector('[data-module="endoscopyModule"]').click();scrollTo(0,0)}
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
function toggleEndoDetails(id){endoState.expandedId=String(endoState.expandedId)===String(id)?'':String(id);renderEndoRows()}
function renderEndoRows(){const list=[...endoState.entries].filter(e=>(!endoState.filter||e.hospital===endoState.filter)&&(!endoState.search||`${e.date} ${e.mrn} ${e.hospital} ${validProcedures(e).join(' ')} ${extrasText(e).join(' ')} ${e.note||''}`.toLowerCase().includes(endoState.search))).sort(sortDesc);if($('endoscopyActivityLogCount'))$('endoscopyActivityLogCount').textContent=list.length;$('endoscopyBody').innerHTML='';$('endoscopyEmptyState').classList.toggle('hidden',list.length>0);list.forEach(e=>{const expanded=String(endoState.expandedId)===String(e.id);$('endoscopyBody').insertAdjacentHTML('beforeend',`<tr class="endo-log-row ${expanded?'expanded':''}" onclick="toggleEndoDetails('${e.id}')" aria-expanded="${expanded}"><td data-label="Date" class="endo-log-date"><strong>${fmtDate(e.date)}</strong><span class="endo-log-day">${e.day||getDay(e.date)}</span></td><td data-label="Day" class="endo-log-day-cell">${e.day||getDay(e.date)}</td><td data-label="MRN" class="endo-log-mrn"><strong class="endo-mrn">${esc(e.mrn)}</strong></td><td data-label="Hospital" class="endo-log-hospital"><span class="service-badge">${esc(e.hospital)}</span></td><td data-label="Procedures" class="endo-log-procedures"><div class="endo-chip-list">${validProcedures(e).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></td><td data-label="Additional procedures" class="endo-log-detail"><div class="endo-chip-list">${extrasText(e).map(x=>`<span class="tag">${esc(x)}</span>`).join('')||'<span class="endo-empty">—</span>'}</div></td><td data-label="Note" class="endo-log-detail">${e.note?`<span class="note-text">${esc(e.note)}</span>`:'—'}</td><td data-label="Actions" class="actions-cell endo-log-actions"><button class="icon-btn" onclick="event.stopPropagation();editEndo('${e.id}')">Edit</button><button class="icon-btn delete" onclick="event.stopPropagation();deleteEndo('${e.id}')">Delete</button></td></tr>`)})}
window.editEndo=editEndo;window.deleteEndo=id=>{const key=String(id),e=endoState.entries.find(x=>String(x.id)===key);if(e&&confirm(`Delete endoscopy record for MRN ${e.mrn}?`)){createAutomaticLocalBackup('Before deleting endoscopy entry');endoState.entries=endoState.entries.filter(x=>String(x.id)!==key);persist(ENDO_KEY,endoState.entries);renderEndo();alert('Endoscopy record deleted.')}};
function clearEndo(){if(!endoState.entries.length)return alert('There are no endoscopy records to clear.');if(confirm(`Delete all ${endoState.entries.length} endoscopy records? This cannot be undone.`)){createAutomaticLocalBackup('Before clearing endoscopy log');endoState.entries=[];persist(ENDO_KEY,[]);renderEndo();alert('Endoscopy log cleared.')}}
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
  'Inpatient Initial Consultation':110,
  'Inpatient Follow-up':110,
  'New Consultation':110,'EGD':700,'Colonoscopy':680,'Flex Sig':300,'Fibroscan':264,'ERCP':2000,'EUS':4800,
  'Polypectomy':214,'Clip':56,'pH Monitoring':800,'Sclerotherapy':357,'Variceal Banding':611,
  'PEG Tube Insertion':1575,'PEG Tube Replacement':1680,'Foreign Body Removal':0,'Metallic Biliary Stenting':3200,
  'Duodenal Stenting':0,'Esophageal Stenting':0,'Colonic Stenting':0,'On-call Night':500
};
let incomeUnlocked=false;
function loadIncomeSettings(){
  try{const saved=JSON.parse(localStorage.getItem(INCOME_SETTINGS_KEY)||'{}');return {target:Number(saved.target??100000),fees:{...DEFAULT_FEES,...(saved.fees||{})},onCallDays:{...(saved.onCallDays||{})}}}catch{return {target:100000,fees:{...DEFAULT_FEES},onCallDays:{}}}
}
let incomeSettings=loadIncomeSettings();
function money(v){return new Intl.NumberFormat('en-SA',{style:'currency',currency:'SAR',maximumFractionDigits:0}).format(Number(v)||0)}
function currentMonthKey(){return today().slice(0,7)}
async function hashPassword(value){
  if(window.crypto?.subtle){const data=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  return btoa(unescape(encodeURIComponent(value)))
}
function hasIncomePassword(){return Boolean(localStorage.getItem(INCOME_PASSWORD_KEY))}
function base64UrlEncode(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function base64UrlDecode(value){const pad='='.repeat((4-value.length%4)%4),base64=(value+pad).replace(/-/g,'+').replace(/_/g,'/');const raw=atob(base64);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function randomBytes(length=32){const bytes=new Uint8Array(length);crypto.getRandomValues(bytes);return bytes}
function isFaceIdSupported(){return Boolean(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext)}
function isFaceIdEnabled(){return localStorage.getItem(FACE_ID_ENABLED_KEY)==='true'&&Boolean(localStorage.getItem(FACE_ID_CREDENTIAL_KEY))}
function setFaceIdMessage(text,isError=false){const el=$('faceIdMessage');if(!el)return;el.textContent=text;el.classList.toggle('error',Boolean(isError))}
function renderFaceIdStatus(){
  const supported=isFaceIdSupported(),enabled=isFaceIdEnabled();
  if($('faceIdStatus'))$('faceIdStatus').textContent=enabled?'Enabled':'Not enabled';
  if($('faceIdDeviceStatus'))$('faceIdDeviceStatus').textContent=supported?'Supported':'Unavailable';
  if($('enableFaceIdBtn'))$('enableFaceIdBtn').disabled=!supported||enabled;
  if($('disableFaceIdBtn'))$('disableFaceIdBtn').disabled=!enabled;
}
async function enableFaceId(){
  if(!incomeUnlocked)return setFaceIdMessage('Unlock the Private Dashboard with your password first.',true);
  if(!isFaceIdSupported())return setFaceIdMessage('Face ID is unavailable. Open the tracker from its HTTPS GitHub Pages address in Safari.',true);
  setFaceIdMessage('Waiting for Face ID…');
  try{
    const userId=randomBytes(16);
    const credential=await navigator.credentials.create({publicKey:{challenge:randomBytes(32),rp:{name:'Gastroenterology Practice Tracker'},user:{id:userId,name:'private-dashboard',displayName:'Private Dashboard'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},timeout:60000,attestation:'none'}});
    if(!credential)throw new Error('Face ID setup was cancelled.');
    localStorage.setItem(FACE_ID_CREDENTIAL_KEY,base64UrlEncode(credential.rawId));
    localStorage.setItem(FACE_ID_ENABLED_KEY,'true');
    createAutomaticLocalBackup('Face ID enabled');
    renderFaceIdStatus();setFaceIdMessage('Face ID enabled on this device.');
  }catch(err){setFaceIdMessage(err?.message||'Unable to enable Face ID.',true)}
}
function disableFaceId(){
  if(!confirm('Disable Face ID unlock on this device? Your password will still work.'))return;
  localStorage.removeItem(FACE_ID_CREDENTIAL_KEY);localStorage.removeItem(FACE_ID_ENABLED_KEY);
  createAutomaticLocalBackup('Face ID disabled');renderFaceIdStatus();setFaceIdMessage('Face ID disabled.');
}
async function tryFaceIdUnlock(){
  if(!isFaceIdEnabled()||!isFaceIdSupported())return false;
  try{
    const id=base64UrlDecode(localStorage.getItem(FACE_ID_CREDENTIAL_KEY));
    const result=await navigator.credentials.get({publicKey:{challenge:randomBytes(32),allowCredentials:[{id,type:'public-key',transports:['internal']}],userVerification:'required',timeout:60000}});
    if(result){unlockIncome();return true}
  }catch(err){
    if(err?.name!=='NotAllowedError')console.warn('Face ID unlock failed',err);
  }
  return false;
}
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
    localStorage.setItem(INCOME_PASSWORD_KEY,await hashPassword(pass));createAutomaticLocalBackup('Password saved');unlockIncome();return;
  }
  if(await hashPassword(pass)!==localStorage.getItem(INCOME_PASSWORD_KEY))return msg('incomePasswordMessage','Incorrect password.');
  unlockIncome();
}
function unlockIncome(){incomeUnlocked=true;$('incomeLockScreen').classList.add('hidden');$('incomeDashboard').classList.remove('hidden');$('incomePasswordForm').reset();updatePrivateAccessButton();activateModule('incomeModule');setPrivateView('overview');renderIncomeDashboard();renderPerformanceDashboard();renderPrivateOverview();renderPrivateHospitalCards()}
function lockIncome(){incomeUnlocked=false;$('incomeDashboard').classList.add('hidden');$('incomeLockScreen').classList.remove('hidden');configureIncomeLock();updatePrivateAccessButton();activateModule('clinicModule')}
function updatePrivateAccessButton(){
  const button=$('privateAccessBtn');
  if(!button)return;
  button.classList.toggle('unlocked',incomeUnlocked);
  button.setAttribute('aria-label',incomeUnlocked?'Lock private dashboard':'Open private dashboard');
  button.title=incomeUnlocked?'Lock private dashboard':'Private dashboard';
}
async function openPrivateAccess(){
  if(incomeUnlocked){lockIncome();return;}
  activateModule('incomeModule');
  $('incomeDashboard').classList.add('hidden');
  if(await tryFaceIdUnlock())return;
  configureIncomeLock();
  $('incomeLockScreen').classList.remove('hidden');
  setTimeout(()=>$('incomePassword')?.focus(),50);
}

function resetPrivatePasswordOnDevice(){
  if(!hasIncomePassword()){
    configureIncomeLock();
    msg('incomePasswordMessage','No password is currently saved on this device. Create a new password above.');
    return;
  }
  if(!confirm('Reset the private dashboard password on this device? Your clinic, endoscopy, income, and fee data will not be deleted.'))return;
  createAutomaticLocalBackup('Before password reset');
  localStorage.removeItem(INCOME_PASSWORD_KEY);
  incomeUnlocked=false;
  configureIncomeLock();
  msg('incomePasswordMessage','Password reset. Create a new password for this device.');
  setTimeout(()=>$('incomePassword')?.focus(),50);
}

function initIncome(){
  incomeUnlocked=false;
  $('incomeMonth').value=currentMonthKey();
  renderFeeSettings();
  $('incomeLockScreen').classList.remove('hidden');
  $('incomeDashboard').classList.add('hidden');
  configureIncomeLock();
  updatePrivateAccessButton();
  $('privateAccessBtn').onclick=openPrivateAccess;
  $('incomePasswordForm').addEventListener('submit',submitIncomePassword);
  $('resetPrivatePasswordBtn').onclick=resetPrivatePasswordOnDevice;
  if($('enableFaceIdBtn'))$('enableFaceIdBtn').onclick=enableFaceId;
  if($('disableFaceIdBtn'))$('disableFaceIdBtn').onclick=disableFaceId;
  renderFaceIdStatus();
  $('lockIncomeBtn').onclick=lockIncome;
  $('incomeMonth').onchange=()=>{renderIncomeDashboard();renderPrivateOverview();renderPrivateHospitalCards()};
  $('saveIncomeTargetBtn').onclick=saveIncomeTarget;
  $('saveOnCallDaysBtn').onclick=saveOnCallDays;
  $('saveFeeSettingsBtn').onclick=saveFeeSettings;
  document.querySelectorAll('.private-nav-btn').forEach(btn=>btn.onclick=()=>setPrivateView(btn.dataset.privateView));
  setPrivateView('overview');
}

function renderFeeSettings(){
  $('feeSettingsGrid').innerHTML=Object.keys(DEFAULT_FEES).map((name,i)=>`<label><span>${esc(name)}</span><input class="fee-input" data-fee="${esc(name)}" type="number" min="0" step="1" value="${Number(incomeSettings.fees[name]||0)}" /></label>`).join('');
}
function saveIncomeTarget(){incomeSettings.target=Math.max(0,Number($('incomeTargetInput').value||0));saveIncomeSettings();msg('incomeTargetMessage','Target saved.');renderIncomeDashboard()}
function saveOnCallDays(){
  const month=$('incomeMonth').value||currentMonthKey();
  incomeSettings.onCallDays=incomeSettings.onCallDays||{};
  incomeSettings.onCallDays[month]=Math.max(0,Math.floor(Number($('onCallDaysInput').value||0)));
  saveIncomeSettings();
  msg('onCallDaysMessage','On-call nights saved.');
  renderIncomeDashboard();
}
function saveFeeSettings(){document.querySelectorAll('.fee-input').forEach(input=>incomeSettings.fees[input.dataset.fee]=Math.max(0,Number(input.value||0)));saveIncomeSettings();msg('feeSettingsMessage','Approximate fees saved.');renderIncomeDashboard();renderAdmissions()}
function saveIncomeSettings(){localStorage.setItem(INCOME_SETTINGS_KEY,JSON.stringify(incomeSettings));createAutomaticLocalBackup('Income settings saved')}
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
  const onCallDays=Math.max(0,Math.floor(Number(incomeSettings.onCallDays?.[month]||0)));
  const onCallFee=Math.max(0,Number(incomeSettings.fees['On-call Night']||500));
  const onCallIncome=onCallDays*onCallFee;
  $('incomeTargetInput').value=target;$('incomeTargetDisplay').textContent=money(target);$('incomeExpectedDisplay').textContent=money(expected);$('incomeRemainingDisplay').textContent=money(remaining);$('incomeAchievementDisplay').textContent=`${achievement.toFixed(1)}%`;$('incomeProgressBar').style.width=`${Math.min(100,achievement)}%`;
  if($('onCallDaysInput'))$('onCallDaysInput').value=onCallDays;
  if($('onCallFeeDisplay'))$('onCallFeeDisplay').textContent=money(onCallFee);
  if($('onCallIncomeDisplay'))$('onCallIncomeDisplay').textContent=money(onCallIncome);
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
  if(view==='statistics'){renderClinic();renderEndo();requestAnimationFrame(()=>{renderClinicMonthlyChart();});}
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

function load(k){try{return JSON.parse(localStorage.getItem(k))||[]}catch{return[]}}function persist(k,v){localStorage.setItem(k,JSON.stringify(v));if(k===CLINIC_KEY||k===ENDO_KEY)createAutomaticLocalBackup(k===CLINIC_KEY?'Clinic records saved':'Procedure records saved')}function upsert(arr,item){const i=arr.findIndex(x=>x.id===item.id);i>=0?arr[i]=item:arr.push(item)}function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()}function today(){const d=new Date();return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}function getDay(s){return s?new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(new Date(s+'T00:00:00')):''}function updateDay(a,b){$(b).value=getDay($(a).value)}function fmtDate(s){return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(s+'T00:00:00'))}function sortDesc(a,b){return b.date.localeCompare(a.date)||(b.updatedAt||'').localeCompare(a.updatedAt||'')}function formatNum(v){return Number.isInteger(v)?v:v.toFixed(1)}function msg(id,t){$(id).textContent=t}function esc(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function yes(v){return v?'Yes':'No'}function downloadCsv(name,headers,rows){if(!rows.length)return alert('There are no records to export.');const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const u=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download=`${name}-${today()}.csv`;a.click();URL.revokeObjectURL(u)}function applyTheme(){if(localStorage.getItem(THEME_KEY)==='dark')document.body.classList.add('dark');updateThemeButton()}function updateThemeButton(){const isDark=document.body.classList.contains('dark'),button=$('themeToggle'),label=$('themeToggleLabel'),text=isDark?'Light mode':'Dark mode';if(label)label.textContent=text;if(button){button.setAttribute('aria-label',isDark?'Switch to light mode':'Switch to dark mode');button.title=text}}



// Automatic local backups
function backupPayload(){
  return {format:'gastroenterology-practice-tracker-backup',version:4,createdAt:new Date().toISOString(),clinicRecords:load(CLINIC_KEY),procedureRecords:load(ENDO_KEY),pendingRecords:load(PENDING_KEY),admissionRecords:load(ADMISSION_KEY),incomeSettings:JSON.parse(localStorage.getItem(INCOME_SETTINGS_KEY)||'{}'),passwordHash:localStorage.getItem(INCOME_PASSWORD_KEY)||'',theme:localStorage.getItem(THEME_KEY)||'light'};
}
function loadLocalBackups(){try{return JSON.parse(localStorage.getItem(LOCAL_BACKUPS_KEY)||'[]')}catch{return[]}}
function createAutomaticLocalBackup(reason='Data saved'){
  try{
    const backups=loadLocalBackups(),snapshot=backupPayload();snapshot.reason=reason;
    backups.unshift(snapshot);localStorage.setItem(LOCAL_BACKUPS_KEY,JSON.stringify(backups.slice(0,20)));renderBackupStatus();
  }catch(err){console.warn('Local backup failed',err)}
}
function formatBackupTime(value){if(!value)return'Never';try{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return value}}
function renderBackupStatus(){
  const backups=loadLocalBackups();
  if($('lastLocalBackup'))$('lastLocalBackup').textContent=backups.length?formatBackupTime(backups[0].createdAt):'Never';
  if($('localBackupCount'))$('localBackupCount').textContent=backups.length;
  if($('localBackupHistory'))$('localBackupHistory').innerHTML=backups.slice(0,5).map(b=>`<div class="backup-history-item"><div><strong>${esc(b.reason||'Automatic backup')}</strong><br><small>${formatBackupTime(b.createdAt)}</small></div><small>${(b.clinicRecords||[]).length} clinic · ${(b.pendingRecords||[]).length} pending · ${(b.procedureRecords||[]).length} procedures</small></div>`).join('')||'<small>No local backups yet.</small>';
}
function downloadBackup(){
  createAutomaticLocalBackup('Manual export');
  const data=JSON.stringify(backupPayload(),null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`gastroenterology-practice-backup-${today()}.json`;a.click();URL.revokeObjectURL(url);
}
function restoreBackupFile(file){
  const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(data.format!=='gastroenterology-practice-tracker-backup')throw new Error('Not a valid tracker backup.');if(!confirm('Restore this backup? Current tracker data will be replaced.'))return;createAutomaticLocalBackup('Before restore');localStorage.setItem(CLINIC_KEY,JSON.stringify(data.clinicRecords||[]));localStorage.setItem(ENDO_KEY,JSON.stringify(data.procedureRecords||[]));localStorage.setItem(PENDING_KEY,JSON.stringify(data.pendingRecords||[]));localStorage.setItem(ADMISSION_KEY,JSON.stringify(data.admissionRecords||[]));localStorage.setItem(INCOME_SETTINGS_KEY,JSON.stringify(data.incomeSettings||{}));if(data.passwordHash)localStorage.setItem(INCOME_PASSWORD_KEY,data.passwordHash);else localStorage.removeItem(INCOME_PASSWORD_KEY);if(data.theme)localStorage.setItem(THEME_KEY,data.theme);localStorage.removeItem(FACE_ID_CREDENTIAL_KEY);localStorage.removeItem(FACE_ID_ENABLED_KEY);location.reload()}catch(err){alert(err.message||'Unable to restore this file.')}};reader.readAsText(file);
}
function initBackups(){
  if(!loadLocalBackups().length)createAutomaticLocalBackup('Initial backup');else renderBackupStatus();
  $('downloadBackupBtn').onclick=downloadBackup;
  $('restoreBackupBtn').onclick=()=>$('restoreBackupFile').click();
  $('restoreBackupFile').onchange=e=>{if(e.target.files[0])restoreBackupFile(e.target.files[0]);e.target.value=''};
}


// Optional Google Drive backup. Local storage remains the primary database.
let googleTokenClient=null,googleAccessToken='',googleTokenExpiresAt=0,googleDriveOperation=null;
function setGoogleDriveMessage(text,isError=false){const el=$('googleDriveMessage');if(el){el.textContent=text||'';el.classList.toggle('error',!!isError)}}
function renderGoogleDriveStatus(){
  const connected=!!googleAccessToken&&Date.now()<googleTokenExpiresAt;
  if($('googleDriveStatus'))$('googleDriveStatus').textContent=connected?'Connected':'Not connected';
  if($('lastGoogleDriveBackup'))$('lastGoogleDriveBackup').textContent=formatBackupTime(localStorage.getItem(GOOGLE_DRIVE_LAST_BACKUP_KEY));
  if($('connectGoogleDriveBtn'))$('connectGoogleDriveBtn').textContent=connected?'Reconnect':'Connect';
}
function waitForGoogleIdentity(timeout=8000){return new Promise((resolve,reject)=>{const start=Date.now(),timer=setInterval(()=>{if(window.google?.accounts?.oauth2){clearInterval(timer);resolve()}else if(Date.now()-start>timeout){clearInterval(timer);reject(new Error('Google sign-in library did not load. Check your internet connection.'))}},100)})}
async function initializeGoogleTokenClient(){
  const clientId=($('googleClientId')?.value||localStorage.getItem(GOOGLE_CLIENT_ID_KEY)||'').trim();
  if(!clientId)throw new Error('Enter your Google OAuth Web Client ID first.');
  if(!clientId.endsWith('.apps.googleusercontent.com'))throw new Error('The Google Client ID format does not look correct.');
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY,clientId);
  await waitForGoogleIdentity();
  googleTokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:GOOGLE_DRIVE_SCOPE,callback:response=>{
    if(response?.error){setGoogleDriveMessage(response.error_description||response.error,true);googleDriveOperation=null;return}
    googleAccessToken=response.access_token;googleTokenExpiresAt=Date.now()+Math.max(60,Number(response.expires_in||3600)-60)*1000;renderGoogleDriveStatus();setGoogleDriveMessage('Google Drive connected.');
    const operation=googleDriveOperation;googleDriveOperation=null;if(operation)operation().catch(err=>setGoogleDriveMessage(err.message||'Google Drive operation failed.',true));else maybeRunDailyGoogleBackup();
  }});
}
async function requestGoogleDriveAccess(operation=null){
  googleDriveOperation=operation;await initializeGoogleTokenClient();googleTokenClient.requestAccessToken({prompt:googleAccessToken?'':'consent'});
}
async function withGoogleDriveToken(operation){
  if(googleAccessToken&&Date.now()<googleTokenExpiresAt)return operation();
  await requestGoogleDriveAccess(operation);
}
async function driveFetch(url,options={}){
  const headers=new Headers(options.headers||{});headers.set('Authorization','Bearer '+googleAccessToken);
  const response=await fetch(url,{...options,headers});
  if(response.status===401){googleAccessToken='';googleTokenExpiresAt=0;renderGoogleDriveStatus();throw new Error('Google Drive authorization expired. Tap Connect and try again.')}
  if(!response.ok){let detail='';try{detail=(await response.json())?.error?.message||''}catch{}throw new Error(detail||`Google Drive error (${response.status}).`)}
  return response;
}
async function findLatestDriveBackup(){
  const q=encodeURIComponent(`name='${GOOGLE_DRIVE_FILE_NAME}' and trashed=false`);
  const url=`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&orderBy=modifiedTime%20desc&pageSize=1&fields=files(id,name,modifiedTime,size)`;
  const data=await (await driveFetch(url)).json();return data.files?.[0]||null;
}
async function uploadGoogleDriveBackup(){
  setGoogleDriveMessage('Backing up to Google Drive…');createAutomaticLocalBackup('Before Google Drive backup');
  const json=JSON.stringify(backupPayload(),null,2),existing=await findLatestDriveBackup();
  if(existing){await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing.id)}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:json});}
  else{
    const boundary='gp_tracker_'+Date.now();
    const metadata=JSON.stringify({name:GOOGLE_DRIVE_FILE_NAME,parents:['appDataFolder'],mimeType:'application/json'});
    const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`;
    await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
  }
  const stamp=new Date().toISOString();localStorage.setItem(GOOGLE_DRIVE_LAST_BACKUP_KEY,stamp);renderGoogleDriveStatus();setGoogleDriveMessage('Google Drive backup completed successfully.');showToast('Google Drive backup completed');
}
async function restoreLatestGoogleDriveBackup(){
  setGoogleDriveMessage('Checking Google Drive…');const file=await findLatestDriveBackup();if(!file)throw new Error('No Google Drive backup was found.');
  const data=await (await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`)).json();
  if(data.format!=='gastroenterology-practice-tracker-backup')throw new Error('The Google Drive file is not a valid tracker backup.');
  const summary=`${(data.clinicRecords||[]).length} clinic, ${(data.pendingRecords||[]).length} pending, and ${(data.procedureRecords||[]).length} procedure records`;
  if(!confirm(`Restore the latest Google Drive backup (${summary})? Current tracker data on this device will be replaced.`))return;
  createAutomaticLocalBackup('Before Google Drive restore');localStorage.setItem(CLINIC_KEY,JSON.stringify(data.clinicRecords||[]));localStorage.setItem(ENDO_KEY,JSON.stringify(data.procedureRecords||[]));localStorage.setItem(PENDING_KEY,JSON.stringify(data.pendingRecords||[]));localStorage.setItem(ADMISSION_KEY,JSON.stringify(data.admissionRecords||[]));localStorage.setItem(INCOME_SETTINGS_KEY,JSON.stringify(data.incomeSettings||{}));if(data.passwordHash)localStorage.setItem(INCOME_PASSWORD_KEY,data.passwordHash);else localStorage.removeItem(INCOME_PASSWORD_KEY);if(data.theme)localStorage.setItem(THEME_KEY,data.theme);localStorage.removeItem(FACE_ID_CREDENTIAL_KEY);localStorage.removeItem(FACE_ID_ENABLED_KEY);location.reload();
}
function disconnectGoogleDrive(){
  if(googleAccessToken&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(googleAccessToken,()=>{});googleAccessToken='';googleTokenExpiresAt=0;googleTokenClient=null;googleDriveOperation=null;renderGoogleDriveStatus();setGoogleDriveMessage('Disconnected from Google Drive.');
}
function isGoogleBackupDue(){const last=localStorage.getItem(GOOGLE_DRIVE_LAST_BACKUP_KEY);return !last||last.slice(0,10)!==new Date().toISOString().slice(0,10)}
function maybeRunDailyGoogleBackup(){if(localStorage.getItem(GOOGLE_DRIVE_AUTO_KEY)==='true'&&googleAccessToken&&Date.now()<googleTokenExpiresAt&&isGoogleBackupDue())uploadGoogleDriveBackup().catch(err=>setGoogleDriveMessage(err.message,true))}
function initGoogleDriveBackup(){
  if(!$('googleClientId'))return;$('googleClientId').value=localStorage.getItem(GOOGLE_CLIENT_ID_KEY)||'';$('googleDriveAutoBackup').checked=localStorage.getItem(GOOGLE_DRIVE_AUTO_KEY)==='true';renderGoogleDriveStatus();
  $('googleClientId').onchange=e=>{localStorage.setItem(GOOGLE_CLIENT_ID_KEY,e.target.value.trim());googleTokenClient=null;googleAccessToken='';googleTokenExpiresAt=0;renderGoogleDriveStatus()};
  $('googleDriveAutoBackup').onchange=e=>{localStorage.setItem(GOOGLE_DRIVE_AUTO_KEY,String(e.target.checked));if(e.target.checked)maybeRunDailyGoogleBackup()};
  $('connectGoogleDriveBtn').onclick=()=>requestGoogleDriveAccess().catch(err=>setGoogleDriveMessage(err.message,true));
  $('googleDriveBackupNowBtn').onclick=()=>withGoogleDriveToken(uploadGoogleDriveBackup).catch(err=>setGoogleDriveMessage(err.message,true));
  $('googleDriveRestoreBtn').onclick=()=>withGoogleDriveToken(restoreLatestGoogleDriveBackup).catch(err=>setGoogleDriveMessage(err.message,true));
  $('disconnectGoogleDriveBtn').onclick=disconnectGoogleDrive;
  setInterval(maybeRunDailyGoogleBackup,60000);
}

initStatsFilters();
initClinic();
initPending();
initEndo();
initIncome();
initAdmissions();
initBackups();
initGoogleDriveBackup();

// Monthly clinic trend tabs
document.querySelectorAll('[data-clinic-trend]').forEach(btn=>btn.addEventListener('click',()=>setClinicTrendView(btn.dataset.clinicTrend)));
