import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GithubService } from './github/github.service';
import * as fs from 'fs';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import {
  AssignmentDetail,
  AssignmentResult,
  GithubApiUsers,
  GithubPullRequest,
  HanghaeUser,
  UserWIthCommonAssignments,
} from '@hanghae-plus/domain';
import { HanghaeService } from './hanghae/hanghae.service';
import { addRankingToUsers } from './utils/ranking.utils';
import { flatMap, flow, keyBy, omit, uniq } from 'es-toolkit/compat';

// -------------------------------------------------------------
// [해결책 1] Hydration 에러 해결을 위한 빌드 시간대 고정 (KST)
// -------------------------------------------------------------
process.env.TZ = 'Asia/Seoul';

const organization = 'hanghae-plus';

const repos = [
  'front_7th_chapter1-1',
  'front_7th_chapter1-2',
  'front_7th_chapter1-3',
  'front_7th_chapter2-1',
  'front_7th_chapter2-2',
  'front_7th_chapter3-1',
  'front_7th_chapter3-2',
  'front_7th_chapter3-3',
  'front_7th_chapter4-1',
  'front_7th_chapter4-2',
];

// -----------------------------------------------------------------------------
// [1인자 솔루션] 수동 매핑 테이블 (치트키)
// URL 매칭이 실패했을 때, 이 명단을 보고 GitHub ID를 강제로 찾습니다.
// -----------------------------------------------------------------------------
const manualMatchingMap: Record<string, string> = {
  // 1팀
  김민석: 'kju1018',
  강승훈: 'seunghoonKang',
  안재현: 'JaeHyunGround',
  박용태: 'piggggggggy',
  도희정: 'dev-learning1',
  천진아: 'totter15',

  // 2팀
  권지현: 'kwonjihyeon-dev',
  이정민: 'LEE-jm96',
  양진성: 'jinseoIT',
  정나리: 'naringst',
  전희재: 'junijaei',
  김우정: 'kimfriendship',
  고다솜: 'ds92ko',

  // 3팀
  김준모: 'jumoooo',
  주민수: 'Thomas97-J',
  이윤지: 'yoonhihi97',
  김대현: 'daehyunk1m',
  남은주: 'amorpaty',
  박형우: 'hyeongwoo94',
  한세준: 'hansejun',

  // 4팀
  이예인: 'yein1ee',
  한선민: '1lmean',
  박지영: 'youngH02',
  김도현: 'kimzeze',
  안소은: 'ahnsummer',
  정한슬: 'hanseul524',
  곽정원: 'joshuayeyo',

  // 5팀
  김성민: 'devmineee',
  오새듬: 'Toeam',
  오태준: 'taejun0',
  손승현: 'sonsonsh1125',
  김채영: 'rlacodud',
  박수범: 'parksubeom',
  진재윤: 'jy0813',

  // 6팀
  현채은: 'chen4023',
  박창수: 'changsu1993',
  김소리: 'milmilkim',
  김현우: 'lecto17',
  전이진: 'im-binary',
  노유리: 'nohyr',

  // 7팀
  김민지: 'minjeeki',
  윤지훈: 'Jihoon-Yoon96',
  권연욱: 'grappe96',
  황준태: 'jthw1005',
  박희정: 'Pheejung',
  이현지: 'Leehyunji0715',
  신수빈: 'ongsim0629',
};
// -----------------------------------------------------------------------------

const dataDir = path.join(__dirname, '../../../docs/data');

// www 제거, 뒤쪽 슬래시 제거, 공백 제거
const normalizeUrl = (url: string | undefined): string => {
  if (!url) return '';
  let cleanUrl = url.trim(); // 1. 공백 제거
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1); // 2. Trailing slash 제거
  }
  cleanUrl = cleanUrl.replace('www.github.com', 'github.com'); // 3. 도메인 통일
  return cleanUrl;
};

const createApp = (() => {
  let app: INestApplication | null = null;
  return async (): Promise<INestApplication> => {
    if (app === null) {
      app = await NestFactory.create(AppModule);
    }
    return app;
  };
})();

type App = Awaited<ReturnType<typeof createApp>>;

const generatePulls = async (app: App) => {
  // 이미 파일이 있으면 건너뛰는 로직 (데이터 갱신이 필요하면 폴더 삭제 후 실행 추천)
  const filteredRepos = repos.filter(
    (repo) => !fs.existsSync(path.join(dataDir, `${repo}/pulls.json`)),
  );
  const githubService = app.get(GithubService);

  const results = await Promise.all(
    filteredRepos.map((repo) =>
      githubService.getPulls(`${organization}/${repo}`),
    ),
  );

  results.forEach((result, index) => {
    const repo = filteredRepos[index];
    const dirname = path.join(dataDir, repo);
    const filename = path.join(dirname, `/pulls.json`);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname);
    }
    fs.writeFileSync(filename, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`${repo} Counts: `, result.length);
  });
};

const generateUsers = async (app: App) => {
  const githubProfilesFilename = path.join(dataDir, 'github-profiles.json');
  const githubService = app.get(GithubService);

  if (fs.existsSync(githubProfilesFilename)) {
    console.log('github-profiles.json already exists. Skipping...');
    return;
  }

  const pulls = repos.map(
    (repo) =>
      JSON.parse(
        fs.readFileSync(path.join(dataDir, `${repo}/pulls.json`), 'utf-8'),
      ) as GithubPullRequest,
  );

  const userIds = uniq(pulls.flat().map((v) => githubService.getUser(v).id));

  const githubUsers = await Promise.all(
    userIds.map(async (id: string) => {
      console.log(`Fetching user: ${id}`);
      return githubService.getGithubUser(id);
    }),
  );

  fs.writeFileSync(
    githubProfilesFilename,
    JSON.stringify(githubUsers, null, 2),
    'utf-8',
  );
};

const generateUserAssignmentInfos = async (app: App) => {
  const filename = path.join(dataDir, 'user-assignment-infos.json');
  const hanghaeService = app.get(HanghaeService);

  const assignments = await hanghaeService.getAssignmentResults();

  fs.writeFileSync(filename, JSON.stringify(assignments, null, 2), 'utf-8');
};

const createUserWithCommonAssignments = (
  pull: GithubPullRequest,
  info: AssignmentResult,
  githubUsers: GithubApiUsers | null,
): UserWIthCommonAssignments => ({
  name: info.name,
  github: {
    name: githubUsers?.name ?? info.name,
    id: githubUsers?.id ?? pull.user.id.toString(),
    login: githubUsers?.login ?? pull.user.login,
    avatar_url: githubUsers?.avatar_url ?? pull.user.avatar_url,
    html_url: githubUsers?.html_url ?? pull.user.html_url,
    url: githubUsers?.url ?? '',
    company: githubUsers?.company ?? '',
    blog: githubUsers?.blog ?? '',
    location: githubUsers?.location ?? '',
    email: githubUsers?.email ?? '',
    bio: githubUsers?.bio ?? '',
    followers: githubUsers?.followers ?? 0,
    following: githubUsers?.following ?? 0,
  },
  assignments: [],
});

// 🔍 디버깅 정보를 마크다운 형식으로 생성
const generateDebugMarkdown = (
  debugInfo: Array<{
    name: string;
    assignmentName: string;
    originalUrl: string;
    normalizedUrl: string;
    pullExists: boolean;
    prNumber?: string;
    similarUrls?: Array<{ url: string; user: string }>;
    matchedGithubId?: string;
    searchKeyword?: string;
    userPullsCount?: number;
    matchingPullsCount?: number;
    allUserPulls?: Array<{ url: string; hasKeyword: boolean }>;
    status: 'success' | 'keyword_fail' | 'partial_fail' | 'complete_fail';
    matchedUrl?: string;
  }>,
): string => {
  let md = '# PR 매칭 디버깅 결과\n\n';
  md += `생성 시간: ${new Date().toLocaleString('ko-KR')}\n\n`;
  md += `총 ${debugInfo.length}건의 매칭 시도\n\n`;

  // 요약 테이블
  const statusCounts = debugInfo.reduce(
    (acc, info) => {
      acc[info.status] = (acc[info.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  md += '## 요약\n\n';
  md += '| 상태 | 개수 |\n';
  md += '|------|------|\n';
  md += `| ✅ 성공 | ${statusCounts.success || 0} |\n`;
  md += `| ❌ 키워드 추출 실패 | ${statusCounts.keyword_fail || 0} |\n`;
  md += `| ⚠️ 부분 실패 (ID는 찾았으나 PR 없음) | ${statusCounts.partial_fail || 0} |\n`;
  md += `| 💀 완전 실패 (ID 매핑 실패) | ${statusCounts.complete_fail || 0} |\n\n`;

  // 상세 테이블
  md += '## 상세 정보\n\n';
  md +=
    '| 이름 | 과제명 | 원본 URL | 정규화된 URL | pulls 객체 존재 | PR 번호 | GitHub ID | 검색 키워드 | 사용자 PR 개수 | 키워드 매칭 PR 개수 | 상태 | 매칭된 URL |\n';
  md +=
    '|------|--------|----------|--------------|----------------|---------|-----------|-------------|---------------|-------------------|------|------------|\n';

  debugInfo.forEach((info) => {
    const statusEmoji =
      info.status === 'success'
        ? '✅'
        : info.status === 'keyword_fail'
          ? '❌'
          : info.status === 'partial_fail'
            ? '⚠️'
            : '💀';
    const statusText =
      info.status === 'success'
        ? '성공'
        : info.status === 'keyword_fail'
          ? '키워드 실패'
          : info.status === 'partial_fail'
            ? '부분 실패'
            : '완전 실패';

    md += `| ${info.name} | ${info.assignmentName} | [${info.originalUrl}](${info.originalUrl}) | ${info.normalizedUrl} | ${info.pullExists ? '✅' : '❌'} | ${info.prNumber || '-'} | ${info.matchedGithubId || '-'} | ${info.searchKeyword || '-'} | ${info.userPullsCount ?? '-'} | ${info.matchingPullsCount ?? '-'} | ${statusEmoji} ${statusText} | ${info.matchedUrl ? `[링크](${info.matchedUrl})` : '-'} |\n`;
  });

  // 각 사용자의 PR 목록
  md += '\n## 사용자별 PR 목록\n\n';
  const userPullsMap = new Map<string, typeof debugInfo>();
  debugInfo.forEach((info) => {
    if (info.matchedGithubId && info.allUserPulls) {
      if (!userPullsMap.has(info.matchedGithubId)) {
        userPullsMap.set(info.matchedGithubId, []);
      }
      userPullsMap.get(info.matchedGithubId)!.push(info);
    }
  });

  userPullsMap.forEach((infos, githubId) => {
    const firstInfo = infos[0];
    if (firstInfo.allUserPulls && firstInfo.allUserPulls.length > 0) {
      md += `### ${firstInfo.name} (${githubId})\n\n`;
      md += `검색 키워드: \`${firstInfo.searchKeyword}\`\n\n`;
      md += '| # | PR URL | 키워드 포함 |\n';
      md += '|---|--------|-------------|\n';
      firstInfo.allUserPulls.forEach((pull, idx) => {
        md += `| ${idx + 1} | [${pull.url}](${pull.url}) | ${pull.hasKeyword ? '✅' : '❌'} |\n`;
      });
      md += '\n';
    }
  });

  // 같은 PR 번호를 가진 다른 URL들
  const similarUrlsSection = debugInfo.filter(
    (info) => info.similarUrls && info.similarUrls.length > 0,
  );
  if (similarUrlsSection.length > 0) {
    md += '## 같은 PR 번호를 가진 다른 URL들\n\n';
    similarUrlsSection.forEach((info) => {
      md += `### ${info.name} - PR #${info.prNumber}\n\n`;
      md += `원본 URL: ${info.originalUrl}\n\n`;
      md += '| URL | 사용자 |\n';
      md += '|-----|--------|\n';
      info.similarUrls!.forEach((similar) => {
        md += `| [${similar.url}](${similar.url}) | ${similar.user} |\n`;
      });
      md += '\n';
    });
  }

  return md;
};

// 🔍 Chapter 4-1 전용 마크다운 생성
const generateChapter4_1Markdown = (
  debugInfo: Array<{
    name: string;
    assignmentName: string;
    originalUrl: string;
    normalizedUrl: string;
    pullExists: boolean;
    prNumber?: string;
    similarUrls?: Array<{ url: string; user: string }>;
    matchedGithubId?: string;
    searchKeyword?: string;
    userPullsCount?: number;
    matchingPullsCount?: number;
    allUserPulls?: Array<{ url: string; hasKeyword: boolean }>;
    status: 'success' | 'keyword_fail' | 'partial_fail' | 'complete_fail';
    matchedUrl?: string;
  }>,
): string => {
  let md = '# Chapter 4-1 PR 매칭 디버깅 결과\n\n';
  md += `생성 시간: ${new Date().toLocaleString('ko-KR')}\n\n`;
  md += `총 ${debugInfo.length}건의 매칭 시도\n\n`;

  // 요약 테이블
  const statusCounts = debugInfo.reduce(
    (acc, info) => {
      acc[info.status] = (acc[info.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  md += '## 요약\n\n';
  md += '| 상태 | 개수 |\n';
  md += '|------|------|\n';
  md += `| ✅ 성공 | ${statusCounts.success || 0} |\n`;
  md += `| ❌ 키워드 추출 실패 | ${statusCounts.keyword_fail || 0} |\n`;
  md += `| ⚠️ 부분 실패 (ID는 찾았으나 PR 없음) | ${statusCounts.partial_fail || 0} |\n`;
  md += `| 💀 완전 실패 (ID 매핑 실패) | ${statusCounts.complete_fail || 0} |\n\n`;

  // LMS에서 넘어온 원본 데이터 테이블
  md += '## LMS에서 넘어온 원본 PR 데이터\n\n';
  md +=
    '| 이름 | 과제명 | 원본 URL (LMS) | 정규화된 URL | pulls 객체 존재 | PR 번호 | GitHub ID | 상태 |\n';
  md +=
    '|------|--------|----------------|--------------|----------------|---------|-----------|------|\n';

  debugInfo.forEach((info) => {
    const statusEmoji =
      info.status === 'success'
        ? '✅'
        : info.status === 'keyword_fail'
          ? '❌'
          : info.status === 'partial_fail'
            ? '⚠️'
            : '💀';
    const statusText =
      info.status === 'success'
        ? '성공'
        : info.status === 'keyword_fail'
          ? '키워드 실패'
          : info.status === 'partial_fail'
            ? '부분 실패'
            : '완전 실패';

    md += `| ${info.name} | ${info.assignmentName} | [${info.originalUrl}](${info.originalUrl}) | ${info.normalizedUrl} | ${info.pullExists ? '✅' : '❌'} | ${info.prNumber || '-'} | ${info.matchedGithubId || '-'} | ${statusEmoji} ${statusText} |\n`;
  });

  // 매칭 결과 상세
  md += '\n## 매칭 결과 상세\n\n';
  md +=
    '| 이름 | GitHub ID | 검색 키워드 | 사용자 PR 개수 | 키워드 매칭 PR 개수 | 매칭된 URL |\n';
  md +=
    '|------|-----------|-------------|---------------|-------------------|------------|\n';

  debugInfo.forEach((info) => {
    md += `| ${info.name} | ${info.matchedGithubId || '-'} | ${info.searchKeyword || '-'} | ${info.userPullsCount ?? '-'} | ${info.matchingPullsCount ?? '-'} | ${info.matchedUrl ? `[링크](${info.matchedUrl})` : '-'} |\n`;
  });

  // 각 사용자의 PR 목록 (chapter4-1 관련만)
  md += '\n## 사용자별 PR 목록 (Chapter 4-1 관련)\n\n';
  const userPullsMap = new Map<string, typeof debugInfo>();
  debugInfo.forEach((info) => {
    if (info.matchedGithubId && info.allUserPulls) {
      if (!userPullsMap.has(info.matchedGithubId)) {
        userPullsMap.set(info.matchedGithubId, []);
      }
      userPullsMap.get(info.matchedGithubId)!.push(info);
    }
  });

  userPullsMap.forEach((infos, githubId) => {
    const firstInfo = infos[0];
    if (firstInfo.allUserPulls && firstInfo.allUserPulls.length > 0) {
      md += `### ${firstInfo.name} (${githubId})\n\n`;
      md += `검색 키워드: \`${firstInfo.searchKeyword}\`\n\n`;
      md += `**LMS 원본 URL**: [${firstInfo.originalUrl}](${firstInfo.originalUrl})\n\n`;
      md += '| # | PR URL | 키워드 포함 |\n';
      md += '|---|--------|-------------|\n';
      firstInfo.allUserPulls.forEach((pull, idx) => {
        md += `| ${idx + 1} | [${pull.url}](${pull.url}) | ${pull.hasKeyword ? '✅' : '❌'} |\n`;
      });
      md += '\n';
    }
  });

  // 같은 PR 번호를 가진 다른 URL들
  const similarUrlsSection = debugInfo.filter(
    (info) => info.similarUrls && info.similarUrls.length > 0,
  );
  if (similarUrlsSection.length > 0) {
    md += '## 같은 PR 번호를 가진 다른 URL들\n\n';
    md += '> 💡 **중요**: 아래는 같은 PR 번호를 가진 다른 repo의 PR들입니다.\n';
    md +=
      '> **LMS 원본 URL이 pulls 객체에 없다는 것은, 크롤러가 GitHub API에서 해당 PR을 수집하지 못했다는 의미입니다.**\n';
    md += '> 가능한 원인:\n';
    md +=
      '> 1. PR이 이미 closed/merged 상태이고 크롤러가 `state: "all"`로 수집하지 못함 (이미 수정됨)\n';
    md += '> 2. PR이 실제로 존재하지 않거나 삭제됨\n';
    md += '> 3. 크롤러 실행 시점에 해당 PR이 아직 생성되지 않았음\n\n';
    similarUrlsSection.forEach((info) => {
      md += `### ${info.name} - PR #${info.prNumber}\n\n`;
      md += `**LMS 원본 URL**: [${info.originalUrl}](${info.originalUrl})\n\n`;
      md += `**정규화된 URL**: ${info.normalizedUrl}\n\n`;
      md += `**pulls 객체 존재**: ${info.pullExists ? '✅ 있음' : '❌ 없음'}\n\n`;
      md += `**같은 PR 번호를 가진 다른 repo의 PR들** (크롤러가 수집한 PR):\n\n`;
      md += '| URL | 사용자 |\n';
      md += '|-----|--------|\n';
      if (info.similarUrls && info.similarUrls.length > 0) {
        info.similarUrls.forEach((similar) => {
          const isSameRepo =
            similar.url.includes('chapter4-1') &&
            info.originalUrl.includes('chapter4-1');
          md += `| [${similar.url}](${similar.url}) | ${similar.user} ${isSameRepo ? '⭐ (같은 repo)' : ''} |\n`;
        });
      } else {
        md += '| 없음 | - |\n';
      }
      md += '\n';
    });
  }

  return md;
};

const generateAppData = () => {
  const assignmentInfos = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'user-assignment-infos.json'), 'utf-8'),
  ) as AssignmentResult[];

  const githubProfiles = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'github-profiles.json'), 'utf-8'),
  ) as GithubApiUsers[];

  const githubUsersMap = keyBy(githubProfiles, 'login');

  // (GitHub API가 주는 URL과 LMS URL의 포맷을 일치시키기 위함)
  const pulls = flow(
    (value: typeof repos) =>
      flatMap(
        value,
        (repo) =>
          JSON.parse(
            fs.readFileSync(path.join(dataDir, `${repo}/pulls.json`), 'utf-8'),
          ) as GithubPullRequest,
      ),
    (value) => keyBy(value, (pr) => normalizeUrl(pr.html_url)),
  )(repos);

  console.log('--- Debugging Start ---');
  console.log('👉 LMS 데이터 개수:', assignmentInfos.length);
  if (assignmentInfos.length > 0) {
    console.log('👉 LMS 데이터 샘플(첫번째):', assignmentInfos[0]);
  }

  const pullKeys = Object.keys(pulls);
  console.log('👉 GitHub PR 개수 (URL 기준):', pullKeys.length);
  // console.log('👉 GitHub URL 샘플 5개:', pullKeys.slice(0, 5));
  console.log('-----------------------');

  const assignmentDetails = Object.values(pulls).reduce(
    (acc, pull) => ({
      ...acc,
      [pull.html_url]: {
        id: pull.id,
        user: pull.user.login,
        title: pull.title,
        body: pull.body,
        createdAt: new Date(pull.created_at),
        updatedAt: new Date(pull.updated_at),
        url: pull.html_url,
      },
    }),
    {} as Record<string, AssignmentDetail>,
  );

  const feedbacks = assignmentInfos.reduce(
    (acc, { assignment, feedback }) => ({
      ...acc,
      ...(assignment.url && feedback && { [assignment.url]: feedback }),
    }),
    {} as Record<string, { name: string; feedback: string }>,
  );

  type GroupedStep = {
    name: string;
    url: string;
    originalSteps: AssignmentResult[];
  };

  // 🏆 Best Practice PR URL 리스트 (LMS에 반영되지 않은 경우를 위한 수동 설정)
  const bestPracticeUrls = new Set(
    [
      // 1주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter1-1/pull/23', // 진재윤
      'https://github.com/hanghae-plus/front_7th_chapter1-1/pull/13', // 한세준
      'https://github.com/hanghae-plus/front_7th_chapter1-1/pull/1', // 곽정원
      // 2주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter1-2/pull/63', // 김대현
      'https://github.com/hanghae-plus/front_7th_chapter1-2/pull/77', // 안소은
      // 3주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter1-3/pull/33', // 박용태
      'https://github.com/hanghae-plus/front_7th_chapter1-3/pull/28', // 안재현
      'https://github.com/hanghae-plus/front_7th_chapter1-3/pull/16', // 고다솜
      'https://github.com/hanghae-plus/front_7th_chapter1-3/pull/17', // 김준모
      'https://github.com/hanghae-plus/front_7th_chapter1-3/pull/52', // 김채영
      'https://github.com/hanghae-plus/front_7th_chapter1-3/pull/25', // 진재윤
      'https://github.com/hanghae-plus/front_7th_chapter1-3/pull/21', // 김소리
      // 4주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter2-1/pull/10', // 정나리
      'https://github.com/hanghae-plus/front_7th_chapter2-1/pull/26', // 한세준
      'https://github.com/hanghae-plus/front_7th_chapter2-1/pull/45', // 박지영
      'https://github.com/hanghae-plus/front_7th_chapter2-1/pull/36', // 안소은
      'https://github.com/hanghae-plus/front_7th_chapter2-1/pull/12', // 김채영
      'https://github.com/hanghae-plus/front_7th_chapter2-1/pull/38', // 진재윤
      'https://github.com/hanghae-plus/front_7th_chapter2-1/pull/4', // 김소리
      'https://github.com/hanghae-plus/front_7th_chapter2-1/pull/6', // 전이진
      // 5주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/9', // 박용태
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/7', // 천진아
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/39', // 고다솜
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/6', // 양진성
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/3', // 전희재
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/5', // 정나리
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/54', // 김준모
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/28', // 박형우
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/27', // 한세준
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/48', // 김도현
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/50', // 박지영
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/41', // 안소은
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/30', // 김채영
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/22', // 박수범
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/24', // 김소리
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/20', // 김현우
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/4', // 노유리
      'https://github.com/hanghae-plus/front_7th_chapter2-2/pull/17', // 전이진
      // 6주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter3-1/pull/37', // 박용태
      'https://github.com/hanghae-plus/front_7th_chapter3-1/pull/15', // 천진아
      'https://github.com/hanghae-plus/front_7th_chapter3-1/pull/25', // 고다솜
      'https://github.com/hanghae-plus/front_7th_chapter3-1/pull/22', // 전희재
      'https://github.com/hanghae-plus/front_7th_chapter3-1/pull/16', // 안소은
      'https://github.com/hanghae-plus/front_7th_chapter3-1/pull/32', // 황준태
      // 7주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter3-2/pull/39', // 박용태
      'https://github.com/hanghae-plus/front_7th_chapter3-2/pull/12', // 양진성
      'https://github.com/hanghae-plus/front_7th_chapter3-2/pull/22', // 안소은
      'https://github.com/hanghae-plus/front_7th_chapter3-2/pull/35', // 박지영
      'https://github.com/hanghae-plus/front_7th_chapter3-2/pull/3', // 김채영
      'https://github.com/hanghae-plus/front_7th_chapter3-2/pull/31', // 박수범
      'https://github.com/hanghae-plus/front_7th_chapter3-2/pull/17', // 노유리
      // 8주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter3-3/pull/4', // 박수범
      // 9주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter4-1/pull/1', // 전희재
      'https://github.com/hanghae-plus/front_7th_chapter4-1/pull/20', // 한세준
      'https://github.com/hanghae-plus/front_7th_chapter4-1/pull/8', // 김채영
      'https://github.com/hanghae-plus/front_7th_chapter4-1/pull/24', // 박수범
      'https://github.com/hanghae-plus/front_7th_chapter4-1/pull/18', // 진재윤
      'https://github.com/hanghae-plus/front_7th_chapter4-1/pull/27', // 황준태
      // 10주차 BP
      'https://github.com/hanghae-plus/front_7th_chapter4-2/pull/14', // 천진아
      'https://github.com/hanghae-plus/front_7th_chapter4-2/pull/4', // 고다솜
      'https://github.com/hanghae-plus/front_7th_chapter4-2/pull/3', // 김채영
      'https://github.com/hanghae-plus/front_7th_chapter4-2/pull/6', // 박수범
      'https://github.com/hanghae-plus/front_7th_chapter4-2/pull/12', // 진재윤
    ].map((url) => normalizeUrl(url)),
  ); // 정규화된 URL로 변환

  // 1. LMS 과제 정보를 (사용자 이름 + PR URL) 기준으로 그룹화
  const groupedAssignmentInfos: Record<string, GroupedStep> = {};

  for (const info of assignmentInfos) {
    const normalizedUrl = normalizeUrl(info.assignment.url);
    if (!normalizedUrl) continue; // LMS URL이 없는 경우는 제외

    // 키: 사용자 이름 + 정규화된 URL
    const key = `${info.name}_${normalizedUrl}`;

    if (!groupedAssignmentInfos[key]) {
      groupedAssignmentInfos[key] = {
        name: info.name,
        url: normalizedUrl,
        originalSteps: [],
      };
    }
    groupedAssignmentInfos[key].originalSteps.push(info);
  }

  // 2. 각 그룹(PR)을 순회하며 '모든 스텝 통과' 여부를 검증하고 대표 레코드 생성
  const aggregatedAssignmentInfos: AssignmentResult[] = [];

  for (const group of Object.values(groupedAssignmentInfos)) {
    // 통과 기준 검증: 모든 스텝(STEP 01, 02 등)이 passed: true 여야 최종 passed: true
    const isChapterPassed = group.originalSteps.every((step) => step.passed);

    // 챕터 이름 생성: 모든 스텝 이름을 합쳐서 하나의 챕터 이름으로 만듦
    const chapterName = group.originalSteps
      .map((step) => step.assignment.name)
      .join(' & ');

    // 플래그 통합 (하나라도 true면 true)
    const isTheBest = group.originalSteps.some((step) => (step as any).theBest);
    const isPerfect = group.originalSteps.some((step) => (step as any).perfect);
    const isPassMultiple = group.originalSteps.some(
      (step) => (step as any).passMultiple,
    );

    // 다음 로직에서 사용할 '대표' 레코드 생성
    const representativeInfo = group.originalSteps[0];

    // 🏆 Best Practice URL 체크 (LMS에 반영되지 않은 경우를 위한 수동 설정)
    const normalizedGroupUrl = normalizeUrl(group.url);
    const isBestPracticeUrl = bestPracticeUrls.has(normalizedGroupUrl);

    aggregatedAssignmentInfos.push({
      ...representativeInfo,
      passed: isChapterPassed,
      theBest: isBestPracticeUrl || isTheBest, // Best Practice URL이면 true로 설정
      perfect: isPerfect,
      passMultiple: isPassMultiple,
      assignment: {
        ...representativeInfo.assignment,
        name: chapterName, // 챕터 이름으로 통합
        url: group.url, // 정규화된 URL
      },
    } as AssignmentResult);
  }

  const getRepoKeyword = (assignmentName: string): string => {
    // 공백 제거 및 소문자 변환
    const cleanName = assignmentName.replace(/\s/g, '').toLowerCase();

    // STEP 번호를 추출하는 정규식 (STEPxx 형태)
    const match = cleanName.match(/step(\d+)/);

    if (match) {
      const stepNumber = parseInt(match[1], 10);

      // 1주차 (STEP 1, 2)
      if (stepNumber <= 2) return 'chapter1-1';
      // 2주차 (STEP 3, 4)
      if (stepNumber <= 4) return 'chapter1-2';
      // 3주차 (STEP 5, 6)
      if (stepNumber <= 6) return 'chapter1-3';
      // 4주차 (STEP 7, 8)
      if (stepNumber <= 8) return 'chapter2-1';
      // 5주차 (STEP 9, 10)
      if (stepNumber <= 10) return 'chapter2-2';
      // 6주차 (STEP 11, 12)
      if (stepNumber <= 12) return 'chapter3-1';
      // 7주차 (STEP 13, 14)
      if (stepNumber <= 14) return 'chapter3-2';
      // 8주차 (STEP 15, 16)
      if (stepNumber <= 16) return 'chapter3-3';
      // 9주차 (STEP 17, 18)
      if (stepNumber <= 18) return 'chapter4-1';
      // 10주차 (STEP 19, 20)
      if (stepNumber <= 20) return 'chapter4-2';
    }

    return '';
  };
  // -------------------------------------------------------------

  // 🔍 디버깅 정보를 수집하기 위한 배열
  const debugInfo: Array<{
    name: string;
    assignmentName: string;
    originalUrl: string;
    normalizedUrl: string;
    pullExists: boolean;
    prNumber?: string;
    similarUrls?: Array<{ url: string; user: string }>;
    matchedGithubId?: string;
    searchKeyword?: string;
    userPullsCount?: number;
    matchingPullsCount?: number;
    allUserPulls?: Array<{ url: string; hasKeyword: boolean }>;
    status: 'success' | 'keyword_fail' | 'partial_fail' | 'complete_fail';
    matchedUrl?: string;
  }> = [];

  // 핵심 교체: assignmentInfos 대신 aggregatedAssignmentInfos를 사용하여 reduce 시작
  const userWithCommonAssignments = aggregatedAssignmentInfos.reduce(
    (acc, info) => {
      let lmsUrl = normalizeUrl(info.assignment.url);
      const pull = pulls[lmsUrl];

      if (!pull) {
        const pullExists = pulls[lmsUrl] !== undefined;
        const urlMatch = lmsUrl.match(/\/pull\/(\d+)$/);
        const prNumber = urlMatch ? urlMatch[1] : undefined;
        const similarUrls = prNumber
          ? Object.keys(pulls)
              .filter((url) => url.includes(`/pull/${prNumber}`))
              .map((url) => ({
                url,
                user: pulls[url]?.user?.login || '알 수 없음',
              }))
          : undefined;

        // 🔍 같은 PR 번호를 가진 URL 중에서 정확히 같은 repo의 PR이 있는지 확인
        const exactRepoMatch = prNumber
          ? Object.keys(pulls).find((url) => {
              const repoMatch = lmsUrl.match(
                /\/front_7th_(chapter\d+-\d+)\/pull\//,
              );
              if (!repoMatch) return false;
              const repoName = repoMatch[1];
              return url.includes(`/front_7th_${repoName}/pull/${prNumber}`);
            })
          : undefined;

        let matchedGithubId = manualMatchingMap[info.name];
        if (!matchedGithubId) {
          const profile = githubProfiles.find((p) => p.name === info.name);
          if (profile) matchedGithubId = profile.login;
        }

        const debugEntry: (typeof debugInfo)[0] = {
          name: info.name,
          assignmentName: info.assignment.name,
          originalUrl: info.assignment.url,
          normalizedUrl: lmsUrl,
          pullExists,
          prNumber,
          similarUrls: exactRepoMatch
            ? [
                ...(similarUrls || []),
                {
                  url: exactRepoMatch,
                  user: pulls[exactRepoMatch]?.user?.login || '알 수 없음',
                },
              ]
            : similarUrls,
          status: 'complete_fail',
        };

        if (matchedGithubId) {
          debugEntry.matchedGithubId = matchedGithubId;
          const searchKeyword = getRepoKeyword(info.assignment.name);

          if (!searchKeyword) {
            debugEntry.status = 'keyword_fail';
            debugInfo.push(debugEntry);
            return acc;
          }

          debugEntry.searchKeyword = searchKeyword;
          const userPulls = Object.values(pulls).filter(
            (p) => p.user.login === matchedGithubId,
          );
          debugEntry.userPullsCount = userPulls.length;
          debugEntry.allUserPulls = userPulls.map((p) => ({
            url: p.html_url,
            hasKeyword: p.html_url.toLowerCase().includes(searchKeyword),
          }));

          const recoveredPull = Object.values(pulls).find((p) => {
            const isSameUser = p.user.login === matchedGithubId;
            const urlLower = p.html_url.toLowerCase();
            const isSameAssignment = urlLower.includes(searchKeyword);
            return isSameUser && isSameAssignment;
          });

          if (recoveredPull) {
            debugEntry.status = 'success';
            debugEntry.matchedUrl = recoveredPull.html_url;

            const value: HanghaeUser =
              acc[recoveredPull.user.login] ??
              createUserWithCommonAssignments(
                recoveredPull,
                info,
                githubUsersMap[recoveredPull.user.login],
              );

            const matchedUrl = normalizeUrl(recoveredPull.html_url);
            const isBestPractice =
              bestPracticeUrls.has(matchedUrl) || bestPracticeUrls.has(lmsUrl);
            (value.assignments as any[]).push({
              ...omit(info, ['name', 'feedback', 'assignment']),
              url: matchedUrl,
              assignmentName: info.assignment.name,
              week: (info.assignment as any).week,
              theBest: isBestPractice || info.theBest, // Best Practice URL이면 true로 설정
            });

            debugInfo.push(debugEntry);
            return {
              ...acc,
              [recoveredPull.user.login]: value,
            };
          } else {
            debugEntry.status = 'partial_fail';
            const matchingPulls = userPulls.filter((p) =>
              p.html_url.toLowerCase().includes(searchKeyword),
            );
            debugEntry.matchingPullsCount = matchingPulls.length;
          }
        }

        debugInfo.push(debugEntry);
        return acc;
      }

      const value: HanghaeUser =
        acc[pull.user.login] ??
        createUserWithCommonAssignments(
          pull,
          info,
          githubUsersMap[pull.user.login],
        );

      const isBestPractice =
        bestPracticeUrls.has(lmsUrl) ||
        bestPracticeUrls.has(normalizeUrl(pull.html_url));
      (value.assignments as any[]).push({
        ...omit(info, ['name', 'feedback', 'assignment']),
        url: lmsUrl,
        assignmentName: info.assignment.name,
        week: (info.assignment as any).week,
        theBest: isBestPractice || info.theBest, // Best Practice URL이면 true로 설정
      });

      return {
        ...acc,
        [pull.user.login]: value,
      };
    },
    {} as Record<string, HanghaeUser>,
  );

  const usersWithRanking = addRankingToUsers(
    userWithCommonAssignments,
    repos.length,
  );

  fs.writeFileSync(
    path.join(dataDir, 'app-data.json'),
    JSON.stringify(
      {
        users: usersWithRanking,
        feedbacks,
        assignmentDetails,
      },
      null,
      2,
    ),
    'utf-8',
  );

  // 🔍 디버깅 정보를 마크다운 파일로 저장
  const markdownContent = generateDebugMarkdown(debugInfo);
  const debugFilePath = path.join(dataDir, 'matching-debug.md');
  fs.writeFileSync(debugFilePath, markdownContent, 'utf-8');
  console.log(`\n📊 디버깅 정보가 저장되었습니다: ${debugFilePath}`);

  // 🔍 4-1 챕터 데이터만 별도로 저장
  const chapter4_1Data = debugInfo.filter(
    (info) =>
      info.originalUrl.includes('chapter4-1') ||
      info.normalizedUrl.includes('chapter4-1') ||
      info.searchKeyword === 'chapter4-1',
  );
  if (chapter4_1Data.length > 0) {
    const chapter4_1Content = generateChapter4_1Markdown(chapter4_1Data);
    const chapter4_1FilePath = path.join(dataDir, 'chapter4-1-debug.md');
    fs.writeFileSync(chapter4_1FilePath, chapter4_1Content, 'utf-8');
    console.log(
      `📊 Chapter 4-1 디버깅 정보가 저장되었습니다: ${chapter4_1FilePath}`,
    );
  }
};

const main = async () => {
  const app = await createApp();
  await generatePulls(app);
  await generateUsers(app);
  await generateUserAssignmentInfos(app);
  generateAppData();
};

main();
