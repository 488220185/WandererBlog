/**
 * 云数据库 schema 类型。
 * 传给 createWorkBuddyCloud<Database>() 后，from('posts') 的 insert/update
 * 就能得到完整的类型检查。
 */

export interface PostRow {
  id: number
  owner_id: string
  title: string
  slug: string
  excerpt: string | null
  content_md: string
  cover_url: string | null
  tags: string[]
  status: 'published' | 'draft'
  views: number
  reading_minutes: number
  created_at: string
  updated_at: string
}

export interface SiteOwnerRow {
  id: number
  uid: string
  owner_email: string | null
  blog_title: string
  blog_subtitle: string
  author_name: string
  author_bio: string
  created_at: string
}

type Insertable<T> = {
  [K in keyof T]?: T[K] extends { _brand?: never } ? T[K] : T[K] | undefined
}

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: PostRow
        Insert: Omit<Insertable<PostRow>, 'id' | 'views' | 'created_at' | 'updated_at'> & {
          id?: never
          views?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<PostRow, 'id' | 'created_at'>>
        Relationships: []
      }
      site_owner: {
        Row: SiteOwnerRow
        Insert: Omit<Insertable<SiteOwnerRow>, 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Omit<SiteOwnerRow, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      bump_post_view: {
        Args: { p_slug: string }
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
