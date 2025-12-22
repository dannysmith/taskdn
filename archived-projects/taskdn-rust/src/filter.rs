//! Filter types for querying tasks, projects, and areas.

use crate::types::{AreaStatus, FileReference, ProjectStatus, TaskStatus};
use chrono::{NaiveDate, NaiveDateTime};

/// Filter criteria for querying tasks.
///
/// Uses the builder pattern for ergonomic construction.
/// Filter semantics:
/// - AND between different fields (a task must match ALL specified criteria)
/// - OR within status lists (`with_statuses([Ready, InProgress])` matches either)
/// - None/unset fields don't constrain results
#[derive(Debug, Clone, Default)]
pub struct TaskFilter {
    // Status filtering (OR within, AND with other fields)
    /// Include only tasks with one of these statuses.
    pub status: Option<Vec<TaskStatus>>,
    /// Exclude tasks with any of these statuses.
    pub exclude_status: Option<Vec<TaskStatus>>,

    // Assignment filtering
    /// Tasks assigned to this project.
    pub project: Option<FileReference>,
    /// Tasks directly assigned to this area.
    pub area: Option<FileReference>,
    /// Tasks whose project is in this area.
    pub area_via_project: Option<FileReference>,
    /// Tasks that have a project assigned.
    pub has_project: Option<bool>,
    /// Tasks that have an area assigned.
    pub has_area: Option<bool>,

    // Date filtering (compares by date portion for datetime fields)
    /// Tasks due before this date.
    pub due_before: Option<NaiveDate>,
    /// Tasks due after this date.
    pub due_after: Option<NaiveDate>,
    /// Tasks due on this exact date.
    pub due_on: Option<NaiveDate>,
    /// Tasks scheduled before this date.
    pub scheduled_before: Option<NaiveDate>,
    /// Tasks scheduled after this date.
    pub scheduled_after: Option<NaiveDate>,
    /// Tasks scheduled on this exact date.
    pub scheduled_on: Option<NaiveDate>,
    /// Tasks created before this datetime.
    pub created_before: Option<NaiveDateTime>,
    /// Tasks created after this datetime.
    pub created_after: Option<NaiveDateTime>,
    /// Tasks visible as of this date (`defer_until` <= date OR `defer_until` is None).
    pub visible_as_of: Option<NaiveDate>,

    // Archive handling
    /// Include tasks from the archive subdirectory (default: false).
    pub include_archive_dir: bool,
}

impl TaskFilter {
    /// Create a new empty filter.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    // === Status ===

    /// Filter to include only tasks with this status.
    #[must_use]
    pub fn with_status(mut self, status: TaskStatus) -> Self {
        self.status = Some(vec![status]);
        self
    }

    /// Filter to include tasks with any of these statuses.
    #[must_use]
    pub fn with_statuses(mut self, statuses: impl IntoIterator<Item = TaskStatus>) -> Self {
        self.status = Some(statuses.into_iter().collect());
        self
    }

    /// Exclude tasks with this status.
    #[must_use]
    pub fn excluding_status(mut self, status: TaskStatus) -> Self {
        let excluded = self.exclude_status.get_or_insert_with(Vec::new);
        excluded.push(status);
        self
    }

    /// Exclude tasks with any of these statuses.
    #[must_use]
    pub fn excluding_statuses(mut self, statuses: impl IntoIterator<Item = TaskStatus>) -> Self {
        let excluded = self.exclude_status.get_or_insert_with(Vec::new);
        excluded.extend(statuses);
        self
    }

    // === Assignment ===

    /// Filter to tasks in this project.
    #[must_use]
    pub fn in_project(mut self, project: impl Into<FileReference>) -> Self {
        self.project = Some(project.into());
        self
    }

    /// Filter to tasks directly in this area.
    #[must_use]
    pub fn in_area(mut self, area: impl Into<FileReference>) -> Self {
        self.area = Some(area.into());
        self
    }

    /// Filter to tasks whose project is in this area.
    #[must_use]
    pub fn in_area_via_project(mut self, area: impl Into<FileReference>) -> Self {
        self.area_via_project = Some(area.into());
        self
    }

    /// Filter to tasks that have a project assigned.
    #[must_use]
    pub fn with_project(mut self) -> Self {
        self.has_project = Some(true);
        self
    }

    /// Filter to tasks that don't have a project assigned.
    #[must_use]
    pub fn without_project(mut self) -> Self {
        self.has_project = Some(false);
        self
    }

    /// Filter to tasks that have an area assigned.
    #[must_use]
    pub fn with_area(mut self) -> Self {
        self.has_area = Some(true);
        self
    }

    /// Filter to tasks that don't have an area assigned.
    #[must_use]
    pub fn without_area(mut self) -> Self {
        self.has_area = Some(false);
        self
    }

    // === Dates ===

    /// Filter to tasks due before this date.
    #[must_use]
    pub fn due_before(mut self, date: NaiveDate) -> Self {
        self.due_before = Some(date);
        self
    }

    /// Filter to tasks due after this date.
    #[must_use]
    pub fn due_after(mut self, date: NaiveDate) -> Self {
        self.due_after = Some(date);
        self
    }

    /// Filter to tasks due on this exact date.
    #[must_use]
    pub fn due_on(mut self, date: NaiveDate) -> Self {
        self.due_on = Some(date);
        self
    }

    /// Filter to tasks scheduled before this date.
    #[must_use]
    pub fn scheduled_before(mut self, date: NaiveDate) -> Self {
        self.scheduled_before = Some(date);
        self
    }

    /// Filter to tasks scheduled after this date.
    #[must_use]
    pub fn scheduled_after(mut self, date: NaiveDate) -> Self {
        self.scheduled_after = Some(date);
        self
    }

    /// Filter to tasks scheduled on this exact date.
    #[must_use]
    pub fn scheduled_on(mut self, date: NaiveDate) -> Self {
        self.scheduled_on = Some(date);
        self
    }

    /// Filter to tasks created before this datetime.
    #[must_use]
    pub fn created_before(mut self, datetime: NaiveDateTime) -> Self {
        self.created_before = Some(datetime);
        self
    }

    /// Filter to tasks created after this datetime.
    #[must_use]
    pub fn created_after(mut self, datetime: NaiveDateTime) -> Self {
        self.created_after = Some(datetime);
        self
    }

    /// Filter to tasks visible as of this date.
    ///
    /// A task is visible if `defer_until` is None or `defer_until <= date`.
    #[must_use]
    pub fn visible_as_of(mut self, date: NaiveDate) -> Self {
        self.visible_as_of = Some(date);
        self
    }

    // === Archive ===

    /// Include tasks from the archive subdirectory.
    #[must_use]
    pub fn include_archive_dir(mut self) -> Self {
        self.include_archive_dir = true;
        self
    }

    // === Preset Filters ===

    /// Tasks with status = Inbox.
    #[must_use]
    pub fn inbox() -> Self {
        Self::new().with_status(TaskStatus::Inbox)
    }

    /// Tasks scheduled today, due today, or overdue (visible, not completed).
    #[must_use]
    pub fn today(today: NaiveDate) -> Self {
        // This is a complex filter that would normally be implemented in the
        // query logic. For now, we provide a basic version that filters by
        // scheduled date. The full implementation would use OR logic.
        Self::new()
            .visible_as_of(today)
            .excluding_status(TaskStatus::Done)
            .excluding_status(TaskStatus::Dropped)
    }

    /// Tasks where due < today and not completed.
    #[must_use]
    pub fn overdue(today: NaiveDate) -> Self {
        Self::new()
            .due_before(today)
            .excluding_status(TaskStatus::Done)
            .excluding_status(TaskStatus::Dropped)
    }

    /// Tasks due within the next N days (inclusive of today).
    #[must_use]
    pub fn upcoming(today: NaiveDate, days: u32) -> Self {
        let end_date = today + chrono::Duration::days(i64::from(days));
        Self::new()
            .due_after(today - chrono::Duration::days(1)) // due >= today
            .due_before(end_date + chrono::Duration::days(1)) // due <= end_date
            .excluding_status(TaskStatus::Done)
            .excluding_status(TaskStatus::Dropped)
    }

    /// Tasks that are ready to work on (not blocked, deferred, or completed).
    #[must_use]
    pub fn available(today: NaiveDate) -> Self {
        Self::new()
            .visible_as_of(today)
            .with_statuses([TaskStatus::Ready, TaskStatus::InProgress])
    }
}

/// Filter criteria for querying projects.
#[derive(Debug, Clone, Default)]
pub struct ProjectFilter {
    /// Include only projects with one of these statuses.
    pub status: Option<Vec<ProjectStatus>>,
    /// Projects in this area.
    pub area: Option<FileReference>,
    /// Projects that have an area assigned.
    pub has_area: Option<bool>,
}

impl ProjectFilter {
    /// Create a new empty filter.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Filter to projects with this status.
    #[must_use]
    pub fn with_status(mut self, status: ProjectStatus) -> Self {
        self.status = Some(vec![status]);
        self
    }

    /// Filter to projects with any of these statuses.
    #[must_use]
    pub fn with_statuses(mut self, statuses: impl IntoIterator<Item = ProjectStatus>) -> Self {
        self.status = Some(statuses.into_iter().collect());
        self
    }

    /// Filter to projects in this area.
    #[must_use]
    pub fn in_area(mut self, area: impl Into<FileReference>) -> Self {
        self.area = Some(area.into());
        self
    }

    /// Filter to projects that have an area assigned.
    #[must_use]
    pub fn with_area(mut self) -> Self {
        self.has_area = Some(true);
        self
    }

    /// Filter to projects that don't have an area assigned.
    #[must_use]
    pub fn without_area(mut self) -> Self {
        self.has_area = Some(false);
        self
    }

    // === Preset Filters ===

    /// Active projects (not done or paused).
    #[must_use]
    pub fn active() -> Self {
        Self::new().with_statuses([
            ProjectStatus::Planning,
            ProjectStatus::Ready,
            ProjectStatus::InProgress,
            ProjectStatus::Blocked,
        ])
    }
}

impl TaskFilter {
    /// Check if a task matches this filter.
    ///
    /// Note: `area_via_project` is NOT checked here because it requires
    /// looking up the project file. This should be handled at the SDK level.
    ///
    /// # Arguments
    /// * `task` - The task to check
    ///
    /// # Returns
    /// `true` if the task matches all filter criteria, `false` otherwise
    #[must_use]
    #[allow(clippy::too_many_lines)]
    pub fn matches(&self, task: &crate::Task) -> bool {
        self.matches_archive(task)
            && self.matches_status(task)
            && self.matches_assignment(task)
            && self.matches_dates(task)
    }

    fn matches_archive(&self, task: &crate::Task) -> bool {
        // Archive handling - skip archived tasks unless explicitly included
        self.include_archive_dir || !task.is_archived()
    }

    fn matches_status(&self, task: &crate::Task) -> bool {
        // Status filtering (OR within statuses, AND with other fields)
        if let Some(ref statuses) = self.status {
            if !statuses.contains(&task.status) {
                return false;
            }
        }

        if let Some(ref excluded) = self.exclude_status {
            if excluded.contains(&task.status) {
                return false;
            }
        }

        true
    }

    fn matches_assignment(&self, task: &crate::Task) -> bool {
        // Project assignment filtering
        if let Some(ref filter_project) = self.project {
            match &task.project {
                Some(task_project) if task_project == filter_project => {}
                _ => return false,
            }
        }

        if let Some(has_project) = self.has_project {
            if has_project && task.project.is_none() {
                return false;
            }
            if !has_project && task.project.is_some() {
                return false;
            }
        }

        // Area assignment filtering (direct area only, not via project)
        if let Some(ref filter_area) = self.area {
            match &task.area {
                Some(task_area) if task_area == filter_area => {}
                _ => return false,
            }
        }

        if let Some(has_area) = self.has_area {
            if has_area && task.area.is_none() {
                return false;
            }
            if !has_area && task.area.is_some() {
                return false;
            }
        }

        true
    }

    #[allow(clippy::too_many_lines)]
    fn matches_dates(&self, task: &crate::Task) -> bool {
        // Date filtering - compare by date portion
        if let Some(before) = self.due_before {
            match &task.due {
                Some(due) if due.date() < before => {}
                _ => return false,
            }
        }

        if let Some(after) = self.due_after {
            match &task.due {
                Some(due) if due.date() > after => {}
                _ => return false,
            }
        }

        if let Some(on) = self.due_on {
            match &task.due {
                Some(due) if due.date() == on => {}
                _ => return false,
            }
        }

        if let Some(before) = self.scheduled_before {
            match task.scheduled {
                Some(scheduled) if scheduled < before => {}
                _ => return false,
            }
        }

        if let Some(after) = self.scheduled_after {
            match task.scheduled {
                Some(scheduled) if scheduled > after => {}
                _ => return false,
            }
        }

        if let Some(on) = self.scheduled_on {
            match task.scheduled {
                Some(scheduled) if scheduled == on => {}
                _ => return false,
            }
        }

        if let Some(before) = self.created_before {
            // and_hms_opt with valid hours/mins/secs always returns Some
            let task_created = task.created_at.datetime().unwrap_or_else(|| {
                task.created_at
                    .date()
                    .and_hms_opt(0, 0, 0)
                    .unwrap_or_default()
            });
            if task_created >= before {
                return false;
            }
        }

        if let Some(after) = self.created_after {
            // and_hms_opt with valid hours/mins/secs always returns Some
            let task_created = task.created_at.datetime().unwrap_or_else(|| {
                task.created_at
                    .date()
                    .and_hms_opt(23, 59, 59)
                    .unwrap_or_default()
            });
            if task_created <= after {
                return false;
            }
        }

        // visible_as_of: task is visible if defer_until is None or defer_until <= date
        if let Some(visible_date) = self.visible_as_of {
            if let Some(defer_until) = task.defer_until {
                if defer_until > visible_date {
                    return false;
                }
            }
        }

        true
    }
}

/// Filter criteria for querying areas.
#[derive(Debug, Clone, Default)]
pub struct AreaFilter {
    /// Include only areas with one of these statuses.
    /// If None, returns all areas.
    /// Use `Some(vec![AreaStatus::Active])` to exclude archived.
    pub status: Option<Vec<AreaStatus>>,
}

impl AreaFilter {
    /// Create a new empty filter.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Filter to areas with this status.
    #[must_use]
    pub fn with_status(mut self, status: AreaStatus) -> Self {
        self.status = Some(vec![status]);
        self
    }

    /// Filter to areas with any of these statuses.
    #[must_use]
    pub fn with_statuses(mut self, statuses: impl IntoIterator<Item = AreaStatus>) -> Self {
        self.status = Some(statuses.into_iter().collect());
        self
    }

    // === Preset Filters ===

    /// Only active areas (not archived).
    #[must_use]
    pub fn active() -> Self {
        Self::new().with_status(AreaStatus::Active)
    }
}

impl ProjectFilter {
    /// Check if a project matches this filter.
    #[must_use]
    pub fn matches(&self, project: &crate::Project) -> bool {
        // Status filtering
        if let Some(ref statuses) = self.status {
            match &project.status {
                Some(project_status) if statuses.contains(project_status) => {}
                None if statuses.is_empty() => {} // No status required
                _ => return false,
            }
        }

        // Area filtering
        if let Some(ref filter_area) = self.area {
            match &project.area {
                Some(project_area) if project_area == filter_area => {}
                _ => return false,
            }
        }

        if let Some(has_area) = self.has_area {
            if has_area && project.area.is_none() {
                return false;
            }
            if !has_area && project.area.is_some() {
                return false;
            }
        }

        true
    }
}

impl AreaFilter {
    /// Check if an area matches this filter.
    #[must_use]
    pub fn matches(&self, area: &crate::Area) -> bool {
        // Status filtering
        if let Some(ref statuses) = self.status {
            // Default to Active if no status is set
            let area_status = area.status.unwrap_or(AreaStatus::Active);
            if !statuses.contains(&area_status) {
                return false;
            }
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    mod task_filter {
        use super::*;

        #[test]
        fn empty_filter() {
            let filter = TaskFilter::new();
            assert!(filter.status.is_none());
            assert!(filter.project.is_none());
            assert!(!filter.include_archive_dir);
        }

        #[test]
        fn builder_chain() {
            let filter = TaskFilter::new()
                .with_status(TaskStatus::Ready)
                .in_project("[[My Project]]")
                .due_before(NaiveDate::from_ymd_opt(2025, 12, 31).unwrap())
                .include_archive_dir();

            assert_eq!(filter.status, Some(vec![TaskStatus::Ready]));
            assert!(filter.project.is_some());
            assert!(filter.due_before.is_some());
            assert!(filter.include_archive_dir);
        }

        #[test]
        fn multiple_statuses() {
            let filter =
                TaskFilter::new().with_statuses([TaskStatus::Ready, TaskStatus::InProgress]);

            assert_eq!(
                filter.status,
                Some(vec![TaskStatus::Ready, TaskStatus::InProgress])
            );
        }

        #[test]
        fn excluding_statuses() {
            let filter = TaskFilter::new()
                .excluding_status(TaskStatus::Done)
                .excluding_status(TaskStatus::Dropped);

            assert_eq!(
                filter.exclude_status,
                Some(vec![TaskStatus::Done, TaskStatus::Dropped])
            );
        }

        #[test]
        fn preset_inbox() {
            let filter = TaskFilter::inbox();
            assert_eq!(filter.status, Some(vec![TaskStatus::Inbox]));
        }

        #[test]
        fn preset_overdue() {
            let today = NaiveDate::from_ymd_opt(2025, 6, 15).unwrap();
            let filter = TaskFilter::overdue(today);

            assert_eq!(filter.due_before, Some(today));
            assert!(filter
                .exclude_status
                .as_ref()
                .is_some_and(|s| s.contains(&TaskStatus::Done)));
        }

        #[test]
        fn preset_available() {
            let today = NaiveDate::from_ymd_opt(2025, 6, 15).unwrap();
            let filter = TaskFilter::available(today);

            assert_eq!(filter.visible_as_of, Some(today));
            assert!(filter
                .status
                .as_ref()
                .is_some_and(|s| s.contains(&TaskStatus::Ready)));
        }
    }

    mod project_filter {
        use super::*;

        #[test]
        fn empty_filter() {
            let filter = ProjectFilter::new();
            assert!(filter.status.is_none());
            assert!(filter.area.is_none());
        }

        #[test]
        fn builder_chain() {
            let filter = ProjectFilter::new()
                .with_status(ProjectStatus::InProgress)
                .in_area("[[Work]]");

            assert_eq!(filter.status, Some(vec![ProjectStatus::InProgress]));
            assert!(filter.area.is_some());
        }

        #[test]
        fn preset_active() {
            let filter = ProjectFilter::active();
            let statuses = filter.status.unwrap();
            assert!(statuses.contains(&ProjectStatus::InProgress));
            assert!(statuses.contains(&ProjectStatus::Ready));
            assert!(!statuses.contains(&ProjectStatus::Done));
        }
    }

    mod area_filter {
        use super::*;

        #[test]
        fn empty_filter() {
            let filter = AreaFilter::new();
            assert!(filter.status.is_none());
        }

        #[test]
        fn preset_active() {
            let filter = AreaFilter::active();
            assert_eq!(filter.status, Some(vec![AreaStatus::Active]));
        }
    }

    mod task_filter_matches {
        use super::*;
        use crate::Task;
        use std::collections::HashMap;
        use std::path::PathBuf;

        fn sample_task() -> Task {
            Task {
                path: PathBuf::from("/tasks/test.md"),
                title: "Test Task".to_string(),
                status: TaskStatus::Ready,
                created_at: "2025-01-01".parse().unwrap(),
                updated_at: "2025-01-02".parse().unwrap(),
                completed_at: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project: None,
                area: None,
                body: String::new(),
                extra: HashMap::new(),
                projects_count: None,
            }
        }

        #[test]
        fn empty_filter_matches_all() {
            let filter = TaskFilter::new();
            let task = sample_task();
            assert!(filter.matches(&task));
        }

        #[test]
        fn status_filter_matches() {
            let filter = TaskFilter::new().with_status(TaskStatus::Ready);
            let task = sample_task();
            assert!(filter.matches(&task));
        }

        #[test]
        fn status_filter_no_match() {
            let filter = TaskFilter::new().with_status(TaskStatus::Done);
            let task = sample_task();
            assert!(!filter.matches(&task));
        }

        #[test]
        fn multiple_statuses_match_any() {
            let filter = TaskFilter::new().with_statuses([TaskStatus::Inbox, TaskStatus::Ready]);
            let task = sample_task();
            assert!(filter.matches(&task));
        }

        #[test]
        fn exclude_status_filters_out() {
            let filter = TaskFilter::new().excluding_status(TaskStatus::Ready);
            let task = sample_task();
            assert!(!filter.matches(&task));
        }

        #[test]
        fn archived_tasks_excluded_by_default() {
            let filter = TaskFilter::new();
            let mut task = sample_task();
            task.path = PathBuf::from("/tasks/archive/test.md");
            assert!(!filter.matches(&task));
        }

        #[test]
        fn archived_tasks_included_when_requested() {
            let filter = TaskFilter::new().include_archive_dir();
            let mut task = sample_task();
            task.path = PathBuf::from("/tasks/archive/test.md");
            assert!(filter.matches(&task));
        }

        #[test]
        fn project_filter_matches() {
            let filter = TaskFilter::new().in_project("[[My Project]]");
            let mut task = sample_task();
            task.project = Some(FileReference::wiki_link("My Project"));
            assert!(filter.matches(&task));
        }

        #[test]
        fn project_filter_no_match_different_project() {
            let filter = TaskFilter::new().in_project("[[My Project]]");
            let mut task = sample_task();
            task.project = Some(FileReference::wiki_link("Other Project"));
            assert!(!filter.matches(&task));
        }

        #[test]
        fn project_filter_no_match_no_project() {
            let filter = TaskFilter::new().in_project("[[My Project]]");
            let task = sample_task();
            assert!(!filter.matches(&task));
        }

        #[test]
        fn has_project_filter() {
            let filter = TaskFilter::new().with_project();
            let mut task = sample_task();
            assert!(!filter.matches(&task));

            task.project = Some(FileReference::wiki_link("Any"));
            assert!(filter.matches(&task));
        }

        #[test]
        fn without_project_filter() {
            let filter = TaskFilter::new().without_project();
            let task = sample_task();
            assert!(filter.matches(&task));

            let mut task_with_proj = sample_task();
            task_with_proj.project = Some(FileReference::wiki_link("Any"));
            assert!(!filter.matches(&task_with_proj));
        }

        #[test]
        fn due_before_matches() {
            let filter =
                TaskFilter::new().due_before(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            let mut task = sample_task();
            task.due = Some("2025-06-14".parse().unwrap());
            assert!(filter.matches(&task));

            task.due = Some("2025-06-15".parse().unwrap());
            assert!(!filter.matches(&task));

            task.due = None;
            assert!(!filter.matches(&task));
        }

        #[test]
        fn due_after_matches() {
            let filter = TaskFilter::new().due_after(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            let mut task = sample_task();
            task.due = Some("2025-06-16".parse().unwrap());
            assert!(filter.matches(&task));

            task.due = Some("2025-06-15".parse().unwrap());
            assert!(!filter.matches(&task));
        }

        #[test]
        fn due_on_matches() {
            let filter = TaskFilter::new().due_on(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            let mut task = sample_task();
            task.due = Some("2025-06-15".parse().unwrap());
            assert!(filter.matches(&task));

            task.due = Some("2025-06-14".parse().unwrap());
            assert!(!filter.matches(&task));
        }

        #[test]
        fn scheduled_on_matches() {
            let filter =
                TaskFilter::new().scheduled_on(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            let mut task = sample_task();
            task.scheduled = Some(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            assert!(filter.matches(&task));

            task.scheduled = Some(NaiveDate::from_ymd_opt(2025, 6, 14).unwrap());
            assert!(!filter.matches(&task));

            task.scheduled = None;
            assert!(!filter.matches(&task));
        }

        #[test]
        fn visible_as_of_no_defer() {
            let filter =
                TaskFilter::new().visible_as_of(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            let task = sample_task(); // No defer_until
            assert!(filter.matches(&task));
        }

        #[test]
        fn visible_as_of_defer_passed() {
            let filter =
                TaskFilter::new().visible_as_of(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            let mut task = sample_task();
            task.defer_until = Some(NaiveDate::from_ymd_opt(2025, 6, 10).unwrap());
            assert!(filter.matches(&task));
        }

        #[test]
        fn visible_as_of_defer_exact() {
            let filter =
                TaskFilter::new().visible_as_of(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            let mut task = sample_task();
            task.defer_until = Some(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            assert!(filter.matches(&task));
        }

        #[test]
        fn visible_as_of_defer_future() {
            let filter =
                TaskFilter::new().visible_as_of(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());
            let mut task = sample_task();
            task.defer_until = Some(NaiveDate::from_ymd_opt(2025, 6, 20).unwrap());
            assert!(!filter.matches(&task));
        }

        #[test]
        fn combined_filters_and_logic() {
            let filter = TaskFilter::new()
                .with_status(TaskStatus::Ready)
                .visible_as_of(NaiveDate::from_ymd_opt(2025, 6, 15).unwrap());

            // Matches both criteria
            let task = sample_task();
            assert!(filter.matches(&task));

            // Wrong status
            let mut wrong_status = sample_task();
            wrong_status.status = TaskStatus::Done;
            assert!(!filter.matches(&wrong_status));

            // Not visible yet
            let mut deferred = sample_task();
            deferred.defer_until = Some(NaiveDate::from_ymd_opt(2025, 6, 20).unwrap());
            assert!(!filter.matches(&deferred));
        }
    }

    mod project_filter_matches {
        use super::*;
        use crate::Project;
        use std::collections::HashMap;
        use std::path::PathBuf;

        fn sample_project() -> Project {
            Project {
                path: PathBuf::from("/projects/test.md"),
                title: "Test Project".to_string(),
                unique_id: None,
                status: Some(ProjectStatus::InProgress),
                description: None,
                area: None,
                start_date: None,
                end_date: None,
                blocked_by: Vec::new(),
                body: String::new(),
                extra: HashMap::new(),
            }
        }

        #[test]
        fn empty_filter_matches_all() {
            let filter = ProjectFilter::new();
            let project = sample_project();
            assert!(filter.matches(&project));
        }

        #[test]
        fn status_filter_matches() {
            let filter = ProjectFilter::new().with_status(ProjectStatus::InProgress);
            let project = sample_project();
            assert!(filter.matches(&project));
        }

        #[test]
        fn status_filter_no_match() {
            let filter = ProjectFilter::new().with_status(ProjectStatus::Done);
            let project = sample_project();
            assert!(!filter.matches(&project));
        }

        #[test]
        fn area_filter_matches() {
            let filter = ProjectFilter::new().in_area("[[Work]]");
            let mut project = sample_project();
            project.area = Some(FileReference::wiki_link("Work"));
            assert!(filter.matches(&project));
        }

        #[test]
        fn area_filter_no_match() {
            let filter = ProjectFilter::new().in_area("[[Work]]");
            let project = sample_project();
            assert!(!filter.matches(&project));
        }
    }

    mod area_filter_matches {
        use super::*;
        use crate::Area;
        use std::collections::HashMap;
        use std::path::PathBuf;

        fn sample_area() -> Area {
            Area {
                path: PathBuf::from("/areas/test.md"),
                title: "Test Area".to_string(),
                status: Some(AreaStatus::Active),
                area_type: None,
                description: None,
                body: String::new(),
                extra: HashMap::new(),
            }
        }

        #[test]
        fn empty_filter_matches_all() {
            let filter = AreaFilter::new();
            let area = sample_area();
            assert!(filter.matches(&area));
        }

        #[test]
        fn status_filter_matches() {
            let filter = AreaFilter::active();
            let area = sample_area();
            assert!(filter.matches(&area));
        }

        #[test]
        fn status_filter_no_match() {
            let filter = AreaFilter::active();
            let mut area = sample_area();
            area.status = Some(AreaStatus::Archived);
            assert!(!filter.matches(&area));
        }

        #[test]
        fn no_status_defaults_to_active() {
            let filter = AreaFilter::active();
            let mut area = sample_area();
            area.status = None; // Should default to Active
            assert!(filter.matches(&area));
        }
    }
}
