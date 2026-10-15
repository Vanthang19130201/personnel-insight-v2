package com.personnel.insight;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api")
public class PersonnelController {

    private final JdbcTemplate db;
    private final ObjectMapper mapper;

    /*
     * Các trường được phép lưu trong hồ sơ.
     * residence = Nơi ở hiện nay (xã/phường)
     */
    private static final Set<String> FIELDS = Set.of(
            "id",
            "code",
            "name",
            "dob",
            "gender",
            "group",
            "rank",
            "position",
            "education",
            "qualification",
            "marital",
            "category",
            "ethnicity",
            "religion",
            "organization",
            "family",
            "residence",
            "children",
            "years",
            "salary",
            "allowance",
            "note"
    );

    public PersonnelController(JdbcTemplate db, ObjectMapper mapper) {
        this.db = db;
        this.mapper = mapper;
    }

    /*
     * CSRF
     */
    @GetMapping("/csrf")
    public Map<String, String> csrf(
            org.springframework.security.web.csrf.CsrfToken token
    ) {
        return Map.of(
                "token", token.getToken(),
                "headerName", token.getHeaderName()
        );
    }

    /*
     * Thông tin người đăng nhập
     */
    @GetMapping("/me")
    public Map<String, Object> me(
            org.springframework.security.core.Authentication auth
    ) {
        return Map.of(
                "username", auth.getName(),
                "role", "ADMIN"
        );
    }

    /*
     * Lấy toàn bộ hồ sơ
     */
    @GetMapping("/people")
    public List<Map<String, Object>> all() {

        return db.query(
                "SELECT payload FROM personnel_records ORDER BY name, code",
                (rs, row) -> parse(rs.getString(1))
        );
    }

    /*
     * Thêm hồ sơ
     */
    @PostMapping("/people")
    @Transactional
    public Map<String, Object> add(
            @RequestBody Map<String, Object> item
    ) {

        Map<String, Object> p = validate(item);

        try {

            db.update(
                    """
                    INSERT INTO personnel_records(
                        id,
                        code,
                        name,
                        dob,
                        payload
                    )
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    p.get("id"),
                    p.get("code"),
                    p.get("name"),
                    p.get("dob"),
                    stringify(p)
            );

        } catch (DuplicateKeyException e) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Mã nhân sự đã tồn tại"
            );
        }

        return p;
    }

    /*
     * Cập nhật hồ sơ
     */
    @PutMapping("/people/{id}")
    @Transactional
    public Map<String, Object> update(
            @PathVariable String id,
            @RequestBody Map<String, Object> item
    ) {

        Map<String, Object> p = validate(item);

        if (!id.equals(p.get("id"))) {
            throw bad("Không được thay đổi ID nội bộ");
        }

        try {

            int n = db.update(
                    """
                    UPDATE personnel_records
                    SET code = ?,
                        name = ?,
                        dob = ?,
                        payload = ?
                    WHERE id = ?
                    """,
                    p.get("code"),
                    p.get("name"),
                    p.get("dob"),
                    stringify(p),
                    id
            );

            if (n == 0) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hồ sơ"
                );
            }

        } catch (DuplicateKeyException e) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Mã nhân sự đã tồn tại"
            );
        }

        return p;
    }

    /*
     * Xóa một hồ sơ
     */
    @DeleteMapping("/people/{id}")
    @Transactional
    public Map<String, Object> delete(
            @PathVariable String id
    ) {

        int n = db.update(
                "DELETE FROM personnel_records WHERE id = ?",
                id
        );

        if (n == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND
            );
        }

        return Map.of(
                "success", true
        );
    }

    /*
     * Nhập hàng loạt từ JSON
     */
    @PutMapping("/people/bulk")
    @Transactional
    public Map<String, Object> bulk(
            @RequestBody List<Map<String, Object>> records
    ) {

        if (records.size() > 500) {
            throw bad("Tối đa 500 hồ sơ mỗi lần nhập");
        }

        List<Map<String, Object>> validated = new ArrayList<>();

        Set<String> codes = new HashSet<>();
        Set<String> ids = new HashSet<>();

        for (Map<String, Object> input : records) {

            Map<String, Object> p = validate(input);

            String code = ((String) p.get("code"))
                    .toLowerCase(Locale.ROOT);

            if (!codes.add(code)
                    || !ids.add((String) p.get("id"))) {

                throw bad(
                        "Mã nhân sự hoặc ID bị trùng"
                );
            }

            validated.add(p);
        }

        /*
         * Giữ nguyên cơ chế hiện tại:
         * nhập JSON hàng loạt sẽ thay thế toàn bộ dữ liệu.
         */
        db.update(
                "DELETE FROM personnel_records"
        );

        for (Map<String, Object> p : validated) {

            db.update(
                    """
                    INSERT INTO personnel_records(
                        id,
                        code,
                        name,
                        dob,
                        payload
                    )
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    p.get("id"),
                    p.get("code"),
                    p.get("name"),
                    p.get("dob"),
                    stringify(p)
            );
        }

        return Map.of(
                "success", true,
                "count", validated.size()
        );
    }

    /*
     * Kiểm tra và chuẩn hóa dữ liệu hồ sơ
     */
    private Map<String, Object> validate(
            Map<String, Object> obj
    ) {

        Map<String, Object> p =
                new LinkedHashMap<>();

        /*
         * Chỉ lấy các field nằm trong danh sách FIELDS.
         */
        for (String key : FIELDS) {

            Object val = obj.get(key);

            if (val instanceof Map
                    || val instanceof List) {

                throw bad(
                        "Sai định dạng trường " + key
                );
            }

            p.put(
                    key,
                    val == null ? "" : val
            );
        }

        /*
         * Các trường bắt buộc
         */
        for (String key : List.of(
                "id",
                "code",
                "name",
                "dob"
        )) {

            if (!(p.get(key) instanceof String s)
                    || s.isBlank()) {

                throw bad(
                        "Thiếu " + key
                );
            }
        }

        /*
         * Chuẩn hóa các trường văn bản.
         */
        for (String key : List.of(
                "id",
                "code",
                "name",
                "dob",
                "gender",
                "group",
                "rank",
                "position",
                "education",
                "qualification",
                "marital",
                "category",
                "ethnicity",
                "religion",
                "organization",
                "family",
                "residence",
                "note"
        )) {

            String val =
                    String.valueOf(
                            p.get(key)
                    ).trim();

            int max;

            if (key.equals("note")) {

                max = 300;

            } else if (
                    key.equals("name")
                            || key.equals("position")
                            || key.equals("id")
            ) {

                max = 100;

            } else if (
                    key.equals("code")
            ) {

                max = 30;

            } else {

                max = 70;
            }

            if (val.length() > max) {

                throw bad(
                        "Giá trị quá dài: " + key
                );
            }

            p.put(
                    key,
                    val
            );
        }

        /*
         * Kiểm tra ngày sinh
         */
        try {

            LocalDate date =
                    LocalDate.parse(
                            (String) p.get("dob")
                    );

            if (
                    date.isAfter(LocalDate.now())
                            || date.isBefore(
                            LocalDate.now()
                                    .minusYears(110)
                    )
            ) {

                throw bad(
                        "Ngày sinh không hợp lệ"
                );
            }

        } catch (
                java.time.format.DateTimeParseException e
        ) {

            throw bad(
                    "Ngày sinh không hợp lệ"
            );
        }

        /*
         * Kiểm tra các trường số
         */
        for (String key : List.of(
                "children",
                "years",
                "salary",
                "allowance"
        )) {

            try {

                long v = Long.parseLong(
                        p.get(key).toString()
                );

                long max;

                if (key.equals("children")) {

                    max = 20;

                } else if (
                        key.equals("years")
                ) {

                    max = 65;

                } else {

                    max = 1_000_000_000L;
                }

                if (v < 0 || v > max) {

                    throw bad(
                            "Giá trị không hợp lệ: "
                                    + key
                    );
                }

                p.put(
                        key,
                        v
                );

            } catch (
                    NumberFormatException e
            ) {

                throw bad(
                        "Giá trị phải là số nguyên: "
                                + key
                );
            }
        }

        return p;
    }

    /*
     * Đọc payload JSON từ database
     */
    private Map<String, Object> parse(
            String json
    ) {

        try {

            return mapper.readValue(
                    json,
                    new TypeReference<
                            Map<String, Object>
                            >() {
                    }
            );

        } catch (
                JsonProcessingException e
        ) {

            throw new IllegalStateException(
                    "Dữ liệu lưu trữ không đọc được",
                    e
            );
        }
    }

    /*
     * Chuyển hồ sơ thành JSON trước khi lưu DB
     */
    private String stringify(
            Object obj
    ) {

        try {

            return mapper.writeValueAsString(
                    obj
            );

        } catch (
                JsonProcessingException e
        ) {

            throw bad(
                    "Dữ liệu không hợp lệ"
            );
        }
    }

    /*
     * Trả lỗi HTTP 400
     */
    private ResponseStatusException bad(
            String reason
    ) {

        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                reason
        );
    }
}