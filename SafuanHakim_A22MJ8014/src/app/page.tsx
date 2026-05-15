import { Header } from "@/components/header";
import { Dashboard } from "@/components/dashboard";
import { mapDepartment, mapIncident, mapRawInput, mapRpaRun } from "@/lib/db-mappers";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = createClient(cookies());
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [incidentsResult, rawInputsResult, rpaRunsResult, departmentsResult] = await Promise.all([
    supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("raw_inputs").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("rpa_runs").select("*").order("started_at", { ascending: false }).limit(10),
    supabase.from("departments").select("*").order("name", { ascending: true })
  ]);

  const incidents = incidentsResult.data?.map(mapIncident) ?? [];
  const rawInputs = rawInputsResult.data?.map(mapRawInput) ?? [];
  const rpaRuns = rpaRunsResult.data?.map(mapRpaRun) ?? [];
  const departments = departmentsResult.data?.map(mapDepartment) ?? [];

  return (
    <>
      <Header />
      <Dashboard incidents={incidents} rawInputs={rawInputs} rpaRuns={rpaRuns} departments={departments} />
    </>
  );
}
