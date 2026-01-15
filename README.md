# 변경 사항 및 기능 추가 내역

## 📅 최근 업데이트

### 1. 등급 시스템 및 프로필 카드 개선

**날짜**: 2024년 12월

#### 배경
기존의 점수 기반 랭킹 시스템을 완료율과 BP(Best Practice) 개수 기반의 등급 시스템으로 변경하고, 시각적으로 더욱 아름답고 직관적인 프로필 카드를 구현했습니다.

#### 구현 내용

**1. 등급 시스템 로직 변경**
- 파일: `packages/crawler/src/utils/ranking.utils.ts`
- 기존 점수 기반 등급 결정에서 완료율과 BP 개수 기반으로 변경
- 등급별 기준:
  - **블랙**: 완료율 100% + BP 2개 이상
  - **레드**: 완료율 90% 이상 + BP 1개 이상
  - **브라운**: 완료율 80% 이상
  - **퍼플**: 완료율 55% 이상
  - **블루**: 완료율 35% 이상
  - **화이트**: 완료율 35% 미만

```typescript
export function determineGrade(
  user: UserWIthCommonAssignments,
  totalAssignments: number,
): Grade {
  const completionRate = (completedAssignments / totalAssignments) * 100;
  const bestPracticeCount = user.assignments.filter(
    (assignment) => assignment.theBest,
  ).length;

  if (completionRate >= 100 && bestPracticeCount >= 2) return '블랙';
  if (completionRate >= 90 && bestPracticeCount >= 1) return '레드';
  if (completionRate >= 80) return '브라운';
  if (completionRate >= 55) return '퍼플';
  if (completionRate >= 35) return '블루';
  return '화이트';
}
```

**2. 뱃지 이미지 시스템 구축**
- 파일: `packages/app/src/pages/home/Home.tsx`, `packages/app/src/pages/user/User.tsx`
- 등급별 SVG 뱃지 이미지 표시
- 홈페이지 사용자 카드에 뱃지 표시
- 프로필 상세 페이지에 뱃지 표시

```typescript
const getGradeBadgeImage = (grade: Grade): string => {
  const badgeImages: Record<Grade, string> = {
    블랙: `https://static.spartaclub.kr/hanghae99/plus/completion/badge_black.svg`,
    레드: `https://static.spartaclub.kr/hanghae99/plus/completion/badge_red.svg`,
    브라운: `https://static.spartaclub.kr/hanghae99/plus/completion/badge_brown.svg`,
    퍼플: `https://static.spartaclub.kr/hanghae99/plus/completion/badge_purple.svg`,
    블루: `https://static.spartaclub.kr/hanghae99/plus/completion/badge_blue.svg`,
    화이트: `https://static.spartaclub.kr/hanghae99/plus/completion/badge_white.svg`,
  };
  return badgeImages[grade] || badgeImages["화이트"];
};
```

**3. 프로필 카드 3D 플립 효과**
- 파일: `packages/app/src/pages/user/User.tsx`, `packages/app/src/assets/index.css`
- 호버 시 카드가 3D로 뒤집히며 등급 정보 표시
- 앞면: 사용자 프로필 정보
- 뒷면: 등급 뱃지 및 등급별 특징 설명
- 부드러운 애니메이션 효과 (cubic-bezier 사용)

```css
/* 3D 플립 카드 효과 */
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

**4. 등급별 동적 스타일링**
- 파일: `packages/app/src/pages/user/User.tsx`
- 등급에 따라 배경색, 텍스트 색상, 테두리, 그림자 자동 변경
- 글래스모피즘(backdrop-blur)과 그라데이션 효과 적용
- 색상 대비 최적화 (화이트 등급은 어두운 텍스트, 나머지는 밝은 텍스트)

```typescript
const getGradeCardColors = (grade: Grade) => {
  const colors: Record<Grade, { bg: string; text: string; textMuted: string; border: string; shadow: string }> = {
    블랙: {
      bg: "bg-gradient-to-br from-gray-900/90 via-black/95 to-gray-800/90 backdrop-blur-xl",
      text: "text-white",
      textMuted: "text-gray-200",
      border: "border border-gray-700/50",
      shadow: "shadow-2xl shadow-black/50",
    },
    // ... 각 등급별 색상 정의
  };
  return colors[grade] || colors["화이트"];
};
```

**5. 등급별 특징 설명**
- 객관적인 기준 기반 설명 제공
- 완료율과 BP 개수를 명확히 표시
- 예: "완료율 100% + BP 2개 이상" (블랙 등급)

**6. 사용자 경험 개선**
- 프로필 카드 앞면에 "호버하여 등급 보기" 힌트 추가
- 뒷면에 "호버하여 프로필 보기" 안내 추가
- 빛 효과(shimmer) 애니메이션 추가
- 프로필 이미지 호버 시 확대 효과

#### 변경된 파일
- `packages/crawler/src/utils/ranking.utils.ts` - 등급 결정 로직 변경
- `packages/domain/src/types.ts` - Grade 타입 정의
- `packages/app/src/pages/home/Home.tsx` - 홈페이지 뱃지 표시
- `packages/app/src/pages/user/User.tsx` - 프로필 카드 3D 플립 및 동적 스타일링
- `packages/app/src/assets/index.css` - 3D 플립 카드 CSS 애니메이션

#### 기술적 특징
- **3D CSS Transforms**: `perspective`, `transform-style`, `backface-visibility`, `rotateY` 활용
- **성능 최적화**: `will-change` 속성으로 브라우저 최적화 힌트 제공
- **부드러운 애니메이션**: `cubic-bezier(0.34, 1.56, 0.64, 1)` 이징 함수로 자연스러운 움직임
- **반응형 디자인**: 다양한 화면 크기에서 일관된 경험 제공
- **접근성**: 등급 정보를 텍스트와 이미지로 모두 제공

#### 사용 방법
1. 홈페이지(`/`)에서 각 사용자 카드 하단에 등급 뱃지 확인
2. 사용자 상세 페이지(`/@[username]/`)에서 프로필 카드에 마우스를 올리면 3D 플립 효과로 등급 정보 확인
3. 등급별 색상과 스타일로 시각적으로 구분 가능

---

### 2. BP(BEST Practice) 정렬 기능 추가

#### 배경
사용자 목록에서 BEST가 많은 순으로 정렬할 수 있는 기능이 필요했습니다. 기존에는 이름과 점수로만 정렬이 가능했는데, BEST Practice를 많이 받은 사용자를 쉽게 확인할 수 있도록 BP 정렬 옵션을 추가했습니다.

#### 구현 내용

**1. 정렬 타입 상수 추가**
- 파일: `packages/app/src/features/users/hooks/useSortFilter.ts`
- `SORT_TYPE`에 `BP: "bp"` 추가

```typescript
export const SORT_TYPE = {
  NAME: "name",
  SCORE: "score",
  BP: "bp",  // 새로 추가
} as const;
```

**2. UI에 BP 정렬 옵션 추가**
- 파일: `packages/app/src/features/users/components/SortFilter.tsx`
- 정렬 기준 선택 드롭다운에 "BP" 옵션 추가

```tsx
<SelectContent className="bg-slate-800 border-slate-700">
  <SelectItem value={SORT_TYPE.NAME}>이름</SelectItem>
  <SelectItem value={SORT_TYPE.SCORE}>점수</SelectItem>
  <SelectItem value={SORT_TYPE.BP}>BP</SelectItem>  {/* 새로 추가 */}
</SelectContent>
```

**3. 정렬 로직 구현**
- 파일: `packages/app/src/pages/home/Home.tsx`
- `assignments` 배열에서 `theBest`가 `true`인 항목의 개수를 기준으로 정렬

```typescript
if (filterValues.sortType === "bp") {
  const aBpCount = a.assignments.filter((v) => v.theBest).length;
  const bBpCount = b.assignments.filter((v) => v.theBest).length;
  return filterValues.sortDirection === "asc" 
    ? aBpCount - bBpCount 
    : bBpCount - aBpCount;
}
```

#### 사용 방법
1. 홈 페이지(`/`)에서 정렬 기준 드롭다운을 클릭
2. "BP" 옵션 선택
3. 오름차순/내림차순 선택 가능
   - **내림차순**: BEST가 많은 순 (기본 추천)
   - **오름차순**: BEST가 적은 순

#### 변경된 파일
- `packages/app/src/features/users/hooks/useSortFilter.ts`
- `packages/app/src/features/users/components/SortFilter.tsx`
- `packages/app/src/pages/home/Home.tsx`

---

### 2. React SSR 하이드레이션 불일치 문제 해결

**커밋**: `399331ee`  
**날짜**: 2024년

#### 배경
배포 환경에서 React error #418 (Hydration failed) 에러가 발생했습니다. 이는 서버에서 렌더링된 HTML과 클라이언트에서 렌더링된 HTML이 일치하지 않아 발생하는 문제입니다.

#### 문제 원인
1. **날짜 포맷팅**: 서버와 클라이언트의 타임존 차이로 인한 날짜 불일치
2. **정규표현식**: 유니코드 속성 이스케이프(`\p{Script=...}`)가 Node.js와 브라우저에서 다르게 동작
3. **클라이언트 전용 API**: `document.cookie`, `window.innerWidth` 등 서버에서 접근 불가능한 API 사용
4. **랜덤 값**: 서버와 클라이언트에서 다른 랜덤 값 생성
5. **HTML 교체 로직**: 빈 문자열 replace로 인한 부정확한 HTML 교체

#### 해결 방법

**1. server.js: HTML 교체 로직 개선**
- 파일: `packages/app/server.js`
- 빈 문자열 replace 대신 주석 기반 HTML 교체로 변경

```javascript
// [수정] 주석을 타겟팅하여 정확한 위치에 삽입
const html = template
  .replace("<!--app-head-->", `<!--app-head-->${metadata}${rendered.head ?? ""}`)
  .replace("<!--app-html-->", rendered.html ?? "");
```

**2. utils.ts: 날짜 포맷팅을 UTC 기준으로 통일**
- 파일: `packages/app/src/lib/utils.ts`
- `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()` 사용하여 서버/클라이언트 일관성 보장

```typescript
// [수정] UTC 기준으로 포맷팅하여 서버/클라이언트 일관성 확보
export const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    console.warn("Invalid date:", dateString);
    return "날짜 없음";
  }

  // UTC 기준으로 날짜 추출하여 서버/클라이언트 간 일관성 보장
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  return `${year}. ${month}. ${day}.`;
};
```

**3. reading-time.ts: 유니코드 범위 직접 사용**
- 파일: `packages/app/src/lib/reading-time.ts`
- 유니코드 속성 이스케이프 대신 유니코드 범위 직접 사용

```typescript
// [수정] 유니코드 속성 이스케이프 대신 유니코드 범위를 직접 사용하여 서버/클라이언트 일관성 보장
function countCjkChars(text: string) {
  const t = text.replace(/\s+/g, "");
  // 유니코드 범위를 직접 사용: 한글(AC00-D7AF), 한자(4E00-9FFF), 히라가나(3040-309F), 가타카나(30A0-30FF)
  const m = t.match(/[\uAC00-\uD7AF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/g);
  return m ? m.length : 0;
}
```

**4. useMobile.ts: 일관된 초기값 보장**
- 파일: `packages/app/src/hooks/useMobile.ts`
- 서버와 클라이언트 모두에서 `false`로 초기화, `useEffect`에서만 실제 값 설정

```typescript
// [수정] 서버와 클라이언트에서 일관된 초기값을 보장하기 위해 항상 false로 시작
export function useMobile() {
  // 서버와 클라이언트 모두에서 동일한 초기값(false) 사용
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    // 클라이언트에서만 실행됨
    if (typeof window === "undefined") return;
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
```

**5. Sidebar.tsx: document.cookie 안전 처리 및 suppressHydrationWarning 추가**
- 파일: `packages/app/src/components/ui/Sidebar.tsx`
- `document.cookie` 접근을 클라이언트에서만 실행하도록 수정
- 랜덤 값 제거
- `suppressHydrationWarning` 속성 추가

```typescript
// [수정] document.cookie 접근을 클라이언트에서만 실행하도록 수정
if (typeof document !== "undefined") {
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
}
```

**6. AssignmentDetail.tsx: 공통 formatDate 함수 사용 및 suppressHydrationWarning 추가**
- 파일: `packages/app/src/pages/assignment/detail/AssignmentDetail.tsx`
- 공통 `formatDate` 함수 사용
- 날짜 표시에 `suppressHydrationWarning` 추가
- `MarkdownPreview`를 클라이언트 마운트 후에만 렌더링

```tsx
// [수정 1] 마운트 여부를 확인하는 상태 추가
const [isMounted, setIsMounted] = useState(false);

// [수정 2] 컴포넌트가 브라우저에 마운트된 직후 true로 변경
useEffect(() => {
  setIsMounted(true);
}, []);

// 날짜 표시
<span suppressHydrationWarning>{formatDate(data.createdAt)}</span>

// [수정 3] MarkdownPreview를 isMounted가 true일 때만 렌더링
{isMounted ? (
  <MarkdownPreview source={data.body} ... />
) : (
  <div className="p-6 text-gray-500">Loading content...</div>
)}
```

#### 해결된 문제
- ✅ React error #418 (Hydration failed) 해결
- ✅ 서버와 클라이언트에서 동일한 HTML 생성
- ✅ 날짜 포맷팅 일관성 확보
- ✅ 유니코드 정규표현식 호환성 개선
- ✅ 클라이언트 전용 API 안전 처리

#### 변경된 파일
- `packages/app/server.js`
- `packages/app/src/lib/utils.ts`
- `packages/app/src/lib/reading-time.ts`
- `packages/app/src/hooks/useMobile.ts`
- `packages/app/src/components/ui/Sidebar.tsx`
- `packages/app/src/pages/assignment/detail/AssignmentDetail.tsx`

#### 참고사항
- 하이드레이션 불일치를 방지하려면 서버와 클라이언트에서 동일한 값을 생성해야 합니다
- 클라이언트 전용 API(`window`, `document` 등)는 `useEffect` 내부에서만 사용하거나 `typeof window !== "undefined"` 체크를 추가하세요
- 날짜/시간 관련 로직은 UTC 기준으로 통일하는 것이 좋습니다
- 정규표현식에서 유니코드 속성 이스케이프 대신 범위를 직접 사용하면 호환성이 좋습니다

---

### 3. LMS와 GitHub PR 매칭 시스템 구축

**파일**: `packages/crawler/src/main.ts`  
**날짜**: 2024년

#### 배경 및 문제 상황
6기와 달리 7기에서는 **PR을 close한 후 다시 새로운 커밋을 생성하여 PR을 재오픈하는 경우**가 빈번하게 발생했습니다. 이로 인해 LMS에 등록된 PR URL과 실제 GitHub에서 오픈된 PR URL이 달라지는 문제가 발생했습니다.

**문제점:**
- LMS에 등록된 PR URL이 이미 close된 PR을 가리키는 경우
- 실제로는 새로운 PR이 오픈되어 있지만 URL이 다른 경우
- 같은 PR 번호를 가진 다른 repository의 PR이 존재하는 경우
- URL 형식의 차이 (www.github.com vs github.com, trailing slash 등)

#### 해결 전략

**1. URL 정규화 시스템**
- 다양한 URL 형식을 통일된 형식으로 변환
- `www.github.com` → `github.com` 변환
- Trailing slash 제거
- 공백 제거

```typescript
const normalizeUrl = (url: string | undefined): string => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  cleanUrl = cleanUrl.replace('www.github.com', 'github.com');
  return cleanUrl;
};
```

**2. 수동 매핑 테이블 (1인자 솔루션)**
- URL 매칭이 실패했을 때를 대비한 수동 매핑 테이블 구축
- 7기 전체 수강생(약 50명)의 이름과 GitHub ID 매핑
- 이름 기반으로 GitHub ID를 찾아 PR 매칭 시도

```typescript
const manualMatchingMap: Record<string, string> = {
  // 1팀
  김민석: 'kju1018',
  강승훈: 'seunghoonKang',
  // ... 전체 수강생 매핑
};
```

**3. 키워드 기반 PR 복구 로직**
- 과제명에서 chapter 정보를 추출하여 검색 키워드 생성
- STEP 번호를 기반으로 chapter 정보 자동 매핑
- 사용자의 모든 PR 중에서 키워드가 포함된 PR을 찾아 매칭

```typescript
const getRepoKeyword = (assignmentName: string): string => {
  const cleanName = assignmentName.replace(/\s/g, '').toLowerCase();
  const match = cleanName.match(/step(\d+)/);
  
  if (match) {
    const stepNumber = parseInt(match[1], 10);
    // STEP 번호에 따라 chapter 자동 매핑
    if (stepNumber <= 2) return 'chapter1-1';
    if (stepNumber <= 4) return 'chapter1-2';
    // ... 각 chapter별 매핑
  }
  return '';
};
```

**4. 같은 PR 번호 기반 복구**
- LMS URL에서 PR 번호 추출
- 같은 PR 번호를 가진 다른 repository의 PR 검색
- 정확히 같은 repository의 PR이 있는지 확인

```typescript
// 같은 PR 번호를 가진 URL 중에서 정확히 같은 repo의 PR이 있는지 확인
const exactRepoMatch = prNumber
  ? Object.keys(pulls).find((url) => {
      const repoMatch = lmsUrl.match(/\/front_7th_(chapter\d+-\d+)\/pull\//);
      if (!repoMatch) return false;
      const repoName = repoMatch[1];
      return url.includes(`/front_7th_${repoName}/pull/${prNumber}`);
    })
  : undefined;
```

**5. 다단계 매칭 프로세스**
1. **1차 매칭**: 정규화된 URL로 직접 매칭 시도
2. **2차 매칭**: 수동 매핑 테이블을 통해 GitHub ID 찾기
3. **3차 매칭**: 키워드 기반으로 사용자의 PR 목록에서 검색
4. **4차 매칭**: 같은 PR 번호를 가진 다른 repository의 PR 검색

**6. 상세한 디버깅 시스템**
- 매칭 시도마다 상세한 디버깅 정보 수집
- 마크다운 형식의 디버깅 리포트 자동 생성
- 매칭 성공/실패 상태 추적
- 사용자별 PR 목록 분석

```typescript
const debugInfo: Array<{
  name: string;
  assignmentName: string;
  originalUrl: string;
  normalizedUrl: string;
  pullExists: boolean;
  prNumber?: string;
  matchedGithubId?: string;
  searchKeyword?: string;
  userPullsCount?: number;
  matchingPullsCount?: number;
  status: 'success' | 'keyword_fail' | 'partial_fail' | 'complete_fail';
  matchedUrl?: string;
}> = [];
```

**7. Best Practice URL 수동 설정**
- LMS에 반영되지 않은 Best Practice PR을 수동으로 설정
- 각 chapter별 Best Practice PR URL 리스트 관리
- 정규화된 URL로 변환하여 일관성 유지

```typescript
const bestPracticeUrls = new Set([
  'https://github.com/hanghae-plus/front_7th_chapter1-1/pull/23', // 진재윤
  'https://github.com/hanghae-plus/front_7th_chapter1-1/pull/13', // 한세준
  // ... 전체 Best Practice PR 목록
].map((url) => normalizeUrl(url)));
```

#### 구현 결과

**매칭 성공률 향상:**
- 초기 매칭 실패율: 약 30-40%
- 최종 매칭 성공률: 약 95% 이상
- 수동 개입이 필요한 케이스: 약 5% 이하

**디버깅 효율성:**
- 자동화된 디버깅 리포트 생성
- 매칭 실패 원인 추적 가능
- 사용자별 PR 목록 분석 가능

**유지보수성:**
- 수동 매핑 테이블로 예외 케이스 처리
- Best Practice URL 중앙 관리
- 디버깅 정보를 통한 문제 파악 용이

#### 주요 파일
- `packages/crawler/src/main.ts` (약 943줄)
  - PR 매칭 로직 전체 구현
  - 디버깅 시스템
  - URL 정규화 및 복구 로직

#### 생성되는 디버깅 파일
- `docs/data/matching-debug.md`: 전체 매칭 결과 리포트
- `docs/data/chapter4-1-debug.md`: Chapter 4-1 전용 상세 리포트

#### 기술적 도전과제
1. **다양한 URL 형식 처리**: URL 정규화를 통한 일관성 확보
2. **PR 번호 기반 복구**: 같은 PR 번호를 가진 다른 repository의 PR 찾기
3. **키워드 기반 검색**: 과제명에서 chapter 정보 추출 및 매칭
4. **예외 케이스 처리**: 수동 매핑 테이블을 통한 fallback 메커니즘
5. **디버깅 정보 수집**: 매칭 과정의 모든 단계 추적

---

## 📝 기타 참고사항

### 질문이나 이슈가 있으시면
디스코드 잡담방이나 dm 주시면 

