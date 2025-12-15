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
  // 'front_7th_chapter4-2', // 404 에러 방지를 위해 실제 생성 전까지 주석 처리
];

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
    (value) => keyBy(value, (pr) => normalizeUrl(pr.html_url)), // 🔑 여기서 정규화!
  )(repos);

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

  const userWithCommonAssignments = assignmentInfos.reduce(
    (acc, info) => {
      let lmsUrl = normalizeUrl(info.assignment.url);
      //다른분들도 비슷한 케이스가 있을거같은데 한번에 처리하는 방법 강구해봐야함
      if (info.name === '박수범' && lmsUrl.endsWith('/32')) {
        lmsUrl = lmsUrl.replace('/32', '/75');
      }
      const pull = pulls[lmsUrl];

      if (!pull) {
        // 과제가 왜 누락되는지 로그로 확인
       /**  if (info.name === '박수범' && info.assignment.url) {
          console.warn(`⚠️ [매칭 실패] 과제: ${info.assignment.name}`);
          console.warn(`   - LMS URL (Original): ${info.assignment.url}`);
          console.warn(`   - LMS URL (Normalized): ${lmsUrl}`);
          console.warn(
            `   - Hint: pulls.json에 이 정규화된 URL이 키로 존재하는지 확인 필요.\n`,
          );
        }*/
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
        assignmentName: info.assignment.name, // 진짜 과제 제목
        week: (info.assignment as any).week, // 주차 정보
      });

      return {
        ...acc,
        [pull.user.login]: value,
      };
    },
    {} as Record<string, HanghaeUser>,
  );

  // 랭킹 데이터 추가
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