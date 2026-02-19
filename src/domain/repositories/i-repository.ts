export interface IRepository<T> {
    create(data: T): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T | null>;
    delete(id: string): Promise<boolean>;
    findById(id: string): Promise<T | null>;
}
