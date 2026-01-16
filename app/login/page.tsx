import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginCard } from "@/components/login/login-card";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen w-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center px-4 py-10">
      <LoginCard />
    </main>
  );
}

