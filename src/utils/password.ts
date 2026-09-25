/**
 * 새 비밀번호 규칙. 서버(가입·변경·재설정)와 같아야 한다 — 8~64자, 영문과 숫자 포함.
 * 비밀번호 변경과 찾기 두 화면이 같이 쓴다. 한쪽만 고치면 한쪽으로는 더 약한 비밀번호가 들어간다.
 */
export function passwordError(value: string): string | null {
  if (value.length < 8) return '8자 이상으로 입력해 주세요';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return '영문과 숫자를 모두 포함해 주세요';
  return null;
}
