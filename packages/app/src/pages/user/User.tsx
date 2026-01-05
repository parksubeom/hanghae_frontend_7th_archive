import type { GithubApiUsers, HanghaeUser } from "@hanghae-plus/domain";
import { type PropsWithChildren, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Calendar, Clock, Github, StarIcon } from "lucide-react";
import { useUserIdByParam, useUserWithAssignments } from "@/features";
import { Badge, Card } from "@/components";
import { calculateReadingTime, formatDate } from "@/lib";
import { type Assignment, PageProvider, usePageData } from "@/providers";
import { baseMetadata, type MetadataConfig } from "@/utils/metadata";

const UserProfile = ({
  login,
  name,
  blog,
  bio,
  followers,
  following,
  avatar_url,
  html_url,
}: GithubApiUsers & { name: string }) => {
  return (
    <div className="sticky top-6">
      <Card className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* 프로필 이미지 */}
          <a href={html_url} target="_blank" rel="noreferrer">
            <div className="relative">
              <div className="w-48 h-48 rounded-full overflow-hidden ring-4 ring-orange-500/30">
                <img src={avatar_url} alt={login} className="w-full h-full object-cover" />
              </div>
            </div>
          </a>

          {/* 사용자 정보 */}
          <div className="w-full">
            <h3 className="text-2xl font-bold text-white mb-2">{login}</h3>
            <div className="space-y-2">
              <p className="text-slate-300">{name}</p>
              {bio && <p>{bio}</p>}
              {blog && (
                <a href={blog} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  {blog}
                </a>
              )}
              <div className="flex justify-center space-x-4 text-slate-400">
                <div className="flex flex-col items-center">
                  <span>팔로워</span>
                  <span className="font-semibold text-white">{followers}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span>팔로잉</span>
                  <span className="font-semibold text-white">{following}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
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
                  onClick={(e: any) => {
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
    const { assignments, ...user } = usePageData<
      Omit<HanghaeUser, "assignments"> & { assignments: Record<string, Assignment> }
    >();

    const assignmentList = Object.values(assignments);

    return (
      <div className="px-4 py-6">
        <div className="lg:flex lg:gap-8">
          <div className="lg:w-[300px]">
            <UserProfile {...user.github} name={user.name} />
          </div>
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
