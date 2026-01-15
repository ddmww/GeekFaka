import { Navbar } from "@/components/navbar";
import { StoreFront } from "@/components/store-front";
import { prisma } from "@/lib/prisma";
import ReactMarkdown from "react-markdown";
import { Announcement } from "@/components/announcement";

export const dynamic = "force-dynamic";

export default async function Home() {
  let categoriesData: any[] = [];
  let contactInfo: any = null;
  let announcement: any = null;
  let articles: any[] = [];

  let siteTitle = "GeekFaka";

  try {
    const [categoriesRes, contactRes, announceRes, articlesRes, titleRes] = await Promise.all([
      prisma.category.findMany({
        orderBy: { priority: "desc" },
        include: {
          products: {
            where: { isActive: true },
            include: {
              discount: true,
              _count: {
                select: { licenses: { where: { status: "AVAILABLE" } } }
              }
            }
          }
        }
      }),
      // ...
      // ...
      products: cat.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        stock: p._count.licenses,
        enableCoupons: p.enableCoupons ?? true,
        discount: p.discount ? {
          type: p.discount.type,
          value: p.discount.value.toString(),
          isActive: p.discount.isActive,
          startDate: p.discount.startDate.toISOString(),
          endDate: p.discount.endDate.toISOString()
        } : null
      }))
  }));
  return (
    <main className="min-h-screen bg-background dark text-foreground selection:bg-primary selection:text-primary-foreground flex flex-col">
      <Navbar title={siteTitle} />

      {/* Dynamic Announcement (Bar + Popup) */}
      <Announcement content={announcement?.value} />

      {/* Hero Section - Background Only */}
      <section className="relative overflow-hidden pt-10 pb-6">
        <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]" />
      </section>

      {/* Product Section */}
      <section className="container mx-auto max-w-6xl px-4 pb-12 flex-1">
        <StoreFront categories={categories} />
      </section>

      {/* Info Section */}
      <section className="py-12 text-center bg-muted/20">
        <div className="container px-4">
          <p className="mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
            GeekFaka 提供安全、极速的虚拟商品交易体验。<br />
            7x24小时无人值守，支付即刻发货。
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 text-center text-sm text-muted-foreground bg-muted/10">
        <div className="container mx-auto max-w-6xl px-4 space-y-8">
          <div className="space-y-4">
            <p>&copy; {new Date().getFullYear()} GeekFaka. All rights reserved.</p>
            {contactInfo?.value && (
              <div className="prose prose-sm dark:prose-invert mx-auto opacity-80">
                <ReactMarkdown>{contactInfo.value}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
