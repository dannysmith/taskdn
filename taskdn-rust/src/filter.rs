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
}
