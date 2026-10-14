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
 private static final Set<String> FIELDS = Set.of("id","code","name","dob","gender","group","rank","position","education","qualification","marital","category","ethnicity","religion","organization","family","children","years","salary","allowance","note");
 public PersonnelController(JdbcTemplate db,ObjectMapper mapper){this.db=db;this.mapper=mapper;}

 @GetMapping("/csrf") public Map<String,String> csrf(org.springframework.security.web.csrf.CsrfToken token){return Map.of("token",token.getToken(),"headerName",token.getHeaderName());}
 @GetMapping("/me") public Map<String,Object> me(org.springframework.security.core.Authentication auth){return Map.of("username",auth.getName(),"role","ADMIN");}
 @GetMapping("/people") public List<Map<String,Object>> all(){return db.query("SELECT payload FROM personnel_records ORDER BY name,code",(rs,row)->parse(rs.getString(1)));}
 @PostMapping("/people") @Transactional public Map<String,Object> add(@RequestBody Map<String,Object> item){Map<String,Object> p=validate(item);try{db.update("INSERT INTO personnel_records(id,code,name,dob,payload) VALUES(?,?,?,?,?)",p.get("id"),p.get("code"),p.get("name"),p.get("dob"),stringify(p));}catch(DuplicateKeyException e){throw new ResponseStatusException(HttpStatus.CONFLICT,"Mã nhân sự đã tồn tại");}return p;}
 @PutMapping("/people/{id}") @Transactional public Map<String,Object> update(@PathVariable String id,@RequestBody Map<String,Object> item){Map<String,Object> p=validate(item);if(!id.equals(p.get("id")))throw bad("Không được thay đổi ID nội bộ");try{int n=db.update("UPDATE personnel_records SET code=?,name=?,dob=?,payload=? WHERE id=?",p.get("code"),p.get("name"),p.get("dob"),stringify(p),id);if(n==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy hồ sơ");}catch(DuplicateKeyException e){throw new ResponseStatusException(HttpStatus.CONFLICT,"Mã nhân sự đã tồn tại");}return p;}
 @DeleteMapping("/people/{id}") @Transactional public Map<String,Object> delete(@PathVariable String id){int n=db.update("DELETE FROM personnel_records WHERE id=?",id);if(n==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND);return Map.of("success",true);}
 @PutMapping("/people/bulk") @Transactional public Map<String,Object> bulk(@RequestBody List<Map<String,Object>> records){if(records.size()>500)throw bad("Tối đa 500 hồ sơ mỗi lần nhập");List<Map<String,Object>> validated=new ArrayList<>();Set<String> codes=new HashSet<>(),ids=new HashSet<>();for(var input:records){var p=validate(input);String code=((String)p.get("code")).toLowerCase(Locale.ROOT);if(!codes.add(code)||!ids.add((String)p.get("id")))throw bad("Mã nhân sự hoặc ID bị trùng");validated.add(p);}db.update("DELETE FROM personnel_records");for(var p:validated)db.update("INSERT INTO personnel_records(id,code,name,dob,payload) VALUES(?,?,?,?,?)",p.get("id"),p.get("code"),p.get("name"),p.get("dob"),stringify(p));return Map.of("success",true,"count",validated.size());}
 private Map<String,Object> validate(Map<String,Object> obj){
   Map<String,Object> p=new LinkedHashMap<>();for(var k:FIELDS){Object val=obj.get(k);if(val instanceof Map || val instanceof List)throw bad("Sai định dạng trường "+k);p.put(k,val==null?"":val);}
   for(String key:List.of("id","code","name","dob")){if(!(p.get(key) instanceof String s)||s.isBlank())throw bad("Thiếu "+key);}
   for(String key:List.of("id","code","name","dob","gender","group","rank","position","education","qualification","marital","category","ethnicity","religion","organization","family","note")){String val=String.valueOf(p.get(key)).trim();int max= key.equals("note")?300:key.equals("name")||key.equals("position")||key.equals("id")?100:key.equals("code")?30:70;if(val.length()>max)throw bad("Giá trị quá dài: "+key);p.put(key,val);}
   try{LocalDate date=LocalDate.parse((String)p.get("dob"));if(date.isAfter(LocalDate.now()) || date.isBefore(LocalDate.now().minusYears(110)))throw bad("Ngày sinh không hợp lệ");}catch(java.time.format.DateTimeParseException e){throw bad("Ngày sinh không hợp lệ");}
   for(String key:List.of("children","years","salary","allowance")){try{long v=Long.parseLong(p.get(key).toString());long max=key.equals("children")?20:key.equals("years")?65:1000000000L;if(v<0||v>max)throw bad("Giá trị không hợp lệ: "+key);p.put(key,v);}catch(NumberFormatException e){throw bad("Giá trị phải là số nguyên: "+key);}}
   return p;
 }
 private Map<String,Object> parse(String json){try{return mapper.readValue(json,new TypeReference<Map<String,Object>>(){});}catch(JsonProcessingException e){throw new IllegalStateException("Dữ liệu lưu trữ không đọc được",e);}}
 private String stringify(Object obj){try{return mapper.writeValueAsString(obj);}catch(JsonProcessingException e){throw bad("Dữ liệu không hợp lệ");}}
 private ResponseStatusException bad(String reason){return new ResponseStatusException(HttpStatus.BAD_REQUEST,reason);}
}
