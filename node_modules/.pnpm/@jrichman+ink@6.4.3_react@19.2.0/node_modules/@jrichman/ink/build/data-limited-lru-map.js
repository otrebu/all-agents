import { LRUMapWithDelete } from 'mnemonist';
/**
 * A specialized LRU map that enforces limits on both the number of entries and
 * the total character length of the keys.
 *
 * When adding a new item, if the new key's length would exceed `maxDataSize`,
 * it evicts the least recently used items until space is available.
 *
 * @template V - The type of the values stored in the map.
 */
export class DataLimitedLruMap {
    map;
    maxDataSize;
    currentDataSize = 0;
    constructor(maxKeys, maxDataSize) {
        this.map = new LRUMapWithDelete(maxKeys);
        this.maxDataSize = maxDataSize;
    }
    get(key) {
        return this.map.get(key);
    }
    set(key, value) {
        const size = key.length;
        const hasKey = this.map.has(key);
        while (this.currentDataSize + size > this.maxDataSize &&
            this.map.size > 0) {
            const map = this.map;
            const lruKey = map.K[map.tail];
            if (lruKey === undefined) {
                break;
            }
            this.currentDataSize -= lruKey.length;
            this.map.delete(lruKey);
        }
        const result = this.map.setpop(key, value);
        if (result?.evicted) {
            this.currentDataSize -= result.key.length;
        }
        if (hasKey) {
            this.currentDataSize -= size;
        }
        this.currentDataSize += size;
    }
    get size() {
        return this.map.size;
    }
    get currentDataSizeValue() {
        return this.currentDataSize;
    }
}
//# sourceMappingURL=data-limited-lru-map.js.map