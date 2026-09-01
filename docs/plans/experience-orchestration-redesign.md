# Galaxies Experience Orchestration Redesign

## 1. Mục tiêu

Xây dựng một hệ thống trải nghiệm học tập thống nhất, nơi người dùng đi qua toàn bộ app như một hành trình liên tục, thay vì chuyển giữa các surface rời rạc như Dashboard, Tutorial, Explore, Course, Rewards.

Mục tiêu không chỉ là “giao diện đẹp hơn”, mà là:
- loại bỏ lỗ hổng nghiệp vụ,
- thống nhất logic điều hướng và tiến độ,
- làm cho mỗi hành động của người dùng có nghĩa và dẫn tới bước tiếp theo rõ ràng.

---

## 2. Vấn đề hiện tại

### 2.1 Lỗ hổng trải nghiệm
- Dashboard, Tutorial, Explore, Course hiện là các entry point riêng biệt.
- Không có một “next best action” duy nhất cho người dùng.
- Người dùng mới dễ lạc hướng vì không biết nên bắt đầu từ đâu.
- Nhiều màn có CTA nhưng không có logic nối giữa nhau.

### 2.2 Lỗ hổng nghiệp vụ
- Tiến độ học hiện bị phân tán giữa local state, progress utilities, lesson completion, rewards.
- Không có một nguồn chân lý duy nhất cho “người dùng đã học đến đâu”.
- Access control chưa được điều phối như một hệ thống: free content, paid content, prerequisite, review loop, completion gate chưa thống nhất.
- Không có một engine quyết định “nên làm gì tiếp theo” dựa trên hành vi và tiến độ thật.
- Các surface không cùng subscribe vào một state chung.

### 2.3 Lỗ hổng kiến trúc
- Studio có thể gắn concept, lesson, showcase entity, nhưng chưa có một orchestration layer để biến các mối nối đó thành trải nghiệm người dùng.
- Các module đang dùng chung dữ liệu nhưng chưa dùng chung một engine điều phối.

---

## 3. Thiết kế mục tiêu

### 3.1 Nguyên tắc cốt lõi
1. Một learner chỉ có một journey state duy nhất.
2. Mọi surface đều đọc cùng một state và render đúng next action.
3. Mọi nội dung phải có rõ:
   - mục tiêu học tập,
   - điều kiện mở khóa,
   - điều kiện hoàn thành,
   - bước tiếp theo tiếp nối.
4. Không để người dùng ở trạng thái “đã xem nhưng không biết phải làm gì tiếp”.

### 3.2 Hệ thống sẽ gồm 5 tầng

#### Tầng A — Content Graph
Định nghĩa các mối liên hệ giữa nội dung:
- Concept
- Lesson
- Module / Node
- Explore entity
- Quiz / assessment
- Course / enrollment
- Reward / milestone

Mỗi nội dung có metadata:
- id
- type
- objective
- prerequisites
- estimatedDuration
- difficulty
- unlockRules
- relatedContent

#### Tầng B — Learner Journey Engine
Đây là trái tim của hệ thống.

Nó quyết định:
- user đang ở bước nào,
- nên làm gì tiếp theo,
- có nên đề xuất review, quiz, explore, course hay reward,
- có nên mở khóa nội dung mới không.

#### Tầng C — Access & Progress Engine
Quản lý:
- quyền truy cập nội dung,
- completion status,
- retry policy,
- mastery threshold,
- paid/free gating,
- prerequisite validation.

#### Tầng D — Experience Surface
Các surface dùng chung:
- Dashboard
- Tutorial
- Explore
- Course learner view
- Rewards / streak / achievements

Mỗi surface chỉ cần render theo state và recommendation của engine.

#### Tầng E — Studio Authoring Layer
Studio không còn chỉ là công cụ chỉnh nội dung rời rạc.
Nó phải cho phép author định nghĩa:
- learning objective,
- prerequisites,
- unlock rules,
- learning path branches,
- concept-to-entity mapping,
- assessment and review loops.

---

## 4. Mô hình dữ liệu mới

### 4.1 LearnerJourneyState
```ts
type LearnerJourneyState = {
  userId: string
  currentGoalId?: string
  currentPathId?: string
  currentContentId?: string
  currentSurface: 'dashboard' | 'tutorial' | 'explore' | 'course' | 'reward'
  status: 'onboarding' | 'exploring' | 'learning' | 'practicing' | 'reviewing' | 'completed' | 'stalled'
  lastActiveAt: string
  streak: number
  masteryByConcept: Record<string, number>
  completedContentIds: string[]
  startedContentIds: string[]
  blockedContentIds: string[]
  nextRecommended: {
    type: 'lesson' | 'quiz' | 'explore' | 'course' | 'review'
    targetId: string
    reason: string
  }
}
```

### 4.2 LearningContentNode
```ts
type LearningContentNode = {
  id: string
  type: 'lesson' | 'quiz' | 'explore' | 'course' | 'milestone'
  title: string
  objective: string
  prerequisites: string[]
  unlockRules: string[]
  relatedConceptIds: string[]
  relatedEntityIds: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedMinutes: number
  isPaid: boolean
}
```

### 4.3 LearningEvent
```ts
type LearningEvent = {
  id: string
  userId: string
  eventType: 'view' | 'start' | 'complete' | 'retry' | 'purchase' | 'quiz_pass' | 'quiz_fail' | 'explore_visit'
  contentId?: string
  conceptId?: string
  entityId?: string
  timestamp: string
  metadata?: Record<string, unknown>
}
```

---

## 5. Logic nghiệp vụ mới

### 5.1 Quy tắc 1 — Một next-step cho mỗi người dùng
Mỗi lần user mở app, hệ thống phải trả lời 3 câu hỏi:
- Tôi đang ở đâu?
- Tôi đã hoàn thành gì?
- Tôi nên làm gì tiếp theo?

Nếu không trả lời được 3 câu hỏi này thì trải nghiệm chưa đủ.

### 5.2 Quy tắc 2 — Mọi nội dung đều có điều kiện mở khóa
Một lesson không thể xuất hiện ngẫu nhiên. Nó phải có:
- prerequisite completed,
- access entitlement valid,
- user role / plan phù hợp,
- context phù hợp.

### 5.3 Quy tắc 3 — Mọi hoàn thành phải có phản hồi
Khi user hoàn thành một nội dung:
- cập nhật mastery,
- unlock nội dung tiếp theo,
- gợi ý review hoặc quiz,
- cập nhật reward / milestone,
- điều chỉnh next-step cho lần truy cập sau.

### 5.4 Quy tắc 4 — Có loop review thay vì chỉ “đọc rồi thôi”
Nếu user học xong nhưng chưa đạt mastery:
- hệ thống tự động đề xuất review lesson,
- quiz ngắn,
- explore entity liên quan,
- recap concept.

### 5.5 Quy tắc 5 — Có fallback cho người mới
Nếu user chưa có dữ liệu tiến độ:
- hệ thống đưa đến onboarding nhẹ,
- gợi ý path phù hợp,
- không bắt người dùng tự tìm.

---

## 6. Luồng trải nghiệm mục tiêu

### 6.1 Flow cho người mới
1. User vào app.
2. Hệ thống xác định mục tiêu gợi ý: “Khám phá hệ Mặt Trời” hoặc “Hiểu cơ bản về thiên văn”.
3. Render một single primary CTA: “Bắt đầu hành trình”.
4. User vào bài đầu tiên.
5. Sau khi hoàn thành, hệ thống tự đề xuất:
   - bài tiếp theo,
   - quiz ngắn,
   - explore 3D liên quan.

### 6.2 Flow cho người đang quay lại
1. App đọc journey state.
2. Hiển thị “Tiếp tục từ …”.
3. Nếu đang dừng ở lesson, tiếp tục lesson đó.
4. Nếu đã hoàn thành, chuyển sang review hoặc next concept.
5. Nếu đang lạc hướng, hệ thống đề xuất một mục tiêu rõ ràng.

### 6.3 Flow cho người đang ở Explore
1. User chọn một entity trong 3D.
2. Hệ thống tự gợi ý:
   - concept liên quan,
   - bài học phù hợp,
   - quiz ngắn,
   - action tiếp theo.

### 6.4 Flow cho người học course trả phí
1. Nếu chưa purchase, hệ thống hiển thị gate rõ ràng.
2. Nếu đã purchase, mở khóa nội dung ngay.
3. Nếu thiếu prerequisite, hệ thống hiển thị lý do và bài trước cần học.

---

## 7. Kiến trúc hệ thống đề xuất

### 7.1 Frontend
- Một custom hook chung: useLearnerJourney
- Một component chung: JourneyNextActionCard
- Các surface chỉ render UI theo state.

### 7.2 Backend / services
- JourneyService: tính next action.
- ProgressService: cập nhật trạng thái học.
- AccessService: kiểm tra unlock / paid gate.
- RecommendationService: gợi ý nội dung tiếp theo.
- EventStore: lưu toàn bộ sự kiện học.

### 7.3 API đề xuất
```http
GET /api/learner-journey
POST /api/learner-journey/events
GET /api/learner-journey/next-action
GET /api/learner-journey/recommendations
```

### 7.4 State synchronization
- Dashboard, Tutorial, Explore, Course đều đọc từ cùng một snapshot của journey.
- Các action cập nhật event log và trigger recompute.
- Server trả về next action đã được tính sẵn để UI render nhanh.

---

## 8. Cách xóa lỗ hổng nghiệp vụ

### 8.1 Thống nhất tiến độ
Không còn tình trạng progress nằm rải rác ở nhiều nơi.
Một user có một progress ledger duy nhất.

### 8.2 Thống nhất access control
- Free vs paid rõ ràng.
- Prerequisite rõ ràng.
- Không để content “mở nhưng không biết nên xem ở đâu”.

### 8.3 Thống nhất recommendation logic
Không còn recommendation thủ công hoặc hardcoded rời rạc.
Tất cả đều dựa trên state + behaviour + mastery.

### 8.4 Thống nhất completion flow
Một lesson hoàn thành thì phải dẫn tới:
- next action,
- reward,
- review loop,
- unlock content mới.

### 8.5 Thống nhất onboarding và recovery
- Nếu user bỏ dở, app phải nhớ và suggest continue.
- Nếu user “ngó qua rồi rời đi”, app phải có mechanism phục hồi context.

---

## 9. Vai trò của Studio trong thiết kế mới

Studio phải trở thành “authoring orchestration”, không chỉ là editor.

### Studio cần cho phép author định nghĩa:
- learning objective,
- prerequisite graph,
- unlock conditions,
- related concepts,
- entity attachment,
- assessment relation,
- review path.

### Studio cần có preview:
- preview learner journey từ đầu vào một lesson,
- preview next action sau mỗi step,
- preview user sees what if content is locked / paid / incomplete.

---

## 10. Giai đoạn triển khai đề xuất

### Phase 1 — Foundation
- Thiết lập LearnerJourneyState và event log.
- Đồng nhất progress và resume.
- Thêm one primary CTA ở Dashboard/Tutorial/Explore.

### Phase 2 — Orchestration
- Tạo JourneyService và RecommendationService.
- Nối Dashboard/Tutorial/Explore vào cùng một next action engine.
- Thêm unlock / prerequisite rules.

### Phase 3 — Business guardrails
- Xử lý paid gate, prerequisite gate, retry/review logic.
- Thêm completion và reward flow đầy đủ.

### Phase 4 — Studio authoring
- Cho author cấu hình journey, prerequisite và next-step policy trong Studio.
- Thêm preview và validation.

### Phase 5 — Personalization
- Dựa trên hành vi và mastery để đề xuất nội dung phù hợp hơn.
- Tích hợp AI tutor hoặc adaptive learning hints.

---

## 11. KPI thành công

Hệ thống mới được xem là thành công khi:
- tỷ lệ người dùng quay lại trong 7 ngày tăng,
- tỷ lệ hoàn thành lesson tăng,
- tỷ lệ bỏ dở sau 1 lần vào giảm,
- người dùng ít phải tự tìm đường hơn,
- mỗi màn đều có một hành động tiếp theo rõ ràng,
- không còn nội dung “không biết nên mở ở đâu”.

---

## 12. Kết luận

Nếu muốn hệ thống thật sự “liên kết ở tầng Studio” và “đủ logic nghiệp vụ”, thì phải nâng từ việc “nối nội dung” lên thành “orchestrate trải nghiệm người dùng”.

Nền tảng đúng đắn là:
- một journey state duy nhất,
- một engine quyết định next-step,
- một access/progress engine thống nhất,
- một Studio authoring layer cho toàn bộ quy tắc học tập.

Đây mới là cách biến Galaxies từ một hệ thống có nhiều module thành một hệ thống học tập có dòng chảy thật.
