export type Id = string | number;


export interface User { id: string; userName: string; email?: string; isAdmin?: boolean }


export interface ProjectImage {
  id?: number;
  url: string;
  alt?: string;
  sortOrder?: number;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  techStack?: unknown;
  liveUrl?: string;
  repoUrl?: string;
  featured: boolean;
  published: boolean;
  ownerUserId?: string;
  createdAt: string;
  updatedAt: string;

  kind: 'software' | 'hardware';    
  images: ProjectImage[];           
}


export interface BlogPost {
id: number; slug: string; title: string; excerpt?: string; content: string;
coverImageUrl?: string; status: 'draft'|'published'|'archived'; publishedAt?: string;
authorUserId?: string; createdAt: string; updatedAt: string;
}


export interface BlogTag { id: number; name: string; slug: string }


export interface FitnessDaily {
id: number; userId: string; day: string; caloriesIn?: number; caloriesOut?: number; steps?: number;
sleepMinutes?: number; weightKg?: number; notes?: string; createdAt: string; updatedAt: string;
}


export interface ExerciseSession {
id: number; userId: string; startTime: string; endTime?: string | null; type: 'cardio'|'strength'|'mobility'|'other';
caloriesBurned?: number; distanceKm?: number | null; notes?: string; createdAt: string; updatedAt: string;
}


export interface ContactInquiry {
id: number; name?: string; email: string; phone?: string; subject?: string; message: string;
status: 'new'|'replied'|'closed'; createdAt: string; updatedAt: string; handledByUserId?: string | null;
}


// --- Animation Groups ---
export type AnimationGroupItem = {
  id?: number
  fileName: string
  label?: string | null
  sortOrder?: number
}

export type AnimationGroup = {
  id: number
  slug: string
  title: string
  description?: string | null
  tagsJson?: string | null
  published: boolean
  category: string
  isDefaultForCategory: boolean

  items: AnimationGroupItem[]
  updatedAt: string
}