//! Date and datetime value types that preserve original format.

use chrono::{NaiveDate, NaiveDateTime};
use std::fmt;
use std::str::FromStr;

/// A date or datetime value, preserving the original format for round-trip serialization.
///
/// The Taskdn spec allows both date (`YYYY-MM-DD`) and datetime (`YYYY-MM-DDTHH:MM:SS`)
/// formats for certain fields. This enum preserves which format was used so we can
/// write it back in the same format.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum DateTimeValue {
    /// A date-only value (YYYY-MM-DD).
    Date(NaiveDate),
    /// A datetime value (YYYY-MM-DDTHH:MM:SS).
    DateTime(NaiveDateTime),
}

impl DateTimeValue {
    /// Returns the date portion of this value.
    #[must_use]
    pub fn date(&self) -> NaiveDate {
        match self {
            Self::Date(d) => *d,
            Self::DateTime(dt) => dt.date(),
        }
    }

    /// Returns the datetime if this is a `DateTime` variant, `None` otherwise.
    #[must_use]
    pub fn datetime(&self) -> Option<NaiveDateTime> {
        match self {
            Self::Date(_) => None,
            Self::DateTime(dt) => Some(*dt),
        }
    }

    /// Returns true if this is a date-only value.
    #[must_use]
    pub fn is_date_only(&self) -> bool {
        matches!(self, Self::Date(_))
    }

    /// Creates a new date-only value.
    #[must_use]
    pub fn from_date(date: NaiveDate) -> Self {
        Self::Date(date)
    }

    /// Creates a new datetime value.
    #[must_use]
    pub fn from_datetime(datetime: NaiveDateTime) -> Self {
        Self::DateTime(datetime)
    }

    /// Creates a `DateTimeValue` from the current UTC time.
    #[must_use]
    pub fn now() -> Self {
        Self::DateTime(chrono::Utc::now().naive_utc())
    }

    /// Creates a `DateTimeValue` for today's date (date-only).
    #[must_use]
    pub fn today() -> Self {
        Self::Date(chrono::Utc::now().naive_utc().date())
    }
}

impl fmt::Display for DateTimeValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Date(d) => write!(f, "{}", d.format("%Y-%m-%d")),
            Self::DateTime(dt) => write!(f, "{}", dt.format("%Y-%m-%dT%H:%M:%S")),
        }
    }
}

impl FromStr for DateTimeValue {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        // Try datetime formats (more specific first)
        // ISO format with seconds: YYYY-MM-DDTHH:MM:SS
        if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
            return Ok(Self::DateTime(dt));
        }

        // ISO format without seconds: YYYY-MM-DDTHH:MM
        if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M") {
            return Ok(Self::DateTime(dt));
        }

        // Space-separated format with seconds: YYYY-MM-DD HH:MM:SS
        if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
            return Ok(Self::DateTime(dt));
        }

        // Space-separated format without seconds: YYYY-MM-DD HH:MM
        if let Ok(dt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M") {
            return Ok(Self::DateTime(dt));
        }

        // Try date
        if let Ok(d) = NaiveDate::parse_from_str(s, "%Y-%m-%d") {
            return Ok(Self::Date(d));
        }

        Err(format!("invalid date/datetime format: {s}"))
    }
}

impl From<NaiveDate> for DateTimeValue {
    fn from(date: NaiveDate) -> Self {
        Self::Date(date)
    }
}

impl From<NaiveDateTime> for DateTimeValue {
    fn from(datetime: NaiveDateTime) -> Self {
        Self::DateTime(datetime)
    }
}

impl PartialOrd for DateTimeValue {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for DateTimeValue {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // Compare as datetimes, treating date-only as midnight
        let self_dt = match self {
            Self::Date(d) => d.and_hms_opt(0, 0, 0).unwrap_or_default(),
            Self::DateTime(dt) => *dt,
        };
        let other_dt = match other {
            Self::Date(d) => d.and_hms_opt(0, 0, 0).unwrap_or_default(),
            Self::DateTime(dt) => *dt,
        };
        self_dt.cmp(&other_dt)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_date_only() {
        let value: DateTimeValue = "2025-01-15".parse().unwrap();
        assert!(value.is_date_only());
        assert_eq!(value.date(), NaiveDate::from_ymd_opt(2025, 1, 15).unwrap());
        assert!(value.datetime().is_none());
    }

    #[test]
    fn parse_datetime() {
        let value: DateTimeValue = "2025-01-15T14:30:00".parse().unwrap();
        assert!(!value.is_date_only());
        assert_eq!(value.date(), NaiveDate::from_ymd_opt(2025, 1, 15).unwrap());
        assert!(value.datetime().is_some());
    }

    #[test]
    fn parse_datetime_without_seconds() {
        let value: DateTimeValue = "2025-01-15T14:30".parse().unwrap();
        assert!(!value.is_date_only());
        assert_eq!(value.date(), NaiveDate::from_ymd_opt(2025, 1, 15).unwrap());
        let dt = value.datetime().unwrap();
        assert_eq!(dt.format("%H:%M").to_string(), "14:30");
    }

    #[test]
    fn parse_datetime_space_separated() {
        let value: DateTimeValue = "2025-01-15 14:30:00".parse().unwrap();
        assert!(!value.is_date_only());
        assert_eq!(value.date(), NaiveDate::from_ymd_opt(2025, 1, 15).unwrap());
        assert!(value.datetime().is_some());
    }

    #[test]
    fn parse_datetime_space_separated_without_seconds() {
        let value: DateTimeValue = "2025-01-15 14:30".parse().unwrap();
        assert!(!value.is_date_only());
        assert_eq!(value.date(), NaiveDate::from_ymd_opt(2025, 1, 15).unwrap());
        let dt = value.datetime().unwrap();
        assert_eq!(dt.format("%H:%M").to_string(), "14:30");
    }

    #[test]
    fn display_preserves_format() {
        let date_value: DateTimeValue = "2025-01-15".parse().unwrap();
        assert_eq!(date_value.to_string(), "2025-01-15");

        let datetime_value: DateTimeValue = "2025-01-15T14:30:00".parse().unwrap();
        assert_eq!(datetime_value.to_string(), "2025-01-15T14:30:00");
    }

    #[test]
    fn from_naive_date() {
        let date = NaiveDate::from_ymd_opt(2025, 6, 1).unwrap();
        let value = DateTimeValue::from(date);
        assert!(value.is_date_only());
        assert_eq!(value.date(), date);
    }

    #[test]
    fn from_naive_datetime() {
        let dt = NaiveDate::from_ymd_opt(2025, 6, 1)
            .unwrap()
            .and_hms_opt(10, 30, 0)
            .unwrap();
        let value = DateTimeValue::from(dt);
        assert!(!value.is_date_only());
        assert_eq!(value.datetime(), Some(dt));
    }

    #[test]
    fn ordering_works() {
        let earlier: DateTimeValue = "2025-01-01".parse().unwrap();
        let later: DateTimeValue = "2025-01-02".parse().unwrap();
        assert!(earlier < later);

        let date_value: DateTimeValue = "2025-01-01".parse().unwrap();
        let datetime_value: DateTimeValue = "2025-01-01T12:00:00".parse().unwrap();
        assert!(date_value < datetime_value); // date is midnight, so earlier than noon
    }

    #[test]
    fn invalid_format_returns_error() {
        let result: Result<DateTimeValue, _> = "not-a-date".parse();
        assert!(result.is_err());
    }
}
