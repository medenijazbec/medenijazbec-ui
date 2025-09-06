import { useEffect, useState } from 'react';
import { projects } from '@/controllers/projects';
import type { Project } from '@/types/domain';


export function useProjectsLogic() {
const [items, setItems] = useState<Project[]>([]);
useEffect(() => { projects.list().then(setItems).catch(console.error); }, []);
return { items };
}