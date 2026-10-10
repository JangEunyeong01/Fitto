-- 약관 동의 이력. users.terms_version은 마지막 동의만 남아서 "누가 언제 어느 버전에 동의했는지"를 여기에 쌓는다.
-- 약관이 바뀌어 다시 동의를 받으면 한 줄이 더 생긴다. 탈퇴하면 지우고, 데이터 초기화로는 지우지 않는다.
create table user_agreements (
    id uuid not null,
    user_id uuid not null,
    version varchar(20) not null,
    agreed_at timestamp(6) with time zone not null,
    primary key (id)
);

create index idx_user_agreements_user on user_agreements (user_id);

-- 이미 동의한 계정은 지금 기록을 첫 이력으로 옮긴다.
insert into user_agreements (id, user_id, version, agreed_at)
select gen_random_uuid(), id, terms_version, terms_agreed_at
from users
where terms_version is not null and terms_agreed_at is not null;
