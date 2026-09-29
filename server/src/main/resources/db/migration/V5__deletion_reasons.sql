-- 탈퇴 사유. 누가 떠났는지는 남기지 않는다 — user_id도 이메일도 없이 사유와 날짜만.
-- reason은 다른 enum 칸처럼 이름(TEDIOUS)으로 저장한다. API에서는 소문자 코드(tedious)로 주고받는다.
-- 탈퇴하면 개인정보는 지워야 하는데, 사람을 가리키는 값이 없으면 이 줄은 개인정보가 아니라서 남겨도 된다.
create table deletion_reasons (
    id uuid not null,
    reason varchar(30) not null,
    created_at timestamp(6) with time zone not null,
    primary key (id)
);
