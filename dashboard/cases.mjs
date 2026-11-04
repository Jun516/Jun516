// Curated presentation metadata, not a proficiency score or a live status source.
// Each case was verified against its public Jun516-authored upstream PR.
// Validation describes the evidence recorded in that PR; it was not rerun for this page.
// The UI resolves current status from the scheduled GitHub snapshot by `url`.
export const contributionCases = [
  {
    id: 'deerflow-memory-race',
    topic: 'fullstack',
    repo: 'bytedance/deer-flow',
    pr: 6959,
    url: 'https://github.com/bytedance/deer-flow/pull/6959',
    title: {
      zh: '保住已确认的记忆操作',
      en: 'Keep confirmed memory changes',
    },
    problem: {
      zh: '旧的后台读取晚于保存操作返回，会覆盖浏览器缓存，让已删除或已修改的记忆看起来恢复到旧状态。',
      en: 'An older background read could overwrite the browser cache after a successful memory change, making saved or deleted facts appear to roll back.',
    },
    change: {
      zh: '在写入成功响应前取消对应的记忆查询，保留失败操作和后续正常刷新的行为。',
      en: 'Cancel the matching memory query before caching a successful mutation response, while preserving failed actions and later refreshes.',
    },
    validation: {
      zh: 'PR 记录：5 项竞态回归在原实现失败；修复后内存域 30 项测试通过。未宣称完整前端或浏览器 E2E 通过。',
      en: 'PR evidence: five race regressions failed before the fix; 30 memory-domain tests passed afterward. Full frontend and browser E2E coverage was not claimed.',
    },
    evidence: [
      {
        label: { zh: '修复与回归证据', en: 'Patch and regression evidence' },
        url: 'https://github.com/bytedance/deer-flow/pull/6959',
      },
      {
        label: { zh: '原始问题', en: 'Original issue' },
        url: 'https://github.com/bytedance/deer-flow/issues/6955',
      },
    ],
  },
  {
    id: 'honcho-mcp-session',
    topic: 'mcp',
    repo: 'plastic-labs/honcho',
    pr: 1375,
    url: 'https://github.com/plastic-labs/honcho/pull/1375',
    title: {
      zh: '修正 MCP 会话恢复信号',
      en: 'Correct MCP session recovery signals',
    },
    problem: {
      zh: '携带过期或未知会话 ID 的请求收到 400，缺少 MCP 协议规定的会话失效信号。',
      en: 'Requests with an expired or unknown session ID returned 400, omitting the session-expiration signal required by the MCP protocol.',
    },
    change: {
      zh: '对失效会话返回 404，供客户端据此重新初始化；完全缺少会话头的请求继续返回 400。',
      en: 'Return 404 for stale sessions so clients can reinitialize, while keeping 400 for requests that lack the session header.',
    },
    validation: {
      zh: 'PR 记录：22 项 Bun 测试通过、TypeScript 检查通过，覆盖失效会话的 GET/POST 与缺少会话头的控制用例。',
      en: 'PR evidence: 22 Bun tests and TypeScript checking passed, covering stale-session GET/POST requests and the missing-header control.',
    },
    evidence: [
      {
        label: { zh: '修复与协议边界', en: 'Patch and protocol boundary' },
        url: 'https://github.com/plastic-labs/honcho/pull/1375',
      },
      {
        label: { zh: '原始问题', en: 'Original issue' },
        url: 'https://github.com/plastic-labs/honcho/issues/1345',
      },
    ],
  },
  {
    id: 'opensandbox-replacement-errors',
    topic: 'agent',
    repo: 'opensandbox-group/OpenSandbox',
    pr: 2222,
    url: 'https://github.com/opensandbox-group/OpenSandbox/pull/2222',
    title: {
      zh: '让沙箱文件替换如实报错',
      en: 'Surface failed sandbox file replacements',
    },
    problem: {
      zh: 'Python SDK 吞掉空响应或非 JSON 错误，文件未修改时仍返回成功，导致 Agent 误判编辑结果。',
      en: 'The Python SDK swallowed empty or non-JSON error responses, reporting success even when the file had not changed.',
    },
    change: {
      zh: '让同步与异步普通文件适配器通过既有异常转换器报告失败，同时继续接受成功的空 200 响应。',
      en: 'Use the existing exception converter for synchronous and asynchronous ordinary adapters, while retaining support for successful empty 200 responses.',
    },
    validation: {
      zh: 'PR 记录：44 项传输回归与 90 项相关测试通过，并有离线 SDK 调用探针；完整 SDK 套件未全绿。',
      en: 'PR evidence: 44 transport regressions and 90 related tests passed, with an offline SDK application probe. The full SDK suite was not all green.',
    },
    evidence: [
      {
        label: { zh: '修复、兼容性与验证范围', en: 'Patch, compatibility and verification scope' },
        url: 'https://github.com/opensandbox-group/OpenSandbox/pull/2222',
      },
    ],
  },
  {
    id: 'memu-windows-paths',
    topic: 'agent',
    repo: 'NevaMind-AI/memU',
    pr: 727,
    url: 'https://github.com/NevaMind-AI/memU/pull/727',
    title: {
      zh: '保留 Windows 记忆资源路径',
      en: 'Preserve Windows memory resource paths',
    },
    problem: {
      zh: '资源校验只识别以 / 或 ~ 开头的路径，使真实存在的 Windows 绝对路径在文件检查前被丢弃。',
      en: 'Resource verification recognized only / and ~ prefixes, dropping existing Windows absolute paths before checking the files.',
    },
    change: {
      zh: '识别本机绝对路径，保留原有去重、顺序和文件检查，继续拒绝不完整的驱动器相对路径。',
      en: 'Recognize native absolute paths while preserving deduplication, ordering and file checks, and rejecting incomplete drive-relative paths.',
    },
    validation: {
      zh: 'PR 记录：56 项相关测试通过，并有真实本地 Windows 文件探针；UNC 路径使用桩检查，未连接共享盘。',
      en: 'PR evidence: 56 related tests passed with a real local Windows-file probe. UNC paths used stubbed checks; no network share was contacted.',
    },
    evidence: [
      {
        label: { zh: '修复与跨平台验证范围', en: 'Patch and cross-platform verification scope' },
        url: 'https://github.com/NevaMind-AI/memU/pull/727',
      },
    ],
  },
];
