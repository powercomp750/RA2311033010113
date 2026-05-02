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


# Stage 4 — Performance Optimization & Caching Strategy

## Problem

As it stands, notifications are fetched from the database on every single page load for every student. This creates three problems: high read load on the database, increased response latency, and a noticeably sluggish experience for users.

---

## Goals

* Cut down the number of direct database reads.
* Bring response times down to near-instant for common requests.
* Keep the data reasonably fresh so students are not seeing stale notifications.

---

## Proposed Solutions

### 1. Caching with Redis

The idea is simple: cache each user's recent notifications and their unread count in Redis. When a request comes in, check Redis first. If the data is there, return it immediately. If not, query the database, return the result, and store it in Redis for next time.

This brings response times close to O(1) and dramatically reduces database load. The trade-off is that cached data can become slightly stale, so a good cache invalidation strategy is essential.

---

### 2. Lazy Loading with Pagination

Rather than loading all notifications at once, fetch only the first 10 or 20 and load more as the user scrolls. This keeps the initial page load fast and reduces the query size. The downside is that it requires additional API calls as the user scrolls further.

---

### 3. Real-Time Push via WebSockets

Instead of having the client poll the server repeatedly, push new notifications to the client the moment they are created. This eliminates redundant fetching and gives users genuinely real-time updates. However, it adds architectural complexity — the server needs to maintain persistent connections with every active client.

---

### 4. Background Processing with Queues

For bulk notification scenarios (such as sending a placement alert to 50,000 students), offload the heavy lifting to a message queue like Kafka or RabbitMQ. Workers pick jobs off the queue and process them asynchronously, which keeps the API responsive during large broadcasts. The trade-off is additional infrastructure to manage.

---

### 5. Denormalization (Optional)

In our schema, the `is_read` flag already lives in the `user_notifications` mapping table, which avoids an extra join. If read patterns show that certain fields are always fetched together, we can consider storing them in a single denormalized table. This reduces join overhead at the cost of some data redundancy.

---

### 6. CDN / Edge Caching (Optional)

For notification content that does not change frequently, edge caching can speed up delivery for geographically distributed users. This is less useful for highly dynamic data like unread counts, but it can help for things like static announcement details.

---

## Cache Invalidation Strategy

The cache needs to stay in sync with the source of truth. Three rules handle this:

* When a new notification is created, update (or invalidate) the relevant user caches.
* When a notification is marked as read, update the cached unread count.
* Set a TTL of 1 to 5 minutes on cached entries as a safety net, so even if an invalidation is missed, the data self-corrects within a short window.

---

## Comparison of Approaches

| Strategy   | Performance | Complexity | Best Suited For |
| ---------- | ----------- | ---------- | --------------- |
| Caching    | High        | Medium     | Frequent reads  |
| Pagination | Medium      | Low        | Large datasets  |
| WebSockets | High        | High       | Real-time apps  |
| Queues     | High        | High       | Bulk processing |

---

## Final Recommendation

The most practical starting point is a combination of three strategies:

* **Redis caching** as the primary optimization — it gives the biggest performance win for the least effort.
* **Pagination** to keep query sizes manageable regardless of data volume.
* **WebSockets** added later for real-time delivery once the core system is stable.

---

## Summary

The key insight is to avoid hitting the database on every page load. Caching and pagination together handle the vast majority of read traffic. Real-time push (via WebSockets) can be layered on once the infrastructure supports persistent connections. The goal throughout is to balance performance improvements against system complexity.

---

# Stage 5 — Reliable & Scalable Notification Delivery

## Given Implementation

```pseudo
function notify_all(student_ids, message):
  for student_id in student_ids:
    send_email(student_id, message)
    save_to_db(student_id, message)
    push_to_app(student_id, message)
```

---

## Shortcomings

This implementation has several serious problems:

**1. Sequential Processing** — It processes users one at a time. For 50,000 students, this means every email, database write, and push notification happens in series. That is painfully slow.

**2. No Fault Tolerance** — If `send_email` fails halfway through the list, the system has no record of which users were successfully notified and which were not.

**3. No Retry Mechanism** — If email delivery fails for 200 users, those users simply never get notified. There is no mechanism to detect the failure and try again.

**4. Tight Coupling** — Email, database writes, and push notifications are all tangled together in one loop. A failure in one service (say, the email provider goes down) blocks the others from completing.

**5. No Parallelism** — The code does not take advantage of concurrency at all. Even if the email service and database are both available, they are never used simultaneously.

---

## What Happens When Email Fails for 200 Users?

In the current design, the notifications for users processed before the failure will have already been sent. The 200 users where email failed will receive nothing, and the system has no way to go back and retry. The result is an inconsistent state — some students are notified, others are silently dropped.

---

## Improved Design

### Key Principles

The redesign is built around four ideas:

* **Asynchronous processing** — decouple slow operations from the main request path.
* **Retry mechanism** — automatically retry failed deliveries.
* **Decoupled services** — let email, push, and database operations fail independently without blocking each other.
* **Idempotent operations** — make sure retrying a delivery does not create duplicate notifications.

---

## Should DB Save and Email Happen Together?

No. The database write is a local, reliable operation. Email delivery depends on an external service that can fail for any number of reasons — network issues, rate limits, provider outages. If you couple them together, a failed email can leave the database in an inconsistent state (or worse, a successful email with no database record).

The better approach is to save to the database first, confirming that the notification exists, and then handle email delivery as a separate, asynchronous step.

---

## Redesigned Architecture

### Step 1 — Save Notification

Insert the notification into the database for all target users. This is the source of truth and must succeed before anything else happens.

---

### Step 2 — Push to Queue

For each user, enqueue separate jobs for email delivery and push notification delivery. The queue acts as a buffer, decoupling the creation of the notification from its delivery.

---

### Step 3 — Worker Services

Dedicated worker processes pull jobs off the queues and handle delivery. There are separate workers for email and push notifications, so a problem with one channel does not affect the other.

---

## Revised Pseudocode

```pseudo
function notify_all(student_ids, message):

  notification_id = create_notification(message)

  for student_id in student_ids:
    save_to_db(student_id, notification_id)

    enqueue("email_queue", {
      student_id,
      message
    })

    enqueue("push_queue", {
      student_id,
      message
    })
```

---

## Worker Logic (Email)

```pseudo
worker email_worker:

  while true:
    job = dequeue("email_queue")

    try:
      send_email(job.student_id, job.message)
    except:
      retry(job, max_attempts=3)
```

---

## Worker Logic (Push)

```pseudo
worker push_worker:

  while true:
    job = dequeue("push_queue")
    send_push_notification(job.student_id, job.message)
```

---

## Key Improvements

* Jobs are processed in parallel via queue workers, so throughput scales horizontally.
* Failed deliveries are retried up to a configurable number of attempts.
* Email, push, and database operations are fully decoupled — a failure in one does not cascade.
* The database write happens first, so the notification always exists as a record even if delivery is delayed.
* Adding more workers lets the system scale to handle larger user bases without redesigning anything.

---

## Benefits

| Feature         | Improvement                              |
| --------------- | ---------------------------------------- |
| Reliability     | Failed jobs are retried automatically    |
| Scalability     | Workers can be scaled out horizontally   |
| Performance     | Async processing keeps the API fast      |
| Fault Tolerance | Services operate independently           |

---

## Summary

The original implementation was a straightforward loop that processed everything sequentially with no error handling. The redesigned system saves to the database first to guarantee data consistency, then delegates delivery to asynchronous workers via message queues. Retries handle transient failures, and the decoupled architecture means one broken service does not take down the rest.

---


# Stage 6 — Priority Notifications

## Approach

Not all notifications are equally important. A placement opportunity is more time-sensitive than a general event announcement. To surface the most relevant notifications first, we assign each one a priority score based on two factors:

1. **Type Weight** — Placements carry more weight than Results, which in turn carry more weight than Events.

2. **Recency** — Newer notifications should rank higher than older ones, all else being equal.

---

## Algorithm

The scoring formula is:

    score = (type_weight * 10) + recency

Where `type_weight` is a numeric value assigned to each notification type (e.g., Placement = 3, Result = 2, Event = 1), and `recency` is derived from how recently the notification was created.

The steps are:

1. Fetch the user's notifications from the API.
2. Compute a priority score for each notification using the formula above.
3. Sort by score in descending order.
4. Return the top 10.

---

## Efficiency

A straightforward sort gives us O(n log n) complexity. However, since we only need the top 10 results, we can do better.

---

## Maintaining Top 10 Efficiently

Instead of sorting the entire list, use a min-heap of size 10. As each notification comes in, insert it into the heap. If the heap grows beyond 10 elements, remove the one with the lowest score. At the end, the heap contains exactly the 10 highest-scoring notifications.

This brings the complexity down to O(n log k), where k = 10 — essentially O(n) in practice. It also works well in a streaming context, where new notifications arrive continuously and you need to maintain a live top-10 list without re-sorting everything.

---

## Summary

Priority scoring combines notification type importance with recency to surface the most relevant items first. A min-heap approach makes the top-k selection efficient and well-suited for real-time systems where notifications arrive continuously.

---

