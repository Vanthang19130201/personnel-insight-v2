'use strict';

/*
 * Personnel Insight
 * Bổ sung:
 * - Nơi ở hiện nay theo xã/phường.
 * - Tổng hợp quân hàm / cấp bậc.
 * - Bảng XII. NƠI Ở HIỆN NAY.
 * - Xuất CSV có nơi ở hiện nay.
 */


/* =========================================================
   1. BỔ SUNG TRƯỜNG NƠI Ở VÀO HỒ SƠ
========================================================= */

const _baseCleanPerson = cleanPerson;

cleanPerson = function (p) {
  const cleaned = _baseCleanPerson(p);

  if (!cleaned) {
    return null;
  }

  cleaned.residence = safeText(
      p?.residence,
      70
  ).replace(/\s+/g, ' ');

  return cleaned;
};


/* =========================================================
   2. ĐIỀN NƠI Ở KHI MỞ FORM SỬA HỒ SƠ
========================================================= */

const _baseOpenForm = openForm;

openForm = function (id = null) {
  _baseOpenForm(id);

  const form = byId('personForm');

  if (!form || !form.elements.residence) {
    return;
  }

  const person = id
      ? people.find(p => p.id === id)
      : null;

  form.elements.residence.value =
      person?.residence || '';
};


/* =========================================================
   3. TỔNG HỢP NƠI Ở
========================================================= */

function residenceRows() {
  const map = new Map();

  people.forEach(person => {
    const residence =
        String(person.residence || '').trim()
        || 'Chưa cập nhật';

    map.set(
        residence,
        (map.get(residence) || 0) + 1
    );
  });

  return [...map.entries()].sort(
      (a, b) => {
        if (a[0] === 'Chưa cập nhật') {
          return 1;
        }

        if (b[0] === 'Chưa cập nhật') {
          return -1;
        }

        return a[0].localeCompare(
            b[0],
            'vi'
        );
      }
  );
}


/* =========================================================
   4. TỔNG HỢP QUÂN HÀM / CẤP BẬC
========================================================= */

function rankRowsForReport() {
  const map = new Map();

  people.forEach(person => {
    const rank =
        String(person.rank || '').trim()
        || 'Chưa cập nhật';

    map.set(
        rank,
        (map.get(rank) || 0) + 1
    );
  });

  return [...map.entries()].sort(
      (a, b) =>
          b[1] - a[1]
          || a[0].localeCompare(b[0], 'vi')
  );
}


/* =========================================================
   5. BẢNG TỔNG HỢP 4 CỘT
========================================================= */

function pairedSummaryTable(
    title,
    rows,
    label
) {
  const data =
      rows.length > 0
          ? rows
          : [['Chưa có dữ liệu', 0]];

  let body = '';

  for (
      let i = 0;
      i < data.length;
      i += 2
  ) {
    const left = data[i];
    const right = data[i + 1];

    body += `
      <tr>

        <td>
          ${esc(left[0])}
        </td>

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

      <h2>
        ${esc(title)}
      </h2>

      <p class="panel-sub">
        Tự động tổng hợp từ hồ sơ nhân sự đã nhập.
      </p>

      <div class="table-scroll">

        <table class="data-table paired-summary-table">

          <thead>

            <tr>

              <th>
                ${esc(label)}
              </th>

              <th>
                Q.số
              </th>

              <th>
                ${esc(label)}
              </th>

              <th>
                Q.số
              </th>

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
   6. BỔ SUNG NƠI Ở VÀO DANH SÁCH HỒ SƠ
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
              ${esc(person.rank || 'Chưa cập nhật')}
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
          ${esc(person.education || '—')}
        </span>
      </td>

      <td>
        ${esc(person.marital || '—')}
      </td>

      <td>
        ${esc(person.position || '—')}
      </td>

      <td>
        ${esc(person.residence || '—')}
      </td>

      <td>
        <strong>
          ${vnMoney(revenue(person))}
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
  const colspan =
      actions ? 9 : 8;

  return `
    <div class="table-scroll">

      <table class="data-table">

        <thead>

          <tr>

            <th>
              Mã
            </th>

            <th>
              Họ tên / quân hàm
            </th>

            <th>
              Tuổi
            </th>

            <th>
              Văn hóa
            </th>

            <th>
              Hôn nhân
            </th>

            <th>
              Chức vụ
            </th>

            <th>
              Nơi ở hiện nay
            </th>

            <th>
              Thu nhập/tháng
            </th>

            ${
      actions
          ? '<th>Thao tác</th>'
          : ''
  }

          </tr>

        </thead>

        <tbody>

          ${
      list.length > 0
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
                    colspan="${colspan}"
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
   7. THỐNG KÊ CHUYÊN SÂU
========================================================= */

const _baseRenderStatistics =
    renderStatistics;

renderStatistics = function () {
  _baseRenderStatistics();

  const main = byId('main');

  if (!main) {
    return;
  }

  main.insertAdjacentHTML(
      'beforeend',
      `
      <div class="grid-two residence-rank-extra">

        ${
          metricPanel(
              'Nơi ở hiện nay theo xã/phường',
              'Tổng hợp tự động từ trường Nơi ở hiện nay',
              residenceRows(),
              'gold'
          )
      }

        ${
          metricPanel(
              'Tổng hợp quân hàm / cấp bậc',
              'Đếm theo quân hàm được nhập trong từng hồ sơ',
              rankRowsForReport(),
              'blue'
          )
      }

      </div>
    `
  );
};


/* =========================================================
   8. TỔNG HỢP THEO MẪU BÁO CÁO
========================================================= */

renderTemplateReport = function () {
  const count =
      people.length;


  /* -------------------------
     Độ tuổi 40 - 45
  ------------------------- */

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


  /* -------------------------
     Học vấn 12/12
  ------------------------- */

  const education12 =
      people.filter(
          person =>
              person.education === '12/12'
      ).length;


  /* -------------------------
     Đảng viên
  ------------------------- */

  const partyMembers =
      people.filter(
          person =>
              person.organization === 'Đảng viên'
      ).length;


  /* -------------------------
     Đã kết hôn
  ------------------------- */

  const married =
      people.filter(
          person =>
              person.marital === 'Đã kết hôn'
      ).length;


  /* -------------------------
     Các nhóm thống kê
  ------------------------- */

  const categories =
      dynamicRows(
          person => person.category
      );


  const religions =
      dynamicRows(
          person => person.religion
      );


  const ethnicities =
      dynamicRows(
          person => person.ethnicity
      );


  const educations =
      dynamicRows(
          person => person.education
      );


  const organizations =
      dynamicRows(
          person => person.organization
      );


  const maritalRows =
      dynamicRows(
          person => person.marital
      );


  const familyRows =
      dynamicRows(
          person => person.family
      );


  const positionRows =
      dynamicRows(
          person => person.position
      );


  /* =====================================================
     PHÂN NHÓM TUỔI
  ===================================================== */

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


  const ageRows =
      ageLabels.map(
          (label, index) => {

            const min =
                ageBands[index][0];

            const max =
                ageBands[index][1];

            const amount =
                people.filter(
                    person => {
                      const age =
                          dateAge(person.dob);

                      return (
                          age !== null
                          && age >= min
                          && age <= max
                      );
                    }
                ).length;

            return [
              label,
              amount
            ];
          }
      );


  /* =====================================================
     SỐ NGƯỜI ĐÃ NHẬP QUÂN HÀM
  ===================================================== */

  const rankCompleted =
      rankRowsForReport()
          .filter(
              ([key]) =>
                  key !== 'Chưa cập nhật'
          )
          .reduce(
              (
                  total,
                  [, amount]
              ) =>
                  total + amount,
              0
          );


  /* =====================================================
     SỐ NGƯỜI ĐÃ NHẬP NƠI Ở
  ===================================================== */

  const residenceCompleted =
      residenceRows()
          .filter(
              ([key]) =>
                  key !== 'Chưa cập nhật'
          )
          .reduce(
              (
                  total,
                  [, amount]
              ) =>
                  total + amount,
              0
          );


  /* =====================================================
     HIỂN THỊ BÁO CÁO
  ===================================================== */

  byId('main').innerHTML =

      hero(
          'Tổng hợp theo mẫu báo cáo',

          'Tự động tổng hợp quân số, quân hàm và nơi ở hiện nay từ hồ sơ đã nhập.',

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


      /* ===================================================
         THẺ TỔNG QUAN
      =================================================== */

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

    `


      /* ===================================================
         CHƯA CÓ HỒ SƠ
      =================================================== */

      + (
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
      )


      /* ===================================================
         CÁC MỤC TỔNG HỢP
      =================================================== */

      + `

      <div class="grid-two">


        ${
          dynamicSourceSection(
              'I. Thành phần quân số',
              categories
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
              ethnicities
          )
      }


        ${
          dynamicSourceSection(
              'IV. Tôn giáo',
              religions
          )
      }


        ${
          dynamicSourceSection(
              'V. Học vấn',
              educations
          )
      }


        ${
          dynamicSourceSection(
              'VI. Đảng, Đoàn',
              organizations
          )
      }


        ${
          dynamicSourceSection(
              'VII. Độ tuổi',
              ageRows
          )
      }


        ${
          dynamicSourceSection(
              'VIII. Hôn nhân',
              maritalRows
          )
      }


        ${
          dynamicSourceSection(
              'IX. Hoàn cảnh gia đình (phân loại chung)',
              familyRows
          )
      }


        ${
          dynamicSourceSection(
              'X. Chức vụ',
              positionRows
          )
      }


      </div>

    `


      /* ===================================================
         XII. NƠI Ở HIỆN NAY
      =================================================== */

      + pairedSummaryTable(
          'XII. NƠI Ở HIỆN NAY',
          residenceRows(),
          'Xã / phường'
      )


      /* ===================================================
         BẢNG TÓM TẮT
      =================================================== */

      + `

      <section class="panel">

        <h2>
          Bảng tóm tắt có thể in
        </h2>


        <div class="report-grid">


          <div>

            <b>
              ${fmt(count)} người
            </b>

            <small>
              Tổng số hồ sơ
            </small>

          </div>


          <div>

            <b>
              ${fmt(rankCompleted)} người
            </b>

            <small>
              Đã nhập quân hàm
            </small>

          </div>


          <div>

            <b>
              ${fmt(residenceCompleted)} người
            </b>

            <small>
              Đã nhập nơi ở
            </small>

          </div>


          <div>

            <b>
              ${fmt(married)} người
            </b>

            <small>
              Đã kết hôn
            </small>

          </div>


          <div>

            <b>
              ${fmt(sum(people, 'children'))}
            </b>

            <small>
              Tổng số con khai báo
            </small>

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

            <small>
              Tổng thu nhập tháng
            </small>

          </div>


        </div>


        <p class="footer-note">

          Ngày tạo:
          ${new Date().toLocaleDateString('vi-VN')}.

          Toàn bộ số liệu được tính trực tiếp
          từ hồ sơ trong database.

        </p>


      </section>

    `;
};


/* =========================================================
   9. XUẤT CSV CÓ NƠI Ở HIỆN NAY
========================================================= */

exportCsv = function () {
  const columns = [
    [
      'code',
      'Mã nhân sự'
    ],

    [
      'name',
      'Họ và tên'
    ],

    [
      'dob',
      'Ngày sinh'
    ],

    [
      'gender',
      'Giới tính'
    ],

    [
      'group',
      'Nhóm'
    ],

    [
      'rank',
      'Quân hàm / cấp bậc'
    ],

    [
      'position',
      'Chức vụ'
    ],

    [
      'residence',
      'Nơi ở hiện nay'
    ],

    [
      'education',
      'Trình độ văn hóa'
    ],

    [
      'qualification',
      'Trình độ chuyên môn'
    ],

    [
      'marital',
      'Hôn nhân'
    ],

    [
      'category',
      'Đối tượng'
    ],

    [
      'ethnicity',
      'Dân tộc'
    ],

    [
      'religion',
      'Tôn giáo'
    ],

    [
      'organization',
      'Đảng / Đoàn'
    ],

    [
      'family',
      'Hoàn cảnh gia đình (khái quát)'
    ],

    [
      'children',
      'Số con'
    ],

    [
      'years',
      'Thâm niên'
    ],

    [
      'salary',
      'Lương tháng'
    ],

    [
      'allowance',
      'Phụ cấp'
    ],

    [
      'note',
      'Ghi chú'
    ]
  ];


  /* Chống công thức Excel nguy hiểm */

  const csvCell = value => {
    let text =
        String(
            value ?? ''
        );

    text =
        text.replaceAll(
            '"',
            '""'
        );

    if (
        /^\s*[=+@\-\u2212]/.test(text)
    ) {
      text =
          "'" + text;
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
                          csvCell(
                              person[key]
                          )
                  )
                  .join(',')
      );


  const csv =
      [
        header,
        ...dataRows
      ].join('\r\n');


  download(
      'personnel-insight-data.csv',
      csv,
      'text/csv;charset=utf-8'
  );


  notify(
      'Đã xuất CSV có nơi ở hiện nay.'
  );
};