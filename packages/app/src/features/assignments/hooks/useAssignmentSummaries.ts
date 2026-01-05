import { useMemo } from "react";
import { useAppDataContext } from "@/providers";
import type { AssignmentSummary } from "../types";

// 내부에서 사용할 타입 정의
interface Submission {
  id: number;
  passed: boolean;
  theBest: boolean;
  userId: string;
  userName: string;
  prUrl: string;
}

interface AssignmentMapData {
  title: string;
  chapter: string;
  repository: string;
  submissions: Submission[];
}

export const useAssignmentSummaries = () => {
  const { data } = useAppDataContext();
  // useMemo 밖으로 빼면 의존성 경고가 뜨므로 내부로 이동하거나 의존성에 포함해야 함.
  // 여기서는 useMemo 내부에서 처리하도록 변경하겠네.

  const summaries = useMemo(() => {
    // 1. 데이터 없음 방어
    if (!data || !data.users) {
      return [];
    }

    const allAssignments = data.assignmentDetails || {};

    // 2. URL 파싱
    const getRepositoryFromUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split("/").filter(Boolean);
        if (pathSegments.length >= 2) {
          return `${pathSegments[0]}/${pathSegments[1]}`;
        }
        return "";
      } catch {
        return "";
      }
    };

    // [수정] Map의 타입을 any 대신 명확한 인터페이스로 지정
    const assignmentMap = new Map<string, AssignmentMapData>();

    // 3. 순회 시작
    Object.entries(data.users).forEach(([userId, user]) => {
      user.assignments?.forEach((assignment) => {
        const repository = getRepositoryFromUrl(assignment.url);
        if (!repository) return;

        // 4. 맵 초기화
        if (!assignmentMap.has(repository)) {
          // [수정] assignmentName이 타입에 없으므로 안전하게 접근하거나 대체값 사용
          // (assignment as any) 대신 타입 가드나 확장을 쓰는 게 좋지만,
          // 린트 통과를 위해 unknown 단언 후 접근 혹은 기본값 로직 유지하되 any 회피
          const realTitle =
            "assignmentName" in assignment ? (assignment as { assignmentName: string }).assignmentName : repository;

          const chapterMatch = repository.match(/chapter([\d-]+)/);
          const chapterNum = chapterMatch ? chapterMatch[1] : null;
          const dynamicChapter = chapterNum ? `Chapter ${chapterNum}` : "기타 과제";

          assignmentMap.set(repository, {
            title: realTitle,
            chapter: dynamicChapter,
            repository,
            submissions: [],
          });
        }

        const existing = assignmentMap.get(repository);
        if (!existing) return;

        const assignmentId = allAssignments[assignment.url]?.id ?? 0;

        // [수정] v: any 제거 -> Submission 타입 추론됨
        const existingIndex = existing.submissions.findIndex((v) => v.userId === userId);

        const newSubmission: Submission = {
          id: typeof assignmentId === "string" ? parseInt(assignmentId, 10) || 0 : assignmentId,

          // [수정] passed가 undefined일 수 있으므로 false로 기본값 할당
          passed: assignment.passed ?? false,

          // [수정] theBest가 undefined일 수 있으므로 false로 기본값 할당
          theBest: assignment.theBest ?? false,

          userId,
          // (참고) userName도 null일 수 있으니 안전하게 처리하는 것이 좋네
          userName: user.name || "Unknown",
          prUrl: assignment.url,
        };

        if (existingIndex !== -1) {
          const oldSubmission = existing.submissions[existingIndex];
          let shouldReplace = false;

          if (!oldSubmission.passed && newSubmission.passed) {
            shouldReplace = true;
          } else if (oldSubmission.passed === newSubmission.passed) {
            if (oldSubmission.id === 0 && newSubmission.id !== 0) {
              shouldReplace = true;
            }
          }

          if (shouldReplace) {
            existing.submissions[existingIndex] = newSubmission;
          }
          return;
        }

        existing.submissions.push(newSubmission);
      });
    });

    // 6. 결과 변환 및 정렬
    const result: AssignmentSummary[] = Array.from(assignmentMap.entries()).map(([repository, mapData]) => {
      const totalSubmissions = mapData.submissions.length;
      // [수정] 타입 추론 활용
      const passedCount = mapData.submissions.filter((s) => s.passed).length;

      const bestPracticeUsers = mapData.submissions
        .filter((v) => v.theBest)
        .map((v) => ({
          assignmentId: v.id,
          userId: v.userId,
          userName: v.userName,
          prUrl: v.prUrl,
        }));

      const passRate = totalSubmissions > 0 ? (passedCount / totalSubmissions) * 100 : 0;

      return {
        title: mapData.title,
        chapter: mapData.chapter,
        repository,
        totalSubmissions,
        bestPracticeCount: bestPracticeUsers.length,
        passedCount,
        passRate: Math.round(passRate * 10) / 10,
        bestPracticeUsers,
        id: repository,
        url: `https://github.com/${repository}`,
      };
    });

    return result.sort((a, b) => {
      const getChapterParts = (chapterStr: string) => {
        const match = chapterStr.match(/(\d+)(?:-(\d+))?/);
        if (!match) return [999, 999];
        return [parseInt(match[1], 10), match[2] ? parseInt(match[2], 10) : 0];
      };

      const [aMajor, aMinor] = getChapterParts(a.chapter);
      const [bMajor, bMinor] = getChapterParts(b.chapter);

      if (aMajor !== bMajor) return aMajor - bMajor;
      if (aMinor !== bMinor) return aMinor - bMinor;
      return a.title.localeCompare(b.title);
    });
  }, [data]); // allAssignments 의존성 제거 (내부 변수화)

  // 통계 계산 로직
  const stats = useMemo(() => {
    const totalAssignments = summaries.length;
    const totalSubmissions = summaries.reduce((acc, s) => acc + s.totalSubmissions, 0);
    const totalBestPractices = summaries.reduce((acc, s) => acc + s.bestPracticeCount, 0);
    const averagePassRate =
      summaries.length > 0 ? summaries.reduce((acc, s) => acc + s.passRate, 0) / summaries.length : 0;

    return {
      totalAssignments,
      totalSubmissions,
      totalBestPractices,
      averagePassRate: Math.round(averagePassRate * 10) / 10,
    };
  }, [summaries]);

  return { summaries, stats };
};
