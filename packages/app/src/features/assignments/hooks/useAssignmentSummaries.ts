import { useMemo } from "react";
import { useAppDataContext } from "@/providers";
import type { AssignmentSummary } from "../types";

export const useAssignmentSummaries = () => {
  const { data } = useAppDataContext();
  const allAssignments = data.assignmentDetails;

  const summaries = useMemo(() => {
    // 1. 데이터 유효성 검사 (Guard Clause)
    if (!data || !data.users) {
      return [];
    }

    // 2. PR URL에서 리포지토리 이름 추출 (예: hanghae-plus/front_7th_chapter1-1)
    const getRepositoryFromUrl = (prUrl: string): string => {
      const match = prUrl.match(/github\.com\/(.*?)\/pull/);
      return match ? match[1] : "";
    };

    const assignmentMap = new Map<
      string,
      {
        title: string;
        chapter: string;
        repository: string;
        submissions: Array<{
          id: number;
          passed: boolean;
          theBest?: boolean;
          userId: string;
          userName: string;
          prUrl: string;
        }>;
      }
    >();

    // 3. 모든 유저의 과제 순회
    Object.entries(data.users).forEach(([userId, user]) => {
      user.assignments?.forEach((assignment) => {
        const repository = getRepositoryFromUrl(assignment.url);
      
        if (!repository) return;

        // 4. 맵에 아직 이 과제(리포지토리)가 등록되지 않았다면 초기화
        if (!assignmentMap.has(repository)) {
      
          
          // Title: 백엔드에서 받아온 'assignmentName'이 있으면 쓰고, 없으면 리포지토리 이름 사용
          // (타입 에러 방지를 위해 any 캐스팅 사용. 추후 도메인 타입 수정 권장)
          const realTitle = (assignment as any).assignmentName || repository;

          // Chapter: 리포지토리 URL에서 'chapterX-X' 패턴을 찾아 'X주차'로 변환
          // 예: front_7th_chapter1-1 -> 1주차
          const chapterMatch = repository.match(/chapter(\d+)/);
          const chapterNum = chapterMatch ? chapterMatch[1] : "기타";
          
          // 화면에 보여질 챕터 그룹명
          const dynamicChapter = chapterNum === "기타" 
            ? "기타 과제" 
            : `${chapterNum}주차 과제`;

          assignmentMap.set(repository, {
            title: realTitle,      
            chapter: dynamicChapter,
            repository,
            submissions: [],
          });
        }

        // 5. 제출 현황 집계
        const existing = assignmentMap.get(repository);
        if (!existing) return; // 방어 코드

        // 중복 제출 방지
        const existingSubmission = existing.submissions.find((v) => v.userId === userId);
        const assignmentId = allAssignments[assignment.url]?.id;

        // 과제 ID가 없거나 이미 처리한 유저라면 스킵
        if (existingSubmission || !assignmentId) {
          return;
        }

        existing.submissions.push({
          id: assignmentId,
          passed: assignment.passed,
          theBest: assignment.theBest,
          userId,
          userName: user.name,
          prUrl: assignment.url,
        });
      });
    });

    // 6. 결과 배열로 변환 및 통계 계산
    const result: AssignmentSummary[] = Array.from(assignmentMap.entries()).map(([repository, data]) => {
      const totalSubmissions = data.submissions.length;
      const passedCount = data.submissions.filter((s) => s.passed).length;
      const bestPracticeUsers = data.submissions
        .filter((v) => v.theBest)
        .map((v) => ({
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

    // 7. 정렬 (주차별 -> 이름순)
    return result.sort((a, b) => {
      const getChapterNumber = (chapterStr: string) => {
        // "1주차 과제"에서 숫자 1만 추출
        const match = chapterStr.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 999;
      };

      const aChapter = getChapterNumber(a.chapter);
      const bChapter = getChapterNumber(b.chapter);

      if (aChapter !== bChapter) {
        return aChapter - bChapter;
      }
      return a.title.localeCompare(b.title);
    });
  }, [allAssignments, data]);

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