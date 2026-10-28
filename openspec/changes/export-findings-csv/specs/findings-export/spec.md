# Spec Delta

## Purpose

Enables users to export vulnerability finding records from the dashboard into formatted CSV files for offline analysis and reporting.

## ADDED Requirements

### Requirement: RFC-4180 CSV Serialization
The system SHALL format finding records into RFC-4180 compliant CSV text, preserving columns for identification, project, scanner, severity, status, and detected timestamp. Values containing commas, double quotes, or newlines MUST be enclosed in double quotes, with embedded double quotes escaped by doubling them (`""`).

#### Scenario: Standard findings serialization
- **WHEN** finding records with standard alphanumeric values are exported
- **THEN** the system generates a comma-separated text file containing a header row followed by one row per finding

#### Scenario: Escaping special characters in text fields
- **WHEN** a finding description or location contains commas, quotes, or newlines
- **THEN** the field is enclosed in double quotes with internal quotes doubled (`""`) without corrupting CSV columns

### Requirement: Toolbar Export Action
The findings table toolbar SHALL provide an Export CSV action button that triggers an immediate download of all findings currently matching the active filters and search query.

#### Scenario: User downloads active findings
- **WHEN** user clicks the "Export CSV" button while one or more findings are displayed
- **THEN** the browser initiates a download of a CSV file named `findings-<scanType>-<YYYY-MM-DD>.csv`

#### Scenario: Empty findings state disables export
- **WHEN** active search or filters result in zero displayed findings
- **THEN** the Export CSV button SHALL be disabled with an explanatory tooltip
