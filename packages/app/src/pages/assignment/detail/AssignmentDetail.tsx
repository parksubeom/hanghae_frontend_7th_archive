import { type PropsWithChildren, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { type Assignment, PageProvider, usePageData } from "@/providers";
import { useAssignmentById, useFeedback, useUserIdByParam } from "@/features";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { IconGithub } from "@/assets";
import { Card } from "@/components";
import { AssignmentComment } from "./AssignmentComment";
import { baseMetadata, type MetadataConfig } from "@/utils/metadata";
import { formatDate } from "@/lib";

const AssignmentDetailProvider = ({ children }: PropsWithChildren) => {
  const { assignmentId = "" } = useParams<{ assignmentId: string }>();
  const userId = useUserIdByParam();
  const assignment = useAssignmentById(userId, assignmentId);

  const title = assignment ? (
    <>
      <Link to={`/@${assignment.user}/`}>{assignment.user} 님의 상세페이지</Link> ＞ {assignment.title}
    </>
  ) : (
    "과제 상세페이지"
  );

  return (
    <PageProvider title={title} data={assignment}>
      {children}
    </PageProvider>
  );
};

export interface AssignmentMetadataParams {
  assignmentId: string;
  assignmentTitle: string;
  userName: string;
}

export function generateAssignmentDetailMetadata({
  assignmentTitle,
  userName,
}: AssignmentMetadataParams): MetadataConfig {
  return {
    ...baseMetadata,
    title: `${assignmentTitle} - ${userName} | 항해플러스 프론트엔드 7기`,
    description: ` [항해플러스 프론트엔드 7기] ${userName}님이 제출한 ${assignmentTitle} 과제를 확인하세요. 코드 구현, 문제 해결 과정, 피드백 내용을 상세히 살펴볼 수 있습니다.`,
    ogImage: "/defaultThumbnail.jpg",
    keywords: `${baseMetadata.keywords}, ${userName}, ${assignmentTitle}, 과제상세, 코드리뷰, 피드백, Pull Request`,
  };
}

export const AssignmentDetail = Object.assign(
  () => {
    const data = usePageData<Assignment>();
    const feedback = useFeedback(data.url);

    // [수정 1] 마운트 여부를 확인하는 상태 추가
    const [isMounted, setIsMounted] = useState(false);

    // [수정 2] 컴포넌트가 브라우저에 마운트된 직후 true로 변경
    useEffect(() => {
      setIsMounted(true);
    }, []);

    return (
      <div>
        <div className="card-wrap">
          <Card className="mb-6 p-6 border border-gray-700 bg-gray-800 rounded-lg">
            <a href={data.url} target="_blank">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <IconGithub fill="white" className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white truncate">{data.title}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>by {data.user}</span>
                    <span suppressHydrationWarning>{formatDate(data.createdAt)}</span>
                  </div>
                </div>
              </div>
            </a>
          </Card>
        </div>

        {/* [수정 3] MarkdownPreview를 isMounted가 true일 때만 렌더링 */}
        <div className="overflow-auto">
          {isMounted ? (
            <MarkdownPreview
              source={data.body}
              className="p-6 max-w-full"
              wrapperElement={{
                "data-color-mode": "dark",
              }}
              style={{
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
            />
          ) : (
            // 로딩 중이거나 서버 렌더링 시 보여줄 placeholder (높이 확보용)
            <div className="p-6 text-gray-500">Loading content...</div>
          )}
        </div>

        {/* [수정 4] 피드백 영역도 동일하게 처리 */}
        <div className="overflow-auto mt-9">
          {isMounted ? (
            <MarkdownPreview
              source={`## 과제 피드백\n${feedback}`}
              className="p-6 max-w-full"
              wrapperElement={{
                "data-color-mode": "dark",
              }}
              style={{
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
            />
          ) : null}
        </div>

        <AssignmentComment className="mt-9" />
      </div>
    );
  },
  {
    Provider: AssignmentDetailProvider,
    generateMetadata: generateAssignmentDetailMetadata,
  },
);
