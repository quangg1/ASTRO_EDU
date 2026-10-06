/**
 * Sequence diagram definitions at SYSTEM ARCHITECTURE level (design first, code later).
 *
 * Rules:
 * - Lifeline = deployment component (Web UI, API Server, DB, AI Service…)
 * - Message = business action / data exchange — NO file names, hooks, routes, or field names
 * - alt/opt = use-case branches, not implementation branches
 *
 * Every flow below was checked against the code on integrate/web-ui (2026-10-06).
 * The "verified against" comment on each diagram names where the behaviour lives,
 * so the next person can re-check it when the code moves.
 *
 * Architecture refs: docs/architecture/api-layering.md, client/DOMAIN_MAP.md
 */

/** @typedef {{ kind:'msg', from:string|number, to:string|number, label:string, dashed?:boolean }} Msg */
/** @typedef {{ kind:'self', who:string|number, label:string, dashed?:boolean }} Self */
/** @typedef {{ kind:'alt'|'opt', label?:string, operands:{ guard:string, steps:FlowNode[] }[] }} Frag */
/** @typedef {Msg|Self|Frag} FlowNode */

export const DIAGRAMS = [
  // Verified against: content3d showcaseCatalogService.getBundle (null bundle → client default scene),
  // earth-history + planet-narrative routes, explore/learning-links/:entityId,
  // client useExploreLearningBridge (LP behaviour events for everyone, learning-state events only when signed in).
  {
    file: 'UC-21-View-3D-Simulation',
    title: 'UC-21 View 3D Simulation (Solar System / Earth & Planet history)',
    actor: 'Guest / Student',
    note: 'Night sky = UC-22. Contextual quiz = UC-23 (offered to guests too; only signed-in results are stored).',
    participants: [
      { id: 'ui', label: 'Web UI\n(Explore)' },
      { id: 'api', label: 'API Server\n(3D content)' },
      { id: 'db', label: 'Database' },
    ],
    spacing: 200,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open 3D Explore page' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request celestial catalog & orbits' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load published 3D catalog bundle' },
      { kind: 'msg', from: 'db', to: 'api', label: 'Catalog, orbits, stories', dashed: true },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Bundle not seeded]',
            steps: [
              { kind: 'msg', from: 'api', to: 'ui', label: 'Empty bundle', dashed: true },
              { kind: 'self', who: 'ui', label: 'Build default solar-system scene' },
            ],
          },
          {
            guard: '[Bundle available]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: '3D display payload', dashed: true }],
          },
        ],
      },
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
              { kind: 'msg', from: 'api', to: 'db', label: 'Load story beats' },
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
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request linked concepts & lessons' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Resolve entity → concept / lesson links' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Learning links (with source)', dashed: true },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Record explore interaction (anonymous or user)' },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Signed-in student]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Record focus / discovery learning event' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update concept state; credit discovery gems' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Panel with lessons; quiz prompt after reading (UC-23)', dashed: true },
    ],
  },
  // Verified against: client skyTargetsApi (bundled seed fallback), content3d skyTargetService
  // (seed file merged with published editor content), useExploreLearningBridge (quiz for all, stored when signed in).
  {
    file: 'UC-22-Explore-Sky-Planetarium',
    title: 'UC-22 Explore Sky Planetarium',
    actor: 'Guest / Student',
    note: 'Planetarium view. Quiz = UC-23.',
    participants: [
      { id: 'ui', label: 'Web UI\n(Planetarium)' },
      { id: 'api', label: 'API Server\n(Explore)' },
      { id: 'db', label: 'Database' },
    ],
    spacing: 200,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Switch to Sky mode' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request star & constellation catalog' },
      { kind: 'self', who: 'api', label: 'Load built-in star catalog' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load published editor content' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Server unreachable or empty]',
            steps: [{ kind: 'self', who: 'ui', label: 'Use bundled offline star data' }],
          },
          {
            guard: '[Server OK]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Catalog merged with editor content', dashed: true }],
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
            guard: '[Panel read — explore quiz]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request question set for target' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Show quiz (UC-23)', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  // Verified against: agent messagePipeline (quiz lock + length check server-side, entitlement tier,
  // quota, fast path, context build, ReAct loop with tool authorisation, persist only when signed in,
  // fallback reply when AI fails); guest widget posts to the web server's chat proxy, not the API.
  {
    file: 'UC-25-Chat-with-Cosmo',
    title: 'UC-25 Chat with Cosmo Assistant',
    actor: 'Guest / Student',
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
            guard: '[Guest — demo chat]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'ai', label: 'Ask via web-server chat proxy (last 10 messages)' },
              { kind: 'msg', from: 'ai', to: 'ui', label: 'Answer (no tools, not saved)', dashed: true },
            ],
          },
          {
            guard: '[Signed-in student]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Send message & learning context' },
              { kind: 'self', who: 'api', label: 'Reject if quiz in progress or message too long' },
              { kind: 'self', who: 'api', label: 'Resolve access tier & usage quota' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[Quota exceeded]',
                    steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Reject — limit reached', dashed: true }],
                  },
                  {
                    guard: '[FAQ / cached answer]',
                    steps: [
                      { kind: 'msg', from: 'api', to: 'db', label: 'Persist conversation turn' },
                      { kind: 'msg', from: 'api', to: 'ui', label: 'Stream cached answer', dashed: true },
                    ],
                  },
                  {
                    guard: '[Needs AI]',
                    steps: [
                      { kind: 'msg', from: 'api', to: 'db', label: 'Load progress & lesson context' },
                      { kind: 'msg', from: 'api', to: 'ai', label: 'Request answer (RAG, allowed tools)' },
                      { kind: 'msg', from: 'ai', to: 'api', label: 'Answer stream / tool suggestions', dashed: true },
                      { kind: 'self', who: 'api', label: 'Authorise suggested tools for this learner' },
                      { kind: 'msg', from: 'api', to: 'db', label: 'Persist conversation turn' },
                      { kind: 'msg', from: 'api', to: 'ui', label: 'Stream tokens + approved actions', dashed: true },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { kind: 'self', who: 'ui', label: 'Render reply, follow-up chips, navigation' },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Update chat panel', dashed: true },
    ],
  },
  // Verified against: community forumService.listForumPosts (filter/sort/paginate, cohort forum gate),
  // newsService (crawled RSS posts only), posts route view counter.
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
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request post list (sort, tag, page)' },
              { kind: 'self', who: 'api', label: 'Check cohort-forum membership' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Query visible posts (paginated)' },
            ],
          },
          {
            guard: '[News feed]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Open News page' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request news by category' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Load crawled articles' },
            ],
          },
          {
            guard: '[Search / tag]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Search or open a tag' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request matching posts' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Text / tag query' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Post list (with my votes if signed in)', dashed: true },
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
  // Verified against: forumService.createForumPost (news channel is read-only, cohort gate, HTML sanitised),
  // communityGemService (post reward with anti-spam checks; helpful / upvote rewards for comments).
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
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Compose post, comment or vote' },
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
              { kind: 'msg', from: 'ui', to: 'api', label: 'Submit post / comment / vote' },
              { kind: 'self', who: 'api', label: 'Authenticate, check forum access, sanitise HTML' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[News channel or no access]',
                    steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Reject', dashed: true }],
                  },
                  {
                    guard: '[Allowed]',
                    steps: [
                      { kind: 'msg', from: 'api', to: 'db', label: 'Save post / comment / vote' },
                      {
                        kind: 'opt',
                        operands: [
                          {
                            guard: '[Passes anti-spam & daily cap]',
                            steps: [{ kind: 'msg', from: 'api', to: 'db', label: 'Credit community gems' }],
                          },
                        ],
                      },
                      { kind: 'msg', from: 'api', to: 'ui', label: 'Saved item (+ gems earned)', dashed: true },
                    ],
                  },
                ],
              },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Refresh discussion thread', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  // Verified against: moderationService.createReport (reason whitelist, target must exist,
  // one open report per reporter+target, report counter on target).
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
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request report reasons' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Choose report reason' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Submit content report' },
      { kind: 'self', who: 'api', label: 'Authenticate; validate reason & target' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Target missing / bad reason]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Reject — invalid report', dashed: true }],
          },
          {
            guard: '[Already reported by me, still open]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Reject — duplicate report', dashed: true }],
          },
          {
            guard: '[Created]',
            steps: [
              { kind: 'msg', from: 'api', to: 'db', label: 'Save open report; bump report count' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Confirm report sent', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  // Verified against: community moderation routes (queue/resolve/warn = moderator;
  // hide/delete = moderator or admin override; admin queue lives under admin moderation),
  // moderationService.issueWarning → in-app notification.
  {
    file: 'UC-31-Moderate-Content',
    title: 'UC-31 Moderate Content',
    actor: 'Moderator / Admin',
    participants: [
      { id: 'ui', label: 'Web UI\n(Moderation queue)' },
      { id: 'api', label: 'API Server\n(Moderation)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open report queue' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request open reports' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load reports with target content & counts' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Queue list', dashed: true },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Choose moderation action' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Hide / unhide post or comment]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request hide content' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Mark hidden & record moderator' },
            ],
          },
          {
            guard: '[Delete comment]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request delete comment' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Remove comment' },
            ],
          },
          {
            guard: '[Resolve / dismiss report — moderator]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request close report' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update report status & note' },
            ],
          },
          {
            guard: '[Warn member — moderator]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Send warning' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save warning & in-app notification' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Refresh queue', dashed: true },
    ],
  },
  // Verified against: messages dmService (open = get-or-create, recipient must be active,
  // send pushes to both participants over WebSocket and creates an inbox notification).
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
      { kind: 'msg', from: 'ui', to: 'api', label: 'Open conversation with user' },
      { kind: 'self', who: 'api', label: 'Check recipient is active' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Find or create conversation' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request message history (paged)' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load messages' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Compose & send message' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Send message' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Persist message & update thread' },
      { kind: 'msg', from: 'api', to: 'rt', label: 'Push to recipient & sender (if connected)' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Create inbox notification for recipient' },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Show message in chat', dashed: true },
    ],
  },
  // Verified against: rewards avatarDecorationService (already owned → no charge, free items,
  // insufficient gems → 402, equip requires ownership).
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
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request catalog, owned items & wallet' },
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
                    guard: '[Already owned]',
                    steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'No charge — already owned', dashed: true }],
                  },
                  {
                    guard: '[Insufficient gems]',
                    steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Reject — not enough gems', dashed: true }],
                  },
                  {
                    guard: '[Free or affordable]',
                    steps: [
                      { kind: 'msg', from: 'api', to: 'db', label: 'Deduct gems, grant item, log transaction' },
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
              { kind: 'msg', from: 'api', to: 'db', label: 'Save selection (owned items only)' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Preview updated avatar', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  // Verified against: learning-path events ingest → event bus → rewards subscriber (seasonal multiplier,
  // per-day / per-entity caps), community post reward inline, showcase unlock + checkout voucher spend gems.
  {
    file: 'UC-34-Earn-Spend-Gems',
    title: 'UC-34 Earn & Spend Gems',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI\n(Learning / Explore / Community)' },
      { id: 'api', label: 'API Server' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Earn — lesson / quiz / explore discovery]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Complete learning activity' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Send learning events (batched)' },
              { kind: 'self', who: 'api', label: 'Store new events only; apply reward rules' },
            ],
          },
          {
            guard: '[Earn — community]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Create post / get helpful mark (UC-29)' },
              { kind: 'self', who: 'api', label: 'Apply community reward rules' },
            ],
          },
          {
            guard: '[Spend — unlock Explore content]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request gem unlock' },
              { kind: 'self', who: 'api', label: 'Check balance & not yet unlocked' },
            ],
          },
          {
            guard: '[Spend — course voucher]',
            steps: [{ kind: 'msg', from: 'ui', to: 'api', label: 'Pay order with gem voucher (UC-12)' }],
          },
        ],
      },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Not eligible / insufficient]',
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
  // Verified against: client solarJourneyProgress.syncSolarJourneyProgress (dashboard only) and
  // learning-path solar-journey progress GET/PUT. No code path currently marks a milestone complete.
  {
    file: 'UC-35-Solar-Journey',
    title: 'UC-35 Solar Journey Milestones',
    actor: 'Student',
    note: 'Display + sync only: no current screen writes new milestones.',
    participants: [
      { id: 'ui', label: 'Web UI\n(Dashboard)' },
      { id: 'api', label: 'API Server\n(Learning path)' },
      { id: 'db', label: 'Database' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open dashboard' },
      { kind: 'self', who: 'ui', label: 'Read milestones from browser storage' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Not signed in]',
            steps: [{ kind: 'msg', from: 'ui', to: 'actor', label: 'Milestone count (local only)', dashed: true }],
          },
          {
            guard: '[Signed-in student]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request saved milestones' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Read completed milestones' },
              { kind: 'msg', from: 'api', to: 'ui', label: 'Saved milestones', dashed: true },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[Server has data]',
                    steps: [{ kind: 'self', who: 'ui', label: 'Overwrite local copy with server list' }],
                  },
                  {
                    guard: '[Server empty, local has data]',
                    steps: [
                      { kind: 'msg', from: 'ui', to: 'api', label: 'Upload local milestones' },
                      { kind: 'msg', from: 'api', to: 'db', label: 'Save milestone list' },
                    ],
                  },
                ],
              },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Milestone count on dashboard', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  // Verified against: notifications repository (newest first, optional unread filter), unread-count,
  // mark one / mark all read, WebSocket push when a notification is created.
  {
    file: 'UC-36-View-Notifications',
    title: 'UC-36 View Notifications',
    actor: 'Student',
    participants: [
      { id: 'ui', label: 'Web UI\n(Notification bell)' },
      { id: 'api', label: 'API Server\n(Notifications)' },
      { id: 'db', label: 'Database' },
      { id: 'rt', label: 'Real-time channel\n(WebSocket)' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'ui', to: 'rt', label: 'Connect with session' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request unread count' },
      { kind: 'msg', from: 'rt', to: 'ui', label: 'New notification pushed', dashed: true },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open notification list' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request notifications (newest first)' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load user inbox' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Notification list', dashed: true },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Select one]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Mark as read' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Navigate to link (if any)', dashed: true },
            ],
          },
          {
            guard: '[Mark all read]',
            steps: [{ kind: 'msg', from: 'ui', to: 'api', label: 'Mark all as read' }],
          },
        ],
      },
    ],
  },
  // Verified against: client app/studio/page.tsx (role gate teacher/admin), courses editor list
  // (teacher sees own courses, admin sees all; no enrollment stats in this payload).
  {
    file: 'UC-37-View-Studio-Dashboard',
    title: 'UC-37 View Studio Dashboard',
    actor: 'Teacher / Admin',
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
            guard: '[Not signed in / not teacher or admin]',
            steps: [{ kind: 'msg', from: 'ui', to: 'actor', label: 'Redirect to login / home', dashed: true }],
          },
          {
            guard: '[Authorized]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request editable courses' },
              { kind: 'self', who: 'api', label: 'Teacher: own courses only; admin: all' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Load course list' },
              { kind: 'msg', from: 'api', to: 'ui', label: 'Course rows', dashed: true },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Show course list & Studio shortcuts', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  // Verified against: courses cohortDirectoryService (list with enrollment counts, create with invite code,
  // partial update), cohort announcement / schedule / gradebook routes.
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
              { kind: 'msg', from: 'api', to: 'db', label: 'Save cohort, unique slug & invite code' },
            ],
          },
          {
            guard: '[Update existing cohort]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Edit dates / price / status / week map' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request save changes' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update changed fields only' },
            ],
          },
          {
            guard: '[Run the class]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Post announcement / set schedule / grade work' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save cohort activity' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Refresh cohort view', dashed: true },
    ],
  },
  // Verified against: learning-path learningPathContentService.savePath (drops unknown concept ids,
  // returns invalid-concept / invalid-section counts, schedules RAG reindex in the background),
  // generateRecallQuiz (AI service first, direct LLM fallback).
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
              { kind: 'msg', from: 'ai', to: 'api', label: 'Draft question set (or fallback LLM)', dashed: true },
              { kind: 'msg', from: 'api', to: 'ui', label: 'Draft quiz to review', dashed: true },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Save / publish learning path' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Submit updated path' },
      { kind: 'self', who: 'api', label: 'Normalise sections; drop unknown concept links' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Persist learning path' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Links or sections were dropped]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Saved with warning list', dashed: true }],
          },
          {
            guard: '[Fully valid]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Confirm save success', dashed: true }],
          },
        ],
      },
      { kind: 'msg', from: 'api', to: 'ai', label: 'Background: refresh search index (RAG)' },
    ],
  },
  // Verified against: concepts conceptService.replaceConcepts (normalise, drop self / dangling links,
  // replace whole library; duplicate ids hit the unique index → conflict), taxonomy saved separately.
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
      { kind: 'msg', from: 'api', to: 'db', label: 'Load library (seed on first use)' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Edit definitions, links, taxonomy tags' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Save concepts]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Submit whole concept list' },
              { kind: 'self', who: 'api', label: 'Normalise; drop self & dangling prerequisite links' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[Duplicate concept id]',
                    steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Conflict error', dashed: true }],
                  },
                  {
                    guard: '[OK]',
                    steps: [
                      { kind: 'msg', from: 'api', to: 'db', label: 'Replace library' },
                      { kind: 'msg', from: 'api', to: 'ui', label: 'Saved library', dashed: true },
                    ],
                  },
                ],
              },
            ],
          },
          {
            guard: '[Save taxonomy]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Submit taxonomy' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save normalised taxonomy' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Confirm saved', dashed: true },
    ],
  },
  // Verified against: admin adminUserService (scope "users"; no self-demotion / self-deactivation;
  // reset email via mail service; scopes need full admin; permanent delete needs reason + email confirm),
  // every change writes the admin action log.
  {
    file: 'UC-45-Manage-User',
    title: 'UC-45 Manage Users',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Admin)' },
      { id: 'api', label: 'API Server\n(Admin)' },
      { id: 'db', label: 'Database' },
      { id: 'mail', label: 'Mail service' },
      { id: 'audit', label: 'Audit log' },
    ],
    spacing: 145,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Search users' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request user list (filter / page)' },
      { kind: 'self', who: 'api', label: 'Check admin scope "users"' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Query accounts' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open user detail & choose action' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Change role]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request role update' },
              { kind: 'self', who: 'api', label: 'Block self-demotion' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save new role' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record admin action' },
            ],
          },
          {
            guard: '[Send password reset email]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request reset email' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Store reset token (local accounts)' },
              { kind: 'msg', from: 'api', to: 'mail', label: 'Send reset link' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record admin action' },
            ],
          },
          {
            guard: '[Deactivate / restore account]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request status change' },
              { kind: 'self', who: 'api', label: 'Block self-deactivation' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update account status' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record admin action' },
            ],
          },
          {
            guard: '[Set admin scopes — full admin only]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request scope update' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save scopes' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record admin action' },
            ],
          },
          {
            guard: '[Delete permanently]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request delete (reason + confirm email)' },
              { kind: 'msg', from: 'api', to: 'mail', label: 'Notify user of deletion' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Delete account data' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record admin action' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Refresh user table', dashed: true },
    ],
  },
  // Verified against: admin adminOrderService (expire stale pending orders before listing,
  // note / cancel / refund all audited, refund optionally revokes catalog or cohort access).
  {
    file: 'UC-46-Manage-Order',
    title: 'UC-46 Manage Orders',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Orders)' },
      { id: 'api', label: 'API Server\n(Admin)' },
      { id: 'db', label: 'Database' },
      { id: 'audit', label: 'Audit log' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open order list (filter / search)' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request orders' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Expire stale pending orders' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Query orders & buyers' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Select order → view detail' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Save internal note]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Save admin note' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update order note' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record action' },
            ],
          },
          {
            guard: '[Cancel pending order]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request cancellation' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Mark order cancelled' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record action' },
            ],
          },
          {
            guard: '[Refund completed order]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request refund with reason' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Mark refunded; revoke access (optional)' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Record action' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Refresh order table', dashed: true },
    ],
  },
  // Verified against: auth teacherApplicationService (mark CV reviewed first; approve grants teacher role +
  // teacher profile; decision email + in-app notification for both outcomes).
  {
    file: 'UC-47-Approve-Teacher',
    title: 'UC-47 Approve Teacher Application',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Teacher applications)' },
      { id: 'api', label: 'API Server\n(Admin)' },
      { id: 'db', label: 'Database' },
      { id: 'notify', label: 'Mail &\nnotification service' },
    ],
    spacing: 155,
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'View pending applications' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request application list' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load applicant profiles' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open CV & mark it reviewed' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Record CV reviewed' },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Approve or reject (optional note)' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Submit decision' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Approve but CV not reviewed]',
            steps: [{ kind: 'msg', from: 'api', to: 'ui', label: 'Reject — review CV first', dashed: true }],
          },
          {
            guard: '[Approved]',
            steps: [
              { kind: 'msg', from: 'api', to: 'db', label: 'Grant teacher role & create teacher profile' },
              { kind: 'msg', from: 'api', to: 'notify', label: 'Send approval email & notification' },
            ],
          },
          {
            guard: '[Rejected]',
            steps: [
              { kind: 'msg', from: 'api', to: 'db', label: 'Save rejected status' },
              { kind: 'msg', from: 'api', to: 'notify', label: 'Send rejection email & notification' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Update pending list', dashed: true },
    ],
  },
  // Verified against: admin gemEconomy routes (scope "gem"), gemRuntimeConfigService (bounds check),
  // manualGemAdjustmentService, shopCatalogService / decorationCategoryService — all write the gem audit log.
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
              { kind: 'self', who: 'api', label: 'Check values within allowed bounds' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save runtime config' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Log config change' },
            ],
          },
          {
            guard: '[Manual gem adjustment]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Add or deduct gems for account' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Update wallet & transaction log' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Log adjustment' },
            ],
          },
          {
            guard: '[Manage shop catalog / categories]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'api', label: 'Add or edit shop item / category' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save catalog' },
              { kind: 'msg', from: 'api', to: 'audit', label: 'Log catalog change' },
            ],
          },
        ],
      },
    ],
  },
  // Verified against: admin promo routes (scope "promo": list/create/update/delete),
  // adminBroadcastService (scope "broadcast", active users by role, batched inserts, WebSocket push).
  {
    file: 'UC-49-Promo-Broadcast',
    title: 'UC-49 Promo Codes & Broadcast Notifications',
    actor: 'Administrator',
    participants: [
      { id: 'ui', label: 'Web UI\n(Admin)' },
      { id: 'api', label: 'API Server' },
      { id: 'db', label: 'Database' },
      { id: 'rt', label: 'Real-time channel\n(WebSocket)' },
    ],
    spacing: 155,
    flow: [
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Create / edit / delete promo code]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Enter code, discount, limits, expiry' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request save promo' },
              { kind: 'self', who: 'api', label: 'Validate code & discount' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Save promo code' },
            ],
          },
          {
            guard: '[Broadcast notification]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Compose title, body, link, target roles' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Request broadcast send' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Find active users in target roles' },
              { kind: 'msg', from: 'api', to: 'db', label: 'Create notifications in batches' },
              { kind: 'msg', from: 'api', to: 'rt', label: 'Push to connected recipients' },
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
      { kind: 'self', who: 'api', label: 'Check admin scope "analytics"' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Aggregate users, orders, learning events' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'KPI figures', dashed: true },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Switch tab (funnel / retention / LP / explore / agent)' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request tab-specific report' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Run specialized queries' },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Render charts', dashed: true },
    ],
  },
  // Verified against: admin adminAuditService (source admin / gem / security; "all" falls back to the admin log).
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
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Open audit log (source filter / page)' },
      { kind: 'msg', from: 'ui', to: 'api', label: 'Request audit records' },
      { kind: 'msg', from: 'api', to: 'db', label: 'Load admin, gem economy or security log' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Labeled rows with actor', dashed: true },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Display audit table', dashed: true },
    ],
  },
  // Verified against: admin adminSystemService (status = DB ready state, SMTP configured,
  // last crawl run, security events 24h; manual trigger reuses the scheduled crawl, which
  // skips when the last run was under 24h ago, and is audited).
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
      { kind: 'msg', from: 'api', to: 'db', label: 'Check DB, last crawl run, security events (24h)' },
      { kind: 'msg', from: 'api', to: 'ui', label: 'Status cards (API, DB, mail, crawl, security)', dashed: true },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Trigger news crawl manually]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Click run now' },
              { kind: 'msg', from: 'ui', to: 'api', label: 'Trigger crawl' },
              { kind: 'msg', from: 'api', to: 'job', label: 'Run scheduled crawl' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[Disabled or last run < 24h ago]',
                    steps: [{ kind: 'msg', from: 'job', to: 'api', label: 'Skipped (no result)', dashed: true }],
                  },
                  {
                    guard: '[Due]',
                    steps: [
                      { kind: 'msg', from: 'job', to: 'db', label: 'Store new articles & run time' },
                      { kind: 'msg', from: 'job', to: 'api', label: 'Crawl result', dashed: true },
                    ],
                  },
                ],
              },
              { kind: 'msg', from: 'api', to: 'db', label: 'Record admin action' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Show result', dashed: true },
            ],
          },
        ],
      },
    ],
  },
];
