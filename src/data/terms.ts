/**
 * 가입 때 동의받는 약관 셋(시안 35·39).
 * 본문은 출시 전에 실제 문안으로 바꾼다. 문안을 고치면 TERMS_VERSION도 새 시행일로 올린다 —
 * 서버는 누가 어느 버전에 동의했는지 이 값으로 남긴다.
 */
export const TERMS_VERSION = '2026-10-01';

export type TermsId = 'terms' | 'privacy' | 'health';

export interface TermsDoc {
  id: TermsId;
  title: string;
  effective: string;
  sections: { heading: string; body: string }[];
}

export const TERMS: TermsDoc[] = [
  {
    id: 'terms',
    title: '이용약관',
    effective: '2026년 10월 1일',
    sections: [
      { heading: '제1조 목적', body: "이 약관은 피또(이하 '서비스')를 이용할 때 필요한 기본적인 약속을 정해요." },
      {
        heading: '제2조 서비스 내용',
        body: '식단·물·걸음·운동·체중·생리 주기 기록과 목표 칼로리 안내를 제공해요. 서비스의 안내는 참고용이며 의료적 진단을 대신하지 않아요.',
      },
      {
        heading: '제3조 계정',
        body: '계정 없이도 모든 기능을 쓸 수 있어요. 계정을 만들면 기록을 백업하고 다른 기기에서 이어서 볼 수 있어요.',
      },
      {
        heading: '제4조 기록의 보관',
        body: '게스트로 쓰는 동안 기록은 이 기기에만 저장돼요. 앱을 지우면 기록도 함께 지워져요.',
      },
      {
        heading: '제5조 탈퇴',
        body: '설정의 계정 화면에서 언제든 탈퇴할 수 있어요. 탈퇴하면 계정과 기록이 모두 지워지고 되돌릴 수 없어요.',
      },
    ],
  },
  {
    id: 'privacy',
    title: '개인정보 수집·이용',
    effective: '2026년 10월 1일',
    sections: [
      { heading: '수집하는 항목', body: '이메일, 비밀번호(암호화해서 저장), 닉네임, 성별, 생년월일이에요.' },
      { heading: '쓰는 곳', body: '계정 확인, 로그인 유지, 비밀번호 찾기, 기록 백업에만 써요.' },
      { heading: '보관 기간', body: '탈퇴할 때까지 보관하고, 탈퇴하면 바로 지워요.' },
    ],
  },
  {
    id: 'health',
    title: '건강 정보 처리',
    effective: '2026년 10월 1일',
    sections: [
      {
        heading: '처리하는 항목',
        body: '키, 몸무게, 목표 체중, 질환, 알레르기, 식단·운동·물·걸음 기록, 생리 주기예요.',
      },
      {
        heading: '쓰는 곳',
        body: '목표 칼로리 계산과 기록 보관에만 써요. 광고나 다른 곳에 넘기지 않아요.',
      },
      { heading: '보관 기간', body: '탈퇴할 때까지 보관하고, 탈퇴하면 바로 지워요.' },
      {
        heading: '동의하지 않을 권리',
        body: '동의하지 않아도 계정 없이 앱의 모든 기능을 쓸 수 있어요. 다만 계정은 만들 수 없어요.',
      },
    ],
  },
];

export const findTerms = (id: TermsId) => TERMS.find((t) => t.id === id)!;
