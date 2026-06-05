# Extended use case specifications

Companion to **FinalReport.docx.md** §3.4.2 (catalog **UC-01 … UC-50**). Wording is requirements-level (no implementation identifiers).

Inline §3.4.3 covers UC-01–UC-14, UC-17–UC-22, UC-25, UC-37–UC-43, UC-45, UC-47, and UC-08 where listed.

**Explore guided tour:** first-visit **Hướng dẫn** on Explore is an alternate flow of **UC-21 View 3D Simulation**, not a separate use case.

---

## UC-08 View Learning Path

| Field | Description |
| :---- | :---- |
| **Actor** | Guest, Student |
| **Trigger** | Open the tutorial hub from navigation, dashboard, or Explore links. |
| **Description** | Browse modules and progress on the structured learning path; optional sign-in for synced progress. |
| **Main Flow** | Open hub → choose module/node → open lesson overview or lesson (UC-20). |

## UC-15 Take Recall Quiz

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Trigger** | After completing certain tutorial or path lessons, a recall overlay appears. |
| **Description** | Short retention quiz; while active, Cosmo chat (UC-25) is temporarily unavailable. |
| **Post-Conditions** | Result updates learning progress. |

## UC-16 View My Orders

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Trigger** | Open **My orders** from the account area. |
| **Description** | Review past course purchases and payment status. |

## UC-22 Explore Sky Planetarium

**Full specification:** FinalReport §3.4.3 item **30)**.

## UC-23 Take Contextual Quiz

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Trigger** | Start a quiz from the Explore learning panel. |
| **Description** | Quiz tied to the current Explore context (not the full Cosmo chat flow). |

## UC-24 Track Concept Mastery

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Trigger** | View concept progress from Explore, tutorials, or summaries. |
| **Description** | See mastery level per science concept. |

## UC-25 Chat with Cosmo Assistant

| Field | Description |
| :---- | :---- |
| **Actor** | Guest (demo), Student, Teacher |
| **Trigger** | Open the Cosmo panel. |
| **Description** | Conversational help grounded in platform content; guest demo is limited. Navigation suggestions, search, and coach reminders run inside this experience (not separate use cases). |
| **Alternate Flow** | Guest demo; concept quiz (UC-26); rate reply (UC-27). |

## UC-26 Take Concept Quiz (Agent)

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Trigger** | Cosmo or a concept chip offers a quick concept check. |
| **Description** | Short quiz from chat context; extends UC-25. |

## UC-27 Rate Agent Reply

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Trigger** | Thumbs up or down on an assistant message. |
| **Description** | Quality feedback for analytics; extends UC-25. |

## UC-28 Browse Community / News

| Field | Description |
| :---- | :---- |
| **Actor** | Guest, Moderator, Student |
| **Trigger** | Open the community area. |
| **Description** | Read forums and curated astronomy news. |

## UC-29 Post & Comment

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Description** | Create posts and threaded replies. |

## UC-30 Report Content

| Field | Description |
| :---- | :---- |
| **Actor** | Student, Moderator |
| **Description** | Flag posts or comments for moderation. |

## UC-31 Moderate Content

| Field | Description |
| :---- | :---- |
| **Actor** | Moderator, Admin |
| **Description** | Review reports; hide, remove, or warn as policy requires. |

## UC-32 Direct Messages

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Description** | Private messages between learners. |

## UC-33 Gem Shop & Avatar

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Description** | Browse the gem shop and equip avatar or cosmetic items bought with gems. |

## UC-34 Earn & Spend Gems

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Description** | Earn gems from learning; spend in shop or checkout. |

## UC-35 Solar Journey Milestones

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Description** | Track milestone progress on the Solar Journey reward track. |

## UC-36 View Notifications

| Field | Description |
| :---- | :---- |
| **Actor** | Student |
| **Description** | Read system and reward notifications. |

## UC-41 Make Quiz

| Field | Description |
| :---- | :---- |
| **Actor** | Teacher |
| **Description** | Author questions for quiz-type lessons in Studio. |

## UC-44 Showcase Entity Studio

| Field | Description |
| :---- | :---- |
| **Actor** | Teacher |
| **Description** | Manage 3D showcase entities for Explore and lessons. |

## UC-45 Manage User

| Field | Description |
| :---- | :---- |
| **Actor** | Admin |
| **Description** | Search users; change role; send password-reset email; deactivate or restore. |

## UC-46 Manage Order

Full specification: **FinalReport.docx.md** §3.4.3 item **28)** (Manage Order).

## UC-48 Manage Gem Economy

Full specification: **FinalReport.docx.md** §3.4.3 item **30)** (Manage Gem Economy).

## UC-49 Promo & Broadcast

Full specification: **FinalReport.docx.md** §3.4.3 item **31)** (Promo & Broadcast).

## UC-50 Platform Analytics, Audit & System

Full specification: **FinalReport.docx.md** §3.4.3 item **32)** (Platform Analytics, Audit & System). Includes admin home analytics (`/admin`) and optional GA4 client telemetry.
