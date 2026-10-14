# Personnel Insight V2 — Demo

Một dự án Spring Boot dùng **form đăng nhập render từ server**, không cần JavaScript để lấy CSRF token trước khi đăng nhập. Dùng dữ liệu giả lập cho mọi môi trường công khai.

## Điểm khác V1
- `/login` được render bằng Thymeleaf: CSRF token trong form do Spring Security tạo cùng phiên `JSESSIONID`.
- `POST /login` để trình duyệt gửi theo cơ chế form HTML thông thường; Spring Security tự chuyển hướng về `/`.
- `POST /logout` dùng CSRF token từ `/api/csrf` theo cùng phiên.
- Các trang thống kê cũ giữ nguyên; dữ liệu lấy từ `/api/people`.
- Spring Boot + JDBC + H2 để chạy thử local; chọn profile `mysql` cho Railway.

## Chạy local
Yêu cầu JDK 21 (hoặc 17), Maven; tạo biến `APP_ADMIN_PASSWORD` tối thiểu 12 ký tự, `APP_ADMIN_USER` (mặc định admin). Chạy `PersonnelInsightApplication` rồi vào `http://127.0.0.1:8080/login`.

## Triển khai Railway (chỉ dữ liệu giả)
1. Đẩy dự án lên một repository mới **Private**.
2. Tạo một service Spring Boot từ GitHub và một service MySQL.
3. Trong service ứng dụng, thêm `SPRING_PROFILES_ACTIVE=mysql`, `APP_ADMIN_USER`, `APP_ADMIN_PASSWORD`, `SERVER_ADDRESS=0.0.0.0`, `DB_USER=${{MySQL.MYSQLUSER}}`, `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`, `DB_URL=jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}?useUnicode=true&characterEncoding=UTF-8&connectionTimeZone=UTC`.
4. Deploy rồi truy cập `/login`, kiểm tra `GET /login -> 200`, `POST /login -> 302`, `GET / -> 200`.
5. Bật sao lưu MySQL và giám sát chi phí. Không đưa hồ sơ quân nhân thật lên hosting công khai chưa được phép.

## Hạn chế để xử lý trước khi chạy thực tế
- Hiện chỉ có một tài khoản admin, không có đa tài khoản, MFA hay phân quyền chi tiết.
- API bulk import đang có khả năng thay thế toàn bộ hồ sơ; cần kiểm toán/quy trình duyệt.
- Dữ liệu cá nhân nhạy cảm phải được phân loại trước khi triển khai, có phê duyệt hạ tầng.
- Cần kiểm thử tích hợp trực tiếp, kiểm thử đăng nhập/đăng xuất và sao lưu-khôi phục.
