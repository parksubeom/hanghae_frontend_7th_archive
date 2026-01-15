import { ASSIGNMENT_MOCK, ASSIGNMENT_USERS_TOTAL_STATUS_MOCK, MOCK_PR } from "./mock";

export type GithubPullRequest = typeof MOCK_PR;

export interface GithubUser {
  id: string;
  image: string;
  link: string;
}

export interface GithubApiUsers {
  id: string;
  login: string;
  avatar_url: string;
  url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string;
  location: string | null;
  email: string | null;
  bio: string | null;
  followers: number;
  following: number;
  // 필요한 데이터 타입에서 추출하여 사용
  // gravatar_id: string;
  // node_id: string;
  // followers_url: string;
  // following_url: string;
  // gists_url: string;
  // starred_url: string;
  // subscriptions_url: string;
  // organizations_url: string;
  // repos_url: string;
  // events_url: string;
  // received_events_url: string;
  // type: string;
  // user_view_type: string;
  // site_admin: boolean;
  // hireable: boolean | null;
  // twitter_username: string | null;
  // public_repos: number;
  // public_gists: number;
  // created_at: string;
  // updated_at: string;
}

export type AssignmentResponseType = typeof ASSIGNMENT_MOCK;

export type AssignmentUsersTotalStatusResponseType = typeof ASSIGNMENT_USERS_TOTAL_STATUS_MOCK;

export interface AssignmentResult {
  passed: boolean;
  theBest?: boolean;
  name: string;
  feedback: string;
  assignment: {
    name: string;
    url: string;
  };
}

export interface UserWIthCommonAssignments {
  name: string;
  github: GithubApiUsers;
  assignments: CommonAssignment[];
}

export interface UserWIthCommonAssignmentsWithRanking extends UserWIthCommonAssignments {
  grade: Grade;
  score: number;
}

export type HanghaeUser = UserWIthCommonAssignmentsWithRanking;

export interface CommonAssignment extends Pick<AssignmentResult, "passed" | "theBest"> {
  url: string;
}

export type AssignmentDetail = Pick<GithubPullRequest, "id" | "title" | "body"> & {
  user: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface AppData {
  users: Record<string, HanghaeUser>;
  assignmentDetails: Record<string, AssignmentDetail>;
  feedbacks: Record<string, string>;
}

// 랭킹 시스템 관련 타입들
export type Grade = "블랙" | "레드" | "브라운" | "퍼플" | "블루" | "화이트";
