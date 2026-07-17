// Mirrors what scripts/build-index.mjs writes. That script is the source of truth: when
// a field changes there, it changes here.

export type ComponentType = 'plugin' | 'skill' | 'agent' | 'command' | 'hook' | 'mcp'

export interface Dependency {
  name: string
  version?: string
  marketplace?: string
  /** False when the dependency lives in another marketplace, or is missing entirely. */
  resolved: boolean
}

export interface Component {
  id: string
  type: ComponentType
  name: string
  displayName?: string
  description: string
  keywords: string[]
  /** The owning plugin's name. Equal to `name` when type is 'plugin'. */
  plugin: string
  invocation: string | null
  tools: string[]
  model: string | null
  updatedAt: string | null
  sourcePath: string
  githubUrl: string | null
  bodyPath: string
  searchText: string

  // Plugins only.
  category?: string | null
  version?: string | null
  license?: string | null
  author?: string | null
  installCommand?: string
  dependencies?: Dependency[]
  dependents?: string[]
  contents?: Record<'skills' | 'agents' | 'commands' | 'hooks' | 'mcp', string[]>
  compatibilityPath?: string | null
}

export interface Marketplace {
  name: string
  description: string
  owner: string | null
  repo: string | null
  repoUrl: string | null
  branch: string
  addCommand: string | null
}

export interface Index {
  marketplace: Marketplace
  components: Component[]
}

export interface Release {
  plugin: string
  version: string
  date: string | null
  /** False when the date was inferred from the last commit rather than read from the
   *  CHANGELOG heading — the UI qualifies it rather than presenting a guess as fact. */
  dateIsExact: boolean
  body: string
  summary: string
}

export interface Stats {
  plugins: number
  skills: number
  agents: number
  commands: number
  hooks: number
  mcp: number
  updatedAt: string | null
}
