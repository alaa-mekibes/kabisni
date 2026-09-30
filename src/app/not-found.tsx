import Link from "next/link";

export default function NotFound() {
  return (
    <main dir="rtl" style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <h1>الصفحة غير موجودة</h1>
      <p>
        <Link href="/">ارجع للتكبيس</Link>
      </p>
    </main>
  );
}
