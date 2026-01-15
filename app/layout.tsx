import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { CustomerService } from "@/components/customer-service";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  let title = "GeekFaka - 自动发货平台";
  let description = "24小时自动发货，安全快捷";

  try {
    const [titleSetting, descSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: "site_title" } }),
      prisma.systemSetting.findUnique({ where: { key: "site_description" } })
    ]);

    if (titleSetting?.value) title = titleSetting.value;
    if (descSetting?.value) description = descSetting.value;
  } catch (e) {
    console.warn("Failed to fetch metadata (likely during build)");
  }

  return {
    title,
    description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let crispId = undefined;
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "crisp_id" },
    });
    crispId = setting?.value;
  } catch (error) {
    // Suppress errors during build time or if DB is unreachable
    // This allows the build to pass even if DATABASE_URL is missing in the build environment
    console.warn("Failed to fetch crisp_id (likely during build):", error);
  }

  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <CustomerService crispId={crispId} />
      </body>
    </html>
  );
}
