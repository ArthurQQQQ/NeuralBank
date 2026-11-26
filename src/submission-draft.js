// A check applies to one exact editor revision. A late response never validates
// newer text, and browser-only success never claims a server check.
export class SubmissionDraft {
  constructor({validate,remoteCheck,onChange=()=>{}}) {
    this.validate=validate; this.remoteCheck=remoteCheck; this.onChange=onChange;
    this.text=''; this.revision=0; this.checkedRevision=-1; this.submittedRevision=-1;
    this.report=null; this.checking=false; this.serial=0;
  }
  setText(text) {
    this.text=String(text); this.revision++; this.serial++;
    this.report=null; this.checkedRevision=-1; this.checking=false; this.onChange();
  }
  get canSubmit() { return Boolean(!this.checking && this.report?.valid && this.report.serverChecked && this.checkedRevision===this.revision && this.submittedRevision!==this.revision); }
  get checkedValue() { return this.canSubmit ? this.report.value : null; }
  markSubmitted(revision) { this.submittedRevision=revision; this.onChange(); }
  async check() {
    const serial=++this.serial, revision=this.revision;
    const current=()=>serial===this.serial && revision===this.revision;
    let value;
    try {
      if(new TextEncoder().encode(this.text).length>32768) throw new Error('投稿 JSON 不能超过 32 KB。');
      value=JSON.parse(this.text);
    } catch(error) {
      this.report={valid:false,errors:[{path:'$',code:'JSON_PARSE',message:error.message}],serverChecked:false};
      this.onChange(); return this.report;
    }
    const local=this.validate(value);
    if(!local.valid) { this.report={...local,serverChecked:false}; this.onChange(); return this.report; }
    this.checking=true; this.report=null; this.onChange();
    try {
      const response=await this.remoteCheck(value);
      if(!current()) return null;
      if(typeof response?.valid!=='boolean' || !Array.isArray(response.errors)) throw new Error('服务器返回的检查结果不完整。');
      this.report={...response,serverChecked:true};
      if(response.valid) { this.report.value=response.value || local.value; this.checkedRevision=revision; }
    } catch(error) {
      if(!current()) return null;
      this.report={valid:false,localValid:true,serverChecked:false,errors:[{path:'$',code:'SERVER_UNAVAILABLE',message:'本地格式检查通过，服务器暂时无法连接。草稿已保留，可下载后稍后重试。'}]};
    } finally {
      if(current()) { this.checking=false; this.onChange(); }
    }
    return current()?this.report:null;
  }
}
