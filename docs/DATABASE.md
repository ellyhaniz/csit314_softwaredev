# Database Schema

**Database:** PostgreSQL 15
**File:** `bingbongfundraisers/db/init.sql`

---

## Tables Overview

| Table | Purpose |
|---|---|
| `users` | All user accounts (fund raiser, donee, user admin, platform management) |
| `categories` | FRA categories managed by platform |
| `fund_raising_activities` | Campaigns created by fund raisers |
| `donations` | Donations made by donees |
| `payment_details` | Saved payment info per user (tokenized) |
| `favorites` | FRAs shortlisted by donees |
| `ratings` | Donee rates their donation experience |
| `campaign_updates` | Updates posted by fund raisers on their FRA |
| `thank_you_messages` | Fund raiser thanks a specific donor |
| `reported_campaigns` | FRAs reported by users, reviewed by admin |
| `user_violations` | Violation records for flagged users |
| `user_preferences` | Language, location, category preferences per user |
| `platform_reports` | Daily/weekly/monthly activity reports |

---

## Relationships

- One **user** (fund_raiser) → many **fund_raising_activities**
- One **user** (donee) → many **donations**
- One **user** → many **favorites**
- One **user** → many **ratings**
- One **user** → one **user_preferences**
- One **user** → many **payment_details**
- One **user** → many **user_violations**
- One **category** → many **fund_raising_activities**
- One **fund_raising_activity** → many **donations**
- One **fund_raising_activity** → many **favorites**
- One **fund_raising_activity** → many **ratings**
- One **fund_raising_activity** → many **campaign_updates**
- One **fund_raising_activity** → many **thank_you_messages**
- One **fund_raising_activity** → many **reported_campaigns**

---

## ER Diagram

```mermaid
erDiagram
    users {
        int id PK
        string email
        string password_hash
        enum user_type
        enum status
        string full_name
        string phone
        string preferred_language
        int violation_count
    }

    categories {
        int id PK
        string name
        string slug
    }

    fund_raising_activities {
        int id PK
        int fund_raiser_id FK
        int category_id FK
        string title
        text description
        numeric target_amount
        numeric current_amount
        enum status
        date end_date
        string location_text
        numeric latitude
        numeric longitude
        int view_count
        int shortlist_count
        numeric impact_score
    }

    donations {
        int id PK
        int fra_id FK
        int donor_id FK
        numeric amount
        enum status
        boolean is_anonymous
        text message
        text flagged_reason
    }

    payment_details {
        int id PK
        int user_id FK
        char card_last_four
        string card_brand
        string payment_token
        boolean is_default
    }

    favorites {
        int id PK
        int user_id FK
        int fra_id FK
    }

    ratings {
        int id PK
        int donor_id FK
        int fra_id FK
        int rating
        text comment
    }

    campaign_updates {
        int id PK
        int fra_id FK
        string title
        text content
    }

    thank_you_messages {
        int id PK
        int fra_id FK
        int fund_raiser_id FK
        int donor_id FK
        text message
    }

    reported_campaigns {
        int id PK
        int fra_id FK
        int reported_by FK
        text reason
        enum status
        int reviewed_by FK
    }

    user_violations {
        int id PK
        int user_id FK
        string type
        text description
        int actioned_by FK
    }

    user_preferences {
        int id PK
        int user_id FK
        int[] preferred_categories
        string preferred_location
        int max_distance_km
    }

    platform_reports {
        int id PK
        enum period
        date report_date
        int new_fras
        numeric total_donations
        int active_users
        int new_users
        int generated_by FK
    }

    users ||--o{ fund_raising_activities : "creates"
    users ||--o{ donations : "makes"
    users ||--o{ favorites : "saves"
    users ||--o{ ratings : "gives"
    users ||--|| user_preferences : "has"
    users ||--o{ payment_details : "stores"
    users ||--o{ user_violations : "receives"
    users ||--o{ thank_you_messages : "sends"
    users ||--o{ reported_campaigns : "reports"
    users ||--o{ platform_reports : "generates"
    categories ||--o{ fund_raising_activities : "classifies"
    fund_raising_activities ||--o{ donations : "receives"
    fund_raising_activities ||--o{ favorites : "saved in"
    fund_raising_activities ||--o{ ratings : "rated by"
    fund_raising_activities ||--o{ campaign_updates : "has"
    fund_raising_activities ||--o{ thank_you_messages : "linked to"
    fund_raising_activities ||--o{ reported_campaigns : "flagged in"
```

---

## User Types

The `users` table handles all user types via the `user_type` column:

| user_type | Role |
|---|---|
| `fund_raiser` | Creates and manages FRAs |
| `donee` | Searches and donates to FRAs |
| `user_admin` | Reviews violations and reported campaigns |
| `platform_management` | Manages categories and generates reports |
