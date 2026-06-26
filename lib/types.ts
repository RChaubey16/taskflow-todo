export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type FilterTab = 'all' | 'active' | 'completed'

export interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
  dueDate?: string
  priority?: Priority
  tags?: string[]
}
