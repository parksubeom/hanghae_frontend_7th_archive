import react from "@vitejs/plugin-react-oxc";
import { createViteConfig } from "../../createViteConfig";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import svgr from "vite-plugin-svgr";

export default createViteConfig({
  base: "/front_7th/",
  mode: "development", // 1. 개발 모드 명시
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // ▼ [핵심] 이 줄을 반드시 추가하게! ▼
    // 리액트 패키지가 'development' 버전의 번들을 로드하도록 강제함
    conditions: ["development", "browser"],
  },
  build: {
    minify: false, // 2. 압축 해제
    sourcemap: true, // 3. 소스맵 켜기
  },
  ssr: {
    noExternal: ["@uiw/react-markdown-preview"],
  },
});
