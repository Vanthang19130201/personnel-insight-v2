'use strict';

/*
 * Personnel Insight
 * Bổ sung chi tiết:
 * - Tỉnh/thành -> xã/phường -> địa chỉ chi tiết.
 * - Sức khỏe bình thường / không bình thường + ghi chú.
 * - Học vấn 3/12 đến 12/12.
 * - Trình độ chuyên môn.
 * - Click vào mọi nhóm thống kê để xem danh sách người thuộc nhóm đó.
 * - Giữ tương thích với dữ liệu residence cũ.
 */

const EDUCATION_LEVELS = Object.freeze([
  '3/12',
  '4/12',
  '5/12',
  '6/12',
  '7/12',
  '8/12',
  '9/12',
  '10/12',
  '11/12',
  '12/12'
]);

const QUALIFICATION_LEVELS = Object.freeze([
  'Chưa qua đào tạo chuyên môn',
  'Sơ cấp',
  'Trung cấp',
  'Cao đẳng',
  'Đại học',
  'Sau đại học',
  'Khác'
]);

const HEALTH_STATUSES = Object.freeze([
  'Bình thường',
  'Không bình thường'
]);

let geoProvincePromise = null;
const geoWardPromises = new Map();

let drillPeople = [];
let drillTitle = '';

/* =========================================================
   1. CÀI THÊM TRƯỜNG VÀO FORM HIỆN TẠI
========================================================= */

function installEnhancedFields() {
  installEducationOptions();
  installQualificationOptions();
  installAddressFields();
  installHealthFields();
  installDrilldownModal();
}

function optionHtml(value, label = value) {
  return `<option value="${esc(value)}">${esc(label)}</option>`;
}

function installEducationOptions() {
  const select = byId('personEducation');
  if (!select) return;

  select.innerHTML =
    '<option value="">Chưa cập nhật</option>'
    + EDUCATION_LEVELS.map(level => optionHtml(level)).join('')
    + optionHtml('Khác');
}

function installQualificationOptions() {
  const select = byId('personQualification');
  if (!select) return;

  select.innerHTML =
    '<option value="">Chưa cập nhật</option>'
    + QUALIFICATION_LEVELS.map(level => optionHtml(level)).join('')
    + '<option value="THPT">THPT (dữ liệu cũ)</option>';
}

function installAddressFields() {
  const oldResidence = byId('personResidence');
  if (!oldResidence) return;

  const oldField = oldResidence.closest('.field');
  if (!oldField) return;

  oldField.outerHTML = `
    <div class="field">
      <label for="personProvince">Tỉnh / thành hiện nay</label>
      <select id="personProvince" name="provinceCode">
        <option value="">Đang tải danh mục...</option>
      </select>
      <input id="personProvinceName" name="province" type="hidden">
      <small id="provinceHelp">Danh mục hành chính 2 cấp hiện hành.</small>
    </div>

    <div class="field">
      <label for="personWard">Xã / phường hiện nay</label>
      <select id="personWard" name="wardCode" disabled>
        <option value="">Chọn tỉnh/thành trước</option>
      </select>
      <input id="personResidence" name="residence" type="hidden">
    </div>

    <div class="field wide">
      <label for="personAddressDetail">Địa chỉ chi tiết</label>
      <input
        id="personAddressDetail"
        name="addressDetail"
        maxlength="150"
        placeholder="Ví dụ: Thôn 2, số nhà 15, đường ...">
    </div>
  `;

  byId('personProvince')?.addEventListener(
    'change',
    handleProvinceChange
  );

  byId('personWard')?.addEventListener(
    'change',
    syncWardHiddenFields
  );

  void loadProvinceOptions();
}

function installHealthFields() {
  if (byId('personHealthStatus')) return;

  const addressDetail =
    byId('personAddressDetail')?.closest('.field');

  if (!addressDetail) return;

  addressDetail.insertAdjacentHTML(
    'afterend',
    `
      <div class="field">
        <label for="personHealthStatus">Tình trạng sức khỏe</label>
        <select id="personHealthStatus" name="healthStatus">
          <option value="">Chưa cập nhật</option>
          <option value="Bình thường">Bình thường</option>
          <option value="Không bình thường">Không bình thường</option>
        </select>
      </div>

      <div class="field wide health-note-field hidden" id="healthNoteField">
        <label for="personHealthNote">Sức khỏe cần lưu ý</label>
        <textarea
          id="personHealthNote"
          name="healthNote"
          rows="2"
          maxlength="300"
          placeholder="Ví dụ: Đau dạ dày, dị ứng thuốc..., chỉ ghi nội dung cần thiết cho quản lý."></textarea>
      </div>
    `
  );

  byId('personHealthStatus')?.addEventListener(
    'change',
    syncHealthNoteVisibility
  );
}

function installDrilldownModal() {
  if (byId('drilldownModal')) return;

  document.body.insertAdjacentHTML(
    'beforeend',
    `
      <div
        id="drilldownModal"
        class="detail-modal-layer hidden"
        role="presentation">

        <section
          class="detail-modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drilldownTitle">

          <div class="detail-modal-head">
            <div>
              <span class="eyebrow">DANH SÁCH CHI TIẾT</span>
              <h2 id="drilldownTitle">Chi tiết</h2>
              <p id="drilldownCount"></p>
            </div>

            <button
              type="button"
              class="icon-btn"
              id="closeDrilldown"
              aria-label="Đóng">
              ✕
            </button>
          </div>

          <div class="detail-modal-toolbar">
            <input
              id="drilldownSearch"
              type="search"
              placeholder="Tìm theo tên, mã, quân hàm, địa chỉ...">
          </div>

          <div
            id="drilldownTable"
            class="detail-table-wrap">
          </div>
        </section>
      </div>
    `
  );

  byId('closeDrilldown')?.addEventListener(
    'click',
    closeDrilldown
  );

  byId('drilldownModal')?.addEventListener(
    'click',
    event => {
      if (event.target.id === 'drilldownModal') {
        closeDrilldown();
      }
    }
  );

  byId('drilldownSearch')?.addEventListener(
    'input',
    renderDrilldownTable
  );
}

installEnhancedFields();

/* =========================================================
   2. DỮ LIỆU ĐỊA CHỈ HÀNH CHÍNH
========================================================= */

async function geoApi(path) {
  return api(path);
}

async function loadProvinces() {
  if (!geoProvincePromise) {
    geoProvincePromise =
      geoApi('/api/geo/provinces')
        .catch(error => {
          geoProvincePromise = null;
          throw error;
        });
  }

  return geoProvincePromise;
}

async function loadWards(provinceCode) {
  if (!provinceCode) return [];

  if (!geoWardPromises.has(provinceCode)) {
    geoWardPromises.set(
      provinceCode,
      geoApi(
        '/api/geo/provinces/'
        + encodeURIComponent(provinceCode)
        + '/wards'
      ).catch(error => {
        geoWardPromises.delete(provinceCode);
        throw error;
      })
    );
  }

  return geoWardPromises.get(provinceCode);
}

async function loadProvinceOptions(
  selectedCode = '',
  selectedName = ''
) {
  const select = byId('personProvince');
  const help = byId('provinceHelp');

  if (!select) return;

  select.disabled = true;
  select.innerHTML =
    '<option value="">Đang tải danh mục tỉnh/thành...</option>';

  try {
    const provinces = await loadProvinces();

    select.innerHTML =
      '<option value="">Chọn tỉnh / thành</option>'
      + provinces.map(item => {
        const selected =
          String(item.code) === String(selectedCode)
          || (
            !selectedCode
            && selectedName
            && item.name === selectedName
          );

        return `
          <option
            value="${esc(item.code)}"
            ${selected ? 'selected' : ''}>
            ${esc(item.name)}
          </option>
        `;
      }).join('');

    select.disabled = false;

    if (help) {
      help.textContent =
        'Chọn tỉnh/thành, hệ thống sẽ lọc xã/phường trực thuộc.';
    }
  } catch (error) {
    select.innerHTML =
      '<option value="">Không tải được danh mục</option>';
    select.disabled = true;

    if (help) {
      help.textContent =
        'Không tải được danh mục hành chính: '
        + error.message;
    }
  }
}

async function handleProvinceChange() {
  const provinceSelect = byId('personProvince');
  const provinceName = byId('personProvinceName');
  const residence = byId('personResidence');

  if (!provinceSelect) return;

  const code = provinceSelect.value;
  const name =
    provinceSelect.selectedOptions[0]?.textContent?.trim()
    || '';

  if (provinceName) {
    provinceName.value = code ? name : '';
  }

  if (residence) {
    residence.value = '';
  }

  await loadWardOptions(code);
}

async function loadWardOptions(
  provinceCode,
  selectedWardCode = '',
  selectedResidence = ''
) {
  const wardSelect = byId('personWard');

  if (!wardSelect) return;

  if (!provinceCode) {
    wardSelect.disabled = true;

    if (selectedResidence) {
      wardSelect.innerHTML =
        `<option value="">${esc(selectedResidence)} (dữ liệu cũ)</option>`;
    } else {
      wardSelect.innerHTML =
        '<option value="">Chọn tỉnh/thành trước</option>';
    }

    return;
  }

  wardSelect.disabled = true;
  wardSelect.innerHTML =
    '<option value="">Đang tải xã/phường...</option>';

  try {
    const wards = await loadWards(provinceCode);

    if (byId('personProvince')?.value !== String(provinceCode)) {
      return;
    }

    let foundSelected = false;

    const options = wards.map(item => {
      const selected =
        String(item.code) === String(selectedWardCode)
        || (
          !selectedWardCode
          && selectedResidence
          && item.name === selectedResidence
        );

      if (selected) {
        foundSelected = true;
      }

      return `
        <option
          value="${esc(item.code)}"
          ${selected ? 'selected' : ''}>
          ${esc(item.name)}
        </option>
      `;
    }).join('');

    const legacyOption =
      selectedResidence && !foundSelected
        ? `
          <option value="" selected>
            ${esc(selectedResidence)} (dữ liệu cũ)
          </option>
        `
        : '<option value="">Chọn xã / phường</option>';

    wardSelect.innerHTML =
      legacyOption + options;

    wardSelect.disabled = false;

    syncWardHiddenFields();
  } catch (error) {
    wardSelect.innerHTML =
      selectedResidence
        ? `<option value="" selected>${esc(selectedResidence)} (dữ liệu cũ)</option>`
        : '<option value="">Không tải được danh mục xã/phường</option>';

    wardSelect.disabled = !selectedResidence;

    notify(
      'Không tải được danh mục xã/phường: '
      + error.message
    );
  }
}

function syncWardHiddenFields() {
  const wardSelect = byId('personWard');
  const residence = byId('personResidence');

  if (!wardSelect || !residence) return;

  const selected =
    wardSelect.selectedOptions[0];

  if (
    !selected
    || !wardSelect.value
  ) {
    return;
  }

  residence.value =
    selected.textContent.trim();
}

async function populateLocationForm(person) {
  const provinceSelect = byId('personProvince');
  const provinceName = byId('personProvinceName');
  const residence = byId('personResidence');
  const addressDetail = byId('personAddressDetail');

  if (
    !provinceSelect
    || !provinceName
    || !residence
  ) {
    return;
  }

  const provinceCode =
    person?.provinceCode || '';

  const province =
    person?.province || '';

  const wardCode =
    person?.wardCode || '';

  const oldResidence =
    person?.residence || '';

  provinceName.value =
    province;

  residence.value =
    oldResidence;

  if (addressDetail) {
    addressDetail.value =
      person?.addressDetail || '';
  }

  await loadProvinceOptions(
    provinceCode,
    province
  );

  const resolvedProvinceCode =
    provinceSelect.value;

  if (resolvedProvinceCode) {
    const provinceLabel =
      provinceSelect.selectedOptions[0]
        ?.textContent
        ?.trim()
      || province;

    provinceName.value =
      provinceLabel;

    await loadWardOptions(
      resolvedProvinceCode,
      wardCode,
      oldResidence
    );
  } else {
    await loadWardOptions(
      '',
      '',
      oldResidence
    );
  }
}

/* =========================================================
   3. SỨC KHỎE
========================================================= */

function syncHealthNoteVisibility() {
  const status =
    byId('personHealthStatus')?.value
    || '';

  const noteField =
    byId('healthNoteField');

  const note =
    byId('personHealthNote');

  const abnormal =
    status === 'Không bình thường';

  noteField?.classList.toggle(
    'hidden',
    !abnormal
  );

  if (!abnormal && note) {
    note.value = '';
  }
}

function populateHealthForm(person) {
  const status =
    byId('personHealthStatus');

  const note =
    byId('personHealthNote');

  if (status) {
    status.value =
      person?.healthStatus || '';
  }

  if (note) {
    note.value =
      person?.healthNote || '';
  }

  syncHealthNoteVisibility();
}

/* =========================================================
   4. MỞ FORM VÀ CHUẨN HÓA HỒ SƠ
========================================================= */

const _baseCleanPerson =
  cleanPerson;

cleanPerson = function (input) {
  const person =
    _baseCleanPerson(input);

  if (!person) {
    return null;
  }

  person.provinceCode =
    safeText(
      input?.provinceCode,
      20
    );

  person.province =
    safeText(
      input?.province,
      70
    );

  person.wardCode =
    safeText(
      input?.wardCode,
      20
    );

  person.residence =
    safeText(
      input?.residence,
      70
    ).replace(/\s+/g, ' ');

  person.addressDetail =
    safeText(
      input?.addressDetail,
      150
    ).replace(/\s+/g, ' ');

  person.healthStatus =
    safeText(
      input?.healthStatus,
      30
    );

  person.healthNote =
    safeText(
      input?.healthNote,
      300
    ).replace(/\s+/g, ' ');

  if (
    person.healthStatus
    !== 'Không bình thường'
  ) {
    person.healthNote = '';
  }

  return person;
};

const _baseOpenForm =
  openForm;

openForm = function (id = null) {
  _baseOpenForm(id);

  const person =
    id
      ? people.find(item => item.id === id)
      : null;

  void populateLocationForm(person);
  populateHealthForm(person);
};

/* =========================================================
   5. HIỂN THỊ ĐỊA CHỈ
========================================================= */

function fullAddress(person) {
  const parts = [
    person?.addressDetail,
    person?.residence,
    person?.province
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean);

  return parts.length
    ? parts.join(', ')
    : '—';
}

function residenceGroupLabel(person) {
  const ward =
    String(
      person?.residence || ''
    ).trim();

  const province =
    String(
      person?.province || ''
    ).trim();

  if (!ward) {
    return 'Chưa cập nhật';
  }

  return province
    ? `${ward} · ${province}`
    : ward;
}

/* =========================================================
   6. CÁC DÒNG TỔNG HỢP
========================================================= */

function residenceRows() {
  return frequency(
    people,
    person =>
      residenceGroupLabel(person)
  );
}

function provinceRows() {
  return frequency(
    people,
    person => person.province
  );
}

function rankRowsForReport() {
  return frequency(
    people,
    person => person.rank
  );
}

function healthRows() {
  const values = [
    'Bình thường',
    'Không bình thường',
    'Chưa cập nhật'
  ];

  return values.map(value => [
    value,
    people.filter(person => {
      const status =
        person.healthStatus
        || 'Chưa cập nhật';

      return status === value;
    }).length
  ]);
}

function educationRows() {
  const rows =
    EDUCATION_LEVELS.map(level => [
      level,
      people.filter(
        person =>
          person.education === level
      ).length
    ]);

  const other =
    people.filter(
      person =>
        person.education
        && !EDUCATION_LEVELS.includes(
          person.education
        )
    ).length;

  const missing =
    people.filter(
      person =>
        !person.education
    ).length;

  if (other) {
    rows.push(['Khác', other]);
  }

  if (missing) {
    rows.push([
      'Chưa cập nhật',
      missing
    ]);
  }

  return rows;
}

function qualificationRows() {
  return frequency(
    people,
    person =>
      person.qualification
  );
}

/* =========================================================
   7. DANH SÁCH HỒ SƠ
========================================================= */

personRow = function (
  person,
  actions = true
) {
  const initials =
    person.name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map(item => item[0])
      .join('')
      .toUpperCase();

  return `
    <tr>
      <td>
        <span class="mini-muted">
          ${esc(person.code)}
        </span>
      </td>

      <td>
        <div class="person-cell">
          <span class="initials">
            ${esc(initials)}
          </span>

          <div>
            <strong>
              ${esc(person.name)}
            </strong>

            <small>
              ${esc(
                person.rank
                || 'Chưa cập nhật'
              )}
              ·
              ${esc(person.group || '')}
            </small>
          </div>
        </div>
      </td>

      <td>
        ${dateAge(person.dob) ?? '—'}
      </td>

      <td>
        <span class="pill">
          ${esc(
            person.education
            || '—'
          )}
        </span>
      </td>

      <td>
        ${esc(
          person.qualification
          || '—'
        )}
      </td>

      <td>
        ${esc(
          person.position
          || '—'
        )}
      </td>

      <td title="${esc(fullAddress(person))}">
        ${esc(fullAddress(person))}
      </td>

      <td>
        ${
          person.healthStatus
            ? `
              <span class="health-pill ${
                person.healthStatus
                === 'Không bình thường'
                  ? 'health-warning'
                  : 'health-ok'
              }">
                ${esc(person.healthStatus)}
              </span>
            `
            : '—'
        }
      </td>

      <td>
        <strong>
          ${vnMoney(
            revenue(person)
          )}
        </strong>
      </td>

      ${
        actions
          ? `
            <td>
              <div class="actions">
                <button
                  class="small-action"
                  data-action="edit"
                  data-id="${esc(person.id)}">
                  Sửa
                </button>

                <button
                  class="small-action danger"
                  data-action="remove"
                  data-id="${esc(person.id)}">
                  Xóa
                </button>
              </div>
            </td>
          `
          : ''
      }
    </tr>
  `;
};

personTable = function (
  list,
  actions = true
) {
  return `
    <div class="table-scroll">
      <table class="data-table personnel-detail-table">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Họ tên / quân hàm</th>
            <th>Tuổi</th>
            <th>Học vấn</th>
            <th>Chuyên môn</th>
            <th>Chức vụ</th>
            <th>Nơi ở hiện nay</th>
            <th>Sức khỏe</th>
            <th>Thu nhập/tháng</th>
            ${actions ? '<th>Thao tác</th>' : ''}
          </tr>
        </thead>

        <tbody>
          ${
            list.length
              ? list
                  .map(
                    person =>
                      personRow(
                        person,
                        actions
                      )
                  )
                  .join('')
              : `
                <tr>
                  <td
                    colspan="${actions ? 10 : 9}"
                    class="empty">
                    Không có hồ sơ phù hợp.
                  </td>
                </tr>
              `
          }
        </tbody>
      </table>
    </div>
  `;
};

/* =========================================================
   8. BẢNG TỔNG HỢP 4 CỘT
========================================================= */

function pairedSummaryTable(
  title,
  rows,
  label
) {
  const data =
    rows.length
      ? rows
      : [['Chưa có dữ liệu', 0]];

  let body = '';

  for (
    let index = 0;
    index < data.length;
    index += 2
  ) {
    const left = data[index];
    const right = data[index + 1];

    body += `
      <tr>
        <td>${esc(left[0])}</td>
        <td class="summary-number">
          ${fmt(left[1])}
        </td>

        <td>
          ${right ? esc(right[0]) : ''}
        </td>
        <td class="summary-number">
          ${right ? fmt(right[1]) : ''}
        </td>
      </tr>
    `;
  }

  return `
    <section class="panel report-summary-panel">
      <h2>${esc(title)}</h2>

      <p class="panel-sub">
        Nhấn vào một nhóm để xem danh sách người.
      </p>

      <div class="table-scroll">
        <table class="data-table paired-summary-table">
          <thead>
            <tr>
              <th>${esc(label)}</th>
              <th>Q.số</th>
              <th>${esc(label)}</th>
              <th>Q.số</th>
            </tr>
          </thead>

          <tbody>
            ${body}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* =========================================================
   9. THỐNG KÊ CHUYÊN SÂU
========================================================= */

renderStatistics = function () {
  const married =
    people.filter(
      person =>
        person.marital
        === 'Đã kết hôn'
    ).length;

  const averageAge =
    people.length
      ? (
          people.reduce(
            (total, person) =>
              total
              + (dateAge(person.dob) || 0),
            0
          )
          / people.length
        ).toFixed(1)
      : '0';

  const avgYears =
    people.length
      ? (
          sum(
            people,
            'years'
          )
          / people.length
        ).toFixed(1)
      : '0';

  const categoryRows =
    frequency(
      people,
      person => person.category
    );

  byId('main').innerHTML =
    hero(
      'Thống kê chuyên sâu',
      'Nhấn vào từng nhóm để xem danh sách nhân sự thuộc nhóm đó.'
    )
    + `
      <div class="insights">
        <div class="insight">
          <span>Độ tuổi trung bình</span>
          <strong>${averageAge} tuổi</strong>
        </div>

        <div class="insight">
          <span>Đã kết hôn</span>
          <strong>
            ${fmt(married)}
            /
            ${fmt(people.length)}
          </strong>
        </div>

        <div class="insight">
          <span>Thâm niên trung bình</span>
          <strong>${avgYears} năm</strong>
        </div>
      </div>

      <div class="grid-two">
        ${
          metricPanel(
            'Độ tuổi',
            'Phân nhóm tự động',
            ages.map(label => [
              label,
              people.filter(
                person =>
                  ageBand(person)
                  === label
              ).length
            ])
          )
        }

        ${
          metricPanel(
            'Đối tượng quân nhân',
            'Sĩ quan, QNCN, hạ sĩ quan, chiến sĩ...',
            categoryRows,
            'gold'
          )
        }

        ${
          metricPanel(
            'Quân hàm / cấp bậc',
            'Số lượng theo quân hàm',
            rankRowsForReport(),
            'blue'
          )
        }

        ${
          metricPanel(
            'Dân tộc',
            'Số lượng theo dân tộc',
            frequency(
              people,
              person => person.ethnicity
            )
          )
        }

        ${
          metricPanel(
            'Tôn giáo',
            'Số lượng theo tôn giáo',
            frequency(
              people,
              person => person.religion
            ),
            'gold'
          )
        }

        ${
          metricPanel(
            'Đảng / Đoàn',
            'Tổ chức chính trị - đoàn thể',
            frequency(
              people,
              person => person.organization
            ),
            'blue'
          )
        }

        ${
          metricPanel(
            'Trình độ học vấn',
            'Từ 3/12 đến 12/12',
            educationRows()
          )
        }

        ${
          metricPanel(
            'Trình độ chuyên môn',
            'Sơ cấp, trung cấp, cao đẳng, đại học...',
            qualificationRows(),
            'gold'
          )
        }

        ${
          metricPanel(
            'Tình trạng sức khỏe',
            'Bình thường và các trường hợp cần lưu ý',
            healthRows(),
            'rose'
          )
        }

        ${
          metricPanel(
            'Tỉnh / thành hiện nay',
            'Nơi ở hiện nay theo tỉnh/thành',
            provinceRows(),
            'blue'
          )
        }

        ${
          metricPanel(
            'Xã / phường hiện nay',
            'Tổng hợp theo xã/phường',
            residenceRows(),
            'gold'
          )
        }

        ${
          metricPanel(
            'Hôn nhân gia đình',
            'Tình trạng hôn nhân hiện tại',
            frequency(
              people,
              person => person.marital
            ),
            'rose'
          )
        }

        ${
          metricPanel(
            'Hoàn cảnh gia đình',
            'Phân loại chung',
            frequency(
              people,
              person => person.family
            )
          )
        }

        ${
          metricPanel(
            'Nhóm quản lý',
            'Phân bố hồ sơ',
            frequency(
              people,
              person => person.group
            ),
            'gold'
          )
        }

        ${
          metricPanel(
            'Giới tính',
            'Phân loại theo hồ sơ',
            frequency(
              people,
              person => person.gender
            ),
            'blue'
          )
        }

        ${
          metricPanel(
            'Số con',
            'Phân bố số con',
            frequency(
              people,
              person =>
                `${person.children} con`
            ),
            'rose'
          )
        }
      </div>
    `;

  decorateStatistics();
};

/* =========================================================
   10. TỔNG HỢP THEO MẪU BÁO CÁO
========================================================= */

renderTemplateReport = function () {
  const count =
    people.length;

  const forty =
    people.filter(person => {
      const age =
        dateAge(person.dob);

      return (
        age !== null
        && age >= 40
        && age <= 45
      );
    }).length;

  const education12 =
    people.filter(
      person =>
        person.education === '12/12'
    ).length;

  const partyMembers =
    people.filter(
      person =>
        person.organization
        === 'Đảng viên'
    ).length;

  const married =
    people.filter(
      person =>
        person.marital
        === 'Đã kết hôn'
    ).length;

  const ageLabels = [
    '18–20',
    '21–22',
    '23–24',
    '25–29',
    '30–34',
    '35–39',
    '40–45',
    '46–54',
    '55+'
  ];

  const ageBands = [
    [18, 20],
    [21, 22],
    [23, 24],
    [25, 29],
    [30, 34],
    [35, 39],
    [40, 45],
    [46, 54],
    [55, 110]
  ];

  const reportAgeRows =
    ageLabels.map(
      (label, index) => [
        label,
        people.filter(person => {
          const age =
            dateAge(person.dob);

          return (
            age !== null
            && age >= ageBands[index][0]
            && age <= ageBands[index][1]
          );
        }).length
      ]
    );

  const rankCompleted =
    rankRowsForReport()
      .filter(
        ([key]) =>
          key !== 'Chưa cập nhật'
      )
      .reduce(
        (total, [, amount]) =>
          total + amount,
        0
      );

  const residenceCompleted =
    people.filter(
      person =>
        person.residence
    ).length;

  byId('main').innerHTML =
    hero(
      'Tổng hợp theo mẫu báo cáo',
      'Nhấn vào từng số liệu để mở danh sách nhân sự chi tiết.',
      `
        <button
          class="btn btn-primary"
          data-action="add">
          ＋ Thêm hồ sơ
        </button>

        <button
          class="btn btn-light"
          data-action="print">
          ▤ In báo cáo
        </button>
      `
    )
    + `
      <section class="stats-grid">
        ${
          metric(
            '♙',
            'Quân số đã nhập',
            fmt(count),
            'Tính từ database'
          )
        }

        ${
          metric(
            '◷',
            'Độ tuổi 40–45',
            fmt(forty),
            'Tính từ ngày sinh'
          )
        }

        ${
          metric(
            '▤',
            'Học vấn 12/12',
            fmt(education12),
            'Tính từ hồ sơ'
          )
        }

        ${
          metric(
            '◎',
            'Đảng viên',
            fmt(partyMembers),
            'Theo ô Đảng / Đoàn'
          )
        }
      </section>

      ${
        count === 0
          ? `
            <div class="welcome-empty">
              <div class="welcome-mark">
                ▤
              </div>

              <div>
                <strong>
                  Chưa có hồ sơ để lập báo cáo
                </strong>

                <p>
                  Hãy thêm nhân sự trong mục Hồ sơ nhân sự.
                </p>
              </div>
            </div>
          `
          : ''
      }

      <div class="grid-two">
        ${
          dynamicSourceSection(
            'I. Thành phần quân số',
            dynamicRows(
              person => person.category
            )
          )
        }

        ${
          pairedSummaryTable(
            'II. Quân hàm / cấp bậc',
            rankRowsForReport(),
            'Quân hàm'
          )
        }

        ${
          dynamicSourceSection(
            'III. Dân tộc',
            dynamicRows(
              person => person.ethnicity
            )
          )
        }

        ${
          dynamicSourceSection(
            'IV. Tôn giáo',
            dynamicRows(
              person => person.religion
            )
          )
        }

        ${
          dynamicSourceSection(
            'V.1 Học vấn',
            educationRows()
          )
        }

        ${
          dynamicSourceSection(
            'V.2 Trình độ chuyên môn',
            qualificationRows()
          )
        }

        ${
          dynamicSourceSection(
            'VI. Đảng, Đoàn',
            dynamicRows(
              person => person.organization
            )
          )
        }

        ${
          dynamicSourceSection(
            'VII. Độ tuổi',
            reportAgeRows
          )
        }

        ${
          dynamicSourceSection(
            'VIII. Hôn nhân',
            dynamicRows(
              person => person.marital
            )
          )
        }

        ${
          dynamicSourceSection(
            'IX. Hoàn cảnh gia đình',
            dynamicRows(
              person => person.family
            )
          )
        }

        ${
          dynamicSourceSection(
            'X. Chức vụ',
            dynamicRows(
              person => person.position
            )
          )
        }

        ${
          dynamicSourceSection(
            'XI. Sức khỏe',
            healthRows()
          )
        }

        ${
          dynamicSourceSection(
            'Tỉnh / thành hiện nay',
            provinceRows()
          )
        }
      </div>

      ${
        pairedSummaryTable(
          'XII. NƠI Ở HIỆN NAY',
          residenceRows(),
          'Xã / phường'
        )
      }

      <section class="panel">
        <h2>Bảng tóm tắt có thể in</h2>

        <div class="report-grid">
          <div>
            <b>${fmt(count)} người</b>
            <small>Tổng số hồ sơ</small>
          </div>

          <div>
            <b>${fmt(rankCompleted)} người</b>
            <small>Đã nhập quân hàm</small>
          </div>

          <div>
            <b>${fmt(residenceCompleted)} người</b>
            <small>Đã nhập nơi ở</small>
          </div>

          <div>
            <b>${fmt(married)} người</b>
            <small>Đã kết hôn</small>
          </div>

          <div>
            <b>
              ${
                fmt(
                  people.filter(
                    person =>
                      person.healthStatus
                      === 'Không bình thường'
                  ).length
                )
              }
              người
            </b>
            <small>Sức khỏe cần lưu ý</small>
          </div>

          <div>
            <b>
              ${
                vnMoney(
                  sum(
                    people,
                    'salary'
                  )
                  +
                  sum(
                    people,
                    'allowance'
                  )
                )
              }
            </b>
            <small>Tổng thu nhập tháng</small>
          </div>
        </div>

        <p class="footer-note">
          Ngày tạo:
          ${new Date().toLocaleDateString('vi-VN')}.
          Toàn bộ số liệu lấy trực tiếp từ hồ sơ trong database.
        </p>
      </section>
    `;

  decorateTemplateReport();
};

/* =========================================================
   11. CLICK TỪ THỐNG KÊ -> DANH SÁCH NGƯỜI
========================================================= */

const DRILL_PANEL_MAP = Object.freeze({
  'Độ tuổi': 'ageBand',
  'Đối tượng quân nhân': 'category',
  'Quân hàm / cấp bậc': 'rank',
  'Dân tộc': 'ethnicity',
  'Tôn giáo': 'religion',
  'Đảng / Đoàn': 'organization',
  'Trình độ học vấn': 'education',
  'Trình độ chuyên môn': 'qualification',
  'Tình trạng sức khỏe': 'healthStatus',
  'Tỉnh / thành hiện nay': 'province',
  'Xã / phường hiện nay': 'residenceDisplay',
  'Hôn nhân gia đình': 'marital',
  'Hoàn cảnh gia đình': 'family',
  'Nhóm quản lý': 'group',
  'Giới tính': 'gender',
  'Số con': 'children',

  'I. Thành phần quân số': 'category',
  'III. Dân tộc': 'ethnicity',
  'IV. Tôn giáo': 'religion',
  'V.1 Học vấn': 'education',
  'V.2 Trình độ chuyên môn': 'qualification',
  'VI. Đảng, Đoàn': 'organization',
  'VII. Độ tuổi': 'reportAge',
  'VIII. Hôn nhân': 'marital',
  'IX. Hoàn cảnh gia đình': 'family',
  'X. Chức vụ': 'position',
  'XI. Sức khỏe': 'healthStatus'
});

function decorateStatistics() {
  decorateChartPanels(
    byId('main')
  );
}

function decorateTemplateReport() {
  const main = byId('main');

  decorateChartPanels(main);

  decoratePairedTable(
    main,
    'II. Quân hàm / cấp bậc',
    'rank'
  );

  decoratePairedTable(
    main,
    'XII. NƠI Ở HIỆN NAY',
    'residenceDisplay'
  );
}

function decorateChartPanels(root) {
  if (!root) return;

  root
    .querySelectorAll(
      'section.panel'
    )
    .forEach(panel => {
      const title =
        panel
          .querySelector('h2')
          ?.textContent
          ?.trim();

      const field =
        DRILL_PANEL_MAP[title];

      if (!field) return;

      panel
        .querySelectorAll(
          '.chart-line'
        )
        .forEach(line => {
          const label =
            line
              .querySelector(
                '.chart-name'
              )
              ?.textContent
              ?.trim();

          if (!label) return;

          setDrillTarget(
            line,
            field,
            label
          );
        });
    });
}

function decoratePairedTable(
  root,
  title,
  field
) {
  if (!root) return;

  const panel =
    [...root.querySelectorAll(
      'section.panel'
    )].find(item => {
      return (
        item
          .querySelector('h2')
          ?.textContent
          ?.trim()
        === title
      );
    });

  if (!panel) return;

  panel
    .querySelectorAll(
      'tbody tr'
    )
    .forEach(row => {
      const cells =
        [...row.children];

      [
        [0, 1],
        [2, 3]
      ].forEach(
        ([labelIndex, countIndex]) => {
          const labelCell =
            cells[labelIndex];

          const countCell =
            cells[countIndex];

          const label =
            labelCell
              ?.textContent
              ?.trim();

          if (!label) return;

          setDrillTarget(
            labelCell,
            field,
            label
          );

          if (countCell) {
            setDrillTarget(
              countCell,
              field,
              label
            );
          }
        }
      );
    });
}

function setDrillTarget(
  element,
  field,
  value
) {
  element.dataset.drillField =
    field;

  element.dataset.drillValue =
    value;

  element.tabIndex = 0;
  element.setAttribute(
    'role',
    'button'
  );

  element.title =
    'Nhấn để xem danh sách';
}

function personMatchesDrill(
  person,
  field,
  value
) {
  if (field === 'ageBand') {
    return (
      ageBand(person)
      === value
    );
  }

  if (field === 'reportAge') {
    return reportAgeLabel(person)
      === value;
  }

  if (field === 'children') {
    return (
      `${person.children} con`
      === value
    );
  }

  if (field === 'residenceDisplay') {
    return (
      residenceGroupLabel(person)
      === value
    );
  }

  const actual =
    String(
      person[field]
      || 'Chưa cập nhật'
    ).trim();

  return actual === value;
}

function reportAgeLabel(person) {
  const age =
    dateAge(person.dob);

  if (age === null) {
    return 'Chưa cập nhật';
  }

  if (age <= 20) return '18–20';
  if (age <= 22) return '21–22';
  if (age <= 24) return '23–24';
  if (age <= 29) return '25–29';
  if (age <= 34) return '30–34';
  if (age <= 39) return '35–39';
  if (age <= 45) return '40–45';
  if (age <= 54) return '46–54';

  return '55+';
}

function openDrilldown(
  field,
  value
) {
  drillPeople =
    people.filter(
      person =>
        personMatchesDrill(
          person,
          field,
          value
        )
    );

  drillPeople.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        'vi'
      )
  );

  drillTitle =
    value;

  byId('drilldownTitle').textContent =
    value;

  byId('drilldownSearch').value =
    '';

  byId('drilldownModal')
    ?.classList
    .remove('hidden');

  document.body.style.overflow =
    'hidden';

  renderDrilldownTable();
}

function closeDrilldown() {
  byId('drilldownModal')
    ?.classList
    .add('hidden');

  document.body.style.overflow =
    '';
}

function renderDrilldownTable() {
  const container =
    byId('drilldownTable');

  if (!container) return;

  const query =
    byId('drilldownSearch')
      ?.value
      ?.trim()
      ?.toLocaleLowerCase('vi')
    || '';

  const list =
    query
      ? drillPeople.filter(person => {
          const text = [
            person.code,
            person.name,
            person.category,
            person.rank,
            person.ethnicity,
            person.religion,
            person.organization,
            person.education,
            person.qualification,
            fullAddress(person),
            person.healthStatus,
            person.healthNote
          ]
            .join(' ')
            .toLocaleLowerCase('vi');

          return text.includes(query);
        })
      : drillPeople;

  byId('drilldownCount').textContent =
    `${fmt(list.length)} người`;

  container.innerHTML = `
    <table class="data-table drilldown-table">
      <thead>
        <tr>
          <th>Mã</th>
          <th>Họ tên</th>
          <th>Đối tượng</th>
          <th>Quân hàm</th>
          <th>Dân tộc</th>
          <th>Tôn giáo</th>
          <th>Đảng / Đoàn</th>
          <th>Học vấn</th>
          <th>Chuyên môn</th>
          <th>Nơi ở</th>
          <th>Sức khỏe</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        ${
          list.length
            ? list.map(person => `
                <tr>
                  <td>
                    ${esc(person.code)}
                  </td>

                  <td>
                    <strong>
                      ${esc(person.name)}
                    </strong>
                  </td>

                  <td>
                    ${esc(
                      person.category
                      || '—'
                    )}
                  </td>

                  <td>
                    ${esc(
                      person.rank
                      || '—'
                    )}
                  </td>

                  <td>
                    ${esc(
                      person.ethnicity
                      || '—'
                    )}
                  </td>

                  <td>
                    ${esc(
                      person.religion
                      || '—'
                    )}
                  </td>

                  <td>
                    ${esc(
                      person.organization
                      || '—'
                    )}
                  </td>

                  <td>
                    ${esc(
                      person.education
                      || '—'
                    )}
                  </td>

                  <td>
                    ${esc(
                      person.qualification
                      || '—'
                    )}
                  </td>

                  <td class="detail-address-cell">
                    ${esc(fullAddress(person))}
                  </td>

                  <td>
                    ${
                      person.healthStatus
                        === 'Không bình thường'
                        ? `
                          <strong class="health-text-warning">
                            Không bình thường
                          </strong>

                          ${
                            person.healthNote
                              ? `
                                <small class="health-note-text">
                                  ${esc(person.healthNote)}
                                </small>
                              `
                              : ''
                          }
                        `
                        : esc(
                            person.healthStatus
                            || '—'
                          )
                    }
                  </td>

                  <td>
                    <button
                      type="button"
                      class="small-action"
                      data-detail-person="${esc(person.id)}">
                      Mở hồ sơ
                    </button>
                  </td>
                </tr>
              `).join('')
            : `
              <tr>
                <td
                  colspan="12"
                  class="empty">
                  Không có hồ sơ phù hợp.
                </td>
              </tr>
            `
        }
      </tbody>
    </table>
  `;
}

/* =========================================================
   12. EVENT CHO DRILLDOWN
========================================================= */

document.addEventListener(
  'click',
  event => {
    const drill =
      event.target.closest(
        '[data-drill-field]'
      );

    if (drill) {
      openDrilldown(
        drill.dataset.drillField,
        drill.dataset.drillValue
      );
      return;
    }

    const detailPerson =
      event.target.closest(
        '[data-detail-person]'
      );

    if (detailPerson) {
      const id =
        detailPerson.dataset.detailPerson;

      closeDrilldown();
      openForm(id);
    }
  }
);

document.addEventListener(
  'keydown',
  event => {
    if (
      event.key !== 'Enter'
      && event.key !== ' '
    ) {
      return;
    }

    const drill =
      event.target.closest(
        '[data-drill-field]'
      );

    if (!drill) return;

    event.preventDefault();

    openDrilldown(
      drill.dataset.drillField,
      drill.dataset.drillValue
    );
  }
);

/* =========================================================
   13. CSV CÓ ĐỦ CÁC TRƯỜNG MỚI
========================================================= */

exportCsv = function () {
  const columns = [
    ['code', 'Mã nhân sự'],
    ['name', 'Họ và tên'],
    ['dob', 'Ngày sinh'],
    ['gender', 'Giới tính'],
    ['group', 'Nhóm'],
    ['rank', 'Quân hàm / cấp bậc'],
    ['category', 'Đối tượng quân nhân'],
    ['position', 'Chức vụ'],

    ['education', 'Trình độ học vấn'],
    ['qualification', 'Trình độ chuyên môn'],

    ['ethnicity', 'Dân tộc'],
    ['religion', 'Tôn giáo'],
    ['organization', 'Đảng / Đoàn'],

    ['province', 'Tỉnh / thành'],
    ['residence', 'Xã / phường'],
    ['addressDetail', 'Địa chỉ chi tiết'],

    ['healthStatus', 'Tình trạng sức khỏe'],
    ['healthNote', 'Sức khỏe cần lưu ý'],

    ['marital', 'Hôn nhân'],
    ['family', 'Hoàn cảnh gia đình'],
    ['children', 'Số con'],
    ['years', 'Thâm niên'],
    ['salary', 'Lương tháng'],
    ['allowance', 'Phụ cấp'],
    ['note', 'Ghi chú']
  ];

  const csvCell = value => {
    let text =
      String(value ?? '');

    text =
      text.replaceAll(
        '"',
        '""'
      );

    if (
      /^\s*[=+@\-\u2212]/.test(text)
    ) {
      text = "'" + text;
    }

    return `"${text}"`;
  };

  const header =
    columns
      .map(
        ([, label]) =>
          csvCell(label)
      )
      .join(',');

  const dataRows =
    people.map(
      person =>
        columns
          .map(
            ([key]) =>
              csvCell(person[key])
          )
          .join(',')
    );

  download(
    'personnel-insight-data.csv',
    [
      header,
      ...dataRows
    ].join('\r\n'),
    'text/csv;charset=utf-8'
  );

  notify(
    'Đã xuất CSV có địa chỉ và sức khỏe.'
  );
};
