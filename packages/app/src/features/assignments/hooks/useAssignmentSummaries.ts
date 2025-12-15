import { useMemo } from "react";
import { useAppDataContext } from "@/providers";
import type { AssignmentSummary } from "../types";

export const useAssignmentSummaries = () => {
  const { data } = useAppDataContext();
  const allAssignments = data?.assignmentDetails || {};

  const summaries = useMemo(() => {
    // 1. 데이터 없음 방어
    if (!data || !data.users) {
      return [];
    }

    // 2. URL 파싱 (더 안전하게 URL 객체 사용)
    const getRepositoryFromUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split("/").filter(Boolean);
        // owner/repo 형태면 반환
        if (pathSegments.length >= 2) {
          return `${pathSegments[0]}/${pathSegments[1]}`;
        }
        return "";
      } catch {
        return "";
      }
    };

    const assignmentMap = new Map<string, any>();

    // 3. 순회 시작
    Object.entries(data.users).forEach(([userId, user]) => {
      user.assignments?.forEach((assignment) => {
        const repository = getRepositoryFromUrl(assignment.url);
        if (!repository) return;

        // 4. 맵 초기화 (제목, 챕터 동적 추출)
        if (!assignmentMap.has(repository)) {
          const realTitle = (assignment as any).assignmentName || repository;
          // chapter1-1, chapter2 등 숫자 추출
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

        // 🔥 [핵심 1] ID가 없어도 0으로 처리 (증발 방지!)
        const assignmentId = allAssignments[assignment.url]?.id ?? 0;

        // 5. 중복 제출 처리 (32번 vs 75번 승부)
        const existingIndex = existing.submissions.findIndex((v: any) => v.userId === userId);

        const newSubmission = {
          id: assignmentId,
          passed: assignment.passed,
          theBest: assignment.theBest, // theBest 속성도 챙기기
          userId,
          userName: user.name,
          prUrl: assignment.url,
        };

        if (existingIndex !== -1) {
          // 이미 리스트에 있는 제출물
          const oldSubmission = existing.submissions[existingIndex];

          // 🏆 [핵심 2] 더 나은 제출물로 교체하는 로직
          // 조건 A: 기존 건 통과 못했는데(false), 이번 건 통과(true)함 -> 교체!
          // 조건 B: 통과 여부는 같은데, 이번 PR 번호가 더 큼 (URL 비교) -> 교체! (선택 사항)

          let shouldReplace = false;

          if (!oldSubmission.passed && newSubmission.passed) {
            shouldReplace = true; // 실패 -> 성공 업그레이드
          } else if (oldSubmission.passed === newSubmission.passed) {
            // 둘 다 상태가 같다면, ID가 있는 것(명부에 있는 것)을 우선하거나, 최신 PR을 우선
            if (oldSubmission.id === 0 && newSubmission.id !== 0) {
              shouldReplace = true; // 데이터 있는 놈이 이김
            }
          }

          if (shouldReplace) {
            existing.submissions[existingIndex] = newSubmission;
          }
          // 교체를 하든 안 하든 리턴 (중복 추가 방지)
          return;
        }

        // 중복 아니면 추가
        existing.submissions.push(newSubmission);
      });
    });

    // 6. 결과 변환 및 정렬
    const result: AssignmentSummary[] = Array.from(assignmentMap.entries()).map(([repository, data]) => {
      const totalSubmissions = data.submissions.length;
      const passedCount = data.submissions.filter((s: any) => s.passed).length;

      const bestPracticeUsers = data.submissions
        .filter((v: any) => v.theBest)
        .map((v: any) => ({
          assignmentId: v.id,
          userId: v.userId,
          userName: v.userName,
          prUrl: v.prUrl,
        }));

      const passRate = totalSubmissions > 0 ? (passedCount / totalSubmissions) * 100 : 0;

      return {
        title: data.title,
        chapter: data.chapter,
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

    // 7. 정렬 (Chapter 1-1, 1-2...)
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
  }, [allAssignments, data]);

  const stats = useMemo(() => {
    // 통계 계산 로직 (기존 동일)
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
