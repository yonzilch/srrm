export interface Repo {
  id: string;
  owner: string;
  repo: string;
  fullName: string;
  addedAt: string;
  addedBy: string;
}

export interface Release {
  id: string;
  repoFullName: string;
  tagName: string;
  name: string;
  body: string;
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