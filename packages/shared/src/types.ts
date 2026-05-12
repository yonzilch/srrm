export type Platform = 'github' | 'gitlab' | 'forgejo' | 'gitea';

export interface Repo {
  id: string;
  platform: Platform;
  baseUrl: string;
  owner: string;
  repo: string;
  fullName: string;
  repoUrl: string;
  addedAt: string;
  addedBy: string;
}

export interface Release {
  id: string;
  repoFullName: string;
  repoUrl: string;
  platform: Platform;
  tagName: string;
  name: string;
  body: string;
  bodyHtml: string;
  publishedAt: string;
  htmlUrl: string;
  isPrerelease: boolean;
  isDraft: boolean;
}

export interface User {
  email: string;
  role: 'admin' | 'viewer';
  exp: number;
}
