import { prisma } from "@/server/db/prisma";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  // If no organization exists, redirect to the setup wizard
  const count = await prisma.organization.count();
  
  if (count === 0) {
    redirect("/setup");
  }

  return <LoginForm />;
}