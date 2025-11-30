export interface Base {
    i: any // Omit<typeof User.$inferSelect, "hash" | "salt"> & { last_call: number } | undefined
    title: string
    keywords?: string; // SEO 可选关键词
    description?: string; // SEO 可选描述
    thread_lock?: boolean
    head_external?: string
}

export interface pEditBase extends Base {
    eid: number,
    land: number,
    content: string,
}

export interface pListBase extends Base {
    page: number
    pagination: number[]
    data: (any & { // typeof Post.$inferSelect
        name: string | null;
        grade: number | null;
        credits: number | null;
        quote_content: string | null;
        quote_name: string | null;
    })[]
}

export interface tListBase extends Base {
    page: number
    pagination: number[]
    data: (any & { // typeof Post.$inferSelect
        name: string | null;
        grade: number | null;
        credits: number | null;
        last: JSON;
        last_time: number | null;
        last_name: string | null;
        last_grade: number | null;
        last_credits: number | null;
    })[]
}
