-- 비밀번호 찾기·이메일 인증 코드(명세 4-5, 5-4).
-- 코드 원본은 저장하지 않는다. BCrypt 해시(60자)만 둔다.
create table email_codes (
    attempts integer not null,
    created_at timestamp(6) with time zone not null,
    expires_at timestamp(6) with time zone not null,
    id uuid not null,
    user_id uuid not null,
    purpose varchar(20) not null check (purpose in ('RESET_PASSWORD','VERIFY_EMAIL')),
    code_hash varchar(60) not null,
    primary key (id)
);

create index idx_email_code_user
    on email_codes (user_id);

-- 기존 계정은 인증 안 된 상태로 시작한다. 코드를 받아 맞히면 true가 된다.
alter table users add column email_verified boolean not null default false;
