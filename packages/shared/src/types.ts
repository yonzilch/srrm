// 共享类型定义 — Worker 与 Web 端复用

export interface Repo {
  id: string; // nanoid 生成
  owner: string;
  repo: string;
  fullName: string; // "{owner}/{repo}"
  addedAt: string; // ISO 8601
  addedBy: string; // 添加者邮箱
}

export interface Release {
  id: string; // GitHub release node_id
  repoFullName: string; // "{owner}/{repo}"
  tagName: string;
  name: string;
  body: string; // Markdown 格式的 Release Notes
  publishedAt: string; // ISO 8601
  htmlUrl: string;
  isPrerelease: boolean;
  isDraft: boolean;
}

export interface User {
  email: string;
  role: 'admin' | 'viewer';
  exp: number;
}

export interface ApiError {
  error: string;
  code?: string;
}