-- 가입할 때 받은 약관 동의 기록. 건강 정보는 민감정보라 따로 동의받고, 언제 어느 버전에 동의했는지 남긴다.
-- 시각은 서버가 찍는다(앱 시계는 믿을 수 없다). 이 열이 생기기 전에 가입한 계정은 비어 있다.
alter table users add column terms_agreed_at timestamp(6) with time zone;
alter table users add column privacy_agreed_at timestamp(6) with time zone;
alter table users add column health_agreed_at timestamp(6) with time zone;
alter table users add column terms_version varchar(20);
