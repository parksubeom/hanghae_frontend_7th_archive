import fs from "fs";
import path from "path";

// Node.js 버전에 따라 assert 문법이 다를 수 있으니 주의하세요.
// 최신 Node에서는 'with', 구버전에서는 'assert'를 사용합니다.
import appData from "../../docs/data/app-data.json" with { type: "json" };

process.env.TZ = "Asia/Seoul";
const env = process.env.NODE_ENV || "development";
const base = "/front_7th";

// 템플릿 로드
const template = fs.readFileSync(env === "production" ? "./dist/client/template.html" : "./index.html", "utf-8");

const getUrls = async () => {
  const { users } = appData;

  const userIdWithAssignmentIds = Object.entries(users).reduce((acc, [userId, user]) => {
    const pullIds = new Set(user.assignments.map((v) => appData.assignmentDetails[v.url].id));
    return {
      ...acc,
      [userId]: [...pullIds],
    };
  }, {});

  return [
    "/",
    "/assignments/",
    ...Object.keys(userIdWithAssignmentIds).flatMap((userId) => [
      `/@${userId}/`,
      ...userIdWithAssignmentIds[userId].map((id) => `/@${userId}/assignment/${id}/`),
    ]),
  ];
};

async function generateMetadata(url) {
  try {
    const components = await import("./dist/server/main-server.js");

    const userMatch = url.match(/\/@([^\\/]+)\//);
    const assignmentMatch = url.match(/\/assignment\/([^\\/]+)\//);

    if (url === "/") {
      const { generateHomeMetadata } = components;
      if (generateHomeMetadata) {
        const metadata = generateHomeMetadata();
        return createMetaTags(metadata);
      }
    }

    if (url === "/assignments/") {
      const { generateAssignmentsMetadata } = components;
      if (generateAssignmentsMetadata) {
        const metadata = generateAssignmentsMetadata();
        return createMetaTags(metadata);
      }
    }

    if (userMatch) {
      const userId = userMatch[1];
      const user = appData.users[userId];

      if (assignmentMatch && user) {
        const assignmentId = assignmentMatch[1];
        const assignment = user.assignments.find(
          (a) => appData.assignmentDetails[a.url]?.id.toString() === assignmentId,
        );

        if (assignment) {
          const assignmentDetail = appData.assignmentDetails[assignment.url];
          const { generateAssignmentDetailMetadata } = components;
          if (generateAssignmentDetailMetadata) {
            const metadata = generateAssignmentDetailMetadata({
              assignmentId,
              assignmentTitle: assignmentDetail.title,
              userName: user.name,
            });
            return createMetaTags(metadata);
          }
        }
      }

      if (user) {
        const { generateUserMetadata } = components;
        if (generateUserMetadata) {
          const metadata = generateUserMetadata({
            userName: user.name,
            avatarUrl: user.github.avatar_url,
          });
          return createMetaTags(metadata);
        }
      }
    }

    const { generateHomeMetadata } = components;
    if (generateHomeMetadata) {
      const metadata = generateHomeMetadata();
      return createMetaTags(metadata);
    }

    return createMetaTags({
      title: "항해플러스 프론트엔드 7기 기술블로그",
      description: "항해플러스 프론트엔드 7기 수강생들의 과제 및 기술 블로그",
      ogImage: "/defaultThumbnail.jpg",
      keywords: "항해플러스, 프론트엔드, 기술블로그, React, JavaScript",
    });
  } catch (error) {
    console.error("메타데이터 생성 중 오류:", error);
    return createMetaTags({
      title: "항해플러스 프론트엔드 7기 기술블로그",
      description: "항해플러스 프론트엔드 7기 수강생들의 과제 및 기술 블로그",
      ogImage: "/defaultThumbnail.jpg",
      keywords: "항해플러스, 프론트엔드, 기술블로그, React, JavaScript",
    });
  }
}

function createMetaTags({ title, description, ogImage, keywords }) {
  return `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
  `;
}

async function generate(url) {
  try {
    // [Fix] 윈도우 환경에서 path.join이 백슬래시(\)를 생성하여 Router 매칭 실패하는 문제 해결
    const fullUrl = path.join(base, url).replace(/\\/g, "/");
    const filePath = path.join("./dist/client", url, "index.html");

    const { render } = await import("./dist/server/main-server.js");

    // SSR 렌더링 수행
    const rendered = await render(fullUrl);

    // 메타데이터 생성
    const metadata = await generateMetadata(url);

    // [수정] 주석을 타겟팅하여 정확한 위치에 삽입
    // Vite SSR은 html만 반환하므로 <!--app-html--> 주석을 교체
    // 메타데이터는 <!--app-head--> 주석 뒤에 삽입
    const html = template
      .replace("<!--app-head-->", `<!--app-head-->${metadata}${rendered.head ?? ""}`)
      .replace("<!--app-html-->", rendered.html ?? "");

    const dirPath = path.join("./dist/client", url);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, html, "utf-8");
    // console.log(`✅ Generated: ${url}`); // 로그가 너무 많으면 주석 처리
  } catch (error) {
    console.error(`❌ 생성 중 오류 발생 (${url}):`, error);
  }
}

async function generateSitemap(urls) {
  const baseUrl = "https://hanghae-plus.github.io/front_7th";
  const lastMod = new Date().toISOString();

  const urlElements = urls
    .map((url) => {
      const fullUrl = url === "/" ? baseUrl : `${baseUrl}${url}`;

      let priority = "0.8";
      let changefreq = "weekly";

      if (url === "/") {
        priority = "1.0";
        changefreq = "daily";
      } else if (url === "/assignments/") {
        priority = "0.9";
        changefreq = "weekly";
      } else if (url.includes("/assignment/")) {
        priority = "0.7";
        changefreq = "monthly";
      } else if (url.match(/\/@[^/]+\/$/)) {
        priority = "0.8";
        changefreq = "weekly";
      }

      return `
  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;

  const sitemapPath = "./dist/client/sitemap.xml";
  fs.writeFileSync(sitemapPath, sitemap, "utf-8");
  console.log("✅ sitemap.xml 생성 완료");
}

async function generateRobotsTxt() {
  const baseUrl = "https://hanghae-plus.github.io/front_7th";

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;

  const robotsPath = "./dist/client/robots.txt";
  fs.writeFileSync(robotsPath, robotsTxt, "utf-8");
  console.log("✅ robots.txt 생성 완료");
}

// 메인 실행 로직
getUrls().then(async (urls) => {
  console.log(`🚀 총 ${urls.length}개의 페이지 생성을 시작합니다...`);

  // 🚨 [수정] forEach 대신 Promise.all 사용
  // 모든 페이지 생성이 끝날 때까지 기다렸다가 사이트맵을 만듭니다.
  await Promise.all(urls.map(generate));

  await generateSitemap(urls);
  await generateRobotsTxt();

  console.log("✨ 모든 빌드 작업이 완료되었습니다.");
});
