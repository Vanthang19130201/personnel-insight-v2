'use strict';

/*
 * Personnel Insight - Công cụ ước tính lương quân nhân.
 * Tách riêng khỏi app.js để dễ kiểm thử và cập nhật căn cứ tiền lương.
 * Các khoản khấu trừ phụ thuộc hồ sơ cá nhân được để người dùng tự nhập.
 */

const SALARY_BASE_2026 = 2530000;

const OFFICER_SALARY_COEFFICIENTS = Object.freeze({
  'Thiếu úy': 4.20,
  'Trung úy': 4.60,
  'Thượng úy': 5.00,
  'Đại úy': 5.40,
  'Thiếu tá': 6.00,
  'Trung tá': 6.60,
  'Thượng tá': 7.30,
  'Đại tá': 8.00,
  'Thiếu tướng': 8.60,
  'Trung tướng': 9.20,
  'Thượng tướng': 9.80,
  'Đại tướng': 10.40
});

const QNCN_SALARY_COEFFICIENTS = Object.freeze({
  caoCap: Object.freeze({
    group1: Object.freeze([3.85, 4.20, 4.55, 4.90, 5.25, 5.60, 5.95, 6.30, 6.65, 7.00, 7.35, 7.70]),
    group2: Object.freeze([3.65, 4.00, 4.35, 4.70, 5.05, 5.40, 5.75, 6.10, 6.45, 6.80, 7.15, 7.50])
  }),
  trungCap: Object.freeze({
    group1: Object.freeze([3.50, 3.80, 4.10, 4.40, 4.70, 5.00, 5.30, 5.60, 5.90, 6.20]),
    group2: Object.freeze([3.20, 3.50, 3.80, 4.10, 4.40, 4.70, 5.00, 5.30, 5.60, 5.90])
  }),
  soCap: Object.freeze({
    group1: Object.freeze([3.20, 3.45, 3.70, 3.95, 4.20, 4.45, 4.70, 4.95, 5.20, 5.45]),
    group2: Object.freeze([2.95, 3.20, 3.45, 3.70, 3.95, 4.20, 4.45, 4.70, 4.95, 5.20])
  })
});

const SALARY_SOURCE_LINKS = Object.freeze({
  base: 'https://xaydungchinhsach.chinhphu.vn/tu-01-7-chinh-phu-tang-luong-co-so-119260517100243881.htm',
  salaryTable: 'https://vbpl.vn/boquocphong/Pages/vbpq-toanvan.aspx?ItemID=18654',
  qncnTable: 'https://vbpl.vn/FileData/TW/Lists/vbpq/Attachments/136055/VanBanGoc_79.2019.TT-BQP.pdf',
  publicDuty: 'https://vanban.chinhphu.vn/?docid=157714&pageid=27160',
  seniority: 'https://vanban.chinhphu.vn/default.aspx?docid=90604&pageid=27160'
});

let salaryLastResult = null;
let salarySelectedPersonId = '';

function salaryMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Math.round(Number(value) || 0));
}

function salaryNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function salaryClamp(value, min, max) {
  return Math.min(max, Math.max(min, salaryNumber(value, min)));
}

function salarySeniorityPercent(years) {
  const wholeYears = Math.floor(salaryClamp(years, 0, 65));
  return wholeYears >= 5 ? wholeYears : 0;
}

function getQncnCoefficient(level, group, grade) {
  const table = QNCN_SALARY_COEFFICIENTS[level]?.[group];
  if (!table?.length) return null;
  const index = Math.floor(salaryNumber(grade, 1)) - 1;
  return index >= 0 && index < table.length ? table[index] : null;
}

function getSalaryCoefficient(type) {
  if (type === 'officer') {
    return OFFICER_SALARY_COEFFICIENTS[byId('salaryOfficerRank')?.value] ?? null;
  }
  if (type === 'qncn') {
    return getQncnCoefficient(
      byId('salaryQncnLevel')?.value,
      byId('salaryQncnGroup')?.value,
      byId('salaryQncnGrade')?.value
    );
  }
  const manual = salaryNumber(byId('salaryManualCoefficient')?.value, NaN);
  return Number.isFinite(manual) && manual >= 0 ? manual : null;
}

function salaryPersonOptions() {
  const ordered = [...people].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return '<option value="">Tính độc lập, không chọn hồ sơ</option>' + ordered.map(p =>
    `<option value="${esc(p.id)}">${esc(p.code)} · ${esc(p.name)}${p.rank ? ' · ' + esc(p.rank) : ''}</option>`
  ).join('');
}

function salaryOfficerRankOptions() {
  return Object.entries(OFFICER_SALARY_COEFFICIENTS).map(([rank, coefficient]) =>
    `<option value="${esc(rank)}">${esc(rank)} · hệ số ${coefficient.toFixed(2)}</option>`
  ).join('');
}

function salaryGradeOptions(level, group, selectedGrade = 1) {
  const table = QNCN_SALARY_COEFFICIENTS[level]?.[group] || [];
  return table.map((coefficient, index) => {
    const grade = index + 1;
    return `<option value="${grade}" ${grade === Number(selectedGrade) ? 'selected' : ''}>Bậc ${grade} · hệ số ${coefficient.toFixed(2)}</option>`;
  }).join('');
}

function renderSalaryCalculator() {
  byId('main').innerHTML = hero(
    'Tính lương quân nhân',
    'Ước tính lương và phụ cấp theo hệ số, thâm niên và các khoản bạn nhập. Có thể lấy dữ liệu trực tiếp từ hồ sơ nhân sự.'
  ) + `
    <section class="salary-notice">
      <div>
        <span class="salary-notice-label">MỨC LƯƠNG CƠ SỞ MẶC ĐỊNH</span>
        <strong>${salaryMoney(SALARY_BASE_2026)}</strong>
        <small>Từ 01/07/2026 · có thể sửa nếu đơn vị áp dụng mức khác</small>
      </div>
      <span class="salary-version">Căn cứ cập nhật 10/2026</span>
    </section>

    <div class="salary-workspace">
      <div class="salary-form-column">
        <section class="salary-card">
          <div class="salary-card-title"><span>01</span><div><h2>Hồ sơ tính lương</h2><p>Chọn một hồ sơ để tự điền cấp bậc và thâm niên.</p></div></div>
          <label class="salary-field salary-field-wide">
            <span>Nhân sự</span>
            <select id="salaryPersonSelect">${salaryPersonOptions()}</select>
          </label>
          <div id="salaryPersonHint" class="salary-person-hint">Bạn có thể tính độc lập mà không thay đổi dữ liệu hồ sơ.</div>
        </section>

        <section class="salary-card">
          <div class="salary-card-title"><span>02</span><div><h2>Ngạch và hệ số</h2><p>Sĩ quan và QNCN có bảng hệ số riêng; trường hợp khác có thể tự nhập.</p></div></div>
          <div class="salary-segment" id="salaryTypeSegment">
            <button type="button" class="active" data-salary-type="officer">Sĩ quan</button>
            <button type="button" data-salary-type="qncn">QNCN</button>
            <button type="button" data-salary-type="manual">Tự nhập hệ số</button>
          </div>

          <div id="salaryOfficerFields" class="salary-conditional">
            <label class="salary-field salary-field-wide">
              <span>Cấp bậc quân hàm</span>
              <select id="salaryOfficerRank">${salaryOfficerRankOptions()}</select>
            </label>
          </div>

          <div id="salaryQncnFields" class="salary-conditional hidden">
            <div class="salary-grid-3">
              <label class="salary-field">
                <span>Loại QNCN</span>
                <select id="salaryQncnLevel">
                  <option value="caoCap">Cao cấp</option>
                  <option value="trungCap">Trung cấp</option>
                  <option value="soCap">Sơ cấp</option>
                </select>
              </label>
              <label class="salary-field">
                <span>Nhóm</span>
                <select id="salaryQncnGroup"><option value="group1">Nhóm 1</option><option value="group2">Nhóm 2</option></select>
              </label>
              <label class="salary-field">
                <span>Bậc</span>
                <select id="salaryQncnGrade">${salaryGradeOptions('caoCap', 'group1', 1)}</select>
              </label>
            </div>
          </div>

          <div id="salaryManualFields" class="salary-conditional hidden">
            <label class="salary-field salary-field-wide">
              <span>Hệ số lương / phụ cấp quân hàm</span>
              <input type="number" id="salaryManualCoefficient" min="0" max="20" step="0.01" value="4.20">
            </label>
          </div>

          <div class="salary-grid-2 salary-top-gap">
            <label class="salary-field">
              <span>Mức lương cơ sở</span>
              <input type="number" id="salaryBaseAmount" min="0" max="100000000" step="10000" value="${SALARY_BASE_2026}">
              <small>Đơn vị: đồng/tháng</small>
            </label>
            <label class="salary-field">
              <span>Hệ số đang tính</span>
              <div class="salary-readonly" id="salaryCoefficientDisplay">4.20</div>
              <small>Tự cập nhật theo lựa chọn</small>
            </label>
          </div>
        </section>

        <section class="salary-card">
          <div class="salary-card-title"><span>03</span><div><h2>Thâm niên và phụ cấp</h2><p>Các hệ số và tỷ lệ có thể sửa theo quyết định áp dụng thực tế.</p></div></div>
          <div class="salary-grid-2">
            <label class="salary-field">
              <span>Số năm tính thâm niên</span>
              <input type="number" id="salaryYears" min="0" max="65" step="1" value="5">
            </label>
            <label class="salary-field">
              <span>Tỷ lệ thâm niên</span>
              <div class="salary-readonly" id="salarySeniorityDisplay">5%</div>
              <small>Đủ 5 năm: 5%; mỗi năm sau +1%</small>
            </label>
          </div>
          <div class="salary-grid-2 salary-top-gap">
            <label class="salary-field">
              <span>Hệ số phụ cấp chức vụ lãnh đạo</span>
              <input type="number" id="salaryLeadershipCoefficient" min="0" max="10" step="0.05" value="0">
            </label>
            <label class="salary-field">
              <span>Hệ số phụ cấp chức vụ chỉ huy</span>
              <input type="number" id="salaryCommandCoefficient" min="0" max="10" step="0.05" value="0">
            </label>
            <label class="salary-field">
              <span>Hệ số phụ cấp khác</span>
              <input type="number" id="salaryOtherCoefficient" min="0" max="10" step="0.05" value="0">
            </label>
            <label class="salary-field">
              <span>Phụ cấp theo % lương</span>
              <div class="salary-input-unit"><input type="number" id="salaryPercentAllowance" min="0" max="300" step="1" value="0"><span>%</span></div>
            </label>
            <label class="salary-field salary-field-wide">
              <span>Phụ cấp / trợ cấp cố định khác</span>
              <div class="salary-input-unit"><input type="number" id="salaryFixedAllowance" min="0" max="1000000000" step="10000" value="0"><span>đ</span></div>
            </label>
          </div>
          <label class="salary-check-row">
            <input type="checkbox" id="salaryPublicDutyEnabled" checked>
            <span><b>Phụ cấp công vụ</b><small>Tỷ lệ mặc định 25%. Công cụ tính trên lương cấp bậc + phụ cấp chức vụ lãnh đạo.</small></span>
            <div class="salary-input-unit salary-short"><input type="number" id="salaryPublicDutyPercent" min="0" max="100" step="1" value="25"><span>%</span></div>
          </label>
        </section>

        <section class="salary-card">
          <div class="salary-card-title"><span>04</span><div><h2>Khấu trừ</h2><p>Không tự suy diễn mức đóng hoặc thuế của từng cá nhân. Chỉ tính theo số bạn nhập.</p></div></div>
          <div class="salary-grid-2">
            <label class="salary-field">
              <span>Bảo hiểm theo tỷ lệ</span>
              <div class="salary-input-unit"><input type="number" id="salaryInsurancePercent" min="0" max="100" step="0.1" value="0"><span>%</span></div>
              <small>Tính trên lương + thâm niên + phụ cấp chức vụ lãnh đạo</small>
            </label>
            <label class="salary-field">
              <span>Thuế TNCN thực tế</span>
              <div class="salary-input-unit"><input type="number" id="salaryTaxAmount" min="0" max="1000000000" step="10000" value="0"><span>đ</span></div>
            </label>
            <label class="salary-field">
              <span>Tiền ăn / tháng</span>
              <div class="salary-input-unit"><input type="number" id="salaryMealDeduction" min="0" max="1000000000" step="10000" value="0"><span>đ</span></div>
            </label>
            <label class="salary-field">
              <span>Khấu trừ khác</span>
              <div class="salary-input-unit"><input type="number" id="salaryOtherDeduction" min="0" max="1000000000" step="10000" value="0"><span>đ</span></div>
            </label>
          </div>
        </section>
      </div>

      <aside class="salary-result-column">
        <section class="salary-ledger" id="salaryLedger">
          <div class="salary-ledger-head">
            <div><span>ƯỚC TÍNH THÁNG</span><h2 id="salaryResultTitle">Bảng tính lương</h2></div>
            <div class="salary-live-dot">LIVE</div>
          </div>
          <div class="salary-ledger-meta" id="salaryResultMeta">Sĩ quan · Thiếu úy · Hệ số 4.20</div>
          <div class="salary-ledger-row"><span>Lương theo hệ số</span><strong id="salaryResultBase">0 ₫</strong></div>
          <div class="salary-ledger-row"><span>Phụ cấp thâm niên</span><strong id="salaryResultSeniority">0 ₫</strong></div>
          <div class="salary-ledger-row"><span>Phụ cấp chức vụ lãnh đạo</span><strong id="salaryResultLeadership">0 ₫</strong></div>
          <div class="salary-ledger-row"><span>Phụ cấp chức vụ chỉ huy</span><strong id="salaryResultCommand">0 ₫</strong></div>
          <div class="salary-ledger-row"><span>Phụ cấp hệ số khác</span><strong id="salaryResultOtherCoeff">0 ₫</strong></div>
          <div class="salary-ledger-row"><span>Phụ cấp theo %</span><strong id="salaryResultPercent">0 ₫</strong></div>
          <div class="salary-ledger-row"><span>Phụ cấp cố định</span><strong id="salaryResultFixed">0 ₫</strong></div>
          <div class="salary-ledger-row"><span>Phụ cấp công vụ</span><strong id="salaryResultPublicDuty">0 ₫</strong></div>
          <div class="salary-ledger-subtotal"><span>Tổng thu nhập</span><strong id="salaryResultGross">0 ₫</strong></div>
          <div class="salary-ledger-row salary-negative"><span>Bảo hiểm</span><strong id="salaryResultInsurance">0 ₫</strong></div>
          <div class="salary-ledger-row salary-negative"><span>Thuế TNCN</span><strong id="salaryResultTax">0 ₫</strong></div>
          <div class="salary-ledger-row salary-negative"><span>Tiền ăn</span><strong id="salaryResultMeal">0 ₫</strong></div>
          <div class="salary-ledger-row salary-negative"><span>Khấu trừ khác</span><strong id="salaryResultOtherDeduction">0 ₫</strong></div>
          <div class="salary-net"><span>THỰC NHẬN ƯỚC TÍNH</span><strong id="salaryResultNet">0 ₫</strong></div>
          <div class="salary-ledger-actions">
            <button type="button" class="btn btn-primary" id="salarySaveToPerson" disabled>Ghi lương vào hồ sơ</button>
            <button type="button" class="btn btn-light" id="salaryCopyResult">Sao chép bảng tính</button>
            <button type="button" class="btn btn-light" id="salaryPrintResult">In / Lưu PDF</button>
            <button type="button" class="btn btn-ghost" id="salaryReset">Đặt lại</button>
          </div>
        </section>

        <section class="salary-sources">
          <h3>Căn cứ tham khảo</h3>
          <a href="${SALARY_SOURCE_LINKS.base}" target="_blank" rel="noopener noreferrer">Mức lương cơ sở 2.530.000đ từ 01/07/2026 ↗</a>
          <a href="${SALARY_SOURCE_LINKS.salaryTable}" target="_blank" rel="noopener noreferrer">Nghị định 204/2004/NĐ-CP - bảng hệ số ↗</a>
          <a href="${SALARY_SOURCE_LINKS.qncnTable}" target="_blank" rel="noopener noreferrer">Bảng hệ số QNCN - nguồn VBPL ↗</a>
          <a href="${SALARY_SOURCE_LINKS.seniority}" target="_blank" rel="noopener noreferrer">Phụ cấp thâm niên nghề ↗</a>
          <a href="${SALARY_SOURCE_LINKS.publicDuty}" target="_blank" rel="noopener noreferrer">Phụ cấp công vụ 25% ↗</a>
          <p><b>Lưu ý:</b> Đây là công cụ ước tính phục vụ quản lý nội bộ. Kết quả không thay thế bảng lương, quyết định xếp lương hoặc xác nhận của cơ quan tài chính.</p>
        </section>
      </aside>
    </div>`;

  bindSalaryCalculator();
  updateSalaryCalculation();
}

function setSalaryType(type) {
  const validType = ['officer', 'qncn', 'manual'].includes(type) ? type : 'manual';
  document.querySelectorAll('[data-salary-type]').forEach(button => button.classList.toggle('active', button.dataset.salaryType === validType));
  byId('salaryOfficerFields')?.classList.toggle('hidden', validType !== 'officer');
  byId('salaryQncnFields')?.classList.toggle('hidden', validType !== 'qncn');
  byId('salaryManualFields')?.classList.toggle('hidden', validType !== 'manual');
  updateSalaryCalculation();
}

function currentSalaryType() {
  return document.querySelector('[data-salary-type].active')?.dataset.salaryType || 'officer';
}

function refreshQncnGradeOptions(keepGrade = true) {
  const grade = byId('salaryQncnGrade');
  if (!grade) return;
  const previous = keepGrade ? Number(grade.value || 1) : 1;
  const level = byId('salaryQncnLevel')?.value || 'caoCap';
  const group = byId('salaryQncnGroup')?.value || 'group1';
  const maxGrade = QNCN_SALARY_COEFFICIENTS[level]?.[group]?.length || 1;
  grade.innerHTML = salaryGradeOptions(level, group, Math.min(previous, maxGrade));
}

function applyPersonToSalaryCalculator(personId) {
  salarySelectedPersonId = personId || '';
  const person = people.find(p => p.id === personId);
  const hint = byId('salaryPersonHint');
  const saveButton = byId('salarySaveToPerson');

  if (!person) {
    if (hint) hint.textContent = 'Bạn có thể tính độc lập mà không thay đổi dữ liệu hồ sơ.';
    if (saveButton) saveButton.disabled = true;
    updateSalaryCalculation();
    return;
  }

  if (hint) {
    hint.innerHTML = `<b>${esc(person.name)}</b> · ${esc(person.position || 'Chưa cập nhật chức vụ')}<br>Đang lưu: lương ${salaryMoney(person.salary)}, phụ cấp ${salaryMoney(person.allowance)}. Chỉ thay đổi khi bạn bấm “Ghi lương vào hồ sơ”.`;
  }
  if (saveButton) saveButton.disabled = false;
  if (byId('salaryYears')) byId('salaryYears').value = person.years ?? 0;

  if (person.category === 'Sĩ quan' && OFFICER_SALARY_COEFFICIENTS[person.rank]) {
    setSalaryType('officer');
    byId('salaryOfficerRank').value = person.rank;
  } else if (person.category === 'Quân nhân chuyên nghiệp' || person.rank === 'QNCN') {
    setSalaryType('qncn');
  } else {
    setSalaryType('manual');
    if (person.salary > 0) {
      const base = salaryNumber(byId('salaryBaseAmount')?.value, SALARY_BASE_2026);
      byId('salaryManualCoefficient').value = base > 0 ? (person.salary / base).toFixed(2) : '0';
    }
  }
  updateSalaryCalculation();
}

function calculateSalaryValues() {
  const type = currentSalaryType();
  const baseAmount = salaryClamp(byId('salaryBaseAmount')?.value, 0, 100000000);
  const coefficient = getSalaryCoefficient(type) ?? 0;
  const years = salaryClamp(byId('salaryYears')?.value, 0, 65);
  const seniorityPercent = salarySeniorityPercent(years);

  const basePay = baseAmount * coefficient;
  const leadership = baseAmount * salaryClamp(byId('salaryLeadershipCoefficient')?.value, 0, 10);
  const command = baseAmount * salaryClamp(byId('salaryCommandCoefficient')?.value, 0, 10);
  const otherCoeff = baseAmount * salaryClamp(byId('salaryOtherCoefficient')?.value, 0, 10);
  const seniority = (basePay + leadership) * seniorityPercent / 100;
  const percentAllowance = basePay * salaryClamp(byId('salaryPercentAllowance')?.value, 0, 300) / 100;
  const fixedAllowance = salaryClamp(byId('salaryFixedAllowance')?.value, 0, 1000000000);
  const publicDutyPercent = salaryClamp(byId('salaryPublicDutyPercent')?.value, 0, 100);
  const publicDuty = byId('salaryPublicDutyEnabled')?.checked ? (basePay + leadership) * publicDutyPercent / 100 : 0;

  const totalAllowances = seniority + leadership + command + otherCoeff + percentAllowance + fixedAllowance + publicDuty;
  const gross = basePay + totalAllowances;

  const insuranceBase = basePay + seniority + leadership;
  const insurance = insuranceBase * salaryClamp(byId('salaryInsurancePercent')?.value, 0, 100) / 100;
  const tax = salaryClamp(byId('salaryTaxAmount')?.value, 0, 1000000000);
  const meal = salaryClamp(byId('salaryMealDeduction')?.value, 0, 1000000000);
  const otherDeduction = salaryClamp(byId('salaryOtherDeduction')?.value, 0, 1000000000);
  const totalDeductions = insurance + tax + meal + otherDeduction;
  const net = Math.max(0, gross - totalDeductions);

  return {
    type, baseAmount, coefficient, years, seniorityPercent, basePay, leadership, command,
    otherCoeff, seniority, percentAllowance, fixedAllowance, publicDuty, publicDutyPercent,
    totalAllowances, gross, insurance, tax, meal, otherDeduction, totalDeductions, net
  };
}

function salaryTypeLabel(values) {
  if (values.type === 'officer') return `Sĩ quan · ${byId('salaryOfficerRank')?.value || ''}`;
  if (values.type === 'qncn') {
    const levelMap = {caoCap: 'Cao cấp', trungCap: 'Trung cấp', soCap: 'Sơ cấp'};
    const groupMap = {group1: 'Nhóm 1', group2: 'Nhóm 2'};
    return `QNCN ${levelMap[byId('salaryQncnLevel')?.value] || ''} · ${groupMap[byId('salaryQncnGroup')?.value] || ''} · Bậc ${byId('salaryQncnGrade')?.value || ''}`;
  }
  return 'Hệ số tự nhập';
}

function setSalaryResultText(id, value) {
  const element = byId(id);
  if (element) element.textContent = salaryMoney(value);
}

function updateSalaryCalculation() {
  if (!byId('salaryLedger')) return;
  const values = calculateSalaryValues();
  salaryLastResult = values;

  const coefficientDisplay = byId('salaryCoefficientDisplay');
  if (coefficientDisplay) coefficientDisplay.textContent = values.coefficient.toFixed(2);
  const seniorityDisplay = byId('salarySeniorityDisplay');
  if (seniorityDisplay) seniorityDisplay.textContent = `${values.seniorityPercent}%`;

  const selectedPerson = people.find(p => p.id === salarySelectedPersonId);
  const title = byId('salaryResultTitle');
  if (title) title.textContent = selectedPerson ? selectedPerson.name : 'Bảng tính lương';
  const meta = byId('salaryResultMeta');
  if (meta) meta.textContent = `${salaryTypeLabel(values)} · Hệ số ${values.coefficient.toFixed(2)} · Cơ sở ${salaryMoney(values.baseAmount)}`;

  setSalaryResultText('salaryResultBase', values.basePay);
  setSalaryResultText('salaryResultSeniority', values.seniority);
  setSalaryResultText('salaryResultLeadership', values.leadership);
  setSalaryResultText('salaryResultCommand', values.command);
  setSalaryResultText('salaryResultOtherCoeff', values.otherCoeff);
  setSalaryResultText('salaryResultPercent', values.percentAllowance);
  setSalaryResultText('salaryResultFixed', values.fixedAllowance);
  setSalaryResultText('salaryResultPublicDuty', values.publicDuty);
  setSalaryResultText('salaryResultGross', values.gross);
  setSalaryResultText('salaryResultInsurance', -values.insurance);
  setSalaryResultText('salaryResultTax', -values.tax);
  setSalaryResultText('salaryResultMeal', -values.meal);
  setSalaryResultText('salaryResultOtherDeduction', -values.otherDeduction);
  setSalaryResultText('salaryResultNet', values.net);
}

async function saveSalaryResultToPerson() {
  const person = people.find(p => p.id === salarySelectedPersonId);
  if (!person || !salaryLastResult) return;
  const basePay = Math.round(salaryLastResult.basePay);
  const allowance = Math.round(salaryLastResult.totalAllowances);
  if (!confirm(`Cập nhật hồ sơ ${person.name}?\n\nLương: ${salaryMoney(basePay)}\nPhụ cấp: ${salaryMoney(allowance)}\n\nCác khoản khấu trừ không được ghi vào hồ sơ.`)) return;

  const button = byId('salarySaveToPerson');
  if (button) {
    button.disabled = true;
    button.textContent = 'Đang lưu...';
  }
  try {
    await api('/api/people/' + encodeURIComponent(person.id), {
      method: 'PUT',
      body: JSON.stringify({...person, salary: basePay, allowance})
    });
    await refreshPeople();
    notify('Đã cập nhật lương và phụ cấp vào hồ sơ.');
    applyPersonToSalaryCalculator(person.id);
  } catch (error) {
    alert('Không thể cập nhật hồ sơ: ' + error.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Ghi lương vào hồ sơ';
    }
  }
}

async function copySalaryResult() {
  if (!salaryLastResult) return;
  const person = people.find(p => p.id === salarySelectedPersonId);
  const lines = [
    'PERSONNEL INSIGHT - BẢNG ƯỚC TÍNH LƯƠNG',
    person ? `${person.code} - ${person.name}` : 'Tính độc lập',
    `${salaryTypeLabel(salaryLastResult)} - Hệ số ${salaryLastResult.coefficient.toFixed(2)}`,
    `Lương theo hệ số: ${salaryMoney(salaryLastResult.basePay)}`,
    `Tổng phụ cấp: ${salaryMoney(salaryLastResult.totalAllowances)}`,
    `Tổng thu nhập: ${salaryMoney(salaryLastResult.gross)}`,
    `Tổng khấu trừ: ${salaryMoney(salaryLastResult.totalDeductions)}`,
    `Thực nhận ước tính: ${salaryMoney(salaryLastResult.net)}`,
    'Kết quả chỉ có tính chất ước tính; cần đối chiếu quyết định/bảng lương chính thức.'
  ];
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    notify('Đã sao chép bảng tính lương.');
  } catch (_) {
    alert(lines.join('\n'));
  }
}

function resetSalaryCalculator() {
  salarySelectedPersonId = '';
  if (byId('salaryPersonSelect')) byId('salaryPersonSelect').value = '';
  if (byId('salaryBaseAmount')) byId('salaryBaseAmount').value = SALARY_BASE_2026;
  if (byId('salaryYears')) byId('salaryYears').value = 5;
  if (byId('salaryLeadershipCoefficient')) byId('salaryLeadershipCoefficient').value = 0;
  if (byId('salaryCommandCoefficient')) byId('salaryCommandCoefficient').value = 0;
  if (byId('salaryOtherCoefficient')) byId('salaryOtherCoefficient').value = 0;
  if (byId('salaryPercentAllowance')) byId('salaryPercentAllowance').value = 0;
  if (byId('salaryFixedAllowance')) byId('salaryFixedAllowance').value = 0;
  if (byId('salaryPublicDutyEnabled')) byId('salaryPublicDutyEnabled').checked = true;
  if (byId('salaryPublicDutyPercent')) byId('salaryPublicDutyPercent').value = 25;
  if (byId('salaryInsurancePercent')) byId('salaryInsurancePercent').value = 0;
  if (byId('salaryTaxAmount')) byId('salaryTaxAmount').value = 0;
  if (byId('salaryMealDeduction')) byId('salaryMealDeduction').value = 0;
  if (byId('salaryOtherDeduction')) byId('salaryOtherDeduction').value = 0;
  if (byId('salaryOfficerRank')) byId('salaryOfficerRank').value = 'Thiếu úy';
  if (byId('salaryQncnLevel')) byId('salaryQncnLevel').value = 'caoCap';
  if (byId('salaryQncnGroup')) byId('salaryQncnGroup').value = 'group1';
  refreshQncnGradeOptions(false);
  setSalaryType('officer');
  applyPersonToSalaryCalculator('');
}

function bindSalaryCalculator() {
  const personSelect = byId('salaryPersonSelect');
  if (personSelect) personSelect.addEventListener('change', e => applyPersonToSalaryCalculator(e.target.value));

  document.querySelectorAll('[data-salary-type]').forEach(button => {
    button.addEventListener('click', () => setSalaryType(button.dataset.salaryType));
  });

  ['salaryQncnLevel', 'salaryQncnGroup'].forEach(id => {
    byId(id)?.addEventListener('change', () => {
      refreshQncnGradeOptions(false);
      updateSalaryCalculation();
    });
  });

  const calculator = byId('main');
  calculator?.querySelectorAll('input,select').forEach(input => {
    if (['salaryPersonSelect', 'salaryQncnLevel', 'salaryQncnGroup'].includes(input.id)) return;
    input.addEventListener('input', updateSalaryCalculation);
    input.addEventListener('change', updateSalaryCalculation);
  });

  byId('salarySaveToPerson')?.addEventListener('click', saveSalaryResultToPerson);
  byId('salaryCopyResult')?.addEventListener('click', copySalaryResult);
  byId('salaryPrintResult')?.addEventListener('click', () => window.print());
  byId('salaryReset')?.addEventListener('click', resetSalaryCalculator);
}

document.addEventListener('click', event => {
  const salaryNav = event.target.closest('[data-salary-page]');
  if (salaryNav) {
    document.querySelectorAll('[data-page]').forEach(button => button.classList.remove('active'));
    salaryNav.classList.add('active');
    byId('breadcrumb').textContent = 'Tính lương';
    byId('sidebar').classList.remove('open');
    renderSalaryCalculator();
    window.scrollTo({top: 0, behavior: 'instant'});
    return;
  }

  if (event.target.closest('[data-page]')) {
    document.querySelectorAll('[data-salary-page]').forEach(button => button.classList.remove('active'));
  }
});
