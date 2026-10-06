-- 실제로 입력한 생리 기록. 예전엔 "마지막 시작일" 하나만 있어서 지난 주기를 알 수 없었다.
-- 평균 주기·규칙성·주기 내역은 이 표에서 계산한다. end_date가 비어 있으면 아직 진행 중이다.
create table period_logs (
    id uuid not null,
    user_id uuid not null,
    start_date date not null,
    end_date date,
    primary key (id),
    constraint uk_period_logs unique (user_id, start_date)
);
