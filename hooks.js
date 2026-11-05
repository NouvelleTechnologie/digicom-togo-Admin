import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
// Écoute une requête Firestore en direct. data === null tant que ça charge.
export function useLive(makeQuery, deps = []) {
    const [data, setData] = useState(null);
    useEffect(() => {
        const q = makeQuery();
        if (!q)
            return;
        return onSnapshot(q, (s) => setData(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => { console.error(e); setData([]); });
        // eslint-disable-next-line
    }, deps);
    return data;
}
