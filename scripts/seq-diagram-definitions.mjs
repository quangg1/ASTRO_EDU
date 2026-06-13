/**
 * Sequence diagram definitions at SYSTEM ARCHITECTURE level (design first, code later).
 *
 * Rules:
 * - Lifeline = deployment component (Web UI, API Server, DB, AI Service…)
 * - Message = business action / data exchange — NO file names, hooks, routes, or field names
 * - alt/opt = use-case branches, not implementation branches
 *
 * Architecture refs: docs/ARCHITECTURE_MERGED.md, client/DOMAIN_MAP.md
 */

/** @typedef {{ kind:'msg', from:string|number, to:string|number, label:string, dashed?:boolean }} Msg */
/** @typedef {{ kind:'self', who:string|number, label:string, dashed?:boolean }} Self */
/** @typedef {{ kind:'alt'|'opt', label?:string, operands:{ guard:string, steps:FlowNode[] }[] }} Frag */
/** @typedef {Msg|Self|Frag} FlowNode */

export const DIAGRAMS = [
  {
    file: 'UC-21-View-3D-Simulation',
    title: 'UC-21 View 3D Simulation (Solar System / Museum)',
    actor: 'Guest / Student',
    note: 'Astronomy 3D simulation. Night sky = UC-22.',
    participants: [
      { id: 'ui', label: 'Web UI\n(Explore)' },
      { id: 'api', label: 'API Server\n(3D content)' },
      { id: 'db', label: 'Database' },
    ],
    spacing: 200,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open 3D Explore page' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request celestial catalog & orbits' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load published museum content' },
      { kind: 'msg', from: 'db', to: 'api', label: 'Celestial object list', dashed: true },
      { kind: 'msg', from: 'api', to: 'ui', label: '3D display payload', dashed: true },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Earth deep-history mode]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request geologic timeline' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Load history stages & fossils' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Show Earth by time period', dashed: true },
            ],
          },
          {
            guard: '[Planet history mode]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request planet narrative' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Load story beats & lesson links' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Show history globe', dashed: true },
            ],
          },
          {
            guard: '[Solar system mode]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Show orbits & info panel', dashed: true },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Select object on 3D model' },
      { kind: 'self', who: 'ui', label: 'Update camera focus & side panel' },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Signed-in student]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Record explore interaction' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request contextual quiz (if eligible)' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Quiz prompt / reward update', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-22-Explore-Sky-Planetarium',
    title: 'UC-22 Explore Sky Planetarium',
    actor: 'Guest / Student',
    note: '2D/3D planetarium. Quiz = UC-23.',
    participants: [
      { id: 'ui', label: 'Web UI\n(Planetarium)' },
      { id: 'api', label: 'API Server\n(Explore)' },
      { id: 'db', label: 'Database' },
    ],
    spacing: 200,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Switch to Sky mode' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request star & constellation catalog' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Server unreachable]',
            steps: [{ kind: 'self', who: 'ui', label: 'Use bundled offline star data' }],
          },
          {
            guard: '[Server OK]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Sky target catalog', dashed: true }],
          },
        ],
      },
      { kind: 'self', who: 'ui', label: 'Compute body positions for time & observer location' },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Render sky dome & constellation labels', dashed: true },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Pick star or constellation' },
      { kind: 'self', who: 'ui', label: 'Highlight target & show description' },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Cross-link to solar-system object]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Navigate to UC-21 with matching entity', dashed: true },
            ],
          },
        ],
      },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Student — explore quiz]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request question set for target' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Show quiz & record learning outcome', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-25-Chat-with-Cosmo',
    title: 'UC-25 Chat with Cosmo Assistant',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI\n(Cosmo widget)' },
      { id: 'api', label: 'API Server\n(Agent)' },
      { id: 'ai', label: 'AI Service' },
      { id: 'db', label: 'Database' },
    ],
    spacing: 165,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Enter question (optional image)' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Quiz in progress — not finished]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Prompt: finish quiz first', dashed: true },
            ],
          },
          {
            guard: '[Invalid input]',
            steps: [{ kind: 'msg', from: 'ui', to: 'actor', label: 'Show validation error', dashed: true }],
          },
          {
            guard: '[Valid]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Send message & learning context' },
              { kind: 'self', who: 'api', label: 'Verify session & usage quota' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[Quota exceeded]',
                    steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Reject — limit reached', dashed: true }],
                  },
                  {
                    guard: '[Within quota]',
                    steps: [
                      { kind: 'msg', from: 'api', to: 'ai', label: 'Request answer generation (with RAG)' },
                      { kind: 'msg', from: 'ai', to: 'api', label: 'Answer stream / tool suggestions', dashed: true },
                      { kind: 'msg', from: 'api', to: 'db', label: 'Persist conversation history' },
                      { kind: 'msg', from: 'api', to: 'ui', label: 'Stream response tokens', dashed: true },
                    ],
                  },
                ],
              },
              { kind: 'self', who: 'ui', label: 'Render reply & follow-up chips' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Update chat panel', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-28-Browse-Community',
    title: 'UC-28 Browse Community & News',
    actor: 'Guest / Student',
    participants: [
      { id: 'ui', label: 'Web UI\n(Community)' },
      { id: 'api', label: 'API Server\n(Community)' },
      { id: 'db', label: 'Database' },
    ],
    spacing: 200,
    flow: [
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Forums / cohort channels]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Open forum' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request post list' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Query pinned posts & pagination' },
            ],
          },
          {
            guard: '[News feed]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Open News page' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request channel news feed' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Load crawled articles' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Post list', dashed: true },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Open thread detail]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request content & comments' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Record view count' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Render feed or discussion thread', dashed: true },
    ],
  },
  {
    file: 'UC-29-Post-and-Comment',
    title: 'UC-29 Post & Comment',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI\n(Community)' },
      { id: 'api', label: 'API Server\n(Community)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Compose title & body' },
      { kind: 'self', who: 'ui', label: 'Client-side validation' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Invalid data]',
            steps: [{ kind: 'msg', from: 'ui', to: 'actor', label: 'Show errors', dashed: true }],
          },
          {
            guard: '[Valid]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Submit post or comment' },
              { kind: 'self', who: 'api', label: 'Authenticate & check forum access' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save post / comment' },
              {
                kind: 'opt',
                operands: [
                  {
                    guard: '[Daily reward eligible]',
                    steps: [{ kind: 'msg', from: 'api', to: 'db', label: 'Credit gem reward' }],
                  },
                ],
              },
              { kind: 'msg', from: 'api', to: 'ui', label: 'Confirm success', dashed: true },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Refresh discussion thread', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-30-Report-Content',
    title: 'UC-30 Report Content',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI' },
      { id: 'api', label: 'API Server\n(Moderation)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Choose report reason' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Submit content report' },
      { kind: 'self', who: 'api', label: 'Authenticate user' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Already reported]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Reject — duplicate report', dashed: true }],
          },
          {
            guard: '[Created]',
            steps: [
              { kind: 'msg', from: 'api', to: 'db', label: 'Save pending report' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Confirm report sent', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-31-Moderate-Content',
    title: 'UC-31 Moderate Content',
    actor: 'Moderator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Moderation queue)' },
      { id: 'api', label: 'API Server\n(Moderation)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open report queue' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request pending items' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Aggregate reports & related posts' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Queue list', dashed: true },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Choose moderation action' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Hide post or comment]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request hide content' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Mark hidden & record moderator' },
            ],
          },
          {
            guard: '[Resolve report]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request close report' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update report status' },
            ],
          },
          {
            guard: '[Warn member]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Send warning' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save warning & notification' },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-32-Direct-Messages',
    title: 'UC-32 Direct Messages',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI\n(Messages)' },
      { id: 'api', label: 'API Server\n(Messages)' },
      { id: 'db', label: 'Database' },
      { id: 'rt', label: 'Real-time channel\n(WebSocket)' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open inbox' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request conversation list' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load recent threads' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Select recipient' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[No conversation yet]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Create new conversation' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save conversation' },
            ],
          },
          {
            guard: '[Existing conversation]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request message history' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Load messages (paginated)' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Compose & send message' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Send message' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Persist message' },
      { kind: 'msg', from: 'api', to: 'rt', label: 'Push notification to recipient (if online)' },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Show message in chat', dashed: true },
    ],
  },
  {
    file: 'UC-33-Gem-Shop-Avatar',
    title: 'UC-33 Gem Shop & Avatar Decorations',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI\n(Gem shop)' },
      { id: 'api', label: 'API Server\n(Rewards)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open gem shop' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request catalog & wallet balance' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load items & gem wallet' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Catalog & balance', dashed: true },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Purchase decoration]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Select item → Buy' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request purchase' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[Insufficient gems]',
                    steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Reject — not enough gems', dashed: true }],
                  },
                  {
                    guard: '[Sufficient gems]',
                    steps: [
                      { kind: 'msg', from: 'api', to: 'db', label: 'Deduct gems & log transaction' },
                      { kind: 'msg', from: 'ui', to: 'actor', label: 'Update owned items', dashed: true },
                    ],
                  },
                ],
              },
            ],
          },
          {
            guard: '[Equip owned item]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Choose equipped decoration' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Update avatar equipment' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save selection' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Preview updated avatar', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-34-Earn-Spend-Gems',
    title: 'UC-34 Earn & Spend Gems',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI\n(Learning / Community)' },
      { id: 'api', label: 'API Server' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Complete lesson / quiz]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Complete learning activity' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Report progress' },
            ],
          },
          {
            guard: '[Community engagement]',
            steps: [{ kind: 'msg', from: 'ui', to: 'api', label: 'Record post / comment activity' }],
          },
          {
            guard: '[Unlock Explore content]',
            steps: [{ kind: 'msg', from: 'ui', to: 'api', label: 'Request gem unlock' }],
          },
        ],
      },
      { kind: 'self', who: 'api', label: 'Apply reward rules (daily caps / multipliers)' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Not eligible for reward]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'No gem change', dashed: true }],
          },
          {
            guard: '[Reward or spend applied]',
            steps: [
              { kind: 'msg', from: 'api', to: 'db', label: 'Update wallet & transaction log' },
              { kind: 'msg', from: 'api', to: 'ui', label: 'New gem balance', dashed: true },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Toast & header wallet update', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-35-Solar-Journey',
    title: 'UC-35 Solar Journey Milestones',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI' },
      { id: 'api', label: 'API Server\n(Learning path)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'View milestone track' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Guest — not signed in]',
            steps: [
              { kind: 'self', who: 'ui', label: 'Show progress from browser storage only' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Milestone strip (local only)', dashed: true },
            ],
          },
          {
            guard: '[Signed-in student]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Sync milestone progress' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Read / write completed milestones' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[Server empty, local has data]',
                    steps: [{ kind: 'msg', from: 'ui', to: 'api', label: 'Upload local progress to server' }],
                  },
                  {
                    guard: '[Server is source of truth]',
                    steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Saved progress', dashed: true }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Complete milestone (explore / lesson)' },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Update milestone strip (may include gem reward)', dashed: true },
    ],
  },
  {
    file: 'UC-36-View-Notifications',
    title: 'UC-36 View Notifications',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI\n(Notification bell)' },
      { id: 'api', label: 'API Server\n(Notifications)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open notification list' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request notifications (unread first)' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load user inbox' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Notification list', dashed: true },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Select notification' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Mark as read' },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Navigate to link (if any)', dashed: true },
    ],
  },
  {
    file: 'UC-37-View-Studio-Dashboard',
    title: 'UC-37 View Studio Dashboard',
    actor: 'Teacher',
    participants: [
      { id: 'ui', label: 'Web UI\n(Studio)' },
      { id: 'api', label: 'API Server\n(Courses)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open Studio' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Not authorized as teacher]',
            steps: [{ kind: 'msg', from: 'ui', to: 'actor', label: 'Redirect / access denied', dashed: true }],
          },
          {
            guard: '[Authorized]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request course overview' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Load courses & enrollment stats' },
              { kind: 'msg', from: 'api', to: 'ui', label: 'Dashboard payload', dashed: true },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Show course list & shortcuts', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-40-Manage-Cohort',
    title: 'UC-40 Manage Cohort',
    actor: 'Teacher',
    participants: [
      { id: 'ui', label: 'Web UI\n(Studio — Cohorts)' },
      { id: 'api', label: 'API Server\n(Courses)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open cohort management for course' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request cohort list' },
      { kind: 'self', who: 'api', label: 'Verify edit permission on course' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load cohorts & enrollment counts' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Cohort table', dashed: true },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Create new cohort]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Enter cohort details' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request create cohort' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save cohort & invite code' },
            ],
          },
          {
            guard: '[Update existing cohort]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Edit schedule / price / status' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request save changes' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update cohort record' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Refresh cohort list', dashed: true },
    ],
  },
  {
    file: 'UC-42-Manage-Learning-Path',
    title: 'UC-42 Manage Learning Path',
    actor: 'Teacher',
    participants: [
      { id: 'ui', label: 'Web UI\n(Studio — LP)' },
      { id: 'api', label: 'API Server\n(Learning path)' },
      { id: 'db', label: 'Database' },
      { id: 'ai', label: 'AI Service' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open learning path editor' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request draft path & concept catalog' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load module structure & lessons' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Edit modules, lessons, concept links' },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Generate recall quiz with AI]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request quiz for lesson' },
              { kind: 'msg', from: 'api', to: 'ai', label: 'Generate questions from lesson content' },
              { kind: 'msg', from: 'ai', to: 'api', label: 'Draft question set', dashed: true },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Save / publish learning path' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Submit updated path' },
      { kind: 'self', who: 'api', label: 'Validate structure & concept references' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Persist learning path' },
      { kind: 'msg', from: 'api', to: 'ai', label: 'Refresh search index (RAG)' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Content warnings remain]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Saved with warning list', dashed: true }],
          },
          {
            guard: '[Fully valid]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Confirm save success', dashed: true }],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-43-Manage-Concepts',
    title: 'UC-43 Manage Concept Library',
    actor: 'Teacher',
    participants: [
      { id: 'ui', label: 'Web UI\n(Studio — Concepts)' },
      { id: 'api', label: 'API Server\n(Concepts)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open concept library' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request full concept & taxonomy set' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load library' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Edit definitions, links, taxonomy tags' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Submit library update' },
      { kind: 'self', who: 'api', label: 'Validate prerequisite graph & unique ids' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Invalid]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Return validation errors', dashed: true }],
          },
          {
            guard: '[Valid]',
            steps: [
              { kind: 'msg', from: 'api', to: 'db', label: 'Save updated library' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Confirm saved', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-45-Manage-User',
    title: 'UC-45 Manage Users',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Admin)' },
      { id: 'api', label: 'API Server\n(Admin)' },
      { id: 'db', label: 'Database' },
      { id: 'audit', label: 'Audit log' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Search users' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request user list (filter / page)' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Query accounts' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Change role / status / send password reset' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Change role]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request role update' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save new role' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record admin action' },
            ],
          },
          {
            guard: '[Send password reset email]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request reset email' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record admin action' },
            ],
          },
          {
            guard: '[Deactivate / restore account]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request status change' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update account status' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record admin action' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Refresh user table', dashed: true },
    ],
  },
  {
    file: 'UC-46-Manage-Order',
    title: 'UC-46 Manage Orders',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Orders)' },
      { id: 'api', label: 'API Server\n(Payments)' },
      { id: 'db', label: 'Database' },
      { id: 'audit', label: 'Audit log' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open order list (filter / search)' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request orders' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Query orders & buyers' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Select order → view detail' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Save internal note]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Save admin note' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record action' },
            ],
          },
          {
            guard: '[Cancel pending order]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request cancellation' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Mark order cancelled' },
            ],
          },
          {
            guard: '[Refund completed order]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request refund with reason' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Refund & revoke enrollment' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record action' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Refresh order table', dashed: true },
    ],
  },
  {
    file: 'UC-47-Approve-Teacher',
    title: 'UC-47 Approve Teacher Application',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Teacher applications)' },
      { id: 'api', label: 'API Server\n(Admin)' },
      { id: 'db', label: 'Database' },
      { id: 'notify', label: 'Notification service' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'View pending applications' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request application list' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load applicant profiles' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Approve or reject (optional note)' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Submit decision' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Approved]',
            steps: [
              { kind: 'msg', from: 'api', to: 'db', label: 'Grant teacher role' },
              { kind: 'msg', from: 'api', to: 'notify', label: 'Send approval notification' },
            ],
          },
          {
            guard: '[Rejected]',
            steps: [
              { kind: 'msg', from: 'api', to: 'db', label: 'Save rejected status' },
              { kind: 'msg', from: 'api', to: 'notify', label: 'Send rejection notification' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Update pending list', dashed: true },
    ],
  },
  {
    file: 'UC-48-Manage-Gem-Economy',
    title: 'UC-48 Manage Gem Economy',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Gem economy)' },
      { id: 'api', label: 'API Server\n(Admin)' },
      { id: 'db', label: 'Database' },
      { id: 'audit', label: 'Gem economy audit log' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open gem economy dashboard' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request metrics & configuration' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Aggregate wallets & shop items' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Edit reward rules]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Update configuration' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Log config change' },
            ],
          },
          {
            guard: '[Manual gem adjustment]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Add or deduct gems for account' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update wallet' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Log adjustment' },
            ],
          },
          {
            guard: '[Manage shop catalog]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Add or edit shop item' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save catalog' },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-49-Promo-Broadcast',
    title: 'UC-49 Promo Codes & Broadcast Notifications',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Admin)' },
      { id: 'api', label: 'API Server' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Create promo code]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Enter code, discount, expiry' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request create promo' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save promo code' },
            ],
          },
          {
            guard: '[Broadcast notification]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Compose title, body, audience' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request broadcast send' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Create notification per recipient' },
              { kind: 'msg', from: 'api', to: 'ui', label: 'Recipient count', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-50-Platform-Analytics',
    title: 'UC-50 Platform Analytics',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Analytics)' },
      { id: 'api', label: 'API Server\n(Admin)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open analytics dashboard' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request overview metrics (time range)' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Aggregate users, orders, learning events' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'KPI figures', dashed: true },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Switch tab (funnel / learning path / explore)' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request tab-specific report' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Run specialized queries' },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Render charts', dashed: true },
    ],
  },
  {
    file: 'UC-50-Audit-Log',
    title: 'UC-50 Audit Log',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Audit log)' },
      { id: 'api', label: 'API Server\n(Admin)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open audit log (filter / page)' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request audit records' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load admin action history' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Labeled rows with actor', dashed: true },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Display audit table', dashed: true },
    ],
  },
  {
    file: 'UC-50-System-Status',
    title: 'UC-50 System Status',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(System)' },
      { id: 'api', label: 'API Server\n(Admin)' },
      { id: 'db', label: 'Database' },
      { id: 'job', label: 'Background job\n(News crawl)' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open system status page' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request system health' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Check DB & last job run times' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Service status cards', dashed: true },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Trigger news crawl manually]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Click run now' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Trigger background task' },
              { kind: 'msg', from: 'api', to: 'job', label: 'Crawl news sources' },
              { kind: 'msg', from: 'job', to: 'db', label: 'Store new articles' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Show result', dashed: true },
            ],
          },
        ],
      },
    ],
  },
];
