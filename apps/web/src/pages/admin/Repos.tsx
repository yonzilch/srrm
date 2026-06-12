import React, { useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  useAdminRepos,
  useAdminReposStats,
  useTriggerScrape,
} from "../../hooks/useReleases";
import AddRepoForm from "../../components/AddRepoForm";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../../contexts/I18nContext";
import PlatformIcon from "../../components/PlatformIcon";
import type { Repo } from "@srrm/shared";

type SortKey = "addedAt" | "name" | "releaseCount";
type SortDir = "asc" | "desc";

export default function Repos() {
  const { t } = useI18n();
  const { user } = useAuth();
  const {
    data: repos = [],
    isLoading,
    error,
    refetch,
  } = useAdminRepos();
  const { data: stats = {} } = useAdminReposStats();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("addedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const handleRemoveConfirm = async (id: string) => {
    setRemovingId(id);
    try {
      await queryClient.invalidateQueries({
        queryKey: ["admin-repos"],
      });
      await queryClient.invalidateQueries({ queryKey: ["releases"] });
    } catch (e: any) {
      console.error("Remove repo failed:", e.message);
    } finally {
      setRemovingId(null);
    }
  };

  const sortedRepos = useMemo(() => {
    const list = repos.map((r: Repo) => ({
      ...r,
      releaseCount: stats[r.fullName] ?? 0,
    }));
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "addedAt") {
        cmp =
          new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      } else if (sortKey === "name") {
        cmp = a.repo.localeCompare(b.repo, undefined, {
          sensitivity: "base",
        });
      } else {
        cmp = a.releaseCount - b.releaseCount;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [repos, stats, sortKey, sortDir]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-ctp-surface0/60 rounded-xl border border-ctp-surface1 p-5 animate-pulse"
          >
            <div className="h-5 w-48 bg-ctp-surface2 rounded-lg mb-3" />
            <div className="h-4 w-full bg-ctp-surface2/60 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-ctp-red text-lg">
          {t("common.error")}: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ctp-text">
          {t("repos.title")}
        </h1>
      </div>

      <AddRepoForm onSuccess={() => refetch()} />

      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-ctp-text">
            {t("repos.monitoring", { count: String(repos.length) })}
          </h2>
          {/* Sort controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ctp-overlay0 mr-1">
              {t("repos.sortBy")}
            </span>
            <SortButton
              active={sortKey === "addedAt"}
              onClick={() => toggleSort("addedAt")}
              label={t("repos.sortAdded")}
              dir={sortKey === "addedAt" ? sortDir : null}
            />
            <SortButton
              active={sortKey === "name"}
              onClick={() => toggleSort("name")}
              label={t("repos.sortName")}
              dir={sortKey === "name" ? sortDir : null}
            />
            <SortButton
              active={sortKey === "releaseCount"}
              onClick={() => toggleSort("releaseCount")}
              label={t("repos.sortReleases")}
              dir={sortKey === "releaseCount" ? sortDir : null}
            />
          </div>
        </div>

        {repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">📡</div>
            <h3 className="text-lg font-semibold text-ctp-subtext1 mb-2">
              {t("repos.noRepos")}
            </h3>
            <p className="text-sm text-ctp-overlay0 mb-6">
              {t("repos.noReposDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {sortedRepos.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                releaseCount={repo.releaseCount}
                onRemoveConfirm={handleRemoveConfirm}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  label,
  dir,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dir: SortDir | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-colors font-medium ${
        active
          ? "bg-ctp-blue/15 text-ctp-blue border-ctp-blue/30"
          : "bg-ctp-surface1 text-ctp-subtext1 border-ctp-surface2 hover:bg-ctp-surface2 hover:text-ctp-text"
      }`}
    >
      {label}
      {active && dir && (
        <span className="text-[10px] opacity-70">
          {dir === "asc" ? "↑" : "↓"}
        </span>
      )}
    </button>
  );
}

function RepoCard({
  repo,
  releaseCount,
  onRemoveConfirm,
}: {
  repo: Repo & { releaseCount: number };
  releaseCount: number;
  onRemoveConfirm: (id: string) => void;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  let timeoutRef: ReturnType<typeof setTimeout> | null = null;

  const startConfirm = () => {
    setConfirming(true);
    timeoutRef = setTimeout(() => setConfirming(false), 3000);
  };

  const cancelConfirm = () => {
    setConfirming(false);
    if (timeoutRef) clearTimeout(timeoutRef);
  };

  const confirmRemove = () => {
    if (timeoutRef) clearTimeout(timeoutRef);
    onRemoveConfirm(repo.id);
    setConfirming(false);
  };

  return (
    <div className="py-3 px-4 rounded-lg border border-ctp-surface1/50 hover:bg-white/[0.02] transition-colors group">
      <div className="flex items-start gap-3">
        <span className="text-ctp-overlay1 shrink-0 mt-0.5">
          <PlatformIcon
            platform={repo.platform || "github"}
            size={18}
          />
        </span>

        <div className="min-w-0 flex-1">
          <a
            href={repo.repoUrl || "https://github.com/" + repo.fullName}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ctp-text break-all hover:text-ctp-blue hover:underline transition-colors text-sm"
          >
            {repo.fullName}
          </a>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <a
              href={
                repo.repoUrl || "https://github.com/" + repo.fullName
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-ctp-overlay0 hover:text-ctp-subtext1 break-all"
            >
              {repo.repoUrl || "github.com/" + repo.fullName}
            </a>
            <span className="text-[11px] text-ctp-overlay0 shrink-0">
              ·
            </span>
            <span className="text-[11px] text-ctp-overlay0 shrink-0">
              {relativeTime(repo.addedAt)}
            </span>
            <span className="text-[11px] text-ctp-overlay0 shrink-0">
              ·
            </span>
            <span className="text-[11px] text-ctp-overlay0 shrink-0">
              {t("repos.releaseCount", { count: String(releaseCount) })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 ml-7">
        {!confirming ? (
          <button
            onClick={startConfirm}
            className="text-[12px] text-ctp-overlay1 hover:text-ctp-red hover:bg-ctp-red/10 rounded-lg px-3 py-1.5 transition-colors"
          >
            {t("repos.remove")}
          </button>
        ) : (
          <>
            <button
              onClick={confirmRemove}
              className="text-[12px] bg-ctp-red text-ctp-base font-medium rounded-lg px-3 py-1.5 hover:bg-ctp-red/90 transition-colors"
            >
              {t("repos.confirmRemove")}
            </button>
            <button
              onClick={cancelConfirm}
              className="text-[12px] text-ctp-subtext1 hover:text-ctp-text rounded-lg px-2.5 py-1.5 transition-colors"
            >
              {t("repos.cancelRemove")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Relative time helper
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 30) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}
