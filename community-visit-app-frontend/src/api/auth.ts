import type { Role, User } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ─── Mock 存储（localStorage 持久化） ────────────────────────
const USERS_KEY = 'cva_users'

function seedUsers(): User[] {
  return [
    { id: 'u-admin', username: 'admin', password: '123456', role: 'admin', name: '系统管理员', phone: '', zoneId: null },
    { id: 'u-wangda', username: 'wangda', password: '123456', role: 'user', name: '王达', phone: '', zoneId: 'zone-0' },
    { id: 'u-guangzhi', username: 'guangzhi', password: '123456', role: 'user', name: '李广', phone: '', zoneId: 'zone-1' }
  ]
}

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) return JSON.parse(raw) as User[]
  } catch { /* 忽略 */ }
  const seeds = seedUsers()
  saveUsers(seeds)
  return seeds
}

function saveUsers(list: User[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(list))
  } catch { /* 忽略 */ }
}

let users: User[] = loadUsers()

export interface UserInput {
  username: string
  password: string
  role: Role
  name: string
  phone: string
  zoneId: string | null
}

const clone = (u: User): User => ({ ...u })

/** 登录校验：账号 + 密码 */
export async function login(username: string, password: string): Promise<User> {
  if (USE_MOCK) {
    const u = users.find(x => x.username === username && x.password === password)
    if (!u) throw new Error('账号或密码错误')
    return clone(u)
  }
  // 真实后端：POST /auth/login
  return { id: '', username, password, role: 'user', name: '', phone: '', zoneId: null }
}

/** 用户列表（管理员） */
export async function fetchUsers(): Promise<User[]> {
  if (USE_MOCK) return users.map(clone)
  return []
}

/** 校验：账号唯一、普通用户管辖责任区唯一 */
function assertValid(input: UserInput, exceptId?: string) {
  if (!input.username.trim()) throw new Error('账号不能为空')
  if (!input.password && !exceptId) throw new Error('密码不能为空')
  const dupName = users.some(u => u.id !== exceptId && u.username === input.username.trim())
  if (dupName) throw new Error(`账号 ${input.username} 已存在`)
  if (input.role === 'user' && input.zoneId) {
    const dupZone = users.some(u => u.id !== exceptId && u.role === 'user' && u.zoneId === input.zoneId)
    if (dupZone) throw new Error('该责任区已有管辖用户，一个区只能一人管辖')
  }
}

/** 创建用户（管理员；创建后可在编辑中补充姓名/电话） */
export async function createUser(input: UserInput): Promise<User> {
  if (USE_MOCK) {
    assertValid(input)
    const user: User = {
      id: `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      username: input.username.trim(),
      password: input.password,
      role: input.role,
      name: input.name,
      phone: input.phone,
      zoneId: input.role === 'user' ? input.zoneId : null
    }
    users.push(user)
    saveUsers(users)
    return clone(user)
  }
  return { id: '', ...input, username: '', password: '', role: 'user', name: '', phone: '', zoneId: null }
}

/** 修改用户；password 传空串表示不修改密码 */
export async function updateUser(id: string, input: UserInput): Promise<User> {
  if (USE_MOCK) {
    assertValid(input, id)
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) throw new Error('未找到该用户')
    users[idx] = {
      ...users[idx]!,
      username: input.username.trim(),
      password: input.password || users[idx]!.password,
      role: input.role,
      name: input.name,
      phone: input.phone,
      zoneId: input.role === 'user' ? input.zoneId : null
    }
    saveUsers(users)
    return clone(users[idx]!)
  }
  return { id, ...input, username: '', password: '', role: 'user', name: '', phone: '', zoneId: null }
}

/** 删除用户（管理员） */
export async function deleteUser(id: string): Promise<void> {
  if (USE_MOCK) {
    if (id === 'u-admin') throw new Error('不能删除系统管理员')
    users = users.filter(u => u.id !== id)
    saveUsers(users)
  }
}
