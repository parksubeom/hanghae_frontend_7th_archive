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
  'front_7th_chapter4-2', // 404 에러 방지를 위해 실제 생성 전까지 주석 처리
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

    aggregatedAssignmentInfos.push({
      ...representativeInfo,
      passed: isChapterPassed,
      theBest: isTheBest,
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

  // 핵심 교체: assignmentInfos 대신 aggregatedAssignmentInfos를 사용하여 reduce 시작
  const userWithCommonAssignments = aggregatedAssignmentInfos.reduce(
    (acc, info) => {
      let lmsUrl = normalizeUrl(info.assignment.url);
      const pull = pulls[lmsUrl];

      if (!pull) {
        // 1. 수동 매핑 테이블 확인
        let matchedGithubId = manualMatchingMap[info.name];

        // 2. 없으면 프로필 이름으로 검색
        if (!matchedGithubId) {
          const profile = githubProfiles.find((p) => p.name === info.name);
          if (profile) matchedGithubId = profile.login;
        }

        if (matchedGithubId) {
          // 3. 검색 키워드 획득 (개선된 로직 사용)
          const searchKeyword = getRepoKeyword(info.assignment.name);

          if (!searchKeyword) {
            // 키워드 추출 실패 시 로그
            // console.log(`⚠️ [키워드 실패] ${info.name}님의 [${info.assignment.name}]에서 챕터 키워드 추출 실패.`);
            return acc;
          }

          const recoveredPull = Object.values(pulls).find((p) => {
            const isSameUser = p.user.login === matchedGithubId;

            // URL에 올바른 키워드(예: chapter2-2)가 포함되어 있는지 확인 (소문자로 비교)
            const isSameAssignment = p.html_url
              .toLowerCase()
              .includes(searchKeyword);

            return isSameUser && isSameAssignment;
          });

          if (recoveredPull) {
            console.log(
              `💡 [복구 성공] ${info.name}(${matchedGithubId}) -> 과제: ${info.assignment.name} (키워드: ${searchKeyword})`,
            );

            const value: HanghaeUser =
              acc[recoveredPull.user.login] ??
              createUserWithCommonAssignments(
                recoveredPull,
                info,
                githubUsersMap[recoveredPull.user.login],
              );

            (value.assignments as any[]).push({
              ...omit(info, ['name', 'feedback', 'assignment']),
              url: normalizeUrl(recoveredPull.html_url),
              assignmentName: info.assignment.name,
              week: (info.assignment as any).week,
            });

            return {
              ...acc,
              [recoveredPull.user.login]: value,
            };
          } else {
            console.log(
              `⚠️ [부분 실패] ${info.name}님의 ID(${matchedGithubId})는 찾았으나, [${info.assignment.name}] 관련 PR이 없습니다.`,
            );
            console.log(
              `   👉 검색 키워드: "${searchKeyword}" / 검색 대상 Repo 예시: ${repos.find((r) => r.includes(searchKeyword)) || '알 수 없음'}`,
            );
          }
        } else {
          // console.log(`💀 [완전 실패] ${info.name}님은 수동 매핑/이름 매핑 모두 실패했습니다.`);
        }
        return acc;
      }

      const value: HanghaeUser =
        acc[pull.user.login] ??
        createUserWithCommonAssignments(
          pull,
          info,
          githubUsersMap[pull.user.login],
        );

      (value.assignments as any[]).push({
        ...omit(info, ['name', 'feedback', 'assignment']),
        url: lmsUrl,
        assignmentName: info.assignment.name,
        week: (info.assignment as any).week,
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
};

const main = async () => {
  const app = await createApp();
  await generatePulls(app);
  await generateUsers(app);
  await generateUserAssignmentInfos(app);
  generateAppData();
};

main();
