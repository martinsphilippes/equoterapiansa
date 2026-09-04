import { EntriesIndex } from "@/components/finance/pages";
import type { SearchParams } from "@/lib/types";
export default async function Page({ searchParams }: { searchParams: SearchParams }) { return <EntriesIndex kind="receivable" sp={await searchParams} />; }
