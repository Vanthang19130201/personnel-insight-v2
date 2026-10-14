/* Các số liệu bên dưới được tính trực tiếp từ mảng people do người dùng nhập.
   Không sử dụng số liệu hay danh sách cá nhân trong tài liệu tham khảo. */
function dynamicSourceSection(title, entries, subtitle='Tính từ hồ sơ đã nhập') {
  const total=entries.reduce((s,[,n])=>s+n,0);
  return `<section class="panel"><h2>${esc(title)}</h2><p class="panel-sub">${esc(subtitle)} · Đã phân loại: ${fmt(total)} hồ sơ</p>${bars(entries,Math.max(1,...entries.map(x=>x[1])))}</section>`;
}
function dynamicRows(fn) {
  return frequency(people,fn);
}
function renderTemplateReport() {
  const count=people.length;
  const forty=people.filter(p=>{const a=dateAge(p.dob);return a!==null&&a>=40&&a<=45}).length;
  const e12=people.filter(p=>p.education==='12/12').length;
  const party=people.filter(p=>p.organization==='Đảng viên').length;
  const married=people.filter(p=>p.marital==='Đã kết hôn').length;
  const groups=dynamicRows(p=>p.category);
  const rank=dynamicRows(p=>p.rank);
  const religion=dynamicRows(p=>p.religion);
  const ethnicity=dynamicRows(p=>p.ethnicity);
  const eduRows=dynamicRows(p=>p.education);
  const org=dynamicRows(p=>p.organization);
  const ageRows=['18–20','21–22','23–24','25–29','30–34','35–39','40–45','46–54','55+'].map((label,i)=>{
     const bands=[[18,20],[21,22],[23,24],[25,29],[30,34],[35,39],[40,45],[46,54],[55,110]];
     return [label,people.filter(p=>{const a=dateAge(p.dob);return a!==null&&a>=bands[i][0]&&a<=bands[i][1]}).length];
  });
  byId('main').innerHTML=hero('Tổng hợp theo mẫu báo cáo','Các mục được tổ chức theo tài liệu tham khảo; toàn bộ con số bên dưới được tính từ hồ sơ do bạn nhập.',`<button class="btn btn-primary" data-action="add">＋ Thêm hồ sơ</button><button class="btn btn-light" data-action="print">▤ In báo cáo</button>`)
  +`<section class="stats-grid">${metric('♙','Quân số đã nhập',fmt(count),'Không lấy từ tài liệu tham khảo')}${metric('◷','Độ tuổi 40–45',fmt(forty),'Tính từ ngày sinh')}${metric('▤','Học vấn 12/12',fmt(e12),'Tính từ hồ sơ')}${metric('◎','Đảng viên',fmt(party),'Theo ô Đảng / Đoàn')}</section>`
  +`${count===0?'<div class="welcome-empty"><div class="welcome-mark">▤</div><div><strong>Chưa có hồ sơ để lập báo cáo</strong><p>Hãy thêm nhân sự trong mục Hồ sơ nhân sự; hệ thống sẽ tự động thống kê theo những nhóm của biểu mẫu.</p></div></div>':''}`
  +`<div class="grid-two">${dynamicSourceSection('I. Thành phần quân số',groups)}${dynamicSourceSection('II. Cấp bậc',rank)}${dynamicSourceSection('III. Dân tộc',ethnicity)}${dynamicSourceSection('IV. Tôn giáo',religion)}${dynamicSourceSection('V. Học vấn',eduRows)}${dynamicSourceSection('VI. Đảng, Đoàn',org)}${dynamicSourceSection('VII. Độ tuổi',ageRows)}${dynamicSourceSection('VIII. Hôn nhân',dynamicRows(p=>p.marital))}${dynamicSourceSection('IX. Hoàn cảnh gia đình (phân loại chung)',dynamicRows(p=>p.family))}${dynamicSourceSection('X. Chức vụ',dynamicRows(p=>p.position))}</div>`
  +`<section class="panel"><h2>Bảng tóm tắt có thể in</h2><div class="report-grid"><div><b>${fmt(count)} người</b><small>Tổng số hồ sơ</small></div><div><b>${fmt(forty)} người</b><small>Trong độ tuổi 40–45</small></div><div><b>${fmt(e12)} người</b><small>Học vấn 12/12</small></div><div><b>${fmt(married)} người</b><small>Đã kết hôn</small></div><div><b>${fmt(sum(people,'children'))}</b><small>Tổng số con khai báo</small></div><div><b>${vnMoney(sum(people,'salary')+sum(people,'allowance'))}</b><small>Tổng thu nhập tháng</small></div></div><p class="footer-note">Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}. Không suy diễn chỉ tiêu chưa được nhập. Mức lương tính từ số do người dùng cung cấp.</p></section>`;
}
