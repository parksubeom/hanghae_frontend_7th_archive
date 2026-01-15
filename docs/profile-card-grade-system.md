# 프로필 카드 및 등급 시스템 문서

## 📋 개요

이 문서는 항해플러스 프론트엔드 7기 프로젝트의 프로필 카드와 등급 시스템 구현에 대한 상세한 설명을 제공합니다.

## 🎯 목표

- 사용자 프로필을 시각적으로 아름답게 표현
- 등급 시스템을 통한 학습 동기부여
- 인터랙티브한 3D 플립 카드 효과로 사용자 경험 향상

## 🏆 등급 시스템

### 등급 결정 기준

등급은 **과제 완료율**과 **베스트 프랙티스(BP) 개수**를 기반으로 결정됩니다.

```typescript
// packages/crawler/src/utils/ranking.utils.ts

export function determineGrade(
  user: UserWIthCommonAssignments,
  totalAssignments: number,
): Grade {
  const completedAssignments = user.assignments.filter(
    (assignment) => assignment.passed,
  ).length;
  const bestPracticeCount = user.assignments.filter(
    (assignment) => assignment.theBest,
  ).length;
  const completionRate = (completedAssignments / totalAssignments) * 100;

  // 완료율 100% + BP 2개 이상 → 블랙
  if (completionRate >= 100 && bestPracticeCount >= 2) {
    return '블랙';
  }
  // 완료율 90% 이상 + BP 1개 이상 → 레드
  if (completionRate >= 90 && bestPracticeCount >= 1) {
    return '레드';
  }
  // 완료율 80% 이상 → 브라운
  if (completionRate >= 80) {
    return '브라운';
  }
  // 완료율 55% 이상 → 퍼플
  if (completionRate >= 55) {
    return '퍼플';
  }
  // 완료율 35% 이상 → 블루
  if (completionRate >= 35) {
    return '블루';
  }
  // 그 외 → 화이트
  return '화이트';
}
```

### 등급별 특징

| 등급 | 완료율 | BP 개수 | 특징 설명 |
|------|--------|---------|----------|
| **블랙** | 100% | 2개 이상 | 완료율 100% + BP 2개 이상 |
| **레드** | 90% 이상 | 1개 이상 | 완료율 90% 이상 + BP 1개 이상 |
| **브라운** | 80% 이상 | - | 완료율 80% 이상 |
| **퍼플** | 55% 이상 | - | 완료율 55% 이상 |
| **블루** | 35% 이상 | - | 완료율 35% 이상 |
| **화이트** | 35% 미만 | - | 완료율 35% 미만 |

### 등급 타입 정의

```typescript
// packages/domain/src/types.ts

export type Grade = "블랙" | "레드" | "브라운" | "퍼플" | "블루" | "화이트";
```

## 🎨 프로필 카드 디자인

### 등급별 스타일링

각 등급에 따라 프로필 카드의 배경색, 텍스트 색상, 테두리, 그림자가 동적으로 변경됩니다.

```typescript
// packages/app/src/pages/user/User.tsx

const getGradeCardColors = (grade: Grade): {
  bg: string;
  text: string;
  textMuted: string;
  border: string;
  shadow: string;
} => {
  const colors: Record<Grade, {...}> = {
    "블랙": {
      bg: "bg-gradient-to-br from-gray-900/90 via-black/95 to-gray-800/90 backdrop-blur-xl",
      text: "text-white",
      textMuted: "text-gray-200",
      border: "border border-gray-700/50",
      shadow: "shadow-2xl shadow-black/50",
    },
    "레드": {
      bg: "bg-gradient-to-br from-red-600/90 via-red-700/95 to-rose-800/90 backdrop-blur-xl",
      text: "text-white",
      textMuted: "text-red-50",
      border: "border border-red-500/40",
      shadow: "shadow-2xl shadow-red-900/50",
    },
    // ... 나머지 등급들
  };
  return colors[grade] || colors["화이트"];
};
```

### 디자인 특징

1. **글래스모피즘 효과**
   - `backdrop-blur-xl`을 사용한 반투명 배경
   - 그라데이션 배경으로 깊이감 표현

2. **등급별 색상 테마**
   - 각 등급에 맞는 고유한 색상 팔레트
   - 텍스트와 배경의 대비를 고려한 색상 선택

3. **그림자 효과**
   - 등급별 색상에 맞는 그림자 적용
   - `shadow-2xl`로 입체감 강조

## 🔄 3D 플립 카드 효과

### 구현 구조

프로필 카드는 호버 시 3D 플립 효과로 뒤집혀 등급 정보를 보여줍니다.

```tsx
<div className="perspective-1000 profile-card-container">
  <div className="relative w-full min-h-[500px] group card-shimmer">
    <div className="card-flip-wrapper relative w-full min-h-[500px]">
      {/* 앞면: 프로필 정보 */}
      <div className="card-face absolute inset-0 ...">
        {/* 프로필 내용 */}
      </div>
      
      {/* 뒷면: 등급 뱃지 */}
      <div className="card-face absolute inset-0 rotate-y-180 ...">
        {/* 등급 정보 */}
      </div>
    </div>
  </div>
</div>
```

### CSS 애니메이션

```css
/* packages/app/src/assets/index.css */

.perspective-1000 {
  perspective: 1200px;
  perspective-origin: center center;
}

.card-flip-wrapper {
  transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-style: preserve-3d;
  will-change: transform;
}

.group:hover .card-flip-wrapper {
  transform: rotateY(180deg);
}

.card-face {
  backface-visibility: hidden;
  border-radius: 1rem;
}
```

### 애니메이션 특징

1. **부드러운 전환**
   - `cubic-bezier(0.34, 1.56, 0.64, 1)` easing 함수로 자연스러운 움직임
   - 0.7초의 전환 시간으로 적절한 속도 유지

2. **성능 최적화**
   - `will-change: transform`으로 브라우저 최적화 힌트 제공
   - `backface-visibility: hidden`으로 뒷면 렌더링 최적화

3. **3D 효과**
   - `transform-style: preserve-3d`로 3D 공간 유지
   - `perspective`로 원근감 표현

### 앞면 구성 요소

1. **프로필 이미지**
   - 원형 아바타 이미지
   - 호버 시 확대 효과
   - 링 형태의 테두리

2. **사용자 정보**
   - GitHub 사용자명
   - 실명
   - 바이오 (있는 경우)
   - 블로그 링크 (있는 경우)
   - 팔로워/팔로잉 수

3. **호버 힌트**
   - "호버하여 등급 보기" 안내
   - FlipHorizontal 아이콘

### 뒷면 구성 요소

1. **등급 텍스트**
   - 큰 사이즈의 등급명 (4xl)

2. **등급 뱃지**
   - SVG 뱃지 이미지
   - 그림자 효과
   - 빛 효과 오버레이

3. **등급별 특징 설명**
   - 등급에 대한 상세 설명
   - 구분선으로 시각적 분리

4. **안내 텍스트**
   - "호버하여 프로필 보기" (이탤릭체)

## 🖼️ 뱃지 이미지

### 뱃지 이미지 경로

등급별 뱃지 이미지는 외부 CDN에서 제공됩니다.

```typescript
const getGradeBadgeImage = (grade: Grade): string => {
  const badgeImages: Record<Grade, string> = {
    "블랙": `https://static.spartaclub.kr/hanghae99/plus/completion/badge_black.svg`,
    "레드": `https://static.spartaclub.kr/hanghae99/plus/completion/badge_red.svg`,
    "브라운": `https://static.spartaclub.kr/hanghae99/plus/completion/badge_brown.svg`,
    "퍼플": `https://static.spartaclub.kr/hanghae99/plus/completion/badge_purple.svg`,
    "블루": `https://static.spartaclub.kr/hanghae99/plus/completion/badge_blue.svg`,
    "화이트": `https://static.spartaclub.kr/hanghae99/plus/completion/badge_white.svg`,
  };
  return badgeImages[grade] || badgeImages["화이트"];
};
```

### 홈페이지 뱃지 표시

홈페이지의 사용자 카드에도 등급 뱃지가 표시됩니다.

```tsx
// packages/app/src/pages/home/Home.tsx

<img
  src={getGradeBadgeImage(grade)}
  alt={grade}
  className="h-5 w-auto"
  title={grade}
/>
```

## 📁 파일 구조

### 주요 파일

```
packages/
├── crawler/
│   └── src/
│       └── utils/
│           └── ranking.utils.ts      # 등급 결정 로직
├── domain/
│   └── src/
│       └── types.ts                  # Grade 타입 정의
└── app/
    └── src/
        ├── pages/
        │   ├── home/
        │   │   └── Home.tsx          # 홈페이지 (뱃지 표시)
        │   └── user/
        │       └── User.tsx          # 프로필 카드 컴포넌트
        └── assets/
            └── index.css             # 3D 플립 애니메이션 CSS
```

## 🎯 사용자 경험 개선 사항

### 1. 시각적 피드백

- 등급별 고유한 색상으로 즉각적인 인식 가능
- 글래스모피즘과 그라데이션으로 현대적인 디자인

### 2. 인터랙티브 요소

- 호버 시 3D 플립 효과로 등급 정보 확인
- 부드러운 애니메이션으로 자연스러운 전환

### 3. 정보 전달

- 앞면: 사용자 프로필 정보
- 뒷면: 등급 및 등급별 특징 설명
- 명확한 안내 텍스트로 사용자 가이드

## 🔧 기술 스택

- **React**: 컴포넌트 기반 UI
- **TypeScript**: 타입 안정성
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **CSS 3D Transforms**: 플립 애니메이션
- **Lucide React**: 아이콘

## 📝 참고 문서

- [RANKING_SYSTEM_DESIGN.md](../RANKING_SYSTEM_DESIGN.md) - 랭킹 시스템 설계 문서

## 🚀 향후 개선 방향

1. **애니메이션 성능 최적화**
   - GPU 가속 활용
   - 리플로우 최소화

2. **접근성 개선**
   - 키보드 네비게이션 지원
   - 스크린 리더 지원

3. **반응형 디자인**
   - 모바일 환경 최적화
   - 터치 제스처 지원

4. **추가 기능**
   - 등급 히스토리 표시
   - 등급별 통계 정보

