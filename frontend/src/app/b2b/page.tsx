"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { CsvUploader } from "@/components/CsvUploader";
import type { BulkOrder, CsvBulkRow, Order } from "@/types";

type Tab = "upload" | "orders" | "invoices";

export default function B2BPortalPage() {
  const [tab, setTab] = useState<Tab>("upload");
  const [email, setEmail] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  // Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvBulkRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    bulkOrder: BulkOrder;
    summary: { total: number; valid: number; errors: number; estimatedTotal: number };
  } | null>(null);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoggedIn(true);
    loadOrders();
  }

  async function loadOrders() {
    setLoadingOrders(true);
    try {
      const [ordersRes, bulkRes] = await Promise.all([
        api.checkout.listOrders({ email }),
        api.bulkOrders.list({ email }),
      ]);
      setOrders(ordersRes.orders);
      setBulkOrders(bulkRes.bulkOrders);
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  }

  async function handleUpload() {
    if (!csvFile || !email) return;
    setUploading(true);
    try {
      const result = await api.bulkOrders.upload(csvFile, email);
      setUploadResult(result);
      loadOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function confirmBulkOrder(id: string) {
    try {
      await api.bulkOrders.confirm(id);
      loadOrders();
    } catch (err) {
      console.error(err);
    }
  }

  if (!loggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-center mb-2">B2B Portal</h1>
        <p className="text-slate-500 text-center mb-8">Sign in with your business email to access bulk ordering</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Business email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
          <button
            type="submit"
            className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">B2B Portal</h1>
        <span className="text-sm text-slate-500">{email}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(["upload", "orders", "invoices"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t !== "upload") loadOrders(); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition capitalize ${
              tab === t ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "upload" ? "CSV Upload" : t === "orders" ? "Order Tracking" : "Invoices"}
          </button>
        ))}
      </div>

      {/* CSV Upload Tab */}
      {tab === "upload" && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Upload a CSV file with columns: <strong>name, photo_url, quantity, size</strong>.
              Each row represents a personalized magnet order.
            </p>
          </div>

          <CsvUploader onParsed={setParsedRows} onFileReady={setCsvFile} />

          {parsedRows.length > 0 && !uploadResult && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition disabled:opacity-50"
            >
              {uploading ? "Uploading..." : `Submit ${parsedRows.length} items for processing`}
            </button>
          )}

          {uploadResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-green-800">✓ Upload Complete</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Total Lines</p>
                  <p className="font-bold text-lg">{uploadResult.summary.total}</p>
                </div>
                <div>
                  <p className="text-slate-500">Valid</p>
                  <p className="font-bold text-lg text-green-600">{uploadResult.summary.valid}</p>
                </div>
                <div>
                  <p className="text-slate-500">Errors</p>
                  <p className="font-bold text-lg text-red-600">{uploadResult.summary.errors}</p>
                </div>
                <div>
                  <p className="text-slate-500">Estimated Total</p>
                  <p className="font-bold text-lg text-brand-600">${uploadResult.summary.estimatedTotal.toFixed(2)}</p>
                </div>
              </div>
              <button
                onClick={() => confirmBulkOrder(uploadResult.bulkOrder.id)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition"
              >
                Confirm Order
              </button>
            </div>
          )}
        </div>
      )}

      {/* Order Tracking Tab */}
      {tab === "orders" && (
        <div className="space-y-4">
          {loadingOrders ? (
            <p className="text-slate-400">Loading orders...</p>
          ) : (
            <>
              <h3 className="font-semibold text-slate-700">Bulk Orders</h3>
              {bulkOrders.length === 0 ? (
                <p className="text-slate-400 text-sm">No bulk orders yet</p>
              ) : (
                <div className="space-y-3">
                  {bulkOrders.map((bo) => (
                    <div key={bo.id} className="border rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{bo.originalFilename}</p>
                        <p className="text-xs text-slate-500">{bo.totalLines} items · {new Date(bo.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        bo.status === "complete" ? "bg-green-100 text-green-700" :
                        bo.status === "processing" ? "bg-yellow-100 text-yellow-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {bo.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="font-semibold text-slate-700 pt-4">Standard Orders</h3>
              {orders.length === 0 ? (
                <p className="text-slate-400 text-sm">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div key={o.id} className="border rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{o.invoiceNumber}</p>
                        <p className="text-xs text-slate-500">${Number(o.totalAmount).toFixed(2)} · {new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        o.status === "delivered" ? "bg-green-100 text-green-700" :
                        o.status === "shipped" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {o.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {tab === "invoices" && (
        <div className="space-y-3">
          {loadingOrders ? (
            <p className="text-slate-400">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-slate-400 text-sm">No invoices yet</p>
          ) : (
            orders.filter((o) => o.invoiceNumber).map((o) => (
              <div key={o.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{o.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-600">${Number(o.totalAmount).toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{o.items?.length || 0} items</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
