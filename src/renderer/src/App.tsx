import React, { useEffect, useRef, useState } from "react";
import type { Issue, IssuePriority, IssueStatus } from "../../issues/types";
import { IssueList } from "./components/IssueList";
import { IssueDetail } from "./components/IssueDetail";
import { NewIssueForm } from "./components/NewIssueForm";
import { EditIssueForm } from "./components/EditIssueForm";
import { Terminal } from "./components/Terminal";
import { SettingsView } from "./components/SettingsView";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { TrashView } from "./components/TrashView";

type View = "detail" | "new" | "edit" | "terminal";

const STATUS_LABEL: Record<IssueStatus, string> = {
  todo: "TODO",
  "in-progress": "IN PROGRESS",
  done: "DONE",
};

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("detail");
  const [targetProject, setTargetProject] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const nextToastId = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | IssueStatus>("all");
  const [formDirty, setFormDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  function attemptNavigation(action: () => void) {
    if ((view === "new" || view === "edit") && formDirty) {
      setPendingNavigation(() => action);
      return;
    }
    action();
  }

  function confirmNavigation() {
    pendingNavigation?.();
    setPendingNavigation(null);
  }

  function cancelNavigation() {
    setPendingNavigation(null);
  }

  // Background Claude Code sessions (Phase 6): `sessions` is every issue that currently has a
  // mounted (possibly hidden) Terminal - it persists across navigation and even after the
  // process exits, so the user can revisit an issue and still see its outcome. `liveIssueIds`
  // is the subset that's actually still running, used for the sidebar badge, the "실행" button
  // state, and to block deleting an issue out from under a running session. `mountKey` is
  // bumped each time a session (re)starts for an issue, forcing Terminal to remount (fresh
  // xterm buffer) instead of reusing a stale, already-exited instance when the user runs the
  // same issue again after its previous session ended.
  interface SessionInfo {
    issueId: string;
    issueTitle: string;
    mountKey: number;
  }
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [liveIssueIds, setLiveIssueIds] = useState<string[]>([]);
  const [startingIssueIds, setStartingIssueIds] = useState<string[]>([]);

  function handleSessionExit(issueId: string) {
    setLiveIssueIds((prev) => prev.filter((id) => id !== issueId));
  }

  const selected = issues.find((i) => i.id === selectedId) ?? null;
  const filteredIssues = issues.filter((issue) => {
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  function pushToast(message: string, type: Toast["type"] = "success") {
    const id = nextToastId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimers.current.delete(id);
    }, 3000);
    toastTimers.current.set(id, timer);
  }

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  async function refresh(): Promise<Issue[]> {
    const list = await window.api.issues.list();
    setIssues(list);
    return list;
  }

  const [initError, setInitError] = useState<string | null>(null);

  async function loadInitialData() {
    setInitError(null);
    try {
      const [list, config] = await Promise.all([refresh(), window.api.config.get()]);
      setTargetProject(config.defaultTargetProject);
      if (list.length > 0) setSelectedId(list[0].id);
    } catch (err) {
      console.log(`[ui] 초기 로딩 실패: ${err instanceof Error ? err.message : err}`);
      setInitError(err instanceof Error ? err.message : "초기 데이터를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function handleCreate(input: { title: string; body: string; priority: IssuePriority }) {
    console.log(`[ui] 새 이슈 저장: "${input.title}"`);
    const issue = await window.api.issues.create(input);
    await refresh();
    setSelectedId(issue.id);
    setView("detail");
    pushToast(`"${issue.title}" 이슈를 생성했습니다.`);
  }

  async function handleStatusChange(issue: Issue, status: IssueStatus) {
    if (status === issue.status) return;
    console.log(`[ui] 상태변경: "${issue.title}" ${issue.status} -> ${status}`);
    try {
      await window.api.issues.setStatus(issue.id, status);
      await refresh();
      pushToast(`상태가 "${STATUS_LABEL[status]}"(으)로 변경되었습니다.`);
    } catch (err) {
      console.log(`[ui] 상태변경 실패: ${err instanceof Error ? err.message : err}`);
      pushToast("상태 변경에 실패했습니다.", "error");
    }
  }

  async function handleRun(issue: Issue) {
    if (liveIssueIds.includes(issue.id)) {
      console.log(`[ui] "Claude Code 실행"(기존 세션 보기) 클릭: "${issue.title}"`);
      setSelectedId(issue.id);
      setView("terminal");
      return;
    }
    console.log(`[ui] "Claude Code 실행" 클릭: "${issue.title}"`);
    setStartingIssueIds((prev) => [...prev, issue.id]);
    try {
      const result = await window.api.pty.start(issue.id);
      if (result.status === "busy") {
        console.log(
          `[ui] pty 시작 거부됨 (동일 프로젝트 사용 중): "${issue.title}" vs "${result.busyIssueTitle}"`
        );
        pushToast(
          `"${result.busyIssueTitle}" 이슈가 같은 프로젝트에서 이미 실행 중입니다. 동일 프로젝트는 세션을 1개만 유지할 수 있습니다.`,
          "error"
        );
        return;
      }
      // Bump mountKey so a prior, already-exited Terminal for this issue (if any) fully
      // remounts with a fresh xterm buffer instead of reusing the old exited instance.
      setSessions((prev) => {
        const previousKey = prev.find((s) => s.issueId === issue.id)?.mountKey ?? 0;
        return [
          ...prev.filter((s) => s.issueId !== issue.id),
          { issueId: issue.id, issueTitle: issue.title, mountKey: previousKey + 1 },
        ];
      });
      setLiveIssueIds((prev) => [...prev, issue.id]);
      setSelectedId(issue.id);
      setView("terminal");
    } catch (err) {
      console.log(`[ui] pty 시작 실패: ${err instanceof Error ? err.message : err}`);
      pushToast("Claude Code 실행에 실패했습니다.", "error");
    } finally {
      setStartingIssueIds((prev) => prev.filter((id) => id !== issue.id));
    }
  }

  async function handleUpdate(
    id: string,
    changes: { title: string; body: string; priority: IssuePriority; targetProject?: string }
  ) {
    console.log(`[ui] 이슈 수정 저장: "${changes.title}"`);
    const issue = await window.api.issues.update(id, changes);
    await refresh();
    setSelectedId(issue.id);
    setView("detail");
    pushToast(`"${issue.title}" 이슈를 수정했습니다.`);
  }

  function handleDeleteRequest(issue: Issue) {
    if (liveIssueIds.includes(issue.id)) {
      console.log(`[ui] 삭제 클릭 거부됨 (세션 실행 중): "${issue.title}"`);
      pushToast("실행 중인 세션이 있는 이슈는 삭제할 수 없습니다. 먼저 세션을 종료해주세요.", "error");
      return;
    }
    console.log(`[ui] 삭제 클릭: "${issue.title}"`);
    setDeleteTarget(issue);
  }

  function handleDeleteCancel() {
    console.log("[ui] 삭제 취소됨");
    setDeleteTarget(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const issue = deleteTarget;
    console.log(`[ui] 삭제 확인: "${issue.title}"`);
    try {
      await window.api.issues.delete(issue.id);
      const list = await refresh();
      setSelectedId(list.length > 0 ? list[0].id : null);
      setView("detail");
      setDeleteTarget(null);
      pushToast(`"${issue.title}" 이슈를 삭제했습니다.`);
    } catch (err) {
      console.log(`[ui] 삭제 실패: ${err instanceof Error ? err.message : err}`);
      setDeleteTarget(null);
      pushToast("이슈 삭제에 실패했습니다.", "error");
    }
  }

  async function handleRestore(issue: Issue) {
    console.log(`[ui] 복구 클릭: "${issue.title}"`);
    await window.api.issues.restore(issue.id);
    await refresh();
    pushToast(`"${issue.title}" 이슈를 복구했습니다.`);
  }

  async function handleSaveConfig(path: string) {
    console.log(`[ui] 환경설정 저장: defaultTargetProject="${path}"`);
    const updated = await window.api.config.set({ defaultTargetProject: path });
    setTargetProject(updated.defaultTargetProject);
    setShowSettings(false);
    pushToast("환경설정을 저장했습니다.");
  }

  if (initError) {
    return (
      <div className="app-init-error">
        <p>{initError}</p>
        <button className="primary" onClick={loadInitialData}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <span>SIM · Simple Issue Management</span>
        <div className="app-header-actions">
          <button
            onClick={() => {
              console.log("[ui] 휴지통 열기");
              setShowTrash(true);
            }}
          >
            🗑 휴지통
          </button>
          <button
            onClick={() => {
              console.log("[ui] 환경설정 열기");
              setShowSettings(true);
            }}
          >
            ⚙ 환경설정
          </button>
        </div>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-actions">
            <button
              className="primary"
              onClick={() => {
                attemptNavigation(() => {
                  console.log("[ui] \"+ 새 이슈\" 클릭");
                  setView("new");
                });
              }}
            >
              + 새 이슈
            </button>
          </div>
          <div className="sidebar-filters">
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | IssueStatus)}
            >
              <option value="all">전체</option>
              <option value="todo">TODO</option>
              <option value="in-progress">IN PROGRESS</option>
              <option value="done">DONE</option>
            </select>
          </div>
          <IssueList
            issues={filteredIssues}
            selectedId={selectedId}
            runningIds={liveIssueIds}
            onSelect={(id) => {
              attemptNavigation(() => {
                const issue = issues.find((i) => i.id === id);
                console.log(`[ui] 이슈 선택: "${issue?.title ?? id}"`);
                setSelectedId(id);
                setView(sessions.some((s) => s.issueId === id) ? "terminal" : "detail");
              });
            }}
          />
        </aside>
        <main className="main-panel">
          {view === "new" && (
            <NewIssueForm
              onCancel={() => setView("detail")}
              onSubmit={handleCreate}
              onDirtyChange={setFormDirty}
            />
          )}

          {view === "edit" && selected && (
            <EditIssueForm
              issue={selected}
              onCancel={() => setView("detail")}
              onSubmit={(changes) => handleUpdate(selected.id, changes)}
              onDirtyChange={setFormDirty}
            />
          )}

          {view === "detail" && selected && (
            <IssueDetail
              issue={selected}
              targetProject={targetProject}
              sessionLive={liveIssueIds.includes(selected.id)}
              starting={startingIssueIds.includes(selected.id)}
              onStatusChange={(status) => handleStatusChange(selected, status)}
              onRun={() => handleRun(selected)}
              onEdit={() => {
                console.log(`[ui] 수정 클릭: "${selected.title}"`);
                setView("edit");
              }}
              onDelete={() => handleDeleteRequest(selected)}
            />
          )}

          {view === "detail" && !selected && (
            <div className="empty-state">등록된 이슈가 없습니다. '+ 새 이슈'를 눌러 만들어보세요.</div>
          )}

          {sessions.map((s) => (
            <Terminal
              key={`${s.issueId}-${s.mountKey}`}
              issueId={s.issueId}
              issueTitle={s.issueTitle}
              active={view === "terminal" && selectedId === s.issueId}
              onExit={() => setView("detail")}
              onSessionExit={handleSessionExit}
            />
          ))}
        </main>
      </div>

      {showSettings && (
        <SettingsView
          targetProject={targetProject}
          onSave={handleSaveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="이슈 삭제"
          message={`"${deleteTarget.title}" 이슈를 삭제하시겠습니까?`}
          confirmLabel="삭제"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {showTrash && (
        <TrashView onRestore={handleRestore} onClose={() => setShowTrash(false)} />
      )}

      {pendingNavigation && (
        <ConfirmDialog
          title="저장하지 않은 변경사항"
          message="저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?"
          confirmLabel="계속"
          onConfirm={confirmNavigation}
          onCancel={cancelNavigation}
        />
      )}

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
