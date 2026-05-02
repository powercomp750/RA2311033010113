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