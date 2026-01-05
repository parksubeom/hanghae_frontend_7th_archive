# 변경 사항 및 기능 추가 내역

## 📅 최근 업데이트

### 1. BP(BEST Practice) 정렬 기능 추가

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

