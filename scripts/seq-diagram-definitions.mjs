/**
 * Detailed sequence flows — same granularity as Register template:
 * Page → client hook/API → route → service → MongoDB (+ alt/opt).
 */

/** @typedef {{ kind:'msg', from:string|number, to:string|number, label:string, dashed?:boolean }} Msg */
/** @typedef {{ kind:'self', who:string|number, label:string, dashed?:boolean }} Self */
/** @typedef {{ kind:'alt'|'opt', label?:string, operands:{ guard:string, steps:FlowNode[] }[] }} Frag */
/** @typedef {Msg|Self|Frag} FlowNode */

export const DIAGRAMS = [
  {
    file: 'UC-21-View-3D-Simulation',
    title: 'UC-21 View 3D Simulation (solar / showcase)',
    actor: 'Guest / Student',
    note: 'UC-21 = solar layer only (?view=solar). Sky dome = UC-22. Onboarding tour = alt on first visit.',
    participants: [
      { id: 'page', label: 'ExplorePageContent\nuseExplorePage' },
      { id: 'mode', label: 'useExploreModeState' },
      { id: 'catalog', label: 'useExploreShowcaseCatalog' },
      { id: 'nav', label: 'useExploreShowcaseNav' },
      { id: 'canvas', label: 'ExploreSceneCanvas\nShowcaseScene' },
      { id: 'api', label: 'content3d API routes' },
      { id: 'db', label: 'MongoDB' },
      { id: 'bridge', label: 'useExploreLearningBridge' },
    ],
    spacing: 132,
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'GET /explore (?view=solar default)' },
      { kind: 'msg', from: 'page', to: 'mode', label: 'parseExploreView, ?entity ?stage ?history ?dist/?az/?el' },
      { kind: 'msg', from: 'page', to: 'catalog', label: 'mount catalog hook' },
      { kind: 'msg', from: 'catalog', to: 'api', label: 'GET /api/showcase-entities (panel CMS copy)' },
      { kind: 'msg', from: 'api', to: 'db', label: 'ShowcaseEntity published rows' },
      { kind: 'msg', from: 'db', to: 'catalog', label: 'items[]', dashed: true },
      { kind: 'msg', from: 'catalog', to: 'api', label: 'GET /api/showcase-orbits/jpl?includeParents=1' },
      { kind: 'msg', from: 'api', to: 'db', label: 'JPL Horizons cache / vectors', dashed: true },
      { kind: 'self', who: 'catalog', label: 'mergeNasaCatalog(NASA_SHOWCASE_ITEMS) + mergeOrbitEntities' },
      { kind: 'msg', from: 'page', to: 'canvas', label: 'pass mergedOrbitEntities, showcaseContent' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[?stage= — Earth deep history (EarthScene)]',
            steps: [
              { kind: 'msg', from: 'mode', to: 'page', label: 'earthHistoryOpen=true' },
              { kind: 'msg', from: 'page', to: 'api', label: 'GET /api/earth-history (+ fossils by stage)' },
              { kind: 'msg', from: 'api', to: 'db', label: 'stages, fossil records' },
              { kind: 'msg', from: 'canvas', to: 'actor', label: 'EarthScene + timeline scrubber', dashed: true },
            ],
          },
          {
            guard: '[?history=1&entity= — Planet deep history]',
            steps: [
              { kind: 'msg', from: 'mode', to: 'page', label: 'planetHistoryOpen, entityId' },
              { kind: 'msg', from: 'page', to: 'api', label: 'GET /api/planet-narrative/:entityId' },
              { kind: 'msg', from: 'api', to: 'db', label: 'narrative beats + linkedLessonIds' },
              { kind: 'msg', from: 'canvas', to: 'actor', label: 'PlanetHistoryScene globe', dashed: true },
            ],
          },
          {
            guard: '[Default — Hệ Mặt Trời showcase]',
            steps: [
              { kind: 'msg', from: 'canvas', to: 'actor', label: 'ShowcaseScene orbits + left panel tabs', dashed: true },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'actor', to: 'canvas', label: 'Click 3D body or catalog menu item' },
      { kind: 'msg', from: 'canvas', to: 'nav', label: 'handleShowcaseEntityClicked(id, source)' },
      { kind: 'msg', from: 'nav', to: 'mode', label: 'setShowcaseActiveItemId; sync ?entity= URL' },
      { kind: 'self', who: 'nav', label: 'trackLearningPathBehavior(scene_entity_clicked)' },
      { kind: 'msg', from: 'canvas', to: 'nav', label: 'onCameraSettled(spherical)' },
      { kind: 'msg', from: 'nav', to: 'mode', label: 'router.replace ?dist=&az=&el= (debounced)' },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Student — learning bridge after focus]',
            steps: [
              { kind: 'msg', from: 'page', to: 'bridge', label: 'start focus timer (~3s) on entity' },
              { kind: 'msg', from: 'bridge', to: 'api', label: 'GET /api/explore/contextual-quiz/:entityId' },
              { kind: 'msg', from: 'api', to: 'db', label: 'question pool + user day map' },
              { kind: 'msg', from: 'bridge', to: 'actor', label: 'Focus overlay + quiz prompt (UC-23)', dashed: true },
              { kind: 'msg', from: 'bridge', to: 'api', label: 'POST learning-state explore events' },
            ],
          },
        ],
      },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Signed-in — gem strip UC-34/35]',
            steps: [
              { kind: 'msg', from: 'page', to: 'api', label: 'syncGemWallet (rewards API)' },
              { kind: 'self', who: 'page', label: 'listen learning-path-rewards → toast + balance' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'page', to: 'actor', label: 'Panel: Overview / Physics / Sky tab + LP links', dashed: true },
    ],
  },
  {
    file: 'UC-22-Explore-Sky-Planetarium',
    title: 'UC-22 Explore Sky Planetarium',
    actor: 'Guest / Student',
    note: 'Solar 3D = UC-21. Sky = ?view=sky. Quiz delivery = UC-23 (bridge).',
    participants: [
      { id: 'page', label: 'ExplorePageContent\nuseExplorePage' },
      { id: 'nav', label: 'useExploreViewNavigation' },
      { id: 'catalog', label: 'useExploreSkyCatalog' },
      { id: 'observer', label: 'useExploreSkyObserver' },
      { id: 'canvas', label: 'SkyPlanetariumScene' },
      { id: 'api', label: 'explore API' },
      { id: 'bridge', label: 'useExploreLearningBridge' },
    ],
    spacing: 128,
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Toggle "La bàn chòm sao" (ExploreViewToggle)' },
      { kind: 'msg', from: 'page', to: 'nav', label: 'navigateExploreView("sky", targetId?)' },
      { kind: 'self', who: 'nav', label: 'closePlanetHistory; router.replace ?view=sky&target=' },
      { kind: 'msg', from: 'page', to: 'catalog', label: 'mount useExploreSkyCatalog' },
      { kind: 'msg', from: 'catalog', to: 'api', label: 'GET /api/explore/sky-targets' },
      { kind: 'self', who: 'api', label: 'loadSkySeed() JSON (bundled seed file)' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[API unreachable]',
            steps: [
              { kind: 'self', who: 'catalog', label: 'getBundledSkyExploreTargets() fallback' },
            ],
          },
          {
            guard: '[API OK]',
            steps: [
              { kind: 'msg', from: 'api', to: 'catalog', label: 'targets[] + version', dashed: true },
            ],
          },
        ],
      },
      { kind: 'self', who: 'catalog', label: 'preloadHipCatalogIndex → mergeWesternExploreTargets' },
      { kind: 'msg', from: 'page', to: 'observer', label: 'parse ?lat ?lon ?time ?bortle' },
      { kind: 'self', who: 'observer', label: 'computeSkyEphemerisBodies(observer.at)' },
      { kind: 'msg', from: 'page', to: 'canvas', label: 'skyTargets + ephemerisBodies + observer' },
      { kind: 'msg', from: 'canvas', to: 'actor', label: 'Dome + ExploreSkyOverlay panel', dashed: true },
      { kind: 'msg', from: 'actor', to: 'canvas', label: 'Pick star / constellation (scene or HUD list)' },
      { kind: 'msg', from: 'canvas', to: 'page', label: 'selectSkyTarget / handleSkyScenePick' },
      { kind: 'msg', from: 'page', to: 'nav', label: 'sync ?target= ; skySceneHighlightId' },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Cross-link to solar entity]',
            steps: [
              { kind: 'msg', from: 'nav', to: 'page', label: 'buildExploreHref solar + entityId' },
            ],
          },
        ],
      },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Student — UC-23 contextual quiz via bridge]',
            steps: [
              { kind: 'msg', from: 'page', to: 'bridge', label: 'focus entity → fetch quiz' },
              { kind: 'msg', from: 'bridge', to: 'api', label: 'GET /api/explore/contextual-quiz/:entityId' },
              { kind: 'msg', from: 'bridge', to: 'actor', label: 'Quiz overlay; submit → learning-state', dashed: true },
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
      { id: 'widget', label: 'CosmoAssistantWidget' },
      { id: 'hook', label: 'useCosmoAssistantChat' },
      { id: 'client', label: 'agentApi.postAgentMessage' },
      { id: 'route', label: 'agent.js POST /message' },
      { id: 'pipe', label: 'messagePipeline' },
      { id: 'ai', label: 'AI Service /chat' },
      { id: 'db', label: 'MongoDB' },
    ],
    spacing: 128,
    flow: [
      { kind: 'msg', from: 'actor', to: 'widget', label: 'Type message (+ optional image), Send' },
      { kind: 'msg', from: 'widget', to: 'hook', label: 'sendMessage(text, sessionContext)' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[recallQuizActive or quizLock]',
            steps: [
              { kind: 'self', who: 'hook', label: 'setError("Hoàn thành quiz trước")' },
              { kind: 'msg', from: 'hook', to: 'widget', label: 'block send', dashed: true },
            ],
          },
          {
            guard: '[message empty or > AGENT_MAX_USER_MESSAGE_CHARS]',
            steps: [
              { kind: 'self', who: 'hook', label: 'validation error state' },
            ],
          },
          {
            guard: '[valid message]',
            steps: [
              { kind: 'msg', from: 'hook', to: 'client', label: 'POST /api/agent/message { content, sessionContext, sessionId }' },
              { kind: 'msg', from: 'client', to: 'route', label: 'optionalAuth + agentLimiter' },
              { kind: 'msg', from: 'route', to: 'pipe', label: 'processAgentMessage(req)' },
              { kind: 'self', who: 'pipe', label: 'stepBuildContext, stepInitQuota, assertAgentNotQuizLocked' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[quota exceeded]',
                    steps: [
                      { kind: 'msg', from: 'pipe', to: 'client', label: '429 { error: quota }', dashed: true },
                    ],
                  },
                  {
                    guard: '[OK]',
                    steps: [
                      { kind: 'msg', from: 'pipe', to: 'ai', label: 'callAiChatStream / runReactAgentTurn' },
                      { kind: 'msg', from: 'ai', to: 'pipe', label: 'tokens + tool_calls', dashed: true },
                      { kind: 'msg', from: 'pipe', to: 'db', label: 'AgentSession + messages upsert' },
                      { kind: 'msg', from: 'pipe', to: 'client', label: 'SSE event:token … event:done', dashed: true },
                    ],
                  },
                ],
              },
              { kind: 'self', who: 'hook', label: 'sanitizeAssistantContent, executeAgentClientAction(tool_calls)' },
              { kind: 'msg', from: 'hook', to: 'widget', label: 'append assistant message + chips', dashed: true },
              { kind: 'msg', from: 'widget', to: 'actor', label: 'Render streamed answer', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-28-Browse-Community',
    title: 'UC-28 Browse Community / News',
    actor: 'Guest / Student',
    participants: [
      { id: 'page', label: 'ForumsPage / NewsPage' },
      { id: 'client', label: 'communityApi' },
      { id: 'route', label: 'forums.js / news.js' },
      { id: 'db', label: 'Forum + Post' },
    ],
    flow: [
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Forums / cohort channels]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'page', label: 'Open /community/forums/:slug' },
              { kind: 'msg', from: 'page', to: 'route', label: 'GET /api/forums/:slug/posts (optionalAuth)' },
              { kind: 'msg', from: 'route', to: 'db', label: 'Forum.findOne + postListQuery' },
            ],
          },
          {
            guard: '[News feed]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'page', label: 'Open /news?channel=' },
              { kind: 'msg', from: 'page', to: 'route', label: 'GET /api/news (optionalAuth)' },
              { kind: 'msg', from: 'route', to: 'db', label: 'crawled NewsArticle / Post channel' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'db', to: 'page', label: '{ items, total, pinned }', dashed: true },
      { kind: 'self', who: 'page', label: 'PostCard list + pagination' },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Open thread]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'GET /api/posts/:id + comments' },
              { kind: 'msg', from: 'page', to: 'route', label: 'POST /api/posts/:id/view (view count)' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'page', to: 'actor', label: 'Render feed / thread detail', dashed: true },
    ],
  },
  {
    file: 'UC-29-Post-and-Comment',
    title: 'UC-29 Post & Comment',
    actor: 'Student',
    participants: [
      { id: 'page', label: 'ThreadPage / ComposeModal' },
      { id: 'client', label: 'communityApi' },
      { id: 'route', label: 'forums.js / posts.js' },
      { id: 'db', label: 'MongoDB' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Submit title + body (post or comment)' },
      { kind: 'self', who: 'page', label: 'client validation (length, required fields)' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[validation fails]',
            steps: [{ kind: 'msg', from: 'page', to: 'actor', label: 'inline errors', dashed: true }],
          },
          {
            guard: '[validation passes]',
            steps: [
              { kind: 'msg', from: 'page', to: 'client', label: 'POST /api/forums/:slug/posts or comment' },
              { kind: 'msg', from: 'client', to: 'route', label: 'authMiddleware; assertCohortForumAccess' },
              { kind: 'msg', from: 'route', to: 'db', label: 'Post.create / Comment.create + mergePostTags' },
              {
                kind: 'opt',
                operands: [
                  {
                    guard: '[first post of day — gem rule]',
                    steps: [
                      { kind: 'msg', from: 'route', to: 'db', label: 'UserReward.increment (GEM_EARN)' },
                    ],
                  },
                ],
              },
              { kind: 'msg', from: 'route', to: 'client', label: '{ success, post }', dashed: true },
              { kind: 'msg', from: 'page', to: 'actor', label: 'Navigate / refresh thread', dashed: true },
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
      { id: 'page', label: 'ReportContentDialog' },
      { id: 'client', label: 'moderationApi' },
      { id: 'route', label: 'moderation.js' },
      { id: 'db', label: 'MongoDB ContentReport' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Choose reason + optional note' },
      { kind: 'msg', from: 'page', to: 'client', label: 'POST /api/community/moderation/reports' },
      { kind: 'msg', from: 'client', to: 'route', label: 'authMiddleware' },
      { kind: 'msg', from: 'route', to: 'db', label: 'ContentReport.create({ targetType, targetId, reason })' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[duplicate open report]',
            steps: [{ kind: 'msg', from: 'route', to: 'page', label: '409 already reported', dashed: true }],
          },
          {
            guard: '[created]',
            steps: [
              { kind: 'msg', from: 'db', to: 'route', label: 'report _id', dashed: true },
              { kind: 'msg', from: 'page', to: 'actor', label: 'Toast "Đã gửi báo cáo"', dashed: true },
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
      { id: 'page', label: 'ModerationQueuePage' },
      { id: 'client', label: 'moderationApi' },
      { id: 'route', label: 'moderation.js' },
      { id: 'db', label: 'MongoDB' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open moderation queue' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /moderation/queue (requireMod)' },
      { kind: 'msg', from: 'route', to: 'db', label: 'aggregate open reports + posts' },
      { kind: 'msg', from: 'db', to: 'page', label: 'queue rows', dashed: true },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Resolve / hide / warn' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Hide post or comment]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'PATCH /posts/:id/hidden or /comments/:id/hidden' },
              { kind: 'msg', from: 'route', to: 'db', label: 'hidden=true, moderatedBy' },
            ],
          },
          {
            guard: '[Resolve report]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST /reports/:id/resolve' },
              { kind: 'msg', from: 'route', to: 'db', label: 'report.status=resolved' },
            ],
          },
          {
            guard: '[Warn user]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST /moderation/warn' },
              { kind: 'msg', from: 'route', to: 'db', label: 'UserWarning + Notification' },
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
      { id: 'page', label: 'MessagesPage' },
      { id: 'client', label: 'messagesApi' },
      { id: 'route', label: 'dmService / messages router' },
      { id: 'db', label: 'MongoDB Conversation + Message' },
      { id: 'ws', label: 'WS /ws/notifications' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /messages' },
      { kind: 'msg', from: 'page', to: 'client', label: 'GET /api/messages/conversations' },
      { kind: 'msg', from: 'client', to: 'route', label: 'authMiddleware → listConversations(userId)' },
      { kind: 'msg', from: 'route', to: 'db', label: 'aggregate last message per thread' },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open thread with user B' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[No conversation yet]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST /api/messages/open { userId }' },
              { kind: 'msg', from: 'route', to: 'db', label: 'openConversationWithUser' },
            ],
          },
          {
            guard: '[Existing conversationId]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'GET /conversations/:id?before&limit' },
              { kind: 'msg', from: 'route', to: 'db', label: 'listMessages + membership check' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'db', to: 'page', label: 'messages[] chronological', dashed: true },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Type body → Send' },
      { kind: 'msg', from: 'page', to: 'route', label: 'POST /api/messages/send { conversationId, body }' },
      { kind: 'msg', from: 'route', to: 'db', label: 'sendDirectMessage → insert Message' },
      { kind: 'msg', from: 'route', to: 'ws', label: 'push notification to recipient (if online)' },
      { kind: 'msg', from: 'page', to: 'actor', label: 'Append bubble; scroll to bottom', dashed: true },
    ],
  },
  {
    file: 'UC-33-Gem-Shop-Avatar',
    title: 'UC-33 Gem Shop & Avatar',
    actor: 'Student',
    participants: [
      { id: 'page', label: 'GemShopPage' },
      { id: 'client', label: 'gemsWalletApi' },
      { id: 'route', label: 'gems.js routes' },
      { id: 'db', label: 'UserReward + ShopItem' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /gem-shop' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /api/gems/shop/bootstrap (public)' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /api/gems/shop/catalog' },
      { kind: 'msg', from: 'route', to: 'db', label: 'listVisiblePublic ShopItem + seasonal window' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /api/gems/decorations/catalog' },
      { kind: 'msg', from: 'actor', to: 'page', label: 'auth: GET /wallet + /decorations/me' },
      { kind: 'msg', from: 'route', to: 'db', label: 'UserReward.gemBalance + owned decorations' },
      { kind: 'msg', from: 'db', to: 'page', label: 'tabs: courses / avatar / voucher', dashed: true },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Purchase decoration SKU]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST /api/gems/decorations/purchase { skuId }' },
              { kind: 'self', who: 'route', label: 'purchaseDecoration → balance check' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[insufficient gems]',
                    steps: [{ kind: 'msg', from: 'route', to: 'page', label: '4xx INSUFFICIENT_GEMS', dashed: true }],
                  },
                  {
                    guard: '[OK]',
                    steps: [
                      { kind: 'msg', from: 'route', to: 'db', label: 'UserReward -= cost; GemTransaction log' },
                      { kind: 'msg', from: 'page', to: 'actor', label: 'Toast + refresh owned list', dashed: true },
                    ],
                  },
                ],
              },
            ],
          },
          {
            guard: '[Equip owned SKU]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'PATCH /api/gems/decorations/equip { skuId }' },
              { kind: 'msg', from: 'route', to: 'db', label: 'update equipped decoration on UserReward' },
              { kind: 'msg', from: 'page', to: 'actor', label: 'Avatar preview update', dashed: true },
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
      { id: 'ui', label: 'Lesson / LP / Community / Explore UI' },
      { id: 'client', label: 'feature API client' },
      { id: 'route', label: 'learning-path / community / rewards' },
      { id: 'engine', label: 'rewardEngine.applyGemEarn' },
      { id: 'db', label: 'UserReward + GemTransaction' },
    ],
    flow: [
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Learning path progress]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'ui', label: 'Complete section / recall quiz pass' },
              { kind: 'msg', from: 'ui', to: 'route', label: 'PUT /api/learning-path/progress' },
              { kind: 'msg', from: 'route', to: 'engine', label: 'mergeRewardSegments(event rules)' },
            ],
          },
          {
            guard: '[Community engagement]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'route', label: 'POST post / comment / vote' },
              { kind: 'msg', from: 'route', to: 'engine', label: 'communityGemService daily caps' },
            ],
          },
          {
            guard: '[Explore showcase spend UC-33 related]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'route', label: 'POST /api/showcase/unlock { entityId, contentType }' },
              { kind: 'msg', from: 'route', to: 'db', label: 'deduct gems; ShowcaseUnlock.create' },
            ],
          },
        ],
      },
      { kind: 'self', who: 'engine', label: 'read GemRuntimeConfig multiplier + utcDayBounds' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[cap / cooldown — no earn]',
            steps: [{ kind: 'msg', from: 'engine', to: 'ui', label: '{ rewarded:false }', dashed: true }],
          },
          {
            guard: '[applyGemEarn OK]',
            steps: [
              { kind: 'msg', from: 'engine', to: 'db', label: 'UserReward balance += amt; GemTransaction' },
              { kind: 'msg', from: 'engine', to: 'ui', label: '{ gemsEarned, newBalance, labels }', dashed: true },
              { kind: 'self', who: 'ui', label: 'dispatch learning-path-rewards CustomEvent' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Toast + header wallet', dashed: true },
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
      { id: 'ui', label: 'SolarJourneyStrip\n(Explore / profile)' },
      { id: 'local', label: 'solarJourneyProgress.ts' },
      { id: 'route', label: 'learning-path routes' },
      { id: 'db', label: 'TutorialProgress / User' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'ui', label: 'View milestone track (CDN media steps)' },
      { kind: 'msg', from: 'ui', to: 'local', label: 'loadCompletedMilestoneIds(userId) from localStorage' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Guest — no JWT]',
            steps: [
              { kind: 'msg', from: 'local', to: 'ui', label: 'guest key cosmo-solar-journey-milestones-v1' },
              { kind: 'msg', from: 'ui', to: 'actor', label: 'Render progress from local only', dashed: true },
            ],
          },
          {
            guard: '[Signed-in student]',
            steps: [
              { kind: 'msg', from: 'ui', to: 'local', label: 'syncSolarJourneyProgress(userId)' },
              { kind: 'msg', from: 'local', to: 'route', label: 'GET /api/learning-path/solar-journey/progress' },
              { kind: 'msg', from: 'route', to: 'db', label: 'read solarJourneyCompletedMilestoneIds' },
              {
                kind: 'alt',
                operands: [
                  {
                    guard: '[server empty, local has ids]',
                    steps: [
                      { kind: 'msg', from: 'local', to: 'route', label: 'PUT /solar-journey/progress { completedMilestoneIds }' },
                      { kind: 'msg', from: 'route', to: 'db', label: '$set milestone array' },
                    ],
                  },
                  {
                    guard: '[server authoritative]',
                    steps: [
                      { kind: 'msg', from: 'route', to: 'local', label: 'merge → saveCompletedMilestoneIds', dashed: true },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'actor', to: 'ui', label: 'Complete milestone (explore / lesson trigger)' },
      { kind: 'msg', from: 'ui', to: 'local', label: 'saveCompletedMilestoneIds + pushSolarJourneyProgress' },
      { kind: 'msg', from: 'ui', to: 'actor', label: 'Update strip UI; may tie UC-34 gem toast', dashed: true },
    ],
  },
  {
    file: 'UC-36-View-Notifications',
    title: 'UC-36 View Notifications',
    actor: 'Student',
    participants: [
      { id: 'bell', label: 'NotificationBell' },
      { id: 'client', label: 'notificationsApi' },
      { id: 'route', label: 'notifications routes' },
      { id: 'db', label: 'MongoDB Notification' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'bell', label: 'Click bell icon' },
      { kind: 'msg', from: 'bell', to: 'client', label: 'GET /api/notifications?unreadOnly' },
      { kind: 'msg', from: 'client', to: 'route', label: 'authMiddleware' },
      { kind: 'msg', from: 'route', to: 'db', label: 'Notification.find({ userId }).sort(-createdAt)' },
      { kind: 'msg', from: 'db', to: 'bell', label: 'items incl. UC-49 broadcast', dashed: true },
      { kind: 'msg', from: 'actor', to: 'bell', label: 'Open item / mark read' },
      { kind: 'msg', from: 'bell', to: 'route', label: 'PATCH /notifications/:id/read' },
      { kind: 'msg', from: 'bell', to: 'actor', label: 'router.push(href) if link', dashed: true },
    ],
  },
  {
    file: 'UC-37-View-Studio-Dashboard',
    title: 'UC-37 View Studio Dashboard',
    actor: 'Teacher',
    participants: [
      { id: 'page', label: 'StudioDashboardPage' },
      { id: 'auth', label: 'useAuthStore + role guard' },
      { id: 'client', label: 'studioApi' },
      { id: 'route', label: 'teacher studio routes' },
      { id: 'db', label: 'MongoDB Course' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Navigate /studio' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[role !== teacher/admin]',
            steps: [{ kind: 'msg', from: 'auth', to: 'page', label: 'redirect /', dashed: true }],
          },
          {
            guard: '[authorized]',
            steps: [
              { kind: 'msg', from: 'page', to: 'client', label: 'GET teacher courses + stats' },
              { kind: 'msg', from: 'client', to: 'route', label: 'authMiddleware teacher scope' },
              { kind: 'msg', from: 'route', to: 'db', label: 'Course.find({ instructorId }) + enrollment counts' },
              { kind: 'msg', from: 'db', to: 'page', label: 'dashboard payload', dashed: true },
              { kind: 'msg', from: 'page', to: 'actor', label: 'Course cards + links (LP, concepts, cohorts)', dashed: true },
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
      { id: 'page', label: 'StudioCohortsPage' },
      { id: 'client', label: 'cohorts API client' },
      { id: 'route', label: 'cohorts.js' },
      { id: 'db', label: 'MongoDB Cohort + Enrollment' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /studio/:courseSlug/cohorts' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /api/courses/:slug/cohorts/manage' },
      { kind: 'self', who: 'route', label: 'requireRole teacher; canEditCourse check' },
      { kind: 'msg', from: 'route', to: 'db', label: 'Cohort.find + enrollment counts aggregate' },
      { kind: 'msg', from: 'db', to: 'page', label: 'rows incl. inviteCode, draft/open', dashed: true },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Create new cohort]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'page', label: 'Fill title, dates, price → Create' },
              { kind: 'msg', from: 'page', to: 'route', label: 'POST /api/courses/:slug/cohorts' },
              { kind: 'self', who: 'route', label: 'slugify; generate inviteCode; normalizeCohortPricing' },
              { kind: 'msg', from: 'route', to: 'db', label: 'Cohort.create' },
            ],
          },
          {
            guard: '[Update existing cohort]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'page', label: 'Edit status / schedule → Save' },
              { kind: 'msg', from: 'page', to: 'route', label: 'PATCH /api/courses/:slug/cohort/:cohortId' },
              { kind: 'msg', from: 'route', to: 'db', label: 'update metadata + pricing fields' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'route', to: 'page', label: '{ success, data }', dashed: true },
      { kind: 'msg', from: 'page', to: 'actor', label: 'Refresh manage table', dashed: true },
    ],
  },
  {
    file: 'UC-42-Manage-Learning-Path',
    title: 'UC-42 Manage Learning Path',
    actor: 'Teacher',
    participants: [
      { id: 'page', label: 'LearningPathStudioPage' },
      { id: 'client', label: 'learningPathApi' },
      { id: 'route', label: 'learningPath.js' },
      { id: 'db', label: 'LearningPath + Concept' },
      { id: 'rag', label: 'ragIndexService' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /studio/learning-path' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /api/learning-path/editor (teacher)' },
      { kind: 'msg', from: 'route', to: 'db', label: 'LearningPath slug=main + Concept catalog ids' },
      { kind: 'msg', from: 'route', to: 'page', label: '{ modules, concepts, published }', dashed: true },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Edit modules/nodes/depth lessons/concept anchors' },
      { kind: 'self', who: 'page', label: 'client checklist: concept budget, missing anchors' },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Generate recall quiz for lesson]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST /editor/generate-quiz (AI rate limit)' },
              { kind: 'msg', from: 'route', to: 'page', label: 'recallQuiz draft', dashed: true },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Save + optional publish toggle' },
      { kind: 'msg', from: 'page', to: 'route', label: 'PUT /api/learning-path/editor { modules, concepts, published }' },
      { kind: 'self', who: 'route', label: 'normalizeModules; validateModulesByConceptIds' },
      { kind: 'msg', from: 'route', to: 'db', label: 'LearningPath.save (slug main)' },
      { kind: 'msg', from: 'route', to: 'rag', label: 'scheduleReindexAllLessons()' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[invalidConceptIds or sections]',
            steps: [
              { kind: 'msg', from: 'route', to: 'page', label: '200 + invalidConceptIds[] (saved)', dashed: true },
            ],
          },
          {
            guard: '[clean save]',
            steps: [{ kind: 'msg', from: 'route', to: 'page', label: '{ success, data }', dashed: true }],
          },
        ],
      },
      { kind: 'msg', from: 'page', to: 'actor', label: 'Studio shows publish + warnings', dashed: true },
    ],
  },
  {
    file: 'UC-43-Manage-Concepts',
    title: 'UC-43 Manage Concepts',
    actor: 'Teacher',
    participants: [
      { id: 'page', label: 'ConceptsStudioPage' },
      { id: 'client', label: 'conceptsApi' },
      { id: 'route', label: 'concepts routes' },
      { id: 'db', label: 'MongoDB Concept + TaxonomyRegistry' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /studio/concepts' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /api/concepts/editor' },
      { kind: 'msg', from: 'route', to: 'db', label: 'load Concept library + taxonomy' },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Edit definitions, links, taxonomy tags' },
      { kind: 'msg', from: 'page', to: 'route', label: 'PUT /api/concepts/editor (full library replace)' },
      { kind: 'self', who: 'route', label: 'normalize + validate DAG / slug uniqueness' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[invalid graph]',
            steps: [{ kind: 'msg', from: 'route', to: 'page', label: '400 validation errors', dashed: true }],
          },
          {
            guard: '[OK]',
            steps: [
              { kind: 'msg', from: 'route', to: 'db', label: 'bulk write Concept + TaxonomyRegistry' },
              { kind: 'msg', from: 'page', to: 'actor', label: 'Saved library version', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-45-Manage-User',
    title: 'UC-45 Manage User',
    actor: 'Admin',
    participants: [
      { id: 'page', label: 'AdminUsersPage' },
      { id: 'client', label: 'adminUsersApi' },
      { id: 'route', label: 'admin/index.js' },
      { id: 'db', label: 'MongoDB User' },
      { id: 'audit', label: 'AdminActionLog' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Search email / open user drawer' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /admin/users?q&page (scope users)' },
      { kind: 'msg', from: 'route', to: 'db', label: 'User.find + pagination' },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Change role / scopes / status / send reset' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[PATCH role]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'PATCH /admin/users/:id/role' },
              { kind: 'msg', from: 'route', to: 'db', label: 'User.role = teacher|student|…' },
              { kind: 'msg', from: 'route', to: 'audit', label: 'recordAdminAction(user_role_change)' },
            ],
          },
          {
            guard: '[POST send-password-reset]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST /admin/users/:id/send-password-reset' },
              { kind: 'msg', from: 'route', to: 'audit', label: 'recordAdminAction (email job)' },
            ],
          },
          {
            guard: '[PATCH status deactivate/restore]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'PATCH /admin/users/:id/status' },
              { kind: 'msg', from: 'route', to: 'db', label: 'accountStatus updated' },
              { kind: 'msg', from: 'route', to: 'audit', label: 'recordAdminAction' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'route', to: 'page', label: '{ success:true }', dashed: true },
    ],
  },
  {
    file: 'UC-46-Manage-Order',
    title: 'UC-46 Manage Order',
    actor: 'Admin',
    participants: [
      { id: 'page', label: 'AdminOrdersPage' },
      { id: 'client', label: 'adminOrdersApi' },
      { id: 'route', label: 'adminOpsRoutes' },
      { id: 'svc', label: 'adminOrderService' },
      { id: 'db', label: 'MongoDB Order' },
      { id: 'audit', label: 'AdminActionLog' },
    ],
    spacing: 130,
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /admin/orders, set filters q/status/page' },
      { kind: 'msg', from: 'page', to: 'client', label: 'fetchAdminOrdersList({ q, status, page, limit:30 })' },
      { kind: 'msg', from: 'client', to: 'route', label: 'GET /admin/orders (scope orders)' },
      { kind: 'msg', from: 'route', to: 'svc', label: 'listOrders(query)' },
      { kind: 'msg', from: 'svc', to: 'db', label: 'Order.aggregate + User lookup' },
      { kind: 'msg', from: 'db', to: 'page', label: '{ items, total }', dashed: true },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Select txnRef → detail panel' },
      { kind: 'msg', from: 'page', to: 'client', label: 'fetchAdminOrderDetail(txnRef)' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[PATCH admin note]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'PATCH note' },
              { kind: 'msg', from: 'svc', to: 'db', label: 'Order.adminNote' },
              { kind: 'msg', from: 'svc', to: 'audit', label: 'order_note_update' },
            ],
          },
          {
            guard: '[POST cancel pending]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST cancel' },
              { kind: 'msg', from: 'svc', to: 'db', label: 'status=cancelled' },
              { kind: 'msg', from: 'svc', to: 'audit', label: 'order_cancel' },
            ],
          },
          {
            guard: '[POST refund completed]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST refund + reason' },
              { kind: 'msg', from: 'svc', to: 'db', label: 'status=refunded; Enrollment.revoke' },
              { kind: 'msg', from: 'svc', to: 'audit', label: 'order_refund' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'page', to: 'actor', label: 'reload() table + toast msg', dashed: true },
    ],
  },
  {
    file: 'UC-47-Approve-Teacher',
    title: 'UC-47 Approve / Reject Teacher Application',
    actor: 'Admin',
    participants: [
      { id: 'page', label: 'AdminDashboard / Applications panel' },
      { id: 'route', label: 'admin/index.js' },
      { id: 'db', label: 'MongoDB User + Application' },
      { id: 'notify', label: 'Notification service' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open pending teacher applications' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /admin/teacher-applications' },
      { kind: 'msg', from: 'route', to: 'db', label: 'find users teacherApplicationStatus=pending' },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Approve or Reject + optional note' },
      { kind: 'msg', from: 'page', to: 'route', label: 'PATCH /admin/teacher-applications/:id' },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[approved]',
            steps: [
              { kind: 'msg', from: 'route', to: 'db', label: 'role=teacher, applicationStatus=approved' },
              { kind: 'msg', from: 'route', to: 'notify', label: 'Notification.create → applicant' },
            ],
          },
          {
            guard: '[rejected]',
            steps: [
              { kind: 'msg', from: 'route', to: 'db', label: 'applicationStatus=rejected' },
              { kind: 'msg', from: 'route', to: 'notify', label: 'rejection notice' },
            ],
          },
        ],
      },
      { kind: 'msg', from: 'page', to: 'actor', label: 'Remove row from pending list', dashed: true },
    ],
  },
  {
    file: 'UC-48-Manage-Gem-Economy',
    title: 'UC-48 Manage Gem Economy',
    actor: 'Admin',
    participants: [
      { id: 'page', label: 'AdminGemEconomyPage' },
      { id: 'route', label: 'admin/gemEconomy.js' },
      { id: 'db', label: 'MongoDB' },
      { id: 'audit', label: 'GemEconomyAuditLog' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /admin/gem-economy' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /metrics, /config, /shop-items' },
      { kind: 'msg', from: 'route', to: 'db', label: 'aggregates UserReward + GemRuntimeConfig + ShopItem' },
      { kind: 'msg', from: 'db', to: 'page', label: 'dashboard tables', dashed: true },
      {
        kind: 'alt',
        operands: [
          {
            guard: '[PATCH runtime config]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'PATCH /admin/gem-economy/config' },
              { kind: 'msg', from: 'route', to: 'db', label: 'GemRuntimeConfig update' },
              { kind: 'msg', from: 'route', to: 'audit', label: 'log config change' },
            ],
          },
          {
            guard: '[POST manual-adjust]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST /manual-adjust { userId, delta }' },
              { kind: 'msg', from: 'route', to: 'db', label: 'UserReward balance += delta' },
              { kind: 'msg', from: 'route', to: 'audit', label: 'log adjust' },
            ],
          },
          {
            guard: '[POST/PATCH shop SKU]',
            steps: [
              { kind: 'msg', from: 'page', to: 'route', label: 'POST or PATCH /shop-items' },
              { kind: 'msg', from: 'route', to: 'db', label: 'ShopItem upsert' },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-49-Promo-Broadcast',
    title: 'UC-49 Promo & Broadcast',
    actor: 'Admin',
    participants: [
      { id: 'promo', label: 'AdminPromoCodesPage' },
      { id: 'broad', label: 'AdminBroadcastPage' },
      { id: 'route', label: 'admin/index.js' },
      { id: 'db', label: 'MongoDB' },
    ],
    flow: [
      {
        kind: 'alt',
        operands: [
          {
            guard: '[Create promo code]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'promo', label: 'Fill code, discount, expiry' },
              { kind: 'msg', from: 'promo', to: 'route', label: 'POST /admin/promo-codes' },
              { kind: 'msg', from: 'route', to: 'db', label: 'PromoCode.create' },
              { kind: 'msg', from: 'promo', to: 'actor', label: 'List refresh', dashed: true },
            ],
          },
          {
            guard: '[Broadcast notification UC-49]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'broad', label: 'Title, body, target roles, href' },
              { kind: 'msg', from: 'broad', to: 'route', label: 'POST /admin/notifications/broadcast' },
              { kind: 'msg', from: 'route', to: 'db', label: 'User.find(roles) + Notification.insertMany' },
              { kind: 'msg', from: 'route', to: 'broad', label: '{ recipientCount }', dashed: true },
            ],
          },
        ],
      },
    ],
  },
  {
    file: 'UC-50-Platform-Analytics',
    title: 'UC-50 Platform Analytics (dashboard)',
    actor: 'Admin',
    participants: [
      { id: 'page', label: 'AdminDashboardPage' },
      { id: 'route', label: 'admin/index.js analytics' },
      { id: 'db', label: 'MongoDB aggregates' },
      { id: 'ga', label: 'GA4 gtag (client)' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /admin (analytics scope)' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /admin/analytics/overview?range=7d' },
      { kind: 'msg', from: 'route', to: 'db', label: 'aggregate users, orders, enrollments, LP events' },
      { kind: 'msg', from: 'db', to: 'page', label: 'KPI cards + sparkline data', dashed: true },
      { kind: 'self', who: 'page', label: 'trackEvent("admin_dashboard_viewed")' },
      { kind: 'msg', from: 'page', to: 'ga', label: 'gtag event (optional NEXT_PUBLIC_GA_ID)' },
      { kind: 'msg', from: 'actor', to: 'page', label: 'Switch tab: Phễu / LP / Explore' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /analytics/funnel | learning-path | explore' },
      { kind: 'msg', from: 'route', to: 'db', label: 'domain-specific pipelines' },
      { kind: 'msg', from: 'page', to: 'actor', label: 'Render charts (Mongo only, not GA API)', dashed: true },
    ],
  },
  {
    file: 'UC-50-Audit-Log',
    title: 'UC-50 Audit Log',
    actor: 'Admin',
    participants: [
      { id: 'page', label: 'AdminAuditPage' },
      { id: 'route', label: 'adminOpsRoutes' },
      { id: 'db', label: 'AdminActionLog + GemEconomyAuditLog' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /admin/audit?source=&page=' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET audit entries (paginated)' },
      { kind: 'msg', from: 'route', to: 'db', label: 'query logs merge admin + gem sources' },
      { kind: 'msg', from: 'db', to: 'page', label: '{ rows, labels, actorEmail }', dashed: true },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[?source=gem after UC-48 adjust]',
            steps: [{ kind: 'msg', from: 'page', to: 'route', label: 'filter GemEconomyAuditLog only' }],
          },
        ],
      },
      { kind: 'msg', from: 'page', to: 'actor', label: 'Table of labeled admin actions', dashed: true },
    ],
  },
  {
    file: 'UC-50-System-Status',
    title: 'UC-50 System Status',
    actor: 'Admin',
    participants: [
      { id: 'page', label: 'AdminSystemPage' },
      { id: 'route', label: 'adminOpsRoutes' },
      { id: 'db', label: 'MongoDB + job metadata' },
      { id: 'job', label: 'newsCrawlService' },
    ],
    flow: [
      { kind: 'msg', from: 'actor', to: 'page', label: 'Open /admin/system' },
      { kind: 'msg', from: 'page', to: 'route', label: 'GET /admin/system/status' },
      { kind: 'msg', from: 'route', to: 'db', label: 'health: API, DB ping, last crawl timestamps' },
      { kind: 'msg', from: 'route', to: 'page', label: 'status cards', dashed: true },
      {
        kind: 'opt',
        operands: [
          {
            guard: '[Run news crawl now]',
            steps: [
              { kind: 'msg', from: 'actor', to: 'page', label: 'Click trigger crawl' },
              { kind: 'msg', from: 'page', to: 'route', label: 'POST trigger (admin scope)' },
              { kind: 'msg', from: 'route', to: 'job', label: 'runScheduledNewsCrawl(force)' },
              { kind: 'msg', from: 'job', to: 'db', label: 'upsert NewsArticle sources' },
              { kind: 'msg', from: 'page', to: 'actor', label: 'Show result / error banner', dashed: true },
            ],
          },
        ],
      },
    ],
  },
];
