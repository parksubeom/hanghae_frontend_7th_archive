import type { GithubApiUsers, HanghaeUser, Grade } from "@hanghae-plus/domain";
// [수정] MouseEvent 타입 추가
import { type PropsWithChildren, useMemo, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Calendar, Clock, Github, StarIcon, FlipHorizontal } from "lucide-react";
import { useUserIdByParam, useUserWithAssignments } from "@/features";
import { Badge, Card } from "@/components";
import { calculateReadingTime, formatDate } from "@/lib";
import { type Assignment, PageProvider, usePageData } from "@/providers";
import { baseMetadata, type MetadataConfig } from "@/utils/metadata";

/**
 * 등급에 따른 프로필 카드 스타일을 반환합니다.
 * 글래스모피즘과 그라데이션을 조합하여 시각적으로 아름답게 만듭니다.
 */
const getGradeCardColors = (
  grade: Grade,
): { bg: string; text: string; textMuted: string; border: string; shadow: string } => {
  const colors: Record<Grade, { bg: string; text: string; textMuted: string; border: string; shadow: string }> = {
    블랙: {
      bg: "bg-gradient-to-br from-gray-900/90 via-black/95 to-gray-800/90 backdrop-blur-xl",
      text: "text-white",
      textMuted: "text-gray-200",
      border: "border border-gray-700/50",
      shadow: "shadow-2xl shadow-black/50",
    },
    레드: {
      bg: "bg-gradient-to-br from-red-600/90 via-red-700/95 to-rose-800/90 backdrop-blur-xl",
      text: "text-white",
      textMuted: "text-red-50",
      border: "border border-red-500/40",
      shadow: "shadow-2xl shadow-red-900/50",
    },
    브라운: {
      bg: "bg-gradient-to-br from-amber-800/90 via-amber-900/95 to-orange-950/90 backdrop-blur-xl",
      text: "text-white",
      textMuted: "text-amber-50",
      border: "border border-amber-700/40",
      shadow: "shadow-2xl shadow-amber-900/50",
    },
    퍼플: {
      bg: "bg-gradient-to-br from-purple-600/90 via-purple-700/95 to-violet-800/90 backdrop-blur-xl",
      text: "text-white",
      textMuted: "text-purple-50",
      border: "border border-purple-500/40",
      shadow: "shadow-2xl shadow-purple-900/50",
    },
    블루: {
      bg: "bg-gradient-to-br from-blue-500/90 via-blue-600/95 to-indigo-700/90 backdrop-blur-xl",
      text: "text-white",
      textMuted: "text-blue-50",
      border: "border border-blue-400/40",
      shadow: "shadow-2xl shadow-blue-900/50",
    },
    화이트: {
      bg: "bg-gradient-to-br from-white/95 via-gray-50/95 to-slate-100/95 backdrop-blur-xl",
      text: "text-gray-900",
      textMuted: "text-gray-700",
      border: "border border-gray-300/60",
      shadow: "shadow-2xl shadow-gray-400/30",
    },
  };
  return colors[grade] || colors["화이트"];
};

const UserProfile = ({
  login,
  name,
  blog,
  bio,
  followers,
  following,
  avatar_url,
  html_url,
  textColor,
  textMutedColor,
  cardBg,
  border,
  shadow,
  grade,
}: GithubApiUsers & {
  name: string;
  textColor: string;
  textMutedColor: string;
  cardBg: string;
  border: string;
  shadow: string;
  grade: Grade;
}) => {
  /**
   * 등급에 따른 뱃지 이미지 경로를 반환합니다.
   */
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

  /**
   * 등급에 따른 특징 설명을 반환합니다.
   */
  const getGradeDescription = (grade: Grade): string => {
    const descriptions: Record<Grade, string> = {
      블랙: "완료율 100% + BP 2개 이상",
      레드: "완료율 90% 이상 + BP 1개 이상",
      브라운: "완료율 80% 이상",
      퍼플: "완료율 55% 이상",
      블루: "완료율 35% 이상",
      화이트: "완료율 35% 미만",
    };
    return descriptions[grade] || descriptions["화이트"];
  };

  return (
    <div className="sticky top-6">
      {/* 3D 플립 카드 컨테이너 - 세련된 버전 */}
      <div className="perspective-1000 profile-card-container">
        <div className="relative w-full min-h-[500px] group card-shimmer">
          {/* 카드 플립 래퍼 */}
          <div className="card-flip-wrapper relative w-full min-h-[500px]">
            {/* 앞면: 프로필 정보 */}
            <div
              className={`card-face absolute inset-0 w-full min-h-[500px] ${cardBg} ${border} ${shadow} rounded-2xl p-8 overflow-hidden`}
            >
              {/* 배경 그라데이션 오버레이 */}
              <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

              <div className="relative flex flex-col items-center text-center space-y-5 h-full justify-center">
                {/* 프로필 이미지 - 호버 시 확대 효과 */}
                <a
                  href={html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group/avatar transition-transform duration-300 hover:scale-105"
                >
                  <div className="relative">
                    <div className="w-40 h-40 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl group-hover/avatar:ring-white/40 transition-all duration-300">
                      <img
                        src={avatar_url}
                        alt={login}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-110"
                      />
                    </div>
                    {/* 프로필 이미지 주변 빛 효과 */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                </a>

                {/* 사용자 정보 */}
                <div className="w-full space-y-3">
                  <h3
                    className={`text-2xl font-bold ${textColor} mb-1 transition-all duration-300 group-hover:scale-105`}
                  >
                    {login}
                  </h3>
                  <div className="space-y-2">
                    <p className={`${textMutedColor} text-sm font-medium`}>{name}</p>
                    {bio && <p className={`${textMutedColor} text-sm leading-relaxed px-2`}>{bio}</p>}
                    {blog && (
                      <a
                        href={blog}
                        target="_blank"
                        rel="noreferrer"
                        className={`${textColor} hover:underline opacity-70 hover:opacity-100 text-sm transition-all duration-200 inline-block`}
                      >
                        {blog}
                      </a>
                    )}
                    <div className={`flex justify-center space-x-6 ${textMutedColor} pt-2`}>
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs opacity-80">팔로워</span>
                        <span className={`font-bold text-base ${textColor}`}>{followers}</span>
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-xs opacity-80">팔로잉</span>
                        <span className={`font-bold text-base ${textColor}`}>{following}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 호버 힌트 */}
                <div className={`mt-4 pt-4 border-t border-current/10 w-full`}>
                  <div
                    className={`flex items-center justify-center space-x-2 ${textMutedColor} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    <span className="text-xs font-medium">호버하여 등급 보기</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 뒷면: 등급 뱃지 - 더 세련된 디자인 */}
            <div
              className={`card-face absolute inset-0 w-full min-h-[500px] rotate-y-180 ${cardBg} ${border} ${shadow} rounded-2xl p-8 overflow-hidden`}
            >
              {/* 배경 패턴 오버레이 */}
              <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-white/30 via-transparent to-black/30 pointer-events-none" />

              <div className="relative flex flex-col items-center justify-center h-full space-y-5 px-4">
                {/* 등급 텍스트 - 더 큰 사이즈 */}
                <div className={`text-4xl font-extrabold ${textColor} mb-1 tracking-wide`}>{grade}</div>

                {/* 뱃지 이미지 - 더 큰 사이즈와 그림자 효과 */}
                <div className="relative">
                  <img
                    src={getGradeBadgeImage(grade)}
                    alt={grade}
                    className="h-28 w-auto drop-shadow-2xl transition-transform duration-300 group-hover:scale-110"
                    title={grade}
                  />
                  {/* 뱃지 주변 빛 효과 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-full blur-xl opacity-50" />
                </div>

                {/* 등급별 특징 설명 */}
                <div className="space-y-2 mt-2">
                  <div className={`w-12 h-0.5 ${textMutedColor} opacity-30 mx-auto`} />
                  <p className={`text-sm leading-relaxed ${textMutedColor} text-center max-w-xs px-2`}>
                    {getGradeDescription(grade)}
                  </p>
                </div>

                {/* 안내 텍스트 */}
                <div className="mt-2">
                  <p className={`text-xs ${textMutedColor} text-center opacity-60`}>호버하여 프로필 보기</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AssignmentCard = ({ id, title, url, createdAt, theBest, body }: Assignment) => {
  const navigate = useNavigate(); // ✅ 네비게이션 훅 사용

  // PR 본문을 기반으로 읽기 시간 계산
  const readingTime = useMemo(() => {
    if (!body) return { text: "1분 읽기" };
    return calculateReadingTime(body);
  }, [body]);

  // ✅ 카드 클릭 핸들러
  const handleCardClick = () => {
    navigate(`./assignment/${id}/`);
  };

  return (
    <Card className="hover:shadow-glow transition-all duration-300 cursor-pointer group bg-card border border-border">
      {/* ❌ <Link> 제거하고 <div> + onClick으로 변경하여 HTML 중첩 규칙 준수 */}
      <div onClick={handleCardClick} className="block w-full text-left">
        <div className="p-6">
          <div className="flex flex-col space-y-3">
            {/* 과제 제목 */}
            <h3 className="text-lg font-semibold text-white group-hover:text-orange-300 transition-colors leading-tight">
              {title}
            </h3>

            {/* 메타 정보 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-slate-500">
                {theBest && (
                  <Badge variant="secondary" className="text-xs bg-green-800">
                    <StarIcon />
                    베스트
                  </Badge>
                )}

                {/* ✅ 내부 링크: 이벤트 전파 방지(stopPropagation) 필수 */}
                <Link
                  to={url}
                  className="text-xs text-slate-400 flex items-center space-x-1 hover:underline underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                  // [수정] any -> MouseEvent로 변경하여 타입 안전성 확보
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation(); // 🚨 카드의 클릭 이벤트가 발생하지 않도록 막음
                  }}
                >
                  <Github className="w-3 h-3" />
                  <span>Pull Request</span>
                </Link>

                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span suppressHydrationWarning>{formatDate(createdAt)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span suppressHydrationWarning>{readingTime.text}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const AssignmentsList = ({ items }: { items: Assignment[] }) => {
  const sortedAssignments = useMemo(() => {
    return [...items];
  }, [items]);

  return (
    <div className="space-y-4">
      {sortedAssignments.map((assignment) => (
        <AssignmentCard key={assignment.id} {...assignment} />
      ))}
    </div>
  );
};

const UserStats = ({ assignments }: { assignments: Assignment[] }) => {
  const count = assignments.length;
  const passedCount = assignments.filter((a) => a.passed).length;
  const bestCount = assignments.filter((a) => a.theBest).length;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">제출한 과제</h2>
        <Badge variant="secondary" className="text-sm bg-slate-700">
          총 {assignments.length}개
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-800/50 border-slate-700">
          <div className="text-2xl font-bold text-white">{count}</div>
          <div className="text-sm text-slate-400">총 과제 수</div>
        </Card>

        <Card className="p-4 bg-slate-800/50 border-slate-700">
          <div className="text-2xl font-bold text-green-400">{passedCount}</div>
          <div className="text-sm text-slate-400">합격한 과제</div>
        </Card>

        <Card className="p-4 bg-slate-800/50 border-slate-700">
          <div className="text-2xl font-bold text-yellow-500">{bestCount}</div>
          <div className="text-sm text-slate-400">베스트 과제</div>
        </Card>
      </div>
    </div>
  );
};

const UserProvider = ({ children }: PropsWithChildren) => {
  const userId = useUserIdByParam();
  const user = useUserWithAssignments(userId);

  return (
    <PageProvider title={`${user.name} 님의 상세페이지`} data={user}>
      {children}
    </PageProvider>
  );
};

// User 페이지 메타데이터 생성 함수
export interface UserMetadataParams {
  userId: string;
  userName: string;
  avatarUrl?: string;
}

export function generateUserMetadata({ userName, avatarUrl }: Omit<UserMetadataParams, "userId">): MetadataConfig {
  return {
    ...baseMetadata,
    title: `${userName} - 개발자 프로필 | 항해플러스 프론트엔드 7기`,
    description: `${userName}님의 개발자 프로필과 과제 포트폴리오를 확인하세요. 제출한 과제 목록, 합격 현황, GitHub 정보, 기술 성장 과정을 한눈에 살펴보실 수 있습니다.`,
    ogImage: avatarUrl || "/defaultThumbnail.jpg",
    keywords: `${baseMetadata.keywords}, ${userName}, 개발자프로필, 포트폴리오, GitHub프로필, 과제포트폴리오`,
  };
}

export const User = Object.assign(
  () => {
    const { assignments, grade, ...user } = usePageData<
      Omit<HanghaeUser, "assignments"> & { assignments: Record<string, Assignment> }
    >();

    const assignmentList = Object.values(assignments);
    const cardColors = getGradeCardColors(grade);

    return (
      <div className="px-4 py-6">
        <div className="lg:flex lg:gap-8">
          {/* 왼쪽 프로필 영역 */}
          <div className="lg:w-[300px]">
            <UserProfile
              {...user.github}
              name={user.name}
              textColor={cardColors.text}
              textMutedColor={cardColors.textMuted}
              cardBg={cardColors.bg}
              border={cardColors.border}
              shadow={cardColors.shadow}
              grade={grade}
            />
          </div>

          {/* 오른쪽 과제 목록 영역 */}
          <div className="lg:flex-1">
            <UserStats assignments={assignmentList} />
            <AssignmentsList items={assignmentList} />
          </div>
        </div>
      </div>
    );
  },
  {
    Provider: UserProvider,
    generateMetadata: generateUserMetadata,
  },
);
