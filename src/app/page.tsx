import { Dashboard } from "@/components/Dashboard";
import { getLatestBoardState } from "@/lib/board";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const state = await getLatestBoardState();
  return <Dashboard initialState={state} />;
}
