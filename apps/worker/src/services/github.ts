// github.ts — 已废弃
// 功能已由 services/platform.ts（平台适配层）+ services/atom.ts（Atom Feed 解析器）替代
// 保留此文件仅为参考，将在后续版本中删除
//
// 迁移说明：
//   - fetchReleases() → fetchRepoReleases() in scraper.ts
//   - toInternalRelease() → Atom entry → Release 转换逻辑内联在 scraper.ts 中
//   - GitHub API 依赖 → 统一 Atom Feed 抓取

export {};
