# Stage 1 — Notification System API Design

## Overview

The goal of this system is to let students receive real-time notifications about placements, events, and results. The APIs follow RESTful conventions, are designed with scalability in mind, and should be straightforward to integrate with any frontend application.

---

## Authentication

Every endpoint expects a valid token in the request header:

    Authorization: Bearer <token>

---

## 1. Fetch Notifications

### Endpoint

    GET /notifications

### Description

Returns all notifications for the currently logged-in user. You can narrow down the results using optional query parameters.

### Query Parameters (optional)

* `type` — Placement | Event | Result
* `isRead` — true | false
* `page` — page number
* `limit` — results per page

### Response

```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "Company XYZ hiring",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

---

## 2. Mark Notification as Read

### Endpoint

    PATCH /notifications/{id}/read

### Description

Marks a single notification as read for the current user.

### Response

```json
{
  "message": "Notification marked as read"
}
```

---

## 3. Mark All Notifications as Read

### Endpoint

    PATCH /notifications/read-all

### Description

Marks every notification belonging to the current user as read in one go.

### Response

```json
{
  "message": "All notifications marked as read"
}
```

---

## 4. Create Notification (Admin)

### Endpoint

    POST /notifications

### Description

Allows an admin or HR system to create a new notification and target it at specific students.

### Request Body

```json
{
  "type": "Placement",
  "message": "Amazon hiring drive",
  "targetUsers": ["student1", "student2"]
}
```

### Response

```json
{
  "id": "uuid",
  "message": "Notification created successfully"
}
```

---

## 5. Get Unread Notification Count

### Endpoint

    GET /notifications/unread-count

### Description

Returns the number of unread notifications for the current user. This is useful for showing a badge count in the UI without fetching full notification data.

### Response

```json
{
  "count": 5
}
```

---

## 6. Delete Notification (Optional)

### Endpoint

    DELETE /notifications/{id}

### Description

Removes a notification from the system. Intended as an admin-only action.

### Response

```json
{
  "message": "Notification deleted successfully"
}
```

---

## Design Considerations

* The API follows RESTful conventions with clear, predictable naming.
* Pagination is built in from the start so the system can handle growing data volumes.
* Filtering by type and read status keeps the client-side logic simple.
* Bearer token authentication secures all endpoints.
* The design is extensible — WebSockets or push notifications can be layered on later for real-time delivery.
* JSON responses are kept minimal and consistent across endpoints.

---

## Data Model (High-Level)

Each notification record contains the following fields:

* `id` — UUID, primary key
* `type` — one of Placement, Event, or Result
* `message` — the notification text
* `isRead` — whether the user has seen it
* `createdAt` — timestamp of creation
* `userId` — reference to the student

---


# Stage 2 — Database Design & Scaling Strategy

## Choice of Database

We recommend **PostgreSQL** as the relational database for this system.

### Why PostgreSQL?

PostgreSQL provides strong consistency guarantees, which matter when you need to be sure a student actually received a notification. The data is inherently structured — students and their notifications have a clear relationship — so a relational model fits naturally. PostgreSQL also offers mature indexing and query optimization features that will be important as the dataset grows.

---

## Database Schema

### Table: students

| Column | Type      | Description       |
| ------ | --------- | ----------------- |
| id     | UUID (PK) | Unique student ID |
| email  | VARCHAR   | Student email     |
| name   | VARCHAR   | Student name      |

---

### Table: notifications

| Column     | Type      | Description                |
| ---------- | --------- | -------------------------- |
| id         | UUID (PK) | Notification ID            |
| type       | ENUM      | Placement / Event / Result |
| message    | TEXT      | Notification content       |
| created_at | TIMESTAMP | Creation time              |

---

### Table: user_notifications

This is a mapping table that establishes a many-to-many relationship between students and notifications.

| Column          | Type      | Description     |
| --------------- | --------- | --------------- |
| id              | UUID (PK) | Mapping ID      |
| user_id         | UUID (FK) | Student ID      |
| notification_id | UUID (FK) | Notification ID |
| is_read         | BOOLEAN   | Read status     |

---

## Why this Design?

Separating the notification content from the per-user read status has a couple of important benefits. First, it means a single notification can be broadcast to thousands of students without duplicating the message text. Second, it keeps each table focused on one concern, which makes queries and future schema changes simpler.

---

## Sample Queries

### 1. Fetch Notifications for a User

```sql
SELECT n.id, n.type, n.message, n.created_at, un.is_read
FROM notifications n
JOIN user_notifications un ON n.id = un.notification_id
WHERE un.user_id = 'USER_ID'
ORDER BY n.created_at DESC
LIMIT 10 OFFSET 0;
```

---

### 2. Fetch Unread Notifications

```sql
SELECT n.*
FROM notifications n
JOIN user_notifications un ON n.id = un.notification_id
WHERE un.user_id = 'USER_ID' AND un.is_read = false;
```

---

### 3. Mark Notification as Read

```sql
UPDATE user_notifications
SET is_read = true
WHERE user_id = 'USER_ID' AND notification_id = 'NOTIFICATION_ID';
```

---

### 4. Count Unread Notifications

```sql
SELECT COUNT(*)
FROM user_notifications
WHERE user_id = 'USER_ID' AND is_read = false;
```

---

### 5. Create Notification

```sql
INSERT INTO notifications (id, type, message, created_at)
VALUES (uuid_generate_v4(), 'Placement', 'Amazon hiring', NOW());
```

---

## Scaling Challenges

As the system grows — say, 50,000 users and 5 million notifications — several problems will surface:

* Queries on large tables become slow without proper indexing.
* Read load increases because every student checks notifications frequently.
* Joins between the notifications and user_notifications tables get expensive.
* Traditional OFFSET-based pagination degrades as page numbers increase.

---

## Solutions

### 1. Indexing

Add indexes on the columns that appear most often in WHERE and ORDER BY clauses: `user_id`, `is_read`, and `created_at`.

---

### 2. Pagination Optimization

Switch from OFFSET-based pagination to cursor-based pagination. Instead of skipping rows, use the last seen `created_at` value as a cursor. This keeps query performance constant regardless of how deep the user scrolls.

---

### 3. Caching

Use Redis to cache the unread notification count and the most recent notifications for each user. This avoids hitting the database on every page load.

---

### 4. Partitioning

Partition the notifications table by date (for example, one partition per month). This limits the amount of data the database needs to scan for time-bounded queries.

---

### 5. Background Processing

Use a message queue like Kafka or RabbitMQ to handle bulk notification creation asynchronously, keeping the API responsive even when broadcasting to tens of thousands of users.

---

## Summary

PostgreSQL is a solid choice here because of its consistency guarantees and mature tooling. The three-table schema cleanly separates concerns and supports efficient broadcasting. With proper indexing, cursor-based pagination, caching, and partitioning, the system can scale comfortably to millions of records.

---


# Stage 3 — Query Optimization & Indexing

## Given Query

```sql
SELECT *
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

---

## Is this query accurate?

Not quite. In our schema, the read status (`is_read`) lives in the `user_notifications` table, not in `notifications` directly. So the correct version needs a JOIN between the two tables.

---

## Why is this query slow?

There are four main reasons:

**1. No Index Usage** — Filtering on `studentID` and `isRead` without any indexes forces the database to perform a full table scan.

**2. Sorting Over Large Data** — `ORDER BY createdAt DESC` on millions of rows is an expensive sort operation.

**3. SELECT \*** — Fetching every column, including ones the client does not need, increases I/O and memory usage.

**4. Large Dataset** — With over 5 million notifications, any unoptimized query will struggle.

---

## Optimized Query

```sql
SELECT n.id, n.type, n.message, n.created_at
FROM notifications n
JOIN user_notifications un 
  ON n.id = un.notification_id
WHERE un.user_id = 1042 
  AND un.is_read = false
ORDER BY n.created_at DESC
LIMIT 20;
```

---

## Improvements Made

* Uses the correct schema with a JOIN instead of querying a single flat table.
* Limits the result set with `LIMIT`, so the database stops scanning as soon as it finds enough rows.
* Selects only the columns the client actually needs, reducing data transfer.
* Combined with proper indexes, the scan size drops dramatically.

---

## Recommended Indexes

```sql
CREATE INDEX idx_user_read 
ON user_notifications(user_id, is_read);
```

```sql
CREATE INDEX idx_created_at 
ON notifications(created_at DESC);
```

The composite index on `(user_id, is_read)` lets the database quickly find unread notifications for a specific user. The descending index on `created_at` speeds up the ORDER BY clause.

---

## Computation Cost

| Version   | Complexity                    |
| --------- | ----------------------------- |
| Original  | O(N log N) (full scan + sort) |
| Optimized | O(log N + K)                  |

Here, N is the total number of rows, and K is the result size (which stays small thanks to the LIMIT clause).

---

## Should we index every column?

No, and here is why:

* Every index slows down INSERT and UPDATE operations because the database has to maintain the index structure alongside the data.
* Indexes consume storage, and most of them will never be used if they do not correspond to actual query patterns.

The right approach is to index only the fields that appear frequently in query filters and sort clauses — in this case, `user_id`, `is_read`, and `created_at`.

---

## Query: Placement Notifications (Last 7 Days)

```sql
SELECT DISTINCT un.user_id
FROM notifications n
JOIN user_notifications un 
  ON n.id = un.notification_id
WHERE n.type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days';
```

---

## Summary

The original query was both structurally incorrect (wrong table) and inefficient (full scan, no limit). The optimized version uses the proper schema, adds targeted indexes, and limits the result set. The general principle is to index selectively — only the columns that your queries actually filter or sort on.

---

