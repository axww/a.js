import { Props } from "./core";

export interface tListProps extends Props {
    page: number
    pagination: number[]
    data: (any & { // typeof Post.$inferSelect
        name: string | null;
        grade: number | null;
        credits: number | null;
        last_time: number | null;
        last_name: string | null;
        last_grade: number | null;
        last_credits: number | null;
    })[]
}
