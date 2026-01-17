import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, ensureDbReady } from "@/lib/db";
import { ContactDetailClient } from "@/components/contacts/ContactDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function ContactDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = session.user.id || session.user.email;
  if (!userId) redirect("/login");

  await ensureDbReady();

  const contact = await db.contact.findFirst({
    where: { id: params.id, userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      category: true,
      company: true,
      role: true,
      avatarUrl: true,
    },
  });

  if (!contact) notFound();

  return <ContactDetailClient contact={contact} />;
}
