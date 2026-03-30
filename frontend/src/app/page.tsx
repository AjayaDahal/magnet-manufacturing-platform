import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:py-28">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Custom Photo Magnets<br />Made Simple
            </h1>
            <p className="text-lg text-brand-100">
              Upload your photos. Choose your size. Get premium magnets delivered to your door.
              Bulk ordering for businesses with CSV upload.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/products"
                className="bg-white text-brand-700 font-semibold px-6 py-3 rounded-lg hover:bg-brand-50 transition"
              >
                Shop Magnets
              </Link>
              <Link
                href="/b2b"
                className="border-2 border-white/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition"
              >
                B2B Bulk Orders
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "📸",
              title: "Upload & Preview",
              desc: "See exactly how your magnet will look before ordering. Upload any photo and customize in real-time.",
            },
            {
              icon: "📋",
              title: "Bulk CSV Upload",
              desc: "Order hundreds of personalized magnets at once. Upload a CSV with names, photos, and quantities.",
            },
            {
              icon: "💰",
              title: "Volume Pricing",
              desc: "The more you order, the more you save. Automatic tiered pricing up to 50% off for bulk orders.",
            },
          ].map((f) => (
            <div key={f.title} className="text-center space-y-3 p-6">
              <span className="text-4xl">{f.icon}</span>
              <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sizes */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Available Sizes</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { size: '2"×3"', label: "Mini" },
              { size: '3"×4"', label: "Small" },
              { size: '4"×6"', label: "Medium" },
              { size: '5"×7"', label: "Large" },
              { size: '8"×10"', label: "XL" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-lg p-4 text-center border">
                <p className="text-2xl font-bold text-brand-600">{s.size}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
