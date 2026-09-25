-- 생일(월·일)에 태어난 연도를 더한다. 나이를 따로 받던 걸 생년월일에서 계산하려고.
-- 이미 가입한 사람은 연도가 비어 있고, 앱이 처음 한 번 채우게 안내한다.
alter table users add column birth_year integer;
