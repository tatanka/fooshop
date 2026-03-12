"use client";

interface Product {
  id: string;
  title: string;
  sales: number;
  revenue: number;
}

export function TopProducts({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Top Products</h3>
        <p className="text-muted text-sm">
          No sales yet — publish a product to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Top Products</h3>
      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{product.title}</p>
              <p className="text-xs text-muted">
                {product.sales} {product.sales === 1 ? "sale" : "sales"}
              </p>
            </div>
            <p className="text-sm font-semibold">
              ${(product.revenue / 100).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
