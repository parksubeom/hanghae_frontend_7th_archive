import {
  HanghaeUser,
  UserWIthCommonAssignments,
  Grade,
} from '@hanghae-plus/domain';

// 랭킹 시스템 상수
const RANKING_CONSTANTS = {
  // 점수 계산
  COMPLETION_SCORE: 30, // 과제 완료당 점수
  BEST_PRACTICE_SCORE: 40, // BP 선정당 점수

  // 완료율 보너스
  COMPLETION_100_BONUS: 100, // 100% 완료 보너스
  COMPLETION_90_BONUS: 50, // 90% 이상 완료 보너스
  COMPLETION_80_BONUS: 25, // 80% 이상 완료 보너스

  // 완료율 기준
  COMPLETION_100_THRESHOLD: 100,
  COMPLETION_90_THRESHOLD: 90,
  COMPLETION_80_THRESHOLD: 80,
} as const;

/**
 * 사용자의 점수를 계산합니다.
 * @param user 사용자 정보
 * @param totalAssignments 전체 과제 수
 * @returns 계산된 점수
 */
export function calculateUserScore(
  user: UserWIthCommonAssignments,
  totalAssignments: number,
): number {
  const completedAssignments = user.assignments.filter(
    (assignment) => assignment.passed,
  ).length;

  const bestPracticeCount = user.assignments.filter(
    (assignment) => assignment.theBest,
  ).length;

  const completionRate = (completedAssignments / totalAssignments) * 100;

  const defaultScore =
    completedAssignments * RANKING_CONSTANTS.COMPLETION_SCORE +
    bestPracticeCount * RANKING_CONSTANTS.BEST_PRACTICE_SCORE;

  // 완료율 보너스 계산
  if (completionRate >= RANKING_CONSTANTS.COMPLETION_100_THRESHOLD) {
    return defaultScore + RANKING_CONSTANTS.COMPLETION_100_BONUS;
  }

  if (completionRate >= RANKING_CONSTANTS.COMPLETION_90_THRESHOLD) {
    return defaultScore + RANKING_CONSTANTS.COMPLETION_90_BONUS;
  }

  if (completionRate >= RANKING_CONSTANTS.COMPLETION_80_THRESHOLD) {
    return defaultScore + RANKING_CONSTANTS.COMPLETION_80_BONUS;
  }

  return defaultScore;
}

/**
 * 사용자의 등급을 결정합니다.
 * 완료율과 BP(베스트 프랙티스) 개수를 기반으로 등급을 결정합니다.
 * @param user 사용자 정보
 * @param totalAssignments 전체 과제 수
 * @returns 결정된 등급
 */
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

/**
 * 사용자 객체에 점수와 등급을 추가합니다.
 * @param users 사용자 목록
 * @param totalAssignments 전체 과제 수
 * @returns 점수와 등급이 추가된 사용자 목록
 */
export function addRankingToUsers(
  users: Record<string, UserWIthCommonAssignments>,
  totalAssignments: number,
): Record<string, HanghaeUser> {
  return Object.entries(users).reduce(
    (acc, [userId, user]) => {
      const score = calculateUserScore(user, totalAssignments);
      const grade = determineGrade(user, totalAssignments);

      acc[userId] = {
        ...user,
        score,
        grade,
      };

      return acc;
    },
    {} as Record<string, HanghaeUser>,
  );
}
