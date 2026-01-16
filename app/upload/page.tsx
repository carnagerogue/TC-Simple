import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageShell } from "@/components/page-shell";
import { UploadForm } from "@/components/upload-form";

export default async function UploadPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <PageShell
      title="Upload a PDF"
      description="Select a PDF from your device. We’ll validate the file type and confirm the upload."
    >
      <UploadForm />
    </PageShell>
  );
}

